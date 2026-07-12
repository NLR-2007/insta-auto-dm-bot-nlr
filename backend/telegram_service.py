import asyncio
import json
import os
import re
import calendar
from datetime import datetime, timedelta
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from backend.database import (
    SessionLocal, TgBotConfig, TgChannel, TgScheduledPost,
    TgModerationRule, TgPostLog, log_to_db,
)
from backend.security import decrypt_secret

TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "tg")


class TelegramBotService:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_update_ids = {} # maps bot_id to last processed update_id
        self._initialized_bots = set()

    @property
    def is_running(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    async def api_call(self, token: str, method: str, **params):
        token = decrypt_secret(token) or token
        url = TELEGRAM_API.format(token=token, method=method)
        async with httpx.AsyncClient(timeout=30) as client:
            for attempt in range(4):
                resp = await client.post(url, json=params)
                data = resp.json()
                if data.get("ok"):
                    return data.get("result")
                retry_after = data.get("parameters", {}).get("retry_after")
                if resp.status_code == 429 and retry_after is not None and attempt < 3:
                    await asyncio.sleep(min(float(retry_after) + 0.25, 30))
                    continue
                raise Exception(data.get("description", "Telegram API error"))

    async def validate_token(self, token: str) -> dict:
        return await self.api_call(token, "getMe")

    async def fetch_bot_channels(self, bot_id: int, db: Session):
        bot = db.query(TgBotConfig).filter(TgBotConfig.id == bot_id).first()
        if not bot:
            return []

        try:
            updates = await self.api_call(bot.bot_token, "getUpdates", limit=100)
        except Exception as e:
            log_to_db("WARNING", f"[TG] Could not fetch updates for @{bot.bot_username}: {e}")
            return []

        seen_chats = {}
        for update in updates:
            msg = update.get("message") or update.get("my_chat_member", {}).get("chat")
            chat = None
            if msg and "chat" in msg:
                chat = msg["chat"]
            elif update.get("my_chat_member"):
                chat = update["my_chat_member"].get("chat")

            if chat and chat["type"] in ("channel", "group", "supergroup"):
                chat_id = str(chat["id"])
                if chat_id not in seen_chats:
                    seen_chats[chat_id] = {
                        "chat_id": chat_id,
                        "title": chat.get("title", "Unknown"),
                        "chat_type": chat["type"],
                    }

        new_channels = []
        for chat_info in seen_chats.values():
            existing = db.query(TgChannel).join(TgBotConfig).filter(
                TgChannel.chat_id == chat_info["chat_id"],
                TgBotConfig.workspace_id == bot.workspace_id,
            ).first()
            if not existing:
                try:
                    count_data = await self.api_call(
                        bot.bot_token, "getChatMemberCount",
                        chat_id=int(chat_info["chat_id"]),
                    )
                    member_count = count_data if isinstance(count_data, int) else 0
                except Exception:
                    member_count = 0

                ch = TgChannel(
                    chat_id=chat_info["chat_id"],
                    title=chat_info["title"],
                    chat_type=chat_info["chat_type"],
                    member_count=member_count,
                    bot_id=bot_id,
                )
                db.add(ch)
                new_channels.append(ch)

        if new_channels:
            db.commit()
            log_to_db("INFO", f"[TG] Discovered {len(new_channels)} new channel(s)/group(s) for @{bot.bot_username}")

        return db.query(TgChannel).filter(TgChannel.bot_id == bot_id).all()

    async def send_message(self, token: str, chat_id: str, text: str, parse_mode: str = "HTML"):
        return await self.api_call(
            token, "sendMessage",
            chat_id=int(chat_id), text=text, parse_mode=parse_mode,
        )

    async def send_photo(self, token: str, chat_id: str, photo_source: str, caption: str = "", parse_mode: Optional[str] = "HTML"):
        local_path = self._resolve_local_file(photo_source)
        if local_path:
            return await self._upload_file(token, "sendPhoto", "photo", local_path, int(chat_id), caption, parse_mode)
        params = {"chat_id": int(chat_id), "photo": photo_source, "caption": caption}
        if parse_mode:
            params["parse_mode"] = parse_mode
        return await self.api_call(token, "sendPhoto", **params)

    async def send_document(self, token: str, chat_id: str, doc_source: str, caption: str = "", parse_mode: Optional[str] = "HTML"):
        local_path = self._resolve_local_file(doc_source)
        if local_path:
            return await self._upload_file(token, "sendDocument", "document", local_path, int(chat_id), caption, parse_mode)
        params = {"chat_id": int(chat_id), "document": doc_source, "caption": caption}
        if parse_mode:
            params["parse_mode"] = parse_mode
        return await self.api_call(token, "sendDocument", **params)

    def _resolve_local_file(self, path: str) -> Optional[str]:
        if not path or path.startswith("http://") or path.startswith("https://"):
            return None
        full_path = os.path.join(UPLOAD_DIR, path) if not os.path.isabs(path) else path
        return full_path if os.path.exists(full_path) else None

    async def _upload_file(self, token: str, method: str, field: str, file_path: str, chat_id: int, caption: str, parse_mode: Optional[str]):
        token = decrypt_secret(token) or token
        url = TELEGRAM_API.format(token=token, method=method)
        data = {"chat_id": str(chat_id)}
        if caption:
            data["caption"] = caption
        if parse_mode:
            data["parse_mode"] = parse_mode
        stored_name = os.path.basename(file_path)
        filename = stored_name.split("__", 1)[1] if "__" in stored_name else stored_name
        async with httpx.AsyncClient(timeout=60) as client:
            for attempt in range(4):
                with open(file_path, "rb") as f:
                    files = {field: (filename, f)}
                    resp = await client.post(url, data=data, files=files)
                result = resp.json()
                if result.get("ok"):
                    return result.get("result")
                retry_after = result.get("parameters", {}).get("retry_after")
                if resp.status_code == 429 and retry_after is not None and attempt < 3:
                    await asyncio.sleep(min(float(retry_after) + 0.25, 30))
                    continue
                raise Exception(result.get("description", "Telegram API error"))

    async def delete_message(self, token: str, chat_id: str, message_id: int):
        return await self.api_call(
            token, "deleteMessage",
            chat_id=int(chat_id), message_id=message_id,
        )

    async def _process_scheduled_posts(self):
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            due_posts = db.query(TgScheduledPost).filter(
                TgScheduledPost.status == "pending",
                TgScheduledPost.scheduled_at <= now,
            ).all()

            for post in due_posts:
                channel = post.channel
                if not channel:
                    post.status = "failed"
                    post.error_message = "Channel not found"
                    db.commit()
                    continue

                bot = channel.bot
                if not bot:
                    post.status = "failed"
                    post.error_message = "Bot not found"
                    db.commit()
                    continue

                if not channel.is_active or not bot.is_active:
                    post.status = "failed"
                    post.error_message = "Bot or channel is inactive"
                    db.commit()
                    continue

                try:
                    # Claim before the network call so overlapping ticks/send-now cannot duplicate it.
                    updated = db.query(TgScheduledPost).filter(
                        TgScheduledPost.id == post.id,
                        TgScheduledPost.status == "pending",
                    ).update({"status": "processing"}, synchronize_session=False)
                    db.commit()
                    if not updated:
                        continue
                    db.refresh(post)

                    result = await self.send_post(bot.bot_token, channel.chat_id, post)

                    post.status = "sent"
                    post.sent_at = datetime.utcnow()

                    db.add(TgPostLog(
                        channel_id=channel.id,
                        message_id=str(result.get("message_id", "")),
                        content_preview=post.content[:200],
                        status="sent",
                    ))
                    log_to_db("SUCCESS", f"[TG] Sent scheduled post to {channel.title}")

                    if post.is_recurring and post.recurrence_rule:
                        next_time = self._calc_next_recurrence(post.scheduled_at, post.recurrence_rule)
                        new_post = TgScheduledPost(
                            content=post.content,
                            message_type=getattr(post, "message_type", "text"),
                            media_type=post.media_type,
                            media_path=post.media_path,
                            scheduled_at=next_time,
                            is_recurring=True,
                            recurrence_rule=post.recurrence_rule,
                            batch_messages=post.batch_messages,
                            channel_id=post.channel_id,
                        )
                        db.add(new_post)

                except Exception as e:
                    post.status = "failed"
                    post.error_message = str(e)[:500]
                    log_to_db("ERROR", f"[TG] Failed to send post to {channel.title}: {e}")

                db.commit()
        except Exception as e:
            log_to_db("ERROR", f"[TG] Scheduler error: {e}")
        finally:
            db.close()

    async def _send_single(self, token: str, chat_id: str, text: str, media_type: Optional[str] = None, media_path: Optional[str] = None):
        if media_type == "photo" and media_path:
            try:
                return await self.send_photo(token, chat_id, media_path, text, parse_mode="HTML")
            except Exception as e:
                if "parse" in str(e).lower() or "entities" in str(e).lower():
                    return await self.send_photo(token, chat_id, media_path, text, parse_mode=None)
                raise
        elif media_type == "document" and media_path:
            try:
                return await self.send_document(token, chat_id, media_path, text, parse_mode="HTML")
            except Exception as e:
                if "parse" in str(e).lower() or "entities" in str(e).lower():
                    return await self.send_document(token, chat_id, media_path, text, parse_mode=None)
                raise
        else:
            if not text:
                raise ValueError("Telegram message has no text or attachment")
            try:
                return await self.send_message(token, chat_id, text, parse_mode="HTML")
            except Exception as e:
                if "parse" in str(e).lower() or "entities" in str(e).lower():
                    return await self.send_message(token, chat_id, text, parse_mode=None)
                raise

    async def send_post(self, token: str, chat_id: str, post: TgScheduledPost):
        """Single delivery path used by scheduler and send-now."""
        batch = []
        if post.batch_messages:
            try:
                decoded = json.loads(post.batch_messages)
                batch = decoded if isinstance(decoded, list) else []
            except (TypeError, ValueError):
                batch = []
        result = await self._send_single(token, chat_id, post.content or "", post.media_type, post.media_path)
        for message in batch:
            if not isinstance(message, dict):
                continue
            await asyncio.sleep(0.8)
            await self._send_single(token, chat_id, message.get("content", ""), message.get("media_type"), message.get("media_path"))
        return result

    def _calc_next_recurrence(self, current: datetime, rule: str) -> datetime:
        if rule == "hourly":
            return current + timedelta(hours=1)
        elif rule == "daily":
            return current + timedelta(days=1)
        elif rule == "weekly":
            return current + timedelta(weeks=1)
        elif rule == "monthly":
            month = current.month + 1
            year = current.year
            if month > 12:
                month = 1
                year += 1
            day = min(current.day, calendar.monthrange(year, month)[1])
            return current.replace(year=year, month=month, day=day)
        return current + timedelta(days=1)

    async def _process_moderation(self):
        db = SessionLocal()
        try:
            active_bots = db.query(TgBotConfig).filter(TgBotConfig.is_active == True).all()
            for bot in active_bots:
                if bot.id not in self._initialized_bots:
                    try:
                        updates = await self.api_call(bot.bot_token, "getUpdates", limit=1, offset=-1)
                        if updates:
                            self._last_update_ids[bot.id] = updates[-1]["update_id"]
                    except Exception:
                        pass
                    self._initialized_bots.add(bot.id)
                    continue

                last_id = self._last_update_ids.get(bot.id)
                params = {"limit": 50}
                if last_id is not None:
                    params["offset"] = last_id + 1

                try:
                    updates = await self.api_call(bot.bot_token, "getUpdates", **params)
                except Exception:
                    continue

                if not updates:
                    continue

                max_update_id = max(u["update_id"] for u in updates)
                self._last_update_ids[bot.id] = max_update_id

                rules_by_chat = {}
                for channel in bot.channels:
                    rules = db.query(TgModerationRule).filter(
                        TgModerationRule.channel_id == channel.id,
                        TgModerationRule.is_active == True,
                    ).all()
                    if rules:
                        rules_by_chat[channel.chat_id] = rules

                for update in updates:
                    # 1. Process message updates (for keywords, anti-link, and welcome)
                    msg = update.get("message")
                    if msg:
                        chat_id = str(msg["chat"]["id"])
                        if chat_id in rules_by_chat:
                            text = msg.get("text", "")
                            for rule in rules_by_chat[chat_id]:
                                config = json.loads(rule.config)

                                if rule.rule_type == "keyword_ban":
                                    keywords = [k.strip().lower() for k in config.get("keywords", "").split(",")]
                                    if any(kw in text.lower() for kw in keywords if kw):
                                        try:
                                            await self.delete_message(bot.bot_token, chat_id, msg["message_id"])
                                            log_to_db("INFO", f"[TG] Deleted message with banned keyword in {chat_id}")
                                        except Exception:
                                            pass

                                elif rule.rule_type == "anti_link":
                                    if config.get("enabled") and ("http://" in text or "https://" in text or "t.me/" in text):
                                        try:
                                            await self.delete_message(bot.bot_token, chat_id, msg["message_id"])
                                            log_to_db("INFO", f"[TG] Deleted message with link in {chat_id}")
                                        except Exception:
                                            pass

                                elif rule.rule_type == "welcome":
                                    new_members = msg.get("new_chat_members", [])
                                    if new_members and config.get("message"):
                                        for member in new_members:
                                            name = member.get("first_name", "there")
                                            welcome_text = config["message"].replace("{name}", name)
                                            try:
                                                await self.send_message(bot.bot_token, chat_id, welcome_text, parse_mode="HTML")
                                                log_to_db("INFO", f"[TG] Sent welcome message to {name} via new_chat_members event in {chat_id}")
                                            except Exception as html_err:
                                                if "parse" in str(html_err).lower() or "entities" in str(html_err).lower():
                                                    try:
                                                        await self.send_message(bot.bot_token, chat_id, welcome_text, parse_mode=None)
                                                    except Exception:
                                                        pass

                                elif rule.rule_type == "custom":
                                    pattern = config.get("pattern", "")
                                    action = config.get("action", "delete")
                                    match_mode = config.get("match_mode", "contains")
                                    reply_text = config.get("reply_text", "")
                                    matched = False
                                    if match_mode == "regex" and text:
                                        try:
                                            matched = bool(re.search(pattern, text, re.IGNORECASE))
                                        except re.error:
                                            matched = False
                                    elif match_mode == "exact" and text:
                                        matched = text.strip().lower() == pattern.strip().lower()
                                    elif text:
                                        matched = pattern.lower() in text.lower()

                                    if matched and text:
                                        try:
                                            if action in ("delete", "delete_and_warn"):
                                                await self.delete_message(bot.bot_token, chat_id, msg["message_id"])
                                                log_to_db("INFO", f"[TG] Custom rule deleted message in {chat_id}")
                                            if action in ("warn", "delete_and_warn") and reply_text:
                                                user_name = msg.get("from", {}).get("first_name", "User")
                                                warn_text = reply_text.replace("{name}", user_name)
                                                await self._send_single(bot.bot_token, chat_id, warn_text)
                                        except Exception:
                                            pass

                    # 2. Process chat_member status change updates (joins and manual additions)
                    chat_member_update = update.get("chat_member")
                    if chat_member_update:
                        chat_id = str(chat_member_update["chat"]["id"])
                        if chat_id in rules_by_chat:
                            old_status = chat_member_update["old_chat_member"]["status"]
                            new_status = chat_member_update["new_chat_member"]["status"]
                            if new_status == "member" and old_status not in ("member", "administrator", "creator"):
                                for rule in rules_by_chat[chat_id]:
                                    if rule.rule_type == "welcome":
                                        config = json.loads(rule.config)
                                        if config.get("message"):
                                            member = chat_member_update["new_chat_member"]["user"]
                                            name = member.get("first_name", "there")
                                            welcome_text = config["message"].replace("{name}", name)
                                            try:
                                                await self.send_message(bot.bot_token, chat_id, welcome_text, parse_mode="HTML")
                                                log_to_db("INFO", f"[TG] Sent welcome message to {name} via chat_member event in {chat_id}")
                                            except Exception as html_err:
                                                if "parse" in str(html_err).lower() or "entities" in str(html_err).lower():
                                                    try:
                                                        await self.send_message(bot.bot_token, chat_id, welcome_text, parse_mode=None)
                                                    except Exception:
                                                        pass

        except Exception as e:
            log_to_db("ERROR", f"[TG] Moderation error: {e}")
        finally:
            db.close()

    async def start(self):
        if self._running:
            return
        # Recover work left claimed if the previous process stopped mid-send.
        db = SessionLocal()
        try:
            db.query(TgScheduledPost).filter(TgScheduledPost.status == "processing").update(
                {"status": "pending", "error_message": "Recovered after service restart"},
                synchronize_session=False,
            )
            db.commit()
        finally:
            db.close()
        self._running = True
        self._task = asyncio.create_task(self._loop())
        self._task.add_done_callback(self._on_task_done)
        log_to_db("INFO", "[TG] Telegram bot service started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        log_to_db("INFO", "[TG] Telegram bot service stopped")

    def _on_task_done(self, task: asyncio.Task):
        if task.cancelled():
            return
        error = task.exception()
        if error:
            self._running = False
            log_to_db("ERROR", f"[TG] Worker stopped unexpectedly: {error}")

    async def _loop(self):
        while self._running:
            try:
                await self._process_scheduled_posts()
                await self._process_moderation()
            except Exception as e:
                log_to_db("ERROR", f"[TG] Service loop error: {e}")
            await asyncio.sleep(5)


telegram_service = TelegramBotService()

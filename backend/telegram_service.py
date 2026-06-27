import asyncio
import json
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


class TelegramBotService:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    @property
    def is_running(self) -> bool:
        return self._running

    async def api_call(self, token: str, method: str, **params):
        token = decrypt_secret(token) or token
        url = TELEGRAM_API.format(token=token, method=method)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=params)
            data = resp.json()
            if not data.get("ok"):
                raise Exception(data.get("description", "Telegram API error"))
            return data.get("result")

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
            existing = db.query(TgChannel).filter(
                TgChannel.bot_id == bot_id,
                TgChannel.chat_id == chat_info["chat_id"],
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

    async def send_photo(self, token: str, chat_id: str, photo_url: str, caption: str = ""):
        return await self.api_call(
            token, "sendPhoto",
            chat_id=int(chat_id), photo=photo_url, caption=caption, parse_mode="HTML",
        )

    async def send_document(self, token: str, chat_id: str, document_url: str, caption: str = ""):
        return await self.api_call(
            token, "sendDocument",
            chat_id=int(chat_id), document=document_url, caption=caption, parse_mode="HTML",
        )

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

                try:
                    if post.media_type == "photo" and post.media_path:
                        result = await self.send_photo(bot.bot_token, channel.chat_id, post.media_path, post.content)
                    elif post.media_type == "document" and post.media_path:
                        result = await self.send_document(bot.bot_token, channel.chat_id, post.media_path, post.content)
                    else:
                        result = await self.send_message(bot.bot_token, channel.chat_id, post.content)

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
                            media_type=post.media_type,
                            media_path=post.media_path,
                            scheduled_at=next_time,
                            is_recurring=True,
                            recurrence_rule=post.recurrence_rule,
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
            return current.replace(year=year, month=month)
        return current + timedelta(days=1)

    async def _process_moderation(self):
        db = SessionLocal()
        try:
            active_bots = db.query(TgBotConfig).filter(TgBotConfig.is_active == True).all()
            for bot in active_bots:
                try:
                    updates = await self.api_call(bot.bot_token, "getUpdates", limit=50, offset=-50)
                except Exception:
                    continue

                rules_by_chat = {}
                for channel in bot.channels:
                    rules = db.query(TgModerationRule).filter(
                        TgModerationRule.channel_id == channel.id,
                        TgModerationRule.is_active == True,
                    ).all()
                    if rules:
                        rules_by_chat[channel.chat_id] = rules

                for update in updates:
                    msg = update.get("message")
                    if not msg:
                        continue

                    chat_id = str(msg["chat"]["id"])
                    if chat_id not in rules_by_chat:
                        continue

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
                                        await self.send_message(bot.bot_token, chat_id, welcome_text)
                                    except Exception:
                                        pass

        except Exception as e:
            log_to_db("ERROR", f"[TG] Moderation error: {e}")
        finally:
            db.close()

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
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

    async def _loop(self):
        while self._running:
            try:
                await self._process_scheduled_posts()
                await self._process_moderation()
            except Exception as e:
                log_to_db("ERROR", f"[TG] Service loop error: {e}")
            await asyncio.sleep(15)


telegram_service = TelegramBotService()

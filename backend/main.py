import os
import json
from contextlib import asynccontextmanager
from typing import List, Optional, Union, Dict
from datetime import datetime, date
import threading
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db, init_db, Account, Target, MessageTemplate, BotLog, Setting, log_to_db, SessionLocal, MonitoredPost, ProcessedComment, OptOut
import re
import backend.bot as bot_module
from backend.bot import start_bot_background, stop_bot_background, InstagramBot
from backend.official_api import router as official_api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and default settings
    init_db()
    log_to_db("INFO", "FastAPI server started. DB initialized.")
    yield
    # Shutdown routine
    stop_bot_background()
    log_to_db("INFO", "FastAPI server shutting down. Bot worker stopped.")

app = FastAPI(
    title="GramGlide Auto DM API",
    description="Backend service managing compliant Instagram DM automation",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Essential when accessing localhost backend via tunnels (Ngrok/Cloudflare) from Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(official_api_router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "GramGlide Auto DM Bot API is running!"}


# --- Pydantic Schema Declarations ---

class AccountSchema(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: Optional[str] = Field(None, max_length=200)

class AccountResponse(BaseModel):
    id: int
    username: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TargetCreateSchema(BaseModel):
    usernames: List[str] = Field(..., description="List of Instagram usernames to queue")

class TargetResponse(BaseModel):
    id: int
    username: str
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    message_sent: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageTemplateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, description="Message template content, supports {Spin|Tax} format")
    is_active: bool = True

class MessageTemplateResponse(BaseModel):
    id: int
    name: str
    content: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class SettingUpdateSchema(BaseModel):
    daily_limit: int = Field(default=30, ge=1, le=100)
    min_delay: int = Field(default=45, ge=10)
    max_delay: int = Field(default=120, ge=15)
    working_hours_start: str = Field(default="08:00")
    working_hours_end: str = Field(default="22:00")
    api_mode: str = Field(default="sandbox")
    opt_out_keywords: str = Field(default="stop, unsubscribe, optout, stopdm")
    consent_enforce: bool = Field(default=True)
    meta_page_access_token: Optional[str] = Field(default="")
    meta_verify_token: Optional[str] = Field(default="")

class OptOutCreateSchema(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)

class OptOutResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class LogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: str
    
    class Config:
        from_attributes = True

class MonitoredPostCreate(BaseModel):
    post_url: str = Field(..., min_length=10, description="Instagram post or reel URL")
    trigger_keyword: str = Field(..., min_length=1, description="Trigger word/letter, e.g. INFO")
    template_id: int = Field(..., description="ID of message template to send")
    is_active: bool = True

class MonitoredPostResponse(BaseModel):
    id: int
    post_url: str
    trigger_keyword: str
    template_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProcessedCommentResponse(BaseModel):
    id: int
    username: str
    post_id: int
    comment_text: Optional[str] = None
    status: str
    processed_at: datetime
    post_url: Optional[str] = None
    trigger_keyword: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- API Endpoints ---

@app.get("/api/status")
def get_system_status(db: Session = Depends(get_db)):
    # Get active account info
    active_account = db.query(Account).filter(Account.status == "connected").first()
    active_user = active_account.username if active_account else None
    
    # Calculate stats — combine targets table + processed_comments (comment triggers)
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    # Targets (queue-based DMs)
    target_sent_today = db.query(Target).filter(
        Target.status == "sent",
        Target.sent_at >= today_start
    ).count()
    
    # Comment triggers (comment-based DMs)
    comment_sent_today = db.query(ProcessedComment).filter(
        ProcessedComment.status == "sent",
        ProcessedComment.processed_at >= today_start
    ).count()
    
    sent_today = target_sent_today + comment_sent_today
    
    pending_count = db.query(Target).filter(Target.status == "pending").count()
    
    target_failed = db.query(Target).filter(Target.status == "failed").count()
    comment_failed = db.query(ProcessedComment).filter(ProcessedComment.status == "failed").count()
    failed_count = target_failed + comment_failed
    
    target_total_sent = db.query(Target).filter(Target.status == "sent").count()
    comment_total_sent = db.query(ProcessedComment).filter(ProcessedComment.status == "sent").count()
    total_sent = target_total_sent + comment_total_sent
    
    # Get bot status from db
    status_setting = db.query(Setting).filter(Setting.key == "status").first()
    bot_status = status_setting.value if status_setting else "stopped"

    # Override with thread flag safety check (read live value from bot module)
    bot_running_flag = bot_module.BOT_RUNNING
    if bot_running_flag and bot_status == "stopped":
        bot_status = "running"

    return {
        "bot_running": bot_running_flag or bot_status == "running",
        "active_account": active_user,
        "sent_today": sent_today,
        "pending_count": pending_count,
        "failed_count": failed_count,
        "total_sent": total_sent
    }

# Account management
@app.get("/api/accounts", response_model=List[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()

@app.post("/api/accounts", response_model=AccountResponse)
def add_account(payload: AccountSchema, db: Session = Depends(get_db)):
    # Check if exists
    exists = db.query(Account).filter(Account.username == payload.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Account already exists")
        
    db_account = Account(
        username=payload.username,
        password=payload.password,
        status="disconnected"
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    log_to_db("INFO", f"Added new Instagram account: @{payload.username}")
    return db_account

@app.delete("/api/accounts/{username}")
def delete_account(username: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    db.delete(account)
    db.commit()
    log_to_db("WARNING", f"Deleted account: @{username}")
    return {"message": f"Account @{username} successfully removed."}

def run_login_worker(username: str):
    bot = InstagramBot(username)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        success = loop.run_until_complete(bot.run_manual_login_session())
        
        # When the manual login session is finished, mark status based on success
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.username == username).first()
            if account:
                if success:
                    account.status = "connected"
                    log_to_db("SUCCESS", f"Account @{username} successfully authenticated and marked 'connected'")
                else:
                    account.status = "disconnected"
                    log_to_db("WARNING", f"Account @{username} authentication cancelled or failed.")
                db.commit()
        except Exception as err:
            log_to_db("ERROR", f"Error post-login update: {err}")
        finally:
            db.close()
            
    except Exception as e:
        log_to_db("ERROR", f"Login thread failed for @{username}: {e}")
    finally:
        loop.close()

@app.post("/api/accounts/{username}/login")
def trigger_manual_login(username: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # Mark status as connecting
    account.status = "connecting"
    db.commit()
    
    # Launch local browser instance asynchronously
    background_tasks.add_task(run_login_worker, username)
    return {"message": "Visible browser window launched on host. Please log in manually."}

@app.post("/api/accounts/{username}/mark-connected")
def force_mark_connected(username: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.status = "connected"
    db.commit()
    return {"message": f"Account @{username} manually set to 'connected'."}

def normalize_cookies_to_storage_state(cookie_data) -> dict:
    cookies = []
    origins = []
    
    # If it's a dict, it might be a Playwright storage state
    if isinstance(cookie_data, dict):
        raw_cookies = cookie_data.get("cookies", [])
        origins = cookie_data.get("origins", [])
    elif isinstance(cookie_data, list):
        raw_cookies = cookie_data
    else:
        raise ValueError("Invalid session data format. Expected a JSON array of cookies or a Playwright storage state dictionary.")
        
    for rc in raw_cookies:
        if not isinstance(rc, dict):
            continue
        # Extract name, value, domain, path
        name = rc.get("name")
        value = rc.get("value")
        domain = rc.get("domain")
        path = rc.get("path", "/")
        
        if not name or not value or not domain:
            continue
            
        # Normalize fields
        expires = rc.get("expires") or rc.get("expirationDate")
        if expires is not None:
            try:
                expires = float(expires)
            except (ValueError, TypeError):
                expires = None
                
        http_only = rc.get("httpOnly")
        if http_only is None:
            http_only = rc.get("http_only", True)
            
        secure = rc.get("secure")
        if secure is None:
            secure = True
            
        same_site = rc.get("sameSite") or rc.get("same_site")
        if same_site:
            same_site_lower = str(same_site).lower()
            if "lax" in same_site_lower:
                same_site = "Lax"
            elif "strict" in same_site_lower:
                same_site = "Strict"
            elif "none" in same_site_lower or "no_restriction" in same_site_lower:
                same_site = "None"
            else:
                same_site = "Lax"
        else:
            same_site = "Lax"
            
        cookie = {
            "name": name,
            "value": value,
            "domain": domain,
            "path": path,
            "httpOnly": http_only,
            "secure": secure,
            "sameSite": same_site
        }
        if expires is not None:
            cookie["expires"] = expires
        cookies.append(cookie)
        
    return {
        "cookies": cookies,
        "origins": origins
    }

def run_verification_worker(username: str):
    import asyncio
    from backend.config import settings
    bot = InstagramBot(username)
    
    # Create a new event loop for this thread (bypasses Windows Proactor/Selector loop NotImplementedError)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # 1. Init browser headlessly
        loop.run_until_complete(bot.init_browser(headless=True))
        
        # 2. Check login status
        is_logged = loop.run_until_complete(bot.check_login_status())
        
        # 3. Close browser
        loop.run_until_complete(bot.close_browser())
        
        # 4. Update status in database
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.username == username).first()
            if account:
                user_data_path = os.path.abspath(os.path.join(settings.USER_DATA_DIR, username))
                storage_state_file = os.path.join(user_data_path, "storage_state.json")
                if is_logged:
                    account.status = "connected"
                    log_to_db("SUCCESS", f"Session verified successfully! Account @{username} is now connected.")
                else:
                    account.status = "verification_needed"
                    log_to_db("WARNING", f"Session cookies for @{username} are invalid or expired.")
                    
                    # Rename invalid storage state file
                    bad_file = os.path.join(user_data_path, "storage_state_invalid.json")
                    try:
                        if os.path.exists(storage_state_file):
                            if os.path.exists(bad_file):
                                os.remove(bad_file)
                            os.rename(storage_state_file, bad_file)
                    except Exception:
                        pass
                db.commit()
        except Exception as err:
            log_to_db("ERROR", f"Error updating status after session verification: {err}")
        finally:
            db.close()
            
    except Exception as e:
        log_to_db("ERROR", f"Verification thread failed for @{username}: {e}")
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.username == username).first()
            if account:
                account.status = "disconnected"
                db.commit()
        except Exception:
            pass
        finally:
            db.close()
    finally:
        loop.close()

@app.post("/api/accounts/{username}/session")
async def save_session_cookies(
    username: str, 
    request: Request, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from backend.config import settings
    account = db.query(Account).filter(Account.username == username).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format in session upload.")
        
    try:
        # 1. Normalize cookies
        normalized = normalize_cookies_to_storage_state(payload)
        if not normalized["cookies"]:
            raise HTTPException(status_code=400, detail="No valid cookies found in the session data.")
            
        # 2. Ensure user data folder exists
        user_data_path = os.path.abspath(os.path.join(settings.USER_DATA_DIR, username))
        os.makedirs(user_data_path, exist_ok=True)
        
        # 3. Write storage_state.json
        storage_state_file = os.path.join(user_data_path, "storage_state.json")
        with open(storage_state_file, "w", encoding="utf-8") as f:
            json.dump(normalized, f, indent=2)
            
        # Set account status to connecting (verifying)
        account.status = "connecting"
        db.commit()
        
        log_to_db("INFO", f"Saved session cookies for @{username}. Spawning verification thread...")
        
        # 4. Trigger verification in background thread to avoid Windows NotImplementedError
        background_tasks.add_task(run_verification_worker, username)
        
        return {"status": "connecting", "message": "Session uploaded successfully. Verifying connection..."}
        
    except ValueError as val_err:
        # Reset status if validation failed
        account.status = "disconnected"
        db.commit()
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        account.status = "disconnected"
        db.commit()
        log_to_db("ERROR", f"Failed to save session cookies for @{username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save session file: {str(e)}")

# Target Management
@app.get("/api/targets", response_model=List[TargetResponse])
def list_targets(db: Session = Depends(get_db)):
    return db.query(Target).order_by(Target.id.desc()).all()

@app.post("/api/targets", response_model=List[TargetResponse])
def add_targets(payload: TargetCreateSchema, db: Session = Depends(get_db)):
    added_targets = []
    for uname in payload.usernames:
        uname = uname.strip().replace("@", "")
        if not uname:
            continue
        # Avoid duplicate targets
        exists = db.query(Target).filter(Target.username == uname).first()
        if exists:
            # Re-enqueue if failed
            if exists.status == "failed":
                exists.status = "pending"
                exists.error_message = None
                added_targets.append(exists)
            continue
            
        new_target = Target(username=uname, status="pending")
        db.add(new_target)
        added_targets.append(new_target)
        
    db.commit()
    # Refresh items
    for item in added_targets:
        db.refresh(item)
    log_to_db("INFO", f"Enqueued {len(added_targets)} target usernames.")
    return added_targets

@app.post("/api/targets/upload")
async def upload_targets(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8")
    
    # Parse lines (comma separated, newline separated, or CSV formats)
    usernames = []
    for line in text.splitlines():
        # Split by comma or space
        parts = re.split(r'[,\s]+', line)
        for part in parts:
            part = part.strip().replace("@", "")
            if part:
                usernames.append(part)
                
    added = 0
    for uname in usernames:
        exists = db.query(Target).filter(Target.username == uname).first()
        if not exists:
            db.add(Target(username=uname, status="pending"))
            added += 1
            
    db.commit()
    log_to_db("INFO", f"Bulk uploaded target list. Added {added} new usernames.")
    return {"message": f"Successfully imported {added} new targets."}

@app.delete("/api/targets")
def clear_all_targets(db: Session = Depends(get_db)):
    db.query(Target).delete()
    db.commit()
    log_to_db("WARNING", "Cleared target list queue.")
    return {"message": "All targets cleared."}

@app.delete("/api/targets/{id}")
def delete_target(id: int, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return {"message": "Target removed."}

# Message Template Management
@app.get("/api/messages", response_model=List[MessageTemplateResponse])
def list_messages(db: Session = Depends(get_db)):
    return db.query(MessageTemplate).all()

@app.post("/api/messages", response_model=MessageTemplateResponse)
def add_message(payload: MessageTemplateSchema, db: Session = Depends(get_db)):
    db_tpl = MessageTemplate(
        name=payload.name,
        content=payload.content,
        is_active=payload.is_active
    )
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@app.patch("/api/messages/{id}")
def toggle_message_status(id: int, db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    tpl.is_active = not tpl.is_active
    db.commit()
    db.refresh(tpl)
    return tpl

@app.delete("/api/messages/{id}")
def delete_message(id: int, db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()
    return {"message": "Template deleted."}

# Settings Control
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_dict = {}
    rows = db.query(Setting).all()
    for row in rows:
        settings_dict[row.key] = row.value
    return settings_dict

@app.post("/api/settings")
def update_settings(payload: SettingUpdateSchema, db: Session = Depends(get_db)):
    # Update rows in DB
    items = {
        "daily_limit": str(payload.daily_limit),
        "min_delay": str(payload.min_delay),
        "max_delay": str(payload.max_delay),
        "working_hours_start": payload.working_hours_start,
        "working_hours_end": payload.working_hours_end,
        "api_mode": payload.api_mode,
        "opt_out_keywords": payload.opt_out_keywords,
        "consent_enforce": "true" if payload.consent_enforce else "false",
        "meta_page_access_token": payload.meta_page_access_token or "",
        "meta_verify_token": payload.meta_verify_token or ""
    }
    
    for k, v in items.items():
        row = db.query(Setting).filter(Setting.key == k).first()
        if row:
            row.value = v
        else:
            db.add(Setting(key=k, value=v))
            
    db.commit()
    log_to_db("INFO", "Updated bot settings.")
    return {"message": "Settings saved successfully."}

# Logs Endpoint
@app.get("/api/logs", response_model=List[LogResponse])
def get_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(BotLog).order_by(BotLog.timestamp.desc()).limit(limit).all()

# Bot Control Trigger
@app.post("/api/bot/start")
def start_bot(db: Session = Depends(get_db)):
    # Check if there is a connected account
    active_account = db.query(Account).filter(Account.status == "connected").first()
    if not active_account:
        raise HTTPException(status_code=400, detail="Cannot start bot: No active connected account found.")
        
    started = start_bot_background()
    if started:
        log_to_db("INFO", "Bot startup sequence triggered by API call.")
        return {"status": "running", "message": "Bot thread started."}
    else:
        return {"status": "running", "message": "Bot is already running."}

@app.post("/api/bot/stop")
def stop_bot(db: Session = Depends(get_db)):
    stopped = stop_bot_background()
    # Always ensure DB status is "stopped" even if bot wasn't flagged as running
    try:
        status_setting = db.query(Setting).filter(Setting.key == "status").first()
        if status_setting and status_setting.value != "stopped":
            status_setting.value = "stopped"
            db.commit()
    except Exception:
        pass
    if stopped:
        log_to_db("INFO", "Bot stop sequence triggered by API call.")
        return {"status": "stopped", "message": "Bot thread signaled to stop."}
    else:
        return {"status": "stopped", "message": "Bot was not running."}

# Monitored Posts CRUD
@app.get("/api/posts", response_model=List[MonitoredPostResponse])
def list_monitored_posts(db: Session = Depends(get_db)):
    return db.query(MonitoredPost).all()

@app.post("/api/posts", response_model=MonitoredPostResponse)
def add_monitored_post(payload: MonitoredPostCreate, db: Session = Depends(get_db)):
    # Verify template exists
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == payload.template_id).first()
    if not tpl:
        raise HTTPException(status_code=400, detail="Connected message template does not exist.")
        
    db_post = MonitoredPost(
        post_url=payload.post_url,
        trigger_keyword=payload.trigger_keyword,
        template_id=payload.template_id,
        is_active=payload.is_active
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    log_to_db("INFO", f"Configured post trigger monitoring for keyword '{payload.trigger_keyword}' on post.")
    return db_post

@app.delete("/api/posts/{id}")
def delete_monitored_post(id: int, db: Session = Depends(get_db)):
    post = db.query(MonitoredPost).filter(MonitoredPost.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Monitored post configuration not found.")
    
    # Explicitly clear processed comments history for this post to avoid orphan rows on SQLite reuse
    db.query(ProcessedComment).filter(ProcessedComment.post_id == id).delete()
    
    db.delete(post)
    db.commit()
    log_to_db("WARNING", f"Removed post monitoring trigger configuration (ID: {id})")
    return {"message": "Monitored post configuration removed."}

@app.patch("/api/posts/{id}")
def toggle_monitored_post_status(id: int, db: Session = Depends(get_db)):
    post = db.query(MonitoredPost).filter(MonitoredPost.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Monitored post configuration not found.")
    post.is_active = not post.is_active
    db.commit()
    db.refresh(post)
    return post

# Trigger History
@app.get("/api/history", response_model=List[ProcessedCommentResponse])
def get_trigger_history(limit: int = 100, db: Session = Depends(get_db)):
    history = db.query(ProcessedComment).order_by(ProcessedComment.processed_at.desc()).limit(limit).all()
    
    # Map post details for visual UI references
    result = []
    for item in history:
        # Fetch matching monitored post
        post = db.query(MonitoredPost).filter(MonitoredPost.id == item.post_id).first()
        post_url = post.post_url if post else "Deleted Post"
        trigger_keyword = post.trigger_keyword if post else "N/A"
        
        result.append(ProcessedCommentResponse(
            id=item.id,
            username=item.username,
            post_id=item.post_id,
            comment_text=item.comment_text,
            status=item.status,
            processed_at=item.processed_at,
            post_url=post_url,
            trigger_keyword=trigger_keyword
        ))
    return result

# OptOut Blocklist management
@app.get("/api/optouts", response_model=List[OptOutResponse])
def list_optouts(db: Session = Depends(get_db)):
    return db.query(OptOut).order_by(OptOut.id.desc()).all()

@app.post("/api/optouts", response_model=OptOutResponse)
def add_optout(payload: OptOutCreateSchema, db: Session = Depends(get_db)):
    clean_username = payload.username.strip().lower().replace("@", "")
    if not clean_username:
        raise HTTPException(status_code=400, detail="Invalid username")
        
    exists = db.query(OptOut).filter(OptOut.username == clean_username).first()
    if exists:
        return exists
        
    db_optout = OptOut(username=clean_username)
    db.add(db_optout)
    db.commit()
    db.refresh(db_optout)
    log_to_db("WARNING", f"Added user @{clean_username} to blocklist.")
    return db_optout

@app.delete("/api/optouts/{id}")
def delete_optout(id: int, db: Session = Depends(get_db)):
    optout = db.query(OptOut).filter(OptOut.id == id).first()
    if not optout:
        raise HTTPException(status_code=404, detail="Blocklist entry not found")
    db.delete(optout)
    db.commit()
    log_to_db("INFO", f"Removed user @{optout.username} from blocklist.")
    return {"message": "Blocklist entry removed."}

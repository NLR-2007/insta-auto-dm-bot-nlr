import os
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, date
import threading
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db, init_db, Account, Target, MessageTemplate, BotLog, Setting, log_to_db
from backend.bot import start_bot_background, stop_bot_background, InstagramBot, BOT_RUNNING

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
    title="Instagram Auto DM API",
    description="Backend service managing Playwright-based Instagram DM automation",
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

@app.get("/")
def read_root():
    return {"status": "online", "message": "Instagram Auto DM Bot API is running!"}


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

class LogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: str
    
    class Config:
        from_attributes = True

# --- API Endpoints ---

@app.get("/api/status")
def get_system_status(db: Session = Depends(get_db)):
    # Get active account info
    active_account = db.query(Account).filter(Account.status == "connected").first()
    active_user = active_account.username if active_account else None
    
    # Calculate stats
    today_start = datetime.combine(date.today(), datetime.min.time())
    sent_today = db.query(Target).filter(
        Target.status == "sent",
        Target.sent_at >= today_start
    ).count()
    
    pending_count = db.query(Target).filter(Target.status == "pending").count()
    failed_count = db.query(Target).filter(Target.status == "failed").count()
    total_sent = db.query(Target).filter(Target.status == "sent").count()
    
    # Get bot status from db
    status_setting = db.query(Setting).filter(Setting.key == "status").first()
    bot_status = status_setting.value if status_setting else "stopped"
    
    # Override with thread flag safety check
    if BOT_RUNNING and bot_status == "stopped":
        bot_status = "running"
    
    return {
        "bot_running": BOT_RUNNING or bot_status == "running",
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
        "working_hours_end": payload.working_hours_end
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
def stop_bot():
    stopped = stop_bot_background()
    if stopped:
        log_to_db("INFO", "Bot stop sequence triggered by API call.")
        return {"status": "stopped", "message": "Bot thread signaled to stop."}
    else:
        return {"status": "stopped", "message": "Bot was not running."}

import os
import json
from contextlib import asynccontextmanager
from typing import List, Optional, Union, Dict
from datetime import datetime, date
import threading
import asyncio
import secrets
import time
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.config import cors_origins, validate_runtime_config
from backend.database import get_db, init_db, Account, Target, MessageTemplate, BotLog, Setting, log_to_db, SessionLocal, MonitoredPost, ProcessedComment, OptOut, User, TgBotConfig, TgChannel, TgScheduledPost, TgModerationRule, TgPostLog, Workspace, WorkspaceMember, Subscription, Campaign, AutomationRunner, AuditLog
from backend.schemas import (
    UserRegisterSchema, UserLoginSchema, TokenResponse, UserResponseSchema,
    AccountSchema, AccountResponse, MonitoredPostCreate, MonitoredPostResponse,
    TargetCreateSchema, TargetResponse, MessageTemplateSchema, MessageTemplateResponse,
    AdminUserDetailResponse, AdminSystemStatsResponse,
    TgBotConfigCreate, TgScheduledPostCreate, TgModerationRuleCreate,
)
from backend.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin, get_current_workspace, require_workspace_role
)
from backend.security import encrypt_secret, decrypt_secret, mask_secret, secret_configured, stable_hash
import re
import backend.bot as bot_module
from backend.bot import start_bot_background, stop_bot_background, InstagramBot
from backend.official_api import router as official_api_router
from backend.telegram_service import telegram_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_runtime_config()
    # Initialize DB tables and default settings
    init_db()

    log_to_db("INFO", "FastAPI server started. DB initialized.")
    
    # Auto-start Telegram Service
    try:
        await telegram_service.start()
        log_to_db("INFO", "[TG] Telegram service automatically started on startup.")
    except Exception as e:
        log_to_db("ERROR", f"[TG] Failed to auto-start Telegram service: {e}")
        
    yield
    # Shutdown routine
    stop_bot_background()
    if telegram_service.is_running:
        await telegram_service.stop()
    log_to_db("INFO", "FastAPI server shutting down. Bot worker stopped.")

app = FastAPI(
    title="Lyvora Automation API",
    description="Backend service managing compliant Instagram DM automation",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(official_api_router)

@app.get("/")
def read_root():
    # Force uvicorn configuration reload (root-level .env updated)
    return {"status": "online", "message": "Lyvora Automation API is running!"}


# --- Settings / Logs / Trigger Schema Declarations ---

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


PLAN_LIMITS = {
    "trial": {
        "instagram_accounts": 1,
        "telegram_bots": 1,
        "campaigns": 2,
        "daily_dms": 15,
        "team_members": 1,
        "local_runners": 1,
    },
    "starter": {
        "instagram_accounts": 2,
        "telegram_bots": 1,
        "campaigns": 5,
        "daily_dms": 30,
        "team_members": 2,
        "local_runners": 1,
    },
    "pro": {
        "instagram_accounts": 5,
        "telegram_bots": 3,
        "campaigns": 20,
        "daily_dms": 100,
        "team_members": 5,
        "local_runners": 3,
    },
    "agency": {
        "instagram_accounts": 20,
        "telegram_bots": 10,
        "campaigns": 100,
        "daily_dms": 500,
        "team_members": 25,
        "local_runners": 10,
    },
}

LOGIN_ATTEMPTS: dict[str, list[float]] = {}


class WorkspaceCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    plan_slug: str
    automation_mode: str
    role: str
    created_at: datetime


class CampaignCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=140)
    channel: str = Field(default="instagram")
    mode: str = Field(default="comment_trigger")
    consent_source: str = Field(default="comment_keyword")
    daily_limit: int = Field(default=30, ge=1, le=500)
    account_id: Optional[int] = None
    template_id: Optional[int] = None
    trigger_keyword: Optional[str] = None


class RunnerCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    runner_type: str = Field(default="local")


def slugify_workspace(value: str, user_id: int) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    clean = "-".join(part for part in clean.split("-") if part)
    return f"{clean or 'workspace'}-{user_id}-{secrets.token_hex(2)}"


def active_workspace_for_user(db: Session, user: User) -> Workspace:
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == user.id
    ).order_by(WorkspaceMember.id.asc()).first()
    if not membership:
        workspace = Workspace(
            name=f"{user.username}'s Workspace",
            slug=slugify_workspace(user.username, user.id),
            owner_user_id=user.id,
        )
        db.add(workspace)
        db.flush()
        db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
        db.add(Subscription(workspace_id=workspace.id, plan_slug=workspace.plan_slug, status="trialing"))
        db.commit()
        db.refresh(workspace)
        return workspace
    return membership.workspace


def workspace_role(db: Session, workspace_id: int, user_id: int) -> str:
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    return membership.role if membership else "none"


def assert_plan_limit(db: Session, workspace: Workspace, metric: str, current_count: int):
    limits = PLAN_LIMITS.get(workspace.plan_slug, PLAN_LIMITS["starter"])
    limit = limits.get(metric)
    if limit is not None and current_count >= limit:
        raise HTTPException(
            status_code=402,
            detail=f"Plan limit reached for {metric}. Upgrade the workspace plan to continue.",
        )


def audit(db: Session, action: str, user: Optional[User] = None, workspace: Optional[Workspace] = None, entity_type: Optional[str] = None, entity_id: Optional[object] = None, metadata: Optional[dict] = None):
    db.add(AuditLog(
        workspace_id=workspace.id if workspace else None,
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        metadata_json=json.dumps(metadata or {}, separators=(",", ":")),
    ))


def check_login_rate_limit(username: str):
    now = time.time()
    window_start = now - 900
    key = username.lower()
    attempts = [ts for ts in LOGIN_ATTEMPTS.get(key, []) if ts >= window_start]
    if len(attempts) >= 8:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    attempts.append(now)
    LOGIN_ATTEMPTS[key] = attempts


def clear_login_rate_limit(username: str):
    LOGIN_ATTEMPTS.pop(username.lower(), None)

# --- Authentication Endpoints ---

@app.post("/api/auth/register", response_model=UserResponseSchema)
def register_user(payload: UserRegisterSchema, db: Session = Depends(get_db)):
    # Check duplicate username
    exists_username = db.query(User).filter(User.username == payload.username).first()
    if exists_username:
        raise HTTPException(status_code=400, detail="Username already registered.")
    
    exists_email = db.query(User).filter(User.email == payload.email).first()
    if exists_email:
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    hashed_pwd = get_password_hash(payload.password)
    db_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hashed_pwd,
        is_admin=False
    )
    db.add(db_user)
    db.flush()
    workspace = Workspace(
        name=f"{payload.username}'s Workspace",
        slug=slugify_workspace(payload.username, db_user.id),
        owner_user_id=db_user.id,
    )
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=db_user.id, role="owner"))
    db.add(Subscription(workspace_id=workspace.id, plan_slug=workspace.plan_slug, status="trialing"))
    audit(db, "user.registered", db_user, workspace, "user", db_user.id)
    db.commit()
    db.refresh(db_user)
    log_to_db("INFO", f"Registered new user: {payload.username}")
    return db_user

@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(payload: UserLoginSchema, db: Session = Depends(get_db)):
    check_login_rate_limit(payload.username)
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password.")
    if not getattr(user, "is_enabled", True):
        raise HTTPException(status_code=403, detail="This account is disabled.")
        
    clear_login_rate_limit(payload.username)
    token = create_access_token(data={"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_admin": user.is_admin,
        "username": user.username
    }


# --- SaaS Workspace / Plan / Runner Endpoints ---

@app.get("/api/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = active_workspace_for_user(db, current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "workspace": {
            "id": workspace.id,
            "name": workspace.name,
            "slug": workspace.slug,
            "plan_slug": workspace.plan_slug,
            "automation_mode": workspace.automation_mode,
            "role": workspace_role(db, workspace.id, current_user.id),
        },
    }


@app.get("/api/plans")
def list_plans():
    return [
        {"slug": slug, "limits": limits}
        for slug, limits in PLAN_LIMITS.items()
    ]


@app.get("/api/billing/subscription")
def get_subscription(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.workspace_id == workspace.id).order_by(Subscription.id.desc()).first()
    if not sub:
        sub = Subscription(
            workspace_id=workspace.id,
            plan_slug=workspace.plan_slug,
            status="trialing",
            provider="mock",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return {
        "workspace_id": workspace.id,
        "plan_slug": sub.plan_slug,
        "status": sub.status,
        "provider": sub.provider,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "limits": PLAN_LIMITS.get(sub.plan_slug, PLAN_LIMITS["starter"]),
        "billing_mode": "mock" if sub.provider == "mock" else sub.provider,
    }


@app.get("/api/workspaces", response_model=List[WorkspaceResponse])
def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    return [
        WorkspaceResponse(
            id=m.workspace.id,
            name=m.workspace.name,
            slug=m.workspace.slug,
            plan_slug=m.workspace.plan_slug,
            automation_mode=m.workspace.automation_mode,
            role=m.role,
            created_at=m.workspace.created_at,
        )
        for m in memberships
    ]


@app.post("/api/workspaces", response_model=WorkspaceResponse)
def create_workspace(payload: WorkspaceCreateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).count()
    if memberships >= 3 and not current_user.is_admin:
        raise HTTPException(status_code=402, detail="Workspace limit reached for this account.")
    workspace = Workspace(
        name=payload.name,
        slug=slugify_workspace(payload.name, current_user.id),
        owner_user_id=current_user.id,
    )
    db.add(workspace)
    db.flush()
    member = WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="owner")
    db.add(member)
    db.add(Subscription(workspace_id=workspace.id, plan_slug=workspace.plan_slug, status="trialing"))
    audit(db, "workspace.created", current_user, workspace, "workspace", workspace.id)
    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        plan_slug=workspace.plan_slug,
        automation_mode=workspace.automation_mode,
        role="owner",
        created_at=workspace.created_at,
    )


@app.get("/api/campaigns")
def list_campaigns(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.workspace_id == workspace.id).order_by(Campaign.id.desc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "channel": c.channel,
            "mode": c.mode,
            "status": c.status,
            "consent_source": c.consent_source,
            "daily_limit": c.daily_limit,
            "account_id": c.account_id,
            "template_id": c.template_id,
            "trigger_keyword": c.trigger_keyword,
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


@app.post("/api/campaigns")
def create_campaign(payload: CampaignCreateSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    campaign_count = db.query(Campaign).filter(Campaign.workspace_id == workspace.id).count()
    assert_plan_limit(db, workspace, "campaigns", campaign_count)

    if payload.account_id:
        account = db.query(Account).filter(Account.id == payload.account_id, Account.workspace_id == workspace.id).first()
        if not account:
            raise HTTPException(status_code=400, detail="Account does not belong to this workspace.")
    if payload.template_id:
        template = db.query(MessageTemplate).filter(MessageTemplate.id == payload.template_id, MessageTemplate.workspace_id == workspace.id).first()
        if not template:
            raise HTTPException(status_code=400, detail="Template does not belong to this workspace.")

    campaign = Campaign(
        workspace_id=workspace.id,
        name=payload.name,
        channel=payload.channel,
        mode=payload.mode,
        consent_source=payload.consent_source,
        daily_limit=min(payload.daily_limit, PLAN_LIMITS.get(workspace.plan_slug, PLAN_LIMITS["starter"])["daily_dms"]),
        account_id=payload.account_id,
        template_id=payload.template_id,
        trigger_keyword=payload.trigger_keyword,
        created_by_user_id=current_user.id,
    )
    db.add(campaign)
    audit(db, "campaign.created", current_user, workspace, "campaign", campaign.id)
    db.commit()
    db.refresh(campaign)
    return {"id": campaign.id, "status": campaign.status}


@app.patch("/api/campaigns/{campaign_id}/status")
def set_campaign_status(campaign_id: int, status_value: str, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    if status_value not in {"draft", "active", "paused", "completed"}:
        raise HTTPException(status_code=400, detail="Invalid campaign status.")
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.workspace_id == workspace.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    campaign.status = status_value
    audit(db, "campaign.status_changed", current_user, workspace, "campaign", campaign.id, {"status": status_value})
    db.commit()
    return {"id": campaign.id, "status": campaign.status}


@app.get("/api/runners")
def list_runners(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    runners = db.query(AutomationRunner).filter(AutomationRunner.workspace_id == workspace.id).order_by(AutomationRunner.id.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "status": r.status,
            "runner_type": r.runner_type,
            "last_seen_at": r.last_seen_at.isoformat() if r.last_seen_at else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in runners
    ]


@app.post("/api/runners")
def create_runner(payload: RunnerCreateSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin")), db: Session = Depends(get_db)):
    runner_count = db.query(AutomationRunner).filter(AutomationRunner.workspace_id == workspace.id).count()
    assert_plan_limit(db, workspace, "local_runners", runner_count)
    token = f"ggr_{secrets.token_urlsafe(32)}"
    runner = AutomationRunner(
        workspace_id=workspace.id,
        name=payload.name,
        runner_type=payload.runner_type,
        token_hash=stable_hash(token),
        status="created",
    )
    db.add(runner)
    audit(db, "runner.created", current_user, workspace, "runner", runner.id)
    db.commit()
    db.refresh(runner)
    return {
        "id": runner.id,
        "name": runner.name,
        "token": token,
        "message": "Store this token now. It will not be shown again.",
    }


@app.post("/api/runners/heartbeat")
def runner_heartbeat(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Runner token is required.")
    token = authorization.split(" ", 1)[1].strip()
    runner = db.query(AutomationRunner).filter(AutomationRunner.token_hash == stable_hash(token)).first()
    if not runner:
        raise HTTPException(status_code=401, detail="Invalid runner token.")
    runner.status = "online"
    runner.last_seen_at = datetime.utcnow()
    db.commit()
    return {
        "ok": True,
        "runner_id": runner.id,
        "workspace_id": runner.workspace_id,
        "status": runner.status,
        "last_seen_at": runner.last_seen_at.isoformat(),
    }

# --- Protected User Endpoints ---

@app.get("/api/status")
def get_system_status(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    # Get active accounts owned by the user
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()
    user_account_ids = [a.id for a in user_accounts]
    active_account = next((a for a in user_accounts if a.status == "connected"), None)
    active_user = active_account.username if active_account else None
    
    # Calculate stats scoped to the user
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    # Targets DMs
    target_sent_today = db.query(Target).filter(
        Target.status == "sent",
        Target.sent_at >= today_start,
        Target.account_id.in_(user_account_ids)
    ).count() if user_account_ids else 0
    
    # Fetch user monitored posts
    monitored_posts = db.query(MonitoredPost).filter(MonitoredPost.account_id.in_(user_account_ids)).all() if user_account_ids else []
    monitored_post_ids = [p.id for p in monitored_posts]
    
    # Comment DMs
    comment_sent_today = db.query(ProcessedComment).filter(
        ProcessedComment.status == "sent",
        ProcessedComment.processed_at >= today_start,
        ProcessedComment.post_id.in_(monitored_post_ids)
    ).count() if monitored_post_ids else 0
    
    sent_today = target_sent_today + comment_sent_today
    
    pending_count = db.query(Target).filter(
        Target.status == "pending",
        Target.account_id.in_(user_account_ids)
    ).count() if user_account_ids else 0
    
    target_failed = db.query(Target).filter(Target.status == "failed", Target.account_id.in_(user_account_ids)).count() if user_account_ids else 0
    comment_failed = db.query(ProcessedComment).filter(ProcessedComment.status == "failed", ProcessedComment.post_id.in_(monitored_post_ids)).count() if monitored_post_ids else 0
    failed_count = target_failed + comment_failed
    
    target_total_sent = db.query(Target).filter(Target.status == "sent", Target.account_id.in_(user_account_ids)).count() if user_account_ids else 0
    comment_total_sent = db.query(ProcessedComment).filter(ProcessedComment.status == "sent", ProcessedComment.post_id.in_(monitored_post_ids)).count() if monitored_post_ids else 0
    total_sent = target_total_sent + comment_total_sent
    
    system_running = bot_module.BOT_RUNNING
    user_active = getattr(current_user, "automation_active", False)

    return {
        "bot_running": system_running and user_active,
        "system_running": system_running,
        "user_automation_active": user_active,
        "active_account": active_user,
        "sent_today": sent_today,
        "pending_count": pending_count,
        "failed_count": failed_count,
        "total_sent": total_sent
    }

# Account management
@app.get("/api/accounts", response_model=List[AccountResponse])
def list_accounts(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    return db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()

@app.post("/api/accounts", response_model=AccountResponse)
def add_account(payload: AccountSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    account_count = db.query(Account).filter(Account.workspace_id == workspace.id).count()
    assert_plan_limit(db, workspace, "instagram_accounts", account_count)
    # Check duplicate handle globally
    exists = db.query(Account).filter(Account.username == payload.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Account handle is already linked.")
        
    db_account = Account(
        username=payload.username,
        password=encrypt_secret(payload.password),
        status="disconnected",
        user_id=current_user.id,
        workspace_id=workspace.id,
        proxy_host=payload.proxy_host,
        proxy_port=payload.proxy_port,
        proxy_username=payload.proxy_username,
        proxy_password=encrypt_secret(payload.proxy_password)
    )
    db.add(db_account)
    audit(db, "instagram_account.linked", current_user, workspace, "account", db_account.id, {"username": payload.username})
    db.commit()
    db.refresh(db_account)
    log_to_db("INFO", f"User {current_user.username} linked new account: @{payload.username}")
    return db_account

@app.delete("/api/accounts/{username}")
def delete_account(username: str, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    db.delete(account)
    db.commit()
    log_to_db("WARNING", f"User {current_user.username} deleted account: @{username}")
    return {"message": f"Account @{username} successfully removed."}

# Verification & login routines
def run_login_worker(username: str):
    bot = InstagramBot(username)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        success = loop.run_until_complete(bot.run_manual_login_session())
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.username == username).first()
            if account:
                account.status = "connected" if success else "disconnected"
                db.commit()
        finally:
            db.close()
    except Exception as e:
        log_to_db("ERROR", f"Manual login worker failed: {e}")
    finally:
        loop.close()

@app.post("/api/accounts/{username}/login")
def trigger_manual_login(username: str, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    account.status = "connecting"
    db.commit()
    background_tasks.add_task(run_login_worker, username)
    return {"message": "Visible browser window launched on host. Please log in manually."}

@app.post("/api/accounts/{username}/mark-connected")
def force_mark_connected(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.username == username, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    account.status = "connected"
    db.commit()
    return {"message": f"Account @{username} manually set to 'connected'."}

def run_verification_worker(username: str, proxy_config: Optional[dict] = None):
    bot = InstagramBot(username, proxy=proxy_config)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(bot.init_browser(headless=True))
        is_logged = loop.run_until_complete(bot.check_login_status())
        loop.run_until_complete(bot.close_browser())
        
        db = SessionLocal()
        try:
            account = db.query(Account).filter(Account.username == username).first()
            if account:
                account.status = "connected" if is_logged else "verification_needed"
                db.commit()
        finally:
            db.close()
    except Exception as e:
        log_to_db("ERROR", f"Manual verification session failed: {e}")
    finally:
        loop.close()

@app.post("/api/accounts/{username}/session")
async def save_session_cookies(
    username: str, 
    request: Request, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.config import settings
    account = db.query(Account).filter(Account.username == username, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    try:
        payload = await request.json()
        normalized = normalize_cookies_to_storage_state(payload)
        if not normalized["cookies"]:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cookie session JSON payload structure.")

    user_data_path = os.path.abspath(os.path.join(settings.USER_DATA_DIR, username))
    os.makedirs(user_data_path, exist_ok=True)
    storage_state_file = os.path.join(user_data_path, "storage_state.json")
    with open(storage_state_file, "w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2)

    account.status = "connecting"
    db.commit()
    
    proxy_config = None
    if account.proxy_host and account.proxy_port:
        proxy_config = {
            "server": f"http://{account.proxy_host}:{account.proxy_port}"
        }
        if account.proxy_username and account.proxy_password:
            proxy_config["username"] = account.proxy_username
            proxy_config["password"] = decrypt_secret(account.proxy_password)

    background_tasks.add_task(run_verification_worker, username, proxy_config)
    return {"status": "connecting", "message": "Cookies imported successfully. Triggering validation..."}

def normalize_cookies_to_storage_state(cookie_data) -> dict:
    cookies = []
    origins = []
    if isinstance(cookie_data, dict):
        raw_cookies = cookie_data.get("cookies", [])
        origins = cookie_data.get("origins", [])
    elif isinstance(cookie_data, list):
        raw_cookies = cookie_data
    else:
        raise ValueError("Invalid format")

    for rc in raw_cookies:
        if not isinstance(rc, dict):
            continue
        name = rc.get("name")
        value = rc.get("value")
        domain = rc.get("domain")
        path = rc.get("path", "/")
        if not name or not value or not domain:
            continue
            
        cookie = {
            "name": name,
            "value": value,
            "domain": domain,
            "path": path,
            "httpOnly": rc.get("httpOnly", rc.get("http_only", True)),
            "secure": rc.get("secure", True),
            "sameSite": "Lax"
        }
        cookies.append(cookie)
        
    return {"cookies": cookies, "origins": origins}

# Target Queue endpoints
@app.get("/api/targets", response_model=List[TargetResponse])
def list_targets(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()
    user_account_ids = [a.id for a in user_accounts]
    return db.query(Target).filter(Target.account_id.in_(user_account_ids)).order_by(Target.id.desc()).all() if user_account_ids else []

@app.post("/api/targets", response_model=List[TargetResponse])
def add_targets(payload: TargetCreateSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    # Verify account ownership
    account = db.query(Account).filter(Account.id == payload.account_id, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Invalid associated account ID.")
        
    added_targets = []
    for uname in payload.usernames:
        uname = uname.strip().replace("@", "")
        if not uname:
            continue
        exists = db.query(Target).filter(Target.username == uname, Target.account_id == payload.account_id).first()
        if exists:
            if exists.status == "failed":
                exists.status = "pending"
                exists.error_message = None
                added_targets.append(exists)
            continue
            
        new_target = Target(username=uname, status="pending", account_id=payload.account_id)
        db.add(new_target)
        added_targets.append(new_target)
        
    db.commit()
    for item in added_targets:
        db.refresh(item)
    return added_targets

@app.post("/api/targets/upload")
async def upload_targets(
    account_id: int, 
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user), 
    workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Invalid associated account ID.")
        
    content = await file.read()
    text = content.decode("utf-8")
    usernames = []
    for line in text.splitlines():
        parts = re.split(r'[,\s]+', line)
        for part in parts:
            part = part.strip().replace("@", "")
            if part:
                usernames.append(part)
                
    added = 0
    for uname in usernames:
        exists = db.query(Target).filter(Target.username == uname, Target.account_id == account_id).first()
        if not exists:
            db.add(Target(username=uname, status="pending", account_id=account_id))
            added += 1
            
    db.commit()
    return {"message": f"Successfully imported {added} new targets."}

@app.delete("/api/targets")
def clear_all_targets(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()
    user_account_ids = [a.id for a in user_accounts]
    if user_account_ids:
        db.query(Target).filter(Target.account_id.in_(user_account_ids)).delete(synchronize_session=False)
        db.commit()
    return {"message": "All targets cleared."}

@app.delete("/api/targets/{id}")
def delete_target(id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found.")
    account = db.query(Account).filter(Account.id == target.account_id, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(target)
    db.commit()
    return {"message": "Target removed."}

# Message Template management
@app.get("/api/messages", response_model=List[MessageTemplateResponse])
def list_messages(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    return db.query(MessageTemplate).filter(MessageTemplate.user_id == current_user.id, MessageTemplate.workspace_id == workspace.id).all()

@app.post("/api/messages", response_model=MessageTemplateResponse)
def add_message(payload: MessageTemplateSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    db_tpl = MessageTemplate(
        name=payload.name,
        content=payload.content,
        is_active=payload.is_active,
        user_id=current_user.id,
        workspace_id=workspace.id
    )
    db.add(db_tpl)
    audit(db, "template.created", current_user, workspace, "message_template", db_tpl.id)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@app.patch("/api/messages/{id}")
def toggle_message_status(id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == id, MessageTemplate.user_id == current_user.id, MessageTemplate.workspace_id == workspace.id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    tpl.is_active = not tpl.is_active
    db.commit()
    return tpl

@app.delete("/api/messages/{id}")
def delete_message(id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == id, MessageTemplate.user_id == current_user.id, MessageTemplate.workspace_id == workspace.id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(tpl)
    db.commit()
    return {"message": "Template deleted."}

# Monitored Posts CRUD
@app.get("/api/posts", response_model=List[MonitoredPostResponse])
def list_monitored_posts(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()
    user_account_ids = [a.id for a in user_accounts]
    return db.query(MonitoredPost).filter(MonitoredPost.account_id.in_(user_account_ids)).all() if user_account_ids else []

@app.post("/api/posts", response_model=MonitoredPostResponse)
def add_monitored_post(payload: MonitoredPostCreate, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == payload.account_id, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Invalid associated account ID.")
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == payload.template_id, MessageTemplate.user_id == current_user.id, MessageTemplate.workspace_id == workspace.id).first()
    if not tpl:
        raise HTTPException(status_code=400, detail="Associated message template not found.")
        
    db_post = MonitoredPost(
        post_url=payload.post_url,
        trigger_keyword=payload.trigger_keyword,
        template_id=payload.template_id,
        is_active=payload.is_active,
        account_id=payload.account_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@app.delete("/api/posts/{id}")
def delete_monitored_post(id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    post = db.query(MonitoredPost).filter(MonitoredPost.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Monitored post not found.")
    account = db.query(Account).filter(Account.id == post.account_id, Account.user_id == current_user.id, Account.workspace_id == workspace.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    db.query(ProcessedComment).filter(ProcessedComment.post_id == id).delete()
    db.delete(post)
    db.commit()
    return {"message": "Monitored post removed."}

# History
@app.get("/api/history", response_model=List[ProcessedCommentResponse])
def get_trigger_history(limit: int = 100, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id, Account.workspace_id == workspace.id).all()
    user_account_ids = [a.id for a in user_accounts]
    if not user_account_ids:
        return []
        
    user_posts = db.query(MonitoredPost).filter(MonitoredPost.account_id.in_(user_account_ids)).all()
    user_post_ids = [p.id for p in user_posts]
    if not user_post_ids:
        return []
        
    history = db.query(ProcessedComment).filter(ProcessedComment.post_id.in_(user_post_ids)).order_by(ProcessedComment.processed_at.desc()).limit(limit).all()
    result = []
    for item in history:
        post = next((p for p in user_posts if p.id == item.post_id), None)
        result.append(ProcessedCommentResponse(
            id=item.id,
            username=item.username,
            post_id=item.post_id,
            comment_text=item.comment_text,
            status=item.status,
            processed_at=item.processed_at,
            post_url=post.post_url if post else "Deleted Post",
            trigger_keyword=post.trigger_keyword if post else "N/A"
        ))
    return result

# Opt-outs
@app.get("/api/optouts", response_model=List[OptOutResponse])
def list_optouts(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    return db.query(OptOut).filter(OptOut.user_id == current_user.id, OptOut.workspace_id == workspace.id).order_by(OptOut.id.desc()).all()

@app.post("/api/optouts", response_model=OptOutResponse)
def add_optout(payload: OptOutCreateSchema, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    clean_username = payload.username.strip().lower().replace("@", "")
    if not clean_username:
        raise HTTPException(status_code=400, detail="Invalid username.")
    exists = db.query(OptOut).filter(OptOut.username == clean_username, OptOut.user_id == current_user.id, OptOut.workspace_id == workspace.id).first()
    if exists:
        return exists
    db_optout = OptOut(username=clean_username, user_id=current_user.id, workspace_id=workspace.id)
    db.add(db_optout)
    db.commit()
    db.refresh(db_optout)
    return db_optout

@app.delete("/api/optouts/{id}")
def delete_optout(id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    optout = db.query(OptOut).filter(OptOut.id == id, OptOut.user_id == current_user.id, OptOut.workspace_id == workspace.id).first()
    if not optout:
        raise HTTPException(status_code=404, detail="Blocklist entry not found.")
    db.delete(optout)
    db.commit()
    return {"message": "Blocklist entry removed."}

# Settings Control (Admin Protected)
@app.get("/api/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings_dict = {}
    secret_keys = {"meta_page_access_token", "meta_verify_token"}
    rows = db.query(Setting).all()
    for row in rows:
        if row.key in secret_keys:
            settings_dict[row.key] = ""
            settings_dict[f"{row.key}_configured"] = secret_configured(row.value)
            settings_dict[f"{row.key}_masked"] = mask_secret(row.value)
        else:
            settings_dict[row.key] = row.value
    return settings_dict

@app.post("/api/settings")
def update_settings(payload: SettingUpdateSchema, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    items = {
        "daily_limit": str(payload.daily_limit),
        "min_delay": str(payload.min_delay),
        "max_delay": str(payload.max_delay),
        "working_hours_start": payload.working_hours_start,
        "working_hours_end": payload.working_hours_end,
        "api_mode": payload.api_mode,
        "opt_out_keywords": payload.opt_out_keywords,
        "consent_enforce": "true" if payload.consent_enforce else "false",
    }
    if payload.meta_page_access_token:
        items["meta_page_access_token"] = encrypt_secret(payload.meta_page_access_token)
    if payload.meta_verify_token:
        items["meta_verify_token"] = encrypt_secret(payload.meta_verify_token)
    for k, v in items.items():
        row = db.query(Setting).filter(Setting.key == k).first()
        if row:
            row.value = v
        else:
            db.add(Setting(key=k, value=v))
    db.commit()
    log_to_db("INFO", "Admin updated bot settings configuration parameters.")
    return {"message": "Settings saved successfully."}

@app.get("/api/logs", response_model=List[LogResponse])
def get_logs(limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(BotLog).order_by(BotLog.timestamp.desc()).limit(limit).all()

# Bot Control (Admin Protected)
@app.post("/api/bot/start")
def start_bot(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not bot_module.BOT_RUNNING:
        raise HTTPException(status_code=403, detail="System automation is not enabled. Ask an admin to start the system first.")
    current_user.automation_active = True
    db.commit()
    log_to_db("INFO", f"User @{current_user.username} activated their automation.")
    return {"status": "running", "message": "Your automation is now active."}

@app.post("/api/bot/stop")
def stop_bot(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.automation_active = False
    db.commit()
    log_to_db("INFO", f"User @{current_user.username} paused their automation.")
    return {"status": "stopped", "message": "Your automation is now paused."}

# --- Dedicated Admin Panel Metrics & Reporting Endpoints ---

@app.get("/api/admin/users")
def admin_list_users(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        accounts = db.query(Account).filter(Account.user_id == u.id).all()
        account_ids = [a.id for a in accounts]

        dms_sent = 0
        dms_failed = 0
        pending = 0
        if account_ids:
            dms_sent += db.query(Target).filter(Target.account_id.in_(account_ids), Target.status == "sent").count()
            dms_failed += db.query(Target).filter(Target.account_id.in_(account_ids), Target.status == "failed").count()
            pending += db.query(Target).filter(Target.account_id.in_(account_ids), Target.status == "pending").count()
            post_ids = [p.id for p in db.query(MonitoredPost).filter(MonitoredPost.account_id.in_(account_ids)).all()]
            if post_ids:
                dms_sent += db.query(ProcessedComment).filter(ProcessedComment.post_id.in_(post_ids), ProcessedComment.status == "sent").count()
                dms_failed += db.query(ProcessedComment).filter(ProcessedComment.post_id.in_(post_ids), ProcessedComment.status == "failed").count()

        tg_bot_objs = db.query(TgBotConfig).filter(TgBotConfig.user_id == u.id).all()
        tg_bots_count = len(tg_bot_objs)
        tg_channels_count = 0
        if tg_bot_objs:
            tg_bot_ids = [b.id for b in tg_bot_objs]
            tg_channels_count = db.query(TgChannel).filter(TgChannel.bot_id.in_(tg_bot_ids)).count()

        acct_schemas = [
            {"id": a.id, "username": a.username, "status": a.status,
             "proxy_host": a.proxy_host, "proxy_port": a.proxy_port,
             "created_at": a.created_at.isoformat()}
            for a in accounts
        ]
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_enabled": getattr(u, "is_enabled", True),
            "created_at": u.created_at.isoformat(),
            "accounts": acct_schemas,
            "ig_accounts": len(accounts),
            "dms_sent": dms_sent,
            "dms_failed": dms_failed,
            "pending": pending,
            "tg_bots": tg_bots_count,
            "tg_channels": tg_channels_count,
        })
    return result

@app.patch("/api/admin/users/{user_id}/toggle-admin")
def admin_toggle_admin(user_id: int, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own admin status.")
    target_user.is_admin = not target_user.is_admin
    db.commit()
    action = "granted" if target_user.is_admin else "revoked"
    log_to_db("WARNING", f"Admin {current_admin.username} {action} admin privileges for @{target_user.username}")
    return {"message": f"Admin privileges {action} for @{target_user.username}."}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    username = target_user.username
    db.delete(target_user)
    db.commit()
    log_to_db("WARNING", f"Admin {current_admin.username} deleted user @{username} and all associated data.")
    return {"message": f"User @{username} permanently deleted."}

@app.get("/api/admin/stats")
def admin_system_stats(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_accounts = db.query(Account).count()
    total_targets_sent = db.query(Target).filter(Target.status == "sent").count()
    total_comments_sent = db.query(ProcessedComment).filter(ProcessedComment.status == "sent").count()
    total_targets_failed = db.query(Target).filter(Target.status == "failed").count()
    total_comments_failed = db.query(ProcessedComment).filter(ProcessedComment.status == "failed").count()
    total_pending_targets = db.query(Target).filter(Target.status == "pending").count()

    total_tg_bots = db.query(TgBotConfig).count()
    total_tg_channels = db.query(TgChannel).count()
    total_tg_posts_sent = db.query(TgScheduledPost).filter(TgScheduledPost.status == "sent").count()
    total_tg_posts_pending = db.query(TgScheduledPost).filter(TgScheduledPost.status == "pending").count()

    bot_running_flag = bot_module.BOT_RUNNING
    tg_running = telegram_service.is_running

    return {
        "ig_bot_running": bot_running_flag,
        "tg_service_running": tg_running,
        "bot_running": bot_running_flag,
        "total_users": total_users,
        "total_accounts": total_accounts,
        "total_dms_sent": total_targets_sent + total_comments_sent,
        "total_dms_failed": total_targets_failed + total_comments_failed,
        "total_pending_targets": total_pending_targets,
        "total_tg_bots": total_tg_bots,
        "total_tg_channels": total_tg_channels,
        "total_tg_posts_sent": total_tg_posts_sent,
        "total_tg_posts_pending": total_tg_posts_pending,
    }


@app.patch("/api/admin/users/{user_id}/toggle-enabled")
def admin_toggle_user_enabled(user_id: int, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot disable your own account.")
    target_user.is_enabled = not getattr(target_user, "is_enabled", True)
    db.commit()
    action = "enabled" if target_user.is_enabled else "disabled"
    log_to_db("WARNING", f"Admin {current_admin.username} {action} user @{target_user.username}")
    return {"message": f"User @{target_user.username} {action}.", "is_enabled": target_user.is_enabled}


@app.post("/api/admin/system/start")
async def admin_start_all(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    ig_started = start_bot_background()
    if not telegram_service.is_running:
        await telegram_service.start()
    log_to_db("INFO", f"Admin {current_admin.username} started all automation systems (IG + TG)")
    return {
        "ig_bot_running": True,
        "tg_service_running": telegram_service.is_running,
    }


@app.post("/api/admin/system/stop")
async def admin_stop_all(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    stop_bot_background()
    if telegram_service.is_running:
        await telegram_service.stop()
    try:
        status_setting = db.query(Setting).filter(Setting.key == "status").first()
        if status_setting:
            status_setting.value = "stopped"
            db.commit()
    except Exception:
        pass
    log_to_db("INFO", f"Admin {current_admin.username} stopped all automation systems (IG + TG)")
    return {
        "ig_bot_running": False,
        "tg_service_running": False,
    }


# ══════════════════════════════════════════════════════════════════════════════
# TELEGRAM AUTOMATION ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Telegram Bot Config ───────────────────────────────────────────────────────

@app.post("/api/tg/bots")
async def tg_add_bot(req: TgBotConfigCreate, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    bot_count = db.query(TgBotConfig).filter(TgBotConfig.workspace_id == workspace.id).count()
    assert_plan_limit(db, workspace, "telegram_bots", bot_count)
    try:
        info = await telegram_service.validate_token(req.bot_token)
    except Exception as e:
        raise HTTPException(400, f"Invalid bot token: {e}")

    token_hash = stable_hash(req.bot_token)
    existing = db.query(TgBotConfig).filter(
        TgBotConfig.bot_token_hash == token_hash,
        TgBotConfig.workspace_id == workspace.id,
    ).first()
    if existing:
        raise HTTPException(400, "Bot already added")

    bot = TgBotConfig(
        bot_token=encrypt_secret(req.bot_token),
        bot_token_hash=token_hash,
        bot_username=info.get("username"),
        bot_name=info.get("first_name"),
        user_id=current_user.id,
        workspace_id=workspace.id,
    )
    db.add(bot)
    audit(db, "telegram_bot.added", current_user, workspace, "tg_bot", bot.id, {"bot_username": bot.bot_username})
    db.commit()
    db.refresh(bot)
    log_to_db("INFO", f"[TG] Bot @{bot.bot_username} added by {current_user.username}")
    return {"id": bot.id, "bot_username": bot.bot_username, "bot_name": bot.bot_name}


@app.get("/api/tg/bots")
def tg_list_bots(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = active_workspace_for_user(db, current_user)
    bots = db.query(TgBotConfig).filter(TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).all()
    return [
        {
            "id": b.id, "bot_username": b.bot_username, "bot_name": b.bot_name,
            "is_active": b.is_active, "created_at": b.created_at.isoformat(),
            "channel_count": len(b.channels),
        }
        for b in bots
    ]


@app.delete("/api/tg/bots/{bot_id}")
def tg_delete_bot(bot_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = active_workspace_for_user(db, current_user)
    bot = db.query(TgBotConfig).filter(TgBotConfig.id == bot_id, TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).first()
    if not bot:
        raise HTTPException(404, "Bot not found")
    db.delete(bot)
    db.commit()
    return {"ok": True}


# ── Telegram Channels ────────────────────────────────────────────────────────

@app.post("/api/tg/bots/{bot_id}/refresh-channels")
async def tg_refresh_channels(bot_id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    bot = db.query(TgBotConfig).filter(TgBotConfig.id == bot_id, TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).first()
    if not bot:
        raise HTTPException(404, "Bot not found")

    channels = await telegram_service.fetch_bot_channels(bot_id, db)
    return [
        {"id": c.id, "chat_id": c.chat_id, "title": c.title, "chat_type": c.chat_type, "member_count": c.member_count}
        for c in channels
    ]


@app.get("/api/tg/channels")
def tg_list_channels(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    bots = db.query(TgBotConfig).filter(TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).all()
    bot_ids = [b.id for b in bots]
    if not bot_ids:
        return []

    channels = db.query(TgChannel).filter(TgChannel.bot_id.in_(bot_ids)).all()
    return [
        {
            "id": c.id, "chat_id": c.chat_id, "title": c.title,
            "chat_type": c.chat_type, "member_count": c.member_count,
            "is_active": c.is_active, "bot_username": c.bot.bot_username,
        }
        for c in channels
    ]


@app.post("/api/tg/channels/add-manual")
async def tg_add_channel_manual(
    bot_id: int,
    chat_id: str,
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")),
    db: Session = Depends(get_db),
):
    bot = db.query(TgBotConfig).filter(TgBotConfig.id == bot_id, TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).first()
    if not bot:
        raise HTTPException(404, "Bot not found")

    parsed_id = int(chat_id) if chat_id.lstrip("-").isdigit() else chat_id
    try:
        chat_info = await telegram_service.api_call(bot.bot_token, "getChat", chat_id=parsed_id)
        member_count_data = await telegram_service.api_call(bot.bot_token, "getChatMemberCount", chat_id=parsed_id)
        member_count = member_count_data if isinstance(member_count_data, int) else 0
    except Exception as e:
        raise HTTPException(400, f"Cannot access chat: {e}. Make sure the bot is added as admin to the channel/group first.")

    real_chat_id = str(chat_info.get("id", chat_id))
    existing = db.query(TgChannel).filter(TgChannel.bot_id == bot_id, TgChannel.chat_id == real_chat_id).first()
    if existing:
        raise HTTPException(400, "Channel already added")

    ch = TgChannel(
        chat_id=real_chat_id,
        title=chat_info.get("title", "Unknown"),
        chat_type=chat_info.get("type", "channel"),
        member_count=member_count,
        bot_id=bot_id,
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return {"id": ch.id, "chat_id": ch.chat_id, "title": ch.title, "chat_type": ch.chat_type, "member_count": ch.member_count}


# ── Telegram File Upload ─────────────────────────────────────────────────────

import uuid
from fastapi.responses import FileResponse

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "tg")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/tg/upload")
async def tg_upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    allowed_ext = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".mp4", ".pdf", ".doc", ".docx", ".zip", ".txt", ".csv"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(400, f"File type {ext} not allowed")

    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 50MB)")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return {"filename": unique_name, "original_name": file.filename, "size": len(content)}

@app.get("/api/tg/uploads/{filename}")
async def tg_get_upload(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)

# ── Telegram Scheduled Posts ─────────────────────────────────────────────────

@app.post("/api/tg/posts/schedule")
def tg_schedule_post(req: TgScheduledPostCreate, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    channel = db.query(TgChannel).filter(TgChannel.id == req.channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")

    bot = channel.bot
    if bot.user_id != current_user.id or bot.workspace_id != workspace.id:
        raise HTTPException(403, "Not your channel")

    batch_json = None
    if req.batch_messages:
        batch_json = json.dumps(req.batch_messages)

    post = TgScheduledPost(
        content=req.content,
        message_type=req.message_type or "text",
        media_type=req.media_type,
        media_path=req.media_path,
        scheduled_at=req.scheduled_at,
        is_recurring=req.is_recurring,
        recurrence_rule=req.recurrence_rule,
        batch_messages=batch_json,
        channel_id=req.channel_id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    from datetime import timedelta
    ist_time = req.scheduled_at + timedelta(hours=5, minutes=30)
    msg_label = "batch" if req.batch_messages else req.message_type or "text"
    log_to_db("INFO", f"[TG] {msg_label} scheduled for {channel.title} at {ist_time.strftime('%Y-%m-%d %H:%M:%S')} IST")
    return {"id": post.id, "status": post.status, "scheduled_at": post.scheduled_at.isoformat()}


@app.get("/api/tg/posts")
def tg_list_posts(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    bots = db.query(TgBotConfig).filter(TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).all()
    bot_ids = [b.id for b in bots]
    if not bot_ids:
        return []

    channels = db.query(TgChannel).filter(TgChannel.bot_id.in_(bot_ids)).all()
    channel_ids = [c.id for c in channels]
    channel_map = {c.id: c.title for c in channels}

    posts = db.query(TgScheduledPost).filter(
        TgScheduledPost.channel_id.in_(channel_ids)
    ).order_by(TgScheduledPost.scheduled_at.desc()).limit(100).all()

    return [
        {
            "id": p.id, "content": p.content,
            "message_type": getattr(p, "message_type", "text") or "text",
            "media_type": p.media_type,
            "scheduled_at": p.scheduled_at.isoformat(),
            "status": p.status, "is_recurring": p.is_recurring,
            "recurrence_rule": p.recurrence_rule,
            "batch_messages": json.loads(p.batch_messages) if p.batch_messages else None,
            "error_message": p.error_message,
            "sent_at": p.sent_at.isoformat() if p.sent_at else None,
            "created_at": p.created_at.isoformat(),
            "channel_title": channel_map.get(p.channel_id, "Unknown"),
        }
        for p in posts
    ]


@app.delete("/api/tg/posts/{post_id}")
def tg_cancel_post(post_id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    post = db.query(TgScheduledPost).filter(TgScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")

    channel = post.channel
    if channel.bot.user_id != current_user.id or channel.bot.workspace_id != workspace.id:
        raise HTTPException(403, "Not your post")

    if post.status == "pending":
        post.status = "cancelled"
        db.commit()
    else:
        db.delete(post)
        db.commit()
    return {"ok": True}


@app.post("/api/tg/posts/{post_id}/send-now")
async def tg_send_now(post_id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    post = db.query(TgScheduledPost).filter(TgScheduledPost.id == post_id).first()
    if not post or post.channel.bot.user_id != current_user.id or post.channel.bot.workspace_id != workspace.id:
        raise HTTPException(404, "Post not found")

    channel = post.channel
    bot = channel.bot
    try:
        if post.media_type == "photo" and post.media_path:
            await telegram_service.send_photo(bot.bot_token, channel.chat_id, post.media_path, post.content)
        elif post.media_type == "document" and post.media_path:
            await telegram_service.send_document(bot.bot_token, channel.chat_id, post.media_path, post.content)
        else:
            await telegram_service.send_message(bot.bot_token, channel.chat_id, post.content)

        post.status = "sent"
        post.sent_at = datetime.utcnow()
        db.commit()
        return {"ok": True, "status": "sent"}
    except Exception as e:
        post.status = "failed"
        post.error_message = str(e)[:500]
        db.commit()
        raise HTTPException(500, f"Send failed: {e}")


# ── Telegram Moderation Rules ───────────────────────────────────────────────

@app.post("/api/tg/moderation/rules")
def tg_create_rule(req: TgModerationRuleCreate, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    channel = db.query(TgChannel).filter(TgChannel.id == req.channel_id).first()
    if not channel or channel.bot.user_id != current_user.id or channel.bot.workspace_id != workspace.id:
        raise HTTPException(404, "Channel not found")

    try:
        json.loads(req.config)
    except Exception:
        raise HTTPException(400, "Config must be valid JSON")

    rule = TgModerationRule(
        rule_type=req.rule_type,
        config=req.config,
        channel_id=req.channel_id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    log_to_db("INFO", f"[TG] Moderation rule '{req.rule_type}' added for {channel.title}")
    return {"id": rule.id, "rule_type": rule.rule_type, "is_active": rule.is_active}


@app.get("/api/tg/moderation/rules")
def tg_list_rules(current_user: User = Depends(get_current_user), workspace: Workspace = Depends(get_current_workspace), db: Session = Depends(get_db)):
    bots = db.query(TgBotConfig).filter(TgBotConfig.user_id == current_user.id, TgBotConfig.workspace_id == workspace.id).all()
    bot_ids = [b.id for b in bots]
    channels = db.query(TgChannel).filter(TgChannel.bot_id.in_(bot_ids)).all()
    channel_ids = [c.id for c in channels]
    channel_map = {c.id: c.title for c in channels}

    rules = db.query(TgModerationRule).filter(TgModerationRule.channel_id.in_(channel_ids)).all()
    return [
        {
            "id": r.id, "rule_type": r.rule_type, "config": r.config,
            "is_active": r.is_active, "channel_id": r.channel_id,
            "channel_title": channel_map.get(r.channel_id, "Unknown"),
        }
        for r in rules
    ]


@app.patch("/api/tg/moderation/rules/{rule_id}/toggle")
def tg_toggle_rule(rule_id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    rule = db.query(TgModerationRule).filter(TgModerationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    if rule.channel.bot.user_id != current_user.id or rule.channel.bot.workspace_id != workspace.id:
        raise HTTPException(403, "Not your rule")

    rule.is_active = not rule.is_active
    db.commit()
    return {"id": rule.id, "is_active": rule.is_active}


@app.delete("/api/tg/moderation/rules/{rule_id}")
def tg_delete_rule(rule_id: int, current_user: User = Depends(get_current_user), workspace: Workspace = Depends(require_workspace_role("owner", "admin", "member")), db: Session = Depends(get_db)):
    rule = db.query(TgModerationRule).filter(TgModerationRule.id == rule_id).first()
    if not rule or rule.channel.bot.user_id != current_user.id or rule.channel.bot.workspace_id != workspace.id:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}


# ── Telegram Service Control ────────────────────────────────────────────────

@app.post("/api/tg/service/start")
async def tg_start_service(current_admin: User = Depends(get_current_admin)):
    await telegram_service.start()
    log_to_db("INFO", f"[TG] Service started by admin: {current_admin.username}")
    return {"status": "running"}


@app.post("/api/tg/service/stop")
async def tg_stop_service(current_admin: User = Depends(get_current_admin)):
    await telegram_service.stop()
    log_to_db("INFO", f"[TG] Service stopped by admin: {current_admin.username}")
    return {"status": "stopped"}


@app.get("/api/tg/service/status")
def tg_service_status():
    return {"running": telegram_service.is_running}

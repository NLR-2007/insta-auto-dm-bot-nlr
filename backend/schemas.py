from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

# --- Auth Schemas ---
class UserRegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLoginSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool
    username: str

class UserResponseSchema(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Instagram Account Proxy Updates ---
class AccountSchema(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: Optional[str] = Field(None, max_length=200)
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None

class AccountResponse(BaseModel):
    id: int
    username: str
    status: str
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Monitored Posts CRUD updates ---
class MonitoredPostCreate(BaseModel):
    post_url: str = Field(..., min_length=10)
    trigger_keyword: str = Field(..., min_length=1)
    template_id: int
    account_id: int
    is_active: bool = True

class MonitoredPostResponse(BaseModel):
    id: int
    post_url: str
    trigger_keyword: str
    template_id: int
    account_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Target Queue Updates ---
class TargetCreateSchema(BaseModel):
    usernames: List[str]
    account_id: int

class TargetResponse(BaseModel):
    id: int
    username: str
    status: str
    account_id: int
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    message_sent: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Message Templates ---
class MessageTemplateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1)
    is_active: bool = True

class MessageTemplateResponse(BaseModel):
    id: int
    name: str
    content: str
    is_active: bool
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Admin Monitoring Schemas ---
class AdminUserDetailResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    is_enabled: bool = True
    created_at: datetime
    accounts: List[AccountResponse] = []
    ig_accounts: int = 0
    dms_sent: int = 0
    dms_failed: int = 0
    pending: int = 0
    tg_bots: int = 0
    tg_channels: int = 0

    class Config:
        from_attributes = True

class AdminSystemStatsResponse(BaseModel):
    ig_bot_running: bool = False
    tg_service_running: bool = False
    bot_running: bool = False
    total_users: int = 0
    total_accounts: int = 0
    total_dms_sent: int = 0
    total_dms_failed: int = 0
    total_pending_targets: int = 0
    total_tg_bots: int = 0
    total_tg_channels: int = 0
    total_tg_posts_sent: int = 0
    total_tg_posts_pending: int = 0


# ── Telegram Schemas ──────────────────────────────────────────────────────────

class TgBotConfigCreate(BaseModel):
    bot_token: str = Field(..., min_length=10)

class TgScheduledPostCreate(BaseModel):
    channel_id: int
    content: str = Field(..., min_length=1)
    scheduled_at: datetime
    media_type: Optional[str] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None

class TgModerationRuleCreate(BaseModel):
    channel_id: int
    rule_type: str = Field(..., min_length=1)
    config: str

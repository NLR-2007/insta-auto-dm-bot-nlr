import os
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.config import settings

# If Database URL starts with mysql, try to connect, fallback to sqlite if mysql isn't ready
database_url = settings.DATABASE_URL
try:
    if database_url.startswith("mysql"):
        engine = create_engine(database_url, pool_recycle=3600, pool_pre_ping=True)
        # Try to connect to verify it's active
        with engine.connect() as conn:
            pass
    else:
        engine = create_engine(database_url, connect_args={"check_same_thread": False} if "sqlite" in database_url else {})
except Exception as e:
    print(f"Error initializing DB engine with {database_url}. Falling back to SQLite. Error: {e}")
    database_url = "sqlite:///./insta_automate.db"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # Only run on SQLite connections to avoid breaking MySQL/PG
    if type(dbapi_connection).__name__ == "Connection" or type(dbapi_connection).__module__ == "sqlite3":
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    automation_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(140), unique=True, index=True, nullable=False)
    plan_slug = Column(String(50), default="starter", nullable=False)
    automation_mode = Column(String(30), default="creator_owned", nullable=False)
    is_active = Column(Boolean, default=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(30), default="owner", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    plan_slug = Column(String(50), default="starter", nullable=False)
    status = Column(String(30), default="trialing", nullable=False)
    provider = Column(String(30), default="mock", nullable=False)
    provider_customer_id = Column(String(255), nullable=True)
    provider_subscription_id = Column(String(255), nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(140), nullable=False)
    channel = Column(String(30), default="instagram", nullable=False)
    mode = Column(String(40), default="comment_trigger", nullable=False)
    status = Column(String(30), default="draft", nullable=False)
    consent_source = Column(String(60), default="comment_keyword", nullable=False)
    daily_limit = Column(Integer, default=30)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(Integer, ForeignKey("message_templates.id", ondelete="SET NULL"), nullable=True)
    trigger_keyword = Column(String(100), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AutomationRunner(Base):
    __tablename__ = "automation_runners"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True)
    status = Column(String(30), default="created", nullable=False)
    runner_type = Column(String(30), default="local", nullable=False)
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(120), nullable=False)
    entity_type = Column(String(80), nullable=True)
    entity_id = Column(String(80), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(200), nullable=True) # Optional, relies mostly on cookies
    status = Column(String(50), default="disconnected")  # disconnected, connected, verification_needed, challenged
    cookie_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proxy_host = Column(String(255), nullable=True)
    proxy_port = Column(Integer, nullable=True)
    proxy_username = Column(String(100), nullable=True)
    proxy_password = Column(String(100), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)

class Target(Base):
    __tablename__ = "targets"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False) # Removed unique constraint to allow different users targeting same handle
    status = Column(String(50), default="pending")  # pending, sending, sent, failed
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    message_sent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)

class MessageTemplate(Base):
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)  # Supports spin-tax
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)

class BotLog(Base):
    __tablename__ = "bot_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String(20), default="INFO")  # INFO, WARNING, ERROR, SUCCESS
    message = Column(Text, nullable=False)

class Setting(Base):
    __tablename__ = "settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)

class MonitoredPost(Base):
    __tablename__ = "monitored_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    post_url = Column(String(500), nullable=False)
    trigger_keyword = Column(String(100), nullable=False)
    template_id = Column(Integer, ForeignKey("message_templates.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    template = relationship("MessageTemplate")

class ProcessedComment(Base):
    __tablename__ = "processed_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False)
    post_id = Column(Integer, ForeignKey("monitored_posts.id", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=True)
    status = Column(String(50), default="sent") # sent, failed
    processed_at = Column(DateTime, default=datetime.utcnow)
    
    post = relationship("MonitoredPost")

class OptOut(Base):
    __tablename__ = "opt_outs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)


# ── Telegram Models ───────────────────────────────────────────────────────────

class TgBotConfig(Base):
    __tablename__ = "tg_bot_configs"

    id = Column(Integer, primary_key=True, index=True)
    bot_token = Column(String(255), nullable=False)
    bot_token_hash = Column(String(128), nullable=True, index=True)
    bot_username = Column(String(100), nullable=True)
    bot_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    channels = relationship("TgChannel", back_populates="bot", cascade="all, delete-orphan")


class TgChannel(Base):
    __tablename__ = "tg_channels"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    chat_type = Column(String(20), nullable=False)
    member_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    bot_id = Column(Integer, ForeignKey("tg_bot_configs.id", ondelete="CASCADE"), nullable=False)
    bot = relationship("TgBotConfig", back_populates="channels")
    scheduled_posts = relationship("TgScheduledPost", back_populates="channel", cascade="all, delete-orphan")
    moderation_rules = relationship("TgModerationRule", back_populates="channel", cascade="all, delete-orphan")


class TgScheduledPost(Base):
    __tablename__ = "tg_scheduled_posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")
    media_type = Column(String(20), nullable=True)
    media_path = Column(String(500), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(50), nullable=True)
    batch_messages = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    channel_id = Column(Integer, ForeignKey("tg_channels.id", ondelete="CASCADE"), nullable=False)
    channel = relationship("TgChannel", back_populates="scheduled_posts")


class TgModerationRule(Base):
    __tablename__ = "tg_moderation_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String(30), nullable=False)
    config = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    channel_id = Column(Integer, ForeignKey("tg_channels.id", ondelete="CASCADE"), nullable=False)
    channel = relationship("TgChannel", back_populates="moderation_rules")


class TgPostLog(Base):
    __tablename__ = "tg_post_logs"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("tg_channels.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(String(50), nullable=True)
    content_preview = Column(String(200), nullable=True)
    status = Column(String(20), default="sent")
    timestamp = Column(DateTime, default=datetime.utcnow)

    channel = relationship("TgChannel")


# ── Notification Model ───────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(30), default="info")
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Media Library Model ──────────────────────────────────────────────────────

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)
    folder = Column(String(100), default="general")
    tags = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Contact CRM Model ────────────────────────────────────────────────────────

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    username = Column(String(100), nullable=False)
    platform = Column(String(30), default="instagram")
    display_name = Column(String(200), nullable=True)
    tags = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="lead")
    last_contacted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Feature Flags / Global Config ─────────────────────────────────────────────

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(20), default="on")
    scope = Column(String(30), default="global")
    scope_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def log_to_db(level: str, message: str):
    """Helper to write to bot_logs table immediately."""
    db = SessionLocal()
    try:
        log_entry = BotLog(level=level, message=message, timestamp=datetime.utcnow())
        db.add(log_entry)
        db.commit()
        safe_msg = message.encode("ascii", errors="replace").decode("ascii")
        print(f"[{level}] {safe_msg}", flush=True)
    except Exception as e:
        try:
            print(f"Failed to log to DB: {e}", flush=True)
        except Exception:
            pass
    finally:
        db.close()

def _slugify_workspace(value: str, user_id: int) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    clean = "-".join(part for part in clean.split("-") if part)
    return f"{clean or 'workspace'}-{user_id}"


def _table_columns(conn, table_name: str) -> set[str]:
    dialect = engine.dialect.name
    if dialect == "sqlite":
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
        return {row[1] for row in rows}
    if dialect in {"mysql", "mariadb"}:
        rows = conn.execute(text(f"SHOW COLUMNS FROM {table_name}")).fetchall()
        return {row[0] for row in rows}
    rows = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table_name
    """), {"table_name": table_name}).fetchall()
    return {row[0] for row in rows}


def _add_nullable_int_column(conn, table_name: str, column_name: str):
    columns = _table_columns(conn, table_name)
    if column_name in columns:
        return
    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} INTEGER"))


def ensure_saas_columns():
    """Small compatibility migration until Alembic is introduced."""
    targets = [
        ("users", "is_enabled"),
        ("users", "automation_active"),
        ("accounts", "workspace_id"),
        ("message_templates", "workspace_id"),
        ("opt_outs", "workspace_id"),
        ("tg_bot_configs", "workspace_id"),
        ("tg_bot_configs", "bot_token_hash"),
        ("tg_scheduled_posts", "message_type"),
        ("tg_scheduled_posts", "batch_messages"),
    ]
    with engine.begin() as conn:
        for table_name, column_name in targets:
            try:
                if table_name == "users" and column_name == "is_enabled":
                    columns = _table_columns(conn, table_name)
                    if column_name not in columns:
                        conn.execute(text("ALTER TABLE users ADD COLUMN is_enabled BOOLEAN DEFAULT 1"))
                elif table_name == "users" and column_name == "automation_active":
                    columns = _table_columns(conn, table_name)
                    if column_name not in columns:
                        conn.execute(text("ALTER TABLE users ADD COLUMN automation_active BOOLEAN DEFAULT 0"))
                elif table_name == "tg_bot_configs" and column_name == "bot_token_hash":
                    columns = _table_columns(conn, table_name)
                    if column_name not in columns:
                        conn.execute(text("ALTER TABLE tg_bot_configs ADD COLUMN bot_token_hash VARCHAR(128)"))
                elif table_name == "tg_scheduled_posts" and column_name == "message_type":
                    columns = _table_columns(conn, table_name)
                    if column_name not in columns:
                        conn.execute(text("ALTER TABLE tg_scheduled_posts ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'"))
                    elif "mysql" in str(engine.dialect.name).lower():
                        conn.execute(text("ALTER TABLE tg_scheduled_posts MODIFY COLUMN message_type VARCHAR(20) DEFAULT 'text'"))
                elif table_name == "tg_scheduled_posts" and column_name == "batch_messages":
                    columns = _table_columns(conn, table_name)
                    if column_name not in columns:
                        conn.execute(text("ALTER TABLE tg_scheduled_posts ADD COLUMN batch_messages TEXT"))
                    elif "mysql" in str(engine.dialect.name).lower():
                        conn.execute(text("ALTER TABLE tg_scheduled_posts MODIFY COLUMN batch_messages TEXT"))
                else:
                    _add_nullable_int_column(conn, table_name, column_name)
            except Exception as e:
                print(f"Skipped SaaS compatibility column {table_name}.{column_name}: {e}")


def ensure_default_workspaces():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            membership = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
            if membership:
                workspace = membership.workspace
            else:
                workspace = Workspace(
                    name=f"{user.username}'s Workspace",
                    slug=_slugify_workspace(user.username, user.id),
                    owner_user_id=user.id,
                    plan_slug=settings.DEFAULT_PLAN,
                    automation_mode="creator_owned",
                )
                db.add(workspace)
                db.flush()
                db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
                db.add(Subscription(
                    workspace_id=workspace.id,
                    plan_slug=settings.DEFAULT_PLAN,
                    status="trialing",
                    provider=settings.BILLING_MODE,
                ))

            if workspace:
                db.query(Account).filter(Account.user_id == user.id, Account.workspace_id == None).update(
                    {"workspace_id": workspace.id}, synchronize_session=False
                )
                db.query(MessageTemplate).filter(MessageTemplate.user_id == user.id, MessageTemplate.workspace_id == None).update(
                    {"workspace_id": workspace.id}, synchronize_session=False
                )
                db.query(OptOut).filter(OptOut.user_id == user.id, OptOut.workspace_id == None).update(
                    {"workspace_id": workspace.id}, synchronize_session=False
                )
                db.query(TgBotConfig).filter(TgBotConfig.user_id == user.id, TgBotConfig.workspace_id == None).update(
                    {"workspace_id": workspace.id}, synchronize_session=False
                )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to ensure default workspaces: {e}")
    finally:
        db.close()

# Initialize tables
def init_db():
    Base.metadata.create_all(bind=engine)
    ensure_saas_columns()
    ensure_default_workspaces()
    
    # Insert default settings if they don't exist
    db = SessionLocal()
    try:
        default_settings = [
            {"key": "daily_limit", "value": "30"},
            {"key": "min_delay", "value": "45"},
            {"key": "max_delay", "value": "120"},
            {"key": "working_hours_start", "value": "08:00"},
            {"key": "working_hours_end", "value": "22:00"},
            {"key": "status", "value": "stopped"}, # running, stopped
            {"key": "api_mode", "value": "sandbox"}, # sandbox, official
            {"key": "opt_out_keywords", "value": "stop, unsubscribe, optout, stopdm"},
            {"key": "consent_enforce", "value": "true"},
            {"key": "meta_page_access_token", "value": ""},
            {"key": "meta_verify_token", "value": ""}
        ]
        for s in default_settings:
            exists = db.query(Setting).filter(Setting.key == s["key"]).first()
            if not exists:
                db.add(Setting(key=s["key"], value=s["value"]))
        db.commit()

        # Seed default admin user
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if not admin_exists:
            hashed = bcrypt.hashpw("aadhayareddy".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            admin_user = User(
                username="admin",
                email="admin@lyvora.com",
                password_hash=hashed,
                is_admin=True,
                is_enabled=True,
            )
            db.add(admin_user)
            db.flush()
            ws = Workspace(
                name="Admin Workspace",
                slug=f"admin-{admin_user.id}",
                owner_user_id=admin_user.id,
            )
            db.add(ws)
            db.flush()
            db.add(WorkspaceMember(workspace_id=ws.id, user_id=admin_user.id, role="owner"))
            db.add(Subscription(workspace_id=ws.id, plan_slug=ws.plan_slug, status="trialing"))
            db.commit()
            print("[INFO] Default admin user created (admin / admin@lyvora.com)")

    except Exception as e:
        print(f"Failed to seed default settings: {e}")
    finally:
        db.close()

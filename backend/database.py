import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.config import settings

# If Database URL starts with mysql, try to connect, fallback to sqlite if mysql isn't ready
database_url = settings.DATABASE_URL
try:
    if database_url.startswith("mysql"):
        # Just check if we can build engine, we verify actual connection on query
        engine = create_engine(database_url, pool_recycle=3600, pool_pre_ping=True)
    else:
        engine = create_engine(database_url, connect_args={"check_same_thread": False} if "sqlite" in database_url else {})
except Exception as e:
    print(f"Error initializing DB engine with {database_url}. Falling back to SQLite. Error: {e}")
    database_url = "sqlite:///./insta_automate.db"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(200), nullable=True) # Optional, relies mostly on cookies
    status = Column(String(50), default="disconnected")  # disconnected, connected, verification_needed, challenged
    cookie_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Target(Base):
    __tablename__ = "targets"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), default="pending")  # pending, sending, sent, failed
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    message_sent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MessageTemplate(Base):
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)  # Supports spin-tax
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BotLog(Base):
    __tablename__ = "bot_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String(20), default="INFO")  # INFO, WARNING, ERROR, SUCCESS
    message = Column(Text, nullable=False)

class Setting(Base):
    __tablename__ = "settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)

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
        print(f"[{level}] {message}")
    except Exception as e:
        print(f"Failed to log to DB: {e}. Message was: {message}")
    finally:
        db.close()

# Initialize tables
def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Insert default settings if they don't exist
    db = SessionLocal()
    try:
        default_settings = [
            {"key": "daily_limit", "value": "30"},
            {"key": "min_delay", "value": "45"},
            {"key": "max_delay", "value": "120"},
            {"key": "working_hours_start", "value": "08:00"},
            {"key": "working_hours_end", "value": "22:00"},
            {"key": "status", "value": "stopped"} # running, stopped
        ]
        for s in default_settings:
            exists = db.query(Setting).filter(Setting.key == s["key"]).first()
            if not exists:
                db.add(Setting(key=s["key"], value=s["value"]))
        db.commit()
    except Exception as e:
        print(f"Failed to seed default settings: {e}")
    finally:
        db.close()

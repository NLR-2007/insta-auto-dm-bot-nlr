import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    FRONTEND_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")
    # Vercel creates a different hostname for preview deployments. Keep the
    # regex narrow so arbitrary origins are not granted credentialed access.
    FRONTEND_ORIGIN_REGEX: str = Field(default=r"^https://(?:lyvoranlr|insta-auto-dm-bot-nlr)(?:-[a-z0-9-]+)?\.vercel\.app$")

    # Database configuration
    # Can be mysql+mysqlconnector://user:pass@host:port/dbname
    DATABASE_URL: str = Field(default="sqlite:///./insta_automate.db")
    
    # Bot operation limits
    DAILY_DM_LIMIT: int = Field(default=30)
    MIN_DELAY_SECONDS: int = Field(default=45)
    MAX_DELAY_SECONDS: int = Field(default=120)
    
    # Browser setup
    HEADLESS: bool = Field(default=False)  # Instagram blocks headless easily, default to visible
    USER_DATA_DIR: str = Field(default="./user_data")  # Persistent contexts directory
    
    # Security
    API_SECRET_KEY: str = Field(default="insta-dm-secret-key-12345")
    ENCRYPTION_KEY: str = Field(default="")
    META_APP_SECRET: str = Field(default="")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24)

    # SaaS defaults
    DEFAULT_PLAN: str = Field(default="starter")
    BILLING_MODE: str = Field(default="mock")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def is_production() -> bool:
    return settings.ENVIRONMENT.lower() in {"prod", "production"}

def cors_origins() -> list[str]:
    origins = [origin.strip().rstrip("/") for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()]
    if not origins and not is_production():
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return origins

def cors_origin_regex() -> str | None:
    value = settings.FRONTEND_ORIGIN_REGEX.strip()
    return value or None

def validate_runtime_config() -> None:
    weak_secret = settings.API_SECRET_KEY in {"", "insta-dm-secret-key-12345"}
    if is_production() and weak_secret:
        raise RuntimeError("API_SECRET_KEY must be set to a strong secret in production.")
    if is_production() and not settings.ENCRYPTION_KEY:
        raise RuntimeError("ENCRYPTION_KEY must be set in production.")
    if is_production() and "*" in cors_origins():
        raise RuntimeError("Wildcard CORS is not allowed in production.")

# Ensure user data dir exists
os.makedirs(settings.USER_DATA_DIR, exist_ok=True)

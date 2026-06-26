import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
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
    
    # Security / API key (optional for backend authorization)
    API_SECRET_KEY: str = Field(default="insta-dm-secret-key-12345")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure user data dir exists
os.makedirs(settings.USER_DATA_DIR, exist_ok=True)

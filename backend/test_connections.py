import os
import sys

def main():
    print("=== Instagram Auto DM Backend verification ===")
    print(f"Python Version: {sys.version}")
    print(f"Working Directory: {os.getcwd()}")
    
    # 1. Test Imports
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import playwright
        import mysql.connector
        import dotenv
        import pydantic
        import pydantic_settings
        print("[SUCCESS] All required Python packages are successfully installed!")
    except ImportError as e:
        print(f"[ERROR] Missing package: {e}")
        print("Please install requirements using: pip install -r backend/requirements.txt")
        return False
        
    # 2. Test DB Initialization
    try:
        from backend.database import init_db, SessionLocal, Setting
        init_db()
        db = SessionLocal()
        db_limit = db.query(Setting).filter(Setting.key == "daily_limit").first()
        if db_limit:
            print(f"[SUCCESS] Database initialized. Daily limit setting value: {db_limit.value}")
        else:
            print("[ERROR] Database initialized but settings key 'daily_limit' is missing.")
            return False
        db.close()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print("Please verify the DATABASE_URL in backend/.env file.")
        return False
        
    # 3. Test Playwright
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            print(f"[SUCCESS] Playwright Chromium launched successfully! Browser Version: {browser.version}")
            browser.close()
    except Exception as e:
        print(f"[ERROR] Playwright Chromium verification failed: {e}")
        print("Please run: playwright install chromium")
        return False
        
    print("=== Verification Complete: Backend is fully operational! ===")
    return True

if __name__ == "__main__":
    main()

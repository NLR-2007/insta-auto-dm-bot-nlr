import asyncio
from backend.database import SessionLocal, Setting, log_to_db, init_db
from backend.bot import bot_worker_loop, BOT_RUNNING
import backend.bot

async def main():
    print("=== Launching Bot Worker Loop Manually ===")
    
    # Initialize DB
    init_db()
    
    # Set status to running in settings database
    db = SessionLocal()
    try:
        status_setting = db.query(Setting).filter(Setting.key == "status").first()
        if status_setting:
            status_setting.value = "running"
        else:
            db.add(Setting(key="status", value="running"))
        db.commit()
        print("[SUCCESS] Set bot status to 'running' in database settings.")
    except Exception as e:
        print(f"[ERROR] Failed to set running status in DB: {e}")
        db.close()
        return
    finally:
        db.close()
        
    # Toggle running flag
    backend.bot.BOT_RUNNING = True
    
    # Run the worker loop directly in this terminal process
    try:
        await bot_worker_loop()
    except KeyboardInterrupt:
        print("\n[INFO] Bot stopped manually by user.")
    finally:
        backend.bot.BOT_RUNNING = False
        print("=== Bot Worker Shut Down ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

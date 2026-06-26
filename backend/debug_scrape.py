import asyncio
from backend.bot import InstagramBot
from backend.database import init_db

async def main():
    init_db()
    # Create bot instance for the connected account
    bot = InstagramBot("codingphiles")
    
    # Init browser (visible so we can see what's happening)
    await bot.init_browser(headless=False)
    
    url = "https://www.instagram.com/reel/DTFRFRukdfj/?igsh=MXNka3p6bzNudnFiaw=="
    keyword = "java"
    
    print(f"DEBUG: Scrape comments from {url}")
    try:
        await bot.page.goto(url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(8) # Wait for page elements to fully load
        
        # Take a screenshot to verify what's showing
        screenshot_path = "backend/comments_screenshot.png"
        await bot.page.screenshot(path=screenshot_path)
        print(f"DEBUG: Saved screenshot to {screenshot_path}")
        
        # Print all visible anchor links on page starting with / (potential usernames)
        anchors = bot.page.locator('a[href^="/"]')
        count = await anchors.count()
        print(f"DEBUG: Found {count} user links on the page.")
        
        for idx in range(count):
            anchor = anchors.nth(idx)
            username = await anchor.inner_text()
            username = username.strip().replace("@", "")
            
            # Parent container text check
            parent = anchor.locator('..').locator('..')
            parent_text = await parent.inner_text()
            print(f"Link {idx}: Username='{username}', ParentText='{parent_text.replace(chr(10), ' | ')[:150]}'")
            
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
    finally:
        await bot.close_browser()

if __name__ == "__main__":
    asyncio.run(main())

import re
import os
import random
import time
import asyncio
from datetime import datetime, date
import threading
from playwright.async_api import async_playwright, Page, BrowserContext
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Account, Target, MessageTemplate, BotLog, Setting, log_to_db, MonitoredPost, ProcessedComment
from backend.config import settings

# Global running state flag
BOT_RUNNING = False
BOT_THREAD = None
BOT_LOOP = None

def parse_spintax(text: str) -> str:
    """Parses spintax pattern like '{Hello|Hi|Hey} {there|friend}!'. Supports nested patterns."""
    pattern = re.compile(r'\{([^{}]+)\}')
    while True:
        match = pattern.search(text)
        if not match:
            break
        options = match.group(1).split('|')
        text = text.replace(match.group(0), random.choice(options), 1)
    return text

async def human_type(page: Page, selector: str, text: str):
    """Simulates real human typing with random delays between characters."""
    await page.focus(selector)
    for char in text:
        await page.type(selector, char, delay=random.randint(50, 150))
        await asyncio.sleep(random.uniform(0.01, 0.05))

class InstagramBot:
    def __init__(self, account_username: str):
        self.username = account_username
        self.user_data_dir = os.path.abspath(os.path.join(settings.USER_DATA_DIR, account_username))
        os.makedirs(self.user_data_dir, exist_ok=True)
        self.playwright = None
        self.context = None
        self.page = None

    async def init_browser(self, headless: bool = False) -> BrowserContext:
        """Initializes persistent browser context."""
        self.playwright = await async_playwright().start()
        
        # User agent spoofing to sound more like a standard human browser
        user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=headless,
            user_agent=user_agent,
            viewport={"width": 1280, "height": 720},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        )
        
        # Execute JS to bypass navigator.webdriver detection
        self.page = await self.context.new_page()
        await self.page.add_init_script(
            "const newProto = navigator.__proto__; delete newProto.webdriver; navigator.__proto__ = newProto;"
        )
        
        return self.context

    async def close_browser(self):
        """Closes browser context and playwright object."""
        try:
            if self.context:
                await self.context.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            print(f"Error closing browser: {e}")
        finally:
            self.context = None
            self.playwright = None
            self.page = None

    async def check_login_status(self, navigate: bool = True) -> bool:
        """Checks if logged in by looking for dashboard indicators. If navigate=True, navigates to Instagram home first."""
        if not self.page:
            return False
        
        try:
            if navigate:
                log_to_db("INFO", f"Navigating to check Instagram login status for {self.username}...")
                await self.page.goto("https://www.instagram.com/", wait_until="load", timeout=45000)
                await asyncio.sleep(4)
            
            # Check if feed or navigation exists (e.g. search icon, direct message icon, or profile picture)
            logged_in_indicators = [
                'svg[aria-label="Direct"]',
                'svg[aria-label="Messenger"]',
                'svg[aria-label="New post"]',
                'svg[aria-label="Home"]',
                'svg[aria-label="Search"]',
                'a[href*="/direct/inbox/"]'
            ]
            
            for selector in logged_in_indicators:
                if await self.page.locator(selector).is_visible():
                    log_to_db("INFO", f"User {self.username} is logged in successfully.")
                    return True
                    
            # Check if login form fields are visible
            login_form = await self.page.locator('input[name="username"]').is_visible()
            if login_form:
                return False
                
            current_url = self.page.url
            if "instagram.com/accounts/login" in current_url:
                return False
                
            # If no logged in indicators are visible, strictly treat as not logged in
            return False
        except Exception as e:
            log_to_db("ERROR", f"Error checking login status: {str(e)}")
            return False

    async def run_manual_login_session(self) -> bool:
        """Launches a visible browser window so the user can perform manual login/2FA."""
        log_to_db("INFO", f"Launching manual login browser window for {self.username}...")
        await self.init_browser(headless=False)
        success = False
        try:
            await self.page.goto("https://www.instagram.com/accounts/login/", wait_until="load")
            log_to_db("INFO", "Please perform the login in the opened browser window. Do not close it until completed.")
            
            # Wait for user to log in manually - we poll login state every 3 seconds
            # Or run until browser window is closed
            # Increased limit to 360 iterations (18 minutes) to give ample time for captchas/verification
            for _ in range(360): 
                if self.page.is_closed():
                    log_to_db("WARNING", "Login browser window closed by user.")
                    break
                
                # Check login state WITHOUT navigating away (so user can type password/2FA undisturbed)
                is_logged = await self.check_login_status(navigate=False)
                if is_logged:
                    log_to_db("SUCCESS", f"Successfully logged into account {self.username}! Saving session...")
                    await asyncio.sleep(8) # Give it extra time to write session cookies to local storage
                    success = True
                    break
                await asyncio.sleep(3)
                
        except Exception as e:
            log_to_db("ERROR", f"Manual login process failed: {str(e)}")
        finally:
            await self.close_browser()
            log_to_db("INFO", "Manual login browser window closed.")
            
        return success

    async def send_direct_message(self, target_username: str, message: str) -> bool:
        """Sends a direct message to a target username by navigating directly to their profile."""
        if not self.page:
            raise Exception("Browser not initialized.")
            
        log_to_db("INFO", f"Navigating to profile: https://www.instagram.com/{target_username}/")
        try:
            await self.page.goto(f"https://www.instagram.com/{target_username}/", wait_until="load", timeout=30000)
            await asyncio.sleep(random.uniform(3.0, 5.0))
            
            # Check if profile is unavailable
            body_text = await self.page.inner_text("body")
            if "Sorry, this page isn't available" in body_text or "Page Not Found" in body_text:
                raise Exception("Profile not found or page unavailable.")
                
            # Find Message button
            # Instagram profile message buttons can have different selectors. We check multiple:
            message_button = None
            selectors = [
                "//div[text()='Message']",
                "//button[text()='Message']",
                "button:has-text('Message')",
                "div[role='button']:has-text('Message')",
                "a:has-text('Message')"
            ]
            
            for sel in selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    # Filter for visible ones
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            message_button = item
                            break
                if message_button:
                    break
                    
            if not message_button:
                # Private profiles or user who blocked us might not have a message button
                raise Exception("Message button not found on profile. Check if user is private or has blocked DMs.")
                
            log_to_db("INFO", "Clicking 'Message' button...")
            await message_button.click()
            await asyncio.sleep(random.uniform(4.0, 6.0)) # Wait for redirect to Direct inbox
            
            # Wait for DM textbox to load
            # Selectors for Direct Message inputs
            dm_input_selectors = [
                'div[contenteditable="true"][aria-label="Message"]',
                'div[contenteditable="true"]',
                'textarea[placeholder*="Message"]',
                'textarea[placeholder*="message"]'
            ]
            
            input_box = None
            for sel in dm_input_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0 and await loc.first.is_visible():
                    input_box = loc.first
                    break
                    
            if not input_box:
                raise Exception("Direct message input field not found.")
                
            log_to_db("INFO", f"Typing message to {target_username}...")
            # Click and focus input
            await input_box.click()
            await asyncio.sleep(1.0)
            
            # Type message
            await human_type(self.page, 'div[contenteditable="true"]' if await self.page.locator('div[contenteditable="true"]').count() > 0 else 'textarea', message)
            await asyncio.sleep(random.uniform(1.0, 2.0))
            
            # Press Enter to send, or look for the "Send" button
            log_to_db("INFO", "Sending message...")
            # Usually pressing Enter inside contenteditable div sends the message. Let's try Enter key:
            await self.page.keyboard.press("Enter")
            await asyncio.sleep(3.0)
            
            # Let's verify send success (Instagram usually clears textbox or appends message bubble)
            log_to_db("SUCCESS", f"Message successfully sent to {target_username}!")
            return True
        except Exception as e:
            log_to_db("ERROR", f"Failed to send DM to {target_username}: {str(e)}")
            raise e

    async def perform_random_activity(self):
        """Simulates human interaction (scrolling home feed) to reduce bot footprint."""
        if not self.page:
            return
        log_to_db("INFO", "Performing random human-like activity (scrolling home feed)...")
        try:
            await self.page.goto("https://www.instagram.com/", wait_until="load")
            await asyncio.sleep(random.uniform(2.0, 4.0))
            
            # Scroll down slowly
            for _ in range(random.randint(2, 5)):
                scroll_amount = random.randint(300, 700)
                await self.page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                await asyncio.sleep(random.uniform(2.0, 5.0))
        except Exception as e:
            log_to_db("WARNING", f"Failed random activity: {e}")

    async def scrape_post_comments(self, post_url: str, trigger_keyword: str) -> list:
        """Navigates to post_url, ensures the comment drawer is open, and extracts comments."""
        if not self.page:
            raise Exception("Browser not initialized.")
        
        log_to_db("INFO", f"Checking comments on post: {post_url}")
        comments_found = []
        try:
            await self.page.goto(post_url, wait_until="load", timeout=30000)
            await asyncio.sleep(random.uniform(4.0, 6.0))
            
            # Instagram Reels/Posts on Web often hide the comments drawer by default.
            # Let's check if the comments container is open. If not, click the comment button.
            try:
                # Look for comment input box or scrollable comment list container
                comment_input = self.page.locator('textarea[placeholder*="comment"], textarea[placeholder*="Comment"]')
                if await comment_input.count() == 0:
                    # Click the comment drawer button (usually button containing the comment svg icon)
                    comment_btn = self.page.locator('button:has(svg[aria-label="Comment"]), svg[aria-label="Comment"]').first
                    if await comment_btn.is_visible():
                        log_to_db("INFO", "Comments drawer seems closed. Clicking Comment button to open drawer...")
                        await comment_btn.click(force=True)
                        await asyncio.sleep(3.0)
            except Exception as click_err:
                log_to_db("WARNING", f"Could not trigger comment drawer button: {click_err}")
            
            try:
                # Scroll comment area if possible to load more comments
                comment_container = self.page.locator('div[style*="overflow-y: scroll"], ul[role="list"]')
                if await comment_container.count() > 0:
                    await comment_container.first.evaluate("el => el.scrollTop = el.scrollHeight")
                    await asyncio.sleep(2.0)
            except Exception:
                pass
                
            # Evaluate JS-based scraper to find comments
            raw_comments = await self.page.evaluate("""() => {
                const results = [];
                const anchors = Array.from(document.querySelectorAll('a[href^="/"]'));
                for (const anchor of anchors) {
                    const href = anchor.getAttribute('href');
                    if (!href) continue;
                    
                    const parts = href.split('/').filter(Boolean);
                    if (parts.length !== 1) continue;
                    
                    const username = parts[0];
                    if (['instagram', 'home', 'search', 'explore', 'messages', 'profile', 'notifications', 'reels', 'direct', 'create', 'threads'].includes(username.toLowerCase())) {
                        continue;
                    }
                    
                    let parent = anchor.parentElement;
                    let foundCommentRow = null;
                    for (let i = 0; i < 8 && parent; i++) {
                        const hasReply = Array.from(parent.querySelectorAll('span, div, button')).some(el => {
                            const txt = el.innerText ? el.innerText.trim().toLowerCase() : '';
                            return txt === 'reply';
                        });
                        if (hasReply) {
                            foundCommentRow = parent;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    
                    if (foundCommentRow) {
                        const spans = Array.from(foundCommentRow.querySelectorAll('span'));
                        let commentText = '';
                        for (const span of spans) {
                            const spanVal = span.innerText ? span.innerText.trim() : '';
                            if (!spanVal) continue;
                            
                            if (spanVal.toLowerCase() === username.toLowerCase()) continue;
                            if (spanVal.toLowerCase() === 'reply') continue;
                            if (spanVal.toLowerCase() === 'see translation') continue;
                            if (spanVal.toLowerCase().includes('view replies')) continue;
                            if (spanVal.toLowerCase().includes('hide replies')) continue;
                            if (/^\d+[wdhms]$/.test(spanVal)) continue;
                            
                            commentText = spanVal;
                            break;
                        }
                        if (commentText) {
                            results.push({ username, commentText });
                        }
                    }
                }
                return results;
            }""")
            
            for item in raw_comments:
                uname = item["username"]
                text = item["commentText"]
                if trigger_keyword.lower() in text.lower():
                    comments_found.append((uname, text))
                        
            unique_comments = list(set(comments_found))
            log_to_db("INFO", f"Scraped comments. Found {len(unique_comments)} comments matching trigger '{trigger_keyword}'")
            return unique_comments
            
        except Exception as e:
            log_to_db("ERROR", f"Error scraping comments on {post_url}: {str(e)}")
            return []

# The background worker runner loop
async def bot_worker_loop():
    global BOT_RUNNING
    log_to_db("INFO", "Starting background Bot Worker Loop...")
    
    while BOT_RUNNING:
        db = SessionLocal()
        try:
            # 1. Check if we are active
            db_status = db.query(Setting).filter(Setting.key == "status").first()
            if not db_status or db_status.value != "running":
                log_to_db("INFO", "Bot status is not set to 'running' in settings. Stopping loop.")
                BOT_RUNNING = False
                break
                
            # 2. Get active config parameters
            daily_limit = int(db.query(Setting).filter(Setting.key == "daily_limit").first().value)
            min_delay = int(db.query(Setting).filter(Setting.key == "min_delay").first().value)
            max_delay = int(db.query(Setting).filter(Setting.key == "max_delay").first().value)
            
            # Fetch active account
            active_account = db.query(Account).filter(Account.status == "connected").first()
            if not active_account:
                log_to_db("ERROR", "No active connected Instagram account found. Link an account and mark it 'connected'.")
                db.close()
                await asyncio.sleep(30)
                continue

            # 3. Check today's send count (targets + comments)
            today_start = datetime.combine(date.today(), datetime.min.time())
            sent_targets = db.query(Target).filter(Target.status == "sent", Target.sent_at >= today_start).count()
            sent_comments = db.query(ProcessedComment).filter(ProcessedComment.status == "sent", ProcessedComment.processed_at >= today_start).count()
            total_sent_today = sent_targets + sent_comments
            
            if total_sent_today >= daily_limit:
                log_to_db("WARNING", f"Daily sending limit reached ({total_sent_today}/{daily_limit}). Bot sleeping...")
                db.close()
                await asyncio.sleep(900)
                continue
            
            bot_action_taken = False

            # --- Phase A: Comment-to-DM Trigger Checks ---
            active_posts = db.query(MonitoredPost).filter(MonitoredPost.is_active == True).all()
            if active_posts:
                # Initialize bot
                bot = InstagramBot(active_account.username)
                await bot.init_browser(headless=settings.HEADLESS)
                
                try:
                    # Verify login
                    logged_in = await bot.check_login_status()
                    if not logged_in:
                        log_to_db("ERROR", f"Account {active_account.username} requires re-authentication.")
                        active_account.status = "verification_needed"
                        db.commit()
                        await bot.close_browser()
                        db.close()
                        await asyncio.sleep(30)
                        continue
                        
                    for post in active_posts:
                        # Scrape comments
                        comments = await bot.scrape_post_comments(post.post_url, post.trigger_keyword)
                        
                        for username, comment_text in comments:
                            if not BOT_RUNNING:
                                break
                                
                            # Check if already processed
                            exists = db.query(ProcessedComment).filter(
                                ProcessedComment.username == username,
                                ProcessedComment.post_id == post.id
                            ).first()
                            
                            if not exists:
                                log_to_db("INFO", f"New trigger comment '{comment_text}' detected from @{username}. Preparing DM outreach...")
                                raw_msg = post.template.content
                                replaced_msg = raw_msg.replace("@username", f"@{username}").replace("{username}", username)
                                parsed_message = parse_spintax(replaced_msg)
                                
                                try:
                                    success = await bot.send_direct_message(username, parsed_message)
                                    if success:
                                        db.add(ProcessedComment(
                                            username=username,
                                            post_id=post.id,
                                            comment_text=comment_text,
                                            status="sent",
                                            processed_at=datetime.utcnow()
                                        ))
                                        log_to_db("SUCCESS", f"Sent trigger comment DM to @{username}")
                                    else:
                                        raise Exception("DM delivery routine returned False.")
                                except Exception as dm_err:
                                    db.add(ProcessedComment(
                                        username=username,
                                        post_id=post.id,
                                        comment_text=comment_text,
                                        status="failed",
                                        processed_at=datetime.utcnow()
                                    ))
                                    log_to_db("ERROR", f"Comment DM failed to @{username}: {dm_err}")
                                
                                db.commit()
                                bot_action_taken = True
                                
                                # human delay spacer
                                delay = random.randint(min_delay, max_delay)
                                log_to_db("INFO", f"Sleeping for {delay} seconds between comment triggers...")
                                for _ in range(delay):
                                    if not BOT_RUNNING:
                                        break
                                    await asyncio.sleep(1)
                                    
                except Exception as loop_err:
                    log_to_db("ERROR", f"Comment scraper thread encountered error: {loop_err}")
                finally:
                    await bot.close_browser()

            # --- Phase B: Standard Queue Checks ---
            if not bot_action_taken and BOT_RUNNING:
                next_target = db.query(Target).filter(Target.status == "pending").first()
                if next_target:
                    # Select template
                    templates = db.query(MessageTemplate).filter(MessageTemplate.is_active == True).all()
                    if templates:
                        selected_template = random.choice(templates)
                        raw_msg = selected_template.content
                        replaced_msg = raw_msg.replace("@username", f"@{next_target.username}").replace("{username}", next_target.username)
                        parsed_message = parse_spintax(replaced_msg)
                        
                        next_target.status = "sending"
                        db.commit()
                        
                        bot = InstagramBot(active_account.username)
                        await bot.init_browser(headless=settings.HEADLESS)
                        
                        try:
                            logged_in = await bot.check_login_status()
                            if logged_in:
                                success = await bot.send_direct_message(next_target.username, parsed_message)
                                if success:
                                    next_target.status = "sent"
                                    next_target.sent_at = datetime.utcnow()
                                    next_target.message_sent = parsed_message
                                    next_target.error_message = None
                                    log_to_db("SUCCESS", f"Successfully completed DM task for @{next_target.username}")
                                else:
                                    raise Exception("Direct message dispatch failed.")
                                    
                                await bot.perform_random_activity()
                            else:
                                log_to_db("ERROR", f"Account {active_account.username} requires re-authentication.")
                                active_account.status = "verification_needed"
                                next_target.status = "pending"
                        except Exception as queue_err:
                            log_to_db("ERROR", f"Queue action failed: {queue_err}")
                            next_target.status = "failed"
                            next_target.error_message = str(queue_err)
                            next_target.sent_at = datetime.utcnow()
                        finally:
                            db.commit()
                            await bot.close_browser()
                            
                        # human delay spacer
                        delay = random.randint(min_delay, max_delay)
                        log_to_db("INFO", f"Sleeping for {delay} seconds between target queue sends...")
                        for _ in range(delay):
                            if not BOT_RUNNING:
                                break
                            await asyncio.sleep(1)
                    else:
                        log_to_db("ERROR", "No active message templates found. Create one first.")
                        await asyncio.sleep(30)
                else:
                    # Both phases idle, sleep for a bit
                    await asyncio.sleep(45)

        except Exception as e:
            log_to_db("ERROR", f"Bot execution loop encountered an error: {str(e)}")
            await asyncio.sleep(10)
        finally:
            db.close()
            
    log_to_db("INFO", "Bot Worker Loop has shut down.")

def start_bot_background():
    """Starts the bot loop in a separate thread."""
    global BOT_RUNNING, BOT_THREAD, BOT_LOOP
    if BOT_RUNNING:
        return False
        
    db = SessionLocal()
    try:
        status_setting = db.query(Setting).filter(Setting.key == "status").first()
        if status_setting:
            status_setting.value = "running"
            db.commit()
    finally:
        db.close()
        
    BOT_RUNNING = True
    
    def run_async_loop():
        global BOT_LOOP
        BOT_LOOP = asyncio.new_event_loop()
        asyncio.set_event_loop(BOT_LOOP)
        BOT_LOOP.run_until_complete(bot_worker_loop())
        BOT_LOOP.close()
        
    BOT_THREAD = threading.Thread(target=run_async_loop, daemon=True)
    BOT_THREAD.start()
    return True

def stop_bot_background():
    """Signals the bot loop to stop running."""
    global BOT_RUNNING, BOT_LOOP
    if not BOT_RUNNING:
        return False
        
    db = SessionLocal()
    try:
        status_setting = db.query(Setting).filter(Setting.key == "status").first()
        if status_setting:
            status_setting.value = "stopped"
            db.commit()
    finally:
        db.close()
        
    BOT_RUNNING = False
    return True

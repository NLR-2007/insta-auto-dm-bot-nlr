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

async def human_type(locator, text: str):
    """Simulates real human typing with random delays between characters on a Playwright Locator."""
    await locator.focus()
    for char in text:
        await locator.type(char, delay=random.randint(50, 150))
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
        
        # Check if storage state exists (uploaded cookies/localStorage)
        storage_state_file = os.path.join(self.user_data_dir, "storage_state.json")
        cookies_to_add = []
        if os.path.exists(storage_state_file):
            try:
                import json
                with open(storage_state_file, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                    if isinstance(state_data, dict):
                        cookies_to_add = state_data.get("cookies", [])
                    elif isinstance(state_data, list):
                        cookies_to_add = state_data
            except Exception as e:
                print(f"Error reading storage_state.json: {e}")
            
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
        
        # Inject cookies post-launch since storage_state is not supported in launch_persistent_context
        if cookies_to_add:
            try:
                # Clean up cookies to only pass valid keys and strip None/null values
                cleaned_cookies = []
                for cookie in cookies_to_add:
                    if not isinstance(cookie, dict):
                        continue
                    cleaned_cookie = {}
                    for k in ["name", "value", "url", "domain", "path", "expires", "httpOnly", "secure", "sameSite"]:
                        if k in cookie and cookie[k] is not None:
                            cleaned_cookie[k] = cookie[k]
                    cleaned_cookies.append(cleaned_cookie)
                await self.context.add_cookies(cleaned_cookies)
            except Exception as e:
                print(f"Error injecting cookies to browser context: {e}")
        
        # Use the default page created by persistent context instead of opening a new blank tab
        if self.context.pages:
            self.page = self.context.pages[0]
        else:
            self.page = await self.context.new_page()

        # Execute JS to bypass navigator.webdriver detection
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
                try:
                    await self.page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
                except Exception as goto_err:
                    log_to_db("WARNING", f"Navigation to check Instagram login status timed out or failed: {str(goto_err)}")
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
                log_to_db("WARNING", f"Login form input detected on page. User is logged out.")
                return False
                
            current_url = self.page.url
            if "instagram.com/accounts/login" in current_url:
                log_to_db("WARNING", f"Redirected to login page: {current_url}. User is logged out.")
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
        """Sends a direct message to a target username.
        Tries profile Message button, then three dots menu, then Direct inbox search as fallback."""
        if not self.page:
            raise Exception("Browser not initialized.")

        log_to_db("INFO", f"Navigating to profile: https://www.instagram.com/{target_username}/")
        try:
            try:
                await self.page.goto(f"https://www.instagram.com/{target_username}/", wait_until="domcontentloaded", timeout=25000)
            except Exception as goto_err:
                log_to_db("WARNING", f"Navigation to profile timed out or failed, continuing: {str(goto_err)}")
            await asyncio.sleep(random.uniform(3.0, 5.0))

            # Check if profile is unavailable
            body_text = await self.page.inner_text("body")
            if "Sorry, this page isn't available" in body_text or "Page Not Found" in body_text:
                raise Exception("Profile not found or page unavailable.")

            dm_ready = False

            # Strategy 1: Click Message button on profile
            message_button = await self._find_message_button()
            if message_button:
                log_to_db("INFO", "Clicking 'Message' button on profile...")
                await message_button.click()
                await asyncio.sleep(random.uniform(4.0, 6.0))
                dm_ready = await self._check_dm_input_exists()
                if not dm_ready:
                    log_to_db("WARNING", "Message button clicked but DM input did not appear (likely a private account).")

            # Strategy 2: Three dots menu → Send message
            if not dm_ready:
                log_to_db("INFO", f"Trying three dots menu for @{target_username}...")
                if await self._send_via_three_dots_menu():
                    dm_ready = await self._check_dm_input_exists()

            # Strategy 3: Direct inbox search (most reliable for private accounts)
            if not dm_ready:
                log_to_db("INFO", f"Falling back to Direct inbox to reach @{target_username}...")
                await self._send_via_direct_inbox(target_username)

            # At this point we should be in the DM thread — find the message input
            await self._type_and_send_message(target_username, message)
            return True
        except Exception as e:
            log_to_db("ERROR", f"Failed to send DM to {target_username}: {str(e)}")
            raise e

    async def _find_message_button(self):
        """Finds the Message button on a profile page."""
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
                for i in range(await loc.count()):
                    item = loc.nth(i)
                    if await item.is_visible():
                        return item
        return None

    async def _check_dm_input_exists(self) -> bool:
        """Quick check (with short wait) whether a DM input field is visible on the page."""
        await self._dismiss_popups()

        dm_selectors = [
            'div[contenteditable="true"][aria-label="Message"]',
            'div[contenteditable="true"][aria-placeholder*="Message"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[role="textbox"]',
            'div[contenteditable="true"]',
            'textarea[placeholder*="Message"]',
            'p[placeholder*="Message"]',
        ]

        # Two quick passes with a short wait between
        for attempt in range(2):
            for sel in dm_selectors:
                loc = self.page.locator(sel)
                count = await loc.count()
                for i in range(count):
                    if await loc.nth(i).is_visible():
                        return True
            if attempt == 0:
                await asyncio.sleep(random.uniform(2.0, 3.0))
                await self._dismiss_popups()

        return False

    async def _send_via_three_dots_menu(self) -> bool:
        """Clicks the three dots (⋯) menu on a profile page and selects 'Send message'."""
        try:
            # Find the three dots button on the profile
            dots_button = None
            dots_selectors = [
                'svg[aria-label="Options"]',
                'button:has(svg[aria-label="Options"])',
                'div[role="button"]:has(svg[aria-label="Options"])',
                # The ⋯ button is often near the username, look for it
                'button:has(svg[aria-label="More options"])',
                'svg[aria-label="More options"]',
            ]
            
            for sel in dots_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            dots_button = item
                            break
                if dots_button:
                    break
            
            if not dots_button:
                log_to_db("WARNING", "Three dots menu button not found on profile.")
                return False
            
            log_to_db("INFO", "Clicking three dots (⋯) menu...")
            await dots_button.click()
            await asyncio.sleep(random.uniform(1.5, 3.0))
            
            # Now look for "Send message" in the dropdown menu
            send_msg_btn = None
            send_selectors = [
                "//button[text()='Send message']",
                "//div[text()='Send message']",
                "//span[text()='Send message']",
                "//button[contains(text(),'Send message')]",
                'button:has-text("Send message")',
                'div[role="button"]:has-text("Send message")',
                # Also try lowercase
                "//button[text()='Send Message']",
                'button:has-text("Send Message")',
            ]
            
            for sel in send_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            send_msg_btn = item
                            break
                if send_msg_btn:
                    break
            
            if not send_msg_btn:
                log_to_db("WARNING", "'Send message' option not found in three dots menu.")
                # Close the menu by pressing Escape
                await self.page.keyboard.press("Escape")
                await asyncio.sleep(1.0)
                return False
            
            log_to_db("INFO", "Clicking 'Send message' from three dots menu...")
            await send_msg_btn.click()
            await asyncio.sleep(random.uniform(4.0, 6.0))
            return True
            
        except Exception as e:
            log_to_db("WARNING", f"Three dots menu approach failed: {e}")
            return False

    async def _send_via_direct_inbox(self, target_username: str):
        """Navigates to Direct inbox, creates a new message, and searches for the target user."""
        try:
            await self.page.goto("https://www.instagram.com/direct/new/", wait_until="domcontentloaded", timeout=25000)
        except Exception as goto_err:
            log_to_db("WARNING", f"Navigation to direct inbox timed out or failed, continuing: {str(goto_err)}")
        await asyncio.sleep(random.uniform(3.0, 5.0))
        
        # Look for the search/recipient input field
        search_input = None
        search_selectors = [
            'input[placeholder="Search..."]',
            'input[placeholder="Search…"]',
            'input[name="queryBox"]',
            'input[type="text"]',
        ]
        
        for sel in search_selectors:
            loc = self.page.locator(sel)
            if await loc.count() > 0:
                for i in range(await loc.count()):
                    item = loc.nth(i)
                    if await item.is_visible():
                        search_input = item
                        break
            if search_input:
                break
        
        if not search_input:
            raise Exception("Could not find recipient search input in Direct inbox.")
        
        # Type the username to search
        log_to_db("INFO", f"Searching for @{target_username} in Direct inbox...")
        await search_input.click()
        await asyncio.sleep(0.5)
        await human_type(search_input, target_username)
        await asyncio.sleep(random.uniform(2.0, 4.0))
        
        # Click on the matching user from search results
        # Instagram shows results as clickable items with the username text
        user_result = None
        result_selectors = [
            f'//span[contains(text(), "{target_username}")]',
            f'//div[contains(text(), "{target_username}")]',
            f'button:has-text("{target_username}")',
            f'div[role="button"]:has-text("{target_username}")',
        ]
        
        for sel in result_selectors:
            loc = self.page.locator(sel)
            if await loc.count() > 0:
                for i in range(await loc.count()):
                    item = loc.nth(i)
                    if await item.is_visible():
                        user_result = item
                        break
            if user_result:
                break
        
        if not user_result:
            raise Exception(f"User @{target_username} not found in Direct inbox search results.")
        
        await user_result.click()
        await asyncio.sleep(random.uniform(1.5, 2.5))
        
        # Click the "Chat" or "Next" button to open the conversation
        next_btn = None
        next_selectors = [
            "//div[text()='Chat']",
            "//button[text()='Chat']",
            "//div[text()='Next']",
            "//button[text()='Next']",
            "div[role='button']:has-text('Chat')",
            "div[role='button']:has-text('Next')",
        ]
        
        for sel in next_selectors:
            loc = self.page.locator(sel)
            if await loc.count() > 0:
                for i in range(await loc.count()):
                    item = loc.nth(i)
                    if await item.is_visible():
                        next_btn = item
                        break
            if next_btn:
                break
        
        if next_btn:
            await next_btn.click()
            await asyncio.sleep(random.uniform(3.0, 5.0))
        else:
            log_to_db("WARNING", "No 'Chat'/'Next' button found, proceeding anyway...")
            await asyncio.sleep(2.0)

    async def _type_and_send_message(self, target_username: str, message: str):
        """Finds the DM input box, types the message, and sends it."""
        
        # First, dismiss any popups that might be blocking (e.g. "Turn on notifications")
        await self._dismiss_popups()
        
        dm_input_selectors = [
            'div[contenteditable="true"][aria-label="Message"]',
            'div[contenteditable="true"][aria-placeholder*="Message"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[aria-placeholder*="Message"]',
            'div[role="textbox"]',
            'div[contenteditable="true"]',
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="message"]',
            'p[placeholder*="Message"]',
        ]
        
        input_box = None
        for attempt in range(5):
            for sel in dm_input_selectors:
                loc = self.page.locator(sel)
                count = await loc.count()
                for i in range(count):
                    item = loc.nth(i)
                    if await item.is_visible():
                        input_box = item
                        break
                if input_box:
                    break

            if input_box:
                break

            log_to_db("INFO", f"DM input not found yet (attempt {attempt + 1}/5). Waiting...")
            await self._dismiss_popups()
            await asyncio.sleep(random.uniform(3.0, 5.0))
                
        if not input_box:
            raise Exception("Direct message input field not found.")
            
        log_to_db("INFO", f"Typing message to {target_username}...")
        await input_box.click()
        await asyncio.sleep(1.0)
        
        # Type message
        await human_type(input_box, message)
        await asyncio.sleep(random.uniform(1.0, 2.0))
        
        # Press Enter to send
        log_to_db("INFO", "Sending message...")
        await self.page.keyboard.press("Enter")
        await asyncio.sleep(3.0)
        
        log_to_db("SUCCESS", f"Message successfully sent to {target_username}!")

    async def _dismiss_popups(self):
        """Dismisses common Instagram popups that block interaction (notifications, cookies, etc.)."""
        try:
            # Common dismiss button selectors for Instagram popups
            dismiss_selectors = [
                "//button[text()='Not Now']",
                "//button[text()='Not now']",
                "//button[text()='Cancel']",
                "//button[text()='Dismiss']",
                "//button[text()='Close']",
                "//button[text()='Turn Off']",
                "//button[text()='Maybe Later']",
                "//a[text()='Not Now']",
                "//a[text()='Not now']",
                'button:has-text("Not Now")',
                'button:has-text("Not now")',
                'div[role="button"]:has-text("Not Now")',
                # Close X buttons on dialog overlays
                'div[role="dialog"] button svg[aria-label="Close"]',
                'div[role="dialog"] button:has(svg[aria-label="Close"])',
            ]
            
            for sel in dismiss_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            await item.click()
                            log_to_db("INFO", f"Dismissed popup using: {sel}")
                            await asyncio.sleep(1.0)
                            return  # One popup at a time
        except Exception:
            pass  # Silently ignore popup dismissal errors

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
            try:
                await self.page.goto(post_url, wait_until="domcontentloaded", timeout=25000)
            except Exception as goto_err:
                log_to_db("WARNING", f"Navigation to post timed out or failed, continuing: {str(goto_err)}")
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
                        # Only mark as verification_needed if we're sure we are logged out (login page or form visible)
                        is_login_page = False
                        try:
                            current_url = bot.page.url if bot.page else ""
                            is_login_page = "accounts/login" in current_url or (bot.page and await bot.page.locator('input[name="username"]').is_visible())
                        except Exception:
                            pass
                        
                        if is_login_page:
                            log_to_db("ERROR", f"Account {active_account.username} requires re-authentication (login page detected).")
                            active_account.status = "verification_needed"
                            db.commit()
                        else:
                            log_to_db("WARNING", f"Login verification check failed for {active_account.username} (likely transient timeout). Retaining status 'connected' to retry.")
                            
                        await bot.close_browser()
                        db.close()
                        await asyncio.sleep(30)
                        continue
                        
                    for post in active_posts:
                        # Scrape comments
                        comments = await bot.scrape_post_comments(post.post_url, post.trigger_keyword)
                        log_to_db("INFO", f"Trigger comments scraped for post {post.id}: {comments}")
                        
                        for username, comment_text in comments:
                            if not BOT_RUNNING:
                                break
                                
                            # Check if already processed successfully
                            existing = db.query(ProcessedComment).filter(
                                ProcessedComment.username == username,
                                ProcessedComment.post_id == post.id
                            ).first()
                            
                            # Skip if already sent successfully
                            if existing and existing.status == "sent":
                                continue
                            
                            # If previously failed, delete old record so we can retry
                            if existing and existing.status == "failed":
                                log_to_db("INFO", f"Retrying previously failed DM to @{username}...")
                                db.delete(existing)
                                db.commit()
                            
                            log_to_db("INFO", f"New trigger comment '{comment_text}' detected from @{username}. Preparing DM outreach...")
                            raw_msg = post.template.content
                            replaced_msg = raw_msg.replace("@username", f"@{username}").replace("{username}", username)
                            parsed_message = parse_spintax(replaced_msg)
                            
                            try:
                                # Safety check: make sure the page is still alive
                                if bot.page is None or bot.page.is_closed():
                                    log_to_db("WARNING", "Browser page was closed. Re-initializing browser...")
                                    await bot.close_browser()
                                    await bot.init_browser(headless=settings.HEADLESS)
                                    logged_in = await bot.check_login_status()
                                    if not logged_in:
                                        raise Exception("Re-login failed after page crash.")
                                
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
                                is_login_page = False
                                try:
                                    current_url = bot.page.url if bot.page else ""
                                    is_login_page = "accounts/login" in current_url or (bot.page and await bot.page.locator('input[name="username"]').is_visible())
                                except Exception:
                                    pass
                                
                                if is_login_page:
                                    log_to_db("ERROR", f"Account {active_account.username} requires re-authentication (login page detected).")
                                    active_account.status = "verification_needed"
                                else:
                                    log_to_db("WARNING", f"Login verification check failed for {active_account.username} (likely transient timeout). Retaining status 'connected' to retry.")
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
    if BOT_RUNNING or (BOT_THREAD and BOT_THREAD.is_alive()):
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

    BOT_RUNNING = False

    try:
        db = SessionLocal()
        try:
            status_setting = db.query(Setting).filter(Setting.key == "status").first()
            if status_setting:
                status_setting.value = "stopped"
                db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[WARNING] DB update during stop failed (bot still stopped): {e}")

    return True

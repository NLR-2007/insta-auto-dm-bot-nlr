import re
import os
import random
import time
import asyncio
from datetime import datetime, date
from typing import Optional
import threading
from playwright.async_api import async_playwright, Page, BrowserContext
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Account, Target, MessageTemplate, BotLog, Setting, log_to_db, MonitoredPost, ProcessedComment, OptOut, User
from backend.config import settings
from backend.security import decrypt_secret

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
    def __init__(self, account_username: str, proxy: Optional[dict] = None):
        self.username = account_username
        self.user_data_dir = os.path.abspath(os.path.join(settings.USER_DATA_DIR, account_username))
        os.makedirs(self.user_data_dir, exist_ok=True)
        self.playwright = None
        self.context = None
        self.page = None
        self.proxy = proxy

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
            proxy=self.proxy,
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
        Strategy 1: Profile 'Message' button (public/following accounts).
        Strategy 2: Three dots ... -> 'Send message' (private accounts).
        Strategy 3: Direct inbox compose (last resort fallback)."""
        if not self.page:
            raise Exception("Browser not initialized.")

        log_to_db("INFO", f"Navigating to profile: https://www.instagram.com/{target_username}/")
        try:
            try:
                await self.page.goto(f"https://www.instagram.com/{target_username}/", wait_until="domcontentloaded", timeout=25000)
            except Exception as goto_err:
                log_to_db("WARNING", f"Navigation to profile timed out or failed, continuing: {str(goto_err)}")
            await asyncio.sleep(random.uniform(3.0, 5.0))

            body_text = await self.page.inner_text("body")
            if "Sorry, this page isn't available" in body_text or "Page Not Found" in body_text:
                raise Exception("Profile not found or page unavailable.")

            dm_ready = False
            strategy1_clicked = False

            # Strategy 1: Click 'Message' button on profile (public / already-following)
            message_button = await self._find_message_button()
            if message_button:
                log_to_db("INFO", "Clicking 'Message' button on profile...")
                await message_button.click()
                strategy1_clicked = True
                await asyncio.sleep(random.uniform(4.0, 6.0))
                await self._dismiss_popups()
                dm_ready = await self._check_dm_input_exists()
                if not dm_ready:
                    log_to_db("WARNING", "Message button clicked but DM input did not appear.")

            # Strategy 2: Three dots menu -> 'Send message' (works for private accounts)
            if not dm_ready:
                if strategy1_clicked:
                    log_to_db("INFO", f"Re-navigating to @{target_username}'s profile for three dots approach...")
                    try:
                        await self.page.goto(f"https://www.instagram.com/{target_username}/", wait_until="domcontentloaded", timeout=25000)
                    except Exception:
                        pass
                    await asyncio.sleep(random.uniform(3.0, 5.0))
                log_to_db("INFO", f"Trying three dots menu -> Send message for @{target_username}...")
                if await self._send_via_three_dots_menu():
                    dm_ready = await self._check_dm_input_exists()

            # Strategy 3: Direct inbox compose (last resort)
            if not dm_ready:
                log_to_db("INFO", f"Falling back to Direct inbox compose for @{target_username}...")
                dm_ready = await self._send_via_direct_inbox(target_username)

            if not dm_ready:
                raise Exception(f"Could not open DM thread with @{target_username} via any method.")

            await self._type_and_send_message(target_username, message)
            return True
        except Exception as e:
            log_to_db("ERROR", f"Failed to send DM to {target_username}: {str(e)}")
            raise e

    async def _find_message_button(self):
        """Finds the Message button on a profile page. Uses exact text match to avoid
        false-matching 'Messages' nav link or 'Send message' menu items."""
        selectors = [
            "//div[text()='Message']",
            "//button[text()='Message']",
            'button:text-is("Message")',
            'div[role="button"]:text-is("Message")',
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
        """Clicks the three dots (...) menu on a profile page and selects 'Send message'.
        This is the primary method for private accounts."""
        try:
            dots_button = None
            dots_selectors = [
                'svg[aria-label="Options"]',
                'button:has(svg[aria-label="Options"])',
                'div[role="button"]:has(svg[aria-label="Options"])',
                'svg[aria-label="More options"]',
                'button:has(svg[aria-label="More options"])',
                'div[role="button"]:has(svg[aria-label="More options"])',
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

            log_to_db("INFO", "Clicking three dots (...) menu...")
            await dots_button.click()
            await asyncio.sleep(random.uniform(2.0, 3.5))

            send_msg_btn = None
            send_selectors = [
                "//button[text()='Send message']",
                "//button[text()='Send Message']",
                "//div[text()='Send message']",
                "//span[text()='Send message']",
                'button:has-text("Send message")',
                'div[role="button"]:has-text("Send message")',
                'button:has-text("Send Message")',
                'div[role="button"]:has-text("Send Message")',
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
                log_to_db("WARNING", "'Send message' not found in three dots menu.")
                await self.page.keyboard.press("Escape")
                await asyncio.sleep(1.0)
                return False

            log_to_db("INFO", "Clicking 'Send message' from three dots menu...")
            await send_msg_btn.click()
            await asyncio.sleep(random.uniform(4.0, 6.0))
            await self._dismiss_popups()
            return True

        except Exception as e:
            log_to_db("WARNING", f"Three dots menu approach failed: {e}")
            return False

    async def _send_via_direct_inbox(self, target_username: str) -> bool:
        """Navigates to Direct inbox, composes a new message, and searches for the target user.
        This is the most reliable method for private accounts."""
        try:
            # Step 1: Navigate to the direct inbox
            log_to_db("INFO", "Navigating to Direct inbox...")
            try:
                await self.page.goto("https://www.instagram.com/direct/inbox/", wait_until="domcontentloaded", timeout=25000)
            except Exception:
                pass
            await asyncio.sleep(random.uniform(3.0, 5.0))
            await self._dismiss_popups()

            # Step 2: Click the "New message" / compose button (pencil icon)
            compose_btn = None
            compose_selectors = [
                'svg[aria-label="New message"]',
                'div[role="button"]:has(svg[aria-label="New message"])',
                'a[href="/direct/new/"]',
                'svg[aria-label="New Message"]',
                'div[role="button"]:has(svg[aria-label="New Message"])',
                'button:has(svg[aria-label="New message"])',
                'button:has(svg[aria-label="New Message"])',
                # Compose pencil icon - sometimes aria-label differs
                'svg[aria-label="Compose"]',
                'div[role="button"]:has(svg[aria-label="Compose"])',
            ]
            for sel in compose_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            compose_btn = item
                            break
                if compose_btn:
                    break

            if compose_btn:
                log_to_db("INFO", "Clicking 'New message' compose button...")
                await compose_btn.click()
                await asyncio.sleep(random.uniform(2.0, 3.0))
            else:
                # Fallback: try navigating directly to /direct/new/
                log_to_db("INFO", "Compose button not found, navigating to /direct/new/ ...")
                try:
                    await self.page.goto("https://www.instagram.com/direct/new/", wait_until="domcontentloaded", timeout=25000)
                except Exception:
                    pass
                await asyncio.sleep(random.uniform(3.0, 5.0))

            await self._dismiss_popups()

            # Step 3: Find the "To:" / search input field for recipients
            search_input = None
            search_selectors = [
                'input[placeholder="Search..."]',
                'input[placeholder="Search…"]',
                'input[placeholder*="Search"]',
                'input[name="queryBox"]',
                'input[aria-label*="Search"]',
                'input[aria-label*="search"]',
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

            # If no search input found, try any visible text input in a dialog
            if not search_input:
                dialog_inputs = self.page.locator('div[role="dialog"] input[type="text"]')
                if await dialog_inputs.count() > 0:
                    for i in range(await dialog_inputs.count()):
                        if await dialog_inputs.nth(i).is_visible():
                            search_input = dialog_inputs.nth(i)
                            break

            if not search_input:
                log_to_db("ERROR", "Could not find recipient search input in Direct inbox compose.")
                return False

            # Step 4: Type the username to search
            log_to_db("INFO", f"Searching for @{target_username} in Direct compose...")
            await search_input.click()
            await asyncio.sleep(0.5)
            await search_input.fill("")
            await asyncio.sleep(0.3)
            await human_type(search_input, target_username)
            await asyncio.sleep(random.uniform(3.0, 5.0))

            # Step 5: Click on the matching user from search results
            # Instagram shows results as a list - we need to click the right one
            # The result items typically contain the username in a span and may have a checkbox/radio
            user_clicked = False

            # Try clicking a result item that contains the username text
            result_selectors = [
                f'div[role="dialog"] span:text-is("{target_username}")',
                f'div[role="dialog"] span:text("{target_username}")',
                f'div[role="dialog"] button:has-text("{target_username}")',
                f'div[role="dialog"] div[role="button"]:has-text("{target_username}")',
                f'div[role="listbox"] div:has-text("{target_username}")',
                f'//span[translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="{target_username.lower()}"]',
                f'span:text-is("{target_username}")',
            ]

            for sel in result_selectors:
                try:
                    loc = self.page.locator(sel)
                    if await loc.count() > 0:
                        for i in range(await loc.count()):
                            item = loc.nth(i)
                            if await item.is_visible():
                                await item.click()
                                user_clicked = True
                                log_to_db("INFO", f"Selected @{target_username} from search results.")
                                break
                except Exception:
                    continue
                if user_clicked:
                    break

            # Fallback: click the first visible result row in the dialog
            if not user_clicked:
                log_to_db("INFO", "Trying to click first search result row...")
                try:
                    # Instagram search results are typically in a scrollable div with clickable rows
                    result_rows = self.page.locator('div[role="dialog"] div[role="none"], div[role="dialog"] label, div[role="dialog"] div[style*="cursor: pointer"]')
                    if await result_rows.count() > 0:
                        for i in range(await result_rows.count()):
                            row = result_rows.nth(i)
                            row_text = await row.inner_text()
                            if target_username.lower() in row_text.lower():
                                await row.click()
                                user_clicked = True
                                log_to_db("INFO", f"Clicked result row containing @{target_username}.")
                                break
                except Exception as e:
                    log_to_db("WARNING", f"Result row click fallback failed: {e}")

            if not user_clicked:
                log_to_db("ERROR", f"User @{target_username} not found in Direct compose search results.")
                return False

            await asyncio.sleep(random.uniform(1.5, 2.5))

            # Step 6: Click "Chat" or "Next" button to open the conversation
            next_btn = None
            next_selectors = [
                "//div[text()='Chat']",
                "//button[text()='Chat']",
                "//div[text()='Next']",
                "//button[text()='Next']",
                "div[role='button']:has-text('Chat')",
                "div[role='button']:has-text('Next')",
                "div[role='dialog'] div[role='button']:has-text('Chat')",
                "div[role='dialog'] div[role='button']:has-text('Next')",
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
                log_to_db("INFO", "Clicking 'Chat'/'Next' to open conversation...")
                await next_btn.click()
                await asyncio.sleep(random.uniform(3.0, 5.0))
            else:
                log_to_db("WARNING", "No 'Chat'/'Next' button found after selecting user, proceeding...")
                await asyncio.sleep(2.0)

            await self._dismiss_popups()

            # Step 7: Confirm DM input is ready
            dm_ready = await self._check_dm_input_exists()
            if dm_ready:
                log_to_db("INFO", "DM input ready via Direct inbox compose.")
                return True

            # Sometimes Instagram shows a "Send message request" confirmation for private accounts
            # Check for and accept any confirmation dialog
            confirm_selectors = [
                'button:has-text("Send message")',
                'button:has-text("Send Message")',
                'div[role="button"]:has-text("Send message")',
                'button:has-text("OK")',
                'button:has-text("Got it")',
            ]
            for sel in confirm_selectors:
                loc = self.page.locator(sel)
                if await loc.count() > 0:
                    for i in range(await loc.count()):
                        item = loc.nth(i)
                        if await item.is_visible():
                            await item.click()
                            log_to_db("INFO", "Accepted message request confirmation dialog.")
                            await asyncio.sleep(2.0)
                            break
                    break

            dm_ready = await self._check_dm_input_exists()
            if dm_ready:
                return True

            log_to_db("WARNING", "DM input still not found after Direct inbox compose flow.")
            return False

        except Exception as e:
            log_to_db("ERROR", f"Direct inbox compose approach failed: {e}")
            return False

    async def _type_and_send_message(self, target_username: str, message: str):
        """Finds the DM input box, types the message, and sends it."""

        await self._dismiss_popups()

        dm_input_selectors = [
            'div[contenteditable="true"][aria-label="Message"]',
            'div[contenteditable="true"][aria-placeholder*="Message"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[aria-placeholder*="Message"]',
            'div[role="textbox"]',
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="message"]',
            'p[placeholder*="Message"]',
            'div[contenteditable="true"]',
        ]

        input_box = None
        for attempt in range(6):
            for sel in dm_input_selectors:
                loc = self.page.locator(sel)
                count = await loc.count()
                for i in range(count):
                    item = loc.nth(i)
                    if await item.is_visible():
                        # Avoid matching the "To:" search field in compose dialog
                        aria = await item.get_attribute("aria-label") or ""
                        placeholder = await item.get_attribute("aria-placeholder") or await item.get_attribute("placeholder") or ""
                        tag = await item.evaluate("el => el.tagName.toLowerCase()")
                        if "search" in aria.lower() or "search" in placeholder.lower():
                            continue
                        if tag == "input":
                            continue
                        input_box = item
                        break
                if input_box:
                    break

            if input_box:
                break

            log_to_db("INFO", f"DM input not found yet (attempt {attempt + 1}/6). Dismissing popups and waiting...")
            await self._dismiss_popups()

            # Also try accepting any "message request" prompt
            try:
                for confirm_sel in ['button:has-text("Send message")', 'button:has-text("OK")', 'button:has-text("Got it")']:
                    btn = self.page.locator(confirm_sel)
                    if await btn.count() > 0 and await btn.first.is_visible():
                        await btn.first.click()
                        log_to_db("INFO", "Accepted a confirmation prompt while waiting for DM input.")
                        await asyncio.sleep(2.0)
                        break
            except Exception:
                pass

            await asyncio.sleep(random.uniform(2.5, 4.0))

        if not input_box:
            raise Exception("Direct message input field not found.")

        log_to_db("INFO", f"Typing message to {target_username}...")
        await input_box.click()
        await asyncio.sleep(1.0)

        await human_type(input_box, message)
        await asyncio.sleep(random.uniform(1.0, 2.0))

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

    async def scrape_post_comments(self, post_url: str, trigger_keyword: str, own_username: str = "") -> list:
        """Navigates to post_url, ensures the comment drawer is open, and extracts comments.
        own_username is excluded from results to avoid DMing yourself."""
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
                
            # Run the comment scraper
            raw_comments = await self.page.evaluate("""(ownUser) => {
                const results = [];
                const seen = new Set();
                const navNames = new Set([
                    'instagram','home','search','explore','messages','profile',
                    'notifications','reels','direct','create','threads','accounts',
                    'about','p','reel','stories','tv','tags','tagged','saved',
                    'ar','developer','legal','privacy','safety','blog'
                ]);

                // Strategy 1: Find comments via <article> > <ul> > <li> structure
                const article = document.querySelector('article');
                if (article) {
                    const uls = article.querySelectorAll('ul');
                    for (const ul of uls) {
                        const lis = ul.querySelectorAll(':scope > li');
                        if (lis.length < 1) continue;

                        for (const li of lis) {
                            // Each comment <li> should contain a profile link
                            const links = li.querySelectorAll('a[href^="/"]');
                            let username = '';
                            for (const link of links) {
                                const href = link.getAttribute('href') || '';
                                const parts = href.replace(/^\\//, '').replace(/\\/$/, '').split('/');
                                if (parts.length === 1 && parts[0] && !navNames.has(parts[0].toLowerCase())) {
                                    username = parts[0];
                                    break;
                                }
                            }
                            if (!username) continue;
                            if (ownUser && username.toLowerCase() === ownUser.toLowerCase()) continue;

                            // Get all text spans in this <li>
                            const spans = li.querySelectorAll('span');
                            let commentText = '';
                            for (const span of spans) {
                                if (span.querySelector('span')) continue;
                                const val = (span.textContent || '').trim();
                                if (!val) continue;
                                if (val.toLowerCase() === username.toLowerCase()) continue;
                                if (/^(reply|see translation|verified|follow)$/i.test(val)) continue;
                                if (/view (\\d+ )?repl/i.test(val)) continue;
                                if (/hide repl/i.test(val)) continue;
                                if (/^\\d+[wdhms]$/.test(val)) continue;
                                if (/^\\d+ (likes?|replies?|days?|weeks?|hours?|minutes?)$/i.test(val)) continue;
                                if (/^(liked by|author|edited)$/i.test(val)) continue;
                                if (val.length > 500) continue;
                                commentText = val;
                                break;
                            }

                            if (commentText) {
                                const key = username.toLowerCase() + '::' + commentText.toLowerCase();
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    results.push({ username, commentText });
                                }
                            }
                        }
                    }
                }

                // Strategy 2: If strategy 1 found nothing, try finding any element
                // that has both a profile link and nearby text content
                if (results.length === 0) {
                    const allLinks = document.querySelectorAll('a[href^="/"]');
                    for (const link of allLinks) {
                        const href = link.getAttribute('href') || '';
                        const parts = href.replace(/^\\//, '').replace(/\\/$/, '').split('/');
                        if (parts.length !== 1 || !parts[0]) continue;
                        const username = parts[0];
                        if (navNames.has(username.toLowerCase())) continue;
                        if (ownUser && username.toLowerCase() === ownUser.toLowerCase()) continue;

                        // Walk up to find a reasonable comment container
                        let container = link;
                        for (let depth = 0; depth < 8; depth++) {
                            container = container.parentElement;
                            if (!container) break;
                            const tag = container.tagName.toLowerCase();
                            if (tag === 'li' || tag === 'div') {
                                const text = (container.textContent || '').trim();
                                if (text.length > 20 && text.length < 1000) {
                                    // Check if this looks like a comment (has username + some other text)
                                    const spans = container.querySelectorAll('span');
                                    let commentText = '';
                                    for (const span of spans) {
                                        if (span.querySelector('span')) continue;
                                        const val = (span.textContent || '').trim();
                                        if (!val || val.length < 1) continue;
                                        if (val.toLowerCase() === username.toLowerCase()) continue;
                                        if (/^(reply|see translation|verified|follow)$/i.test(val)) continue;
                                        if (/view (\\d+ )?repl/i.test(val)) continue;
                                        if (/^\\d+[wdhms]$/.test(val)) continue;
                                        if (/^\\d+ (likes?|replies?)$/i.test(val)) continue;
                                        if (val.length > 500) continue;
                                        commentText = val;
                                        break;
                                    }
                                    if (commentText) {
                                        const key = username.toLowerCase() + '::' + commentText.toLowerCase();
                                        if (!seen.has(key)) {
                                            seen.add(key);
                                            results.push({ username, commentText });
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                return results;
            }""", own_username)
            
            for item in raw_comments:
                uname = item["username"]
                text = item["commentText"]
                if own_username and uname.lower() == own_username.lower():
                    continue
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
            
            # Fetch connected accounts only for users who have activated their automation
            active_user_ids = [u.id for u in db.query(User).filter(User.automation_active == True).all()]
            if not active_user_ids:
                db.close()
                await asyncio.sleep(10)
                continue

            active_accounts = db.query(Account).filter(
                Account.status == "connected",
                Account.user_id.in_(active_user_ids)
            ).all()
            if not active_accounts:
                db.close()
                await asyncio.sleep(10)
                continue

            bot_action_taken = False

            # Check API Mode (suspends Playwright if using compliant official Meta API)
            api_mode_setting = db.query(Setting).filter(Setting.key == "api_mode").first()
            api_mode = api_mode_setting.value if api_mode_setting else "sandbox"
            if api_mode == "official":
                db.close()
                await asyncio.sleep(30)
                continue

            # Iterate through connected accounts sequentially to avoid resource hogging and IP blocks
            for active_account in active_accounts:
                if not BOT_RUNNING:
                    break

                # Parse proxy details
                proxy_config = None
                if active_account.proxy_host and active_account.proxy_port:
                    proxy_config = {
                        "server": f"http://{active_account.proxy_host}:{active_account.proxy_port}"
                    }
                    if active_account.proxy_username and active_account.proxy_password:
                        proxy_config["username"] = active_account.proxy_username
                        proxy_config["password"] = decrypt_secret(active_account.proxy_password)

                # 3. Check today's send count (targets + comments)
                today_start = datetime.combine(date.today(), datetime.min.time())
                sent_targets = db.query(Target).filter(
                    Target.status == "sent", 
                    Target.sent_at >= today_start,
                    Target.account_id == active_account.id
                ).count()
                
                # Fetch monitored posts associated with this account
                active_posts = db.query(MonitoredPost).filter(
                    MonitoredPost.is_active == True,
                    MonitoredPost.account_id == active_account.id
                ).all()
                active_post_ids = [p.id for p in active_posts]

                sent_comments = 0
                if active_post_ids:
                    sent_comments = db.query(ProcessedComment).filter(
                        ProcessedComment.status == "sent", 
                        ProcessedComment.processed_at >= today_start,
                        ProcessedComment.post_id.in_(active_post_ids)
                    ).count()
                
                total_sent_today = sent_targets + sent_comments
                if total_sent_today >= daily_limit:
                    log_to_db("WARNING", f"Daily sending limit reached for @{active_account.username} ({total_sent_today}/{daily_limit}). Skipping...")
                    continue

                account_action_taken = False

                # --- Phase A: Comment-to-DM Trigger Checks ---
                if active_posts:
                    bot = InstagramBot(active_account.username, proxy=proxy_config)
                    await bot.init_browser(headless=settings.HEADLESS)
                    
                    try:
                        logged_in = await bot.check_login_status()
                        if not logged_in:
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
                                log_to_db("WARNING", f"Login verification check failed for {active_account.username} (transient timeout).")
                                
                            await bot.close_browser()
                            continue
                            
                        for post in active_posts:
                            comments = await bot.scrape_post_comments(post.post_url, post.trigger_keyword, own_username=active_account.username)
                            log_to_db("INFO", f"Scraped trigger comments for @{active_account.username} on post {post.id}: {comments}")
                            
                            for username, comment_text in comments:
                                if not BOT_RUNNING:
                                    break
                                
                                # 1. Opt-out keyword check
                                opt_out_setting = db.query(Setting).filter(Setting.key == "opt_out_keywords").first()
                                opt_out_keywords = [k.strip().lower() for k in (opt_out_setting.value if opt_out_setting else "").split(",") if k.strip()]
                                if comment_text.strip().lower() in opt_out_keywords:
                                    exists = db.query(OptOut).filter(
                                        OptOut.username == username.lower(),
                                        OptOut.user_id == active_account.user_id,
                                        OptOut.workspace_id == active_account.workspace_id
                                    ).first()
                                    if not exists:
                                        db.add(OptOut(username=username.lower(), user_id=active_account.user_id, workspace_id=active_account.workspace_id))
                                        db.commit()
                                        log_to_db("WARNING", f"[COMPLIANCE] Auto-blocked @{username} due to unsubscribe comment.")
                                    continue

                                # 2. Blocklist check
                                blocked = db.query(OptOut).filter(
                                    OptOut.username == username.lower(),
                                    OptOut.user_id == active_account.user_id,
                                    OptOut.workspace_id == active_account.workspace_id
                                ).first()
                                if blocked:
                                    log_to_db("WARNING", f"[COMPLIANCE] Ignored trigger comment: @{username} is in the blocklist.")
                                    continue

                                # Check if already processed
                                existing = db.query(ProcessedComment).filter(
                                    ProcessedComment.username == username,
                                    ProcessedComment.post_id == post.id
                                ).first()
                                
                                if existing and existing.status == "sent":
                                    continue
                                
                                if existing and existing.status == "failed":
                                    log_to_db("INFO", f"Retrying failed DM to @{username}...")
                                    db.delete(existing)
                                    db.commit()
                                
                                log_to_db("INFO", f"New trigger comment detected from @{username}. Preparing DM outreach...")
                                raw_msg = post.template.content
                                replaced_msg = raw_msg.replace("@username", f"@{username}").replace("{username}", username)
                                parsed_message = parse_spintax(replaced_msg)
                                
                                try:
                                    if bot.page is None or bot.page.is_closed():
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
                                        log_to_db("SUCCESS", f"Sent trigger comment DM to @{username} from @{active_account.username}")
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
                                account_action_taken = True
                                bot_action_taken = True
                                
                                # human delay spacer
                                delay = random.randint(min_delay, max_delay)
                                log_to_db("INFO", f"Sleeping for {delay} seconds between comment triggers...")
                                for _ in range(delay):
                                    if not BOT_RUNNING:
                                        break
                                    await asyncio.sleep(1)
                                        
                        await bot.close_browser()
                    except Exception as loop_err:
                        log_to_db("ERROR", f"Scraper logic failed for @{active_account.username}: {loop_err}")
                        await bot.close_browser()

                # --- Phase B: Standard Queue Checks ---
                if not account_action_taken and BOT_RUNNING:
                    next_target = db.query(Target).filter(
                        Target.status == "pending",
                        Target.account_id == active_account.id
                    ).first()
                    
                    if next_target:
                        # Blocklist check
                        blocked = db.query(OptOut).filter(
                            OptOut.username == next_target.username.lower(),
                            OptOut.user_id == active_account.user_id,
                            OptOut.workspace_id == active_account.workspace_id
                        ).first()
                        if blocked:
                            log_to_db("WARNING", f"[COMPLIANCE] Skipping target queue: @{next_target.username} has opted out.")
                            next_target.status = "failed"
                            next_target.error_message = "Blocked: User has opted out / unsubscribed."
                            db.commit()
                            continue
                            
                        # Select template
                        templates = db.query(MessageTemplate).filter(
                            MessageTemplate.is_active == True,
                            MessageTemplate.user_id == active_account.user_id,
                            MessageTemplate.workspace_id == active_account.workspace_id
                        ).all()
                        
                        if templates:
                            selected_template = random.choice(templates)
                            raw_msg = selected_template.content
                            replaced_msg = raw_msg.replace("@username", f"@{next_target.username}").replace("{username}", next_target.username)
                            parsed_message = parse_spintax(replaced_msg)
                            
                            next_target.status = "sending"
                            db.commit()
                            
                            bot = InstagramBot(active_account.username, proxy=proxy_config)
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
                                        log_to_db("SUCCESS", f"Successfully completed DM task for @{next_target.username} via @{active_account.username}")
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
                                        log_to_db("ERROR", f"Account {active_account.username} requires re-authentication.")
                                        active_account.status = "verification_needed"
                                    else:
                                        log_to_db("WARNING", f"Login verification check failed for {active_account.username}.")
                                    next_target.status = "pending"
                            except Exception as queue_err:
                                log_to_db("ERROR", f"Queue action failed: {queue_err}")
                                next_target.status = "failed"
                                next_target.error_message = str(queue_err)
                                next_target.sent_at = datetime.utcnow()
                            finally:
                                db.commit()
                                await bot.close_browser()
                                
                            bot_action_taken = True
                            
                            # human delay spacer
                            delay = random.randint(min_delay, max_delay)
                            log_to_db("INFO", f"Sleeping for {delay} seconds between target queue sends...")
                            for _ in range(delay):
                                if not BOT_RUNNING:
                                    break
                                await asyncio.sleep(1)
                        else:
                            log_to_db("ERROR", f"No active message templates found for user {active_account.user_id}. Create one first.")
            
            # If all accounts were idle, sleep for a short bit
            if not bot_action_taken and BOT_RUNNING:
                await asyncio.sleep(30)

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

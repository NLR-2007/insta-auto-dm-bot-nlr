<p align="center">
  <img src="https://img.shields.io/badge/Instagram-Auto%20DM%20Bot-F97316?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram Auto DM Bot" />
</p>

<h1 align="center">Instagram Auto DM Bot</h1>

<p align="center">
  <strong>Automate Instagram direct messages with intelligent comment-triggered outreach and passwordless cookie authentication</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-0A0A0A?style=flat-square&logo=python&logoColor=F97316" />
  <img src="https://img.shields.io/badge/React-19-0A0A0A?style=flat-square&logo=react&logoColor=F97316" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-0A0A0A?style=flat-square&logo=fastapi&logoColor=F97316" />
  <img src="https://img.shields.io/badge/Playwright-Browser%20Automation-0A0A0A?style=flat-square&logo=playwright&logoColor=F97316" />
  <img src="https://img.shields.io/badge/License-MIT-F97316?style=flat-square" />
</p>

<p align="center">
  <a href="https://insta-auto-dm-bot-nlr.vercel.app">Live Dashboard</a>
</p>

---

## 📖 Overview

A premium, full-stack Instagram DM automation platform designed to manage and scale comment-triggered messaging campaigns. Clients can securely connect their Instagram profiles **without sharing passwords** by uploading standard session cookies JSON. 

The backend runs a headless **Playwright** worker loop simulating organic human interaction to monitor posts, detect keywords, and dispatch direct messages via multiple fallback routing strategies.

> [!IMPORTANT]
> **Passwordless Security:** This bot does not prompt for, store, or transmit Instagram account passwords. It operates entirely using browser-exported session cookie contexts, keeping your accounts safe and compliant with client security policies.

---

## 🗺️ System Flow & Architecture

```mermaid
graph TD
    User([User / Creator]) -->|1. Uploads Session Cookies JSON| ReactDashboard[React Dashboard UI]
    User -->|2. Configures Reels & Keyword Trigger| ReactDashboard
    ReactDashboard -->|API Requests| FastAPIServer[FastAPI Backend Server]
    FastAPIServer -->|Check / Verify Login| PlaywrightEngine[Playwright Chromium Instance]
    PlaywrightEngine -->|Verify & Interact| Instagram[Instagram Web App]
    FastAPIServer -->|Write / Read Session state| Storage["user_data/storage_state.json"]
    FastAPIServer -->|Store / Read Config & Logs| SQLite[SQLite Database]
    
    subgraph Automation Engine
        PlaywrightEngine
    end
```

---

## 🔒 Passwordless Session Cookie Authentication Flow

To keep client accounts secure, creators simply log in on their personal browser and export cookies using extensions like *EditThisCookie* or *Cookie-Editor*. The backend sanitizes, validates, and runs them headlessly.

```mermaid
sequenceDiagram
    autonumber
    actor User as Creator
    participant UI as React UI Dashboard
    participant API as FastAPI Backend
    participant Browser as Playwright Browser (Headless)
    participant IG as Instagram Web
    
    User->>IG: Log in normally on personal browser
    User->>IG: Export cookies using Cookie-Editor (JSON)
    User->>UI: Select account & upload cookies JSON file
    UI->>API: POST /api/accounts/{username}/session
    API->>API: Normalize cookie keys & strip invalid values (e.g. expires)
    API->>API: Write cookies to user_data/{username}/storage_state.json
    API->>Browser: Launch persistent context & inject cookies
    API->>Browser: Navigate to instagram.com (headless check)
    Browser->>IG: Load indicators (Messenger/Inbox elements)
    IG-->>Browser: Page indicators visible
    Browser-->>API: Login status: TRUE
    API->>UI: Return Success ("Connected")
    UI-->>User: Account status changes to Connected
```

---

## 🤖 Comment-to-DM Trigger Flow

The background worker continuously monitors Reels/posts, checks comments against target keywords, deduplicates them against database history to prevent spamming, and dispatches messages with random intervals.

```mermaid
graph TD
    Start([Start Worker Loop]) --> GetActivePost[Fetch Active Monitored Post URLs]
    GetActivePost --> LaunchBrowser[Launch Chromium Browser context]
    LaunchBrowser --> NavigatePost[Navigate to Reel/Post URL]
    NavigatePost --> ClickDrawer[Click Comment button to open Comments Drawer]
    ClickDrawer --> ScrapeComments[Run JS Comment Scraper script]
    ScrapeComments --> FilterKeyword{Does comment text contain trigger keyword?}
    FilterKeyword -->|No| SkipComment[Ignore Comment]
    FilterKeyword -->|Yes| CheckDB{Has user already been processed for this post_id?}
    CheckDB -->|Yes| SkipProcessed[Skip - Already processed to prevent spam]
    CheckDB -->|No| InitOutreach[Prepare DM template using Spintax & Username]
    InitOutreach --> SendDM[Execute Cascading DM outreach]
    SendDM --> LogOutreach[Write ProcessedComment status 'sent' or 'failed' to Database]
    LogOutreach --> Delay[Wait for randomized human delay spacer 45s-120s]
    Delay --> LoopEnd[Proceed to next comment / post]
```

---

## 🛡️ Cascading DM Delivery Strategy

Instagram UI varies depending on whether a target account is public, private, or has restrictions. The bot employs a robust three-tier cascading outreach pipeline to ensure maximum deliverability:

```mermaid
graph TD
    Start([Start DM Outreach]) --> NavProfile[Navigate to instagram.com/username]
    NavProfile --> Strategy1{Is 'Message' button visible on profile?}
    Strategy1 -->|Yes| ClickMessage[Click 'Message' button]
    ClickMessage --> CheckInput1{Does DM input box appear?}
    CheckInput1 -->|Yes| TypeMessage[Type message using human typing & Send]
    CheckInput1 -->|No| Strategy2
    Strategy1 -->|No| Strategy2{Find Three-Dots menu button?}
    Strategy2 -->|Yes| ClickDots[Click Three-Dots menu]
    ClickDots --> ClickSendMsgOption[Click 'Send message' option]
    ClickSendMsgOption --> CheckInput2{Does DM input box appear?}
    CheckInput2 -->|Yes| TypeMessage
    CheckInput2 -->|No| Strategy3
    Strategy2 -->|No| Strategy3[Fallback: Navigate to Direct Inbox/new]
    Strategy3 --> SearchUser[Search for username in query box]
    SearchUser --> ClickResult[Click user from results & Next]
    ClickResult --> TypeMessage
    TypeMessage --> Success([Outreach Completed Successfully])
```

---

## ⚡ Key Capabilities

* **Resilient Page Navigation** — Scrapers use `domcontentloaded` wait states and ignore external heavy media timeouts to ensure fast execution and reduce page crashes.
* **Auto-Recovery Login Checks** — If Instagram is slow or times out, the bot keeps the account status as `connected` and retries, rather than immediately marking it as invalid.
* **Double-Thread Prevention** — The API prevents parallel bot worker loops by checking if a thread is already running, avoiding browser session profile lock conflicts.
* **Database Clean Integrity** — Deleting a monitored post deletes its associated comment history using SQLite foreign key cascade constraints (`PRAGMA foreign_keys = ON`), resolving post ID reuse issues.
* **Spintax & Dynamic Replaces** — Vary your outreach text naturally with `{Hello|Hi|Hey} {username}` templates.

---

## 🚀 Getting Started

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/NLR-2007/insta-auto-dm-bot-nlr.git
cd insta-auto-dm-bot-nlr
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate # On Windows

# Install dependencies and browsers
pip install -r backend/requirements.txt # or install fastapi uvicorn sqlalchemy pydantic-settings playwright
playwright install chromium

# Start the backend server
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuration (`.env`)

```env
DATABASE_URL=sqlite:///./insta_automate.db
HEADLESS=false
DAILY_DM_LIMIT=30
MIN_DELAY_SECONDS=45
MAX_DELAY_SECONDS=120
```

---

## 📈 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, TailwindCSS / Vanilla CSS, Lucide Icons |
| **Backend** | Python, FastAPI, SQLAlchemy, Pydantic |
| **Automation** | Playwright (Chromium) |
| **Database** | SQLite (default) / MySQL |
| **Deployment** | Vercel (frontend), Local Machine / VPS (backend) |

---

<p align="center">
  Developed by <strong>NLR GROUP OF COMPANIES</strong>
</p>

<p align="center">
  <a href="https://nlrgroupofcompany.in">nlrgroupofcompany.in</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Instagram-Auto%20DM%20Bot-F97316?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram Auto DM Bot" />
</p>

<h1 align="center">Instagram Auto DM Bot</h1>

<p align="center">
  <strong>Automate Instagram direct messages with intelligent comment-triggered outreach</strong>
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

## Overview

A full-stack Instagram DM automation platform that sends personalized direct messages to target users via real browser automation. Built with a **FastAPI** backend powered by **Playwright** for browser control and a sleek **React** dashboard for managing campaigns.

### Key Capabilities

- **Comment-to-DM Triggers** — Monitor any Instagram post/reel for specific trigger words. When a user comments the trigger word, the bot automatically sends them a personalized DM
- **Queue-Based Outreach** — Add target usernames manually, in bulk, or via CSV upload. The bot processes the queue with human-like delays
- **Spintax Templates** — Create message templates with `{Hello|Hi|Hey}` syntax for natural message variation
- **Playwright Browser Sessions** — Uses real Chromium browser with persistent cookies. No API tokens needed — log in once manually and the session persists
- **Private Account Fallback** — Cascading DM delivery strategy: profile Message button → three-dots menu → Direct inbox search
- **Stealth Features** — Human-like typing, randomized delays, user-agent spoofing, anti-detection scripts

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 React Dashboard                  │
│            (Vercel / localhost:5173)              │
│                                                  │
│   Dashboard │ Accounts │ Targets │ Templates     │
│   Comment Triggers │ Settings │ Live Logs        │
└──────────────────────┬──────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Backend                      │
│            (localhost:8000)                       │
│                                                  │
│   Account CRUD │ Target Queue │ Bot Control      │
│   Template Engine │ Comment Monitor │ Settings   │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
   ┌─────────────────┐   ┌──────────────┐
   │   SQLite / MySQL  │   │  Playwright   │
   │    Database       │   │  Chromium     │
   └─────────────────┘   └──────────────┘
```

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/NLR-2007/insta-auto-dm-bot-nlr.git
cd insta-auto-dm-bot-nlr
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic-settings playwright

# Install Playwright browsers
playwright install chromium

# Start the backend server
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 4. Connect Your Instagram Account

1. Open the dashboard and navigate to **IG Accounts**
2. Enter your Instagram username and click **Add Account**
3. Click **Authenticate (Playwright)** — a browser window opens on your machine
4. Log in manually (supports 2FA, captchas, security checks)
5. Once logged in, the session cookies are saved automatically

---

## Usage

### Queue-Based DMs

1. Go to **Targets Queue** and add usernames (single, bulk paste, or CSV upload)
2. Go to **DM Templates** and create a message template with spintax:
   ```
   {Hey|Hi|Hello} @username! {Thanks for the follow|Appreciate the support}!
   ```
3. Go to **Dashboard** and click **Start Automation**
4. The bot processes the queue with randomized delays between messages

### Comment-to-DM Triggers

1. Go to **DM Templates** and create a template for the auto-reply
2. Go to **Comment Triggers** and configure:
   - **Post URL** — The Instagram post/reel to monitor
   - **Trigger Word** — The keyword to detect (case-insensitive)
   - **DM Template** — The template to send when triggered
3. Start the bot — it will periodically scrape comments and DM new matches

---

## Configuration

### Environment Variables (`.env`)

```env
DATABASE_URL=sqlite:///./insta_automate.db
HEADLESS=false
DAILY_DM_LIMIT=30
MIN_DELAY_SECONDS=45
MAX_DELAY_SECONDS=120
```

### Dashboard Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Daily Message Limit | 30 | Maximum DMs per day (queue + triggers combined) |
| Min Delay | 45s | Minimum seconds between messages |
| Max Delay | 120s | Maximum seconds between messages |
| Working Hours | 08:00–22:00 | Active sending window |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | System status and stats |
| `GET/POST` | `/api/accounts` | List / add Instagram accounts |
| `POST` | `/api/accounts/:username/login` | Launch manual login browser |
| `GET/POST/DELETE` | `/api/targets` | Manage target queue |
| `POST` | `/api/targets/upload` | Bulk import from CSV/TXT |
| `GET/POST/DELETE` | `/api/messages` | Manage DM templates |
| `GET/POST` | `/api/settings` | View / update bot settings |
| `POST` | `/api/bot/start` | Start the automation bot |
| `POST` | `/api/bot/stop` | Stop the automation bot |
| `GET/POST/DELETE` | `/api/posts` | Manage monitored post triggers |
| `GET` | `/api/history` | Comment-to-DM dispatch history |
| `GET` | `/api/logs` | System audit logs |

---

## Deployment

### Frontend (Vercel)

The React frontend is deployed on Vercel. It connects to your local backend via a tunnel URL (Ngrok / Cloudflare Tunnel).

1. Deploy the `frontend/` directory to Vercel
2. Start your local backend with `run_backend.bat`
3. Expose it via [ngrok](https://ngrok.com): `ngrok http 8000`
4. Enter the tunnel URL in the dashboard header

### Backend (Local Machine)

The backend **must run on your local machine** since Playwright controls a real browser. Use `run_backend.bat` for a quick start on Windows.

---

## Safety Guidelines

> Instagram monitors account activity. Following these guidelines reduces the risk of action blocks.

- **Daily Limit**: 20–40 DMs/day for established accounts, under 15 for new accounts
- **Delays**: Minimum 45–120 seconds between messages with randomization
- **Working Hours**: Send only during 09:00–22:00 to simulate human patterns
- **Account Warmup**: Use accounts with established activity history
- **Template Variation**: Use spintax to avoid identical messages

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Recharts, Lucide Icons |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Automation | Playwright (Chromium) |
| Database | SQLite (default) / MySQL |
| Deployment | Vercel (frontend), Local (backend) |

---

<p align="center">
  Developed by <strong>NLR GROUP OF COMPANIES</strong>
</p>

<p align="center">
  <a href="https://nlrgroupofcompany.in">nlrgroupofcompany.in</a>
</p>

<p align="center">
  <img src="lyvora_banner.png" alt="Lyvora Dashboard Mockup" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Lyvora-Leading%20Your%20Vision-F97316?style=for-the-badge&logo=instagram&logoColor=white" alt="Lyvora - Leading Your Vision with Optimized Reliable Automation" />
</p>

<h1 align="center">Lyvora</h1>

<p align="center">
  <strong>Leading Your Vision with Optimized Reliable Automation</strong><br />
  <em>Unified Instagram DM + Telegram Channel Automation Platform. Comment-triggered DMs, scheduled broadcasts, auto-moderation, and real-time monitoring. Free during Beta.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-0A0A0A?style=flat-square&logo=python&logoColor=F97316" />
  <img src="https://img.shields.io/badge/React-19-0A0A0A?style=flat-square&logo=react&logoColor=F97316" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-0A0A0A?style=flat-square&logo=fastapi&logoColor=F97316" />
  <img src="https://img.shields.io/badge/Playwright-Browser%20Automation-0A0A0A?style=flat-square&logo=playwright&logoColor=F97316" />
  <img src="https://img.shields.io/badge/Telegram-Bot%20API-0A0A0A?style=flat-square&logo=telegram&logoColor=0EA5E9" />
  <img src="https://img.shields.io/badge/Status-Free%20Beta-16A34A?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-F97316?style=flat-square" />
</p>

<p align="center">
  <a href="https://insta-auto-dm-bot-nlr.vercel.app">Live Dashboard</a> &middot;
  <a href="https://nlrgroupofcompany.in">NLR Group of Companies</a>
</p>

---


## Table of Contents

1. [What is Lyvora?](#what-is-lyvora)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Instagram Automation Deep Dive](#instagram-automation-deep-dive)
9. [Telegram Automation Deep Dive](#telegram-automation-deep-dive)
10. [Frontend Pages & Components](#frontend-pages--components)
11. [Getting Started](#getting-started)
12. [Configuration Reference](#configuration-reference)
13. [Security & Compliance](#security--compliance)
14. [SaaS Architecture](#saas-architecture)
15. [Deployment](#deployment)
16. [Development by NLR Group of Companies](#development-by-nlr-group-of-companies)

---

## What is Lyvora?

Lyvora is a full-stack creator automation platform that combines **Instagram DM automation** and **Telegram channel management** into a single, unified dashboard. It is built for content creators, digital marketers, educational institutions, and outreach agencies.

### The Problem It Solves

Creators and marketers need to:
- Respond to Instagram comments with personalized DMs at scale (e.g., "comment SEND to get the free guide")
- Schedule and broadcast content across multiple Telegram channels
- Moderate Telegram channels with auto-delete rules and spam filters
- Do all of this without sharing passwords, without Meta API approval delays, and without paying for multiple tools

### How Lyvora Works

**Instagram side:** A headless Playwright browser instance monitors specified Instagram Reels/posts for target keywords in comments. When a keyword match is found, it automatically sends a personalized DM to the commenter using a 3-tier cascading delivery strategy. Authentication is fully passwordless - creators export their browser session cookies, and Lyvora uses those to maintain sessions.

**Telegram side:** The platform integrates with the Telegram Bot API to manage multiple bots and channels. Users can schedule posts with timezone support, set up recurring broadcasts, and create auto-moderation rules that filter spam, block keywords, and auto-delete violations.

**Both platforms** are managed from a single React dashboard with real-time log streaming, live status indicators, and unified analytics.

> **Current Status:** Lyvora is in **Free Beta**. All premium features across all tiers are unlocked at no cost. No credit card required.

---

## Key Features

### Instagram Automation

| Feature | Description |
|---------|-------------|
| **Passwordless Authentication** | Connect accounts via browser session cookie JSON export. No passwords stored or transmitted. |
| **Comment-to-DM Triggers** | Monitor Reels/posts for keyword comments and auto-send personalized DMs. |
| **Cascading DM Delivery** | 3-tier fallback: profile message button → three-dots menu → direct inbox search. |
| **Spintax Templates** | `{Hello|Hi|Hey} {username}, {here's|check out} your {guide|resource}` for natural variation. |
| **Deduplication** | Database-tracked history prevents re-messaging the same user for the same post. |
| **Rate Limiting** | Configurable daily DM cap (default: 30), randomized delays (45-120 seconds). |
| **Working Hours** | Restrict automation to specified time windows (default: 08:00-22:00). |
| **Opt-Out Blocklist** | Automatic compliance - users who reply "STOP", "UNSUBSCRIBE", etc. are blocked. |
| **Multi-Account Support** | Manage multiple Instagram accounts per user, each with independent session state. |
| **Proxy Support** | Configure per-account proxy settings for IP rotation. |

### Telegram Automation

| Feature | Description |
|---------|-------------|
| **Multi-Bot Management** | Register multiple bot tokens, view bot info, and sync channels per bot. |
| **Channel Auto-Sync** | Automatically discover and list channels/groups where a bot is admin. |
| **Scheduled Posts** | Queue content with date/time and timezone (IST support built-in). |
| **Recurring Broadcasts** | RRULE-based recurrence for daily/weekly/monthly scheduled posts. |
| **Instant Send** | Send queued posts immediately with one click. |
| **Auto-Moderation** | Create rules per channel: spam filters, keyword blocklists, auto-delete triggers. |
| **Multiple Filter Types** | Combine spam, keyword, link, and custom filter types in a single rule. |
| **Post Logging** | All sent posts logged with status, timestamp, and content preview. |
| **Service Control** | Start/stop the Telegram polling service independently of the Instagram worker. |

### Platform & Admin

| Feature | Description |
|---------|-------------|
| **Real-Time Dashboard** | Live bot status (running/stopped), sent/failed/pending DM counts, log streaming. |
| **Multi-User Auth** | JWT-based authentication with bcrypt password hashing. |
| **Admin Panel** | System stats, user management (enable/disable/grant admin), global bot control. |
| **Audit Logging** | All user actions (login, config changes, bot start/stop) tracked with metadata. |
| **SaaS Workspaces** | Multi-tenant workspace support with roles (owner/admin/member/viewer). |
| **Subscription Plans** | Trial, Starter, Pro, Agency tiers with mock billing (Stripe scaffolded). |
| **Secret Encryption** | Meta API tokens encrypted with Fernet symmetric cipher. |
| **Responsive Design** | Full mobile + desktop responsive UI across all 14 pages. |

---

## System Architecture

### High-Level Overview

```
                    +------------------+
                    |  React Frontend  |
                    |  (Vite + React)  |
                    +--------+---------+
                             |
                        REST API calls
                             |
                    +--------v---------+
                    |  FastAPI Backend  |
                    |  (Python 3.10+)  |
                    +--------+---------+
                             |
               +-------------+-------------+
               |                           |
      +--------v--------+        +--------v--------+
      | Playwright       |        | Telegram Bot    |
      | Browser Engine   |        | API Client      |
      | (Chromium)       |        | (HTTPX)         |
      +--------+---------+        +--------+--------+
               |                           |
      +--------v--------+        +--------v--------+
      |  Instagram Web  |        |   Telegram API  |
      +------------------+        +-----------------+
               |                           |
               +-------------+-------------+
                             |
                    +--------v---------+
                    | SQLite / MySQL   |
                    | Database         |
                    +------------------+
```

### Data Flow: Instagram Comment-to-DM

```mermaid
graph TD
    Start([Worker Loop Starts]) --> GetPosts[Fetch Active Monitored Posts]
    GetPosts --> LaunchBrowser[Launch Playwright Chromium]
    LaunchBrowser --> Navigate[Navigate to Post URL]
    Navigate --> OpenComments[Click to Open Comments Drawer]
    OpenComments --> Scrape[Run JS Comment Scraper]
    Scrape --> CheckKeyword{Comment Contains Keyword?}
    CheckKeyword -->|No| Skip[Ignore Comment]
    CheckKeyword -->|Yes| CheckHistory{Already Processed?}
    CheckHistory -->|Yes| SkipDupe[Skip - Deduplication]
    CheckHistory -->|No| CheckOptOut{User on Blocklist?}
    CheckOptOut -->|Yes| SkipBlocked[Skip - Opted Out]
    CheckOptOut -->|No| BuildMessage[Build Spintax Template]
    BuildMessage --> SendDM[Execute Cascading DM]
    SendDM --> LogResult[Write to Database]
    LogResult --> Delay[Random Delay 45-120s]
    Delay --> Next[Next Comment / Post]
```

### Data Flow: Telegram Scheduled Post

```mermaid
graph TD
    User([User]) --> Schedule[Create Scheduled Post via UI]
    Schedule --> API[POST /api/tg/posts/schedule]
    API --> DB[Save to tg_scheduled_posts table]
    DB --> Service[Telegram Service Polling Loop]
    Service --> Check{Scheduled Time Reached?}
    Check -->|No| Wait[Continue Polling]
    Check -->|Yes| Send[Send via Bot API]
    Send --> Log[Log to tg_post_logs]
    Log --> UpdateStatus[Update Status: sent]
    UpdateStatus --> CheckRecur{Is Recurring?}
    CheckRecur -->|Yes| NextSchedule[Calculate Next Schedule]
    CheckRecur -->|No| Done([Complete])
```

### Passwordless Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Creator
    participant UI as React Dashboard
    participant API as FastAPI Backend
    participant PW as Playwright Browser
    participant IG as Instagram Web

    Creator->>IG: Log in normally on personal browser
    Creator->>IG: Export cookies via Cookie-Editor extension (JSON file)
    Creator->>UI: Upload cookies JSON for target account
    UI->>API: POST /api/accounts/{username}/session
    API->>API: Normalize cookie keys, strip invalid values
    API->>API: Write to user_data/{username}/storage_state.json
    API->>PW: Launch persistent context with injected cookies
    PW->>IG: Navigate to instagram.com
    IG-->>PW: Page loads with logged-in indicators
    PW-->>API: Login verified: TRUE
    API-->>UI: Status: "Connected"
    UI-->>Creator: Account shows as connected
```

### Cascading DM Delivery Strategy

Instagram hides the "Message" button on certain profiles. Lyvora handles this with a 3-tier fallback:

```mermaid
graph TD
    Start([Begin DM]) --> Nav[Navigate to instagram.com/username]
    Nav --> T1{Message Button Visible?}
    T1 -->|Yes| Click1[Click Message Button]
    Click1 --> Input1{DM Input Appears?}
    Input1 -->|Yes| Type[Type Message & Send]
    Input1 -->|No| T2
    T1 -->|No| T2{Three-Dots Menu Found?}
    T2 -->|Yes| ClickDots[Click Three-Dots → Send Message]
    ClickDots --> Input2{DM Input Appears?}
    Input2 -->|Yes| Type
    Input2 -->|No| T3
    T2 -->|No| T3[Navigate to Direct Inbox]
    T3 --> Search[Search Username in Search Box]
    Search --> ClickUser[Click User → Next]
    ClickUser --> Type
    Type --> Success([DM Sent Successfully])
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 19.x | Single-page application UI |
| **Build Tool** | Vite | 8.x | Fast development server and bundler |
| **Icons** | Lucide React | 1.21+ | SVG icon library |
| **Charts** | Recharts | 3.9+ | Real-time data visualization |
| **Styling** | Vanilla CSS | - | Custom theme with CSS variables, responsive |
| **Backend Framework** | FastAPI | 0.110+ | Async REST API with auto-documentation |
| **ORM** | SQLAlchemy | 2.0+ | Database abstraction and model definitions |
| **Validation** | Pydantic | 2.6+ | Request/response schema validation |
| **Browser Automation** | Playwright | 1.42+ | Headless Chromium for Instagram interactions |
| **HTTP Client** | HTTPX | 0.27+ | Async Telegram Bot API communication |
| **Database** | SQLite (default) / MySQL | - | Configurable via DATABASE_URL |
| **Authentication** | python-jose (JWT) + passlib (bcrypt) | - | Token-based auth with password hashing |
| **Encryption** | cryptography (Fernet) | 42.0+ | Symmetric encryption for API secrets |
| **Email Validation** | email-validator | 2.1+ | User registration email verification |
| **Server** | Uvicorn | 0.28+ | ASGI server for FastAPI |
| **Linting** | Oxlint | 1.69+ | Fast JavaScript/TypeScript linter |
| **Deployment** | Vercel (frontend) / VPS (backend) | - | Static hosting + Python server |

---

## Project Structure

```
Lyvora/
├── backend/                           # Python FastAPI server
│   ├── main.py                       # Core API application (1555 lines)
│   │                                  # - All REST endpoints (70+ routes)
│   │                                  # - Auth middleware & JWT
│   │                                  # - Workspace/SaaS logic
│   │                                  # - Bot start/stop control
│   │                                  # - Telegram router
│   │                                  # - Admin panel endpoints
│   │                                  # - Settings management
│   │                                  # - Official Meta API router
│   ├── bot.py                        # Playwright automation engine (1278 lines)
│   │                                  # - Comment scraping from Reels/posts
│   │                                  # - Cascading DM delivery (3-tier)
│   │                                  # - Browser session management
│   │                                  # - Spintax template processing
│   │                                  # - Rate limiting & delay logic
│   │                                  # - Working hours enforcement
│   │                                  # - Opt-out keyword checking
│   ├── database.py                   # SQLAlchemy models & DB init (470 lines)
│   │                                  # - 20 database models/tables
│   │                                  # - Compatibility migration helper
│   │                                  # - Default settings seeding
│   │                                  # - Workspace bootstrap
│   ├── config.py                     # Pydantic Settings configuration
│   │                                  # - Environment variable loading
│   │                                  # - CORS origin management
│   │                                  # - Production config validation
│   ├── auth.py                       # Authentication utilities
│   │                                  # - JWT token creation/verification
│   │                                  # - Password hashing (bcrypt)
│   │                                  # - FastAPI dependency: get_current_user
│   ├── security.py                   # Encryption helpers
│   │                                  # - Fernet encrypt/decrypt for secrets
│   │                                  # - Token masking for API responses
│   │                                  # - Stable hashing for bot tokens
│   ├── schemas.py                    # Pydantic validation schemas
│   │                                  # - Request/response models
│   │                                  # - Workspace, campaign, runner schemas
│   ├── telegram_service.py           # Telegram Bot API client (350+ lines)
│   │                                  # - Send messages to channels
│   │                                  # - Sync bot channel list
│   │                                  # - Scheduled post execution
│   │                                  # - Auto-moderation polling
│   ├── official_api.py               # Meta Graph API integration
│   │                                  # - Webhook signature verification
│   │                                  # - Page messaging endpoints
│   ├── requirements.txt              # Python dependencies (14 packages)
│   ├── .env                          # Environment configuration
│   ├── run_bot.py                    # Manual CLI bot runner script
│   ├── debug_scrape.py               # Debug tool for comment scraping
│   └── test_connections.py           # Database/API connection tester
│
├── frontend/                          # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                   # Main app shell (275 lines)
│   │   │                              # - Sidebar navigation (desktop)
│   │   │                              # - Mobile hamburger menu
│   │   │                              # - Tab routing
│   │   │                              # - User menu & logout
│   │   │                              # - Connection status indicator
│   │   ├── api.js                    # API fetch wrapper (81 lines)
│   │   │                              # - Base URL configuration
│   │   │                              # - JWT token injection
│   │   │                              # - Auth helper functions
│   │   ├── main.jsx                  # React entry point
│   │   ├── index.css                 # Global stylesheet (3200+ lines)
│   │   │                              # - CSS variables theme system
│   │   │                              # - Component styles
│   │   │                              # - Landing page styles
│   │   │                              # - Auth page styles
│   │   │                              # - Responsive breakpoints
│   │   ├── App.css                   # App component styles
│   │   └── components/               # 14 React page components
│   │       ├── LandingPage.jsx       # Public homepage
│   │       ├── AuthPage.jsx          # Login/register
│   │       ├── Dashboard.jsx         # Status & live logs
│   │       ├── Accounts.jsx          # Instagram account management
│   │       ├── Targets.jsx           # DM target queue
│   │       ├── Messages.jsx          # Template CRUD
│   │       ├── CommentTriggers.jsx   # Monitored posts & history
│   │       ├── TelegramPanel.jsx     # Telegram tab container
│   │       ├── TgBots.jsx            # Bot management
│   │       ├── TgSchedule.jsx        # Post scheduling
│   │       ├── TgModeration.jsx      # Auto-moderation rules
│   │       ├── Settings.jsx          # Global configuration
│   │       ├── AdminPanel.jsx        # Admin user/system management
│   │       └── SaaSWorkspace.jsx     # Multi-workspace management
│   ├── public/                        # Static assets
│   ├── package.json                   # Node dependencies
│   ├── vite.config.js                 # Vite build configuration
│   ├── .env                           # VITE_API_URL setting
│   └── dist/                          # Production build output
│
├── user_data/                         # Per-account session storage
│   └── {username}/
│       └── storage_state.json        # Playwright browser cookies
│
├── insta_automate.db                  # SQLite database (default)
├── COMPLIANCE.md                      # Legal/safety framework
├── README.md                          # This documentation
├── README_SAAS.md                     # SaaS feature documentation
└── .gitignore                         # Git exclusion rules
```

---

## Database Schema

Lyvora uses 20 database tables organized into 5 domains:

### Core Authentication & Multi-Tenancy

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | id, username, email, password_hash, is_admin, is_enabled, automation_active | User accounts with role flags |
| `workspaces` | id, name, slug, plan_slug, automation_mode, owner_user_id | Multi-tenant organization units |
| `workspace_members` | workspace_id, user_id, role (owner/admin/member/viewer) | User-workspace role assignments |
| `subscriptions` | workspace_id, plan_slug, status, provider, current_period_end | Billing records per workspace |
| `audit_logs` | user_id, workspace_id, action, entity_type, entity_id, metadata_json | All user actions tracked |

### Instagram Automation

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `accounts` | username, status, cookie_path, user_id, workspace_id, proxy_* | Instagram account profiles |
| `targets` | username, status (pending/sending/sent/failed), account_id | Queue of DM target users |
| `message_templates` | name, content (spintax), is_active, user_id, workspace_id | DM message templates |
| `monitored_posts` | post_url, trigger_keyword, template_id, account_id, is_active | Posts being watched for keywords |
| `processed_comments` | username, post_id, comment_text, status (sent/failed) | Comment processing history |
| `opt_outs` | username, user_id, workspace_id | Blocklisted users (compliance) |

### Telegram Automation

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `tg_bot_configs` | bot_token, bot_token_hash, bot_username, user_id, workspace_id | Telegram bot registrations |
| `tg_channels` | chat_id, title, chat_type, member_count, bot_id | Channels synced per bot |
| `tg_scheduled_posts` | content, media_type, scheduled_at, status, is_recurring, channel_id | Queued/sent channel posts |
| `tg_moderation_rules` | rule_type, config (JSON), is_active, channel_id | Auto-moderation configurations |
| `tg_post_logs` | channel_id, message_id, content_preview, status, timestamp | Post delivery history |

### System Configuration

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `settings` | key, value | Global key-value configuration store |
| `bot_logs` | level (INFO/SUCCESS/WARNING/ERROR), message, timestamp | System event logs |

### SaaS Campaign & Runner

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `campaigns` | workspace_id, name, channel, mode, status, daily_limit, trigger_keyword | SaaS campaign records |
| `automation_runners` | workspace_id, name, token_hash, status, runner_type, last_seen_at | Local/cloud runner instances |

### Key Relationships

- `users` → `workspace_members` → `workspaces` (many-to-many via membership)
- `accounts` → `targets` (one-to-many, cascade delete)
- `accounts` → `monitored_posts` → `processed_comments` (chain cascade delete)
- `tg_bot_configs` → `tg_channels` → `tg_scheduled_posts` (chain cascade delete)
- `tg_channels` → `tg_moderation_rules` (one-to-many, cascade delete)
- Deleting a `monitored_post` automatically deletes all its `processed_comments` (FK cascade)

---

## API Reference

The FastAPI backend exposes 70+ REST endpoints across 10 domains. All authenticated endpoints require a JWT token in the `Authorization: Bearer <token>` header.

### Authentication (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user (username, email, password) |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/me` | Get current authenticated user profile |

### Instagram Accounts (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/accounts` | List all connected Instagram accounts |
| `POST` | `/api/accounts` | Add a new Instagram account |
| `DELETE` | `/api/accounts/{username}` | Remove an account |
| `POST` | `/api/accounts/{username}/login` | Trigger browser login verification |
| `POST` | `/api/accounts/{username}/mark-connected` | Force-mark account as connected |
| `POST` | `/api/accounts/{username}/session` | Upload session cookies JSON |

### DM Targets (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/targets` | List all target users with status |
| `POST` | `/api/targets` | Add target username(s) |
| `POST` | `/api/targets/upload` | Bulk upload via CSV file |
| `DELETE` | `/api/targets/{id}` | Remove a specific target |
| `DELETE` | `/api/targets` | Clear all targets |

### Message Templates (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages` | List all message templates |
| `POST` | `/api/messages` | Create a new template (with spintax) |
| `PATCH` | `/api/messages/{id}` | Toggle template active/inactive |
| `DELETE` | `/api/messages/{id}` | Delete a template |

### Comment-Triggered Posts (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List all monitored posts |
| `POST` | `/api/posts` | Add a post URL + trigger keyword + template |
| `DELETE` | `/api/posts/{id}` | Stop monitoring (cascades to comment history) |

### Automation Control (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Bot running status + DM counts |
| `GET` | `/api/history` | View processed comment history |
| `POST` | `/api/bot/start` | Launch background Instagram worker |
| `POST` | `/api/bot/stop` | Stop background Instagram worker |
| `GET` | `/api/logs` | System logs (last 100 entries) |

### Opt-Out Compliance (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/optouts` | List all blocklisted usernames |
| `POST` | `/api/optouts` | Add username to blocklist |
| `DELETE` | `/api/optouts/{id}` | Remove from blocklist |

### Settings (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get all global bot settings |
| `POST` | `/api/settings` | Update settings (admin only) |

### Telegram (17 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tg/bots` | Register a new Telegram bot token |
| `GET` | `/api/tg/bots` | List all registered bots |
| `DELETE` | `/api/tg/bots/{id}` | Delete a bot and its channels |
| `POST` | `/api/tg/bots/{id}/refresh-channels` | Re-sync channels for a bot |
| `GET` | `/api/tg/channels` | List all channels across all bots |
| `POST` | `/api/tg/channels/add-manual` | Add a channel by chat ID manually |
| `POST` | `/api/tg/posts/schedule` | Schedule a new channel post |
| `GET` | `/api/tg/posts` | List all scheduled/sent posts |
| `DELETE` | `/api/tg/posts/{id}` | Cancel a scheduled post |
| `POST` | `/api/tg/posts/{id}/send-now` | Send a scheduled post immediately |
| `POST` | `/api/tg/moderation/rules` | Create an auto-moderation rule |
| `GET` | `/api/tg/moderation/rules` | List all moderation rules |
| `PATCH` | `/api/tg/moderation/rules/{id}/toggle` | Enable/disable a rule |
| `DELETE` | `/api/tg/moderation/rules/{id}` | Delete a moderation rule |
| `POST` | `/api/tg/service/start` | Start the Telegram polling service |
| `POST` | `/api/tg/service/stop` | Stop the Telegram polling service |
| `GET` | `/api/tg/service/status` | Get Telegram service status |

### Admin (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all users with stats |
| `PATCH` | `/api/admin/users/{id}/toggle-admin` | Grant/revoke admin role |
| `PATCH` | `/api/admin/users/{id}/toggle-enabled` | Enable/disable user |
| `DELETE` | `/api/admin/users/{id}` | Delete a user |
| `GET` | `/api/admin/stats` | System-wide statistics |
| `POST` | `/api/admin/system/start` | Start global bot worker |
| `POST` | `/api/admin/system/stop` | Stop global bot worker |

### SaaS & Workspaces (9 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces` | List user's workspaces |
| `POST` | `/api/workspaces` | Create a new workspace |
| `GET` | `/api/plans` | List available pricing plans |
| `GET` | `/api/billing/subscription` | Get subscription status |
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/campaigns` | Create a campaign |
| `PATCH` | `/api/campaigns/{id}/status` | Update campaign status |
| `GET` | `/api/runners` | List automation runners |
| `POST` | `/api/runners` | Create a runner token |

---

## Instagram Automation Deep Dive

### How Comment Scraping Works

1. The background worker (started via `POST /api/bot/start`) runs in a Python `asyncio` thread.
2. For each active `MonitoredPost`, it launches a Playwright Chromium browser context with the linked account's stored session cookies.
3. It navigates to the post URL and clicks to open the comments drawer.
4. A JavaScript script is injected into the page that scrapes visible comments, extracting `{username, text}` pairs.
5. Each comment is checked against the `trigger_keyword` (case-insensitive).
6. Matching comments are checked against the `processed_comments` table for deduplication and the `opt_outs` table for compliance.
7. For new, valid matches, a DM is dispatched using the cascading strategy.

### Spintax Template Processing

Lyvora supports spin syntax for message variation:

```
{Hello|Hi|Hey|What's up} {username}! {Thanks for|Appreciate you} commenting on my {post|reel|content}. {Here's|Check out} the {free guide|resource|download}: {link}
```

At send time, one random option is chosen from each `{option1|option2|option3}` group. The `{username}` placeholder is substituted with the commenter's actual Instagram handle.

### Session Cookie Format

Lyvora accepts the standard cookie export JSON format from browser extensions like Cookie-Editor:

```json
[
  {
    "name": "sessionid",
    "value": "IGS...",
    "domain": ".instagram.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "None"
  }
]
```

The backend normalizes cookie keys (strips `expirationDate`, renames `sameSite` values) and writes them to `user_data/{username}/storage_state.json` in Playwright's expected format.

### Browser Automation Safety

The Playwright engine is configured for organic-looking behavior:
- **Randomized delays** between actions (45-120 seconds between DMs)
- **Human-like typing** with per-character delays
- **`domcontentloaded` wait states** instead of `networkidle` (avoids timeouts from heavy media)
- **Auto-recovery** on timeouts (keeps account status as "connected" rather than immediately marking invalid)
- **Double-thread prevention** (API checks if a worker is already running before starting another)
- **Session persistence** via Playwright's persistent browser context (no re-login needed)

---

## Telegram Automation Deep Dive

### Bot Registration Flow

1. User provides a bot token (obtained from Telegram's @BotFather).
2. Backend calls `getMe` on the Telegram Bot API to verify the token and retrieve bot username/name.
3. The token is stored in `tg_bot_configs` (with a stable hash for identification).
4. `getUpdates`/channel sync discovers channels where the bot has admin permissions.
5. Channels are stored in `tg_channels` with chat_id, title, type, and member count.

### Scheduled Post Execution

The Telegram service runs as a background async loop that:
1. Polls `tg_scheduled_posts` for posts where `scheduled_at <= now()` and `status = 'pending'`.
2. Sends the content to the target channel via the bot's `sendMessage` API.
3. Updates the post status to `sent` and records the Telegram `message_id`.
4. For recurring posts, calculates the next scheduled time using the `recurrence_rule` and creates a new pending entry.
5. All sent posts are logged in `tg_post_logs`.

### Auto-Moderation Rules

Moderation rules are defined per channel with a JSON config:

```json
{
  "rule_type": "keyword_filter",
  "config": {
    "keywords": ["spam", "scam", "buy followers"],
    "action": "delete",
    "notify_admin": true
  }
}
```

Supported rule types:
- **keyword_filter** - Delete messages containing specified keywords
- **spam_filter** - Detect and remove spam patterns (repeated messages, excessive links)
- **link_filter** - Block messages containing URLs
- **custom** - User-defined regex patterns

The moderation service processes incoming messages via the bot's `getUpdates` polling and applies matching rules.

---

## Frontend Pages & Components

| # | Component | File | Purpose |
|---|-----------|------|---------|
| 1 | **LandingPage** | `LandingPage.jsx` | Public homepage showcasing Instagram + Telegram features, Beta pricing, FAQ |
| 2 | **AuthPage** | `AuthPage.jsx` | Split-screen login/register with password strength validation |
| 3 | **Dashboard** | `Dashboard.jsx` | Real-time bot status, sent/failed/pending counts, live log stream |
| 4 | **Accounts** | `Accounts.jsx` | Add/remove Instagram accounts, upload cookies, check status |
| 5 | **Targets** | `Targets.jsx` | Manage DM target queue, bulk CSV upload, status filters |
| 6 | **Messages** | `Messages.jsx` | Create/edit/toggle spintax message templates |
| 7 | **CommentTriggers** | `CommentTriggers.jsx` | Add monitored post URLs, set keywords, view processing history |
| 8 | **TelegramPanel** | `TelegramPanel.jsx` | Container with 3 sub-tabs: Bots, Schedule, Moderation |
| 9 | **TgBots** | `TgBots.jsx` | Add bot tokens, view bot info, sync/refresh channels |
| 10 | **TgSchedule** | `TgSchedule.jsx` | Schedule posts with date/time/timezone, manage queue |
| 11 | **TgModeration** | `TgModeration.jsx` | Create/toggle/delete auto-moderation rules per channel |
| 12 | **Settings** | `Settings.jsx` | DM limits, delays, working hours, opt-out keywords, API mode toggle |
| 13 | **AdminPanel** | `AdminPanel.jsx` | User management, system stats, global bot start/stop |
| 14 | **SaaSWorkspace** | `SaaSWorkspace.jsx` | Workspace creation, member management, plan info |

### Navigation Structure

```
Sidebar (Desktop) / Hamburger Menu (Mobile)
├── Dashboard
├── Instagram Section
│   ├── Accounts
│   ├── Targets
│   ├── Messages
│   └── Comment Triggers
├── Telegram Section
│   └── Telegram (with sub-tabs: Bots | Schedule | Moderation)
├── Settings
├── Admin Panel (admin users only)
└── User Menu
    ├── Admin badge (if admin)
    └── Logout
```

### Frontend API Client

All API calls go through `frontend/src/api.js` which:
- Reads `VITE_API_URL` from environment for the backend base URL
- Automatically injects the JWT token from `localStorage` into `Authorization` headers
- Exports helper functions: `getToken()`, `getUser()`, `logout()`
- Handles 401 responses by clearing stored auth and redirecting to login

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **Git**
- A Chromium-compatible browser (Playwright downloads its own)

### 1. Clone the Repository

```bash
git clone https://github.com/NLR-2007/insta-auto-dm-bot-nlr.git
cd insta-auto-dm-bot-nlr
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Install Playwright browsers
playwright install chromium

# Start the backend server
python -m uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. FastAPI auto-docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 4. First-Time Setup

1. Open `http://localhost:5173` in your browser.
2. Click "Start Free Beta" or "Sign In" to reach the auth page.
3. Register a new account (username, email, password).
4. **Connect Instagram:**
   - Go to the **Accounts** tab.
   - Add your Instagram username.
   - Export cookies from your browser using the Cookie-Editor extension.
   - Upload the cookies JSON file.
   - Click "Check Login" to verify the session.
5. **Set up a Comment Trigger:**
   - Go to the **Messages** tab and create a template (supports spintax).
   - Go to the **Comment Triggers** tab.
   - Add a Reel/post URL, set the trigger keyword (e.g., "SEND"), and select your template.
6. **Start the Bot:**
   - Go to the **Dashboard** tab.
   - Click "Start Bot" to begin monitoring.
   - Watch real-time logs as comments are detected and DMs are sent.
7. **Connect Telegram (optional):**
   - Go to the **Telegram** tab → **Bots** sub-tab.
   - Add your Telegram bot token (from @BotFather).
   - Refresh channels to discover where your bot is admin.
   - Switch to **Schedule** to queue posts, or **Moderation** to set up auto-rules.
   - Start the Telegram service from the control panel.

---

## Configuration Reference

### Backend Environment Variables (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./insta_automate.db` | Database connection string. Supports SQLite and MySQL (`mysql+mysqlconnector://user:pass@host:port/db`). |
| `DAILY_DM_LIMIT` | `30` | Maximum DMs per day per account. |
| `MIN_DELAY_SECONDS` | `45` | Minimum random delay between DM sends. |
| `MAX_DELAY_SECONDS` | `120` | Maximum random delay between DM sends. |
| `HEADLESS` | `false` | Run Playwright browser in headless mode. Instagram may block headless; `false` recommended for development. |
| `USER_DATA_DIR` | `./user_data` | Directory for storing Playwright session data per account. |
| `API_SECRET_KEY` | `insta-dm-secret-key-12345` | JWT signing secret. **Must be changed in production.** |
| `ENCRYPTION_KEY` | *(empty)* | Fernet key for encrypting Meta API secrets. Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `META_APP_SECRET` | *(empty)* | Meta app secret for webhook signature verification (optional until official Meta mode). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | JWT token expiry duration. |
| `FRONTEND_ORIGINS` | `http://localhost:5173,...` | Comma-separated CORS allowed origins. |
| `ENVIRONMENT` | `development` | Set to `production` to enable strict config validation. |
| `DEFAULT_PLAN` | `starter` | Default SaaS plan for new workspaces. |
| `BILLING_MODE` | `mock` | Billing provider. Currently `mock` only (Stripe scaffolded). |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL. |

### Runtime Settings (via Settings UI or API)

These are stored in the `settings` database table and configurable through the Settings page:

| Key | Default | Description |
|-----|---------|-------------|
| `daily_limit` | `30` | DM limit per day (overrides env var at runtime) |
| `min_delay` | `45` | Minimum delay between sends (seconds) |
| `max_delay` | `120` | Maximum delay between sends (seconds) |
| `working_hours_start` | `08:00` | Start of allowed automation window |
| `working_hours_end` | `22:00` | End of allowed automation window |
| `status` | `stopped` | Current bot status (running/stopped) |
| `api_mode` | `sandbox` | `sandbox` (Playwright) or `official` (Meta Graph API) |
| `opt_out_keywords` | `stop, unsubscribe, optout, stopdm` | Comma-separated blocklist trigger words |
| `consent_enforce` | `true` | Require consent (comment trigger) before sending DMs |
| `meta_page_access_token` | *(empty)* | Meta Page Access Token (for official API mode) |
| `meta_verify_token` | *(empty)* | Meta webhook verification token |

---

## Security & Compliance

### Passwordless Design

Lyvora is built around a core security principle: **never handle Instagram passwords**.

- Users authenticate Instagram via exported browser session cookies.
- Cookies are stored locally in `user_data/{username}/storage_state.json`.
- No password fields exist in the `accounts` database table for active use.
- Session cookies are injected into Playwright's persistent browser context.

### Opt-Out Compliance

The platform enforces consent-first outreach:

1. **Trigger-based only:** DMs are only sent when a user actively comments a target keyword on a monitored post. This is explicit opt-in behavior.
2. **Blocklist enforcement:** If a user replies with any configured opt-out keyword ("STOP", "UNSUBSCRIBE", etc.), they are added to the `opt_outs` table and never messaged again.
3. **Deduplication:** The `processed_comments` table prevents re-messaging the same user for the same post.
4. **Rate limiting:** Daily DM caps and randomized delays prevent aggressive outreach patterns.

### Data Encryption

- JWT tokens are signed with a configurable secret key (`API_SECRET_KEY`).
- User passwords are hashed with bcrypt via passlib.
- Meta API secrets (page access tokens, verify tokens) are encrypted with Fernet symmetric encryption (`ENCRYPTION_KEY`).
- Bot token hashes are stored for identification without exposing raw tokens in API responses.

### Production Hardening

When `ENVIRONMENT=production`, the backend enforces:
- `API_SECRET_KEY` must not be the default value.
- `ENCRYPTION_KEY` must be set.
- Wildcard CORS (`*`) is not allowed.

### Legal Framework Alignment

Lyvora is designed to align with:
- **GDPR** (EU data protection)
- **CCPA** (California consumer privacy)
- **CAN-SPAM Act** (commercial messaging)
- **Instagram Terms of Service** (organic browser simulation, not API abuse)

See [COMPLIANCE.md](COMPLIANCE.md) for the full compliance framework.

---

## SaaS Architecture

Lyvora includes foundational SaaS primitives for multi-tenant operation:

### Workspace Model

- Each user gets a default workspace on registration.
- Workspaces have a `plan_slug` (trial, starter, pro, agency) that determines limits.
- All resources (accounts, templates, bots, rules) are scoped to a workspace.
- Members can have roles: `owner`, `admin`, `member`, `viewer`.

### Plan Limits

| Plan | Accounts | DM Limit | Telegram Bots | Campaigns |
|------|----------|----------|---------------|-----------|
| Trial | 1 | 10/day | 1 | 1 |
| Starter | 2 | 30/day | 2 | 3 |
| Pro | 5 | Unlimited | 5 | 10 |
| Agency | Unlimited | Unlimited | Unlimited | Unlimited |

### Automation Runners

The platform supports both local and cloud-based automation runners:
- **Local runner:** Runs on the creator's own machine. Runner tokens authenticate via `Authorization: Bearer ggr_...`.
- **Cloud runner:** (Planned) Hosted execution for Pro/Agency plans.
- Runner heartbeat endpoint tracks last-seen status.

### Current SaaS Limitations

- Workspace switching UI is not complete.
- Stripe integration is scaffolded as mock billing only.
- Alembic migrations need to replace the compatibility helper.
- See [README_SAAS.md](README_SAAS.md) for full details.

---

## Deployment

### Frontend (Vercel)

The React frontend is deployed as a static site on Vercel:

```bash
cd frontend
npm run build    # Outputs to dist/
# Deploy dist/ to Vercel, Netlify, or any static host
```

Set the `VITE_API_URL` environment variable to your production backend URL before building.

### Backend (VPS / Local Machine)

```bash
# Production server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# With auto-reload for development
python -m uvicorn backend.main:app --reload --port 8000
```

For public exposure during development, you can use ngrok:

```bash
ngrok http 8000
```

### Database Options

- **SQLite** (default): Zero-config, file-based. Good for single-user and development.
- **MySQL**: Set `DATABASE_URL=mysql+mysqlconnector://user:pass@host:port/dbname` for production multi-user deployments.

### Docker (Community)

No official Dockerfile is provided yet. A typical setup would be:
1. Python 3.10+ image with Playwright and Chromium installed.
2. Frontend built as static files served via nginx or included in the Python server.
3. SQLite volume mount or MySQL connection string.

---

## Development by NLR Group of Companies

Lyvora is developed and maintained by **NLR Group of Companies**.

- Website: [nlrgroupofcompany.in](https://nlrgroupofcompany.in)
- Live Dashboard: [insta-auto-dm-bot-nlr.vercel.app](https://insta-auto-dm-bot-nlr.vercel.app)
- Repository: [github.com/NLR-2007/insta-auto-dm-bot-nlr](https://github.com/NLR-2007/insta-auto-dm-bot-nlr)

---

<p align="center">
  <strong>&copy; 2024-2026 Lyvora. All rights reserved.</strong><br />
  Developed with excellence by <strong>NLR GROUP OF COMPANIES</strong>
</p>

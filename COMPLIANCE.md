# Lyvora Compliance & Platform Safety Framework

Lyvora is a premium Instagram Direct Message (DM) and engagement automation system designed specifically for the India-first creator and education market. 

To ensure absolute safety, platform stability, and alignment with digital privacy laws (such as GDPR, CCPA, and Meta's Platform Policies), Lyvora operates under a strict **Dual-Engine Architecture** and enforces **Consent-First outreach**.

---

## ⚖️ Dual-Engine Architecture

To reconcile different usage levels, Lyvora supports two distinct operating modes:

### 1. Enterprise Mode (Official Meta API Integration) - Recommended
* **Mechanism**: Operates using Meta's official **Instagram Graph API** and **Messenger Platform**.
* **Authentication**: OAuth 2.0 connection through Facebook Login. No password sharing or browser cookies required.
* **Webhook Listeners**: Receives real-time comments and mentions officially pushed from Meta servers.
* **Deliverability**: 100% compliant, sanctioned, and carries zero risk of account ban or action blocks.
* **Audience**: Recommended for businesses, public figures, and large creator accounts seeking permanent, scaleable automation.

### 2. Developer Sandbox Mode (Playwright Automation)
* **Mechanism**: Simulates human browser navigation headlessly on the user's own machine using their browser-exported session state (cookies JSON).
* **Scope**: Designed as an indie developer sandbox and testing tool for personal use.
* **Authentication**: Passwordless security via token/session imports. Passwords are never collected or stored.
* **Safety Rules**: Utilizes anti-ban human simulation features (randomized delays between 45–120 seconds, organic typing actions, and restriction of active execution to working hours).

---

## 🔒 Legal & Regulatory Alignment

Lyvora is engineered to remain compliant with global anti-spam regulations (CAN-SPAM, TCPA, and GDPR/CCPA):

### 1. Explicit Consent Opt-In (Comment Triggers)
Automated DMs are strictly dispatched **only** when a recipient performs an explicit action (such as leaving a comment with a specific keyword like "JAVA" or "INFO"). 
* This action constitutes a user-initiated request for specific resources (e.g., download links, curriculum details).
* Sending a direct, single response to a user-initiated trigger is legally categorized as a transaction/relational reply rather than unsolicited bulk spam.
* **Lyvora prohibits cold spamming.** The software does not permit cold blasting of random user lists.

### 2. Immediate Opt-Out Support (Unsubscribe Blocklist)
Lyvora includes an automated **Opt-Out Blocklist**:
* Users can configure unsubscribe keywords (e.g., `STOP`, `UNSUBSCRIBE`, `OPTOUT`).
* If a recipient comments or replies to a DM with any of these keywords, the system immediately adds their username to the database blocklist.
* Once blocklisted, the database filters out that username. Lyvora's outbound message dispatchers will automatically abort any outreach attempt to a blocklisted user.

---

## 🛡️ Platform Integrity & Anti-Spam Guardrails

To protect creators and the integrity of Instagram, Lyvora enforces strict boundary controls:

| Feature | Playwright Sandbox Mode | Official Meta API Mode |
|---|---|---|
| **Daily Message Limit** | Capped at 20–40 DMs per day | Guided by Meta rate-limits (250+ per hour) |
| **Outreach Delay** | Random 45–120s spacer | Immediate (via Meta Webhooks) |
| **Opt-Out Checking** | Mandated local DB lookup | Mandated local DB lookup |
| **Keywords Enforced** | Yes (Consent-based only) | Yes (Consent-based only) |
| **Hours of Operation** | Restricts actions to day times | 24/7 compliant webhooks |

---

## 📋 Implementation Checklist for Creators
To ensure you stay compliant:
1. Ensure your message template contains a clear way to opt out (e.g., *"Reply STOP to opt out of automated links"*).
2. Maintain your Daily Message limits below 30 in the Settings dashboard.
3. If running Sandbox Mode, configure working hours to match your timezone to avoid suspicious midnight automation patterns.
4. Upgrade to **Official Meta API Mode** for full business security once your page receives high volume traffic.

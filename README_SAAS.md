# GramGlide SaaS Foundation

This branch begins converting the local Insta-Automate project into a SaaS-ready creator automation platform.

## Product Positioning

GramGlide should support two transparent modes:

1. **Official API Mode**  
   Use Meta/Instagram official APIs wherever a creator or business has access.

2. **Creator-Owned Runner Mode**  
   For creators who cannot get Meta API access, the SaaS dashboard manages configuration while a user-controlled local runner can perform authorized automation. This keeps the highest-risk session material closer to the creator instead of making the cloud app the single holder of every account session.

Do not position the product as a spam bot, ban bypass, CAPTCHA bypass, stealth scraper, or fake official Meta partner.

## Added SaaS Primitives

- Workspaces and workspace memberships.
- Workspace roles: `owner`, `admin`, `member`, `viewer`.
- Subscription records with mock billing mode.
- Plan limits for `trial`, `starter`, `pro`, and `agency`.
- Campaign records for SaaS-style workflows.
- Local automation runner records and one-time runner tokens.
- Runner heartbeat endpoint.
- Audit log table.
- Secret encryption helpers.
- Masked settings responses for Meta secrets.
- Meta webhook signature verification.
- Environment-driven CORS.
- Production config validation.

## Important Environment Variables

```env
ENVIRONMENT=development
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
API_SECRET_KEY=replace-with-strong-secret
ENCRYPTION_KEY=replace-with-fernet-key
META_APP_SECRET=optional-until-official-meta-mode
BILLING_MODE=mock
DEFAULT_PLAN=starter
```

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## New API Endpoints

- `GET /api/me`
- `GET /api/plans`
- `GET /api/billing/subscription`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `PATCH /api/campaigns/{campaign_id}/status`
- `GET /api/runners`
- `POST /api/runners`
- `POST /api/runners/heartbeat`

Runner heartbeat uses:

```http
Authorization: Bearer ggr_...
```

## Current Limitations

- This is an MVP foundation, not a complete paid SaaS launch.
- Alembic migrations still need to replace the temporary compatibility migration helper.
- Stripe is scaffolded as mock billing only.
- Workspace switching in the frontend is not complete yet.
- The existing Instagram worker is still mostly account/user based, now partially workspace-aware.
- Official Meta webhooks still need deeper page/account-to-workspace mapping.
- Existing plaintext secrets are not automatically re-encrypted until updated.

## Next Build Steps

1. Add Alembic migrations.
2. Add workspace switcher and invite/member management.
3. Add Stripe checkout and webhook processing.
4. Build the local runner app/CLI.
5. Move Instagram session cookies fully into runner-owned storage where possible.
6. Add tests for tenant isolation, plan limits, encrypted settings, and webhook signatures.

# Super Warrior 30 LMS — Production Environment Security Checklist

**Audit Scope:** Verification of all environment variables, runtime configurations, server-side isolation, and secret rotation status.  
**Strict Policy:** No actual secret values are displayed in this document.

---

## 1. Environment Variable Audit & Rotation Matrix

| Variable | Required? | Server-Only? | Purpose | Rotation Status | Production State |
|---|---|---|---|---|---|
| `DATABASE_URL` | **YES** | **YES** | Primary Neon PostgreSQL connection string (with PgBouncer connection pooling) | **SECRET ROTATION REQUIRED** if shared across public repos | Configured in `.env` / Cloud |
| `DIRECT_URL` | **YES** | **YES** | Direct connection to Neon PostgreSQL (used for schema migrations and DDL) | **SECRET ROTATION REQUIRED** if shared across public repos | Configured in `.env` / Cloud |
| `JWT_SECRET_KEY` | **YES** | **YES** | HMAC-SHA256 signing secret for session tokens and OTP generation (minimum 32, recommended 64 characters) | **SECRET ROTATION REQUIRED** if using default development seed | Configured in `.env` / Cloud |
| `ENCRYPTION_SECRET` | **YES** | **YES** | AES-256-GCM symmetric key for encrypting sensitive payment gateway keys and MFA TOTP secrets | **SECRET ROTATION REQUIRED** if using default development seed | Configured in `.env` / Cloud |
| `NEXT_PUBLIC_APP_URL` | **YES** | **NO** (Client Public) | Authoritative production origin URL (`https://superwarrior30.com`) | Rotation N/A | Configured |
| `NEXT_PUBLIC_APP_NAME`| **NO** | **NO** (Client Public) | Application display name ("Super Warrior 30") | Rotation N/A | Configured |
| `RAZORPAY_KEY_ID` | **YES** | **NO** (Client Public) | Razorpay public key for checkout UI initialization | Rotation N/A | Configured |
| `RAZORPAY_KEY_SECRET`| **YES** | **YES** | Razorpay private key for order creation and HMAC verification | **SECRET ROTATION REQUIRED** periodically | Configured |
| `RAZORPAY_WEBHOOK_SECRET`| **YES** | **YES** | Webhook signature HMAC validation secret | **SECRET ROTATION REQUIRED** periodically | Configured |
| `UPSTASH_REDIS_REST_URL`| **RECOMMENDED** | **YES** | Distributed rate-limiting REST endpoint (prevents distributed brute-force) | Rotation N/A | Optional / Fallback to memory |
| `UPSTASH_REDIS_REST_TOKEN`| **RECOMMENDED** | **YES** | Upstash Redis authentication token | **SECRET ROTATION REQUIRED** periodically | Optional / Fallback to memory |
| `BUNNY_API_KEY` | **YES** | **YES** | Bunny.net Video & Storage account administration API key | **SECRET ROTATION REQUIRED** periodically | Configured |
| `BUNNY_STORAGE_ZONE` | **YES** | **YES** | Bunny.net Storage Zone identifier | Rotation N/A | Configured |
| `BUNNY_STORAGE_PASSWORD` | **YES** | **YES** | Bunny.net Storage Zone Access Key (Read/Write) | **SECRET ROTATION REQUIRED** periodically | Configured |
| `BUNNY_CDN_HOSTNAME` | **YES** | **NO** (Client Public) | Bunny.net CDN edge delivery hostname | Rotation N/A | Configured |
| `BUNNY_STREAM_LIBRARY_ID` | **YES** | **YES** | Bunny Stream Video Library ID | Rotation N/A | Configured |
| `BUNNY_STREAM_API_KEY` | **YES** | **YES** | Bunny Stream Video Management API Key | **SECRET ROTATION REQUIRED** periodically | Configured |
| `RESEND_API_KEY` | **RECOMMENDED** | **YES** | Resend API key for transactional emails and OTP dispatch | **SECRET ROTATION REQUIRED** periodically | Configured |
| `EMAIL_FROM` | **RECOMMENDED** | **YES** | Authoritative sender address (`security@superwarrior30.com`) | Rotation N/A | Configured |
| `ADMIN_INIT_SECRET` | **CONDITIONAL** | **YES** | Secret key for staging/dev database initialization | **MUST BE UNSET IN PRODUCTION** (endpoint is 404 in prod) | Development only |

---

## 2. Secrets Exposure & Tracking Audit

- **Tracked `.gitignore` Status:** `.env*` files are strictly ignored in git (`!.env.example` is whitelisted).
- **Public Key Isolation:** All sensitive keys (`RAZORPAY_KEY_SECRET`, `JWT_SECRET_KEY`, `ENCRYPTION_SECRET`, `BUNNY_API_KEY`, `BUNNY_STORAGE_PASSWORD`) are never exposed via `NEXT_PUBLIC_` prefixes.
- **Fail-Closed Verification:** `src/lib/auth/session.ts`, `src/lib/otp/service.ts`, and `src/lib/crypto/encryption.ts` fail closed with fatal errors if production secrets are missing or under 32 characters in length.

---

## 3. Mandatory Production Actions Before Live Traffic

1. **Rotate All Live Credentials:** Before launching to production, regenerate `JWT_SECRET_KEY` and `ENCRYPTION_SECRET` using `openssl rand -hex 32`.
2. **Provision Distributed Rate Limiter:** Connect Upstash Redis via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to ensure rate limits are strictly synchronized across serverless instances.
3. **Verify Webhook Endpoint in Razorpay Dashboard:** Ensure the webhook URL is configured to `https://superwarrior30.com/api/webhooks/razorpay` with active events `payment.captured` and `payment.failed`.

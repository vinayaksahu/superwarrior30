# Super Warrior 30 LMS — Production Manual Actions Guide

This document identifies the exact configuration boundaries for production deployment. It separates what has already been hardened and completed automatically in the codebase from the external cloud dashboard configurations that require human administrative credentials.

---

## A. COMPLETED AUTOMATICALLY

The following 18 critical security controls are completely implemented, integrated, and verified in the application code:

1. **MFA End-to-End Enforcement:**
   - Pre-session TOTP verification gate halts session cookie issuance until code is validated.
   - Atomic challenge tracking (`mfa_chal_${challengeId}`) with single-use consumption.
   - Brute-force lockout (locked permanently on 5 failed attempts per challenge).
   - Emergency recovery codes stored as SHA-256 hashes and burned on single use.
   - Mobile authenticator clock drift tolerance (±30 seconds).
   - Dedicated 3-step authentication UI (`/login`).

2. **Authentication & Session Security:**
   - Single-device concurrency guard with token version invalidation (`tokenVersion`).
   - Secure HTTP-only cookies (`SameSite=Lax`, `Secure`, `HttpOnly`, `Path=/`).
   - Password hashing via PBKDF2 with 100,000 iterations and per-user cryptographic salts.

3. **Role-Based Access Control (RBAC):**
   - Strictly enforced via `requireRole`, `requireAdmin`, and `isSuperAdminUser`.
   - Admin server actions and API routes completely reject student sessions.
   - Guest checkout explicitly blocks taking over administrative accounts.

4. **IDOR & BOLA Defense:**
   - Order viewing, verification, and payment completion scoped strictly to `userId: user.id`.
   - Course lesson progress updates locked to authenticated student user ID.
   - Referral codes and affiliate records protected from self-referral or unauthorized lookup.

5. **Payment Gateway & Webhook Hardening:**
   - Missing webhook secret fails closed immediately with HTTP 500.
   - 30-minute stale event window protection against replay attacks.
   - Timing-safe HMAC-SHA256 signature verification via `crypto.timingSafeEqual`.
   - Exact paise reconciliation prevents underpayment / price-tampering exploits.
   - Transactional database idempotency prevents duplicate order fulfillment.

6. **Financial Ledger & Anti-Tampering:**
   - Multi-row concurrency locks on wallet balance mutations.
   - Strict non-negative constraints on available and pending balances.
   - Double-spend verification before processing withdrawal requests.

7. **MLM / Referral Protection:**
   - Self-referral prohibition (`currentUser.id === referrerUser.id`).
   - Circular lineage detection preventing loops in affiliate tree.
   - Server-side recalculation of commission tiers; zero client influence over payout percentages.

8. **Course & Media Access Security:**
   - Video streaming gated behind signed token URLs.
   - Lesson PDF route (`/api/lessons/[lessonId]/pdf`) requires active course enrollment; non-enrolled students are rejected with HTTP 403.
   - Free previews are programmatically sliced to allowed preview pages via `pdf-lib`.

9. **Distributed Rate Limiting:**
   - Dual-tier rate limiter supporting Upstash Redis in production with automatic in-memory sliding window fallback.
   - Security-critical endpoints (`auth:*`, `mfa:*`, `otp:*`, `wallet:*`, `checkout:*`, `admin:*`, `webhook:*`) tracked separately.

10. **Security Headers & Content Security Policy (CSP):**
    - Production CSP configured in `next.config.ts` supporting Next.js App Router, Razorpay, BunnyCDN, and YouTube trade proof embeds.
    - HSTS (`max-age=63072000; includeSubDomains; preload`).
    - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

11. **CORS & CSRF Security:**
    - Next.js Server Actions automatically validate `Origin` and `Host` headers.
    - Session cookies restricted to origin with `SameSite=Lax`.

12. **Input Validation:**
    - Strict validation across all APIs and Server Actions.
    - Lead exports sanitize all cell strings to neutralize CSV / Excel Formula Injection (`=`, `+`, `-`, `@`, `\t`, `\r`).

13. **File Upload Security:**
    - Magic-byte inspection validates binary headers (`%PDF`, PNG, JPEG, WebP).
    - Blacklist rejects executable, script, and HTML file extensions.
    - File storage paths use sanitized keys and random UUIDs.

14. **Secret Exposure Safeguards:**
    - `.gitignore` configured to ignore `.env*` while preserving `.env.example`.
    - Git repository verified: zero secrets committed in version control.
    - Diagnostic endpoints mask all API keys and credentials (`maskSecret`).

15. **Error Leakage Prevention:**
    - Unhandled exceptions return generic client messages without exposing internal stack traces or database connection strings.

16. **Database Schema Readiness:**
    - `prisma/schema.prisma` definitions intact.
    - Dynamic schema synchronization (`ensureDatabaseSchemaSync()`) ensures non-breaking zero-downtime boots.

17. **Production Build Compilation:**
    - Next.js production build passes with 0 errors across all 38 App Router routes.

18. **Automated Security Test Suite:**
    - 57 automated security test assertions executed and verified (100% pass rate).

---

## B. REQUIRES MANUAL CONFIGURATION

The following manual actions require credentials from your external third-party cloud accounts. These cannot and must not be simulated or auto-generated by the codebase.

### 1. Web Application Secrets (Vercel / Hosting Provider)

#### Action 1.1: Set JWT Secret Key
- **Service:** Vercel (or production hosting environment)
- **Setting:** Environment Variables
- **Variable Name:** `JWT_SECRET_KEY`
- **Value Required:** A cryptographically secure random string of at least 64 characters. (Generate locally via terminal: `openssl rand -base64 48`)
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes (Redeploy after setting)
- **Verification:** Log in to the application; inspect the `sw30_session` cookie to ensure sessions are signed properly.

#### Action 1.2: Set Data Encryption Secret
- **Service:** Vercel (or production hosting environment)
- **Setting:** Environment Variables
- **Variable Name:** `ENCRYPTION_SECRET`
- **Value Required:** A 64-character hexadecimal string representing 32 bytes of AES-256-GCM key material. (Generate locally via terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes (Redeploy after setting)
- **Verification:** Enroll in MFA or save bank details; verify database rows store encrypted values prefixed with `aes256:`.

---

## 2. Database Connection (Neon / PostgreSQL)

#### Action 2.1: Production Database Connection String
- **Service:** Neon Console / Managed PostgreSQL
- **Setting:** Connection Details
- **Variable Name:** `DATABASE_URL`
- **Value Required:** Pooled PostgreSQL connection string with SSL mode enabled (e.g., `postgresql://[user]:[password]@[host]-pooler.neon.tech/[dbname]?sslmode=require&pgbouncer=true`).
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes
- **Verification:** Run `npx prisma db pull` or observe successful application connection on boot.

#### Action 2.2: Direct Database Connection String
- **Service:** Neon Console / Managed PostgreSQL
- **Setting:** Direct Connection Details (Non-pooled)
- **Variable Name:** `DIRECT_URL`
- **Value Required:** Direct PostgreSQL connection string without PgBouncer (used for schema migrations and DDL operations).
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes
- **Verification:** Run `npx prisma migrate deploy` locally pointing to `DIRECT_URL`.

---

## 3. Payment Gateway & Webhook (Razorpay)

#### Action 3.1: Razorpay API Credentials
- **Service:** Razorpay Dashboard (`https://dashboard.razorpay.com`)
- **Setting:** API Keys (Live Mode)
- **Variable Names:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- **Value Required:** Live Key ID (`rzp_live_...`) and Key Secret generated from Razorpay Dashboard -> Settings -> API Keys.
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes
- **Verification:** Create a live test order from the checkout page; verify Razorpay modal loads with correct merchant details.

#### Action 3.2: Configure Razorpay Webhook
- **Service:** Razorpay Dashboard
- **Setting:** Webhooks Configuration
- **Variable Name:** `RAZORPAY_WEBHOOK_SECRET`
- **Value Required:** A secure custom string (at least 32 characters) chosen by the administrator.
- **Where to Enter:**
  1. In Razorpay Dashboard -> Settings -> Webhooks -> Add New Webhook:
     - **Webhook URL:** `https://superwarrior30.com/api/webhooks/razorpay`
     - **Secret:** Enter your chosen webhook secret.
     - **Active Events:** Check `payment.captured`, `payment.failed`, and `order.paid`.
  2. In Vercel Project Settings -> Environment Variables:
     - Add `RAZORPAY_WEBHOOK_SECRET` with the exact same secret string.
- **Deployment Required:** Yes
- **Verification:** In Razorpay Dashboard, send a test webhook event to `https://superwarrior30.com/api/webhooks/razorpay`; verify response returns HTTP 200 OK.

---

## 4. Distributed Rate Limiting (Upstash Redis)

#### Action 4.1: Upstash Redis REST Credentials
- **Service:** Upstash Console (`https://console.upstash.com`)
- **Setting:** Redis Database REST API Details
- **Variable Names:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Value Required:**
  - `UPSTASH_REDIS_REST_URL`: The HTTPS REST endpoint provided in Upstash database overview.
  - `UPSTASH_REDIS_REST_TOKEN`: The bearer access token provided in Upstash database overview.
- **Where to Enter:** Vercel Project Settings -> Environment Variables -> Select `Production`
- **Deployment Required:** Yes
- **Verification:** Check application server logs on boot; verify `Distributed rate limiting: ACTIVE (Upstash Redis)` is reported.

---

## C. OPTIONAL

The following configurations provide additional functionality but are not strictly required for core security:

1. **Transactional Email Delivery (Resend):**
   - Variables: `RESEND_API_KEY`, `EMAIL_FROM`
   - Purpose: Sends automated password reset links and login OTP emails. If not provided, OTP and reset flows log to server console for administrative retrieval.
2. **Media CDN & Video Streaming (Bunny.net):**
   - Variables: `BUNNY_API_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_CDN_HOSTNAME`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`
   - Purpose: Direct-to-CDN encrypted video streaming and PDF document delivery.
3. **Strict Fail-Closed Rate Limiting:**
   - Variable: `FAIL_CLOSED_WITHOUT_REDIS="true"`
   - Purpose: If enabled, all authentication and checkout endpoints will return HTTP 503 if Redis is unreachable rather than falling back to in-memory limiting.

---

## D. NOT REQUIRED

The following actions are **NOT required** and should be avoided:

1. **Manual SQL Table Schema Alterations:**
   - The application includes automatic runtime synchronization via `ensureDatabaseSchemaSync()` and Prisma client models.
2. **Downgrading Prisma to Version 6:**
   - `npm audit` warnings regarding `mysql2` and `deepmerge-ts` apply exclusively to the Prisma CLI development tooling and are completely absent from the PostgreSQL production runtime.
3. **Local Filesystem Permissions Setup:**
   - In serverless production environments (e.g. Vercel), files are not saved to the local container disk; media uploads go directly to Bunny CDN or Cloudflare R2 object storage.

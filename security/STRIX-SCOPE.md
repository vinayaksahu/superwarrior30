# STRIX Security Assessment Scope Document

**Target Application:** SuperWarrior30 (LMS & Mentorship Platform)  
**Repository:** [https://github.com/vinayaksahu/superwarrior30](https://github.com/vinayaksahu/superwarrior30)  
**Audit Standard:** Strix Autonomous / Source-Aware White-Box Security Assessment  
**Date:** 2026-09-04  
**Classification:** STRICTLY CONFIDENTIAL / SECURITY SENSITIVE  

---

## 1. Exact Target

* **Application Name:** SuperWarrior30
* **Repository Root:** `c:\Users\user\Desktop\superwarrior30`
* **Technology Stack:**
  * Framework: Next.js (App Router, Server Actions, Route Handlers)
  * UI: React 19, Tailwind CSS
  * ORM / Database: Prisma ORM, PostgreSQL
  * Media Storage & CDN: Bunny.net (Stream & Storage), Cloudflare R2 (Legacy)
  * Payment Integrations: Razorpay, Manual Transfer (UPI / Bank / Crypto)
  * Session & Auth: Custom JWT via `jose`, PBKDF2 Password Hashing, Device Binding, OTP

---

## 2. Testing Environment & Isolation

| Environment | Status | Allowed Actions | Restrictions |
|---|---|---|---|
| **Production** | **OUT OF SCOPE / PROHIBITED** | NONE | Never send automated traffic, exploit payloads, or destructive commands. |
| **Staging** | **CONDITIONAL SCOPE** | Non-destructive read/write test verification | Use test databases only; no production credentials. |
| **Local Security Copy** | **PRIMARY TARGET** | Full Source-Aware Static / White-Box Audit, Local Simulation | Isolated test database only; no production data access. |

---

## 3. Allowed Accounts & Testing Personas

* **USER A (Student Alpha):** Test student persona in isolated test environment.
* **USER B (Student Beta):** Secondary test student persona for testing authorization boundaries, cross-account access, and referral tree branching.
* **STAFF / SUPPORT:** Read-only / support administrative persona for evaluating vertical privilege escalation.
* **SUPER ADMIN (Admin Control):** Root administrative persona restricted exclusively to local testing sandbox.

---

## 4. Allowed Endpoints & Testing Modules

* **Public & Authentication Endpoints:**
  * `/login`, `/register`, `/forgot-password`, `/reset-password`, `/adminlogin`, `/superadminlogin`
  * Route Handlers: `/api/auth/*`, `/api/coupons/*`, `/api/referrals/*`, `/api/broker/*`
* **Student LMS & Learning Endpoints:**
  * `/dashboard`, `/dashboard/courses`, `/dashboard/wallet`, `/dashboard/referrals`
  * `/learn/[courseSlug]`, `/learn/[courseSlug]/[lessonId]`
  * Route Handlers: `/api/lessons/[lessonId]/pdf`, `/api/lessons/[lessonId]/progress`
* **Checkout & Order Processing:**
  * `/checkout/[courseId]`
  * Route Handlers: `/api/orders/*`, `/api/webhooks/razorpay`
* **Administrative Interfaces (Source Review):**
  * `/admin/*`
  * Server Actions: `admin.actions.ts`, `course.actions.ts`, `referral.actions.ts`, `wallet.actions.ts`, `payment-method.actions.ts`
* **Media & Storage Handlers:**
  * `/api/upload`, `/api/admin/media/*`, `/api/bunny/*`

---

## 5. Excluded Endpoints & Prohibited Actions

* **Prohibited Actions:**
  * Attacking, scanning, or probing live production endpoints (`superwarrior30.com`).
  * Modifying, altering, or executing migrations against production databases.
  * Executing `prisma migrate reset`, `prisma db push --force-reset`, or destructive DDL against any active database.
  * Generating real monetary transactions, live UPI payments, live Razorpay charges, or real cryptocurrency transfers.
  * Sending bulk emails or spamming transactional mailers.
  * Disabling application security controls or hardcoding backdoors.
  * Committing production environment secrets or API keys into git.

---

## 6. Database Safety Rules

1. All database testing must occur strictly against dedicated local/test databases.
2. Read operations (`SELECT`, `findUnique`, `findMany`) are permitted for security inspection.
3. Destructive queries (`DROP`, `TRUNCATE`, bulk `DELETE`) are strictly forbidden.
4. Concurrency testing must be strictly bounded (maximum 3-5 concurrent requests) to verify atomic transactions without inducing service denial.

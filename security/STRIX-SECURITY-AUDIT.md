# SuperWarrior30 Strix Security Audit Report

**Application:** SuperWarrior30 (LMS, Mentorship, Referral & Financial Engine)  
**Target Repository:** `vinayaksahu/superwarrior30`  
**Assessment Standard:** Strix Autonomous / Source-Aware White-Box Security Assessment  
**Date of Audit:** 2026-09-04  
**Audit Mode:** Non-Destructive Source-Aware White-Box Audit & Baseline Assessment  
**Classification:** HIGH PRIORITY / STRICTLY CONFIDENTIAL  

---

## 1. Executive Summary

A comprehensive, non-destructive security assessment was conducted on the **SuperWarrior30** codebase following the automated and source-aware inspection methodology established by the **Strix Security Framework (`usestrix/strix`)**.

During this assessment, **11 distinct security findings** were identified across authentication, authorization, financial workflow logic, file storage, API endpoints, and configuration secrets:
* **Critical Severity:** 3 findings
* **High Severity:** 4 findings
* **Medium Severity:** 3 findings
* **Low / Informational Severity:** 1 finding

**Key Risks Identified:**
1. **Critical Unauthenticated Database Initialization (`/api/init-db`):** An exposed public endpoint creates/resets the root super admin user, resets the administrative password to a default string, and returns cleartext admin credentials in its HTTP response.
2. **Critical Payment Gateway Secret Leakage:** In `src/app/checkout/[courseId]/page.tsx`, payment methods with raw API key secrets and webhook secrets are passed directly to a React Client Component, exposing private secrets in the client-side JavaScript/RSC payload.
3. **Hardcoded Fallback JWT Secret:** `src/lib/auth/session.ts` specifies a static 64-character fallback secret that enables universal offline JWT forgery if `JWT_SECRET_KEY` is not present in deployment environments.
4. **Unrestricted File Upload in `/api/upload`:** Lack of file extension and MIME whitelist validation permits the upload of HTML, SVG, or executable scripts to Bunny Storage/CDN, presenting Stored XSS and memory exhaustion risks.

---

## 2. Environment Tested

* **Repository:** `https://github.com/vinayaksahu/superwarrior30`
* **Local Branch:** `main` (commit `5ee3750`)
* **Framework:** Next.js (App Router, Server Actions, Route Handlers)
* **Runtime:** Node.js, React 19, TypeScript
* **Database Layer:** Prisma ORM with PostgreSQL
* **Target Environment Type:** Isolated Local Source Inspection / Non-Destructive Sandbox
* **Production Status:** **Zero live production systems were touched, contacted, probed, or modified.**

---

## 3. Scope & Methodology

### In-Scope Modules
* User Authentication, Password Hashing, Session Management (`jose` JWT, token versioning, device binding).
* Role-Based Access Control (RBAC) & DAL Authorization (`requireAuth`, `requireAdmin`, `requireSuperAdmin`).
* Course Purchase & Fulfillment Workflow (`order.actions.ts`, `manual-checkout`, `verify-gateway-payment`).
* Multi-Tier Referral & Commission Engine (`referral.actions.ts`, closure trees, clearance, reversals).
* Wallet & Withdrawal Financial Operations (`wallet.actions.ts`, optimistic locking, audit trails).
* Media Storage & Streaming Architecture (`bunny`, `r2`, `/api/upload`, `/api/lessons/[lessonId]/pdf`).
* Public & Admin Route Handlers (`src/app/api/*`).

### Out of Scope / Prohibited
* Live production domain (`www.superwarrior30.com`).
* Production Neon PostgreSQL database instances.
* Real payment gateway charges or monetary disbursements.
* Destructive database commands (`prisma migrate reset`, `DROP`, `TRUNCATE`).

### Assessment Methodology
1. **Static Analysis & Source Code Review:** Full manual and automated trace of data flows, authentication checkpoints, and transaction boundaries.
2. **Business Logic Verification:** Tracking state transitions across user registration, course purchase, admin approval, commission distribution, and withdrawal requests.
3. **Boundary & Concurrency Assessment:** Analyzing transaction atomicity (`prisma.$transaction`), idempotent operations, and race condition resiliency.
4. **Secret & Configuration Inspection:** Identifying fallback values, environment variable leakage, and client-side prop exposure.

---

## 4. Summary of Vulnerabilities by Severity

| ID | Vulnerability Title | Severity | CVSS v3.1 | Status |
|---|---|---|---|---|
| **VULN-01** | Unauthenticated Database Re-initialization & Admin Password Reset | **CRITICAL** | 9.8 | Unpatched |
| **VULN-02** | Payment Gateway Secret Key Leakage in Client-Side RSC Props | **CRITICAL** | 9.1 | Unpatched |
| **VULN-03** | Hardcoded JWT Fallback Secret Enabling Token Forgery | **CRITICAL** | 9.8 (if env unset) | Unpatched |
| **VULN-04** | Missing Global Next.js Route Protection Middleware (`middleware.ts`) | **HIGH** | 7.5 | Unpatched |
| **VULN-05** | Hardcoded Email Super-Admin Bypass & Revocation Immunity | **HIGH** | 8.2 | Unpatched |
| **VULN-06** | Unrestricted File Upload & Missing MIME Whitelist in `/api/upload` | **HIGH** | 7.8 | Unpatched |
| **VULN-07** | Storage Key Path Traversal in Admin Media Upload Endpoint | **HIGH** | 7.1 | Unpatched |
| **VULN-08** | Guest Checkout Referral Tree Disconnection (Commission Starvation) | **MEDIUM** | 6.5 | Unpatched |
| **VULN-09** | User Enumeration via Unauthenticated Referral Validation Endpoint | **MEDIUM** | 5.3 | Unpatched |
| **VULN-10** | Public Cache-Control Headers on Protected PDF Course Materials | **MEDIUM** | 5.9 | Unpatched |
| **VULN-11** | Unbounded External Verification Calls in Broker API | **LOW** | 4.3 | Unpatched |

---

## 5. Detailed Findings & Validation

### CRITICAL FINDINGS

#### [VULN-01] Unauthenticated Database Re-initialization & Super Admin Credential Disclosure
* **Affected File:** `src/app/api/init-db/route.ts`
* **Affected Function:** `export async function GET()`
* **Category:** Authentication Bypass / Sensitive Data Disclosure / CWE-306
* **CVSS v3.1:** 9.8 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
* **Description:**
  `GET /api/init-db` is accessible without authentication. Calling this endpoint executes raw SQL statements that create tables and enums, forces an update of the user record for `vinayaksahu3@gmail.com` to `SUPER_ADMIN`, resets its password hash to `Admin@123`, and returns cleartext credentials in the HTTP JSON response:
  ```json
  {
    "success": true,
    "adminCredentials": {
      "email": "vinayaksahu3@gmail.com",
      "password": "Admin@123"
    }
  }
  ```
* **Impact:** Any anonymous user on the internet can hit this route on deployment, overwrite the root administrative password, extract credentials, and assume full administrative ownership of the application.
* **Recommended Fix:** Delete this file or restrict access with a secret bearer token / disable in production (`if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 })`).

---

#### [VULN-02] Payment Gateway Secret Key Leakage in Client-Side RSC Props
* **Affected Files:** `src/app/checkout/[courseId]/page.tsx` (Lines 79-87), `src/server/actions/payment-method.actions.ts` (Lines 169-177)
* **Affected Functions:** `CheckoutPage`, `getSystemPaymentMethodsAction`
* **Category:** Sensitive Data Exposure / CWE-200 / Next.js Data Exposure
* **CVSS v3.1:** 9.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`)
* **Description:**
  In `CheckoutPage`, `getSystemPaymentMethodsAction(false)` fetches payment methods including `type === "GATEWAY"`. The function returns the raw `details` JSONB object, which contains `keyId`, `keySecret`, and `webhookSecret`.
  This object is passed as a React prop to `<ManualCheckoutClient paymentMethods={paymentMethods} />`. Because `ManualCheckoutClient` is a client component (`"use client"`), Next.js serializes this prop directly into the HTML / RSC Flight payload streamed to the user's browser.
* **Impact:** Any anonymous visitor to `/checkout/[courseId]` can view page source or inspect network payloads to retrieve the live payment gateway `keySecret` and `webhookSecret`. This allows attackers to issue fraudulent refunds, forge webhooks, and tamper with payments.
* **Recommended Fix:** Sanitize the payment method object in `getSystemPaymentMethodsAction` before returning it to public/client contexts, stripping `keySecret`, `webhookSecret`, and sensitive credentials.

---

#### [VULN-03] Hardcoded JWT Fallback Secret Enabling Token Forgery
* **Affected File:** `src/lib/auth/session.ts` (Line 6)
* **Affected Function:** Global constant initialization
* **Category:** Cryptographic Weakness / CWE-798
* **CVSS v3.1:** 9.8 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` when env unset)
* **Description:**
  ```typescript
  const SECRET_KEY = process.env.JWT_SECRET_KEY || "fallback_dev_secret_key_64_characters_long_min_for_hs256_algo";
  ```
  If `JWT_SECRET_KEY` is omitted, misspelled, or fails to load from the environment, the server silently signs and verifies all authentication tokens with this static fallback string.
* **Impact:** An attacker knowing this public repository code can forge a valid HS256 JWT cookie with `role: "SUPER_ADMIN"` and gain immediate root access to all student, order, and admin data.
* **Recommended Fix:** Throw an explicit runtime error on startup if `process.env.JWT_SECRET_KEY` is not defined or is shorter than 32 characters in production.

---

### HIGH FINDINGS

#### [VULN-04] Missing Global Next.js Route Protection Middleware (`middleware.ts`)
* **Affected Component:** Entire application architecture
* **Category:** Architectural Security / CWE-284
* **CVSS v3.1:** 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`)
* **Description:**
  The project does not contain a `middleware.ts` or `src/middleware.ts` file. In Next.js App Router applications, middleware acts as a centralized boundary for edge validation, session verification, and redirection.
  Without global middleware, every route handler and server page must implement individual authorization guards. Any omitted check in an API route or page component immediately results in an unauthenticated or unauthorized endpoint.
* **Recommended Fix:** Implement `src/middleware.ts` to uniformly validate session tokens for `/admin/*` and `/dashboard/*`, and set global security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).

---

#### [VULN-05] Hardcoded Administrative Email Privilege Granting & Revocation Bypass
* **Affected Files:** `src/server/dal/auth-check.ts` (Lines 7-8), `src/server/dal/auth.ts` (Lines 31-32, 147)
* **Affected Functions:** `isSuperAdminUser`, `getCurrentUser`
* **Category:** Improper Access Control / CWE-285
* **CVSS v3.1:** 8.2 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`)
* **Description:**
  ```typescript
  export function isSuperAdminUser(user?: ...): boolean {
    ...
    return email === "vinayaksahu3@gmail.com" || email === "admin@superwarrior30.com" || ...;
  }
  ```
  Moreover, in `src/server/dal/auth.ts`:
  ```typescript
  const isSuperSession = session.role === "SUPER_ADMIN" || session.email === "vinayaksahu3@gmail.com" || ...;
  if (!isSuperSession && !isCrossDbTransition && user.tokenVersion !== session.tokenVersion) return null;
  ```
  Super admin privileges are tied directly to hardcoded email strings rather than database role records. Furthermore, `tokenVersion` revocation is explicitly bypassed for these email addresses, meaning compromised sessions cannot be revoked via standard token incrementation.
* **Recommended Fix:** Store super admin status strictly in the database `User.role` column and enforce `tokenVersion` checks uniformly across all accounts.

---

#### [VULN-06] Unrestricted File Upload & Missing MIME Whitelist in `/api/upload`
* **Affected File:** `src/app/api/upload/route.ts` (Lines 63-79)
* **Affected Function:** `POST(req: NextRequest)`
* **Category:** Unrestricted File Upload / CWE-434 / Stored XSS
* **CVSS v3.1:** 7.8 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N`)
* **Description:**
  Students can upload files when `category` is set to `"homework"`, `"submission"`, or `"student"`. The file extension is extracted via `file.name.split(".").pop()` without any validation against an allowed extension whitelist (such as `.pdf`, `.png`, `.jpg`).
  Furthermore, the file buffer is read directly into memory via `await file.arrayBuffer()` without prior `content-length` or size verification.
* **Impact:** An attacker can upload malicious HTML or SVG files containing arbitrary JavaScript. When accessed via CDN or storage URLs on the domain, the script executes in the context of the user/admin viewing it (Stored XSS). Additionally, uploading massive files can exhaust Node.js server memory (DoS).
* **Recommended Fix:** Implement a strict extension whitelist (`["pdf", "png", "jpg", "jpeg"]`), validate magic bytes/MIME type, enforce a 10MB file size limit, and serve user uploads with `Content-Disposition: attachment` or a sandboxed domain.

---

#### [VULN-07] Storage Key Path Traversal in Admin Media Upload Endpoint
* **Affected File:** `src/app/api/admin/media/upload-file/route.ts` (Lines 26, 42, 68)
* **Affected Function:** `POST(req: NextRequest)`
* **Category:** Path Traversal / CWE-22
* **CVSS v3.1:** 7.1 (`CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:H/A:H`)
* **Description:**
  `const storageKey = formData.get("storageKey") as string;`
  `const path = storageKey || ...;`
  If a client supplies a custom `storageKey`, the endpoint passes it directly to `uploadToBunnyStorage(path, ...)` or S3 `PutObjectCommand({ Key: path })` without stripping relative path segments (`../`) or directory traversal tokens.
* **Impact:** An attacker with compromised staff/admin access can overwrite arbitrary assets across CDN storage zones.
* **Recommended Fix:** Sanitize `storageKey` using `path.basename` or a regex restricting keys to `^[a-zA-Z0-9_\-\/]+$`, prohibiting `..` sequences.

---

### MEDIUM & LOW FINDINGS

#### [VULN-08] Guest Checkout Referral Tree Disconnection (Commission Starvation)
* **Affected File:** `src/app/api/orders/manual-checkout/route.ts` (Lines 89-118, 225-238)
* **Category:** Business Logic Flaw / Financial Inconsistency
* **CVSS v3.1:** 6.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N`)
* **Description:**
  When a non-logged-in guest user purchases a course via manual checkout and enters a valid affiliate referral code, the API applies the referral discount to the order. However, when the user record is generated, it does not create the corresponding `ReferralRelationship` or `ReferralClosure` nodes.
  When the order is later approved by an administrator, the commission calculation engine checks `referral_closures` for upline ancestors. Because no closure record was created, **zero commission** is generated for the referring student.
* **Impact:** Affiliate partners lose earned commissions; financial tracking discrepancies between discount applied and commissions credited.
* **Recommended Fix:** In `src/app/api/orders/manual-checkout/route.ts`, when a new student is created with a valid referral code, insert the `ReferralRelationship` and build the `ReferralClosure` ancestor tree inside the same transaction.

---

#### [VULN-09] User Enumeration via Unauthenticated Referral Validation Endpoint
* **Affected File:** `src/app/api/referrals/validate/route.ts` (Lines 87-95)
* **Category:** Information Disclosure / CWE-200
* **CVSS v3.1:** 5.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`)
* **Description:**
  The `POST /api/referrals/validate` endpoint is publicly accessible without authentication or rate limiting. Sending a candidate referral code returns the full user ID (`referrerId`) and user full name (`referrerName`).
* **Impact:** Facilitates automated scraping and enumeration of the user directory and internal CUID identifiers.
* **Recommended Fix:** Implement IP-based rate limiting on `/api/referrals/validate` and return only masked or first names without disclosing internal user database IDs.

---

#### [VULN-10] Public Cache-Control Headers on Protected PDF Lesson Endpoints
* **Affected File:** `src/app/api/lessons/[lessonId]/pdf/route.ts` (Lines 139, 170, 198)
* **Category:** Insecure Caching / CWE-524
* **CVSS v3.1:** 5.9 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N`)
* **Description:**
  The endpoint sets `Cache-Control: public, max-age=3600` and `Access-Control-Allow-Origin: *` when returning sliced or full PDF course documents.
* **Impact:** Public caching headers permit shared intermediate proxies, caches, or browser caches to store enrolled course materials, creating potential access leakage to unauthorized viewers.
* **Recommended Fix:** Set `Cache-Control: private, no-store, no-cache, must-revalidate`.

---

#### [VULN-11] Unbounded External Verification Calls in Broker API
* **Affected File:** `src/app/api/broker/verify-member/route.ts`
* **Category:** Denial of Service / Resource Exhaustion / CWE-400
* **CVSS v3.1:** 4.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`)
* **Description:**
  `POST /api/broker/verify-member` calls an external broker API without client rate limiting.
* **Recommended Fix:** Apply Redis/in-memory rate limiting (max 10 requests/minute per IP).

---

## 6. Verification of Business Logic & Workflows

### A. Course Purchase & Fulfillment Workflow
* **Manual Checkout:** Verified order creation, discount calculation, and proof submission. Vulnerability `VULN-08` prevents commission linkage for guest accounts.
* **Payment Approval:** `approveManualOrderPaymentAction` properly validates admin privileges and wraps status update, enrollment creation, and commission snapshots in a transaction.
* **Idempotency:** `fulfillOrderPayment` verifies `order.status === "PAID"` to avoid duplicate enrollments or double-crediting commissions.

### B. Referral & Multi-Tier Commission Engine
* **Plan Snapshots:** Plan configurations are snapshotted at purchase time in `order_commission_snapshots`.
* **Clearance Holding:** Commissions adhere to holding period (`availableAt`) before maturing to `AVAILABLE`.
* **Reversal Logic:** `reverseOrderCommissions` correctly handles adjustments for `PENDING`, `AVAILABLE`, and `PAID_OUT` commissions upon refund.

### C. Wallet & Withdrawal Logic
* **Balance Locking:** `requestWithdrawalAction` checks and decrements `availableBalance` within a transaction before creating the withdrawal record.
* **Rejection Restoration:** `processAdminWithdrawalAction(action: "reject")` safely restores reserved balance with audit logs and ledger transactions.

---

## 7. Recommended Remediation Plan

### Immediate Remediation (Priority 1 — Critical)
1. **Disable `/api/init-db`:** Remove `src/app/api/init-db/route.ts` or strictly gate it behind `NODE_ENV !== "production"` and an administrative authorization secret.
2. **Sanitize Payment Methods in Public Client Components:** Modify `getSystemPaymentMethodsAction` to strip `keySecret` and `webhookSecret` before serialization to client components.
3. **Enforce JWT Secret Validation:** Remove the fallback string in `src/lib/auth/session.ts` and require a valid secret at boot time.

### Near-Term Remediation (Priority 2 — High)
4. **Deploy `src/middleware.ts`:** Implement global Next.js middleware with route matching for `/admin/:path*` and `/dashboard/:path*`.
5. **Enforce File Upload Controls:** Add extension and MIME whitelisting, file size limits, and sandboxed storage domains for `/api/upload`.
6. **Fix Guest Referral Tree Connection:** Ensure `ReferralRelationship` and `ReferralClosure` are created in `manual-checkout`.

### Architectural Hardening (Priority 3 — Medium/Low)
7. **Rate Limiting:** Add rate limiting to `/api/referrals/validate` and `/api/broker/verify-member`.
8. **Private Cache Headers:** Update PDF streaming routes to `Cache-Control: private, no-store`.

---

## 8. Final Security Risk Rating

| Overall Rating | **HIGH RISK** |
|---|---|
| **Justification** | The application features strong architecture around Prisma transactions, audit logging, and device tracking; however, the presence of an unauthenticated database reset endpoint (`/api/init-db`), client-side exposure of payment gateway secrets, and a fallback JWT secret present severe attack vectors that must be resolved prior to production deployment. |

---
*Report generated in compliance with the Non-Destructive Security Audit Specification.*

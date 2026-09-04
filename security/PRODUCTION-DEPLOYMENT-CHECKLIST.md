# SUPERWARRIOR30 — PRODUCTION DEPLOYMENT CHECKLIST & SMOKE TEST PLAN

**Target System:** SuperWarrior30 (SW30) Production LMS  
**Framework:** Next.js 16.3.2, React 19, Prisma ORM 7.9.1, PostgreSQL  
**Audit Reference:** Strix Security Hardening Pre-Deployment Audit  
**Date:** September 2026  

---

## 1. 📋 Pre-Deployment Verification Checklist

Complete these verification gates BEFORE triggering production deployment:

- [ ] **Git Diff Reviewed**: Verify that only the 13 approved security remediation files are modified. Zero unexpected changes.
- [ ] **No Secrets Committed**: Confirm `.env` and `.env.local` remain strictly ignored and untracked in git.
- [ ] **Database Schema Unchanged**: Confirm `prisma/schema.prisma` is untouched. Zero migrations (`prisma migrate dev/reset`) to be run on production.
- [ ] **Production DB Endpoint Verified**: Confirm production database connection string (`DATABASE_URL`) points to the dedicated production database cluster with PgBouncer.
- [ ] **JWT Production Secret Verified**: Confirm `JWT_SECRET_KEY` in production environment has **minimum 32 characters** (fails closed at runtime if missing or weak).
- [ ] **Payment Secrets Configured Server-Side**: Confirm `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are present in server environment variables.
- [ ] **Storage Infrastructure Verified**: Confirm Bunny Storage credentials (`BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_CDN_HOSTNAME`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`) are active.
- [ ] **TypeScript Build Passed**: Verified with `npx tsc --noEmit` (Exit code 0).
- [ ] **Next.js Production Build Passed**: Verified with `npx next build` (Exit code 0, 38/38 routes generated).
- [ ] **Security Test Suite Passed**: Verified with 181 automated unit and regression checks.

---

## 2. 🚀 Deployment Execution Safeguards

Follow these strict rules during deployment:

- [ ] **Deployment Target Confirmed**: Ensure deployment target is production hosting (e.g. Vercel / Node server).
- [ ] **Zero Database Execution**: DO NOT run `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, or `prisma/seed.ts` during deployment. The database schema is already 100% compatible.
- [ ] **Environment Variables Mapped**: Ensure environment variables are loaded securely through the deployment platform's secret manager.
- [ ] **NODE_ENV Set**: Confirm `NODE_ENV="production"` is set in production runtime.

---

## 3. 🔍 Post-Deployment Safe Smoke Test Plan

Immediately after deployment is live, perform these **non-destructive, read-only** smoke tests:

### Step 1: Endpoint Security & Header Verification
1. Open terminal and run:
   ```bash
   curl -I https://www.superwarrior30.com/api/init-db
   ```
   **Expected Response:** `HTTP/1.1 404 Not Found` (Confirms `/api/init-db` is completely disabled in production).
2. Inspect response headers on homepage:
   ```bash
   curl -I https://www.superwarrior30.com
   ```
   **Expected Headers:** `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=...`, `Content-Security-Policy`.

### Step 2: Public Navigation & Course Loading
1. Visit `https://www.superwarrior30.com` in a browser.
2. Confirm homepage hero, courses section, testimonials, and footer load without console errors.
3. Click on a course card (e.g. `/courses/super-warrior-30`).
4. Confirm course details, curriculum modules, and pricing display accurately.

### Step 3: Checkout Page & Payment Method Protection
1. Navigate to checkout: `/checkout/<courseId>`.
2. Open Browser DevTools -> **Network** tab -> inspect the RSC payload and API requests.
3. Select Payment Methods:
   - Confirm public options load (e.g. UPI ID, QR code, Bank details, Razorpay).
   - Filter Network responses for `keySecret`, `webhookSecret`, `saltKey`.
   - **Expected Result:** None of these private keys appear anywhere in network responses or DOM.

### Step 4: Referral Validation Test
1. In checkout referral input, enter an invalid referral code (e.g. `INVALID999`).
2. Confirm the error message displays cleanly: "Invalid referral code. Please check and try again."
3. Enter a known active partner referral code.
4. Confirm discount applies and referrer name appears masked: `First L. (Verified Partner)`.

### Step 5: Student Authentication & Dashboard
1. Log in with an existing student account at `/login`.
2. Confirm redirect to `/dashboard`.
3. Verify previously enrolled courses appear in the dashboard.
4. Click "Continue Learning" on an enrolled course (`/learn/<slug>/<lessonId>`).
5. Confirm video player loads via Bunny Stream and PDF viewer renders without errors.

### Step 6: Admin Authentication & Management
1. Log in with an authorized administrator account at `/adminlogin` or `/superadminlogin`.
2. Confirm redirect to `/admin`.
3. Open **Orders** (`/admin/orders`): verify existing order history displays accurately.
4. Open **Courses** (`/admin/courses`): verify existing courses are listed.
5. Open **Referrals** (`/admin/referrals`): verify network trees and settings load accurately.
6. Open **Wallet & Withdrawals** (`/admin/withdrawals`): verify withdrawal requests load without accounting errors.

---

## 4. 🛑 Rollback Trigger Criteria

If any of the following occur during smoke testing, initiate immediate rollback to previous commit:
- Unhandled 500 error on `/login` or `/dashboard`.
- Enrolled students unable to view previously purchased courses.
- `/api/init-db` returning anything other than `404 Not Found`.
- Live payment secrets appearing in browser client payloads.

# OTP Login and Password Reset Flow (VoltZone POS)

This document explains how One-Time Password (OTP) is used in VoltZone POS for:
- Securing privileged logins (store owner, cashier, sales rep)
- Password reset verification via OTP

It includes endpoints, request/response shapes, error cases, environment setup, and where the frontend hooks in.

---

## 1) OTP for Login (Privileged Roles)

Roles that require OTP: `store_owner`, `cashier`, `sales_rep` (see `server/src/utils/roles.ts`).

There are two ways to start login:
- Normal login with username + password (server replies that OTP is required)
- Admin/OTP-specific flow with init + verify endpoints
- Face login (embedding) that always requires OTP after a face match

### 1.1 Normal login (username + password)

Endpoint: `POST /api/auth/login`

Request:
```json
{ "username": "owner@example.com", "password": "secret", "rememberMe": true }
```

Possible responses:
- If role does NOT require OTP:
```json
{ "success": true, "data": { "user": { ... }, "accessToken": "...", "refreshToken": "..." } }
```
- If role requires OTP (no tokens yet):
```json
{ "success": true, "message": "OTP required", "data": { "requiresOtp": true, "user": { "username": "owner", "role": "store_owner" } } }
```
The server emails a 6-digit code (valid for 5 minutes) to the user’s email.

Then call the verify endpoint (see 1.3) to complete login.

### 1.2 Face login (embedding)

Endpoint: `POST /api/auth/login-face`

Request:
```json
{ "embedding": [0.123, -0.045, ...] }
```
Response (if face matched):
```json
{ "success": true, "data": { "requiresOtp": true, "user": { "id": "...", "username": "...", "role": "store_owner" }, "similarity": 0.93 } }
```
Even after a face match, the user must verify OTP. The OTP is emailed to the account email.

### 1.3 OTP login (canonical 2-step endpoints)

Step 1 – Initiate:
- Endpoint: `POST /api/auth/otp-login/init`
- Body: `{ "username": "owner@example.com", "password": "secret", "rememberMe": true }`
- Returns: `{ success: true, data: { requiresOtp: true } }` and emails a 6-digit code.

Step 2 – Verify:
- Endpoint: `POST /api/auth/otp-login/verify`
- Body: `{ "username": "owner@example.com", "otp": "123456", "rememberMe": true }`
- Returns tokens on success:
```json
{ "success": true, "data": { "user": { ... }, "accessToken": "...", "refreshToken": "..." } }
```

Notes:
- Legacy aliases also exist: `/admin/login/init|verify`, `/store-owner/login/init|verify` (client falls back if needed).
- Rate limiting: >5 OTP requests while a code is still valid returns 429.
- Expiry: OTP valid for 5 minutes; using an expired code returns 400.

### 1.4 Frontend hooks

- File: `client/src/lib/api/auth.api.ts`
  - `authApi.login` – normal login (may return `requiresOtp`)
  - `authApi.adminLoginInit` – calls `/otp-login/init`
  - `authApi.adminLoginVerify` – calls `/otp-login/verify` and stores tokens
- File: `client/src/pages/Login.tsx`
  - Shows OTP inputs when `requiresOtp` is returned and handles resend
- Store: `client/src/store/auth.store.ts`
  - Holds `otpRequired` state and provides `verifyAdminOtp`

---

## 2) OTP for Password Reset (Two-step)

Used to confirm identity before sending a reset link.

### 2.1 Step 1 – Request reset OTP

Endpoint: `POST /api/auth/password-reset/init`

Body can be email or username:
```json
{ "email": "user@example.com" }
```
Response:
```json
{ "success": true, "message": "OTP sent", "data": { "emailSent": true } }
```
- If SMTP is not configured, you still get `success: true` and in dev we may return an Ethereal preview URL (see email service).
- The code is valid for 10 minutes.

### 2.2 Step 2 – Verify reset OTP (sends reset link)

Endpoint: `POST /api/auth/password-reset/verify`

Body:
```json
{ "email": "user@example.com", "otp": "123456" }
```
Response:
```json
{ "success": true, "message": "Reset link sent", "data": { "resetUrl": "http://.../reset-password/<token>", "emailSent": true } }
```
After successful verification, the server emails a password reset link valid for 30 minutes.

### 2.3 Frontend hooks

- File: `client/src/lib/api/auth.api.ts`
  - `authApi.resetInit` – step 1
  - `authApi.resetVerify` – step 2
- File: `client/src/pages/Login.tsx`
  - Forgot Password section uses the OTP flow to trigger a reset link

---

## 3) Email Delivery and Dev Fallbacks

- Email sending: `server/src/services/email.service.ts`
- Production: configure SMTP via env (see below)
- Development: optional Ethereal test inbox (preview URL returned)

Both OTP mails are simple HTML templates:
- Login OTP subject: "VoltZone POS Store Owner Login OTP"
- Reset OTP subject: "VoltZone POS - Password Reset Code"

---

## 4) Environment Variables

Add to your server `.env` as needed:

```
# SMTP (use either Gmail service or custom host)
SMTP_HOST=smtp.gmail.com     # optional; if missing and user/pass set, gmail service is used
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app_password
EMAIL_FROM=your@gmail.com

# Optional: use Ethereal test inbox in dev if SMTP not configured
ENABLE_ETHEREAL_FALLBACK=true

# Client URL for building reset links
APP_URL=http://localhost:5173

# Optional debug (DO NOT enable in prod)
DEBUG_SHOW_OTP=false
```

---

## 5) Error Cases and Status Codes

- 400 – OTP not requested / expired / malformed payload
- 401 – Invalid credentials or invalid OTP
- 403 – Account inactive (some flows)
- 429 – Too many OTP requests while a code is still active

The server also clears expired OTPs and resets attempt counters on success.

---

## 6) Quick Sequence Diagrams

### 6.1 Login with OTP

1. Client → `POST /auth/login` with username+password
2. Server → `{ requiresOtp: true }` (for privileged roles) and emails OTP
3. Client shows OTP field
4. Client → `POST /auth/otp-login/verify` with username+otp
5. Server → tokens + user and sets refresh token cookie

Alternative start: 1a. Use `POST /auth/otp-login/init` instead of `/auth/login`.

### 6.2 Password Reset via OTP

1. Client → `POST /auth/password-reset/init` (email or username)
2. Server emails `resetOtp` (10 min valid)
3. Client → `POST /auth/password-reset/verify` with otp
4. Server emails password reset link (30 min valid)

---

## 7) Where to Edit

- Server routes: `server/src/routes/auth.routes.ts`
- Controller logic: `server/src/controllers/auth.controller.ts`
- Email service: `server/src/services/email.service.ts`
- Role logic: `server/src/utils/roles.ts`
- Client API wrapper: `client/src/lib/api/auth.api.ts`
- Client views: `client/src/pages/Login.tsx` and `client/src/pages/SimpleLogin.tsx`

---

## 8) Testing Tips

- In dev without SMTP, enable `ENABLE_ETHEREAL_FALLBACK=true` to get preview links.
- Check `/api/auth/smtp-status` to verify SMTP configuration.
- Use `DEBUG_SHOW_OTP=true` only in local development for quick testing.

That’s it—this is the end‑to‑end OTP story for VoltZone POS.

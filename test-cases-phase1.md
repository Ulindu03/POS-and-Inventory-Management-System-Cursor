# Phase 1 Test Cases – Authentication & Access Control

This file contains Phase 1 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.

## Scope (Phase 1)
Covers user login, logout, password reset, OTP (store owner), session handling, basic authorization (role-based), and security edge cases.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, AD = Admin (legacy)

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|
| AUTH-001 | Successful login (username+password) | Valid credentials login | Seeded demo users exist | 1. Open login page 2. Enter username 3. Enter password 4. Click Login | username=owner, password=owner123 | Redirect to dashboard; access token & refresh token stored (cookie/local) | User session active | H | | Not Run |
| AUTH-002 | Invalid password | Login with wrong password | User exists | 1. Open login page 2. Enter valid username 3. Enter wrong password 4. Click Login | username=owner, password=wrongPass | Error message 'Invalid credentials'; no token issued | No session created | H | | Not Run |
| AUTH-003 | Non-existent user | Login with unknown username | None | 1. Open login page 2. Enter fake username 3. Enter any password 4. Click Login | username=ghost, password=abc | Error 'Invalid credentials' | No session | M | | Not Run |
| AUTH-004 | Required OTP for store owner | Owner login triggers OTP step | OTP feature enabled for store owner | 1. Login as owner 2. Observe OTP prompt 3. Retrieve OTP (email or debug) 4. Submit OTP | username=owner password=owner123 otp=123456 | Login completes only after correct OTP; wrong OTP shows error & increases attempt count | Session active; attempts counter updated | H | | Not Run |
| AUTH-005 | Wrong OTP attempts throttle | Repeated wrong OTP | Owner OTP pending | 1. Enter wrong OTP 5 times 2. Observe response | otp=000000 each try | After limit reached, further attempts blocked temporarily | Account temporarily locked for OTP | H | | Not Run |
| AUTH-006 | OTP expiry | OTP expires after timeout | OTP issued | 1. Wait past expiry window 2. Submit original OTP | expired otp | Error 'OTP expired' | User must request new OTP | M | | Not Run |
| AUTH-007 | Refresh token rotation | Using refresh endpoint issues new access token | Logged in with refresh token cookie | 1. Wait near access token expiry 2. Call refresh endpoint 3. Inspect tokens | N/A | New access token returned; old still valid until expiry; refresh rotation (if implemented) | Continued session | H | | Not Run |
| AUTH-008 | Logout clears session | Normal logout | Logged-in user | 1. Click logout 2. Confirm action | N/A | Tokens cleared; redirect to login | Session invalidated | H | | Not Run |
| AUTH-009 | Access protected endpoint w/o token | Unauthorized API access | None | 1. Call /api/users while not logged in | No token | 401 Unauthorized with error JSON | No data exposure | H | | Not Run |
| AUTH-010 | Role-based denial (cashier restricted) | Cashier blocked from admin-only route | Cashier logged in | 1. Login as cashier 2. Call protected admin route (e.g., /api/settings PUT) | cashier credentials | 403 Forbidden | No changes applied | H | | Not Run |
| AUTH-011 | Store owner can access settings | Owner privileges | Store owner logged in | 1. Login owner 2. Update settings via API | valid JSON body | 200 OK; settings updated | Settings persisted | H | | Not Run |
| AUTH-012 | Password reset request existing user | Forgot password email link | SMTP configured or debug flag | 1. Call forgot-password API 2. Inspect response | email=owner@voltzone.lk | 200 with reset link or debug token; email sent flag | Reset token stored (expires) | H | | Not Run |
| AUTH-013 | Password reset request unknown email | Forgot password unknown | None | 1. Call forgot-password API with unknown email | email=none@host.com | 200 generic response (no user disclosure) | No token stored | M | | Not Run |
| AUTH-014 | Complete password reset | Reset flow success | Valid reset token | 1. POST new password to reset endpoint 2. Try login with new password | newPassword=Owner#2025 | Password updated; login with new password succeeds; old password fails | Session can be created with new password | H | | Not Run |
| AUTH-015 | Reset token invalid/expired | Reset token misuse | Token expired or altered | 1. POST to reset endpoint using invalid token | token=abc | 400/401 error; password not changed | No password change | M | | Not Run |
| AUTH-016 | Brute force lock (if implemented) | Excessive failed logins | Threshold configured | 1. Attempt wrong password repeatedly > threshold | wrong password | Account/ IP temporarily blocked | Further attempts blocked | M | | Not Run |
| AUTH-017 | Session persistence reload | Reload after login | Logged in | 1. Login 2. Refresh page 3. Access protected view | N/A | Still authenticated (tokens present) | Continuous session | M | | Not Run |
| AUTH-018 | Token tampering | Modify stored access token | Logged in | 1. Alter token in storage 2. Call API | corrupted token | 401 invalid token | No access | M | | Not Run |
| AUTH-019 | Logout invalidates refresh | Refresh after logout | Logged in then logged out | 1. Logout 2. Call refresh endpoint | N/A | 401/403; refresh rejected | No new tokens | M | | Not Run |
| AUTH-020 | Missing required fields | Empty login form | None | 1. Submit login with empty fields | username=, password= | Validation errors displayed | No request or 400 response | L | | Not Run |
| AUTH-021 | XSS in username field | Script injection attempt | None | 1. Enter `<script>alert(1)</script>` as username | malicious string | Field sanitized / error; no script executed | Safe UI | L | | Not Run |
| AUTH-022 | SQL/NoSQL injection attempt | Injection resilience | None | 1. Enter `{ "$gt": "" }` as username | crafted payload | Login fails normally | Safe query | L | | Not Run |
| AUTH-023 | Multi-tab logout sync (if realtime) | Logout reflected in other tab | Two tabs logged in same user | 1. Open tab A & B 2. Logout in A 3. Use B | N/A | B becomes unauthorized on next request | Single session integrity | L | | Not Run |
| AUTH-024 | Permission change mid-session | Role downgraded after login | Admin modifies user role | 1. Owner logs in 2. Change role in DB to cashier 3. Access admin route | N/A | Access now denied (if dynamic permission check) | Security enforced | L | | Not Run |
| AUTH-025 | Two-factor disabled path | User w/out 2FA | 2FA disabled | 1. Login as cashier | credentials | Direct login success (no OTP step) | Session active | M | | Not Run |

---

### Export Tips
1. Copy this table into an Excel/Google Sheet and format header with color, then export as PNG.
2. Or use a VS Code extension like *Markdown Preview Enhanced* and its screenshot export.
3. Keep Status/Actual Results columns updated during execution.

### Next Phases (Preview)
 - Phase 8: Warranty & Claims (`test-cases-phase8.md`)
 - Phase 10: Settings, Notifications & Security Hardening (`test-cases-phase10.md`)

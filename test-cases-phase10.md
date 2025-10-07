# Phase 10 Test Cases – Settings, Notifications & Security Hardening

This file contains Phase 10 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.

## Scope (Phase 10)
Covers system settings, notification templates, delivery channels (email, SMS, in-app), user preferences, security hardening (password policy, MFA, session, audit, rate limiting, CORS, headers), admin controls, error handling, role-based access, and reporting.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, INV = Inventory Manager, LOG = Logistics Coordinator, WTY = Warranty Coordinator, AD = Admin

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|
| SET-001 | Update system settings | Change company info, logo | Admin logged in | 1. Open Settings 2. Edit company info/logo 3. Save | name, logo.png | Changes saved; reflected in UI | Settings updated | H | | Not Run |
| SET-002 | Notification template edit | Edit email/SMS templates | Admin logged in | 1. Open Notifications 2. Edit template 3. Save | subject/body | Template updated; preview correct | Template stored | M | | Not Run |
| SET-003 | Delivery channel config | Enable/disable channels | SMTP/SMS configured | 1. Toggle email/SMS/in-app 2. Save | email=on, sms=off | Only enabled channels used for notifications | Channel config saved | M | | Not Run |
| SET-004 | User preferences | Change notification/user settings | User logged in | 1. Open Profile 2. Edit preferences 3. Save | language, theme | Preferences saved; UI updates | Preferences stored | L | | Not Run |
| SET-005 | Password policy enforcement | Enforce strong passwords | Policy set | 1. Set weak password 2. Save 3. Set strong password | weak=123, strong=Abc#2025 | Weak rejected; strong accepted | Policy enforced | H | | Not Run |
| SET-006 | MFA enable/disable | Toggle multi-factor auth | User logged in | 1. Enable MFA 2. Complete setup 3. Disable MFA | N/A | MFA enabled/disabled; login flow updated | MFA status stored | H | | Not Run |
| SET-007 | Session timeout | Auto-logout after inactivity | Timeout set | 1. Login 2. Wait past timeout 3. Try action | timeout=15m | User logged out; must re-login | Session ended | H | | Not Run |
| SET-008 | Audit log review | View audit logs | Admin logged in | 1. Open Audit Logs 2. Filter/search 3. View details | filters | Logs show actions, user, time, details | Logs viewable | M | | Not Run |
| SET-009 | Rate limiting | Prevent brute force/API abuse | Limits set | 1. Exceed login/API attempts 2. Observe response | 10 attempts | Error shown; further attempts blocked | Rate limit enforced | H | | Not Run |
| SET-010 | CORS policy | Restrict cross-origin requests | CORS config set | 1. Make request from disallowed origin | origin=evil.com | Request blocked; error shown | CORS enforced | H | | Not Run |
| SET-011 | Security headers | Enforce secure headers | Headers config set | 1. Inspect response headers | N/A | Headers present (CSP, HSTS, X-Frame, etc.) | Headers enforced | H | | Not Run |
| SET-012 | Admin role controls | Only admin can change critical settings | Roles set | 1. Login as CA 2. Try change settings 3. Login as AD 4. Change settings | credentials | CA blocked; AD allowed | Access enforced | H | | Not Run |
| SET-013 | Error handling | Friendly error messages | Simulate backend error | 1. Trigger error 2. Observe UI | N/A | User-friendly error; retry/help shown | UX resilience | L | | Not Run |
| SET-014 | Notification delivery | Send test notification | Channels enabled | 1. Send test email/SMS/in-app 2. Check delivery | test message | Notification received; logs updated | Delivery confirmed | M | | Not Run |
| SET-015 | Notification opt-out | User disables notifications | User logged in | 1. Opt-out in preferences 2. Trigger event | N/A | No notification sent; opt-out respected | Opt-out stored | L | | Not Run |
| SET-016 | Reporting | Settings/security/notification report | Data exists | 1. Run report 2. Export CSV | filters | Report generated; CSV downloads | Report file | L | | Not Run |
| SET-017 | Data privacy | Mask sensitive config in UI | Privacy rules set | 1. View settings with sensitive fields | N/A | Sensitive fields masked/hidden | Privacy enforced | H | | Not Run |
| SET-018 | API access | Secure settings/notification endpoints | API enabled | 1. Call /api/settings with/without token | N/A | 401/403 for unauthorized; 200 for admin | API access enforced | H | | Not Run |

---

### Export Tips
1. Copy this table into an Excel/Google Sheet and format header with color, then export as PNG.
2. Or use a VS Code extension like Markdown Preview Enhanced and its screenshot export.
3. Keep Status/Actual Results columns updated during execution.

### Related Phases
- Phase 1: Authentication & Access Control (`test-cases-phase1.md`)
- Phase 2: Product & Category Management
- Phase 3: Sales & Payments
- Phase 4: Returns & Exchanges
- Phase 5: Inventory & Stock Movements
- Phase 6: Purchase Orders & Suppliers (`test-cases-phase6.md`)
- Phase 7: Delivery & Trip Logistics (`test-cases-phase7.md`)
- Phase 8: Warranty & Claims (`test-cases-phase8.md`)
- Phase 9: Reporting & Dashboard (`test-cases-phase9.md`)
- Phase 10: Settings, Notifications & Security Hardening (this file)

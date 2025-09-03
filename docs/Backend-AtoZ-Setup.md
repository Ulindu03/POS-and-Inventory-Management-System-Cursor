# VoltZone POS – Backend A→Z Setup & Test Guide

Simple English, step-by-step. Use this to set up, seed users, and test forgot/reset password.

## 0) What you need
- Node.js 18+ and npm
- MongoDB (Atlas URI or local MongoDB)
- Browser (for Swagger UI) or Postman

## 1) Open the project
- Folder: `c:\Users\ulind\Documents\SE\voltzone-pos Cursor`

## 2) Configure environment (server/.env)
- File: `server/.env`
- Minimum keys to set:
  - `MONGODB_URI=<your MongoDB connection string>`
  - `JWT_SECRET=<any long random string>`
  - `JWT_REFRESH_SECRET=<another long random string>`
  - `APP_URL=http://localhost:5173`
- Optional (can leave blank for now): `SMTP_*`, `SUPABASE_*`

Example (do NOT copy secrets verbatim—use your own):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=your_other_long_random_secret
APP_URL=http://localhost:5173
```

## 3) Install dependencies (once)
- Server:
```powershell
cd "c:\Users\ulind\Documents\SE\voltzone-pos Cursor\server"
npm install
```
- Client (optional for UI):
```powershell
cd "c:\Users\ulind\Documents\SE\voltzone-pos Cursor\client"
npm install
npm install @tanstack/react-table
```

## 4) Start the backend server
```powershell
cd "c:\Users\ulind\Documents\SE\voltzone-pos Cursor\server"
npm run dev
```
You should see: `Server listening on http://localhost:5000` and `MongoDB connected`.

## 5) Quick health check
- API status: http://localhost:5000/
- Swagger UI: http://localhost:5000/api/docs
- Raw OpenAPI JSON (debug): http://localhost:5000/api/docs.json

## 6) Seed demo users (admin + cashier)
- Seed (GET): http://localhost:5000/api/dev/seed-users
- List users (GET): http://localhost:5000/api/dev/list-users
  - Expected emails:
    - admin → `admin@voltzone.lk`
    - cashier → `cashier@voltzone.lk`

## 7) Forgot password (get reset link)
- Swagger → Auth → `POST /api/auth/forgot-password`
- Body JSON:
```json
{ "email": "admin@voltzone.lk" }
```
- Expected 200 with `data.resetUrl` (and sometimes `resetToken` if SMTP not configured).
- Tip: Make sure the URL has no trailing spaces. `%20` at the end causes 404.

## 8) Reset password (use the token)
- Take the token from `resetUrl` (the long string at the end).
- Swagger → Auth → `POST /api/auth/reset-password/{token}`
- Path param: paste the token
- Body JSON:
```json
{ "password": "newStrongPassword123" }
```
- Expected 200: `Password reset successful`.

## 9) Login
- Swagger → Auth → `POST /api/auth/login`
- Body JSON:
```json
{ "username": "admin", "password": "newStrongPassword123" }
```
- Copy the `accessToken` for protected endpoints.

## 10) Optional: run the client (UI)
```powershell
cd "c:\Users\ulind\Documents\SE\voltzone-pos Cursor\client"
npm run dev
```
- Open http://localhost:5173

## 11) Optional: SMTP & Supabase
- Email (SMTP): set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` in `server/.env`. Without SMTP, the API still returns a `resetUrl` for testing.
- Supabase uploads: set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`. If not set, uploads fall back to local `/uploads`.

## 12) Troubleshooting
- 404 on forgot-password: User email not in DB. Re-run seeding and verify with `/api/dev/list-users`.
- 404 with `%20`: Remove trailing space from the URL.
- 401 on login: Check username/password. Default seeded passwords: `admin123`, `cashier123` (unless you changed them).
- Server not reachable: ensure `npm run dev` is running and port 5000 is open.
- CORS during client dev: keep client origin as `http://localhost:5173`.

---

## Export this guide to PDF
Option A – VS Code (recommended)
1) Open this file in VS Code: `docs/Backend-AtoZ-Setup.md`.
2) Install the extension “Markdown PDF” (publisher: yzane).
3) Right-click the markdown → `Markdown PDF: Export (pdf)`.

Option B – Print to PDF
1) Open the Markdown preview in VS Code (Ctrl+Shift+V).
2) Use your system’s “Print” and choose “Microsoft Print to PDF`.

---

That’s it. Follow steps 2 → 9 to complete the reset flow end-to-end.

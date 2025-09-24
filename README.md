# VoltZone POS System

A modern, comprehensive POS (Point of Sale) system built with the MERN stack.

## Features
- 🎨 Beautiful glassmorphic UI design
- 🌐 Multi-language support (English & Sinhala)
- 💰 LKR currency support
- 🚀 Real-time updates
- 📱 Responsive design
- 🔒 Secure authentication

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   cd client && npm install

   # Backend
   cd server && npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Update with your configuration

4. Start development servers:
   ```bash
   # Frontend (Terminal 1)
   cd client && npm run dev

   # Backend (Terminal 2)
   cd server && npm run dev
   ```

### Using Docker for MongoDB
```bash
docker-compose up -d
```

### Demo Credentials (Dev Seed)

When using the dev seeding endpoint (`GET /api/dev/seed-users` on the backend), the following demo users are created:

- Store Owner: `owner` / `owner123`
- Cashier: `cashier` / `cashier123`

Use the Store Owner account for management actions.

## Project Structure
```
voltzone-pos/
├── client/          # Frontend React application
├── server/          # Backend Node.js application
└── docker-compose.yml
```

## License
© 2024 VoltZone. All rights reserved.

## SMTP / Store Owner OTP Setup

Store Owner logins require an OTP which is emailed. Configure SMTP or use the dev fallback:

1. Create a Gmail App Password (Google Account > Security > 2-Step Verification > App Passwords).
2. Copy the generated 16-character password.
3. Copy `.env.example` to `.env` (server root) and set either:
   - Explicit host mode:
     - `SMTP_HOST=smtp.gmail.com`
     - `SMTP_PORT=587`
   - Or omit `SMTP_HOST` (the code will fallback to Gmail `service: 'gmail'`).
4. Always set:
   - `SMTP_USER=your_gmail_address`
   - `SMTP_PASS=your_app_password`
   - `EMAIL_FROM=your_gmail_address`
5. During development you can set `DEBUG_SHOW_OTP=true` to receive the OTP in the API response (never in production).
6. Restart the server and GET `/api/auth/smtp-status` to verify: should show `configured:true` and `verify.ok:true`.
7. Login as store owner; response will include `emailSent:true` if mail dispatched.

If SMTP isn’t configured you can still proceed using the dev OTP (shown only when debug flag is enabled).

### Troubleshooting SMTP "not configured"

If `/api/auth/smtp-status` returns `configured:false` even though you've set vars in `.env`:

1. Confirm the `.env` file is in the `server/` directory (same folder as `package.json`).
2. Ensure the dev server was restarted after adding variables (CTRL+C then `npm run dev`).
3. Check the startup console log section beginning with `[startup][env-check] SMTP vars` – it will show which values are missing.
4. Look for hidden characters / BOM: open `.env` in a plain text editor and re-save as UTF-8 (no BOM).
5. Make sure variable names have no trailing spaces: e.g. `SMTP_USER=` not `SMTP_USER =` (spaces after the key can break parsing in some cases).
6. Avoid wrapping values in quotes unless needed. If you do, use no smart quotes: `EMAIL_FROM=you@example.com`.
7. Run a quick manual test inside `server/` directory:
   ```bash
   node -e "require('dotenv').config(); console.log('SMTP_USER?', process.env.SMTP_USER)"
   ```
   (Should output your Gmail address.)
8. Use the hot reload endpoint (dev only): `POST /api/auth/smtp-reload` to force re-check after editing the `.env` without a full restart (only works for values read dynamically; transporter creation still happens lazily on first send).
9. Ensure `ENABLE_ETHEREAL_FALLBACK=false` if you specifically want to fail when real SMTP is missing (helps surface misconfiguration).

If verification fails (`verify.ok:false`) but `configured:true`, common causes:
- Wrong app password or revoked password – generate a new one.
- Port blocked by firewall – try port 587 vs 465.
- Using a regular Gmail password instead of an App Password when 2FA is enabled.

### Auto Update Behavior

The service now reads SMTP environment variables at the moment of each send (dynamic lookup) instead of caching them at module load. This means:
- Adding or changing `SMTP_*` values requires only a restart if you changed the file name or added **new** keys; edits to existing keys can often be picked up by calling `/api/auth/smtp-reload` then retrying login.
- The transporter instance is cached after first successful creation; if you change credentials, restart the server to recreate it cleanly.

### Quick Checklist Before Opening an Issue
- [ ] `/api/auth/smtp-status` shows `configured:true`.
- [ ] `verify.ok:true`.
- [ ] Store Owner login response includes `emailSent:true` (or `emailError` if failure).
- [ ] OTP mail appears in Gmail Inbox or Spam (check Spam folder!).
- [ ] `DEBUG_SHOW_OTP` disabled in production.

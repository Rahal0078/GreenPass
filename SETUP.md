# Solar CRM — Setup Guide

A full-stack complaint management system with three portals: Public (complaint form + ticket tracking), Admin (dashboard + reports), and Technician (map + job flow).

---

## Requirements

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (e.g. Neon, Supabase, or any Postgres)

---

## Step 1 — Install dependencies

```bash
pnpm install
```

---

## Step 2 — Set environment variables

Create a `.env` file in the project root (or set these in your hosting platform):

```env
# ── Required ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname
SESSION_SECRET=any-long-random-string-here

# ── Your company ──────────────────────────────────────────
COMPANY_NAME=Your Company Name
COMPANY_TAGLINE=Your Company Tagline
SENDER_EMAIL=your-gmail@gmail.com
PASSWORD_SALT=any-random-string-used-for-hashing

# ── Gmail (for customer email notifications) ───────────────
# Generate at: https://myaccount.google.com/apppasswords
GMAIL_APP_PASSWORD=your-gmail-app-password

# ── Google Sheets (live sync of complaints) ────────────────
# Create a service account at: https://console.cloud.google.com
# Share your Google Sheet with the service account email
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
SPREADSHEET_ID=your-google-sheet-id-from-the-url
SHEET_NAME=Sheet1

# ── Push notifications (optional — has built-in defaults) ──
# Generate your own VAPID keys: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## Step 3 — Create the database tables

```bash
pnpm --filter @workspace/db run push
```

This creates all required tables automatically (complaints, technicians, admins, sessions).

---

## Step 4 — Create the first admin account

Connect to your database and run:

```sql
INSERT INTO admins (username, password, name)
VALUES (
  'admin',
  encode(sha256(('your-password' || 'YOUR_PASSWORD_SALT')::bytea), 'hex'),
  'Administrator'
);
```

Replace `your-password` with your chosen password and `YOUR_PASSWORD_SALT` with the same value you set for `PASSWORD_SALT` in `.env`.

Or use this Node.js helper script:

```bash
node -e "
const crypto = require('crypto');
const pass = 'your-password';
const salt = 'YOUR_PASSWORD_SALT';
console.log(crypto.createHash('sha256').update(pass + salt).digest('hex'));
"
```

Then insert the printed hash directly:

```sql
INSERT INTO admins (username, password, name)
VALUES ('admin', '<printed-hash>', 'Administrator');
```

---

## Step 5 — Add technicians

In the admin portal after logging in: **Admin → Technicians → Add Technician**

Or directly via SQL (same password hashing as above):

```sql
INSERT INTO technicians (username, password, name, phone)
VALUES ('tech_username', '<hashed-password>', 'Technician Name', '+91 9999999999');
```

---

## Step 6 — Run the app

**Development:**
```bash
pnpm --filter @workspace/api-server run dev   # Backend on port 8080
pnpm --filter @workspace/vekay-solar run dev  # Frontend on port 24488
```

**Production (e.g. Replit, Railway, Render):**
Set `NODE_ENV=production` — the backend will serve the built frontend automatically.

```bash
pnpm run build
pnpm --filter @workspace/api-server run start
```

---

## API Connections Summary

| Service | What it does | Required? | Where to get it |
|---|---|---|---|
| PostgreSQL | Stores all data | Yes | Neon / Supabase / any Postgres |
| Gmail | Sends emails to customers | Optional | [Google App Passwords](https://myaccount.google.com/apppasswords) |
| Google Sheets | Live sync of complaints to a spreadsheet | Optional | [Google Cloud Console](https://console.cloud.google.com) |
| VAPID keys | Push notifications to technicians | Optional | `npx web-push generate-vapid-keys` |

---

## Default portal URLs

| Portal | URL |
|---|---|
| Public (complaint form) | `https://your-domain/` |
| Admin login | `https://your-domain/admin` |
| Technician login | `https://your-domain/tech` |

---

## Google Sheets Setup (step-by-step)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Create a **Service Account** → Download the JSON key
4. Paste the entire JSON as the `GOOGLE_SERVICE_ACCOUNT_JSON` env var
5. Create a Google Sheet → Copy the ID from the URL:
   `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`
6. Share the sheet with the service account email (Editor access)
7. Set `SPREADSHEET_ID` env var to the copied ID
8. Set `SHEET_NAME` to the tab name inside your sheet (e.g. `Sheet1`)

---

## Gmail Setup (step-by-step)

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Set `GMAIL_APP_PASSWORD` to the generated 16-character password
5. Set `SENDER_EMAIL` to the same Gmail address

# VeKay Solar CRM — Environment Variables

## Variables read by the API server

| Variable | Where used | Required? | Default if missing |
|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `db.ts`, `sheets.ts`, `sheets-projects.ts` | **Required** | throws error |
| `GOOGLE_SPREADSHEET_ID` | `db.ts` — main CRM data spreadsheet | **Required** | `1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0` |
| `SESSION_SECRET` | `app.ts` — session middleware signing key | **Required** | `greenpass-crm-secret-2024` (insecure fallback) |
| `GMAIL_APP_PASSWORD` | `email.ts` — sends all customer/coordinator emails | Optional | emails silently skipped |
| `REPLIT_DOMAINS` | `app.ts` CORS, quotation/closure callback URLs | Auto (Replit) | localhost fallback |
| `NODE_ENV` | `app.ts` — cookie secure/sameSite settings | Auto (Replit) | `development` |
| `SPREADSHEET_ID` | `sheets.ts` — the reporting Google Sheet | Optional | `1JYme4ZM2fJ7b5IslotbnkLR4KmLKQVxu1o7fHwXITqA` |
| `SHEET_NAME` | `sheets.ts` — tab name inside the reporting sheet | Optional | `Complaints ` |
| `SENDER_EMAIL` | `email.ts`, `push.ts` VAPID contact email | Optional | `info.vekay@gmail.com` |
| `PASSWORD_SALT` | `auth.ts` — salt appended before SHA-256 hashing | Optional | `vekay_salt_2024` |
| `VAPID_PUBLIC_KEY` | `push.ts` — web push notifications | Optional | hardcoded key |
| `VAPID_PRIVATE_KEY` | `push.ts` — web push notifications | Optional | hardcoded key |
| `DRIVE_FOLDER_ID` | `sheets-projects.ts` — Google Drive upload destination | Optional | Drive root folder |
| `COMPANY_NAME` | `reports.ts` — Excel file metadata | Optional | `VeKay Solar` |
| `COMPANY_TAGLINE` | Email templates | Optional | — |
| `BASE_PATH` | `quotation.ts`, `closure.ts` — callback URL prefix | Auto (Replit) | `""` |
| `LOG_LEVEL` | `logger.ts` — pino log level | Optional | `info` |

---

## Currently set as Replit Secrets

| Secret | Status |
|---|---|
| `GMAIL_APP_PASSWORD` | Set |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Set |
| `NEON_DATABASE_URL` | Set — **no longer used, safe to delete** |
| `SESSION_SECRET` | Set |

Replit also auto-injects: `REPLIT_DOMAINS`, `NODE_ENV`, `BASE_PATH`, `PORT`

---

## Actions recommended

### Delete (no longer needed after Sheets migration)
- `NEON_DATABASE_URL` — PostgreSQL is removed; nothing reads this
- `DATABASE_URL` / `PGHOST` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` / `PGPORT` — same reason

### Add (optional but recommended)
- `GOOGLE_SPREADSHEET_ID` — currently falls back to the hardcoded default; making it an explicit secret lets you swap spreadsheets without a code change

### Already working with defaults
- `PASSWORD_SALT` — defaulting to `vekay_salt_2024`; fine for dev/demo, set explicitly in production
- `SENDER_EMAIL` — defaulting to `info.vekay@gmail.com`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — hardcoded fallbacks work; regenerate for production

---

## Two spreadsheets in use

| Spreadsheet ID | Purpose |
|---|---|
| `1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0` | **Main CRM database** — Admins, Staff, Complaints, Projects, Customers, Sessions tabs |
| `1JYme4ZM2fJ7b5IslotbnkLR4KmLKQVxu1o7fHwXITqA` | **Reporting sheet** — formatted complaints view, synced after every change |
| `1i0X8Ypvsmn3fODeBdwsU620W8Xr3axnqO4ZWg1remXE` | **Projects reporting sheet** — formatted project tracker, synced on project save |

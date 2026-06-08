# VeKay Solar CRM — Missing Details Report

This document covers everything that was not included in the main system report. It follows the same format and can be read alongside `project-report.md`.

---

## 1. Google Drive PDF Storage

When a quotation is ready for a solar project, the admin uploads a PDF file for it. That PDF does not stay on the server — it is uploaded to **Google Drive** and stored permanently there.

### How it works step by step

1. Admin opens a project in the admin portal and attaches a quotation PDF
2. The browser sends the PDF as a base64 string to the server
3. The server decodes the base64 back into a binary buffer
4. The server connects to Google Drive using the same service account credentials (`GOOGLE_SERVICE_ACCOUNT_JSON`) with Drive API scope
5. The file is uploaded into a specific Google Drive folder identified by the `DRIVE_FOLDER_ID` environment variable
6. After upload, the server immediately makes the file publicly readable (anyone with the link can view it)
7. Google Drive returns a unique file ID (a string like `1A2B3C4D5E6F...`)
8. That file ID is saved into the `quotation_file_id` field of the project row in Google Sheets
9. The final viewable URL is constructed as: `https://drive.google.com/file/d/<fileId>/view`

### Important setup requirement

The Google Drive folder must be **manually shared** with the service account's email address before it will work. Service accounts do not have their own Drive storage — they can only upload to folders that a real Google account owns and has given them Editor access to. If `DRIVE_FOLDER_ID` is not set, the server throws an error and the quotation upload fails.

### When a quotation is deleted or replaced

If a new PDF is uploaded to replace an old one, the server also **deletes the old file from Drive** using the stored file ID. If the deletion fails (e.g. the file was already manually deleted), the server logs a warning but does not crash.

### Fields involved in the project row

| Field | What it stores |
|---|---|
| `quotation` | The human-readable quotation number (e.g. "Q-2025-001") |
| `quotation_file_id` | The Google Drive file ID of the uploaded PDF |
| `quotation_token` | One-time token sent to the coordinator for approval |
| `quotation_client_token` | One-time token sent to the client (customer) for approval |

---

## 2. Media and File Upload System (Complaint Attachments)

Customers can attach photos or documents to their complaints — for example, a photo of a damaged solar panel or a faulty inverter readout.

### How files get onto the server

1. Customer selects a file on the complaint form
2. The browser reads the file and converts it to a **base64 encoded string**
3. The browser sends a POST request to `/api/media/upload` with three fields: `filename`, `mimeType`, and `data` (the base64 string)
4. The server decodes the base64 back to raw binary
5. The server generates a safe, randomised filename to prevent collisions and path traversal attacks. Format: `<timestamp_ms>-<random_5chars>.<original_extension>` (e.g. `1749295200000-x8k3f.jpg`)
6. The file is written to the `uploads/` folder on the server's local disk
7. The server responds with the URL where the file can be accessed: `/api/media/files/<safeFilename>`
8. That URL is stored in the `media_urls` field of the complaint in Google Sheets

### How files are served back

Anyone with the URL can fetch the file via `GET /api/media/files/:filename`. The server checks that the filename does not contain `..` (to prevent directory traversal attacks), then sends the file directly. PDFs are served with `Content-Type: application/pdf` and `Content-Disposition: inline` so they open in the browser rather than downloading.

### Where files live on disk

All uploaded files go into a folder called `uploads/` at the root of the API server's working directory. This folder is created automatically on first startup if it doesn't exist.

### Limitation

Files stored on the server's local disk are **not backed up** to any cloud storage. If the server is reset or restarted in a fresh environment, uploaded media files would be lost (though the complaint record in Google Sheets would still have the now-broken URL stored in `media_urls`).

---

## 3. DRIVE_FOLDER_ID — Required Environment Variable

This variable was missing from the main report's environment variable table.

| Variable | Purpose |
|---|---|
| `DRIVE_FOLDER_ID` | ID of the Google Drive folder where quotation PDFs are uploaded |

### Full environment variable table (corrected and complete)

| Variable | Purpose | Required |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON credentials for the service account (accesses Sheets and Drive) | Yes |
| `GOOGLE_SPREADSHEET_ID` | ID of the main CRM spreadsheet | Yes |
| `SESSION_SECRET` | Secret used to sign session cookies | Yes |
| `GMAIL_APP_PASSWORD` | Gmail app password for sending all outgoing emails | No (emails skipped if missing) |
| `SPREADSHEET_ID` | ID of the complaints reporting/formatting sheet | No (has a default) |
| `DRIVE_FOLDER_ID` | Google Drive folder ID for quotation PDF uploads | Yes (if using quotations) |
| `PASSWORD_SALT` | Salt string appended before password hashing | No (defaults to `vekay_salt_2024`) |
| `SENDER_EMAIL` | From address on all outgoing emails | No (defaults to `info.vekay@gmail.com`) |
| `COMPANY_NAME` | Company name used in email templates | No (defaults to `GreenPass Technologies`) |
| `COMPANY_TAGLINE` | Tagline shown in email headers | No (defaults to `Kerala's Leading Solar Project Expert`) |
| `VAPID_PUBLIC_KEY` | Public key for web push notifications | Yes (if using push notifications) |
| `VAPID_PRIVATE_KEY` | Private key for web push notifications | Yes (if using push notifications) |

---

## 4. Activity Log and Stage Log Format

Both the `activity_log` and `stage_log` fields in the Projects tab of Google Sheets look like plain text from the outside but are actually **JSON arrays stored as a string inside one spreadsheet cell**.

### Structure of each log entry

Every log entry is a JSON object with exactly three fields:

```json
{
  "ts": "07 Jun 25, 10:30 AM",
  "actor": "admin",
  "text": "Stage WIRING marked as complete"
}
```

- `ts` — the timestamp when the change happened, formatted in IST (Indian Standard Time)
- `actor` — who made the change (admin username, coordinator name, or "system")
- `text` — a plain-English description of what changed

### How entries are added

New entries are always **prepended** to the front of the array (newest first). The server reads the existing log string, parses it as JSON, adds the new entry to position zero, and writes the whole thing back as a string. If the existing value cannot be parsed as JSON, it is treated as empty and a fresh array is started.

### The two different logs in a project

| Field | What gets logged in it |
|---|---|
| `activity_log` | Every significant change to the project — field edits, quotation events, closure events, coordinator decisions |
| `stage_log` | Only stage-related events — which stage was checked or unchecked and when |

Both logs are displayed to the admin in the project detail page, newest entry at the top.

---

## 5. IST Timezone Handling

The system is designed specifically for a Kerala-based company, so all timestamps shown to users are in **Indian Standard Time (IST), which is UTC+5:30**.

### What is stored vs what is shown

**Stored in Google Sheets:** All `created_at`, `updated_at`, `completed_at` timestamps are stored as **UTC ISO 8601 strings** (e.g. `2025-06-07T04:30:00.000Z`). This is the raw machine format — always consistent, never ambiguous.

**Shown to users:** Every time a timestamp is displayed — in an email, in an Excel export, in an activity log entry, in the daily report — it is converted to IST before display (e.g. `07 June 2025, 10:00 AM IST`).

### Activity log timestamps

Activity log entries are an exception — they store their timestamp already formatted in IST (e.g. `07 Jun 25, 10:30 AM`) rather than as a UTC ISO string. This is because the log is meant to be human-readable directly inside the spreadsheet as well.

### Email timestamps

All timestamps in customer emails are formatted using the `en-IN` locale with `timeZone: "Asia/Kolkata"` and include the suffix `IST` so the customer knows exactly which timezone they are reading.

---

## 6. Session Cookie Security Settings

The session cookie behaves differently depending on which environment the server is running in:

| Setting | Development | Production |
|---|---|---|
| `sameSite` | `lax` | `none` |
| `secure` | `false` | `true` |
| `httpOnly` | `true` | `true` |

In **development**, `sameSite: lax` allows the cookie to be sent with normal browser navigations. The `secure: false` flag means the cookie works over plain HTTP, which is fine for local development.

In **production**, the app runs behind Replit's HTTPS reverse proxy. The browser and the backend are on different subdomains of the same domain, so the cookie needs `sameSite: none` to be sent cross-origin, and `secure: true` is required by browsers whenever `sameSite: none` is used (browsers refuse to set a `none` cookie over plain HTTP).

If you ever see login sessions not persisting after deployment, this cookie configuration is the first thing to check.

---

## 7. The Seed Script

When setting up the system for the first time with a brand-new Google Spreadsheet, someone needs to create all the tab headers and insert the default admin and technician accounts. This is done by running the seed script.

### How to run it

```bash
pnpm --filter @workspace/scripts run seed-sheets
```

### What it does

1. Connects to the main CRM spreadsheet using the service account credentials
2. Writes the correct header row into each tab (Admins, Staff, Complaints, Projects, Customers, Sessions) if headers are not already present
3. Creates the default admin account: username `admin`, password `admin123`
4. Creates three default technician accounts: `rajesh_k` / `tech123`, `suresh_m` / `tech456`, `anoop_v` / `tech789`
5. All passwords are hashed before being written (same SHA-256 + salt process as the login system)

The seed script is idempotent in header setup — it checks whether the first cell of each tab already contains a known header value before writing, so it is safe to run multiple times without duplicating headers. However, it will add duplicate user rows if run more than once, so it should only be run on a fresh spreadsheet.

---

## 8. OpenAPI Code Generation Pipeline

The frontend does not make raw `fetch` calls to the API. Instead, the entire API contract is defined in a single YAML file and the frontend code is **automatically generated** from it.

### The source of truth

`lib/api-spec/openapi.yaml` defines every API endpoint, every request body shape, every response shape, and every data type. This file is the contract between the backend and the frontend — if they ever disagree, this file wins.

### The generation step

Running this command regenerates all frontend code from the YAML:

```bash
pnpm --filter @workspace/api-spec run codegen
```

It uses a tool called **Orval** to read the OpenAPI spec and produce:
- **React Query hooks** for every endpoint (e.g. `useGetComplaints()`, `useCreateComplaint()`)
- **Zod validation schemas** for every request and response type
- **TypeScript type definitions** for everything

These generated files live in `lib/api-client-react/` and `lib/api-zod/`.

### Why this matters

If a backend developer adds a new field to an API response, they update `openapi.yaml`, run codegen, and the frontend automatically gets a hook that includes the new field — no manual frontend code change needed. If codegen is not run after changing the spec, the frontend will use outdated hooks and types, which causes TypeScript errors and potentially incorrect behaviour at runtime.

### Backend uses it too

The backend also imports from the generated Zod schemas (`@workspace/api-zod`) to validate incoming request bodies. This means the same schema definition validates both what the frontend sends and what the backend accepts — a single change to `openapi.yaml` keeps both sides in sync.

---

## 9. The `urgency_color` Precomputed Field

Every complaint in the Complaints tab has two urgency-related fields:

| Field | Example value |
|---|---|
| `urgency` | `"critical"` |
| `urgency_color` | `"#7f1d1d"` |

The `urgency_color` field stores a **precomputed hex colour string** that corresponds to the urgency level. It is calculated once when urgency is set or changed and saved directly into the sheet row, so that the frontend and email templates can use the colour without needing any lookup logic.

### The colour mapping

| Urgency | Hex colour | Appearance |
|---|---|---|
| `critical` | `#7f1d1d` | Very dark red |
| `high` | `#dc2626` | Bright red |
| `medium` | `#f97316` | Orange |
| `low` | `#3b82f6` | Blue |
| (unset) | `#6b7280` | Grey |

This value is used in:
- The daily email report (urgency badge background colour)
- The Excel export (cell fill colour for the urgency column)
- The technician map (pin colour)

---

## 10. The `quotation_client_token` Field

The main report only explained the **coordinator** approval flow for quotations. There is actually a second token for a separate approval step — the **client** (the customer).

### Two separate approvals

| Token | Who uses it | Purpose |
|---|---|---|
| `quotation_token` | Coordinator (internal company person) | Internal company approval of the quotation |
| `quotation_client_token` | Client (the customer) | Customer's formal acceptance of the quote |

Both tokens work the same way — a unique one-time random string is generated, saved to the project row, embedded into an approval link in an email, and cleared after the recipient clicks Approve or Reject.

### Stage gate

The project's quotation stages are locked behind these approvals. Stage 0 (the very first installation stage — Material Delivery) can only be unlocked after the client has approved the quotation (`CLIENT_APPROVED` status). This prevents any installation work from starting before the customer has formally agreed to the price.

### Status progression

The `quotation` status field in a project row moves through these states:

```
(empty)
  → SUBMITTED          (admin submits quotation number and PDF)
  → COORDINATOR_APPROVED / COORDINATOR_REJECTED
  → CLIENT_SENT        (approval link sent to client)
  → CLIENT_APPROVED / CLIENT_REJECTED
```

Only when `CLIENT_APPROVED` is reached can the admin begin checking off installation stages.

---

## 11. The ProtectedRoute Component — What Happens Without Login

On the frontend, certain pages are wrapped in a `ProtectedRoute` component that checks whether the user is logged in before rendering the page.

### How it works

1. When a protected page loads, it calls `useAuth()` which runs a `GET /api/auth/me` request to check the current session
2. While waiting for the response, a loading spinner is shown
3. If the session check comes back with a valid user of the correct role (`admin` or `technician`), the page renders normally
4. If the session check returns no user (not logged in, or session expired), the component **immediately redirects** to the appropriate login page:
   - Admin pages → redirect to `/admin/login`
   - Technician pages → redirect to `/tech/login`
5. If the user is logged in but has the wrong role (e.g. a technician tries to access an admin page), they are also redirected to the login page

### Session expiry

Sessions are stored in memory and have no hard expiry time set — they last until the server restarts or the user logs out. A server restart (e.g. after a code deployment) logs everyone out and all users must log in again.

### Public pages

The complaint submission form (`/`) and ticket tracking page (`/track/:ticketId`) are completely public and have no `ProtectedRoute` wrapper. Anyone can access them without a session.

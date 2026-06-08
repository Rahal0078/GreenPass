# VeKay Solar CRM — Complete Setup & Handover Guide

---

## 1. What This System Is

A full-stack complaint management system for **VeKay Solar**, a solar installation company in Kerala, India.

Three separate portals:
- **Customer Portal** (`/`) — submit a complaint, get a ticket ID, track status
- **Admin Portal** (`/admin`) — manage complaints, assign technicians, set urgency, download reports, send email
- **Technician Portal** (`/tech`) — map view of assigned jobs, 3-column priority dashboard, complete jobs

---

## 2. Default Login Credentials

> Change these before going live in production.

### Admin
| Username | Password |
|----------|----------|
| `admin`  | `admin123` |

### Technicians
| Username   | Password  | Name     |
|------------|-----------|----------|
| `rajesh_k` | `tech123` | Rajesh K |
| `suresh_m` | `tech456` | Suresh M |
| `anoop_v`  | `tech789`  | Anoop V  |
| `akshay`   | (set in DB) | Akshay  |
| `nehan`    | (set in DB) | Nehan   |
| `rahal`    | (set in DB) | Rahal   |
| `shahsad`  | (set in DB) | Shahsad |
| `swaleeq`  | (set in DB) | Swaleeq |

To change or add technicians: Admin portal → Technicians tab → Add / Edit.

---

## 3. Environment Variables & Secrets

All secrets are stored in **Replit Secrets** (lock icon in the left sidebar of the Replit editor). Never put them in code files.

### Required

| Secret Name       | What It Is                                         | Where to Get It |
|-------------------|----------------------------------------------------|-----------------|
| `DATABASE_URL`    | PostgreSQL connection string (Neon database)       | Replit sidebar → Secrets, already configured. If setting up fresh: create a Neon database at [neon.tech](https://neon.tech), copy the connection string. |
| `SESSION_SECRET`  | Random string used to sign session cookies         | Already set. If resetting: generate any long random string (e.g. 64 random characters). |

### Optional

| Secret Name          | What It Is                                          | Where to Get It |
|----------------------|-----------------------------------------------------|-----------------|
| `GMAIL_APP_PASSWORD` | Gmail App Password for sending daily email reports to `info.vekay@gmail.com` | Google Account → Security → 2-Step Verification → App Passwords. Create an app password for "Mail". Paste the 16-character code here. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account credentials for Sheets integration | Google Cloud Console → IAM → Service Accounts → Create key (JSON). Paste the full JSON content here. |
| `NEON_DATABASE_URL`  | Direct Neon DB URL (used for DB push/migrations)   | Same as DATABASE_URL — copy from Neon dashboard. |

### How to View / Set Secrets in Replit
1. Open your Repl
2. Click the **lock icon (🔒 Secrets)** in the left sidebar
3. Each secret is listed there — click to reveal or edit the value
4. To add a new one: type the name and value, click "Add Secret"

---

## 4. Running the System

### Start All Services
The app runs automatically when you open the Repl. Three workflows run simultaneously:

| Service | Command | Port |
|---------|---------|------|
| API Server | `pnpm --filter @workspace/api-server run dev` | 8080 |
| Frontend (React) | `pnpm --filter @workspace/vekay-solar run dev` | 24488 |
| Component Preview | `pnpm --filter @workspace/mockup-sandbox run dev` | (internal) |

### After Database Changes (schema migrations)
```
pnpm --filter @workspace/db run push
```

### After Changing the API Spec
```
pnpm --filter @workspace/api-spec run codegen
```

### Full Typecheck
```
pnpm run typecheck
```

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24, TypeScript 5.9 |
| Package manager | pnpm workspaces |
| API server | Express 5 + express-session |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| Frontend | React + Vite, Tailwind CSS, Shadcn/ui |
| Routing (frontend) | Wouter |
| Data fetching | React Query (TanStack Query) |
| API codegen | Orval (from OpenAPI spec) |
| Maps | react-leaflet + OpenStreetMap (free, no API key) |
| Excel reports | exceljs |
| Email reports | nodemailer (Gmail SMTP) |
| Build | esbuild (CJS bundle) |

---

## 6. Where Key Files Live

```
lib/
  api-spec/openapi.yaml         ← API contract (source of truth)
  db/src/schema/                ← Database tables (complaints, technicians, admins)

artifacts/
  api-server/src/
    routes/                     ← Express route handlers
    lib/
      auth.ts                   ← Session auth helpers
      email.ts                  ← Nodemailer email reports
      places.ts                 ← Kerala locations (50 places with lat/lng)

  vekay-solar/src/
    pages/
      public/                   ← Customer complaint form + ticket tracking
      admin/                    ← Admin dashboard, complaints, technicians
      tech/                     ← Technician map + 3-column job dashboard
    lib/
      auth-context.tsx          ← Session auth context (useAuth hook)
```

---

## 7. Setting Up on a Fresh Server / New Repl

1. **Clone / fork the Repl** in Replit
2. **Set all secrets** (Section 3 above) in Replit Secrets
3. **Push database schema**:
   ```
   pnpm --filter @workspace/db run push
   ```
4. The workflows start automatically — the app is live

### To deploy to production (public URL):
- Click **Deploy** (rocket icon) in the Replit sidebar
- Replit creates a `.replit.app` domain (e.g. `vekay-solar.replit.app`)
- All secrets carry over automatically

---

## 8. Email Reports

- Daily reports go to: **info.vekay@gmail.com**
- Requires `GMAIL_APP_PASSWORD` secret to be set
- Triggered from Admin portal → Reports → Send Email
- Also available as an Excel download (no email required)

### Setting Up Gmail App Password:
1. Log in to the Gmail account (`info.vekay@gmail.com`)
2. Go to **Google Account → Security → 2-Step Verification** (must be enabled)
3. Scroll down to **App Passwords**
4. Select app: Mail, device: Other (type "VeKay CRM") → Generate
5. Copy the 16-character password → paste into Replit Secret `GMAIL_APP_PASSWORD`

---

## 9. Map (No API Key Needed)

The map uses **OpenStreetMap tiles via react-leaflet** — completely free, no API key required, no billing.

Customer locations are auto-filled from 50 built-in Kerala place names with coordinates (`places.ts`). Technician live location uses the browser's native GPS.

---

## 10. Urgency Colours (Reference)

| Urgency  | Colour |
|----------|--------|
| Critical | Red    |
| High     | Orange |
| Medium   | Amber  |
| Low      | Green  |

---

## 11. Support / Access

| Role | URL path | Login |
|------|----------|-------|
| Customer | `/` | No login needed |
| Admin | `/admin` | Username + password |
| Technician | `/tech` | Username + password |

---

*Generated: June 2026 — VeKay Solar CRM*

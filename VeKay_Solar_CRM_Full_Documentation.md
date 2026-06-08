# VeKay Solar CRM — Full System Documentation
### GreenPass Technologies · Kerala, India

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Credentials & Secrets](#2-credentials--secrets)
3. [How to Run & Deploy](#3-how-to-run--deploy)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Email System](#6-email-system)
7. [Frontend Pages & Design](#7-frontend-pages--design)
8. [Technician Dashboard — 3-Column Layout](#8-technician-dashboard--3-column-layout)
9. [Map System](#9-map-system)
10. [Kerala Places Data](#10-kerala-places-data)
11. [Excel & Email Reports](#11-excel--email-reports)
12. [Design System (Colours, Icons, Urgency)](#12-design-system)
13. [Key Scripts Reference](#13-key-scripts-reference)
14. [File Structure](#14-file-structure)
15. [Setup on a New Machine / Fresh Repl](#15-setup-on-a-new-machine--fresh-repl)

---

## 1. System Overview

VeKay Solar CRM is a full-stack complaint management system for a solar installation company operating across Kerala, India. The brand name used in emails and reports is **GreenPass Technologies**.

### Three Portals

| Portal | URL Path | Who Uses It | Login Required |
|--------|----------|-------------|---------------|
| Customer Portal | `/` | Customers | No |
| Admin Portal | `/admin` | Office staff / managers | Yes (admin account) |
| Technician Portal | `/tech` | Field technicians | Yes (technician account) |

### Complaint Lifecycle

```
Customer submits → open
Admin assigns urgency + technician → in_progress
Technician marks "going" → going
Technician marks "reached" → reached
Technician completes job → resolved
Admin closes record → closed
(Any stage can be put) → on_hold
```

---

## 2. Credentials & Secrets

### Default Login Accounts

> **Change these before going to production!**

#### Admin Account
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Portal | `/admin` |

#### Technician Accounts
| Username | Password | Name |
|----------|----------|------|
| `rajesh_k` | `tech123` | Rajesh K |
| `suresh_m` | `tech456` | Suresh M |
| `anoop_v` | `tech789` | Anoop V |
| `akshay` | (set in DB) | Akshay |
| `nehan` | (set in DB) | Nehan |
| `rahal` | (set in DB) | Rahal |
| `shahsad` | (set in DB) | Shahsad |
| `swaleeq` | (set in DB) | Swaleeq |

To add or change technician passwords: Admin Portal → Technicians tab → Edit.

---

### Environment Secrets

All secrets live in **Replit Secrets** (lock icon 🔒 in the left sidebar). Never put them in code.

#### Required Secrets

| Secret Name | What It Does | How to Get It |
|-------------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string — the app reads all complaints, technicians, admins from this database | Already set in Replit. Fresh setup: create a database at [neon.tech](https://neon.tech) → Connection Details → copy "Connection string" |
| `SESSION_SECRET` | Signs browser session cookies so login sessions are secure | Already set. Fresh setup: generate any 40+ character random string (e.g. `openssl rand -hex 32` in terminal) |

#### Optional Secrets

| Secret Name | What It Does | How to Get It |
|-------------|-------------|---------------|
| `GMAIL_APP_PASSWORD` | Sends automated emails (complaint registered, technician assigned, on the way, arrived, resolved, daily report) to/from `info.vekay@gmail.com` | Google Account → Security → 2-Step Verification (must be ON) → App Passwords → Create one called "VeKay CRM" → copy the 16-character code |
| `NEON_DATABASE_URL` | Direct Neon connection used during schema migrations (`pnpm --filter @workspace/db run push`) | Same value as DATABASE_URL — copy from Neon dashboard |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Allows syncing complaint data to a Google Sheet | Google Cloud Console → IAM & Admin → Service Accounts → Create key → JSON → paste entire JSON content |

#### How to View/Set Secrets in Replit
1. Click the **lock icon (Secrets)** in the left sidebar
2. All secrets are listed — click any to view or edit
3. To add: enter the Name and Value → click "Add Secret"
4. Secrets are available as `process.env.SECRET_NAME` in the server code

---

## 3. How to Run & Deploy

### Running in Development (Replit)

The three workflows start automatically when you open the Repl:

| Workflow | Command | Port | What It Does |
|---------|---------|------|-------------|
| API Server | `pnpm --filter @workspace/api-server run dev` | 8080 | Express API, session auth, DB queries |
| Frontend | `pnpm --filter @workspace/vekay-solar run dev` | 24488 | React + Vite dev server |
| Component Preview | `pnpm --filter @workspace/mockup-sandbox run dev` | (internal) | UI mockup preview only |

All traffic goes through a shared reverse proxy at port 80:
- `/api/*` → API Server (port 8080)
- `/` and everything else → Frontend (port 24488)

### Useful Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Push database schema changes (dev only — never on prod)
pnpm --filter @workspace/db run push

# Regenerate API hooks after changing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Build everything (used by deployment)
pnpm run build

# Typecheck only the frontend
pnpm --filter @workspace/vekay-solar run typecheck

# Typecheck only the API server
pnpm --filter @workspace/api-server run typecheck
```

### Deploying to Production

1. Click the **Deploy** (rocket 🚀) icon in Replit sidebar
2. Replit builds and hosts the app at a `.replit.app` domain
3. All Replit Secrets carry over to production automatically
4. In production, the API server also serves the built frontend (SPA fallback)
5. Session cookies use `sameSite: none; Secure` in production (required for cross-origin)

---

## 4. Database Schema

The database is PostgreSQL (hosted on Neon). Three main tables.

### `complaints` table

```sql
id                   SERIAL PRIMARY KEY
ticket_id            TEXT UNIQUE NOT NULL          -- e.g. "VKS-1234"
customer_name        TEXT NOT NULL
customer_phone       TEXT NOT NULL                 -- Indian mobile number
customer_email       TEXT NOT NULL
kseb_consumer_number TEXT                          -- optional KSEB ID
place_name           TEXT NOT NULL                 -- Kerala location name
district             TEXT NOT NULL
pincode              TEXT NOT NULL
address              TEXT NOT NULL
lat                  REAL                          -- latitude (nullable)
lng                  REAL                          -- longitude (nullable)
location_source      TEXT                          -- "gps" or "map"
complaint_type       TEXT NOT NULL                 -- "Panel Issue", "Inverter", etc.
description          TEXT NOT NULL
media_urls           TEXT                          -- JSON array of image URLs
status               TEXT NOT NULL DEFAULT 'open'  -- open/in_progress/going/reached/on_hold/resolved/closed
urgency              TEXT NOT NULL DEFAULT 'low'   -- critical/high/medium/low
urgency_color        TEXT                          -- hex color matching urgency
technician_id        INTEGER                       -- FK → technicians.id
pending_technician_ids TEXT                        -- JSON array of tech IDs (broadcast)
admin_notes          TEXT
completion_notes     TEXT                          -- filled by technician on job done
scheduled_date       TEXT                          -- ISO date string
completed_at         TIMESTAMPTZ
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `technicians` table

```sql
id            SERIAL PRIMARY KEY
username      TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL          -- bcrypt hash
name          TEXT NOT NULL
phone         TEXT NOT NULL
area          TEXT NOT NULL          -- service area / district
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `admins` table

```sql
id            SERIAL PRIMARY KEY
username      TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL          -- bcrypt hash
name          TEXT NOT NULL
email         TEXT NOT NULL
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `session` table (auto-created by connect-pg-simple)

```sql
sid     VARCHAR PRIMARY KEY
sess    JSON
expire  TIMESTAMP
```

---

## 5. API Endpoints

Base path: `/api`

All routes use Express session auth. Endpoints marked **[Auth]** require a logged-in session.

### Auth Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/auth/login` | Public | Login for admin or technician (auto-detects role) |
| POST | `/api/auth/admin/login` | Public | Admin-specific login |
| POST | `/api/auth/technician/login` | Public | Tech-specific login |
| POST | `/api/auth/logout` | Public | Destroy session |
| GET | `/api/auth/me` | [Auth] | Get current logged-in user info |

**Login request body:**
```json
{ "username": "admin", "password": "admin123" }
```
**Login response:**
```json
{ "id": 1, "username": "admin", "name": "Admin", "role": "admin" }
```

---

### Complaint Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/complaints` | [Auth] | List all complaints (filterable by `?status=`, `?urgency=`, `?technicianId=`) |
| POST | `/api/complaints` | Public | Create new complaint (returns ticket ID) |
| GET | `/api/complaints/:id` | [Auth] | Get single complaint by ID |
| GET | `/api/complaints/ticket/:ticketId` | Public | Track by ticket ID |
| PATCH | `/api/complaints/:id` | [Auth] | Update urgency, status, technician assignment |
| POST | `/api/complaints/:id/complete` | [Auth: tech] | Mark complaint resolved with notes |

**Create complaint body:**
```json
{
  "customerName": "Ravi Kumar",
  "customerPhone": "9876543210",
  "customerEmail": "ravi@email.com",
  "ksebConsumerNumber": "1234567890123",
  "placeName": "Palai",
  "district": "Kottayam",
  "pincode": "686575",
  "address": "Near Church, Palai",
  "lat": 9.7051,
  "lng": 76.7831,
  "locationSource": "gps",
  "complaintType": "Panel Issue",
  "description": "Panels not charging properly after rains",
  "scheduledDate": "2026-06-10"
}
```

**Update complaint body (admin):**
```json
{
  "urgency": "high",
  "technicianId": 4,
  "status": "in_progress",
  "adminNotes": "Urgent — customer solar feed is down",
  "scheduledDate": "2026-06-05"
}
```

**Complete complaint body (technician):**
```json
{ "completionNotes": "Replaced faulty MC4 connector. System restored." }
```

---

### Technician Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/technicians` | [Auth] | List all technicians |
| POST | `/api/technicians` | [Auth: admin] | Create new technician |
| GET | `/api/technicians/:id` | [Auth] | Get technician by ID |
| PATCH | `/api/technicians/:id` | [Auth: admin] | Update technician |
| DELETE | `/api/technicians/:id` | [Auth: admin] | Deactivate technician |
| GET | `/api/technicians/:id/map` | [Auth: tech] | Get all assigned complaints as map pins |

**Map pin response shape:**
```json
{
  "complaintId": 42,
  "ticketId": "VKS-8271",
  "customerName": "Ravi Kumar",
  "placeName": "Palai",
  "address": "Near Church, Palai",
  "lat": 9.7051,
  "lng": 76.7831,
  "urgency": "high",
  "urgencyColor": "#dc2626",
  "status": "in_progress",
  "complaintType": "Panel Issue",
  "createdAt": "2026-06-01T08:30:00.000Z",
  "isPending": false,
  "customerPhone": "9876543210",
  "scheduledDate": null
}
```

---

### Other Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/places/search?q=palai` | Public | Search Kerala place names (autocomplete) |
| GET | `/api/reports/excel` | [Auth: admin] | Download daily Excel report (file stream) |
| POST | `/api/reports/email` | [Auth: admin] | Send daily report by email |
| GET | `/api/dashboard` | [Auth: admin] | Dashboard stats (counts, charts data) |
| GET | `/api/customers` | [Auth: admin] | List unique customers |
| GET | `/api/health` | Public | Health check |

---

## 6. Email System

Emails are sent using **nodemailer** via Gmail SMTP.

- **From:** `info.vekay@gmail.com` ("GreenPass Technologies")
- **Requires:** `GMAIL_APP_PASSWORD` secret set
- **If not set:** emails are silently skipped (app still works fine)

### Automatic Emails Sent

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| New complaint created | Customer | "Complaint Registered Successfully" |
| Technician assigned | Customer | "Technician Assigned to Your Complaint" |
| Technician marks "going" | Customer | "Your Technician is On the Way" |
| Technician marks "reached" | Customer | "Technician Has Arrived at Your Location" |
| Job completed | Customer | "Your Complaint Has Been Resolved" |
| Admin triggers daily report | `info.vekay@gmail.com` | "Daily Complaint Report — [date]" |

### Email Progress Bar (shown in customer emails)

```
[✓] Registered → [✓] Assigned → [🔵] On the Way → [ ] Resolved
```
The active step is highlighted; completed steps show a green tick.

### Setting Up Gmail App Password

1. Sign in to `info.vekay@gmail.com`
2. Go to **Google Account → Security**
3. Enable **2-Step Verification** (required)
4. Click **App Passwords** → Select app: Mail → Device: Other → name it "VeKay CRM"
5. Google shows a 16-character code (e.g. `abcd efgh ijkl mnop`)
6. Copy it to Replit Secret `GMAIL_APP_PASSWORD` (no spaces)

---

## 7. Frontend Pages & Design

Built with **React + Vite**, styled with **Tailwind CSS + Shadcn/ui**, routed with **Wouter**.

### Page Map

```
/                          → Customer complaint form
/track/:ticketId           → Customer ticket tracking page
/login                     → Shared login (redirects by role)

/admin                     → Admin dashboard (charts, stats)
/admin/complaints          → All complaints list + filters
/admin/complaints/:id      → Complaint detail (assign, urgency, notes)
/admin/technicians         → Technician list
/admin/technicians/:id     → Technician detail + their jobs
/admin/customers           → Customer list
/admin/customers/:id       → Customer history
/admin/reports             → Excel download + email report

/tech                      → Technician dashboard (map + 3-column job list)
/tech/complaints/:id       → Job detail + complete button
/tech/login                → Technician login
```

### Auth Flow

- Session is stored in PostgreSQL (via `connect-pg-simple`)
- On app load, `GET /api/auth/me` is called to restore session
- `useAuth()` hook (from `src/lib/auth-context.tsx`) exposes `{ user, isLoading, login, logout }`
- Admin pages redirect to `/admin/login` if not authenticated as admin
- Tech pages redirect to `/tech/login` if not authenticated as technician

---

## 8. Technician Dashboard — 3-Column Layout

The technician dashboard (`/tech`) is split into two zones:

### Zone 1 — Map (top 42% on mobile, left half on desktop)
- **react-leaflet** with OpenStreetMap tiles (no API key)
- Shows a blue dot for technician's GPS location
- Shows coloured map pins for each job (colour matches urgency)
- Pin letter = first letter of urgency (C/H/M/L), `?` for unassigned broadcast jobs
- Clicking a pin → popup with name, distance, navigate button, View Job button
- Locate button (bottom-right) refreshes GPS position

### Zone 2 — 3-Column Panel (bottom 58% on mobile, right side on desktop)

Three equal-width columns, all scrollable independently. Tap any card → job detail page. No action buttons on cards.

#### LEFT COLUMN — Priority (by urgency)
- **Content:** All active + pending jobs
- **Sorted:** Critical → High → Medium → Low. Within same urgency: nearest first (if location known)
- **Cards show:** Urgency badge (C/H/M/L coloured pill), distance (km), customer name, place name
- **Border colour:** Red for Critical, Orange for High, Amber for Medium, Green for Low

#### CENTRE COLUMN — On Hold
- **Content:** All on-hold jobs only
- **Sorted:** Oldest hold date first (longest-waiting complaint is at the top)
- **Cards show:** HOLD badge, hold date & time (or date range if resume date is set), customer name, distance
- **Style:** Orange-tinted cards

#### RIGHT COLUMN — Nearest
- **Content:** All active + pending jobs (same pool as left)
- **Sorted:** Nearest location first (pure distance sort, ignores urgency)
- **Cards show:** Distance (km), customer name, place name, urgency badge
- **Purpose:** Tech can quickly find the physically closest job regardless of priority

#### Locked Job Banner (when going/reached)
A blue full-width banner appears above the 3 columns:
- 🚗 "On the way · [Customer Name] — tap to continue"
- 🏁 "On-site · [Customer Name] — tap to complete"

#### Completed Jobs (collapsed footer)
- Tap "Completed ▾" to expand a list of all resolved/closed jobs
- Shows: customer name, place name
- Sorted newest first

---

### Card Dimensions & Style

```
Each card: ~52–56px tall, full column width
Urgency border: 3px left border (coloured)
Content:
  Row 1: [Urgency pill] [status icon if going/reached] [distance km → right]
  Row 2: Customer name (bold, truncated)
  Row 3: Place name (small grey, truncated)
```

### Urgency Colours

| Level | Dot / Border | Pill | Status |
|-------|-------------|------|--------|
| Critical | `#ef4444` red | `bg-red-100 text-red-700` | Most urgent — same-day fix |
| High | `#f97316` orange | `bg-orange-100 text-orange-700` | Urgent |
| Medium | `#f59e0b` amber | `bg-amber-100 text-amber-700` | Standard |
| Low | `#22c55e` green | `bg-green-100 text-green-700` | Can wait |

---

## 9. Map System

### Library
`react-leaflet` + `leaflet` with OpenStreetMap tiles — **completely free, no API key**.

### Custom Map Pins (SVG)

Each pin is a custom SVG teardrop shape:
- Fill colour = urgency colour
- Letter in the centre = first letter of urgency (`C`, `H`, `M`, `L`) or `?` for unassigned
- White inner circle with coloured letter
- Drop shadow

Technician position pin: blue filled circle with white target ring.

### Distance Calculation

Uses the **Haversine formula** (great-circle distance between two GPS coordinates):

```typescript
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 10. Kerala Places Data

50 built-in Kerala locations with GPS coordinates, used for:
- Autocomplete when customer types their place name
- Auto-filling district, pincode, address, lat, lng
- Sorting complaints by distance from technician

### Districts Covered
Thiruvananthapuram, Kollam, Pathanamthitta, Alappuzha, Kottayam, Idukki, Ernakulam, Thrissur, Palakkad, Malappuram, Kozhikode, Wayanad, Kannur, Kasaragod

### Sample Places (with coordinates)
| Place | District | Lat | Lng |
|-------|----------|-----|-----|
| Thiruvananthapuram | Thiruvananthapuram | 8.5241 | 76.9366 |
| Kollam | Kollam | 8.8932 | 76.6141 |
| Kochi (Ernakulam) | Ernakulam | 9.9312 | 76.2673 |
| Thrissur | Thrissur | 10.5276 | 76.2144 |
| Kozhikode | Kozhikode | 11.2588 | 75.7804 |
| Palai | Kottayam | 9.7051 | 76.7831 |
| Perinthalmanna | Malappuram | 10.9786 | 76.2271 |
| Tirur | Malappuram | 10.9133 | 75.9210 |

API endpoint: `GET /api/places/search?q=palai` returns matching places.

---

## 11. Excel & Email Reports

### Excel Report
- **Endpoint:** `GET /api/reports/excel` (admin only)
- **Library:** `exceljs`
- **Content:** All complaints with customer info, status, urgency, technician, dates
- **Download:** Admin portal → Reports → Download Excel
- **Note:** Uses direct `fetch` + blob pattern (not a React Query hook) because it streams a file

### Daily Email Report
- **Endpoint:** `POST /api/reports/email` (admin only)
- **To:** `info.vekay@gmail.com`
- **Content:** Summary stats (total, new today, resolved, critical count) + full complaints table
- **Requires:** `GMAIL_APP_PASSWORD` secret
- **Also triggered automatically** on every admin login (saves an Excel backup)

---

## 12. Design System

### Colours

| Purpose | Tailwind Class | Hex |
|---------|---------------|-----|
| Brand green | `text-green-700` | `#15803d` |
| Critical urgency | `border-l-red-500` | `#ef4444` |
| High urgency | `border-l-orange-500` | `#f97316` |
| Medium urgency | `border-l-amber-400` | `#fbbf24` |
| Low urgency | `border-l-green-500` | `#22c55e` |
| On hold | `text-orange-600` | `#ea580c` |
| Going (in transit) | `text-blue-600` | `#2563eb` |
| Completed | `text-green-500` | `#22c55e` |

### Icons Used (lucide-react)

| Icon | Usage |
|------|-------|
| `MapPin` | Location markers in lists |
| `Phone` | Customer phone number |
| `Navigation` | Navigate to job / nearest column header |
| `Locate` | Get GPS location button |
| `Car` | "Going" status (technician on the way) |
| `Flag` | "Reached" status (technician on-site) |
| `PauseCircle` | On-hold jobs |
| `CheckCircle2` | Completed jobs |
| `CalendarDays` | Schedule / hold date |
| `ChevronUp/Down` | Expand/collapse completed section |

### UI Components (Shadcn/ui)

- `Button` — primary actions
- `Badge` — status tags
- `Card` — information panels
- `Dialog` — modals (confirm actions)
- `Select` — dropdowns (urgency, status)
- `Input` — form fields
- `Separator` — section dividers
- `Accordion` — collapsible sections

---

## 13. Key Scripts Reference

All scripts run from workspace root using `pnpm`:

```bash
# ── Development ───────────────────────────────────────────────
pnpm --filter @workspace/api-server run dev        # Start API server
pnpm --filter @workspace/vekay-solar run dev       # Start frontend

# ── Validation ────────────────────────────────────────────────
pnpm run typecheck                                 # Full TS check (libs + all apps)
pnpm --filter @workspace/vekay-solar run typecheck # Frontend only
pnpm --filter @workspace/api-server run typecheck  # Backend only

# ── Database ──────────────────────────────────────────────────
pnpm --filter @workspace/db run push               # Push schema to DB (dev only!)
# WARNING: never run 'push' against production — use SQL migrations instead

# ── API Code Generation ───────────────────────────────────────
pnpm --filter @workspace/api-spec run codegen      # Regenerate React Query hooks + Zod schemas
# Run this every time you change lib/api-spec/openapi.yaml

# ── Build ─────────────────────────────────────────────────────
pnpm run build                                     # Build all (for deployment)
pnpm --filter @workspace/api-server run build      # Build API only

# ── Workspace ─────────────────────────────────────────────────
pnpm install                                       # Install all dependencies
pnpm add -F @workspace/vekay-solar <package>       # Add package to frontend
pnpm add -F @workspace/api-server <package>        # Add package to API server
```

---

## 14. File Structure

```
workspace/
├── pnpm-workspace.yaml          Workspace config, version catalog
├── tsconfig.json                Root TypeScript solution config
├── tsconfig.base.json           Shared strict TS defaults
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml         ← API contract (source of truth)
│   ├── api-client-react/        Generated React Query hooks (DO NOT EDIT)
│   ├── api-zod/                 Generated Zod validation schemas (DO NOT EDIT)
│   └── db/
│       └── src/
│           ├── index.ts         DB connection (Drizzle ORM)
│           └── schema/
│               ├── complaints.ts     complaints table + types
│               ├── technicians.ts    technicians table + types
│               ├── admins.ts         admins table + types
│               └── index.ts          barrel export
│
├── artifacts/
│   ├── api-server/
│   │   └── src/
│   │       ├── app.ts               Express app setup (session, cors, middleware)
│   │       ├── index.ts             Server entry point (starts on PORT)
│   │       ├── routes/
│   │       │   ├── index.ts         Router barrel
│   │       │   ├── auth.ts          Login / logout / me
│   │       │   ├── complaints.ts    Complaint CRUD + complete
│   │       │   ├── technicians.ts   Technician CRUD + map pins
│   │       │   ├── dashboard.ts     Stats for admin charts
│   │       │   ├── reports.ts       Excel download + email report
│   │       │   ├── places.ts        Kerala place search
│   │       │   ├── customers.ts     Customer listing
│   │       │   ├── push.ts          Push notification helpers
│   │       │   └── media.ts         Image upload
│   │       ├── lib/
│   │       │   ├── auth.ts          verifyPassword, hashPassword, generateTicketId
│   │       │   ├── email.ts         All HTML email builders + nodemailer sender
│   │       │   ├── places.ts        50 Kerala places with lat/lng
│   │       │   ├── sheets.ts        Google Sheets sync
│   │       │   └── logger.ts        Pino logger singleton
│   │       └── types/
│   │           └── session.d.ts     Express session type extensions
│   │
│   └── vekay-solar/
│       └── src/
│           ├── App.tsx              Wouter router (all routes)
│           ├── main.tsx             React entry point
│           ├── lib/
│           │   ├── auth-context.tsx  useAuth() hook + AuthProvider
│           │   └── utils.ts          cn() utility
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AdminLayout.tsx
│           │   │   └── TechLayout.tsx
│           │   └── ui/              Shadcn/ui components
│           └── pages/
│               ├── public/
│               │   ├── ComplaintForm.tsx    Customer complaint submission
│               │   └── TrackTicket.tsx      Ticket status tracker
│               ├── admin/
│               │   ├── Login.tsx
│               │   ├── Dashboard.tsx        Charts + stats
│               │   ├── Complaints.tsx       Complaints table
│               │   ├── ComplaintDetail.tsx  Assign + urgency + notes
│               │   ├── Technicians.tsx      Technician list
│               │   ├── TechnicianDetail.tsx
│               │   ├── Customers.tsx
│               │   ├── CustomerDetail.tsx
│               │   └── Reports.tsx          Excel + email reports
│               └── tech/
│                   ├── Login.tsx
│                   ├── Dashboard.tsx        Map + 3-column job panel
│                   └── ComplaintComplete.tsx Job detail + complete form
```

---

## 15. Setup on a New Machine / Fresh Repl

### Step 1 — Fork or Clone

Fork the Repl on Replit.

### Step 2 — Set Secrets

In Replit Secrets (🔒 sidebar), add:

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `NEON_DATABASE_URL` | Same as DATABASE_URL |
| `SESSION_SECRET` | Any random 40+ character string |
| `GMAIL_APP_PASSWORD` | 16-char Gmail App Password (optional) |

### Step 3 — Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

This creates all tables (`complaints`, `technicians`, `admins`, `session`).

### Step 4 — Seed Admin Account

Connect to your database and run:

```sql
-- Password is bcrypt hash of "admin123"
INSERT INTO admins (username, password_hash, name, email)
VALUES (
  'admin',
  '$2b$10$YourBcryptHashHere',  -- generate with hashPassword('admin123')
  'Admin',
  'info.vekay@gmail.com'
);
```

Or use the API server's `hashPassword` utility to generate the hash first.

### Step 5 — Start the App

Workflows start automatically. Visit the preview URL.

### Step 6 — Add Technicians

Log in as admin → Technicians → Add Technician.

---

## Technical Notes & Gotchas

- **Always run codegen after changing openapi.yaml:** `pnpm --filter @workspace/api-spec run codegen`
- **Orval v8:** When using `enabled` in query options, always pass `queryKey: getFooQueryKey(...)` explicitly
- **Excel download:** Uses `fetch` + blob pattern — do NOT use a React Query hook (it streams a file)
- **`useAuth()`:** Import from `@/lib/auth-context`, NOT from `@workspace/api-client-react`
- **Map icon conflict:** `MapPin` from lucide-react conflicts with the API type — import API type as `import type { MapPin as ApiMapPin }` and use `type Pin = ApiMapPin` locally
- **Session cookies:** `sameSite: none + secure` in production, `lax` in development
- **No virtual environments / Docker:** Replit manages the Node.js environment directly via pnpm
- **Neon database:** Use `NEON_DATABASE_URL` for migrations, `DATABASE_URL` for the running app — both can be the same connection string

---

*VeKay Solar CRM · GreenPass Technologies · Kerala, India*
*Documented: June 2026*

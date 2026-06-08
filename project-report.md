# VeKay Solar CRM — Full System Report

---

## What This System Is

VeKay Solar CRM is a full-stack web application built for VeKay Solar, a solar panel installation company operating across Kerala, India. It manages the complete lifecycle of customer complaints — from the moment a customer submits a problem, through technician assignment and field work, all the way to job completion and reporting.

The system has three separate portals that different people use:

1. **Public Portal** — for customers to submit complaints and track them
2. **Admin Portal** — for the office team to manage everything
3. **Technician Portal** — for field engineers to see their jobs on a map and mark them complete

---

## How the System Is Built

The project runs as a monorepo — meaning all the code lives in one place but is split into separate packages that talk to each other.

### The Two Running Applications

**Backend API Server** (`artifacts/api-server`)
- Built with Node.js and Express 5
- Runs on port 8080
- Handles all business logic, data access, emails, push notifications, and file exports
- Written entirely in TypeScript

**Frontend Web App** (`artifacts/vekay-solar`)
- Built with React + Vite
- Runs on port 24488
- All pages are React components
- Uses React Query to fetch data from the API
- Uses Tailwind CSS and Shadcn/ui for the interface

A reverse proxy sits in front of both — anything going to `/api/...` is sent to the backend, everything else goes to the frontend. The user always sees a single domain.

---

## Where Data Lives

### Primary Database — Google Sheets (Main CRM Spreadsheet)

Spreadsheet ID: `1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0`

This is the sole source of truth for all live data. It has six tabs:

| Tab | What it stores |
|---|---|
| **Admins** | Admin accounts — id, username, password hash, name, email |
| **Staff** | Technician accounts — id, username, password hash, name, phone, email, area, active status, roles, push notification subscriptions |
| **Complaints** | Every customer complaint — 27 columns covering customer details, location, complaint type, status, urgency, assigned technician, notes, timestamps |
| **Projects** | Solar installation projects — 25 columns covering customer info, KW rating, payment stages, quotation status, closure status, coordinator, activity log |
| **Customers** | Aggregated customer view (phone, name, email, complaint counts) |
| **Sessions** | Reserved tab (sessions are held in memory, not in Sheets) |

All values in the sheet are stored as plain text strings. Booleans are stored as `"true"` or `"false"`. Arrays (like pending technician IDs or project stages) are stored as JSON strings inside a single cell. Dates are stored as ISO 8601 strings (e.g. `2025-06-07T10:30:00.000Z`).

The server reads and writes to this spreadsheet using the **Google Sheets API v4**, authenticated via a service account whose credentials are stored in the `GOOGLE_SERVICE_ACCOUNT_JSON` environment secret.

Every CRUD operation goes through a central abstraction layer (`src/lib/db.ts`) which provides these functions:
- `getRows(tab)` — reads all rows from a tab and returns them as objects
- `appendRow(tab, data)` — adds a new row, auto-assigns an ID, sets timestamps
- `updateRow(tab, id, updates)` — finds the row by ID and overwrites specific fields
- `deleteRow(tab, id)` — physically removes the row from the sheet
- `findRow(tab, field, value)` — scans all rows and returns the first match

### Secondary Sheet — Complaints Reporting Spreadsheet

Spreadsheet ID: `1JYme4ZM2fJ7b5IslotbnkLR4KmLKQVxu1o7fHwXITqA`

This is a **formatted, human-readable view** of all complaints, meant to be shared with managers or viewed directly in Google Sheets. It is automatically synced every time a complaint is created or updated. It has coloured headers, conditional formatting for urgency levels and statuses, frozen header rows, and auto-resized columns. This sheet is write-only from the CRM's perspective — the CRM never reads from it.

### Third Sheet — Projects Reporting Spreadsheet

Spreadsheet ID: `1i0X8Ypvsmn3fODeBdwsU620W8Xr3axnqO4ZWg1remXE`

A formatted tracker for solar installation projects, with one row per project and columns for all 12 installation stages. It is kept in sync every time a project is saved or updated. It also serves as an import source — admins can pull new project rows from this sheet directly into the CRM.

### Session Storage — In-Memory

User login sessions are stored in the server's memory using `memorystore`. Sessions persist as long as the server is running. They are lost on restart, which means users need to log in again after a server restart. Each session stores: `userId`, `username`, `name`, `role` (admin or technician).

### Excel Backup — Local File

When an admin logs in, the server generates an Excel (.xlsx) file containing all complaint data and saves it to `crm-backup.xlsx` on the server's disk. This file can be downloaded later without regenerating it. It is also available as a fresh download on demand.

---

## How Authentication Works

The system uses **session-based authentication** — no JWT tokens.

**Password storage:** Passwords are never stored in plain text. When a password is set, it is hashed using SHA-256 with a salt appended (`password + salt`). The result is a 64-character hex string stored in the Admins or Staff tab.

**Login flow:**
1. User submits username and password
2. Server looks up the matching row in either Admins or Staff tab
3. Server hashes the submitted password and compares it to the stored hash
4. If they match, the server creates a session and stores the user's ID, name, username, and role
5. A session cookie is sent back to the browser

**Ticket ID generation:** When a customer submits a complaint, the server generates a unique ticket ID in the format `VK-YYYYMMDD-XXXXX` (e.g. `VK-20250607-A3KF2`). The date part is today's date, the last part is a random 5-character alphanumeric string.

**Three roles exist:**
- `admin` — full access to everything
- `technician` — can only see their own assigned jobs and update statuses
- Public (no login) — can only submit complaints and track by ticket ID

---

## The Three Portals

### 1. Public Portal (No Login Required)

**Complaint Submission (`/`)**
A customer fills in a form with their name, phone, email, KSEB consumer number, location, complaint type, description, and optionally a preferred service date. The location field uses a type-ahead search across 50 hardcoded Kerala places — selecting a place auto-fills the district, pincode, address, and GPS coordinates (latitude and longitude). After submission, the customer receives their ticket ID on screen and an email confirmation is sent to them.

**Complaint Tracking (`/track/:ticketId`)**
A customer enters their ticket ID and sees the current status, which technician is assigned, and what notes have been added. This page is public — no login needed.

### 2. Admin Portal (`/admin`)

Admins log in at `/admin/login`. After login, they have access to:

**Dashboard (`/admin`)**
Shows summary counts — total complaints, open, in progress, resolved, critical. Also shows recent activity and a breakdown by urgency level. Shows technician workload (how many jobs each technician has).

**Complaints (`/admin/complaints`)**
A full list of all complaints with filters for status, urgency, and technician. Admins can click any complaint to open its detail page and:
- Change the urgency level (low, medium, high, critical)
- Assign a technician directly (one specific person)
- Send the complaint to multiple technicians for first-to-accept (pending assignment)
- Add admin notes
- Set a scheduled date
- Delete the complaint

**Technicians (`/admin/technicians`)**
List of all field technicians. Admins can create new technician accounts, edit their details (name, phone, area, active status, password), and delete them. Deleting a technician unassigns them from all their current complaints.

**Reports (`/admin/reports`)**
Shows a daily summary report. Admins can select any date and see how many complaints came in that day, how many were resolved, and a full table of all complaints. There is also a button to download the complete complaints database as a formatted Excel file.

**Customers (`/admin/customers`)**
An aggregated view of all customers grouped by phone number. Shows total complaints, open complaints, and resolved complaints per customer. Admins can click through to see all complaints from one customer.

**Projects (`/admin/projects`)**
Manages solar installation projects separately from complaints. Each project has 12 installation stages that are checked off as work progresses. Projects have a quotation approval workflow and a closure approval workflow (explained below).

### 3. Technician Portal (`/tech`)

Technicians log in at `/tech/login`. After login they see:

**Map Dashboard (`/tech`)**
A full-screen interactive map (OpenStreetMap via react-leaflet) showing pins for all complaints assigned to them. Each pin is coloured by urgency — red for critical, orange for high, amber for medium, blue for low. Tapping a pin shows complaint details. There is also a list of "pending" jobs (first-to-accept jobs where the technician has been offered the job but hasn't confirmed yet).

**Complaint Completion (`/tech`)**
From the map, technicians can:
- Mark their status as "On the Way" (triggers an email to the customer)
- Mark their status as "On-site / Reached" (triggers another email)
- Mark the job as complete by writing resolution notes (triggers a completion email)
- Accept pending jobs (first-to-accept race — whoever accepts first gets assigned)

---

## How Data Flows Through the System

### When a Customer Submits a Complaint

1. Customer fills out the form on the website
2. Browser sends a POST request to `/api/complaints`
3. Rate limiter checks: maximum 5 submissions per IP per 15 minutes
4. Server validates the input using Zod schemas
5. Server generates a ticket ID (`VK-YYYYMMDD-XXXXX`)
6. A new row is appended to the **Complaints tab** of the main Google Sheet
7. The response (with the ticket ID) is sent back to the browser immediately
8. In the background (non-blocking), two things happen:
   - A confirmation email is sent to the customer with their ticket ID and complaint details
   - The reporting sheet is updated to include the new complaint

### When an Admin Assigns a Technician

1. Admin opens the complaint in the admin portal and selects a technician
2. Browser sends a PATCH request to `/api/complaints/:id`
3. Server updates the `technician_id` field in the Complaints tab
4. Response is sent back to the browser
5. In the background:
   - Assignment email is sent to the customer (includes technician name and phone number)
   - A push notification is sent to the technician's device
   - The reporting sheet is updated

### When an Admin Uses First-to-Accept Assignment

1. Admin selects multiple technicians for a job
2. The list of technician IDs is stored as a JSON array in the `pending_technician_ids` field (e.g. `[1,2,3]`)
3. All selected technicians receive a push notification: "New job available — first to accept gets assigned"
4. The first technician to tap "Accept" on the map portal sends a POST to `/api/complaints/:id/accept`
5. Server assigns that technician, clears the pending list
6. Customer receives an assignment email

### When a Technician Updates Status (Going / Reached / Complete)

1. Technician taps a button on the map portal
2. Status is updated in the Complaints tab
3. Customer receives an email for each status change:
   - "Going" → customer gets "Your technician is on the way" email
   - "Reached" → customer gets "Technician has arrived" email
   - "Complete" → technician writes notes → customer gets "Job completed" email with resolution notes
4. Completed complaint has a `completed_at` timestamp saved

---

## The Projects Module

Projects are separate from complaints. They represent full solar installation contracts, not service calls.

**Each project tracks:**
- Customer info (name, place, KW rating, phone, KSEB consumer number)
- Financial info (total amount, FL number)
- Coordinator (which staff member is managing it)
- A Google Maps link
- 12 installation stages with checkboxes and timestamps
- Stage remarks and a full stage change log
- A quotation status and closure status
- An activity log (timestamped history of every change made)

**The 12 stages are:**
1. Material Delivery
2. Advance 40%
3. Welding
4. Feasibility
5. Registration Papers (1st submission)
6. Wiring
7. Commissioning
8. Registration Papers (2nd submission)
9. 2nd Payment 50%
10. Deposit Paid
11. Account Cleared 10%
12. Warranty Given

### Quotation Approval Workflow

When a quotation is ready:
1. Admin enters the quotation number in the project page
2. Server generates a unique one-time token and saves it to the project
3. An email is sent to the coordinator with two links: Approve and Reject
4. Coordinator clicks Approve → project status changes to `COORDINATOR_APPROVED`, token is cleared, confirmation page is shown
5. Coordinator clicks Reject → status changes to `COORDINATOR_REJECTED`, admin is notified to revise

The approval links work without any login — they are secured by the random token in the URL.

### Project Closure Workflow

When all 12 stages are done:
1. Admin requests closure
2. Server generates a closure token and emails the coordinator
3. Coordinator approves or rejects via the email links
4. If approved, project status becomes `APPROVED` (closed)

---

## Email System

All emails are sent using **nodemailer** via Gmail SMTP, using a Gmail App Password stored in the `GMAIL_APP_PASSWORD` secret. The sender address is `info.vekay@gmail.com`.

If `GMAIL_APP_PASSWORD` is not set, all emails are silently skipped — the system continues working, just without notifications.

**Emails sent to customers:**
1. **Complaint registered** — includes ticket ID, complaint details, and instructions to track status
2. **Technician assigned** — includes technician name and phone number
3. **Technician on the way** — departure time and technician contact
4. **Technician arrived on-site** — arrival time
5. **Job completed** — includes technician's resolution notes and a summary

**Emails sent internally (to coordinators):**
6. **Quotation approval request** — approve/reject links
7. **Project closure approval request** — approve/reject links

All emails are styled HTML with VeKay Solar branding — green header, complaint details table, a progress bar showing which stage the job is at, and a footer with the support email address.

---

## Push Notifications

Technicians can enable push notifications in their browser. The system uses the **Web Push** protocol.

**How it works:**
1. Technician visits the tech portal and enables notifications
2. Browser generates a push subscription (endpoint URL + encryption keys)
3. This subscription is stored as a JSON string in the `push_subscriptions` column of the Staff tab in the main sheet
4. When a complaint is assigned to a technician, the server looks up their push subscription and sends a notification via the VAPID protocol
5. If a push send fails with a 410 or 404 error (subscription expired), the server automatically removes that subscription from the sheet

Notifications are sent for:
- Direct assignment to a specific technician
- Being added to a first-to-accept pending list

---

## The Location System

The complaint form has a place search field. Instead of asking customers to type a full address manually or use Google Maps, the system has 50 Kerala locations hardcoded in `src/lib/places.ts`. Each entry has:
- Place name (e.g. "Thiruvananthapuram", "Ernakulam", "Kozhikode")
- District
- Pincode
- Full address string
- GPS coordinates (latitude and longitude)

When a customer types in the search box, the API returns matching places from this list. Selecting one auto-fills the entire address section of the complaint form and saves the GPS coordinates. These coordinates are later used to pin the complaint on the technician's map.

---

## Reports and Excel Export

**Daily Report:** The admin reports page shows stats for any selected date — how many new complaints came in, how many were resolved that day, and the full list grouped by urgency.

**Excel Download:** At any time, an admin can click "Download Excel" to get a `.xlsx` file containing:
- A "Complaints" sheet with all complaints, colour-coded by urgency (red for critical, orange for high, etc.)
- A "Summary" sheet with total counts by status

The Excel file is generated in memory using **ExcelJS** and streamed directly to the browser. It is also saved as a backup file on the server when any admin logs in.

---

## API Routes — Complete List

All routes are prefixed with `/api`.

**Authentication**
- `POST /api/auth/login` — unified login (tries admin first, then technician)
- `POST /api/auth/admin/login` — admin-only login
- `POST /api/auth/technician/login` — technician-only login
- `POST /api/auth/logout` — destroy session
- `GET /api/auth/me` — return current session user
- `POST /api/auth/change-password` — change own password

**Places**
- `GET /api/places/search?q=...` — search Kerala locations by name

**Complaints**
- `GET /api/complaints` — list all complaints (admin only, supports filters)
- `POST /api/complaints` — submit a new complaint (public, rate-limited)
- `GET /api/complaints/lookup?q=...` — search complaints by phone or email
- `GET /api/complaints/ticket/:ticketId` — get complaint by ticket ID (public)
- `GET /api/complaints/:id` — get one complaint by internal ID
- `PATCH /api/complaints/:id` — update complaint (urgency, assignment, status, notes)
- `DELETE /api/complaints/:id` — delete a complaint
- `POST /api/complaints/:id/accept` — technician accepts a pending assignment
- `POST /api/complaints/:id/complete` — mark a job as resolved with notes

**Technicians**
- `GET /api/technicians` — list all technicians
- `POST /api/technicians` — create a new technician account
- `GET /api/technicians/:id` — get technician with their assigned complaints
- `PATCH /api/technicians/:id` — update technician details
- `DELETE /api/technicians/:id` — delete technician
- `GET /api/technicians/:id/map` — get all complaints as map pins for the tech portal

**Dashboard**
- `GET /api/dashboard/summary` — counts for the admin dashboard
- `GET /api/dashboard/activity` — recent complaint activity feed
- `GET /api/dashboard/urgency-breakdown` — complaint counts by urgency
- `GET /api/dashboard/technician-workload` — job counts per technician

**Customers**
- `GET /api/customers` — all customers aggregated by phone
- `GET /api/customers/:phone` — one customer with all their complaints
- `PATCH /api/customers/:phone` — update customer name/email across all their complaints
- `DELETE /api/customers/:phone` — delete all complaints from one customer

**Reports**
- `GET /api/reports/daily?date=YYYY-MM-DD` — daily report data
- `GET /api/reports/excel` — download fresh Excel file
- `GET /api/reports/excel/backup` — download the last saved Excel backup

**Push Notifications**
- `GET /api/push/vapid-key` — get the public VAPID key for browser subscription
- `POST /api/push/subscribe` — save a push subscription for the logged-in technician
- `POST /api/push/unsubscribe` — remove a push subscription

**Projects**
- `GET /api/projects` — list all projects
- `POST /api/projects` — create a new project
- `GET /api/projects/:id` — get one project
- `PATCH /api/projects/:id` — update project fields and stage progress
- `DELETE /api/projects/:id` — delete a project
- `GET /api/projects/stage-labels` — get the 12 stage names from the reporting sheet
- `POST /api/projects/import` — import projects from the source Google Sheet
- `POST /api/projects/rebuild-sheet` — rebuild the entire reporting sheet from CRM data
- `POST /api/projects/sync-emails` — pull email addresses from the reporting sheet into CRM

**Quotation (no login required for coordinator links)**
- `POST /api/projects/:id/quotation/submit` — admin submits quotation number, sends coordinator email
- `POST /api/projects/:id/quotation/resend-coordinator` — resend coordinator approval email
- `GET /api/quotation/confirm/:token` — coordinator approves quotation (email link)
- `GET /api/quotation/reject/:token` — coordinator rejects quotation (email link)

**Closure (no login required for coordinator links)**
- `POST /api/projects/:id/closure/request` — admin requests project closure, sends coordinator email
- `GET /api/closure/approve/:token` — coordinator approves closure (email link)
- `GET /api/closure/reject/:token` — coordinator rejects closure (email link)

**Health**
- `GET /api/healthz` — returns `{ ok: true }` to confirm server is alive

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| Backend framework | Express 5 |
| Database | Google Sheets API v4 |
| Session storage | memorystore (in-memory) |
| Authentication | express-session (session cookies) |
| Password hashing | SHA-256 via Node.js crypto |
| API validation | Zod (v4) |
| Email | nodemailer via Gmail SMTP |
| Push notifications | web-push (VAPID protocol) |
| Excel generation | ExcelJS |
| Frontend framework | React 18 |
| Frontend build | Vite |
| Routing | wouter |
| Data fetching | React Query (TanStack Query) |
| API client | Auto-generated from OpenAPI spec via Orval |
| Map | react-leaflet + OpenStreetMap |
| UI components | Shadcn/ui |
| Styling | Tailwind CSS |
| Monorepo | pnpm workspaces |

---

## Environment Variables Required

| Variable | Purpose |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Credentials for accessing all three Google Sheets |
| `GOOGLE_SPREADSHEET_ID` | ID of the main CRM spreadsheet |
| `SESSION_SECRET` | Used to sign session cookies |
| `GMAIL_APP_PASSWORD` | Gmail app password for sending all emails |
| `SPREADSHEET_ID` | ID of the complaints reporting sheet |
| `PASSWORD_SALT` | Salt added before password hashing |
| `SENDER_EMAIL` | From address on all outgoing emails |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Keys for web push notifications |

---

## Default Login Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Technician | `rajesh_k` | `tech123` |
| Technician | `suresh_m` | `tech456` |
| Technician | `anoop_v` | `tech789` |

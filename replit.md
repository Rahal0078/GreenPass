# VeKay Solar CRM

A full-stack complaint management system for VeKay Solar, a solar installation company in Kerala, India.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/vekay-solar run dev` — run the frontend (port 24488)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `GMAIL_APP_PASSWORD` — enables nodemailer email reports to info.vekay@gmail.com

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 with express-session (SESSION_SECRET env var)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, wouter routing, React Query, Tailwind + Shadcn/ui
- Map: react-leaflet + leaflet (OpenStreetMap tiles)
- Reports: exceljs for Excel export, nodemailer for email

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/db/src/schema/` — Drizzle schema (`complaints`, `technicians`, `admins`)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — auth helpers, email, places data
- `artifacts/vekay-solar/src/pages/` — React pages (admin/, tech/, public/)
- `artifacts/vekay-solar/src/lib/auth-context.tsx` — session auth context

## Architecture decisions

- Session-based auth (express-session) with `sameSite=none+secure` in prod, `lax` in dev
- Three separate portals: public (complaint form + tracking), admin, technician
- Kerala places data (50 locations with lat/lng) hardcoded in `api-server/src/lib/places.ts`
- Excel download uses direct fetch + blob (not Orval query hook) for file streaming
- Urgency colors: critical=red, high=orange, medium=amber, low=green

## Product

- **Public Portal** (`/`): Customers submit complaints with Kerala place search auto-fill; get a ticket ID back. Track ticket status at `/track/:ticketId`.
- **Admin Portal** (`/admin`): Login → dashboard with charts, manage complaints (set urgency + assign technician), manage technicians, generate/download daily Excel reports.
- **Technician Portal** (`/tech`): Login → map view (react-leaflet) of assigned complaints with urgency pins, complete jobs with resolution notes.

## Default credentials (dev/demo)

- Admin: `admin` / `admin123`
- Technicians: `rajesh_k`/`tech123`, `suresh_m`/`tech456`, `anoop_v`/`tech789`

## User preferences

- Daily email reports sent to info.vekay@gmail.com (requires GMAIL_APP_PASSWORD secret)
- Kerala-specific place names and districts throughout the UI

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Orval v8 requires `queryKey` in query options — always pass `queryKey: getFooQueryKey(...)` when using `enabled`
- The Excel download endpoint streams a file; use `fetch` + blob pattern, not Orval query hook
- `useAuth()` comes from `@/lib/auth-context`, NOT from `@workspace/api-client-react`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

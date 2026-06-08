---
name: Enquiry module
description: Full sales pipeline for marketing staff — 10 stages from New Lead to Awarded/Lost.
---

# Overview
Full enquiry/sales pipeline module added to VeKay Solar CRM.

## Portals
- **Marketing portal** at `/marketing` (login at `/marketing/login`) — for staff with `field="marketing"` in the Staff sheet
- **Admin Enquiries** at `/admin/enquiries` — full CRUD + Excel export

## Auth
- Staff with `field="marketing"` in Sheets get `role="marketing"` in session
- ProtectedRoute uses `<Redirect>` (not `setLocation` in render) to avoid React "update during render" warning

## Stages (10)
`new_lead → first_call → follow_up_call → site_visit_scheduled → site_visit_done → avg_quotation_given → formal_quotation_sent → follow_up_quotation → awarded → lost`

## API routes (all under `/api/`)
- `GET /enquiries` — all (admin) or assigned-only (marketing)
- `GET /enquiries/overdue` — overdue follow-ups
- `POST /enquiries` — create
- `GET /enquiries/:id` — single
- `PATCH /enquiries/:id` — update fields
- `PATCH /enquiries/:id/stage` — move stage + log
- `DELETE /enquiries/:id` — admin only
- `POST /enquiries/:id/note` — add activity note (singular `/note`, not `/notes`)
- `POST /enquiries/:id/quotation` — upload PDF to Drive
- `POST /enquiries/:id/followup` — set follow-up date
- `GET /marketing/staff` — marketing staff list for dropdowns

## Storage
- Tab: `Enquiries` in main CRM spreadsheet (auto-created on first write)
- Reporting sync: `syncEnquiriesToSheets()` fires after each mutation (non-blocking)

## Cron
- `node-cron` expression `"30 2 * * *"` = 02:30 UTC = 08:00 IST
- Sends overdue follow-up summary email to `ADMIN_EMAIL` (default: info.vekay@gmail.com)
- Started in `app.ts` via `startCron()`

## Key files
- `artifacts/api-server/src/routes/enquiries.ts`
- `artifacts/api-server/src/lib/cron.ts`
- `artifacts/api-server/src/lib/sheets-enquiries.ts`
- `artifacts/vekay-solar/src/lib/enquiry.ts` — shared types + STAGES
- `artifacts/vekay-solar/src/pages/admin/Enquiries.tsx`
- `artifacts/vekay-solar/src/pages/marketing/` — Login, Dashboard, EnquiryDetail
- `artifacts/vekay-solar/src/components/enquiry/` — EnquiryCard, StagePipeline, StageUpdateDrawer

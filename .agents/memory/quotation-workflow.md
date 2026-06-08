---
name: Quotation PDF workflow
description: Token-based quotation approval chain — statuses, DB columns, routes, and Drive upload details
---

## Status flow
PENDING → SENT → COORDINATOR_APPROVED → CLIENT_APPROVED (stage 0 unlocks)
                ↘ COORDINATOR_REJECTED (re-upload resets to SENT)

## DB columns added to projectsTable
- `quotation` default changed from `""` to `"PENDING"`
- `quotationFileId text` — Google Drive file ID
- `quotationToken text` — single-use coordinator confirm/reject token
- `quotationClientToken text` — single-use client approve token

## DB column added to techniciansTable
- `email text NOT NULL DEFAULT ''` — coordinator email for quotation notifications

## API routes (all in artifacts/api-server/src/routes/quotation.ts)
- `POST /api/projects/:id/quotation/upload` — admin only, multer memory storage, uploads to Drive, emails coordinator
- `GET /api/quotation/confirm/:token` — public, coordinator approves, emails client
- `GET /api/quotation/reject/:token` — public, coordinator rejects, resets status
- `GET /api/quotation/client/:token` — public, client approves, unlocks stage 0

## Drive lib (artifacts/api-server/src/lib/drive.ts)
- Uses `GOOGLE_SERVICE_ACCOUNT_JSON` with Drive scope (`https://www.googleapis.com/auth/drive`)
- Uploads to a folder named "quotation upload" (auto-created if missing)
- Makes files public (reader, type=anyone) so clients can open the PDF link

## Stage unlock change
isEditable() case 0: changed from `savedQuotation === "ACCEPTED"` to `savedQuotation === "CLIENT_APPROVED"`

**Why:** Old free-text quotation field was replaced by a proper approval chain requiring both coordinator and client sign-off before any installation begins.

**How to apply:** Any future stage-0 unlock check must use "CLIENT_APPROVED", not legacy "ACCEPTED"/"WAITING" values (those are kept in sheets mapping for backward compat only).

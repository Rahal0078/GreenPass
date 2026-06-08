---
name: Google Sheets migration
description: The entire api-server backend was migrated from PostgreSQL/Drizzle ORM to Google Sheets as the sole database.
---

## Rule
All data access in api-server goes through `artifacts/api-server/src/lib/db.ts` — a Google Sheets abstraction that exports `getRows`, `appendRow`, `updateRow`, `deleteRow`, `findRow`, `generateId`.

## Key facts
- Main spreadsheet ID: `1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0`
- 6 tabs: Admins, Staff, Complaints, Projects, Customers, Sessions
- All field names in SheetRow are snake_case (e.g. `ticket_id`, `is_active`, `customer_name`)
- Route handlers map snake_case → camelCase for API responses
- Booleans stored as string `"true"` / `"false"` in Sheets
- Session store: memorystore (replaces connect-pg-simple)
- Push subscriptions stored as JSON array in `Staff.push_subscriptions` column
- Seed script: `pnpm --filter @workspace/scripts run seed-sheets`
- `@workspace/db`, `drizzle-orm`, `connect-pg-simple`, `pg` are removed from api-server dependencies
- `syncToSheets()` in sheets.ts still writes to the REPORTING spreadsheet (`1JYme4ZM2fJ7b5IslotbnkLR4KmLKQVxu1o7fHwXITqA`) — kept as-is
- `syncProjectToSheet` / `deleteProjectFromSheet` still write to the FORMATTED project sheet (`1i0X8Ypvsmn3fODeBdwsU620W8Xr3axnqO4ZWg1remXE`) — kept as-is

**Why:** The client wanted Google Sheets as the sole database to allow direct editing and viewing of data without a database admin tool.

**How to apply:** Any new route must import from `../lib/db`, never from `@workspace/db` or drizzle-orm. When calling `syncProjectToSheet`, convert SheetRow → project-like object using `sheetRowToProjectLike()` with `null` fields mapped to `undefined` (not null) to match the expected type signature.

---
name: Sheets tab auto-creation
description: appendRow fails with 400 "Unable to parse range" if the tab doesn't exist yet; must create the tab before writing.
---

# Rule
Before calling `spreadsheets.values.update` (to write headers) or `spreadsheets.values.append` (to write data), always verify the target sheet tab exists. If it doesn't, create it with `batchUpdate → addSheet`.

**Why:** Google Sheets API returns HTTP 400 "Unable to parse range: TabName!A1" when the named tab doesn't exist. The first write to a new tab (e.g. Enquiries) will fail until the tab is created explicitly.

**How to apply:** The `ensureHeaders(tab)` function in `db.ts` now calls `ensureTabExists(sheets, tab)` first. `ensureTabExists` calls `spreadsheets.get` to list sheet titles, then issues an `addSheet` batchUpdate if the tab is missing. All new tabs that go through `appendRow` are automatically handled this way.

This is only needed once per tab lifetime — subsequent writes proceed normally.

import { google } from "googleapis";
import { logger } from "./logger";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0";

export type SheetRow = Record<string, string>;

export const TABS = {
  ADMINS: "Admins",
  STAFF: "Staff",
  COMPLAINTS: "Complaints",
  PROJECTS: "Projects",
  CUSTOMERS: "Customers",
  SESSIONS: "Sessions",
} as const;

const TAB_HEADERS: Record<string, string[]> = {
  Admins: [
    "id", "username", "password_hash", "name", "email",
    "created_at", "updated_at",
  ],
  Staff: [
    "id", "username", "password_hash", "name", "phone", "email",
    "area", "is_active", "roles", "field", "push_subscriptions", "created_at", "updated_at",
  ],
  Complaints: [
    "id", "ticket_id", "customer_name", "customer_phone", "customer_email",
    "kseb_consumer_number", "place_name", "district", "pincode", "address",
    "lat", "lng", "location_source", "complaint_type", "description",
    "media_urls", "status", "urgency", "urgency_color", "technician_id",
    "pending_technician_ids", "admin_notes", "completion_notes",
    "scheduled_date", "completed_at", "created_at", "updated_at",
  ],
  Projects: [
    "id", "registered_at", "fl_no", "customer_name", "place", "kw",
    "phone", "email", "consumer_no", "total_amount", "gmap_link",
    "coordinator", "quotation", "quotation_file_id", "quotation_token",
    "quotation_client_token", "stages", "stage_remarks", "stage_log",
    "remark", "activity_log", "closure_status", "closure_token",
    "created_at", "updated_at",
  ],
  Customers: ["phone", "name", "email", "total_complaints", "first_seen", "last_seen"],
  Sessions: ["sid", "data", "expires"],
};

function getClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function readAll(tab: string): Promise<{ headers: string[]; rows: string[][] }> {
  const sheets = getClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A:ZZ`,
    });
    const values = res.data.values ?? [];
    if (values.length === 0) return { headers: TAB_HEADERS[tab] ?? [], rows: [] };
    const headers = values[0].map(String);
    const rows = values.slice(1).map(r => r.map(String));
    return { headers, rows };
  } catch (err: any) {
    if (err?.code === 400 || String(err?.message).includes("range")) {
      return { headers: TAB_HEADERS[tab] ?? [], rows: [] };
    }
    throw err;
  }
}

function rowToObj(headers: string[], row: string[]): SheetRow {
  const obj: SheetRow = {};
  headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
  return obj;
}

function objToRow(headers: string[], obj: SheetRow): string[] {
  return headers.map(h => obj[h] ?? "");
}

async function ensureTabExists(sheets: ReturnType<typeof getClient>, tab: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (meta.data.sheets ?? []).some(s => s.properties?.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    logger.info({ tab }, "Auto-created missing Google Sheet tab");
  }
}

async function ensureHeaders(tab: string): Promise<void> {
  const headers = TAB_HEADERS[tab];
  if (!headers) return;
  const sheets = getClient();

  // Create the tab if it doesn't exist yet
  await ensureTabExists(sheets, tab);

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A1:A1`,
    });
    const firstCell = String(res.data.values?.[0]?.[0] ?? "").trim();
    if (firstCell === "id" || firstCell === "phone" || firstCell === "sid") return;
  } catch {
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

export async function getRows(tab: string): Promise<SheetRow[]> {
  const { headers, rows } = await readAll(tab);
  return rows.map(r => rowToObj(headers, r));
}

export async function generateId(tab: string): Promise<string> {
  const { rows } = await readAll(tab);
  const maxId = rows.reduce((m, r) => Math.max(m, parseInt(r[0] ?? "0") || 0), 0);
  return String(maxId + 1);
}

export async function appendRow(tab: string, data: SheetRow): Promise<SheetRow> {
  await ensureHeaders(tab);
  const headers = TAB_HEADERS[tab]!;
  const now = new Date().toISOString();
  const id = data.id || await generateId(tab);
  const row: SheetRow = { ...data, id };
  if (headers.includes("created_at") && !row.created_at) row.created_at = now;
  if (headers.includes("updated_at") && !row.updated_at) row.updated_at = now;
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [objToRow(headers, row)] },
  });
  return row;
}

export async function updateRow(
  tab: string,
  id: string | number,
  updates: Partial<SheetRow>,
): Promise<SheetRow> {
  const sheets = getClient();
  const { headers, rows } = await readAll(tab);
  const idStr = String(id);
  const idx = rows.findIndex(r => String(r[0]).trim() === idStr);
  if (idx === -1) throw new Error(`Row ${id} not found in ${tab}`);
  const currentRow = rowToObj(headers, rows[idx]);
  const updated: SheetRow = {
    ...currentRow,
    ...updates,
    id: idStr,
    ...(headers.includes("updated_at") ? { updated_at: new Date().toISOString() } : {}),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [objToRow(headers, updated)] },
  });
  return updated;
}

export async function deleteRow(tab: string, id: string | number): Promise<void> {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = meta.data.sheets?.find(s => s.properties?.title === tab)?.properties?.sheetId;
  if (sheetId === undefined) throw new Error(`Tab ${tab} not found in spreadsheet`);
  const { rows } = await readAll(tab);
  const idStr = String(id);
  const idx = rows.findIndex(r => String(r[0]).trim() === idStr);
  if (idx === -1) throw new Error(`Row ${id} not found in ${tab}`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: idx + 1,
            endIndex: idx + 2,
          },
        },
      }],
    },
  });
}

export async function findRow(tab: string, field: string, value: string): Promise<SheetRow | null> {
  const rows = await getRows(tab);
  return rows.find(r => r[field] === value) ?? null;
}

/**
 * Upsert a customer record in the Customers tab by phone number.
 * If the customer already exists, increments total_complaints and updates last_seen/name/email.
 * If new, inserts a fresh row with total_complaints=1.
 */
export async function upsertCustomer(data: {
  phone: string;
  name: string;
  email: string;
  createdAt: string;
}): Promise<void> {
  await ensureHeaders(TABS.CUSTOMERS);
  const headers = TAB_HEADERS[TABS.CUSTOMERS]!;
  const sheets = getClient();
  const { rows } = await readAll(TABS.CUSTOMERS);
  const idx = rows.findIndex(r => String(r[0]).trim() === data.phone);

  if (idx !== -1) {
    const existing = rowToObj(headers, rows[idx]);
    const updated: SheetRow = {
      ...existing,
      name: data.name,
      email: data.email,
      total_complaints: String((parseInt(existing.total_complaints) || 0) + 1),
      last_seen: data.createdAt,
    };
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.CUSTOMERS}!A${idx + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [objToRow(headers, updated)] },
    });
  } else {
    const row: SheetRow = {
      phone: data.phone,
      name: data.name,
      email: data.email,
      total_complaints: "1",
      first_seen: data.createdAt,
      last_seen: data.createdAt,
    };
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.CUSTOMERS}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [objToRow(headers, row)] },
    });
  }
}

/**
 * Replace all data rows in the Customers tab with the provided rows (keeps header).
 * Used by the one-time backfill/sync endpoint.
 */
export async function bulkReplaceCustomers(rows: SheetRow[]): Promise<void> {
  await ensureHeaders(TABS.CUSTOMERS);
  const headers = TAB_HEADERS[TABS.CUSTOMERS]!;
  const sheets = getClient();

  // Clear all data rows (A2 onwards), keep the header
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.CUSTOMERS}!A2:ZZ`,
  });

  if (rows.length === 0) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.CUSTOMERS}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows.map(r => objToRow(headers, r)) },
  });
}

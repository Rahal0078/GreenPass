import { google } from "googleapis";
import { logger } from "./logger";

const SPREADSHEET_ID = "1i0X8Ypvsmn3fODeBdwsU620W8Xr3axnqO4ZWg1remXE";
const SHEET_TAB = "Projects";

const STAGE_HEADERS = [
  "MATERIAL DELIVERY", "ADVANCE 40%", "WELDING", "FEASIBILITY",
  "REG. PAPER 1ST", "WIRING", "COMMISSIONING", "REG. PAPER 2ND",
  "2ND PAYMENT 50%", "DEPOSIT PAID", "ACCOUNT CLEAR 10%", "WARRANTY GIVEN",
];

const ALL_HEADERS = [
  "ID", "REG DATE", "FL NO", "NAME", "PLACE", "KW", "PH NO", "EMAIL", "CUN . NO", "TOTAL AMOUNT",
  "GMAP LINK", "COORDINATOR", "QUOTATION", "QUOTATION NO",
  ...STAGE_HEADERS,
  "REMARK", "LAST LOG", "LAST UPDATED",
];

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function fmtIST(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtDate(s: string): string {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  } catch { return s; }
}

export function parseArr(s: string, len: number): string[] {
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) {
      const out = arr.map(String);
      while (out.length < len) out.push("");
      return out.slice(0, len);
    }
  } catch {}
  return Array(len).fill("");
}

function parseLog(s: string): { ts: string; actor: string; text: string }[] {
  try { return JSON.parse(s) ?? []; } catch { return []; }
}

/** Format the most recent activity log entry for the sheet */
function fmtLastLog(activityLog: string): string {
  const entries = parseLog(activityLog);
  if (entries.length === 0) return "";
  const e = entries[0]; // most recent first
  return `${e.ts} — ${e.actor}: ${e.text}`;
}

// ── Ensure "Projects" tab exists ─────────────────────────────────────────────
async function ensureTab(sheets: ReturnType<typeof getSheetsClient>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === SHEET_TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB } } }] },
    });
    logger.info("Created Projects tab in Google Sheet");
  }
  const updated = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab = updated.data.sheets?.find(s => s.properties?.title === SHEET_TAB);
  return tab?.properties?.sheetId ?? 0;
}

function applyHeaderFormat(sheetId: number) {
  return {
    requests: [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.102, green: 0.361, blue: 0.22 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
              horizontalAlignment: "CENTER",
              verticalAlignment: "MIDDLE",
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        },
      },
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 3 } },
          fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
        },
      },
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: ALL_HEADERS.length },
        },
      },
    ],
  };
}

export function parseStageLog(s: string, len: number): string[][] {
  try {
    const a = JSON.parse(s ?? "[]");
    if (Array.isArray(a)) {
      while (a.length < len) a.push([]);
      return a.slice(0, len).map((item: unknown) =>
        Array.isArray(item) ? (item as unknown[]).map(String) : []
      );
    }
  } catch {}
  return Array.from({ length: len }, () => []);
}

function fmtStageCell(value: string, log: string[]): string {
  const lines: string[] = [];
  if (value) lines.push(value);
  if (log.length > 0) {
    lines.push(log[0]);
    for (let i = 1; i < log.length; i++) lines.push(`Edited: ${log[i]}`);
  }
  return lines.join("\n");
}

function buildRowData(project: {
  id: number; registeredAt: string; flNo: string; customerName: string; place: string;
  kw: string; phone: string; email?: string; consumerNo: string; totalAmount: string;
  gmapLink?: string; coordinator?: string; quotation?: string; quotationFileId?: string | null;
  stages: string; stageLog?: string; remark: string; activityLog: string; updatedAt: Date | string;
}): string[] {
  const stages = parseArr(project.stages, 12);
  const stageLogData = parseStageLog(project.stageLog ?? "[]", 12);
  const logEntries = parseLog(project.activityLog);

  // Stage 11 (index 10 = "Account Clear 10%") — append closure request/confirm timestamps
  const closureReqEntry = logEntries.find(e => e.text.toLowerCase().includes("closure request sent"));
  const closureAprEntry = logEntries.find(e => e.actor === "Coordinator" && e.text.toLowerCase().includes("closure approved"));
  const closureRejEntry = logEntries.find(e => e.actor === "Coordinator" && e.text.toLowerCase().includes("closure rejected"));

  const stageCells = stages.map((v, i) => {
    let cell = fmtStageCell(v, stageLogData[i]);
    if (i === 10) {
      if (closureReqEntry) cell += `\nRequested: ${closureReqEntry.ts}`;
      if (closureAprEntry) cell += `\nConfirmed: ${closureAprEntry.ts}`;
      else if (closureRejEntry) cell += `\nRejected: ${closureRejEntry.ts}`;
    }
    return cell;
  });
  const statusText =
    project.quotation === "CLIENT_APPROVED"      ? "Approved (legacy)"
    : project.quotation === "COORDINATOR_APPROVED" ? "Approved"
    : project.quotation === "COORDINATOR_REJECTED" ? "Rejected"
    : project.quotation === "SENT"                 ? "With Coordinator"
    : project.quotation === "ACCEPTED"             ? "Accepted (legacy)"
    : project.quotation === "WAITING"              ? "Waiting (legacy)"
    : "Pending";
  const quotationNumber = project.quotationFileId?.trim();
  const quotationLabel = quotationNumber
    ? `${quotationNumber} — ${statusText}`
    : statusText;

  // Build "QUOTATION NO" cell: number + sent time + approval time from activity log
  const sentEntry     = logEntries.find(e => e.text.toLowerCase().includes("submitted") && e.text.toLowerCase().includes("awaiting"));
  const approvedEntry = logEntries.find(e => e.actor === "Coordinator" && e.text.toLowerCase().includes("approved"));
  const quotationDetails = quotationNumber ? [
    `No: ${quotationNumber}`,
    sentEntry     ? `Sent: ${sentEntry.ts}`         : "",
    approvedEntry ? `Approved: ${approvedEntry.ts}` : "",
  ].filter(Boolean).join("\n") : "";

  return [
    String(project.id),
    fmtDate(project.registeredAt),
    project.flNo,
    project.customerName,
    project.place,
    project.kw,
    project.phone,
    project.email ?? "",
    project.consumerNo,
    project.totalAmount,
    project.gmapLink ?? "",
    project.coordinator ?? "",
    quotationLabel,
    quotationDetails,
    ...stageCells,
    project.remark,
    fmtLastLog(project.activityLog),
    fmtIST(project.updatedAt),
  ];
}

// ── Write a single project row (upsert by ID in column A) ────────────────────
// Throws on failure so callers can surface the error.
export async function syncProjectToSheet(project: {
  id: number; registeredAt: string; flNo: string; customerName: string; place: string;
  kw: string; phone: string; email?: string; consumerNo: string; totalAmount: string;
  gmapLink?: string; coordinator?: string; quotation?: string; quotationFileId?: string | null; stageLog?: string;
  stages: string; remark: string; activityLog: string; updatedAt: Date | string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const sheetId = await ensureTab(sheets);

  // Read column A to check header and find existing row for this ID
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });
  const rows = colA.data.values ?? [];

  // Write/fix header if needed
  const firstRow = (rows[0] ?? []).map(String);
  const hasCorrectHeader = firstRow[0]?.trim() === "ID" && firstRow.length === ALL_HEADERS.length;
  if (!hasCorrectHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [ALL_HEADERS] },
    });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: applyHeaderFormat(sheetId),
    });
    logger.info("Wrote/updated Projects sheet header row");
  }

  // Refresh column A after potential header write
  const refreshed = hasCorrectHeader ? rows : (await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  })).data.values ?? [];

  // Find row where column A === String(project.id)
  const idStr = String(project.id);
  let targetRow = -1;
  for (let i = 1; i < refreshed.length; i++) {
    if (String(refreshed[i]?.[0]).trim() === idStr) { targetRow = i + 1; break; }
  }

  const rowData = buildRowData(project);

  if (targetRow === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TAB}!A:AE`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TAB}!A${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  }

  logger.info({ id: project.id }, "Synced project row to Google Sheet");
}

// ── Delete a single project row by ID ────────────────────────────────────────
export async function deleteProjectFromSheet(id: number): Promise<void> {
  const sheets = getSheetsClient();
  const sheetId = await ensureTab(sheets);

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });
  const rows = colA.data.values ?? [];

  const idStr = String(id);
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i]?.[0]).trim() === idStr) { targetRowIndex = i; break; }
  }

  if (targetRowIndex === -1) {
    logger.warn({ id }, "Project row not found in sheet for deletion");
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: targetRowIndex,
            endIndex: targetRowIndex + 1,
          },
        },
      }],
    },
  });

  logger.info({ id }, "Deleted project row from Google Sheet");
}

// ── Clear all data rows (keep header) ────────────────────────────────────────
export async function clearProjectsSheet(): Promise<void> {
  const sheets = getSheetsClient();
  await ensureTab(sheets);

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });
  const rowCount = (colA.data.values ?? []).length;
  if (rowCount <= 1) return; // nothing to clear beyond the header

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A2:Z`,
  });

  logger.info("Cleared all project rows from Google Sheet (header kept)");
}

// ── Full rebuild: clear and rewrite all rows ──────────────────────────────────
export async function rebuildProjectsSheet(projects: Array<{
  id: number; registeredAt: string; flNo: string; customerName: string; place: string;
  kw: string; phone: string; email?: string; consumerNo: string; totalAmount: string;
  gmapLink?: string; coordinator?: string; quotation?: string; quotationFileId?: string | null; stageLog?: string;
  stages: string; remark: string; activityLog: string; updatedAt: Date | string;
}>): Promise<void> {
  const sheets = getSheetsClient();
  const sheetId = await ensureTab(sheets);

  const values: string[][] = [ALL_HEADERS, ...projects.map(buildRowData)];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:AE`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: applyHeaderFormat(sheetId),
  });

  logger.info({ rows: projects.length }, "Rebuilt Projects sheet");
}

// ── Read ALL project client detail rows from the Projects tab ────────────────
// Columns A–L: ID, REG DATE, FL NO, NAME, PLACE, KW, PH NO, EMAIL, CUN.NO,
//              TOTAL AMOUNT, GMAP LINK, COORDINATOR
export interface SheetClientRow {
  id: number;
  flNo: string;
  customerName: string;
  place: string;
  kw: string;
  phone: string;
  email: string;
  consumerNo: string;
  totalAmount: string;
  gmapLink: string;
  coordinator: string;
}

export async function readAllProjectsFromSheet(): Promise<SheetClientRow[]> {
  const sheets = getSheetsClient();
  await ensureTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A2:L`,
  });
  const rows = res.data.values ?? [];
  const result: SheetClientRow[] = [];
  for (const row of rows) {
    const id = parseInt((row[0] ?? "").toString().trim());
    if (isNaN(id) || id <= 0) continue;
    result.push({
      id,
      flNo:         (row[2]  ?? "").toString().trim(),
      customerName: (row[3]  ?? "").toString().trim(),
      place:        (row[4]  ?? "").toString().trim(),
      kw:           (row[5]  ?? "").toString().trim(),
      phone:        (row[6]  ?? "").toString().trim(),
      email:        (row[7]  ?? "").toString().trim(),
      consumerNo:   (row[8]  ?? "").toString().trim(),
      totalAmount:  (row[9]  ?? "").toString().trim(),
      gmapLink:     (row[10] ?? "").toString().trim(),
      coordinator:  (row[11] ?? "").toString().trim(),
    });
  }
  return result;
}

// ── Update only the client-detail columns (C–L) for a single row ─────────────
// Used when admin edits client fields in the CRM — writes to Sheets immediately.
export async function updateClientColumnsInSheet(id: number, fields: Partial<Omit<SheetClientRow, "id">>): Promise<void> {
  const sheets = getSheetsClient();
  await ensureTab(sheets);

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });
  const rows = colA.data.values ?? [];
  const idStr = String(id);
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i]?.[0]).trim() === idStr) { targetRow = i + 1; break; }
  }
  if (targetRow === -1) { logger.warn({ id }, "Row not found in sheet for client column update"); return; }

  // Read current row to avoid overwriting columns we're not changing
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!C${targetRow}:L${targetRow}`,
  });
  const cur = rowRes.data.values?.[0] ?? [];
  const keys: (keyof Omit<SheetClientRow, "id">)[] = [
    "flNo","customerName","place","kw","phone","email","consumerNo","totalAmount","gmapLink","coordinator",
  ];
  const updated = keys.map((k, i) => fields[k] !== undefined ? fields[k]! : (cur[i] ?? ""));

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!C${targetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [updated] },
  });

  logger.info({ id }, "Updated client columns in Google Sheet");
}

// ── Read emails from the Projects tab (for syncing back to DB) ───────────────
export async function readProjectEmailsFromSheet(): Promise<{ id: number; email: string }[]> {
  const sheets = getSheetsClient();
  await ensureTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A2:H`,
  });
  const rows = res.data.values ?? [];
  const result: { id: number; email: string }[] = [];
  for (const row of rows) {
    const id = parseInt((row[0] ?? "").toString().trim());
    const email = (row[7] ?? "").toString().trim();
    if (!isNaN(id) && id > 0 && email) result.push({ id, email });
  }
  return result;
}

// ── Import all rows from "PROJECT WORK DAILY" tab ────────────────────────────
export interface ImportedRow {
  flNo: string; customerName: string; place: string;
  kw: string; phone: string; consumerNo: string; totalAmount: string;
  stages: string[]; remark: string;
}

export async function importFromSourceSheet(): Promise<ImportedRow[]> {
  const sheets = getSheetsClient();
  const SOURCE_TAB = "PROJECT WORK DAILY";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SOURCE_TAB}!A3:S`,
  });

  const rows = res.data.values ?? [];
  const out: ImportedRow[] = [];

  for (const row of rows) {
    const slNo = (row[0] ?? "").toString().trim();
    if (!slNo) continue;

    const namePlace = (row[2] ?? "").toString().trim();
    let customerName = namePlace;
    let place = "";
    const sep = namePlace.match(/[,/\n]/);
    if (sep) {
      const idx = namePlace.indexOf(sep[0]);
      customerName = namePlace.slice(0, idx).trim();
      place = namePlace.slice(idx + 1).trim();
    }

    if (!customerName && !namePlace) continue;

    const rawKw = (row[3] ?? "").toString().trim();
    const kwMatch = rawKw.match(/(\d+(?:\.\d+)?)/);
    const kw = kwMatch ? kwMatch[1] : rawKw;

    const stages: string[] = [];
    for (let i = 7; i <= 17; i++) {
      stages.push((row[i] ?? "").toString().trim());
    }

    out.push({
      flNo: (row[1] ?? "").toString().trim(),
      customerName: customerName || namePlace,
      place, kw,
      phone: (row[4] ?? "").toString().trim(),
      consumerNo: (row[5] ?? "").toString().trim(),
      totalAmount: (row[6] ?? "").toString().trim(),
      stages,
      remark: (row[18] ?? "").toString().trim(),
    });
  }

  return out;
}

// ── Read stage column labels from the Sheet header row ────────────────────────
// Returns the 12 stage label strings exactly as they appear in row 1 of the Sheet.
// Falls back to the hardcoded STAGE_HEADERS if the Sheet is unreachable or has
// fewer columns than expected.
export async function readStageLabels(): Promise<string[]> {
  const NON_STAGE_PREFIX = 14; // ID … QUOTATION NO
  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TAB}!A1:AZ1`,
    });
    const headerRow = (res.data.values?.[0] ?? []).map(String);
    const labels = headerRow.slice(NON_STAGE_PREFIX, NON_STAGE_PREFIX + 12);
    while (labels.length < 12) labels.push(STAGE_HEADERS[labels.length]);
    return labels;
  } catch (err) {
    logger.warn({ err }, "Could not read stage labels from Sheet; using defaults");
    return [...STAGE_HEADERS];
  }
}

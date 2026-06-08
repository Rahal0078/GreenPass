import { google } from "googleapis";
import { getRows, TABS } from "./db";
import { logger } from "./logger";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID ?? "1JYme4ZM2fJ7b5IslotbnkLR4KmLKQVxu1o7fHwXITqA";
const SHEET_NAME = process.env.SHEET_NAME ?? "Complaints ";

const HEADERS = [
  "Ticket ID",
  "Status",
  "Urgency",
  "Customer Name",
  "Phone",
  "Email",
  "KSEB Consumer No.",
  "Place",
  "District",
  "Pincode",
  "Address",
  "Location Source",
  "Complaint Type",
  "Description",
  "Technician",
  "Admin Notes",
  "Completion Notes",
  "Preferred Service Date",
  "Registered On (IST)",
  "Last Updated (IST)",
  "Completed On (IST)",
];

function fmt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    going: "On the Way",
    reached: "On-site",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[s] ?? s;
}

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var not set");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function syncToSheets(): Promise<void> {
  try {
    const sheets = getSheetsClient();
    const all = await getRows(TABS.COMPLAINTS);
    const techs = await getRows(TABS.STAFF);
    const techMap: Record<string, string> = {};
    for (const t of techs) techMap[t.id] = t.name;

    const values: string[][] = [
      HEADERS,
      ...all.map((c) => [
        c.ticket_id,
        statusLabel(c.status),
        c.urgency.charAt(0).toUpperCase() + c.urgency.slice(1),
        c.customer_name,
        c.customer_phone,
        c.customer_email ?? "",
        c.kseb_consumer_number ?? "",
        c.place_name,
        c.district,
        c.pincode,
        c.address,
        c.location_source ?? "unknown",
        c.complaint_type,
        c.description,
        c.technician_id ? (techMap[c.technician_id] ?? "") : "",
        c.admin_notes ?? "",
        c.completion_notes ?? "",
        c.scheduled_date
          ? new Date(c.scheduled_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "",
        fmt(c.created_at),
        fmt(c.updated_at),
        fmt(c.completed_at || undefined),
      ]),
    ];

    const range = `${SHEET_NAME}!A:U`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.102, green: 0.361, blue: 0.22 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    fontSize: 11,
                  },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 21 },
            },
          },
          ...(
            [
              { text: "Open",        bg: { red: 0.808, green: 0.898, blue: 1 } },
              { text: "In Progress", bg: { red: 1,     green: 0.949, blue: 0.8 } },
              { text: "On the Way",  bg: { red: 1,     green: 0.878, blue: 0.71 } },
              { text: "On-site",     bg: { red: 0.749, green: 0.937, blue: 0.937 } },
              { text: "Resolved",    bg: { red: 0.714, green: 0.957, blue: 0.714 } },
              { text: "Closed",      bg: { red: 0.878, green: 0.878, blue: 0.878 } },
            ] as const
          ).map((rule, i) => ({
            addConditionalFormatRule: {
              index: i,
              rule: {
                ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }],
                booleanRule: {
                  condition: { type: "TEXT_EQ", values: [{ userEnteredValue: rule.text }] },
                  format: { backgroundColor: rule.bg },
                },
              },
            },
          })),
          ...(
            [
              { text: "Critical", bg: { red: 0.498, green: 0.114, blue: 0.114 }, fg: { red: 1, green: 1, blue: 1 } },
              { text: "High",     bg: { red: 0.863, green: 0.149, blue: 0.149 }, fg: { red: 1, green: 1, blue: 1 } },
              { text: "Medium",   bg: { red: 0.976, green: 0.576, blue: 0.098 }, fg: { red: 1, green: 1, blue: 1 } },
              { text: "Low",      bg: { red: 0.231, green: 0.553, blue: 0.961 }, fg: { red: 1, green: 1, blue: 1 } },
            ] as const
          ).map((rule, i) => ({
            addConditionalFormatRule: {
              index: 10 + i,
              rule: {
                ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 }],
                booleanRule: {
                  condition: { type: "TEXT_EQ", values: [{ userEnteredValue: rule.text }] },
                  format: {
                    backgroundColor: rule.bg,
                    textFormat: { foregroundColor: rule.fg, bold: true },
                  },
                },
              },
            },
          })),
        ],
      },
    });

    logger.info({ rows: values.length - 1 }, "Synced complaints to Google Sheets");
  } catch (err) {
    logger.warn({ err }, "Sheets sync error (non-critical)");
  }
}

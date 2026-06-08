/**
 * Seed default admin + technician accounts into the Google Sheets database.
 * Run with: pnpm --filter @workspace/scripts run seed-sheets
 *
 * Requires env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — service account credentials JSON
 *   GOOGLE_SPREADSHEET_ID         — target spreadsheet (default: hardcoded ID)
 *   PASSWORD_SALT                 — optional; defaults to "vekay_salt_2024"
 */

import { google } from "googleapis";
import crypto from "crypto";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0";

const TAB_HEADERS: Record<string, string[]> = {
  Admins: ["id", "username", "password_hash", "name", "email", "created_at", "updated_at"],
  Staff: [
    "id", "username", "password_hash", "name", "phone", "email",
    "area", "is_active", "roles", "push_subscriptions", "created_at", "updated_at",
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

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "vekay_salt_2024";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

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

async function ensureTab(sheets: ReturnType<typeof getClient>, tab: string): Promise<void> {
  const headers = TAB_HEADERS[tab]!;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A1:A1`,
    });
    const first = String(res.data.values?.[0]?.[0] ?? "").trim();
    if (first === headers[0]) {
      console.log(`  ✓ ${tab} tab already has headers`);
      return;
    }
  } catch {}

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
  console.log(`  ✓ Created headers for ${tab} tab`);
}

async function getRows(sheets: ReturnType<typeof getClient>, tab: string): Promise<Record<string, string>[]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A:ZZ`,
    });
    const values = res.data.values ?? [];
    if (values.length < 2) return [];
    const headers = values[0].map(String);
    return values.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
      return obj;
    });
  } catch {
    return [];
  }
}

async function appendRow(
  sheets: ReturnType<typeof getClient>,
  tab: string,
  data: Record<string, string>,
): Promise<void> {
  const headers = TAB_HEADERS[tab]!;
  const now = new Date().toISOString();
  const rows = await getRows(sheets, tab);
  const maxId = rows.reduce((m, r) => Math.max(m, parseInt(r.id ?? "0") || 0), 0);
  const id = String(maxId + 1);
  const row: Record<string, string> = { id, created_at: now, updated_at: now, ...data };
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [headers.map(h => row[h] ?? "")] },
  });
}

async function main() {
  console.log("🌱 Seeding Google Sheets database...");
  console.log(`   Spreadsheet: ${SPREADSHEET_ID}`);

  const sheets = getClient();

  console.log("\n📋 Ensuring tab headers...");
  for (const tab of Object.keys(TAB_HEADERS)) {
    await ensureTab(sheets, tab);
  }

  console.log("\n👤 Seeding admin accounts...");
  const admins = await getRows(sheets, "Admins");
  if (!admins.find(a => a.username === "admin")) {
    await appendRow(sheets, "Admins", {
      username: "admin",
      password_hash: hashPassword("admin123"),
      name: "Admin",
      email: "info.vekay@gmail.com",
    });
    console.log("  ✓ Created admin (admin / admin123)");
  } else {
    console.log("  ⏭ admin already exists");
  }

  console.log("\n👷 Seeding technician accounts...");
  const staff = await getRows(sheets, "Staff");

  const defaultTechs = [
    { username: "rajesh_k",  password: "tech123", name: "Rajesh K",  phone: "9876543210", area: "Thiruvananthapuram", email: "" },
    { username: "suresh_m",  password: "tech456", name: "Suresh M",  phone: "9876543211", area: "Ernakulam",          email: "" },
    { username: "anoop_v",   password: "tech789", name: "Anoop V",   phone: "9876543212", area: "Kozhikode",         email: "" },
  ];

  for (const tech of defaultTechs) {
    if (!staff.find(t => t.username === tech.username)) {
      await appendRow(sheets, "Staff", {
        username:          tech.username,
        password_hash:     hashPassword(tech.password),
        name:              tech.name,
        phone:             tech.phone,
        email:             tech.email,
        area:              tech.area,
        is_active:         "true",
        roles:             JSON.stringify(["technician"]),
        push_subscriptions: "[]",
      });
      console.log(`  ✓ Created ${tech.username} (${tech.password})`);
    } else {
      console.log(`  ⏭ ${tech.username} already exists`);
    }
  }

  console.log("\n✅ Seeding complete!");
}

main().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

/**
 * Migrate all data from Neon PostgreSQL → Google Sheets
 * Run with: pnpm --filter @workspace/scripts run migrate-neon-to-sheets
 *
 * Requires env vars:
 *   NEON_DATABASE_URL           — Neon PostgreSQL connection string
 *   GOOGLE_SERVICE_ACCOUNT_JSON — service account credentials JSON
 *   GOOGLE_SPREADSHEET_ID       — target spreadsheet ID
 */

import pg from "pg";
import { google } from "googleapis";

const { Pool } = pg;

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID ??
  "1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0";

// ── Google Sheets helpers ───────────────────────────────────────────────────

type SheetRow = Record<string, string>;

const TAB_HEADERS: Record<string, string[]> = {
  Admins: [
    "id", "username", "password_hash", "name", "email",
    "created_at", "updated_at",
  ],
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
};

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

async function readAllRows(
  sheets: ReturnType<typeof getSheetsClient>,
  tab: string,
): Promise<SheetRow[]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A:ZZ`,
    });
    const values = res.data.values ?? [];
    if (values.length < 2) return [];
    const headers = values[0].map(String);
    return values.slice(1).map((row) => {
      const obj: SheetRow = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
      return obj;
    });
  } catch {
    return [];
  }
}

async function appendRows(
  sheets: ReturnType<typeof getSheetsClient>,
  tab: string,
  rows: SheetRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const headers = TAB_HEADERS[tab]!;
  const values = rows.map((row) => headers.map((h) => row[h] ?? ""));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

// ── Column mappers: PostgreSQL row → Sheets SheetRow ───────────────────────

function mapAdmin(row: Record<string, unknown>): SheetRow {
  return {
    id: String(row["id"] ?? ""),
    username: String(row["username"] ?? ""),
    password_hash: String(row["password_hash"] ?? ""),
    name: String(row["name"] ?? ""),
    email: String(row["email"] ?? ""),
    created_at: row["created_at"] ? new Date(row["created_at"] as string).toISOString() : "",
    updated_at: row["updated_at"] ? new Date(row["updated_at"] as string).toISOString() : "",
  };
}

function mapTechnician(row: Record<string, unknown>): SheetRow {
  return {
    id: String(row["id"] ?? ""),
    username: String(row["username"] ?? ""),
    password_hash: String(row["password_hash"] ?? ""),
    name: String(row["name"] ?? ""),
    phone: String(row["phone"] ?? ""),
    email: String(row["email"] ?? ""),
    area: String(row["area"] ?? ""),
    is_active: String(row["is_active"] ?? "true"),
    roles: String(row["roles"] ?? "[]"),
    push_subscriptions: String(row["push_subscriptions"] ?? "[]"),
    created_at: row["created_at"] ? new Date(row["created_at"] as string).toISOString() : "",
    updated_at: row["updated_at"] ? new Date(row["updated_at"] as string).toISOString() : "",
  };
}

function mapComplaint(row: Record<string, unknown>): SheetRow {
  return {
    id: String(row["id"] ?? ""),
    ticket_id: String(row["ticket_id"] ?? ""),
    customer_name: String(row["customer_name"] ?? ""),
    customer_phone: String(row["customer_phone"] ?? ""),
    customer_email: String(row["customer_email"] ?? ""),
    kseb_consumer_number: String(row["kseb_consumer_number"] ?? ""),
    place_name: String(row["place_name"] ?? ""),
    district: String(row["district"] ?? ""),
    pincode: String(row["pincode"] ?? ""),
    address: String(row["address"] ?? ""),
    lat: String(row["lat"] ?? ""),
    lng: String(row["lng"] ?? ""),
    location_source: String(row["location_source"] ?? ""),
    complaint_type: String(row["complaint_type"] ?? ""),
    description: String(row["description"] ?? ""),
    media_urls: String(row["media_urls"] ?? ""),
    status: String(row["status"] ?? "open"),
    urgency: String(row["urgency"] ?? "low"),
    urgency_color: String(row["urgency_color"] ?? ""),
    technician_id: String(row["technician_id"] ?? ""),
    pending_technician_ids: String(row["pending_technician_ids"] ?? "[]"),
    admin_notes: String(row["admin_notes"] ?? ""),
    completion_notes: String(row["completion_notes"] ?? ""),
    scheduled_date: String(row["scheduled_date"] ?? ""),
    completed_at: row["completed_at"] ? new Date(row["completed_at"] as string).toISOString() : "",
    created_at: row["created_at"] ? new Date(row["created_at"] as string).toISOString() : "",
    updated_at: row["updated_at"] ? new Date(row["updated_at"] as string).toISOString() : "",
  };
}

function mapProject(row: Record<string, unknown>): SheetRow {
  return {
    id: String(row["id"] ?? ""),
    registered_at: String(row["registered_at"] ?? ""),
    fl_no: String(row["fl_no"] ?? ""),
    customer_name: String(row["customer_name"] ?? ""),
    place: String(row["place"] ?? ""),
    kw: String(row["kw"] ?? ""),
    phone: String(row["phone"] ?? ""),
    email: String(row["email"] ?? ""),
    consumer_no: String(row["consumer_no"] ?? ""),
    total_amount: String(row["total_amount"] ?? ""),
    gmap_link: String(row["gmap_link"] ?? ""),
    coordinator: String(row["coordinator"] ?? ""),
    quotation: String(row["quotation"] ?? "PENDING"),
    quotation_file_id: String(row["quotation_file_id"] ?? ""),
    quotation_token: String(row["quotation_token"] ?? ""),
    quotation_client_token: String(row["quotation_client_token"] ?? ""),
    stages: String(row["stages"] ?? "[]"),
    stage_remarks: String(row["stage_remarks"] ?? "[]"),
    stage_log: String(row["stage_log"] ?? "[]"),
    remark: String(row["remark"] ?? ""),
    activity_log: String(row["activity_log"] ?? "[]"),
    closure_status: String(row["closure_status"] ?? "PENDING"),
    closure_token: String(row["closure_token"] ?? ""),
    created_at: row["created_at"] ? new Date(row["created_at"] as string).toISOString() : "",
    updated_at: row["updated_at"] ? new Date(row["updated_at"] as string).toISOString() : "",
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) throw new Error("NEON_DATABASE_URL is not set");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VeKay Solar CRM — Neon → Google Sheets Migration");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Connect to Neon ─────────────────────────────────────────────────────
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  console.log("✓ Connected to Neon PostgreSQL\n");

  const sheets = getSheetsClient();
  console.log("✓ Connected to Google Sheets\n");

  const summary: { table: string; inDB: number; alreadyInSheets: number; migrated: number }[] = [];

  // ── 1. Admins ─────────────────────────────────────────────────────────
  console.log("─── Admins ───────────────────────────────────────────────");
  let dbRows: Record<string, unknown>[];
  try {
    const res = await pool.query("SELECT * FROM admins ORDER BY id");
    dbRows = res.rows;
  } catch (err: unknown) {
    console.log(`  ⚠ Could not read admins table: ${String(err)}`);
    dbRows = [];
  }
  const existingAdmins = await readAllRows(sheets, "Admins");
  const existingAdminUsernames = new Set(existingAdmins.map((r) => r["username"]));
  const newAdmins = dbRows
    .map(mapAdmin)
    .filter((r) => !existingAdminUsernames.has(r["username"]));
  console.log(`  DB rows:          ${dbRows.length}`);
  console.log(`  Already in Sheets:${existingAdmins.length} (skipped: ${dbRows.length - newAdmins.length})`);
  if (newAdmins.length > 0) {
    await appendRows(sheets, "Admins", newAdmins);
    console.log(`  ✅ Migrated:       ${newAdmins.length} row(s)`);
    newAdmins.forEach((r) => console.log(`     → ${r["username"]} (id: ${r["id"]})`));
  } else {
    console.log(`  ℹ  Nothing new to migrate`);
  }
  summary.push({ table: "admins → Admins", inDB: dbRows.length, alreadyInSheets: dbRows.length - newAdmins.length, migrated: newAdmins.length });

  // ── 2. Technicians → Staff ────────────────────────────────────────────
  console.log("\n─── Technicians → Staff ──────────────────────────────────");
  try {
    const res = await pool.query("SELECT * FROM technicians ORDER BY id");
    dbRows = res.rows;
  } catch (err: unknown) {
    console.log(`  ⚠ Could not read technicians table: ${String(err)}`);
    dbRows = [];
  }
  const existingStaff = await readAllRows(sheets, "Staff");
  const existingStaffUsernames = new Set(existingStaff.map((r) => r["username"]));
  const newStaff = dbRows
    .map(mapTechnician)
    .filter((r) => !existingStaffUsernames.has(r["username"]));
  console.log(`  DB rows:          ${dbRows.length}`);
  console.log(`  Already in Sheets:${existingStaff.length} (skipped: ${dbRows.length - newStaff.length})`);
  if (newStaff.length > 0) {
    await appendRows(sheets, "Staff", newStaff);
    console.log(`  ✅ Migrated:       ${newStaff.length} row(s)`);
    newStaff.forEach((r) => console.log(`     → ${r["username"]} (id: ${r["id"]})`));
  } else {
    console.log(`  ℹ  Nothing new to migrate`);
  }
  summary.push({ table: "technicians → Staff", inDB: dbRows.length, alreadyInSheets: dbRows.length - newStaff.length, migrated: newStaff.length });

  // ── 3. Complaints ─────────────────────────────────────────────────────
  console.log("\n─── Complaints ───────────────────────────────────────────");
  try {
    const res = await pool.query("SELECT * FROM complaints ORDER BY id");
    dbRows = res.rows;
  } catch (err: unknown) {
    console.log(`  ⚠ Could not read complaints table: ${String(err)}`);
    dbRows = [];
  }
  const existingComplaints = await readAllRows(sheets, "Complaints");
  const existingTicketIds = new Set(existingComplaints.map((r) => r["ticket_id"]));
  const newComplaints = dbRows
    .map(mapComplaint)
    .filter((r) => !existingTicketIds.has(r["ticket_id"]));
  console.log(`  DB rows:          ${dbRows.length}`);
  console.log(`  Already in Sheets:${existingComplaints.length} (skipped: ${dbRows.length - newComplaints.length})`);
  if (newComplaints.length > 0) {
    // Write in batches of 100 to stay within Sheets API limits
    const BATCH = 100;
    for (let i = 0; i < newComplaints.length; i += BATCH) {
      const batch = newComplaints.slice(i, i + BATCH);
      await appendRows(sheets, "Complaints", batch);
      console.log(`  ✅ Migrated batch: rows ${i + 1}–${Math.min(i + BATCH, newComplaints.length)}`);
    }
    console.log(`  ✅ Total migrated: ${newComplaints.length} row(s)`);
    newComplaints.forEach((r) => console.log(`     → ${r["ticket_id"]} — ${r["customer_name"]} (${r["status"]})`));
  } else {
    console.log(`  ℹ  Nothing new to migrate`);
  }
  summary.push({ table: "complaints → Complaints", inDB: dbRows.length, alreadyInSheets: dbRows.length - newComplaints.length, migrated: newComplaints.length });

  // ── 4. Projects ───────────────────────────────────────────────────────
  console.log("\n─── Projects ─────────────────────────────────────────────");
  try {
    const res = await pool.query("SELECT * FROM projects ORDER BY id");
    dbRows = res.rows;
  } catch (err: unknown) {
    console.log(`  ⚠ Could not read projects table: ${String(err)}`);
    dbRows = [];
  }
  const existingProjects = await readAllRows(sheets, "Projects");
  const existingFlNos = new Set(existingProjects.map((r) => r["fl_no"]).filter(Boolean));
  const newProjects = dbRows
    .map(mapProject)
    .filter((r) => {
      // If fl_no exists and is already in Sheets, skip
      if (r["fl_no"] && existingFlNos.has(r["fl_no"])) return false;
      return true;
    });
  console.log(`  DB rows:          ${dbRows.length}`);
  console.log(`  Already in Sheets:${existingProjects.length} (skipped: ${dbRows.length - newProjects.length})`);
  if (newProjects.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < newProjects.length; i += BATCH) {
      const batch = newProjects.slice(i, i + BATCH);
      await appendRows(sheets, "Projects", batch);
      console.log(`  ✅ Migrated batch: rows ${i + 1}–${Math.min(i + BATCH, newProjects.length)}`);
    }
    console.log(`  ✅ Total migrated: ${newProjects.length} row(s)`);
    newProjects.forEach((r) => console.log(`     → FL: ${r["fl_no"] || "(no fl_no)"} — ${r["customer_name"]}`));
  } else {
    console.log(`  ℹ  Nothing new to migrate`);
  }
  summary.push({ table: "projects → Projects", inDB: dbRows.length, alreadyInSheets: dbRows.length - newProjects.length, migrated: newProjects.length });

  await pool.end();

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  MIGRATION SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(
    `${"Table".padEnd(30)} ${"In DB".padStart(6)} ${"Skipped".padStart(8)} ${"Migrated".padStart(9)}`,
  );
  console.log("─".repeat(58));
  let totalMigrated = 0;
  for (const s of summary) {
    console.log(
      `${s.table.padEnd(30)} ${String(s.inDB).padStart(6)} ${String(s.alreadyInSheets).padStart(8)} ${String(s.migrated).padStart(9)}`,
    );
    totalMigrated += s.migrated;
  }
  console.log("─".repeat(58));
  console.log(`${"TOTAL".padEnd(30)} ${"".padStart(6)} ${"".padStart(8)} ${String(totalMigrated).padStart(9)}`);
  console.log("\n✅ Migration complete.\n");
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});

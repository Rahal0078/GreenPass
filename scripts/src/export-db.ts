/**
 * Export all data from the current database as SQL INSERT statements.
 * Run with: pnpm --filter @workspace/scripts run export-db
 */
import { db, complaintsTable, techniciansTable, adminsTable } from "@workspace/db";

function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return String(v);
}

function sqlBool(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "true";
  return v ? "true" : "false";
}

function sqlTs(v: Date | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return `'${v.toISOString()}'`;
}

async function main() {
  process.stderr.write("-- VeKay Solar CRM — Database Export\n");
  process.stderr.write(`-- Generated: ${new Date().toISOString()}\n\n`);

  // Admins
  const admins = await db.select().from(adminsTable);
  for (const a of admins) {
    const cols = "id, username, password_hash, name, created_at";
    const vals = [a.id, sqlStr(a.username), sqlStr(a.passwordHash), sqlStr(a.name), sqlTs(a.createdAt)].join(", ");
    console.log(`INSERT INTO admins (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  // Technicians
  const techs = await db.select().from(techniciansTable);
  for (const t of techs) {
    const cols = "id, username, password_hash, name, phone, area, is_active, created_at";
    const vals = [
      t.id,
      sqlStr(t.username),
      sqlStr(t.passwordHash),
      sqlStr(t.name),
      sqlStr(t.phone),
      sqlStr(t.area || "Kerala"),
      sqlBool(t.isActive),
      sqlTs(t.createdAt),
    ].join(", ");
    console.log(`INSERT INTO technicians (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  // Complaints
  const complaints = await db.select().from(complaintsTable);
  for (const c of complaints) {
    const cols = "id, ticket_id, customer_name, customer_phone, customer_email, place_name, district, pincode, address, lat, lng, location_source, complaint_type, description, media_urls, status, urgency, urgency_color, technician_id, admin_notes, completion_notes, created_at, completed_at";
    const vals = [
      c.id,
      sqlStr(c.ticketId),
      sqlStr(c.customerName),
      sqlStr(c.customerPhone),
      sqlStr(c.customerEmail || ""),
      sqlStr(c.placeName),
      sqlStr(c.district),
      sqlStr(c.pincode),
      sqlStr(c.address),
      sqlNum(c.lat),
      sqlNum(c.lng),
      sqlStr(c.locationSource),
      sqlStr(c.complaintType),
      sqlStr(c.description),
      sqlStr(c.mediaUrls),
      sqlStr(c.status),
      sqlStr(c.urgency),
      sqlStr(c.urgencyColor),
      sqlNum(c.technicianId),
      sqlStr(c.adminNotes),
      sqlStr(c.completionNotes),
      sqlTs(c.createdAt),
      sqlTs(c.completedAt),
    ].join(", ");
    console.log(`INSERT INTO complaints (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  process.stderr.write(`\n-- Done: ${admins.length} admins, ${techs.length} technicians, ${complaints.length} complaints\n`);
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err}\n`);
  process.exit(1);
});

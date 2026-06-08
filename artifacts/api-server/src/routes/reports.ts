import { Router } from "express";
import type { IRouter } from "express";
import { getRows, TABS } from "../lib/db";
import { logger } from "../lib/logger";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const COMPANY_NAME = process.env.COMPANY_NAME ?? "VeKay Solar";
const BACKUP_PATH = path.join(process.cwd(), "crm-backup.xlsx");

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case "critical": return "#7f1d1d";
    case "high": return "#dc2626";
    case "medium": return "#f97316";
    default: return "#3b82f6";
  }
}

async function buildDailyReport(date: string) {
  const dayStart = new Date(date + "T00:00:00.000+05:30");
  const dayEnd = new Date(date + "T23:59:59.999+05:30");

  const [all, techs] = await Promise.all([
    getRows(TABS.COMPLAINTS),
    getRows(TABS.STAFF),
  ]);

  all.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const techMap: Record<string, string> = {};
  for (const t of techs) techMap[t.id] = t.name;

  const newToday = all.filter(c => {
    const d = new Date(c.created_at);
    return d >= dayStart && d <= dayEnd;
  });
  const resolvedToday = all.filter(c => {
    if (!c.completed_at) return false;
    const d = new Date(c.completed_at);
    return d >= dayStart && d <= dayEnd;
  });

  const urgencyMap: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const c of all) {
    if (urgencyMap[c.urgency] !== undefined) urgencyMap[c.urgency]++;
  }

  const byUrgency = Object.entries(urgencyMap).map(([u, count]) => ({
    urgency: u,
    urgencyColor: urgencyColor(u),
    count,
  }));

  const complaints = all.map(c => ({
    id: parseInt(c.id),
    ticketId: c.ticket_id,
    customerName: c.customer_name,
    customerPhone: c.customer_phone,
    customerEmail: c.customer_email,
    ksebConsumerNumber: c.kseb_consumer_number || null,
    placeName: c.place_name,
    district: c.district,
    pincode: c.pincode,
    address: c.address,
    complaintType: c.complaint_type,
    description: c.description,
    status: c.status,
    urgency: c.urgency,
    urgencyColor: c.urgency_color || null,
    technicianName: c.technician_id ? (techMap[c.technician_id] ?? null) : null,
    adminNotes: c.admin_notes || null,
    completionNotes: c.completion_notes || null,
    scheduledDate: c.scheduled_date || null,
    completedAt: c.completed_at || null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  return {
    date,
    totalComplaints: all.length,
    newComplaints: newToday.length,
    resolved: resolvedToday.length,
    byUrgency,
    complaints,
  };
}

async function buildExcelBuffer(): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Complaints", {
    pageSetup: { orientation: "landscape" },
  });

  sheet.columns = [
    { header: "Ticket ID",          key: "ticketId",          width: 18 },
    { header: "Customer Name",       key: "customerName",      width: 20 },
    { header: "Phone",               key: "customerPhone",     width: 15 },
    { header: "Email",               key: "customerEmail",     width: 25 },
    { header: "KSEB Consumer No.",   key: "ksebConsumerNumber",width: 18 },
    { header: "Place",               key: "placeName",         width: 18 },
    { header: "District",            key: "district",          width: 16 },
    { header: "Pincode",             key: "pincode",           width: 10 },
    { header: "Address",             key: "address",           width: 30 },
    { header: "Complaint Type",      key: "complaintType",     width: 20 },
    { header: "Description",         key: "description",       width: 35 },
    { header: "Status",              key: "status",            width: 14 },
    { header: "Urgency",             key: "urgency",           width: 12 },
    { header: "Technician",          key: "technicianName",    width: 18 },
    { header: "Admin Notes",         key: "adminNotes",        width: 25 },
    { header: "Completion Notes",    key: "completionNotes",   width: 25 },
    { header: "Registered On",       key: "createdAt",         width: 22 },
    { header: "Completed On",        key: "completedAt",       width: 22 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5C38" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  const [all, techs] = await Promise.all([
    getRows(TABS.COMPLAINTS),
    getRows(TABS.STAFF),
  ]);

  all.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const techMap: Record<string, string> = {};
  for (const t of techs) techMap[t.id] = t.name;

  const urgencyColors: Record<string, string> = {
    critical: "FF7F1D1D",
    high:     "FFDC2626",
    medium:   "FFF97316",
    low:      "FF3B82F6",
  };

  for (const c of all) {
    const row = sheet.addRow({
      ticketId:          c.ticket_id,
      customerName:      c.customer_name,
      customerPhone:     c.customer_phone,
      customerEmail:     c.customer_email,
      ksebConsumerNumber:c.kseb_consumer_number ?? "",
      placeName:         c.place_name,
      district:          c.district,
      pincode:           c.pincode,
      address:           c.address,
      complaintType:     c.complaint_type,
      description:       c.description,
      status:            c.status.replace("_", " ").toUpperCase(),
      urgency:           c.urgency.toUpperCase(),
      technicianName:    c.technician_id ? (techMap[c.technician_id] ?? "Unassigned") : "Unassigned",
      adminNotes:        c.admin_notes ?? "",
      completionNotes:   c.completion_notes ?? "",
      createdAt:         c.created_at
        ? new Date(c.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "",
      completedAt:       c.completed_at
        ? new Date(c.completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "",
    });

    const urgencyCell = row.getCell("urgency");
    const argb = urgencyColors[c.urgency] ?? "FF6B7280";
    urgencyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    urgencyCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    row.alignment = { wrapText: true, vertical: "top" };
  }

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value",  key: "value",  width: 15 },
  ];
  const sumHeader = summarySheet.getRow(1);
  sumHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  sumHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5C38" } };

  summarySheet.addRow({ metric: "Total Complaints",  value: all.length });
  summarySheet.addRow({ metric: "Open",              value: all.filter(c => c.status === "open").length });
  summarySheet.addRow({ metric: "In Progress",       value: all.filter(c => c.status === "in_progress").length });
  summarySheet.addRow({ metric: "On the Way",        value: all.filter(c => c.status === "going").length });
  summarySheet.addRow({ metric: "On-site",           value: all.filter(c => c.status === "reached").length });
  summarySheet.addRow({ metric: "Resolved",          value: all.filter(c => c.status === "resolved").length });
  summarySheet.addRow({ metric: "Critical",          value: all.filter(c => c.urgency === "critical").length });
  summarySheet.addRow({ metric: "High Urgency",      value: all.filter(c => c.urgency === "high").length });
  summarySheet.addRow({ metric: "Report Generated",  value: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) });

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function saveExcelBackup(): Promise<void> {
  try {
    const buf = await buildExcelBuffer();
    fs.writeFileSync(BACKUP_PATH, buf);
    logger.info("Excel backup saved on admin login");
  } catch (err) {
    logger.warn({ err }, "Excel backup save failed (non-critical)");
  }
}

router.get("/reports/daily", async (req, res): Promise<void> => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : null;
  const date = dateParam || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const report = await buildDailyReport(date);
  res.json(report);
});

router.get("/reports/excel", async (req, res): Promise<void> => {
  try {
    const buf = await buildExcelBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="complaints-${new Date().toLocaleDateString("en-CA")}.xlsx"`);
    res.send(buf);
  } catch (err) {
    logger.error({ err }, "Failed to generate Excel report");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

router.get("/reports/excel/backup", (req, res): void => {
  if (!fs.existsSync(BACKUP_PATH)) {
    res.status(404).json({ error: "No backup available yet. Please log in to generate one." });
    return;
  }
  const date = fs.statSync(BACKUP_PATH).mtime.toLocaleDateString("en-CA");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="crm-backup-${date}.xlsx"`);
  res.sendFile(BACKUP_PATH);
});

export default router;

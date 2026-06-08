import { Router } from "express";
import type { IRouter } from "express";
import rateLimit from "express-rate-limit";
import {
  CreateComplaintBody,
  UpdateComplaintBody,
  UpdateComplaintParams,
  GetComplaintParams,
  CompleteComplaintBody,
  CompleteComplaintParams,
  GetComplaintByTicketParams,
} from "@workspace/api-zod";
import { generateTicketId } from "../lib/auth";
import {
  sendTicketConfirmationEmail,
  sendTechnicianAssignedEmail,
  sendTechnicianGoingEmail,
  sendTechnicianReachedEmail,
  sendJobCompletedEmail,
} from "../lib/email";
import { syncToSheets } from "../lib/sheets";
import { sendPushToTechnicians } from "./push";
import { getRows, appendRow, updateRow, deleteRow, findRow, upsertCustomer, TABS, type SheetRow } from "../lib/db";

const router: IRouter = Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many complaints submitted from this device. Please try again in 15 minutes." },
});

function urgencyToColor(urgency: string): string {
  switch (urgency) {
    case "critical": return "#7f1d1d";
    case "high": return "#dc2626";
    case "medium": return "#f97316";
    case "low": return "#3b82f6";
    default: return "#6b7280";
  }
}

function parsePendingIds(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as number[]; } catch { return []; }
}

function rowToComplaint(c: SheetRow) {
  return {
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
    lat: c.lat ? parseFloat(c.lat) : null,
    lng: c.lng ? parseFloat(c.lng) : null,
    locationSource: c.location_source || null,
    complaintType: c.complaint_type,
    description: c.description,
    mediaUrls: c.media_urls || null,
    status: c.status,
    urgency: c.urgency,
    urgencyColor: c.urgency_color || null,
    technicianId: c.technician_id ? parseInt(c.technician_id) : null,
    pendingTechnicianIds: parsePendingIds(c.pending_technician_ids),
    adminNotes: c.admin_notes || null,
    completionNotes: c.completion_notes || null,
    scheduledDate: c.scheduled_date || null,
    completedAt: c.completed_at || null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

async function enrichComplaint(c: SheetRow, staffCache?: SheetRow[]) {
  let technicianName: string | null = null;
  if (c.technician_id) {
    const staff = staffCache ?? await getRows(TABS.STAFF);
    const tech = staff.find(t => t.id === c.technician_id);
    technicianName = tech?.name ?? null;
  }
  return { ...rowToComplaint(c), technicianName };
}

router.get("/complaints", async (req, res): Promise<void> => {
  const session = req.session as any;
  if (!session?.userId || session.role !== "admin") {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  const { status, urgency, technicianId } = req.query;
  let all = await getRows(TABS.COMPLAINTS);

  if (status && typeof status === "string") all = all.filter(c => c.status === status);
  if (urgency && typeof urgency === "string") all = all.filter(c => c.urgency === urgency);
  if (technicianId && typeof technicianId === "string") {
    all = all.filter(c => c.technician_id === technicianId);
  }

  all.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const staff = await getRows(TABS.STAFF);
  const enriched = await Promise.all(all.map(c => enrichComplaint(c, staff)));
  res.json(enriched);
});

router.post("/complaints", submitLimiter, async (req, res): Promise<void> => {
  const parsed = CreateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ticketId = generateTicketId();
  const d = parsed.data;

  let complaint: SheetRow;
  try {
    complaint = await appendRow(TABS.COMPLAINTS, {
      ticket_id: ticketId,
      customer_name: d.customerName,
      customer_phone: d.customerPhone,
      customer_email: d.customerEmail,
      kseb_consumer_number: d.ksebConsumerNumber ?? "",
      place_name: d.placeName,
      district: d.district,
      pincode: d.pincode,
      address: d.address,
      lat: d.lat != null ? String(d.lat) : "",
      lng: d.lng != null ? String(d.lng) : "",
      location_source: d.locationSource ?? "",
      complaint_type: d.complaintType,
      description: d.description,
      media_urls: "",
      status: "open",
      urgency: "low",
      urgency_color: urgencyToColor("low"),
      technician_id: "",
      pending_technician_ids: "[]",
      admin_notes: "",
      completion_notes: "",
      scheduled_date: d.scheduledDate ?? "",
      completed_at: "",
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Complaint insert failed");
    res.status(500).json({ error: "Failed to create complaint" });
    return;
  }

  const enriched = await enrichComplaint(complaint);
  res.status(201).json(enriched);

  // Keep the Customers tab in sync — fire-and-forget, never blocks the response
  upsertCustomer({
    phone: complaint.customer_phone,
    name: complaint.customer_name,
    email: complaint.customer_email,
    createdAt: complaint.created_at,
  }).catch(() => {});

  sendTicketConfirmationEmail({
    customerName: complaint.customer_name,
    customerEmail: complaint.customer_email,
    ticketId: complaint.ticket_id,
    complaintType: complaint.complaint_type,
    description: complaint.description,
    placeName: complaint.place_name,
    district: complaint.district,
    pincode: complaint.pincode,
    address: complaint.address,
    createdAt: complaint.created_at,
    scheduledDate: complaint.scheduled_date || null,
  }).catch(() => {});
  syncToSheets().catch(() => {});
});

router.get("/complaints/lookup", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  if (!q || q.length < 5) {
    res.status(400).json({ error: "Search query too short" });
    return;
  }

  const all = await getRows(TABS.COMPLAINTS);
  const results = all
    .filter(c =>
      c.customer_email.toLowerCase().includes(q) ||
      c.customer_phone.includes(q)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);

  const staff = await getRows(TABS.STAFF);
  const enriched = await Promise.all(results.map(c => enrichComplaint(c, staff)));
  res.json(enriched);
});

router.get("/complaints/ticket/:ticketId", async (req, res): Promise<void> => {
  const params = GetComplaintByTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const complaint = await findRow(TABS.COMPLAINTS, "ticket_id", params.data.ticketId);
  if (!complaint) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const enriched = await enrichComplaint(complaint);
  res.json(enriched);
});

router.get("/complaints/:id", async (req, res): Promise<void> => {
  const params = GetComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const complaint = await findRow(TABS.COMPLAINTS, "id", String(params.data.id));
  if (!complaint) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  const enriched = await enrichComplaint(complaint);
  res.json(enriched);
});

router.delete("/complaints/:id", async (req, res): Promise<void> => {
  const params = GetComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await findRow(TABS.COMPLAINTS, "id", String(params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  await deleteRow(TABS.COMPLAINTS, params.data.id);
  res.status(204).end();
  syncToSheets().catch(() => {});
});

router.patch("/complaints/:id", async (req, res): Promise<void> => {
  const params = UpdateComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if ((parsed.data as any).status === "resolved") {
    res.status(400).json({ error: "Use POST /complaints/:id/complete to mark a job as resolved" });
    return;
  }

  const before = await findRow(TABS.COMPLAINTS, "id", String(params.data.id));
  if (!before) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  const updates: Partial<SheetRow> = {};
  const d = parsed.data as any;

  if (d.status != null) updates.status = d.status;
  if (d.urgency != null) {
    updates.urgency = d.urgency;
    updates.urgency_color = urgencyToColor(d.urgency);
  }
  if (d.urgencyColor != null) updates.urgency_color = d.urgencyColor;
  if (d.technicianId != null) updates.technician_id = String(d.technicianId);
  if (d.adminNotes != null) updates.admin_notes = d.adminNotes;
  if (d.completionNotes != null) updates.completion_notes = d.completionNotes;
  if (d.scheduledDate !== undefined) updates.scheduled_date = d.scheduledDate ?? "";

  const rawPendingIds = (req.body as any).pendingTechnicianIds;
  if (rawPendingIds === null) {
    updates.pending_technician_ids = "";
  } else if (Array.isArray(rawPendingIds)) {
    updates.pending_technician_ids = rawPendingIds.length > 0 ? JSON.stringify(rawPendingIds) : "";
  }

  const complaint = await updateRow(TABS.COMPLAINTS, params.data.id, updates);
  const staff = await getRows(TABS.STAFF);
  const enriched = await enrichComplaint(complaint, staff);
  res.json(enriched);

  syncToSheets().catch(() => {});

  const now = new Date().toISOString();

  function getTech(techId: string) {
    const t = staff.find(s => s.id === techId);
    return t ? { name: t.name, phone: t.phone } : { name: "VeKay Solar Technician", phone: "" };
  }

  const baseData = {
    customerName: complaint.customer_name,
    customerEmail: complaint.customer_email,
    ticketId: complaint.ticket_id,
    complaintType: complaint.complaint_type,
    description: complaint.description,
    placeName: complaint.place_name,
    district: complaint.district,
    pincode: complaint.pincode,
    address: complaint.address,
    createdAt: complaint.created_at,
    urgency: complaint.urgency,
    scheduledDate: complaint.scheduled_date || null,
  };

  if (complaint.technician_id && complaint.technician_id !== before.technician_id) {
    const tech = getTech(complaint.technician_id);
    sendTechnicianAssignedEmail({ ...baseData, technicianName: tech.name, technicianPhone: tech.phone });
    sendPushToTechnicians([parseInt(complaint.technician_id)], {
      title: "New Job Assigned",
      body: `Complaint ${complaint.ticket_id} in ${complaint.place_name} has been assigned to you.`,
      data: { url: `/tech/complaints/${complaint.id}` },
    });
  }

  const newPendingIds = parsePendingIds(complaint.pending_technician_ids);
  const oldPendingIds = parsePendingIds(before.pending_technician_ids);
  const addedPendingIds = newPendingIds.filter(id => !oldPendingIds.includes(id));
  if (addedPendingIds.length > 0) {
    sendPushToTechnicians(addedPendingIds, {
      title: "New Job Available",
      body: `Complaint ${complaint.ticket_id} in ${complaint.place_name} — first to accept gets assigned!`,
      data: { url: `/tech/complaints/${complaint.id}` },
    }).catch(() => {});
  }

  if (complaint.status === "going" && before.status !== "going") {
    const tech = complaint.technician_id ? getTech(complaint.technician_id) : { name: "VeKay Solar Technician", phone: "" };
    sendTechnicianGoingEmail({ ...baseData, technicianName: tech.name, technicianPhone: tech.phone, statusAt: now }).catch(() => {});
  }

  if (complaint.status === "reached" && before.status !== "reached") {
    const tech = complaint.technician_id ? getTech(complaint.technician_id) : { name: "VeKay Solar Technician", phone: "" };
    sendTechnicianReachedEmail({ ...baseData, technicianName: tech.name, technicianPhone: tech.phone, statusAt: now }).catch(() => {});
  }
});

router.post("/complaints/:id/accept", async (req, res): Promise<void> => {
  const params = GetComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const session = req.session as any;
  if (!session?.userId || session.role !== "technician") {
    res.status(401).json({ error: "Not authenticated as technician" });
    return;
  }

  const techId: number = session.userId;

  const before = await findRow(TABS.COMPLAINTS, "id", String(params.data.id));
  if (!before) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  const pendingIds = parsePendingIds(before.pending_technician_ids);
  if (!pendingIds.includes(techId) && before.technician_id !== String(techId)) {
    res.status(403).json({ error: "You are not in the pending list for this complaint" });
    return;
  }

  if (before.technician_id && before.technician_id !== String(techId)) {
    res.status(409).json({ error: "This complaint was already accepted by another technician" });
    return;
  }

  const complaint = await updateRow(TABS.COMPLAINTS, params.data.id, {
    technician_id: String(techId),
    pending_technician_ids: "",
    status: before.status === "open" ? "in_progress" : before.status,
  });

  const staff = await getRows(TABS.STAFF);
  const enriched = await enrichComplaint(complaint, staff);
  res.json(enriched);
  syncToSheets().catch(() => {});

  const tech = staff.find(t => t.id === String(techId));
  if (tech) {
    sendTechnicianAssignedEmail({
      customerName: complaint.customer_name,
      customerEmail: complaint.customer_email,
      ticketId: complaint.ticket_id,
      complaintType: complaint.complaint_type,
      description: complaint.description,
      placeName: complaint.place_name,
      district: complaint.district,
      pincode: complaint.pincode,
      address: complaint.address,
      createdAt: complaint.created_at,
      urgency: complaint.urgency,
      scheduledDate: complaint.scheduled_date || null,
      technicianName: tech.name,
      technicianPhone: tech.phone ?? "",
    }).catch(() => {});
  }
});

router.post("/complaints/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CompleteComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const session = req.session as any;
  if (!session?.userId || !["technician", "admin"].includes(session.role)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const before = await findRow(TABS.COMPLAINTS, "id", String(params.data.id));
  if (!before) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  if (before.status === "resolved" || before.status === "closed") {
    res.status(409).json({ error: "This complaint is already resolved" });
    return;
  }

  if (before.status === "open") {
    res.status(400).json({ error: "Cannot complete a job that has not been started yet" });
    return;
  }

  const completedAt = new Date().toISOString();
  const complaint = await updateRow(TABS.COMPLAINTS, params.data.id, {
    status: "resolved",
    completion_notes: parsed.data.completionNotes,
    completed_at: completedAt,
  });

  const staff = await getRows(TABS.STAFF);
  const enriched = await enrichComplaint(complaint, staff);
  res.json(enriched);

  const tech = complaint.technician_id ? staff.find(t => t.id === complaint.technician_id) : null;
  const techName = tech?.name ?? "VeKay Solar Technician";

  sendJobCompletedEmail({
    customerName: complaint.customer_name,
    customerEmail: complaint.customer_email,
    ticketId: complaint.ticket_id,
    complaintType: complaint.complaint_type,
    description: complaint.description,
    placeName: complaint.place_name,
    district: complaint.district,
    pincode: complaint.pincode,
    address: complaint.address,
    createdAt: complaint.created_at,
    urgency: complaint.urgency,
    scheduledDate: complaint.scheduled_date || null,
    technicianName: techName,
    completedAt,
    completionNotes: parsed.data.completionNotes,
  }).catch(() => {});
  syncToSheets().catch(() => {});
});

export default router;

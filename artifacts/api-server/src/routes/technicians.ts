import { Router } from "express";
import type { IRouter } from "express";
import {
  CreateTechnicianBody,
  UpdateTechnicianBody,
  UpdateTechnicianParams,
  GetTechnicianParams,
  GetTechnicianMapParams,
} from "@workspace/api-zod";
import { hashPassword } from "../lib/auth";
import { getRows, appendRow, updateRow, deleteRow, findRow, TABS, type SheetRow } from "../lib/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function parsePendingIds(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as number[]; } catch { return []; }
}

function serializeTechnician(t: SheetRow) {
  return {
    id: parseInt(t.id),
    username: t.username,
    name: t.name,
    phone: t.phone,
    area: t.area,
    email: t.email ?? "",
    isActive: t.is_active === "true",
    roles: (() => { try { return JSON.parse(t.roles ?? "[]"); } catch { return []; } })(),
    createdAt: t.created_at,
  };
}

function serializeComplaint(c: SheetRow, technicianName?: string | null) {
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
    technicianName: technicianName ?? null,
    pendingTechnicianIds: parsePendingIds(c.pending_technician_ids),
    adminNotes: c.admin_notes || null,
    completionNotes: c.completion_notes || null,
    scheduledDate: c.scheduled_date || null,
    completedAt: c.completed_at || null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

router.get("/technicians", async (req, res): Promise<void> => {
  try {
    const techs = await getRows(TABS.STAFF);
    techs.sort((a, b) => a.name.localeCompare(b.name));
    req.log.info({ count: techs.length }, "Staff tab read OK");
    res.json(techs.map(serializeTechnician));
  } catch (err) {
    logger.error({ err }, "Sheets read failed — Staff tab GET /technicians");
    res.status(500).json({ error: "Failed to read technicians from Google Sheets", detail: String(err) });
  }
});

router.post("/technicians", async (req, res): Promise<void> => {
  const parsed = CreateTechnicianBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const passwordHash = hashPassword(parsed.data.password);
  const rolesStr = Array.isArray(req.body.roles) ? JSON.stringify(req.body.roles) : "[]";

  const payload: SheetRow = {
    username: parsed.data.username,
    password_hash: passwordHash,
    name: parsed.data.name,
    phone: parsed.data.phone,
    area: parsed.data.area,
    email: typeof req.body.email === "string" ? req.body.email : "",
    is_active: "true",
    roles: rolesStr,
    push_subscriptions: "[]",
  };

  req.log.info(
    {
      tab: "Staff",
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ?? "1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0",
      fields: Object.keys(payload),
      username: payload.username,
    },
    "Attempting Staff tab appendRow",
  );

  let tech: SheetRow;
  try {
    tech = await appendRow(TABS.STAFF, payload);
  } catch (err: unknown) {
    logger.error(
      {
        err,
        errMessage: err instanceof Error ? err.message : String(err),
        errStack: err instanceof Error ? err.stack : undefined,
        payload: { ...payload, password_hash: "[REDACTED]" },
        tab: "Staff",
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ?? "1DrOdkG6Bm2AleRlq66chzUQ-PUyP6PaGyOrSWZeO1h0",
      },
      "Sheets appendRow FAILED — Staff tab — POST /technicians",
    );
    res.status(500).json({
      error: "Failed to write new technician to Google Sheets",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  req.log.info(
    {
      tab: "Staff",
      assignedId: tech.id,
      username: tech.username,
      createdAt: tech.created_at,
    },
    "Staff tab appendRow SUCCESS — new technician written to Sheet",
  );

  res.status(201).json(serializeTechnician(tech));
});

router.get("/technicians/:id", async (req, res): Promise<void> => {
  const params = GetTechnicianParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const tech = await findRow(TABS.STAFF, "id", String(params.data.id));
    if (!tech) {
      res.status(404).json({ error: "Technician not found" });
      return;
    }

    const allComplaints = await getRows(TABS.COMPLAINTS);
    const assigned = allComplaints
      .filter(c => c.technician_id === String(params.data.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    res.json({
      ...serializeTechnician(tech),
      assignedComplaints: assigned.map(c => serializeComplaint(c, tech.name)),
    });
  } catch (err) {
    logger.error({ err, techId: params.data.id }, "Sheets read failed — GET /technicians/:id");
    res.status(500).json({ error: "Failed to read technician from Google Sheets", detail: String(err) });
  }
});

router.patch("/technicians/:id", async (req, res): Promise<void> => {
  const params = UpdateTechnicianParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTechnicianBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<SheetRow> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.phone != null) updates.phone = parsed.data.phone;
  if (parsed.data.area != null) updates.area = parsed.data.area;
  if (parsed.data.isActive != null) updates.is_active = parsed.data.isActive ? "true" : "false";
  if (parsed.data.password) updates.password_hash = hashPassword(parsed.data.password);
  if (Array.isArray(req.body.roles)) updates.roles = JSON.stringify(req.body.roles);
  if (typeof req.body.email === "string") updates.email = req.body.email;

  req.log.info({ tab: "Staff", techId: params.data.id, updateFields: Object.keys(updates) }, "Attempting Staff tab updateRow");

  let tech: SheetRow;
  try {
    tech = await updateRow(TABS.STAFF, params.data.id, updates);
  } catch (err: unknown) {
    logger.error(
      {
        err,
        errMessage: err instanceof Error ? err.message : String(err),
        techId: params.data.id,
        updateFields: Object.keys(updates),
        tab: "Staff",
      },
      "Sheets updateRow FAILED — Staff tab — PATCH /technicians/:id",
    );
    res.status(500).json({
      error: "Failed to update technician in Google Sheets",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  req.log.info({ tab: "Staff", techId: tech.id, updatedAt: tech.updated_at }, "Staff tab updateRow SUCCESS");
  res.json(serializeTechnician(tech));
});

router.delete("/technicians/:id", async (req, res): Promise<void> => {
  const params = GetTechnicianParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const existing = await findRow(TABS.STAFF, "id", String(params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Technician not found" });
      return;
    }

    const allComplaints = await getRows(TABS.COMPLAINTS);
    const assigned = allComplaints.filter(c => c.technician_id === String(params.data.id));
    if (assigned.length > 0) {
      await Promise.all(assigned.map(c => updateRow(TABS.COMPLAINTS, c.id, { technician_id: "" })));
      req.log.info({ techId: params.data.id, unassigned: assigned.length }, "Unassigned complaints before tech delete");
    }

    await deleteRow(TABS.STAFF, params.data.id);
    req.log.info({ tab: "Staff", techId: params.data.id, username: existing.username }, "Staff tab deleteRow SUCCESS");
    res.status(204).end();
  } catch (err: unknown) {
    logger.error(
      {
        err,
        errMessage: err instanceof Error ? err.message : String(err),
        techId: params.data.id,
        tab: "Staff",
      },
      "Sheets deleteRow FAILED — Staff tab — DELETE /technicians/:id",
    );
    res.status(500).json({
      error: "Failed to delete technician from Google Sheets",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get("/technicians/:id/map", async (req, res): Promise<void> => {
  const params = GetTechnicianMapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const techId = String(params.data.id);
    const allComplaints = await getRows(TABS.COMPLAINTS);

    const assigned = allComplaints
      .filter(c => c.technician_id === techId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const pendingRaw = allComplaints.filter(c => {
      if (c.technician_id) return false;
      if (c.status === "resolved" || c.status === "closed") return false;
      const ids = parsePendingIds(c.pending_technician_ids);
      return ids.includes(params.data.id);
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));

    const assignedIds = new Set(assigned.map(c => c.id));
    const pending = pendingRaw.filter(c => !assignedIds.has(c.id));

    function toPin(c: SheetRow, isPending: boolean) {
      return {
        complaintId: parseInt(c.id),
        ticketId: c.ticket_id,
        customerName: c.customer_name,
        customerPhone: c.customer_phone,
        placeName: c.place_name,
        address: c.address,
        lat: c.lat ? parseFloat(c.lat) : null,
        lng: c.lng ? parseFloat(c.lng) : null,
        locationSource: c.location_source || null,
        urgency: c.urgency,
        urgencyColor: c.urgency_color || "#6b7280",
        status: c.status,
        complaintType: c.complaint_type,
        description: c.description,
        scheduledDate: c.scheduled_date || null,
        adminNotes: c.admin_notes || null,
        isPending,
        createdAt: c.created_at,
      };
    }

    req.log.info({ techId, assigned: assigned.length, pending: pending.length }, "Map pins loaded from Sheets");
    res.json([
      ...assigned.map(c => toPin(c, false)),
      ...pending.map(c => toPin(c, true)),
    ]);
  } catch (err) {
    logger.error({ err, techId: params.data.id }, "Sheets read failed — GET /technicians/:id/map");
    res.status(500).json({ error: "Failed to load map data from Google Sheets", detail: String(err) });
  }
});

export default router;

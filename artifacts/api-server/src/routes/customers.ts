import { Router } from "express";
import type { IRouter } from "express";
import { getRows, updateRow, deleteRow, bulkReplaceCustomers, TABS, type SheetRow } from "../lib/db";
import { syncToSheets } from "../lib/sheets";

const router: IRouter = Router();

function serializeComplaint(c: SheetRow) {
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
    pendingTechnicianIds: [] as number[],
    adminNotes: c.admin_notes || null,
    completionNotes: c.completion_notes || null,
    scheduledDate: c.scheduled_date || null,
    completedAt: c.completed_at || null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

router.get("/customers", async (_req, res): Promise<void> => {
  const all = await getRows(TABS.COMPLAINTS);

  const phoneMap = new Map<string, {
    phone: string; name: string; email: string;
    total: number; open: number; resolved: number;
    firstSeen: string; lastSeen: string;
  }>();

  for (const c of all) {
    const phone = c.customer_phone;
    const existing = phoneMap.get(phone);
    const isOpenOrProgress = c.status === "open" || c.status === "in_progress";
    const isResolved = c.status === "resolved" || c.status === "closed";

    if (!existing) {
      phoneMap.set(phone, {
        phone,
        name: c.customer_name,
        email: c.customer_email,
        total: 1,
        open: isOpenOrProgress ? 1 : 0,
        resolved: isResolved ? 1 : 0,
        firstSeen: c.created_at,
        lastSeen: c.created_at,
      });
    } else {
      existing.total++;
      if (isOpenOrProgress) existing.open++;
      if (isResolved) existing.resolved++;
      if (c.created_at < existing.firstSeen) existing.firstSeen = c.created_at;
      if (c.created_at > existing.lastSeen) existing.lastSeen = c.created_at;
    }
  }

  const rows = Array.from(phoneMap.values())
    .map(v => ({
      phone: v.phone,
      name: v.name,
      email: v.email,
      totalComplaints: v.total,
      openComplaints: v.open,
      resolvedComplaints: v.resolved,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  res.json(rows);
});

router.get("/customers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  if (!phone) {
    res.status(400).json({ error: "Phone required" });
    return;
  }

  const all = await getRows(TABS.COMPLAINTS);
  const complaints = all
    .filter(c => c.customer_phone === phone)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (complaints.length === 0) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json({
    phone: complaints[0].customer_phone,
    name: complaints[0].customer_name,
    email: complaints[0].customer_email,
    totalComplaints: complaints.length,
    complaints: complaints.map(serializeComplaint),
  });
});

/**
 * POST /api/customers/sync
 * Backfill: reads all complaints, derives unique customers with accurate stats,
 * and bulk-replaces the Customers tab. Safe to call multiple times.
 */
router.post("/customers/sync", async (req, res): Promise<void> => {
  const all = await getRows(TABS.COMPLAINTS);

  const phoneMap = new Map<string, {
    name: string; email: string;
    total: number; firstSeen: string; lastSeen: string;
  }>();

  for (const c of all) {
    const phone = c.customer_phone?.trim();
    if (!phone) continue;
    const existing = phoneMap.get(phone);
    if (!existing) {
      phoneMap.set(phone, {
        name: c.customer_name,
        email: c.customer_email,
        total: 1,
        firstSeen: c.created_at,
        lastSeen: c.created_at,
      });
    } else {
      existing.total++;
      // Keep most-recent name/email in case they differ across complaints
      if (c.created_at > existing.lastSeen) {
        existing.lastSeen = c.created_at;
        existing.name = c.customer_name;
        existing.email = c.customer_email;
      }
      if (c.created_at < existing.firstSeen) existing.firstSeen = c.created_at;
    }
  }

  const rows: SheetRow[] = Array.from(phoneMap.entries()).map(([phone, v]) => ({
    phone,
    name: v.name,
    email: v.email,
    total_complaints: String(v.total),
    first_seen: v.firstSeen,
    last_seen: v.lastSeen,
  }));

  await bulkReplaceCustomers(rows);
  res.json({ synced: rows.length });
});

router.patch("/customers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  if (!phone) {
    res.status(400).json({ error: "Phone required" });
    return;
  }

  const { name, email } = req.body as { name?: string; email?: string };
  if (!name && !email) {
    res.status(400).json({ error: "Provide at least name or email to update" });
    return;
  }

  const all = await getRows(TABS.COMPLAINTS);
  const matching = all.filter(c => c.customer_phone === phone);
  if (matching.length === 0) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const updates: Partial<SheetRow> = {};
  if (name) updates.customer_name = name;
  if (email) updates.customer_email = email;

  await Promise.all(matching.map(c => updateRow(TABS.COMPLAINTS, c.id, updates)));

  res.json({ updated: matching.length });
  syncToSheets().catch(() => {});
});

router.delete("/customers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  if (!phone) {
    res.status(400).json({ error: "Phone required" });
    return;
  }

  const all = await getRows(TABS.COMPLAINTS);
  const matching = all.filter(c => c.customer_phone === phone);
  if (matching.length === 0) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  for (const c of matching) {
    await deleteRow(TABS.COMPLAINTS, c.id);
  }

  res.status(204).end();
  syncToSheets().catch(() => {});
});

export default router;

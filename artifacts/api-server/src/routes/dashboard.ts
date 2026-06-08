import { Router } from "express";
import type { IRouter } from "express";
import { getRows, TABS } from "../lib/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [all, techs] = await Promise.all([
    getRows(TABS.COMPLAINTS),
    getRows(TABS.STAFF),
  ]);

  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const summary = {
    totalComplaints: all.length,
    openComplaints: all.filter(c => c.status === "open").length,
    inProgress: all.filter(c => c.status === "in_progress").length,
    resolved: all.filter(c => c.status === "resolved").length,
    closed: all.filter(c => c.status === "closed").length,
    critical: all.filter(c => c.urgency === "critical").length,
    highUrgency: all.filter(c => c.urgency === "high").length,
    totalTechnicians: techs.length,
    activeTechnicians: techs.filter(t => t.is_active === "true").length,
    todayComplaints: all.filter(c => c.created_at.startsWith(todayISO)).length,
  };

  res.json(summary);
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === "string" ? Math.min(parseInt(limitRaw, 10) || 20, 50) : 20;

  const all = await getRows(TABS.COMPLAINTS);
  all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const complaints = all.slice(0, limit);

  const activity = complaints.map(c => ({
    id: parseInt(c.id),
    ticketId: c.ticket_id,
    customerName: c.customer_name,
    placeName: c.place_name,
    urgency: c.urgency,
    urgencyColor: c.urgency_color || null,
    action: c.status === "resolved" ? "resolved" : c.status === "in_progress" ? "in_progress" : "registered",
    createdAt: c.updated_at,
  }));

  res.json(activity);
});

router.get("/dashboard/urgency-breakdown", async (_req, res): Promise<void> => {
  const all = await getRows(TABS.COMPLAINTS);
  const urgencyMap: Record<string, { urgency: string; urgencyColor: string; count: number }> = {
    low:      { urgency: "low",      urgencyColor: "#3b82f6", count: 0 },
    medium:   { urgency: "medium",   urgencyColor: "#f97316", count: 0 },
    high:     { urgency: "high",     urgencyColor: "#dc2626", count: 0 },
    critical: { urgency: "critical", urgencyColor: "#7f1d1d", count: 0 },
  };

  for (const c of all) {
    if (urgencyMap[c.urgency]) urgencyMap[c.urgency].count++;
  }

  res.json(Object.values(urgencyMap));
});

router.get("/dashboard/technician-workload", async (_req, res): Promise<void> => {
  const [techs, complaints] = await Promise.all([
    getRows(TABS.STAFF),
    getRows(TABS.COMPLAINTS),
  ]);

  const workload = techs.map(t => {
    const assigned = complaints.filter(c => c.technician_id === t.id);
    return {
      technicianId: parseInt(t.id),
      technicianName: t.name,
      area: t.area,
      total: assigned.length,
      open: assigned.filter(c => c.status === "open").length,
      inProgress: assigned.filter(c => c.status === "in_progress").length,
      resolved: assigned.filter(c => c.status === "resolved").length,
    };
  });

  res.json(workload);
});

export default router;

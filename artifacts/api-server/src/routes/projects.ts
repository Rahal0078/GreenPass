import { Router } from "express";
import type { IRouter } from "express";
import {
  syncProjectToSheet,
  deleteProjectFromSheet,
  importFromSourceSheet,
  parseArr,
  parseStageLog,
  updateClientColumnsInSheet,
  readStageLabels,
} from "../lib/sheets-projects";
import { logger } from "../lib/logger";
import { nowIST, addLog, dateToIST } from "../lib/utils";
import { getRows, appendRow, updateRow, deleteRow, findRow, TABS, type SheetRow } from "../lib/db";

const router: IRouter = Router();

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function sheetRowToProjectLike(p: SheetRow) {
  return {
    id: parseInt(p.id),
    registeredAt: p.registered_at,
    flNo: p.fl_no,
    customerName: p.customer_name,
    place: p.place,
    kw: p.kw,
    phone: p.phone,
    email: p.email || undefined,
    consumerNo: p.consumer_no,
    totalAmount: p.total_amount,
    gmapLink: p.gmap_link || undefined,
    coordinator: p.coordinator || undefined,
    quotation: p.quotation || "PENDING",
    quotationFileId: p.quotation_file_id || undefined,
    quotationToken: p.quotation_token || undefined,
    quotationClientToken: p.quotation_client_token || undefined,
    stages: p.stages,
    stageRemarks: p.stage_remarks,
    stageLog: p.stage_log || "[]",
    remark: p.remark,
    activityLog: p.activity_log,
    closureStatus: p.closure_status || "PENDING",
    closureToken: p.closure_token || null,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  };
}

function projectOut(p: SheetRow) {
  return {
    id: parseInt(p.id),
    registeredAt: p.registered_at,
    flNo: p.fl_no,
    customerName: p.customer_name,
    place: p.place,
    kw: p.kw,
    phone: p.phone,
    consumerNo: p.consumer_no,
    totalAmount: p.total_amount,
    email: p.email ?? "",
    gmapLink: p.gmap_link ?? "",
    coordinator: p.coordinator ?? "",
    quotation: p.quotation ?? "PENDING",
    quotationFileId: p.quotation_file_id ?? "",
    closureStatus: p.closure_status ?? "PENDING",
    stages: parseArr(p.stages, 12),
    stageRemarks: parseArr(p.stage_remarks, 12),
    stageLog: parseStageLog(p.stage_log ?? "[]", 12),
    remark: p.remark,
    activityLog: (() => {
      try { return JSON.parse(p.activity_log); } catch { return []; }
    })(),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function requireAdmin(req: any, res: any): boolean {
  if (!req.session?.userId || req.session?.role !== "admin") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/projects/stage-labels", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const labels = await readStageLabels();
    res.json(labels);
  } catch (err: any) {
    logger.warn({ err }, "Could not read stage labels from Sheet; returning defaults");
    res.status(500).json({ error: "Failed to read stage labels" });
  }
});

router.get("/projects", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const all = await getRows(TABS.PROJECTS);
  all.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  res.json(all.map(projectOut));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  const p = await findRow(TABS.PROJECTS, "id", String(id));
  if (!p) { res.status(404).json({ error: "Not found" }); return; }
  res.json(projectOut(p));
});

router.post("/projects", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const {
    registeredAt, flNo = "", customerName, place = "", kw = "",
    phone = "", email = "", consumerNo = "", totalAmount = "",
    gmapLink = "", coordinator = "", quotation = "", remark = "",
  } = req.body;
  if (!customerName) { res.status(400).json({ error: "customerName required" }); return; }

  const log = addLog("[]", req.session.name ?? "Admin", "Project created");

  const created = await appendRow(TABS.PROJECTS, {
    registered_at: registeredAt || todayIST(),
    fl_no: flNo,
    customer_name: customerName,
    place,
    kw,
    phone,
    email,
    consumer_no: consumerNo,
    total_amount: totalAmount,
    gmap_link: gmapLink,
    coordinator,
    quotation: quotation || "PENDING",
    quotation_file_id: "",
    quotation_token: "",
    quotation_client_token: "",
    stages: JSON.stringify(Array(12).fill("")),
    stage_remarks: JSON.stringify(Array(12).fill("")),
    stage_log: JSON.stringify(Array(12).fill([])),
    remark,
    activity_log: log,
    closure_status: "PENDING",
    closure_token: "",
  });

  try {
    await syncProjectToSheet(sheetRowToProjectLike(created));
  } catch (err) {
    logger.warn({ err, id: created.id }, "Sheet sync failed on create");
  }
  res.status(201).json(projectOut(created));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  const existing = await findRow(TABS.PROJECTS, "id", String(id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const {
    registeredAt, flNo, customerName, place, kw, phone, email,
    consumerNo, totalAmount, gmapLink, coordinator, quotation,
    stages, stageRemarks, remark, logEntry, stageDate,
  } = req.body;

  const clientFieldUpdates: Record<string, string> = {};
  if (flNo !== undefined)         clientFieldUpdates.flNo = flNo;
  if (customerName !== undefined)  clientFieldUpdates.customerName = customerName;
  if (place !== undefined)         clientFieldUpdates.place = place;
  if (kw !== undefined)            clientFieldUpdates.kw = kw;
  if (phone !== undefined)         clientFieldUpdates.phone = phone;
  if (email !== undefined)         clientFieldUpdates.email = email;
  if (consumerNo !== undefined)    clientFieldUpdates.consumerNo = consumerNo;
  if (totalAmount !== undefined)   clientFieldUpdates.totalAmount = totalAmount;
  if (gmapLink !== undefined)      clientFieldUpdates.gmapLink = gmapLink;
  if (coordinator !== undefined)   clientFieldUpdates.coordinator = coordinator;

  if (Object.keys(clientFieldUpdates).length > 0) {
    updateClientColumnsInSheet(id, clientFieldUpdates).catch(err =>
      logger.warn({ err, id }, "Could not update client columns in Sheets"),
    );
  }

  const updates: Partial<SheetRow> = {};
  if (registeredAt !== undefined) updates.registered_at = registeredAt;
  if (flNo !== undefined) updates.fl_no = flNo;
  if (customerName !== undefined) updates.customer_name = customerName;
  if (place !== undefined) updates.place = place;
  if (kw !== undefined) updates.kw = kw;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (consumerNo !== undefined) updates.consumer_no = consumerNo;
  if (totalAmount !== undefined) updates.total_amount = totalAmount;
  if (gmapLink !== undefined) updates.gmap_link = gmapLink;
  if (coordinator !== undefined) updates.coordinator = coordinator;
  if (quotation !== undefined) updates.quotation = quotation;

  if (stages !== undefined && Array.isArray(stages)) {
    const existingStages = parseArr(existing.stages, 12);
    const stageLogArr = parseStageLog(existing.stage_log ?? "[]", 12);
    const savedNow = nowIST();
    const stageTs = (stageDate && typeof stageDate === "string")
      ? `${dateToIST(stageDate)} (recorded ${savedNow})`
      : savedNow;
    (stages as string[]).forEach((newVal: string, i: number) => {
      if (newVal !== existingStages[i]) stageLogArr[i].push(stageTs);
    });
    updates.stages = JSON.stringify(stages);
    updates.stage_log = JSON.stringify(stageLogArr);
  }
  if (stageRemarks !== undefined && Array.isArray(stageRemarks)) {
    updates.stage_remarks = JSON.stringify(stageRemarks);
  }
  if (remark !== undefined) updates.remark = remark;

  if (logEntry) {
    updates.activity_log = addLog(existing.activity_log, req.session.name ?? "Admin", logEntry);
  }

  const updated = await updateRow(TABS.PROJECTS, id, updates);

  let sheetSynced = false;
  let sheetError: string | undefined;
  try {
    await syncProjectToSheet(sheetRowToProjectLike(updated));
    sheetSynced = true;
  } catch (err: any) {
    sheetError = err?.message ?? "Sheet sync failed";
    logger.warn({ err, id }, "Sheet sync failed for project");
  }

  res.json({ ...projectOut(updated), sheetSynced, sheetError });
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  const existing = await findRow(TABS.PROJECTS, "id", String(id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  await deleteRow(TABS.PROJECTS, id);
  try {
    await deleteProjectFromSheet(id);
  } catch (err) {
    logger.warn({ err, id }, "Reporting sheet row deletion failed");
  }
  res.json({ ok: true });
});

router.post("/projects/import", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rows = await importFromSourceSheet();
  if (rows.length === 0) { res.json({ imported: 0, skipped: 0 }); return; }

  const existing = await getRows(TABS.PROJECTS);
  const existingSet = new Set(existing.map(e => e.customer_name.toLowerCase().trim()));

  const ts = nowIST();
  const actor = req.session.name ?? "Admin";

  let imported = 0, skipped = 0;
  for (const row of rows) {
    if (existingSet.has(row.customerName.toLowerCase().trim())) { skipped++; continue; }
    const log = JSON.stringify([{ ts, actor, text: "Imported from Google Sheet" }]);
    await appendRow(TABS.PROJECTS, {
      registered_at: todayIST(),
      fl_no: row.flNo,
      customer_name: row.customerName,
      place: row.place,
      kw: row.kw,
      phone: row.phone,
      email: "",
      consumer_no: row.consumerNo,
      total_amount: row.totalAmount,
      gmap_link: "",
      coordinator: "",
      quotation: "PENDING",
      quotation_file_id: "",
      quotation_token: "",
      quotation_client_token: "",
      stages: JSON.stringify(row.stages),
      stage_remarks: JSON.stringify(Array(12).fill("")),
      stage_log: JSON.stringify(Array(12).fill([])),
      remark: row.remark,
      activity_log: log,
      closure_status: "PENDING",
      closure_token: "",
    });
    imported++;
  }

  res.json({ imported, skipped });
});

router.post("/projects/sync-emails", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { readProjectEmailsFromSheet } = await import("../lib/sheets-projects");
  const sheetEmails = await readProjectEmailsFromSheet();
  let updated = 0;
  for (const { id, email } of sheetEmails) {
    const proj = await findRow(TABS.PROJECTS, "id", String(id));
    if (proj && proj.email !== email) {
      await updateRow(TABS.PROJECTS, id, { email });
      updated++;
    }
  }
  res.json({ ok: true, updated, total: sheetEmails.length });
});

router.post("/projects/rebuild-sheet", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { rebuildProjectsSheet } = await import("../lib/sheets-projects");
  const all = await getRows(TABS.PROJECTS);
  all.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  await rebuildProjectsSheet(all.map(sheetRowToProjectLike) as any);
  res.json({ ok: true, rows: all.length });
});

export default router;

import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { randomBytes } from "crypto";
import { findRow, updateRow, TABS } from "../lib/db";
import { sendClosureCoordinatorEmail, type ClosureEmailData } from "../lib/email";
import { syncProjectToSheet } from "../lib/sheets-projects";
import { logger } from "../lib/logger";
import { addLog } from "../lib/utils";
import type { SheetRow } from "../lib/db";

const router: IRouter = Router();

function appOrigin(req: Request): string {
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  return `${req.protocol}://${req.get("host")}`;
}

function buildClosureUrls(req: Request, token: string) {
  const origin = appOrigin(req);
  const base = (process.env.BASE_PATH ?? "").replace(/\/$/, "");
  return {
    approveUrl: `${origin}${base}/api/closure/approve/${token}`,
    rejectUrl:  `${origin}${base}/api/closure/reject/${token}`,
  };
}

async function resolveCoordinatorEmail(coordinatorName: string | null): Promise<string> {
  if (coordinatorName) {
    const coord = await findRow(TABS.STAFF, "name", coordinatorName);
    if (coord?.email) return coord.email;
  }
  return "info.vekay@gmail.com";
}

function actorName(req: Request): string {
  return (req as any).session?.name ?? "Admin";
}

function isAdmin(req: Request): boolean {
  return !!(req as any).session?.userId && (req as any).session?.role === "admin";
}

function emailPayload(project: SheetRow, approveUrl: string, rejectUrl: string): ClosureEmailData {
  return {
    projectId:    parseInt(project.id),
    customerName: project.customer_name,
    place:        project.place,
    kw:           project.kw,
    flNo:         project.fl_no  || undefined,
    phone:        project.phone  || undefined,
    approveUrl,
    rejectUrl,
  };
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

router.post("/projects/:id/closure/request", async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(String(req.params.id));
  try {
    const project = await findRow(TABS.PROJECTS, "id", String(id));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (project.closure_status === "APPROVED") { res.status(400).json({ error: "Project is already closed." }); return; }

    const token = randomBytes(32).toString("hex");
    const { approveUrl, rejectUrl } = buildClosureUrls(req, token);
    const coordinatorEmail = await resolveCoordinatorEmail(project.coordinator || null);

    const updated = await updateRow(TABS.PROJECTS, id, {
      closure_status: "REQUESTED",
      closure_token: token,
      activity_log: addLog(project.activity_log, actorName(req), "Project closure request sent to coordinator for approval"),
    });

    syncProjectToSheet(sheetRowToProjectLike(updated)).catch(err =>
      logger.warn({ err, id }, "Sheet sync failed after closure request"),
    );

    try {
      await sendClosureCoordinatorEmail(coordinatorEmail, emailPayload(project, approveUrl, rejectUrl));
    } catch (err) {
      logger.warn({ err, id }, "Failed to send closure coordinator email");
    }

    res.json({ ok: true, closureStatus: "REQUESTED", coordinatorEmail });
  } catch (err: any) {
    logger.error({ err, id }, "Closure request failed");
    res.status(500).json({ error: `Failed: ${err?.message ?? "Unknown error"}` });
  }
});

router.get("/closure/approve/:token", async (req: Request, res: Response): Promise<void> => {
  const token = String(req.params.token);
  const project = await findRow(TABS.PROJECTS, "closure_token", token);

  if (!project) { res.status(404).send(htmlResult("Invalid Link", "This link is invalid or has already been used.", "error")); return; }
  if (project.closure_status !== "REQUESTED") {
    res.send(htmlResult("Already Processed", `This project has already been ${project.closure_status === "APPROVED" ? "closed" : "processed"}.`, "info"));
    return;
  }

  const approved = await updateRow(TABS.PROJECTS, parseInt(project.id), {
    closure_status: "APPROVED",
    closure_token: "",
    activity_log: addLog(project.activity_log, "Coordinator", "Project closure approved by coordinator — project is now closed"),
  });

  syncProjectToSheet(sheetRowToProjectLike(approved)).catch(err =>
    logger.warn({ err, id: project.id }, "Sheet sync failed after closure approval"),
  );

  res.send(htmlResult(
    "✅ Closure Approved",
    `The project for <strong>${project.customer_name}</strong> has been officially closed. All stages are complete.`,
    "success",
  ));
});

router.get("/closure/reject/:token", async (req: Request, res: Response): Promise<void> => {
  const token = String(req.params.token);
  const project = await findRow(TABS.PROJECTS, "closure_token", token);

  if (!project) { res.status(404).send(htmlResult("Invalid Link", "This link is invalid or has already been used.", "error")); return; }
  if (project.closure_status !== "REQUESTED") { res.send(htmlResult("Already Processed", "This request has already been processed.", "info")); return; }

  const rejected = await updateRow(TABS.PROJECTS, parseInt(project.id), {
    closure_status: "REJECTED",
    closure_token: "",
    activity_log: addLog(project.activity_log, "Coordinator", "Project closure rejected by coordinator — review required"),
  });

  syncProjectToSheet(sheetRowToProjectLike(rejected)).catch(err =>
    logger.warn({ err, id: project.id }, "Sheet sync failed after closure rejection"),
  );

  res.send(htmlResult(
    "❌ Closure Rejected",
    `The closure request for <strong>${project.customer_name}</strong> has been rejected. The admin team has been notified.`,
    "error",
  ));
});

function htmlResult(title: string, body: string, type: "success" | "error" | "info"): string {
  const palette = {
    success: { bg: "#f0fdf4", border: "#16a34a", icon: "✅", heading: "#15803d" },
    error:   { bg: "#fef2f2", border: "#dc2626", icon: "❌", heading: "#b91c1c" },
    info:    { bg: "#eff6ff", border: "#2563eb", icon: "ℹ️", heading: "#1d4ed8" },
  }[type];

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — VeKay Solar</title>
  <style>*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}</style>
  </head><body>
  <div style="background:#fff;border-radius:14px;box-shadow:0 2px 16px rgba(0,0,0,0.10);max-width:480px;width:100%;overflow:hidden;">
    <div style="background:#1a5c38;padding:24px 28px;color:white;">
      <p style="margin:0;font-size:18px;font-weight:700;">VeKay Solar</p>
      <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">Kerala's Leading Solar Project Expert</p>
    </div>
    <div style="background:${palette.bg};border-left:4px solid ${palette.border};padding:28px 28px 20px;margin:24px 24px 0;">
      <p style="margin:0 0 10px;font-size:22px;">${palette.icon}</p>
      <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:${palette.heading};">${title}</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${body}</p>
    </div>
    <div style="padding:20px 28px 28px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You can close this window safely.</p>
    </div>
  </div>
  </body></html>`;
}

export default router;

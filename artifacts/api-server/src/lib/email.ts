import { logger } from "./logger";

const SENDER_EMAIL = process.env.SENDER_EMAIL ?? "info.vekay@gmail.com";
const COMPANY_NAME = process.env.COMPANY_NAME ?? "GreenPass Technologies";
const COMPANY_TAGLINE = process.env.COMPANY_TAGLINE ?? "Kerala's Leading Solar Project Expert";
const BRAND_GREEN = "#1a5c38";
const BRAND_LIGHT = "#f0fdf4";

// ─── Shared helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) + " IST";
}

function header(title: string, subtitle: string, iconEmoji: string, accentColor = BRAND_GREEN) {
  return `
  <div style="background:${accentColor};color:white;padding:28px 32px;border-radius:10px 10px 0 0;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:36px;line-height:1;">${iconEmoji}</span>
      <div>
        <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.5px;">${COMPANY_NAME}</p>
        <p style="margin:2px 0 0;font-size:12px;opacity:0.8;">${COMPANY_TAGLINE}</p>
      </div>
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.25);">
      <p style="margin:0;font-size:18px;font-weight:600;">${title}</p>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.85;">${subtitle}</p>
    </div>
  </div>`;
}

function ticketBadge(ticketId: string) {
  return `
  <div style="background:${BRAND_LIGHT};border:2px solid #16a34a;border-radius:8px;padding:18px 24px;margin:24px 0;text-align:center;">
    <p style="margin:0 0 6px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Complaint Reference</p>
    <p style="margin:0;font-size:30px;font-weight:800;color:${BRAND_GREEN};letter-spacing:4px;font-family:monospace;">${ticketId}</p>
    <p style="margin:6px 0 0;color:#6b7280;font-size:12px;">Keep this ID to track your complaint at any time</p>
  </div>`;
}

function detailTable(rows: [string, string][]) {
  const cells = rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "white"};">
      <td style="padding:11px 16px;font-size:13px;color:#6b7280;width:38%;font-weight:500;">${label}</td>
      <td style="padding:11px 16px;font-size:13px;color:#111827;font-weight:500;">${value}</td>
    </tr>`).join("");
  return `
  <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin:16px 0;">
    <tbody>${cells}</tbody>
  </table>`;
}

function progressBar(steps: { label: string; done: boolean; active: boolean }[]) {
  const items = steps.map((s, i) => {
    const dotColor = s.done ? "#16a34a" : s.active ? BRAND_GREEN : "#d1d5db";
    const textColor = s.done || s.active ? "#111827" : "#9ca3af";
    const lineColor = s.done ? "#16a34a" : "#e5e7eb";
    const connector = i < steps.length - 1
      ? `<div style="flex:1;height:2px;background:${lineColor};margin:0 4px;"></div>` : "";
    return `
      <div style="display:flex;align-items:center;flex:${i < steps.length - 1 ? 1 : 0};">
        <div style="text-align:center;min-width:60px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${dotColor};margin:0 auto;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:13px;font-weight:700;">${s.done ? "✓" : String(i + 1)}</span>
          </div>
          <p style="margin:4px 0 0;font-size:10px;color:${textColor};font-weight:${s.active ? "700" : "400"};white-space:nowrap;">${s.label}</p>
        </div>
        ${connector}
      </div>`;
  }).join("");
  return `
  <div style="margin:24px 0;">
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Job Progress</p>
    <div style="display:flex;align-items:center;">
      ${items}
    </div>
  </div>`;
}

function alertBox(text: string, bgColor: string, borderColor: string, textColor: string) {
  return `
  <div style="background:${bgColor};border-left:4px solid ${borderColor};border-radius:6px;padding:14px 18px;margin:16px 0;">
    <p style="margin:0;font-size:14px;color:${textColor};">${text}</p>
  </div>`;
}

function footer() {
  return `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:13px;color:#374151;">
      For assistance, reach us at <a href="mailto:${SENDER_EMAIL}" style="color:${BRAND_GREEN};font-weight:600;">${SENDER_EMAIL}</a>
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
      This is an automated notification from ${COMPANY_NAME} CRM. Please do not reply directly to this email.
    </p>
  </div>`;
}

function wrap(headerHtml: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;background:#f3f4f6;">
  <div style="background:white;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
    ${headerHtml}
    <div style="padding:28px 32px;">
      ${body}
    </div>
  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af;">
    © ${COMPANY_NAME} · Kerala, India · <a href="mailto:${SENDER_EMAIL}" style="color:#9ca3af;">${SENDER_EMAIL}</a>
  </p>
</body>
</html>`;
}

// ─── Email data interfaces ─────────────────────────────────────────────────

export interface TicketEmailData {
  customerName: string;
  customerEmail: string;
  ticketId: string;
  complaintType: string;
  description: string;
  placeName: string;
  district: string;
  pincode: string;
  address: string;
  createdAt: string;
  scheduledDate?: string | null;
}

export interface AssignedEmailData extends TicketEmailData {
  technicianName: string;
  technicianPhone: string;
  urgency: string;
}

export interface StatusUpdateEmailData extends TicketEmailData {
  technicianName: string;
  technicianPhone: string;
  statusAt: string;
  urgency: string;
}

export interface CompletedEmailData extends TicketEmailData {
  technicianName: string;
  completedAt: string;
  completionNotes: string;
  urgency: string;
}

export interface DailyReportEmailData {
  date: string;
  totalComplaints: number;
  newComplaints: number;
  resolved: number;
  byUrgency: { urgency: string; count: number }[];
  complaints: Array<{
    ticketId: string;
    customerName: string;
    customerPhone: string;
    placeName: string;
    district: string;
    complaintType: string;
    status: string;
    urgency: string;
    technicianName?: string | null;
    createdAt: string;
    completedAt?: string | null;
  }>;
}

// ─── HTML builders ─────────────────────────────────────────────────────────

function buildRegistrationHtml(d: TicketEmailData): string {
  const steps = [
    { label: "Registered", done: true, active: false },
    { label: "Assigned", done: false, active: false },
    { label: "On the Way", done: false, active: false },
    { label: "Resolved", done: false, active: false },
  ];
  const body = `
    <p style="color:#374151;font-size:15px;margin-bottom:4px;">Dear <strong>${d.customerName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;margin-top:4px;">
      Your solar complaint has been successfully registered with ${COMPANY_NAME}. Our team will review your case and assign a qualified technician shortly.
    </p>
    ${ticketBadge(d.ticketId)}
    ${progressBar(steps)}
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Complaint Details</h3>
    ${detailTable([
      ["Complaint Type", d.complaintType],
      ["Description", d.description],
      ["Location", `${d.placeName}, ${d.district}`],
      ["Address", d.address],
      ["Pincode", d.pincode],
      ...(d.scheduledDate ? [["Preferred Service Date", new Date(d.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })] as [string, string]] : []),
      ["Registered On", fmtDate(d.createdAt)],
    ])}
    ${alertBox(
      `<strong>📌 Track your complaint anytime</strong> — Use ticket ID <strong style="font-family:monospace;font-size:15px;">${d.ticketId}</strong> on our website to check the latest status of your request.`,
      "#fffbeb", "#f59e0b", "#92400e"
    )}
    <p style="color:#6b7280;font-size:13px;">Our typical response time is within 24–48 hours. For urgent issues, please contact us directly.</p>
    <p style="color:#374151;font-size:14px;margin-top:24px;">
      Warm regards,<br>
      <strong style="color:${BRAND_GREEN};">${COMPANY_NAME} Customer Support</strong>
    </p>
    ${footer()}`;
  return wrap(header("Complaint Registered Successfully", "We've received your request and will be in touch soon.", "🌞"), body);
}

function buildAssignedHtml(d: AssignedEmailData): string {
  const steps = [
    { label: "Registered", done: true, active: false },
    { label: "Assigned", done: false, active: true },
    { label: "On the Way", done: false, active: false },
    { label: "Resolved", done: false, active: false },
  ];
  const body = `
    <p style="color:#374151;font-size:15px;margin-bottom:4px;">Dear <strong>${d.customerName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;margin-top:4px;">
      Great news! A qualified technician from ${COMPANY_NAME} has been assigned to your complaint. They will contact you soon to schedule the visit.
    </p>
    ${ticketBadge(d.ticketId)}
    ${progressBar(steps)}
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Assigned Technician</h3>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 22px;margin:8px 0 20px;display:flex;gap:16px;align-items:center;">
      <div style="width:48px;height:48px;border-radius:50%;background:${BRAND_GREEN};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:white;font-size:22px;">👷</span>
      </div>
      <div>
        <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${d.technicianName}</p>
        <p style="margin:3px 0 0;font-size:13px;color:#6b7280;">${COMPANY_NAME} Field Technician</p>
        ${d.technicianPhone ? `<a href="tel:${d.technicianPhone}" style="display:inline-block;margin-top:6px;font-size:13px;color:${BRAND_GREEN};font-weight:600;text-decoration:none;">📞 ${d.technicianPhone}</a>` : ""}
      </div>
    </div>
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Your Complaint Summary</h3>
    ${detailTable([
      ["Complaint Type", d.complaintType],
      ["Description", d.description],
      ["Location", `${d.placeName}, ${d.district}`],
      ["Address", d.address],
      ["Pincode", d.pincode],
      ["Priority", d.urgency.charAt(0).toUpperCase() + d.urgency.slice(1)],
      ...(d.scheduledDate ? [["Preferred Service Date", new Date(d.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })] as [string, string]] : []),
      ["Registered On", fmtDate(d.createdAt)],
    ])}
    ${alertBox(
      "💡 The technician may call you before visiting to confirm your availability. Please keep your phone reachable.",
      "#eff6ff", "#3b82f6", "#1e40af"
    )}
    <p style="color:#374151;font-size:14px;margin-top:24px;">
      Warm regards,<br>
      <strong style="color:${BRAND_GREEN};">${COMPANY_NAME} Customer Support</strong>
    </p>
    ${footer()}`;
  return wrap(header("Technician Assigned to Your Complaint", `${d.technicianName} will be handling your service request.`, "👷", "#1e40af"), body);
}

function buildGoingHtml(d: StatusUpdateEmailData): string {
  const steps = [
    { label: "Registered", done: true, active: false },
    { label: "Assigned", done: true, active: false },
    { label: "On the Way", done: false, active: true },
    { label: "Resolved", done: false, active: false },
  ];
  const body = `
    <p style="color:#374151;font-size:15px;margin-bottom:4px;">Dear <strong>${d.customerName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;margin-top:4px;">
      Your ${COMPANY_NAME} technician is now on the way to your location. Please ensure someone is available to receive them at the address provided.
    </p>
    ${ticketBadge(d.ticketId)}
    ${progressBar(steps)}
    <div style="background:#fff7ed;border:2px solid #fb923c;border-radius:8px;padding:18px 22px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#9a3412;">🚗 Technician is on the way!</p>
      <p style="margin:0;font-size:13px;color:#7c2d12;">
        <strong>${d.technicianName}</strong> departed at <strong>${fmtDate(d.statusAt)}</strong> and is heading to your location.
        ${d.technicianPhone ? `You can reach them at <a href="tel:${d.technicianPhone}" style="color:#c2410c;font-weight:600;">${d.technicianPhone}</a>.` : ""}
      </p>
    </div>
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Service Location</h3>
    ${detailTable([
      ["Technician", d.technicianName],
      ["Complaint Type", d.complaintType],
      ["Your Address", d.address],
      ["Place", `${d.placeName}, ${d.district} – ${d.pincode}`],
      ["Departed At", fmtDate(d.statusAt)],
    ])}
    ${alertBox(
      "✅ <strong>Please be at home</strong> and ensure access to your solar installation is available. If you need to reschedule, contact us immediately.",
      "#f0fdf4", "#22c55e", "#166534"
    )}
    <p style="color:#374151;font-size:14px;margin-top:24px;">
      Warm regards,<br>
      <strong style="color:${BRAND_GREEN};">${COMPANY_NAME} Customer Support</strong>
    </p>
    ${footer()}`;
  return wrap(header("Your Technician is On the Way", "Please be ready to receive the service team at your location.", "🚗", "#c2410c"), body);
}

function buildReachedHtml(d: StatusUpdateEmailData): string {
  const steps = [
    { label: "Registered", done: true, active: false },
    { label: "Assigned", done: true, active: false },
    { label: "On the Way", done: true, active: false },
    { label: "On-site", done: false, active: true },
    { label: "Resolved", done: false, active: false },
  ];
  const body = `
    <p style="color:#374151;font-size:15px;margin-bottom:4px;">Dear <strong>${d.customerName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;margin-top:4px;">
      Your ${COMPANY_NAME} technician has arrived at your location and is ready to begin the service. Please assist them with access to your solar installation.
    </p>
    ${ticketBadge(d.ticketId)}
    ${progressBar(steps)}
    <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:18px 22px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#14532d;">📍 Technician has arrived!</p>
      <p style="margin:0;font-size:13px;color:#166534;">
        <strong>${d.technicianName}</strong> arrived at <strong>${fmtDate(d.statusAt)}</strong> and is at your premises.
        ${d.technicianPhone ? `Direct line: <a href="tel:${d.technicianPhone}" style="color:${BRAND_GREEN};font-weight:600;">${d.technicianPhone}</a>` : ""}
      </p>
    </div>
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Service Details</h3>
    ${detailTable([
      ["Technician", d.technicianName],
      ["Complaint Type", d.complaintType],
      ["Description", d.description],
      ["Location", `${d.placeName}, ${d.district}`],
      ["Arrived At", fmtDate(d.statusAt)],
    ])}
    ${alertBox(
      "🔧 The technician will inspect your system and carry out the necessary repairs. You will receive a final confirmation email once the job is completed.",
      "#eff6ff", "#3b82f6", "#1e40af"
    )}
    <p style="color:#374151;font-size:14px;margin-top:24px;">
      Warm regards,<br>
      <strong style="color:${BRAND_GREEN};">${COMPANY_NAME} Customer Support</strong>
    </p>
    ${footer()}`;
  return wrap(header("Technician Has Arrived at Your Location", "Service is now in progress at your premises.", "📍", "#059669"), body);
}

function buildCompletedHtml(d: CompletedEmailData): string {
  const steps = [
    { label: "Registered", done: true, active: false },
    { label: "Assigned", done: true, active: false },
    { label: "On the Way", done: true, active: false },
    { label: "On-site", done: true, active: false },
    { label: "Resolved ✓", done: true, active: true },
  ];
  const body = `
    <p style="color:#374151;font-size:15px;margin-bottom:4px;">Dear <strong>${d.customerName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;margin-top:4px;">
      We're pleased to inform you that your solar complaint has been successfully resolved by our technician. Thank you for your patience and for choosing ${COMPANY_NAME}.
    </p>
    ${ticketBadge(d.ticketId)}
    ${progressBar(steps)}
    <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#14532d;">✅ Service Completed Successfully</p>
      <p style="margin:0;font-size:13px;color:#166534;">
        Completed by <strong>${d.technicianName}</strong> on <strong>${fmtDate(d.completedAt)}</strong>
      </p>
    </div>
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Technician's Resolution Notes</h3>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:8px 0 20px;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${d.completionNotes || "Repairs completed successfully."}</p>
    </div>
    <h3 style="font-size:14px;font-weight:700;color:#111827;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Service Summary</h3>
    ${detailTable([
      ["Ticket ID", d.ticketId],
      ["Complaint Type", d.complaintType],
      ["Description", d.description],
      ["Location", `${d.placeName}, ${d.district}`],
      ["Address", d.address],
      ["Pincode", d.pincode],
      ["Technician", d.technicianName],
      ["Resolved On", fmtDate(d.completedAt)],
      ["Registered On", fmtDate(d.createdAt)],
    ])}
    ${alertBox(
      "⭐ <strong>How was our service?</strong> If you're satisfied with the resolution, no further action is needed. If the issue persists, please contact us with your ticket ID and we'll send a technician again at no extra charge within 7 days.",
      "#fffbeb", "#f59e0b", "#92400e"
    )}
    <p style="color:#374151;font-size:14px;margin-top:24px;">
      Thank you for trusting ${COMPANY_NAME} with your solar installation needs.<br><br>
      Warm regards,<br>
      <strong style="color:${BRAND_GREEN};">${COMPANY_NAME} Customer Support</strong>
    </p>
    ${footer()}`;
  return wrap(header("Your Complaint Has Been Resolved", "Thank you for choosing ${COMPANY_NAME} — we're here whenever you need us.", "✅"), body);
}

function buildDailyReportHtml(data: DailyReportEmailData): string {
  const complaintsRows = data.complaints.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "white"};">
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.ticketId}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.customerName}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.customerPhone}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.placeName}, ${c.district}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.complaintType}</td>
      <td style="padding:8px 12px;font-size:13px;">
        <span style="background:${c.urgency === "critical" ? "#991b1b" : c.urgency === "high" ? "#dc2626" : c.urgency === "medium" ? "#f97316" : "#3b82f6"};color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${c.urgency.toUpperCase()}</span>
      </td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.status.replace("_", " ").toUpperCase()}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${c.technicianName || "Unassigned"}</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;">${fmtDate(c.createdAt)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Daily Report - ${data.date}</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:960px;margin:0 auto;padding:20px;background:#f3f4f6;">
  <div style="background:${BRAND_GREEN};color:white;padding:24px 32px;border-radius:10px 10px 0 0;">
    <p style="margin:0;font-size:22px;font-weight:700;">☀️ ${COMPANY_NAME} — Daily Complaint Report</p>
    <p style="margin:4px 0 0;font-size:13px;opacity:0.85;">Date: ${data.date} · Generated: ${fmtDate(new Date().toISOString())}</p>
  </div>
  <div style="background:white;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap;">
      ${[
        ["Total", data.totalComplaints, "#1a5c38", "#f0fdf4", "#bbf7d0"],
        ["New Today", data.newComplaints, "#ea580c", "#fff7ed", "#fed7aa"],
        ["Resolved", data.resolved, "#1d4ed8", "#eff6ff", "#bfdbfe"],
        ["Critical", data.byUrgency.find(u => u.urgency === "critical")?.count ?? 0, "#dc2626", "#fef2f2", "#fecaca"],
      ].map(([label, count, color, bg, border]) => `
        <div style="flex:1;min-width:100px;background:${bg};border:1px solid ${border};border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:800;color:${color};">${count}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${label}</p>
        </div>`).join("")}
    </div>
    <h2 style="font-size:15px;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:0 0 16px;">Complaint Details</h2>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:700px;">
        <thead>
          <tr style="background:${BRAND_GREEN};color:white;">
            ${["Ticket ID","Customer","Phone","Location","Type","Urgency","Status","Technician","Registered"].map(h => `<th style="padding:10px 12px;text-align:left;font-size:13px;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${complaintsRows}</tbody>
      </table>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-top:28px;text-align:center;">Automated daily report — ${COMPANY_NAME} CRM System</p>
  </div>
</body></html>`;
}

// ─── Shared send helper ────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string, logMeta: Record<string, unknown>) {
  try {
    if (!process.env.GMAIL_APP_PASSWORD) {
      logger.warn("GMAIL_APP_PASSWORD not set — skipping email");
      return;
    }
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: SENDER_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: `"${COMPANY_NAME}" <${SENDER_EMAIL}>`, to, subject, html });
    logger.info({ to, subject, ...logMeta }, "Email sent");
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to send email — continuing");
  }
}

// ─── Public send functions ─────────────────────────────────────────────────

export async function sendTicketConfirmationEmail(d: TicketEmailData) {
  await sendEmail(
    d.customerEmail,
    `✅ Complaint Registered — Ticket #${d.ticketId} | ${COMPANY_NAME}`,
    buildRegistrationHtml(d),
    { ticketId: d.ticketId }
  );
}

export async function sendTechnicianAssignedEmail(d: AssignedEmailData) {
  await sendEmail(
    d.customerEmail,
    `👷 Technician Assigned — Ticket #${d.ticketId} | ${COMPANY_NAME}`,
    buildAssignedHtml(d),
    { ticketId: d.ticketId }
  );
}

export async function sendTechnicianGoingEmail(d: StatusUpdateEmailData) {
  await sendEmail(
    d.customerEmail,
    `🚗 Technician On the Way — Ticket #${d.ticketId} | ${COMPANY_NAME}`,
    buildGoingHtml(d),
    { ticketId: d.ticketId }
  );
}

export async function sendTechnicianReachedEmail(d: StatusUpdateEmailData) {
  await sendEmail(
    d.customerEmail,
    `📍 Technician Arrived — Ticket #${d.ticketId} | ${COMPANY_NAME}`,
    buildReachedHtml(d),
    { ticketId: d.ticketId }
  );
}

export async function sendJobCompletedEmail(d: CompletedEmailData) {
  await sendEmail(
    d.customerEmail,
    `🎉 Issue Resolved — Ticket #${d.ticketId} | ${COMPANY_NAME}`,
    buildCompletedHtml(d),
    { ticketId: d.ticketId }
  );
}

export async function sendDailyReportEmail(data: DailyReportEmailData, adminEmail: string) {
  await sendEmail(
    adminEmail,
    `📊 Daily Report — ${COMPANY_NAME} | ${data.date}`,
    buildDailyReportHtml(data),
    { date: data.date }
  );
}

// ─── Quotation workflow emails ─────────────────────────────────────────────

export interface QuotationEmailData {
  projectId: number;
  customerName: string;
  place: string;
  kw: string;
  flNo?: string;
  phone?: string;
  quotationNumber: string;
  actionUrl: string;
  rejectUrl?: string;
}

function buildQuotationCoordinatorHtml(d: QuotationEmailData): string {
  const detailRows = [
    d.flNo   ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;width:38%;font-weight:500;">File Number</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:700;font-family:monospace;">${d.flNo}</td></tr>` : "",
    `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Customer Name</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;">${d.customerName}</td></tr>`,
    `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Location</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.place}</td></tr>`,
    d.phone  ? `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Phone</td><td style="padding:10px 16px;font-size:13px;"><a href="tel:${d.phone}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none;">${d.phone}</a></td></tr>` : "",
    `<tr style="background:${d.phone ? "#f9fafb" : "white"};"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Capacity</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.kw} KW</td></tr>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    ${header("Quotation Approval Required", `Project #${d.projectId} — Action Needed`, "📋")}
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 6px;">A quotation has been submitted for the project below and requires your approval.</p>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Project Details</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px;">
        <tbody>${detailRows}</tbody>
      </table>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Quotation Number</h3>
      <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Quotation Reference</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND_GREEN};letter-spacing:3px;font-family:monospace;">${d.quotationNumber}</p>
      </div>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Your Decision</h3>
      <p style="color:#374151;font-size:14px;margin:0 0 16px;">Click one of the buttons below. Your decision will be recorded automatically.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${d.actionUrl}" style="display:block;background:#16a34a;color:white;padding:14px 20px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:700;text-align:center;">✅ Approve</a>
          </td>
          ${d.rejectUrl ? `<td style="padding-left:8px;"><a href="${d.rejectUrl}" style="display:block;background:#dc2626;color:white;padding:14px 20px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:700;text-align:center;">❌ Reject</a></td>` : ""}
        </tr>
      </table>
      <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Each button is single-use. If you did not expect this email, contact <a href="mailto:${SENDER_EMAIL}" style="color:#9ca3af;">${SENDER_EMAIL}</a>.</p>
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${COMPANY_NAME} · ${COMPANY_TAGLINE}</p>
    </div>
  </div>
</body></html>`;
}

function buildQuotationClientHtml(d: QuotationEmailData): string {
  const detailRows = [
    d.flNo  ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;width:38%;font-weight:500;">File Number</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:700;font-family:monospace;">${d.flNo}</td></tr>` : "",
    `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Name</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;">${d.customerName}</td></tr>`,
    `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Location</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.place}</td></tr>`,
    d.phone ? `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Phone</td><td style="padding:10px 16px;font-size:13px;"><a href="tel:${d.phone}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none;">${d.phone}</a></td></tr>` : "",
    `<tr style="background:${d.phone ? "#f9fafb" : "white"};"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">System Size</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.kw} KW</td></tr>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    ${header("Your Solar Installation Quotation", `Dear ${d.customerName}`, "☀️")}
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 6px;">Thank you for choosing <strong>${COMPANY_NAME}</strong>.</p>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">We have prepared a personalised quotation for your solar installation. Please review the details and the PDF document below.</p>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Your Details</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px;">
        <tbody>${detailRows}</tbody>
      </table>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Your Quotation</h3>
      <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Quotation Reference</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND_GREEN};letter-spacing:3px;font-family:monospace;">${d.quotationNumber}</p>
      </div>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Approve Your Quotation</h3>
      <p style="color:#374151;font-size:14px;margin:0 0 16px;">If you are happy with the quotation, click the button below to confirm. This will notify our team to proceed with your installation.</p>
      <a href="${d.actionUrl}" style="display:block;background:#16a34a;color:white;padding:16px 20px;border-radius:9px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;">✅ Approve Quotation</a>

      <p style="color:#6b7280;font-size:13px;margin-top:20px;">Have questions? Contact us at <a href="mailto:${SENDER_EMAIL}" style="color:${BRAND_GREEN};font-weight:600;">${SENDER_EMAIL}</a></p>
      <p style="color:#9ca3af;font-size:11px;margin-top:8px;">This approval link is single-use. If you did not request this, please contact us immediately.</p>
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${COMPANY_NAME} · ${COMPANY_TAGLINE}</p>
    </div>
  </div>
</body></html>`;
}

export async function sendQuotationCoordinatorEmail(to: string, d: QuotationEmailData) {
  await sendEmail(
    to,
    `📋 Quotation Review Required — ${d.customerName} (Project #${d.projectId}) | ${COMPANY_NAME}`,
    buildQuotationCoordinatorHtml(d),
    { projectId: d.projectId }
  );
}

export async function sendQuotationClientEmail(to: string, d: QuotationEmailData) {
  await sendEmail(
    to,
    `☀️ Your Solar Quotation — ${COMPANY_NAME}`,
    buildQuotationClientHtml(d),
    { projectId: d.projectId }
  );
}

// ─── Quotation approved confirmation (sent to client after CLIENT_APPROVED) ──

export interface QuotationApprovedData {
  projectId: number;
  customerName: string;
  place: string;
  kw: string;
  flNo?: string;
  phone?: string;
  driveViewUrl: string;
}

function buildQuotationApprovedHtml(d: QuotationApprovedData): string {
  const detailRows = [
    d.flNo  ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;width:38%;font-weight:500;">File Number</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:700;font-family:monospace;">${d.flNo}</td></tr>` : "",
    `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Name</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;">${d.customerName}</td></tr>`,
    `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Location</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.place}</td></tr>`,
    d.phone ? `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Phone</td><td style="padding:10px 16px;font-size:13px;"><a href="tel:${d.phone}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none;">${d.phone}</a></td></tr>` : "",
    `<tr style="background:${d.phone ? "#f9fafb" : "white"};"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">System Size</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.kw} KW</td></tr>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    ${header("Quotation Approved — Installation Begins Soon!", `Dear ${d.customerName}`, "✅", "#15803d")}
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 6px;">
        Thank you for approving your solar installation quotation with <strong>${COMPANY_NAME}</strong>.
      </p>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">
        Both our coordinator and you have now confirmed the quotation. Our team will begin preparations for your installation shortly.
      </p>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Approved Project Details</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px;">
        <tbody>${detailRows}</tbody>
      </table>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Your Approved Quotation</h3>
      <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:18px 20px;margin-bottom:28px;display:flex;align-items:center;gap:14px;">
        <span style="font-size:32px;line-height:1;">📄</span>
        <div style="flex:1;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#14532d;">Approved Quotation PDF</p>
          <p style="margin:0;font-size:12px;color:#166534;">Keep this for your records — tap to open anytime</p>
        </div>
        <a href="${d.driveViewUrl}" style="display:inline-block;background:#15803d;color:white;padding:10px 18px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap;">View PDF ↗</a>
      </div>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">What Happens Next?</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${[
            ["🚚", "Material Delivery", "Our team will arrange delivery of all required solar components."],
            ["👷", "Installation", "Certified engineers will install your solar system."],
            ["⚡", "Commissioning", "System testing and final handover to you."],
          ].map(([icon, step, desc]) => `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:20px;line-height:1.4;">${icon}</span>
            <div>
              <p style="margin:0;font-size:13px;font-weight:700;color:#111827;">${step}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${desc}</p>
            </div>
          </div>`).join("")}
        </div>
      </div>

      <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">Questions? Contact us at <a href="mailto:${SENDER_EMAIL}" style="color:${BRAND_GREEN};font-weight:600;">${SENDER_EMAIL}</a></p>
      <p style="color:#374151;font-size:14px;margin-top:20px;">
        Warm regards,<br>
        <strong style="color:${BRAND_GREEN};">${COMPANY_NAME}</strong>
      </p>
      ${footer()}
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${COMPANY_NAME} · ${COMPANY_TAGLINE}</p>
    </div>
  </div>
</body></html>`;
}

// ─── Closure approval email ────────────────────────────────────────────────

export interface ClosureEmailData {
  projectId: number;
  customerName: string;
  place: string;
  kw: string;
  flNo?: string;
  phone?: string;
  approveUrl: string;
  rejectUrl: string;
}

function buildClosureCoordinatorHtml(d: ClosureEmailData): string {
  const detailRows = [
    d.flNo  ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;width:38%;font-weight:500;">File Number</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:700;font-family:monospace;">${d.flNo}</td></tr>` : "",
    `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Customer Name</td><td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;">${d.customerName}</td></tr>`,
    `<tr style="background:#f9fafb;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Location</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.place}</td></tr>`,
    d.phone ? `<tr style="background:white;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">Phone</td><td style="padding:10px 16px;font-size:13px;"><a href="tel:${d.phone}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none;">${d.phone}</a></td></tr>` : "",
    `<tr style="background:${d.phone ? "#f9fafb" : "white"};"><td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;">System Size</td><td style="padding:10px 16px;color:#374151;font-size:13px;">${d.kw}</td></tr>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    ${header("Account Clearance Confirmation", `Project #${d.projectId} — Stage 11 Complete`, "💳")}
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 6px;">Stage 11 (Account Clear 10%) has been completed. Please confirm that the account is fully cleared before the <strong>Warranty Given</strong> stage is unlocked.</p>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px;">Project Details</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:28px;">
        <tbody>${detailRows}</tbody>
      </table>

      <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Your Decision</h3>
      <p style="color:#374151;font-size:14px;margin:0 0 16px;">Click one of the buttons below to record your decision. This will update the project status immediately.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${d.approveUrl}" style="display:block;background:#16a34a;color:white;padding:14px 20px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:700;text-align:center;">✅ Confirm — Account Cleared</a>
          </td>
          <td style="padding-left:8px;">
            <a href="${d.rejectUrl}" style="display:block;background:#dc2626;color:white;padding:14px 20px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:700;text-align:center;">❌ Not Cleared Yet</a>
          </td>
        </tr>
      </table>
      <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Each link is single-use. If you did not expect this email, contact <a href="mailto:${SENDER_EMAIL}" style="color:#9ca3af;">${SENDER_EMAIL}</a>.</p>
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${COMPANY_NAME} · ${COMPANY_TAGLINE}</p>
    </div>
  </div>
</body></html>`;
}

export async function sendClosureCoordinatorEmail(to: string, d: ClosureEmailData) {
  await sendEmail(
    to,
    `🏁 Project Closure Approval Required — ${d.customerName} (Project #${d.projectId}) | ${COMPANY_NAME}`,
    buildClosureCoordinatorHtml(d),
    { projectId: d.projectId },
  );
}

export async function sendQuotationApprovedEmail(to: string, d: QuotationApprovedData) {
  await sendEmail(
    to,
    `✅ Quotation Approved — Your Solar Installation Begins Soon | ${COMPANY_NAME}`,
    buildQuotationApprovedHtml(d),
    { projectId: d.projectId }
  );
}


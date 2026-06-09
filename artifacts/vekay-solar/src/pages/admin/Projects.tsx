import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, ChevronDown, ChevronUp, Save, Loader2, Trash2, Lock, RotateCcw, AlertCircle, Mail, Send, CalendarDays, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project {
  id: number;
  registeredAt: string;
  flNo: string;
  customerName: string;
  place: string;
  kw: string;
  phone: string;
  email: string;
  consumerNo: string;
  totalAmount: string;
  gmapLink: string;
  coordinator: string;
  quotation: string;
  quotationFileId: string;
  closureStatus: string;
  stages: string[];
  stageRemarks: string[];
  stageLog: string[][];
  remark: string;
  activityLog: { ts: string; actor: string; text: string }[];
  createdAt: string;
  updatedAt: string;
}

// Default stage labels (fallback when Sheet is unavailable or not yet loaded)
const DEFAULT_STAGE_LABELS = [
  "Material Delivery", "Advance 40%", "Welding", "Feasibility",
  "Reg. Paper 1st", "Wiring", "Commissioning", "Reg. Paper 2nd",
  "2nd Payment 50%", "Deposit Paid", "Account Clear 10%", "Warranty Given",
];

const STAGE_OPTIONS = [
  { value: "", label: "— Not started —" },
  { value: "PENDING", label: "Pending" },
  { value: "DONE", label: "Completed" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s: string): string {
  if (!s) return "—";
  try {
    const [y, m, d] = s.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  } catch { return s; }
}

function todayValue(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Normalize KW input:
 *   "5"     → "5 KW"
 *   "3+5"   → "3 KW WITH 5 KW"
 *   "5+3"   → "3 KW WITH 5 KW"  (auto-sorted smaller first)
 *   "30+50" → "30 KW WITH 50 KW"
 */
function normalizeKw(raw: string): string {
  if (!raw.trim()) return raw;
  // Split on + or "with" (case-insensitive) to find the two parts
  const parts = raw.split(/\+|with/i);
  const nums = parts.map(p => parseFloat(p.replace(/[^\d.]/g, ""))).filter(n => !isNaN(n));
  if (nums.length === 0) return raw;
  const sorted = nums.sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]} KW`;
  return `${sorted[0]} KW WITH ${sorted[1]} KW`;
}

/** Extract the primary (first/smallest) KW number for filtering/badge color */
function parseKwPrimary(kw: string): number {
  const m = kw.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

/** Short badge text: "5 KW" or "3+5 KW" */
function kwDisplay(kw: string): string {
  if (!kw) return "";
  const nums = kw.match(/\d+(?:\.\d+)?/g);
  if (!nums) return kw;
  const sorted = nums.map(Number).sort((a, b) => a - b);
  return sorted.length >= 2 ? `${sorted[0]}+${sorted[1]} KW` : `${sorted[0]} KW`;
}

function stageStyle(v: string): { bg: string; text: string } {
  if (!v || v === "") return { bg: "bg-gray-200", text: "text-gray-400" };
  const u = v.toUpperCase();
  if (u === "PENDING") return { bg: "bg-amber-400", text: "text-amber-700" };
  if (u === "LOAN" || u === "CASH" || u === "RECEIVED") return { bg: "bg-violet-400", text: "text-violet-700" };
  if (u === "SUBMITTED") return { bg: "bg-blue-400", text: "text-blue-700" };
  return { bg: "bg-green-500", text: "text-green-700" };
}

/** A stage is "completed" if it has a non-empty, non-PENDING value */
function isStageCompleted(v: string): boolean {
  return !!v && v.toUpperCase() !== "PENDING";
}

function doneCount(stages: string[]): number {
  return stages.filter(s => isStageCompleted(s)).length;
}

function progressLabel(done: number, total = 12): string {
  if (done === 0) return "Not Started";
  if (done === total) return "Complete";
  if (done >= 9) return "Nearly Done";
  return "In Progress";
}

/** Index of the last completed stage, or -1 if none */
function lastCompletedIdx(stages: string[]): number {
  for (let i = stages.length - 1; i >= 0; i--) {
    if (isStageCompleted(stages[i])) return i;
  }
  return -1;
}

/**
 * Parse the date from a stageLog entry.
 * Entry format from backend: "05 Jun 2026 (recorded 08 Jun 2026, 10:30 AM)"
 * Returns YYYY-MM-DD for string comparison with date input values.
 */
function parseStageLogDate(entry: string): string {
  if (!entry) return "";
  const m = entry.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (!m) return entry.substring(0, 10);
  const M: Record<string, string> = {
    Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
    Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
  };
  return `${m[3]}-${M[m[2]] ?? "01"}-${m[1].padStart(2, "0")}`;
}

/** Get [from, to] YYYY-MM-DD range for a date preset */
function getPresetRange(preset: string): [string, string] {
  const IST = { timeZone: "Asia/Kolkata" } as const;
  const today = new Date().toLocaleDateString("en-CA", IST);
  if (preset === "today") return [today, today];
  if (preset === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const y = d.toLocaleDateString("en-CA", IST);
    return [y, y];
  }
  if (preset === "last7") {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return [d.toLocaleDateString("en-CA", IST), today];
  }
  if (preset === "last30") {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return [d.toLocaleDateString("en-CA", IST), today];
  }
  return ["", ""];
}

/**
 * Stage unlock rules:
 *  0 Material Delivery  — quotation CLIENT_APPROVED
 *  1 Advance 40%        — stage 0 done
 *  3 Feasibility        — stage 0 done
 *  2 Welding            — stage 3 done
 *  4 Reg. Paper 1st     — stage 3 done; stays open until stage 7 done
 *  5 Wiring             — stage 3 done
 *  6 Commissioning      — stage 2 AND stage 5 done
 *  7 Reg. Paper 2nd     — stage 6 done
 *  8 2nd Payment        — stage 7 AND stage 4 both done (both papers required)
 *  9–11                 — sequential (i-1 done)
 */
function isEditable(editStages: string[], savedStages: string[], savedQuotation: string, closureStatus: string, i: number): boolean {
  const val = editStages[i];
  if (val === "PENDING") return true;
  if (isStageCompleted(val)) return i === lastCompletedIdx(editStages);

  // Empty stage — check unlock using saved state so prerequisites must be committed
  const done = (idx: number) => isStageCompleted(savedStages[idx]);
  switch (i) {
    case 0:  return savedQuotation === "COORDINATOR_APPROVED" || savedQuotation === "CLIENT_APPROVED";
    case 1:  return done(0);
    case 3:  return done(0);
    case 2:  return done(3);
    case 4:  return done(3);
    case 5:  return done(3);
    case 6:  return done(2) && done(5);
    case 7:  return done(6);
    case 8:  return done(7) && done(4);
    case 11: return done(10) && closureStatus === "APPROVED"; // Warranty Given needs account clearance sign-off
    default: return done(i - 1);
  }
}

function kwBadgeClass(kw: string): string {
  const n = parseKwPrimary(kw);
  if (isNaN(n)) return "bg-gray-100 text-gray-700 border-gray-200";
  if (n >= 30) return "bg-red-50 text-red-700 border-red-200";
  if (n >= 8)  return "bg-violet-50 text-violet-700 border-violet-200";
  if (n >= 5)  return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-green-50 text-green-700 border-green-200";
}

// ── API calls ─────────────────────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const JSON_HEADERS = { "Content-Type": "application/json" } as const;


async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "include", ...init });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}
function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
}
function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(body) });
}
function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

// ── Blank edit state ──────────────────────────────────────────────────────────
function blankEdit(p: Project) {
  return {
    registeredAt: p.registeredAt,
    flNo: p.flNo,
    customerName: p.customerName,
    place: p.place,
    kw: p.kw,
    phone: p.phone,
    email: p.email,
    consumerNo: p.consumerNo,
    totalAmount: p.totalAmount,
    gmapLink: p.gmapLink,
    coordinator: p.coordinator,
    quotation: p.quotation,
    stages: [...p.stages] as string[],
    stageRemarks: [...p.stageRemarks] as string[],
    remark: p.remark,
  };
}
type EditState = ReturnType<typeof blankEdit>;

// ── Quotation status badge ────────────────────────────────────────────────────
function QuotationBadge({ status }: { status: string }) {
  if (status === "CLIENT_APPROVED" || status === "COORDINATOR_APPROVED")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">✅ Approved</span>;
  if (status === "COORDINATOR_REJECTED")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">✗ Rejected</span>;
  if (status === "SENT")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">⏳ With Coordinator</span>;
  return <span className="text-[11px] text-gray-400 italic">Pending</span>;
}

// ── Quotation section ─────────────────────────────────────────────────────────
function QuotationSection({ project, coordinatorEmail, onUploaded, onStatusChange }: {
  project: Project;
  coordinatorEmail: string;
  onUploaded: (updated: { id: number; quotation: string; quotationFileId: string }) => void;
  onStatusChange: (id: number, quotation: string) => void;
}) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const { quotation, quotationFileId } = project;

  const isApproved = quotation === "COORDINATOR_APPROVED" || quotation === "CLIENT_APPROVED" || quotation === "ACCEPTED";
  const isWaiting  = quotation === "SENT" || quotation === "WAITING";
  const canSubmit  = !isApproved;

  // Poll every 8s while waiting for coordinator
  useEffect(() => {
    if (!isWaiting) return;
    const iv = setInterval(async () => {
      try {
        const d = await fetch(`${BASE}/api/projects/${project.id}`, { credentials: "include" }).then(r => r.json());
        if (d.quotation && d.quotation !== quotation) onStatusChange(project.id, d.quotation);
      } catch {}
    }, 8000);
    return () => clearInterval(iv);
  }, [isWaiting, project.id, quotation, onStatusChange]);

  const handleSubmit = useCallback(async () => {
    const num = input.trim();
    if (!num) { toast({ title: "Enter a quotation number", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/projects/${project.id}/quotation/submit`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationNumber: num }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unknown error");
      onUploaded({ id: project.id, quotation: d.quotation, quotationFileId: d.quotationFileId });
      setInput("");
      toast({ title: "Quotation submitted ✓", description: `Approval email sent to ${d.coordinatorEmail}` });
    } catch (err: any) {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }, [input, project.id, onUploaded, toast]);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      const r = await fetch(`${BASE}/api/projects/${project.id}/quotation/resend-coordinator`, {
        method: "POST", credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unknown error");
      toast({ title: "Email resent ✓", description: d.sentTo ? `Sent to ${d.sentTo}` : "Delivered" });
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    } finally { setResending(false); }
  }, [project.id, toast]);

  const statusBadge = isApproved
    ? { label: "✅ Coordinator Approved", color: "border-green-100 bg-green-50/40" }
    : isWaiting
    ? { label: "⏳ Awaiting Coordinator Approval", color: "border-amber-100 bg-amber-50/40", pulse: true }
    : quotation === "COORDINATOR_REJECTED"
    ? { label: "✗ Coordinator Rejected", color: "border-red-100 bg-red-50/40" }
    : { label: "Pending", color: "border-gray-200 bg-gray-50/40" };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotation</h3>
        {!isApproved && <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Required before stages unlock</span>}
      </div>

      <div className={`border rounded-lg p-3 space-y-3 transition-colors ${statusBadge.color}`}>
        {/* Status label */}
        <div className="flex items-center gap-1.5">
          {"pulse" in statusBadge && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
          <span className="text-xs font-medium text-gray-700">{statusBadge.label}</span>
        </div>

        {/* Approved: show number badge */}
        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-green-700 uppercase tracking-wide mb-1">Approved Quotation Number</p>
            <p className="text-lg font-bold text-green-800 font-mono tracking-widest">{quotationFileId || "—"}</p>
            <p className="text-[11px] text-green-700 mt-2">🎉 Material Delivery stage is now unlocked.</p>
          </div>
        )}

        {/* Waiting: sent number + resend */}
        {isWaiting && quotationFileId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
            <p className="text-[10px] text-amber-700">Sent: <strong className="font-mono">{quotationFileId}</strong></p>
            <button onClick={handleResend} disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
              {resending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resending…</> : <><Mail className="h-3.5 w-3.5" /> Resend to Coordinator</>}
            </button>
          </div>
        )}

        {/* Submit form */}
        {canSubmit && (
          <div className="space-y-2">
            {/* Coordinator hint */}
            {coordinatorEmail ? (
              <p className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" /> Approval email → <strong className="ml-1">{coordinatorEmail}</strong>
              </p>
            ) : project.coordinator ? (
              <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> <strong>{project.coordinator}</strong> has no email — add one in Staff Management.
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> No coordinator — email will go to company inbox.
              </p>
            )}
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={quotationFileId ? `Current: ${quotationFileId}` : "Enter quotation number…"}
                className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white" />
              <button onClick={handleSubmit} disabled={submitting || !input.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 whitespace-nowrap">
                {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</> : <><Send className="h-3.5 w-3.5" /> {quotationFileId ? "Re-submit" : "Send for Approval"}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Closure approval section ──────────────────────────────────────────────────
function ClosureSection({ project, coordinatorEmail, onStatusChange }: {
  project: Project;
  coordinatorEmail: string;
  onStatusChange: (id: number, closureStatus: string) => void;
}) {
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const { closureStatus } = project;

  const isApproved  = closureStatus === "APPROVED";
  const isRequested = closureStatus === "REQUESTED";
  const isRejected  = closureStatus === "REJECTED";

  // Poll every 8s while waiting for coordinator
  useEffect(() => {
    if (!isRequested) return;
    const iv = setInterval(async () => {
      try {
        const d = await fetch(`${BASE}/api/projects/${project.id}`, { credentials: "include" }).then(r => r.json());
        if (d.closureStatus && d.closureStatus !== closureStatus) onStatusChange(project.id, d.closureStatus);
      } catch {}
    }, 8000);
    return () => clearInterval(iv);
  }, [isRequested, project.id, closureStatus, onStatusChange]);

  const handleRequest = useCallback(async () => {
    setRequesting(true);
    try {
      const r = await fetch(`${BASE}/api/projects/${project.id}/closure/request`, {
        method: "POST", credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unknown error");
      onStatusChange(project.id, d.closureStatus);
      toast({ title: "Closure request sent ✓", description: `Coordinator approval email sent to ${d.coordinatorEmail}` });
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    } finally { setRequesting(false); }
  }, [project.id, onStatusChange, toast]);

  const cardColor = isApproved ? "border-green-100 bg-green-50/40"
    : isRequested ? "border-amber-100 bg-amber-50/40"
    : isRejected  ? "border-red-100 bg-red-50/40"
    : "border-gray-200 bg-gray-50/40";

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Clearance</h3>
        {isApproved && <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">✅ Confirmed</span>}
      </div>

      <div className={`border rounded-lg p-3 space-y-3 transition-colors ${cardColor}`}>
        {/* Status label */}
        <div className="flex items-center gap-1.5">
          {isRequested && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
          <span className="text-xs font-medium text-gray-700">
            {isApproved  ? "✅ Account clearance confirmed — Warranty stage is now unlocked"
           : isRequested ? "⏳ Awaiting coordinator confirmation"
           : isRejected  ? "✗ Rejected — Re-request when ready"
           : "Request coordinator to confirm account is fully cleared before issuing warranty"}
          </span>
        </div>

        {/* Approved banner */}
        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-lg">✅</p>
            <p className="text-sm font-bold text-green-800 mt-1">Account Cleared</p>
            <p className="text-[11px] text-green-700 mt-1">Coordinator confirmed. Warranty Given stage is now accessible.</p>
          </div>
        )}

        {/* Timestamps: requested / confirmed */}
        {(() => {
          const reqEntry = project.activityLog.find(e => e.text.toLowerCase().includes("closure request sent"));
          const aprEntry = project.activityLog.find(e => e.actor === "Coordinator" && e.text.toLowerCase().includes("closure approved"));
          const rejEntry = project.activityLog.find(e => e.actor === "Coordinator" && e.text.toLowerCase().includes("closure rejected"));
          if (!reqEntry && !aprEntry && !rejEntry) return null;
          return (
            <div className="text-[10px] text-gray-500 space-y-0.5 border-t border-gray-100 pt-2 mt-1">
              {reqEntry  && <p className="flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5 shrink-0" /> Requested: <span className="font-medium">{reqEntry.ts}</span></p>}
              {aprEntry  && <p className="flex items-center gap-1 text-green-600"><CalendarDays className="h-2.5 w-2.5 shrink-0" /> Confirmed: <span className="font-medium">{aprEntry.ts}</span></p>}
              {rejEntry  && <p className="flex items-center gap-1 text-red-500"><CalendarDays className="h-2.5 w-2.5 shrink-0" /> Rejected: <span className="font-medium">{rejEntry.ts}</span></p>}
            </div>
          );
        })()}

        {/* Waiting: coordinator hint */}
        {isRequested && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <p className="text-[10px] text-amber-700">
              Approval email sent to <strong>{coordinatorEmail || "coordinator"}</strong>. This page updates automatically.
            </p>
          </div>
        )}

        {/* Request / re-request button */}
        {!isApproved && (
          <div className="space-y-2">
            {coordinatorEmail ? (
              <p className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" /> Approval email → <strong className="ml-1">{coordinatorEmail}</strong>
              </p>
            ) : project.coordinator ? (
              <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> <strong>{project.coordinator}</strong> has no email — add one in Staff Management.
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> No coordinator — email will go to company inbox.
              </p>
            )}
            <button onClick={handleRequest} disabled={requesting}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
              {requesting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Send className="h-3.5 w-3.5" /> {isRejected || isRequested ? "Re-request Confirmation" : "Request Account Clearance Confirmation"}</>
              }
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Projects() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Filters
  const [stageFilter, setStageFilter] = useState("all");
  const [kwFilter, setKwFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Selected project (slide-in panel)
  const [selected, setSelected] = useState<Project | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  // Delete confirmation (single project)
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Stage date dialog
  const [stageDateDialog, setStageDateDialog] = useState<{ pendingEdit: EditState } | null>(null);
  const [stageDateValue, setStageDateValue] = useState(todayValue());
  const [stageNoteValue, setStageNoteValue] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Date range filter
  const [datePreset, setDatePreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Additional column filters
  const [flFilter, setFlFilter] = useState("");
  const [coordFilter, setCoordFilter] = useState("all");

  // New project modal
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    registeredAt: todayValue(),
    flNo: "", customerName: "", place: "", kw: "", phone: "", email: "", consumerNo: "", totalAmount: "", gmapLink: "", coordinator: "",
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => apiGet("/api/projects"),
  });

  const { data: staffList = [] } = useQuery<{ id: number; name: string; email: string; roles: string[]; isActive: boolean }[]>({
    queryKey: ["staff"],
    queryFn: () => apiGet("/api/technicians"),
  });

  // Stage labels — live from Google Sheet header row; falls back to defaults
  const { data: stageLabels = DEFAULT_STAGE_LABELS } = useQuery<string[]>({
    queryKey: ["stage-labels"],
    queryFn: () => apiGet("/api/projects/stage-labels"),
    staleTime: 5 * 60 * 1000,
  });

  // Coordinator options: only staff with the "coordinator" role
  const coordinatorOptions = staffList.filter(s => s.isActive && (s.roles ?? []).includes("coordinator"));

  // ── Filter ─────────────────────────────────────────────────────────────────
  const hasDateFilter = !!(dateFrom || dateTo);
  const filtered = projects.filter(p => {
    // Stage + date combination
    if (stageFilter !== "all" && hasDateFilter) {
      const idx = parseInt(stageFilter);
      const completionDate = parseStageLogDate(p.stageLog?.[idx]?.[0] ?? "");
      if (!completionDate) return false;
      if (dateFrom && completionDate < dateFrom) return false;
      if (dateTo && completionDate > dateTo) return false;
    } else if (stageFilter !== "all") {
      // Stage only — show projects where that specific stage is completed
      const idx = parseInt(stageFilter);
      if (!isStageCompleted(p.stages[idx])) return false;
    } else if (hasDateFilter) {
      // Date only — any stage has a completion date in the range
      const hasMatch = (p.stageLog ?? []).some(log => {
        const d = parseStageLogDate(log?.[0] ?? "");
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
      if (!hasMatch) return false;
    }

    if (kwFilter !== "all") {
      const nums = (p.kw.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      if (nums.length === 0) return false;
      if (kwFilter === "3kw"  && !nums.some(n => n <= 3.5)) return false;
      if (kwFilter === "5kw"  && !nums.some(n => n >= 4 && n <= 6)) return false;
      if (kwFilter === "8kw"  && !nums.some(n => n >= 7 && n < 30)) return false;
      if (kwFilter === "30kw" && !nums.some(n => n >= 30)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!p.customerName.toLowerCase().includes(s) &&
          !p.place.toLowerCase().includes(s) &&
          !p.flNo.toLowerCase().includes(s)) return false;
    }
    if (flFilter.trim()) {
      if (!(p.flNo ?? "").toLowerCase().includes(flFilter.trim().toLowerCase())) return false;
    }
    if (coordFilter !== "all") {
      if (p.coordinator !== coordFilter) return false;
    }
    return true;
  });

  // Incomplete = missing FL No OR missing Google Maps link → float to top
  const isIncomplete = (p: Project) => !p.flNo?.trim() || !p.gmapLink?.trim();
  const sorted = [...filtered].sort((a, b) => {
    const ai = isIncomplete(a) ? 0 : 1;
    const bi = isIncomplete(b) ? 0 : 1;
    return ai - bi;
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (vars: { id: number; body: Record<string, unknown> }) =>
      apiPatch<Project>(`/api/projects/${vars.id}`, vars.body),
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(["projects"], old =>
        old ? old.map(p => p.id === updated.id ? updated : p) : old
      );
      setSelected(updated);
      setEdit(blankEdit(updated));
      toast({ title: "Saved ✓" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newForm) => apiPost<Project>("/api/projects", body),
    onSuccess: (p) => {
      qc.setQueryData<Project[]>(["projects"], old => old ? [p, ...old] : [p]);
      setNewOpen(false);
      setNewForm({ registeredAt: todayValue(), flNo: "", customerName: "", place: "", kw: "", phone: "", email: "", consumerNo: "", totalAmount: "", gmapLink: "", coordinator: "" });
      toast({ title: "Project created ✓" });
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete<{ ok: boolean }>(`/api/projects/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData<Project[]>(["projects"], old => old ? old.filter(p => p.id !== id) : []);
      closePanel();
      toast({ title: "Project deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // ── Panel open/close ───────────────────────────────────────────────────────
  function openProject(p: Project) {
    setSelected(p);
    setEdit(blankEdit(p));
    setLogOpen(false);
    setDeleteConfirm(false);
  }
  function closePanel() {
    setSelected(null);
    setEdit(null);
    setDeleteConfirm(false);
  }

  // Close on outside click (but not when dialogs are open, and not for Radix portals)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (deleteConfirm) return;
      // Don't close panel while the stage-date dialog is open — its buttons are in a Radix portal
      // outside panelRef, so mousedown would incorrectly null out `selected` before doSave runs.
      if (stageDateDialog) return;
      const target = e.target as Element;
      // Radix UI renders Select/Popover content in portals outside the panel DOM — ignore those clicks
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest("[data-radix-select-viewport]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) closePanel();
    }
    if (selected) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selected, deleteConfirm, stageDateDialog]);

  // ── Save logic ─────────────────────────────────────────────────────────────
  /** Build change log entries comparing editState to the saved project */
  function buildLogEntry(editState: EditState): string {
    if (!selected) return "Project updated";
    const changes: string[] = [];
    const f = (label: string, a: string, b: string) => {
      if (a !== b) changes.push(`${label}: "${a || "—"}" → "${b || "—"}"`);
    };
    f("Reg date", selected.registeredAt, editState.registeredAt);
    f("FL No", selected.flNo, editState.flNo);
    f("Name", selected.customerName, editState.customerName);
    f("Place", selected.place, editState.place);
    f("KW", selected.kw, editState.kw);
    f("Phone", selected.phone, editState.phone);
    f("Email", selected.email, editState.email);
    f("Consumer No", selected.consumerNo, editState.consumerNo);
    f("Amount", selected.totalAmount, editState.totalAmount);
    f("GMap Link", selected.gmapLink, editState.gmapLink);
    f("Coordinator", selected.coordinator, editState.coordinator);
    if (editState.quotation !== selected.quotation) {
      changes.push(`Quotation: "${selected.quotation || "—"}" → "${editState.quotation || "—"}"`);
    }
    editState.stages.forEach((s, i) => {
      if (s !== selected.stages[i])
        changes.push(`${stageLabels[i]}: "${selected.stages[i] || "—"}" → "${s || "—"}"`);
    });
    if (editState.remark !== selected.remark) changes.push("Remark updated");
    return changes.length ? changes.join(" | ") : "Project updated";
  }

  function doSave(editState: EditState, stageDate?: string, stageNote?: string) {
    if (!selected) return;
    const logEntry = buildLogEntry(editState);

    // If a note was provided, store it in stageRemarks for the changed stage
    let finalRemarks = [...(editState.stageRemarks ?? [])];
    if (stageNote !== undefined) {
      const changedIdx = editState.stages.findIndex((s, i) => s !== selected.stages[i]);
      if (changedIdx !== -1) {
        while (finalRemarks.length <= changedIdx) finalRemarks.push("");
        finalRemarks[changedIdx] = stageNote;
      }
    }

    const body: Record<string, unknown> = { ...editState, stageRemarks: finalRemarks, logEntry };
    if (stageDate) body.stageDate = stageDate;
    saveMutation.mutate({ id: selected.id, body });
    setStageDateDialog(null);
    setStageNoteValue("");
  }

  function handleSave() {
    if (!selected || !edit) return;
    const stagesChanged = edit.stages.some((s, i) => s !== selected.stages[i]);
    if (stagesChanged) {
      setStageDateValue(todayValue());
      setStageNoteValue("");
      setStageDateDialog({ pendingEdit: edit });
    } else {
      doSave(edit);
    }
  }

  // ── PDF generation ─────────────────────────────────────────────────────────
  async function generatePDF() {
    if (filtered.length === 0 || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const stageName = stageFilter !== "all" ? stageLabels[parseInt(stageFilter)] : "";
      const dateRange =
        dateFrom || dateTo
          ? `${dateFrom ? fmtDate(dateFrom) : "—"} – ${dateTo ? fmtDate(dateTo) : "—"}`
          : "All Dates";
      const nowIST = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });

      let y = 14;
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 163, 74);
      doc.text("GreenPass Technologies", 14, y); y += 7;
      doc.setFontSize(11); doc.setTextColor(0);
      doc.text("Projects Report", 14, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
      doc.text(`Stage: ${stageName || "All Stages"}`, 14, y); y += 5;
      doc.text(`Date Range: ${dateRange}`, 14, y); y += 5;
      doc.text(`Generated: ${nowIST}`, 14, y); y += 5;
      doc.text(`Total Projects: ${filtered.length}`, 14, y); y += 5;
      doc.setTextColor(0);

      const stageIdx = stageFilter !== "all" ? parseInt(stageFilter) : -1;

      const rows = filtered.map((p, idx) => {
        let stageDoneOn = "—";
        let notes = "";
        if (stageIdx !== -1) {
          stageDoneOn = p.stageLog?.[stageIdx]?.[0] || "—";
          notes = p.stageRemarks?.[stageIdx] ?? "";
        } else {
          const li = lastCompletedIdx(p.stages);
          if (li !== -1) {
            stageDoneOn = `${stageLabels[li]}: ${p.stageLog?.[li]?.[0] || "—"}`;
            notes = p.stageRemarks?.[li] ?? "";
          }
        }
        return [
          String(idx + 1), p.flNo || "—", p.customerName, p.place,
          kwDisplay(p.kw) || p.kw || "—", p.phone || "—",
          stageDoneOn, p.coordinator || "—", notes,
        ];
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (autoTable as any)(doc, {
        startY: y + 2,
        head: [["#", "FL No", "Customer Name", "Place", "kW", "Phone", "Stage Done On", "Coordinator", "Notes"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold", fontSize: 11 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: { 8: { cellWidth: 45 } },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(
          `GreenPass Technologies | Page ${i} of ${totalPages}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: "right" }
        );
      }
      doc.setTextColor(0);

      const stagePart = stageName ? stageName.replace(/\s+/g, "") : "AllStages";
      const datePart = dateFrom
        ? new Date(dateFrom + "T00:00:00").toLocaleDateString("en-US", {
            month: "short", year: "numeric",
          }).replace(" ", "")
        : "AllDates";
      doc.save(`GreenPass-Projects-${stagePart}-${datePart}.pdf`);
    } catch (err) {
      toast({ title: "PDF generation failed", description: String(err), variant: "destructive" });
    } finally {
      setPdfGenerating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header + filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
              <p className="text-gray-500">Solar installations — strict stage order · syncs to Google Sheets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Project
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={generatePDF}
                disabled={filtered.length === 0 || pdfGenerating}
              >
                {pdfGenerating
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                  : <><FileDown className="h-4 w-4" />Download PDF ({filtered.length})</>
                }
              </Button>
            </div>
          </div>

          {/* Filter row 1 — search, FL, stage, KW, coordinator */}
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name / place…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-[170px]"
            />
            <Input
              placeholder="FL No…"
              value={flFilter}
              onChange={e => setFlFilter(e.target.value)}
              className="w-[110px]"
            />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[175px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Installations</SelectItem>
                {stageLabels.map((label, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0">{i + 1}</span>
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kwFilter} onValueChange={setKwFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="KW" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KW</SelectItem>
                <SelectItem value="3kw">≤ 3 KW</SelectItem>
                <SelectItem value="5kw">4–6 KW</SelectItem>
                <SelectItem value="8kw">7–29 KW</SelectItem>
                <SelectItem value="30kw">30 KW+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={coordFilter} onValueChange={setCoordFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Coordinator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coordinators</SelectItem>
                {coordinatorOptions.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter row 2 — date range by stage completion */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 shrink-0">Stage date:</span>
            {(["today", "yesterday", "last7", "last30", "custom"] as const).map(preset => {
              const label =
                preset === "today" ? "Today"
                : preset === "yesterday" ? "Yesterday"
                : preset === "last7" ? "Last 7 Days"
                : preset === "last30" ? "Last 30 Days"
                : "Custom Range";
              return (
                <button
                  key={preset}
                  onClick={() => {
                    if (preset === "custom") {
                      setDatePreset("custom");
                      setShowCustomDate(true);
                    } else {
                      const [f, t] = getPresetRange(preset);
                      setDatePreset(preset);
                      setDateFrom(f);
                      setDateTo(t);
                      setShowCustomDate(false);
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    datePreset === preset
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {(dateFrom || dateTo || datePreset) && (
              <button
                onClick={() => {
                  setDatePreset(""); setDateFrom(""); setDateTo(""); setShowCustomDate(false);
                }}
                className="text-xs px-2 py-1 text-red-500 hover:text-red-700 border border-red-200 rounded-full transition-colors"
              >
                ✕ Clear
              </button>
            )}
            {showCustomDate && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white h-7"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white h-7"
                />
              </div>
            )}
            {(dateFrom || dateTo) && !showCustomDate && (
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                {dateFrom && dateTo && dateFrom === dateTo
                  ? fmtDate(dateFrom)
                  : `${dateFrom ? fmtDate(dateFrom) : "—"} – ${dateTo ? fmtDate(dateTo) : "—"}`}
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Reg Date</TableHead>
                  <TableHead className="w-24">FL No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead className="w-24">KW</TableHead>
                  <TableHead className="w-36">Quotation</TableHead>
                  <TableHead className="w-40">Progress</TableHead>
                  <TableHead>Stages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(8).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-400">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : sorted.map(p => {
                  const done = doneCount(p.stages);
                  const pct = Math.round((done / 12) * 100);
                  const label = progressLabel(done);
                  const incomplete = isIncomplete(p);
                  const missingFlNo = !p.flNo?.trim();
                  const missingGmap = !p.gmapLink?.trim();
                  const isClosed = p.closureStatus === "APPROVED";
                  const rowCls = isClosed
                    ? "cursor-pointer bg-green-50/60 hover:bg-green-50 border-l-2 border-l-green-400"
                    : incomplete
                    ? "cursor-pointer bg-red-50 hover:bg-red-100 border-l-2 border-l-red-400"
                    : "cursor-pointer hover:bg-gray-50";
                  return (
                    <TableRow
                      key={p.id}
                      className={rowCls}
                      onClick={() => openProject(p)}
                    >
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">{fmtDate(p.registeredAt)}</TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {missingFlNo
                          ? <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><AlertCircle className="h-3 w-3 shrink-0" />Missing</span>
                          : p.flNo
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {p.customerName}
                          {isClosed && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full shrink-0">
                              ✓ Closed
                            </span>
                          )}
                          {!isClosed && incomplete && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {[missingFlNo && "FL No", missingGmap && "Map"].filter(Boolean).join(" + ")} required
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{p.place}</TableCell>
                      <TableCell>
                        {p.kw && (
                          <Badge variant="outline" className={kwBadgeClass(p.kw)}>
                            {kwDisplay(p.kw)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <QuotationBadge status={p.quotation} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className={
                              label === "Complete" ? "text-green-600 font-medium" :
                              label === "Nearly Done" ? "text-blue-600" :
                              label === "In Progress" ? "text-amber-600" : "text-gray-400"
                            }>{label}</span>
                            <span className="text-gray-400">{done}/12</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                label === "Complete" ? "bg-green-500" :
                                label === "Nearly Done" ? "bg-blue-500" : "bg-primary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {p.stages.map((s, i) => (
                            <div key={i} title={`${stageLabels[i]}: ${s || "Not started"}`}
                              className={`w-3 h-3 rounded-sm ${stageStyle(s).bg}`} />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* ── Slide-in Edit Panel ─────────────────────────────────────────────── */}
      {selected && edit && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/20" onClick={closePanel} />
          <div ref={panelRef} className="w-[540px] bg-white shadow-2xl flex flex-col h-full overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div>
                <p className="text-xs text-gray-400 font-mono">{fmtDate(selected.registeredAt)} · FL {selected.flNo || "—"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">{selected.customerName}</h2>
                  {selected.closureStatus === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-green-600 px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                      ✓ CLOSED
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                    <span className="text-xs text-red-700 font-medium">Delete?</span>
                    <button
                      onClick={() => deleteMutation.mutate(selected.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 px-1"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "…" : "Yes"}
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">No</button>
                  </div>
                )}
                <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* Part A – Customer Details */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Registration Date</Label>
                    <Input
                      type="date"
                      value={edit.registeredAt}
                      onChange={e => setEdit(prev => prev ? { ...prev, registeredAt: e.target.value } : prev)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {([
                    ["FL No", "flNo"],
                    ["Customer Name", "customerName"],
                    ["Place", "place"],
                    ["KW", "kw"],
                    ["Phone", "phone"],
                    ["Email", "email"],
                    ["Consumer No", "consumerNo"],
                    ["Total Amount (₹)", "totalAmount"],
                  ] as [string, keyof EditState][]).map(([label, key]) => {
                    const isMandatory = key === "flNo";
                    const isEmpty = isMandatory && !(edit[key] as string)?.trim();
                    return (
                      <div key={key} className={key === "customerName" ? "col-span-2" : ""}>
                        <Label className="text-xs text-gray-500">
                          {label}
                          {isMandatory && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                        <Input
                          value={edit[key] as string}
                          onChange={e => setEdit(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          onBlur={
                            key === "kw"
                              ? e => setEdit(prev => prev ? { ...prev, kw: normalizeKw(e.target.value) } : prev)
                              : key === "email"
                              ? (e: React.FocusEvent<HTMLInputElement>) => {
                                  if (!edit || !selected) return;
                                  const newEmail = e.target.value.trim();
                                  if (newEmail !== (selected.email ?? "")) {
                                    doSave({ ...edit, email: newEmail });
                                  }
                                }
                              : undefined
                          }
                          placeholder={key === "kw" ? "e.g. 5  or  3+5  or  30+50" : undefined}
                          className={`mt-1 h-8 text-sm ${isEmpty ? "border-red-400 bg-red-50 focus-visible:ring-red-400" : ""}`}
                        />
                        {isEmpty && <p className="text-[10px] text-red-500 mt-0.5">Required — project will be flagged until filled</p>}
                      </div>
                    );
                  })}

                  {/* Google Maps Link — mandatory */}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">
                      Google Maps Link<span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      value={edit.gmapLink}
                      onChange={e => setEdit(prev => prev ? { ...prev, gmapLink: e.target.value } : prev)}
                      placeholder="https://maps.google.com/..."
                      className={`mt-1 h-8 text-sm ${!edit.gmapLink?.trim() ? "border-red-400 bg-red-50 focus-visible:ring-red-400" : ""}`}
                    />
                    {!edit.gmapLink?.trim() && <p className="text-[10px] text-red-500 mt-0.5">Required — project will be flagged until filled</p>}
                    {edit.gmapLink && (
                      <a href={edit.gmapLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline mt-0.5 inline-block">
                        Open in Maps ↗
                      </a>
                    )}
                  </div>

                  {/* Coordinator */}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Coordinator</Label>
                    <Select
                      value={edit.coordinator || "__none__"}
                      onValueChange={v => setEdit(prev => prev ? { ...prev, coordinator: v === "__none__" ? "" : v } : prev)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue placeholder="Select coordinator…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {coordinatorOptions.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Part B – Quotation PDF workflow */}
              <QuotationSection
                project={selected}
                coordinatorEmail={staffList.find(s => s.name === selected.coordinator)?.email ?? ""}
                onUploaded={(updated) => {
                  qc.setQueryData<Project[]>(["projects"], old =>
                    old ? old.map(p => p.id === updated.id ? { ...p, quotation: updated.quotation, quotationFileId: updated.quotationFileId } : p) : old
                  );
                  setSelected(prev => prev ? { ...prev, quotation: updated.quotation, quotationFileId: updated.quotationFileId } : prev);
                  setEdit(prev => prev ? { ...prev, quotation: updated.quotation } : prev);
                }}
                onStatusChange={(id, quotation) => {
                  qc.setQueryData<Project[]>(["projects"], old =>
                    old ? old.map(p => p.id === id ? { ...p, quotation } : p) : old
                  );
                  setSelected(prev => prev ? { ...prev, quotation } : prev);
                  setEdit(prev => prev ? { ...prev, quotation } : prev);
                }}
              />

              {/* Part C – 11 Stages (strict order) */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Installation Stages</h3>
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Strict order · save after each step</span>
                </div>
                <div className="space-y-2">
                  {stageLabels.map((label, i) => {
                    const val = edit.stages[i];
                    const editable = isEditable(edit.stages, selected.stages, selected.quotation, selected.closureStatus, i);
                    const completed = isStageCompleted(val);
                    const isLast = completed && i === lastCompletedIdx(edit.stages);
                    const locked = !editable && !completed;

                    return (
                      <div
                        key={i}
                        className={`border rounded-lg p-3 transition-colors ${
                          locked
                            ? "border-gray-100 bg-gray-50/30 opacity-50"
                            : completed && !isLast
                              ? "border-green-100 bg-green-50/40"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        {/* Row header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-medium flex items-center gap-1.5 ${locked ? "text-gray-400" : "text-gray-700"}`}>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                              completed ? "bg-green-100 text-green-700" :
                              locked    ? "bg-gray-100 text-gray-400" :
                                          "bg-primary/10 text-primary"
                            }`}>
                              {locked ? <Lock className="h-2.5 w-2.5" /> : i + 1}
                            </span>
                            {label}
                          </span>
                          {val && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${stageStyle(val).text} bg-white`}>
                              {val}
                            </span>
                          )}
                        </div>

                        {/* Locked: just the lock message */}
                        {locked && (
                          <p className="text-[10px] text-gray-400 italic">
                            {i === 0  ? "Quotation must be approved by coordinator first"
                           : i === 11 ? "Awaiting coordinator sign-off on account clearance"
                           : `Save stage ${i} as completed first`}
                          </p>
                        )}

                        {/* Completed but NOT last: read-only display with date + note */}
                        {completed && !isLast && (() => {
                          const log = selected.stageLog?.[i] ?? [];
                          const doneTs   = log[0] ?? "";
                          const editedTs = log.length > 1 ? log[log.length - 1] : "";
                          const note = selected.stageRemarks?.[i] ?? "";
                          return (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-green-700 font-medium">Completed ✓</span>
                                {doneTs && (
                                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                    <CalendarDays className="h-2.5 w-2.5" /> {doneTs}
                                  </span>
                                )}
                                {editedTs && editedTs !== doneTs && (
                                  <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                    · edited {editedTs}
                                  </span>
                                )}
                              </div>
                              {note && (
                                <p className="text-[10px] text-gray-400 italic leading-snug">{note}</p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Last completed: show note + undo button */}
                        {isLast && (() => {
                          const note = selected.stageRemarks?.[i] ?? "";
                          return (
                            <div className="flex flex-col gap-1 mt-0.5">
                              {note && (
                                <p className="text-[10px] text-gray-400 italic leading-snug">{note}</p>
                              )}
                              <button
                                onClick={() => {
                                  const ns = [...edit.stages];
                                  ns[i] = "";
                                  const nr = [...edit.stageRemarks];
                                  setEdit(prev => prev ? { ...prev, stages: ns, stageRemarks: nr } : prev);
                                }}
                                className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded px-2 py-0.5 transition-colors self-start"
                              >
                                <RotateCcw className="h-2.5 w-2.5" /> Undo this stage
                              </button>
                            </div>
                          );
                        })()}

                        {/* Active / PENDING: full edit controls */}
                        {editable && !completed && (
                          <div className="space-y-1.5">
                            <Select
                              value={val || "__empty__"}
                              onValueChange={v => {
                                const ns = [...edit.stages];
                                ns[i] = v === "__empty__" ? "" : v;
                                setEdit(prev => prev ? { ...prev, stages: ns } : prev);
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-full">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGE_OPTIONS.map(o => (
                                  <SelectItem key={o.value || "__empty__"} value={o.value || "__empty__"}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Part C – Account clearance sign-off (shows when stage 10 done) */}
              {isStageCompleted(selected.stages[10]) && (
                <ClosureSection
                  project={selected}
                  coordinatorEmail={staffList.find(s => s.name === selected.coordinator)?.email ?? ""}
                  onStatusChange={(id, closureStatus) => {
                    qc.setQueryData<Project[]>(["projects"], old =>
                      old ? old.map(p => p.id === id ? { ...p, closureStatus } : p) : old
                    );
                    setSelected(prev => prev ? { ...prev, closureStatus } : prev);
                  }}
                />
              )}

              {/* Part D – General Remark */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">General Remark</h3>
                <Textarea
                  value={edit.remark}
                  onChange={e => setEdit(prev => prev ? { ...prev, remark: e.target.value } : prev)}
                  rows={3}
                  placeholder="Any notes about this project…"
                  className="text-sm resize-none"
                />
              </section>

              {/* Part D – Activity Log */}
              <section>
                <button
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-full text-left mb-2"
                  onClick={() => setLogOpen(v => !v)}
                >
                  Activity Log
                  <span className="ml-auto text-gray-300">{logOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
                </button>
                {logOpen && (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selected.activityLog.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No activity yet.</p>
                    ) : selected.activityLog.map((entry, i) => (
                      <div key={i} className="text-xs bg-gray-50 rounded p-2 border border-gray-100">
                        <span className="font-medium text-gray-700">{entry.actor}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500">{entry.ts}</span>
                        <p className="text-gray-600 mt-0.5 break-words">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>

            {/* Save button */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4 mr-2" />Save</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Project Modal ──────────────────────────────────────────────── */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">New Project</h2>
              <button onClick={() => setNewOpen(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Registration Date *</Label>
                <Input
                  type="date"
                  value={newForm.registeredAt}
                  onChange={e => setNewForm(prev => ({ ...prev, registeredAt: e.target.value }))}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              {([
                ["FL No *", "flNo"],
                ["Customer Name *", "customerName"],
                ["Place", "place"],
                ["KW", "kw"],
                ["Phone", "phone"],
                ["Email", "email"],
                ["Consumer No", "consumerNo"],
                ["Total Amount (₹)", "totalAmount"],
              ] as [string, keyof typeof newForm][]).map(([label, key]) => {
                const isMissing = key === "flNo" && !newForm.flNo.trim();
                return (
                  <div key={key} className={key === "customerName" ? "col-span-2" : ""}>
                    <Label className="text-xs text-gray-500">{label}</Label>
                    <Input
                      value={newForm[key]}
                      onChange={e => setNewForm(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={key === "kw"
                        ? e => setNewForm(prev => ({ ...prev, kw: normalizeKw(e.target.value) }))
                        : undefined
                      }
                      placeholder={key === "kw" ? "e.g. 5  or  3+5  or  30+50" : undefined}
                      className={`mt-1 h-8 text-sm ${isMissing ? "border-red-400 bg-red-50 focus-visible:ring-red-400" : ""}`}
                    />
                    {isMissing && <p className="text-[10px] text-red-500 mt-0.5">FL No is required</p>}
                  </div>
                );
              })}
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Google Maps Link</Label>
                <Input
                  value={newForm.gmapLink}
                  onChange={e => setNewForm(prev => ({ ...prev, gmapLink: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Coordinator</Label>
                <Select
                  value={newForm.coordinator || "__none__"}
                  onValueChange={v => setNewForm(prev => ({ ...prev, coordinator: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Select coordinator…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {coordinatorOptions.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                disabled={!newForm.customerName || !newForm.flNo.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...newForm, kw: normalizeKw(newForm.kw) })}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage date dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!stageDateDialog} onOpenChange={open => { if (!open) { setStageDateDialog(null); setStageNoteValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              When was the stage completed?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-gray-500">Choose the completion date. This is recorded in the stage log and synced to the Sheet.</p>

            {/* Internal note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Internal Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Textarea
                value={stageNoteValue}
                onChange={e => setStageNoteValue(e.target.value)}
                placeholder="e.g. Delivered by supplier, special equipment used…"
                className="text-xs resize-none min-h-[56px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white"
                onClick={() => stageDateDialog && doSave(stageDateDialog.pendingEdit, undefined, stageNoteValue)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save as Today"}
              </Button>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                <div className="flex-1 border-t border-gray-200" /> or pick a date <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={stageDateValue}
                  max={todayValue()}
                  onChange={e => setStageDateValue(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white"
                />
                <Button
                  variant="outline"
                  onClick={() => stageDateDialog && doSave(stageDateDialog.pendingEdit, stageDateValue, stageNoteValue)}
                  disabled={!stageDateValue || saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
            <Button variant="ghost" className="w-full text-xs text-gray-400" onClick={() => { setStageDateDialog(null); setStageNoteValue(""); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}

import { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StageStatus = "empty" | "done" | "pending" | "loan" | "cash" | "received" | "submitted" | "note";

interface LogEntry { ts: string; actor: string; text: string; }

interface Project {
  id: number;
  slNo: string;
  flNo: string;
  name: string;
  place: string;
  kw: string;
  phone: string;
  consumerNo: string;
  totalAmount: string;
  stages: string[];      // 11 values
  stageRemarks: string[]; // 11 per-stage remarks
  remark: string;
  log: LogEntry[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage definitions (exact names from Excel / spec)
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = [
  { label: "Material Delivery",  icon: "📦" },
  { label: "Advance 40%",        icon: "💰" },
  { label: "Welding",            icon: "🔧" },
  { label: "Feasibility",        icon: "📋" },
  { label: "Wiring",             icon: "⚡" },
  { label: "Commissioning",      icon: "☀️" },
  { label: "Paper Submission",   icon: "📄" },
  { label: "2nd Payment 50%",    icon: "💳" },
  { label: "Deposit Paid",       icon: "🏦" },
  { label: "Account Clear 10%",  icon: "✅" },
  { label: "Warranty Given",     icon: "🛡️" },
];

const STAGE_OPTIONS = [
  "Not Started", "Done", "Pending", "Received", "Loan", "Cash", "Submitted",
];

function detectStatus(v: string): StageStatus {
  if (!v?.trim()) return "empty";
  const u = v.trim().toUpperCase();
  if (/^\d{1,2}[\/\-]\d{1,2}/.test(u) || u === "DONE" || u.startsWith("DONE") || /^[A-Z]+\s+\d{1,2}[\/\-]/.test(u)) return "done";
  if (u.includes("PENDING")) return "pending";
  if (u === "LOAN" || u.startsWith("LOAN")) return "loan";
  if (u === "CASH" || u.startsWith("CASH")) return "cash";
  if (u === "RECEIVED" || u.startsWith("RECEIVED") || u === "PAID") return "received";
  if (u.includes("SUBMITED") || u.includes("SUBMITTED")) return "submitted";
  return "note";
}

function stageDot(status: StageStatus) {
  switch (status) {
    case "done":      return { bg: "bg-green-500",  title: "Done" };
    case "pending":   return { bg: "bg-amber-400",  title: "Pending" };
    case "loan":      return { bg: "bg-violet-500", title: "Loan" };
    case "cash":      return { bg: "bg-violet-400", title: "Cash" };
    case "received":  return { bg: "bg-violet-600", title: "Received" };
    case "submitted": return { bg: "bg-blue-500",   title: "Submitted" };
    case "note":      return { bg: "bg-sky-400",    title: "Note" };
    default:          return { bg: "bg-gray-200",   title: "Not started" };
  }
}

function progressPct(stages: string[]) {
  return Math.round(stages.filter(s => (s || "").trim() !== "").length / 11 * 100);
}

function progressLabel(pct: number) {
  if (pct === 0)   return { label: "New",         cls: "bg-gray-100 text-gray-600" };
  if (pct < 40)   return { label: "Started",      cls: "bg-blue-50 text-blue-700" };
  if (pct < 80)   return { label: "In Progress",  cls: "bg-amber-50 text-amber-700" };
  if (pct < 100)  return { label: "Nearly Done",  cls: "bg-green-50 text-green-700" };
  return            { label: "Complete",           cls: "bg-green-100 text-green-800" };
}

function nowIST() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample data (real rows from the uploaded Excel)
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE: Project[] = [
  { id:1,  slNo:"1",  flNo:"1162", name:"SUJATHA",          place:"VADANAPALLY",       kw:"DCR 3 KW",        phone:"8138889898", consumerNo:"",              totalAmount:"", stages:["PENDING","","","","","","","","","",""],  stageRemarks:Array(11).fill(""), remark:"AVARUDE MAKAN VANNITT DELIVARY UNDAVOLLU TOLD JISHA", log:[{ts:"25 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-03-01" },
  { id:2,  slNo:"2",  flNo:"1145", name:"ABDUL KAREEM",     place:"PALLIKKAL",         kw:"10 KW N DCR",     phone:"9995587486", consumerNo:"",              totalAmount:"", stages:["PENDING","","","","","","","","","",""],  stageRemarks:Array(11).fill(""), remark:"LOAD ENHANCE APPLIED 13/4/26", log:[{ts:"25 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-03-15" },
  { id:3,  slNo:"3",  flNo:"982",  name:"PALLIKKAL SCHOOL", place:"PALLIKKAL",         kw:"30 KW",           phone:"8129935935", consumerNo:"",              totalAmount:"", stages:["25/4/26","LOAN","29/4/26","PAID","8/5/26","19/5/26 SWALEEQ","SUBMITED","LOAN","18/5/26","PENDING",""], stageRemarks:Array(11).fill(""), remark:"", log:[{ts:"25 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-04-01" },
  { id:4,  slNo:"5",  flNo:"1163", name:"KADHEEJA MOHAMMADALI", place:"FEROKE COLLEGE", kw:"5KW DCR",       phone:"9072938593", consumerNo:"1166338014159", totalAmount:"", stages:["21/2/26","","26/2/26 PENDING","","3/3/26","6/3/26","7/3/26","","","",""], stageRemarks:Array(11).fill(""), remark:"NOT DEMANDED TOLD KSEB 18/3/26. TRANSFORMER ENHANCE NEEDED.", log:[{ts:"21 Feb 26, 10:00 AM",actor:"Admin",text:"Project created"},{ts:"18 Mar 26, 2:00 PM",actor:"Admin",text:"Note: KSEB told — transformer upgrade needed"}], createdAt:"2026-02-21" },
  { id:5,  slNo:"6",  flNo:"1174", name:"MUHAMMED MUSTHAFA", place:"KANNAMANGALAM LX", kw:"5 KW DCR",       phone:"9400590276", consumerNo:"1165560016671", totalAmount:"", stages:["5/3/26","","8/3/26","","19/3/26","23/3/26","26/3/26","","","",""], stageRemarks:Array(11).fill(""), remark:"CASH ADAKKANUND KSEB TOLD", log:[{ts:"5 Mar 26, 8:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-03-05" },
  { id:6,  slNo:"7",  flNo:"1215", name:"MUJEEB RAHMAN V",  place:"FAROOK COLLEGE",   kw:"DCR 5KW",         phone:"9846083022", consumerNo:"1166339029005", totalAmount:"", stages:["27/3/26","RECEIVED","DONE","","DONE","13/4/26","4/4/26","PENDING 26/5/26","24/4/26","",""], stageRemarks:Array(11).fill(""), remark:"CONNECTION PENDING. KURACH KAZHINJU VILIKKAN PARANJU 16/5/26", log:[{ts:"27 Mar 26, 9:00 AM",actor:"Admin",text:"Project created"},{ts:"16 May 26, 3:00 PM",actor:"Admin",text:"Note: Connection pending — follow up"}], createdAt:"2026-03-27" },
  { id:7,  slNo:"8",  flNo:"1173", name:"JASMINA",          place:"KIZHAKKOTH",        kw:"5KW WITH 3KW DCR",phone:"9539579007", consumerNo:"1166119024453", totalAmount:"", stages:["31/3/26","LOAN","6/4/26","","14/3/26","","2/5/26","LOAN","7/5/26","PENDING",""], stageRemarks:Array(11).fill(""), remark:"CONNECTION KITTANUND 16/5/26", log:[{ts:"31 Mar 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-03-31" },
  { id:8,  slNo:"9",  flNo:"1188", name:"UDHAYAN",          place:"CHELAMBRA",         kw:"3 KW",            phone:"9747929619", consumerNo:"1166329009550", totalAmount:"", stages:["1/4/26","LOAN","3/4/26","30/3/26","10/4/26","13/4/26","20/4/26","LOAN","20/4/26","PENDING",""], stageRemarks:Array(11).fill(""), remark:"NOKKUNNA SIR OFFICE IL ILLA TOLD KSEB 16/5/26", log:[{ts:"1 Apr 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-04-01" },
  { id:9,  slNo:"11", flNo:"1211", name:"BEERAN KUTTY HAJI",place:"DEVATHIYAL",        kw:"3 KW",            phone:"9847192753", consumerNo:"1165770040439", totalAmount:"", stages:["3/4/26","RECEIVED","7/4/26","7/4/26","DONE","16/4/26","29/4/26","RECEIVED","6/5/26","PENDING",""], stageRemarks:Array(11).fill(""), remark:"MTER THAZHTHI VEKKAN PARANJITTUND 9/5/26", log:[{ts:"3 Apr 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-04-03" },
  { id:10, slNo:"15", flNo:"1244", name:"MOHAMMED ASHRAF",  place:"VADANAPALLY",       kw:"5 KW DCR",        phone:"8301001114", consumerNo:"1157166002434", totalAmount:"", stages:["9/4/26","LOAN","11/4/26","13/4/26","21/4/26","27/4/26","12/5/26","","14/5/26","",""], stageRemarks:Array(11).fill(""), remark:"", log:[{ts:"9 Apr 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-04-09" },
  { id:11, slNo:"27", flNo:"1279", name:"RASAL",             place:"THARAYITTAL",       kw:"5 WITH 3DCR",     phone:"9605777734", consumerNo:"1165560003261", totalAmount:"", stages:["23/4/26","RECEIVED","24/4/26","24/4/26","29/4/26","","","","","",""], stageRemarks:Array(11).fill(""), remark:"", log:[{ts:"23 Apr 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-04-23" },
  { id:12, slNo:"37", flNo:"1238", name:"MOIDEENKUTTY",      place:"ULLANAM",           kw:"8 WITH 10 KW NON DCR",phone:"8606015015",consumerNo:"1165752002005",totalAmount:"",stages:["4/5/26","RECEIVED","8/5/26","done","SHAFI 11/5/26","14/5/26","15/5/26","","18/5/26","",""], stageRemarks:Array(11).fill(""), remark:"ADVANCE 200000, CUS NOD PARANJU", log:[{ts:"4 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-05-04" },
  { id:13, slNo:"58", flNo:"1326", name:"ABDULSALAM P",      place:"MORAYUR",           kw:"8 KW N DCR",      phone:"8156815930", consumerNo:"1165546001686", totalAmount:"", stages:["26/5/26","CASH","","","","","","","","",""], stageRemarks:Array(11).fill(""), remark:"", log:[{ts:"26 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-05-26" },
  { id:14, slNo:"69", flNo:"1303", name:"SULAIMAN",          place:"KILINAKKODE",       kw:"5 KW DCR",        phone:"8138908083", consumerNo:"1168089012109", totalAmount:"", stages:["PENDING","CASH CUS","","","","","","","","",""], stageRemarks:Array(11).fill(""), remark:"", log:[{ts:"28 May 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-05-28" },
  { id:15, slNo:"81", flNo:"1130", name:"ABID ALI",          place:"PULLIPARAMBU",      kw:"5 KW DCR",        phone:"9446867487", consumerNo:"1166325016732", totalAmount:"", stages:["PENDING","CASH","","","","","","","","",""], stageRemarks:Array(11).fill(""), remark:"LOAD READY 3/6/26", log:[{ts:"3 Jun 26, 9:00 AM",actor:"Admin",text:"Project created"}], createdAt:"2026-06-03" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — exact copy of AdminLayout style
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { href: "#", label: "Dashboard",   icon: "▪", active: false },
  { href: "#", label: "Complaints",  icon: "▪", active: false },
  { href: "#", label: "Projects",    icon: "☀️", active: true  },
  { href: "#", label: "Technicians", icon: "▪", active: false },
  { href: "#", label: "Reports",     icon: "▪", active: false },
];

function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          <span className="font-bold text-gray-900 text-sm">VeKay Solar</span>
        </div>
      </div>
      <div className="flex-1 py-4 flex flex-col gap-0.5 px-3">
        {NAV.map(item => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              item.active
                ? "bg-[#1a5c38]/10 text-[#1a5c38]"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.icon === "☀️"
              ? <span className="mr-3 text-base">☀️</span>
              : <span className="mr-3 w-4 h-4 rounded-sm bg-gray-300 inline-block" />
            }
            {item.label}
          </a>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-gray-900">Admin</p>
          <p className="text-xs text-gray-500">admin</p>
        </div>
        <button className="w-full text-left px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
          Logout
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage dot with tooltip
// ─────────────────────────────────────────────────────────────────────────────

function StageDot({ value }: { value: string }) {
  const status = detectStatus(value);
  const { bg, title } = stageDot(status);
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        className={`w-2.5 h-2.5 rounded-full ${bg} cursor-default`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        title={value || title}
      />
      {show && value && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-50 pointer-events-none">
          {value}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Project modal
// ─────────────────────────────────────────────────────────────────────────────

function NewProjectModal({ nextSl, onClose, onCreate }: {
  nextSl: number; onClose: () => void; onCreate: (p: Project) => void;
}) {
  const [f, setF] = useState({ name: "", place: "", kw: "5 KW DCR", phone: "", consumerNo: "", flNo: "", totalAmount: "", remark: "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">New Project</h2>
              <p className="text-sm text-gray-500 mt-0.5">SL No {nextSl} · A new row will be added to your Google Sheet</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Place *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.place} onChange={e => set("place", e.target.value)} placeholder="Area / Location" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity (KW) *</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.kw} onChange={e => set("kw", e.target.value)}>
                {["3 KW DCR","3 KW","5 KW DCR","5 KW N DCR","5 KW","8 KW N DCR","8 WITH 5KW","10 KW N DCR","5 WITH 3DCR","5WITH3","30 KW","Custom"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">FL No</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.flNo} onChange={e => set("flNo", e.target.value)} placeholder="e.g. 1330" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">KSEB Consumer No</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.consumerNo} onChange={e => set("consumerNo", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Amount (₹)</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38]" value={f.totalAmount} onChange={e => set("totalAmount", e.target.value)} placeholder="₹" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">First Remark (optional)</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:border-[#1a5c38] resize-none" value={f.remark} onChange={e => set("remark", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => {
              if (!f.name.trim() || !f.place.trim()) return;
              const ts = nowIST();
              onCreate({
                id: Date.now(), slNo: String(nextSl), flNo: f.flNo,
                name: f.name.toUpperCase(), place: f.place.toUpperCase(),
                kw: f.kw, phone: f.phone, consumerNo: f.consumerNo,
                totalAmount: f.totalAmount,
                stages: Array(11).fill(""),
                stageRemarks: Array(11).fill(""),
                remark: f.remark,
                log: [{ ts, actor: "Admin", text: `Project created${f.remark ? ` · Note: ${f.remark}` : ""}` }],
                createdAt: new Date().toISOString(),
              });
              onClose();
            }}
            className="px-5 py-2 text-sm bg-[#1a5c38] hover:bg-[#154d30] text-white rounded-lg font-semibold shadow-sm"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail / Edit panel (slides in from right)
// ─────────────────────────────────────────────────────────────────────────────

function DetailPanel({ project, onClose, onSave }: {
  project: Project; onClose: () => void; onSave: (p: Project) => void;
}) {
  const [ed, setEd] = useState<Project>(() => JSON.parse(JSON.stringify(project)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const prevId = useRef(project.id);

  if (prevId.current !== project.id) {
    prevId.current = project.id;
    setEd(JSON.parse(JSON.stringify(project)));
    setSaved(false);
  }

  function setField<K extends keyof Project>(k: K, v: Project[K]) {
    setEd(p => ({ ...p, [k]: v }));
  }
  function setStage(i: number, v: string) {
    setEd(p => { const s = [...p.stages]; s[i] = v; return { ...p, stages: s }; });
  }
  function setStageRemark(i: number, v: string) {
    setEd(p => { const r = [...p.stageRemarks]; r[i] = v; return { ...p, stageRemarks: r }; });
  }

  function handleSave() {
    setSaving(true);
    const ts = nowIST();
    // Build log entries for changed stages
    const changes: string[] = [];
    project.stages.forEach((old, i) => {
      const nw = ed.stages[i];
      if (old !== nw) changes.push(`${STAGES[i].label}: "${old}" → "${nw}"`);
    });
    if (project.remark !== ed.remark) changes.push(`Note updated`);
    const newLog = changes.length
      ? [{ ts, actor: "Admin", text: changes.join(" · ") }, ...ed.log]
      : ed.log;
    const updated = { ...ed, log: newLog };
    setTimeout(() => {
      onSave(updated);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 600);
  }

  const pct = progressPct(ed.stages);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">FL {ed.flNo || "—"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${progressLabel(pct).cls}`}>{progressLabel(pct).label}</span>
              </div>
              <h2 className="font-bold text-gray-900 text-base truncate">{ed.name}</h2>
              <p className="text-sm text-gray-500">{ed.place} · {ed.kw}</p>
            </div>
            <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">✕</button>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-bold text-gray-700">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1a5c38] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Part A — Customer Details */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["Customer Name",   "name"],
                ["Place",          "place"],
                ["Phone",          "phone"],
                ["KSEB Consumer No","consumerNo"],
                ["Capacity (KW)",   "kw"],
                ["FL No",          "flNo"],
                ["SL No",          "slNo"],
                ["Total Amount (₹)","totalAmount"],
              ] as [string, keyof Project][]).map(([lbl, key]) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{lbl}</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/30 focus:border-[#1a5c38]"
                    value={String(ed[key] || "")}
                    onChange={e => setField(key, e.target.value as any)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Part B — 11 Stages */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Installation Stages</h3>
            <div className="space-y-3">
              {STAGES.map((s, i) => {
                const val = ed.stages[i] || "";
                const status = detectStatus(val);
                const { bg } = stageDot(status);
                return (
                  <div key={i} className={`rounded-lg border p-3 transition-colors ${status !== "empty" ? "border-gray-200 bg-gray-50/50" : "border-dashed border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bg}`} />
                      <span className="text-xs font-semibold text-gray-600">{i + 1}. {s.label}</span>
                      <span className="ml-1">{s.icon}</span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1a5c38] flex-shrink-0"
                        value=""
                        onChange={e => { if (e.target.value) setStage(i, e.target.value); }}
                      >
                        <option value="">Set status…</option>
                        {STAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input
                        className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a5c38]"
                        placeholder="or type date / name…"
                        value={val}
                        onChange={e => setStage(i, e.target.value)}
                      />
                    </div>
                    <input
                      className="mt-1.5 w-full border-0 border-b border-gray-100 px-0 py-1 text-xs text-gray-400 placeholder-gray-300 focus:outline-none focus:border-gray-300 bg-transparent"
                      placeholder="Stage note (optional)…"
                      value={ed.stageRemarks[i] || ""}
                      onChange={e => setStageRemark(i, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Part C — General remark */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">General Remark / Follow-up Note</h3>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/30 focus:border-[#1a5c38] resize-none"
              placeholder="Any general note about this project…"
              value={ed.remark}
              onChange={e => setField("remark", e.target.value)}
            />
          </div>

          {/* Part D — Activity log */}
          <div className="px-6 py-4">
            <button
              className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-full text-left mb-3"
              onClick={() => setLogOpen(o => !o)}
            >
              <span>Activity Log ({ed.log.length})</span>
              <span className="ml-auto">{logOpen ? "▲" : "▼"}</span>
            </button>
            {logOpen && (
              <div className="space-y-2">
                {ed.log.map((entry, i) => (
                  <div key={i} className="text-xs text-gray-500 flex gap-2">
                    <span className="text-gray-300 flex-shrink-0">·</span>
                    <span><span className="font-medium text-gray-600">{entry.ts}</span> · {entry.actor} — {entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#1a5c38] hover:bg-[#154d30] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg shadow-sm transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved & Synced to Sheet" : "Save & Sync"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Every save updates your Google Sheet instantly in IST</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Projects page
// ─────────────────────────────────────────────────────────────────────────────

const PROGRESS_FILTERS = [
  { value: "all",         label: "All" },
  { value: "new",         label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "nearly_done", label: "Nearly Done" },
  { value: "complete",    label: "Complete" },
];
const KW_FILTERS = [
  { value: "all",   label: "All Capacities" },
  { value: "3",     label: "3 KW" },
  { value: "5",     label: "5 KW" },
  { value: "large", label: "8 KW +" },
];

export function Projects() {
  const [projects, setProjects] = useState<Project[]>(SAMPLE);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [progressFilter, setProgressFilter] = useState("all");
  const [kwFilter, setKwFilter] = useState("all");

  function matchProgress(p: Project) {
    const pct = progressPct(p.stages);
    if (progressFilter === "new")         return pct === 0;
    if (progressFilter === "in_progress") return pct > 0 && pct < 80;
    if (progressFilter === "nearly_done") return pct >= 80 && pct < 100;
    if (progressFilter === "complete")    return pct === 100;
    return true;
  }
  function matchKw(p: Project) {
    const k = p.kw.toUpperCase();
    if (kwFilter === "3")     return k.startsWith("3");
    if (kwFilter === "5")     return k.startsWith("5");
    if (kwFilter === "large") return /^(8|10|12|14|30)/.test(k);
    return true;
  }

  const filtered = projects.filter(p => matchProgress(p) && matchKw(p));

  function handleSave(updated: Project) {
    setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  }
  function handleCreate(p: Project) {
    setProjects(ps => [...ps, p]);
    setSelected(p);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col gap-6">

            {/* Page header — identical pattern to Complaints */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
                <p className="text-gray-500 text-sm">Track solar installations through all 11 stages. Syncs live to Google Sheet.</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Progress filter */}
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/30"
                  value={progressFilter}
                  onChange={e => setProgressFilter(e.target.value)}
                >
                  {PROGRESS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {/* KW filter */}
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/30"
                  value={kwFilter}
                  onChange={e => setKwFilter(e.target.value)}
                >
                  {KW_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {/* New Project button */}
                <button
                  onClick={() => setShowNew(true)}
                  className="bg-[#1a5c38] hover:bg-[#154d30] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm"
                >
                  + New Project
                </button>
              </div>
            </div>

            {/* Table card — identical to Complaints card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">FL No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Place</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">KW</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                        No projects match the current filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map(p => {
                    const pct = progressPct(p.stages);
                    const { label, cls } = progressLabel(pct);
                    const isSelected = selected?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? "bg-[#1a5c38]/5" : ""}`}
                        onClick={() => setSelected(p)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.flNo || "—"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{p.place}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {p.kw}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: pct === 100 ? "#1a5c38" : pct >= 80 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#60a5fa" }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-7 text-right">{pct}%</span>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${cls}`}>{label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {p.stages.map((v, i) => <StageDot key={i} value={v} />)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="font-medium text-gray-500">Stage key:</span>
              {[
                ["bg-green-500",  "Done"],
                ["bg-amber-400",  "Pending"],
                ["bg-violet-500", "Loan/Cash/Received"],
                ["bg-blue-500",   "Submitted"],
                ["bg-sky-400",    "Note"],
                ["bg-gray-200",   "Not started"],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${c} inline-block`} />
                  {l}
                </span>
              ))}
              <span className="ml-auto text-gray-300">Hover a dot to see its value · Click a row to edit</span>
            </div>

          </div>
        </main>
      </div>

      {selected && <DetailPanel project={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
      {showNew && <NewProjectModal nextSl={projects.length + 1} onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}

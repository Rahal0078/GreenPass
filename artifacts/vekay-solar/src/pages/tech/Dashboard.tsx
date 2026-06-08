import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TechLayout } from "@/components/layout/TechLayout";
import {
  useGetTechnicianMap,
  getGetTechnicianMapQueryKey,
  type MapPin as ApiMapPin,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import {
  MapPin, Phone, CheckCircle2, Navigation, Locate,
  Car, Flag, CalendarDays, ChevronUp, ChevronDown,
  PauseCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

type Pin = ApiMapPin;

const URGENCY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

/* dot colour for urgency */
const URGENCY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-amber-400",
  low:      "bg-green-500",
};

/* left-border colour for urgency */
const URGENCY_BORDER: Record<string, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-500",
  medium:   "border-l-amber-400",
  low:      "border-l-green-500",
};

/* pill bg+text for urgency tag */
const URGENCY_PILL: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-amber-100 text-amber-700",
  low:      "bg-green-100 text-green-700",
};

const ACTIVE_STATUSES = ["open", "in_progress", "going", "reached"];
const ON_HOLD_STATUSES = ["on_hold"];
const DONE_STATUSES    = ["resolved", "closed"];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPinIcon(color: string, urgency: string, isPending = false) {
  const initial = isPending ? "?" : (urgency?.[0] ?? "?").toUpperCase();
  const fill = isPending ? "#f59e0b" : color;
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
      </filter>
      <path d="M17 1C8.163 1 1 8.163 1 17C1 26.5 17 43 17 43C17 43 33 26.5 33 17C33 8.163 25.837 1 17 1Z"
        fill="${fill}" stroke="white" stroke-width="2.5" filter="url(#shadow)"/>
      <circle cx="17" cy="16" r="8" fill="white" opacity="0.92"/>
      <text x="17" y="20.5" text-anchor="middle" font-size="10" font-weight="700"
        font-family="system-ui,sans-serif" fill="${fill}">${initial}</text>
    </svg>`;
  return L.divIcon({ className: "", html: svg, iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -46] });
}

function getTechIcon() {
  const svg = `
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="19" cy="19" r="17" fill="#2563eb" stroke="white" stroke-width="3"/>
      <circle cx="19" cy="19" r="6" fill="white"/>
      <circle cx="19" cy="19" r="3" fill="#2563eb"/>
    </svg>`;
  return L.divIcon({ className: "", html: svg, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22] });
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom(), { animate: true }); }, [lat, lng, map]);
  return null;
}

/* ── Compact mini-card used in left (priority) and right (nearest) columns ── */
function MiniCard({ pin, techPos, onClick }: {
  pin: Pin;
  techPos: { lat: number; lng: number } | null;
  onClick: () => void;
}) {
  const u      = pin.urgency ?? "low";
  const dot    = URGENCY_DOT[u]    ?? "bg-gray-400";
  const border = URGENCY_BORDER[u] ?? "border-l-gray-400";
  const pill   = URGENCY_PILL[u]   ?? "bg-gray-100 text-gray-600";
  const status = pin.status ?? "open";
  const distKm = techPos && pin.lat != null && pin.lng != null
    ? haversineKm(techPos.lat, techPos.lng, pin.lat, pin.lng) : null;

  return (
    <div
      data-id={pin.complaintId}
      onClick={onClick}
      className={`border-l-[3px] ${border} border border-gray-100 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 cursor-pointer active:scale-[0.98] transition-transform mb-1.5`}
    >
      <div className="px-1.5 py-1.5">
        {/* urgency pill + status icon */}
        <div className="flex items-center gap-1 mb-1">
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full leading-none capitalize ${pill}`}>
            {u === "critical" ? "C" : u === "high" ? "H" : u === "medium" ? "M" : "L"}
          </span>
          {pin.isPending && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">?</span>
          )}
          {status === "going"   && <Car  className="h-2.5 w-2.5 text-blue-600 shrink-0" />}
          {status === "reached" && <Flag className="h-2.5 w-2.5 text-emerald-600 shrink-0" />}
          {distKm != null && (
            <span className="text-[8px] text-blue-600 font-semibold ml-auto">{distKm.toFixed(1)}km</span>
          )}
        </div>
        {/* name */}
        <p className="text-[10px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{pin.customerName}</p>
        {/* place */}
        <p className="text-[9px] text-gray-400 truncate mt-0.5 leading-tight">{pin.placeName}</p>
      </div>
    </div>
  );
}

/* ── Compact mini-card for on-hold column ── */
function HoldCard({ pin, techPos, onClick }: {
  pin: Pin;
  techPos: { lat: number; lng: number } | null;
  onClick: () => void;
}) {
  const scheduledDate = (pin as any).scheduledDate as string | null | undefined;
  const heldSince  = format(new Date(pin.createdAt), "d MMM");
  const heldTime   = format(new Date(pin.createdAt), "h:mm a");
  const resumeDate = scheduledDate ? format(new Date(scheduledDate), "d MMM") : null;
  const distKm     = techPos && pin.lat != null && pin.lng != null
    ? haversineKm(techPos.lat, techPos.lng, pin.lat, pin.lng) : null;

  return (
    <div
      data-id={pin.complaintId}
      onClick={onClick}
      className="border-l-[3px] border-l-orange-400 border border-orange-100 dark:border-orange-900 rounded-md bg-orange-50/70 dark:bg-orange-950/20 cursor-pointer active:scale-[0.98] transition-transform mb-1.5"
    >
      <div className="px-1.5 py-1.5">
        {/* hold badge */}
        <div className="flex items-center gap-1 mb-1">
          <PauseCircle className="h-2.5 w-2.5 text-orange-500 shrink-0" />
          <span className="text-[8px] font-bold text-orange-600 leading-none">HOLD</span>
          {distKm != null && (
            <span className="text-[8px] text-blue-600 font-semibold ml-auto">{distKm.toFixed(1)}km</span>
          )}
        </div>
        {/* name */}
        <p className="text-[10px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{pin.customerName}</p>
        {/* date row */}
        <div className="flex items-center gap-0.5 mt-0.5">
          <CalendarDays className="h-2.5 w-2.5 text-orange-400 shrink-0" />
          <p className="text-[8px] text-orange-600 font-medium leading-tight truncate">
            {resumeDate ? `${heldSince} → ${resumeDate}` : `${heldSince} ${heldTime}`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Column wrapper ── */
function Col({ title, icon, count, children, accent }: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col border-r last:border-r-0 border-gray-100 dark:border-gray-800">
      {/* column header */}
      <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${accent} bg-gray-50/80 dark:bg-gray-900/60 shrink-0`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider truncate">{title}</span>
        <span className="ml-auto text-[9px] font-bold text-gray-400 shrink-0">{count}</span>
      </div>
      {/* scrollable cards */}
      <div className="flex-1 overflow-y-auto px-1.5 pt-1.5 pb-2">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */

export default function TechDashboard() {
  const [, setLocation] = useLocation();
  const { user }        = useAuth();

  const [techPos,    setTechPos]    = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [showDone,   setShowDone]   = useState(false);

  const { data: pins, isLoading } = useGetTechnicianMap(user?.id || 0, {
    query: { enabled: !!user?.id, queryKey: getGetTechnicianMapQueryKey(user?.id || 0) },
  });

  /* auto-get location on mount */
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setTechPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false); },
      ()    => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setTechPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false); },
      ()    => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /* ── data slices ── */
  const allPins    = pins ?? [];
  const workPins   = allPins.filter((p) => ACTIVE_STATUSES.includes(p.status ?? "open") || p.isPending);
  const onHoldPins = allPins.filter((p) => ON_HOLD_STATUSES.includes(p.status ?? ""));
  const donePins   = allPins.filter((p) => DONE_STATUSES.includes(p.status ?? ""));
  const activePins = workPins.filter((p) => ACTIVE_STATUSES.includes(p.status ?? "open"));

  const lockedJob  = activePins.find((p) => p.status === "going" || p.status === "reached") ?? null;

  /* LEFT: all active+pending sorted by urgency, then distance */
  const leftPins = [...workPins].sort((a, b) => {
    const ao = URGENCY_ORDER[a.urgency ?? "low"] ?? 99;
    const bo = URGENCY_ORDER[b.urgency ?? "low"] ?? 99;
    if (ao !== bo) return ao - bo;
    if (techPos && a.lat != null && a.lng != null && b.lat != null && b.lng != null)
      return haversineKm(techPos.lat, techPos.lng, a.lat, a.lng)
           - haversineKm(techPos.lat, techPos.lng, b.lat, b.lng);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  /* CENTRE: on-hold, oldest hold date first (longest waiting at top) */
  const centrePins = [...onHoldPins].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  /* RIGHT: all active+pending sorted by nearest location */
  const rightPins = [...workPins].sort((a, b) => {
    if (techPos && a.lat != null && a.lng != null && b.lat != null && b.lng != null)
      return haversineKm(techPos.lat, techPos.lng, a.lat, a.lng)
           - haversineKm(techPos.lat, techPos.lng, b.lat, b.lng);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  /* map centre */
  const geoPin   = activePins.find((p) => p.lat != null) ?? allPins.find((p) => p.lat != null);
  const centerLat = techPos?.lat ?? (geoPin?.lat != null ? geoPin.lat : 10.8505);
  const centerLng = techPos?.lng ?? (geoPin?.lng != null ? geoPin.lng : 76.2711);

  if (isLoading) {
    return (
      <TechLayout>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm">Loading assignments…</p>
          </div>
        </div>
      </TechLayout>
    );
  }

  return (
    <TechLayout>
      <div className="flex-1 flex flex-col h-full md:flex-row overflow-hidden">

        {/* ══ MAP ══════════════════════════════════════════════════════════════ */}
        <div className="h-[42vh] md:h-full md:flex-1 relative z-0 shrink-0">
          <MapContainer center={[centerLat, centerLng]} zoom={techPos ? 11 : 8}
            style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter lat={centerLat} lng={centerLng} />

            {techPos && (
              <Marker position={[techPos.lat, techPos.lng]} icon={getTechIcon()}>
                <Popup minWidth={150}>
                  <p className="font-semibold text-sm text-blue-700 text-center">📍 You are here</p>
                  <p className="text-xs text-gray-500 text-center">{user?.name}</p>
                </Popup>
              </Marker>
            )}

            {activePins.filter((p) => p.lat != null && p.lng != null).map((pin) => (
              <Marker key={pin.complaintId} position={[pin.lat!, pin.lng!]}
                icon={getPinIcon(pin.urgencyColor || "#6b7280", pin.urgency ?? "low")}
                eventHandlers={{ click: () => setLocation(`/tech/complaints/${pin.complaintId}`) }}>
                <Popup minWidth={230}>
                  <div className="space-y-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">{pin.ticketId}</span>
                      <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                        style={{ background: `${pin.urgencyColor}22`, color: pin.urgencyColor ?? undefined }}>
                        {pin.urgency}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{pin.customerName}</p>
                      <p className="text-xs text-gray-500">{pin.complaintType}</p>
                    </div>
                    {pin.customerPhone && (
                      <a href={`tel:${pin.customerPhone}`} className="flex items-center gap-1 text-xs text-blue-600">
                        <Phone className="h-3 w-3" /> {pin.customerPhone}
                      </a>
                    )}
                    <div className="flex items-start gap-1 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{[pin.address, pin.placeName].filter(Boolean).join(", ")}</span>
                    </div>
                    {techPos && pin.lat != null && pin.lng != null && (
                      <p className="text-xs font-medium text-blue-600">
                        📏 {haversineKm(techPos.lat, techPos.lng, pin.lat, pin.lng).toFixed(1)} km away
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 h-7 text-xs"
                        onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> View Job
                      </Button>
                      <a href={pin.lat != null
                          ? `https://maps.google.com/?q=${pin.lat},${pin.lng}`
                          : `https://maps.google.com/search/?api=1&query=${encodeURIComponent([pin.address, pin.placeName, "Kerala"].filter(Boolean).join(", "))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center h-7 w-7 rounded border border-gray-200 hover:bg-gray-50 shrink-0">
                        <Navigation className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {allPins.filter((p) => p.isPending && p.lat != null && p.lng != null).map((pin) => (
              <Marker key={`p-${pin.complaintId}`} position={[pin.lat!, pin.lng!]}
                icon={getPinIcon(pin.urgencyColor || "#f59e0b", pin.urgency ?? "low", true)}
                eventHandlers={{ click: () => setLocation(`/tech/complaints/${pin.complaintId}`) }}>
                <Popup minWidth={200}>
                  <div className="space-y-1.5 py-1">
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{pin.ticketId}</span>
                    <p className="font-semibold text-sm">{pin.customerName}</p>
                    <p className="text-xs text-amber-700 font-medium">First to accept gets assigned!</p>
                    <Button size="sm" className="w-full h-7 text-xs"
                      onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)}>
                      View &amp; Accept
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* locate button */}
          <button onClick={handleLocate} disabled={locLoading}
            className="absolute bottom-3 right-3 z-[500] bg-white shadow-md rounded-full p-2.5 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60"
            title="Find my location">
            {locLoading
              ? <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              : <Locate className="h-5 w-5 text-primary" />}
          </button>
          {techPos && (
            <div className="absolute bottom-3 left-3 z-[500] bg-white/90 rounded-lg px-2 py-1 shadow border border-gray-200 text-[10px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow inline-block" />
              <span className="text-gray-500">Your location</span>
            </div>
          )}
        </div>

        {/* ══ 3-COLUMN PANEL ═══════════════════════════════════════════════════ */}
        <div className="h-[58vh] md:h-full md:w-[400px] lg:w-[450px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col z-10 overflow-hidden">

          {/* ── locked-job banner ── */}
          {lockedJob && (
            <div
              onClick={() => setLocation(`/tech/complaints/${lockedJob.complaintId}`)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700 shrink-0">
              {lockedJob.status === "going"
                ? <><Car className="h-3.5 w-3.5 shrink-0" /> On the way · {lockedJob.customerName} — tap to continue</>
                : <><Flag className="h-3.5 w-3.5 shrink-0" /> On-site · {lockedJob.customerName} — tap to complete</>}
            </div>
          )}

          {/* ── panel header ── */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 shrink-0">
            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
              <span>{workPins.length} active</span>
              {onHoldPins.length > 0 && <span className="text-orange-500">{onHoldPins.length} on hold</span>}
            </div>
            {!techPos && (
              <button onClick={handleLocate} disabled={locLoading}
                className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-60">
                <Locate className="h-3 w-3" />
                {locLoading ? "Locating…" : "Get location"}
              </button>
            )}
          </div>

          {/* ── three columns ── */}
          <div className="flex-1 flex overflow-hidden">

            {/* LEFT — Priority (by urgency) */}
            <Col
              title="Priority"
              icon={<span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              count={leftPins.length}
              accent="border-b-red-200"
            >
              {leftPins.length === 0 ? (
                <p className="text-[9px] text-gray-400 text-center mt-4">No jobs</p>
              ) : leftPins.map((pin) => (
                <MiniCard key={pin.complaintId} pin={pin} techPos={techPos}
                  onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)} />
              ))}
            </Col>

            {/* CENTRE — On Hold (oldest first) */}
            <Col
              title="On Hold"
              icon={<PauseCircle className="h-3 w-3 text-orange-500 shrink-0" />}
              count={centrePins.length}
              accent="border-b-orange-200"
            >
              {centrePins.length === 0 ? (
                <p className="text-[9px] text-gray-400 text-center mt-4">None</p>
              ) : centrePins.map((pin) => (
                <HoldCard key={pin.complaintId} pin={pin} techPos={techPos}
                  onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)} />
              ))}
            </Col>

            {/* RIGHT — Nearest (by distance) */}
            <Col
              title={techPos ? "Nearest" : "All Jobs"}
              icon={<Navigation className="h-3 w-3 text-blue-500 shrink-0" />}
              count={rightPins.length}
              accent="border-b-blue-200"
            >
              {rightPins.length === 0 ? (
                <p className="text-[9px] text-gray-400 text-center mt-4">No jobs</p>
              ) : rightPins.map((pin) => (
                <MiniCard key={pin.complaintId} pin={pin} techPos={techPos}
                  onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)} />
              ))}
            </Col>
          </div>

          {/* ── Completed (collapsed footer) ── */}
          {donePins.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Completed
                  <span className="bg-gray-200 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{donePins.length}</span>
                </span>
                {showDone ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showDone && (
                <div className="max-h-32 overflow-y-auto px-2 pb-2 space-y-1">
                  {[...donePins]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((pin) => (
                      <div key={pin.complaintId}
                        onClick={() => setLocation(`/tech/complaints/${pin.complaintId}`)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors opacity-70">
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="text-[10px] font-medium text-gray-700 truncate">{pin.customerName}</span>
                        <span className="text-[9px] text-gray-400 ml-auto shrink-0">{pin.placeName}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </TechLayout>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetComplaintByTicket, getGetComplaintByTicketQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle, Clock, MapPin, User, FileText, CheckCircle2, Mail, Phone, Car, Flag } from "lucide-react";
import { format } from "date-fns";

type Complaint = {
  id: number;
  ticketId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  placeName: string;
  district: string;
  pincode: string;
  address: string;
  complaintType: string;
  description: string;
  status: string;
  urgency: string;
  urgencyColor?: string;
  technicianName?: string | null;
  createdAt: string;
  completedAt?: string | null;
  completionNotes?: string | null;
};

function detectSearchType(q: string): "ticket" | "email" | "phone" {
  if (q.includes("@")) return "email";
  if (/^[\d\s+\-()]{7,}$/.test(q)) return "phone";
  return "ticket";
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  open:        { label: "Registered",        badge: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Under Review",      badge: "bg-amber-100 text-amber-800" },
  going:       { label: "Technician on the Way", badge: "bg-orange-100 text-orange-800" },
  reached:     { label: "Technician On-site",    badge: "bg-teal-100 text-teal-800" },
  resolved:    { label: "Resolved",          badge: "bg-green-100 text-green-800" },
  closed:      { label: "Closed",            badge: "bg-gray-100 text-gray-800" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.closed;
  return (
    <Badge variant="outline" className={`text-xs ${meta.badge}`}>
      {meta.label}
    </Badge>
  );
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const s = complaint.status;
  const barColor: Record<string, string> = {
    open: "bg-blue-400", in_progress: "bg-amber-400",
    going: "bg-orange-400", reached: "bg-teal-400",
    resolved: "bg-green-500", closed: "bg-gray-400",
  };

  // Build the timeline steps based on current status
  const hasAssigned = !!complaint.technicianName;
  const isGoing    = ["going","reached","resolved","closed"].includes(s);
  const isReached  = ["reached","resolved","closed"].includes(s);
  const isDone     = ["resolved","closed"].includes(s);

  const steps = [
    {
      done: true,
      icon: <Clock className="h-4 w-4" />,
      title: "Complaint Registered",
      detail: format(new Date(complaint.createdAt), 'PPP p'),
    },
    hasAssigned ? {
      done: true,
      icon: <User className="h-4 w-4" />,
      title: "Technician Assigned",
      detail: `${complaint.technicianName} is handling your request`,
    } : null,
    isGoing ? {
      done: isReached || isDone,
      active: s === "going",
      icon: <Car className="h-4 w-4" />,
      title: "Technician On the Way",
      detail: s === "going" ? "Your technician is currently travelling to your location." : "Technician reached your location.",
    } : null,
    isReached ? {
      done: isDone,
      active: s === "reached",
      icon: <Flag className="h-4 w-4" />,
      title: "Technician On-site",
      detail: s === "reached" ? "Your technician has arrived and is working on the issue." : "Technician completed on-site work.",
    } : null,
    isDone ? {
      done: true,
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Issue Resolved",
      detail: complaint.completedAt ? format(new Date(complaint.completedAt), 'PPP p') : undefined,
      notes: complaint.completionNotes,
    } : null,
  ].filter(Boolean) as { done: boolean; active?: boolean; icon: React.ReactNode; title: string; detail?: string; notes?: string | null }[];

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${barColor[s] ?? "bg-gray-300"}`} />
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Ticket ID</p>
            <CardTitle className="text-xl font-mono uppercase tracking-tight">{complaint.ticketId}</CardTitle>
          </div>
          <StatusBadge status={s} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Live Job Status</h3>
          <div className="space-y-0">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done ? "bg-green-500 text-white" : step.active ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
                    }`}>
                      {step.icon}
                    </div>
                    {!isLast && <div className={`w-0.5 h-5 my-0.5 ${step.done ? "bg-green-300" : "bg-gray-200"}`} />}
                  </div>
                  <div className="pb-3 pt-1">
                    <p className={`text-sm font-semibold ${step.done || step.active ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                      {step.title}
                    </p>
                    {step.detail && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    {step.notes && (
                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 italic">
                        "{step.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Customer</h3>
            <p className="font-medium">{complaint.customerName}</p>
            <p className="text-sm text-gray-600">{complaint.customerPhone}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</h3>
            <p className="font-medium">{complaint.placeName}</p>
            <p className="text-sm text-gray-600">{complaint.address}</p>
            <p className="text-sm text-gray-600">{complaint.district}, {complaint.pincode}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Issue</h3>
          <p className="font-medium text-primary">{complaint.complaintType}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">{complaint.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrackTicket() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState(params.ticketId || "");
  const [activeTicket, setActiveTicket] = useState(params.ticketId || "");
  const [lookupResults, setLookupResults] = useState<Complaint[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const searchType = detectSearchType(activeTicket);
  const isTicketSearch = searchType === "ticket";

  const { data: complaint, isLoading: ticketLoading, isError: ticketError } = useGetComplaintByTicket(
    activeTicket,
    { query: { enabled: !!activeTicket && isTicketSearch, retry: false, queryKey: getGetComplaintByTicketQueryKey(activeTicket) } }
  );

  useEffect(() => {
    if (params.ticketId && params.ticketId !== activeTicket) {
      setActiveTicket(params.ticketId);
      setSearchInput(params.ticketId);
    }
  }, [params.ticketId]);

  useEffect(() => {
    if (!activeTicket || isTicketSearch) {
      setLookupResults(null);
      setLookupError(null);
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    fetch(`/api/complaints/lookup?q=${encodeURIComponent(activeTicket)}`)
      .then((r) => {
        if (!r.ok) throw new Error("No results found");
        return r.json();
      })
      .then((data) => {
        setLookupResults(data);
        setLookupLoading(false);
      })
      .catch(() => {
        setLookupError("No complaints found matching that email or phone number.");
        setLookupLoading(false);
      });
  }, [activeTicket, isTicketSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    setLookupResults(null);
    setLookupError(null);
    if (detectSearchType(q) === "ticket") {
      setLocation(`/track/${q}`);
    } else {
      setActiveTicket(q);
    }
  };

  const isLoading = isTicketSearch ? ticketLoading : lookupLoading;
  const hasError = isTicketSearch ? (ticketError && !!activeTicket) : !!lookupError;

  const searchTypeLabel = searchType === "email"
    ? <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Searching by email</span>
    : searchType === "phone"
    ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Searching by phone number</span>
    : null;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Track Your Complaint</h1>
          <p className="text-gray-500 mt-2">Enter your ticket ID, email address, or phone number.</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Ticket ID, email or phone number..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 px-8">Search</Button>
            </form>
            {activeTicket && searchTypeLabel && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1 pl-1">{searchTypeLabel}</p>
            )}
            <p className="mt-3 text-xs text-gray-400 pl-1">
              Tip: You can search by <strong>Ticket ID</strong> (e.g. GP-XXXXX), <strong>email address</strong>, or <strong>phone number</strong>
            </p>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {hasError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <CardContent className="pt-6 text-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">No results found</p>
              <p className="text-sm opacity-80">
                {isTicketSearch ? "Please check the ticket ID and try again." : lookupError}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Single ticket result */}
        {complaint && isTicketSearch && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ComplaintCard complaint={complaint as Complaint} />
          </div>
        )}

        {/* Multiple results from email/phone lookup */}
        {lookupResults && !lookupLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {lookupResults.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                <CardContent className="pt-6 text-center text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">No complaints found</p>
                  <p className="text-sm opacity-80">No complaints registered with that email or phone number.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-gray-500 font-medium">{lookupResults.length} complaint{lookupResults.length > 1 ? "s" : ""} found</p>
                {lookupResults.map((c) => (
                  <ComplaintCard key={c.id} complaint={c} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetComplaint, 
  useUpdateComplaint,
  useListTechnicians,
  getGetComplaintQueryKey,
  getListTechniciansQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Mail, MapPin, Loader2, Save, ShieldCheck, AlertCircle, Navigation, UserRound, Clock, User, Car, Flag, CheckCircle2, CalendarDays, Users, PauseCircle, RefreshCw, History } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CustomerHistory {
  phone: string;
  name: string;
  email: string;
  totalComplaints: number;
  complaints: {
    id: number;
    ticketId: string;
    complaintType: string;
    status: string;
    urgency: string;
    placeName: string;
    createdAt: string;
    completedAt: string | null;
  }[];
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  going: "bg-amber-50 text-amber-700 border-amber-200",
  reached: "bg-orange-50 text-orange-700 border-orange-200",
  on_hold: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function ComplaintDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: complaint, isLoading } = useGetComplaint(id, { 
    query: { enabled: !!id, queryKey: getGetComplaintQueryKey(id) } 
  });
  
  const { data: technicians } = useListTechnicians({
    query: { queryKey: getListTechniciansQueryKey() }
  });
  const updateComplaint = useUpdateComplaint();

  const [urgency, setUrgency] = useState<string>("low");
  const [technicianId, setTechnicianId] = useState<string>("none");
  const [pendingTechnicianIds, setPendingTechnicianIds] = useState<number[]>([]);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [reassignTechId, setReassignTechId] = useState<string>("none");
  const [managementSaved, setManagementSaved] = useState(false);
  const [editingManagement, setEditingManagement] = useState(true);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const initializedRef = useRef<number | null>(null);

  useEffect(() => {
    if (complaint && initializedRef.current !== id) {
      initializedRef.current = id;
      setUrgency(complaint.urgency);
      setTechnicianId(complaint.technicianId?.toString() || "none");
      setPendingTechnicianIds(complaint.pendingTechnicianIds ?? []);
      setAdminNotes(complaint.adminNotes || "");
      setScheduledDate(complaint.scheduledDate || "");
    }
  }, [complaint, id]);

  useEffect(() => {
    if (!complaint?.customerPhone) return;
    setHistoryLoading(true);
    fetch(`${BASE}/api/customers/${encodeURIComponent(complaint.customerPhone)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setCustomerHistory(data))
      .catch(() => setCustomerHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [complaint?.customerPhone]);

  const handleSave = () => {
    let urgencyColor = "#3b82f6";
    if (urgency === "medium") urgencyColor = "#f59e0b";
    if (urgency === "high") urgencyColor = "#ef4444";
    if (urgency === "critical") urgencyColor = "#000000";

    updateComplaint.mutate(
      { 
        id, 
        data: {
          urgency: urgency as any,
          urgencyColor,
          technicianId: technicianId === "none" ? null : parseInt(technicianId, 10),
          pendingTechnicianIds: pendingTechnicianIds as any,
          adminNotes,
          scheduledDate: scheduledDate || null,
        } as any
      },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetComplaintQueryKey(id), updatedData);
          toast({ title: "Saved", description: "Complaint details updated successfully." });
          setManagementSaved(true);
          setEditingManagement(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to update complaint", variant: "destructive" });
        }
      }
    );
  };

  const togglePendingTech = (techId: number) => {
    setPendingTechnicianIds(prev =>
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
  };

  const handleReassign = () => {
    if (reassignTechId === "none") {
      toast({ title: "Select a technician", description: "Please choose who to reassign this job to.", variant: "destructive" });
      return;
    }
    updateComplaint.mutate(
      {
        id,
        data: {
          technicianId: parseInt(reassignTechId, 10),
          pendingTechnicianIds: [] as any,
          status: "in_progress" as any,
        } as any,
      },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetComplaintQueryKey(id), updatedData);
          const tech = technicians?.find(t => t.id === parseInt(reassignTechId, 10));
          toast({ title: "Reassigned", description: `Job assigned to ${tech?.name ?? "technician"} and resumed.` });
          setTechnicianId(reassignTechId);
          setReassignTechId("none");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to reassign.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card><CardContent className="h-[400px]" /></Card>
        </div>
      </AdminLayout>
    );
  }

  if (!complaint) {
    return <AdminLayout><div>Complaint not found.</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/complaints")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Ticket {complaint.ticketId}</h1>
          <Badge variant="secondary" className="ml-auto uppercase">{complaint.status}</Badge>
        </div>

        {/* ── On Hold Banner with Reassign ── */}
        {complaint.status === "on_hold" && (
          <Card className="border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <PauseCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-300">Job On Hold</h3>
                  {complaint.adminNotes && (
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1 whitespace-pre-wrap">{complaint.adminNotes}</p>
                  )}
                  <p className="text-xs text-orange-500 mt-2">Assigned technician could not complete. You can reassign to a different technician or wait for them to resume.</p>
                </div>
              </div>
              <div className="flex gap-3 items-end pt-3 border-t border-orange-200 dark:border-orange-800">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-orange-900 dark:text-orange-300">Reassign to</label>
                  <Select value={reassignTechId} onValueChange={setReassignTechId}>
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-orange-300">
                      <SelectValue placeholder="Select technician…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select technician —</SelectItem>
                      {technicians?.map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.name} <span className="text-gray-400">({tech.area})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleReassign}
                  disabled={updateComplaint.isPending || reassignTechId === "none"}
                  className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
                  {updateComplaint.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <RefreshCw className="h-4 w-4 mr-2" />
                  }
                  Reassign &amp; Resume
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Issue Description</CardTitle>
                <CardDescription>Created {format(new Date(complaint.createdAt), 'PPP p')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">{complaint.complaintType}</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{complaint.description}</p>
                </div>

                {complaint.scheduledDate && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-600">Preferred Service Date</p>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {format(new Date(complaint.scheduledDate), 'PPP')}
                      </p>
                    </div>
                  </div>
                )}
                
                {complaint.completionNotes && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border rounded-lg mt-4">
                    <h4 className="text-sm font-semibold mb-2">Technician Completion Notes</h4>
                    <p className="text-gray-600 dark:text-gray-400">{complaint.completionNotes}</p>
                    {complaint.completedAt && (
                      <p className="text-xs text-gray-500 mt-2">Completed: {format(new Date(complaint.completedAt), 'PPP p')}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="font-medium">{complaint.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact</p>
                    <div className="flex flex-col gap-1 mt-1">
                      <a href={`tel:${complaint.customerPhone}`} className="flex items-center text-primary hover:underline">
                        <Phone className="h-4 w-4 mr-2" />{complaint.customerPhone}
                      </a>
                      {complaint.customerEmail && (
                        <a href={`mailto:${complaint.customerEmail}`} className="flex items-center text-primary hover:underline">
                          <Mail className="h-4 w-4 mr-2" />{complaint.customerEmail}
                        </a>
                      )}
                    </div>
                  </div>
                  {(complaint as any).ksebConsumerNumber && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">KSEB Consumer No.</p>
                      <p className="font-mono font-medium tracking-wider">{(complaint as any).ksebConsumerNumber}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400 shrink-0" />
                      <div className="space-y-2">
                        <p>{complaint.address}</p>
                        <p className="text-sm text-gray-500">{complaint.placeName}, {complaint.district} - {complaint.pincode}</p>
                        {complaint.locationSource === 'gps' ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded w-fit font-medium">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />📍 GPS verified — exact customer location
                          </div>
                        ) : complaint.locationSource === 'map' ? (
                          <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded w-fit font-medium">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />🗺 Customer pinned on map — good accuracy
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-fit font-medium">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />⚠ Approximate address — call customer before visiting
                          </div>
                        )}
                        {complaint.lat && complaint.lng && (
                          <a href={`https://maps.google.com/?q=${complaint.lat},${complaint.lng}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Navigation className="h-3.5 w-3.5" />Open in Google Maps
                            {complaint.locationSource === 'gps' && <span className="text-green-600">(GPS pin)</span>}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5"
                      onClick={() => setLocation(`/admin/customers/${encodeURIComponent(complaint.customerPhone)}`)}>
                      <UserRound className="h-3.5 w-3.5" />Open Full Customer Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Customer Complaint History (inline) ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-gray-400" />
                    Customer History
                  </CardTitle>
                  {customerHistory && (
                    <Badge variant="secondary" className="text-xs">
                      {customerHistory.totalComplaints} ticket{customerHistory.totalComplaints !== 1 ? "s" : ""} total
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : !customerHistory || customerHistory.complaints.length === 0 ? (
                  <p className="text-sm text-gray-400">No history found.</p>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.complaints.map(c => {
                      const isCurrent = c.id === id;
                      const urgencyDot: Record<string, string> = {
                        critical: "bg-black", high: "bg-red-500",
                        medium: "bg-amber-500", low: "bg-blue-500",
                      };
                      return (
                        <div
                          key={c.id}
                          onClick={() => !isCurrent && setLocation(`/admin/complaints/${c.id}`)}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isCurrent
                              ? "bg-primary/5 border-primary/30 cursor-default"
                              : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${urgencyDot[c.urgency] ?? "bg-gray-300"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-semibold text-gray-500">{c.ticketId}</span>
                              {isCurrent && <span className="text-xs text-primary font-medium">(this ticket)</span>}
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${STATUS_STYLES[c.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                {c.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-0.5 truncate">{c.complaintType}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.placeName} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {/* Job Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Job Progress</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Updated automatically by the technician</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const s = complaint.status;
                  const steps = [
                    { key: "open",     label: "Registered",    icon: Clock,        done: true },
                    { key: "assigned", label: "Tech Assigned", icon: User,         done: !!complaint.technicianId },
                    { key: "going",    label: "On the Way",    icon: Car,          done: ["going","reached","resolved","closed"].includes(s), active: s === "going" },
                    { key: "reached",  label: "On-site",       icon: Flag,         done: ["reached","resolved","closed"].includes(s), active: s === "reached" },
                    { key: "resolved", label: "Resolved",      icon: CheckCircle2, done: ["resolved","closed"].includes(s), active: s === "resolved" || s === "closed" },
                  ];
                  return (
                    <div className="space-y-0">
                      {steps.map((step, i) => {
                        const Icon = step.icon;
                        const isLast = i === steps.length - 1;
                        return (
                          <div key={step.key} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                step.done ? "bg-green-500 text-white" : (step as any).active ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {!isLast && <div className={`w-0.5 h-6 my-0.5 ${step.done ? "bg-green-300" : "bg-gray-200 dark:bg-gray-700"}`} />}
                            </div>
                            <div className="pb-2 pt-1">
                              <p className={`text-sm font-medium ${step.done || (step as any).active ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                                {step.label}
                                {step.key === "assigned" && complaint.technicianName && (
                                  <span className="ml-1 text-xs font-normal text-gray-500">— {complaint.technicianName}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Admin override: revert "reached" back to "going" */}
                {complaint.status === "reached" && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">Admin override — if technician tapped "arrived" by mistake:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                      disabled={updateComplaint.isPending}
                      onClick={() =>
                        updateComplaint.mutate(
                          { id, data: { status: "going" as any } },
                          {
                            onSuccess: (d) => {
                              queryClient.setQueryData(getGetComplaintQueryKey(id), d);
                              toast({ title: "Reverted", description: "Status set back to On the Way." });
                            },
                            onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                          }
                        )
                      }
                    >
                      {updateComplaint.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : <RefreshCw className="h-4 w-4 mr-2" />}
                      Revert to "On the Way"
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Management controls */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Management</CardTitle>
                  {managementSaved && !editingManagement && (
                    <button
                      onClick={() => setEditingManagement(true)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      Edit
                    </button>
                  )}
                </div>
                {managementSaved && !editingManagement && (() => {
                  const tech = technicians?.find(t => t.id === parseInt(technicianId, 10));
                  const urgencyBg: Record<string, string> = {
                    critical: "bg-black text-white", high: "bg-red-500 text-white",
                    medium: "bg-amber-500 text-white", low: "bg-blue-500 text-white",
                  };
                  return (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${urgencyBg[urgency] ?? urgencyBg.low}`}>
                        {urgency}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                        {tech ? tech.name : pendingTechnicianIds.length > 0 ? `${pendingTechnicianIds.length} in pool` : "Unassigned"}
                      </span>
                      {scheduledDate && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 font-medium">
                          📅 {scheduledDate}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </CardHeader>
              {editingManagement && (<CardContent className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Urgency Level</label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> Low</div></SelectItem>
                      <SelectItem value="medium"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/> Medium</div></SelectItem>
                      <SelectItem value="high"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"/> High</div></SelectItem>
                      <SelectItem value="critical"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-black dark:bg-red-900"/> Critical</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    Preferred Service Date
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Direct Assignment</label>
                  <Select
                    value={technicianId}
                    onValueChange={(val) => {
                      setTechnicianId(val);
                      // Mutually exclusive: clear pending pool when direct is chosen
                      if (val !== "none") setPendingTechnicianIds([]);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {technicians?.map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>{tech.name} ({tech.area})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Assigns the job directly to one technician.</p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-amber-500" />
                    First-to-Accept Pool
                    <span className="text-amber-600 font-normal text-xs">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-400 -mt-1">Select multiple techs — whoever accepts first gets assigned.</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {technicians?.map(tech => (
                      <div key={tech.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`pending-${tech.id}`}
                          checked={pendingTechnicianIds.includes(tech.id)}
                          onCheckedChange={() => {
                            // Mutually exclusive: clear direct assignment when pool is used
                            if (!pendingTechnicianIds.includes(tech.id)) setTechnicianId("none");
                            togglePendingTech(tech.id);
                          }}
                        />
                        <label htmlFor={`pending-${tech.id}`} className="text-sm cursor-pointer">
                          {tech.name} <span className="text-gray-400">({tech.area})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {pendingTechnicianIds.length > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      {pendingTechnicianIds.length} technician{pendingTechnicianIds.length > 1 ? "s" : ""} in pool — push notifications will be sent
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Admin Notes (Internal)</label>
                  <Textarea 
                    value={adminNotes} 
                    onChange={e => setAdminNotes(e.target.value)} 
                    placeholder="Internal notes, invisible to technicians..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button className="w-full mt-4" onClick={handleSave} disabled={updateComplaint.isPending}>
                  {updateComplaint.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>)}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

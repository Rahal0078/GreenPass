import { useState } from "react";
import { useLocation, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListComplaints,
  Complaint,
  ComplaintStatus,
  ComplaintUrgency,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, PauseCircle, FileText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOLD_PREVIEW = 1;

export default function Complaints() {
  const [, setLocation]     = useLocation();
  const [statusFilter,  setStatusFilter]  = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [holdExpanded,  setHoldExpanded]  = useState(false);

  const { data: rawComplaints, isLoading } = useListComplaints({
    status: statusFilter === "all" ? undefined : statusFilter,
    urgency: urgencyFilter === "all" ? undefined : urgencyFilter,
  });

  /* ── Sort: on_hold (oldest first) → active (newest first) → resolved (newest first) ── */
  function statusGroup(s: string) {
    if (s === "on_hold") return 0;
    if (["open","in_progress","going","reached"].includes(s)) return 1;
    return 2;
  }

  const sorted = rawComplaints ? [...rawComplaints].sort((a, b) => {
    const ga = statusGroup(a.status), gb = statusGroup(b.status);
    if (ga !== gb) return ga - gb;
    const ta = new Date(a.createdAt).getTime(), tb = new Date(b.createdAt).getTime();
    return ga === 0 ? ta - tb : tb - ta; // hold: oldest first; rest: newest first
  }) : [];

  /* Split on-hold from the rest */
  const holdRows   = sorted.filter(c => c.status === "on_hold");
  const otherRows  = sorted.filter(c => c.status !== "on_hold");

  /*
   * If the admin is already filtering by on_hold specifically, show all normally.
   * Only collapse when viewing all statuses (or a non-hold filter where hold rows shouldn't appear anyway).
   */
  const collapsible = holdRows.length > HOLD_PREVIEW && statusFilter === "all";
  const visibleHold = collapsible && !holdExpanded ? holdRows.slice(0, HOLD_PREVIEW) : holdRows;
  const hiddenCount = holdRows.length - HOLD_PREVIEW;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>;
      case "going":       return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">🚗 On the Way</Badge>;
      case "reached":     return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">📍 On-site</Badge>;
      case "on_hold":     return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">⏸ On Hold</Badge>;
      case "resolved":    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Resolved</Badge>;
      case "closed":      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
      default:            return <Badge variant="outline">{status}</Badge>;
    }
  };

  const ComplaintRow = ({ complaint }: { complaint: Complaint }) => (
    <TableRow
      key={complaint.id}
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
      onClick={() => setLocation(`/admin/complaints/${complaint.id}`)}
    >
      <TableCell className="font-mono text-xs">{complaint.ticketId}</TableCell>
      <TableCell className="text-sm">{format(new Date(complaint.createdAt), "MMM d, yy")}</TableCell>
      <TableCell className="font-medium">{complaint.customerName}</TableCell>
      <TableCell className="text-sm">{complaint.placeName}</TableCell>
      <TableCell className="text-sm truncate max-w-[150px]">{complaint.complaintType}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: complaint.urgencyColor || "#ccc" }} />
          <span className="text-sm capitalize">{complaint.urgency}</span>
        </div>
      </TableCell>
      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
    </TableRow>
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* Header + filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Complaints</h1>
            <p className="text-gray-500">Manage customer complaints and assign technicians.</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setLocation("/admin/customers")}
            >
              <UserRound className="h-4 w-4" />
              Customers
            </Button>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setHoldExpanded(false); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="going">🚗 On the Way</SelectItem>
                <SelectItem value="reached">📍 On-site</SelectItem>
                <SelectItem value="on_hold">⏸ On Hold</SelectItem>
                <SelectItem value="resolved">✅ Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Urgency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                      No complaints found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* ── ON HOLD section ── */}
                    {holdRows.length > 0 && (
                      <>
                        {collapsible && !holdExpanded ? (
                          /* ── COLLAPSED: single clickable pill row — rows hidden ── */
                          <TableRow
                            className="cursor-pointer bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 border-b-2 border-orange-200 dark:border-orange-800"
                            onClick={() => setHoldExpanded(true)}
                          >
                            <TableCell colSpan={7} className="py-3 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <PauseCircle className="h-4 w-4 text-orange-500 shrink-0" />
                                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                                    On Hold
                                  </span>
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">
                                    {holdRows.length}
                                  </span>
                                  <span className="text-xs text-orange-500 dark:text-orange-400">
                                    complaints waiting · click to view
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-orange-500 shrink-0" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          /* ── EXPANDED (or ≤3): show all rows + collapse button ── */
                          <>
                            {/* Section label */}
                            <TableRow className="bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900">
                              <TableCell colSpan={7} className="py-1.5 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400">
                                    <PauseCircle className="h-3.5 w-3.5 shrink-0" />
                                    On Hold — {holdRows.length} complaint{holdRows.length !== 1 ? "s" : ""} · oldest first
                                  </div>
                                  {collapsible && (
                                    <button
                                      onClick={() => setHoldExpanded(false)}
                                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium"
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" /> Collapse
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* All hold rows */}
                            {holdRows.map(c => <ComplaintRow key={c.id} complaint={c} />)}
                          </>
                        )}
                      </>
                    )}

                    {/* ── ACTIVE + RESOLVED rows ── */}
                    {otherRows.map(c => <ComplaintRow key={c.id} complaint={c} />)}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}

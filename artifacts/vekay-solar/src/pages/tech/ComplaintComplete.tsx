import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetComplaint,
  useCompleteComplaint,
  useUpdateComplaint,
  useAcceptComplaint,
  getGetComplaintQueryKey,
  getGetTechnicianMapQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TechLayout } from "@/components/layout/TechLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MapPin, Phone, FileText, CheckCircle2, Loader2,
  Navigation, ShieldCheck, AlertCircle, PauseCircle, Wrench, Clock,
  Car, Zap, UserCheck,
} from "lucide-react";
import { format } from "date-fns";

const HOLD_REASONS = [
  "Part ordered — awaiting delivery",
  "Inverter sent for replacement",
  "Panel sent for repair",
  "Waiting for customer availability",
  "Requires additional equipment",
  "Wiring replacement needed",
  "Other (describe below)",
];

export default function ComplaintComplete() {
  const params   = useParams();
  const id       = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const { user }        = useAuth();

  const [notes,       setNotes]       = useState("");
  const [holdMode,    setHoldMode]    = useState(false);
  const [holdReason,  setHoldReason]  = useState("");
  const [holdDetails, setHoldDetails] = useState("");

  const { data: complaint, isLoading } = useGetComplaint(id, {
    query: { enabled: !!id, queryKey: getGetComplaintQueryKey(id) },
  });

  const completeMutation = useCompleteComplaint();
  const updateMutation   = useUpdateComplaint();
  const acceptMutation   = useAcceptComplaint();

  /* ── helpers ── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetTechnicianMapQueryKey(user?.id || 0) });
    queryClient.invalidateQueries({ queryKey: getGetComplaintQueryKey(id) });
  };

  /* ── status flags ── */
  const status        = complaint?.status ?? "";
  const isResolved    = status === "resolved" || status === "closed";
  const isOnHold      = status === "on_hold";
  const isGoing       = status === "going";
  const isReached     = status === "reached";

  /* pending broadcast — this tech is in pendingTechnicianIds but not yet assigned */
  const pendingIds    = (complaint as any)?.pendingTechnicianIds as number[] | null | undefined;
  const isPendingForMe = Array.isArray(pendingIds)
    ? pendingIds.includes(user?.id ?? -1) && !complaint?.technicianId
    : false;

  /*
   * "Start Journey" shows when the tech needs to begin travelling:
   *   - status open  (admin directly assigned, job not yet started)
   *   - status in_progress (accepted via broadcast but journey not begun)
   * Both cases: not pending-for-me, not already going/reached/on_hold
   */
  const isReadyToStart = (status === "open" || status === "in_progress") && !isPendingForMe;

  /* ── actions ── */
  const handleAccept = () => {
    acceptMutation.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetComplaintQueryKey(id), data);
        invalidate();
        toast({ title: "Job Accepted!", description: "This complaint is now assigned to you." });
      },
      onError: (err: any) => {
        const msg = err?.response?.status === 409
          ? "Another technician already accepted this job."
          : err.message || "Failed to accept job.";
        toast({ title: "Could Not Accept", description: msg, variant: "destructive" });
      },
    });
  };

  const handleStartJourney = () => {
    updateMutation.mutate({ id, data: { status: "going" } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetComplaintQueryKey(id), data);
        invalidate();
        toast({ title: "Journey Started", description: "Customer has been notified you're on the way." });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update.", variant: "destructive" });
      },
    });
  };

  const handleArrived = () => {
    updateMutation.mutate({ id, data: { status: "reached" } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetComplaintQueryKey(id), data);
        invalidate();
        toast({ title: "Arrived!", description: "Customer notified. You can now complete or put on hold." });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update.", variant: "destructive" });
      },
    });
  };

  const handleComplete = () => {
    if (notes.trim().length < 10) {
      toast({
        title: "Notes Required",
        description: "Please describe the work done (min 10 characters).",
        variant: "destructive",
      });
      return;
    }
    completeMutation.mutate({ id, data: { completionNotes: notes } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetComplaintQueryKey(id), data);
        invalidate();
        toast({ title: "Job Completed ✓", description: "Complaint marked resolved. Customer emailed." });
        setLocation("/tech");
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to complete.", variant: "destructive" });
      },
    });
  };

  const handleOnHold = () => {
    if (!holdReason) {
      toast({ title: "Select a reason", description: "Please select the hold reason.", variant: "destructive" });
      return;
    }
    const combinedNote = holdDetails.trim()
      ? `${holdReason}\n\nDetails: ${holdDetails.trim()}`
      : holdReason;

    updateMutation.mutate({ id, data: { status: "on_hold", adminNotes: combinedNote } as any }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetComplaintQueryKey(id), data);
        invalidate();
        toast({ title: "Job put on hold", description: "Come back when ready to complete." });
        setLocation("/tech");
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update.", variant: "destructive" });
      },
    });
  };

  if (isLoading || !complaint) {
    return <TechLayout><div className="p-8 text-center">Loading details...</div></TechLayout>;
  }

  const gmapsUrl = complaint.lat && complaint.lng
    ? `https://maps.google.com/?q=${complaint.lat},${complaint.lng}`
    : `https://maps.google.com/search/?api=1&query=${encodeURIComponent(
        [complaint.address, complaint.placeName, "Kerala"].filter(Boolean).join(", ")
      )}`;

  return (
    <TechLayout>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">

        {/* ── Header ── */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-10 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setLocation("/tech")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{complaint.ticketId}</h1>
            <p className="text-xs text-gray-500">{complaint.customerName}</p>
          </div>
          <Badge
            variant="outline"
            className="capitalize bg-white"
            style={{ borderColor: complaint.urgencyColor || "#ccc", color: complaint.urgencyColor || "#ccc" }}
          >
            {complaint.urgency}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4 max-w-3xl mx-auto w-full">

          {/* ── Status banners ── */}
          {isResolved && (
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-400">Issue Resolved</h3>
                  <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                    Completed on {complaint.completedAt ? format(new Date(complaint.completedAt), "PPP p") : "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isOnHold && (
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900">
              <CardContent className="p-4 flex items-start gap-3">
                <PauseCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-orange-900 dark:text-orange-400">Job On Hold</h3>
                  {complaint.adminNotes && (
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1 whitespace-pre-wrap">{complaint.adminNotes}</p>
                  )}
                  <p className="text-xs text-orange-500 mt-2">Complete this job below once the issue is sorted.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isGoing && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">
              <Car className="h-4 w-4 shrink-0" />
              You are on the way to this customer
            </div>
          )}

          {/* ── Complaint details ── */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="font-bold text-lg">{complaint.complaintType}</h2>
                <span className="text-xs text-gray-500">{format(new Date(complaint.createdAt), "MMM d, p")}</span>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {complaint.description}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 grid gap-4">
                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact</p>
                    <a href={`tel:${complaint.customerPhone}`} className="font-medium text-primary block mt-0.5">
                      {complaint.customerPhone}
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="font-medium mt-0.5">{complaint.placeName}</p>
                    {complaint.address && <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.address}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.district} — {complaint.pincode}</p>

                    {(complaint as any).locationSource === "gps" ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1.5 rounded mt-2 w-fit font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        GPS verified — navigate to exact location
                      </div>
                    ) : (complaint as any).locationSource === "map" ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1.5 rounded mt-2 w-fit font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        Customer pinned on map — good accuracy
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded mt-2 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Approximate address — call customer before travelling
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="mt-3"
                      onClick={() => window.open(gmapsUrl, "_blank")}>
                      <Navigation className="h-4 w-4 mr-2" />
                      {(complaint as any).locationSource === "gps"
                        ? "Navigate to Exact Location"
                        : (complaint as any).locationSource === "map"
                        ? "Navigate to Pinned Location"
                        : "Get Approximate Directions"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════
              ACTION SECTION
          ═════════════════════════════════════════ */}
          {!isResolved && (
            <>

              {/* ── 1. PENDING BROADCAST — Accept Job ── */}
              {isPendingForMe && (
                <Card className="border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="p-5 space-y-4 text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <UserCheck className="h-7 w-7 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-300">Job Available — First to Accept!</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        This complaint has been broadcast to multiple technicians.
                        First one to accept gets assigned.
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-medium bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={handleAccept}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Accepting...</>
                        : <><UserCheck className="mr-2 h-5 w-5" /> Accept This Job</>}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ── 2. OPEN / IN_PROGRESS — Start Journey ── */}
              {isReadyToStart && (
                <Card className="border-blue-200 dark:border-blue-900">
                  <CardContent className="p-5 space-y-4 text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <Car className="h-7 w-7 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-lg">Ready to Go?</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tap when you start travelling to the customer's location.
                        An email will be sent to them.
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleStartJourney}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...</>
                        : <><Car className="mr-2 h-5 w-5" /> Start Journey — I'm On the Way</>}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ── 3. GOING — I've Arrived ── */}
              {isGoing && (
                <Card className="border-blue-200 dark:border-blue-900">
                  <CardContent className="p-5 space-y-4 text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Zap className="h-7 w-7 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-lg">On the Way</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tap when you arrive at the customer's location.
                        An email will be sent to them.
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleArrived}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...</>
                        : <><CheckCircle2 className="mr-2 h-5 w-5" /> I've Arrived at Site</>}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ── 4. REACHED / ON HOLD — Complete or Hold tabs ── */}
              {(isReached || isOnHold) && (
                <>
                  {/* Tab switcher */}
                  {!isOnHold && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHoldMode(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          !holdMode
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary"
                        }`}>
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Complete
                      </button>
                      <button
                        onClick={() => setHoldMode(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          holdMode
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-400"
                        }`}>
                        <PauseCircle className="h-4 w-4" />
                        Can't Resolve Now
                      </button>
                    </div>
                  )}

                  {/* Mark Complete */}
                  {!holdMode && (
                    <Card className="border-primary/20">
                      <CardContent className="p-5 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {isOnHold ? "Resume & Complete Job" : "Mark as Complete"}
                        </h3>
                        <div>
                          <label className="text-sm font-medium block mb-1.5">Completion Notes</label>
                          <Textarea
                            placeholder="Describe the work done, parts replaced, current status of the system..."
                            className="min-h-[120px] resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1.5">Min 10 characters. Customer receives a completion email.</p>
                        </div>
                        <Button
                          className="w-full h-12 text-base font-medium"
                          onClick={handleComplete}
                          disabled={completeMutation.isPending}
                        >
                          {completeMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Confirm Resolution
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Can't Resolve / On Hold */}
                  {(holdMode || isOnHold) && (
                    <Card className="border-orange-200 dark:border-orange-900">
                      <CardContent className="p-5 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-orange-500" />
                          Can't Resolve Now
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Select what's preventing resolution. The job stays assigned to you.
                        </p>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Reason</label>
                          <div className="grid gap-2">
                            {HOLD_REASONS.map((reason) => (
                              <button key={reason}
                                onClick={() => setHoldReason(reason)}
                                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                                  holdReason === reason
                                    ? "bg-orange-50 border-orange-400 text-orange-800 dark:bg-orange-950/40 dark:border-orange-600 dark:text-orange-300 font-medium"
                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300"
                                }`}>
                                {holdReason === reason && <span className="mr-1.5">✓</span>}
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-1.5">
                            Additional details <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <Textarea
                            placeholder="e.g. Sent inverter to service centre, expecting return in 3 days..."
                            className="min-h-[80px] resize-none"
                            value={holdDetails}
                            onChange={(e) => setHoldDetails(e.target.value)}
                          />
                        </div>

                        <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                          <Clock className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-orange-700 dark:text-orange-400">
                            Job stays assigned to you. Return here to complete it once resolved.
                          </p>
                        </div>

                        <Button
                          className="w-full h-12 text-base font-medium bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={handleOnHold}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Put Job On Hold
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Resolved notes ── */}
          {isResolved && complaint.completionNotes && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  Resolution Notes
                </h3>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  {complaint.completionNotes}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="h-8" />
        </div>
      </div>
    </TechLayout>
  );
}

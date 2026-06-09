import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useDeleteComplaint } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Mail, MapPin, Clock, CheckCircle2, AlertCircle, ShieldCheck, Navigation, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api-base";

interface CustomerComplaint {
  id: number;
  ticketId: string;
  complaintType: string;
  description: string;
  status: string;
  urgency: string;
  urgencyColor: string | null;
  placeName: string;
  district: string;
  address: string;
  lat: number | null;
  lng: number | null;
  locationSource: string | null;
  completionNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  technicianId: number | null;
}

interface CustomerData {
  phone: string;
  name: string;
  email: string;
  totalComplaints: number;
  complaints: CustomerComplaint[];
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function CustomerDetail() {
  const params = useParams<{ phone: string }>();
  const phone = decodeURIComponent(params.phone || "");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteComplaintTarget, setDeleteComplaintTarget] = useState<{ id: number; ticketId: string } | null>(null);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const [editContactMode, setEditContactMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  const deleteComplaint = useDeleteComplaint();

  const fetchCustomer = () => {
    if (!phone) return;
    fetch(`${API_BASE}/api/customers/${encodeURIComponent(phone)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setCustomer(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => { fetchCustomer(); }, [phone]);

  const handleDeleteComplaint = () => {
    if (!deleteComplaintTarget) return;
    deleteComplaint.mutate(
      { id: deleteComplaintTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Complaint deleted", description: `Ticket ${deleteComplaintTarget.ticketId} removed.` });
          setDeleteComplaintTarget(null);
          const updated = customer ? {
            ...customer,
            complaints: customer.complaints.filter(c => c.id !== deleteComplaintTarget.id),
            totalComplaints: customer.totalComplaints - 1,
          } : null;
          if (updated && updated.totalComplaints === 0) {
            setLocation("/admin/customers");
          } else {
            setCustomer(updated);
          }
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          setDeleteComplaintTarget(null);
        }
      }
    );
  };

  const handleStartEditContact = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditEmail(customer.email ?? "");
    setEditContactMode(true);
  };

  const handleSaveContact = async () => {
    if (!customer || !editName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setIsSavingContact(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(customer.phone)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() || undefined }),
      });
      if (res.ok) {
        setCustomer(prev => prev ? { ...prev, name: editName.trim(), email: editEmail.trim() } : prev);
        toast({ title: "Contact updated", description: "Name and email saved successfully." });
        setEditContactMode(false);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to save.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    setIsDeletingCustomer(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(customer.phone)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Customer deleted", description: `All records for ${customer.name} removed.` });
        setLocation("/admin/customers");
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to delete.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setIsDeletingCustomer(false);
      setDeleteCustomerOpen(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return <AdminLayout><div className="p-8 text-center text-gray-500">Customer not found.</div></AdminLayout>;
  }

  const openCount = customer.complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedCount = customer.complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
              {customer.totalComplaints > 1 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Returning Customer</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{customer.totalComplaints} complaint{customer.totalComplaints !== 1 ? 's' : ''} total</p>
          </div>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0"
            onClick={() => setDeleteCustomerOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Customer
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Contact Details</CardTitle>
                  {!editContactMode ? (
                    <Button variant="ghost" size="sm" onClick={handleStartEditContact} className="h-8 px-2 text-xs gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditContactMode(false)} disabled={isSavingContact} className="h-8 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" onClick={handleSaveContact} disabled={isSavingContact} className="h-8 px-3 gap-1">
                        {isSavingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editContactMode ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500">Full Name</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Customer name" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500">Email Address</label>
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="customer@email.com" />
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Phone (read-only)</p>
                        <p className="font-medium text-sm">{customer.phone}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                      <a href={`tel:${customer.phone}`} className="text-primary hover:underline font-medium">{customer.phone}</a>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <a href={`mailto:${customer.email}`} className="text-primary hover:underline text-sm break-all">{customer.email}</a>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total complaints</span>
                  <span className="font-semibold">{customer.totalComplaints}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Open / In progress</span>
                  <Badge variant="outline" className={openCount > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : ""}>{openCount}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Resolved</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{resolvedCount}</Badge>
                </div>
                <div className="pt-2 border-t text-xs text-gray-500">
                  <p>First contact: {format(new Date(customer.complaints[customer.complaints.length - 1].createdAt), 'PPP')}</p>
                  <p>Last contact: {format(new Date(customer.complaints[0].createdAt), 'PPP')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Complaint History</h2>
            <div className="relative space-y-0">
              {customer.complaints.map((c, idx) => (
                <div key={c.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 mt-4 shrink-0 ${
                      c.status === 'resolved' || c.status === 'closed'
                        ? 'bg-green-500 border-green-500'
                        : c.status === 'in_progress'
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-blue-500 border-blue-500'
                    }`} />
                    {idx < customer.complaints.length - 1 && (
                      <div className="w-0.5 bg-gray-200 flex-1 mt-1 mb-0 min-h-[24px]" />
                    )}
                  </div>

                  <Card className="flex-1 mb-4 hover:border-primary transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs text-gray-500">{c.ticketId}</span>
                          <h3 className="font-semibold text-sm mt-0.5">{c.complaintType}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[c.status] || ''}`}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteComplaintTarget({ id: c.id, ticketId: c.ticketId })}
                            title="Delete this complaint"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500"
                            onClick={() => setLocation(`/admin/complaints/${c.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{c.description}</p>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{c.address}, {c.placeName}, {c.district}</span>
                        {c.lat && c.lng && (
                          <a
                            href={`https://maps.google.com/?q=${c.lat},${c.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Navigation className="h-3 w-3" /> Map
                          </a>
                        )}
                      </div>

                      {c.locationSource === 'gps' ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded mb-2 w-fit">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          GPS verified location
                        </div>
                      ) : c.lat && c.lng ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mb-2 w-fit">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Approximate location — call before visiting
                        </div>
                      ) : null}

                      {c.completionNotes && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs text-green-700 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolved {c.completedAt ? format(new Date(c.completedAt), 'dd MMM yyyy') : ''}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{c.completionNotes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })} · {format(new Date(c.createdAt), 'dd MMM yyyy, p')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete single complaint */}
      <AlertDialog open={!!deleteComplaintTarget} onOpenChange={(open) => !open && setDeleteComplaintTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete complaint {deleteComplaintTarget?.ticketId}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this complaint record. The Google Sheet will be updated. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteComplaint}
              disabled={deleteComplaint.isPending}
            >
              {deleteComplaint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete entire customer */}
      <AlertDialog open={deleteCustomerOpen} onOpenChange={(open) => !open && !isDeletingCustomer && setDeleteCustomerOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{customer.name}</strong> and all {customer.totalComplaints} of their complaint records. The Google Sheet will be updated. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCustomer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
            >
              {isDeletingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Delete All Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

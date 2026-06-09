import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetTechnician, getGetTechnicianQueryKey, useUpdateTechnician, useDeleteTechnician } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Phone, MapPin, KeyRound, Loader2, Eye, EyeOff, Trash2, Pencil, Check, X, Briefcase, Mail } from "lucide-react";
import { format } from "date-fns";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const ROLE_OPTIONS = [
  { value: "technician", label: "Technician" },
  { value: "office_staff", label: "Office Staff" },
  { value: "field_staff", label: "Field Staff" },
  { value: "coordinator", label: "Work Coordinator" },
];

const ROLE_BADGE: Record<string, string> = {
  technician: "bg-blue-50 text-blue-700 border-blue-200",
  office_staff: "bg-violet-50 text-violet-700 border-violet-200",
  field_staff: "bg-amber-50 text-amber-700 border-amber-200",
  coordinator: "bg-green-50 text-green-700 border-green-200",
};

export default function StaffDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [rolesEditMode, setRolesEditMode] = useState(false);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [rolesSaving, setRolesSaving] = useState(false);

  const updateTech = useUpdateTechnician();
  const deleteTech = useDeleteTechnician();

  const { data: tech, isLoading } = useGetTechnician(id, {
    query: { enabled: !!id, queryKey: getGetTechnicianQueryKey(id) }
  });

  const currentRoles: string[] = (() => {
    try { return JSON.parse((tech as any)?.roles ?? "[]"); } catch { return (tech as any)?.roles ?? []; }
  })();

  const handleStartEdit = () => {
    if (!tech) return;
    setEditName(tech.name);
    setEditPhone(tech.phone ?? "");
    setEditArea(tech.area);
    setEditEmail((tech as any).email ?? "");
    setEditMode(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim() || !editPhone.trim() || !editArea.trim()) {
      toast({ title: "All fields required", description: "Name, phone and area cannot be empty.", variant: "destructive" });
      return;
    }
    updateTech.mutate(
      { id, data: { name: editName.trim(), phone: editPhone.trim(), area: editArea.trim(), email: editEmail.trim() } as any },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetTechnicianQueryKey(id), (old: any) => ({ ...old, ...updated }));
          queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
          queryClient.invalidateQueries({ queryKey: ["staff"] });
          toast({ title: "Profile updated", description: `${editName} saved.` });
          setEditMode(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleStartRolesEdit = () => {
    setEditRoles([...currentRoles]);
    setRolesEditMode(true);
  };

  const handleSaveRoles = async () => {
    setRolesSaving(true);
    try {
      const r = await fetch(`${BASE}/api/technicians/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: editRoles }),
      });
      if (!r.ok) throw new Error(await r.text());
      const updated = await r.json();
      queryClient.setQueryData(getGetTechnicianQueryKey(id), (old: any) => ({ ...old, ...updated, roles: JSON.stringify(editRoles) }));
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Capabilities updated ✓" });
      setRolesEditMode(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRolesSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    updateTech.mutate(
      { id, data: { password: newPassword } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTechnicianQueryKey(id) });
          toast({ title: "Password updated", description: `New password set for ${tech?.name}.` });
          setNewPassword("");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleToggleActive = () => {
    updateTech.mutate(
      { id, data: { isActive: !tech?.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTechnicianQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: ["staff"] });
          toast({ title: tech?.isActive ? "Staff member deactivated" : "Staff member activated" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteTech.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
          queryClient.invalidateQueries({ queryKey: ["staff"] });
          toast({ title: "Staff member removed", description: `${tech?.name} has been removed.` });
          setLocation("/admin/technicians");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="bg-blue-50 text-blue-700">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-amber-50 text-amber-700">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>;
      case "closed": return <Badge variant="outline" className="bg-gray-50 text-gray-700">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card><CardContent className="h-[200px]" /></Card>
        </div>
      </AdminLayout>
    );
  }

  if (!tech) {
    return <AdminLayout><div>Staff member not found.</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/technicians")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{tech.name}</h1>
          <Badge variant={tech.isActive ? "default" : "destructive"} className="ml-auto">
            {tech.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-4">

            {/* ── Profile Card ── */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Profile & Login</CardTitle>
                  {!editMode ? (
                    <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-8 px-2 text-xs gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} disabled={updateTech.isPending} className="h-8 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} disabled={updateTech.isPending} className="h-8 px-3 gap-1">
                        {updateTech.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Full Name
                      </Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Phone Number
                      </Label>
                      <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Primary Area
                      </Label>
                      <Input value={editArea} onChange={e => setEditArea(e.target.value)} placeholder="Service area" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email <span className="text-gray-400">(for quotation approvals)</span>
                      </Label>
                      <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="coordinator@example.com" />
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t">
                      <User className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Login Username (read-only)</p>
                        <code className="font-bold text-primary bg-primary/5 px-2 py-0.5 rounded text-sm">{tech.username}</code>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Full Name</p>
                        <p className="font-medium">{tech.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Login Username</p>
                        <code className="font-bold text-primary bg-primary/5 px-2 py-0.5 rounded text-sm">{tech.username}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Phone</p>
                        <a href={`tel:${tech.phone}`} className="font-medium text-primary hover:underline">{tech.phone}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Primary Area</p>
                        <p className="font-medium">{tech.area}</p>
                      </div>
                    </div>
                    {(tech as any).email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500">Email</p>
                          <a href={`mailto:${(tech as any).email}`} className="font-medium text-primary hover:underline text-sm">{(tech as any).email}</a>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="pt-3 border-t text-xs text-gray-500">
                  Joined {format(new Date(tech.createdAt), 'PPP')}
                </div>
              </CardContent>
            </Card>

            {/* ── Field of Work / Capabilities ── */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Field of Work
                  </CardTitle>
                  {!rolesEditMode ? (
                    <Button variant="ghost" size="sm" onClick={handleStartRolesEdit} className="h-8 px-2 text-xs gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setRolesEditMode(false)} disabled={rolesSaving} className="h-8 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" onClick={handleSaveRoles} disabled={rolesSaving} className="h-8 px-3 gap-1">
                        {rolesSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {rolesEditMode ? (
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={editRoles.includes(opt.value)}
                          onChange={() => toggleRole(opt.value)}
                          className="rounded border-gray-300 text-primary h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                    {editRoles.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-1">Select at least one capability.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {currentRoles.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No capabilities set</p>
                    ) : currentRoles.map(r => (
                      <Badge key={r} variant="outline" className={`text-xs ${ROLE_BADGE[r] ?? ""}`}>
                        {ROLE_OPTIONS.find(o => o.value === r)?.label ?? r}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Password Reset ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Reset Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={updateTech.isPending || newPassword.length === 0}
                >
                  {updateTech.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set New Password
                </Button>
              </CardContent>
            </Card>

            <Button
              variant={tech.isActive ? "destructive" : "default"}
              className="w-full"
              onClick={handleToggleActive}
              disabled={updateTech.isPending}
            >
              {tech.isActive ? "Deactivate Staff Member" : "Activate Staff Member"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Staff Member
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {tech.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <strong>{tech.name}</strong> from the system. Any complaints currently assigned to them will be unassigned. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDelete}
                    disabled={deleteTech.isPending}
                  >
                    {deleteTech.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Assigned Complaints ({tech.assignedComplaints?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tech.assignedComplaints && tech.assignedComplaints.length > 0 ? (
                    tech.assignedComplaints.map(complaint => (
                      <TableRow
                        key={complaint.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setLocation(`/admin/complaints/${complaint.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{complaint.ticketId}</TableCell>
                        <TableCell>
                          <p className="font-medium">{complaint.placeName}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{complaint.complaintType}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: complaint.urgencyColor || '#ccc' }} />
                            <span className="text-sm capitalize">{complaint.urgency}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No assigned complaints.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

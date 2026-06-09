import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, X } from "lucide-react";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiDelete<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

interface StaffMember {
  id: number;
  username: string;
  name: string;
  phone: string;
  area: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

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

const ROLE_LABEL: Record<string, string> = {
  technician: "Technician",
  office_staff: "Office Staff",
  field_staff: "Field Staff",
  coordinator: "Coordinator",
};

const BLANK_FORM = { name: "", username: "", password: "", phone: "", area: "", email: "" };

export default function Staff() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: () => apiGet("/api/technicians"),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof BLANK_FORM & { roles: string[] }) =>
      apiPost<StaffMember>("/api/technicians", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member created ✓" });
      setDialogOpen(false);
      setForm(BLANK_FORM);
      setSelectedRoles([]);
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete<unknown>(`/api/technicians/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member removed" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  function toggleRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  const canCreate =
    form.name.length >= 2 && form.username.length >= 3 &&
    form.password.length >= 6 && form.phone.length >= 10 && form.area.length >= 2;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Staff</h1>
            <p className="text-gray-500">Manage staff members, their field of work, and service areas.</p>
          </div>
          <Button onClick={() => { setDialogOpen(true); setForm(BLANK_FORM); setSelectedRoles([]); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Staff
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Field of Work</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading…</TableCell>
                  </TableRow>
                ) : staff.map(s => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setLocation(`/admin/technicians/${s.id}`)}
                  >
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.username}</code>
                    </TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.area}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.roles ?? []).length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Not set</span>
                        ) : (s.roles ?? []).map(r => (
                          <Badge key={r} variant="outline" className={`text-[10px] py-0 ${ROLE_BADGE[r] ?? ""}`}>
                            {ROLE_LABEL[r] ?? r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.isActive
                        ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ id: s.id, name: s.name }); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Staff Modal ───────────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add Staff Member</h2>
              <button onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {([
                ["Full Name", "name", "text"],
                ["Username (Login ID)", "username", "text"],
                ["Password", "password", "password"],
                ["Phone", "phone", "text"],
                ["Email", "email", "email"],
                ["Primary Area", "area", "text"],
              ] as [string, keyof typeof BLANK_FORM, string][]).map(([label, key, type]) => (
                <div key={key}>
                  <Label className="text-xs text-gray-500">{label}{key === "email" && <span className="text-gray-400 ml-1">(used for quotation approvals)</span>}</Label>
                  <Input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1 h-8 text-sm"
                    placeholder={key === "area" ? "e.g. Kochi South" : key === "email" ? "coordinator@example.com" : undefined}
                  />
                </div>
              ))}

              <div>
                <Label className="text-xs text-gray-500 block mb-2">Field of Work (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-gray-50">
                  {ROLE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(opt.value)}
                        onChange={() => toggleRole(opt.value)}
                        className="rounded border-gray-300 text-primary"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {selectedRoles.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Select at least one role for this staff member.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, roles: selectedRoles })}
              >
                {createMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : "Add Staff Member"
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from the system.
              Any complaints assigned to them will be unassigned. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

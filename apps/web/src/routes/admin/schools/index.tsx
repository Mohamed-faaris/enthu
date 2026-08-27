import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ search: z.string().optional() });

export const Route = createFileRoute("/admin/schools/")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.schools.adminList.queryOptions()),
  component: SchoolsPage,
});

type SchoolRow = { id: string; name: string; code: string; contactEmail: string | null; contactPhone: string | null; isActive: boolean };

function SchoolsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { search } = Route.useSearch();
  const qc = useQueryClient();
  const q = useQuery(trpc.schools.adminList.queryOptions());
  const rows = (q.data as unknown as SchoolRow[] | undefined) ?? [];

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s) || (r.contactEmail ?? "").toLowerCase().includes(s));
  }, [rows, search]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [form, setForm] = useState({ name: "", code: "", contactEmail: "", contactPhone: "", isActive: true });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", contactEmail: "", contactPhone: "", isActive: true });
    setOpen(true);
  };
  const openEdit = (row: SchoolRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code,
      contactEmail: row.contactEmail ?? "",
      contactPhone: row.contactPhone ?? "",
      isActive: row.isActive,
    });
    setOpen(true);
  };

  const upsert = useMutation(
    trpc.schools.upsert.mutationOptions({
      onSuccess: async () => {
        toast.success(editing ? "School updated" : "School created");
        setOpen(false);
        await qc.invalidateQueries({ queryKey: trpc.schools.adminList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.schools.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const del = useMutation(
    trpc.schools.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("School deleted");
        await qc.invalidateQueries({ queryKey: trpc.schools.adminList.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      id: editing?.id,
      data: {
        name: form.name.trim(),
        code: form.code.trim(),
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        isActive: form.isActive,
      },
    } as never);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Schools</h2>
          <p className="text-sm text-muted-foreground">Manage tenant schools — add or edit via dialog (filter via query param)</p>
        </div>
        <Button onClick={openAdd}>Add school</Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search name, code, email…"
          value={search ?? ""}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, search: e.target.value || undefined }), replace: true } as never)}
          className="max-w-sm"
        />
        {search && (
          <Button variant="outline" size="sm" onClick={() => navigate({ search: {}, replace: true } as never)}>
            Clear
          </Button>
        )}
      </div>
      {search && <p className="text-xs text-muted-foreground">Showing {filtered.length} of {rows.length} for "{search}"</p>}

      <DataTable
        data={filtered as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as SchoolRow).name },
          { header: "Code", cell: (r) => (r as unknown as SchoolRow).code },
          { header: "Email", cell: (r) => (r as unknown as SchoolRow).contactEmail ?? "—" },
          { header: "Phone", cell: (r) => (r as unknown as SchoolRow).contactPhone ?? "—" },
          { header: "Active", cell: (r) => ((r as unknown as SchoolRow).isActive ? "Yes" : "No") },
          {
            header: "Actions",
            cell: (r) => {
              const row = r as unknown as SchoolRow;
              return (
                <div className="flex gap-2">
                  <Link to="/admin/schools/$schoolId" params={{ schoolId: row.id }} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                  <button onClick={() => openEdit(row)} className="text-xs text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${row.name}?`)) del.mutate({ id: row.id } as never);
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              );
            },
          },
        ]}
        emptyMessage={q.isLoading ? "Loading…" : "No schools"}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit school" : "Add school"}</DialogTitle>
          <DialogDescription>{editing ? "Update school details" : "Create a new school"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={50} placeholder="e.g. SCH001" />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="optional" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="isActive" />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

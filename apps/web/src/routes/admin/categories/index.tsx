import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.categories.list.queryOptions()),
  component: CategoriesPage,
});

type CategoryRow = { id: string; name: string; minClass: number; maxClass: number };

function CategoriesPage() {
  const qc = useQueryClient();
  const q = useQuery(trpc.categories.list.queryOptions());
  const rows = (q.data as unknown as CategoryRow[] | undefined) ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ name: "", minClass: 1, maxClass: 12 });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", minClass: 1, maxClass: 12 });
    setOpen(true);
  };
  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setForm({ name: row.name, minClass: row.minClass, maxClass: row.maxClass });
    setOpen(true);
  };

  const upsert = useMutation(
    trpc.categories.upsert.mutationOptions({
      onSuccess: async () => {
        toast.success(editing ? "Category updated" : "Category created");
        setOpen(false);
        await qc.invalidateQueries({ queryKey: trpc.categories.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const del = useMutation(
    trpc.categories.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Category deleted");
        await qc.invalidateQueries({ queryKey: trpc.categories.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.minClass > form.maxClass) return toast.error("minClass cannot be greater than maxClass");
    upsert.mutate({
      id: editing?.id,
      data: { name: form.name.trim(), minClass: Number(form.minClass), maxClass: Number(form.maxClass) },
    } as never);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Categories</h2>
          <p className="text-sm text-muted-foreground">Class-range groupings (e.g. Sub-Junior 3–5). No gender on category.</p>
        </div>
        <Button onClick={openAdd}>Add category</Button>
      </div>

      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as CategoryRow).name },
          { header: "Range", cell: (r) => `${(r as unknown as CategoryRow).minClass}–${(r as unknown as CategoryRow).maxClass}` },
          {
            header: "Actions",
            cell: (r) => {
              const row = r as unknown as CategoryRow;
              return (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(row)} className="text-xs text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${row.name}? This may affect events.`)) del.mutate({ id: row.id } as never);
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
        emptyMessage={q.isLoading ? "Loading…" : "No categories"}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>{editing ? "Update class range" : "Create a new class-range category"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={150} placeholder="e.g. Sub-Junior" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Min class *</Label>
              <Input type="number" min={1} max={12} value={form.minClass} onChange={(e) => setForm({ ...form, minClass: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Max class *</Label>
              <Input type="number" min={1} max={12} value={form.maxClass} onChange={(e) => setForm({ ...form, maxClass: Number(e.target.value) })} required />
            </div>
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

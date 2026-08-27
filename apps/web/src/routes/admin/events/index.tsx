import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

const searchSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  gender: z.enum(["male", "female", "mixed"]).optional(),
  eventType: z.enum(["individual", "team"]).optional(),
  scoringType: z.enum(["points", "time_distance", "judged"]).optional(),
});

export const Route = createFileRoute("/admin/events/")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.events.list.queryOptions()),
  component: EventsPage,
});

type EventRow = {
  id: string;
  name: string;
  categoryId: string;
  gender: string;
  eventType: string;
  scoringType: string;
  category: { name: string } | null;
  teamMinMembers: number | null;
  teamMaxMembers: number | null;
  minTeamsPerSchool: number | null;
  maxTeamsPerSchool: number | null;
  lowerScoreWins: boolean;
  registrationClosesAt: string | null;
  registrationOpensAt: string | null;
};

function EventsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { search, categoryId: filterCategory, gender: filterGender, eventType: filterType, scoringType: filterScoring } = Route.useSearch();
  const qc = useQueryClient();
  const q = useQuery(trpc.events.list.queryOptions());
  const catsQ = useQuery(trpc.categories.list.queryOptions());
  const rows = (q.data as unknown as EventRow[] | undefined) ?? [];
  const categories = (catsQ.data as unknown as Array<{ id: string; name: string }> | undefined) ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && r.categoryId !== filterCategory) return false;
      if (filterGender && r.gender !== filterGender) return false;
      if (filterType && r.eventType !== filterType) return false;
      if (filterScoring && r.scoringType !== filterScoring) return false;
      return true;
    });
  }, [rows, search, filterCategory, filterGender, filterType, filterScoring]);

  const update = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch } as never), replace: true } as never);
  const set = (key: keyof z.infer<typeof searchSchema>, value: string | undefined) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, [key]: value || undefined }), replace: true } as never);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    gender: "mixed" as "male" | "female" | "mixed",
    eventType: "individual" as "individual" | "team",
    scoringType: "points" as "points" | "time_distance" | "judged",
    teamMinMembers: "",
    teamMaxMembers: "",
    minTeamsPerSchool: "",
    maxTeamsPerSchool: "",
    lowerScoreWins: false,
    registrationOpensAt: "",
    registrationClosesAt: "",
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      categoryId: categories[0]?.id ?? "",
      gender: "mixed",
      eventType: "individual",
      scoringType: "points",
      teamMinMembers: "",
      teamMaxMembers: "",
      minTeamsPerSchool: "",
      maxTeamsPerSchool: "",
      lowerScoreWins: false,
      registrationOpensAt: "",
      registrationClosesAt: "",
    });
    setOpen(true);
  };
  const openEdit = (row: EventRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      categoryId: row.categoryId,
      gender: row.gender as never,
      eventType: row.eventType as never,
      scoringType: row.scoringType as never,
      teamMinMembers: row.teamMinMembers?.toString() ?? "",
      teamMaxMembers: row.teamMaxMembers?.toString() ?? "",
      minTeamsPerSchool: row.minTeamsPerSchool?.toString() ?? "",
      maxTeamsPerSchool: row.maxTeamsPerSchool?.toString() ?? "",
      lowerScoreWins: !!row.lowerScoreWins,
      registrationOpensAt: row.registrationOpensAt ? new Date(row.registrationOpensAt).toISOString().slice(0, 16) : "",
      registrationClosesAt: row.registrationClosesAt ? new Date(row.registrationClosesAt).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  };

  const upsert = useMutation(
    trpc.events.upsert.mutationOptions({
      onSuccess: async () => {
        toast.success(editing ? "Event updated" : "Event created");
        setOpen(false);
        await qc.invalidateQueries({ queryKey: trpc.events.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const del = useMutation(
    trpc.events.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Event deleted");
        await qc.invalidateQueries({ queryKey: trpc.events.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) return toast.error("Category required");
    upsert.mutate({
      id: editing?.id,
      data: {
        name: form.name.trim(),
        categoryId: form.categoryId,
        gender: form.gender,
        eventType: form.eventType,
        scoringType: form.scoringType,
        teamMinMembers: form.teamMinMembers ? Number(form.teamMinMembers) : null,
        teamMaxMembers: form.teamMaxMembers ? Number(form.teamMaxMembers) : null,
        minTeamsPerSchool: form.minTeamsPerSchool ? Number(form.minTeamsPerSchool) : null,
        maxTeamsPerSchool: form.maxTeamsPerSchool ? Number(form.maxTeamsPerSchool) : null,
        lowerScoreWins: form.lowerScoreWins,
        registrationOpensAt: form.registrationOpensAt ? new Date(form.registrationOpensAt) : null,
        registrationClosesAt: form.registrationClosesAt ? new Date(form.registrationClosesAt) : null,
      },
    } as never);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Events</h2>
        <Button onClick={openAdd}>Add event</Button>
      </div>

      {/* Filters synced to query params */}
      <div className="grid gap-2 sm:grid-cols-5">
        <Input placeholder="Search event…" value={search ?? ""} onChange={(e) => set("search", e.target.value)} />
        <select value={filterCategory ?? ""} onChange={(e) => set("categoryId", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filterGender ?? ""} onChange={(e) => set("gender", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All genders</option>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="mixed">mixed</option>
        </select>
        <select value={filterType ?? ""} onChange={(e) => set("eventType", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All types</option>
          <option value="individual">individual</option>
          <option value="team">team</option>
        </select>
        <select value={filterScoring ?? ""} onChange={(e) => set("scoringType", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All scoring</option>
          <option value="points">points</option>
          <option value="time_distance">time_distance</option>
          <option value="judged">judged</option>
        </select>
      </div>
      {(search || filterCategory || filterGender || filterType || filterScoring) && (
        <Button variant="outline" size="sm" onClick={() => navigate({ search: {}, replace: true } as never)}>
          Clear filters
        </Button>
      )}

      <DataTable
        data={filtered as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Event", cell: (r) => (r as unknown as EventRow).name },
          { header: "Category", cell: (r) => (r as unknown as EventRow).category?.name ?? "—" },
          { header: "Gender", cell: (r) => (r as unknown as EventRow).gender },
          { header: "Type", cell: (r) => (r as unknown as EventRow).eventType },
          { header: "Scoring", cell: (r) => (r as unknown as EventRow).scoringType },
          {
            header: "Closes",
            cell: (r) => {
              const d = (r as unknown as EventRow).registrationClosesAt;
              return d ? new Date(d).toLocaleDateString() : "—";
            },
          },
          {
            header: "Actions",
            cell: (r) => {
              const row = r as unknown as EventRow;
              return (
                <div className="flex gap-2">
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
        emptyMessage={q.isLoading ? "Loading…" : "No events"}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription>{editing ? "Update event details" : "Create a new event — category defines class range"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-none border bg-background px-3 py-2 text-sm" required>
              <option value="">— select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Gender</Label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as never })} className="w-full rounded-none border bg-background px-2 py-2 text-sm">
                <option value="male">male</option>
                <option value="female">female</option>
                <option value="mixed">mixed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value as never })} className="w-full rounded-none border bg-background px-2 py-2 text-sm">
                <option value="individual">individual</option>
                <option value="team">team</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Scoring</Label>
              <select value={form.scoringType} onChange={(e) => setForm({ ...form, scoringType: e.target.value as never })} className="w-full rounded-none border bg-background px-2 py-2 text-sm">
                <option value="points">points</option>
                <option value="time_distance">time_distance</option>
                <option value="judged">judged</option>
              </select>
            </div>
          </div>
          {form.eventType === "team" && (
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label>Min members</Label>
                <Input type="number" min={1} value={form.teamMinMembers} onChange={(e) => setForm({ ...form, teamMinMembers: e.target.value })} placeholder="e.g. 4" />
              </div>
              <div className="space-y-2">
                <Label>Max members</Label>
                <Input type="number" min={1} value={form.teamMaxMembers} onChange={(e) => setForm({ ...form, teamMaxMembers: e.target.value })} placeholder="e.g. 6" />
              </div>
              <div className="space-y-2">
                <Label>Min teams/school</Label>
                <Input type="number" min={1} value={form.minTeamsPerSchool} onChange={(e) => setForm({ ...form, minTeamsPerSchool: e.target.value })} placeholder="e.g. 1" />
              </div>
              <div className="space-y-2">
                <Label>Max teams/school</Label>
                <Input type="number" min={1} value={form.maxTeamsPerSchool} onChange={(e) => setForm({ ...form, maxTeamsPerSchool: e.target.value })} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 py-1">
            <input type="checkbox" id="lowerScoreWins" checked={form.lowerScoreWins} onChange={(e) => setForm({ ...form, lowerScoreWins: e.target.checked })} />
            <Label htmlFor="lowerScoreWins">Lower score wins (e.g. time/distance)</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Registration opens at</Label>
              <Input type="datetime-local" value={form.registrationOpensAt} onChange={(e) => setForm({ ...form, registrationOpensAt: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Registration closes at</Label>
              <Input type="datetime-local" value={form.registrationClosesAt} onChange={(e) => setForm({ ...form, registrationClosesAt: e.target.value })} />
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

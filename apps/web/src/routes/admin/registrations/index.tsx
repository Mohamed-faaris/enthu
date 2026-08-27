import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { z } from "zod";

const searchSchema = z.object({
  search: z.string().optional(),
  schoolId: z.string().optional(),
  eventId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["pending", "confirmed", "rejected", "withdrawn"]).optional(),
  isAdminOverride: z.enum(["true", "false"]).optional(),
});

export const Route = createFileRoute("/admin/registrations/")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.registrations.adminList.queryOptions({})),
  component: AdminRegistrationsPage,
});

type RegRow = {
  id: string;
  schoolId: string;
  eventId: string;
  school: { name: string };
  event: { name: string; categoryId: string; category?: { name: string } };
  student: { id: string; firstName: string; lastName: string } | null;
  team: { id: string; name: string | null; members: Array<{ studentId: string; student?: { firstName: string; lastName: string } }> } | null;
  studentId: string | null;
  teamId: string | null;
  status: string;
  isAdminOverride: boolean;
  overrideReason: string | null;
  lastEditedBy: { name: string } | null;
  createdAt: string;
};

function AdminRegistrationsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const qc = useQueryClient();
  const schoolsQ = useQuery(trpc.schools.list.queryOptions());
  const eventsQ = useQuery(trpc.events.list.queryOptions());
  const catsQ = useQuery(trpc.categories.list.queryOptions());

  const filters = {
    ...(searchParams.schoolId ? { schoolId: searchParams.schoolId } : {}),
    ...(searchParams.eventId ? { eventId: searchParams.eventId } : {}),
    ...(searchParams.categoryId ? { categoryId: searchParams.categoryId } : {}),
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
    ...(searchParams.isAdminOverride ? { isAdminOverride: searchParams.isAdminOverride === "true" } : {}),
    ...(searchParams.search ? { search: searchParams.search } : {}),
  };

  const q = useQuery(trpc.registrations.adminList.queryOptions(filters as never));
  const items = (q.data as { items: Array<RegRow> } | undefined)?.items ?? [];
  const rows = Array.isArray(items) ? items : [];

  const schools = (schoolsQ.data as unknown as Array<{ id: string; name: string }> | undefined) ?? [];
  const events = (eventsQ.data as unknown as Array<{ id: string; name: string }> | undefined) ?? [];
  const categories = (catsQ.data as unknown as Array<{ id: string; name: string }> | undefined) ?? [];

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<RegRow | null>(null);

  const setParam = (key: keyof z.infer<typeof searchSchema>, value: string | undefined) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, [key]: value || undefined }), replace: true } as never);

  const hasFilters = !!(searchParams.search || searchParams.schoolId || searchParams.eventId || searchParams.categoryId || searchParams.status || searchParams.isAdminOverride);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Registrations — All details</h2>
          <p className="text-sm text-muted-foreground">Full view of every registration with filters (URL query params), edit, view and create</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>New registration</Button>
      </div>

      {/* Filters synced to query params */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Input placeholder="Search school/event/student…" value={searchParams.search ?? ""} onChange={(e) => setParam("search", e.target.value)} />
        <select value={searchParams.schoolId ?? ""} onChange={(e) => setParam("schoolId", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={searchParams.eventId ?? ""} onChange={(e) => setParam("eventId", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
        <select value={searchParams.categoryId ?? ""} onChange={(e) => setParam("categoryId", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={searchParams.status ?? ""} onChange={(e) => setParam("status", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="rejected">rejected</option>
          <option value="withdrawn">withdrawn</option>
        </select>
        <select value={searchParams.isAdminOverride ?? ""} onChange={(e) => setParam("isAdminOverride", e.target.value)} className="rounded-none border bg-background px-2 py-1.5 text-sm">
          <option value="">All overrides</option>
          <option value="true">override only</option>
          <option value="false">no override</option>
        </select>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => navigate({ search: {}, replace: true } as never)}>
          Clear filters
        </Button>
      )}

      <DataTable
        data={rows as Array<RegRow & { id: string } & Record<string, unknown>> as never}
        columns={[
          { header: "School", cell: (r) => (r as unknown as RegRow).school?.name ?? "—" },
          { header: "Event", cell: (r) => (r as unknown as RegRow).event?.name ?? "" },
          {
            header: "Entrant",
            cell: (r) => {
              const row = r as unknown as RegRow;
              return row.student
                ? `${row.student.firstName} ${row.student.lastName}`
                : row.team
                  ? `${row.team.name ?? "Team"} (${row.team.members.length} members)`
                  : "—";
            },
          },
          { header: "Status", cell: (r) => <span className="capitalize">{(r as unknown as RegRow).status}</span> },
          {
            header: "Override",
            cell: (r) =>
              (r as unknown as RegRow).isAdminOverride ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">override</span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              ),
          },
          { header: "Last edited by", cell: (r) => (r as unknown as RegRow).lastEditedBy?.name ?? "—" },
          {
            header: "Actions",
            cell: (r) => {
              const row = r as unknown as RegRow;
              return (
                <div className="flex gap-2">
                  <Link to="/admin/registrations/$registrationId" params={{ registrationId: row.id }} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                  <button onClick={() => setEditing(row)} className="text-xs text-primary hover:underline">
                    Edit
                  </button>
                </div>
              );
            },
          },
        ]}
        emptyMessage={q.isLoading ? "Loading…" : "No registrations"}
      />

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogHeader>
          <DialogTitle>New registration</DialogTitle>
          <DialogDescription>Create a registration on behalf of any school (deadline override handled automatically)</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <RegistrationForm isAdminContext />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setOpenNew(false)}>Close</Button>
        </div>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <>
            <DialogHeader>
              <DialogTitle>Edit registration</DialogTitle>
              <DialogDescription>Update {editing.event.name} — {editing.school.name}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <RegistrationForm
                isAdminContext
                initialData={{
                  id: editing.id,
                  schoolId: editing.schoolId,
                  eventId: editing.eventId,
                  studentId: editing.studentId,
                  teamId: editing.teamId,
                  teamMemberIds: editing.team?.members.map((m) => m.studentId) ?? [],
                  teamName: editing.team?.name ?? null,
                  status: editing.status,
                  overrideReason: editing.overrideReason,
                }}
              />
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

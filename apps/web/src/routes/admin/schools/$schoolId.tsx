import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Card, CardHeader, CardTitle, CardContent } from "@enthu/ui/components/card";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RegistrationForm } from "@/components/registration/RegistrationForm";

export const Route = createFileRoute("/admin/schools/$schoolId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(trpc.schools.getById.queryOptions({ id: params.schoolId }));
    await context.queryClient.ensureQueryData(trpc.events.list.queryOptions());
    await context.queryClient.ensureQueryData(trpc.registrations.adminList.queryOptions({ schoolId: params.schoolId } as never));
  },
  component: SchoolDetailPage,
});

function SchoolDetailPage() {
  const { schoolId } = Route.useParams();
  const qc = useQueryClient();
  const schoolQ = useQuery(trpc.schools.getById.queryOptions({ id: schoolId }));
  const eventsQ = useQuery(trpc.events.list.queryOptions());
  const regsQ = useQuery(trpc.registrations.adminList.queryOptions({ schoolId } as never));

  const school = schoolQ.data as { id: string; name: string; code: string; contactEmail: string | null; contactPhone: string | null; isActive: boolean; createdAt: string } | undefined;
  const regs = (regsQ.data as { items: Array<any> } | undefined)?.items ?? [];
  const events = (eventsQ.data as unknown as Array<{ id: string; name: string; category: { name: string }; gender: string; eventType: string; scoringType: string }> | undefined) ?? [];

  const [search, setSearch] = useState("");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const filteredEvents = events.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()));
  const getRegsForEvent = (eventId: string) => regs.filter((r: any) => r.eventId === eventId);

  if (schoolQ.isLoading) return <p className="text-sm">Loading school…</p>;
  if (!school) return <p className="text-sm text-red-600">School not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">{school.name}</h2>
          <p className="text-sm text-muted-foreground">Code: {school.code} • {school.isActive ? "Active" : "Inactive"} • School fixed (cannot change)</p>
        </div>
        <Link to="/admin/schools">
          <Button variant="outline" size="sm">Back to schools</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Name:</span> {school.name}</div>
          <div><span className="text-muted-foreground">Code:</span> {school.code}</div>
          <div><span className="text-muted-foreground">Email:</span> {school.contactEmail ?? "—"}</div>
          <div><span className="text-muted-foreground">Phone:</span> {school.contactPhone ?? "—"}</div>
          <div><span className="text-muted-foreground">Active:</span> {school.isActive ? "Yes" : "No"}</div>
          <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{school.id}</span></div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-base font-medium">Registrations by event — school locked ({regs.length} total)</h3>
        <p className="text-xs text-muted-foreground">Same interface as global registrations, per-event tables with separate + buttons. School cannot be changed.</p>
      </div>

      <Input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {eventsQ.isLoading ? (
        <p className="text-sm">Loading events…</p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events</p>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((ev) => {
            const rows = getRegsForEvent(ev.id);
            return (
              <Card key={ev.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{ev.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{ev.category?.name} • {ev.gender} • {ev.eventType} • {ev.scoringType}</p>
                  </div>
                  <Button size="sm" onClick={() => setActiveEventId(ev.id)}>+ Add</Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataTable
                    data={rows as Array<{ id: string } & Record<string, unknown>>}
                    columns={[
                      {
                        header: "Entrant",
                        cell: (r: any) => r.student ? r.student.name : r.team ? `${r.team.name ?? "Team"} (${r.team.members?.length ?? 0})` : "—",
                      },
                      { header: "Created", cell: (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—" },
                      {
                        header: "Actions",
                        cell: (r: any) => (
                          <div className="flex gap-2">
                            <Link to="/admin/registrations/$registrationId" params={{ registrationId: r.id }} className="text-xs text-primary hover:underline">View</Link>
                            <button onClick={() => setEditing(r)} className="text-xs text-primary hover:underline">Edit</button>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage="No registrations yet — click + to add"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New per event */}
      <Dialog open={!!activeEventId} onOpenChange={(o) => !o && setActiveEventId(null)}>
        {activeEventId && (
          <>
            <DialogHeader>
              <DialogTitle>New registration — {events.find((e) => e.id === activeEventId)?.name} — {school.name}</DialogTitle>
              <DialogDescription>School fixed to {school.name}, event fixed, student/team auto-created inline</DialogDescription>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <RegistrationForm isAdminContext fixedSchoolId={schoolId} fixedEventId={activeEventId} />
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={async () => { await qc.invalidateQueries({ queryKey: trpc.registrations.adminList.queryKey({ schoolId } as never) }); setActiveEventId(null); }}>Close</Button>
            </div>
          </>
        )}
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <>
            <DialogHeader>
              <DialogTitle>Edit registration</DialogTitle>
              <DialogDescription>{editing.event?.name ?? ""} — {school.name} (school locked)</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <RegistrationForm
                isAdminContext
                fixedSchoolId={schoolId}
                fixedEventId={editing.eventId}
                initialData={{
                  id: editing.id,
                  schoolId: editing.schoolId,
                  eventId: editing.eventId,
                  studentId: editing.studentId,
                  teamId: editing.teamId,
                  teamMemberIds: editing.team?.members?.map((m: any) => m.studentId) ?? [],
                  teamName: editing.team?.name ?? null,
                  status: "confirmed",
                  overrideReason: null,
                }}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={async () => { await qc.invalidateQueries({ queryKey: trpc.registrations.adminList.queryKey({ schoolId } as never) }); setEditing(null); }}>Close</Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

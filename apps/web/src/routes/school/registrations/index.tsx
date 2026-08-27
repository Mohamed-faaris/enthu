import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Card, CardHeader, CardTitle, CardContent } from "@enthu/ui/components/card";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/school/registrations/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.registrations.schoolList.queryOptions()),
  component: SchoolRegistrationsPage,
});

function SchoolRegistrationsPage() {
  const session = authClient.useSession();
  const schoolId = (session.data?.user as unknown as { schoolId?: string } | undefined)?.schoolId ?? "";
  const qc = useQueryClient();
  const eventsQ = useQuery(trpc.events.list.queryOptions());
  const regsQ = useQuery(trpc.registrations.schoolList.queryOptions());

  const events = (eventsQ.data as unknown as Array<{ id: string; name: string; category: { name: string }; gender: string; eventType: string; scoringType: string }> | undefined) ?? [];
  const regs = (regsQ.data as unknown as Array<any> | undefined) ?? [];

  const [search, setSearch] = useState("");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()));
  const getRegsForEvent = (eventId: string) => regs.filter((r: any) => r.eventId === eventId || r.event?.id === eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">My registrations — by event</h2>
        <p className="text-sm text-muted-foreground">All events with empty table + to add. School fixed, student/team auto-created inline. Always confirmed.</p>
      </div>

      <Input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {eventsQ.isLoading ? (
        <p className="text-sm">Loading events…</p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found</p>
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
                    ]}
                    emptyMessage="No registrations yet — click + to add"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeEventId} onOpenChange={(o) => !o && setActiveEventId(null)}>
        {activeEventId && (
          <>
            <DialogHeader>
              <DialogTitle>New registration — {events.find((e) => e.id === activeEventId)?.name}</DialogTitle>
              <DialogDescription>School fixed, add student inline. Team auto-created inline.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <RegistrationForm isAdminContext={false} fixedSchoolId={schoolId} fixedEventId={activeEventId} />
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={async () => { await qc.invalidateQueries({ queryKey: trpc.registrations.schoolList.queryKey() }); setActiveEventId(null); }}>Close</Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

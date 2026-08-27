import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@enthu/ui/components/card";
import { Button } from "@enthu/ui/components/button";

export const Route = createFileRoute("/admin/registrations/$registrationId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(trpc.registrations.adminGet.queryOptions({ id: params.registrationId })),
  component: RegistrationDetailsPage,
});

function RegistrationDetailsPage() {
  const { registrationId } = Route.useParams();
  const q = useQuery(trpc.registrations.adminGet.queryOptions({ id: registrationId }));
  const data = q.data as
    | {
        id: string;
        schoolId: string;
        eventId: string;
        school: { name: string; code: string };
        event: { name: string; gender: string; eventType: string; scoringType: string; category: { name: string; minClass: number; maxClass: number } };
        student: { firstName: string; lastName: string; gender: string; studyingClass: number; bibId: string | null } | null;
        team: { name: string | null; members: Array<{ student: { firstName: string; lastName: string; gender: string; studyingClass: number } }> } | null;
        status: string;
        isAdminOverride: boolean;
        overrideReason: string | null;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;

  if (q.isLoading) return <p className="text-sm">Loading…</p>;
  if (!data) return <p className="text-sm text-red-600">Not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Registration details</h2>
        <Link to="/admin/registrations">
          <Button variant="outline" size="sm">Back to all</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>School & Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">School:</span> {data.school.name} ({data.school.code})</div>
            <div><span className="text-muted-foreground">Event:</span> {data.event.name}</div>
            <div><span className="text-muted-foreground">Category:</span> {data.event.category.name} ({data.event.category.minClass}–{data.event.category.maxClass})</div>
            <div><span className="text-muted-foreground">Gender / Type / Scoring:</span> {data.event.gender} / {data.event.eventType} / {data.event.scoringType}</div>
            <div><span className="text-muted-foreground">Registration ID:</span> <span className="font-mono text-xs">{data.id}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <span className="capitalize font-medium">{data.status}</span></div>
            <div><span className="text-muted-foreground">Override:</span> {data.isAdminOverride ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">yes — deadline overridden</span> : "no"}</div>
            {data.overrideReason && <div><span className="text-muted-foreground">Reason:</span> {data.overrideReason}</div>}
            <div><span className="text-muted-foreground">Created:</span> {new Date(data.createdAt).toLocaleString()}</div>
            <div><span className="text-muted-foreground">Updated:</span> {new Date(data.updatedAt).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrant</CardTitle>
        </CardHeader>
        <CardContent>
          {data.student ? (
            <div className="text-sm">
              <div><span className="text-muted-foreground">Student:</span> {data.student.firstName} {data.student.lastName} ({data.student.gender}, class {data.student.studyingClass})</div>
              {data.student.bibId && <div><span className="text-muted-foreground">BIB:</span> {data.student.bibId}</div>}
            </div>
          ) : data.team ? (
            <div className="space-y-2">
              <div className="text-sm"><span className="text-muted-foreground">Team:</span> {data.team.name ?? "Unnamed team"} — {data.team.members.length} members</div>
              <ul className="list-disc pl-5 text-sm">
                {data.team.members.map((m, i) => (
                  <li key={i}>{m.student.firstName} {m.student.lastName} ({m.student.gender}, class {m.student.studyingClass})</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No entrant data</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link to="/admin/registrations/$registrationId/edit" params={{ registrationId: data.id }}>
          <Button variant="outline">Edit this registration</Button>
        </Link>
        <Link to="/admin/registrations">
          <Button>Back to list</Button>
        </Link>
      </div>
    </div>
  );
}

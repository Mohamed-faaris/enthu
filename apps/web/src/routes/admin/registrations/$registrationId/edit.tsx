import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { RegistrationForm } from "@/components/registration/RegistrationForm";

export const Route = createFileRoute("/admin/registrations/$registrationId/edit")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(trpc.registrations.adminGet.queryOptions({ id: params.registrationId })),
  component: EditPage,
});

function EditPage() {
  const { registrationId } = Route.useParams();
  const q = useQuery(trpc.registrations.adminGet.queryOptions({ id: registrationId }));
  const data = q.data as
    | {
        id: string;
        schoolId: string;
        eventId: string;
        studentId: string | null;
        teamId: string | null;
        team: { name: string | null; members: Array<{ studentId: string }> } | null;
        status: string;
        overrideReason: string | null;
      }
    | undefined;

  if (q.isLoading) return <p className="text-sm">Loading…</p>;
  if (!data) return <p className="text-sm text-red-600">Not found</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-medium">Edit registration</h2>
      <RegistrationForm
        isAdminContext
        initialData={{
          id: data.id,
          schoolId: data.schoolId,
          eventId: data.eventId,
          studentId: data.studentId,
          teamId: data.teamId,
          teamMemberIds: data.team?.members.map((m) => m.studentId) ?? [],
          teamName: data.team?.name ?? undefined,
          status: data.status,
          overrideReason: data.overrideReason,
        }}
      />
    </div>
  );
}

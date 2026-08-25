import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/admin/registrations/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.registrations.adminList.queryOptions({})),
  component: AdminRegistrationsPage,
});

function AdminRegistrationsPage() {
  const q = useQuery(trpc.registrations.adminList.queryOptions({}));

  const items = (q.data as { items: Array<Record<string, unknown>>; total: number } | undefined)?.items ?? (q.data as unknown as Array<Record<string, unknown>>) ?? [];

  // Normalize to array
  const rows = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">All registrations</h2>
        <Link to="/admin/registrations/new" className="inline-flex h-8 items-center rounded-none bg-primary px-3 text-sm font-medium text-primary-foreground">
          New registration
        </Link>
      </div>

      <DataTable
        data={
          rows as Array<{
            id: string;
            school: { name: string };
            event: { name: string };
            student: { firstName: string; lastName: string } | null;
            team: { name: string | null; members: unknown[] } | null;
            status: string;
            isAdminOverride: boolean;
            lastEditedBy: { name: string } | null;
          }>
        }
        columns={[
          { header: "School", cell: (r) => r.school?.name ?? r.id },
          { header: "Event", cell: (r) => r.event?.name ?? "" },
          {
            header: "Entrant",
            cell: (r) =>
              r.student
                ? `${r.student.firstName} ${r.student.lastName}`
                : r.team
                  ? `${r.team.name ?? "Team"} (${(r.team.members as unknown[]).length} members)`
                  : "—",
          },
          { header: "Status", cell: (r) => <span className="capitalize">{r.status}</span> },
          {
            header: "Override",
            cell: (r) =>
              r.isAdminOverride ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">override</span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              ),
          },
          { header: "Last edited by", cell: (r) => r.lastEditedBy?.name ?? "—" },
          {
            header: "Actions",
            cell: (r) => (
              <div className="flex gap-2">
                <Link to="/admin/registrations/$registrationId/edit" params={{ registrationId: r.id }} className="text-primary hover:underline text-xs">
                  Edit
                </Link>
                <span className="text-muted-foreground text-xs" title={r.id}>
                  History
                </span>
              </div>
            ),
          },
        ]}
        emptyMessage={q.isLoading ? "Loading…" : "No registrations"}
      />
    </div>
  );
}

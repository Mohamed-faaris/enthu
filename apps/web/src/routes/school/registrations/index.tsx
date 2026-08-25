import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/school/registrations/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.registrations.schoolList.queryOptions()),
  component: SchoolRegistrationsPage,
});

function SchoolRegistrationsPage() {
  const q = useQuery(trpc.registrations.schoolList.queryOptions());
  const rows = (q.data as unknown as Array<{
    id: string;
    event: { name: string };
    student: { firstName: string; lastName: string } | null;
    team: { name: string | null; members: unknown[] } | null;
    status: string;
  }>) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">My registrations</h2>
        <Link to="/school/registrations/new" className="inline-flex h-8 items-center bg-primary px-3 text-sm text-primary-foreground">
          New
        </Link>
      </div>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Event", cell: (r: unknown) => (r as { event: { name: string } }).event.name },
          {
            header: "Entrant",
            cell: (r: unknown) => {
              const row = r as { student: { firstName: string; lastName: string } | null; team: { name: string | null } | null };
              return row.student ? `${row.student.firstName} ${row.student.lastName}` : row.team?.name ?? "Team";
            },
          },
          { header: "Status", cell: (r: unknown) => (r as { status: string }).status },
        ]}
        emptyMessage={q.isLoading ? "Loading…" : "No registrations"}
      />
    </div>
  );
}

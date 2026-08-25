import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/school/teams/")({
  component: TeamsPage,
});

function TeamsPage() {
  const session = authClient.useSession();
  const schoolId = (session.data?.user as unknown as { schoolId?: string } | undefined)?.schoolId;
  const q = useQuery({ ...trpc.teams.listBySchool.queryOptions({ schoolId: schoolId ?? "" }), enabled: !!schoolId });
  const rows = (q.data as unknown as Array<{ id: string; name: string | null; event: { name: string }; members: Array<{ student: { firstName: string } }> }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Teams</h2>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Team", cell: (r) => (r as unknown as { name: string | null }).name ?? "—" },
          { header: "Event", cell: (r) => (r as unknown as { event: { name: string } }).event?.name ?? "" },
          { header: "Members", cell: (r) => String((r as unknown as { members: unknown[] }).members.length) },
        ]}
      />
    </div>
  );
}

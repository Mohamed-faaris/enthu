import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/coordinator/events/$eventId/scoreboard")({
  component: ScoreboardPage,
});

function ScoreboardPage() {
  const { eventId } = Route.useParams();
  const q = useQuery(trpc.results.scoreboard.queryOptions({ eventId }));
  const rows = (q.data as unknown as Array<{ registration: { id: string; student: unknown }; result: { rawValue: string | null; isDisqualified: boolean } | null }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Scoreboard</h2>
      <DataTable
        data={rows.map((x) => ({ id: x.registration.id, ...x })) as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Registration", cell: (r) => (r as unknown as { registration: { id: string } }).registration.id.slice(0, 8) },
          { header: "Raw", cell: (r) => (r as unknown as { result: { rawValue: string | null } | null }).result?.rawValue ?? "—" },
          { header: "DQ", cell: (r) => ((r as unknown as { result: { isDisqualified: boolean } | null }).result?.isDisqualified ? "Yes" : "No") },
        ]}
      />
    </div>
  );
}

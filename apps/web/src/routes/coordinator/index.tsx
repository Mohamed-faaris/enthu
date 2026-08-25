import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/coordinator/")({
  component: CoordinatorPage,
});

function CoordinatorPage() {
  const q = useQuery(trpc.events.list.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">My Events</h2>
      <p className="text-sm text-muted-foreground">View & edit points/results only for assigned events.</p>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[{ header: "Event", cell: (r) => (r as unknown as { name: string }).name }]}
      />
    </div>
  );
}

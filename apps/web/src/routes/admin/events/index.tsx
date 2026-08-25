import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/admin/events/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.events.list.queryOptions()),
  component: EventsPage,
});

function EventsPage() {
  const q = useQuery(trpc.events.list.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string; gender: string; eventType: string; scoringType: string; category: { name: string } }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Events</h2>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Event", cell: (r) => (r as unknown as { name: string }).name },
          { header: "Category", cell: (r) => (r as unknown as { category: { name: string } }).category?.name ?? "—" },
          { header: "Gender", cell: (r) => (r as unknown as { gender: string }).gender },
          { header: "Type", cell: (r) => (r as unknown as { eventType: string }).eventType },
          { header: "Scoring", cell: (r) => (r as unknown as { scoringType: string }).scoringType },
        ]}
      />
    </div>
  );
}

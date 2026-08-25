import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { EventCard } from "@/components/events/EventCard";

export const Route = createFileRoute("/school/events/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.events.list.queryOptions()),
  component: EventsPage,
});

function EventsPage() {
  const q = useQuery(trpc.events.list.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string; gender: string; eventType: string; category: { name: string } }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Events</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map((e) => (
          <EventCard key={e.id} name={e.name} category={e.category?.name ?? ""} gender={e.gender} eventType={e.eventType} />
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/announcer/")({
  component: AnnouncerPage,
});

function AnnouncerPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Announcer (read-only global results)</h2>
      <p className="text-sm text-muted-foreground">Views all points/results across every event — no editing.</p>
    </div>
  );
}

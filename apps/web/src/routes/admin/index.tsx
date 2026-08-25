import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Dashboard</h2>
      <p className="text-sm text-muted-foreground">Manage schools, categories, events, and registrations.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/registrations" className="rounded-lg border p-4 hover:bg-muted">
          <h3 className="font-medium">Registrations</h3>
          <p className="text-sm text-muted-foreground">Create/edit any school&apos;s registrations (deadline override)</p>
        </Link>
      </div>
    </div>
  );
}

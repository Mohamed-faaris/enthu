import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Dashboard</h2>
      <p className="text-sm text-muted-foreground">Manage schools, events, categories and registrations. Schools/events/categories use dialogs for add/edit with URL-synced filters. Registrations has a full details page.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/schools" className="rounded-none border p-4 hover:bg-muted">
          <h3 className="font-medium">Schools</h3>
          <p className="text-sm text-muted-foreground">Add / edit in dialog</p>
        </Link>
        <Link to="/admin/events" className="rounded-none border p-4 hover:bg-muted">
          <h3 className="font-medium">Events</h3>
          <p className="text-sm text-muted-foreground">Table with filters, add/edit in dialog</p>
        </Link>
        <Link to="/admin/categories" className="rounded-none border p-4 hover:bg-muted">
          <h3 className="font-medium">Categories</h3>
          <p className="text-sm text-muted-foreground">Manage class ranges — query-param filters</p>
        </Link>
        <Link to="/admin/registrations" className="rounded-none border p-4 hover:bg-muted">
          <h3 className="font-medium">Registrations</h3>
          <p className="text-sm text-muted-foreground">Full details page + new & edit dialogs</p>
        </Link>
      </div>
    </div>
  );
}

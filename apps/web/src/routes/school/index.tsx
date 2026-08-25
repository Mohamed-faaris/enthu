import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/school/")({
  component: SchoolDashboard,
});

function SchoolDashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">School dashboard</h2>
      <Link to="/school/registrations" className="rounded-lg border p-4 block hover:bg-muted">
        My registrations
      </Link>
    </div>
  );
}

import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const role = (session?.data?.user as unknown as { role?: string } | undefined)?.role;
    if (session?.data?.user && role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <nav className="flex gap-4 text-sm border-b pb-2 flex-wrap">
        <Link to="/admin" className="hover:underline">
          Dashboard
        </Link>
        <Link to="/admin/schools" className="hover:underline">
          Schools
        </Link>
        <Link to="/admin/events" className="hover:underline">
          Events
        </Link>
        <Link to="/admin/categories" className="hover:underline">
          Categories
        </Link>
        <Link to="/admin/registrations" className="hover:underline font-medium">
          Registrations
        </Link>
        <Link to="/admin/create-user" className="hover:underline">
          Users
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}

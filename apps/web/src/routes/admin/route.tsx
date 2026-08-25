import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const role = (session?.data?.user as unknown as { role?: string } | undefined)?.role;
    // Allow in dev without session for now; enforce only if session exists and role mismatched
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
      <nav className="flex gap-4 text-sm border-b pb-2">
        <a href="/admin" className="hover:underline">
          Dashboard
        </a>
        <a href="/admin/registrations" className="hover:underline font-medium">
          Registrations
        </a>
        <a href="/admin/schools" className="hover:underline">
          Schools
        </a>
        <a href="/admin/events" className="hover:underline">
          Events
        </a>
      </nav>
      <Outlet />
    </div>
  );
}

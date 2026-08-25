import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/coordinator")({
  beforeLoad: async () => {
    const s = await authClient.getSession();
    const role = (s?.data?.user as unknown as { role?: string } | undefined)?.role;
    if (s?.data?.user && role !== "event_coordinator" && role !== "admin") throw redirect({ to: "/login" });
  },
  component: () => (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Coordinator</h1>
      <Outlet />
    </div>
  ),
});

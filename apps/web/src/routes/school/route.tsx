import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/school")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const role = (session?.data?.user as unknown as { role?: string } | undefined)?.role;
    if (session?.data?.user && role !== "school_spoc" && role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: SchoolLayout,
});

function SchoolLayout() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">School</h1>
      <Outlet />
    </div>
  );
}

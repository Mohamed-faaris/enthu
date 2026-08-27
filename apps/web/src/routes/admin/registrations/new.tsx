import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/registrations/new")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/registrations" });
  },
});

import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1 className="text-center text-sm text-muted-foreground mb-2">Admin Login</h1>
      <SignInForm />
    </div>
  );
}

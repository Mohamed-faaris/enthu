import { createFileRoute, Link } from "@tanstack/react-router";
import { SchoolLoginForm } from "@/components/school-login-form";
import { Button } from "@enthu/ui/components/button";

export const Route = createFileRoute("/school-login")({
  component: SchoolLoginPage,
});

function SchoolLoginPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-10 space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">School Login</h1>
        <p className="text-xs text-muted-foreground">Select school and enter code sent to your school</p>
      </div>
      <SchoolLoginForm />
      <div className="text-center">
        <Link to="/">
          <Button variant="link" size="sm">Back to Portal</Button>
        </Link>
      </div>
    </div>
  );
}

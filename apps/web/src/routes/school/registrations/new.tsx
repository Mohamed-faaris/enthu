import { createFileRoute } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/registration/RegistrationForm";

export const Route = createFileRoute("/school/registrations/new")({
  component: SchoolNewRegistration,
});

function SchoolNewRegistration() {
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-medium">New registration</h2>
      <p className="text-sm text-muted-foreground">Eligibility and deadline are enforced; no override here.</p>
      <RegistrationForm isAdminContext={false} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/registration/RegistrationForm";

export const Route = createFileRoute("/admin/registrations/new")({
  component: NewRegistrationPage,
});

function NewRegistrationPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-medium">New registration (on behalf of school)</h2>
      <RegistrationForm isAdminContext />
    </div>
  );
}

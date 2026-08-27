import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bib-assignment")({
  component: BibAssignmentPage,
});

function BibAssignmentPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-medium">BIB Assignment removed</h2>
      <p className="text-sm text-muted-foreground">BIB field has been removed from students (single name field only). This page is deprecated.</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/certificates/")({
  component: CertificatesPage,
});

function CertificatesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Certificates</h2>
      <p className="text-sm text-muted-foreground">Certificate writer (global, names only) — no access to points/results. Query students via school scope.</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/audit-logs/")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Audit Logs</h2>
      <p className="text-sm text-muted-foreground">General polymorphic logs (entityType + entityId) + dedicated result_edit_logs. Filter by registration from the registrations table.</p>
      <p className="text-xs text-muted-foreground">Use the History link on a registration to view its audit trail via <code>trpc.audit.listByEntity</code>.</p>
    </div>
  );
}

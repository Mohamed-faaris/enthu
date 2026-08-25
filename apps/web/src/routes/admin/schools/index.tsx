import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/admin/schools/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.schools.adminList.queryOptions()),
  component: SchoolsPage,
});

function SchoolsPage() {
  const q = useQuery(trpc.schools.adminList.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string; code: string; contactEmail: string | null; isActive: boolean }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Schools</h2>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as { name: string }).name },
          { header: "Code", cell: (r) => (r as unknown as { code: string }).code },
          { header: "Email", cell: (r) => (r as unknown as { contactEmail: string | null }).contactEmail ?? "—" },
          { header: "Active", cell: (r) => ((r as unknown as { isActive: boolean }).isActive ? "Yes" : "No") },
        ]}
      />
    </div>
  );
}

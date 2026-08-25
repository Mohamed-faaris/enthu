import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/admin/users")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.users.list.queryOptions()),
  component: UsersPage,
});

function UsersPage() {
  const q = useQuery(trpc.users.list.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string; email: string; role: string; school: { name: string } | null }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Users</h2>
      <p className="text-sm text-muted-foreground">Organizer issues login credentials to schools; one user = one role; school_spoc scoped by schoolId; event_coordinator via event_coordinators join.</p>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as { name: string }).name },
          { header: "Email", cell: (r) => (r as unknown as { email: string }).email },
          { header: "Role", cell: (r) => (r as unknown as { role: string }).role },
          { header: "School", cell: (r) => (r as unknown as { school: { name: string } | null }).school?.name ?? "—" },
        ]}
      />
    </div>
  );
}

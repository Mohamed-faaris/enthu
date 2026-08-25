import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/school/students/")({
  component: StudentsPage,
});

function StudentsPage() {
  const session = authClient.useSession();
  const schoolId = (session.data?.user as unknown as { schoolId?: string } | undefined)?.schoolId;
  const q = useQuery({ ...trpc.students.listBySchool.queryOptions({ schoolId: schoolId ?? "" }), enabled: !!schoolId });
  const rows = (q.data as unknown as Array<{ id: string; firstName: string; lastName: string; gender: string; studyingClass: number; bibId: string | null }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Students</h2>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => `${(r as unknown as { firstName: string }).firstName} ${(r as unknown as { lastName: string }).lastName}` },
          { header: "Gender", cell: (r) => (r as unknown as { gender: string }).gender },
          { header: "Class", cell: (r) => String((r as unknown as { studyingClass: number }).studyingClass) },
          { header: "BIB", cell: (r) => (r as unknown as { bibId: string | null }).bibId ?? "—" },
        ]}
      />
    </div>
  );
}

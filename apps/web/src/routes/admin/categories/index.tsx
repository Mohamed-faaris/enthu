import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DataTable } from "@/components/tables/DataTable";

export const Route = createFileRoute("/admin/categories/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trpc.categories.list.queryOptions()),
  component: CategoriesPage,
});

function CategoriesPage() {
  const q = useQuery(trpc.categories.list.queryOptions());
  const rows = (q.data as unknown as Array<{ id: string; name: string; minClass: number; maxClass: number }>) ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Categories</h2>
      <p className="text-sm text-muted-foreground">Class-range groupings (e.g. Sub-Junior 3–5). No gender on category.</p>
      <DataTable
        data={rows as unknown as Array<{ id: string } & Record<string, unknown>>}
        columns={[
          { header: "Name", cell: (r) => (r as unknown as { name: string }).name },
          { header: "Range", cell: (r) => `${(r as unknown as { minClass: number }).minClass}–${(r as unknown as { maxClass: number }).maxClass}` },
        ]}
      />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export function StudentPicker({
  schoolId,
  value,
  onChange,
}: {
  schoolId: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const q = useQuery({
    ...trpc.students.listBySchool.queryOptions({ schoolId: schoolId ?? "" }),
    enabled: !!schoolId,
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Select a school first</p>;
  if (q.isLoading) return <p className="text-sm">Loading students…</p>;

  const students = (q.data as unknown as Array<{ id: string; firstName: string; lastName: string; studyingClass: number; gender: string }>) ?? [];

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-md border px-3 py-2 bg-background"
    >
      <option value="">— select student —</option>
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.firstName} {s.lastName} (Class {s.studyingClass}, {s.gender})
        </option>
      ))}
    </select>
  );
}

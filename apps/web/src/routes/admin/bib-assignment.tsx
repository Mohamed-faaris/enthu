import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bib-assignment")({
  component: BibAssignmentPage,
});

function BibAssignmentPage() {
  const [schoolId, setSchoolId] = useState("");
  const schoolsQ = useQuery(trpc.schools.list.queryOptions());
  const studentsQ = useQuery({ ...trpc.students.listBySchool.queryOptions({ schoolId }), enabled: !!schoolId });
  const [bibs, setBibs] = useState<Record<string, string>>({});
  const mut = useMutation(
    trpc.bib.assignBulk.mutationOptions({
      onSuccess: () => toast.success("BIBs assigned"),
      onError: (e) => toast.error(e.message),
    })
  );

  const submit = () => {
    const assignments = Object.entries(bibs)
      .filter(([, bib]) => bib.trim())
      .map(([studentId, bibId]) => ({ studentId, bibId }));
    if (!assignments.length) return toast.error("No BIBs to assign");
    mut.mutate({ assignments });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-medium">BIB Assignment (bulk, after registration closes)</h2>
      <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-background">
        <option value="">Select school</option>
        {(schoolsQ.data as unknown as Array<{ id: string; name: string }>)?.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      {studentsQ.data && (
        <div className="space-y-2">
          {(studentsQ.data as unknown as Array<{ id: string; firstName: string; lastName: string; bibId: string | null }>)?.map((st) => (
            <div key={st.id} className="flex gap-2 items-center">
              <span className="flex-1 text-sm">{st.firstName} {st.lastName} {st.bibId ? `(BIB: ${st.bibId})` : ""}</span>
              <Input placeholder="BIB" value={bibs[st.id] ?? ""} onChange={(e) => setBibs((p) => ({ ...p, [st.id]: e.target.value }))} className="w-32" />
            </div>
          ))}
          <Button onClick={submit} disabled={mut.isPending}>Assign BIBs</Button>
        </div>
      )}
    </div>
  );
}

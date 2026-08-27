import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";

export function TeamBuilder({
  schoolId,
  value,
  onChange,
  teamName,
  onTeamNameChange,
}: {
  schoolId: string | null;
  value: string[];
  onChange: (ids: string[]) => void;
  teamName: string;
  onTeamNameChange: (v: string) => void;
}) {
  const [pick, setPick] = useState("");
  const q = useQuery({
    ...trpc.students.listBySchool.queryOptions({ schoolId: schoolId ?? "" }),
    enabled: !!schoolId,
  });
  const students = (q.data as unknown as Array<{ id: string; name: string }>) ?? [];

  const add = () => {
    if (pick && !value.includes(pick)) onChange([...value, pick]);
    setPick("");
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div className="space-y-3 rounded-md border p-3">
      <input
        placeholder="Team name (optional, e.g. Team A)"
        value={teamName}
        onChange={(e) => onTeamNameChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 bg-background"
      />
      <div className="flex gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 rounded-md border px-3 py-2 bg-background">
          <option value="">— add member —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={add} variant="secondary">
          Add
        </Button>
      </div>
      <ul className="space-y-1">
        {value.map((id) => {
          const s = students.find((x) => x.id === id);
          return (
            <li key={id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
              <span>{s ? s.name : id}</span>
              <button type="button" onClick={() => remove(id)} className="text-red-600 text-xs">
                Remove
              </button>
            </li>
          );
        })}
        {value.length === 0 && <p className="text-xs text-muted-foreground">No members yet</p>}
      </ul>
    </div>
  );
}

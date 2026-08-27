import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Card } from "@enthu/ui/components/card";
import { EligibilityBadge } from "./EligibilityBadge";
import { OverrideWarningBanner } from "./OverrideWarningBanner";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type Props = {
  isAdminContext?: boolean;
  fixedSchoolId?: string;
  fixedEventId?: string;
  initialData?: {
    id?: string;
    schoolId: string;
    eventId: string;
    studentId?: string | null;
    teamId?: string | null;
    teamMemberIds?: string[];
    teamName?: string | null;
    status: string;
    overrideReason?: string | null;
  };
};

export function RegistrationForm({ isAdminContext = false, fixedSchoolId, fixedEventId, initialData }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const session = authClient.useSession();
  const sessionSchoolId = (session.data?.user as unknown as { schoolId?: string } | undefined)?.schoolId ?? null;
  const [schoolId, setSchoolId] = useState(initialData?.schoolId ?? fixedSchoolId ?? "");
  const [eventId, setEventId] = useState(initialData?.eventId ?? fixedEventId ?? "");

  useEffect(() => {
    if (!isAdminContext && !initialData?.schoolId && sessionSchoolId && !schoolId) setSchoolId(sessionSchoolId);
  }, [sessionSchoolId, isAdminContext, initialData?.schoolId, schoolId]);
  useEffect(() => {
    if (fixedEventId && !initialData?.eventId) setEventId(fixedEventId);
  }, [fixedEventId, initialData?.eventId]);
  useEffect(() => {
    if (fixedSchoolId && !initialData?.schoolId) setSchoolId(fixedSchoolId);
  }, [fixedSchoolId, initialData?.schoolId]);

  const [studentId, setStudentId] = useState<string | null>(initialData?.studentId ?? null);
  const [teamId, setTeamId] = useState<string | null>(initialData?.teamId ?? null);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>(initialData?.teamMemberIds ?? []);
  const [teamName, setTeamName] = useState(initialData?.teamName ?? "");

  const schoolsQ = useQuery(trpc.schools.list.queryOptions());
  const eventsQ = useQuery(trpc.events.list.queryOptions());
  const studentsBySchoolQ = useQuery({
    ...trpc.students.listBySchool.queryOptions({ schoolId: schoolId || "" }),
    enabled: !!schoolId,
  });

  const selectedEvent = (eventsQ.data as unknown as Array<{ id: string; eventType: string; name: string; registrationClosesAt: string | null }> | undefined)?.find(
    (e) => e.id === eventId
  );
  const isTeamEvent = selectedEvent?.eventType === "team";

  const eligibilityQ = useQuery({
    ...trpc.registrations.checkEligibility.queryOptions({
      eventId: eventId || "00000000-0000-0000-0000-000000000000",
      ...(isTeamEvent ? { teamMemberIds: teamMemberIds.length ? teamMemberIds : undefined } : { studentId: studentId ?? undefined }),
    }),
    enabled: !!eventId && (isTeamEvent ? teamMemberIds.length > 0 : !!studentId),
  });

  // inline student creation — single name field, created together with registration
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", gender: "male" as "male" | "female", studyingClass: 5 });
  const [newTeamStudent, setNewTeamStudent] = useState({ name: "", gender: "male" as "male" | "female", studyingClass: 5 });
  const [pendingTeamMembers, setPendingTeamMembers] = useState<Array<{ name: string; gender: "male" | "female"; studyingClass: number }>>([]);

  const createStudent = useMutation(trpc.students.upsert.mutationOptions());

  const adminUpsert = useMutation(
    trpc.registrations.adminUpsert.mutationOptions({
      onSuccess: async () => {
        toast.success(initialData?.id ? "Registration updated" : "Registration created");
        await qc.invalidateQueries({ queryKey: trpc.registrations.adminList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.registrations.schoolList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.students.listBySchool.queryKey({ schoolId }) });
        if (isAdminContext && !fixedSchoolId && !fixedEventId) navigate({ to: "/admin/registrations" });
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const schoolUpsert = useMutation(
    trpc.registrations.schoolUpsert.mutationOptions({
      onSuccess: async () => {
        toast.success(initialData?.id ? "Registration updated" : "Registration created");
        await qc.invalidateQueries({ queryKey: trpc.registrations.adminList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.registrations.schoolList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.students.listBySchool.queryKey({ schoolId }) });
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const upsert = isAdminContext ? adminUpsert : schoolUpsert;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSchoolId = fixedSchoolId ?? schoolId;
    const resolvedEventId = fixedEventId ?? eventId;
    if (!resolvedSchoolId || !resolvedEventId) {
      toast.error("School and event are required");
      return;
    }

    let finalStudentId = studentId;
    let finalTeamMemberIds = [...teamMemberIds];

    // create student inline together with registration — no dropdown, single submit
    if (!isTeamEvent && !finalStudentId && newStudent.name.trim()) {
      try {
        const created: any = await createStudent.mutateAsync({
          data: {
            schoolId: resolvedSchoolId,
            name: newStudent.name.trim(),
            gender: newStudent.gender,
            studyingClass: Number(newStudent.studyingClass),
          },
        } as never);
        finalStudentId = created.id;
        await qc.invalidateQueries({ queryKey: trpc.students.listBySchool.queryKey({ schoolId: resolvedSchoolId }) });
        setNewStudent({ name: "", gender: "male", studyingClass: 5 });
      } catch (err: any) {
        return toast.error(err.message);
      }
    }

    // pending team members (added via Add member button) + current inline input if filled
    const teamMembersToCreate = [...pendingTeamMembers];
    if (isTeamEvent && newTeamStudent.name.trim()) {
      teamMembersToCreate.push({ ...newTeamStudent, name: newTeamStudent.name.trim() });
    }
    for (const m of teamMembersToCreate) {
      try {
        const created: any = await createStudent.mutateAsync({
          data: {
            schoolId: resolvedSchoolId,
            name: m.name.trim(),
            gender: m.gender,
            studyingClass: Number(m.studyingClass),
          },
        } as never);
        finalTeamMemberIds = [...finalTeamMemberIds, created.id];
      } catch (err: any) {
        return toast.error((err as any).message);
      }
    }
    if (teamMembersToCreate.length > 0) {
      await qc.invalidateQueries({ queryKey: trpc.students.listBySchool.queryKey({ schoolId: resolvedSchoolId }) });
      setPendingTeamMembers([]);
      setNewTeamStudent({ name: "", gender: "male", studyingClass: 5 });
    }

    if (!isTeamEvent && !finalStudentId) {
      toast.error("Add new student name");
      return;
    }
    if (isTeamEvent && finalTeamMemberIds.length === 0) {
      toast.error("Add at least one team member");
      return;
    }
    if (!hasPendingCreation && eligibility && !eligibility.eligible) {
      toast.error(`Not eligible: ${eligibility.reasons.join("; ")}`);
      return;
    }

    upsert.mutate({
      id: initialData?.id,
      schoolId: resolvedSchoolId,
      eventId: resolvedEventId,
      studentId: isTeamEvent ? null : finalStudentId,
      teamId: isTeamEvent ? teamId : null,
      teamMemberIds: isTeamEvent && !teamId ? finalTeamMemberIds : undefined,
      teamName: isTeamEvent ? teamName || null : undefined,
      status: "confirmed",
      overrideReason: null,
    } as never);
  };

  const eligibility = eligibilityQ.data as
    | { eligible: boolean; reasons: string[]; isDeadlinePassed?: boolean; registrationClosesAt?: string | null }
    | undefined;

  const eventLocked = !!fixedEventId;
  const isSubmitting = upsert.isPending || createStudent.isPending;
  const hasPendingCreation = isTeamEvent
    ? pendingTeamMembers.length > 0 || newTeamStudent.name.trim().length > 0
    : newStudent.name.trim().length > 0;
  const hasEntrant = isTeamEvent
    ? teamMemberIds.length > 0 || hasPendingCreation
    : !!studentId || hasPendingCreation;
  // if pending creation exists, skip eligibility disable (will be validated after creation/backend)
  const isEligible = hasPendingCreation ? true : eligibility ? eligibility.eligible : true;
  const canSubmit = !! (fixedSchoolId ?? schoolId) && !! (fixedEventId ?? eventId) && hasEntrant && isEligible && !isSubmitting;
  const eligibilityErrorText = eligibility && !eligibility.eligible ? eligibility.reasons.join("; ") : null;
  const submitErrorText = (upsert.error as any)?.message || (createStudent.error as any)?.message || null;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {fixedSchoolId ? (
          <div className="space-y-2">
            <Label>School</Label>
            <p className="text-sm font-medium">
              {(schoolsQ.data as unknown as Array<{ id: string; name: string }> | undefined)?.find((s) => s.id === fixedSchoolId)?.name ?? fixedSchoolId}
            </p>
            <p className="text-xs text-muted-foreground">Locked to this school</p>
          </div>
        ) : isAdminContext ? (
          <div className="space-y-2">
            <Label>School *</Label>
            <select
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value);
                setStudentId(null);
                setTeamMemberIds([]);
                setTeamId(null);
              }}
              className="w-full rounded-md border px-3 py-2 bg-background"
              required
            >
              <option value="">— select school —</option>
              {(schoolsQ.data as unknown as Array<{ id: string; name: string }> | undefined)?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>School</Label>
            <p className="text-sm text-muted-foreground">{schoolId || sessionSchoolId || "—"}</p>
          </div>
        )}

        {eventLocked ? (
          <div className="space-y-2">
            <Label>Event</Label>
            <p className="text-sm font-medium">
              {(eventsQ.data as unknown as Array<{ id: string; name: string }> | undefined)?.find((ev) => ev.id === fixedEventId)?.name ?? fixedEventId}
            </p>
            <p className="text-xs text-muted-foreground">Locked to this event (team auto-created inline)</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Event *</Label>
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setStudentId(null);
                setTeamId(null);
                setTeamMemberIds([]);
              }}
              className="w-full rounded-md border px-3 py-2 bg-background"
              required
            >
              <option value="">— select event —</option>
              {(eventsQ.data as unknown as Array<{ id: string; name: string; gender: string; eventType: string }> | undefined)?.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.gender}, {ev.eventType})
                </option>
              ))}
            </select>
          </div>
        )}

        {eventId && !isTeamEvent && (
          <div className="space-y-3">
            {initialData?.id && studentId ? (
              <div className="space-y-2">
                <Label>Student</Label>
                <p className="text-sm font-medium">
                  {(studentsBySchoolQ.data as unknown as Array<{ id: string; name: string }> | undefined)?.find((s) => s.id === studentId)?.name ?? studentId}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => { setStudentId(null); setShowAddStudent(true); }}>
                  Change student
                </Button>
              </div>
            ) : (
              <div className="rounded-md border p-3 space-y-3 bg-muted/20">
                <p className="text-xs font-medium">New student — will be created together with registration on submit (no dropdown)</p>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Full name" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <select value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as any })} className="w-full rounded-md border px-2 py-2 bg-background text-sm">
                      <option value="male">male</option>
                      <option value="female">female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Class</Label>
                    <Input type="number" min={1} max={12} value={newStudent.studyingClass} onChange={(e) => setNewStudent({ ...newStudent, studyingClass: Number(e.target.value) })} required />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {eventId && isTeamEvent && (
          <div className="space-y-3">
            <Label>Team (auto-created inline — no dropdown)</Label>
            <div className="space-y-2">
              <Label>Team name (optional)</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Team A" />
            </div>
            {teamMemberIds.length > 0 && (
              <div className="space-y-2">
                <Label>Added members ({teamMemberIds.length})</Label>
                <ul className="space-y-1">
                  {teamMemberIds.map((id) => {
                    const s = (studentsBySchoolQ.data as unknown as Array<{ id: string; name: string; gender: "male" | "female"; studyingClass: number }> | undefined)?.find((x) => x.id === id);
                    return (
                      <li key={id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                        <span>{s?.name ?? id}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (s) setNewTeamStudent({ name: s.name, gender: s.gender, studyingClass: s.studyingClass });
                              setTeamMemberIds((prev) => prev.filter((x) => x !== id));
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button type="button" onClick={() => setTeamMemberIds((prev) => prev.filter((x) => x !== id))} className="text-xs text-red-600">Remove</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {teamId && <p className="text-xs text-muted-foreground">Editing existing team {teamId} — new members will be updated inline</p>}
            <div className="rounded-md border p-3 space-y-3 bg-muted/20">
              <p className="text-xs font-medium">Add team members — each will be created with registration on submit (no dropdown)</p>
              {pendingTeamMembers.length > 0 && (
                <div className="space-y-1">
                  <Label>Pending new members ({pendingTeamMembers.length})</Label>
                  <ul className="space-y-1">
                    {pendingTeamMembers.map((m, idx) => (
                      <li key={idx} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs">
                        <span>{m.name} ({m.gender}, class {m.studyingClass})</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewTeamStudent({ name: m.name, gender: m.gender, studyingClass: m.studyingClass });
                              setPendingTeamMembers((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button type="button" onClick={() => setPendingTeamMembers((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-600">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-1">
                <Label>Name {teamMemberIds.length === 0 && pendingTeamMembers.length === 0 ? "*" : "(add more)"}</Label>
                <Input value={newTeamStudent.name} onChange={(e) => setNewTeamStudent({ ...newTeamStudent, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <select value={newTeamStudent.gender} onChange={(e) => setNewTeamStudent({ ...newTeamStudent, gender: e.target.value as any })} className="w-full rounded-md border px-2 py-2 bg-background text-sm">
                    <option value="male">male</option>
                    <option value="female">female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Class</Label>
                  <Input type="number" min={1} max={12} value={newTeamStudent.studyingClass} onChange={(e) => setNewTeamStudent({ ...newTeamStudent, studyingClass: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!newTeamStudent.name.trim()) return toast.error("Name required");
                    setPendingTeamMembers((prev) => [...prev, { ...newTeamStudent, name: newTeamStudent.name.trim() }]);
                    setNewTeamStudent({ name: "", gender: "male", studyingClass: 5 });
                  }}
                >
                  + Add member to team list
                </Button>
                {pendingTeamMembers.length > 0 && (
                  <span className="text-xs text-muted-foreground self-center">Will create {pendingTeamMembers.length + (newTeamStudent.name.trim() ? 1 : 0)} new member(s) on submit</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Click + to queue members, then submit registration once. Team will be auto-created inline.</p>
            </div>
            <p className="text-xs text-muted-foreground">Team will be created automatically on submit — no separate team step, no dropdown.</p>
          </div>
        )}

        {eligibility && (
          <div className="space-y-2">
            <EligibilityBadge eligible={eligibility.eligible} reasons={eligibility.reasons} />
            {!eligibility.eligible && (
              <ul className="text-xs text-red-600 list-disc pl-4">
                {eligibility.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            <OverrideWarningBanner
              registrationClosesAt={eligibility.registrationClosesAt ?? null}
              isDeadlinePassed={eligibility.isDeadlinePassed}
            />
          </div>
        )}

        {!eligibility && selectedEvent?.registrationClosesAt && new Date(selectedEvent.registrationClosesAt) < new Date() && (
          <OverrideWarningBanner registrationClosesAt={selectedEvent.registrationClosesAt} isDeadlinePassed />
        )}

        {eligibilityErrorText && <p className="text-xs text-red-600">Not eligible: {eligibilityErrorText}</p>}
        {submitErrorText && <p className="text-xs text-red-600">Error while creating: {submitErrorText}</p>}
        {!hasEntrant && <p className="text-xs text-amber-600">Add a student / team member to enable Create</p>}
        <Button type="submit" disabled={!canSubmit} className="w-full">
          {isSubmitting ? "Saving…" : initialData?.id ? "Update registration (confirmed)" : "Create registration (confirmed)"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">Status always confirmed — no override needed. New student/team created inline on submit.{!canSubmit && hasEntrant && eligibilityErrorText ? " Fix eligibility to enable." : ""}</p>
      </form>
    </Card>
  );
}

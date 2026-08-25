import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@enthu/ui/components/button";
import { Input } from "@enthu/ui/components/input";
import { Label } from "@enthu/ui/components/label";
import { Card } from "@enthu/ui/components/card";
import { StudentPicker } from "@/components/students/StudentPicker";
import { TeamBuilder } from "@/components/teams/TeamBuilder";
import { EligibilityBadge } from "./EligibilityBadge";
import { OverrideWarningBanner } from "./OverrideWarningBanner";
import { toast } from "sonner";

type Props = {
  isAdminContext?: boolean;
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

export function RegistrationForm({ isAdminContext = false, initialData }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState(initialData?.schoolId ?? "");
  const [eventId, setEventId] = useState(initialData?.eventId ?? "");
  const [studentId, setStudentId] = useState<string | null>(initialData?.studentId ?? null);
  const [teamId, setTeamId] = useState<string | null>(initialData?.teamId ?? null);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>(initialData?.teamMemberIds ?? []);
  const [teamName, setTeamName] = useState(initialData?.teamName ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "pending");
  const [overrideReason, setOverrideReason] = useState(initialData?.overrideReason ?? "");

  const schoolsQ = useQuery(trpc.schools.list.queryOptions());
  const eventsQ = useQuery(trpc.events.list.queryOptions());

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

  const upsert = useMutation(
    trpc.registrations.adminUpsert.mutationOptions({
      onSuccess: async (data) => {
        toast.success(initialData?.id ? "Registration updated" : "Registration created");
        await qc.invalidateQueries({ queryKey: trpc.registrations.adminList.queryKey() });
        await qc.invalidateQueries({ queryKey: trpc.students.listBySchool.queryKey({ schoolId }) });
        if (isAdminContext) navigate({ to: "/admin/registrations" });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !eventId) {
      toast.error("School and event are required");
      return;
    }
    upsert.mutate({
      id: initialData?.id,
      schoolId,
      eventId,
      studentId: isTeamEvent ? null : studentId,
      teamId: isTeamEvent ? teamId : null,
      teamMemberIds: isTeamEvent && !teamId ? teamMemberIds : undefined,
      teamName: isTeamEvent ? teamName || null : undefined,
      status: status as "pending" | "confirmed" | "rejected" | "withdrawn",
      overrideReason: overrideReason || null,
    } as never);
  };

  const eligibility = eligibilityQ.data as
    | { eligible: boolean; reasons: string[]; isDeadlinePassed?: boolean; registrationClosesAt?: string | null }
    | undefined;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {isAdminContext && (
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
        )}

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

        {eventId && !isTeamEvent && (
          <div className="space-y-2">
            <Label>Student *</Label>
            <StudentPicker schoolId={schoolId || null} value={studentId} onChange={setStudentId} />
          </div>
        )}

        {eventId && isTeamEvent && (
          <div className="space-y-2">
            <Label>Team</Label>
            <TeamBuilder
              schoolId={schoolId || null}
              value={teamMemberIds}
              onChange={setTeamMemberIds}
              teamName={teamName}
              onTeamNameChange={setTeamName}
            />
            {teamId && <p className="text-xs text-muted-foreground">Editing existing team {teamId}</p>}
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

        {/* Always show deadline banner if event selected and deadline passed, even before eligibility query resolves */}
        {!eligibility && selectedEvent?.registrationClosesAt && new Date(selectedEvent.registrationClosesAt) < new Date() && (
          <OverrideWarningBanner registrationClosesAt={selectedEvent.registrationClosesAt} isDeadlinePassed />
        )}

        <div className="space-y-2">
          <Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-background">
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="rejected">rejected</option>
            <option value="withdrawn">withdrawn</option>
          </select>
        </div>

        {isAdminContext && (
          <div className="space-y-2">
            <Label>Override reason (recommended if deadline override)</Label>
            <Input
              placeholder="Why is this override needed? (recommended)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              maxLength={255}
            />
          </div>
        )}

        <Button type="submit" disabled={upsert.isPending} className="w-full">
          {upsert.isPending ? "Saving…" : initialData?.id ? "Update registration" : "Create registration"}
        </Button>
      </form>
    </Card>
  );
}

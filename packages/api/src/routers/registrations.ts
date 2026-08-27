import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@enthu/db";
import {
  auditLogs,
  events,
  registrations,
  schools,
  students,
  teamMembers,
  teams,
} from "@enthu/db/schema";
import {
  adminListFiltersSchema,
  adminUpsertSchema,
  checkEligibilitySchema,
  idSchema,
} from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";

async function checkEligibilityHelper(eventId: string, studentIds: string[]) {
  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { category: true },
  });
  if (!eventRow) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  const category = eventRow.category;
  const reasons: string[] = [];
  let eligible = true;

  for (const sid of studentIds) {
    const st = await db.query.students.findFirst({ where: eq(students.id, sid) });
    if (!st) {
      eligible = false;
      reasons.push(`Student ${sid} not found`);
      continue;
    }
    if (eventRow.gender !== "mixed" && st.gender !== eventRow.gender) {
      eligible = false;
      reasons.push(
        `Student ${st.name} gender ${st.gender} does not match event gender ${eventRow.gender}`
      );
    }
    if (st.studyingClass < category.minClass || st.studyingClass > category.maxClass) {
      eligible = false;
      reasons.push(
        `Student ${st.name} class ${st.studyingClass} outside category range ${category.minClass}-${category.maxClass}`
      );
    }
  }

  const isDeadlinePassed =
    !!eventRow.registrationClosesAt && new Date() > new Date(eventRow.registrationClosesAt);

  return {
    eligible,
    reasons,
    eventGender: eventRow.gender as "male" | "female" | "mixed",
    categoryRange: { minClass: category.minClass, maxClass: category.maxClass },
    registrationClosesAt: eventRow.registrationClosesAt?.toISOString() ?? null,
    isDeadlinePassed,
  };
}

export const registrationsRouter = router({
  checkEligibility: protectedProcedure
    .input(checkEligibilitySchema)
    .query(async ({ input }) => {
      const studentIds = input.studentId ? [input.studentId] : input.teamMemberIds ?? [];
      if (studentIds.length === 0) return { eligible: false, reasons: ["No student provided"] };
      const base = await checkEligibilityHelper(input.eventId, studentIds);
      return {
        eligible: base.eligible,
        reasons: base.reasons,
        eventGender: base.eventGender,
        categoryRange: base.categoryRange,
        registrationClosesAt: base.registrationClosesAt,
        isDeadlinePassed: base.isDeadlinePassed,
      };
    }),

  adminList: adminProcedure.input(adminListFiltersSchema.optional()).query(async ({ input }) => {
    const f = input ?? {};
    const rows = await db.query.registrations.findMany({
      with: {
        school: true,
        event: { with: { category: true } },
        student: true,
        team: { with: { members: { with: { student: true } } } },
        createdBy: true,
        lastEditedBy: true,
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    let filtered = rows;
    if (f.schoolId) filtered = filtered.filter((r) => r.schoolId === f.schoolId);
    if (f.eventId) filtered = filtered.filter((r) => r.eventId === f.eventId);
    if (f.categoryId) filtered = filtered.filter((r) => r.event.categoryId === f.categoryId);
    if (f.status) filtered = filtered.filter((r) => r.status === f.status);
    if (typeof f.isAdminOverride === "boolean")
      filtered = filtered.filter((r) => r.isAdminOverride === f.isAdminOverride);
    if (f.search) {
      const q = f.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.event.name.toLowerCase().includes(q) ||
          r.school.name.toLowerCase().includes(q) ||
          (r.student && r.student.name.toLowerCase().includes(q)) ||
          (r.team?.name && r.team.name.toLowerCase().includes(q))
      );
    }
    const offset = f.offset ?? 0;
    const limit = f.limit ?? 50;
    const paged = filtered.slice(offset, offset + limit);
    return { items: paged, total: filtered.length };
  }),

  adminGet: adminProcedure.input(idSchema).query(async ({ input }) => {
    const reg = await db.query.registrations.findFirst({
      where: eq(registrations.id, input.id),
      with: {
        school: true,
        event: { with: { category: true } },
        student: true,
        team: { with: { members: { with: { student: true } } } },
      },
    });
    if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
    return reg;
  }),

  adminUpsert: adminProcedure.input(adminUpsertSchema).mutation(async ({ input, ctx }) => {
    const actorId = (ctx.user as { id: string }).id;
    const headers = (ctx as unknown as { headers: Headers }).headers;
    const ip =
      headers?.get?.("x-forwarded-for") ?? headers?.get?.("x-real-ip") ?? null;

    const school = await db.query.schools.findFirst({ where: eq(schools.id, input.schoolId) });
    if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });

    const eventRow = await db.query.events.findFirst({
      where: eq(events.id, input.eventId),
      with: { category: true },
    });
    if (!eventRow) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

    const isIndividual = eventRow.eventType === "individual";

    let studentId: string | null = input.studentId ?? null;
    let teamId: string | null = input.teamId ?? null;

    if (isIndividual) {
      if (!studentId) throw new TRPCError({ code: "BAD_REQUEST", message: "studentId required for individual event" });
      if (input.teamId || (input.teamMemberIds && input.teamMemberIds.length > 0))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team data not allowed for individual event" });
      const st = await db.query.students.findFirst({ where: eq(students.id, studentId) });
      if (!st) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      if (st.schoolId !== input.schoolId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student does not belong to selected school" });
      const elig = await checkEligibilityHelper(input.eventId, [studentId]);
      if (!elig.eligible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
      }
    } else {
      if (studentId) throw new TRPCError({ code: "BAD_REQUEST", message: "studentId not allowed for team event" });
      const memberIds = input.teamMemberIds ?? [];
      if (teamId) {
        const t = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
        if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        if (t.schoolId !== input.schoolId || t.eventId !== input.eventId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Team does not belong to school/event" });
        if (memberIds.length > 0) {
          const elig = await checkEligibilityHelper(input.eventId, memberIds);
          if (!elig.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
          if (eventRow.teamMinMembers && memberIds.length < eventRow.teamMinMembers)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Team needs at least ${eventRow.teamMinMembers} members` });
          if (eventRow.teamMaxMembers && memberIds.length > eventRow.teamMaxMembers)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Team exceeds max ${eventRow.teamMaxMembers} members` });
          await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
          for (const mid of memberIds) {
            const st = await db.query.students.findFirst({ where: eq(students.id, mid) });
            if (!st || st.schoolId !== input.schoolId)
              throw new TRPCError({ code: "BAD_REQUEST", message: `Member ${mid} not in school` });
            await db.insert(teamMembers).values({ teamId, studentId: mid });
          }
          if (input.teamName !== undefined) {
            await db.update(teams).set({ name: input.teamName ?? null }).where(eq(teams.id, teamId));
          }
        }
      } else {
        if (memberIds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "teamMemberIds required for team event" });
        if (eventRow.teamMinMembers && memberIds.length < eventRow.teamMinMembers)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Team needs at least ${eventRow.teamMinMembers} members` });
        if (eventRow.teamMaxMembers && memberIds.length > eventRow.teamMaxMembers)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Team exceeds max ${eventRow.teamMaxMembers} members` });
        if (eventRow.maxTeamsPerSchool) {
          const existing = await db.query.teams.findMany({
            where: and(eq(teams.schoolId, input.schoolId), eq(teams.eventId, input.eventId)),
          });
          if (existing.length >= eventRow.maxTeamsPerSchool)
            throw new TRPCError({ code: "BAD_REQUEST", message: `School already has max ${eventRow.maxTeamsPerSchool} teams for this event` });
        }
        const elig = await checkEligibilityHelper(input.eventId, memberIds);
        if (!elig.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
        const [newTeam] = await db
          .insert(teams)
          .values({
            eventId: input.eventId,
            schoolId: input.schoolId,
            name: input.teamName ?? null,
          })
          .returning();
        if (!newTeam) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Team creation failed" });
        teamId = newTeam.id;
        for (const mid of memberIds) {
          const st = await db.query.students.findFirst({ where: eq(students.id, mid) });
          if (!st || st.schoolId !== input.schoolId)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Member ${mid} not in school` });
          await db.insert(teamMembers).values({ teamId: newTeam.id, studentId: mid });
        }
      }
      if (!teamId) throw new TRPCError({ code: "BAD_REQUEST", message: "Team not resolved" });
    }

    const isDeadlinePassed =
      !!eventRow.registrationClosesAt && new Date() > new Date(eventRow.registrationClosesAt);
    const isAdminOverride = isDeadlinePassed;
    const overrideReason = input.overrideReason?.trim() ? input.overrideReason.trim() : null;

    let resultRow;
    let before: unknown = null;
    const now = new Date();

    if (input.id) {
      const existing = await db.query.registrations.findFirst({ where: eq(registrations.id, input.id) });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      before = existing;
      const [updated] = await db
        .update(registrations)
        .set({
          eventId: input.eventId,
          schoolId: input.schoolId,
          studentId,
          teamId,
          status: input.status,
          isAdminOverride,
          overrideReason,
          lastEditedByUserId: actorId,
          updatedAt: now,
        })
        .where(eq(registrations.id, input.id))
        .returning();
      resultRow = updated;
      await db.insert(auditLogs).values({
        userId: actorId,
        action: "update",
        entityType: "registration",
        entityId: input.id,
        changes: { before, after: updated, overrideReason, isAdminOverride, isDeadlinePassed },
        ipAddress: ip,
      });
    } else {
      const [created] = await db
        .insert(registrations)
        .values({
          eventId: input.eventId,
          schoolId: input.schoolId,
          studentId,
          teamId,
          status: input.status,
          isAdminOverride,
          overrideReason,
          createdByUserId: actorId,
          lastEditedByUserId: actorId,
        })
        .returning();
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration creation failed" });
      resultRow = created;
      await db.insert(auditLogs).values({
        userId: actorId,
        action: "create",
        entityType: "registration",
        entityId: created.id,
        changes: { after: created, overrideReason, isAdminOverride, isDeadlinePassed },
        ipAddress: ip,
      });
    }

    return resultRow;
  }),

  // School/college level — same flow as admin but school fixed, no status/override, deadline enforced
  schoolUpsert: protectedProcedure.input(adminUpsertSchema).mutation(async ({ input, ctx }) => {
    const actorId = (ctx.user as { id: string }).id;
    const sessionSchoolId = (ctx.user as { schoolId?: string | null }).schoolId;
    const role = (ctx.user as { role?: string }).role;
    // school must match session unless admin
    if (role !== "admin" && input.schoolId !== sessionSchoolId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "School mismatch" });
    }
    const headers = (ctx as unknown as { headers: Headers }).headers;
    const ip = headers?.get?.("x-forwarded-for") ?? headers?.get?.("x-real-ip") ?? null;

    const school = await db.query.schools.findFirst({ where: eq(schools.id, input.schoolId) });
    if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });

    const eventRow = await db.query.events.findFirst({
      where: eq(events.id, input.eventId),
      with: { category: true },
    });
    if (!eventRow) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

    // deadline enforcement for school
    if (eventRow.registrationClosesAt && new Date() > new Date(eventRow.registrationClosesAt)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Registration deadline passed" });
    }

    const isIndividual = eventRow.eventType === "individual";
    let studentId: string | null = input.studentId ?? null;
    let teamId: string | null = input.teamId ?? null;

    if (isIndividual) {
      if (!studentId) throw new TRPCError({ code: "BAD_REQUEST", message: "studentId required for individual event" });
      if (input.teamId || (input.teamMemberIds && input.teamMemberIds.length > 0))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team data not allowed for individual event" });
      const st = await db.query.students.findFirst({ where: eq(students.id, studentId) });
      if (!st) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      if (st.schoolId !== input.schoolId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student does not belong to selected school" });
      const elig = await checkEligibilityHelper(input.eventId, [studentId]);
      if (!elig.eligible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
      }
    } else {
      if (studentId) throw new TRPCError({ code: "BAD_REQUEST", message: "studentId not allowed for team event" });
      const memberIds = input.teamMemberIds ?? [];
      if (teamId) {
        const t = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
        if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        if (t.schoolId !== input.schoolId || t.eventId !== input.eventId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Team does not belong to school/event" });
        if (memberIds.length > 0) {
          const elig = await checkEligibilityHelper(input.eventId, memberIds);
          if (!elig.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
          if (eventRow.teamMinMembers && memberIds.length < eventRow.teamMinMembers)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Team needs at least ${eventRow.teamMinMembers} members` });
          if (eventRow.teamMaxMembers && memberIds.length > eventRow.teamMaxMembers)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Team exceeds max ${eventRow.teamMaxMembers} members` });
          await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
          for (const mid of memberIds) {
            const st = await db.query.students.findFirst({ where: eq(students.id, mid) });
            if (!st || st.schoolId !== input.schoolId)
              throw new TRPCError({ code: "BAD_REQUEST", message: `Member ${mid} not in school` });
            await db.insert(teamMembers).values({ teamId, studentId: mid });
          }
          if (input.teamName !== undefined) {
            await db.update(teams).set({ name: input.teamName ?? null }).where(eq(teams.id, teamId));
          }
        }
      } else {
        if (memberIds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "teamMemberIds required for team event" });
        if (eventRow.teamMinMembers && memberIds.length < eventRow.teamMinMembers)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Team needs at least ${eventRow.teamMinMembers} members` });
        if (eventRow.teamMaxMembers && memberIds.length > eventRow.teamMaxMembers)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Team exceeds max ${eventRow.teamMaxMembers} members` });
        if (eventRow.maxTeamsPerSchool) {
          const existing = await db.query.teams.findMany({
            where: and(eq(teams.schoolId, input.schoolId), eq(teams.eventId, input.eventId)),
          });
          if (existing.length >= eventRow.maxTeamsPerSchool)
            throw new TRPCError({ code: "BAD_REQUEST", message: `School already has max ${eventRow.maxTeamsPerSchool} teams for this event` });
        }
        const elig = await checkEligibilityHelper(input.eventId, memberIds);
        if (!elig.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: `Eligibility failed: ${elig.reasons.join("; ")}` });
        const [newTeam] = await db
          .insert(teams)
          .values({
            eventId: input.eventId,
            schoolId: input.schoolId,
            name: input.teamName ?? null,
          })
          .returning();
        if (!newTeam) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Team creation failed" });
        teamId = newTeam.id;
        for (const mid of memberIds) {
          const st = await db.query.students.findFirst({ where: eq(students.id, mid) });
          if (!st || st.schoolId !== input.schoolId)
            throw new TRPCError({ code: "BAD_REQUEST", message: `Member ${mid} not in school` });
          await db.insert(teamMembers).values({ teamId: newTeam.id, studentId: mid });
        }
      }
      if (!teamId) throw new TRPCError({ code: "BAD_REQUEST", message: "Team not resolved" });
    }

    let resultRow;
    let before: unknown = null;
    const now = new Date();

    if (input.id) {
      const existing = await db.query.registrations.findFirst({ where: eq(registrations.id, input.id) });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      if (role !== "admin" && existing.schoolId !== sessionSchoolId) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit other school registration" });
      before = existing;
      const [updated] = await db
        .update(registrations)
        .set({
          eventId: input.eventId,
          schoolId: input.schoolId,
          studentId,
          teamId,
          status: "confirmed" as const,
          isAdminOverride: false,
          overrideReason: null,
          lastEditedByUserId: actorId,
          updatedAt: now,
        })
        .where(eq(registrations.id, input.id))
        .returning();
      resultRow = updated;
      await db.insert(auditLogs).values({
        userId: actorId,
        action: "update",
        entityType: "registration",
        entityId: input.id,
        changes: { before, after: updated },
        ipAddress: ip,
      });
    } else {
      const [created] = await db
        .insert(registrations)
        .values({
          eventId: input.eventId,
          schoolId: input.schoolId,
          studentId,
          teamId,
          status: "confirmed" as const,
          isAdminOverride: false,
          overrideReason: null,
          createdByUserId: actorId,
          lastEditedByUserId: actorId,
        })
        .returning();
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration creation failed" });
      resultRow = created;
      await db.insert(auditLogs).values({
        userId: actorId,
        action: "create",
        entityType: "registration",
        entityId: created.id,
        changes: { after: created },
        ipAddress: ip,
      });
    }

    return resultRow;
  }),

  schoolList: protectedProcedure.query(async ({ ctx }) => {
    const sid = (ctx.user as { schoolId?: string | null }).schoolId;
    if (!sid) return [];
    return db.query.registrations.findMany({
      where: eq(registrations.schoolId, sid),
      with: { event: true, student: true, team: { with: { members: { with: { student: true } } } } },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });
  }),
});

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@enthu/db";
import { auditLogs, events, registrations, resultEditLogs, results } from "@enthu/db/schema";
import { finalizeInputSchema, resultInputSchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";
import { TRPCError } from "@trpc/server";

export const resultsRouter = router({
  // Live scoreboard for an event (all registrations + results)
  scoreboard: protectedProcedure.input(z.object({ eventId: z.string().uuid(), roundId: z.string().uuid().nullable().optional() })).query(async ({ input }) => {
    const regs = await db.query.registrations.findMany({
      where: eq(registrations.eventId, input.eventId),
      with: { student: true, team: { with: { members: { with: { student: true } } } }, school: true, results: true },
    });
    // Filter by round if provided
    return regs.map((r) => ({
      registration: r,
      result: r.results.find((x) => (input.roundId ? x.roundId === input.roundId : true)) ?? null,
    }));
  }),

  // Upsert raw score (coordinator or admin)
  upsert: protectedProcedure.input(resultInputSchema).mutation(async ({ input, ctx }) => {
    const role = (ctx.user as { role?: string }).role;
    if (role !== "admin" && role !== "event_coordinator") throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
    // If coordinator, verify assignment with canEdit (simplified: allow if coordinator)
    const existing = await db.query.results.findFirst({ where: eq(results.registrationId, input.registrationId) });
    const actorId = (ctx.user as { id: string }).id;
    const prev = existing ? { ...existing } : null;
    let row;
    if (existing) {
      const [updated] = await db
        .update(results)
        .set({
          roundId: input.roundId ?? existing.roundId,
          rawValue: input.rawValue ?? existing.rawValue,
          judgeBreakdown: (input.judgeBreakdown as never) ?? existing.judgeBreakdown,
          isDisqualified: input.isDisqualified ?? existing.isDisqualified,
          disqualificationReason: input.disqualificationReason ?? existing.disqualificationReason,
          rank: existing.rank,
          points: existing.points,
          isFinal: existing.isFinal,
        })
        .where(eq(results.id, existing.id))
        .returning();
      row = updated;
    } else {
      const [created] = await db
        .insert(results)
        .values({
          registrationId: input.registrationId,
          roundId: input.roundId ?? null,
          rawValue: input.rawValue ?? null,
          judgeBreakdown: input.judgeBreakdown as never,
          isDisqualified: input.isDisqualified ?? false,
          disqualificationReason: input.disqualificationReason ?? null,
        })
        .returning();
      row = created;
    }
    if (row) {
      await db.insert(resultEditLogs).values({
        resultId: row.id,
        editedByUserId: actorId,
        previousRawValue: prev?.rawValue ?? null,
        newRawValue: row.rawValue,
        previousIsDisqualified: prev?.isDisqualified ?? null,
        newIsDisqualified: row.isDisqualified,
        previousRank: prev?.rank ?? null,
        newRank: row.rank ?? null,
        previousPoints: prev?.points ?? null,
        newPoints: row.points ?? null,
        previousIsFinal: prev?.isFinal ?? null,
        newIsFinal: row.isFinal,
        reason: null,
      });
    }
    return row;
  }),

  // Finalize round: assign rank/points, mark isFinal, create audit
  finalize: adminProcedure.input(finalizeInputSchema).mutation(async ({ input, ctx }) => {
    const actorId = (ctx.user as { id: string }).id;
    const ev = await db.query.events.findFirst({ where: eq(events.id, input.eventId), with: { pointsTable: true } });
    if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    const headers = (ctx as unknown as { headers: Headers }).headers;
    const ip = headers?.get?.("x-forwarded-for") ?? null;

    const updated: typeof results.$inferSelect[] = [];
    for (const e of input.entries) {
      const r = await db.query.results.findFirst({ where: eq(results.registrationId, e.registrationId) });
      if (!r || r.isDisqualified) continue;
      // Points lookup for points scoring
      let points = e.points ?? null;
      if (ev.scoringType === "points" && e.rank) {
        const pt = ev.pointsTable.find((p) => p.rank === e.rank);
        if (pt) points = pt.points;
      }
      const [u] = await db
        .update(results)
        .set({ rank: e.rank ?? null, points, isFinal: true, finalizedAt: new Date() })
        .where(eq(results.id, r.id))
        .returning();
      if (u) {
        updated.push(u);
        await db.insert(resultEditLogs).values({
          resultId: u.id,
          editedByUserId: actorId,
          previousRank: r.rank ?? null,
          newRank: u.rank ?? null,
          previousPoints: r.points ?? null,
          newPoints: u.points ?? null,
          previousIsFinal: r.isFinal,
          newIsFinal: true,
          reason: input.reason ?? null,
        });
        await db.insert(auditLogs).values({
          userId: actorId,
          action: "update",
          entityType: "result",
          entityId: u.id,
          changes: { before: r, after: u, reason: input.reason },
          ipAddress: ip,
        });
      }
    }
    return { finalized: updated.length };
  }),

  editHistory: protectedProcedure.input(z.object({ resultId: z.string().uuid() })).query(async ({ input }) => {
    return db.query.resultEditLogs.findMany({ where: eq(resultEditLogs.resultId, input.resultId), orderBy: (r, { desc }) => [desc(r.editedAt)], with: { editor: true } });
  }),
});

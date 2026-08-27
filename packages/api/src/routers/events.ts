import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@enthu/db";
import { auditLogs, events } from "@enthu/db/schema";
import { eventSchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";
import { z } from "zod";

export const eventsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.query.events.findMany({
      with: { category: true },
      orderBy: (e, { asc }) => [asc(e.name)],
    });
  }),
  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    return db.query.events.findFirst({
      where: eq(events.id, input.id),
      with: { category: true, rounds: true, pointsTable: true },
    });
  }),
  categories: protectedProcedure.query(async () => {
    return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
  }),
  upsert: adminProcedure
    .input(z.object({ id: z.string().uuid().optional(), data: eventSchema }))
    .mutation(async ({ input, ctx }) => {
      const actorId = (ctx.user as { id: string }).id;
      const headers = (ctx as unknown as { headers: Headers }).headers;
      const ip = headers?.get?.("x-forwarded-for") ?? null;
      if (input.id) {
        const before = await db.query.events.findFirst({ where: eq(events.id, input.id) });
        if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
        const [updated] = await db.update(events).set(input.data).where(eq(events.id, input.id)).returning();
        if (updated)
          await db.insert(auditLogs).values({
            userId: actorId,
            action: "update",
            entityType: "event",
            entityId: updated.id,
            changes: { before, after: updated },
            ipAddress: ip,
          });
        return updated;
      }
      const [created] = await db.insert(events).values(input.data).returning();
      if (created)
        await db.insert(auditLogs).values({
          userId: actorId,
          action: "create",
          entityType: "event",
          entityId: created.id,
          changes: { after: created },
          ipAddress: ip,
        });
      return created;
    }),
  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    const before = await db.query.events.findFirst({ where: eq(events.id, input.id) });
    if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    await db.delete(events).where(eq(events.id, input.id));
    const actorId = (ctx.user as { id: string }).id;
    await db.insert(auditLogs).values({
      userId: actorId,
      action: "delete",
      entityType: "event",
      entityId: input.id,
      changes: { before },
      ipAddress: null,
    });
    return { success: true };
  }),
});

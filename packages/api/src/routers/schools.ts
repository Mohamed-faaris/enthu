import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@enthu/db";
import { auditLogs, schools } from "@enthu/db/schema";
import { schoolSchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";
import { z } from "zod";

export const schoolsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.query.schools.findMany({ orderBy: (s, { asc }) => [asc(s.name)] });
  }),
  adminList: adminProcedure.query(async () => {
    return db.query.schools.findMany({ orderBy: (s, { asc }) => [asc(s.name)] });
  }),
  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    return db.query.schools.findFirst({ where: eq(schools.id, input.id) });
  }),
  upsert: adminProcedure
    .input(z.object({ id: z.string().uuid().optional(), data: schoolSchema }))
    .mutation(async ({ input, ctx }) => {
      const actorId = (ctx.user as { id: string }).id;
      const headers = (ctx as unknown as { headers: Headers }).headers;
      const ip = headers?.get?.("x-forwarded-for") ?? null;
      if (input.id) {
        const before = await db.query.schools.findFirst({ where: eq(schools.id, input.id) });
        if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
        const [updated] = await db.update(schools).set(input.data).where(eq(schools.id, input.id)).returning();
        if (updated)
          await db.insert(auditLogs).values({
            userId: actorId,
            action: "update",
            entityType: "school",
            entityId: updated.id,
            changes: { before, after: updated },
            ipAddress: ip,
          });
        return updated;
      }
      const [created] = await db.insert(schools).values(input.data).returning();
      if (created)
        await db.insert(auditLogs).values({
          userId: actorId,
          action: "create",
          entityType: "school",
          entityId: created.id,
          changes: { after: created },
          ipAddress: ip,
        });
      return created;
    }),
  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    const before = await db.query.schools.findFirst({ where: eq(schools.id, input.id) });
    if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
    await db.delete(schools).where(eq(schools.id, input.id));
    const actorId = (ctx.user as { id: string }).id;
    await db.insert(auditLogs).values({
      userId: actorId,
      action: "delete",
      entityType: "school",
      entityId: input.id,
      changes: { before },
      ipAddress: null,
    });
    return { success: true };
  }),
});

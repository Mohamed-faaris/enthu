import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@enthu/db";
import { auditLogs, categories } from "@enthu/db/schema";
import { categorySchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";

export const categoriesRouter = router({
  list: protectedProcedure.query(async () => {
    return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
  }),
  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    return db.query.categories.findFirst({ where: eq(categories.id, input.id) });
  }),
  upsert: adminProcedure
    .input(z.object({ id: z.string().uuid().optional(), data: categorySchema }))
    .mutation(async ({ input, ctx }) => {
      const actorId = (ctx.user as { id: string }).id;
      const headers = (ctx as unknown as { headers: Headers }).headers;
      const ip = headers?.get?.("x-forwarded-for") ?? null;
      if (input.id) {
        const before = await db.query.categories.findFirst({ where: eq(categories.id, input.id) });
        const [updated] = await db.update(categories).set(input.data).where(eq(categories.id, input.id)).returning();
        if (updated) await db.insert(auditLogs).values({ userId: actorId, action: "update", entityType: "category", entityId: updated.id, changes: { before, after: updated }, ipAddress: ip });
        return updated;
      }
      const [created] = await db.insert(categories).values(input.data).returning();
      if (created) await db.insert(auditLogs).values({ userId: actorId, action: "create", entityType: "category", entityId: created.id, changes: { after: created }, ipAddress: ip });
      return created;
    }),
  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    const before = await db.query.categories.findFirst({ where: eq(categories.id, input.id) });
    await db.delete(categories).where(eq(categories.id, input.id));
    const actorId = (ctx.user as { id: string }).id;
    await db.insert(auditLogs).values({ userId: actorId, action: "delete", entityType: "category", entityId: input.id, changes: { before }, ipAddress: null });
    return { success: true };
  }),
});

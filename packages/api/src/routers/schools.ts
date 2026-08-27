import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@enthu/db";
import { auditLogs, schools, user } from "@enthu/db/schema";
import { schoolSchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../index";
import { z } from "zod";
import { auth } from "@enthu/auth";

export const schoolsRouter = router({
  publicList: publicProcedure.query(async () => {
    return db.query.schools.findMany({
      columns: { id: true, name: true },
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }),
  verifyCode: publicProcedure.input(z.object({ schoolId: z.string().uuid(), code: z.string().min(1) })).mutation(async ({ input }) => {
    const school = await db.query.schools.findFirst({ where: eq(schools.id, input.schoolId) });
    if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
    if (school.code !== input.code.trim()) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid code" });
    // ensure a school user exists for this school so that subsequent auth signIn works
    const email = `school-${school.id}@enthu.local`;
    const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
    if (!existing) {
      try {
        await (auth as any).api.signUpEmail({ body: { email, password: input.code.trim(), name: school.name } });
      } catch {}
    }
    // ensure role and schoolId are set
    const u = await db.query.user.findFirst({ where: eq(user.email, email) });
    if (u && (u.role !== "school_spoc" || (u as any).schoolId !== school.id)) {
      await db.update(user).set({ role: "school_spoc", schoolId: school.id } as any).where(eq(user.email, email));
    }
    return { success: true, schoolId: school.id, schoolName: school.name, email };
  }),
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

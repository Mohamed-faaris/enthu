import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@enthu/db";
import { auditLogs, students } from "@enthu/db/schema";
import { studentSchema } from "@enthu/validators";
import { adminProcedure, protectedProcedure, router } from "../index";
import { z } from "zod";

export const studentsRouter = router({
  listBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.students.findMany({
        where: eq(students.schoolId, input.schoolId),
        orderBy: (s, { asc }) => [asc(s.name)],
      });
    }),
  adminList: adminProcedure.query(async () => {
    return db.query.students.findMany({
      with: { school: true },
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }),
  upsert: protectedProcedure
    .input(z.object({ id: z.string().uuid().optional(), data: studentSchema }))
    .mutation(async ({ input, ctx }) => {
      const actorId = (ctx.user as { id: string }).id;
      const role = (ctx.user as { role?: string }).role;
      const sessionSchoolId = (ctx.user as { schoolId?: string | null }).schoolId;
      if (role !== "admin" && input.data.schoolId !== sessionSchoolId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create student for other school" });
      }
      const headers = (ctx as unknown as { headers: Headers }).headers;
      const ip = headers?.get?.("x-forwarded-for") ?? null;
      if (input.id) {
        const before = await db.query.students.findFirst({ where: eq(students.id, input.id) });
        if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        if (role !== "admin" && before.schoolId !== sessionSchoolId) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update other school student" });
        try {
          const [updated] = await db.update(students).set(input.data).where(eq(students.id, input.id)).returning();
          if (updated)
            await db.insert(auditLogs).values({ userId: actorId, action: "update", entityType: "student", entityId: updated.id, changes: { before, after: updated }, ipAddress: ip });
          return updated;
        } catch (e: any) {
          if (e?.code === "23505" || e?.cause?.code === "23505" || String(e?.message).includes("students_school_name_idx")) {
            throw new TRPCError({ code: "CONFLICT", message: `Student "${input.data.name}" already exists in class ${input.data.studyingClass} for this school` });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
        }
      }
      try {
        const [created] = await db.insert(students).values(input.data).returning();
        if (created)
          await db.insert(auditLogs).values({ userId: actorId, action: "create", entityType: "student", entityId: created.id, changes: { after: created }, ipAddress: ip });
        return created;
      } catch (e: any) {
        if (e?.code === "23505" || e?.cause?.code === "23505" || String(e?.message).includes("students_school_name_idx") || String(e?.message).includes("duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: `Student "${input.data.name}" already exists in class ${input.data.studyingClass} for this school` });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),
});

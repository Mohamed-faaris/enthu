import { eq } from "drizzle-orm";
import { db } from "@enthu/db";
import { auditLogs, students } from "@enthu/db/schema";
import { bibAssignSchema } from "@enthu/validators";
import { adminProcedure, router } from "../index";

export const bibRouter = router({
  assignBulk: adminProcedure.input(bibAssignSchema).mutation(async ({ input, ctx }) => {
    const actorId = (ctx.user as { id: string }).id;
    const headers = (ctx as unknown as { headers: Headers }).headers;
    const ip = headers?.get?.("x-forwarded-for") ?? null;
    const results = [];
    for (const a of input.assignments) {
      const [updated] = await db.update(students).set({ bibId: a.bibId }).where(eq(students.id, a.studentId)).returning();
      if (updated) {
        results.push(updated);
        await db.insert(auditLogs).values({
          userId: actorId,
          action: "update",
          entityType: "student",
          entityId: a.studentId,
          changes: { bibId: a.bibId },
          ipAddress: ip,
        });
      }
    }
    return { assigned: results.length };
  }),
});

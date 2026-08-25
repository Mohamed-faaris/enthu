import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@enthu/db";
import { user } from "@enthu/db/schema";
import { adminProcedure, protectedProcedure, router } from "../index";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const uid = (ctx.user as { id: string }).id;
    return db.query.user.findFirst({ where: eq(user.id, uid) });
  }),
  list: adminProcedure.query(async () => {
    return db.query.user.findMany({ with: { school: true, coordinatedEvents: true }, orderBy: (u, { asc }) => [asc(u.email)] });
  }),
  updateRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["admin", "school_spoc", "certificate_writer", "event_coordinator", "result_announcer"]), schoolId: z.string().uuid().nullable().optional() }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(user).set({ role: input.role, schoolId: input.schoolId ?? null }).where(eq(user.id, input.userId)).returning();
      return updated;
    }),
  assignCoordinator: adminProcedure
    .input(z.object({ userId: z.string(), eventId: z.string().uuid(), canEdit: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const { eventCoordinators } = await import("@enthu/db/schema");
      const [row] = await db.insert(eventCoordinators).values({ userId: input.userId, eventId: input.eventId, canEdit: input.canEdit }).onConflictDoNothing().returning();
      return row;
    }),
});

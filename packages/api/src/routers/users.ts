import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@enthu/db";
import { user } from "@enthu/db/schema";
import { auth } from "@enthu/auth";
import { adminProcedure, protectedProcedure, router } from "../index";

const ROLES = ["admin", "school_spoc", "certificate_writer", "event_coordinator", "result_announcer"] as const;

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
  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Enter a valid email"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(ROLES),
      schoolId: z.string().uuid().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const created = await auth.api.createUser({
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            role: input.role,
            data: input.schoolId ? { schoolId: input.schoolId } : undefined,
          },
          headers: ctx.headers,
        } as never);
        return (created as unknown as { user: { id: string; name: string; email: string; role: string } }).user;
      } catch (e) {
        const message = (e as { message?: string })?.message ?? "Failed to create user";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
  setPassword: adminProcedure
    .input(z.object({
      userId: z.string(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await auth.api.setUserPassword({
          body: { userId: input.userId, newPassword: input.password },
          headers: ctx.headers,
        });
        return { success: true as const };
      } catch (e) {
        const message = (e as { message?: string })?.message ?? "Failed to update password";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});

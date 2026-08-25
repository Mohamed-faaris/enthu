import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@enthu/db";
import { teams } from "@enthu/db/schema";
import { protectedProcedure, router } from "../index";

export const teamsRouter = router({
  listByEvent: protectedProcedure.input(z.object({ eventId: z.string().uuid() })).query(async ({ input }) => {
    return db.query.teams.findMany({
      where: eq(teams.eventId, input.eventId),
      with: { members: { with: { student: true } }, school: true },
    });
  }),
  listBySchool: protectedProcedure.input(z.object({ schoolId: z.string().uuid() })).query(async ({ input }) => {
    return db.query.teams.findMany({
      where: eq(teams.schoolId, input.schoolId),
      with: { members: { with: { student: true } }, event: true },
    });
  }),
  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    return db.query.teams.findFirst({ where: eq(teams.id, input.id), with: { members: { with: { student: true } } } });
  }),
});

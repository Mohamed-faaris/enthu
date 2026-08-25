import { eq } from "drizzle-orm";
import { db } from "@enthu/db";
import { events } from "@enthu/db/schema";
import { protectedProcedure, router } from "../index";
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
});

import { eq } from "drizzle-orm";
import { db } from "@enthu/db";
import { schools } from "@enthu/db/schema";
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
});

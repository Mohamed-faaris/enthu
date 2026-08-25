import { eq } from "drizzle-orm";
import { db } from "@enthu/db";
import { students } from "@enthu/db/schema";
import { adminProcedure, protectedProcedure, router } from "../index";
import { z } from "zod";

export const studentsRouter = router({
  listBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.students.findMany({
        where: eq(students.schoolId, input.schoolId),
        orderBy: (s, { asc }) => [asc(s.lastName), asc(s.firstName)],
      });
    }),
  adminList: adminProcedure.query(async () => {
    return db.query.students.findMany({
      with: { school: true },
      orderBy: (s, { asc }) => [asc(s.lastName)],
    });
  }),
});

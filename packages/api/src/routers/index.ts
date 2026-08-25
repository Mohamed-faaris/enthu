import { protectedProcedure, publicProcedure, router } from "../index";
import { auditRouter } from "./audit";
import { eventsRouter } from "./events";
import { registrationsRouter } from "./registrations";
import { schoolsRouter } from "./schools";
import { studentsRouter } from "./students";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  registrations: registrationsRouter,
  schools: schoolsRouter,
  events: eventsRouter,
  students: studentsRouter,
  audit: auditRouter,
});
export type AppRouter = typeof appRouter;

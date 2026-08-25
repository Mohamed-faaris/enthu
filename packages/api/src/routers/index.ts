import { protectedProcedure, publicProcedure, router } from "../index";
import { auditRouter } from "./audit";
import { bibRouter } from "./bib";
import { categoriesRouter } from "./categories";
import { eventsRouter } from "./events";
import { registrationsRouter } from "./registrations";
import { resultsRouter } from "./results";
import { schoolsRouter } from "./schools";
import { studentsRouter } from "./students";
import { teamsRouter } from "./teams";
import { usersRouter } from "./users";

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
  categories: categoriesRouter,
  teams: teamsRouter,
  results: resultsRouter,
  bib: bibRouter,
  users: usersRouter,
  audit: auditRouter,
});
export type AppRouter = typeof appRouter;

import { TRPCError } from "@trpc/server";
import { bibAssignSchema } from "@enthu/validators";
import { adminProcedure, router } from "../index";

export const bibRouter = router({
  assignBulk: adminProcedure.input(bibAssignSchema).mutation(async () => {
    throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "BIB field removed" });
  }),
});

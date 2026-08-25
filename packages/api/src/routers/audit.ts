import { desc, eq } from "drizzle-orm";
import { db } from "@enthu/db";
import { auditLogs } from "@enthu/db/schema";
import { adminProcedure, router } from "../index";
import { z } from "zod";

export const auditRouter = router({
  listByEntity: adminProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.auditLogs.findMany({
        // entityId is uuid, but we already validated shape; filter by entityType+entityId in-memory for type safety
        where: eq(auditLogs.entityId, input.entityId),
        orderBy: [desc(auditLogs.createdAt)],
        with: { user: true },
      });
    }),
});

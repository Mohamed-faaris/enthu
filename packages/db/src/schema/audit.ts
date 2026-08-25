import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { results } from "./schema";

/* ------------------------------------------------------------------ */
/*  General audit log — one row per notable action, on anything        */
/* ------------------------------------------------------------------ */

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_user_idx").on(t.userId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/*  Result edit log — field-level history for every change to a       */
/*  result, since scores/ranks/points are the most sensitive data.    */
/* ------------------------------------------------------------------ */

export const resultEditLogs = pgTable(
  "result_edit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => results.id, { onDelete: "cascade" }),
    editedByUserId: text("edited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    previousRawValue: numeric("previous_raw_value", { precision: 10, scale: 3 }),
    newRawValue: numeric("new_raw_value", { precision: 10, scale: 3 }),

    previousIsDisqualified: boolean("previous_is_disqualified"),
    newIsDisqualified: boolean("new_is_disqualified"),

    previousDisqualificationReason: varchar("previous_disqualification_reason", {
      length: 255,
    }),
    newDisqualificationReason: varchar("new_disqualification_reason", {
      length: 255,
    }),

    previousRank: integer("previous_rank"),
    newRank: integer("new_rank"),

    previousPoints: integer("previous_points"),
    newPoints: integer("new_points"),

    previousIsFinal: boolean("previous_is_final"),
    newIsFinal: boolean("new_is_final"),

    reason: varchar("reason", { length: 255 }),
    editedAt: timestamp("edited_at").notNull().defaultNow(),
  },
  (t) => [
    index("result_edit_logs_result_idx").on(t.resultId),
    index("result_edit_logs_editor_idx").on(t.editedByUserId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Relations                                                          */
/* ------------------------------------------------------------------ */

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(user, { fields: [auditLogs.userId], references: [user.id] }),
}));

export const resultEditLogsRelations = relations(resultEditLogs, ({ one }) => ({
  result: one(results, {
    fields: [resultEditLogs.resultId],
    references: [results.id],
  }),
  editor: one(user, {
    fields: [resultEditLogs.editedByUserId],
    references: [user.id],
  }),
}));

import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { resultEditLogs } from "./audit";

/* ------------------------------------------------------------------ */
/*  Enums                                                              */
/* ------------------------------------------------------------------ */

export const genderEnum = pgEnum("gender", ["male", "female", "mixed"]);

export const eventTypeEnum = pgEnum("event_type", ["individual", "team"]);

export const scoringTypeEnum = pgEnum("scoring_type", [
  "points",
  "time_distance",
  "judged",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "confirmed",
  "rejected",
  "withdrawn",
]);

/* ------------------------------------------------------------------ */
/*  Schools (tenants)                                                  */
/* ------------------------------------------------------------------ */

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Students                                                           */
/* ------------------------------------------------------------------ */

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    gender: genderEnum("gender").notNull(),
    studyingClass: integer("studying_class").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    schoolClassIdx: uniqueIndex("students_school_name_idx").on(
      t.schoolId,
      t.name,
      t.studyingClass,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/*  Categories (class-range grouping, e.g. "Sub-Junior" = classes 3-5) */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 150 }).notNull(),
    minClass: integer("min_class").notNull(),
    maxClass: integer("max_class").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    classRangeValid: check("class_range_valid", sql`${t.minClass} <= ${t.maxClass}`),
  }),
);

/* ------------------------------------------------------------------ */
/*  Events (belong to a category for class range; carry own gender     */
/*  restriction; individual or team)                                   */
/* ------------------------------------------------------------------ */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    gender: genderEnum("gender").notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    scoringType: scoringTypeEnum("scoring_type").notNull(),

    teamMinMembers: integer("team_min_members"),
    teamMaxMembers: integer("team_max_members"),

    minTeamsPerSchool: integer("min_teams_per_school"),
    maxTeamsPerSchool: integer("max_teams_per_school"),

    lowerScoreWins: boolean("lower_score_wins").notNull().default(false),

    registrationOpensAt: timestamp("registration_opens_at"),
    registrationClosesAt: timestamp("registration_closes_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    teamSizeValid: check(
      "team_size_valid",
      sql`${t.teamMinMembers} IS NULL OR ${t.teamMaxMembers} IS NULL OR ${t.teamMinMembers} <= ${t.teamMaxMembers}`,
    ),
    teamCountValid: check(
      "team_count_valid",
      sql`${t.minTeamsPerSchool} IS NULL OR ${t.maxTeamsPerSchool} IS NULL OR ${t.minTeamsPerSchool} <= ${t.maxTeamsPerSchool}`,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/*  Event points table — rank -> points, only used when                */
/*  events.scoringType = 'points'. Configurable per event.             */
/* ------------------------------------------------------------------ */

export const eventPointsTable = pgTable(
  "event_points_table",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    points: integer("points").notNull(),
  },
  (t) => ({
    uniqueRankPerEvent: uniqueIndex("event_points_rank_unique").on(t.eventId, t.rank),
    rankPositive: check("rank_positive", sql`${t.rank} > 0`),
    pointsNonNegative: check("points_non_negative", sql`${t.points} >= 0`),
  }),
);

/* ------------------------------------------------------------------ */
/*  Event rounds — for events run in stages (heats -> semis -> final). */
/* ------------------------------------------------------------------ */

export const eventRounds = pgTable(
  "event_rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    roundOrder: integer("round_order").notNull(),
    qualifiersCount: integer("qualifiers_count"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueOrderPerEvent: uniqueIndex("event_round_order_unique").on(
      t.eventId,
      t.roundOrder,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/*  Teams — a school's entry into a team event                        */
/* ------------------------------------------------------------------ */

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniqueMember: uniqueIndex("team_member_unique").on(t.teamId, t.studentId),
  }),
);

/* ------------------------------------------------------------------ */
/*  Registrations — the thing that gets scored                        */
/*  Exactly one of studentId / teamId is set, matching the event type  */
/* ------------------------------------------------------------------ */

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "cascade",
    }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    status: registrationStatusEnum("status").notNull().default("pending"),
    isAdminOverride: boolean("is_admin_override").notNull().default(false),
    overrideReason: varchar("override_reason", { length: 255 }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    lastEditedByUserId: text("last_edited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    exactlyOneEntrant: check(
      "exactly_one_entrant",
      sql`(${t.studentId} IS NOT NULL AND ${t.teamId} IS NULL) OR (${t.studentId} IS NULL AND ${t.teamId} IS NOT NULL)`,
    ),
    uniqueStudentEntry: uniqueIndex("reg_unique_student_event").on(
      t.eventId,
      t.studentId,
    ),
    uniqueTeamEntry: uniqueIndex("reg_unique_team_event").on(t.eventId, t.teamId),
    createdByIdx: index("registrations_created_by_idx").on(t.createdByUserId),
    lastEditedByIdx: index("registrations_last_edited_by_idx").on(
      t.lastEditedByUserId,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/*  Results                                                            */
/* ------------------------------------------------------------------ */

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    roundId: uuid("round_id").references(() => eventRounds.id, {
      onDelete: "cascade",
    }),
    rawValue: numeric("raw_value", { precision: 10, scale: 3 }),
    judgeBreakdown: jsonb("judge_breakdown"),

    isDisqualified: boolean("is_disqualified").notNull().default(false),
    disqualificationReason: varchar("disqualification_reason", { length: 255 }),

    rank: integer("rank"),
    points: integer("points"),

    isFinal: boolean("is_final").notNull().default(false),

    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    finalizedAt: timestamp("finalized_at"),
  },
  (t) => ({
    disqualifiedNoRank: check(
      "disqualified_no_rank",
      sql`${t.isDisqualified} = false OR ${t.rank} IS NULL`,
    ),
    uniqueResultPerRound: uniqueIndex("result_unique_registration_round").on(
      t.registrationId,
      t.roundId,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/*  Relations                                                          */
/* ------------------------------------------------------------------ */

export const schoolsRelations = relations(schools, ({ many }) => ({
  students: many(students),
  teams: many(teams),
  registrations: many(registrations),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  teamMemberships: many(teamMembers),
  registrations: many(registrations),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(categories, {
    fields: [events.categoryId],
    references: [categories.id],
  }),
  teams: many(teams),
  registrations: many(registrations),
  pointsTable: many(eventPointsTable),
  rounds: many(eventRounds),
}));

export const eventPointsTableRelations = relations(eventPointsTable, ({ one }) => ({
  event: one(events, { fields: [eventPointsTable.eventId], references: [events.id] }),
}));

export const eventRoundsRelations = relations(eventRounds, ({ one, many }) => ({
  event: one(events, { fields: [eventRounds.eventId], references: [events.id] }),
  results: many(results),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  event: one(events, { fields: [teams.eventId], references: [events.id] }),
  school: one(schools, { fields: [teams.schoolId], references: [schools.id] }),
  members: many(teamMembers),
  registration: many(registrations),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  student: one(students, {
    fields: [teamMembers.studentId],
    references: [students.id],
  }),
}));

export const registrationsRelations = relations(registrations, ({ one, many }) => ({
  event: one(events, { fields: [registrations.eventId], references: [events.id] }),
  school: one(schools, { fields: [registrations.schoolId], references: [schools.id] }),
  student: one(students, {
    fields: [registrations.studentId],
    references: [students.id],
  }),
  team: one(teams, { fields: [registrations.teamId], references: [teams.id] }),
  createdBy: one(user, {
    fields: [registrations.createdByUserId],
    references: [user.id],
  }),
  lastEditedBy: one(user, {
    fields: [registrations.lastEditedByUserId],
    references: [user.id],
  }),
  results: many(results),
}));

export const resultsRelations = relations(results, ({ one, many }) => ({
  registration: one(registrations, {
    fields: [results.registrationId],
    references: [registrations.id],
  }),
  round: one(eventRounds, {
    fields: [results.roundId],
    references: [eventRounds.id],
  }),
  editLogs: many(resultEditLogs),
}));

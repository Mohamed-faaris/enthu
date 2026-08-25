import { z } from "zod";

export const registrationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "rejected",
  "withdrawn",
]);

export const checkEligibilitySchema = z.object({
  eventId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  teamMemberIds: z.array(z.string().uuid()).optional(),
});

export type CheckEligibilityInput = z.infer<typeof checkEligibilitySchema>;

export const checkEligibilityOutputSchema = z.object({
  eligible: z.boolean(),
  reasons: z.array(z.string()),
  studentGender: z.enum(["male", "female", "mixed"]).optional(),
  eventGender: z.enum(["male", "female", "mixed"]).optional(),
  studyingClass: z.number().int().optional(),
  categoryRange: z
    .object({ minClass: z.number().int(), maxClass: z.number().int() })
    .optional(),
  registrationClosesAt: z.string().nullable().optional(),
  isDeadlinePassed: z.boolean().optional(),
});

export const adminUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    schoolId: z.string().uuid(),
    eventId: z.string().uuid(),
    studentId: z.string().uuid().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    teamName: z.string().max(150).nullable().optional(),
    teamMemberIds: z.array(z.string().uuid()).optional(),
    status: registrationStatusSchema.default("pending"),
    overrideReason: z.string().max(255).nullable().optional(),
  })
  .refine(
    (d) => {
      const hasStudent = !!d.studentId;
      const hasTeam = !!d.teamId || (!!d.teamMemberIds && d.teamMemberIds.length > 0);
      return (hasStudent && !hasTeam) || (!hasStudent && hasTeam);
    },
    { message: "Exactly one of studentId or team must be provided", path: ["studentId"] }
  );

export type AdminUpsertInput = z.infer<typeof adminUpsertSchema>;

export const adminListFiltersSchema = z.object({
  schoolId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: registrationStatusSchema.optional(),
  isAdminOverride: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export type AdminListFilters = z.infer<typeof adminListFiltersSchema>;

export const idSchema = z.object({ id: z.string().uuid() });

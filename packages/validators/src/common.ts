import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const schoolSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  contactEmail: z.email().max(255).nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  isActive: z.boolean().default(true).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(150),
  minClass: z.number().int().min(1).max(12),
  maxClass: z.number().int().min(1).max(12),
});

export const eventSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(150),
  gender: z.enum(["male", "female", "mixed"]),
  eventType: z.enum(["individual", "team"]),
  scoringType: z.enum(["points", "time_distance", "judged"]),
  teamMinMembers: z.number().int().min(1).nullable().optional(),
  teamMaxMembers: z.number().int().min(1).nullable().optional(),
  minTeamsPerSchool: z.number().int().min(1).nullable().optional(),
  maxTeamsPerSchool: z.number().int().min(1).nullable().optional(),
  lowerScoreWins: z.boolean().default(false).optional(),
  registrationOpensAt: z.coerce.date().nullable().optional(),
  registrationClosesAt: z.coerce.date().nullable().optional(),
});

export const studentSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(1).max(200),
  gender: z.enum(["male", "female"]),
  studyingClass: z.number().int().min(1).max(12),
});

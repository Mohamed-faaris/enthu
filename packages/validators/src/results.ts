import { z } from "zod";

export const resultInputSchema = z.object({
  registrationId: z.string().uuid(),
  roundId: z.string().uuid().nullable().optional(),
  rawValue: z.string().nullable().optional(), // numeric(10,3) as string
  judgeBreakdown: z.unknown().nullable().optional(),
  isDisqualified: z.boolean().default(false).optional(),
  disqualificationReason: z.string().max(255).nullable().optional(),
  rank: z.number().int().min(1).nullable().optional(),
  points: z.number().int().min(0).nullable().optional(),
  isFinal: z.boolean().default(false).optional(),
});

export const finalizeInputSchema = z.object({
  eventId: z.string().uuid(),
  roundId: z.string().uuid().nullable().optional(),
  // rank->points auto-lookup if points type; else manual rank/points map
  entries: z.array(
    z.object({
      registrationId: z.string().uuid(),
      rank: z.number().int().min(1).nullable().optional(),
      points: z.number().int().min(0).nullable().optional(),
    })
  ),
  reason: z.string().max(255).nullable().optional(),
});

export const bibAssignSchema = z.object({
  assignments: z.array(
    z.object({
      studentId: z.string().uuid(),
      bibId: z.string().max(20).min(1),
    })
  ),
});

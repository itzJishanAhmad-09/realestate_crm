import { z } from "zod";
import { normalizePhoneIN } from "@/lib/phone";

export const phoneSchema = z.string().transform((v, ctx) => {
  const n = normalizePhoneIN(v);
  if (!n) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Indian phone number" });
    return z.NEVER;
  }
  return n;
});

export const leadInputSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  phone: phoneSchema,
  alt_phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  locality: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  source_id: z.string().uuid().optional(),
  campaign: z.string().max(200).optional(),
  project_id: z.string().uuid().optional(),
  property_type: z.enum(["1bhk","2bhk","3bhk","4bhk","villa","plot","commercial","shop"]).optional(),
  budget_min: z.number().int().nonnegative().optional(),
  budget_max: z.number().int().nonnegative().optional(),
  purpose: z.enum(["self_use","investment"]).optional(),
  possession_timeline: z.enum(["immediate","under_construction","flexible"]).optional(),
  preferred_location: z.string().max(200).optional(),
  loan_required: z.boolean().optional(),
  occupation: z.string().max(100).optional(),
  status_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable().optional(),
  next_followup_at: z.string().datetime().optional(),
  remarks: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.string(), z.any()).default({}),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

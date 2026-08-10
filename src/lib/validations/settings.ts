import { z } from "zod";

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
});
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

export const preferencesSchema = z.object({
  theme: z.enum(["paper", "midnight", "slate", "sepia", "contrast"]).optional(),
  locale: z.enum(["en", "hi", "es", "fr"]).optional(),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;

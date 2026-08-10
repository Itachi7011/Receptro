import { z } from "zod";

export const dealerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type DealerInput = z.infer<typeof dealerSchema>;

export const dealerUpdateSchema = dealerSchema.partial();
export type DealerUpdateInput = z.infer<typeof dealerUpdateSchema>;

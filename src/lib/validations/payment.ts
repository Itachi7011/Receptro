import { z } from "zod";

const objectId = z.string().uuid("Invalid id");

export const paymentSchema = z.object({
  invoice: objectId,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.coerce.date(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "UPI", "OTHER"]).default("BANK_TRANSFER"),
  referenceNumber: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

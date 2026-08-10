import { z } from "zod";

const objectId = z.string().uuid("Invalid id");

export const invoiceSchema = z
  .object({
    dealer: objectId,
    invoiceNumber: z.string().trim().min(1).max(60),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    attachmentUrl: z.string().url().optional().or(z.literal("")),
    attachmentPublicId: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
  });
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoiceUpdateSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(60).optional(),
  amount: z.coerce.number().positive().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

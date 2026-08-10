export type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID";

export function computeInvoiceStatus(amount: number, paidAmount: number): InvoiceStatus {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount >= amount) return "PAID";
  return "PARTIAL";
}

export function daysOverdue(dueDate: Date, asOf: Date = new Date()): number {
  const diffMs = asOf.setHours(0, 0, 0, 0) - new Date(dueDate).setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export type AgingBucketKey = "current" | "1-30" | "31-60" | "61-90" | "90+";

export function agingBucket(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

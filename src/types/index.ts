export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyName: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  theme: "paper" | "midnight" | "slate" | "sepia" | "contrast";
  locale: "en" | "hi" | "es" | "fr";
}

export interface Dealer {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  creditLimit: number;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface Invoice {
  id: string;
  dealer: Dealer | string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI" | "OTHER";

export interface Payment {
  id: string;
  dealer: Dealer | string;
  invoice: Invoice | string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DashboardSummary {
  totalOutstanding: number;
  outstandingInvoiceCount: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
  dueSoonAmount: number;
  dueSoonInvoiceCount: number;
  dealerCount: number;
  invoiceCount: number;
  recentPayments: Payment[];
  topOverdueDealers: { dealerId: string; name: string; outstanding: number; invoiceCount: number }[];
}

export type AgingBucketKey = "current" | "1-30" | "31-60" | "61-90" | "90+";

export interface AgingRow {
  dealerId: string;
  name: string;
  buckets: Record<AgingBucketKey, number>;
  total: number;
}

export interface AgingReport {
  rows: AgingRow[];
  totals: Record<AgingBucketKey, number>;
  grandTotal: number;
  asOf: string;
}

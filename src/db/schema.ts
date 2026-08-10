import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["OWNER", "ADMIN", "STAFF"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);
export const dealerStatusEnum = pgEnum("dealer_status", ["ACTIVE", "INACTIVE"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["UNPAID", "PARTIAL", "PAID"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI",
  "OTHER",
]);
export const themeEnum = pgEnum("theme_preference", [
  "paper",
  "midnight",
  "slate",
  "sepia",
  "contrast",
]);
export const localeEnum = pgEnum("locale_preference", ["en", "hi", "es", "fr"]);

// Numeric money columns use mode: "number" so the app works with plain JS
// numbers everywhere (matches ₹ amounts well within float precision for
// this use case) instead of juggling strings at every call site.

// A business is the tenant boundary: every dealer/invoice/payment/user
// belongs to exactly one business. This is what lets a business have more
// than one login (OWNER + ADMIN + STAFF) sharing the same data.
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  gstNumber: varchar("gst_number", { length: 20 }),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").notNull().default("OWNER"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  isVerified: boolean("is_verified").notNull().default(false),
  theme: themeEnum("theme").notNull().default("paper"),
  locale: localeEnum("locale").notNull().default("en"),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  otpLastSentAt: timestamp("otp_last_sent_at", { withTimezone: true }),
  invitedByUserId: uuid("invited_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("users_email_key").on(table.email),
  index("users_business_idx").on(table.businessId),
]));

export const dealers = pgTable("dealers", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  contactPerson: varchar("contact_person", { length: 120 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 160 }),
  address: text("address"),
  gstNumber: varchar("gst_number", { length: 20 }),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  status: dealerStatusEnum("status").notNull().default("ACTIVE"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  index("dealers_business_name_idx").on(table.businessId, table.name),
]));

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  dealerId: uuid("dealer_id")
    .notNull()
    .references(() => dealers.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 60 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("UNPAID"),
  attachmentUrl: text("attachment_url"),
  attachmentPublicId: text("attachment_public_id"),
  notes: text("notes"),
  lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("invoices_business_invoice_number_key").on(table.businessId, table.invoiceNumber),
  index("invoices_business_due_date_idx").on(table.businessId, table.dueDate),
  index("invoices_business_status_idx").on(table.businessId, table.status),
]));

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  dealerId: uuid("dealer_id")
    .notNull()
    .references(() => dealers.id, { onDelete: "restrict" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  method: paymentMethodEnum("method").notNull().default("BANK_TRANSFER"),
  referenceNumber: varchar("reference_number", { length: 80 }),
  notes: text("notes"),
  recordedByUserId: uuid("recorded_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  index("payments_business_payment_date_idx").on(table.businessId, table.paymentDate),
  index("payments_dealer_idx").on(table.dealerId),
]));

// Audit trail for accountability across a multi-user business — who did
// what, when. `metadata` holds a small JSON snapshot (e.g. amounts changed).
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorName: varchar("actor_name", { length: 120 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: uuid("entity_id"),
  entityLabel: varchar("entity_label", { length: 160 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  index("audit_logs_business_created_idx").on(table.businessId, table.createdAt),
]));

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  dealers: many(dealers),
  invoices: many(invoices),
  payments: many(payments),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, { fields: [users.businessId], references: [businesses.id] }),
}));

export const dealersRelations = relations(dealers, ({ one, many }) => ({
  business: one(businesses, { fields: [dealers.businessId], references: [businesses.id] }),
  invoices: many(invoices),
  payments: many(payments),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, { fields: [invoices.businessId], references: [businesses.id] }),
  dealer: one(dealers, { fields: [invoices.dealerId], references: [dealers.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  business: one(businesses, { fields: [payments.businessId], references: [businesses.id] }),
  dealer: one(dealers, { fields: [payments.dealerId], references: [dealers.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  business: one(businesses, { fields: [auditLogs.businessId], references: [businesses.id] }),
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

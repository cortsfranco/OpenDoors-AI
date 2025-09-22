import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const invoiceTypeEnum = pgEnum('invoice_type', ['income', 'expense', 'neutral']);
export const invoiceClassEnum = pgEnum('invoice_class', ['A', 'B', 'C']);
export const clientTypeEnum = pgEnum('client_type', ['client', 'provider', 'both']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer']);
export const actionTypeEnum = pgEnum('action_type', ['create', 'update', 'delete', 'upload', 'login', 'logout', 'import', 'export']);
export const uploadJobStatusEnum = pgEnum('upload_job_status', ['queued', 'processing', 'success', 'duplicate', 'error', 'quarantined']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'overdue', 'cancelled']);
export const reviewStatusEnum = pgEnum('review_status', ['approved', 'pending_review', 'draft']);
export const fiscalPeriodEnum = pgEnum('fiscal_period', ['calendar', 'may_april']);
export const decimalSeparatorEnum = pgEnum('decimal_separator', [',', '.']);
export const thousandSeparatorEnum = pgEnum('thousand_separator', ['.', ',', ' ', 'none']);
export const currencyPositionEnum = pgEnum('currency_position', ['before', 'after']);
export const roundingModeEnum = pgEnum('rounding_mode', ['round', 'ceil', 'floor']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  companyLogo: text("company_logo"),
  role: userRoleEnum("role").notNull().default('viewer'),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  fiscalPeriod: fiscalPeriodEnum("fiscal_period").notNull().default('calendar'),
  // Numeric/Arithmetic configuration settings
  decimalSeparator: decimalSeparatorEnum("decimal_separator").notNull().default(','),
  thousandSeparator: thousandSeparatorEnum("thousand_separator").notNull().default('.'),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  currencySymbol: text("currency_symbol").notNull().default('$'),
  currencyPosition: currencyPositionEnum("currency_position").notNull().default('before'),
  roundingMode: roundingModeEnum("rounding_mode").notNull().default('round'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientsProviders = pgTable("clients_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cuit: text("cuit").unique(),
  type: clientTypeEnum("type").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  totalOperations: decimal("total_operations", { precision: 15, scale: 2 }).default('0'),
  lastInvoiceDate: timestamp("last_invoice_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: invoiceTypeEnum("type").notNull(),
  invoiceClass: invoiceClassEnum("invoice_class").notNull().default('A'),
  invoiceNumber: text("invoice_number"),
  description: text("description"), // Product/service description
  date: timestamp("date"), // Allow null when date cannot be extracted
  clientProviderId: varchar("client_provider_id").references(() => clientsProviders.id),
  clientProviderName: text("client_provider_name").notNull(), // For cases where client is not in our database
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  ivaAmount: decimal("iva_amount", { precision: 15, scale: 2 }).notNull(),
  iibbAmount: decimal("iibb_amount", { precision: 15, scale: 2 }).default('0'),
  gananciasAmount: decimal("ganancias_amount", { precision: 15, scale: 2 }).default('0'),
  otherTaxes: decimal("other_taxes", { precision: 15, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default('pending'),
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  ownerName: text("owner_name"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"), // File size in bytes for duplicate detection
  fingerprint: varchar('fingerprint', { length: 64 }).notNull().unique(), // SHA-256 es de 64 caracteres
  extractedData: text("extracted_data"), // JSON string of AI extracted data
  processed: boolean("processed").default(false),
  needsReview: boolean("needs_review").notNull().default(false),
  reviewStatus: reviewStatusEnum("review_status").notNull().default('approved'), // New: más granular que needsReview
  extractionConfidence: decimal("extraction_confidence", { precision: 5, scale: 2 }).default('95.0'),
  aiExtracted: boolean("ai_extracted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  userName: text("user_name").notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  entityType: text("entity_type").notNull(), // 'invoice', 'client_provider', 'user', etc.
  entityId: varchar("entity_id"),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string with additional data
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// IVA Components table for gradual IVA management
export const ivaComponents = pgTable("iva_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(), // 21%, 10.5%, etc
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deletedInvoicesLog = pgTable("deleted_invoices_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalInvoiceId: varchar("original_invoice_id").notNull(),
  type: invoiceTypeEnum("type").notNull(),
  invoiceClass: invoiceClassEnum("invoice_class").notNull().default('A'),
  invoiceNumber: text("invoice_number"),
  description: text("description"), // Product/service description
  date: timestamp("date"),
  clientProviderName: text("client_provider_name").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  ivaAmount: decimal("iva_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  deletedBy: varchar("deleted_by").references(() => users.id).notNull(),
  deletedByName: text("deleted_by_name").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  originalData: text("original_data").notNull(), // JSON string of complete original invoice
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  uploadedInvoices: many(invoices),
  deletedInvoices: many(deletedInvoicesLog),
  activityLogs: many(activityLogs),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const clientsProvidersRelations = relations(clientsProviders, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  clientProvider: one(clientsProviders, {
    fields: [invoices.clientProviderId],
    references: [clientsProviders.id],
  }),
  uploadedByUser: one(users, {
    fields: [invoices.uploadedBy],
    references: [users.id],
  }),
  owner: one(users, {
    fields: [invoices.ownerId],
    references: [users.id],
  }),
  ivaComponents: many(ivaComponents),
}));

export const ivaComponentsRelations = relations(ivaComponents, ({ one }) => ({
  invoice: one(invoices, {
    fields: [ivaComponents.invoiceId],
    references: [invoices.id],
  }),
}));

export const deletedInvoicesLogRelations = relations(deletedInvoicesLog, ({ one }) => ({
  deletedByUser: one(users, {
    fields: [deletedInvoicesLog.deletedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertClientProviderSchema = createInsertSchema(clientsProviders).omit({
  id: true,
  totalOperations: true,
  lastInvoiceDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  processed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIvaComponentSchema = createInsertSchema(ivaComponents).omit({
  id: true,
  createdAt: true,
});

export const insertDeletedInvoiceLogSchema = createInsertSchema(deletedInvoicesLog).omit({
  id: true,
  deletedAt: true,
});

// User configuration schema for numeric/arithmetic settings
export const userConfigSchema = z.object({
  decimalSeparator: z.enum([',', '.']),
  thousandSeparator: z.enum(['.', ',', ' ', 'none']),
  decimalPlaces: z.number().min(0).max(6),
  currencySymbol: z.string().max(10),
  currencyPosition: z.enum(['before', 'after']),
  roundingMode: z.enum(['round', 'ceil', 'floor']),
  fiscalPeriod: z.enum(['calendar', 'may_april']),
});

// Schema for partial user configuration updates with validation
export const userConfigUpdateSchema = userConfigSchema
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: "At least one configuration field must be provided"
  })
  .refine(data => {
    if (data.thousandSeparator && data.decimalSeparator && data.thousandSeparator !== 'none') {
      return data.thousandSeparator !== data.decimalSeparator;
    }
    return true;
  }, {
    message: "Thousand separator cannot be the same as decimal separator"
  })
  .transform(data => ({
    ...data,
    decimalPlaces: data.decimalPlaces !== undefined ? Number(data.decimalPlaces) : undefined
  }));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserConfig = z.infer<typeof userConfigSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type ClientProvider = typeof clientsProviders.$inferSelect;
export type InsertClientProvider = z.infer<typeof insertClientProviderSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type IvaComponent = typeof ivaComponents.$inferSelect;
export type InsertIvaComponent = z.infer<typeof insertIvaComponentSchema>;

export type DeletedInvoiceLog = typeof deletedInvoicesLog.$inferSelect;
export type InsertDeletedInvoiceLog = z.infer<typeof insertDeletedInvoiceLogSchema>;

// Invoice templates table - for quick invoice creation
export const invoiceTemplates = pgTable("invoice_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default('custom'), // 'service', 'product', 'recurring', 'custom'
  type: invoiceTypeEnum("type").notNull(), // 'income' | 'expense' 
  invoiceClass: invoiceClassEnum("invoice_class").notNull().default('A'), // 'A', 'B', 'C'
  clientProviderName: text("client_provider_name"),
  clientProviderCuit: text("client_provider_cuit"),
  defaultSubtotal: decimal("default_subtotal", { precision: 15, scale: 2 }).notNull().default('0'),
  defaultIvaPercentage: decimal("default_iva_percentage", { precision: 5, scale: 2 }).notNull().default('21'),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one }) => ({
  user: one(users, {
    fields: [invoiceTemplates.userId],
    references: [users.id],
  }),
}));

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;
export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;

// Upload jobs table - for persistent upload queue
export const uploadJobs = pgTable("upload_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fingerprint: text("fingerprint").notNull().unique(),
  status: uploadJobStatusEnum("status").notNull().default('queued'),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  error: text("error"),
  filePath: text("file_path").notNull(),
  uploadedByName: text("uploaded_by_name"),
  ownerName: text("owner_name"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  lastRetryAt: timestamp("last_retry_at"),
  quarantinedAt: timestamp("quarantined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploadJobsRelations = relations(uploadJobs, ({ one }) => ({
  user: one(users, {
    fields: [uploadJobs.userId],
    references: [users.id],
  }),
  invoice: one(invoices, {
    fields: [uploadJobs.invoiceId],
    references: [invoices.id],
  }),
}));

export const insertUploadJobSchema = createInsertSchema(uploadJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UploadJob = typeof uploadJobs.$inferSelect;
export type InsertUploadJob = z.infer<typeof insertUploadJobSchema>;

// Extended types for API responses
export type InvoiceWithRelations = Invoice & {
  clientProvider?: ClientProvider;
  uploadedByUser?: User;
  ivaComponents?: IvaComponent[];
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type UserSession = {
  id: string;
  email: string;
  displayName: string;
  avatar?: string | null;
  role: 'admin' | 'editor' | 'viewer';
  // User configuration fields
  decimalSeparator?: ',' | '.';
  thousandSeparator?: '.' | ',' | ' ' | 'none';
  decimalPlaces?: number;
  currencySymbol?: string;
  currencyPosition?: 'before' | 'after';
  roundingMode?: 'round' | 'ceil' | 'floor';
  fiscalPeriod?: 'calendar' | 'may_april';
};

export type KPIData = {
  totalIncome: string;
  totalExpenses: string;
  ivaBalance: string;
  generalBalance: string;
  incomeChange: string;
  expensesChange: string;
  profitability: string;
};

export type ChartData = {
  month: string;
  income: number;
  expenses: number;
};

export type QuickStatsData = {
  invoicesThisMonth: number;
  averageInvoice: string;
  ivaRecovered: string;
  pending: number;
  profitability: string;
};

export type FiscalPeriodData = {
  startMonth: number; // 1-12
  startYear: number;
  endMonth: number;
  endYear: number;
};

export type ExportData = {
  invoices: Invoice[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalIVA: number;
    totalGanancias: number;
    netProfit: number;
  };
  period: FiscalPeriodData;
};

// Validation schemas for API routes
export const fiscalPeriodQuerySchema = z.object({
  startMonth: z.coerce.number().min(1).max(12),
  startYear: z.coerce.number().min(2020).max(2100),
  endMonth: z.coerce.number().min(1).max(12),
  endYear: z.coerce.number().min(2020).max(2100)
}).refine(data => {
  // Validate May-April fiscal period logic
  if (data.startMonth !== 5) {
    return false; // Fiscal period must start in May
  }
  if (data.endMonth !== 4) {
    return false; // Fiscal period must end in April
  }
  if (data.endYear !== data.startYear + 1) {
    return false; // End year must be one year after start year
  }
  return true;
}, {
  message: "Invalid fiscal period. Must be May-April (e.g., May 2024 - April 2025)"
});

export const ivaComponentCreateSchema = z.object({
  description: z.string().min(1).max(255),
  percentage: z.number().min(0).max(100),
  amount: z.number().min(0)
});

export const paymentStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
  paymentDate: z.string().datetime().optional()
});

export const excelImportSchema = z.object({
  data: z.array(z.object({
    invoiceNumber: z.string(),
    date: z.string(),
    type: z.enum(['income', 'expense', 'neutral']),
    issuer: z.string(),
    clientName: z.string(),
    cuit: z.string().optional(),
    subtotal: z.number(),
    ivaAmount: z.number(),
    totalAmount: z.number(),
    invoiceClass: z.enum(['A', 'B', 'C']).optional(),
    iibbAmount: z.number().optional(),
    gananciasAmount: z.number().optional(),
    otherTaxes: z.number().optional()
  }))
});

// AI Feedback table for tracking corrections and improvements
export const aiFeedback = pgTable("ai_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  originalData: text("original_data").notNull(), // JSON of original AI extraction
  correctedData: text("corrected_data").notNull(), // JSON of user corrections
  feedbackType: text("feedback_type").notNull(), // 'correction', 'approval', 'flag'
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Data backups table for audit and recovery
export const dataBackups = pgTable("data_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  description: text("description").notNull(),
  backupType: text("backup_type").notNull(), // 'manual', 'auto', 'pre-reset'
  fileSize: integer("file_size").notNull(),
  recordCount: integer("record_count").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdByName: text("created_by_name").notNull(),
  filePath: text("file_path").notNull(), // Path where backup is stored
  metadata: text("metadata"), // JSON with additional backup info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

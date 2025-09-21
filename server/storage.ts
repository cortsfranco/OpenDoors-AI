import {
  users,
  clientsProviders,
  invoices,
  deletedInvoicesLog,
  activityLogs,
  ivaComponents,
  invoiceTemplates,
  dataBackups,
  aiFeedback,
  type User,
  type InsertUser,
  type ClientProvider,
  type InsertClientProvider,
  type Invoice,
  type InsertInvoice,
  type DeletedInvoiceLog,
  type InsertDeletedInvoiceLog,
  type ActivityLog,
  type InsertActivityLog,
  type InvoiceWithRelations,
  type KPIData,
  type ChartData,
  type QuickStatsData,
  type IvaComponent,
  type InsertIvaComponent,
  type InvoiceTemplate,
  type InsertInvoiceTemplate,
  type FiscalPeriodData,
  type ExportData,
  uploadJobs,
  type UploadJob,
  type InsertUploadJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, gte, lte, ilike, or } from "drizzle-orm";
import fs from "fs";
import path from "path";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserAvatar(id: string, avatarPath: string): Promise<void>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  deleteUser(id: string): Promise<boolean>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserConfiguration(id: string, config: {
    decimalSeparator?: ',' | '.';
    thousandSeparator?: '.' | ',' | ' ' | 'none';
    decimalPlaces?: number;
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after';
    roundingMode?: 'round' | 'ceil' | 'floor';
    fiscalPeriod?: 'calendar' | 'may_april';
  }): Promise<User | undefined>;

  // Clients and Providers
  getAllClientsProviders(): Promise<ClientProvider[]>;
  getClientProvider(id: string): Promise<ClientProvider | undefined>;
  getClientProviderByName(name: string): Promise<ClientProvider | undefined>;
  createClientProvider(clientProvider: InsertClientProvider): Promise<ClientProvider>;
  updateClientProvider(id: string, updates: Partial<InsertClientProvider>): Promise<ClientProvider | undefined>;
  deleteClientProvider(id: string): Promise<{ success: boolean; error?: string; invoiceCount?: number }>;

  // Invoices
  getAllInvoices(filters?: {
    search?: string;
    month?: number;
    year?: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
    user?: string;
    type?: 'income' | 'expense' | 'neutral' | 'all';
    invoiceClass?: 'A' | 'B' | 'C' | 'all';
    paymentStatus?: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'all';
    ownerName?: string;
    startDate?: string;
    endDate?: string;
    amountMin?: number;
    amountMax?: number;
    clientProvider?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'amount' | 'client' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ invoices: InvoiceWithRelations[]; total: number }>;
  getInvoice(id: string): Promise<InvoiceWithRelations | undefined>;
  getRecentInvoices(limit?: number): Promise<InvoiceWithRelations[]>;
  findInvoiceByFileInfo(fileName: string, fileSize: number): Promise<Invoice | undefined>;
  findInvoiceByFingerprint(fingerprint: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, deletedBy: string, deletedByName: string): Promise<boolean>;
  restoreInvoice(deletedInvoiceId: string): Promise<boolean>;

  // Deleted invoices
  getDeletedInvoices(): Promise<DeletedInvoiceLog[]>;
  permanentlyDeleteInvoice(deletedInvoiceId: string): Promise<boolean>;
  emptyTrash(): Promise<boolean>;

  // Analytics
  getKPIData(): Promise<KPIData>;
  getFilteredKPIData(month?: number, year?: number): Promise<KPIData>;
  getKPIDataByFiscalPeriod(startMonth: number, startYear: number, endMonth: number, endYear: number, filters?: {
    ownerName?: string;
    clientProviderName?: string;
    type?: 'income' | 'expense';
  }): Promise<KPIData>;
  getChartData(): Promise<ChartData[]>;
  getChartDataByFiscalPeriod(fiscalPeriod: FiscalPeriodData, filters?: {
    ownerName?: string;
    clientProviderName?: string;
    type?: 'income' | 'expense';
  }): Promise<ChartData[]>;
  getQuickStats(): Promise<QuickStatsData>;
  
  // IVA Components
  createIvaComponent(component: InsertIvaComponent): Promise<IvaComponent>;
  getIvaComponentsByInvoice(invoiceId: string): Promise<IvaComponent[]>;
  deleteIvaComponentsByInvoice(invoiceId: string): Promise<void>;
  
  // Payment Management
  updateInvoicePaymentStatus(invoiceId: string, status: 'pending' | 'paid' | 'overdue' | 'cancelled', paymentDate?: Date): Promise<void>;
  getOverdueInvoices(): Promise<Invoice[]>;
  
  // Export/Import
  exportInvoiceData(fiscalPeriod?: FiscalPeriodData): Promise<ExportData>;
  importInvoiceData(data: any[], userId?: string, userName?: string): Promise<{ success: number; failed: number; errors: string[]; details: any[] }>;
  
  // Advanced import with preview and conflict resolution
  previewImportData(data: any[], userId?: string): Promise<{
    summary: {
      total: number;
      newRecords: number;
      duplicates: number;
      conflicts: number;
      errors: number;
    };
    conflicts: Array<{
      row: number;
      type: 'duplicate' | 'conflict';
      existing: any;
      incoming: any;
      uniqueKey: string;
    }>;
    errors: Array<{
      row: number;
      error: string;
      data: any;
    }>;
  }>;
  
  commitImportData(data: any[], options: {
    userId: string;
    userName: string;
    duplicateMode: 'skip' | 'update' | 'duplicate';
    createBackup?: boolean;
  }): Promise<{
    success: number;
    failed: number;
    updated: number;
    skipped: number;
    errors: string[];
    backupId?: string;
  }>;
  
  // Backup and rollback functionality
  createImportBackup(description: string, userId: string, userName: string): Promise<string>;
  rollbackFromBackup(backupId: string, userId: string): Promise<boolean>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(filters?: {
    userId?: string;
    entityType?: string;
    actionType?: 'create' | 'update' | 'delete' | 'upload' | 'login' | 'logout' | 'import' | 'export';
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]>;

  // User Statistics
  getUserStatistics(userId: string, days: number): Promise<any>;
  getOwnerStatistics(): Promise<any[]>;
  getClientProviderStatistics(): Promise<any[]>;
  getIVABreakdownByClass(): Promise<{A: number, B: number, C: number, total: number}>;
  
  // Invoice Templates
  getInvoiceTemplates(userId: string): Promise<InvoiceTemplate[]>;
  getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined>;
  createInvoiceTemplate(template: InsertInvoiceTemplate): Promise<InvoiceTemplate>;
  updateInvoiceTemplate(id: string, updates: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined>;
  deleteInvoiceTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;

  // Admin Operations
  createDataBackup(): Promise<{ backupId: string; filename: string; size: number; filePath: string }>;
  resetTestData(adminUserId: string): Promise<{ deletedInvoices: number; deletedClients: number; deletedLogs: number }>;
  getSystemMetrics(): Promise<{
    totalUsers: number;
    totalInvoices: number;
    totalClients: number;
    diskUsage: number;
    aiExtractionAccuracy: number;
  }>;
  
  // Google Sheets Export
  exportToGoogleSheets(): Promise<ExportData[]>;
  getExportableData(): Promise<ExportData[]>;

  // AI Feedback and Review Queue
  markInvoiceForReview(invoiceId: string, reason: string, userId: string): Promise<void>;
  getInvoicesNeedingReview(): Promise<InvoiceWithRelations[]>;
  getInvoicesPendingReview(): Promise<InvoiceWithRelations[]>;
  submitAIFeedback(invoiceId: string, corrections: any, userId: string): Promise<void>;
  getAIFeedbackStats(): Promise<{
    totalReviewed: number;
    correctExtractions: number;
    incorrectExtractions: number;
    accuracyRate: number;
  }>;

  // Upload Jobs
  createUploadJob(job: InsertUploadJob): Promise<UploadJob>;
  getUploadJob(id: string): Promise<UploadJob | undefined>;
  updateUploadJob(id: string, updates: Partial<InsertUploadJob>): Promise<UploadJob | undefined>;
  deleteUploadJob(id: string): Promise<boolean>;
  getRecentUploadJobs(userId: string, minutes?: number): Promise<UploadJob[]>;
  getPendingUploadJobs(): Promise<UploadJob[]>;
  getUploadJobsByStatus(status: 'queued' | 'processing' | 'success' | 'duplicate' | 'error' | 'quarantined'): Promise<UploadJob[]>;
  quarantineUploadJob(id: string): Promise<UploadJob | undefined>;
  retryUploadJob(id: string): Promise<UploadJob | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.displayName);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateUserAvatar(id: string, avatarPath: string): Promise<void> {
    await db
      .update(users)
      .set({ avatar: avatarPath })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<boolean> {
    // First delete all activity logs for this user to avoid foreign key constraint
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    
    // Then delete the user
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserConfiguration(id: string, config: {
    decimalSeparator?: ',' | '.';
    thousandSeparator?: '.' | ',' | ' ' | 'none';
    decimalPlaces?: number;
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after';
    roundingMode?: 'round' | 'ceil' | 'floor';
    fiscalPeriod?: 'calendar' | 'may_april';
  }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(config)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllClientsProviders(): Promise<ClientProvider[]> {
    return await db
      .select()
      .from(clientsProviders)
      .orderBy(desc(clientsProviders.lastInvoiceDate), clientsProviders.name);
  }

  async getClientProvider(id: string): Promise<ClientProvider | undefined> {
    const [clientProvider] = await db
      .select()
      .from(clientsProviders)
      .where(eq(clientsProviders.id, id));
    return clientProvider || undefined;
  }

  async getClientProviderByName(name: string): Promise<ClientProvider | undefined> {
    const [clientProvider] = await db
      .select()
      .from(clientsProviders)
      .where(eq(clientsProviders.name, name));
    return clientProvider || undefined;
  }

  async getClientProviderByCuit(cuit: string): Promise<ClientProvider | undefined> {
    const [clientProvider] = await db
      .select()
      .from(clientsProviders)
      .where(eq(clientsProviders.cuit, cuit));
    return clientProvider || undefined;
  }

  async createClientProvider(clientProvider: InsertClientProvider): Promise<ClientProvider> {
    const [created] = await db
      .insert(clientsProviders)
      .values(clientProvider)
      .returning();
    return created;
  }

  async updateClientProvider(id: string, updates: Partial<InsertClientProvider>): Promise<ClientProvider | undefined> {
    const [updated] = await db
      .update(clientsProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientsProviders.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClientProvider(id: string): Promise<{ success: boolean; error?: string; invoiceCount?: number }> {
    // First check if there are associated invoices
    const invoiceCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(eq(invoices.clientProviderId, id));
    
    const associatedInvoices = invoiceCount[0]?.count || 0;
    
    if (associatedInvoices > 0) {
      return {
        success: false,
        error: `No se puede eliminar. Este cliente/proveedor tiene ${associatedInvoices} factura(s) asociada(s). Debe eliminar primero las facturas.`,
        invoiceCount: associatedInvoices
      };
    }
    
    // If no associated invoices, proceed with deletion
    const result = await db
      .delete(clientsProviders)
      .where(eq(clientsProviders.id, id));
    
    return { success: (result.rowCount || 0) > 0 };
  }

  async getAllInvoices(filters?: {
    search?: string;
    month?: number;
    year?: number;
    user?: string;
    type?: 'income' | 'expense' | 'neutral' | 'all';
    invoiceClass?: 'A' | 'B' | 'C' | 'all';
    paymentStatus?: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'all';
    ownerName?: string;
    startDate?: string;
    endDate?: string;
    amountMin?: number;
    amountMax?: number;
    clientProvider?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'amount' | 'client' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ invoices: InvoiceWithRelations[]; total: number }> {
    const conditions: any[] = [];

    if (filters?.search) {
      conditions.push(
        or(
          ilike(invoices.clientProviderName, `%${filters.search}%`),
          ilike(invoices.invoiceNumber, `%${filters.search}%`)
        )
      );
    }

    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    } else if (filters?.month) {
      // When only month is selected, use current year as default
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, filters.month - 1, 1);
      const endDate = new Date(currentYear, filters.month, 0);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    } else if (filters?.year) {
      const startDate = new Date(filters.year, 0, 1);
      const endDate = new Date(filters.year, 11, 31);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    }

    // Fiscal period range filters (e.g., May-April)
    if (filters?.startMonth && filters?.startYear && filters?.endMonth && filters?.endYear) {
      const startDate = new Date(filters.startYear, filters.startMonth - 1, 1);
      const endDate = new Date(filters.endYear, filters.endMonth, 0, 23, 59, 59);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    }

    if (filters?.user) {
      conditions.push(eq(invoices.ownerName, filters.user));
    }
    
    // Comprehensive filter support
    if (filters?.ownerName) {
      conditions.push(eq(invoices.ownerName, filters.ownerName));
    }

    if (filters?.type && filters.type !== 'all') {
      conditions.push(eq(invoices.type, filters.type));
    }
    
    if (filters?.invoiceClass && filters.invoiceClass !== 'all') {
      conditions.push(eq(sql`${invoices.invoiceClass}::text`, filters.invoiceClass));
    }
    
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      conditions.push(eq(invoices.paymentStatus, filters.paymentStatus));
    }
    
    // Date range filter support
    if (filters?.startDate) {
      conditions.push(gte(invoices.date, new Date(filters.startDate)));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(invoices.date, new Date(filters.endDate)));
    }
    
    // Amount range filter support
    if (filters?.amountMin !== undefined) {
      conditions.push(gte(invoices.totalAmount, filters.amountMin.toString()));
    }
    
    if (filters?.amountMax !== undefined) {
      conditions.push(lte(invoices.totalAmount, filters.amountMax.toString()));
    }
    
    // Client/Provider filter
    if (filters?.clientProvider) {
      conditions.push(ilike(invoices.clientProviderName, `%${filters.clientProvider}%`));
    }

    const baseQuery = db
      .select({
        invoice: invoices,
        clientProvider: clientsProviders,
        uploadedByUser: users,
      })
      .from(invoices)
      .leftJoin(clientsProviders, eq(invoices.clientProviderId, clientsProviders.id))
      .leftJoin(users, eq(invoices.uploadedBy, users.id));

    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .leftJoin(clientsProviders, eq(invoices.clientProviderId, clientsProviders.id));

    const finalTotalQuery = conditions.length > 0 
      ? totalQuery.where(and(...conditions))
      : totalQuery;

    const [{ count: total }] = await finalTotalQuery;

    // Determinar el campo de ordenamiento
    let orderByField;
    switch (filters?.sortBy) {
      case 'amount':
        orderByField = invoices.totalAmount;
        break;
      case 'client':
        orderByField = invoices.clientProviderName;
        break;
      case 'createdAt':
        orderByField = invoices.createdAt;
        break;
      case 'date':
      default:
        orderByField = invoices.date;
        break;
    }

    // Aplicar orden ascendente o descendente
    const sortOrder = filters?.sortOrder === 'asc' ? asc : desc;

    const results = await query
      .orderBy(sortOrder(orderByField))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    // Get IVA components for all invoices
    const invoiceIds = results.map(r => r.invoice.id);
    const ivaComponentsData = invoiceIds.length > 0 
      ? await db
          .select()
          .from(ivaComponents)
          .where(sql`${ivaComponents.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    
    // Group IVA components by invoice ID
    const ivaComponentsByInvoice = new Map<string, IvaComponent[]>();
    for (const component of ivaComponentsData) {
      const invoiceId = component.invoiceId;
      if (!ivaComponentsByInvoice.has(invoiceId)) {
        ivaComponentsByInvoice.set(invoiceId, []);
      }
      ivaComponentsByInvoice.get(invoiceId)!.push(component);
    }
    
    const invoicesWithRelations: InvoiceWithRelations[] = results.map(result => ({
      ...result.invoice,
      clientProvider: result.clientProvider || undefined,
      uploadedByUser: result.uploadedByUser || undefined,
      ivaComponents: ivaComponentsByInvoice.get(result.invoice.id) || [],
    }));

    return {
      invoices: invoicesWithRelations,
      total,
    };
  }

  async getInvoice(id: string): Promise<InvoiceWithRelations | undefined> {
    const [result] = await db
      .select({
        invoice: invoices,
        clientProvider: clientsProviders,
        uploadedByUser: users,
      })
      .from(invoices)
      .leftJoin(clientsProviders, eq(invoices.clientProviderId, clientsProviders.id))
      .leftJoin(users, eq(invoices.uploadedBy, users.id))
      .where(eq(invoices.id, id));

    if (!result) return undefined;
    
    // Get IVA components for this invoice
    const ivaComponentsList = await db
      .select()
      .from(ivaComponents)
      .where(eq(ivaComponents.invoiceId, id));

    return {
      ...result.invoice,
      clientProvider: result.clientProvider || undefined,
      uploadedByUser: result.uploadedByUser || undefined,
      ivaComponents: ivaComponentsList,
    };
  }

  async getRecentInvoices(limit = 10): Promise<InvoiceWithRelations[]> {
    const results = await db
      .select({
        invoice: invoices,
        clientProvider: clientsProviders,
        uploadedByUser: users,
      })
      .from(invoices)
      .leftJoin(clientsProviders, eq(invoices.clientProviderId, clientsProviders.id))
      .leftJoin(users, eq(invoices.uploadedBy, users.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
    
    // Get IVA components for recent invoices
    const invoiceIds = results.map(r => r.invoice.id);
    const ivaComponentsData = invoiceIds.length > 0 
      ? await db
          .select()
          .from(ivaComponents)
          .where(sql`${ivaComponents.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    
    // Group IVA components by invoice ID
    const ivaComponentsByInvoice = new Map<string, IvaComponent[]>();
    for (const component of ivaComponentsData) {
      const invoiceId = component.invoiceId;
      if (!ivaComponentsByInvoice.has(invoiceId)) {
        ivaComponentsByInvoice.set(invoiceId, []);
      }
      ivaComponentsByInvoice.get(invoiceId)!.push(component);
    }

    return results.map(result => ({
      ...result.invoice,
      clientProvider: result.clientProvider || undefined,
      uploadedByUser: result.uploadedByUser || undefined,
      ivaComponents: ivaComponentsByInvoice.get(result.invoice.id) || [],
    }));
  }

  async findInvoiceByFileInfo(fileName: string, fileSize: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.fileName, fileName),
          eq(invoices.fileSize, fileSize)
        )
      );
    return invoice || undefined;
  }

  async findInvoiceByFingerprint(fingerprint: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.fingerprint, fingerprint));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db
      .insert(invoices)
      .values(invoice)
      .returning();

    // Update client/provider last invoice date and total operations
    if (invoice.clientProviderId) {
      await db
        .update(clientsProviders)
        .set({
          lastInvoiceDate: new Date(),
          totalOperations: sql`${clientsProviders.totalOperations} + ${invoice.totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(clientsProviders.id, invoice.clientProviderId));
    }

    return created;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async markInvoiceAsProcessed(id: string): Promise<boolean> {
    const result = await db
      .update(invoices)
      .set({ processed: true, updatedAt: new Date() })
      .where(eq(invoices.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteInvoice(id: string, deletedBy: string, deletedByName: string): Promise<boolean> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return false;

    // First, delete any related upload_jobs to avoid foreign key constraint
    await db.delete(uploadJobs).where(eq(uploadJobs.invoiceId, id));
    console.log(`🗑️ Deleted related upload jobs for invoice ${id}`);

    // Move to deleted log
    await db.insert(deletedInvoicesLog).values({
      originalInvoiceId: id,
      type: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      clientProviderName: invoice.clientProviderName,
      subtotal: invoice.subtotal,
      ivaAmount: invoice.ivaAmount,
      totalAmount: invoice.totalAmount,
      uploadedByName: invoice.uploadedByName,
      deletedBy,
      deletedByName,
      originalData: JSON.stringify(invoice),
    });

    // Delete from invoices
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));

    console.log(`✅ Successfully deleted invoice ${id} and related data`);
    return (result.rowCount || 0) > 0;
  }

  async restoreInvoice(deletedInvoiceId: string): Promise<boolean> {
    const [deletedInvoice] = await db
      .select()
      .from(deletedInvoicesLog)
      .where(eq(deletedInvoicesLog.id, deletedInvoiceId));

    if (!deletedInvoice) return false;

    const originalData = JSON.parse(deletedInvoice.originalData) as Invoice;

    // Restore to invoices table
    await db.insert(invoices).values({
      id: deletedInvoice.originalInvoiceId,
      type: deletedInvoice.type,
      invoiceNumber: deletedInvoice.invoiceNumber,
      date: deletedInvoice.date,
      clientProviderId: originalData.clientProviderId,
      clientProviderName: deletedInvoice.clientProviderName,
      subtotal: deletedInvoice.subtotal,
      ivaAmount: deletedInvoice.ivaAmount,
      totalAmount: deletedInvoice.totalAmount,
      uploadedBy: originalData.uploadedBy,
      uploadedByName: deletedInvoice.uploadedByName,
      filePath: originalData.filePath,
      fileName: originalData.fileName,
      extractedData: originalData.extractedData,
      processed: originalData.processed,
      createdAt: originalData.createdAt,
      updatedAt: new Date(),
    });

    // Remove from deleted log
    await db
      .delete(deletedInvoicesLog)
      .where(eq(deletedInvoicesLog.id, deletedInvoiceId));

    return true;
  }

  async getDeletedInvoices(): Promise<DeletedInvoiceLog[]> {
    return await db
      .select()
      .from(deletedInvoicesLog)
      .orderBy(desc(deletedInvoicesLog.deletedAt));
  }

  async permanentlyDeleteInvoice(deletedInvoiceId: string): Promise<boolean> {
    const result = await db
      .delete(deletedInvoicesLog)
      .where(eq(deletedInvoicesLog.id, deletedInvoiceId));
    return (result.rowCount || 0) > 0;
  }

  async emptyTrash(): Promise<boolean> {
    await db.delete(deletedInvoicesLog);
    return true;
  }

  async getKPIData(): Promise<KPIData> {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // TOTAL HISTÓRICO - Todas las facturas aprobadas (sin filtro de fecha)
    const [totalIncomeAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'income'), eq(invoices.reviewStatus, 'approved')));

    const [totalExpensesAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'expense'), eq(invoices.reviewStatus, 'approved')));

    // Current month totals (para cálculo de cambios) - solo facturas aprobadas
    const [currentIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'income'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, currentMonthStart)
        )
      );

    const [currentExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, currentMonthStart)
        )
      );

    // Last month totals for comparison - solo facturas aprobadas
    const [lastIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'income'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, lastMonth),
          lte(invoices.date, currentMonthStart)
        )
      );

    const [lastExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, lastMonth),
          lte(invoices.date, currentMonthStart)
        )
      );

    // IVA calculations - solo facturas aprobadas
    const [ivaCredito] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'expense'), eq(invoices.reviewStatus, 'approved')));

    const [ivaDebito] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'income'), eq(invoices.reviewStatus, 'approved')));

    // Usar totales históricos para las tarjetas principales
    const totalIncomeNum = parseFloat(totalIncomeAll.total);
    const totalExpensesNum = parseFloat(totalExpensesAll.total);
    
    // Usar mes actual para cálculos de cambio
    const currentIncomeNum = parseFloat(currentIncome.total);
    const currentExpensesNum = parseFloat(currentExpenses.total);
    const lastIncomeNum = parseFloat(lastIncome.total);
    const lastExpensesNum = parseFloat(lastExpenses.total);
    const ivaCreditoNum = parseFloat(ivaCredito.total);
    const ivaDebitoNum = parseFloat(ivaDebito.total);

    // Cálculos de cambio mejorados con mensajes más claros
    let incomeChange: string;
    let expensesChange: string;
    
    // Para ingresos
    if (lastIncomeNum === 0 && currentIncomeNum === 0) {
      incomeChange = 'Sin datos';
    } else if (lastIncomeNum === 0 && currentIncomeNum > 0) {
      incomeChange = 'Nuevo';
    } else if (lastIncomeNum > 0 && currentIncomeNum === 0) {
      incomeChange = 'Sin movimientos';
    } else {
      const changePercent = ((currentIncomeNum - lastIncomeNum) / lastIncomeNum * 100).toFixed(1);
      incomeChange = `${parseFloat(changePercent) >= 0 ? '+' : ''}${changePercent}`;
    }
    
    // Para egresos
    if (lastExpensesNum === 0 && currentExpensesNum === 0) {
      expensesChange = 'Sin datos';
    } else if (lastExpensesNum === 0 && currentExpensesNum > 0) {
      expensesChange = 'Nuevo';
    } else if (lastExpensesNum > 0 && currentExpensesNum === 0) {
      expensesChange = 'Sin movimientos';
    } else {
      const changePercent = ((currentExpensesNum - lastExpensesNum) / lastExpensesNum * 100).toFixed(1);
      expensesChange = `${parseFloat(changePercent) >= 0 ? '+' : ''}${changePercent}`;
    }
    const profitability = totalIncomeNum > 0 ? ((totalIncomeNum - totalExpensesNum) / totalIncomeNum * 100).toFixed(1) : '0.0';

    return {
      totalIncome: totalIncomeNum.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      totalExpenses: totalExpensesNum.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      ivaBalance: (ivaDebitoNum - ivaCreditoNum).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      generalBalance: (totalIncomeNum - totalExpensesNum).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      incomeChange,
      expensesChange,
      profitability,
    };
  }

  async getFilteredKPIData(month?: number, year?: number): Promise<KPIData> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;
    
    // Calculate date ranges for the target month
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    
    // Calculate previous month for comparison
    const prevMonthStart = new Date(targetYear, targetMonth - 2, 1);
    const prevMonthEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);
    
    // Current month totals - solo facturas aprobadas
    const [currentIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'income'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        )
      );

    const [currentExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        )
      );

    // Previous month totals for comparison - solo facturas aprobadas
    const [lastIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'income'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, prevMonthStart),
          lte(invoices.date, prevMonthEnd)
        )
      );

    const [lastExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, prevMonthStart),
          lte(invoices.date, prevMonthEnd)
        )
      );

    // IVA calculations for the selected period - solo facturas aprobadas
    const [ivaCredito] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        )
      );

    const [ivaDebito] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'income'),
          eq(invoices.reviewStatus, 'approved'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        )
      );

    const incomeNum = parseFloat(currentIncome.total);
    const expensesNum = parseFloat(currentExpenses.total);
    const lastIncomeNum = parseFloat(lastIncome.total);
    const lastExpensesNum = parseFloat(lastExpenses.total);
    const ivaCreditoNum = parseFloat(ivaCredito.total);
    const ivaDebitoNum = parseFloat(ivaDebito.total);

    const incomeChange = lastIncomeNum > 0 ? ((incomeNum - lastIncomeNum) / lastIncomeNum * 100).toFixed(1) : '0.0';
    const expensesChange = lastExpensesNum > 0 ? ((expensesNum - lastExpensesNum) / lastExpensesNum * 100).toFixed(1) : '0.0';
    const profitability = incomeNum > 0 ? ((incomeNum - expensesNum) / incomeNum * 100).toFixed(1) : '0.0';

    return {
      totalIncome: incomeNum.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      totalExpenses: expensesNum.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      ivaBalance: (ivaDebitoNum - ivaCreditoNum).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      generalBalance: (incomeNum - expensesNum).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      incomeChange,
      expensesChange,
      profitability,
    };
  }

  async getChartData(): Promise<ChartData[]> {
    const twelvemonthsAgo = new Date();
    twelvemonthsAgo.setMonth(twelvemonthsAgo.getMonth() - 12);

    const results = await db
      .select({
        month: sql<string>`TO_CHAR(${invoices.date}, 'YYYY-MM')`,
        type: invoices.type,
        total: sql<number>`SUM(${invoices.totalAmount})`,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.date, twelvemonthsAgo),
          sql`${invoices.date} IS NOT NULL`
        )
      )
      .groupBy(sql`TO_CHAR(${invoices.date}, 'YYYY-MM')`, invoices.type)
      .orderBy(sql`TO_CHAR(${invoices.date}, 'YYYY-MM')`);

    const chartData: ChartData[] = [];
    const monthsData: { [key: string]: { income: number; expenses: number } } = {};

    results.forEach(result => {
      if (!monthsData[result.month]) {
        monthsData[result.month] = { income: 0, expenses: 0 };
      }
      if (result.type === 'income') {
        monthsData[result.month].income = result.total;
      } else {
        monthsData[result.month].expenses = result.total;
      }
    });

    Object.keys(monthsData).forEach(month => {
      chartData.push({
        month: new Date(month + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        income: monthsData[month].income,
        expenses: monthsData[month].expenses,
      });
    });

    return chartData;
  }

  async getQuickStats(): Promise<QuickStatsData> {
    const currentMonth = new Date();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const [invoicesThisMonth] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(invoices)
      .where(
        and(
          gte(invoices.date, currentMonthStart),
          lte(invoices.date, currentMonthEnd),
          sql`${invoices.date} IS NOT NULL`
        )
      );

    const [averageInvoice] = await db
      .select({ avg: sql<string>`COALESCE(AVG(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          gte(invoices.date, currentMonthStart),
          lte(invoices.date, currentMonthEnd),
          sql`${invoices.date} IS NOT NULL`
        )
      );

    const [ivaRecovered] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, 'expense'),
          gte(invoices.date, currentMonthStart),
          lte(invoices.date, currentMonthEnd)
        )
      );

    // Count pending payment status instead of processed field
    const [pending] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(invoices)
      .where(eq(sql`${invoices.paymentStatus}::text`, 'pending'));

    const kpiData = await this.getKPIData();

    return {
      invoicesThisMonth: String(invoicesThisMonth.count || 0),
      averageInvoice: parseFloat(averageInvoice.avg || '0').toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      ivaRecovered: parseFloat(ivaRecovered.total || '0').toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      pending: String(pending.count || 0),
      profitability: kpiData.profitability,
    };
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return created;
  }

  async getUserStatistics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get user details
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get total invoices and amounts
    const [totals] = await db
      .select({
        totalInvoices: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          gte(invoices.date, startDate)
        )
      );

    // Get IVA balance
    const [ivaStats] = await db
      .select({
        ivaDebito: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.type} = 'income' THEN ${invoices.ivaAmount} ELSE 0 END), 0)`,
        ivaCredito: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.type} = 'expense' THEN ${invoices.ivaAmount} ELSE 0 END), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          gte(invoices.date, startDate)
        )
      );

    // Get pending payments count
    const [pendingStats] = await db
      .select({
        pendingPayments: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          eq(invoices.paymentStatus, 'pending'),
          gte(invoices.date, startDate)
        )
      );

    // Get invoices by type
    const invoicesByType = await db
      .select({
        type: invoices.type,
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          gte(invoices.date, startDate)
        )
      )
      .groupBy(invoices.type);

    // Get top clients/providers
    const topClients = await db
      .select({
        name: invoices.clientProviderName,
        amount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          gte(invoices.date, startDate)
        )
      )
      .groupBy(invoices.clientProviderName)
      .orderBy(desc(sql`COALESCE(SUM(${invoices.totalAmount}), 0)`))
      .limit(5);

    // Get monthly activity
    const monthlyActivity = await db
      .select({
        month: sql<string>`TO_CHAR(${invoices.date}, 'Mon YY')`,
        invoices: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.uploadedBy, userId),
          gte(invoices.date, startDate)
        )
      )
      .groupBy(sql`TO_CHAR(${invoices.date}, 'Mon YY')`)
      .orderBy(sql`MIN(${invoices.date})`);

    // Get last activity
    const [lastActivity] = await db
      .select({
        lastDate: sql<string>`MAX(${invoices.createdAt})`,
      })
      .from(invoices)
      .where(eq(invoices.uploadedBy, userId));

    const lastActivityDate = lastActivity?.lastDate 
      ? new Date(lastActivity.lastDate).toLocaleString('es-AR')
      : 'Sin actividad reciente';

    const ivaBalance = ivaStats.ivaDebito - ivaStats.ivaCredito;

    return {
      totalInvoices: totals.totalInvoices,
      totalAmount: totals.totalAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      averageAmount: totals.averageAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      lastActivity: `Última actividad: ${lastActivityDate}`,
      monthlyGrowth: 0, // TODO: Calculate growth percentage
      topClients,
      invoicesByType,
      monthlyActivity,
      ivaBalance: ivaBalance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      pendingPayments: pendingStats.pendingPayments,
    };
  }

  async getOwnerStatistics(): Promise<any[]> {
    const results = await db
      .select({
        ownerName: invoices.ownerName,
        type: invoices.type,
        totalAmount: sql<number>`SUM(${invoices.totalAmount})`,
        ivaAmount: sql<number>`SUM(${invoices.ivaAmount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .groupBy(invoices.ownerName, invoices.type)
      .orderBy(invoices.ownerName);

    const ownerStats: { [key: string]: any } = {};

    results.forEach(result => {
      const ownerKey = result.ownerName || 'Sin asignar';
      
      if (!ownerStats[ownerKey]) {
        ownerStats[ownerKey] = {
          name: ownerKey,
          income: { total: 0, iva: 0, count: 0 },
          expense: { total: 0, iva: 0, count: 0 },
          balance: 0,
        };
      }

      if (result.type === 'income') {
        ownerStats[ownerKey].income.total = result.totalAmount;
        ownerStats[ownerKey].income.iva = result.ivaAmount;
        ownerStats[ownerKey].income.count = result.count;
      } else {
        ownerStats[ownerKey].expense.total = result.totalAmount;
        ownerStats[ownerKey].expense.iva = result.ivaAmount;
        ownerStats[ownerKey].expense.count = result.count;
      }

      ownerStats[ownerKey].balance = 
        ownerStats[ownerKey].income.total - ownerStats[ownerKey].expense.total;
    });

    return Object.values(ownerStats);
  }

  async getClientProviderStatistics(): Promise<any[]> {
    const results = await db
      .select({
        clientProviderName: invoices.clientProviderName,
        type: invoices.type,
        totalAmount: sql<number>`SUM(${invoices.totalAmount})`,
        ivaAmount: sql<number>`SUM(${invoices.ivaAmount})`,
        count: sql<number>`COUNT(*)`,
        ownerName: invoices.ownerName,
      })
      .from(invoices)
      .groupBy(invoices.clientProviderName, invoices.type, invoices.ownerName)
      .orderBy(invoices.clientProviderName);

    const entityStats: { [key: string]: any } = {};

    results.forEach(result => {
      const key = result.clientProviderName;
      
      if (!entityStats[key]) {
        entityStats[key] = {
          name: result.clientProviderName,
          income: { total: 0, iva: 0, count: 0 },
          expense: { total: 0, iva: 0, count: 0 },
          owners: new Set(),
          balance: 0,
        };
      }

      if (result.ownerName) {
        entityStats[key].owners.add(result.ownerName);
      }

      if (result.type === 'income') {
        entityStats[key].income.total += result.totalAmount;
        entityStats[key].income.iva += result.ivaAmount;
        entityStats[key].income.count += result.count;
      } else {
        entityStats[key].expense.total += result.totalAmount;
        entityStats[key].expense.iva += result.ivaAmount;
        entityStats[key].expense.count += result.count;
      }

      entityStats[key].balance = 
        entityStats[key].income.total - entityStats[key].expense.total;
    });

    // Convert Set to Array for JSON serialization
    return Object.values(entityStats).map(entity => ({
      ...entity,
      owners: Array.from(entity.owners),
    }));
  }

  async getIVABreakdownByClass(): Promise<{A: number, B: number, C: number, total: number}> {
    const [classA] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(eq(sql`${invoices.invoiceClass}::text`, 'A'));
    
    const [classB] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(eq(sql`${invoices.invoiceClass}::text`, 'B'));
    
    const [classC] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(eq(sql`${invoices.invoiceClass}::text`, 'C'));
    
    const a = parseFloat(classA.total);
    const b = parseFloat(classB.total);
    const c = parseFloat(classC.total);
    
    return {
      A: a,
      B: b,
      C: c,
      total: a + b + c
    };
  }

  async getComprehensiveReport(filters?: {
    ownerName?: string;
    clientProviderName?: string;
    month?: number;
    year?: number;
    type?: 'income' | 'expense';
  }): Promise<any> {
    const conditions: any[] = [];

    if (filters?.ownerName) {
      conditions.push(eq(invoices.ownerName, filters.ownerName));
    }

    if (filters?.clientProviderName) {
      conditions.push(eq(invoices.clientProviderName, filters.clientProviderName));
    }

    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    } else if (filters?.year) {
      const startDate = new Date(filters.year, 0, 1);
      const endDate = new Date(filters.year, 11, 31);
      conditions.push(
        and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        )
      );
    }

    if (filters?.type) {
      conditions.push(eq(invoices.type, filters.type));
    }

    const query = db
      .select({
        id: invoices.id,
        type: invoices.type,
        date: invoices.date,
        invoiceNumber: invoices.invoiceNumber,
        invoiceClass: invoices.invoiceClass,
        clientProviderName: invoices.clientProviderName,
        ownerName: invoices.ownerName,
        uploadedByName: invoices.uploadedByName,
        subtotal: invoices.subtotal,
        ivaAmount: invoices.ivaAmount,
        totalAmount: invoices.totalAmount,
      })
      .from(invoices);

    const finalQuery = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    const invoicesList = await finalQuery.orderBy(desc(invoices.date));

    // Calculate totals
    const totals = {
      income: { total: 0, iva: 0, count: 0 },
      expense: { total: 0, iva: 0, count: 0 },
      balance: 0,
      ivaBalance: 0,
      totalCount: 0,
      averageAmount: 0,
      profitability: 0,
    };

    // Invoice type breakdown
    const invoiceTypeBreakdown: { [key: string]: any } = {
      A: { count: 0, total: 0, iva: 0, percentage: 0 },
      B: { count: 0, total: 0, iva: 0, percentage: 0 },
      C: { count: 0, total: 0, iva: 0, percentage: 0 },
    };

    let totalSum = 0;

    invoicesList.forEach(invoice => {
      const total = parseFloat(invoice.totalAmount);
      const iva = parseFloat(invoice.ivaAmount);

      if (invoice.type === 'income') {
        totals.income.total += total;
        totals.income.iva += iva;
        totals.income.count++;
      } else {
        totals.expense.total += total;
        totals.expense.iva += iva;
        totals.expense.count++;
      }

      // Track invoice class breakdown
      const invoiceClass = invoice.invoiceClass || 'A'; // Default to A if not specified
      if (invoiceTypeBreakdown[invoiceClass]) {
        invoiceTypeBreakdown[invoiceClass].count++;
        invoiceTypeBreakdown[invoiceClass].total += total;
        invoiceTypeBreakdown[invoiceClass].iva += iva;
      }

      totalSum += total;
      totals.totalCount++;
    });

    totals.balance = totals.income.total - totals.expense.total;
    totals.ivaBalance = totals.income.iva - totals.expense.iva;
    totals.averageAmount = totals.totalCount > 0 ? totalSum / totals.totalCount : 0;
    totals.profitability = totals.expense.total > 0 
      ? ((totals.income.total - totals.expense.total) / totals.expense.total) * 100 
      : 0;

    // Calculate percentages for invoice types
    Object.keys(invoiceTypeBreakdown).forEach(type => {
      invoiceTypeBreakdown[type].percentage = 
        totals.totalCount > 0 
          ? (invoiceTypeBreakdown[type].count / totals.totalCount) * 100
          : 0;
    });

    // Get owner statistics
    const ownerStats = await this.getOwnerStatistics();
    
    // Get client/provider statistics
    const entityStats = await this.getClientProviderStatistics();

    return {
      invoices: invoicesList,
      totals,
      invoiceTypeBreakdown,
      ownerStatistics: ownerStats,
      entityStatistics: entityStats,
      filters,
    };
  }

  async getActivityLogs(filters?: {
    userId?: string;
    entityType?: string;
    actionType?: 'create' | 'update' | 'delete' | 'upload' | 'login' | 'logout' | 'import' | 'export';
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]> {
    const conditions: any[] = [];

    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }

    if (filters?.entityType) {
      conditions.push(eq(activityLogs.entityType, filters.entityType));
    }

    if (filters?.actionType) {
      conditions.push(eq(activityLogs.actionType, filters.actionType));
    }

    const baseQuery = db.select().from(activityLogs);
    
    const queryWithConditions = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const queryWithOrder = queryWithConditions.orderBy(desc(activityLogs.createdAt));

    const queryWithLimit = filters?.limit 
      ? queryWithOrder.limit(filters.limit)
      : queryWithOrder;

    const finalQuery = filters?.offset 
      ? queryWithLimit.offset(filters.offset)
      : queryWithLimit;

    return await finalQuery;
  }

  // KPI Data by Fiscal Period implementation
  async getKPIDataByFiscalPeriod(startMonth: number, startYear: number, endMonth: number, endYear: number): Promise<KPIData> {
    // Create date range for fiscal period (May-April typically)
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0, 23, 59, 59); // Last day of end month
    
    // Get totals for the fiscal period - solo facturas aprobadas
    const [totalIncomeAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.type, 'income'),
        eq(invoices.reviewStatus, 'approved'),
        gte(invoices.date, startDate),
        lte(invoices.date, endDate)
      ));

    const [totalExpensesAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.type, 'expense'),
        eq(invoices.reviewStatus, 'approved'),
        gte(invoices.date, startDate),
        lte(invoices.date, endDate)
      ));

    const [totalIvaIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.type, 'income'),
        eq(invoices.reviewStatus, 'approved'),
        gte(invoices.date, startDate),
        lte(invoices.date, endDate)
      ));

    const [totalIvaExpense] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.type, 'expense'),
        eq(invoices.reviewStatus, 'approved'),
        gte(invoices.date, startDate),
        lte(invoices.date, endDate)
      ));

    const income = parseFloat(totalIncomeAll.total);
    const expenses = parseFloat(totalExpensesAll.total);
    const ivaIncome = parseFloat(totalIvaIncome.total);
    const ivaExpense = parseFloat(totalIvaExpense.total);
    const generalBalance = income - expenses;
    const ivaBalance = ivaIncome - ivaExpense;
    const profitability = income > 0 ? ((generalBalance / income) * 100).toFixed(1) : '0';

    return {
      totalIncome: `$ ${income.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalExpenses: `$ ${expenses.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ivaBalance: `$ ${ivaBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      generalBalance: `$ ${generalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      incomeChange: '0%', // Calculate based on previous period if needed
      expensesChange: '0%',
      profitability: `${profitability}%`,
    };
  }

  // KPIs with Date Filter for Analytics Export
  async getKPIsWithDateFilter(startDate?: string, endDate?: string): Promise<KPIData> {
    let whereConditions = sql`${invoices.date} IS NOT NULL`;
    
    if (startDate) {
      whereConditions = and(whereConditions, gte(invoices.date, new Date(startDate)));
    }
    
    if (endDate) {
      whereConditions = and(whereConditions, lte(invoices.date, new Date(endDate)));
    }

    const [totalIncomeAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'income'), eq(invoices.reviewStatus, 'approved'), whereConditions));

    const [totalExpensesAll] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'expense'), eq(invoices.reviewStatus, 'approved'), whereConditions));

    const [totalIvaIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'income'), eq(invoices.reviewStatus, 'approved'), whereConditions));

    const [totalIvaExpense] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.ivaAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.type, 'expense'), eq(invoices.reviewStatus, 'approved'), whereConditions));

    const income = parseFloat(totalIncomeAll.total);
    const expenses = parseFloat(totalExpensesAll.total);
    const ivaIncome = parseFloat(totalIvaIncome.total);
    const ivaExpense = parseFloat(totalIvaExpense.total);
    const generalBalance = income - expenses;
    const ivaBalance = ivaIncome - ivaExpense;

    return {
      totalIncome: `$ ${income.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalExpenses: `$ ${expenses.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ivaBalance: `$ ${ivaBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      generalBalance: `$ ${generalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      incomeChange: '0%',
      expensesChange: '0%',
      profitability: income > 0 ? `${((generalBalance / income) * 100).toFixed(1)}%` : '0%',
      ivaDebit: `$ ${ivaIncome.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ivaCredit: `$ ${ivaExpense.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      balance: `$ ${generalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  }

  // Analytics Trends for Export
  async getAnalyticsTrends(startDate?: string, endDate?: string): Promise<ChartData[]> {
    let whereConditions = sql`${invoices.date} IS NOT NULL`;
    
    if (startDate) {
      whereConditions = and(whereConditions, gte(invoices.date, new Date(startDate)));
    }
    
    if (endDate) {
      whereConditions = and(whereConditions, lte(invoices.date, new Date(endDate)));
    }

    const results = await db
      .select({
        month: sql<string>`TO_CHAR(${invoices.date}, 'YYYY-MM')`,
        type: invoices.type,
        total: sql<number>`SUM(${invoices.totalAmount})`,
      })
      .from(invoices)
      .where(whereConditions)
      .groupBy(sql`TO_CHAR(${invoices.date}, 'YYYY-MM')`, invoices.type)
      .orderBy(sql`TO_CHAR(${invoices.date}, 'YYYY-MM')`);

    const chartData: ChartData[] = [];
    const monthsData: { [key: string]: { income: number; expenses: number } } = {};

    results.forEach(result => {
      if (!monthsData[result.month]) {
        monthsData[result.month] = { income: 0, expenses: 0 };
      }
      if (result.type === 'income') {
        monthsData[result.month].income = result.total;
      } else {
        monthsData[result.month].expenses = result.total;
      }
    });

    Object.keys(monthsData).forEach(month => {
      chartData.push({
        month: new Date(month + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        income: monthsData[month].income,
        expenses: monthsData[month].expenses,
      });
    });

    return chartData;
  }

  // Chart Data by Fiscal Period
  async getChartDataByFiscalPeriod(fiscalPeriod: FiscalPeriodData): Promise<ChartData[]> {
    const startDate = new Date(fiscalPeriod.startYear, fiscalPeriod.startMonth - 1, 1);
    const endDate = new Date(fiscalPeriod.endYear, fiscalPeriod.endMonth, 0);
    
    const months: ChartData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const [incomeData] = await db
        .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
        .from(invoices)
        .where(and(
          eq(invoices.type, 'income'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        ));

      const [expenseData] = await db
        .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
        .from(invoices)
        .where(and(
          eq(invoices.type, 'expense'),
          gte(invoices.date, monthStart),
          lte(invoices.date, monthEnd)
        ));

      const monthName = currentDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      months.push({
        month: monthName,
        income: incomeData.total,
        expenses: expenseData.total,
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  }

  // IVA Components Management
  async createIvaComponent(component: InsertIvaComponent): Promise<IvaComponent> {
    const [created] = await db
      .insert(ivaComponents)
      .values(component)
      .returning();
    return created;
  }

  async getIvaComponentsByInvoice(invoiceId: string): Promise<IvaComponent[]> {
    return await db
      .select()
      .from(ivaComponents)
      .where(eq(ivaComponents.invoiceId, invoiceId));
  }

  async deleteIvaComponentsByInvoice(invoiceId: string): Promise<void> {
    await db
      .delete(ivaComponents)
      .where(eq(ivaComponents.invoiceId, invoiceId));
  }

  // Payment Management
  async updateInvoicePaymentStatus(
    invoiceId: string, 
    status: 'pending' | 'paid' | 'overdue' | 'cancelled',
    paymentDate?: Date
  ): Promise<void> {
    await db
      .update(invoices)
      .set({ 
        paymentStatus: status,
        paymentDate: paymentDate || null
      })
      .where(eq(invoices.id, invoiceId));
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.paymentStatus, 'pending'),
        lte(invoices.dueDate, now)
      ));
  }

  // Export/Import Functions
  async exportInvoiceData(fiscalPeriod?: FiscalPeriodData): Promise<ExportData> {
    let invoicesList: Invoice[];
    
    if (fiscalPeriod) {
      const startDate = new Date(fiscalPeriod.startYear, fiscalPeriod.startMonth - 1, 1);
      const endDate = new Date(fiscalPeriod.endYear, fiscalPeriod.endMonth, 0);
      
      invoicesList = await db
        .select()
        .from(invoices)
        .where(and(
          gte(invoices.date, startDate),
          lte(invoices.date, endDate)
        ));
    } else {
      invoicesList = await db.select().from(invoices);
    }
    
    // Calculate summary
    const summary = invoicesList.reduce((acc, inv) => {
      const amount = parseFloat(inv.totalAmount);
      const iva = parseFloat(inv.ivaAmount);
      const ganancias = parseFloat(inv.gananciasAmount || '0');
      
      if (inv.type === 'income') {
        acc.totalIncome += amount;
      } else if (inv.type === 'expense') {
        acc.totalExpenses += amount;
      }
      
      acc.totalIVA += iva;
      acc.totalGanancias += ganancias;
      
      return acc;
    }, { 
      totalIncome: 0, 
      totalExpenses: 0, 
      totalIVA: 0, 
      totalGanancias: 0,
      netProfit: 0
    });
    
    summary.netProfit = summary.totalIncome - summary.totalExpenses;
    
    return {
      invoices: invoicesList,
      summary,
      period: fiscalPeriod || {
        startMonth: 1,
        startYear: new Date().getFullYear(),
        endMonth: 12,
        endYear: new Date().getFullYear()
      }
    };
  }

  // Generate row fingerprint for duplicate detection
  private generateRowFingerprint(row: any, invoiceType: 'income' | 'expense', invoiceDate: Date | null): string {
    const crypto = require('crypto');
    const clientCuit = (row.cuit || '').trim().toUpperCase();
    const invoiceNumber = (row.invoiceNumber || row.numero || row.número || '').trim().toUpperCase();
    const dateISO = invoiceDate ? invoiceDate.toISOString().split('T')[0] : '';
    const normalizedTotal = this.normalizeArgentineNumber(row.totalAmount || row.total || '0');
    const totalCents = Math.round(normalizedTotal * 100);
    
    const fingerprint = `${clientCuit}|${invoiceNumber}|${dateISO}|${invoiceType}|${totalCents}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  // Normalize Argentine decimal numbers (1.234,56 -> 1234.56)
  private normalizeArgentineNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const str = String(value).trim();
    // Handle format like "1.234,56" or "$1.234,56"
    if (str.includes('.') && str.includes(',') && str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Remove thousand separators (dots) and convert comma to decimal point
      return parseFloat(str.replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '.'));
    }
    // Handle format like "1234,56"
    if (str.includes(',') && !str.includes('.')) {
      return parseFloat(str.replace(/[$\s]/g, '').replace(/,/g, '.'));
    }
    // Default handling
    return parseFloat(str.replace(/[$\s]/g, '')) || 0;
  }

  // Private helper for transaction-aware fingerprint search
  private async findInvoiceByFingerprintTx(fingerprint: string, tx?: any): Promise<Invoice | undefined> {
    const dbQuery = tx || db;
    const [invoice] = await dbQuery
      .select()
      .from(invoices)
      .where(eq(invoices.fingerprint, fingerprint))
      .limit(1);
    return invoice || undefined;
  }

  // Helper function to generate unique keys for deduplication
  private generateUniqueKey(invoice: any): string {
    // U1: CUIT + invoiceNumber + date + totalAmount + type + class
    const normalizedCuit = (invoice.cuit || '').replace(/[-\s]/g, '');
    const normalizedNumber = (invoice.invoiceNumber || '').toLowerCase().trim();
    const dateStr = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '';
    const total = invoice.totalAmount || 0;
    const type = invoice.type || '';
    const invoiceClass = invoice.invoiceClass || 'A';
    
    return `${normalizedCuit}_${normalizedNumber}_${dateStr}_${total}_${type}_${invoiceClass}`;
  }

  // Helper function to generate fallback unique key
  private generateFallbackKey(invoice: any): string {
    // U2: normalized_name + invoiceNumber + date + totalAmount + type + class
    const normalizedName = (invoice.clientProviderName || '').toLowerCase().replace(/[^\w]/g, '');
    const normalizedNumber = (invoice.invoiceNumber || '').toLowerCase().trim();
    const dateStr = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '';
    const total = invoice.totalAmount || 0;
    const type = invoice.type || '';
    const invoiceClass = invoice.invoiceClass || 'A';
    
    return `${normalizedName}_${normalizedNumber}_${dateStr}_${total}_${type}_${invoiceClass}`;
  }

  async previewImportData(data: any[], userId?: string): Promise<{
    summary: {
      total: number;
      newRecords: number;
      duplicates: number;
      conflicts: number;
      errors: number;
    };
    conflicts: Array<{
      row: number;
      type: 'duplicate' | 'conflict';
      existing: any;
      incoming: any;
      uniqueKey: string;
    }>;
    errors: Array<{
      row: number;
      error: string;
      data: any;
    }>;
  }> {
    const summary = {
      total: data.length,
      newRecords: 0,
      duplicates: 0,
      conflicts: 0,
      errors: 0
    };
    
    const conflicts: any[] = [];
    const errors: any[] = [];
    const seenKeys = new Set<string>();

    // Get all existing invoices for comparison
    const existingInvoices = await db.select().from(invoices);
    const existingByKey = new Map<string, any>();
    
    // Build lookup maps for existing invoices
    for (const existing of existingInvoices) {
      const key1 = this.generateUniqueKey(existing);
      const key2 = this.generateFallbackKey(existing);
      existingByKey.set(key1, existing);
      existingByKey.set(key2, existing);
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate and normalize the row data
        const processedRow = await this.processImportRow(row, i);
        
        // Generate unique keys
        const uniqueKey = this.generateUniqueKey(processedRow);
        const fallbackKey = this.generateFallbackKey(processedRow);
        
        // Check for duplicates within the import data itself
        if (seenKeys.has(uniqueKey) || seenKeys.has(fallbackKey)) {
          summary.duplicates++;
          conflicts.push({
            row: i + 1,
            type: 'duplicate',
            existing: null,
            incoming: processedRow,
            uniqueKey
          });
          continue;
        }
        
        // Check against existing database records
        const existingRecord = existingByKey.get(uniqueKey) || existingByKey.get(fallbackKey);
        
        if (existingRecord) {
          summary.conflicts++;
          conflicts.push({
            row: i + 1,
            type: 'conflict',
            existing: existingRecord,
            incoming: processedRow,
            uniqueKey
          });
        } else {
          summary.newRecords++;
        }
        
        seenKeys.add(uniqueKey);
        seenKeys.add(fallbackKey);
        
      } catch (error) {
        summary.errors++;
        errors.push({
          row: i + 1,
          error: String(error),
          data: row
        });
      }
    }

    return {
      summary,
      conflicts,
      errors
    };
  }

  async commitImportData(data: any[], options: {
    userId: string;
    userName: string;
    duplicateMode: 'skip' | 'update' | 'duplicate';
    createBackup?: boolean;
  }): Promise<{
    success: number;
    failed: number;
    updated: number;
    skipped: number;
    errors: string[];
    backupId?: string;
  }> {
    let backupId: string | undefined;
    
    // Create backup if requested
    if (options.createBackup) {
      backupId = await this.createImportBackup(
        `Pre-import backup before ${new Date().toISOString()}`,
        options.userId,
        options.userName
      );
    }

    let success = 0;
    let failed = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get existing invoices for conflict detection
    const existingInvoices = await db.select().from(invoices);
    const existingByKey = new Map<string, any>();
    
    for (const existing of existingInvoices) {
      const key1 = this.generateUniqueKey(existing);
      const key2 = this.generateFallbackKey(existing);
      existingByKey.set(key1, existing);
      existingByKey.set(key2, existing);
    }

    return await db.transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        try {
          const processedRow = await this.processImportRow(row, i);
          const uniqueKey = this.generateUniqueKey(processedRow);
          const fallbackKey = this.generateFallbackKey(processedRow);
          
          const existingRecord = existingByKey.get(uniqueKey) || existingByKey.get(fallbackKey);
          
          if (existingRecord) {
            // Handle conflicts based on duplicate mode
            if (options.duplicateMode === 'skip') {
              skipped++;
              continue;
            } else if (options.duplicateMode === 'update') {
              // Update existing record
              await tx
                .update(invoices)
                .set({
                  ...processedRow,
                  updatedAt: new Date()
                })
                .where(eq(invoices.id, existingRecord.id));
              updated++;
            } else if (options.duplicateMode === 'duplicate') {
              // Insert as new record with duplicate flag
              const invoiceData = {
                ...processedRow,
                extractedData: JSON.stringify({
                  ...JSON.parse(processedRow.extractedData || '{}'),
                  isDuplicate: true,
                  originalId: existingRecord.id
                })
              };
              
              await tx.insert(invoices).values(invoiceData);
              success++;
            }
          } else {
            // Insert new record
            await tx.insert(invoices).values(processedRow);
            success++;
          }
          
        } catch (error) {
          failed++;
          errors.push(`Fila ${i + 1}: ${String(error)}`);
        }
      }

      // Log the import activity
      await tx.insert(activityLogs).values({
        userId: options.userId,
        userName: options.userName,
        actionType: 'import',
        entityType: 'invoice',
        description: `Excel import completed: ${success} created, ${updated} updated, ${skipped} skipped, ${failed} failed`,
        metadata: JSON.stringify({
          importMode: options.duplicateMode,
          backupId,
          success,
          failed,
          updated,
          skipped,
          errors: errors.slice(0, 10) // Store first 10 errors
        })
      });

      return {
        success,
        failed,
        updated,
        skipped,
        errors,
        backupId
      };
    });
  }

  async createImportBackup(description: string, userId: string, userName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const filePath = path.join(process.cwd(), 'backups', filename);
    
    // Ensure backup directory exists
    const backupDir = path.dirname(filePath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Export all current data
    const allInvoices = await db.select().from(invoices);
    const allClientsProviders = await db.select().from(clientsProviders);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      invoices: allInvoices,
      clientsProviders: allClientsProviders,
      metadata: {
        description,
        createdBy: userName,
        version: '1.0'
      }
    };

    // Write backup file
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    const stats = fs.statSync(filePath);
    
    // Record backup in database
    const [backup] = await db.insert(dataBackups).values({
      filename,
      description,
      backupType: 'pre-import',
      fileSize: stats.size,
      recordCount: allInvoices.length,
      createdBy: userId,
      createdByName: userName,
      filePath,
      metadata: JSON.stringify({
        invoiceCount: allInvoices.length,
        clientProviderCount: allClientsProviders.length
      })
    }).returning();

    return backup.id;
  }

  async rollbackFromBackup(backupId: string, userId: string): Promise<boolean> {
    try {
      const [backup] = await db.select().from(dataBackups).where(eq(dataBackups.id, backupId));
      
      if (!backup || !fs.existsSync(backup.filePath)) {
        throw new Error('Backup not found or file missing');
      }

      const backupData = JSON.parse(fs.readFileSync(backup.filePath, 'utf8'));
      
      return await db.transaction(async (tx) => {
        // Clear current data
        await tx.delete(invoices);
        await tx.delete(clientsProviders);
        
        // Restore from backup
        if (backupData.clientsProviders?.length > 0) {
          await tx.insert(clientsProviders).values(backupData.clientsProviders);
        }
        
        if (backupData.invoices?.length > 0) {
          await tx.insert(invoices).values(backupData.invoices);
        }

        // Log the rollback
        await tx.insert(activityLogs).values({
          userId,
          userName: 'System',
          actionType: 'import',
          entityType: 'backup',
          description: `Rollback from backup: ${backup.filename}`,
          metadata: JSON.stringify({
            backupId,
            restoredInvoices: backupData.invoices?.length || 0,
            restoredClients: backupData.clientsProviders?.length || 0
          })
        });

        return true;
      });
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  // Helper function to process and validate a single import row
  private async processImportRow(row: any, index: number): Promise<any> {
    // Parse and validate date
    let invoiceDate = null;
    if (row.date || row.fecha) {
      const dateStr = row.date || row.fecha;
      if (typeof dateStr === 'number') {
        // Excel date serial number
        invoiceDate = new Date((dateStr - 25569) * 86400 * 1000);
      } else {
        // Parse string dates
        invoiceDate = new Date(dateStr);
        if (isNaN(invoiceDate.getTime())) {
          // Try parsing DD/MM/YYYY format
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            invoiceDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }
      
      if (isNaN(invoiceDate.getTime())) {
        invoiceDate = null;
      }
    }

    // Determine invoice type
    let invoiceType = 'expense'; // default
    if (row.type === 'income' || row.type === 'expense') {
      invoiceType = row.type;
    } else if (row.tipo) {
      invoiceType = row.tipo.toLowerCase().includes('ingreso') ? 'income' : 'expense';
    }

    // Parse amounts
    const subtotal = this.normalizeArgentineNumber(row.subtotal || '0');
    const ivaAmount = this.normalizeArgentineNumber(row.ivaAmount || row.iva || '0');
    const totalAmount = this.normalizeArgentineNumber(row.totalAmount || row.total || '0');
    const iibbAmount = this.normalizeArgentineNumber(row.iibbAmount || row.iibb || '0');
    const gananciasAmount = this.normalizeArgentineNumber(row.gananciasAmount || row.ganancias || '0');
    const otherTaxes = this.normalizeArgentineNumber(row.otherTaxes || row.otros || '0');

    // Validate amounts
    if (totalAmount <= 0) {
      throw new Error('Total amount must be greater than 0');
    }

    const clientProviderName = row.clientName || row.cliente || row.clientProviderName || 'Sin especificar';
    
    return {
      type: invoiceType,
      invoiceClass: row.invoiceClass || row.clase || 'A',
      invoiceNumber: row.invoiceNumber || row.numero || null,
      date: invoiceDate,
      clientProviderName,
      subtotal: subtotal.toString(),
      ivaAmount: ivaAmount.toString(),
      iibbAmount: iibbAmount.toString(),
      gananciasAmount: gananciasAmount.toString(),
      otherTaxes: otherTaxes.toString(),
      totalAmount: totalAmount.toString(),
      paymentStatus: row.paymentStatus || row.estado || 'pending',
      uploadedBy: 'import-user',
      uploadedByName: 'Excel Import',
      ownerName: row.issuer || row.emisor || 'Franco',
      needsReview: false,
      aiExtracted: false,
      extractedData: JSON.stringify({
        source: 'excel_import',
        originalRow: row,
        importedAt: new Date().toISOString()
      })
    };
  }

  async importInvoiceData(data: any[], userId?: string, userName?: string): Promise<{ success: number; failed: number; errors: string[]; details: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const details: any[] = [];
    
    // Start transaction for atomic operations
    return await db.transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Map Excel columns to database fields
        // Expected columns: Fecha | Tipo | Emisor | Cliente | CUIT | Número | Subtotal | IVA | Total | Clase | IIBB | Ganancias | Otros
        
        // Determine invoice type first
        const invoiceType = row.type || (row.tipo === 'Ingreso' ? 'income' : 'expense') || 'expense';
        
        // Determine client/provider name from the Excel data
        const clientProviderName = row.clientName || row.cliente || row.clientProviderName || 'Sin especificar';
        
        // Auto-create or find client/provider if needed (using transaction)
        let clientProviderId = null;
        if (clientProviderName && clientProviderName !== 'Sin especificar') {
          // Check if client/provider exists using transaction
          const [existingClient] = await tx
            .select()
            .from(clientsProviders)
            .where(eq(clientsProviders.name, clientProviderName))
            .limit(1);
          
          let clientProvider = existingClient;
          
          if (!clientProvider) {
            // Create new client/provider within transaction
            const isClient = invoiceType === 'income';
            const [created] = await tx
              .insert(clientsProviders)
              .values({
                name: clientProviderName,
                type: isClient ? 'client' : 'provider',
                cuit: row.cuit || null,
                email: null,
                phone: null,
                address: null,
              })
              .returning();
            clientProvider = created;
          } else if (row.cuit && !clientProvider.cuit) {
            // Update CUIT if it was missing (within transaction)
            await tx
              .update(clientsProviders)
              .set({ cuit: row.cuit })
              .where(eq(clientsProviders.id, clientProvider.id));
          }
          
          clientProviderId = clientProvider.id;
        }
        
        // Map issuer to owner/socio
        const ownerName = row.issuer || row.emisor || row.ownerName || 'Franco';
        
        // Parse date - handle different formats
        let invoiceDate = null;
        if (row.date || row.fecha) {
          const dateStr = row.date || row.fecha;
          // Handle Excel date serial numbers
          if (typeof dateStr === 'number') {
            // Excel stores dates as number of days since 1900-01-01
            invoiceDate = new Date((dateStr - 25569) * 86400 * 1000);
          } else if (typeof dateStr === 'string') {
            // Try parsing DD/MM/YYYY or YYYY-MM-DD formats
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              invoiceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
              invoiceDate = new Date(dateStr);
            }
          } else {
            invoiceDate = new Date(dateStr);
          }
          
          // Validate date is reasonable (not in future, not too old)
          const now = new Date();
          const minDate = new Date('2020-01-01');
          if (invoiceDate > now || invoiceDate < minDate) {
            invoiceDate = null;
          }
        }
        
        // invoiceType already declared above, just use it
        
        // Generate fingerprint for duplicate detection
        const fingerprint = this.generateRowFingerprint(row, invoiceType, invoiceDate);
        
        // Check for existing invoice with same fingerprint (using transaction)
        const existingInvoice = await this.findInvoiceByFingerprintTx(fingerprint, tx);
        if (existingInvoice) {
          failed++;
          const errorMsg = `Fila ${i + 1}: Factura duplicada (${row.invoiceNumber || 'sin número'} - ${clientProviderName})`;
          errors.push(errorMsg);
          details.push({
            row: i + 1,
            success: false,
            error: errorMsg,
            duplicate: true,
            existingId: existingInvoice.id,
          });
          continue;
        }
        
        // Normalize Argentine decimal numbers
        const normalizedSubtotal = this.normalizeArgentineNumber(row.subtotal || '0');
        const normalizedIva = this.normalizeArgentineNumber(row.ivaAmount || row.iva || '0');
        const normalizedIibb = this.normalizeArgentineNumber(row.iibbAmount || row.iibb || '0');
        const normalizedGanancias = this.normalizeArgentineNumber(row.gananciasAmount || row.ganancias || '0');
        const normalizedOther = this.normalizeArgentineNumber(row.otherTaxes || row.otros || '0');
        const normalizedTotal = this.normalizeArgentineNumber(row.totalAmount || row.total || '0');
        
        // Validate invoice class
        const invoiceClass = (row.invoiceClass || row.clase || row.class || 'A').toUpperCase();
        if (!['A', 'B', 'C'].includes(invoiceClass)) {
          failed++;
          const errorMsg = `Fila ${i + 1}: Clase de factura inválida: ${invoiceClass}`;
          errors.push(errorMsg);
          details.push({
            row: i + 1,
            success: false,
            error: errorMsg,
          });
          continue;
        }
        
        // Validate payment status
        const paymentStatus = (row.paymentStatus || row.estadoPago || 'pending').toLowerCase();
        if (!['pending', 'paid', 'overdue', 'cancelled'].includes(paymentStatus)) {
          failed++;
          const errorMsg = `Fila ${i + 1}: Estado de pago inválido: ${paymentStatus}`;
          errors.push(errorMsg);
          details.push({
            row: i + 1,
            success: false,
            error: errorMsg,
          });
          continue;
        }
        
        // Validate and transform Excel data to invoice format
        const invoice: InsertInvoice = {
          type: invoiceType,
          invoiceClass: invoiceClass as 'A' | 'B' | 'C',
          invoiceNumber: row.invoiceNumber || row.numero || row.número || `IMP-${Date.now()}-${i}`,
          date: invoiceDate,
          clientProviderName,
          clientProviderId,
          ownerName,
          ownerId: userId || 'user-test',
          subtotal: String(normalizedSubtotal),
          ivaAmount: String(normalizedIva),
          iibbAmount: String(normalizedIibb),
          gananciasAmount: String(normalizedGanancias),
          otherTaxes: String(normalizedOther),
          totalAmount: String(normalizedTotal),
          uploadedBy: userId || 'user-test',
          uploadedByName: userName || 'Importación Excel',
          paymentStatus: paymentStatus as 'pending' | 'paid' | 'overdue' | 'cancelled',
          fingerprint,
        };
        
        // Create invoice within transaction with duplicate error handling
        try {
          const [created] = await tx
            .insert(invoices)
            .values(invoice)
            .returning();
          
          // Update client/provider within transaction if exists
          if (invoice.clientProviderId) {
            await tx
              .update(clientsProviders)
              .set({
                lastInvoiceDate: new Date(),
                totalOperations: sql`${clientsProviders.totalOperations} + ${invoice.totalAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(clientsProviders.id, invoice.clientProviderId));
          }
          
          success++;
          details.push({
            row: i + 1,
            success: true,
            invoiceNumber: invoice.invoiceNumber,
            id: created.id,
            fingerprint,
          });
        } catch (dbError: any) {
          // Handle unique constraint violation on fingerprint
          if (dbError?.code === '23505' && dbError?.constraint?.includes('fingerprint')) {
            failed++;
            const errorMsg = `Fila ${i + 1}: Factura duplicada detectada por la base de datos`;
            errors.push(errorMsg);
            details.push({
              row: i + 1,
              success: false,
              error: errorMsg,
              duplicate: true,
            });
          } else {
            // Re-throw other database errors
            throw dbError;
          }
        }
        // Success handling moved to try block above
      } catch (error) {
        failed++;
        const errorMsg = `Fila ${i + 1}: ${error}`;
        errors.push(errorMsg);
        details.push({
          row: i + 1,
          success: false,
          error: errorMsg,
        });
      }
    }
      
      return { success, failed, errors, details };
    });
  }

  // Invoice Templates Implementation  
  async getInvoiceTemplates(userId: string): Promise<InvoiceTemplate[]> {
    const templates = await db
      .select()
      .from(invoiceTemplates)
      .where(eq(invoiceTemplates.userId, userId))
      .orderBy(desc(invoiceTemplates.updatedAt));
    return templates;
  }

  async getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined> {
    const [template] = await db
      .select()
      .from(invoiceTemplates)
      .where(eq(invoiceTemplates.id, id));
    return template || undefined;
  }

  async createInvoiceTemplate(template: InsertInvoiceTemplate): Promise<InvoiceTemplate> {
    const [created] = await db
      .insert(invoiceTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateInvoiceTemplate(id: string, updates: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined> {
    const [updated] = await db
      .update(invoiceTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoiceTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInvoiceTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(invoiceTemplates)
      .where(eq(invoiceTemplates.id, id));
    return result.rowCount === 1;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(invoiceTemplates)
      .set({ 
        usageCount: sql`${invoiceTemplates.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(invoiceTemplates.id, id));
  }

  // Admin Operations Implementation
  async createDataBackup(): Promise<{ backupId: string; filename: string; size: number }> {
    const backupId = Date.now().toString();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    
    try {
      // Export all data
      const [invoicesResult, allClients, allUsers, allLogs] = await Promise.all([
        this.getAllInvoices({ limit: 10000 }),
        this.getAllClientsProviders(),
        this.getAllUsers(),
        this.getActivityLogs({ limit: 1000 })
      ]);
      const allInvoices = invoicesResult.invoices;

      const backupData = {
        backupId,
        timestamp,
        version: '1.0',
        data: {
          invoices: allInvoices,
          clients: allClients,
          users: allUsers.map(u => ({ ...u, password: '[REDACTED]' })), // Hide passwords
          activityLogs: allLogs
        }
      };

      // Save backup to file system for real persistence
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure backups directory exists
      const backupsDir = path.join(process.cwd(), 'backups');
      try {
        await fs.mkdir(backupsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
      
      const filePath = path.join(backupsDir, filename);
      const backupJson = JSON.stringify(backupData, null, 2);
      
      // Write backup to disk
      await fs.writeFile(filePath, backupJson, 'utf8');
      
      const size = Buffer.byteLength(backupJson, 'utf8');
      
      // Record backup in database
      await db.insert(dataBackups).values({
        id: backupId,
        filename,
        description: 'Full system backup',
        backupType: 'auto',
        fileSize: size,
        recordCount: allInvoices.length + allClients.length + allUsers.length,
        createdBy: 'system',
        createdByName: 'Sistema',
        filePath: filePath,
        metadata: JSON.stringify({
          version: '1.0',
          backupDate: new Date().toISOString(),
          totalInvoices: allInvoices.length,
          totalClients: allClients.length,
          totalUsers: allUsers.length
        })
      });
      
      // Log the backup creation
      await this.createActivityLog({
        userId: 'system',
        userName: 'System',
        actionType: 'export',
        entityType: 'backup',
        entityId: backupId,
        description: `Backup creado: ${filename}`,
        metadata: JSON.stringify({ filename, size }),
        ipAddress: '127.0.0.1'
      });

      console.log(`✅ Backup created and persisted: ${filename} (${Math.round(size / 1024)} KB) at ${filePath}`);
      return { backupId, filename, size, filePath };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  async resetTestData(adminUserId: string): Promise<{ deletedInvoices: number; deletedClients: number; deletedLogs: number }> {
    try {
      // Only allow admin users to perform this operation
      const admin = await this.getUser(adminUserId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Only admin users can reset test data');
      }

      // Create backup before reset
      const backup = await this.createDataBackup();
      console.log(`Backup created before reset: ${backup.filename}`);

      let deletedInvoices = 0;
      let deletedClients = 0;
      let deletedLogs = 0;

      // Delete test invoices (mark as test if they have specific pattern or are recent)
      const testInvoices = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          or(
            ilike(invoices.invoiceNumber, '%TEST%'),
            ilike(invoices.clientProviderName, '%test%'),
            gte(invoices.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
          )
        );

      for (const invoice of testInvoices) {
        await this.deleteInvoice(invoice.id, adminUserId, 'Admin');
        deletedInvoices++;
      }

      // Delete test clients (those with 'test' in name or with no real operations)
      const testClients = await db
        .select({ id: clientsProviders.id })
        .from(clientsProviders)
        .where(
          or(
            ilike(clientsProviders.name, '%test%'),
            eq(clientsProviders.totalOperations, '0')
          )
        );

      for (const client of testClients) {
        await this.deleteClientProvider(client.id);
        deletedClients++;
      }

      // Delete old activity logs (keep last 30 days)
      const oldLogs = await db
        .delete(activityLogs)
        .where(
          and(
            lte(activityLogs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )
        );
      deletedLogs = oldLogs.rowCount || 0;

      // Log the reset operation
      await this.createActivityLog({
        userId: adminUserId,
        userName: admin.displayName,
        actionType: 'delete',
        entityType: 'system',
        entityId: 'test-data-reset',
        description: `Reset de datos de prueba: ${deletedInvoices} facturas, ${deletedClients} clientes, ${deletedLogs} logs`,
        metadata: JSON.stringify({ 
          backupId: backup.backupId,
          deletedInvoices,
          deletedClients,
          deletedLogs
        }),
        ipAddress: '127.0.0.1'
      });

      return { deletedInvoices, deletedClients, deletedLogs };
    } catch (error) {
      console.error('Error resetting test data:', error);
      throw error;
    }
  }

  async getSystemMetrics(): Promise<{
    totalUsers: number;
    totalInvoices: number;
    totalClients: number;
    diskUsage: number;
    aiExtractionAccuracy: number;
  }> {
    try {
      const [usersCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      const [invoicesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices);

      const [clientsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(clientsProviders);

      // Simulate disk usage calculation
      const diskUsage = (invoicesCount.count * 0.5) + (clientsCount.count * 0.1); // MB

      // Calculate AI extraction accuracy from recent activity
      const recentExtractions = await db
        .select({ 
          total: sql<number>`count(*)`,
          successful: sql<number>`count(*) filter (where ${activityLogs.metadata} not like '%needs_review%')`
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.actionType, 'upload'),
            gte(activityLogs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )
        );

      const aiExtractionAccuracy = recentExtractions[0]?.total > 0 
        ? (recentExtractions[0].successful / recentExtractions[0].total) * 100 
        : 95; // Default accuracy

      return {
        totalUsers: usersCount.count,
        totalInvoices: invoicesCount.count,
        totalClients: clientsCount.count,
        diskUsage: Math.round(diskUsage * 100) / 100,
        aiExtractionAccuracy: Math.round(aiExtractionAccuracy * 100) / 100
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw new Error('Failed to get system metrics');
    }
  }

  // Google Sheets Export Implementation
  async exportToGoogleSheets(): Promise<ExportData[]> {
    return this.getExportableData();
  }

  async getExportableData(): Promise<ExportData[]> {
    try {
      const result = await this.getAllInvoices({ limit: 10000 });
      const allInvoices = result.invoices;
      
      return allInvoices.map(invoice => ({
        fecha: invoice.date ? new Date(invoice.date).toLocaleDateString('es-AR') : '',
        numeroFactura: invoice.invoiceNumber || '',
        tipo: invoice.type === 'income' ? 'Ingreso' : invoice.type === 'expense' ? 'Egreso' : 'Neutral',
        clase: invoice.invoiceClass || '',
        clienteProveedor: invoice.clientProviderName || '',
        cuit: invoice.clientProviderCuit || '',
        subtotal: this.normalizeArgentineNumber(invoice.subtotal || 0),
        iva: this.normalizeArgentineNumber(invoice.ivaAmount || 0),
        otrosImpuestos: this.normalizeArgentineNumber(invoice.otherTaxes || 0),
        total: this.normalizeArgentineNumber(invoice.totalAmount || 0),
        estadoPago: invoice.paymentStatus === 'paid' ? 'Pagado' : 
                   invoice.paymentStatus === 'pending' ? 'Pendiente' :
                   invoice.paymentStatus === 'overdue' ? 'Vencido' : 'Cancelado',
        fechaPago: invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('es-AR') : '',
        propietario: invoice.ownerName || '',
        fechaCreacion: new Date(invoice.createdAt).toLocaleDateString('es-AR')
      }));
    } catch (error) {
      console.error('Error getting exportable data:', error);
      throw new Error('Failed to get exportable data');
    }
  }

  // AI Feedback and Review Queue Implementation
  async markInvoiceForReview(invoiceId: string, reason: string, userId: string): Promise<void> {
    try {
      await db
        .update(invoices)
        .set({ 
          needsReview: true,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId));

      await this.createActivityLog({
        userId,
        userName: 'Sistema',
        actionType: 'update',
        entityType: 'invoice',
        entityId: invoiceId,
        description: `Factura marcada para revisión: ${reason}`,
        metadata: JSON.stringify({ reason, needsReview: true }),
        ipAddress: '127.0.0.1'
      });
    } catch (error) {
      console.error('Error marking invoice for review:', error);
      throw new Error('Failed to mark invoice for review');
    }
  }

  async getInvoicesNeedingReview(): Promise<InvoiceWithRelations[]> {
    try {
      const needsReviewInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.needsReview, true))
        .orderBy(desc(invoices.createdAt));

      return needsReviewInvoices.map(invoice => ({
        ...invoice,
        clientProvider: null, // We don't need to join for this query
        ivaComponents: [] // We don't need IVA components for review queue
      }));
    } catch (error) {
      console.error('Error getting invoices needing review:', error);
      throw new Error('Failed to get invoices needing review');
    }
  }

  async getInvoicesPendingReview(): Promise<Array<Invoice & { clientProvider: any; ivaComponents: any[]; fileName?: string; uploadedByName?: string }>> {
    try {
      const pendingInvoices = await db
        .select({
          id: invoices.id,
          type: invoices.type,
          invoiceClass: invoices.invoiceClass,
          invoiceNumber: invoices.invoiceNumber,
          date: invoices.date,
          clientProviderId: invoices.clientProviderId,
          clientProviderName: invoices.clientProviderName,
          subtotal: invoices.subtotal,
          ivaAmount: invoices.ivaAmount,
          iibbAmount: invoices.iibbAmount,
          gananciasAmount: invoices.gananciasAmount,
          otherTaxes: invoices.otherTaxes,
          totalAmount: invoices.totalAmount,
          paymentStatus: invoices.paymentStatus,
          paymentDate: invoices.paymentDate,
          dueDate: invoices.dueDate,
          uploadedBy: invoices.uploadedBy,
          uploadedByName: invoices.uploadedByName,
          ownerId: invoices.ownerId,
          ownerName: invoices.ownerName,
          filePath: invoices.filePath,
          fileName: invoices.fileName,
          fileSize: invoices.fileSize,
          fingerprint: invoices.fingerprint,
          extractedData: invoices.extractedData,
          processed: invoices.processed,
          needsReview: invoices.needsReview,
          reviewStatus: invoices.reviewStatus,
          extractionConfidence: invoices.extractionConfidence,
          aiExtracted: invoices.aiExtracted,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .where(eq(invoices.reviewStatus, 'pending_review'))
        .orderBy(desc(invoices.createdAt));

      return pendingInvoices.map(invoice => ({
        ...invoice,
        clientProvider: null, // We don't join client data for review queue  
        ivaComponents: [] // We don't need IVA components for review queue
      }));
    } catch (error) {
      console.error('Error getting invoices pending review:', error);
      throw new Error('Failed to get invoices pending review');
    }
  }

  async submitAIFeedback(invoiceId: string, corrections: any, userId: string): Promise<void> {
    try {
      // Update the invoice with corrected data
      const correctionFields: any = {};
      if (corrections.clientProviderName) correctionFields.clientProviderName = corrections.clientProviderName;
      if (corrections.subtotal) correctionFields.subtotal = corrections.subtotal;
      if (corrections.ivaAmount) correctionFields.ivaAmount = corrections.ivaAmount;
      if (corrections.totalAmount) correctionFields.totalAmount = corrections.totalAmount;
      if (corrections.date) correctionFields.date = new Date(corrections.date);
      if (corrections.invoiceNumber) correctionFields.invoiceNumber = corrections.invoiceNumber;
      
      // Mark as reviewed
      correctionFields.needsReview = false;
      correctionFields.updatedAt = new Date();

      await db
        .update(invoices)
        .set(correctionFields)
        .where(eq(invoices.id, invoiceId));

      // Log the feedback for AI training
      await this.createActivityLog({
        userId,
        userName: 'Usuario',
        actionType: 'update',
        entityType: 'ai_feedback',
        entityId: invoiceId,
        description: `Correcciones aplicadas por usuario para mejora de AI`,
        metadata: JSON.stringify({ 
          originalData: 'extracted_by_ai',
          corrections,
          feedbackType: 'user_correction'
        }),
        ipAddress: '127.0.0.1'
      });
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      throw new Error('Failed to submit AI feedback');
    }
  }

  async getAIFeedbackStats(): Promise<{
    totalReviewed: number;
    correctExtractions: number;
    incorrectExtractions: number;
    accuracyRate: number;
  }> {
    try {
      const [reviewStats] = await db
        .select({
          totalReviewed: sql<number>`count(*) filter (where ${activityLogs.entityType} = 'ai_feedback')`,
          totalExtractions: sql<number>`count(*) filter (where ${activityLogs.actionType} = 'upload')`
        })
        .from(activityLogs)
        .where(
          gte(activityLogs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        );

      const totalReviewed = reviewStats?.totalReviewed || 0;
      const totalExtractions = reviewStats?.totalExtractions || 0;
      const correctExtractions = Math.max(0, totalExtractions - totalReviewed);
      const incorrectExtractions = totalReviewed;
      const accuracyRate = totalExtractions > 0 ? (correctExtractions / totalExtractions) * 100 : 95;

      return {
        totalReviewed,
        correctExtractions,
        incorrectExtractions,
        accuracyRate: Math.round(accuracyRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting AI feedback stats:', error);
      return {
        totalReviewed: 0,
        correctExtractions: 0,
        incorrectExtractions: 0,
        accuracyRate: 95
      };
    }
  }

  // Upload Jobs Implementation
  async createUploadJob(job: InsertUploadJob): Promise<UploadJob> {
    const [createdJob] = await db
      .insert(uploadJobs)
      .values({
        ...job,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdJob;
  }

  async getUploadJob(id: string): Promise<UploadJob | undefined> {
    const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, id));
    return job || undefined;
  }

  async updateUploadJob(id: string, updates: Partial<InsertUploadJob>): Promise<UploadJob | undefined> {
    const [updatedJob] = await db
      .update(uploadJobs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(uploadJobs.id, id))
      .returning();
    return updatedJob || undefined;
  }

  async deleteUploadJob(id: string): Promise<boolean> {
    const result = await db.delete(uploadJobs).where(eq(uploadJobs.id, id));
    return result.rowCount > 0;
  }

  async getRecentUploadJobs(userId: string, minutes: number = 10): Promise<UploadJob[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return await db
      .select()
      .from(uploadJobs)
      .where(and(eq(uploadJobs.userId, userId), gte(uploadJobs.createdAt, cutoff)))
      .orderBy(desc(uploadJobs.createdAt));
  }

  async getPendingUploadJobs(): Promise<UploadJob[]> {
    return await db
      .select()
      .from(uploadJobs)
      .where(or(eq(uploadJobs.status, 'queued'), eq(uploadJobs.status, 'processing')));
  }

  async getUploadJobsByStatus(status: 'queued' | 'processing' | 'success' | 'duplicate' | 'error' | 'quarantined'): Promise<UploadJob[]> {
    return await db
      .select()
      .from(uploadJobs)
      .where(eq(uploadJobs.status, status));
  }

  async quarantineUploadJob(id: string): Promise<UploadJob | undefined> {
    const [quarantinedJob] = await db
      .update(uploadJobs)
      .set({
        quarantinedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(uploadJobs.id, id))
      .returning();
    return quarantinedJob || undefined;
  }

  async retryUploadJob(id: string): Promise<UploadJob | undefined> {
    const [retriedJob] = await db
      .update(uploadJobs)
      .set({
        status: 'queued',
        retryCount: sql`${uploadJobs.retryCount} + 1`,
        lastRetryAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(uploadJobs.id, id))
      .returning();
    return retriedJob || undefined;
  }
}

export const storage = new DatabaseStorage();

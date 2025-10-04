/**
 * Invoice Repository Interface - Domain Layer
 * Defines the contract for invoice data access
 */
import { Invoice, ClientProvider, User, ActivityLog } from '../entities/invoice.entity';

export interface InvoiceFilters {
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
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
}

export interface IInvoiceRepository {
  // Invoice CRUD operations
  getAllInvoices(filters?: InvoiceFilters): Promise<InvoicesResponse>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getRecentInvoices(limit?: number): Promise<Invoice[]>;
  findInvoiceByFileInfo(fileName: string, fileSize: number): Promise<Invoice | undefined>;
  findInvoiceByFingerprint(fingerprint: string): Promise<Invoice | undefined>;
  createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, deletedBy: string, deletedByName: string): Promise<boolean>;
  
  // Client/Provider operations
  getClientProvider(id: string): Promise<ClientProvider | undefined>;
  getClientProviderByName(name: string): Promise<ClientProvider | undefined>;
  getClientProviderByCuit(cuit: string): Promise<ClientProvider | undefined>;
  createClientProvider(clientProvider: Omit<ClientProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientProvider>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Activity logging
  createActivityLog(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<ActivityLog>;
}

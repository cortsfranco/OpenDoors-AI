/**
 * Drizzle Invoice Repository - Infrastructure Layer
 * Concrete implementation of invoice repository using Drizzle ORM
 */
import { IInvoiceRepository, InvoiceFilters, InvoicesResponse } from '../../domain/repositories/invoice.repository';
import { Invoice, ClientProvider, User, ActivityLog } from '../../domain/entities/invoice.entity';
import { storage } from '../../../storage'; // Reusing existing storage implementation

export class DrizzleInvoiceRepository implements IInvoiceRepository {
  async getAllInvoices(filters?: InvoiceFilters): Promise<InvoicesResponse> {
    return await storage.getAllInvoices(filters);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return await storage.getInvoice(id);
  }

  async getRecentInvoices(limit?: number): Promise<Invoice[]> {
    return await storage.getRecentInvoices(limit);
  }

  async findInvoiceByFileInfo(fileName: string, fileSize: number): Promise<Invoice | undefined> {
    return await storage.findInvoiceByFileInfo(fileName, fileSize);
  }

  async findInvoiceByFingerprint(fingerprint: string): Promise<Invoice | undefined> {
    return await storage.findInvoiceByFingerprint(fingerprint);
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    return await storage.createInvoice(invoice);
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    return await storage.updateInvoice(id, updates);
  }

  async deleteInvoice(id: string, deletedBy: string, deletedByName: string): Promise<boolean> {
    return await storage.deleteInvoice(id, deletedBy, deletedByName);
  }

  async getClientProvider(id: string): Promise<ClientProvider | undefined> {
    return await storage.getClientProvider(id);
  }

  async getClientProviderByName(name: string): Promise<ClientProvider | undefined> {
    return await storage.getClientProviderByName(name);
  }

  async getClientProviderByCuit(cuit: string): Promise<ClientProvider | undefined> {
    return await storage.getClientProviderByCuit(cuit);
  }

  async createClientProvider(clientProvider: Omit<ClientProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientProvider> {
    return await storage.createClientProvider(clientProvider);
  }

  async getUser(id: string): Promise<User | undefined> {
    return await storage.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await storage.getUserByEmail(email);
  }

  async createActivityLog(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<ActivityLog> {
    return await storage.createActivityLog(log);
  }
}

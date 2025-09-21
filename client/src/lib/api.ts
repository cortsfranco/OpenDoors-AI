import { apiRequest } from "./queryClient";
import type { KPIData, ChartData, QuickStatsData, InvoiceFilters, InvoiceFormData, ClientFormData } from "./types";
import type { InvoiceWithRelations, ClientProvider, DeletedInvoiceLog } from "@shared/schema";

export const api = {
  // Dashboard
  getKPIs: async (): Promise<KPIData> => {
    const res = await apiRequest('GET', '/api/kpis');
    return res.json();
  },

  getChartData: async (): Promise<ChartData[]> => {
    const res = await apiRequest('GET', '/api/chart-data');
    return res.json();
  },

  getQuickStats: async (): Promise<QuickStatsData> => {
    const res = await apiRequest('GET', '/api/quick-stats');
    return res.json();
  },

  getRecentInvoices: async (limit = 10): Promise<InvoiceWithRelations[]> => {
    const res = await apiRequest('GET', `/api/recent-invoices?limit=${limit}`);
    return res.json();
  },

  getFilteredReports: async (month?: number, year?: number): Promise<KPIData> => {
    const params = new URLSearchParams();
    if (month !== undefined) params.set('month', month.toString());
    if (year !== undefined) params.set('year', year.toString());
    
    const res = await apiRequest('GET', `/api/reports?${params.toString()}`);
    return res.json();
  },

  getComprehensiveReport: async (filters?: {
    month?: number;
    year?: number;
    ownerName?: string;
    clientProviderName?: string;
    type?: 'income' | 'expense';
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.month !== undefined) params.set('month', filters.month.toString());
    if (filters?.year !== undefined) params.set('year', filters.year.toString());
    if (filters?.ownerName) params.set('ownerName', filters.ownerName);
    if (filters?.clientProviderName) params.set('clientProviderName', filters.clientProviderName);
    if (filters?.type) params.set('type', filters.type);
    
    const res = await apiRequest('GET', `/api/reports?${params.toString()}`);
    return res.json();
  },

  // Invoices
  getInvoices: async (filters?: InvoiceFilters): Promise<{ invoices: InvoiceWithRelations[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.month) params.set('month', filters.month.toString());
    if (filters?.year) params.set('year', filters.year.toString());
    if (filters?.user) params.set('user', filters.user);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.offset) params.set('offset', filters.offset.toString());

    const res = await apiRequest('GET', `/api/invoices?${params.toString()}`);
    return res.json();
  },

  getInvoice: async (id: string): Promise<InvoiceWithRelations> => {
    const res = await apiRequest('GET', `/api/invoices/${id}`);
    return res.json();
  },

  createInvoice: async (formData: FormData): Promise<InvoiceWithRelations> => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || res.statusText);
    }
    
    return res.json();
  },

  updateInvoice: async (id: string, data: Partial<InvoiceFormData>): Promise<InvoiceWithRelations> => {
    const res = await apiRequest('PUT', `/api/invoices/${id}`, data);
    return res.json();
  },

  deleteInvoice: async (id: string, deletedBy: string, deletedByName: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('DELETE', `/api/invoices/${id}`, { deletedBy, deletedByName });
    return res.json();
  },

  // Clients
  getClients: async (): Promise<ClientProvider[]> => {
    const res = await apiRequest('GET', '/api/clients');
    return res.json();
  },

  createClient: async (data: ClientFormData): Promise<ClientProvider> => {
    const res = await apiRequest('POST', '/api/clients', data);
    return res.json();
  },

  updateClient: async (id: string, data: Partial<ClientFormData>): Promise<ClientProvider> => {
    const res = await apiRequest('PUT', `/api/clients/${id}`, data);
    return res.json();
  },

  deleteClient: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('DELETE', `/api/clients/${id}`);
    return res.json();
  },

  // Trash
  getDeletedInvoices: async (): Promise<DeletedInvoiceLog[]> => {
    const res = await apiRequest('GET', '/api/trash');
    return res.json();
  },

  restoreInvoice: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('POST', `/api/trash/${id}/restore`);
    return res.json();
  },

  permanentlyDeleteInvoice: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('DELETE', `/api/trash/${id}`);
    return res.json();
  },

  emptyTrash: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('DELETE', '/api/trash');
    return res.json();
  },

  // Chat
  sendChatMessage: async (message: string): Promise<{ response: string }> => {
    const res = await apiRequest('POST', '/api/chat', { message });
    return res.json();
  },

  // Users & Profile
  getUsers: async (): Promise<any[]> => {
    const res = await apiRequest('GET', '/api/users');
    return res.json();
  },

  updateProfile: async (data: { name: string; email: string }): Promise<any> => {
    const res = await apiRequest('PUT', '/api/auth/profile', data);
    return res.json();
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<any> => {
    const res = await apiRequest('POST', '/api/auth/change-password', data);
    return res.json();
  },

  updateAvatar: async (formData: FormData): Promise<any> => {
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || res.statusText);
    }
    
    return res.json();
  },

  deleteUser: async (userId: string): Promise<any> => {
    const res = await apiRequest('DELETE', `/api/users/${userId}`);
    return res.json();
  },

  // Export
  exportCSV: async (filters?: InvoiceFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.month) params.set('month', filters.month.toString());
    if (filters?.year) params.set('year', filters.year.toString());
    if (filters?.user) params.set('user', filters.user);
    if (filters?.type) params.set('type', filters.type);

    const res = await fetch(`/api/export/csv?${params.toString()}`, {
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error('Error al exportar CSV');
    }
    
    return res.blob();
  },
};

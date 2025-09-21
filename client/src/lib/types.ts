export interface KPIData {
  totalIncome: string;
  totalExpenses: string;
  ivaBalance: string;
  generalBalance: string;
  incomeChange: string;
  expensesChange: string;
  profitability: string;
}

export interface ChartData {
  month: string;
  income: number;
  expenses: number;
}

export interface QuickStatsData {
  invoicesThisMonth: number;
  averageInvoice: string;
  ivaRecovered: string;
  pending: number;
  profitability: string;
}

export interface InvoiceFilters {
  search?: string;
  month?: number;
  year?: number;
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  user?: string;
  type?: 'income' | 'expense' | 'all';
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

export type InvoiceType = 'income' | 'expense' | 'neutral';
export type InvoiceClass = 'A' | 'B' | 'C';
export type ClientType = 'client' | 'provider' | 'both';

export interface InvoiceFormData {
  type: InvoiceType;
  invoiceClass: InvoiceClass;
  date: string;
  clientProviderName: string;
  subtotal: string;
  ivaAmount: string;
  totalAmount: string;
  uploadedBy: string;
  uploadedByName: string;
  ownerName?: string;
  invoiceNumber?: string;
}

export interface ClientFormData {
  name: string;
  cuit?: string;
  type: ClientType;
  email?: string;
  phone?: string;
  address?: string;
}

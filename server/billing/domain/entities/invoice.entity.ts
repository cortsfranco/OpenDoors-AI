/**
 * Invoice Entity - Domain Layer
 * Represents the core business entity for invoices
 */
export interface Invoice {
  id: string;
  type: 'income' | 'expense' | 'neutral';
  invoiceClass: 'A' | 'B' | 'C';
  invoiceNumber?: string;
  description?: string;
  date?: Date;
  clientProviderId?: string;
  clientProviderName: string;
  subtotal: number;
  ivaAmount: number;
  iibbAmount: number;
  gananciasAmount: number;
  otherTaxes: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: Date;
  dueDate?: Date;
  uploadedBy: string;
  uploadedByName: string;
  ownerId?: string;
  ownerName?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fingerprint: string;
  extractedData?: string;
  processed: boolean;
  needsReview: boolean;
  reviewStatus: 'approved' | 'pending_review' | 'draft';
  extractionConfidence?: number;
  aiExtracted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProvider {
  id: string;
  name: string;
  cuit?: string;
  type: 'client' | 'provider' | 'both';
  email?: string;
  phone?: string;
  address?: string;
  totalOperations: number;
  lastInvoiceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  avatar?: string;
  companyLogo?: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  lastLoginAt?: Date;
  fiscalPeriod: 'calendar' | 'may_april';
  decimalSeparator: ',' | '.';
  thousandSeparator: '.' | ',' | ' ' | 'none';
  decimalPlaces: number;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  roundingMode: 'round' | 'ceil' | 'floor';
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  actionType: 'create' | 'update' | 'delete' | 'upload' | 'login' | 'logout' | 'import' | 'export';
  entityType: string;
  entityId?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

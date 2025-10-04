/**
 * Process Invoice DTOs - Application Layer
 * Data Transfer Objects for invoice processing
 */
export interface ProcessInvoiceInput {
  fileBuffer?: Buffer;
  fileName?: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedByName: string;
  ownerName?: string;
  manualEntry?: boolean;
  invoiceData?: string; // JSON string for manual entry
  type?: 'income' | 'expense';
}

export interface ProcessInvoiceOutput {
  success: boolean;
  invoice?: {
    id: string;
    invoiceNumber?: string;
    type: 'income' | 'expense' | 'neutral';
    invoiceClass: 'A' | 'B' | 'C';
    totalAmount: number;
    clientProviderName: string;
    date?: Date;
    processed: boolean;
    needsReview: boolean;
    aiExtracted: boolean;
    extractionConfidence?: number;
  };
  error?: string;
  duplicateInvoice?: {
    id: string;
    fileName: string;
    uploadedBy: string;
    date: Date;
  };
}

export interface CreateClientProviderInput {
  name: string;
  type: 'client' | 'provider' | 'both';
  cuit?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateInvoiceInput {
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
}

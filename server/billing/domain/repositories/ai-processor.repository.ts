/**
 * AI Processor Repository Interface - Domain Layer
 * Defines the contract for AI processing operations
 */
export interface InvoiceExtractionResult {
  invoice_number?: string;
  invoice_class?: 'A' | 'B' | 'C';
  date?: string;
  total?: number;
  client_name?: string;
  type?: 'income' | 'expense';
  vat_amount?: number;
  subtotal?: number;
  supplier_name?: string;
  supplier_cuit?: string;
  needs_review?: boolean;
  detection_method?: string;
  description?: string;
}

export interface IAIProcessorRepository {
  processInvoice(filePath: string, invoiceType?: 'income' | 'expense'): Promise<InvoiceExtractionResult>;
  processInvoiceWithBuffer(fileBuffer: Buffer, fileName: string, uploadedByName: string): Promise<InvoiceExtractionResult>;
}

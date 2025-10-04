/**
 * Process Invoice Use Case - Application Layer
 * Orchestrates the invoice processing workflow
 */
import { injectable, inject } from 'inversify';
import { IInvoiceRepository } from '../../domain/repositories/invoice.repository';
import { IFileStorageRepository } from '../../domain/repositories/file-storage.repository';
import { IAIProcessorRepository } from '../../domain/repositories/ai-processor.repository';
import { ProcessInvoiceInput, ProcessInvoiceOutput, CreateInvoiceInput } from '../dtos/process-invoice.dto';
import { Invoice, ClientProvider } from '../../domain/entities/invoice.entity';
import crypto from 'crypto';
import fs from 'fs';

@injectable()
export class ProcessInvoiceUseCase {
  constructor(
    @inject("InvoiceRepository") private invoiceRepository: IInvoiceRepository,
    @inject("FileStorageRepository") private fileStorage: IFileStorageRepository,
    @inject("AIProcessorRepository") private aiProcessor: IAIProcessorRepository
  ) {}

  async execute(input: ProcessInvoiceInput): Promise<ProcessInvoiceOutput> {
    try {
      // Handle manual entry
      if (input.manualEntry && input.invoiceData) {
        return await this.handleManualEntry(input);
      }

      // Handle file upload
      if (input.fileBuffer && input.fileName && input.fileSize) {
        return await this.handleFileUpload(input);
      }

      return {
        success: false,
        error: 'No file or manual data provided'
      };
    } catch (error) {
      console.error('Error processing invoice:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  private async handleManualEntry(input: ProcessInvoiceInput): Promise<ProcessInvoiceOutput> {
    const parsedData = JSON.parse(input.invoiceData!);
    
    // Create or find client/provider for manual entry
    let clientProviderId = null;
    if (parsedData.clientProviderName) {
      let clientProvider = await this.invoiceRepository.getClientProviderByName(parsedData.clientProviderName);
      
      if (!clientProvider) {
        clientProvider = await this.invoiceRepository.createClientProvider({
          name: parsedData.clientProviderName,
          type: parsedData.type === 'income' ? 'client' : 'provider',
          cuit: parsedData.clientProviderCuit || null,
          email: null,
          phone: null,
          address: null,
          totalOperations: 0,
          lastInvoiceDate: null
        });
      }
      
      clientProviderId = clientProvider.id;
    }
    
    const invoice = await this.invoiceRepository.createInvoice({
      ...parsedData,
      invoiceClass: parsedData.invoiceClass || 'A',
      clientProviderId,
      ownerId: input.uploadedBy,
      ownerName: input.ownerName || input.uploadedByName,
      processed: true,
      extractedData: null,
      fingerprint: crypto.createHash('sha256').update(JSON.stringify(parsedData)).digest('hex'),
      aiExtracted: false,
      needsReview: false,
      reviewStatus: 'approved'
    });
    
    // Log activity
    await this.invoiceRepository.createActivityLog({
      userId: input.uploadedBy,
      userName: input.uploadedByName,
      actionType: 'create',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Creó factura manual ${invoice.invoiceNumber || 'sin número'} por ${invoice.totalAmount}`,
      metadata: JSON.stringify({ invoiceType: invoice.type, manualEntry: true }),
      ipAddress: null,
      userAgent: null
    });
    
    return {
      success: true,
      invoice: this.mapInvoiceToOutput(invoice)
    };
  }

  private async handleFileUpload(input: ProcessInvoiceInput): Promise<ProcessInvoiceOutput> {
    // Check for duplicate files
    const existingInvoice = await this.invoiceRepository.findInvoiceByFileInfo(input.fileName!, input.fileSize!);
    if (existingInvoice) {
      return {
        success: false,
        error: 'duplicate',
        duplicateInvoice: {
          id: existingInvoice.id,
          fileName: existingInvoice.fileName || '',
          uploadedBy: existingInvoice.uploadedByName,
          date: existingInvoice.createdAt
        }
      };
    }

    // Save file
    const fileResult = await this.fileStorage.saveFile(
      input.fileBuffer!,
      input.fileName!,
      'application/pdf' // Default MIME type
    );

    // Detect invoice type from filename
    let invoiceType: 'income' | 'expense' | undefined;
    const fileNameLower = input.fileName!.toLowerCase();
    
    if (fileNameLower.includes('emitida') || fileNameLower.includes('emitidas')) {
      invoiceType = 'income';
    } else if (fileNameLower.includes('recibida') || fileNameLower.includes('recibidas')) {
      invoiceType = 'expense';
    } else {
      invoiceType = input.type;
    }

    // Process with AI
    let extractedData = null;
    try {
      extractedData = await this.aiProcessor.processInvoice(fileResult.filePath, invoiceType);
    } catch (aiError) {
      console.error('AI processing failed:', aiError);
    }

    // Create invoice
    const invoice = await this.createInvoiceFromExtractedData(
      extractedData,
      fileResult,
      input,
      invoiceType
    );

    return {
      success: true,
      invoice: this.mapInvoiceToOutput(invoice)
    };
  }

  private async createInvoiceFromExtractedData(
    extractedData: any,
    fileResult: any,
    input: ProcessInvoiceInput,
    invoiceType: 'income' | 'expense' | undefined
  ): Promise<Invoice> {
    if (!extractedData) {
      // Create invoice without AI data
      return await this.invoiceRepository.createInvoice({
        type: invoiceType || 'expense',
        invoiceClass: 'A',
        invoiceNumber: `INV-${Date.now()}`,
        description: 'Factura sin procesar por IA',
        date: new Date(),
        clientProviderName: 'Cliente/Proveedor por determinar',
        subtotal: 0,
        ivaAmount: 0,
        iibbAmount: 0,
        gananciasAmount: 0,
        otherTaxes: 0,
        totalAmount: 0,
        paymentStatus: 'pending',
        uploadedBy: input.uploadedBy,
        uploadedByName: input.uploadedByName,
        ownerId: input.uploadedBy,
        ownerName: input.ownerName || input.uploadedByName,
        filePath: fileResult.filePath,
        fileName: fileResult.fileName,
        fileSize: fileResult.fileSize,
        fingerprint: crypto.createHash('sha256').update(input.fileBuffer!).digest('hex'),
        extractedData: null,
        processed: false,
        needsReview: true,
        reviewStatus: 'pending_review',
        extractionConfidence: 0,
        aiExtracted: false
      });
    }

    // Process extracted data
    const clientName = invoiceType === 'expense'
      ? (extractedData.supplier_name || extractedData.client_name || 'Proveedor extraído por IA')
      : (extractedData.client_name || 'Cliente extraído por IA');
    
    const clientCuit = invoiceType === 'expense' ? extractedData.supplier_cuit : null;
    const invoiceNumber = extractedData.invoice_number || `INV-${Date.now()}`;
    const totalAmount = extractedData.total || 0;
    const vatAmount = extractedData.vat_amount || 0;
    const subtotalValue = Number(((totalAmount || 0) - (vatAmount || 0)).toFixed(2));
    const ivaValue = Number((vatAmount || 0).toFixed(2));
    const totalValue = Number((totalAmount || 0).toFixed(2));

    // Create or find client/provider
    let clientProviderId = null;
    if (clientName && clientName !== 'Cliente extraído por IA' && clientName !== 'Proveedor extraído por IA') {
      let clientProvider = null;
      
      if (clientCuit) {
        clientProvider = await this.invoiceRepository.getClientProviderByCuit(clientCuit);
      }
      
      if (!clientProvider) {
        clientProvider = await this.invoiceRepository.getClientProviderByName(clientName);
      }
      
      if (!clientProvider) {
        clientProvider = await this.invoiceRepository.createClientProvider({
          name: clientName,
          type: invoiceType === 'expense' ? 'provider' : 'client',
          cuit: clientCuit,
          email: null,
          phone: null,
          address: null,
          totalOperations: 0,
          lastInvoiceDate: null
        });
      }
      
      clientProviderId = clientProvider.id;
    }

    // Parse date carefully
    let invoiceDate: Date | undefined;
    if (extractedData.date) {
      try {
        invoiceDate = new Date(extractedData.date);
        if (isNaN(invoiceDate.getTime())) {
          invoiceDate = undefined;
        }
      } catch (error) {
        invoiceDate = undefined;
      }
    }

    const invoice = await this.invoiceRepository.createInvoice({
      type: invoiceType || 'expense',
      invoiceClass: extractedData.invoice_class || 'A',
      invoiceNumber,
      description: extractedData.description || null,
      date: invoiceDate,
      clientProviderId,
      clientProviderName: clientName,
      subtotal: subtotalValue,
      ivaAmount: ivaValue,
      iibbAmount: 0,
      gananciasAmount: 0,
      otherTaxes: 0,
      totalAmount: totalValue,
      paymentStatus: 'pending',
      uploadedBy: input.uploadedBy,
      uploadedByName: input.uploadedByName,
      ownerId: input.uploadedBy,
      ownerName: input.ownerName || input.uploadedByName,
      filePath: fileResult.filePath,
      fileName: fileResult.fileName,
      fileSize: fileResult.fileSize,
      fingerprint: crypto.createHash('sha256').update(input.fileBuffer!).digest('hex'),
      extractedData: JSON.stringify(extractedData),
      processed: true,
      needsReview: extractedData.needs_review || false,
      reviewStatus: extractedData.needs_review ? 'pending_review' : 'approved',
      extractionConfidence: 95.0,
      aiExtracted: true
    });

    // Log activity
    await this.invoiceRepository.createActivityLog({
      userId: input.uploadedBy,
      userName: input.uploadedByName,
      actionType: 'upload',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Subió factura ${invoice.invoiceNumber} por ${invoice.totalAmount}`,
      metadata: JSON.stringify({ 
        invoiceType: invoice.type, 
        aiExtracted: true,
        extractionConfidence: 95.0
      }),
      ipAddress: null,
      userAgent: null
    });

    return invoice;
  }

  private mapInvoiceToOutput(invoice: Invoice) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      invoiceClass: invoice.invoiceClass,
      totalAmount: invoice.totalAmount,
      clientProviderName: invoice.clientProviderName,
      date: invoice.date,
      processed: invoice.processed,
      needsReview: invoice.needsReview,
      aiExtracted: invoice.aiExtracted,
      extractionConfidence: invoice.extractionConfidence
    };
  }
}

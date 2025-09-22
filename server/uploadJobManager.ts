import crypto from 'crypto';
import fs from 'fs';
import { wsManager } from './websocket';
import { storage } from './storage';
import { azureProcessor } from './azure-ai-processor';
import { pythonAIProxy } from './python-proxy';
import type { UploadJob as DBUploadJob, InsertUploadJob } from '@shared/schema';

// Extended interface for runtime processing data
export interface UploadJobExtended extends DBUploadJob {
  // Runtime processing fields - not persisted to DB
  processing?: boolean;
}

export class UploadJobManager {
  private processing = false;
  private queue: string[] = [];
  private concurrency = 10; // Max concurrent processing jobs - AUMENTADO
  private processingFingerprints = new Set<string>();

  constructor() {
    // Auto-cleanup old jobs every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Recover pending jobs on startup
    this.recoverPendingJobs();
    
    // Start watchdog for stuck job detection - CRITICAL for zero-loss
    this.startWatchdog();
  }

  // Recover pending/processing jobs on startup
  private async recoverPendingJobs(): Promise<void> {
    try {
      console.log('🔄 Recovering pending upload jobs...');
      
      const pendingJobs = await storage.getUploadJobsByStatus('processing');
      const queuedJobs = await storage.getUploadJobsByStatus('queued');
      
      console.log(`Found ${pendingJobs.length} processing and ${queuedJobs.length} queued jobs to recover`);
      
      for (const job of pendingJobs) {
        await storage.updateUploadJob(job.id, { 
          status: 'queued',
          error: 'Server restarted - retry needed'
        });
        this.queue.push(job.id);
      }
      
      for (const job of queuedJobs) {
        this.queue.push(job.id);
      }
      
      if (this.queue.length > 0) {
        console.log(`🚀 Restarting processing for ${this.queue.length} recovered jobs`);
        this.processQueue();
      }
      
    } catch (error) {
      console.error('❌ Error recovering pending jobs:', error);
    }
  }

  private generateJobId(): string {
    return crypto.randomUUID();
  }

  public static generateFingerprint(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async createJob(userId: string, fileName: string, fileSize: number, fingerprint: string, filePath: string, uploadedByName?: string, ownerName?: string): Promise<DBUploadJob> {
    try {
      const job = await storage.createUploadJob({
        userId,
        fileName,
        fileSize,
        fingerprint,
        status: 'queued',
        filePath,
        uploadedByName,
        ownerName,
        retryCount: 0,
        maxRetries: 3
      });

      this.queue.push(job.id);
      
      wsManager.sendToUser(userId, {
        type: 'upload:queued',
        data: {
          jobId: job.id,
          fileName,
          status: 'queued'
        }
      });

      this.processQueue();

      console.log(`📝 Created persistent job ${job.id} for ${fileName}`);
      return job;
    } catch (error) {
      console.error(`❌ Failed to create upload job for ${fileName}:`, error);
      throw error;
    }
  }

  async updateJob(jobId: string, updates: Partial<InsertUploadJob>): Promise<DBUploadJob | null> {
    try {
      const updatedJob = await storage.updateUploadJob(jobId, updates);
      if (!updatedJob) return null;

      if (updates.status) {
        wsManager.sendToUser(updatedJob.userId, {
          type: `upload:${updates.status}`,
          data: {
            jobId,
            fileName: updatedJob.fileName,
            status: updates.status,
            invoiceId: updates.invoiceId,
            error: updates.error,
          }
        });
      }

      return updatedJob;
    } catch (error) {
      console.error(`❌ Failed to update upload job ${jobId}:`, error);
      return null;
    }
  }

  async getJob(jobId: string): Promise<DBUploadJob | null> {
    try {
      const job = await storage.getUploadJob(jobId);
      return job || null;
    } catch (error) {
      console.error(`❌ Failed to get upload job ${jobId}:`, error);
      return null;
    }
  }

  async getRecentJobs(userId: string, minutes: number = 10): Promise<DBUploadJob[]> {
    try {
      return await storage.getRecentUploadJobs(userId, minutes);
    } catch (error) {
      console.error(`❌ Failed to get recent upload jobs for user ${userId}:`, error);
      return [];
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const currentBatch = this.queue.splice(0, this.concurrency);
      const promises = currentBatch.map(jobId => this.processJob(jobId));
      
      try {
        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Error processing upload batch:', error);
      }
    }

    this.processing = false;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job || job.status !== 'queued') return;

    let tempFilePath: string | null = null;

    console.log(`🚀 Starting job ${jobId} (${job.fileName}) - Queue size: ${this.queue.length}`);

    try {
      await this.updateJob(jobId, { status: 'processing' });
      
      if (this.processingFingerprints.has(job.fingerprint)) {
        throw new Error('Archivo idéntico ya está siendo procesado');
      }
      this.processingFingerprints.add(job.fingerprint);
      tempFilePath = job.filePath;

      // === INICIO DEL CÓDIGO DE DIAGNÓSTICO DE DUPLICADOS ===
      console.log(`🔎 Buscando duplicado con fingerprint: ${job.fingerprint}`);
      const existingInvoice = await storage.findInvoiceByFingerprint(job.fingerprint);
      console.log(`➡️ Resultado de la búsqueda: ${existingInvoice ? 'DUPLICADO ENCONTRADO' : 'No se encontraron duplicados'}`);
      // === FIN DEL CÓDIGO DE DIAGNÓSTICO ===

      if (existingInvoice) {
        // Marcamos como duplicado con información detallada
        await this.updateJob(jobId, { 
          status: 'duplicate',
          error: `📋 FACTURA DUPLICADA DETECTADA\n` +
                 `🔍 Archivo original: ${existingInvoice.fileName || 'N/A'}\n` +
                 `📅 Fecha: ${existingInvoice.date || 'N/A'}\n` +
                 `💰 Monto: $${existingInvoice.totalAmount || 'N/A'}\n` +
                 `🏢 Cliente/Proveedor: ${existingInvoice.clientProviderName || 'N/A'}\n` +
                 `📄 Nro. Factura: ${existingInvoice.invoiceNumber || 'N/A'}\n` +
                 `👤 Cargada por: ${existingInvoice.uploadedByName || 'Usuario'}\n` +
                 `⚠️ La carga ha sido bloqueada para evitar duplicación de datos`
        });
        
        if (job.filePath && fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
        
        await storage.createActivityLog({
          userId: job.userId,
          userName: job.uploadedByName || 'Usuario',
          actionType: 'upload',
          entityType: 'invoice',
          entityId: existingInvoice.id,
          description: `🚫 Intentó cargar factura duplicada: ${job.fileName}`,
          metadata: JSON.stringify({ duplicate: true, originalInvoice: existingInvoice.id }),
        });
        
        console.log(`🚫 Duplicate detected and blocked: ${job.fileName} `);
        return;
      }

      // Proceso de extracción con IA (ahora con timeout de 5 minutos)
      let extractedData = null;
      
      try {
        console.log(`🔍 Processing ${job.fileName} with Azure Document Intelligence...`);
        
        let invoiceType: 'income' | 'expense' | undefined;
        const fileNameLower = job.fileName.toLowerCase();
        
        if (fileNameLower.includes('emitida') || fileNameLower.includes('emitidas')) {
          invoiceType = 'income';
        } else if (fileNameLower.includes('recibida') || fileNameLower.includes('recibidas')) {
          invoiceType = 'expense';
        }
        
        // Timeout AUMENTADO a 5 minutos
        const aiProcessingPromise = azureProcessor.processInvoice(job.filePath, invoiceType);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI processing timeout (5 minutes)')), 5 * 60 * 1000);
        });
        
        extractedData = await Promise.race([aiProcessingPromise, timeoutPromise]);
        
        if (!extractedData || extractedData.total === 0) {
          console.log(`📄 Trying Python backend for ${job.fileName}...`);
          const fileBuffer = fs.readFileSync(job.filePath);
          const pythonResult = await pythonAIProxy.processInvoiceWithAI(
            fileBuffer, 
            job.fileName, 
            job.uploadedByName || 'Usuario'
          );

          if (pythonResult.success && pythonResult.processing_result?.extracted_data) {
            extractedData = pythonResult.processing_result.extracted_data;
          }
        }
      } catch (aiError) {
        console.error(`AI processing failed for ${job.fileName}:`, aiError);
      }

      if (!extractedData) {
        throw new Error('No se pudo extraer información de la factura con IA');
      }

      const clientName = extractedData.client_name || 'Cliente extraído por IA';
      const invoiceNumber = extractedData.invoice_number || `INV-${Date.now()}`;
      const totalAmount = parseFloat(extractedData.total?.toString() || '0');
      const subtotalAmount = parseFloat((extractedData as any).subtotal?.toString() || (totalAmount * 0.79).toString());
      const ivaAmount = parseFloat(extractedData.vat_amount?.toString() || (totalAmount * 0.21).toString());

      const hasCriticalDataMissing = (
        !extractedData.date || 
        totalAmount <= 0 || 
        !clientName || clientName === 'Cliente extraído por IA' || 
        !invoiceNumber || invoiceNumber.startsWith('INV-')
      );
      
      const reviewStatus = hasCriticalDataMissing ? 'pending_review' : 'approved';
      const needsReview = hasCriticalDataMissing || (extractedData as any).needs_review || false;
      
      console.log(`📋 Data validation result for ${job.fileName}:`);
      console.log(`   - Date: ${extractedData.date ? '✅' : '❌ Missing'}`);
      console.log(`   - Amount: ${totalAmount > 0 ? '✅' : '❌ Invalid'}`);
      console.log(`   - Client: ${clientName && clientName !== 'Cliente extraído por IA' ? '✅' : '❌ Missing/Generic'}`);
      console.log(`   - Invoice#: ${invoiceNumber && !invoiceNumber.startsWith('INV-') ? '✅' : '❌ Missing/Generated'}`);
      console.log(`   - Review Status: ${reviewStatus.toUpperCase()}`);
      
      if (reviewStatus === 'pending_review') {
        console.log(`⚠️ Invoice ${invoiceNumber} requires manual review due to missing critical data`);
      }

      let clientProviderId = null;
      if (clientName) {
        let clientProvider = await storage.getClientProviderByName(clientName);
        
        if (!clientProvider) {
          clientProvider = await storage.createClientProvider({
            name: clientName,
            type: extractedData.type === 'income' ? 'client' : 'provider',
            cuit: (extractedData as any).cuit || null,
          });
        }
        
        clientProviderId = clientProvider.id;
      }

      let invoiceDate: Date | null = null;
      if ('date' in extractedData && extractedData.date) {
        try {
          invoiceDate = new Date(extractedData.date);
          if (isNaN(invoiceDate.getTime())) {
            invoiceDate = null;
          }
        } catch (error) {
          console.error(`Error parsing date: ${extractedData.date}`, error);
          invoiceDate = null;
        }
      }

      const invoice = await storage.createInvoice({
        type: extractedData.type || 'expense',
        invoiceClass: (extractedData as any).invoice_class || 'A',
        date: invoiceDate,
        clientProviderName: clientName,
        clientProviderId,
        invoiceNumber,
        description: (extractedData as any).description || extractedData.Description || null,
        subtotal: subtotalAmount.toString(),
        ivaAmount: ivaAmount.toString(),
        totalAmount: totalAmount.toString(),
        uploadedBy: job.userId,
        uploadedByName: job.uploadedByName || 'Usuario',
        ownerId: job.userId,
        ownerName: job.ownerName || job.uploadedByName || 'Usuario',
        extractedData: JSON.stringify(extractedData),
        filePath: job.filePath,
        fileName: job.fileName,
        fileSize: job.fileSize,
        fingerprint: job.fingerprint,
        needsReview: needsReview,
        reviewStatus: reviewStatus as 'approved' | 'pending_review' | 'draft'
      });

      if (extractedData && totalAmount > 0) {
        await storage.markInvoiceAsProcessed(invoice.id);
      }

      await storage.createActivityLog({
        userId: job.userId,
        userName: job.uploadedByName || 'Usuario',
        actionType: 'upload',
        entityType: 'invoice',
        entityId: invoice.id,
        description: `Cargó factura ${invoice.invoiceNumber} por ${invoice.totalAmount} (procesada con IA)`,
        metadata: JSON.stringify({ 
          invoiceType: invoice.type, 
          fileName: job.fileName,
          aiProcessed: true,
          async: true
        }),
      });

      wsManager.notifyInvoiceChange('created', invoice, job.userId);

      await this.updateJob(jobId, { 
        status: 'success', 
        invoiceId: invoice.id 
      });
      
      console.log(`✅ Job ${jobId} successfully processed (${job.fileName}) → Invoice ${invoice.id}`);

    } catch (error) {
      console.error(`❌ Error processing job ${jobId} (${job.fileName}):`, error);
      
      await this.handleJobFailure(jobId, error instanceof Error ? error.message : 'Error desconocido en el procesamiento');
      
      try {
        await storage.createActivityLog({
          userId: job.userId,
          userName: job.uploadedByName || 'Usuario',
          actionType: 'upload',
          entityType: 'invoice',
          entityId: null,
          description: `Error al procesar factura: ${job.fileName}`,
          metadata: JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Error desconocido', 
            fileName: job.fileName,
            fileSize: job.fileSize,
            retryCount: job.retryCount || 0
          }),
        });
      } catch (logError) {
        console.warn('Could not log failed upload activity:', logError);
      }
    } finally {
      this.processingFingerprints.delete(job.fingerprint);
      console.log(`🔓 Released fingerprint lock for ${job.fingerprint}`);
      
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`🗑️ Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(`⚠️ Failed to cleanup temp file ${tempFilePath}:`, cleanupError);
        }
      }
      
      try {
        const finalJob = await this.getJob(jobId);
        if (finalJob) {
          console.log(`📊 Job ${jobId} completed with status: ${finalJob.status} (${job.fileName})`);
        }
      } catch (logError) {
        console.error(`⚠️ Error logging final job status for ${jobId}:`, logError);
      }
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      const oldJobs = await storage.getRecentUploadJobs('', 60 * 24);
      
      const jobsToDelete = oldJobs.filter(job => 
        job.createdAt < cutoff && 
        (job.status === 'success' || job.status === 'duplicate' || job.status === 'error')
      );

      for (const job of jobsToDelete) {
        await storage.deleteUploadJob(job.id);
      }
      
      if (jobsToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${jobsToDelete.length} old upload jobs from database`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old upload jobs:', error);
    }
  }

  async getAllJobs(): Promise<DBUploadJob[]> {
    try {
      return await storage.getRecentUploadJobs('', 60 * 24);
    } catch (error) {
      console.error('❌ Error getting all upload jobs:', error);
      return [];
    }
  }

  private async handleJobFailure(jobId: string, errorMessage: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return;

      const currentRetries = job.retryCount || 0;
      const maxRetries = 3;

      if (currentRetries < maxRetries) {
        await this.updateJob(jobId, {
          status: 'queued',
          retryCount: currentRetries + 1,
          error: `${errorMessage} (Intento ${currentRetries + 1}/${maxRetries})`
        });
        
        console.log(`🔄 Job ${jobId} requeued for retry ${currentRetries + 1}/${maxRetries}`);
        
        this.queue.push(jobId);
        this.processQueue();
        
      } else {
        await this.updateJob(jobId, {
          status: 'quarantined',
          error: `${errorMessage} (Excedido límite de reintentos: ${maxRetries})`
        });
        
        console.error(`🚫 Job ${jobId} quarantined after ${maxRetries} failed attempts`);
      }
    } catch (error) {
      console.error(`❌ Error handling job failure for ${jobId}:`, error);
      await this.updateJob(jobId, { 
        status: 'error', 
        error: errorMessage 
      });
    }
  }

  private async watchdog(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      const processingJobs = await storage.getUploadJobsByStatus('processing');
      
      const stuckJobs = processingJobs.filter(job => 
        job.updatedAt < cutoff
      );

      for (const stuckJob of stuckJobs) {
        console.warn(`⚠️ Detected stuck job ${stuckJob.id}, recovering...`);
        await this.handleJobFailure(stuckJob.id, 'Job timeout - stuck in processing state');
      }

      if (stuckJobs.length > 0) {
        console.log(`🔧 Watchdog recovered ${stuckJobs.length} stuck jobs`);
      }
    } catch (error) {
      console.error('❌ Watchdog error:', error);
    }
  }

  private startWatchdog(): void {
    setInterval(() => {
      this.watchdog();
    }, 2 * 60 * 1000);
    console.log('👀 Upload job watchdog started (2 min intervals)');
  }

  private async extractInvoiceDataForComparison(filePath: string): Promise<{
    date?: string;
    amount?: number;
    client?: string;
    invoiceNumber?: string;
    cuit?: string;
    type?: string;
  }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      
      return {
        date: undefined,
        amount: undefined,
        client: undefined,
        invoiceNumber: undefined,
        cuit: undefined,
        type: undefined
      };
    } catch (error) {
      console.error('Error extracting data for comparison:', error);
      return {};
    }
  }

  private compareInvoiceData(currentData: any, existingInvoice: any): {
    similarity: number;
    matches: string[];
    differences: string[];
  } {
    const matches: string[] = [];
    const differences: string[] = [];
    let totalFields = 0;
    let matchingFields = 0;

    totalFields++;
    if (currentData.date && existingInvoice.date) {
      if (currentData.date === existingInvoice.date) {
        matches.push('fecha');
        matchingFields++;
      } else {
        differences.push(`fecha (${currentData.date} vs ${existingInvoice.date})`);
      }
    }

    totalFields++;
    if (currentData.amount && existingInvoice.totalAmount) {
      if (Math.abs(currentData.amount - parseFloat(existingInvoice.totalAmount)) < 0.01) {
        matches.push('monto');
        matchingFields++;
      } else {
        differences.push(`monto ($${currentData.amount} vs $${existingInvoice.totalAmount})`);
      }
    }

    totalFields++;
    if (currentData.client && existingInvoice.clientProviderName) {
      if (currentData.client.toLowerCase().includes(existingInvoice.clientProviderName.toLowerCase()) ||
          existingInvoice.clientProviderName.toLowerCase().includes(currentData.client.toLowerCase())) {
        matches.push('cliente/proveedor');
        matchingFields++;
      } else {
        differences.push(`cliente/proveedor (${currentData.client} vs ${existingInvoice.clientProviderName})`);
      }
    }

    totalFields++;
    if (currentData.invoiceNumber && existingInvoice.invoiceNumber) {
      if (currentData.invoiceNumber === existingInvoice.invoiceNumber) {
        matches.push('número factura');
        matchingFields++;
      } else {
        differences.push(`número factura (${currentData.invoiceNumber} vs ${existingInvoice.invoiceNumber})`);
      }
    }

    const similarity = totalFields > 0 ? Math.round((matchingFields / totalFields) * 100) : 100;

    return {
      similarity,
      matches,
      differences
    };
  }
}

export const uploadJobManager = new UploadJobManager();
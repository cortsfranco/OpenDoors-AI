/**
 * Azure AI Service - Infrastructure Layer
 * Concrete implementation of AI processing using Azure services
 */
import { IAIProcessorRepository, InvoiceExtractionResult } from '../../domain/repositories/ai-processor.repository';
import { azureProcessor } from '../../../azure-ai-processor';
import { pythonAIProxy } from '../../../python-proxy';
import { invoiceProcessor } from '../../../ai/invoiceProcessor';
import fs from 'fs';

export class AzureAIService implements IAIProcessorRepository {
  async processInvoice(filePath: string, invoiceType?: 'income' | 'expense'): Promise<InvoiceExtractionResult> {
    try {
      // Try Azure Document Intelligence first
      console.log('🔍 Processing invoice with Azure Document Intelligence...');
      
      const extractedData = await azureProcessor.processInvoice(filePath, invoiceType);
      
      if (!extractedData || extractedData.total === 0) {
        // Try Python backend as second option
        console.log('📄 Trying Python backend...');
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
        const pythonResult = await pythonAIProxy.processInvoiceWithAI(
          fileBuffer, 
          fileName, 
          'system' // Default user name for AI processing
        );

        if (pythonResult.success && pythonResult.processing_result?.extracted_data) {
          return pythonResult.processing_result.extracted_data;
        } else {
          // Fallback to original AI processor
          return await invoiceProcessor.processInvoice(filePath);
        }
      }

      return extractedData;
    } catch (aiError) {
      console.error('AI processing failed:', aiError);
      // Return default structure if AI fails
      return {
        type: invoiceType || 'expense',
        total: 0,
        needs_review: true,
        detection_method: 'fallback'
      };
    }
  }

  async processInvoiceWithBuffer(fileBuffer: Buffer, fileName: string, uploadedByName: string): Promise<InvoiceExtractionResult> {
    try {
      // Try Python backend first for buffer processing
      console.log('📄 Processing invoice with Python backend...');
      const pythonResult = await pythonAIProxy.processInvoiceWithAI(
        fileBuffer, 
        fileName, 
        uploadedByName
      );

      if (pythonResult.success && pythonResult.processing_result?.extracted_data) {
        return pythonResult.processing_result.extracted_data;
      } else {
        // Fallback to original AI processor
        return await invoiceProcessor.processInvoice(fileBuffer);
      }
    } catch (aiError) {
      console.error('AI processing failed:', aiError);
      // Return default structure if AI fails
      return {
        type: 'expense',
        total: 0,
        needs_review: true,
        detection_method: 'fallback'
      };
    }
  }
}

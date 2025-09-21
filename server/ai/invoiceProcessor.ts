import { openaiService } from "./openai";
import fs from "fs";
import path from "path";

export class InvoiceProcessor {
  async processInvoice(filePath: string): Promise<{
    type: 'income' | 'expense';
    date: string;
    clientProviderName: string;
    subtotal: string;
    ivaAmount: string;
    totalAmount: string;
    invoiceNumber?: string;
  }> {
    try {
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      
      // Process with OpenAI
      const extractedData = await openaiService.extractInvoiceData(base64Data);
      
      return extractedData;
    } catch (error) {
      console.error('Error processing invoice:', error);
      throw new Error('Error al procesar la factura');
    }
  }

  async processQuery(message: string): Promise<string> {
    try {
      const response = await openaiService.processFinancialQuery(message);
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      throw new Error('Error al procesar la consulta');
    }
  }
}

export const invoiceProcessor = new InvoiceProcessor();

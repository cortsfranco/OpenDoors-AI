/**
 * Proxy server to integrate with user's Python AI backend
 * This allows the React frontend to communicate with the Python FastAPI backend
 */
import axios from 'axios';
import FormData from 'form-data';
import { Request, Response } from 'express';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

interface PythonInvoiceResult {
  success: boolean;
  message: string;
  filename: string;
  processing_result: {
    extracted_data?: {
      invoice_number?: string;
      date?: string;
      total?: number;
      client_name?: string;
      type?: 'income' | 'expense';
      vat_amount?: number;
      description?: string;
    };
    upload_result?: any;
  };
}

interface PythonChatResult {
  success: boolean;
  question: string;
  answer: string;
  trace?: any;
}

export class PythonAIProxy {
  private isBackendAvailable = false;

  constructor() {
    this.checkBackendHealth();
  }
  
  // Public getters for status checking
  get backendAvailable(): boolean {
    return this.isBackendAvailable;
  }
  
  get backendUrl(): string {
    return PYTHON_BACKEND_URL;
  }

  // Public method to refresh health check
  async refreshHealth(): Promise<void> {
    await this.checkBackendHealth();
  }

  private async checkBackendHealth(): Promise<void> {
    try {
      const response = await axios.get(`${PYTHON_BACKEND_URL}/`, { timeout: 5000 });
      this.isBackendAvailable = response.status === 200;
      console.log(`Python backend health check: ${this.isBackendAvailable ? 'OK' : 'FAILED'}`);
    } catch (error) {
      this.isBackendAvailable = false;
      console.log('Python backend not available, using fallback processing');
    }
  }

  async processInvoiceWithAI(
    fileBuffer: Buffer, 
    filename: string, 
    partnerName: string
  ): Promise<PythonInvoiceResult> {
    // Check backend health before processing
    await this.checkBackendHealth();
    
    if (!this.isBackendAvailable) {
      // Fallback to basic processing if Python backend is not available
      return this.fallbackInvoiceProcessing(filename, partnerName);
    }

    try {
      // Map partner names to expected Python backend enum values
      const partnerMapping: { [key: string]: string } = {
        'joni': 'JONI',
        'hernan': 'HERNAN', 
        'hernán': 'HERNAN',
        'maxi': 'MAXI',
        'leo': 'LEO'
      };
      
      const mappedPartner = partnerMapping[partnerName.toLowerCase()] || 'JONI'; // Default to JONI
      
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      formData.append('partner_name', mappedPartner);

      const response = await axios.post(
        `${PYTHON_BACKEND_URL}/process-invoice/`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 60000, // 60 seconds for AI processing
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error processing invoice with Python backend:', error);
      return this.fallbackInvoiceProcessing(filename, partnerName);
    }
  }

  async chatWithAI(question: string): Promise<PythonChatResult> {
    // Check backend health before processing
    await this.checkBackendHealth();
    
    if (!this.isBackendAvailable) {
      return this.fallbackChatResponse(question);
    }

    try {
      // Send as JSON payload to the JSON endpoint
      const response = await axios.post(
        `${PYTHON_BACKEND_URL}/chat-json/`,
        { question },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds for chat response
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error chatting with Python backend:', error);
      return this.fallbackChatResponse(question);
    }
  }

  private fallbackInvoiceProcessing(filename: string, partnerName: string): PythonInvoiceResult {
    // Basic fallback processing without AI
    return {
      success: true,
      message: "Factura procesada con método básico (IA no disponible)",
      filename,
      processing_result: {
        extracted_data: {
          invoice_number: `INV-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          total: 0,
          client_name: "Cliente por definir",
          type: "expense" as const,
          vat_amount: 0,
          description: "Descripción no disponible - procesamiento básico"
        }
      }
    };
  }

  private fallbackChatResponse(question: string): PythonChatResult {
    const fallbackResponses = [
      "Lo siento, el sistema de IA avanzado no está disponible en este momento. Por favor, intenta más tarde.",
      "El asistente financiero está temporalmente desconectado. Puedes revisar tus datos manualmente en el dashboard.",
      "Sistema de IA en mantenimiento. Las funcionalidades básicas del sistema siguen funcionando normalmente."
    ];

    return {
      success: false,
      question,
      answer: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    };
  }

  // Express middleware to check if Python backend should be used
  async shouldUsePythonBackend(): Promise<boolean> {
    if (!this.isBackendAvailable) {
      await this.checkBackendHealth();
    }
    return this.isBackendAvailable;
  }
}

export const pythonAIProxy = new PythonAIProxy();
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export class OpenAIService {
  async extractInvoiceData(imageBase64: string): Promise<{
    type: 'income' | 'expense';
    date: string;
    clientProviderName: string;
    subtotal: string;
    ivaAmount: string;
    totalAmount: string;
    invoiceNumber?: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Eres un experto en procesamiento de facturas argentinas. Analiza la imagen y extrae la información key en formato JSON. 
            
            Determina si es un ingreso (factura emitida por la empresa) o egreso (factura recibida de proveedor).
            Extrae: tipo, fecha, nombre del cliente/proveedor, subtotal, IVA, total, y número de factura si está disponible.
            
            Responde en JSON con este formato:
            {
              "type": "income" o "expense",
              "date": "YYYY-MM-DD",
              "clientProviderName": "nombre",
              "subtotal": "0.00",
              "ivaAmount": "0.00", 
              "totalAmount": "0.00",
              "invoiceNumber": "opcional"
            }`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta factura y extrae la información solicitada:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      console.error('Error extracting invoice data:', error);
      throw new Error('Error al procesar la factura con IA');
    }
  }

  async processFinancialQuery(message: string, context?: any): Promise<string> {
    try {
      const systemPrompt = `Eres un asistente financiero especializado en el sistema de gestión de facturas de Open Doors.
      
      Puedes ayudar con:
      - Consultas sobre facturas e IVA
      - Análisis de datos financieros
      - Explicaciones sobre balances y KPIs
      - Recomendaciones de gestión financiera
      - Interpretación de reportes
      
      Responde de manera profesional y clara, usando términos contables argentinos.
      Si necesitas datos específicos que no tienes, sugiere cómo el usuario puede obtenerlos en el sistema.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
      });

      return response.choices[0].message.content || "No pude procesar tu consulta.";
    } catch (error) {
      console.error('Error processing financial query:', error);
      throw new Error('Error al procesar la consulta');
    }
  }
}

export const openaiService = new OpenAIService();

/**
 * Azure AI Processor for Invoice Processing
 * Uses Azure Document Intelligence and OpenAI directly
 */
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { AzureOpenAI } from 'openai';
import fs from 'fs';
import { storage } from './storage';

// Azure Configuration from environment variables (SECURITY: Keys must be in environment variables)
const AZURE_DOC_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT || "https://mfn-opendoors-docintel.cognitiveservices.azure.com/";
const AZURE_DOC_INTELLIGENCE_KEY = process.env.AZURE_DOC_INTELLIGENCE_KEY;

// Azure OpenAI configuration with fallback to regular OpenAI
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || process.env.OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"; // Using gpt-4o-mini deployment
const USE_AZURE = !!AZURE_OPENAI_ENDPOINT; // Only use Azure if endpoint is configured

interface InvoiceData {
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

export class AzureInvoiceProcessor {
  private docClient: DocumentAnalysisClient | null = null;
  private openaiClient: AzureOpenAI | null = null;

  constructor() {
    // Initialize Document Intelligence client if key is configured
    if (AZURE_DOC_INTELLIGENCE_KEY) {
      this.docClient = new DocumentAnalysisClient(
        AZURE_DOC_INTELLIGENCE_ENDPOINT,
        new AzureKeyCredential(AZURE_DOC_INTELLIGENCE_KEY)
      );
    } else {
      console.warn('⚠️ Azure Document Intelligence key not configured');
    }

    // Initialize OpenAI client (Azure or regular)
    if (AZURE_OPENAI_KEY) {
      try {
        if (USE_AZURE && AZURE_OPENAI_ENDPOINT) {
          // Use Azure OpenAI if endpoint is configured
          this.openaiClient = new AzureOpenAI({
            endpoint: AZURE_OPENAI_ENDPOINT,
            apiKey: AZURE_OPENAI_KEY,
            apiVersion: '2024-06-01', // Standard API version for Azure OpenAI
            deployment: AZURE_OPENAI_DEPLOYMENT
          });
          console.log('✅ Azure OpenAI client initialized successfully');
        } else {
          // Fallback to using the key directly with simulated completion for now
          console.log('⚠️ Azure OpenAI endpoint not configured, using fallback mode');
          // We'll create a mock client for testing
          this.openaiClient = null; // Will be handled in processChatQuery
        }
      } catch (error) {
        console.warn('⚠️ OpenAI initialization failed:', error);
      }
    } else {
      console.warn('⚠️ No OpenAI API key configured');
    }
  }

  async processInvoice(filePath: string, invoiceType?: 'income' | 'expense'): Promise<InvoiceData> {
    try {
      console.log('🔍 Processing invoice with Azure Document Intelligence...');
      
      // Check if Document Intelligence client is configured
      if (!this.docClient) {
        console.warn('⚠️ Azure Document Intelligence not configured, using fallback');
        return this.getDefaultInvoiceData();
      }
      
      // Read the file
      const fileBuffer = fs.readFileSync(filePath);
      
      // If invoiceType is explicitly passed (from filename detection), use it
      let detectedType: 'income' | 'expense' = 'expense'; // Default
      
      if (invoiceType === 'income' || invoiceType === 'expense') {
        // Use the explicitly passed type (from filename)
        detectedType = invoiceType;
        console.log(`📁 Using invoice type from filename: ${detectedType.toUpperCase()}`);
      } else {
        // Only detect from content if no explicit type was passed
        console.log('Detecting invoice type from document content...');
        
        // Try with prebuilt model first to detect type
        const prebuiltPoller = await this.docClient.beginAnalyzeDocument(
          "prebuilt-invoice", 
          fileBuffer
        );
        
        const prebuiltResult = await prebuiltPoller.pollUntilDone();
        
        if (prebuiltResult.documents && prebuiltResult.documents.length > 0) {
          const doc = prebuiltResult.documents[0];
          const fields = doc.fields || {};
          
          // Extract vendor/customer info to determine type
          const vendorName = this.extractField(fields.VendorName)?.toLowerCase() || '';
          const customerName = this.extractField(fields.CustomerName)?.toLowerCase() || '';
          const billTo = this.extractField(fields.BillingAddress)?.toLowerCase() || '';
          const remitTo = this.extractField(fields.RemittanceAddress)?.toLowerCase() || '';
          
          // Known Open Doors variations
          const openDoorsVariations = [
            'open doors',
            'opendoors',
            'resources open doors',
            'ingeniería aplicada open doors',
            'open doors s.a.s',
            'resources open doors s.a.s'
          ];
          
          // Check if Open Doors is the vendor (issuer) = INCOME
          const isOpenDoorsVendor = openDoorsVariations.some(variation => 
            vendorName.includes(variation) || remitTo.includes(variation)
          );
          
          // Check if Open Doors is the customer (receiver) = EXPENSE
          const isOpenDoorsCustomer = openDoorsVariations.some(variation => 
            customerName.includes(variation) || billTo.includes(variation)
          );
          
          if (isOpenDoorsVendor) {
            detectedType = 'income';
            console.log('✅ Detected as INCOME - Open Doors is the issuer/vendor');
          } else if (isOpenDoorsCustomer) {
            detectedType = 'expense';
            console.log('✅ Detected as EXPENSE - Open Doors is the customer/receiver');
          } else {
            // If not clear, default to expense
            detectedType = 'expense';
            console.log(`⚠️ Could not detect Open Doors in document, using default: ${detectedType}`);
          }
        }
      }
      
      // Now use the appropriate custom model based on detected type
      const modelId = detectedType === 'income' 
        ? "opendoors-emitidas-custom"  // Facturas que Open Doors emite (income)
        : "opendoors-recibidas-custom"; // Facturas que Open Doors recibe (expense)
      
      console.log(`Using custom model: ${modelId} for ${detectedType} invoice`);
      
      // Analyze with custom model
      const poller = await this.docClient.beginAnalyzeDocument(
        modelId, 
        fileBuffer
      );

      const result = await poller.pollUntilDone();

      if (!result.documents || result.documents.length === 0) {
        console.warn('No invoice data found in document');
        return this.getDefaultInvoiceData();
      }

      const document = result.documents[0];
      const fields = document.fields || {};

      // Extract invoice data from Document Intelligence results
      // Use the detected type, not the parameter
      const type = detectedType;
      
      // Clean invoice number by removing Nº or N° symbols
      let invoiceNumber = this.extractField(fields.InvoiceId || fields.InvoiceNumber);
      if (invoiceNumber) {
        invoiceNumber = invoiceNumber.replace(/^(Nº|N°|#)\s*/g, '').trim();
      }
      
      // Extract raw client name based on invoice type
      let rawClientName = type === 'income' 
        ? this.extractField(fields.CustomerName || fields.BillTo) // Who we invoice to
        : this.extractField(fields.VendorName || fields.Vendor);   // Who invoices us
      
      // Known Open Doors variations to filter out
      const openDoorsVariations = [
        'open doors',
        'opendoors',
        'resources open doors',
        'ingeniería aplicada open doors',
        'open doors s.a.s',
        'resources open doors s.a.s',
        'open doors s. a. s.',
        'RESOURCES OPEN DOORS S. A. S.'
      ];
      
      // Check if the extracted client name is actually OpenDoors (case-insensitive)
      if (rawClientName && type === 'income') {
        const clientNameLower = rawClientName.toLowerCase().trim();
        const isOpenDoors = openDoorsVariations.some(variation => 
          clientNameLower.includes(variation.toLowerCase())
        );
        
        if (isOpenDoors) {
          console.log('⚠️ Warning: Income invoice has OpenDoors as client, attempting to find real client...');
          // Try alternative fields for the actual client
          rawClientName = this.extractField(fields.BillTo || fields.ShipTo || fields.RemittanceAddressRecipient);
          
          // If still OpenDoors or empty, mark as unknown
          if (!rawClientName || openDoorsVariations.some(v => rawClientName?.toLowerCase().includes(v.toLowerCase()))) {
            rawClientName = 'Cliente no identificado';
            console.log('❌ Could not identify real client, using placeholder');
          }
        }
      }
      
      // Detect invoice class (A/B/C) based on Argentine fiscal regulations
      let invoiceClass: 'A' | 'B' | 'C' = 'A'; // Default to A
      let detectionMethod = 'default';
      let needsReview = false;
      
      // Extract key fields for classification
      const invoiceId = this.extractField(fields.InvoiceId || fields.InvoiceNumber) || '';
      const documentType = this.extractField(fields.InvoiceType || fields.DocumentType) || '';
      const fullDocumentText = result.content || '';
      const vatAmount = this.extractNumberField(fields.TotalTax || fields.Tax || fields.IVA || fields.VAT) || 0;
      const totalAmount = this.extractNumberField(fields.InvoiceTotal || fields.TotalAmount || fields.Total) || 0;
      
      // Priority 1: Strict invoice header/number patterns (most reliable)
      // Look for canonical formats: "Factura A", "A 0001-00000001", header boxes
      if (/factura\s*a\b|tipo\s*a\b|\[\s*a\s*\]/i.test(documentType) || 
          /^\s*a\s*[\-\s]?\d{4}\s*\-\s*\d{8}/i.test(invoiceId) ||
          /factura\s*a\b/i.test(fullDocumentText)) {
        invoiceClass = 'A';
        detectionMethod = 'header_type_A';
        console.log('✅ Detected Factura A from explicit header/format');
      } else if (/factura\s*b\b|tipo\s*b\b|\[\s*b\s*\]/i.test(documentType) || 
                 /^\s*b\s*[\-\s]?\d{4}\s*\-\s*\d{8}/i.test(invoiceId) ||
                 /factura\s*b\b/i.test(fullDocumentText)) {
        invoiceClass = 'B';
        detectionMethod = 'header_type_B';
        console.log('✅ Detected Factura B from explicit header/format');
      } else if (/factura\s*c\b|tipo\s*c\b|\[\s*c\s*\]/i.test(documentType) || 
                 /^\s*c\s*[\-\s]?\d{4}\s*\-\s*\d{8}/i.test(invoiceId) ||
                 /factura\s*c\b/i.test(fullDocumentText)) {
        invoiceClass = 'C';
        detectionMethod = 'header_type_C';
        console.log('✅ Detected Factura C from explicit header/format');
      }
      
      // Priority 2: Determine issuer tax regime for both income and expense
      else {
        const openDoorsIsIssuer = type === 'income';
        let issuerRegime: 'RI' | 'MONO' | 'UNKNOWN' = 'UNKNOWN';
        
        // For income invoices, Open Doors is the issuer (RI)
        if (openDoorsIsIssuer) {
          issuerRegime = 'RI'; // Open Doors is Responsable Inscripto
          console.log('🏢 Income invoice: Open Doors (RI) is issuer');
        } else {
          // For expense invoices, detect issuer regime from document content
          const issuerTaxStatus = this.extractField(fields.VendorTaxId || fields.TaxStatus || fields.VendorName) || '';
          
          if (/responsable\s*inscripto/i.test(issuerTaxStatus) || 
              /responsable\s*inscripto/i.test(fullDocumentText) ||
              vatAmount > 0) { // VAT discriminated usually indicates RI
            issuerRegime = 'RI';
            console.log('🏢 Expense invoice: Issuer detected as RI');
          } else if (/monotribut/i.test(issuerTaxStatus) || 
                     /monotribut/i.test(fullDocumentText)) {
            issuerRegime = 'MONO';
            console.log('🏢 Expense invoice: Issuer detected as Monotributista');
          } else if (/consumidor\s*final/i.test(issuerTaxStatus) || 
                     /consumidor\s*final/i.test(fullDocumentText)) {
            issuerRegime = 'RI'; // CF can't issue invoices, probably RI
            console.log('🏢 Expense invoice: Consumer Final mention, assuming RI issuer');
          } else {
            console.log('⚠️ Expense invoice: Issuer regime unknown from content');
          }
        }
        
        // Apply Argentine fiscal rules based on issuer regime
        if (issuerRegime === 'MONO') {
          // Monotributista issuer → always Class C
          invoiceClass = 'C';
          detectionMethod = 'fiscal_rule_monotributista_issuer';
          console.log('✅ Factura C: Monotributista issuer');
        } else if (issuerRegime === 'RI') {
          // RI issuer → determine receiver status
          const receiverTaxStatus = type === 'income' 
            ? this.extractField(fields.CustomerTaxId || fields.TaxStatus) || ''
            : ''; // For expense, Open Doors is receiver (RI)
          
          const isReceiverMonotributista = /monotribut/i.test(receiverTaxStatus) || 
                                          /monotribut/i.test(documentType);
          const isReceiverConsumerFinal = /consumidor\s*final/i.test(receiverTaxStatus) || 
                                         /consumidor\s*final/i.test(documentType);
          const isReceiverRI = /responsable\s*inscripto/i.test(receiverTaxStatus) ||
                              (type === 'expense'); // Open Doors is RI
          
          if (isReceiverRI || (!isReceiverMonotributista && !isReceiverConsumerFinal && vatAmount > 0)) {
            // RI issuer → RI receiver = Factura A
            invoiceClass = 'A';
            detectionMethod = 'fiscal_rule_RI_to_RI';
            console.log('✅ Factura A: RI issuer to RI receiver');
          } else if (isReceiverMonotributista || isReceiverConsumerFinal) {
            // RI issuer → Monotributista/Consumer Final = Factura B
            invoiceClass = 'B';
            detectionMethod = 'fiscal_rule_RI_to_CF_Mono';
            console.log('✅ Factura B: RI issuer to Consumer Final/Monotributista');
          } else {
            // Unknown receiver status, use conservative default for RI issuer
            invoiceClass = 'A';
            detectionMethod = 'fiscal_rule_RI_default';
            needsReview = true;
            console.log('⚠️ Factura A (default): RI issuer, receiver status unclear');
          }
        } else {
          // Unknown issuer regime - use content hints and fallbacks
          if (/consumidor\s*final/i.test(fullDocumentText) || 
              /consumidor\s*final/i.test(documentType)) {
            invoiceClass = 'B';
            detectionMethod = 'content_hint_consumer_final';
            console.log('✅ Factura B: Consumer Final mentioned in content');
          } else if (vatAmount === 0 && totalAmount > 0) {
            // No VAT could indicate Monotributista or Consumer Final
            invoiceClass = 'B'; // Conservative choice between B and C
            detectionMethod = 'no_vat_conservative_B';
            needsReview = true;
            console.log('⚠️ Factura B: No VAT detected, needs review');
          } else {
            // Default to A with review flag
            invoiceClass = 'A';
            detectionMethod = 'unknown_issuer_default_A';
            needsReview = true;
            console.log('⚠️ Factura A (default): Unknown issuer regime, needs review');
          }
        }
      }
      
      // Priority 3: VAT analysis as validation/tie-breaker (with safety guards)
      if (totalAmount > 0 && (totalAmount - vatAmount) > 0) {
        const vatPercentage = vatAmount > 0 ? (vatAmount / (totalAmount - vatAmount)) * 100 : 0;
        
        // Cross-validate with VAT presence
        if (invoiceClass === 'A' && vatAmount === 0 && totalAmount > 500) {
          console.warn('⚠️ Warning: Factura A but no discriminated VAT - may need review');
          needsReview = true;
        } else if (invoiceClass === 'B' && vatAmount > 0 && vatPercentage > 15) {
          console.warn('⚠️ Warning: Factura B but significant VAT present - may need review');
          needsReview = true;
        } else if (invoiceClass === 'C' && vatAmount > 0) {
          console.warn('⚠️ Warning: Factura C with VAT - Monotributista should not discriminate VAT');
          needsReview = true;
        }
        
        // Log VAT analysis for reference
        if (vatAmount > 0) {
          console.log(`💰 VAT analysis: ${vatAmount} of ${totalAmount} (${vatPercentage.toFixed(1)}%)`);
        }
      }
      
      // Priority 4: Business entity context (tie-breaker only)
      if (detectionMethod === 'fiscal_rule_RI_default' && type === 'income') {
        const clientName = rawClientName?.toLowerCase() || '';
        if (/s\.a\.|s\.r\.l\.|s\.a\.s\.|ltda|sociedad|empresa/i.test(clientName)) {
          console.log('💼 Business entity client detected - reinforcing Factura A');
        } else if (/particular|individual|persona\s*f[ií]sica/i.test(clientName)) {
          invoiceClass = 'B';
          detectionMethod = 'tie_breaker_individual_client';
          console.log('✅ Individual client detected - switching to Factura B');
        }
      }
      
      // Log the final detection result
      console.log(`🎯 Final classification: ${invoiceClass} (method: ${detectionMethod}${needsReview ? ', needs_review' : ''})`);
      
      // Enhanced validation with specific warnings
      if (needsReview) {
        console.warn('⚠️ Classification confidence is low - manual review recommended');
      }
      
      // Extract description/details fields - trying multiple possible field names with array handling
      const description = this.extractDescriptionField(fields);

      const extractedData: InvoiceData = {
        invoice_number: invoiceNumber,
        invoice_class: invoiceClass,
        date: this.extractDateField(fields.InvoiceDate || fields.DueDate || fields.Date),
        total: this.extractNumberField(fields.InvoiceTotal || fields.TotalAmount || fields.Total || fields.AmountDue),
        client_name: rawClientName,
        supplier_name: this.extractField(fields.VendorName || fields.Vendor),
        supplier_cuit: this.extractField(fields.VendorTaxId || fields.TaxId || fields.VendorAddressRecipient),
        vat_amount: this.extractNumberField(fields.TotalTax || fields.Tax || fields.IVA || fields.VAT),
        type: type,
        needs_review: needsReview,
        detection_method: detectionMethod,
        description: description,
      };

      // Calculate subtotal if we have total and VAT
      if (extractedData.total && extractedData.vat_amount) {
        extractedData.subtotal = extractedData.total - extractedData.vat_amount;
      }

      // Enhance with OpenAI if available and properly configured
      if (this.openaiClient && AZURE_OPENAI_DEPLOYMENT && AZURE_OPENAI_KEY) {
        try {
          const enhancedData = await this.enhanceWithOpenAI(extractedData, document);
          return { ...extractedData, ...enhancedData };
        } catch (error: any) {
          // Only log non-authentication errors
          if (!error?.message?.includes('401') && !error?.message?.includes('authentication')) {
            console.warn('OpenAI enhancement failed, using Document Intelligence data only:', error.message);
          }
          // Continue without enhancement - Document Intelligence is sufficient
        }
      }

      console.log('✅ Invoice processed successfully:', extractedData);
      return extractedData;

    } catch (error) {
      console.error('❌ Error processing invoice with Azure:', error);
      // Return fallback data
      return this.getDefaultInvoiceData();
    }
  }

  private extractField(field: any): string | undefined {
    if (!field) return undefined;
    
    if (field.content) return field.content;
    if (field.value) return String(field.value);
    if (field.valueString) return field.valueString;
    
    return undefined;
  }

  private extractDateField(field: any): string | undefined {
    if (!field) return undefined;
    
    // If Azure already parsed it as a date, use it
    if (field.valueDate) {
      const parsedDate = new Date(field.valueDate);
      if (!isNaN(parsedDate.getTime())) {
        console.log(`📅 Date extracted from valueDate: ${field.valueDate} → ${parsedDate.toISOString().split('T')[0]}`);
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    const content = this.extractField(field);
    if (!content) return undefined;
    
    console.log(`📅 Attempting to parse date from content: "${content}"`);
    
    // Clean the content string
    const cleanedContent = content.trim().toLowerCase();
    
    // Spanish month names mapping
    const spanishMonths: { [key: string]: number } = {
      'enero': 0, 'ene': 0,
      'febrero': 1, 'feb': 1,
      'marzo': 2, 'mar': 2,
      'abril': 3, 'abr': 3,
      'mayo': 4, 'may': 4,
      'junio': 5, 'jun': 5,
      'julio': 6, 'jul': 6,
      'agosto': 7, 'ago': 7,
      'septiembre': 8, 'sep': 8, 'sept': 8,
      'octubre': 9, 'oct': 9,
      'noviembre': 10, 'nov': 10,
      'diciembre': 11, 'dic': 11
    };
    
    // Try different date format patterns
    let parsedDate: Date | null = null;
    
    // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const ddmmyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
    const ddmmyyyyMatch = cleanedContent.match(ddmmyyyyPattern);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1]);
      const month = parseInt(ddmmyyyyMatch[2]);
      let year = parseInt(ddmmyyyyMatch[3]);
      
      // Handle 2-digit years (assume 2000s)
      if (year < 100) {
        year = year + 2000;
      }
      
      // Validate the date components
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
        parsedDate = new Date(year, month - 1, day);
        console.log(`✅ Parsed DD/MM/YYYY format: ${day}/${month}/${year}`);
      }
    }
    
    // Pattern 2: DD de MONTH de YYYY or DD MONTH YYYY (Spanish format)
    if (!parsedDate) {
      const spanishDatePattern = /^(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:de\s+)?(\d{2,4})$/;
      const spanishMatch = cleanedContent.match(spanishDatePattern);
      if (spanishMatch) {
        const day = parseInt(spanishMatch[1]);
        const monthName = spanishMatch[2];
        let year = parseInt(spanishMatch[3]);
        
        if (year < 100) {
          year = year + 2000;
        }
        
        const month = spanishMonths[monthName];
        if (month !== undefined && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
          parsedDate = new Date(year, month, day);
          console.log(`✅ Parsed Spanish date format: ${day} de ${monthName} de ${year}`);
        }
      }
    }
    
    // Pattern 3: YYYY-MM-DD or YYYY/MM/DD (ISO format)
    if (!parsedDate) {
      const isoPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
      const isoMatch = cleanedContent.match(isoPattern);
      if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]);
        const day = parseInt(isoMatch[3]);
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
          parsedDate = new Date(year, month - 1, day);
          console.log(`✅ Parsed ISO format: ${year}-${month}-${day}`);
        }
      }
    }
    
    // Pattern 4: MM/DD/YYYY (US format - try only if day > 12 to avoid ambiguity)
    if (!parsedDate) {
      const usPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
      const usMatch = cleanedContent.match(usPattern);
      if (usMatch) {
        const month = parseInt(usMatch[1]);
        const day = parseInt(usMatch[2]);
        let year = parseInt(usMatch[3]);
        
        if (year < 100) {
          year = year + 2000;
        }
        
        // Only use US format if day > 12 (to avoid ambiguity with DD/MM/YYYY)
        if (day > 12 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
          parsedDate = new Date(year, month - 1, day);
          console.log(`✅ Parsed US format: ${month}/${day}/${year}`);
        }
      }
    }
    
    // Last resort: Try JavaScript's built-in Date parser (but be careful with it)
    if (!parsedDate) {
      try {
        const jsDate = new Date(content);
        if (!isNaN(jsDate.getTime())) {
          // Only accept if the year is reasonable (2020-2030)
          const year = jsDate.getFullYear();
          if (year >= 2020 && year <= 2030) {
            parsedDate = jsDate;
            console.log(`✅ Parsed with JS Date constructor: ${content} → ${jsDate.toISOString().split('T')[0]}`);
          }
        }
      } catch {
        // Ignore errors from Date constructor
      }
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const dateStr = parsedDate.toISOString().split('T')[0];
      console.log(`📅 Successfully parsed date: "${content}" → ${dateStr}`);
      return dateStr;
    }
    
    console.warn(`⚠️ Could not parse date from: "${content}"`);
    return undefined; // Never return the raw content if we can't parse it
  }

  private extractNumberField(field: any): number | undefined {
    if (!field) return undefined;
    
    // Azure Document Intelligence returns values correctly in major currency units (pesos)
    if (field.valueNumber !== undefined) return field.valueNumber;
    if (field.valueCurrency?.amount !== undefined) return field.valueCurrency.amount;
    
    const content = this.extractField(field);
    if (!content) return undefined;
    
    // Pre-clean: remove letters, currency codes, keep only digits, separators, and signs
    let raw = content.replace(/[^\d.,\-()\s]/g, '').replace(/\u00A0/g, ' ').trim();
    
    // Detect sign (negative values in parentheses or with minus)
    const sign = (raw.includes('(') && raw.includes(')')) || /^\s*-/.test(raw) ? -1 : 1;
    raw = raw.replace(/[()]/g, '').replace(/^\s*-/, '').trim();
    
    // Strip all whitespace to avoid parsing issues
    raw = raw.replace(/\s+/g, '');
    
    if (!raw || !/\d/.test(raw)) return undefined;
    
    // Determine decimal separator with robust heuristics
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    
    let decimalSep = '';
    let thousandSep = '';
    let normalizedValue = '';
    
    if (lastComma > -1 && lastDot > -1) {
      // Both separators present - rightmost is decimal
      if (lastComma > lastDot) {
        decimalSep = ',';
        thousandSep = '.';
      } else {
        decimalSep = '.';
        thousandSep = ',';
      }
    } else if (lastComma > -1) {
      // Only commas - determine if thousand or decimal
      const commaOccurrences = (raw.match(/,/g) || []).length;
      const afterLastComma = raw.substring(lastComma + 1);
      
      if (commaOccurrences === 1 && afterLastComma.length >= 1 && afterLastComma.length <= 2) {
        decimalSep = ','; // Single comma with 1-2 digits after → decimal
      } else {
        thousandSep = ','; // Multiple commas or 3+ digits after → thousand
      }
    } else if (lastDot > -1) {
      // Only dots - determine if thousand or decimal
      const dotOccurrences = (raw.match(/\./g) || []).length;
      const afterLastDot = raw.substring(lastDot + 1);
      
      if (dotOccurrences === 1 && afterLastDot.length >= 1 && afterLastDot.length <= 2) {
        decimalSep = '.'; // Single dot with 1-2 digits after → decimal
      } else {
        thousandSep = '.'; // Multiple dots or 3+ digits after → thousand
      }
    }
    
    // Normalize the number
    if (decimalSep) {
      // Has decimal separator - split at the last occurrence only
      const lastDecimalIndex = raw.lastIndexOf(decimalSep);
      const integerPart = raw.substring(0, lastDecimalIndex);
      let decimalPart = raw.substring(lastDecimalIndex + 1);
      
      // Clean integer part - remove thousand separators if they exist
      const cleanIntegerPart = thousandSep ? integerPart.replaceAll(thousandSep, '') : integerPart.replace(/[.,]/g, '');
      
      // Ensure decimal part contains only digits
      decimalPart = decimalPart.replace(/\D+/g, '');
      
      normalizedValue = `${cleanIntegerPart}.${decimalPart}`;
    } else {
      // No decimal separator - remove all non-digits except keep clean digits
      normalizedValue = raw.replace(/[^\d]/g, '');
    }
    
    const num = Number(normalizedValue) * sign;
    
    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔢 Number extraction: [${decimalSep ? 'decimal:' + decimalSep : 'no-decimal'}${thousandSep ? ' thousand:' + thousandSep : ''}] → ${num}`);
    }
    
    return Number.isFinite(num) ? num : undefined;
  }

  private extractDescriptionField(fields: any): string | null {
    // Try single value fields first
    const singleFields = [
      'Description', 'ItemDescription', 'ProductDescription', 'ServiceDescription',
      'Details', 'Item', 'Product', 'Service', 'Notes', 'Concept', 'Concepto'
    ];
    
    for (const fieldName of singleFields) {
      const value = this.extractField(fields[fieldName]);
      if (value && value.trim()) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📝 Description found in field ${fieldName}: ${value.slice(0, 50)}...`);
        }
        return value.trim();
      }
    }
    
    // Handle array fields (Items, LineItems, etc.) - Azure uses valueArray
    const arrayFields = [
      'Items', 'LineItems', 'LineItem', 'Products', 'Services'
    ];
    
    for (const fieldName of arrayFields) {
      const arrayField = fields[fieldName];
      if (arrayField && arrayField.valueArray) {
        const descriptions: string[] = [];
        
        // Process up to 5 items to avoid overly long descriptions
        const maxItems = Math.min(5, arrayField.valueArray.length);
        
        for (let i = 0; i < maxItems; i++) {
          const itemField = arrayField.valueArray[i];
          
          if (itemField) {
            let itemDesc: string | undefined;
            
            // Try to extract from valueObject (preferred for structured data)
            if (itemField.valueObject) {
              itemDesc = (
                this.extractField(itemField.valueObject.Description) ||
                this.extractField(itemField.valueObject.ItemDescription) ||
                this.extractField(itemField.valueObject.ProductName) ||
                this.extractField(itemField.valueObject.ProductDescription) ||
                this.extractField(itemField.valueObject.Item) ||
                this.extractField(itemField.valueObject.Product) ||
                this.extractField(itemField.valueObject.Service) ||
                this.extractField(itemField.valueObject.Name)
              );
            }
            
            // Fallback to content or direct field extraction
            if (!itemDesc) {
              itemDesc = this.extractField(itemField);
            }
            
            if (itemDesc && itemDesc.trim() && itemDesc.length > 2) {
              descriptions.push(itemDesc.trim());
            }
          }
        }
        
        if (descriptions.length > 0) {
          // Join descriptions with proper formatting
          let result = descriptions.join('; ');
          
          // Add count if there were more items
          if (arrayField.valueArray.length > maxItems) {
            result += ` (+${arrayField.valueArray.length - maxItems} más)`;
          }
          
          // Truncate if too long
          if (result.length > 500) {
            result = result.slice(0, 497) + '...';
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`📝 Description extracted from ${fieldName} array: ${descriptions.length} items`);
          }
          return result;
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 No description found in any field');
    }
    return null;
  }

  private determineInvoiceType(fields: any): 'income' | 'expense' {
    // If we have a vendor name but no customer name, it's likely an expense
    if (fields.VendorName && !fields.CustomerName) {
      return 'expense';
    }
    // If we have a customer name, it's likely income
    if (fields.CustomerName) {
      return 'income';
    }
    // Default to expense
    return 'expense';
  }

  private async enhanceWithOpenAI(data: InvoiceData, document: any): Promise<Partial<InvoiceData>> {
    if (!this.openaiClient) {
      return {};
    }

    try {
      const prompt = `Analyze this invoice data and provide any missing or corrected information:
        Current extracted data: ${JSON.stringify(data)}
        Full document text: ${document.content || ''}
        
        Please provide a JSON response with any corrections or missing fields:
        {
          "invoice_number": "string",
          "date": "YYYY-MM-DD",
          "total": number,
          "client_name": "string",
          "supplier_name": "string",
          "type": "income" or "expense",
          "vat_amount": number
        }`;

      const completion = await this.openaiClient.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT,
        messages: [
          { role: 'system', content: 'You are an invoice data extraction expert.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      if (completion.choices && completion.choices[0]?.message?.content) {
        try {
          const enhanced = JSON.parse(completion.choices[0].message.content);
          return enhanced;
        } catch {
          console.warn('Could not parse OpenAI response');
        }
      }
    } catch (error) {
      console.warn('OpenAI enhancement error:', error);
    }

    return {};
  }

  private getDefaultInvoiceData(): InvoiceData {
    return {
      invoice_number: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      total: 0,
      client_name: 'Pendiente de procesamiento',
      type: 'expense',
      vat_amount: 0,
      description: 'Descripción no disponible - procesamiento por defecto'
    };
  }

  async processChatQuery(message: string, userName?: string): Promise<string> {
    // If no OpenAI client, provide a helpful response based on database data
    if (!this.openaiClient) {
      // Provide a simulated response that still queries the database
      try {
        const lowerMessage = message.toLowerCase();
        
        // Get database data for context-aware responses
        const kpiData = await storage.getKPIData();
        const quickStats = await storage.getQuickStats();
        
        // Handle greetings
        if (lowerMessage.includes('hola') || lowerMessage.includes('hello') || 
            lowerMessage.includes('hi') || lowerMessage.includes('buenos')) {
          return `¡Hola${userName ? ' ' + userName : ''}! Soy tu asistente financiero avanzado. Puedo ayudarte con:\n\n` +
                 `📊 Análisis por períodos (mensual, trimestral, fiscal)\n` +
                 `💰 Análisis de clientes y proveedores específicos\n` +
                 `📈 Tendencias de pagos y morosidad\n` +
                 `🔄 Comparación entre períodos\n` +
                 `📋 Estado de IVA por tipo de factura (A/B/C)\n\n` +
                 `Estado actual del sistema:\n` +
                 `• Total Ingresos: ${kpiData.totalIncome}\n` +
                 `• Total Egresos: ${kpiData.totalExpenses}\n` +
                 `• Balance General: ${kpiData.generalBalance}\n` +
                 `• Rentabilidad: ${kpiData.profitability}\n\n` +
                 `¿En qué puedo ayudarte hoy?`;
        }
        
        // Handle specific period queries (month, quarter, fiscal)
        if (lowerMessage.includes('mes') || lowerMessage.includes('mensual') || lowerMessage.includes('este mes')) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const monthlyInvoices = await storage.getAllInvoices({
            month: currentMonth,
            year: currentYear
          });
          
          const monthlyIncome = monthlyInvoices.invoices
            .filter(inv => inv.type === 'income')
            .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
          
          const monthlyExpense = monthlyInvoices.invoices
            .filter(inv => inv.type === 'expense')
            .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
          
          const invoicesByClass = {
            A: monthlyInvoices.invoices.filter(inv => inv.invoiceClass === 'A').length,
            B: monthlyInvoices.invoices.filter(inv => inv.invoiceClass === 'B').length,
            C: monthlyInvoices.invoices.filter(inv => inv.invoiceClass === 'C').length
          };
          
          return `📊 Resumen del Mes Actual (${new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}):\n\n` +
                 `💚 Ingresos: $ ${monthlyIncome.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                 `🔴 Egresos: $ ${monthlyExpense.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                 `💰 Balance: $ ${(monthlyIncome - monthlyExpense).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                 `📋 Total Facturas: ${monthlyInvoices.total}\n\n` +
                 `Facturas por Tipo:\n` +
                 `• Tipo A: ${invoicesByClass.A}\n` +
                 `• Tipo B: ${invoicesByClass.B}\n` +
                 `• Tipo C: ${invoicesByClass.C}`;
        }
        
        // Handle payment status queries
        if (lowerMessage.includes('pendiente') || lowerMessage.includes('cobrar') || lowerMessage.includes('pagar') || lowerMessage.includes('morosidad')) {
          const pendingInvoices = await storage.getAllInvoices({ paymentStatus: 'pending' });
          const overdueInvoices = await storage.getAllInvoices({ paymentStatus: 'overdue' });
          
          const pendingIncome = pendingInvoices.invoices
            .filter(inv => inv.type === 'income')
            .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
          
          const pendingExpense = pendingInvoices.invoices
            .filter(inv => inv.type === 'expense')
            .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
          
          const overdueAmount = overdueInvoices.invoices
            .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
          
          return `📋 Estado de Pagos:\n\n` +
                 `⏳ Facturas Pendientes: ${pendingInvoices.total}\n` +
                 `• Por cobrar: $ ${pendingIncome.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pendingInvoices.invoices.filter(inv => inv.type === 'income').length} facturas)\n` +
                 `• Por pagar: $ ${pendingExpense.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pendingInvoices.invoices.filter(inv => inv.type === 'expense').length} facturas)\n\n` +
                 `🔴 Facturas Vencidas: ${overdueInvoices.total}\n` +
                 `• Monto total vencido: $ ${overdueAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
                 `💡 Recomendación: ${overdueInvoices.total > 5 ? 'Hay varias facturas vencidas. Considera hacer un seguimiento de cobros.' : 'El estado de pagos está bajo control.'}`;
        }
        
        // Handle client/provider specific queries
        if (lowerMessage.includes('cliente') || lowerMessage.includes('proveedor')) {
          const clientsProviders = await storage.getAllClientsProviders();
          const topClients = clientsProviders.filter(cp => cp.type === 'client').slice(0, 5);
          const topProviders = clientsProviders.filter(cp => cp.type === 'provider').slice(0, 5);
          
          return `👥 Resumen de Clientes y Proveedores:\n\n` +
                 `Total Clientes: ${clientsProviders.filter(cp => cp.type === 'client').length}\n` +
                 `Total Proveedores: ${clientsProviders.filter(cp => cp.type === 'provider').length}\n\n` +
                 `Top 5 Clientes:\n` +
                 topClients.map(c => `• ${c.name} ${c.cuit ? `(CUIT: ${c.cuit})` : ''}`).join('\n') +
                 `\n\nTop 5 Proveedores:\n` +
                 topProviders.map(p => `• ${p.name} ${p.cuit ? `(CUIT: ${p.cuit})` : ''}`).join('\n');
        }
        
        // Handle IVA queries
        if (lowerMessage.includes('iva') || lowerMessage.includes('impuesto')) {
          const allInvoices = await storage.getAllInvoices({ limit: 1000 });
          const ivaByClass = {
            A: allInvoices.invoices.filter(inv => inv.invoiceClass === 'A')
              .reduce((sum, inv) => sum + parseFloat(inv.ivaAmount || '0'), 0),
            B: allInvoices.invoices.filter(inv => inv.invoiceClass === 'B')
              .reduce((sum, inv) => sum + parseFloat(inv.ivaAmount || '0'), 0),
            C: allInvoices.invoices.filter(inv => inv.invoiceClass === 'C')
              .reduce((sum, inv) => sum + parseFloat(inv.ivaAmount || '0'), 0)
          };
          
          const totalIVA = ivaByClass.A + ivaByClass.B + ivaByClass.C;
          
          return `📊 Análisis de IVA:\n\n` +
                 `Balance IVA: ${kpiData.ivaBalance}\n` +
                 `IVA Recuperado: ${quickStats.ivaRecovered}\n\n` +
                 `IVA por Tipo de Factura:\n` +
                 `• Tipo A (Compensable): $ ${ivaByClass.A.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                 `• Tipo B (Consumidor Final): $ ${ivaByClass.B.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                 `• Tipo C (Monotributo): $ ${ivaByClass.C.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n` +
                 `Total IVA: $ ${totalIVA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        }
        
        // Handle invoice/financial queries
        if (lowerMessage.includes('factura') || lowerMessage.includes('invoice') ||
            lowerMessage.includes('ingreso') || lowerMessage.includes('egreso') ||
            lowerMessage.includes('balance') || lowerMessage.includes('total')) {
          
          const recentInvoices = await storage.getRecentInvoices(5);
          const invoiceInfo = recentInvoices.length > 0 ? 
            `\n\nÚltimas ${recentInvoices.length} facturas procesadas:\n` +
            recentInvoices.map(inv => 
              `• ${inv.invoiceNumber} - ${inv.type === 'income' ? 'Ingreso' : 'Egreso'} - ${inv.totalAmount ? parseFloat(inv.totalAmount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '$ 0,00'}`
            ).join('\n') : 
            '\n\nNo hay facturas registradas aún.';
          
          return `📊 Resumen Financiero Actual:\n\n` +
                 `💚 Ingresos Totales: ${kpiData.totalIncome}\n` +
                 `🔴 Egresos Totales: ${kpiData.totalExpenses}\n` +
                 `💰 Balance General: ${kpiData.generalBalance}\n` +
                 `📈 Rentabilidad: ${kpiData.profitability}\n` +
                 `📋 Balance IVA: ${kpiData.ivaBalance}\n` +
                 `\nEstadísticas adicionales:\n` +
                 `• Facturas este mes: ${quickStats.invoicesThisMonth}\n` +
                 `• Promedio por factura: ${quickStats.averageInvoice}` +
                 invoiceInfo;
        }
        
        // Handle report requests
        if (lowerMessage.includes('reporte') || lowerMessage.includes('report') ||
            lowerMessage.includes('análisis') || lowerMessage.includes('estadística')) {
          
          const chartData = await storage.getChartData();
          const monthlyTrend = chartData.length > 0 ? 
            '\n\nTendencia mensual (últimos meses):\n' +
            chartData.slice(-3).map(d => 
              `• ${d.month}: Ingresos ${d.income.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} / Egresos ${d.expenses.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`
            ).join('\n') : '';
          
          return `📊 Reporte Financiero Completo:\n\n` +
                 `Estado Actual:\n` +
                 `• Total Ingresos: ${kpiData.totalIncome}\n` +
                 `• Total Egresos: ${kpiData.totalExpenses}\n` +
                 `• Balance: ${kpiData.generalBalance}\n` +
                 `• Rentabilidad: ${kpiData.profitability}%\n` +
                 `\nCambios vs Mes Anterior:\n` +
                 `• Variación Ingresos: ${kpiData.incomeChange}%\n` +
                 `• Variación Egresos: ${kpiData.expensesChange}%` +
                 monthlyTrend;
        }
        
        // Default response for other queries
        return `Entiendo tu consulta sobre: "${message}".\n\n` +
               `Actualmente el sistema muestra:\n` +
               `• Ingresos: ${kpiData.totalIncome}\n` +
               `• Egresos: ${kpiData.totalExpenses}\n` +
               `• Balance: ${kpiData.generalBalance}\n\n` +
               `Para obtener respuestas más detalladas, configura tu API key de OpenAI en las variables de entorno.`;
        
      } catch (error) {
        console.error('Error in fallback chat processing:', error);
        return "Disculpa, ocurrió un error al procesar tu consulta. Por favor intenta nuevamente.";
      }
    }

    try {
      // Analyze the user's message to determine what data they need
      const lowerMessage = message.toLowerCase();
      let contextData: any = {};
      let systemPrompt = `Eres un asistente financiero experto para Open Doors. 
      Tienes acceso completo a los datos del sistema de facturación.
      SIEMPRE proporciona información precisa basada en datos reales.
      Responde en español de forma profesional pero amigable.
      ${userName ? `El usuario actual es ${userName}.` : ''}
      Si te saludan, responde con "¡Hola${userName ? ' ' + userName : ''}! Soy tu asistente financiero. Puedo ayudarte con consultas sobre facturas, análisis de datos, y generar reportes personalizados. ¿En qué puedo ayudarte hoy?"`;
      
      // Fetch relevant data based on the query
      try {
        // Always get basic KPI data for context
        const kpiData = await storage.getKPIData();
        contextData.kpis = kpiData;
        
        // Get quick stats for more context
        const quickStats = await storage.getQuickStats();
        contextData.quickStats = quickStats;
        
        // Check if asking about specific invoices, clients, or reports
        if (lowerMessage.includes('factura') || lowerMessage.includes('invoice')) {
          const recentInvoices = await storage.getRecentInvoices(20);
          contextData.recentInvoices = recentInvoices;
          
          // Get specific invoice if number is mentioned
          const invoiceNumberMatch = message.match(/[A-Z0-9]+-[A-Z0-9]+|\d{5,}/i);
          if (invoiceNumberMatch) {
            const allInvoices = await storage.getAllInvoices({ limit: 1000 });
            const specificInvoice = allInvoices.invoices.find(inv => 
              inv.invoiceNumber?.includes(invoiceNumberMatch[0])
            );
            if (specificInvoice) {
              contextData.specificInvoice = specificInvoice;
            }
          }
          
          // Get IVA breakdown if mentioned
          if (lowerMessage.includes('iva') || lowerMessage.includes('tipo')) {
            const ivaBreakdown = await storage.getIVABreakdownByClass();
            contextData.ivaBreakdown = ivaBreakdown;
          }
        }
        
        // Handle fiscal period queries
        if (lowerMessage.includes('fiscal') || lowerMessage.includes('mayo') || lowerMessage.includes('abril')) {
          const fiscalData = await storage.getKPIDataByFiscalPeriod(5, 2024, 4, 2025);
          contextData.fiscalPeriodData = fiscalData;
        }
        
        // Handle comparative analysis queries
        if (lowerMessage.includes('comparar') || lowerMessage.includes('versus') || lowerMessage.includes('vs')) {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const thisMonth = new Date();
          
          const lastMonthData = await storage.getAllInvoices({
            month: lastMonth.getMonth() + 1,
            year: lastMonth.getFullYear()
          });
          
          const thisMonthData = await storage.getAllInvoices({
            month: thisMonth.getMonth() + 1,
            year: thisMonth.getFullYear()
          });
          
          contextData.comparison = {
            lastMonth: lastMonthData,
            thisMonth: thisMonthData
          };
        }
        
        if (lowerMessage.includes('cliente') || lowerMessage.includes('proveedor')) {
          const clientsProviders = await storage.getAllClientsProviders();
          contextData.clientsProviders = clientsProviders;
          
          // Get client/provider statistics
          const clientStats = await storage.getClientProviderStatistics();
          contextData.clientStatistics = clientStats;
        }
        
        if (lowerMessage.includes('mes') || lowerMessage.includes('año') || 
            lowerMessage.includes('reporte') || lowerMessage.includes('análisis')) {
          const chartData = await storage.getChartData();
          contextData.chartData = chartData;
          
          // Add owner statistics if mentioned
          if (lowerMessage.includes('socio') || lowerMessage.includes('propietario') || 
              lowerMessage.includes('joni') || lowerMessage.includes('hernán')) {
            const ownerStats = await storage.getOwnerStatistics();
            contextData.ownerStatistics = ownerStats;
          }
        }
        
        // Get all invoices if asking for totals, calculations, or comprehensive analysis
        if (lowerMessage.includes('total') || lowerMessage.includes('calcul') || 
            lowerMessage.includes('suma') || lowerMessage.includes('promedio') ||
            lowerMessage.includes('análisis') || lowerMessage.includes('estadística')) {
          const allInvoices = await storage.getAllInvoices({ limit: 1000 });
          contextData.allInvoices = allInvoices;
        }
        
        // Add payment status data if mentioned
        if (lowerMessage.includes('pago') || lowerMessage.includes('pendiente') ||
            lowerMessage.includes('cobr') || lowerMessage.includes('vencid')) {
          const overdueInvoices = await storage.getOverdueInvoices();
          contextData.overdueInvoices = overdueInvoices;
        }
        
        // Add IVA specific queries
        if (lowerMessage.includes('iva') || lowerMessage.includes('impuesto')) {
          const kpiData = await storage.getKPIData();
          contextData.ivaBalance = kpiData.ivaBalance;
          contextData.ivaRecovered = quickStats.ivaRecovered;
        }
        
        // Add period-specific filters
        if (lowerMessage.includes('trimestre') || lowerMessage.includes('quarter')) {
          const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
          const startMonth = (currentQuarter - 1) * 3 + 1;
          const endMonth = startMonth + 2;
          const quarterData = await storage.getAllInvoices({
            month: startMonth,
            year: new Date().getFullYear(),
            limit: 1000
          });
          contextData.quarterData = quarterData;
        }
        
        systemPrompt += `\n\nDatos actuales del sistema:\n${JSON.stringify(contextData, null, 2)}`;
      } catch (dbError) {
        console.error('Error fetching context data:', dbError);
        // Continue without context data
      }

      const completion = await this.openaiClient.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT,
        messages: [
          { 
            role: 'system', 
            content: systemPrompt + `\n\nINSTRUCCIONES IMPORTANTES:\n` +
              `1. SIEMPRE usa los datos reales proporcionados para responder\n` +
              `2. Formatea las cantidades como moneda argentina (ARS)\n` +
              `3. Si hay datos específicos sobre lo que pregunta el usuario, úsalos\n` +
              `4. Proporciona análisis perspicaces cuando sea apropiado\n` +
              `5. Si no tienes datos suficientes, indícalo claramente`
          },
          { 
            role: 'user', 
            content: `${message}\n\nPor favor, responde basándote en los datos reales del sistema. Si es un saludo, responde amablemente y ofrece ayuda con análisis financiero, reportes, cálculos de facturas, estadísticas, etc.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      if (completion.choices && completion.choices[0]?.message?.content) {
        return completion.choices[0].message.content;
      }

      return "No pude generar una respuesta. Por favor, intenta reformular tu pregunta.";
    } catch (error: any) {
      console.error('Error in chat processing:', error);
      
      // Check if it's an authentication error
      if (error?.status === 401 || error?.message?.includes('401')) {
        return "Error de autenticación con Azure OpenAI. Por favor, verifica la configuración de las API keys y endpoints.";
      }
      
      return "Ocurrió un error al procesar tu mensaje. Por favor, intenta más tarde.";
    }
  }
}

// Export singleton instance
export const azureProcessor = new AzureInvoiceProcessor();
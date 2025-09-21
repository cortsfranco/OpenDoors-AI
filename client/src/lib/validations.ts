import { z } from "zod";

// CUIT validation - Algoritmo de verificación oficial AFIP
export const validateCUIT = (cuit: string): boolean => {
  if (!cuit) return true; // Optional field
  
  // Remove hyphens and spaces
  const cleanCuit = cuit.replace(/[-\s]/g, '');
  
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleanCuit)) return false;
  
  // CUIT validation algorithm
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = cleanCuit.split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * mult[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return checkDigit === digits[10];
};

// Advanced fiscal date validation
export const validateFiscalDate = (date: Date): { valid: boolean; warning?: string } => {
  const now = new Date();
  const minDate = new Date('2020-01-01'); // System start date
  const maxDate = new Date(now.getFullYear() + 1, 11, 31); // Allow next year for planning
  
  if (date < minDate) {
    return { valid: false, warning: 'La fecha no puede ser anterior al 1 de enero de 2020' };
  }
  
  if (date > maxDate) {
    return { valid: false, warning: 'La fecha no puede ser posterior al año siguiente' };
  }
  
  // Warn for future dates
  if (date > now) {
    return { valid: true, warning: 'Fecha futura: verifique que sea correcta' };
  }
  
  return { valid: true };
};

// Comprehensive amount validation for Argentine pesos
export const validateAmount = (amount: string | number, field: string): { valid: boolean; error?: string } => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { valid: false, error: `${field} debe ser un número válido` };
  }
  
  if (numAmount < 0) {
    return { valid: false, error: `${field} no puede ser negativo` };
  }
  
  if (numAmount > 999999999.99) {
    return { valid: false, error: `${field} excede el límite permitido` };
  }
  
  // Check decimal places (max 2 for currency)
  const decimalParts = amount.toString().split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > 2) {
    return { valid: false, error: `${field} no puede tener más de 2 decimales` };
  }
  
  return { valid: true };
};

// Invoice number validation (Argentine standard)
export const validateInvoiceNumber = (number: string, invoiceClass: 'A' | 'B' | 'C'): { valid: boolean; error?: string } => {
  if (!number) return { valid: true }; // Optional
  
  // Standard format: XXXX-XXXXXXXX
  const formats = {
    'A': /^\d{4}-\d{8}$/, // Factura A
    'B': /^\d{4}-\d{8}$/, // Factura B  
    'C': /^\d{4}-\d{8}$/, // Factura C
  };
  
  const format = formats[invoiceClass];
  if (!format.test(number)) {
    return { 
      valid: false, 
      error: `Número de factura ${invoiceClass} debe tener formato XXXX-XXXXXXXX` 
    };
  }
  
  return { valid: true };
};

// IVA calculation validation
export const validateIVACalculation = (
  subtotal: number,
  ivaAmount: number,
  totalAmount: number,
  invoiceClass: 'A' | 'B' | 'C'
): { valid: boolean; error?: string; suggestion?: string } => {
  // Factura C typically has no IVA
  if (invoiceClass === 'C' && ivaAmount > 0) {
    return {
      valid: true,
      suggestion: 'Las facturas C (monotributista) generalmente no incluyen IVA'
    };
  }
  
  // Check basic math
  const calculatedTotal = subtotal + ivaAmount;
  const difference = Math.abs(calculatedTotal - totalAmount);
  
  if (difference > 0.02) { // 2 cent tolerance
    return {
      valid: false,
      error: `Error en el cálculo: Subtotal ($${subtotal.toFixed(2)}) + IVA ($${ivaAmount.toFixed(2)}) ≠ Total ($${totalAmount.toFixed(2)})`
    };
  }
  
  // Check IVA percentage (common rates: 0%, 10.5%, 21%, 27%)
  if (subtotal > 0 && ivaAmount > 0) {
    const ivaPercentage = (ivaAmount / subtotal) * 100;
    const commonRates = [10.5, 21, 27];
    const isCommonRate = commonRates.some(rate => Math.abs(ivaPercentage - rate) < 0.1);
    
    if (!isCommonRate && ivaPercentage > 1) {
      return {
        valid: true,
        suggestion: `Alícuota IVA inusual: ${ivaPercentage.toFixed(2)}%. Verifique si es correcta.`
      };
    }
  }
  
  return { valid: true };
};

// Comprehensive invoice validation schema
export const createInvoiceValidationSchema = (invoiceClass: 'A' | 'B' | 'C') => {
  return z.object({
    type: z.enum(['income', 'expense', 'neutral']),
    invoiceClass: z.enum(['A', 'B', 'C']),
    date: z.string().refine(
      (date) => validateFiscalDate(new Date(date)).valid,
      "Fecha fiscal inválida"
    ),
    clientProviderName: z.string().min(1, "Nombre del cliente/proveedor es obligatorio"),
    clientProviderCuit: z.string().optional().refine(
      (cuit) => !cuit || validateCUIT(cuit),
      "CUIT inválido según algoritmo AFIP"
    ),
    invoiceNumber: z.string().optional().refine(
      (number) => !number || validateInvoiceNumber(number, invoiceClass).valid,
      `Formato de factura ${invoiceClass} inválido`
    ),
    subtotal: z.string().refine(
      (amount) => validateAmount(amount, "Subtotal").valid,
      "Subtotal inválido"
    ),
    ivaAmount: z.string().refine(
      (amount) => validateAmount(amount, "IVA").valid,
      "Monto IVA inválido"
    ),
    totalAmount: z.string().refine(
      (amount) => validateAmount(amount, "Total").valid,
      "Monto total inválido"
    ),
  }).refine(
    (data) => {
      const subtotal = parseFloat(data.subtotal) || 0;
      const iva = parseFloat(data.ivaAmount) || 0;
      const total = parseFloat(data.totalAmount) || 0;
      return validateIVACalculation(subtotal, iva, total, data.invoiceClass).valid;
    },
    {
      message: "Error en el cálculo de IVA y totales",
    }
  );
};

// Export validation utilities
export const AFIPValidations = {
  validateCUIT,
  validateFiscalDate,
  validateAmount,
  validateInvoiceNumber,
  validateIVACalculation,
  createInvoiceValidationSchema,
};
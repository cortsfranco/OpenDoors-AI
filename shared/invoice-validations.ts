import { z } from 'zod';
import { FinancialCalculator, safeParseFloat } from './financial-calculator';

// Esquemas de validación para facturas con precisión decimal
export const invoiceValidationSchema = z.object({
  type: z.enum(['income', 'expense']),
  invoiceClass: z.enum(['A', 'B', 'C']),
  invoiceNumber: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  date: z.date(),
  clientProviderName: z.string()
    .min(1, 'Cliente/Proveedor es requerido')
    .max(255, 'Nombre muy largo'),
  subtotal: z.union([z.string(), z.number()]).transform(val => safeParseFloat(val)),
  ivaAmount: z.union([z.string(), z.number()]).transform(val => safeParseFloat(val)),
  totalAmount: z.union([z.string(), z.number()]).transform(val => safeParseFloat(val)),
  paymentStatus: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending')
}).refine((data) => {
  // Validar que el cálculo sea correcto
  const validation = FinancialCalculator.validateInvoiceCalculation(
    data.subtotal,
    data.ivaAmount,
    data.totalAmount
  );
  return validation.isValid;
}, {
  message: 'Error en el cálculo de la factura',
  path: ['totalAmount']
}).refine((data) => {
  // Validar que los montos sean positivos
  const subtotalValidation = FinancialCalculator.validatePositiveAmount(data.subtotal);
  const ivaValidation = FinancialCalculator.validatePositiveAmount(data.ivaAmount);
  const totalValidation = FinancialCalculator.validatePositiveAmount(data.totalAmount);
  
  return subtotalValidation.isValid && ivaValidation.isValid && totalValidation.isValid;
}, {
  message: 'Todos los montos deben ser positivos',
  path: ['subtotal']
}).refine((data) => {
  // Validar IVA según tipo de factura
  if (data.invoiceClass === 'C' && data.ivaAmount.greaterThan(0)) {
    return false; // Factura C no debe tener IVA
  }
  return true;
}, {
  message: 'Las facturas C (monotributista) no deben incluir IVA',
  path: ['ivaAmount']
}).refine((data) => {
  // Validar alícuotas de IVA comunes
  if (data.ivaAmount.greaterThan(0) && data.subtotal.greaterThan(0)) {
    const ivaPercentage = FinancialCalculator.calculateIVAPercentage(data.subtotal, data.ivaAmount);
    const commonRates = [0, 10.5, 21, 27];
    const isCommonRate = commonRates.some(rate => 
      Math.abs(ivaPercentage.toNumber() - rate) < 0.1
    );
    
    if (!isCommonRate) {
      return false;
    }
  }
  return true;
}, {
  message: 'Alícuota de IVA no reconocida. Verifique el cálculo.',
  path: ['ivaAmount']
});

// Validación específica para factura A
export const facturaAValidationSchema = invoiceValidationSchema.refine((data) => {
  return data.invoiceClass === 'A';
}, {
  message: 'Debe ser una factura tipo A',
  path: ['invoiceClass']
}).refine((data) => {
  // Factura A debe tener IVA discriminado
  return data.ivaAmount.greaterThan(0);
}, {
  message: 'Las facturas A deben discriminar IVA',
  path: ['ivaAmount']
});

// Validación específica para factura B
export const facturaBValidationSchema = invoiceValidationSchema.refine((data) => {
  return data.invoiceClass === 'B';
}, {
  message: 'Debe ser una factura tipo B',
  path: ['invoiceClass']
});

// Validación específica para factura C
export const facturaCValidationSchema = invoiceValidationSchema.refine((data) => {
  return data.invoiceClass === 'C';
}, {
  message: 'Debe ser una factura tipo C',
  path: ['invoiceClass']
}).refine((data) => {
  // Factura C no debe tener IVA
  return data.ivaAmount.equals(0);
}, {
  message: 'Las facturas C no deben incluir IVA',
  path: ['ivaAmount']
});

// Función para validar CUIT
export function validateCUIT(cuit: string): { isValid: boolean; error?: string } {
  if (!cuit) {
    return { isValid: true }; // CUIT es opcional
  }
  
  // Remover guiones y espacios
  const cleanCUIT = cuit.replace(/[\-\s]/g, '');
  
  // Validar formato
  if (!/^[0-9]{11}$/.test(cleanCUIT)) {
    return {
      isValid: false,
      error: 'CUIT debe tener 11 dígitos'
    };
  }
  
  // Validar dígito verificador
  const digits = cleanCUIT.split('').map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * multipliers[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  if (checkDigit !== digits[10]) {
    return {
      isValid: false,
      error: 'CUIT inválido: dígito verificador incorrecto'
    };
  }
  
  return { isValid: true };
}

// Función para validar fecha de factura
export function validateInvoiceDate(date: Date): { isValid: boolean; error?: string } {
  const now = new Date();
  const invoiceDate = new Date(date);
  
  // No permitir fechas futuras
  if (invoiceDate > now) {
    return {
      isValid: false,
      error: 'La fecha de la factura no puede ser futura'
    };
  }
  
  // No permitir fechas muy antiguas (más de 5 años)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  
  if (invoiceDate < fiveYearsAgo) {
    return {
      isValid: false,
      error: 'La fecha de la factura es muy antigua (más de 5 años)'
    };
  }
  
  return { isValid: true };
}

// Función para validar número de factura
export function validateInvoiceNumber(invoiceNumber: string): { isValid: boolean; error?: string } {
  if (!invoiceNumber) {
    return { isValid: true }; // Número es opcional
  }
  
  // Validar formato básico (letras y números, guiones, puntos)
  if (!/^[A-Z0-9\-\_\.]+$/i.test(invoiceNumber)) {
    return {
      isValid: false,
      error: 'Número de factura contiene caracteres inválidos'
    };
  }
  
  // Validar longitud
  if (invoiceNumber.length > 50) {
    return {
      isValid: false,
      error: 'Número de factura muy largo (máximo 50 caracteres)'
    };
  }
  
  return { isValid: true };
}

// Función para validar monto máximo
export function validateMaximumAmount(amount: number | string): { isValid: boolean; error?: string } {
  const decimal = typeof amount === 'string' ? safeParseFloat(amount) : new Decimal(amount);
  const maxAmount = new Decimal(999999999.99);
  
  if (decimal.greaterThan(maxAmount)) {
    return {
      isValid: false,
      error: 'El monto excede el límite máximo permitido ($999,999,999.99)'
    };
  }
  
  return { isValid: true };
}

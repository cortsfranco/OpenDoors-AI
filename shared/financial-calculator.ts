import { Decimal } from 'decimal.js';

// Configurar precisión decimal para cálculos financieros
Decimal.set({ 
  precision: 28, 
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15
});

export class FinancialCalculator {
  /**
   * Suma dos montos monetarios con precisión decimal
   */
  static add(amount1: number | string, amount2: number | string): Decimal {
    const d1 = new Decimal(amount1);
    const d2 = new Decimal(amount2);
    return d1.plus(d2);
  }

  /**
   * Resta dos montos monetarios con precisión decimal
   */
  static subtract(amount1: number | string, amount2: number | string): Decimal {
    const d1 = new Decimal(amount1);
    const d2 = new Decimal(amount2);
    return d1.minus(d2);
  }

  /**
   * Multiplica un monto por un factor con precisión decimal
   */
  static multiply(amount: number | string, factor: number | string): Decimal {
    const d1 = new Decimal(amount);
    const d2 = new Decimal(factor);
    return d1.times(d2);
  }

  /**
   * Divide un monto por un divisor con precisión decimal
   */
  static divide(amount: number | string, divisor: number | string): Decimal {
    const d1 = new Decimal(amount);
    const d2 = new Decimal(divisor);
    if (d2.equals(0)) {
      throw new Error('División por cero no permitida');
    }
    return d1.div(d2);
  }

  /**
   * Calcula el IVA sobre un subtotal
   */
  static calculateIVA(subtotal: number | string, ivaRate: number): Decimal {
    const subtotalDecimal = new Decimal(subtotal);
    const rateDecimal = new Decimal(ivaRate);
    return subtotalDecimal.times(rateDecimal);
  }

  /**
   * Calcula el total incluyendo IVA
   */
  static calculateTotalWithIVA(subtotal: number | string, ivaAmount: number | string): Decimal {
    const subtotalDecimal = new Decimal(subtotal);
    const ivaDecimal = new Decimal(ivaAmount);
    return subtotalDecimal.plus(ivaDecimal);
  }

  /**
   * Valida que el cálculo de una factura sea correcto
   */
  static validateInvoiceCalculation(
    subtotal: number | string,
    ivaAmount: number | string,
    totalAmount: number | string,
    tolerance: number = 0.01
  ): { isValid: boolean; error?: string; calculatedTotal: Decimal } {
    const subtotalDecimal = new Decimal(subtotal);
    const ivaDecimal = new Decimal(ivaAmount);
    const totalDecimal = new Decimal(totalAmount);
    
    const calculatedTotal = subtotalDecimal.plus(ivaDecimal);
    const difference = calculatedTotal.minus(totalDecimal).abs();
    
    if (difference.greaterThan(tolerance)) {
      return {
        isValid: false,
        error: `Error en cálculo: Subtotal (${subtotalDecimal.toFixed(2)}) + IVA (${ivaDecimal.toFixed(2)}) = ${calculatedTotal.toFixed(2)} ≠ Total (${totalDecimal.toFixed(2)})`,
        calculatedTotal
      };
    }
    
    return {
      isValid: true,
      calculatedTotal
    };
  }

  /**
   * Calcula el porcentaje de IVA aplicado
   */
  static calculateIVAPercentage(subtotal: number | string, ivaAmount: number | string): Decimal {
    const subtotalDecimal = new Decimal(subtotal);
    const ivaDecimal = new Decimal(ivaAmount);
    
    if (subtotalDecimal.equals(0)) {
      return new Decimal(0);
    }
    
    return ivaDecimal.div(subtotalDecimal).times(100);
  }

  /**
   * Redondea un monto a 2 decimales (centavos)
   */
  static roundToCents(amount: number | string): Decimal {
    return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Convierte un Decimal a número para almacenamiento en base de datos
   */
  static toNumber(decimal: Decimal): number {
    return decimal.toNumber();
  }

  /**
   * Convierte un Decimal a string para almacenamiento en base de datos
   */
  static toString(decimal: Decimal): string {
    return decimal.toFixed(2);
  }

  /**
   * Formatea un monto para mostrar al usuario
   */
  static formatCurrency(amount: number | string | Decimal, currency: string = 'ARS'): string {
    const decimal = amount instanceof Decimal ? amount : new Decimal(amount);
    const formatted = decimal.toFixed(2);
    
    switch (currency) {
      case 'USD':
        return `$${formatted}`;
      case 'EUR':
        return `€${formatted}`;
      case 'ARS':
      default:
        return `$${formatted}`;
    }
  }

  /**
   * Calcula el balance de IVA (IVA débito - IVA crédito)
   */
  static calculateIVABalance(ivaDebit: number | string, ivaCredit: number | string): Decimal {
    const debitDecimal = new Decimal(ivaDebit);
    const creditDecimal = new Decimal(ivaCredit);
    return debitDecimal.minus(creditDecimal);
  }

  /**
   * Calcula el impuesto a las ganancias (30.5% sobre ganancia neta)
   */
  static calculateIncomeTax(netIncome: number | string): Decimal {
    const netIncomeDecimal = new Decimal(netIncome);
    const taxRate = new Decimal(0.305);
    return netIncomeDecimal.times(taxRate);
  }

  /**
   * Valida que un monto sea positivo
   */
  static validatePositiveAmount(amount: number | string): { isValid: boolean; error?: string } {
    const decimal = new Decimal(amount);
    if (decimal.lessThan(0)) {
      return {
        isValid: false,
        error: 'El monto no puede ser negativo'
      };
    }
    return { isValid: true };
  }

  /**
   * Valida que un porcentaje esté en el rango válido (0-100)
   */
  static validatePercentage(percentage: number | string): { isValid: boolean; error?: string } {
    const decimal = new Decimal(percentage);
    if (decimal.lessThan(0) || decimal.greaterThan(100)) {
      return {
        isValid: false,
        error: 'El porcentaje debe estar entre 0 y 100'
      };
    }
    return { isValid: true };
  }
}

// Funciones de utilidad para compatibilidad
export function safeParseFloat(value: string | number): Decimal {
  if (typeof value === 'number') {
    return new Decimal(value);
  }
  
  // Limpiar formato argentino (puntos como separadores de miles, comas como decimales)
  const cleanValue = value
    .replace(/\./g, '') // Remover puntos (separadores de miles)
    .replace(',', '.'); // Convertir comas a puntos decimales
  
  const parsed = parseFloat(cleanValue);
  if (isNaN(parsed)) {
    throw new Error(`Valor no numérico: ${value}`);
  }
  
  return new Decimal(parsed);
}

export function formatArgentineCurrency(amount: number | string | Decimal): string {
  const decimal = amount instanceof Decimal ? amount : new Decimal(amount);
  const formatted = decimal.toFixed(2);
  const parts = formatted.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
}

export function parseArgentineCurrency(value: string): Decimal {
  // Remover símbolo de peso y espacios
  const cleanValue = value.replace(/[\$\s]/g, '');
  
  // Separar parte entera y decimal
  const parts = cleanValue.split(',');
  
  if (parts.length === 2) {
    // Formato: 1.234.567,89
    const integerPart = parts[0].replace(/\./g, '');
    const decimalPart = parts[1];
    return new Decimal(`${integerPart}.${decimalPart}`);
  } else {
    // Formato: 1234567 (sin decimales)
    return new Decimal(cleanValue.replace(/\./g, ''));
  }
}

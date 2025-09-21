import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserSession } from "@shared/schema";

type UserConfigFields = Pick<UserSession, 'decimalSeparator' | 'thousandSeparator' | 'decimalPlaces' | 'currencySymbol' | 'currencyPosition' | 'roundingMode'>;

// Helper to extract user currency configuration with defaults
export function getUserCurrencyConfig(user?: UserConfigFields | null): Required<UserConfigFields> {
  return {
    decimalSeparator: user?.decimalSeparator || ',',
    thousandSeparator: user?.thousandSeparator || '.',
    decimalPlaces: user?.decimalPlaces ?? 2,
    currencySymbol: user?.currencySymbol || '$',
    currencyPosition: user?.currencyPosition || 'before',
    roundingMode: user?.roundingMode || 'round'
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// User configuration-aware currency formatting
export function formatCurrencyWithConfig(
  amount: string | number, 
  userConfig?: Pick<UserSession, 'decimalSeparator' | 'thousandSeparator' | 'decimalPlaces' | 'currencySymbol' | 'currencyPosition' | 'roundingMode'>
): string {
  let numAmount = typeof amount === 'string' ? 
    parseFloat(parseDecimalWithConfig(amount, userConfig)) : amount;
  
  if (isNaN(numAmount)) {
    numAmount = 0;
  }

  // Apply rounding mode
  const roundingMode = userConfig?.roundingMode || 'round';
  const decimalPlaces = userConfig?.decimalPlaces ?? 2;
  const factor = Math.pow(10, decimalPlaces);
  
  switch (roundingMode) {
    case 'ceil':
      numAmount = Math.ceil(numAmount * factor) / factor;
      break;
    case 'floor':
      numAmount = Math.floor(numAmount * factor) / factor;
      break;
    default: // 'round'
      numAmount = Math.round(numAmount * factor) / factor;
      break;
  }

  // Format number with separators
  const decimalSeparator = userConfig?.decimalSeparator || ',';
  const thousandSeparator = userConfig?.thousandSeparator || '.';
  
  let formattedNumber = numAmount.toFixed(decimalPlaces);
  
  // Split integer and decimal parts
  const [integerPart, decimalPart] = formattedNumber.split('.');
  
  // Add thousand separators if not 'none'
  let formattedInteger = integerPart;
  if (thousandSeparator !== 'none' && integerPart.length > 3) {
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  }
  
  // Combine with user's decimal separator
  let result = formattedInteger;
  if (decimalPlaces > 0 && decimalPart) {
    result += decimalSeparator + decimalPart;
  }
  
  // Add currency symbol
  const currencySymbol = userConfig?.currencySymbol || '$';
  const currencyPosition = userConfig?.currencyPosition || 'before';
  
  if (currencyPosition === 'before') {
    return `${currencySymbol}${result}`;
  } else {
    return `${result} ${currencySymbol}`;
  }
}

// Legacy functions - now use default Argentine format for backward compatibility
export function formatCurrency(amount: string | number): string {
  return formatCurrencyWithConfig(amount, {
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencySymbol: '$',
    currencyPosition: 'before',
    roundingMode: 'round'
  });
}

export function formatCurrencyWithDecimals(amount: string | number): string {
  return formatCurrencyWithConfig(amount, {
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencySymbol: '$',
    currencyPosition: 'before',
    roundingMode: 'round'
  });
}

export function formatDate(date: Date | string | null | undefined): string {
  // Handle null, undefined, or empty dates - Fixed to prevent crashes
  if (date === null || date === undefined || date === '') {
    return 'Sin fecha';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Check for invalid date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Sin fecha';
    }
    return dateObj.toLocaleDateString('es-AR');
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Sin fecha';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  // Handle null, undefined, or empty dates - Fixed to prevent crashes
  if (date === null || date === undefined || date === '') {
    return 'Sin fecha';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Check for invalid date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Sin fecha';
    }
    return dateObj.toLocaleString('es-AR');
  } catch (error) {
    console.warn('Error formatting datetime:', date, error);
    return 'Sin fecha';
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function parseDecimal(value: string, userConfig?: Pick<UserSession, 'decimalPlaces'>): string {
  const decimalPlaces = userConfig?.decimalPlaces ?? 2;
  return parseFloat(value.replace(/[^\d.-]/g, '')).toFixed(decimalPlaces);
}

// Enhanced parsing that respects user's decimal separator
export function parseDecimalWithConfig(
  value: string, 
  userConfig?: Pick<UserSession, 'decimalSeparator' | 'thousandSeparator' | 'decimalPlaces'>
): string {
  const decimalSeparator = userConfig?.decimalSeparator || ',';
  const thousandSeparator = userConfig?.thousandSeparator || '.';
  const decimalPlaces = userConfig?.decimalPlaces ?? 2;
  
  // First, remove currency symbols and extra whitespace
  let cleanValue = value.replace(/[$€£¥₹₽\s]/g, '');
  
  // Handle different separator patterns
  if (decimalSeparator === ',' && thousandSeparator === '.') {
    // Argentine format: 1.234.567,89
    // Replace all dots except the last comma-separated decimal part
    const parts = cleanValue.split(',');
    if (parts.length === 2) {
      // Has decimal part with comma
      cleanValue = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      // No comma found - could be standard decimal format (75250.00) or thousands format (75.250)
      const lastDotIndex = cleanValue.lastIndexOf('.');
      if (lastDotIndex > -1) {
        const afterLastDot = cleanValue.substring(lastDotIndex + 1);
        // If 1-2 digits after last dot, treat as decimal. Otherwise, treat as thousands.
        if (afterLastDot.length <= 2 && afterLastDot.length > 0) {
          // Standard decimal format like "75250.00" - keep as is
          // Don't remove any dots
        } else {
          // Thousands format like "75.250" or multiple dots - remove all dots
          cleanValue = cleanValue.replace(/\./g, '');
        }
      }
    }
  } else if (decimalSeparator === '.' && thousandSeparator === ',') {
    // US format: 1,234,567.89
    // Remove commas (thousands) and keep dots (decimals)
    cleanValue = cleanValue.replace(/,/g, '');
  } else if (thousandSeparator === ' ') {
    // Space as thousand separator: 1 234 567,89 or 1 234 567.89
    cleanValue = cleanValue.replace(/\s/g, '');
    if (decimalSeparator === ',') {
      cleanValue = cleanValue.replace(',', '.');
    }
  }
  
  // Parse as float and format with desired decimal places
  const numValue = parseFloat(cleanValue.replace(/[^\d.-]/g, ''));
  return isNaN(numValue) ? (0).toFixed(decimalPlaces) : numValue.toFixed(decimalPlaces);
}

export function validateCUIT(cuit: string): boolean {
  if (!cuit || cuit.length !== 13) return false;
  
  const cleanCuit = cuit.replace(/[^\d]/g, '');
  if (cleanCuit.length !== 11) return false;
  
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCuit[i]) * factors[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return checkDigit === parseInt(cleanCuit[10]);
}

export function formatCUIT(cuit: string): string {
  // Remove any existing formatting
  const cleanCuit = cuit.replace(/[^\d]/g, '');
  
  // Check if it's a valid 11-digit CUIT
  if (cleanCuit.length !== 11) {
    return cuit; // Return original if not valid length
  }
  
  // Format as XX-XXXXXXXX-X
  return `${cleanCuit.substring(0, 2)}-${cleanCuit.substring(2, 10)}-${cleanCuit.substring(10)}`;
}

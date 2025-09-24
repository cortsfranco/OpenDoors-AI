import { z } from 'zod';

// Esquemas de validación para autenticación
export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email es requerido')
    .max(255, 'Email muy largo')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña muy larga')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Contraseña debe contener al menos una minúscula, una mayúscula y un número')
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Usuario debe tener al menos 3 caracteres')
    .max(50, 'Usuario muy largo')
    .regex(/^[a-zA-Z0-9_]+$/, 'Usuario solo puede contener letras, números y guiones bajos'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muy largo')
    .toLowerCase(),
  displayName: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre muy largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Nombre solo puede contener letras y espacios'),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña muy larga')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial')
});

// Esquemas de validación para facturas
export const invoiceSchema = z.object({
  type: z.enum(['income', 'expense']),
  invoiceClass: z.enum(['A', 'B', 'C']),
  invoiceNumber: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  date: z.date(),
  clientProviderName: z.string()
    .min(1, 'Cliente/Proveedor es requerido')
    .max(255, 'Nombre muy largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-_&]+$/, 'Nombre contiene caracteres inválidos'),
  subtotal: z.number()
    .min(0, 'Subtotal no puede ser negativo')
    .max(999999999.99, 'Subtotal muy alto'),
  ivaAmount: z.number()
    .min(0, 'IVA no puede ser negativo')
    .max(999999999.99, 'IVA muy alto'),
  totalAmount: z.number()
    .min(0, 'Total no puede ser negativo')
    .max(999999999.99, 'Total muy alto')
});

// Esquemas de validación para archivos
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Nombre de archivo es requerido')
    .max(255, 'Nombre de archivo muy largo')
    .regex(/^[a-zA-Z0-9\-_\s]+\.(pdf|jpg|jpeg|png)$/i, 'Formato de archivo inválido'),
  mimetype: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  size: z.number()
    .min(1, 'Archivo vacío')
    .max(10485760, 'Archivo muy grande (máximo 10MB)')
});

// Función para sanitizar entrada de texto
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres HTML básicos
    .substring(0, 1000); // Limitar longitud
}

// Función para validar CUIT
export function validateCUIT(cuit: string): boolean {
  const cuitRegex = /^[0-9]{2}-[0-9]{8}-[0-9]{1}$/;
  return cuitRegex.test(cuit);
}

// Función para validar monto monetario
export function validateMonetaryAmount(amount: number): boolean {
  return amount >= 0 && amount <= 999999999.99 && Number.isFinite(amount);
}

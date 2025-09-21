#!/usr/bin/env node

/**
 * Script para probar la conexión a la base de datos Neon
 */

import "dotenv/config";
import { db, isDatabaseAvailable } from './server/db.ts';

console.log('🔍 Verificando configuración de base de datos...');
console.log('');

// Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ No configurada');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || '5000');
console.log('');

// Verificar disponibilidad de la base de datos
if (!isDatabaseAvailable()) {
  console.log('❌ DATABASE_URL no está configurada.');
  console.log('');
  console.log('📝 Crea un archivo .env en la raíz del proyecto con:');
  console.log('DATABASE_URL=postgresql://neondb_owner:npg_87oynmKwWYkR@ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');
  console.log('PORT=5000');
  console.log('NODE_ENV=development');
  process.exit(1);
}

// Probar conexión
console.log('🔌 Probando conexión a la base de datos...');
try {
  if (db) {
    // Hacer una consulta simple para probar la conexión
    const result = await db.execute('SELECT NOW() as current_time');
    console.log('✅ Conexión exitosa a Neon PostgreSQL');
    console.log('🕐 Hora del servidor:', result.rows[0].current_time);
  } else {
    console.log('❌ No se pudo crear la conexión a la base de datos');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error conectando a la base de datos:');
  console.log(error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 ¡Base de datos configurada correctamente!');
console.log('');
console.log('📝 Próximos pasos:');
console.log('1. npm run db:push (aplicar migraciones)');
console.log('2. npm run dev (iniciar servidor)');

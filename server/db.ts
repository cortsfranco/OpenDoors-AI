import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Configuración para PostgreSQL local (Docker)
const createPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: false // Para PostgreSQL local
    });
  }
  
  // Fallback para variables individuales
  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5433'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'docker',
    database: process.env.PGDATABASE || 'mfn_db',
    ssl: false
  });
};

// Allow graceful fallback for development without database
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  console.warn(
    "⚠️ DATABASE_URL o variables PGHOST no configuradas. Usando modo fallback."
  );
}

// Crear pool y db
export const pool = createPool();
export const db = drizzle(pool, { schema });

// Helper to check if database is available
export const isDatabaseAvailable = () => !!(process.env.DATABASE_URL || process.env.PGHOST);

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a la base de datos exitosa:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    return false;
  }
};
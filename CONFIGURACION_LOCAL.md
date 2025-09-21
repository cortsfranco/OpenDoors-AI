# 🚀 Configuración para desarrollo local con Neon

## 📁 Crear archivo .env

Crea un archivo llamado `.env` en la raíz del proyecto con este contenido:

```env
# Configuración de base de datos Neon
DATABASE_URL=postgresql://neondb_owner:npg_87oynmKwWYkR@ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Variables individuales (opcional, para Drizzle)
PGHOST=ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_87oynmKwWYkR
PGDATABASE=neondb

# Configuración del servidor
PORT=5000
NODE_ENV=development

# OpenAI (opcional - para funcionalidades de IA)
# OPENAI_API_KEY=tu_api_key_aqui
```

## ✅ Configuración completada

He actualizado la configuración para desarrollo local:

### 📋 Cambios realizados:

1. **drizzle.config.ts**: Actualizado para usar `DATABASE_URL`
2. **test-db.js**: Script mejorado para probar la conexión
3. **package.json**: Comandos organizados para desarrollo local

## 🚀 Comandos disponibles:

```bash
# Probar conexión a la base de datos
npm run test:db

# Aplicar migraciones
npm run db:push

# Ver base de datos (interfaz visual)
npm run db:studio

# Configurar todo de una vez
npm run setup

# Iniciar servidor de desarrollo
npm run dev
```

## 📝 Pasos para empezar:

### 1. Crear archivo .env
Crea un archivo `.env` en la raíz del proyecto con:

```env
DATABASE_URL=postgresql://neondb_owner:npg_87oynmKwWYkR@ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=5000
NODE_ENV=development
```

### 2. Instalar dependencias (si no lo has hecho)
```bash
npm install
```

### 3. Configurar base de datos
```bash
npm run setup
```

### 4. Iniciar servidor
```bash
npm run dev
```

## 🌐 Acceso:

Una vez que el servidor esté corriendo:
- **Frontend**: http://localhost:5000
- **Base de datos**: http://localhost:4983 (con `npm run db:studio`)

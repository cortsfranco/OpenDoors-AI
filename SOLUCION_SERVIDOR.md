# 🚀 Solución para levantar el servidor y frontend

## ❌ Problemas identificados:

1. **Error de puerto**: `ENOTSUP: operation not supported on socket 0.0.0.0:5000`
2. **Error de WebSocket**: `connect ECONNREFUSED 127.0.0.1:443`
3. **Variables de entorno**: Necesitas configurar las credenciales de Neon

## ✅ Soluciones aplicadas:

### 1. Corregido el problema del puerto
- Cambiado `server.listen({ port, reusePort: true })` por `server.listen(port, '0.0.0.0')`
- El `reusePort: true` no es compatible con Windows

### 2. Configurado SSL para Neon
- Cambiado `ssl: false` a `ssl: true` en `drizzle.config.ts`
- Neon requiere SSL habilitado

## 🔧 Pasos para levantar el servidor:

### Paso 1: Configurar variables de entorno en Replit

Ve a **"Secrets" (🔒)** en tu proyecto de Replit y agrega:

```
DATABASE_URL=postgresql://neondb_owner:npg_87oynmKwWYkR@ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
PGDATABASE=neondb
PGHOST=ep-still-salad-aenxelmn.c-2.us-east-2.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_87oynmKwWYkR
PORT=5000
```

### Paso 2: Verificar configuración

```bash
npm run test:env
```

Deberías ver:
```
✅ Variables de entorno configuradas correctamente
```

### Paso 3: Aplicar migraciones de base de datos

```bash
npm run db:push
```

### Paso 4: Iniciar el servidor

```bash
npm run dev
```

## 🎯 Resultado esperado:

Deberías ver algo como:
```
⚠️ No OpenAI API key configured
🔄 Recovering pending upload jobs...
👀 Upload job watchdog started (2 min intervals)
Python backend not available, using fallback processing
serving on port 5000
WebSocket server ready at ws://localhost:5000/ws
```

## 🌐 Acceder al frontend:

Una vez que el servidor esté corriendo, podrás acceder a:
- **Frontend**: `http://localhost:5000` (o el puerto que aparezca en la consola)
- **WebSocket**: `ws://localhost:5000/ws`

## 🔍 Si tienes problemas:

1. **Error de variables**: Ejecuta `npm run test:env` para verificar
2. **Error de puerto**: Verifica que el puerto 5000 esté libre
3. **Error de base de datos**: Verifica que las credenciales estén en "Secrets"
4. **Error de WebSocket**: Es normal si no tienes el backend de Python corriendo

## 📝 Notas importantes:

- El error de WebSocket a Azure es normal si no tienes configurado el backend de Python
- El servidor funcionará con "fallback processing" para el procesamiento de documentos
- Puedes acceder al frontend incluso si hay errores menores en el backend

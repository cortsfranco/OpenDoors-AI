# Integración con Backend Python AI

Este proyecto integra el backend Python del usuario con Azure AI para procesamiento inteligente de facturas y chat financiero.

## Arquitectura de Integración

```
Frontend React (Puerto 5000)
       ↓
Express.js Server (Puerto 5000)
       ↓
Python AI Backend (Puerto 8000)
       ↓
Azure OpenAI + Azure Services
```

## Componentes Principales

### 1. Proxy Python (`server/python-proxy.ts`)
- Maneja la comunicación entre Express.js y el backend Python
- Sistema de fallback automático si Python backend no está disponible
- Health checks automáticos

### 2. Backend Python (`python_backend/`)
- Sistema RAG con Azure OpenAI
- Procesamiento inteligente de facturas con Document Intelligence
- Chat financiero avanzado con LangChain

### 3. Integración en Rutas Express
- `/api/invoices` (POST) - Procesamiento de facturas con IA
- `/api/chat` (POST) - Chat inteligente financiero

## Configuración y Uso

### Paso 1: Configurar Backend Python

```bash
# Navegar al directorio del backend Python
cd python_backend

# Ejecutar script de inicialización
python start.py
```

Este script:
- Verifica Python 3.8+
- Instala dependencias automáticamente
- Crea archivo .env desde template
- Inicia servidor en puerto 8000

### Paso 2: Configurar Variables de Azure

Editar `python_backend/.env` con tus credenciales de Azure:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_API_KEY=tu-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=tu-deployment

# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://tu-servicio-search.search.windows.net
AZURE_SEARCH_API_KEY=tu-search-key
AZURE_SEARCH_INDEX_NAME=tu-indice

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://tu-recurso.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=tu-key

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=tu-connection-string
AZURE_STORAGE_CONTAINER_NAME=documents
```

### Paso 3: Verificar Integración

1. **Frontend funcionando**: Puerto 5000
2. **Backend Python funcionando**: Puerto 8000
3. **Health check**: El log debe mostrar "Python backend health check: OK"

## Funcionalidades Integradas

### Procesamiento Inteligente de Facturas
- OCR automático con Azure Document Intelligence
- Extracción de datos estructurados
- Fallback a procesamiento básico si Azure no está disponible

### Chat Financiero Avanzado
- Consultas en lenguaje natural sobre datos financieros
- Análisis con Azure OpenAI
- Contexto de facturas usando RAG

## Flujo de Fallback

Si el backend Python no está disponible:

1. **Facturas**: Procesamiento básico sin IA
2. **Chat**: Respuestas informativas sobre estado del sistema
3. **Logs**: Información clara sobre estado de conexión

## Monitoreo y Logs

### Backend Express.js
```
Python backend health check: OK/FAILED
Python chat error: [error details]
```

### Backend Python
```
📄 Recibiendo archivo: factura.pdf
💬 Nueva pregunta para el agente: [pregunta]
```

## Solución de Problemas

### Error: "Python backend not available"
1. Verificar que Python backend esté ejecutándose en puerto 8000
2. Revisar logs del backend Python
3. Verificar configuración de .env

### Error de Azure Services
1. Verificar credenciales en .env
2. Confirmar que servicios de Azure estén activos
3. Revisar límites de cuota de API

### Dependencias Python
```bash
cd python_backend
pip install -r requirements.txt
```

## Testing

El sistema está diseñado para funcionar con o sin el backend Python:

- **Con Python**: IA completa + fallback
- **Sin Python**: Funcionalidad básica + mensajes informativos

## Próximos Pasos

1. **Optimización**: Cache de respuestas IA
2. **Monitoring**: Dashboard de estado de servicios
3. **Configuración**: Panel de admin para Azure settings
4. **Escalabilidad**: Load balancing para múltiples instancias Python
# Centro de Control Financiero - Documento de Arquitectura Técnica

## Para: Hernán y Joni - Open Doors Engineering Services
## Fecha: 19 de Septiembre de 2025

---

## 1. Resumen Ejecutivo

Este documento detalla la arquitectura técnica del Centro de Control Financiero desarrollado para Open Doors. El sistema es una aplicación web full-stack moderna construida con tecnologías de última generación, integrando inteligencia artificial de Azure para el procesamiento automatizado de facturas.

## 2. Arquitectura General del Sistema

### 2.1 Stack Tecnológico

#### Backend
- **Framework Principal**: Express.js con TypeScript
- **Base de Datos**: PostgreSQL (hospedado en Neon)
- **ORM**: Drizzle ORM con esquemas type-safe
- **IA/ML**: Azure OpenAI y Azure Document Intelligence
- **Autenticación**: Passport.js con sesiones PostgreSQL
- **WebSockets**: ws library para notificaciones en tiempo real

#### Frontend
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite para desarrollo rápido con HMR
- **UI Components**: shadcn/ui basado en Radix UI
- **Styling**: Tailwind CSS con temas personalizados
- **State Management**: TanStack Query v5
- **Routing**: Wouter (lightweight router)
- **Forms**: react-hook-form con validación Zod

### 2.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   Cliente (Browser)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │            React SPA + TanStack Query            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬────────────────┬──────────────────────┘
                  │                │
                  │ HTTPS          │ WSS
                  ↓                ↓
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│  ┌──────────────────┐  ┌─────────────────────────┐     │
│  │   API Routes     │  │    WebSocket Server     │     │
│  │   (REST)         │  │    (Real-time)          │     │
│  └──────────────────┘  └─────────────────────────┘     │
│           │                         │                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Storage Interface Layer               │  │
│  │         (server/storage.ts - 2800+ LOC)         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬────────────────┬──────────────────────┘
                  │                │
                  ↓                ↓
    ┌──────────────────┐  ┌─────────────────────┐
    │   PostgreSQL     │  │   Azure Services    │
    │   (Neon)         │  │   - OpenAI          │
    │                  │  │   - Doc Intelligence│
    └──────────────────┘  └─────────────────────┘
```

## 3. Arquitectura del Backend

### 3.1 Estructura de Directorios
```
server/
├── index.ts            # Entry point, configuración del servidor
├── routes.ts           # Definición de endpoints API (1695 LOC)
├── storage.ts          # Capa de abstracción de datos
├── azure-ai-processor.ts # Integración con Azure AI
├── python-proxy.ts     # Proxy para procesamiento Python
├── vite.ts            # Configuración de Vite para desarrollo
└── websocket.ts       # Servidor WebSocket para eventos RT
```

### 3.2 Capa de Storage (Abstracción de Datos)

La interfaz `IStorage` implementa más de 60 métodos para operaciones CRUD:

```typescript
interface IStorage {
  // Gestión de Usuarios
  createUser(userData: InsertUser): Promise<User>
  getUserByEmail(email: string): Promise<User | null>
  
  // Gestión de Facturas
  createInvoice(data: InsertInvoice): Promise<Invoice>
  getInvoices(filters: FilterOptions): Promise<InvoicesResponse>
  updateInvoice(id: string, data: UpdateInvoice): Promise<Invoice>
  
  // Operaciones Masivas
  bulkDeleteInvoices(ids: string[]): Promise<void>
  bulkUpdatePaymentStatus(ids: string[], status: PaymentStatus): Promise<void>
  
  // Análisis y Reportes
  getIVABreakdownByClass(filters: FiscalPeriod): Promise<IVABreakdown[]>
  getClientProviderStats(): Promise<Statistics>
  // ... 50+ métodos adicionales
}
```

### 3.3 Procesamiento de Facturas con IA

#### Pipeline de Procesamiento:
1. **Upload**: Multer maneja archivos hasta 10MB
2. **Almacenamiento**: Directorio `/uploads` con nombres únicos
3. **Extracción Azure**:
   - Document Intelligence extrae texto de PDFs/imágenes
   - OpenAI GPT-4 con modelos custom entrenados:
     - `opendoors-emitidas-custom` para facturas emitidas
     - `opendoors-recibidas-custom` para facturas recibidas
4. **Estructuración**: Parser convierte respuesta IA a esquema tipado
5. **Persistencia**: Almacenamiento en PostgreSQL con relaciones

### 3.4 API REST Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Inicio de sesión | No |
| GET | `/api/invoices` | Listar facturas con filtros | Sí |
| POST | `/api/invoices/upload` | Procesar nueva factura | Sí |
| PATCH | `/api/invoices/:id` | Actualizar factura | Sí (Editor) |
| DELETE | `/api/invoices/:id` | Eliminar factura | Sí (Admin) |
| POST | `/api/invoices/bulk-delete` | Eliminar múltiples | Sí (Admin) |
| GET | `/api/export/csv` | Exportar a CSV | Sí |
| POST | `/api/import/excel` | Importar desde Excel | Sí (Admin) |

### 3.5 Seguridad Implementada

- **Autenticación**: Sesiones con express-session + connect-pg-simple
- **Autorización**: Middleware requireAuth y requireRole
- **Hashing**: bcrypt para contraseñas
- **Validación**: Zod schemas en todos los endpoints
- **CORS**: Configurado para desarrollo/producción
- **Variables de Entorno**: Secretos en .env (no en código)
- **Sanitización**: Filtros MIME para uploads

## 4. Arquitectura del Frontend

### 4.1 Estructura de Componentes

```
client/src/
├── pages/              # Páginas principales de la aplicación
│   ├── Dashboard.tsx   # Vista principal con KPIs
│   ├── Upload.tsx      # Carga concurrente de facturas
│   ├── Invoices.tsx    # Gestión de facturas
│   └── Reports.tsx     # Reportes y análisis
├── components/         # Componentes reutilizables
│   ├── Tables/         # Tablas con sorting/filtering
│   ├── Upload/         # Componentes de carga
│   └── ui/            # shadcn/ui components
├── hooks/             # Custom React hooks
└── lib/              # Utilidades y configuración
```

### 4.2 Gestión de Estado y Caché

```typescript
// TanStack Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      gcTime: 5 * 60 * 1000, // 5 minutos
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Invalidación selectiva de caché
queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
```

### 4.3 Flujo de Datos

1. **Fetching**: TanStack Query maneja todas las llamadas API
2. **Caching**: Cache automático con invalidación inteligente
3. **Updates**: Mutaciones actualizan cache inmediatamente
4. **Real-time**: WebSocket notifica cambios a todos los clientes

## 5. Base de Datos

### 5.1 Esquema Principal (Drizzle ORM)

```typescript
// Tabla de Facturas
export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  date: timestamp('date'),
  description: text('description'),
  amount: varchar('amount', { length: 50 }),
  iva: varchar('iva', { length: 50 }),
  total: varchar('total', { length: 50 }),
  type: invoiceTypeEnum('type').notNull(),
  invoiceClass: invoiceClassEnum('invoice_class').default('B'),
  clientProviderId: varchar('client_provider_id', { length: 36 }),
  uploadedBy: varchar('uploaded_by', { length: 50 }),
  ownerName: varchar('owner_name', { length: 100 }),
  paymentStatus: paymentStatusEnum('payment_status').default('pending'),
  paymentDate: timestamp('payment_date'),
  filePath: varchar('file_path', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relaciones
export const invoicesRelations = relations(invoices, ({ one }) => ({
  clientProvider: one(clientsProviders, {
    fields: [invoices.clientProviderId],
    references: [clientsProviders.id],
  }),
  user: one(users, {
    fields: [invoices.uploadedBy],
    references: [users.id],
  }),
}));
```

### 5.2 Índices y Optimización

- Índices en: `date`, `type`, `clientProviderId`, `uploadedBy`
- Particionamiento por fecha para reportes
- Vacuum automático configurado
- Connection pooling con límite de 20 conexiones

## 6. Integración con Azure AI

### 6.1 Modelos Personalizados

Los modelos fueron entrenados específicamente con facturas argentinas:

```javascript
// Configuración de modelos
const AZURE_MODELS = {
  income: 'opendoors-emitidas-custom',  // Facturas emitidas
  expense: 'opendoors-recibidas-custom', // Facturas recibidas
};

// Prompt Engineering
const systemPrompt = `
Eres un experto en procesamiento de facturas argentinas.
Debes extraer:
- Tipo de factura (A/B/C)
- CUIT del emisor y receptor
- Fecha de emisión
- Importes con decimales correctos
- Componentes de IVA (10.5%, 21%, 27%)
`;
```

### 6.2 Flujo de Procesamiento

1. **Pre-procesamiento**: Validación de formato y tamaño
2. **OCR**: Azure Document Intelligence extrae texto
3. **Clasificación**: Determina si es ingreso/egreso
4. **Extracción**: GPT-4 extrae campos estructurados
5. **Validación**: Verificación de totales y cálculos
6. **Enriquecimiento**: Auto-creación de clientes/proveedores

## 7. Características Avanzadas

### 7.1 Procesamiento Concurrente
- Hasta 3 archivos procesándose simultáneamente
- Cola de procesamiento con reintentos
- Progreso individual por archivo
- Notificaciones de finalización

### 7.2 Operaciones Masivas
- Selección múltiple con checkboxes
- Eliminación masiva con confirmación
- Actualización de estados de pago
- Exportación selectiva a CSV/Excel

### 7.3 Sistema de Auditoría
```sql
-- Tabla de logs de actividad
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 8. Despliegue y Configuración

### 8.1 Variables de Entorno Requeridas

```bash
# Base de Datos
DATABASE_URL=postgresql://user:pass@host/db

# Azure AI
AZURE_OPENAI_KEY=xxx
AZURE_DOC_INTELLIGENCE_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com

# Sesiones
SESSION_SECRET=xxx

# Storage
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private
```

### 8.2 Scripts de Desarrollo

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build",
    "db:push": "drizzle-kit push:pg",
    "db:generate": "drizzle-kit generate:pg"
  }
}
```

## 9. Monitoreo y Mantenimiento

### 9.1 Logs
- Express logger con timestamps
- Logs de errores en archivos separados
- Auditoría de acciones críticas en DB

### 9.2 Métricas
- Tiempo de respuesta de APIs
- Tasa de éxito de procesamiento IA
- Uso de memoria y CPU
- Conexiones de base de datos activas

## 10. Consideraciones de Seguridad y Mejoras Futuras

### Implementadas ✅
- Autenticación robusta con sesiones
- Autorización basada en roles
- Encriptación de contraseñas
- Validación estricta de entrada
- HTTPS en producción

### Recomendadas para Producción ⚠️
- Rate limiting en endpoints críticos
- Protección CSRF
- Escaneo antivirus para uploads
- WAF (Web Application Firewall)
- Backup automático de base de datos
- Certificados SSL/TLS
- Monitoreo con alertas

## 11. Conclusión

El sistema desarrollado representa una solución enterprise-grade con:
- **Arquitectura escalable** y mantenible
- **Código fuente propio** totalmente personalizable
- **Integración IA** de última generación
- **Stack moderno** con mejores prácticas
- **Seguridad** y auditoría incorporadas

La arquitectura permite escalar horizontal y verticalmente según las necesidades futuras de Open Doors.

---

**Documento preparado por**: Sistema de Desarrollo
**Versión**: 1.0
**Última actualización**: 19 de Septiembre de 2025
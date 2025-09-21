# Análisis de Funcionalidades Faltantes - Sistema OD

## 1. TIPOS DE FACTURA (A, B, C)
**Necesidad:** OD maneja 3 tipos de facturas con propósitos específicos:
- **Factura A**: Para compensación de IVA (entre responsables inscriptos)
- **Factura B**: Para consumidores finales
- **Factura C**: No sirve para IVA pero sí para control de ingresos/egresos

**Implementación propuesta:**
- Agregar campo `invoice_type` enum('A', 'B', 'C') en tabla invoices
- Lógica específica para cada tipo en cálculos de IVA

## 2. PERÍODO FISCAL MAYO-ABRIL
**Necesidad:** El período contable va de mayo a abril del siguiente año, no por año calendario

**Implementación propuesta:**
- Configuración de período fiscal personalizable
- Filtros y reportes ajustados al período fiscal
- Dashboard que muestre "Período 2024-2025" (Mayo 2024 - Abril 2025)

## 3. IMPUESTO A LAS GANANCIAS (30.5%)
**Necesidad:** Cálculo automático del 30.5% sobre la ganancia neta anual

**Implementación propuesta:**
- Nueva sección en reportes: "Cálculo Impuesto Ganancias"
- Fórmula: (Total Ingresos - Total Egresos) * 0.305
- Proyección y provisión mensual

## 4. FACTURAS NEUTRAS PARA COMPENSACIÓN IVA
**Necesidad:** Facturas que no representan movimiento real de dinero, solo para compensar IVA

**Implementación propuesta:**
- Campo `is_neutral` boolean en invoices
- Excluir de cálculos de cash flow pero incluir en IVA
- Indicador visual especial en la tabla

## 5. MOVIMIENTOS DE CUENTA Y CONCILIACIÓN
**Necesidad:** Tracking de movimientos bancarios y su relación con facturas

**Implementación propuesta:**
- Nueva tabla `account_movements`
- Vincular facturas con movimientos bancarios
- Estado de pago: pendiente/pagado/parcial
- Conciliación bancaria

## 6. SEPARACIÓN CLARA VENTAS vs COMPRAS
**Necesidad:** Vista separada tipo Excel con sección superior para ventas y inferior para compras

**Implementación propuesta:**
- Nueva vista en Reportes: "Balance Ventas/Compras"
- Tabla dual con totalizadores separados
- Exportación a Excel manteniendo el formato

## 7. ANÁLISIS POR PERÍODO PERSONALIZADO
**Necesidad:** Análisis mensual dentro del período fiscal con acumulados

**Implementación propuesta:**
- Selector de período: mensual/trimestral/anual
- Comparativas período anterior
- Gráficos de tendencia por período fiscal

## 8. GESTIÓN DE COMPONENTES DE IVA
**Necesidad:** Carpeta específica para componentes del pago de IVA gradual

**Implementación propuesta:**
- Módulo "Gestión IVA" con:
  - Cálculo de posición IVA mensual
  - Débito fiscal vs Crédito fiscal
  - Saldo a favor/pagar
  - Historial de pagos de IVA

## 9. INTEGRACIÓN CON SISTEMA ACTUAL DE OD
**Necesidad:** Mantener compatibilidad con sus Excel actuales

**Implementación propuesta:**
- Importador de Excel con mapeo de columnas
- Exportador que mantenga su formato actual
- Migración gradual de datos históricos

## PRIORIDAD DE IMPLEMENTACIÓN:
1. **Alta**: Tipos de factura A/B/C
2. **Alta**: Período fiscal mayo-abril  
3. **Alta**: Impuesto a las ganancias
4. **Media**: Facturas neutras IVA
5. **Media**: Separación ventas/compras
6. **Baja**: Movimientos de cuenta
7. **Baja**: Componentes IVA gradual

## TECNOLOGÍAS A MANTENER:
- LangGraph/LangChain para procesamiento inteligente
- Azure AI para extracción de facturas
- PostgreSQL + Drizzle ORM
- React + TypeScript frontend
- Sistema de agentes actual
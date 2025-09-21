import { ImportWizard } from "@/components/ImportWizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Shield, RefreshCw } from "lucide-react";

export default function ImportPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Importación de Datos</h1>
        <p className="text-gray-600">
          Sistema avanzado de importación de datos con vista previa, manejo de conflictos y respaldos automáticos
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Vista Previa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Analiza el archivo antes de importar para detectar errores y conflictos
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              Deduplicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Detecta automáticamente duplicados y permite configurar cómo manejarlos
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Respaldos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Crea respaldos automáticos antes de importar para poder deshacer cambios
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-orange-600" />
              Formato Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Compatible con archivos .xlsx y .xls con mapeo automático de columnas
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Import Wizard */}
      <ImportWizard />

      {/* Instructions */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Formato del Archivo Excel</CardTitle>
            <CardDescription>
              Asegúrate de que tu archivo Excel tenga las siguientes columnas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Columnas Requeridas:</h4>
                <ul className="space-y-1 text-sm">
                  <li><strong>Fecha:</strong> Fecha de la factura (DD/MM/YYYY)</li>
                  <li><strong>Tipo:</strong> "Ingreso" o "Gasto"</li>
                  <li><strong>Cliente/Proveedor:</strong> Nombre del cliente o proveedor</li>
                  <li><strong>Total:</strong> Monto total de la factura</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Columnas Opcionales:</h4>
                <ul className="space-y-1 text-sm">
                  <li><strong>CUIT:</strong> CUIT del cliente/proveedor</li>
                  <li><strong>Número:</strong> Número de factura</li>
                  <li><strong>Subtotal:</strong> Subtotal sin IVA</li>
                  <li><strong>IVA:</strong> Monto de IVA</li>
                  <li><strong>Clase:</strong> Tipo de factura (A, B, C)</li>
                  <li><strong>Estado:</strong> Estado de pago</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
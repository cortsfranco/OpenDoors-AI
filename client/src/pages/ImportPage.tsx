import { ImportWizard } from "@/components/ImportWizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Shield, RefreshCw } from "lucide-react";

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
            Centro de Control Financiero
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Gestión integral de facturas e IVA
          </p>
        </div>

        {/* Main Content Grid - Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Feature Cards */}
          <div className="xl:col-span-1">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Importación de Datos
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sistema avanzado de importación de datos con vista previa, manejo de conflictos y respaldos automáticos
              </p>
            </div>

            {/* Feature Overview - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4 mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Vista Previa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm">
                    Analiza el archivo antes de importar para detectar errores y conflictos
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    Deduplicación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm">
                    Detecta automáticamente duplicados y permite configurar cómo manejarlos
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    Respaldos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm">
                    Crea respaldos automáticos antes de importar para poder deshacer cambios
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    Formato Excel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm">
                    Compatible con archivos .xlsx y .xls con mapeo automático de columnas
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Instructions Card - Movido aquí para mejor uso del espacio */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base text-blue-700 dark:text-blue-400">
                  Formato del Archivo Excel
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Asegúrate de que tu archivo Excel tenga las siguientes columnas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                      Columnas Requeridas:
                    </h4>
                    <ul className="space-y-1 text-xs sm:text-sm text-blue-700 dark:text-blue-400">
                      <li><strong>Fecha:</strong> Fecha de la factura (DD/MM/YYYY)</li>
                      <li><strong>Tipo:</strong> "Ingreso" o "Gasto"</li>
                      <li><strong>Cliente/Proveedor:</strong> Nombre del cliente o proveedor</li>
                      <li><strong>Total:</strong> Monto total de la factura</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                      Columnas Opcionales:
                    </h4>
                    <ul className="space-y-1 text-xs sm:text-sm text-blue-700 dark:text-blue-400">
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

          {/* Right Column - Import Wizard */}
          <div className="xl:col-span-2">
            <ImportWizard />
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Settings, 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Calculator, 
  Shield, 
  Activity,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Copy,
  FileDown
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminPanel() {
  const { toast } = useToast();
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [selectedExportFields, setSelectedExportFields] = useState({
    date: true,
    invoiceNumber: true,
    type: true,
    invoiceClass: true,
    clientProvider: true,
    cuit: true,
    subtotal: true,
    ivaAmount: true,
    totalAmount: true,
    paymentStatus: true,
    paymentDate: false,
    ownerName: true,
    createdAt: false,
    filePath: false
  });
  const [backupToRestore, setBackupToRestore] = useState('');
  const [googleSheetsId, setGoogleSheetsId] = useState('');

  // Queries
  const { data: systemMetrics } = useQuery({
    queryKey: ['/api/admin/metrics'],
    enabled: true,
  });

  const { data: aiStats } = useQuery({
    queryKey: ['/api/ai-review/stats'],
    enabled: true,
  });

  const { data: reviewQueue } = useQuery({
    queryKey: ['/api/ai-review/queue'],
    enabled: true,
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/backup', { 
        method: 'POST',
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Backup creado exitosamente",
        description: `Archivo: ${data.backup?.filename} (${Math.round((data.backup?.fileSize || 0) / 1024)} KB)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al crear el backup",
        variant: "destructive"
      });
    }
  });

  const resetTestDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/reset-test-data', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: resetConfirmText }),
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Datos eliminados exitosamente",
        description: `Eliminados: ${data.result?.deletedInvoices || 0} facturas, ${data.result?.deletedClients || 0} clientes`,
      });
      setResetConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar datos de prueba",
        variant: "destructive"
      });
    }
  });

  const exportGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/google-sheets', {
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Download JSON file for manual import to Google Sheets
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_google_sheets_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Datos exportados para Google Sheets",
        description: `${data.totalRecords || 0} registros preparados para importar`,
      });
    }
  });

  const syncGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: googleSheetsId }),
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Copy formatted data to clipboard for easy pasting
      const csvContent = data.sheetsFormat?.values?.map((row: any[]) => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n') || '';
      
      navigator.clipboard.writeText(csvContent).then(() => {
        toast({
          title: "Datos copiados al portapapeles",
          description: "Pega los datos en tu Google Sheet",
        });
      });
    }
  });

  const exportCustomMutation = useMutation({
    mutationFn: async () => {
      const fields = Object.entries(selectedExportFields)
        .filter(([_, selected]) => selected)
        .map(([field, _]) => field);
      
      const response = await fetch('/api/export/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, format: 'csv' }),
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Create and download CSV file
      const blob = new Blob([data.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_personalizado_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Exportación personalizada completada",
        description: `${data.totalRecords || 0} registros exportados`,
      });
    }
  });

  const fieldLabels = {
    date: "Fecha",
    invoiceNumber: "Número de Factura",
    type: "Tipo (Ingreso/Egreso)",
    invoiceClass: "Clase (A/B/C)",
    clientProvider: "Cliente/Proveedor",
    cuit: "CUIT",
    subtotal: "Subtotal",
    ivaAmount: "IVA",
    totalAmount: "Total",
    paymentStatus: "Estado de Pago",
    paymentDate: "Fecha de Pago",
    ownerName: "Propietario",
    createdAt: "Fecha de Creación",
    filePath: "Ruta del Archivo"
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-panel">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestión avanzada del sistema financiero</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administrador
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-2">
          <TabsTrigger value="overview" data-testid="tab-overview" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Resumen">
            <Activity className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="backups" data-testid="tab-backups" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Backups">
            <Database className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Backups</span>
          </TabsTrigger>
          <TabsTrigger value="exports" data-testid="tab-exports" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Exportaciones">
            <FileSpreadsheet className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Exportaciones</span>
          </TabsTrigger>
          <TabsTrigger value="calculations" data-testid="tab-calculations" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Cálculos">
            <Calculator className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Cálculos</span>
          </TabsTrigger>
          <TabsTrigger value="ai-review" data-testid="tab-ai-review" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Revisión AI">
            <CheckCircle className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Revisión</span>
          </TabsTrigger>
          <TabsTrigger value="data-management" data-testid="tab-data-management" className="flex flex-col items-center justify-center p-2 sm:flex-row sm:p-3 text-xs sm:text-sm" aria-label="Gestión">
            <Settings className="h-4 w-4 sm:h-4 sm:w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Gestión</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-users">
                  {(systemMetrics as any)?.totalUsers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-invoices">
                  {(systemMetrics as any)?.totalInvoices || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precisión AI</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-ai-accuracy">
                  {(aiStats as any)?.accuracyRate || 95}%
                </div>
                <Progress value={(aiStats as any)?.accuracyRate || 95} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {(reviewQueue as any)?.totalPending > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Hay {(reviewQueue as any)?.totalPending} facturas pendientes de revisión AI.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Crear Backup
                </CardTitle>
                <CardDescription>
                  Crea un backup completo del sistema antes de operaciones importantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                  className="w-full"
                  data-testid="button-create-backup"
                >
                  {createBackupMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creando Backup...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Crear Backup Completo
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  El backup incluirá todas las facturas, clientes, usuarios y logs del sistema.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restaurar Backup
                </CardTitle>
                <CardDescription>
                  Restaura el sistema desde un backup anterior (próximamente)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="ID del backup a restaurar"
                  value={backupToRestore}
                  onChange={(e) => setBackupToRestore(e.target.value)}
                  data-testid="input-backup-id"
                />
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                  data-testid="button-restore-backup"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Restaurar (Próximamente)
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  La funcionalidad de restauración estará disponible próximamente.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exports Tab */}
        <TabsContent value="exports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileDown className="h-5 w-5" />
                  Exportación Personalizada
                </CardTitle>
                <CardDescription>
                  Selecciona los campos específicos que quieres exportar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field}
                        checked={selectedExportFields[field as keyof typeof selectedExportFields]}
                        onCheckedChange={(checked) => 
                          setSelectedExportFields(prev => ({
                            ...prev,
                            [field]: checked
                          }))
                        }
                        data-testid={`checkbox-field-${field}`}
                      />
                      <Label 
                        htmlFor={field} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <Button 
                  onClick={() => exportCustomMutation.mutate()}
                  disabled={exportCustomMutation.isPending}
                  className="w-full"
                  data-testid="button-export-custom"
                >
                  {exportCustomMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Exportar Selección
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Google Sheets
                </CardTitle>
                <CardDescription>
                  Exporta datos en formato compatible con tus fórmulas de Google Sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheets-id">ID de Google Sheet (opcional)</Label>
                  <Input
                    id="sheets-id"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={googleSheetsId}
                    onChange={(e) => setGoogleSheetsId(e.target.value)}
                    data-testid="input-google-sheets-id"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    onClick={() => exportGoogleSheetsMutation.mutate()}
                    disabled={exportGoogleSheetsMutation.isPending}
                    data-testid="button-export-google-sheets"
                  >
                    {exportGoogleSheetsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar JSON
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => syncGoogleSheetsMutation.mutate()}
                    disabled={syncGoogleSheetsMutation.isPending}
                    data-testid="button-sync-google-sheets"
                  >
                    {syncGoogleSheetsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Preparando...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar CSV al Portapapeles
                      </>
                    )}
                  </Button>
                </div>
                
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    Los datos se formatean específicamente para mantener tus fórmulas existentes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="calculations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Herramientas de Cálculo
              </CardTitle>
              <CardDescription>
                Realiza cálculos y modificaciones sobre los datos de facturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertDescription>
                  Las herramientas de cálculo avanzadas estarán disponibles próximamente. 
                  Incluirán: recálculo de IVA, ajustes por inflación, conversión de monedas, 
                  y operaciones matemáticas personalizadas.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Review Tab */}
        <TabsContent value="ai-review">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-correct-extractions">
                      {(aiStats as any)?.correctExtractions || 0}
                    </div>
                    <div className="text-sm text-gray-600">Extracciones Correctas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600" data-testid="stat-incorrect-extractions">
                      {(aiStats as any)?.incorrectExtractions || 0}
                    </div>
                    <div className="text-sm text-gray-600">Correcciones Aplicadas</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="stat-accuracy-rate">
                    {(aiStats as any)?.accuracyRate || 95}%
                  </div>
                  <div className="text-sm text-gray-600">Precisión General</div>
                  <Progress value={(aiStats as any)?.accuracyRate || 95} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cola de Revisión</CardTitle>
                <CardDescription>
                  Facturas pendientes de revisión manual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(reviewQueue as any)?.totalPending > 0 ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-orange-600" data-testid="queue-pending-count">
                      {(reviewQueue as any)?.totalPending}
                    </div>
                    <div className="text-sm text-gray-600">Facturas pendientes</div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      data-testid="button-review-queue"
                    >
                      Revisar Facturas
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">No hay facturas pendientes de revisión</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data-management">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Gestión de Datos de Prueba
              </CardTitle>
              <CardDescription>
                Elimina datos de prueba del sistema (OPERACIÓN IRREVERSIBLE)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-400">
                  Esta operación eliminará permanentemente todas las facturas de prueba, 
                  clientes de prueba y logs recientes. Se creará un backup automático antes de proceder.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-reset">
                  Escribe "DELETE" para confirmar la eliminación:
                </Label>
                <Input
                  id="confirm-reset"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="DELETE"
                  data-testid="input-reset-confirmation"
                />
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={resetConfirmText !== 'DELETE'}
                    className="w-full"
                    data-testid="button-open-reset-dialog"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Datos de Prueba
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Eliminación</DialogTitle>
                    <DialogDescription>
                      ¿Estás seguro de que quieres eliminar todos los datos de prueba? 
                      Esta operación no se puede deshacer, aunque se creará un backup automático.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancelar</Button>
                    <Button 
                      variant="destructive"
                      onClick={() => resetTestDataMutation.mutate()}
                      disabled={resetTestDataMutation.isPending}
                      data-testid="button-confirm-reset"
                    >
                      {resetTestDataMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Confirmar Eliminación
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Info, Download, RefreshCw, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PreviewResult {
  summary: {
    total: number;
    newRecords: number;
    duplicates: number;
    conflicts: number;
    errors: number;
  };
  conflicts: Array<{
    row: number;
    type: 'duplicate' | 'conflict';
    existing: any;
    incoming: any;
    uniqueKey: string;
  }>;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

interface ImportResult {
  success: number;
  failed: number;
  updated: number;
  skipped: number;
  errors: string[];
  backupId?: string;
  message: string;
}

const IMPORT_STEPS = [
  { id: 'upload', title: 'Subir Archivo', description: 'Seleccionar archivo Excel para importar' },
  { id: 'preview', title: 'Vista Previa', description: 'Analizar datos y conflictos' },
  { id: 'configure', title: 'Configurar', description: 'Opciones de importación' },
  { id: 'import', title: 'Importar', description: 'Ejecutar importación' },
  { id: 'complete', title: 'Completado', description: 'Resultados finales' }
];

export function ImportWizard({ onClose }: { onClose?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update' | 'duplicate'>('skip');
  const [createBackup, setCreateBackup] = useState(true);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setCurrentStep(1);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handlePreview = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al analizar archivo');
      }

      const result = await response.json();
      setPreviewResult(result.preview);
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al analizar archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicateMode', duplicateMode);
      formData.append('createBackup', createBackup.toString());

      const response = await fetch('/api/import/commit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar datos');
      }

      const result = await response.json();
      setImportResult(result);
      setCurrentStep(4);

      // Invalidate ALL relevant queries to refresh data across the entire system
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });

      toast({
        title: "Importación Exitosa",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al importar datos Excel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedFile(null);
    setPreviewResult(null);
    setImportResult(null);
    setDuplicateMode('skip');
    setCreateBackup(true);
  };

  const renderStepContent = () => {
    const step = IMPORT_STEPS[currentStep];

    switch (step.id) {
      case 'upload':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Archivo Excel
              </CardTitle>
              <CardDescription>
                Selecciona un archivo Excel (.xlsx o .xls) con los datos de facturación a importar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
                `}
                data-testid="dropzone-upload"
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Suelta el archivo aquí...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">
                      Arrastra un archivo Excel aquí, o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-500">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </>
                )}
              </div>
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">{selectedFile.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'preview':
        if (!previewResult) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Analizando Archivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p>Analizando datos del archivo Excel...</p>
                    <Button 
                      onClick={handlePreview} 
                      disabled={isLoading}
                      data-testid="button-preview"
                    >
                      {isLoading ? 'Analizando...' : 'Analizar Archivo'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Análisis del Archivo
                </CardTitle>
                <CardDescription>
                  Resumen de los datos encontrados en el archivo Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600" data-testid="total-records">
                      {previewResult.summary.total}
                    </div>
                    <div className="text-sm text-blue-800">Total Registros</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600" data-testid="new-records">
                      {previewResult.summary.newRecords}
                    </div>
                    <div className="text-sm text-green-800">Nuevos</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600" data-testid="conflicts">
                      {previewResult.summary.conflicts}
                    </div>
                    <div className="text-sm text-yellow-800">Conflictos</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600" data-testid="duplicates">
                      {previewResult.summary.duplicates}
                    </div>
                    <div className="text-sm text-orange-800">Duplicados</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600" data-testid="errors">
                      {previewResult.summary.errors}
                    </div>
                    <div className="text-sm text-red-800">Errores</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {previewResult.conflicts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Conflictos Detectados
                  </CardTitle>
                  <CardDescription>
                    Registros que ya existen en la base de datos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cliente/Proveedor</TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.conflicts.map((conflict, index) => (
                          <TableRow key={index}>
                            <TableCell>{conflict.row}</TableCell>
                            <TableCell>
                              <Badge variant={conflict.type === 'duplicate' ? 'destructive' : 'secondary'}>
                                {conflict.type === 'duplicate' ? 'Duplicado' : 'Conflicto'}
                              </Badge>
                            </TableCell>
                            <TableCell>{conflict.incoming.clientProviderName}</TableCell>
                            <TableCell>{conflict.incoming.invoiceNumber}</TableCell>
                            <TableCell>${conflict.incoming.totalAmount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {previewResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Errores Encontrados
                  </CardTitle>
                  <CardDescription>
                    Registros con errores que no se pueden importar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {previewResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Fila {error.row}:</strong> {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'configure':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Configurar Importación
              </CardTitle>
              <CardDescription>
                Configura cómo manejar los conflictos y duplicados encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Manejo de Duplicados</Label>
                <p className="text-sm text-gray-500 mb-3">
                  Cómo proceder con registros que ya existen en la base de datos
                </p>
                <Select value={duplicateMode} onValueChange={(value: any) => setDuplicateMode(value)}>
                  <SelectTrigger data-testid="select-duplicate-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      <div className="flex flex-col">
                        <span className="font-medium">Omitir duplicados</span>
                        <span className="text-sm text-gray-500">No importar registros duplicados</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="update">
                      <div className="flex flex-col">
                        <span className="font-medium">Actualizar existentes</span>
                        <span className="text-sm text-gray-500">Sobrescribir registros existentes</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="duplicate">
                      <div className="flex flex-col">
                        <span className="font-medium">Crear duplicados</span>
                        <span className="text-sm text-gray-500">Importar como registros separados</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="backup" 
                  checked={createBackup} 
                  onCheckedChange={(checked) => setCreateBackup(checked as boolean)}
                  data-testid="checkbox-backup"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="backup" className="text-base font-medium">
                    Crear respaldo antes de importar
                  </Label>
                  <p className="text-sm text-gray-500">
                    Recomendado: Permite deshacer la importación si algo sale mal
                  </p>
                </div>
              </div>

              {previewResult && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Resumen:</strong> Se importarán {previewResult.summary.newRecords} registros nuevos.
                    {previewResult.summary.conflicts > 0 && (
                      <span className="block mt-1">
                        {previewResult.summary.conflicts} registros serán {
                          duplicateMode === 'skip' ? 'omitidos' :
                          duplicateMode === 'update' ? 'actualizados' : 'duplicados'
                        }.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 'import':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Ejecutando Importación
              </CardTitle>
              <CardDescription>
                Importando datos al sistema...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p>Procesando importación de datos...</p>
                  <Progress value={isLoading ? undefined : 100} className="w-full max-w-xs" />
                  <Button 
                    onClick={handleImport} 
                    disabled={isLoading}
                    data-testid="button-import"
                  >
                    {isLoading ? 'Importando...' : 'Iniciar Importación'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Importación Completada
                </CardTitle>
                <CardDescription>
                  El proceso de importación ha finalizado exitosamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600" data-testid="result-success">
                          {importResult.success}
                        </div>
                        <div className="text-sm text-green-800">Creadas</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600" data-testid="result-updated">
                          {importResult.updated}
                        </div>
                        <div className="text-sm text-blue-800">Actualizadas</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600" data-testid="result-skipped">
                          {importResult.skipped}
                        </div>
                        <div className="text-sm text-yellow-800">Omitidas</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600" data-testid="result-failed">
                          {importResult.failed}
                        </div>
                        <div className="text-sm text-red-800">Fallidas</div>
                      </div>
                    </div>

                    {importResult.backupId && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Respaldo creado:</strong> {importResult.backupId}
                          <br />
                          Puedes usar este ID para deshacer la importación si es necesario.
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Errores durante la importación:</strong>
                          <ul className="mt-2 list-disc list-inside">
                            {importResult.errors.slice(0, 5).map((error, index) => (
                              <li key={index} className="text-sm">{error}</li>
                            ))}
                            {importResult.errors.length > 5 && (
                              <li className="text-sm">... y {importResult.errors.length - 5} más</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-center">
              <Button onClick={resetWizard} variant="outline" data-testid="button-new-import">
                <Upload className="h-4 w-4 mr-2" />
                Nueva Importación
              </Button>
              <Button onClick={onClose} data-testid="button-close">
                Cerrar
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {IMPORT_STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2
                  ${index <= currentStep 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-gray-100 text-gray-400 border-gray-300'
                  }
                `}
                data-testid={`step-${index}`}
              >
                {index + 1}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500 max-w-24">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <Progress value={(currentStep / (IMPORT_STEPS.length - 1)) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0 || isLoading}
          data-testid="button-previous"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <Button
          onClick={() => {
            if (currentStep === 1 && !previewResult) {
              handlePreview();
            } else if (currentStep === 2) {
              setCurrentStep(3);
            } else if (currentStep === 3) {
              setCurrentStep(4);
            } else if (currentStep < IMPORT_STEPS.length - 1) {
              setCurrentStep(currentStep + 1);
            }
          }}
          disabled={
            (currentStep === 0 && !selectedFile) ||
            (currentStep === 4) ||
            isLoading
          }
          data-testid="button-next"
        >
          {currentStep === 1 && !previewResult ? 'Analizar' :
           currentStep === 3 ? 'Importar' : 'Siguiente'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
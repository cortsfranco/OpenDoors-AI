import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export function ExcelImportExport() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: {
      startMonth?: number;
      startYear?: number;
      endMonth?: number;
      endYear?: number;
      type?: 'income' | 'expense';
    }) => {
      const params = new URLSearchParams();
      if (options.startMonth) params.append('startMonth', options.startMonth.toString());
      if (options.startYear) params.append('startYear', options.startYear.toString());
      if (options.endMonth) params.append('endMonth', options.endMonth.toString());
      if (options.endYear) params.append('endYear', options.endYear.toString());
      if (options.type) params.append('type', options.type);

      const response = await fetch(`/api/export/excel?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al exportar datos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error en exportación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      setImportProgress(50); // Set to 50% while uploading
      
      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar datos');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      setImportProgress(100);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      
      toast({
        title: "Importación completada",
        description: `${data.success} facturas importadas, ${data.failed} fallidas`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error en importación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      setImportProgress(0);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Archivo inválido",
          description: "Por favor seleccione un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
      setImportProgress(0);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleExportAll = () => {
    exportMutation.mutate({});
  };

  const handleExportFiscalPeriod = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // If we're past May, use current fiscal year. Otherwise use previous
    const startYear = currentMonth >= 5 ? currentYear : currentYear - 1;
    
    exportMutation.mutate({
      startMonth: 5,
      startYear,
      endMonth: 4,
      endYear: startYear + 1,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="success" data-testid="excel-import-export-button">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>Importar/Exportar Excel</DialogTitle>
          <DialogDescription>
            Importe facturas desde Excel o exporte sus datos en formato Excel
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Exportar</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El archivo Excel incluirá todas las facturas con los siguientes campos:
                  Fecha, Tipo, Emisor, Cliente/Proveedor, CUIT, Número, Subtotal, IVA, Total,
                  Clase (A/B/C), IIBB, Ganancias, Otros Impuestos, Estado de Pago
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <Button
                  onClick={handleExportAll}
                  disabled={exportMutation.isPending}
                  variant="success"
                  className="w-full"
                  data-testid="export-all-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportMutation.isPending ? "Exportando..." : "Exportar Todas las Facturas"}
                </Button>

                <Button
                  onClick={handleExportFiscalPeriod}
                  disabled={exportMutation.isPending}
                  variant="success"
                  className="w-full"
                  data-testid="export-fiscal-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportMutation.isPending ? "Exportando..." : "Exportar Período Fiscal Actual"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El archivo Excel debe contener las siguientes columnas en orden:
                <div className="mt-2 text-xs font-mono">
                  Fecha | Tipo | Emisor | Cliente | CUIT | Número | Subtotal | IVA | Total | 
                  Clase | IIBB | Ganancias | Otros
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="excel-file">Seleccionar archivo Excel</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={importMutation.isPending}
                  data-testid="excel-file-input"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFile(null);
                      setImportResults(null);
                      setImportProgress(0);
                    }}
                    disabled={importMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {importProgress > 0 && importProgress < 100 && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Importando... {importProgress}%
                  </p>
                </div>
              )}

              {importResults && (
                <Alert className={importResults.failed > 0 ? "border-orange-500" : "border-green-500"}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        ✅ {importResults.success} facturas importadas exitosamente
                      </div>
                      {importResults.failed > 0 && (
                        <div>
                          ⚠️ {importResults.failed} facturas no pudieron importarse
                        </div>
                      )}
                      {importResults.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <div className="font-semibold mb-1">Errores:</div>
                          {importResults.errors.slice(0, 5).map((error, i) => (
                            <div key={i}>• {error}</div>
                          ))}
                          {importResults.errors.length > 5 && (
                            <div>... y {importResults.errors.length - 5} más</div>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                variant="success"
                className="w-full"
                data-testid="import-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? "Importando..." : "Importar Facturas"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
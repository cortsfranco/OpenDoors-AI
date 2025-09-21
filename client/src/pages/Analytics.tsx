import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Calendar, Download, FileSpreadsheet, FileText, Share2 } from "lucide-react";
import { Link } from "wouter";
import AdvancedCharts from "@/components/Analytics/AdvancedCharts";
import AdvancedDateRangePicker from "@/components/Filters/AdvancedDateRangePicker";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function Analytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  
  // Export options state
  const [selectedExportItems, setSelectedExportItems] = useState({
    kpiCards: true,
    charts: true,
    projections: true,
    alerts: true,
    dateRange: true
  });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // Aquí eventualmente se filtrarán los datos
    console.log('Date range changed:', range);
  };

  // Export mutations
  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      
      const response = await fetch(`/api/export/analytics-csv?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Error al exportar CSV');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-ejecutivos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "CSV exportado",
        description: "Los analytics ejecutivos se descargaron correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error de exportación", 
        description: "No se pudo exportar el CSV",
        variant: "destructive",
      });
    }
  });

  const exportExcelMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      
      const response = await fetch(`/api/export/analytics-excel?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Error al exportar Excel');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-ejecutivos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Excel exportado",
        description: "Los analytics ejecutivos se descargaron correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error de exportación",
        description: "No se pudo exportar el Excel", 
        variant: "destructive",
      });
    }
  });

  const syncGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      // Prepare analytics data for Google Sheets
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      
      const response = await fetch(`/api/export/analytics-csv?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Error al sincronizar con Google Sheets');
      
      const blob = await response.blob();
      const text = await blob.text();
      await navigator.clipboard.writeText(text);
      
      return text;
    },
    onSuccess: () => {
      toast({
        title: "Datos copiados al portapapeles",
        description: "Pega los datos en tu Google Sheet. Los datos están listos para importar.",
      });
    },
    onError: () => {
      toast({
        title: "Error de sincronización",
        description: "No se pudo sincronizar con Google Sheets",
        variant: "destructive",
      });
    }
  });

  const firstName = user?.displayName?.split(' ')[0] || 'Usuario';

  return (
    <div className="container-mobile" data-testid="analytics-page">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
          <div className="flex flex-col gap-3 min-w-0">
            <Link href="/" target="_self">
              <Button variant="ghost" size="sm" data-testid="back-to-dashboard" className="w-fit">
                <ArrowLeft className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="min-w-0">Dashboard</span>
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight flex items-center min-w-0 gap-2">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <span className="min-w-0 break-words">Analytics Ejecutivos</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 min-w-0 break-words">
                Análisis financiero avanzado y reportes para {firstName}
              </p>
            </div>
          </div>
          
          {/* Period Filter & Export Actions */}
          <div className="flex flex-col gap-3 w-full sm:w-auto min-w-0">
            <Badge variant="outline" className="text-xs sm:text-sm w-fit min-w-0 text-clamp-1">
              {dateRange.from ? (
                dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                  `${format(dateRange.from, 'dd/MM/yy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yy', { locale: es })}`
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                )
              ) : (
                "Todos los períodos"
              )}
            </Badge>
            <div className="flex flex-col sm:flex-row gap-2">
              <AdvancedDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="Filtrar por período"
                showPresets={true}
                showFiscalPeriods={true}
                className="w-full sm:w-64 min-w-0"
              />
              
              {/* Export Actions */}
              <div className="flex gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="success" size="sm" data-testid="export-analytics-button">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Exportar Analytics Ejecutivos</SheetTitle>
                      <SheetDescription>
                        Selecciona qué elementos incluir en la exportación
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6 mt-6">
                      {/* Export Items Selection */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Elementos a exportar</Label>
                        <div className="space-y-3">
                          {Object.entries({
                            kpiCards: 'Tarjetas KPI del período',
                            charts: 'Gráficos y análisis avanzados',
                            projections: 'Proyecciones y estimaciones',
                            alerts: 'Alertas y recomendaciones',
                            dateRange: 'Información del período filtrado'
                          }).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox
                                id={key}
                                checked={selectedExportItems[key as keyof typeof selectedExportItems]}
                                onCheckedChange={(checked) => 
                                  setSelectedExportItems(prev => ({
                                    ...prev,
                                    [key]: checked
                                  }))
                                }
                                data-testid={`checkbox-export-${key}`}
                              />
                              <Label htmlFor={key} className="text-sm leading-none">
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Export Format Options */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Formatos disponibles</Label>
                        
                        <Button 
                          onClick={() => exportCSVMutation.mutate()}
                          disabled={exportCSVMutation.isPending}
                          variant="success"
                          className="w-full justify-start"
                          data-testid="export-csv-analytics"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {exportCSVMutation.isPending ? "Exportando..." : "Exportar como CSV"}
                        </Button>
                        
                        <Button 
                          onClick={() => exportExcelMutation.mutate()}
                          disabled={exportExcelMutation.isPending}
                          variant="success"
                          className="w-full justify-start"
                          data-testid="export-excel-analytics"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          {exportExcelMutation.isPending ? "Exportando..." : "Exportar como Excel"}
                        </Button>
                        
                        <Button 
                          onClick={() => syncGoogleSheetsMutation.mutate()}
                          disabled={syncGoogleSheetsMutation.isPending}
                          variant="success"
                          className="w-full justify-start"
                          data-testid="sync-google-sheets-analytics"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          {syncGoogleSheetsMutation.isPending ? "Sincronizando..." : "Copiar para Google Sheets"}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Summary - Mobile Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 min-w-0 text-clamp-1">
              Resumen del Período
            </CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-100 min-w-0 text-clamp-1" title={dateRange.from ? "Período personalizado" : "Análisis global"}>
              {dateRange.from ? "Período personalizado" : "Análisis global"}
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 min-w-0 text-clamp-1">
              Todas las métricas filtradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200 min-w-0 text-clamp-1">
              Tendencia
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm sm:text-lg font-bold text-green-900 dark:text-green-100 min-w-0 text-clamp-1">Positiva</div>
            <p className="text-xs text-green-700 dark:text-green-300 min-w-0 text-clamp-1">
              Crecimiento sostenido
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200 min-w-0 text-clamp-1">
              Análisis IVA
            </CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm sm:text-lg font-bold text-amber-900 dark:text-amber-100 min-w-0 text-clamp-1">Optimizado</div>
            <p className="text-xs text-amber-700 dark:text-amber-300 min-w-0 text-clamp-1">
              Balance fiscal controlado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-800 dark:text-purple-200 min-w-0 text-clamp-1">
              Eficiencia
            </CardTitle>
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-100 min-w-0 text-clamp-1">Alta</div>
            <p className="text-xs text-purple-700 dark:text-purple-300 min-w-0 text-clamp-1">
              Procesos automatizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Component - DATOS REALES */}
      <AdvancedCharts 
        dateRange={dateRange}
        timeframe="monthly"
      />

      {/* Additional Analytics Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Proyecciones
            </CardTitle>
            <CardDescription>
              Estimaciones basadas en tendencias actuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <span className="text-sm font-medium">Ingresos próximo mes</span>
                <span className="font-bold text-green-600">+12.5%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <span className="text-sm font-medium">Meta trimestral</span>
                <span className="font-bold text-blue-600">87% alcanzado</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <span className="text-sm font-medium">ROI estimado</span>
                <span className="font-bold text-green-600">24.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Alertas y Recomendaciones
            </CardTitle>
            <CardDescription>
              Insights automáticos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-500">
                <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Excelente performance
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Superaste la meta mensual en un 15%
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Oportunidad de optimización
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Considera facturar servicios tipo A para mejor IVA crédito
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-l-4 border-amber-500">
                <Calendar className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Recordatorio fiscal
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Vencimiento AFIP próximo: 20 de enero
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
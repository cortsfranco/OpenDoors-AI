import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, TrendingUp, TrendingDown, Users, Building } from "lucide-react";
import { useExportCSV } from "@/hooks/useInvoices";
import { useKPIs, useFilteredReports, useComprehensiveReport, useFiscalPeriodKPIs, useFiscalPeriodChart } from "@/hooks/useKPIs";
import { formatCurrency, formatCurrencyWithConfig, getUserCurrencyConfig } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { user } = useAuth();
  const currencyConfig = getUserCurrencyConfig(user);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-indexed
  const currentMonthFormatted = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonthFormatted);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'all'>('all');
  const [reportMode, setReportMode] = useState<'monthly' | 'annual' | 'fiscal'>('monthly');
  const [selectedFiscalPeriod, setSelectedFiscalPeriod] = useState(`${currentYear}-${currentYear + 1}`); // e.g. "2024-2025"
  const { toast } = useToast();
  
  // Parse month and year for the monthly view
  const [parsedYear, parsedMonth] = selectedMonth ? selectedMonth.split('-').map(Number) : [currentYear, currentMonth];
  
  // Parse fiscal period
  const [fiscalStartYear, fiscalEndYear] = selectedFiscalPeriod.split('-').map(Number);
  const fiscalPeriod = {
    startMonth: 5, // May
    startYear: fiscalStartYear,
    endMonth: 4, // April
    endYear: fiscalEndYear
  };

  // Use comprehensive report with filters
  const { data: comprehensiveReport } = useComprehensiveReport({
    month: reportMode === 'monthly' ? parsedMonth : undefined,
    year: reportMode === 'annual' ? parsedYear : reportMode === 'monthly' ? parsedYear : undefined,
    ownerName: selectedOwner === 'all' ? undefined : selectedOwner,
    clientProviderName: selectedEntity === 'all' ? undefined : selectedEntity,
    type: selectedType === 'all' ? undefined : selectedType,
  });
  
  // Use filtered reports for monthly view
  const { data: monthlyKpis } = useFilteredReports(parsedMonth, parsedYear);
  
  // Use filtered reports for annual view (no month filter)
  const { data: annualKpis } = useFilteredReports(undefined, parseInt(selectedYear));
  
  // Use fiscal period hooks when in fiscal mode
  const { data: fiscalKpis } = useFiscalPeriodKPIs(
    reportMode === 'fiscal' ? fiscalPeriod.startMonth : 0,
    reportMode === 'fiscal' ? fiscalPeriod.startYear : 0,
    reportMode === 'fiscal' ? fiscalPeriod.endMonth : 0,
    reportMode === 'fiscal' ? fiscalPeriod.endYear : 0
  );
  
  const { data: fiscalChart } = useFiscalPeriodChart(
    reportMode === 'fiscal' ? fiscalPeriod.startMonth : 0,
    reportMode === 'fiscal' ? fiscalPeriod.startYear : 0,
    reportMode === 'fiscal' ? fiscalPeriod.endMonth : 0,
    reportMode === 'fiscal' ? fiscalPeriod.endYear : 0
  );
  
  // Default KPIs for current month
  const { data: kpis } = useKPIs();
  
  const exportCSVMutation = useExportCSV();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const months = monthNames.map((name, index) => ({
    value: `${currentYear}-${(index + 1).toString().padStart(2, '0')}`,
    label: `${name} ${currentYear}`
  }));

  const handleExportMonthlyCSV = () => {
    const [year, month] = selectedMonth.split('-');
    exportCSVMutation.mutate({
      month: parseInt(month),
      year: parseInt(year),
    });
  };

  const handleExportAnnualCSV = () => {
    exportCSVMutation.mutate({
      year: parseInt(selectedYear),
    });
  };

  const handleSyncGoogleSheets = () => {
    // Placeholder for Google Sheets sync functionality
    toast({
      title: "Próximamente",
      description: "Funcionalidad de sincronización con Google Sheets en desarrollo",
    });
  };

  const formatAmount = (amount: number) => {
    return formatCurrencyWithConfig(amount, currencyConfig);
  };

  return (
    <div className="p-6 space-y-6" data-testid="reports-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reportes y Exportación</h2>
          <p className="text-muted-foreground">
            Análisis completo de finanzas por socio, cliente y proveedor
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncGoogleSheets}
          data-testid="sync-google-sheets"
          className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Google Sheets
        </Button>
      </div>

      {/* Filtros Avanzados */}
      <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10">
        <CardHeader>
          <CardTitle className="text-purple-700 dark:text-purple-400">Filtros Avanzados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Report Mode Selector - Mobile-first responsive */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => setReportMode('monthly')}
                className={`flex-1 text-xs sm:text-sm h-10 sm:h-auto whitespace-nowrap transition-colors ${
                  reportMode === 'monthly' 
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700' 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
                data-testid="monthly-mode"
              >
                <span className="hidden sm:inline">Reporte </span>Mensual
              </Button>
              <Button
                variant="outline"
                onClick={() => setReportMode('annual')}
                className={`flex-1 text-xs sm:text-sm h-10 sm:h-auto whitespace-nowrap transition-colors ${
                  reportMode === 'annual' 
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700' 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
                data-testid="annual-mode"
              >
                <span className="hidden sm:inline">Reporte </span>Anual
              </Button>
              <Button
                variant="outline"
                onClick={() => setReportMode('fiscal')}
                className={`flex-1 text-xs sm:text-sm h-10 sm:h-auto whitespace-nowrap transition-colors ${
                  reportMode === 'fiscal' 
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700' 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}
                data-testid="fiscal-mode"
              >
                <span className="hidden sm:inline">Período </span>Fiscal
                <span className="hidden lg:inline"> (May-Abr)</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Conditional date selectors based on mode */}
              {reportMode === 'monthly' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Mes</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {reportMode === 'annual' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Año</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {reportMode === 'fiscal' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Período Fiscal</Label>
                  <Select value={selectedFiscalPeriod} onValueChange={setSelectedFiscalPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={`${year}-${year + 1}`} value={`${year}-${year + 1}`}>
                          Mayo {year} - Abril {year + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Socio</Label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Joni">Joni</SelectItem>
                  <SelectItem value="Hernán">Hernán</SelectItem>
                  <SelectItem value="Franco">Franco</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo</Label>
              <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                onClick={() => {
                  if (reportMode === 'monthly') {
                    handleExportMonthlyCSV();
                  } else if (reportMode === 'annual') {
                    handleExportAnnualCSV();
                  } else {
                    // Fiscal period export - May to April range
                    exportCSVMutation.mutate({
                      startMonth: fiscalPeriod.startMonth,
                      startYear: fiscalPeriod.startYear,
                      endMonth: fiscalPeriod.endMonth,
                      endYear: fiscalPeriod.endYear,
                    });
                  }
                }}
                disabled={exportCSVMutation.isPending}
                variant="success"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-cyan-50/50 to-sky-50/50 dark:from-cyan-950/10 dark:to-sky-950/10">
        <CardHeader>
          <CardTitle className="text-cyan-700 dark:text-cyan-400">Reportes Financieros Completos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview" data-testid="overview-tab" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Resumen </span>General
              </TabsTrigger>
              <TabsTrigger value="owners" data-testid="owners-tab" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Por </span>Socio
              </TabsTrigger>
              <TabsTrigger value="entities" data-testid="entities-tab" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Por </span>Cliente
              </TabsTrigger>
              <TabsTrigger value="detailed" data-testid="detailed-tab" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Vista </span>Detallada
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Resumen General */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Resumen Total</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Ingresos:</span>
                      <span className="font-medium text-income-green">
                        {comprehensiveReport?.totals?.income?.total ? formatAmount(comprehensiveReport.totals.income.total) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Egresos:</span>
                      <span className="font-medium text-expense-red">
                        {comprehensiveReport?.totals?.expense?.total ? formatAmount(comprehensiveReport.totals.expense.total) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-bold text-income-green">
                        {comprehensiveReport?.totals?.balance ? formatAmount(comprehensiveReport.totals.balance) : '$0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">IVA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA Débito:</span>
                      <span className="font-medium">
                        {comprehensiveReport?.totals?.income?.iva ? formatAmount(comprehensiveReport.totals.income.iva) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA Crédito:</span>
                      <span className="font-medium">
                        {comprehensiveReport?.totals?.expense?.iva ? formatAmount(comprehensiveReport.totals.expense.iva) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Balance IVA:</span>
                      <span className="font-bold text-chart-1">
                        {comprehensiveReport?.totals?.ivaBalance ? formatAmount(comprehensiveReport.totals.ivaBalance) : '$0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Facturas:</span>
                      <span className="font-medium">
                        {comprehensiveReport?.totals?.totalCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Promedio Factura:</span>
                      <span className="font-medium">
                        {comprehensiveReport?.totals?.averageAmount ? formatAmount(comprehensiveReport.totals.averageAmount) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Rentabilidad:</span>
                      <span className="font-bold">
                        {comprehensiveReport?.totals?.profitability ? `${comprehensiveReport.totals.profitability.toFixed(2)}%` : '0.00%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Facturas:</span>
                      <span className="font-bold">
                        {comprehensiveReport?.totals ? 
                          (comprehensiveReport.totals.income.count + comprehensiveReport.totals.expense.count) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos:</span>
                      <span className="font-medium text-income-green">
                        {comprehensiveReport?.totals?.income?.count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Egresos:</span>
                      <span className="font-medium text-expense-red">
                        {comprehensiveReport?.totals?.expense?.count || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoice Type Breakdown */}
              <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
                <CardHeader>
                  <CardTitle className="text-base text-blue-700 dark:text-blue-400">Desglose por Tipo de Factura</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Type A */}
                    <Card className="border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-blue-600 dark:text-blue-400">Factura A - Responsable Inscripto</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.A?.count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.A?.total ? formatAmount(comprehensiveReport.invoiceTypeBreakdown.A.total) : '$0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.A?.iva ? formatAmount(comprehensiveReport.invoiceTypeBreakdown.A.iva) : '$0'}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="text-muted-foreground">% del Total:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {comprehensiveReport?.invoiceTypeBreakdown?.A?.percentage ? `${comprehensiveReport.invoiceTypeBreakdown.A.percentage.toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Type B */}
                    <Card className="border-green-200 dark:border-green-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-600 dark:text-green-400">Factura B - Consumidor Final</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.B?.count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.B?.total ? formatAmount(comprehensiveReport.invoiceTypeBreakdown.B.total) : '$0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.B?.iva ? formatAmount(comprehensiveReport.invoiceTypeBreakdown.B.iva) : '$0'}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="text-muted-foreground">% del Total:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {comprehensiveReport?.invoiceTypeBreakdown?.B?.percentage ? `${comprehensiveReport.invoiceTypeBreakdown.B.percentage.toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Type C */}
                    <Card className="border-purple-200 dark:border-purple-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-purple-600 dark:text-purple-400">Factura C - Monotributista</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.C?.count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{comprehensiveReport?.invoiceTypeBreakdown?.C?.total ? formatAmount(comprehensiveReport.invoiceTypeBreakdown.C.total) : '$0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA:</span>
                          <span className="font-medium text-gray-500">N/A</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="text-muted-foreground">% del Total:</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {comprehensiveReport?.invoiceTypeBreakdown?.C?.percentage ? `${comprehensiveReport.invoiceTypeBreakdown.C.percentage.toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Owners Tab - Por Socio */}
            <TabsContent value="owners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Estadísticas por Socio de OpenDoors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Socio</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">IVA Ing.</TableHead>
                        <TableHead className="text-right"># Ing.</TableHead>
                        <TableHead className="text-right">Egresos</TableHead>
                        <TableHead className="text-right">IVA Egr.</TableHead>
                        <TableHead className="text-right"># Egr.</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprehensiveReport?.ownerStatistics?.map((owner: any) => (
                        <TableRow key={owner.name}>
                          <TableCell className="font-medium">{owner.name}</TableCell>
                          <TableCell className="text-right text-income-green">
                            {formatAmount(owner.income.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(owner.income.iva)}
                          </TableCell>
                          <TableCell className="text-right">
                            {owner.income.count}
                          </TableCell>
                          <TableCell className="text-right text-expense-red">
                            {formatAmount(owner.expense.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(owner.expense.iva)}
                          </TableCell>
                          <TableCell className="text-right">
                            {owner.expense.count}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={owner.balance >= 0 ? 'text-income-green' : 'text-expense-red'}>
                              {formatAmount(owner.balance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Entities Tab - Por Cliente/Proveedor */}
            <TabsContent value="entities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Estadísticas por Cliente/Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entidad</TableHead>
                        <TableHead>Socios</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right"># Ing.</TableHead>
                        <TableHead className="text-right">Egresos</TableHead>
                        <TableHead className="text-right"># Egr.</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprehensiveReport?.entityStatistics?.map((entity: any) => (
                        <TableRow key={entity.name}>
                          <TableCell className="font-medium">{entity.name}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {entity.owners.join(', ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-income-green">
                            {formatAmount(entity.income.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {entity.income.count}
                          </TableCell>
                          <TableCell className="text-right text-expense-red">
                            {formatAmount(entity.expense.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {entity.expense.count}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={entity.balance >= 0 ? 'text-income-green' : 'text-expense-red'}>
                              {formatAmount(entity.balance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Detailed Tab - Vista Detallada */}
            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Facturas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Clase</TableHead>
                        <TableHead>Cliente/Proveedor</TableHead>
                        <TableHead>Propietario</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprehensiveReport?.invoices?.slice(0, 20).map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {new Date(invoice.date).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell>
                            <span className={invoice.type === 'income' ? 'text-income-green' : 'text-expense-red'}>
                              {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                            </span>
                          </TableCell>
                          <TableCell>{invoice.invoiceNumber || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.invoiceClass === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              invoice.invoiceClass === 'B' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              invoice.invoiceClass === 'C' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {invoice.invoiceClass || '-'}
                            </span>
                          </TableCell>
                          <TableCell>{invoice.clientProviderName}</TableCell>
                          <TableCell>{invoice.ownerName}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(parseFloat(invoice.subtotal))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(parseFloat(invoice.ivaAmount))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatAmount(parseFloat(invoice.totalAmount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
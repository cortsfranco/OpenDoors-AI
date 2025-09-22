import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, Calendar } from "lucide-react";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AdvancedChartsProps {
  dateRange?: DateRange;
  timeframe?: 'monthly' | 'quarterly' | 'yearly';
}

const COLORS = {
  income: '#10B981',
  expense: '#EF4444',
  profit: '#3B82F6',
  iva: '#F59E0B',
  neutral: '#6B7280',
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))'
};

// Real data queries - no more mock data!

export default function AdvancedCharts({ dateRange, timeframe = 'monthly' }: AdvancedChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState('profitability');
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();

  // WebSocket-driven cache invalidation for real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'invoice_created' || 
        lastMessage?.type === 'invoice_updated' || 
        lastMessage?.type === 'invoice_deleted') {
      // Invalidate all analytics queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/trends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    }
  }, [lastMessage, queryClient]);

  // Build query parameters for date filtering
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('timeframe', timeframe);
    if (dateRange?.from) {
      params.set('from', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      params.set('to', dateRange.to.toISOString());
    }
    return params.toString();
  }, [dateRange, timeframe]);

  // Real data queries with proper error handling
  const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['/api/analytics/trends', { dateRange, timeframe }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/trends?${queryParams}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    select: (data: any[]) => data?.map(item => ({
      period: item.month || item.period,
      income: item.income || 0,
      expense: item.expense || 0,
      profit: item.profit || (item.income - item.expense),
      ivaDebit: item.ivaDebit || item.income * 0.21 || 0,
      ivaCredit: item.ivaCredit || item.expense * 0.21 || 0,
      invoiceCount: item.invoiceCount || 0
    })) || []
  });

  const { data: breakdownData, isLoading: breakdownLoading, error: breakdownError } = useQuery({
    queryKey: ['/api/analytics/breakdown', { dateRange }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/breakdown?${queryParams}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    select: (data: any[]) => data?.map(item => ({
      name: item.name,
      value: item.value || 0,
      count: item.count || 0,
      amount: item.amount || 0,
      color: item.fill || item.color
    })) || []
  });

  const { data: kpisData, isLoading: kpisLoading, error: kpisError } = useQuery({
    queryKey: ['/api/kpis', { dateRange }],
    queryFn: async () => {
      const res = await fetch(`/api/kpis?${queryParams}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    }
  });

  const { data: userStats, isLoading: userStatsLoading, error: userStatsError } = useQuery({
    queryKey: ['/api/user-stats/current', { dateRange }],
    queryFn: async () => {
      const res = await fetch(`/api/user-stats/current?${queryParams}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    select: (data: any) => ({
      topClients: data?.topClients || [],
      topProviders: data?.topProviders || [],
      totalInvoices: data?.totalInvoices || 0,
      averageAmount: data?.averageAmount || 0
    })
  });

  // Loading state and error handling
  const isLoading = trendsLoading || breakdownLoading || kpisLoading || userStatsLoading;
  const hasError = trendsError || breakdownError || kpisError || userStatsError;

  // Transform user stats into client analysis format - NO MORE MOCK DATA
  const clientAnalysisData = useMemo(() => {
    if (!userStats?.topClients) return [];
    return userStats.topClients.map((client: any, index: number) => ({
      client: client.name || `Cliente ${index + 1}`,
      income: client.totalAmount || 0,
      invoiceCount: client.invoiceCount || 0,
      avgTicket: client.totalAmount && client.invoiceCount ? client.totalAmount / client.invoiceCount : 0,
      trend: client.trend || 0 // Real trend from backend or zero if not available
    }));
  }, [userStats]);

  // Transform trends into different metric formats
  const profitabilityData = useMemo(() => {
    if (!trendsData?.length) return [];
    return trendsData.map(item => ({
      month: item.period.substring(0, 3), // Take first 3 chars
      revenue: item.income,
      costs: item.expense,
      margin: item.income > 0 ? ((item.income - item.expense) / item.income) * 100 : 0
    }));
  }, [trendsData]);

  // Growth data - month-over-month comparison
  const growthData = useMemo(() => {
    if (!trendsData?.length) return [];
    return trendsData.map((item, index) => {
      const previousMonth = index > 0 ? trendsData[index - 1] : null;
      const incomeGrowth = previousMonth ? 
        ((item.income - previousMonth.income) / Math.max(previousMonth.income, 1)) * 100 : 0;
      const expenseGrowth = previousMonth ? 
        ((item.expense - previousMonth.expense) / Math.max(previousMonth.expense, 1)) * 100 : 0;
      
      return {
        month: item.period.substring(0, 3),
        incomeGrowth,
        expenseGrowth,
        netGrowth: incomeGrowth - expenseGrowth,
        income: item.income,
        expense: item.expense
      };
    });
  }, [trendsData]);

  // Efficiency data - ratios and productivity metrics
  const efficiencyData = useMemo(() => {
    if (!trendsData?.length) return [];
    return trendsData.map(item => ({
      month: item.period.substring(0, 3),
      profitMargin: item.income > 0 ? ((item.income - item.expense) / item.income) * 100 : 0,
      costRatio: item.income > 0 ? (item.expense / item.income) * 100 : 0,
      revenuePerInvoice: item.invoiceCount > 0 ? item.income / item.invoiceCount : 0,
      totalInvoices: item.invoiceCount
    }));
  }, [trendsData]);

  // Cash flow data - cumulative and monthly flow
  const cashFlowData = useMemo(() => {
    if (!trendsData?.length) return [];
    let cumulativeFlow = 0;
    return trendsData.map(item => {
      const monthlyFlow = item.income - item.expense;
      cumulativeFlow += monthlyFlow;
      return {
        month: item.period.substring(0, 3),
        monthlyFlow,
        cumulativeFlow,
        income: item.income,
        expense: item.expense,
        ivaBalance: item.ivaDebit - item.ivaCredit
      };
    });
  }, [trendsData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Function to render metric-specific content
  const renderMetricContent = () => {
    const metricSelector = (
      <Select value={selectedMetric} onValueChange={setSelectedMetric}>
        <SelectTrigger className="w-full sm:w-48" data-testid="metric-selector">
          <SelectValue placeholder="Seleccionar métrica" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="profitability">Rentabilidad</SelectItem>
          <SelectItem value="growth">Crecimiento</SelectItem>
          <SelectItem value="efficiency">Eficiencia</SelectItem>
          <SelectItem value="cashflow">Flujo de Caja</SelectItem>
        </SelectContent>
      </Select>
    );

    switch (selectedMetric) {
      case 'profitability':
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Análisis de Márgenes y Rentabilidad</CardTitle>
                <CardDescription>Evolución de la rentabilidad y eficiencia operativa</CardDescription>
              </div>
              {metricSelector}
            </CardHeader>
            <CardContent>
              <div className="h-80 sm:h-96 min-w-0">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : hasError ? (
                  <div className="h-full flex items-center justify-center text-red-500"><p>Error al cargar datos.</p></div>
                ) : profitabilityData && profitabilityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={profitabilityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={15} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any, name: string) => [ name === 'margin' ? formatPercentage(value) : formatCurrency(value), name === 'revenue' ? 'Ingresos' : name === 'costs' ? 'Costos' : name === 'margin' ? 'Margen %' : name ]} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill={COLORS.income} name="Ingresos" />
                      <Bar yAxisId="left" dataKey="costs" fill={COLORS.expense} name="Costos" />
                      <Line yAxisId="right" type="monotone" dataKey="margin" stroke={COLORS.profit} strokeWidth={3} name="Margen %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos de rentabilidad.</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'growth':
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Análisis de Crecimiento</CardTitle>
                <CardDescription>Evolución porcentual mes a mes de ingresos y egresos</CardDescription>
              </div>
              {metricSelector}
            </CardHeader>
            <CardContent>
              <div className="h-80 sm:h-96 min-w-0">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : hasError ? (
                  <div className="h-full flex items-center justify-center text-red-500"><p>Error al cargar datos.</p></div>
                ) : growthData && growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={15} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any, name: string) => [ name.includes('Growth') || name.includes('netGrowth') ? formatPercentage(value) : formatCurrency(value), name === 'incomeGrowth' ? 'Crecimiento Ingresos' : name === 'expenseGrowth' ? 'Crecimiento Egresos' : name === 'netGrowth' ? 'Crecimiento Neto' : name === 'income' ? 'Ingresos' : name === 'expense' ? 'Egresos' : name ]} />
                      <Legend />
                      <Bar yAxisId="right" dataKey="income" fill={COLORS.income} name="Ingresos" opacity={0.6} />
                      <Bar yAxisId="right" dataKey="expense" fill={COLORS.expense} name="Egresos" opacity={0.6} />
                      <Line yAxisId="left" type="monotone" dataKey="incomeGrowth" stroke={COLORS.income} strokeWidth={3} name="Crecimiento Ingresos" />
                      <Line yAxisId="left" type="monotone" dataKey="expenseGrowth" stroke={COLORS.expense} strokeWidth={3} name="Crecimiento Egresos" />
                      <Line yAxisId="left" type="monotone" dataKey="netGrowth" stroke={COLORS.profit} strokeWidth={4} name="Crecimiento Neto" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos de crecimiento.</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'efficiency':
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Análisis de Eficiencia</CardTitle>
                <CardDescription>Métricas de productividad y rendimiento operativo</CardDescription>
              </div>
              {metricSelector}
            </CardHeader>
            <CardContent>
              <div className="h-80 sm:h-96 min-w-0">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : hasError ? (
                  <div className="h-full flex items-center justify-center text-red-500"><p>Error al cargar datos.</p></div>
                ) : efficiencyData && efficiencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={15} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any, name: string) => [ name === 'revenuePerInvoice' ? formatCurrency(value) : name === 'totalInvoices' ? value : formatPercentage(value), name === 'profitMargin' ? 'Margen de Ganancia' : name === 'costRatio' ? 'Ratio de Costos' : name === 'revenuePerInvoice' ? 'Ingresos por Factura' : name === 'totalInvoices' ? 'Total Facturas' : name ]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="profitMargin" fill={COLORS.income} fillOpacity={0.6} stroke={COLORS.income} name="Margen de Ganancia" />
                      <Area yAxisId="left" type="monotone" dataKey="costRatio" fill={COLORS.expense} fillOpacity={0.6} stroke={COLORS.expense} name="Ratio de Costos" />
                      <Line yAxisId="right" type="monotone" dataKey="revenuePerInvoice" stroke={COLORS.profit} strokeWidth={3} name="Ingresos por Factura" />
                      <Line yAxisId="right" type="monotone" dataKey="totalInvoices" stroke={COLORS.neutral} strokeWidth={2} name="Total Facturas" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos de eficiencia.</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'cashflow':
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Análisis de Flujo de Caja</CardTitle>
                <CardDescription>Movimientos de efectivo mensuales y acumulados</CardDescription>
              </div>
              {metricSelector}
            </CardHeader>
            <CardContent>
              <div className="h-80 sm:h-96 min-w-0">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : hasError ? (
                  <div className="h-full flex items-center justify-center text-red-500"><p>Error al cargar datos.</p></div>
                ) : cashFlowData && cashFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} minTickGap={15} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any, name: string) => [ formatCurrency(value), name === 'monthlyFlow' ? 'Flujo Mensual' : name === 'cumulativeFlow' ? 'Flujo Acumulado' : name === 'income' ? 'Ingresos' : name === 'expense' ? 'Egresos' : name === 'ivaBalance' ? 'Balance IVA' : name ]} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="income" fill={COLORS.income} name="Ingresos" opacity={0.7} />
                      <Bar yAxisId="left" dataKey="expense" fill={COLORS.expense} name="Egresos" opacity={0.7} />
                      <Line yAxisId="left" type="monotone" dataKey="monthlyFlow" stroke={COLORS.profit} strokeWidth={3} name="Flujo Mensual" />
                      <Line yAxisId="right" type="monotone" dataKey="cumulativeFlow" stroke={COLORS.primary} strokeWidth={4} name="Flujo Acumulado" />
                      <Line yAxisId="left" type="monotone" dataKey="ivaBalance" stroke={COLORS.iva} strokeWidth={2} name="Balance IVA" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos de flujo de caja.</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="advanced-charts">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Análisis Financiero Avanzado</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Dashboard ejecutivo con métricas e insights detallados</p>
        </div>
      </div>

      {/* KPIs Ejecutivos - DATOS REALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Rentabilidad Promedio</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {profitabilityData.length > 0 
                    ? formatPercentage(profitabilityData.reduce((acc, item) => acc + item.margin, 0) / profitabilityData.length)
                    : '0.0%'
                  }
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Basado en datos reales
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Facturación Total</CardTitle>
                <Zap className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {typeof kpisData?.totalIncome === 'string' ? kpisData.totalIncome : formatCurrency(kpisData?.totalIncome || 0)}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Período seleccionado
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Balance IVA</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200 min-w-0 text-clamp-1">
                  {trendsData && trendsData.length > 0 
                    ? formatCurrency(trendsData.reduce((acc, item) => acc + (item.ivaDebit - item.ivaCredit), 0))
                    : formatCurrency(0)
                  }
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  IVA débito - crédito
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Ticket Promedio</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {userStats?.averageAmount ? formatCurrency(userStats.averageAmount) : formatCurrency(0)}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Por factura procesada
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Metric-driven content based on selector */}
      <div className="space-y-6">{renderMetricContent()}</div>

      {/* Additional analytics sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Invoice Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>Clasificación AFIP por tipo de factura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 sm:h-96 min-w-0">
              {breakdownLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="w-32 h-32 rounded-full" />
                </div>
              ) : hasError ? (
                <div className="h-full flex items-center justify-center text-red-500">
                  <div className="text-center">
                    <p className="text-lg font-medium">Error al cargar clasificación</p>
                    <p className="text-sm">Intenta recargar la página</p>
                  </div>
                </div>
              ) : breakdownData && breakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {breakdownData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">Sin clasificación disponible</p>
                    <p className="text-sm">Procesa facturas tipo A/B/C</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
            <CardDescription>Ranking por facturación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userStatsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              ) : hasError ? (
                <div className="text-center text-red-500 py-8">
                  <p className="text-lg font-medium">Error al cargar clientes</p>
                  <p className="text-sm">Intenta recargar la página</p>
                </div>
              ) : clientAnalysisData && clientAnalysisData.length > 0 ? (
                clientAnalysisData.slice(0, 5).map((client: any, index: number) => (
                  <div key={client.client} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{client.client}</p>
                        <p className="text-sm text-muted-foreground">{client.invoiceCount} facturas</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold">{formatCurrency(client.income)}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={client.trend > 0 ? "default" : "secondary"} className="text-xs">
                          {client.trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {formatPercentage(Math.abs(client.trend))}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-lg font-medium">No hay clientes para mostrar</p>
                  <p className="text-sm">Procesa facturas para generar análisis</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
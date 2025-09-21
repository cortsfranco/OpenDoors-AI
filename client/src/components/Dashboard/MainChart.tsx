import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { useChartData } from "@/hooks/useKPIs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ChartType = 'area' | 'bar' | 'line' | 'pie';

export default function MainChart() {
  const { data: chartData, isLoading } = useChartData();
  const [chartType, setChartType] = useState<ChartType>('area');

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData) return null;

  // Prepare data for pie chart
  const pieData = chartData.reduce((acc, item) => {
    const income = typeof item.income === 'string' ? parseFloat(item.income) : item.income || 0;
    const expenses = typeof item.expenses === 'string' ? parseFloat(item.expenses) : item.expenses || 0;
    return {
      totalIncome: acc.totalIncome + income,
      totalExpenses: acc.totalExpenses + expenses
    };
  }, { totalIncome: 0, totalExpenses: 0 });

  const pieChartData = [
    { name: 'Ingresos', value: pieData.totalIncome, color: 'hsl(142, 70%, 40%)' },
    { name: 'Egresos', value: pieData.totalExpenses, color: 'hsl(0, 72%, 55%)' }
  ];

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number, name) => [
                `$${value.toLocaleString('es-AR')}`,
                name === 'income' ? 'Ingresos' : 'Egresos'
              ]}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Bar dataKey="income" fill="hsl(142, 70%, 40%)" />
            <Bar dataKey="expenses" fill="hsl(0, 72%, 55%)" />
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number, name) => [
                `$${value.toLocaleString('es-AR')}`,
                name === 'income' ? 'Ingresos' : 'Egresos'
              ]}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(142, 70%, 40%)" 
              strokeWidth={3}
              dot={{ fill: 'hsl(142, 70%, 40%)' }}
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="hsl(0, 72%, 55%)" 
              strokeWidth={3}
              dot={{ fill: 'hsl(0, 72%, 55%)' }}
            />
          </LineChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString('es-AR')}`}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{
                paddingTop: '10px',
              }}
            />
          </PieChart>
        );
      
      default: // area
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number, name) => [
                `$${value.toLocaleString('es-AR')}`,
                name === 'income' ? 'Ingresos' : 'Egresos'
              ]}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="income"
              stackId="1"
              stroke="hsl(142, 70%, 40%)"
              fill="hsl(142, 70%, 40%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stackId="2"
              stroke="hsl(0, 72%, 55%)"
              fill="hsl(0, 72%, 55%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        );
    }
  };

  return (
    <Card className="lg:col-span-2" data-testid="main-chart">
      <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Ingresos vs Egresos
            </CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={chartType === 'area' ? 'default' : 'ghost'}
              className={cn("h-8 px-1.5 sm:px-3 text-xs sm:text-sm", chartType === 'area' && "shadow-sm")}
              onClick={() => setChartType('area')}
              data-testid="chart-type-area"
            >
              <TrendingUp className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Área</span>
            </Button>
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              className={cn("h-8 px-1.5 sm:px-3 text-xs sm:text-sm", chartType === 'bar' && "shadow-sm")}
              onClick={() => setChartType('bar')}
              data-testid="chart-type-bar"
            >
              <BarChart2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Barras</span>
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'ghost'}
              className={cn("h-8 px-1.5 sm:px-3 text-xs sm:text-sm", chartType === 'line' && "shadow-sm")}
              onClick={() => setChartType('line')}
              data-testid="chart-type-line"
            >
              <LineChartIcon className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Líneas</span>
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              className={cn("h-8 px-1.5 sm:px-3 text-xs sm:text-sm", chartType === 'pie' && "shadow-sm")}
              onClick={() => setChartType('pie')}
              data-testid="chart-type-pie"
            >
              <PieChartIcon className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Torta</span>
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        {chartType !== 'pie' && (
          <div className="flex items-center gap-3 sm:gap-4 mt-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'hsl(142, 70%, 40%)' }}></div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'hsl(0, 72%, 55%)' }}></div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Egresos</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 pt-2">
        <div className="h-64 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
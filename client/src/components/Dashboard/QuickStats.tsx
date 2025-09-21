import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuickStats } from "@/hooks/useKPIs";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuickStats() {
  const { data: stats, isLoading } = useQuickStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statsItems = [
    { label: "Facturas este mes", value: stats.invoicesThisMonth.toString() },
    { label: "Promedio por factura", value: stats.averageInvoice },
    { label: "IVA recuperado", value: stats.ivaRecovered },
    { label: "Carga manual", value: stats.pending.toString() },
    { label: "Rentabilidad", value: stats.profitability },
  ];

  return (
    <Card data-testid="quick-stats" className="bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Estadísticas Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statsItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between ${
              index === statsItems.length - 1 ? 'border-t border-gray-200 dark:border-gray-700 pt-4' : ''
            }`}
            data-testid={`stat-item-${index}`}
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {item.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

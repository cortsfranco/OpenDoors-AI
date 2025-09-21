import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useRecentInvoices } from "@/hooks/useKPIs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency, formatCurrencyWithConfig, getUserCurrencyConfig } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function RecentActivity() {
  const { data: invoices, isLoading } = useRecentInvoices(10);
  const { user } = useAuth();
  const currencyConfig = getUserCurrencyConfig(user);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card data-testid="recent-activity">
        <CardHeader className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Actividad Reciente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Últimas facturas procesadas
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay facturas recientes
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="recent-activity">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Actividad Reciente
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Últimas {invoices.length} facturas procesadas
            </p>
          </div>
          <Link href="/invoices" target="_self">
            <Button variant="ghost" size="sm" data-testid="view-all-invoices">
              Ver todas →
            </Button>
          </Link>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Cliente/Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                IVA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Cargado por
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="table-row-hover"
                data-testid={`invoice-row-${invoice.id}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className={`status-indicator ${
                        invoice.type === 'income' ? 'status-income' : 'status-expense'
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {invoice.date ? formatDate(invoice.date) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {invoice.clientProviderName}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {formatCurrencyWithConfig(invoice.totalAmount, currencyConfig)}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {formatCurrencyWithConfig(invoice.ivaAmount, currencyConfig)}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {invoice.uploadedByName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatCurrencyWithDecimals } from "@/lib/utils";
import { TrendingUp, TrendingDown, FileText, Download, Upload } from "lucide-react";
import InvoicesTable from "@/components/Tables/InvoicesTable";
import { useState } from "react";

export default function InvoicesSeparated() {
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [neutralPage, setNeutralPage] = useState(1);
  const pageSize = 50;

  // Separate queries for income and expense invoices
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ["/api/invoices", { type: "income", page: incomePage }],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        type: "income", 
        limit: String(pageSize), 
        offset: String((incomePage - 1) * pageSize) 
      });
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch income invoices");
      return response.json();
    },
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["/api/invoices", { type: "expense", page: expensePage }],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        type: "expense", 
        limit: String(pageSize), 
        offset: String((expensePage - 1) * pageSize) 
      });
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expense invoices");
      return response.json();
    },
  });

  const { data: neutralData, isLoading: neutralLoading } = useQuery({
    queryKey: ["/api/invoices", { type: "neutral", page: neutralPage }],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        type: "neutral", 
        limit: String(pageSize), 
        offset: String((neutralPage - 1) * pageSize) 
      });
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch neutral invoices");
      return response.json();
    },
  });

  const calculateTotals = (invoices: any[]) => {
    if (!invoices) return { subtotal: 0, iva: 0, total: 0, count: 0 };
    
    return invoices.reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + parseFloat(inv.subtotal || 0),
        iva: acc.iva + parseFloat(inv.ivaAmount || 0),
        total: acc.total + parseFloat(inv.totalAmount || 0),
        count: acc.count + 1,
      }),
      { subtotal: 0, iva: 0, total: 0, count: 0 }
    );
  };

  const incomeTotals = calculateTotals(incomeData?.invoices);
  const expenseTotals = calculateTotals(expenseData?.invoices);
  const neutralTotals = calculateTotals(neutralData?.invoices);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="invoices-separated-page">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <h1 className="text-xl sm:text-3xl font-bold">Facturas por Tipo</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-export-excel">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-import-excel">
            <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Import</span>
            <span className="hidden sm:inline">Importar Excel</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <div className="container-mobile overflow-x-auto">
          <TabsList className="flex w-full min-w-max sm:grid sm:grid-cols-3 gap-1 sm:gap-2">
          <TabsTrigger value="income" data-testid="tab-income" className="shrink-0 flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm min-w-max">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            <span className="whitespace-nowrap font-medium">Ventas</span>
            <span className="hidden sm:inline whitespace-nowrap">(Emitidas)</span>
            <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 shrink-0">
              {incomeTotals.count}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expense" data-testid="tab-expense" className="shrink-0 flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm min-w-max">
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            <span className="whitespace-nowrap font-medium">Compras</span>
            <span className="hidden sm:inline whitespace-nowrap">(Recibidas)</span>
            <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 shrink-0">
              {expenseTotals.count}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="neutral" data-testid="tab-neutral" className="shrink-0 flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm min-w-max">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
            <span className="whitespace-nowrap font-medium">Neutras</span>
            <span className="hidden sm:inline whitespace-nowrap">(Compensación)</span>
            <Badge className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 shrink-0">
              {neutralTotals.count}
            </Badge>
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="income" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Total Ventas
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-green-600 text-clamp-1" title={formatCurrency(incomeTotals.total)}>
                  {formatCurrency(incomeTotals.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Subtotal
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrency(incomeTotals.subtotal)}>
                  {formatCurrency(incomeTotals.subtotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  IVA Cobrado
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrencyWithDecimals(incomeTotals.iva)}>
                  {formatCurrencyWithDecimals(incomeTotals.iva)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Cantidad
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={incomeTotals.count.toString()}>
                  {incomeTotals.count}
                </p>
              </CardContent>
            </Card>
          </div>
          {!incomeLoading && incomeData?.invoices && (
            <div className="container-mobile">
              <InvoicesTable 
                invoices={incomeData.invoices} 
                total={incomeData.total || incomeTotals.count}
                currentPage={incomePage}
                pageSize={pageSize}
                onPageChange={setIncomePage}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="expense" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Total Compras
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-red-600 text-clamp-1" title={formatCurrency(expenseTotals.total)}>
                  {formatCurrency(expenseTotals.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Subtotal
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrency(expenseTotals.subtotal)}>
                  {formatCurrency(expenseTotals.subtotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  IVA Pagado
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrencyWithDecimals(expenseTotals.iva)}>
                  {formatCurrencyWithDecimals(expenseTotals.iva)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Cantidad
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={expenseTotals.count.toString()}>
                  {expenseTotals.count}
                </p>
              </CardContent>
            </Card>
          </div>
          {!expenseLoading && expenseData?.invoices && (
            <div className="container-mobile">
              <InvoicesTable 
                invoices={expenseData.invoices} 
                total={expenseData.total || expenseTotals.count}
                currentPage={expensePage}
                pageSize={pageSize}
                onPageChange={setExpensePage}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="neutral" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Total Neutras
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-gray-600 text-clamp-1" title={formatCurrency(neutralTotals.total)}>
                  {formatCurrency(neutralTotals.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Subtotal
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrency(neutralTotals.subtotal)}>
                  {formatCurrency(neutralTotals.subtotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  IVA Compensado
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={formatCurrencyWithDecimals(neutralTotals.iva)}>
                  {formatCurrencyWithDecimals(neutralTotals.iva)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-clamp-1">
                  Cantidad
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-lg sm:text-2xl font-bold text-clamp-1" title={neutralTotals.count.toString()}>
                  {neutralTotals.count}
                </p>
              </CardContent>
            </Card>
          </div>
          {!neutralLoading && neutralData?.invoices && (
            <div className="container-mobile">
              <InvoicesTable 
                invoices={neutralData.invoices} 
                total={neutralData.total || neutralTotals.count}
                currentPage={neutralPage}
                pageSize={pageSize}
                onPageChange={setNeutralPage}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
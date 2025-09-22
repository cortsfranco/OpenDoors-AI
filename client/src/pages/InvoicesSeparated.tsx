import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatCurrencyWithDecimals, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, FileText, Download, Upload } from "lucide-react";
import InvoicesTable from "@/components/Tables/InvoicesTable";
import { useState } from "react";

export default function InvoicesSeparated() {
  const [activeTab, setActiveTab] = useState("income");
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [neutralPage, setNeutralPage] = useState(1);
  const pageSize = 50;

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
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs sm:text-sm bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60" 
            data-testid="button-export-excel"
          >
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs sm:text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60" 
            data-testid="button-import-excel"
          >
            <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Import</span>
            <span className="hidden sm:inline">Importar Excel</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TARJETA DE VENTAS */}
        <Card
          onClick={() => setActiveTab("income")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-green-50/50 dark:bg-green-900/20",
            activeTab === "income" && "ring-2 ring-green-500 border-green-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-800 dark:text-green-300">Ventas (Emitidas)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(incomeTotals.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {incomeTotals.count} facturas
            </p>
          </CardContent>
        </Card>

        {/* TARJETA DE COMPRAS */}
        <Card
          onClick={() => setActiveTab("expense")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-red-50/50 dark:bg-red-900/20",
            activeTab === "expense" && "ring-2 ring-red-500 border-red-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-800 dark:text-red-300">Compras (Recibidas)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(expenseTotals.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseTotals.count} facturas
            </p>
          </CardContent>
        </Card>

        {/* TARJETA DE NEUTRAS */}
        <Card
          onClick={() => setActiveTab("neutral")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-gray-50/50 dark:bg-gray-900/20",
            activeTab === "neutral" && "ring-2 ring-gray-500 border-gray-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-300">Neutras (Compensación)</CardTitle>
            <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(neutralTotals.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {neutralTotals.count} facturas
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        {activeTab === 'income' && (
          <div>
            {!incomeLoading && incomeData?.invoices && (
              // ===============================================================
              // INICIO CORRECCIÓN 1: Eliminado Card y CardContent redundantes
              // ===============================================================
              <InvoicesTable 
                invoices={incomeData.invoices} 
                total={incomeData.total || incomeTotals.count}
                currentPage={incomePage}
                pageSize={pageSize}
                onPageChange={setIncomePage}
              />
              // ===============================================================
              // FIN CORRECCIÓN 1
              // ===============================================================
            )}
          </div>
        )}

        {activeTab === 'expense' && (
           <div>
            {!expenseLoading && expenseData?.invoices && (
              // ===============================================================
              // INICIO CORRECCIÓN 2: Eliminado Card y CardContent redundantes
              // ===============================================================
              <InvoicesTable 
                invoices={expenseData.invoices} 
                total={expenseData.total || expenseTotals.count}
                currentPage={expensePage}
                pageSize={pageSize}
                onPageChange={setExpensePage}
              />
              // ===============================================================
              // FIN CORRECCIÓN 2
              // ===============================================================
            )}
          </div>
        )}

        {activeTab === 'neutral' && (
           <div>
            {!neutralLoading && neutralData?.invoices && (
              // ===============================================================
              // INICIO CORRECCIÓN 3: Eliminado Card y CardContent redundantes
              // ===============================================================
              <InvoicesTable 
                invoices={neutralData.invoices} 
                total={neutralData.total || neutralTotals.count}
                currentPage={neutralPage}
                pageSize={pageSize}
                onPageChange={setNeutralPage}
              />
              // ===============================================================
              // FIN CORRECCIÓN 3
              // ===============================================================
            )}
          </div>
        )}
      </div>
    </div>
  );
}
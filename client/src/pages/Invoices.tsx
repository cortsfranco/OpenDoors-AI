import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ExcelImportExport } from "@/components/ExcelImportExport";
import { InvoiceFilters, FilterCriteria } from "@/components/Tables/InvoiceFilters";
import InvoicesTable from "@/components/Tables/InvoicesTable";
import { useInvoices, useExportCSV } from "@/hooks/useInvoices";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceFilters as InvoiceFiltersType } from "@/lib/types";

export default function Invoices() {
  const [appliedFilters, setAppliedFilters] = useState<InvoiceFiltersType>(() => {
    // Check if we have a client filter from sessionStorage
    const clientFilter = sessionStorage.getItem('invoiceClientFilter');
    if (clientFilter) {
      // Clear the sessionStorage after using it
      sessionStorage.removeItem('invoiceClientFilter');
      return {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        clientProvider: clientFilter
      };
    }
    return {
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
  });
  const [currentPage, setCurrentPage] = useState(1);
  // Dynamic page size based on performance and screen size
  const [pageSize, setPageSize] = useState(() => {
    // Start with smaller pages on mobile
    return window.innerWidth < 768 ? 10 : 20;
  });
  const [isLargeDataset, setIsLargeDataset] = useState(false);

  const { data, isLoading } = useInvoices({
    ...appliedFilters,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  // Performance optimization: detect large datasets and adjust
  useEffect(() => {
    if (data?.total && data.total > 500) {
      setIsLargeDataset(true);
      // Use smaller page sizes for large datasets
      if (pageSize > 15 && window.innerWidth < 768) {
        setPageSize(10);
      } else if (pageSize > 25 && window.innerWidth >= 768) {
        setPageSize(25);
      }
    } else {
      setIsLargeDataset(false);
    }
  }, [data?.total, pageSize]);

  // Memoize expensive operations
  const optimizedFilters = useMemo(() => ({
    ...appliedFilters,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  }), [appliedFilters, pageSize, currentPage]);

  const exportCSVMutation = useExportCSV();

  const handleApplyFilters = (filters: FilterCriteria) => {
    const newFilters: InvoiceFiltersType = {};
    if (filters.search) newFilters.search = filters.search;
    if (filters.type !== 'all') newFilters.type = filters.type;
    if (filters.invoiceClass !== 'all') newFilters.invoiceClass = filters.invoiceClass;
    if (filters.paymentStatus !== 'all') newFilters.paymentStatus = filters.paymentStatus;
    if (filters.ownerName) newFilters.ownerName = filters.ownerName;
    if (filters.dateFrom) newFilters.startDate = filters.dateFrom.toISOString();
    if (filters.dateTo) newFilters.endDate = filters.dateTo.toISOString();
    if (filters.amountMin !== null) newFilters.amountMin = filters.amountMin;
    if (filters.amountMax !== null) newFilters.amountMax = filters.amountMax;
    if (filters.clientProvider) newFilters.clientProvider = filters.clientProvider;
    
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setAppliedFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    exportCSVMutation.mutate(appliedFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setAppliedFilters({
      ...appliedFilters,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="invoices-page">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="invoices-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Historial de Facturas</h2>
          <p className="text-muted-foreground">
            Gestión completa de facturas cargadas
          </p>
        </div>
        <div className="flex gap-2">
          <ExcelImportExport />
          <Button
            onClick={handleExportCSV}
            disabled={exportCSVMutation.isPending}
            variant="success"
            data-testid="export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportCSVMutation.isPending ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      <InvoiceFilters
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        initialClientProvider={appliedFilters.clientProvider || ''}
      />

      {data && (
        <InvoicesTable
          invoices={data.invoices}
          total={data.total}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
          sortBy={appliedFilters.sortBy}
          sortOrder={appliedFilters.sortOrder}
        />
      )}
    </div>
  );
}

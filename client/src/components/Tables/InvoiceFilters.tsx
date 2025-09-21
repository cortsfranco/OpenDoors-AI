import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InvoiceFiltersProps {
  onApplyFilters: (filters: FilterCriteria) => void;
  onClearFilters: () => void;
  showTypeFilter?: boolean;
  defaultType?: 'income' | 'expense' | 'all';
  initialClientProvider?: string;
}

export interface FilterCriteria {
  search: string;
  type: 'income' | 'expense' | 'all';
  invoiceClass: 'A' | 'B' | 'C' | 'all';
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'all';
  ownerName: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  amountMin: number | null;
  amountMax: number | null;
  clientProvider: string;
}

export function InvoiceFilters({ 
  onApplyFilters, 
  onClearFilters, 
  showTypeFilter = true,
  defaultType = 'all',
  initialClientProvider = ''
}: InvoiceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({
    search: '',
    type: defaultType,
    invoiceClass: 'all',
    paymentStatus: 'all',
    ownerName: '',
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    clientProvider: initialClientProvider,
  });
  
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Auto-apply filters when initialClientProvider is provided
  useEffect(() => {
    if (initialClientProvider) {
      const autoFilters: FilterCriteria = {
        search: '',
        type: defaultType,
        invoiceClass: 'all',
        paymentStatus: 'all',
        ownerName: '',
        dateFrom: null,
        dateTo: null,
        amountMin: null,
        amountMax: null,
        clientProvider: initialClientProvider,
      };
      setFilters(autoFilters);
      onApplyFilters(autoFilters);
      setActiveFiltersCount(1); // clientProvider filter is active
    }
  }, [initialClientProvider, defaultType, onApplyFilters]);

  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const countActiveFilters = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type !== 'all') count++;
    if (filters.invoiceClass !== 'all') count++;
    if (filters.paymentStatus !== 'all') count++;
    if (filters.ownerName) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.amountMin || filters.amountMax) count++;
    if (filters.clientProvider) count++;
    return count;
  };

  const handleApplyFilters = () => {
    const count = countActiveFilters();
    setActiveFiltersCount(count);
    onApplyFilters(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterCriteria = {
      search: '',
      type: defaultType,
      invoiceClass: 'all',
      paymentStatus: 'all',
      ownerName: '',
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      clientProvider: '',
    };
    setFilters(clearedFilters);
    setActiveFiltersCount(0);
    onClearFilters();
  };

  return (
    <Card className="p-4 mb-4">
      <div className="space-y-4">
        {/* Quick Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por cliente, proveedor, número de factura..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 placeholder:opacity-0 sm:placeholder:opacity-100"
              data-testid="filter-search-input"
              aria-label="Buscar"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
            data-testid="toggle-advanced-filters"
          >
            <Filter className="w-4 h-4" />
            Filtros Avanzados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type Filter */}
              {showTypeFilter && (
                <div className="form-field">
                  <Label>Categoría de Operación</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value: 'income' | 'expense' | 'all') => 
                      handleFilterChange('type', value)
                    }
                  >
                    <SelectTrigger data-testid="filter-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Ingresos</SelectItem>
                      <SelectItem value="expense">Egresos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Invoice Class Filter */}
              <div className="form-field">
                <Label>Tipo de Factura</Label>
                <Select
                  value={filters.invoiceClass}
                  onValueChange={(value: 'A' | 'B' | 'C' | 'all') => 
                    handleFilterChange('invoiceClass', value)
                  }
                >
                  <SelectTrigger data-testid="filter-invoice-class-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="A">Factura A</SelectItem>
                    <SelectItem value="B">Factura B</SelectItem>
                    <SelectItem value="C">Factura C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status Filter */}
              <div className="form-field">
                <Label>Estado de Pago</Label>
                <Select
                  value={filters.paymentStatus}
                  onValueChange={(value) => 
                    handleFilterChange('paymentStatus', value)
                  }
                >
                  <SelectTrigger data-testid="filter-payment-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Filter */}
              <div className="form-field">
                <Label>Propietario</Label>
                <Select
                  value={filters.ownerName || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('ownerName', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger data-testid="filter-owner-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Joni">Joni</SelectItem>
                    <SelectItem value="Hernán">Hernán</SelectItem>
                    <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row of Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="form-field lg:col-span-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Rango de Fechas
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                    onChange={(e) => 
                      handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : null)
                    }
                    data-testid="filter-date-from"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                    onChange={(e) => 
                      handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)
                    }
                    data-testid="filter-date-to"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="form-field lg:col-span-2">
                <Label>Rango de Montos</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.amountMin || ''}
                    onChange={(e) => 
                      handleFilterChange('amountMin', e.target.value ? parseFloat(e.target.value) : null)
                    }
                    data-testid="filter-amount-min"
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={filters.amountMax || ''}
                    onChange={(e) => 
                      handleFilterChange('amountMax', e.target.value ? parseFloat(e.target.value) : null)
                    }
                    data-testid="filter-amount-max"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="gap-2"
                data-testid="clear-filters-button"
              >
                <X className="w-4 h-4" />
                Limpiar Filtros
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="gap-2"
                data-testid="apply-filters-button"
              >
                <Filter className="w-4 h-4" />
                Aplicar Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-white/20">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
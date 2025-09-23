import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FiltersPanelProps {
  filters: {
    search: string;
    month: string;
    year: string;
    user: string;
    type: string;
  };
  onFiltersChange: (filters: any) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export default function FiltersPanel({ 
  filters, 
  onFiltersChange, 
  onApplyFilters, 
  onClearFilters 
}: FiltersPanelProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  return (
    <Card data-testid="filters-panel">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          <div>
            <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
              Buscar Cliente/Proveedor
            </Label>
            <Input
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              data-testid="search-input"
              className="placeholder:opacity-0 sm:placeholder:opacity-100"
              aria-label="Buscar"
            />
          </div>
          
          <div>
            <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
              Mes
            </Label>
            <Select
              value={filters.month}
              onValueChange={(value) => onFiltersChange({ ...filters, month: value })}
            >
              <SelectTrigger data-testid="month-select">
                <SelectValue placeholder="Todos los meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
              Año
            </Label>
            <Select
              value={filters.year}
              onValueChange={(value) => onFiltersChange({ ...filters, year: value })}
            >
              <SelectTrigger data-testid="year-select">
                <SelectValue placeholder="Todos los años" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
              Propietario
            </Label>
            <Select
              value={filters.user}
              onValueChange={(value) => onFiltersChange({ ...filters, user: value })}
            >
              <SelectTrigger data-testid="user-filter-select">
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
            <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
              Tipo
            </Label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
            >
              <SelectTrigger data-testid="type-filter-select">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
          <Button onClick={onApplyFilters} data-testid="apply-filters" className="w-full sm:w-auto">
            Aplicar Filtros
          </Button>
          <Button variant="secondary" onClick={onClearFilters} data-testid="clear-filters" className="w-full sm:w-auto">
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

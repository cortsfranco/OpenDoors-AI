import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, TrendingUp, ChevronDown, X } from "lucide-react";
import { format, subDays, subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AdvancedDateRangePickerProps {
  onChange: (range: DateRange) => void;
  value?: DateRange;
  placeholder?: string;
  showPresets?: boolean;
  showFiscalPeriods?: boolean;
  className?: string;
}

const PRESET_RANGES = [
  {
    label: "Hoy",
    value: "today",
    range: () => ({ from: new Date(), to: new Date() }),
    icon: Clock,
  },
  {
    label: "Últimos 7 días",
    value: "last7days",
    range: () => ({ from: subDays(new Date(), 6), to: new Date() }),
    icon: CalendarDays,
  },
  {
    label: "Últimos 30 días",
    value: "last30days",
    range: () => ({ from: subDays(new Date(), 29), to: new Date() }),
    icon: TrendingUp,
  },
  {
    label: "Este mes",
    value: "thisMonth",
    range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    icon: CalendarDays,
  },
  {
    label: "Mes anterior",
    value: "lastMonth",
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
    icon: CalendarDays,
  },
  {
    label: "Último trimestre",
    value: "lastQuarter",
    range: () => {
      const lastQuarter = subQuarters(new Date(), 1);
      return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
    },
    icon: TrendingUp,
  },
  {
    label: "Este año",
    value: "thisYear",
    range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
    icon: CalendarDays,
  },
  {
    label: "Año anterior", 
    value: "lastYear",
    range: () => {
      const lastYear = subYears(new Date(), 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    },
    icon: CalendarDays,
  },
];

// Períodos fiscales argentinos (Mayo-Abril)
const FISCAL_PERIODS = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-indexed to 1-indexed
  
  const periods = [];
  
  // Determinar el año fiscal actual
  const fiscalYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  
  // Generar períodos fiscales (últimos 5 años)
  for (let i = 0; i < 5; i++) {
    const year = fiscalYear - i;
    periods.push({
      label: `Período Fiscal ${year}-${year + 1}`,
      value: `fiscal-${year}`,
      range: () => ({
        from: new Date(year, 4, 1), // Mayo (month 4, 0-indexed)
        to: new Date(year + 1, 3, 30), // Abril (month 3, 0-indexed)
      }),
      description: `Mayo ${year} - Abril ${year + 1}`,
      isCurrent: i === 0,
    });
  }
  
  return periods;
};

export default function AdvancedDateRangePicker({
  onChange,
  value,
  placeholder = "Seleccionar período",
  showPresets = true,
  showFiscalPeriods = true,
  className,
}: AdvancedDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(value);
  const [activeTab, setActiveTab] = useState<'presets' | 'calendar' | 'fiscal'>('presets');
  
  // Mobile detection - simple and reliable
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setSelectedRange(value);
  }, [value]);

  const handleRangeSelect = (range: DateRange) => {
    setSelectedRange(range);
    onChange(range);
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.range();
    handleRangeSelect(range);
  };

  const handleFiscalPeriodSelect = (period: ReturnType<typeof FISCAL_PERIODS>[0]) => {
    const range = period.range();
    handleRangeSelect(range);
  };

  const clearSelection = () => {
    setSelectedRange(undefined);
    onChange({ from: undefined, to: undefined });
  };

  const formatDisplayText = () => {
    if (!selectedRange?.from) return placeholder;
    
    if (!selectedRange.to || selectedRange.from.getTime() === selectedRange.to.getTime()) {
      return format(selectedRange.from, "PPP", { locale: es });
    }
    
    return `${format(selectedRange.from, "PPP", { locale: es })} - ${format(selectedRange.to, "PPP", { locale: es })}`;
  };

  const fiscalPeriods = FISCAL_PERIODS();
  
  // Shared button trigger
  const TriggerButton = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-between text-left font-normal",
        !selectedRange?.from && "text-muted-foreground"
      )}
      data-testid="advanced-date-range-picker"
    >
      <span className="flex items-center min-w-0 flex-1">
        <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">{formatDisplayText()}</span>
      </span>
      <div className="flex items-center">
        {selectedRange?.from && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 mr-2 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </Button>
  );
  
  // Shared content component
  const DateRangeContent = ({ onClose }: { onClose: () => void }) => (
    <div className="flex flex-col space-y-0 max-h-[80vh] overflow-y-auto">
      {/* Mobile: Tabs row */}
      <div className="flex sm:hidden border-b bg-muted/20">
        {showPresets && (
          <Button
            variant={activeTab === 'presets' ? 'default' : 'ghost'}
            className="flex-1 justify-center text-xs h-10"
            onClick={() => setActiveTab('presets')}
          >
            <Clock className="mr-1 h-3 w-3" />
            Períodos
          </Button>
        )}
        <Button
          variant={activeTab === 'calendar' ? 'default' : 'ghost'}
          className="flex-1 justify-center text-xs h-10"
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarDays className="mr-1 h-3 w-3" />
          Calendario
        </Button>
        {showFiscalPeriods && (
          <Button
            variant={activeTab === 'fiscal' ? 'default' : 'ghost'}
            className="flex-1 justify-center text-xs h-10"
            onClick={() => setActiveTab('fiscal')}
          >
            <TrendingUp className="mr-1 h-3 w-3" />
            Fiscal
          </Button>
        )}
      </div>

      {/* Desktop: Side by side layout */}
      <div className="flex flex-col sm:flex-row">
        {/* Sidebar with tabs - hidden on mobile */}
        <div className="hidden sm:block w-48 border-r p-4 space-y-2">
        {showPresets && (
          <Button
            variant={activeTab === 'presets' ? 'default' : 'ghost'}
            className="w-full justify-start text-sm"
            onClick={() => setActiveTab('presets')}
          >
            <Clock className="mr-2 h-4 w-4" />
            Períodos
          </Button>
        )}
        
        <Button
          variant={activeTab === 'calendar' ? 'default' : 'ghost'}
          className="w-full justify-start text-sm"
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Personalizado
        </Button>
        
        {showFiscalPeriods && (
          <Button
            variant={activeTab === 'fiscal' ? 'default' : 'ghost'}
            className="w-full justify-start text-sm"
            onClick={() => setActiveTab('fiscal')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Fiscal AFIP
          </Button>
        )}
        </div>

        {/* Content area - Mobile and Desktop */}
        <div className="p-3 sm:p-4 min-w-0 flex-1">
        {activeTab === 'presets' && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">Períodos predefinidos</h4>
            <div className="grid gap-2">
              {PRESET_RANGES.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Button
                    key={preset.value}
                    variant="ghost"
                    className="justify-start text-sm h-auto p-2"
                    onClick={() => {
                      handlePresetSelect(preset);
                      onClose();
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Seleccionar rango personalizado</h4>
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={{ from: selectedRange?.from, to: selectedRange?.to }}
              onSelect={(range) => {
                if (range?.from) {
                  if (range.from && range.to) {
                    // Both dates selected - complete range
                    const newRange = { from: range.from, to: range.to };
                    setSelectedRange(newRange);
                    onChange(newRange);
                    onClose();
                  } else {
                    // Only first date selected - keep picker open
                    setSelectedRange({ from: range.from, to: undefined });
                  }
                }
              }}
              locale={es}
              numberOfMonths={isMobile ? 1 : 2}
              className="w-full"
            />
          </div>
        )}

        {activeTab === 'fiscal' && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">Períodos fiscales AFIP</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Ejercicios fiscales argentinos (Mayo - Abril)
            </p>
            <div className="space-y-2">
              {fiscalPeriods.map((period) => (
                <Card 
                  key={period.value} 
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    period.isCurrent && "border-primary bg-primary/5"
                  )}
                  onClick={() => {
                    handleFiscalPeriodSelect(period);
                    onClose();
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{period.label}</p>
                        <p className="text-xs text-muted-foreground">{period.description}</p>
                      </div>
                      {period.isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Actual
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Footer */}
      <Separator />
      <div className="p-4 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {selectedRange?.from ? (
            selectedRange.to && selectedRange.from.getTime() !== selectedRange.to.getTime() ? (
              `${format(selectedRange.from, "dd/MM/yyyy", { locale: es })} - ${format(selectedRange.to, "dd/MM/yyyy", { locale: es })}`
            ) : (
              format(selectedRange.from, "dd/MM/yyyy", { locale: es })
            )
          ) : (
            "Ningún período seleccionado"
          )}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("grid gap-2", className)}>
      {isMobile ? (
        // Mobile: Use Sheet for bottom-sheet pattern
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            {TriggerButton}
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="h-[80vh] p-0"
            data-testid="date-range-sheet"
          >
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle>Seleccionar Período</SheetTitle>
            </SheetHeader>
            <DateRangeContent onClose={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        // Desktop: Keep Popover
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            {TriggerButton}
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto max-w-[90vw] p-0 mx-2 sm:mx-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg" 
            align="start" 
            data-testid="date-range-popover" 
            sideOffset={4} 
            collisionPadding={8}
          >
            <DateRangeContent onClose={() => setIsOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
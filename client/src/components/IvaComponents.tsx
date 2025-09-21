import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Calculator, Info } from "lucide-react";
import { formatCurrencyWithDecimals, formatCurrencyWithConfig } from "@/lib/utils";
import type { IvaComponent } from "@shared/schema";

interface IvaComponentsProps {
  invoiceId: string;
  totalAmount: number;
  currentIvaAmount: number;
  editable?: boolean;
}

export function IvaComponents({
  invoiceId,
  totalAmount,
  currentIvaAmount,
  editable = true,
}: IvaComponentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [components, setComponents] = useState<
    Array<{ description: string; percentage: number; amount: number }>
  >([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Check if user has permission to edit
  const canEdit = editable && user && (user.role === 'admin' || user.role === 'editor');

  // Fetch existing IVA components - always enabled for read-only indicator
  const { data: existingComponents, isLoading } = useQuery<IvaComponent[]>({
    queryKey: [`/api/invoices/${invoiceId}/iva-components`],
    enabled: true, // Always fetch to show indicator
  });

  // Update components when data is loaded
  useEffect(() => {
    if (isOpen && existingComponents) {
      if (existingComponents.length > 0) {
        setComponents(
          existingComponents.map((c) => ({
            description: c.description,
            percentage: Number(c.percentage),
            amount: Number(c.amount),
          }))
        );
      } else {
        // Default to a single component with current IVA
        setComponents([
          {
            description: "IVA 21%",
            percentage: 21,
            amount: currentIvaAmount,
          },
        ]);
      }
    }
  }, [isOpen, existingComponents, currentIvaAmount]);

  // When dialog opens
  const handleDialogOpen = () => {
    setIsOpen(true);
  };

  // Add new component
  const addComponent = () => {
    setComponents([
      ...components,
      {
        description: "",
        percentage: 0,
        amount: 0,
      },
    ]);
  };

  // Remove component
  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  // Update component
  const updateComponent = (
    index: number,
    field: keyof (typeof components)[0],
    value: string | number
  ) => {
    const updated = [...components];
    if (field === "percentage" || field === "amount") {
      const numValue = parseFloat(value as string) || 0;
      updated[index][field] = numValue;
      
      // Auto-calculate amount from percentage or percentage from amount
      if (field === "percentage") {
        updated[index].amount = (totalAmount * numValue) / 100;
      } else if (field === "amount" && totalAmount > 0) {
        updated[index].percentage = (numValue * 100) / totalAmount;
      }
    } else {
      updated[index][field] = value as string;
    }
    setComponents(updated);
  };

  // Save IVA components
  const saveMutation = useMutation({
    mutationFn: async () => {
      // First delete existing components
      await apiRequest(`/api/invoices/${invoiceId}/iva-components`, "DELETE");
      
      // Then create new ones
      for (const component of components) {
        if (component.amount > 0) {
          await apiRequest(`/api/invoices/${invoiceId}/iva-components`, "POST", {
            description: component.description || `IVA ${component.percentage}%`,
            percentage: component.percentage,
            amount: component.amount,
          });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Componentes IVA actualizados",
        description: "Los componentes de IVA se guardaron correctamente",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/iva-components`] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los componentes de IVA",
        variant: "destructive",
      });
      console.error("Error saving IVA components:", error);
    },
  });

  const totalIva = components.reduce((sum, c) => sum + c.amount, 0);
  const difference = Math.abs(totalIva - currentIvaAmount);
  const isValid = totalIva > 0 && 
                 components.every(c => c.description) && 
                 difference < 0.01; // Allow 1 cent tolerance

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2" data-testid="iva-amount-display">
        <span className="text-sm">{formatCurrencyWithConfig(currentIvaAmount, user || undefined)}</span>
        {existingComponents && existingComponents.length > 1 && (
          <span title="Múltiples componentes IVA">
            <Info className="w-4 h-4 text-muted-foreground" />
          </span>
        )}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDialogOpen}
          className="text-sm hover:bg-accent/50"
          data-testid="iva-components-button"
        >
          <Calculator className="w-4 h-4 mr-1" />
          {formatCurrencyWithConfig(currentIvaAmount, user || undefined)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>Componentes de IVA Gradual</DialogTitle>
          <DialogDescription>
            Configure los diferentes componentes de IVA para esta factura. Puede agregar múltiples alícuotas o pagos parciales.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div>Cargando componentes...</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="text-sm text-muted-foreground">Total Factura:</div>
                <div className="text-sm font-medium">{formatCurrencyWithConfig(totalAmount, user || undefined)}</div>
                <div></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm text-muted-foreground">IVA Total Actual:</div>
                <div className="text-sm font-medium">{formatCurrencyWithConfig(currentIvaAmount, user || undefined)}</div>
                <div></div>
              </div>
            </div>

            <div className="space-y-3">
              {components.map((component, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg"
                  data-testid={`iva-component-${index}`}
                >
                  <div className="col-span-5">
                    <Label htmlFor={`desc-${index}`}>Descripción</Label>
                    <Input
                      id={`desc-${index}`}
                      placeholder="Ej: IVA 21%, IVA 10.5%, Percepción"
                      value={component.description}
                      onChange={(e) => updateComponent(index, "description", e.target.value)}
                      data-testid={`iva-description-${index}`}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor={`perc-${index}`}>Porcentaje</Label>
                    <Input
                      id={`perc-${index}`}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={component.percentage}
                      onChange={(e) => updateComponent(index, "percentage", e.target.value)}
                      data-testid={`iva-percentage-${index}`}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor={`amount-${index}`}>Monto</Label>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={component.amount}
                      onChange={(e) => updateComponent(index, "amount", e.target.value)}
                      data-testid={`iva-amount-${index}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeComponent(index)}
                      disabled={components.length === 1}
                      data-testid={`remove-component-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addComponent}
              className="w-full"
              data-testid="add-component"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Componente
            </Button>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total IVA Configurado:</span>
                <span className={`font-bold text-lg ${
                  difference < 0.01 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrencyWithConfig(totalIva, user || undefined)}
                </span>
              </div>
              {difference >= 0.01 && (
                <div className="space-y-2 mt-2">
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ El total debe coincidir con el IVA de la factura
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Diferencia: {formatCurrencyWithConfig(difference, user || undefined)} 
                    (IVA actual: {formatCurrencyWithConfig(currentIvaAmount, user || undefined)})
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                data-testid="cancel-button"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!isValid || saveMutation.isPending}
                data-testid="save-components"
              >
                {saveMutation.isPending ? "Guardando..." : "Guardar Componentes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
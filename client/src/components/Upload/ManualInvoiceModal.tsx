import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { AFIPValidations } from "@/lib/validations";
import type { InsertInvoice } from "@shared/schema";

interface ManualInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadedByName: string;
  selectedOwner: string;
  customOwner: string;
  onOwnerChange: (owner: string) => void;
  onCustomOwnerChange: (custom: string) => void;
}

export default function ManualInvoiceModal({ open, onOpenChange, uploadedByName, selectedOwner, customOwner, onOwnerChange, onCustomOwnerChange }: ManualInvoiceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createInvoiceMutation = useCreateInvoice();
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    invoiceClass: 'A' as 'A' | 'B' | 'C',
    invoiceNumber: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    clientProviderName: '',
    clientProviderCuit: '',
    subtotal: '',
    ivaAmount: '',
    totalAmount: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientProviderName || !formData.totalAmount) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa los campos obligatorios",
        variant: "default",
      });
      return;
    }

    try {
      // Create invoice data object
      const invoiceData = {
        type: formData.type,
        invoiceClass: formData.invoiceClass,
        invoiceNumber: formData.invoiceNumber || null,
        description: formData.description || null,
        date: new Date(formData.date),
        clientProviderName: formData.clientProviderName,
        clientProviderCuit: formData.clientProviderCuit || null,
        subtotal: formData.subtotal || formData.totalAmount,
        ivaAmount: formData.ivaAmount || '0',
        totalAmount: formData.totalAmount,
        uploadedBy: user?.id || '',
        uploadedByName: user?.displayName || 'Unknown User',
        ownerName: selectedOwner === 'Otro' && customOwner ? customOwner : selectedOwner,
        filePath: null,
        processed: true,
      };

      // Create FormData for API call
      const formDataApi = new FormData();
      formDataApi.append('manualEntry', 'true');
      formDataApi.append('invoiceData', JSON.stringify(invoiceData));
      formDataApi.append('uploadedBy', user?.id || '');
      formDataApi.append('uploadedByName', user?.displayName || 'Unknown User');
      formDataApi.append('ownerName', selectedOwner === 'Otro' && customOwner ? customOwner : selectedOwner);

      await createInvoiceMutation.mutateAsync(formDataApi);

      toast({
        title: "Factura creada",
        description: "La factura se guardó correctamente",
        className: "bg-green-500 text-white border-green-600",
      });

      onOpenChange(false);
      
      // Reset form
      setFormData({
        type: 'income',
        invoiceClass: 'A',
        invoiceNumber: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        clientProviderName: '',
        clientProviderCuit: '',
        subtotal: '',
        ivaAmount: '',
        totalAmount: '',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la factura",
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const iva = parseFloat(formData.ivaAmount) || 0;
    const total = subtotal + iva;
    setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto" data-testid="manual-invoice-modal">
        <DialogHeader>
          <DialogTitle>Cargar Factura Manualmente</DialogTitle>
          <DialogDescription>
            Ingresa los datos de la factura sin necesidad de subir un archivo
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Row 1: Type and Owner Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="type" className="text-sm font-medium">Categoría de Operación *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="type" data-testid="type-select" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="owner" className="text-sm font-medium">Propietario de la Factura *</Label>
              <Select value={selectedOwner} onValueChange={onOwnerChange}>
                <SelectTrigger id="owner" data-testid="owner-select" className="h-10">
                  <SelectValue placeholder="Seleccionar propietario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Joni">Joni</SelectItem>
                  <SelectItem value="Hernán">Hernán</SelectItem>
                  <SelectItem value="Otro">Otro (especificar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Owner */}
          {selectedOwner === 'Otro' && (
            <div>
              <Label htmlFor="customOwner" className="text-sm font-medium">Nombre del propietario</Label>
              <Input
                id="customOwner"
                type="text"
                value={customOwner}
                onChange={(e) => onCustomOwnerChange(e.target.value)}
                placeholder="Ingrese el nombre del propietario"
                className="h-10"
                data-testid="custom-owner-input"
              />
            </div>
          )}

          {/* Row 2: Invoice Number and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="invoiceNumber" className="text-sm font-medium">Número de Factura</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="0001-00012345"
                className="h-10"
                data-testid="invoice-number-input"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Fecha de Emisión *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="h-10"
                required
                data-testid="date-input"
              />
            </div>
          </div>

          {/* Row 2.5: Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">Detalle (Producto/Servicio)</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del producto o servicio"
              className="h-10"
              data-testid="description-input"
            />
          </div>

          {/* Row 3: Client/Provider and CUIT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="clientProviderName" className="text-sm font-medium">Cliente/Proveedor *</Label>
              <Input
                id="clientProviderName"
                value={formData.clientProviderName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientProviderName: e.target.value }))}
                placeholder="Nombre del cliente o proveedor"
                className="h-10"
                required
                data-testid="client-provider-input"
              />
            </div>
            <div>
              <Label htmlFor="clientProviderCuit" className="text-sm font-medium">CUIT</Label>
              <Input
                id="clientProviderCuit"
                value={formData.clientProviderCuit}
                onChange={(e) => setFormData(prev => ({ ...prev, clientProviderCuit: e.target.value }))}
                placeholder="20-12345678-9"
                className="h-10"
                data-testid="cuit-input"
              />
            </div>
          </div>

          {/* Invoice Class */}
          <div>
            <Label htmlFor="invoiceClass" className="text-sm font-medium">Tipo de Factura *</Label>
            <Select
              value={formData.invoiceClass || 'A'}
              onValueChange={(value: 'A' | 'B' | 'C') => 
                setFormData(prev => ({ ...prev, invoiceClass: value }))
              }
            >
              <SelectTrigger id="invoiceClass" data-testid="invoice-class-select" className="h-10">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Factura A - Responsable Inscripto</SelectItem>
                <SelectItem value="B">Factura B - Consumidor Final</SelectItem>
                <SelectItem value="C">Factura C - Monotributista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 4: Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="subtotal" className="text-sm font-medium">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData(prev => ({ ...prev, subtotal: e.target.value }))}
                onBlur={calculateTotal}
                placeholder="0.00"
                className="h-10"
                data-testid="subtotal-input"
              />
            </div>
            <div>
              <Label htmlFor="ivaAmount" className="text-sm font-medium">IVA</Label>
              <Input
                id="ivaAmount"
                type="number"
                step="0.01"
                value={formData.ivaAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, ivaAmount: e.target.value }))}
                onBlur={calculateTotal}
                placeholder="0.00"
                className="h-10"
                data-testid="iva-input"
              />
            </div>
            <div>
              <Label htmlFor="totalAmount" className="text-sm font-medium">Total *</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                placeholder="0.00"
                className="h-10 font-semibold"
                required
                data-testid="total-input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10"
              data-testid="cancel-button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="w-full sm:w-auto h-10"
              data-testid="save-button"
            >
              {createInvoiceMutation.isPending ? "Guardando..." : "Guardar Factura"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateInvoice } from "@/hooks/useInvoices";
import { formatDate } from "@/lib/utils";
import { Calendar, FileText, DollarSign, User, Hash } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations | null;
}

export default function EditInvoiceModal({ isOpen, onClose, invoice }: EditInvoiceModalProps) {
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense' | 'neutral',
    invoiceClass: 'A' as 'A' | 'B' | 'C',
    date: '',
    clientProviderName: '',
    description: '',
    subtotal: '',
    ivaAmount: '',
    totalAmount: '',
    invoiceNumber: '',
    uploadedByName: '',
    ownerName: '',
  });
  const [customOwner, setCustomOwner] = useState('');
  const [customUploadedBy, setCustomUploadedBy] = useState('');

  const updateInvoiceMutation = useUpdateInvoice();

  useEffect(() => {
    if (invoice) {
      const isCustomOwner = invoice.ownerName && !['Joni', 'Hernán'].includes(invoice.ownerName);
      const isCustomUploadedBy = invoice.uploadedByName && !['Joni Tagua', 'Hernán Pagani'].includes(invoice.uploadedByName);
      
      setFormData({
        type: invoice.type,
        invoiceClass: (invoice as any).invoiceClass || 'A',
        date: formatDate(invoice.date),
        clientProviderName: invoice.clientProviderName,
        description: (invoice as any).description || '',
        subtotal: invoice.subtotal,
        ivaAmount: invoice.ivaAmount,
        totalAmount: invoice.totalAmount,
        invoiceNumber: invoice.invoiceNumber || '',
        uploadedByName: isCustomUploadedBy ? 'Otro' : (invoice.uploadedByName || ''),
        ownerName: isCustomOwner ? 'Otro' : (invoice.ownerName || 'Joni'),
      });
      
      if (isCustomOwner) {
        setCustomOwner(invoice.ownerName || '');
      }
      if (isCustomUploadedBy) {
        setCustomUploadedBy(invoice.uploadedByName || '');
      }
    }
  }, [invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: {
          ...formData,
          date: new Date(formData.date).toISOString(),
          ownerName: formData.ownerName === 'Otro' ? customOwner : formData.ownerName,
          uploadedByName: formData.uploadedByName === 'Otro' ? customUploadedBy : formData.uploadedByName,
        },
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    onClose();
    if (invoice) {
      const isCustomOwner = invoice.ownerName && !['Joni', 'Hernán'].includes(invoice.ownerName);
      const isCustomUploadedBy = invoice.uploadedByName && !['Joni Tagua', 'Hernán Pagani'].includes(invoice.uploadedByName);
      
      setFormData({
        type: invoice.type,
        invoiceClass: (invoice as any).invoiceClass || 'A',
        date: formatDate(invoice.date),
        clientProviderName: invoice.clientProviderName,
        description: (invoice as any).description || '',
        subtotal: invoice.subtotal,
        ivaAmount: invoice.ivaAmount,
        totalAmount: invoice.totalAmount,
        invoiceNumber: invoice.invoiceNumber || '',
        uploadedByName: isCustomUploadedBy ? 'Otro' : (invoice.uploadedByName || ''),
        ownerName: isCustomOwner ? 'Otro' : (invoice.ownerName || 'Joni'),
      });
      
      setCustomOwner(isCustomOwner ? (invoice.ownerName || '') : '');
      setCustomUploadedBy(isCustomUploadedBy ? (invoice.uploadedByName || '') : '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-2xl mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto p-0 gap-0" data-testid="edit-invoice-modal">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Editar Factura
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Invoice Type Section */}
          <div className="dialog-form-section">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Información Básica</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="form-field">
                <Label htmlFor="type">Categoría de Operación</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense' | 'neutral') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger data-testid="edit-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Egreso</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="form-field">
                <Label htmlFor="invoiceClass">Tipo de Factura</Label>
                <Select
                  value={formData.invoiceClass}
                  onValueChange={(value: 'A' | 'B' | 'C') => 
                    setFormData({ ...formData, invoiceClass: value })
                  }
                >
                  <SelectTrigger data-testid="edit-invoice-class-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Factura A - Responsable Inscripto</SelectItem>
                    <SelectItem value="B">Factura B - Consumidor Final</SelectItem>
                    <SelectItem value="C">Factura C - Monotributista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="dialog-form-section">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Detalles de la Factura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="form-field">
                <Label htmlFor="date" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fecha
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="edit-date-input"
                  required
                />
              </div>
              
              <div className="form-field">
                <Label htmlFor="invoiceNumber" className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Número de Factura
                </Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  data-testid="edit-invoice-number-input"
                  placeholder="0000-00000000"
                />
              </div>
            </div>
            
            <div className="form-field mt-4">
              <Label htmlFor="clientProviderName">Cliente/Proveedor</Label>
              <Input
                id="clientProviderName"
                value={formData.clientProviderName}
                onChange={(e) => setFormData({ ...formData, clientProviderName: e.target.value })}
                data-testid="edit-client-input"
                placeholder="Nombre del cliente o proveedor"
                required
              />
            </div>
            
            <div className="form-field mt-4">
              <Label htmlFor="description">Detalle (Producto/Servicio)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="edit-description-input"
                placeholder="Descripción del producto o servicio"
              />
            </div>
          </div>

          {/* Financial Section */}
          <div className="dialog-form-section">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Valores
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="form-field">
                <Label htmlFor="subtotal">Subtotal</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                  data-testid="edit-subtotal-input"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="form-field">
                <Label htmlFor="ivaAmount">IVA</Label>
                <Input
                  id="ivaAmount"
                  type="number"
                  step="0.01"
                  value={formData.ivaAmount}
                  onChange={(e) => setFormData({ ...formData, ivaAmount: e.target.value })}
                  data-testid="edit-iva-input"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="form-field">
                <Label htmlFor="totalAmount">Total</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  data-testid="edit-total-input"
                  placeholder="0.00"
                  className="font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Ownership Section */}
          <div className="dialog-form-section">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
              <User className="w-4 h-4" />
              Asignación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="ownerName" className="text-sm font-medium">Propietario (Socio de OpenDoors)</Label>
                <Select
                  value={formData.ownerName}
                  onValueChange={(value) => setFormData({ ...formData, ownerName: value })}
                >
                  <SelectTrigger data-testid="edit-owner-select">
                    <SelectValue placeholder="Seleccionar propietario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Joni">Joni</SelectItem>
                    <SelectItem value="Hernán">Hernán</SelectItem>
                    <SelectItem value="Otro">Otro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.ownerName === 'Otro' && (
                  <Input
                    className="mt-2"
                    type="text"
                    placeholder="Ingrese nombre del propietario"
                    value={customOwner}
                    onChange={(e) => setCustomOwner(e.target.value)}
                    data-testid="edit-custom-owner-input"
                    required
                  />
                )}
              </div>

              <div className="form-field">
                <Label htmlFor="uploadedByName">Usuario que cargó</Label>
                <Select
                  value={formData.uploadedByName}
                  onValueChange={(value) => setFormData({ ...formData, uploadedByName: value })}
                >
                  <SelectTrigger data-testid="edit-uploaded-by-select">
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Joni Tagua">Joni Tagua</SelectItem>
                    <SelectItem value="Hernán Pagani">Hernán Pagani</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {formData.uploadedByName === 'Otro' && (
                  <Input
                    className="mt-2"
                    type="text"
                    placeholder="Ingrese nombre del usuario"
                    value={customUploadedBy}
                    onChange={(e) => setCustomUploadedBy(e.target.value)}
                    data-testid="edit-other-user-input"
                    required
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto h-10"
              data-testid="cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateInvoiceMutation.isPending}
              className="w-full sm:w-auto h-10"
              data-testid="save-invoice"
            >
              {updateInvoiceMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
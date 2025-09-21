import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, User, Calendar, DollarSign, Receipt, TrendingUp, TrendingDown, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Invoice } from "@shared/schema";

interface InvoiceSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onInvoiceUpdate?: (updatedInvoice: Invoice) => void;
}

export default function InvoiceSummaryModal({ open, onOpenChange, invoice, onInvoiceUpdate }: InvoiceSummaryModalProps) {
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: open && isEditingClient,
  });

  const updateInvoiceClientMutation = useMutation({
    mutationFn: async ({ invoiceId, clientProviderId, clientProviderName }: any) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientProviderId, clientProviderName }),
      });
      if (!response.ok) throw new Error('Error al actualizar');
      return response.json();
    },
    onSuccess: (updatedInvoice: Invoice) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsEditingClient(false);
      if (onInvoiceUpdate && updatedInvoice) {
        onInvoiceUpdate(updatedInvoice);
      }
      // Actualizar también el nombre localmente
      if (updatedInvoice) {
        setNewClientName(updatedInvoice.clientProviderName);
      }
    },
  });

  useEffect(() => {
    if (invoice) {
      setSelectedClientId(invoice.clientProviderId || '');
      setNewClientName(invoice.clientProviderName);
    }
  }, [invoice]);
  
  if (!invoice) return null;
  
  const handleSaveClient = () => {
    updateInvoiceClientMutation.mutate({
      invoiceId: invoice.id,
      clientProviderId: selectedClientId || null,
      clientProviderName: newClientName,
    });
  };

  const isIncome = invoice.type === 'income';
  // Formatear en Pesos Argentinos con locale es-AR
  const formattedTotal = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(parseFloat(invoice.totalAmount));
  
  const formattedSubtotal = new Intl.NumberFormat('es-AR', {
    style: 'currency', 
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(parseFloat(invoice.subtotal));
  
  const formattedIva = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', 
    minimumFractionDigits: 2
  }).format(parseFloat(invoice.ivaAmount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`w-[95vw] max-w-md sm:max-w-2xl mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-2 shadow-xl ${
          isIncome 
            ? 'border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-900' 
            : 'border-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-900'
        }`} 
        data-testid="invoice-summary-modal"
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">¡Factura Procesada Exitosamente!</DialogTitle>
              <DialogDescription>
                Los datos han sido extraídos y guardados automáticamente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <div className={`rounded-lg p-4 space-y-4 border ${
            isIncome
              ? 'bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resumen de Factura
              </h3>
              <Badge 
                variant={isIncome ? "default" : "secondary"}
                className={isIncome ? "bg-income text-income-foreground" : "bg-expense text-expense-foreground"}
                data-testid={`badge-${invoice.type}`}
              >
                {isIncome ? (
                  <>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    INGRESO
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 mr-1" />
                    EGRESO
                  </>
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  Número de Factura
                </div>
                <p className="font-medium" data-testid="text-invoice-number">
                  {invoice.invoiceNumber || 'No especificado'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Fecha
                </div>
                <p className="font-medium" data-testid="text-invoice-date">
                  {invoice.date ? new Date(invoice.date).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  }) : 'No especificado'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  {isIncome ? 'Factura Emitida Para' : 'Factura Recibida De'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingClient(!isEditingClient)}
                  data-testid="edit-client-button"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
              {!isEditingClient ? (
                <p className="font-medium text-lg" data-testid="text-client-provider">
                  {newClientName}
                </p>
              ) : (
                <div className="space-y-2">
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger data-testid="client-select">
                      <SelectValue placeholder="Seleccionar de la lista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ninguno (entrada manual)</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.type === 'client' ? 'Cliente' : client.type === 'provider' ? 'Proveedor' : 'Ambos'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedClientId && (
                    <Input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Nombre del cliente/proveedor"
                      data-testid="client-name-input"
                    />
                  )}
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingClient(false);
                        setSelectedClientId(invoice.clientProviderId || '');
                        setNewClientName(invoice.clientProviderName);
                      }}
                      className="w-full sm:w-auto h-10"
                      data-testid="cancel-edit-button"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveClient}
                      disabled={updateInvoiceClientMutation.isPending}
                      className="w-full sm:w-auto h-10"
                      data-testid="save-client-button"
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desglose Financiero */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Desglose Financiero
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium" data-testid="text-subtotal">{formattedSubtotal}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">IVA:</span>
                <span className="font-medium" data-testid="text-iva">{formattedIva}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span 
                  className={`text-2xl font-bold ${isIncome ? 'text-income' : 'text-expense'}`}
                  data-testid="text-total"
                >
                  {formattedTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Información de Carga */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cargado por:</span>
              <span className="font-medium" data-testid="text-uploaded-by">{invoice.uploadedByName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Archivo:</span>
              <span className="font-medium" data-testid="text-filename">{invoice.fileName || 'Sin archivo'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Procesada el:</span>
              <span className="font-medium" data-testid="text-upload-date">
                {new Date(invoice.createdAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} 
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              data-testid="button-close"
            >
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
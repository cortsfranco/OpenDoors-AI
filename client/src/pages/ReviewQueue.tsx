import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Edit, 
  Save, 
  Trash2,
  X,
  Calendar,
  DollarSign,
  User,
  Hash,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Invoice } from "@shared/schema";

// Form schema for editing invoice
const invoiceEditSchema = z.object({
  invoiceNumber: z.string().min(1, "Número de factura es requerido"),
  date: z.string().min(1, "Fecha es requerida"),
  clientProviderName: z.string().min(1, "Cliente/Proveedor es requerido"),
  subtotal: z.string().min(1, "Subtotal es requerido"),
  ivaAmount: z.string().min(1, "Monto IVA es requerido"),
  totalAmount: z.string().min(1, "Total es requerido"),
  type: z.enum(['income', 'expense']),
  invoiceClass: z.enum(['A', 'B', 'C']),
});

type InvoiceEditForm = z.infer<typeof invoiceEditSchema>;

interface PendingInvoice extends Invoice {
  missingFields: string[];
}

export default function ReviewQueue() {
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingInvoices = [], isLoading, error } = useQuery<PendingInvoice[]>({
    queryKey: ['/api/invoices/pending-review'],
    refetchInterval: 10000,
    select: (data) => Array.isArray(data) ? data : [],
    onError: (error: any) => {
      toast({
        title: "Error al cargar facturas",
        description: error.message || "No se pudieron cargar las facturas pendientes",
        variant: "error",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InvoiceEditForm }) => {
      const submitData = {
        ...updates,
        subtotal: parseFloat(updates.subtotal),
        ivaAmount: parseFloat(updates.ivaAmount),
        totalAmount: parseFloat(updates.totalAmount),
      };

      return apiRequest(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(submitData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/pending-review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      toast({
        title: "Factura actualizada",
        description: "Los datos han sido guardados correctamente",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar la factura",
        variant: "error",
      });
    },
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/pending-review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      toast({
        title: "Factura aprobada",
        description: "La factura ha sido aprobada y añadida a los cálculos financieros",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al aprobar",
        description: error.message || "No se pudo aprobar la factura",
        variant: "error",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/pending-review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      toast({
        title: "Factura eliminada",
        description: "La factura ha sido eliminada correctamente",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la factura",
        variant: "error",
      });
    },
  });

  const form = useForm<InvoiceEditForm>({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: {
      invoiceNumber: "",
      date: "",
      clientProviderName: "",
      subtotal: "",
      ivaAmount: "",
      totalAmount: "",
      type: "expense",
      invoiceClass: "A",
    },
  });

  const handleEditInvoice = (invoice: PendingInvoice) => {
    setSelectedInvoice(invoice);
    form.reset({
      invoiceNumber: invoice.invoiceNumber || "",
      date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : "",
      clientProviderName: invoice.clientProviderName || "",
      subtotal: invoice.subtotal?.toString() || "",
      ivaAmount: invoice.ivaAmount?.toString() || "",
      totalAmount: invoice.totalAmount?.toString() || "",
      type: invoice.type,
      invoiceClass: invoice.invoiceClass,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveInvoice = (data: InvoiceEditForm) => {
    if (!selectedInvoice) return;
    updateInvoiceMutation.mutate({ id: selectedInvoice.id, updates: data });
  };

  const handleApproveInvoice = (invoiceId: string) => {
    approveInvoiceMutation.mutate(invoiceId);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    // Reemplazamos window.confirm por una solución que no bloquee
    if (confirm('¿Estás seguro de que quieres eliminar esta factura? Esta acción no se puede deshacer.')) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  const handleViewFile = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/file`, '_blank');
  };

  const getMissingFieldsDisplay = (invoice: PendingInvoice) => {
    const missing = [];
    if (!invoice.date) missing.push("Fecha");
    if (!invoice.totalAmount || parseFloat(invoice.totalAmount.toString()) <= 0) missing.push("Monto");
    if (!invoice.clientProviderName || invoice.clientProviderName === 'Cliente extraído por IA') missing.push("Cliente");
    if (!invoice.invoiceNumber || invoice.invoiceNumber.startsWith('INV-')) missing.push("N° Factura");
    return missing;
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$ 0,00";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-gray-500" />
          <h1 className="text-2xl font-bold text-gray-900">Cola de Revisión</h1>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="review-queue-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* =============================================================== */}
          {/* INICIO CORRECCIÓN 1: Icono de precaución eliminado del título   */}
          {/* =============================================================== */}
          <Clock className="w-6 h-6 text-gray-500" />
          <h1 className="text-2xl font-bold text-gray-900">Cola de Revisión</h1>
          {/* =============================================================== */}
          {/* FIN CORRECCIÓN 1                                              */}
          {/* =============================================================== */}
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {pendingInvoices.length} pendiente{pendingInvoices.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-900">Facturas Pendientes de Revisión</h3>
            <p className="text-sm text-amber-700 mt-1">
              Estas facturas requieren revisión manual antes de ser incluidas en los cálculos financieros. 
              Completa los datos faltantes y aprueba las facturas para que aparezcan en reportes y KPIs.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar facturas 
            </h3>
            <p className="text-gray-500 mb-4">
              No se pudieron cargar las facturas pendientes. Intenta nuevamente.
            </p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/invoices/pending-review'] })}
              data-testid="retry-loading-button"
            >
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      ) : pendingInvoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¡Todo al día! 
            </h3>
            <p className="text-gray-500">
              No hay facturas pendientes de revisión en este momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* =============================================================== */}
          {/* INICIO CORRECCIÓN 2: Padding añadido a CardContent            */}
          {/* =============================================================== */}
          <CardContent className="p-4 sm:p-6">
          {/* =============================================================== */}
          {/* FIN CORRECCIÓN 2                                              */}
          {/* =============================================================== */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Archivo</TableHead>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente/Proveedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((invoice: PendingInvoice) => {
                  const missingFields = getMissingFieldsDisplay(invoice);
                  
                  return (
                    <TableRow key={invoice.id} data-testid={`pending-invoice-${invoice.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" title={invoice.fileName}>
                              {invoice.fileName || 'Sin nombre'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.uploadedByName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {invoice.invoiceNumber && !invoice.invoiceNumber.startsWith('INV-') ? (
                            <span className="text-sm">{invoice.invoiceNumber}</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">❌ Faltante</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {invoice.date ? (
                          <span className="text-sm">{new Date(invoice.date).toLocaleDateString('es-ES')}</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">❌ Faltante</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="min-w-0">
                          {invoice.clientProviderName && invoice.clientProviderName !== 'Cliente extraído por IA' ? (
                            <span className="text-sm truncate" title={invoice.clientProviderName}>
                              {invoice.clientProviderName}
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">❌ Faltante</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={invoice.type === 'income' ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}
                        >
                          {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {invoice.totalAmount && parseFloat(invoice.totalAmount.toString()) > 0 ? (
                          <span className="text-sm font-medium">{formatCurrency(invoice.totalAmount)}</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">❌ Faltante</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {missingFields.length > 0 ? (
                            <span 
                              className="text-xs text-red-700 font-medium"
                              data-testid={`status-missing-count-${invoice.id}`}
                              title={missingFields.join(', ')}
                            >
                              {missingFields.length} campo{missingFields.length > 1 ? 's' : ''} faltante{missingFields.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span 
                              className="text-xs text-green-700 font-medium"
                              data-testid={`status-ready-${invoice.id}`}
                              title="Sin campos faltantes"
                            >
                              Listo para aprobar
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog 
                            open={isEditModalOpen && selectedInvoice?.id === invoice.id} 
                            onOpenChange={setIsEditModalOpen}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditInvoice(invoice)}
                                data-testid={`edit-invoice-${invoice.id}`}
                                title="Completar datos faltantes"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <FileText className="w-5 h-5" />
                                  Completar datos de factura
                                </DialogTitle>
                              </DialogHeader>
                              
                              <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSaveInvoice)} className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="invoiceNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>N° de Factura *</FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Ej: 0001-00000123" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="date"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Fecha *</FormLabel>
                                          <FormControl>
                                            <Input {...field} type="date" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name="clientProviderName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Cliente/Proveedor *</FormLabel>
                                        <FormControl>
                                          <Input {...field} placeholder="Nombre del cliente o proveedor" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="type"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Tipo *</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="income">Ingreso</SelectItem>
                                              <SelectItem value="expense">Egreso</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="invoiceClass"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Clase de Factura *</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar clase" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="A">Tipo A - Responsable Inscripto</SelectItem>
                                              <SelectItem value="B">Tipo B - Consumidor Final</SelectItem>
                                              <SelectItem value="C">Tipo C - Monotributista</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="subtotal"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Subtotal *</FormLabel>
                                          <FormControl>
                                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="ivaAmount"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>IVA *</FormLabel>
                                          <FormControl>
                                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="totalAmount"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Total *</FormLabel>
                                          <FormControl>
                                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  
                                  <div className="flex justify-end gap-2 pt-4">
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={() => setIsEditModalOpen(false)}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Cancelar
                                    </Button>
                                    <Button 
                                      type="submit" 
                                      disabled={updateInvoiceMutation.isPending}
                                      data-testid="save-invoice-button"
                                    >
                                      <Save className="w-4 h-4 mr-2" />
                                      {updateInvoiceMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewFile(invoice.id)}
                            data-testid={`view-file-${invoice.id}`}
                            title="Ver archivo original"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            variant="default" 
                            size="sm"
                            disabled={missingFields.length > 0 || approveInvoiceMutation.isPending}
                            onClick={() => handleApproveInvoice(invoice.id)}
                            data-testid={`approve-invoice-${invoice.id}`}
                            title={missingFields.length > 0 ? 'Complete los datos faltantes' : 'Aprobar factura'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="sm"
                            disabled={deleteInvoiceMutation.isPending}
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            data-testid={`delete-invoice-${invoice.id}`}
                            title="Eliminar factura permanentemente"
                            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                            aria-label="Eliminar factura"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
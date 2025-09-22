import * as React from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, ChevronLeft, ChevronRight, Eye, FileText, ArrowUpDown, ArrowUp, ArrowDown, Download, FileDown, CreditCard, ChevronDown, Clock, CheckCircle2, AlertCircle, XCircle, Mail, MessageSquare, Share2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatCurrency, formatCurrencyWithDecimals, formatCurrencyWithConfig, formatCUIT } from "@/lib/utils";
import { useDeleteInvoice } from "@/hooks/useInvoices";
import EditInvoiceModal from "@/components/Modals/EditInvoiceModal";
import DeleteConfirmModal from "@/components/Modals/DeleteConfirmModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PaymentStatus } from "@/components/PaymentStatus";
import { IvaComponents } from "@/components/IvaComponents";
import type { InvoiceWithRelations } from "@shared/schema";

interface InvoicesTableProps {
  invoices: InvoiceWithRelations[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  sortBy?: string;
  sortOrder?: string;
  onRefetch?: () => void;
}

export default function InvoicesTable({ 
  invoices, 
  total, 
  currentPage, 
  pageSize, 
  onPageChange,
  onSortChange,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onRefetch
}: InvoicesTableProps) {
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const deleteInvoiceMutation = useDeleteInvoice();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };
  
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelection = new Set(selectedInvoices);
    if (checked) {
      newSelection.add(invoiceId);
    } else {
      newSelection.delete(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };
  
  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };
  
  const confirmBulkDelete = async () => {
    if (selectedInvoices.size === 0 || !user) return;
    
    setIsBulkDeleting(true);
    const invoiceIds = Array.from(selectedInvoices);
    let successCount = 0;
    let failureCount = 0;
    
    try {
      for (const invoiceId of invoiceIds) {
        try {
          await deleteInvoiceMutation.mutateAsync({
            id: invoiceId,
            deletedBy: user.id,
            deletedByName: user.displayName,
          });
          successCount++;
        } catch (error) {
          failureCount++;
          console.error(`Failed to delete invoice ${invoiceId}:`, error);
        }
      }
      
      if (successCount > 0 && failureCount === 0) {
        toast({
          title: "Facturas eliminadas",
          description: `Se eliminaron ${successCount} factura${successCount > 1 ? 's' : ''} exitosamente`,
        });
      } else if (successCount > 0 && failureCount > 0) {
        toast({
          title: "Eliminación parcial",
          description: `Se eliminaron ${successCount} factura${successCount > 1 ? 's' : ''}, pero ${failureCount} no se pudo${failureCount > 1 ? 'ron' : ''} eliminar`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al eliminar",
          description: "No se pudieron eliminar las facturas seleccionadas",
          variant: "destructive",
        });
      }
      
      if (successCount > 0) {
        setSelectedInvoices(new Set());
      }
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar las facturas",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };
  
  const handleBulkExport = async () => {
    if (selectedInvoices.size === 0) return;
    
    try {
      const response = await fetch('/api/export/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices),
          format: 'excel'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facturas_seleccionadas_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setSelectedInvoices(new Set());
      }
    } catch (error) {
      console.error('Error exporting invoices:', error);
    }
  };
  
  const handleBulkDownloadFiles = async () => {
    if (selectedInvoices.size === 0) return;
    
    try {
      const response = await fetch('/api/download/bulk-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices)
        })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          alert(data.message || data.error);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const contentDisposition = response.headers.get('Content-Disposition');
          const filename = contentDisposition?.split('filename="')[1]?.split('"')[0] || 'factura.pdf';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Error downloading files:', error);
    }
  };
  
  const handleBulkPaymentStatus = async (status: 'pending' | 'paid' | 'overdue' | 'cancelled') => {
    if (selectedInvoices.size === 0) return;
    
    try {
      const response = await fetch('/api/invoices/bulk-payment-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoices),
          status
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Estado actualizado",
          description: `Se actualizó el estado de pago de ${result.updated} factura${result.updated > 1 ? 's' : ''}`,
        });
        
        setSelectedInvoices(new Set());
      } else {
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de pago",
        variant: "destructive",
      });
    }
  };
  
  const selectedTotals = invoices
    .filter(inv => selectedInvoices.has(inv.id))
    .reduce<{ total: number; iva: number; count: number }>(
      (acc, inv) => ({
        total: acc.total + parseFloat(inv.totalAmount),
        iva: acc.iva + parseFloat(inv.ivaAmount),
        count: acc.count + 1
      }),
      { total: 0, iva: 0, count: 0 }
    );
  
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);
  
  const handleSort = (field: string) => {
    if (!onSortChange) return;
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };
  
  const handleShareWhatsApp = (invoice: InvoiceWithRelations) => {
    const clientName = invoice.clientProviderName;
    const amount = formatCurrencyWithConfig(invoice.totalAmount, user || undefined);
    const date = formatDate(invoice.date);
    const invoiceNumber = invoice.invoiceNumber || 'sin número';
    const type = invoice.type === 'income' ? 'Factura emitida' : 'Factura recibida';
    
    const message = encodeURIComponent(
      `${type}\n` +
      `Cliente/Proveedor: ${clientName}\n` +
      `Número: ${invoiceNumber}\n` +
      `Fecha: ${date}\n` +
      `Monto: ${amount}\n` +
      `IVA: ${formatCurrencyWithDecimals(invoice.ivaAmount)}`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareEmail = (invoice: InvoiceWithRelations) => {
    const clientName = invoice.clientProviderName;
    const amount = formatCurrencyWithConfig(invoice.totalAmount, user || undefined);
    const date = formatDate(invoice.date);
    const invoiceNumber = invoice.invoiceNumber || 'sin número';
    const type = invoice.type === 'income' ? 'Factura emitida' : 'Factura recibida';
    
    const subject = encodeURIComponent(`${type} - ${clientName} - ${invoiceNumber}`);
    const body = encodeURIComponent(
      `Detalles de la factura:\n\n` +
      `Tipo: ${type}\n` +
      `Cliente/Proveedor: ${clientName}\n` +
      `Número: ${invoiceNumber}\n` +
      `Fecha: ${date}\n` +
      `Subtotal: ${formatCurrency(invoice.subtotal)}\n` +
      `IVA: ${formatCurrencyWithDecimals(invoice.ivaAmount)}\n` +
      `Total: ${amount}\n\n` +
      `Saludos cordiales,\nOpen Doors`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleViewFile = (invoice: InvoiceWithRelations) => {
    if (!invoice.filePath) return;
    const fileUrl = `${window.location.origin}/api/invoices/${invoice.id}/file`;
    const googleViewerUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`;
    window.open(googleViewerUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!deletingInvoice || !user) return;
    
    try {
      await deleteInvoiceMutation.mutateAsync({
        id: deletingInvoice.id,
        deletedBy: user.id,
        deletedByName: user.displayName,
      });
      setDeletingInvoice(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (invoices.length === 0) {
    return (
      <Card data-testid="invoices-table">
        <CardContent className="p-6 text-center text-muted-foreground">
          No se encontraron facturas con los filtros aplicados
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {selectedInvoices.size} factura{selectedInvoices.size > 1 ? 's' : ''} seleccionada{selectedInvoices.size > 1 ? 's' : ''}
              </span>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-clamp-1">{formatCurrencyWithConfig(selectedTotals.total, user || undefined)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">IVA:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-clamp-1">{formatCurrencyWithConfig(selectedTotals.iva, user || undefined)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto text-violet-600 dark:text-violet-400 border-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    data-testid="bulk-payment-status"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Estado de Pago</span>
                    <span className="sm:hidden">Estado</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => handleBulkPaymentStatus('pending')}
                    data-testid="bulk-status-pending"
                  >
                    <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                    Marcar Pendiente
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkPaymentStatus('paid')}
                    data-testid="bulk-status-paid"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Marcar Pagado
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkPaymentStatus('overdue')}
                    data-testid="bulk-status-overdue"
                  >
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    Marcar Vencido
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkPaymentStatus('cancelled')}
                    data-testid="bulk-status-cancelled"
                  >
                    <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                    Marcar Cancelado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="flex gap-2 flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkExport}
                  className="flex-1 sm:flex-initial text-blue-600 dark:text-blue-400 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  data-testid="bulk-export-excel"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDownloadFiles}
                  className="flex-1 sm:flex-initial text-emerald-600 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  data-testid="bulk-download-files"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Archivos
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex-1 sm:flex-initial"
                  data-testid="bulk-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{isBulkDeleting ? "Eliminando..." : "Eliminar"}</span>
                  <span className="sm:hidden">{isBulkDeleting ? "..." : "Del"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        {/* Mobile Card View */}
        <div className="sm:hidden">
          <div className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <Checkbox
                checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                data-testid="select-all-mobile"
              />
              <div className="text-sm font-medium text-muted-foreground">
                {invoices.length} facturas
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {invoices.map((invoice, index) => (
              <Card key={invoice.id} className="border border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                        data-testid={`select-${invoice.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-clamp-1">
                              {invoice.clientProviderName}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.type === 'income' 
                                ? 'bg-income-green/10 text-income-green border border-income-green/20' 
                                : 'bg-expense-red/10 text-expense-red border border-expense-red/20'
                            }`}>
                              {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                            </span>
                            {invoice.invoiceClass && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                {invoice.invoiceClass}
                              </span>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {invoice.filePath && (
                                <DropdownMenuItem onClick={() => handleViewFile(invoice)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver archivo
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleShareWhatsApp(invoice)}>
                                <MessageSquare className="mr-2 h-4 w-4 text-green-600" />
                                WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShareEmail(invoice)}>
                                <Mail className="mr-2 h-4 w-4 text-blue-600" />
                                Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingInvoice(invoice)}
                                className="bg-destructive text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Monto:</span>
                            <span className="font-semibold text-clamp-1" title={formatCurrencyWithConfig(invoice.totalAmount, user || undefined)}>
                              {formatCurrencyWithConfig(invoice.totalAmount, user || undefined)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Fecha:</span>
                            <span className="text-clamp-1">{formatDate(invoice.date)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Estado:</span>
                            <PaymentStatus 
                              currentStatus={invoice.paymentStatus}
                              invoiceId={invoice.id}
                              paymentDate={invoice.paymentDate ? new Date(invoice.paymentDate).toISOString() : null}
                              editable={true}
                            />
                          </div>
                          {invoice.invoiceNumber && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Número:</span>
                              <span className="text-clamp-1">{invoice.invoiceNumber}</span>
                            </div>
                          )}
                          {(invoice as any).description && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Detalle:</span>
                              <span className="text-clamp-1">{(invoice as any).description}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">IVA:</span>
                            <span className="text-clamp-1">{formatCurrencyWithDecimals(invoice.ivaAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* =============================================================== */}
        {/* INICIO DE LA CORRECCIÓN DE ESTILOS DE LA TABLA DE ESCRITORIO  */}
        {/* =============================================================== */}
        <div className="hidden sm:block mobile-scroll-container">
          <table className="w-full">
            <thead className="bg-blue-600/75 text-white">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    data-testid="select-all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium uppercase">
                  Clase
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center hover:opacity-80 transition-opacity"
                    data-testid="sort-date"
                  >
                    Fecha Emisión
                    {getSortIcon('date')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:opacity-80 transition-opacity"
                    data-testid="sort-upload-date"
                  >
                    Fecha Ingreso
                    {getSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  <button
                    onClick={() => handleSort('client')}
                    className="flex items-center hover:opacity-80 transition-opacity"
                    data-testid="sort-client"
                  >
                    Cliente/Proveedor
                    {getSortIcon('client')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Detalle
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  <button
                    onClick={() => handleSort('amount')}
                    className="flex items-center hover:opacity-80 transition-opacity"
                    data-testid="sort-amount"
                  >
                    Total
                    {getSortIcon('amount')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  IVA
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Estado Pago
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Cargado por
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice, index) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-green-50/50 dark:hover:bg-green-900/20"
                  data-testid={`invoice-row-${invoice.id}`}
                >
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedInvoices.has(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                      data-testid={`select-${invoice.id}`}
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                    {startIndex + index}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`status-indicator ${
                          invoice.type === 'income' ? 'status-income' : 'status-expense'
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      (invoice as any).invoiceClass === 'A' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                        : (invoice as any).invoiceClass === 'B' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {(invoice as any).invoiceClass || 'A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {invoice.clientProviderName}
                      </div>
                      {invoice.clientProvider?.cuit && (
                        <div className="text-xs text-muted-foreground">
                          {formatCUIT(invoice.clientProvider.cuit)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {(invoice as any).description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {invoice.invoiceNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {formatCurrencyWithConfig(invoice.totalAmount, user || undefined)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <IvaComponents
                      invoiceId={invoice.id}
                      totalAmount={Number(invoice.totalAmount)}
                      currentIvaAmount={Number(invoice.ivaAmount)}
                      editable={true}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <PaymentStatus
                      invoiceId={invoice.id}
                      currentStatus={(invoice as any).paymentStatus || 'pending'}
                      paymentDate={(invoice as any).paymentDate}
                      editable={true}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {invoice.uploadedByName}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {invoice.ownerName || 'Sin asignar'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {invoice.filePath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFile(invoice)}
                          data-testid={`view-invoice-${invoice.id}`}
                          title="Ver Factura"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Compartir"
                            data-testid={`share-invoice-${invoice.id}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleShareWhatsApp(invoice)}
                            data-testid={`whatsapp-${invoice.id}`}
                          >
                            <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleShareEmail(invoice)}
                            data-testid={`email-${invoice.id}`}
                          >
                            <Mail className="w-4 h-4 mr-2 text-blue-600" />
                            Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingInvoice(invoice)}
                        data-testid={`edit-invoice-${invoice.id}`}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingInvoice(invoice)}
                        data-testid={`delete-invoice-${invoice.id}`}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Mostrando <span className="font-medium">{startIndex}</span> a{' '}
              <span className="font-medium">{endIndex}</span> de{' '}
              <span className="font-medium">{total}</span> resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                data-testid="prev-page"
                className="px-2 sm:px-4"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(page)}
                      data-testid={`page-${page}`}
                      className="min-w-[32px] px-2 sm:px-3"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPagechange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                data-testid="next-page"
                className="px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EditInvoiceModal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        invoice={editingInvoice}
      />

      <DeleteConfirmModal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handleDelete}
        isLoading={deleteInvoiceMutation.isPending}
      />

      <DeleteConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Eliminar facturas seleccionadas"
        description={`¿Estás seguro de que deseas eliminar ${selectedInvoices.size} factura${selectedInvoices.size > 1 ? 's' : ''}? Esta acción moverá las facturas a la papelera donde podrás restaurarlas más tarde.`}
        isLoading={isBulkDeleting}
      />
    </>
  );
}
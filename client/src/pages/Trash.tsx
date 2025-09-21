import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { useDeletedInvoices, useRestoreInvoice, usePermanentlyDeleteInvoice, useEmptyTrash } from "@/hooks/useTrash";
import DeleteConfirmModal from "@/components/Modals/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { DeletedInvoiceLog } from "@shared/schema";

export default function Trash() {
  const [deletingInvoice, setDeletingInvoice] = useState<DeletedInvoiceLog | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const { data: deletedInvoices, isLoading } = useDeletedInvoices();
  const restoreInvoiceMutation = useRestoreInvoice();
  const permanentlyDeleteMutation = usePermanentlyDeleteInvoice();
  const emptyTrashMutation = useEmptyTrash();

  const handleRestore = async (invoiceId: string) => {
    try {
      await restoreInvoiceMutation.mutateAsync(invoiceId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePermanentDelete = async () => {
    if (!deletingInvoice) return;
    
    try {
      await permanentlyDeleteMutation.mutateAsync(deletingInvoice.id);
      setDeletingInvoice(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrashMutation.mutateAsync();
      setIsEmptyingTrash(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="trash-page">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6" data-testid="trash-page">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Papelera de Reciclaje</h2>
            <p className="text-muted-foreground">
              Historial de facturas eliminadas ({deletedInvoices?.length || 0} elementos)
            </p>
          </div>
          {deletedInvoices && deletedInvoices.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsEmptyingTrash(true)}
              disabled={emptyTrashMutation.isPending}
              data-testid="empty-trash"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {emptyTrashMutation.isPending ? "Vaciando..." : "Vaciar Papelera"}
            </Button>
          )}
        </div>

        <Card data-testid="deleted-invoices-table">
          {!deletedInvoices || deletedInvoices.length === 0 ? (
            <CardContent className="p-6 text-center text-muted-foreground">
              La papelera está vacía
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Fecha Eliminación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Cliente/Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Eliminado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deletedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="table-row-hover"
                      data-testid={`deleted-invoice-row-${invoice.id}`}
                    >
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDateTime(invoice.deletedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`status-indicator ${
                              invoice.type === 'income' ? 'status-income' : 'status-expense'
                            }`}
                          />
                          <span className="text-sm font-medium text-muted-foreground">
                            {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {invoice.clientProviderName}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {invoice.deletedByName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(invoice.id)}
                            disabled={restoreInvoiceMutation.isPending}
                            data-testid={`restore-invoice-${invoice.id}`}
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingInvoice(invoice)}
                            data-testid={`permanent-delete-invoice-${invoice.id}`}
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handlePermanentDelete}
        title="Confirmar Eliminación Permanente"
        description="¿Estás seguro de que deseas eliminar permanentemente esta factura? Esta acción no se puede deshacer y los datos se perderán para siempre."
        isLoading={permanentlyDeleteMutation.isPending}
      />

      <DeleteConfirmModal
        isOpen={isEmptyingTrash}
        onClose={() => setIsEmptyingTrash(false)}
        onConfirm={handleEmptyTrash}
        title="Vaciar Papelera"
        description="¿Estás seguro de que deseas vaciar toda la papelera? Todas las facturas eliminadas se perderán permanentemente."
        isLoading={emptyTrashMutation.isPending}
      />
    </>
  );
}

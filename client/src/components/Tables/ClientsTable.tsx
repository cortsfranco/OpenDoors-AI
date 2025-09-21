import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Plus, Download, FileDown, FileText } from "lucide-react";
import { formatDate, formatCurrency, formatCUIT } from "@/lib/utils";
import { useDeleteClient } from "@/hooks/useClients";
import DeleteConfirmModal from "@/components/Modals/DeleteConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ClientProvider } from "@shared/schema";

interface ClientsTableProps {
  clients: ClientProvider[];
  onEdit: (client: ClientProvider) => void;
  onAdd: () => void;
}

export default function ClientsTable({ clients, onEdit, onAdd }: ClientsTableProps) {
  const [deletingClient, setDeletingClient] = useState<ClientProvider | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const deleteClientMutation = useDeleteClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDelete = async () => {
    if (!deletingClient) return;
    
    try {
      await deleteClientMutation.mutateAsync(deletingClient.id);
      setDeletingClient(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(clients.map(client => client.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelection = new Set(selectedClients);
    if (checked) {
      newSelection.add(clientId);
    } else {
      newSelection.delete(clientId);
    }
    setSelectedClients(newSelection);
  };

  const handleViewInvoices = (client: ClientProvider) => {
    // Store the client filter in sessionStorage and navigate to invoices page
    sessionStorage.setItem('invoiceClientFilter', client.name);
    setLocation('/invoices');
    
    toast({
      title: "Filtrando facturas",
      description: `Mostrando facturas de ${client.name}`,
      variant: "default",
    });
  };

  const handleBulkDelete = () => {
    if (selectedClients.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedClients.size === 0) return;
    
    setIsBulkDeleting(true);
    const clientIds = Array.from(selectedClients);
    let successCount = 0;
    let failureCount = 0;
    
    try {
      for (const clientId of clientIds) {
        try {
          await deleteClientMutation.mutateAsync(clientId);
          successCount++;
        } catch (error) {
          failureCount++;
          console.error(`Failed to delete client ${clientId}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Éxito",
          description: `Se eliminaron ${successCount} cliente(s) correctamente${failureCount > 0 ? `. ${failureCount} fallaron.` : '.'}`,
        });
      }
      
      if (failureCount > 0 && successCount === 0) {
        toast({
          title: "Error",
          description: "No se pudieron eliminar los clientes seleccionados",
          variant: "destructive",
        });
      }
      
      setSelectedClients(new Set());
      setShowBulkDeleteConfirm(false);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const exportToCSV = () => {
    const selectedClientsList = clients.filter(client => selectedClients.has(client.id));
    
    const headers = ['Nombre', 'CUIT', 'Tipo', 'Email', 'Teléfono', 'Dirección'];
    const rows = selectedClientsList.map(client => [
      client.name,
      client.cuit || '',
      getTypeLabel(client.type),
      client.email || '',
      client.phone || '',
      client.address || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Éxito",
      description: `Se exportaron ${selectedClientsList.length} cliente(s) a CSV`,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-income-green/10 text-income-green';
      case 'provider':
        return 'bg-expense-red/10 text-expense-red';
      case 'both':
        return 'bg-chart-1/10 text-chart-1';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client':
        return 'Cliente';
      case 'provider':
        return 'Proveedor';
      case 'both':
        return 'Ambos';
      default:
        return type;
    }
  };

  return (
    <>
      <Card data-testid="clients-table">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Clientes y Proveedores
              </h3>
              <p className="text-sm text-muted-foreground">
                {clients.length} contactos registrados
              </p>
            </div>
            <Button onClick={onAdd} data-testid="add-client">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Contacto
            </Button>
          </div>
        </div>

        {selectedClients.size > 0 && (
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedClients.size} cliente(s) seleccionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  data-testid="export-csv-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  data-testid="bulk-delete-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar ({selectedClients.size})
                </Button>
              </div>
            </div>
          </div>
        )}

        {clients.length === 0 ? (
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay clientes o proveedores registrados
          </CardContent>
        ) : (
          <div className="mobile-scroll-container">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={clients.length > 0 && selectedClients.size === clients.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="select-all-checkbox"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    CUIT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Última Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Total Operaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="table-row-hover"
                    data-testid={`client-row-${client.id}`}
                  >
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        data-testid={`select-client-${client.id}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {client.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {client.cuit ? formatCUIT(client.cuit) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getTypeColor(client.type)}>
                        {getTypeLabel(client.type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {client.email && (
                          <div>{client.email}</div>
                        )}
                        {client.phone && (
                          <div className="text-muted-foreground">{client.phone}</div>
                        )}
                        {!client.email && !client.phone && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {client.lastInvoiceDate ? formatDate(client.lastInvoiceDate) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatCurrency(client.totalOperations || '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoices(client)}
                          data-testid={`view-invoices-${client.id}`}
                          title="Ver facturas de este cliente"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(client)}
                          data-testid={`edit-client-${client.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingClient(client)}
                          data-testid={`delete-client-${client.id}`}
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

      <DeleteConfirmModal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDelete}
        title="Confirmar Eliminación de Cliente"
        description="¿Estás seguro de que deseas eliminar este cliente/proveedor? Esta acción no se puede deshacer."
        isLoading={deleteClientMutation.isPending}
      />
      
      <DeleteConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Eliminar Clientes/Proveedores"
        description={`¿Está seguro que desea eliminar ${selectedClients.size} cliente(s)/proveedor(es)? Esta acción no se puede deshacer.`}
        isLoading={isBulkDeleting}
      />
    </>
  );
}

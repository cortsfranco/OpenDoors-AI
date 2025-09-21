import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientsTable from "@/components/Tables/ClientsTable";
import { useClients, useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { Skeleton } from "@/components/ui/skeleton";
import { validateCUIT } from "@/lib/utils";
import type { ClientProvider } from "@shared/schema";

export default function Clients() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cuit: '',
    type: 'client' as 'client' | 'provider' | 'both',
    email: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clients, isLoading } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  const resetForm = () => {
    setFormData({
      name: '',
      cuit: '',
      type: 'client',
      email: '',
      phone: '',
      address: '',
    });
    setErrors({});
    setEditingClient(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (client: ClientProvider) => {
    setFormData({
      name: client.name,
      cuit: client.cuit || '',
      type: client.type,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
    });
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTimeout(resetForm, 300);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.cuit && !validateCUIT(formData.cuit)) {
      newErrors.cuit = 'El CUIT no es válido';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({
          id: editingClient.id,
          data: {
            ...formData,
            cuit: formData.cuit || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
          },
        });
      } else {
        await createClientMutation.mutateAsync({
          ...formData,
          cuit: formData.cuit || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        });
      }
      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="clients-page">
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
      <div className="p-6 space-y-6" data-testid="clients-page">
        <ClientsTable
          clients={clients || []}
          onEdit={handleEdit}
          onAdd={handleAdd}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-4 sm:mx-0" data-testid="client-modal">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente/Proveedor' : 'Agregar Cliente/Proveedor'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="client-name-input"
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
                data-testid="client-cuit-input"
              />
              {errors.cuit && (
                <p className="text-sm text-destructive mt-1">{errors.cuit}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'client' | 'provider' | 'both') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger data-testid="client-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="provider">Proveedor</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="client-email-input"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="client-phone-input"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="client-address-input"
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                data-testid="cancel-client"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
                data-testid="save-client"
              >
                {createClientMutation.isPending || updateClientMutation.isPending
                  ? "Guardando..."
                  : editingClient
                  ? "Actualizar"
                  : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFilters, InvoiceFormData } from "@/lib/types";

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['/api/invoices', filters],
    queryFn: () => api.getInvoices(filters),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['/api/invoices', id],
    queryFn: () => api.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.createInvoice,
    onSuccess: (invoice) => {
      // Invalidar todas las queries relacionadas para actualización en tiempo real
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] }); // Tabla clientes/proveedores
      
      // El toast se muestra desde el modal de resumen, no aquí
      return invoice;
    },
    onError: (error: any) => {
      // Manejo específico para duplicados usando status HTTP 409
      if (error?.response?.status === 409 || error?.status === 409 || (error?.response?.data?.error === 'duplicate')) {
        const duplicateInfo = error?.response?.data?.existingInvoice;
        const message = error?.response?.data?.message || "Esta factura ya fue cargada anteriormente";
        
        toast({
          title: "Factura Duplicada",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al procesar",
          description: error?.response?.data?.message || error?.message || "Error al crear la factura",
          variant: "destructive",
        });
      }
    },
  });
}

export function useUpdateInvoice() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InvoiceFormData> }) =>
      api.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
      toast({
        title: "Éxito",
        description: "Factura actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la factura",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInvoice() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, deletedBy, deletedByName }: { id: string; deletedBy: string; deletedByName: string }) =>
      api.deleteInvoice(id, deletedBy, deletedByName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la factura",
        variant: "destructive",
      });
    },
  });
}

export function useExportCSV() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.exportCSV,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facturas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Éxito",
        description: "Archivo CSV descargado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al exportar CSV",
        variant: "destructive",
      });
    },
  });
}

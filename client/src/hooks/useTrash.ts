import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useDeletedInvoices() {
  return useQuery({
    queryKey: ['/api/trash'],
    queryFn: api.getDeletedInvoices,
  });
}

export function useRestoreInvoice() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.restoreInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al restaurar la factura",
        variant: "destructive",
      });
    },
  });
}

export function usePermanentlyDeleteInvoice() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.permanentlyDeleteInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar permanentemente la factura",
        variant: "destructive",
      });
    },
  });
}

export function useEmptyTrash() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.emptyTrash,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al vaciar la papelera",
        variant: "destructive",
      });
    },
  });
}

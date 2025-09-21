import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientFormData } from "@/lib/types";
import type { User } from "@shared/schema";

export function useClients() {
  return useQuery({
    queryKey: ['/api/clients'],
    queryFn: api.getClients,
  });
}

export function useCreateClient() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Éxito",
        description: "Cliente creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el cliente",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClient() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientFormData> }) =>
      api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Éxito",
        description: "Cliente actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el cliente",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteClient() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: api.deleteClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el cliente",
        variant: "destructive",
      });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['/api/users'],
    queryFn: api.getUsers,
  });
}

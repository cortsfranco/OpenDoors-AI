import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string | null;
  role: 'admin' | 'editor' | 'viewer';
  // User configuration fields
  decimalSeparator?: ',' | '.';
  thousandSeparator?: '.' | ',' | ' ' | 'none';
  decimalPlaces?: number;
  currencySymbol?: string;
  currencyPosition?: 'before' | 'after';
  roundingMode?: 'round' | 'ceil' | 'floor';
  fiscalPeriod?: 'calendar' | 'may_april';
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch auth status");
        }
        
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    refetchInterval: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      setLocation("/login");
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user: authData?.user as User | null,
    isLoading,
    isAuthenticated: !!authData?.user,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
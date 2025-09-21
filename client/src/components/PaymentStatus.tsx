import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface PaymentStatusProps {
  invoiceId: string;
  currentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: string | null;
  editable?: boolean;
}

export function PaymentStatus({ 
  invoiceId, 
  currentStatus, 
  paymentDate,
  editable = true 
}: PaymentStatusProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    paymentDate ? new Date(paymentDate) : undefined
  );
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ status, paymentDate }: { status: string; paymentDate?: Date }) => {
      return await apiRequest(
        'PATCH',
        `/api/invoices/${invoiceId}/payment-status`,
        { status, paymentDate: paymentDate?.toISOString() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      setIsEditing(false);
      toast({
        title: "Estado actualizado",
        description: "El estado de pago se actualizó correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de pago",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ 
      status, 
      paymentDate: status === 'paid' ? selectedDate : undefined 
    });
  };

  const handleCancel = () => {
    setStatus(currentStatus);
    setSelectedDate(paymentDate ? new Date(paymentDate) : undefined);
    setIsEditing(false);
  };

  const getStatusText = (status: string) => {
    const variants = {
      pending: { label: "Pendiente" },
      paid: { label: "Pagado" },
      overdue: { label: "Vencido" },
      cancelled: { label: "Cancelado" },
    };
    
    const variant = variants[status as keyof typeof variants] || variants.pending;
    return (
      <span className="text-sm font-medium" data-testid={`status-${status}`}>
        {variant.label}
      </span>
    );
  };

  if (!editable) {
    return (
      <div className="flex items-center gap-2">
        {getStatusText(currentStatus)}
        {paymentDate && currentStatus === 'paid' && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(paymentDate), "dd/MM/yyyy", { locale: es })}
          </span>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-2 bg-muted/50 rounded-lg">
        <Select value={status} onValueChange={(value) => setStatus(value as 'pending' | 'paid' | 'overdue' | 'cancelled')}>
          <SelectTrigger className="w-full" data-testid="payment-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        
        {status === 'paid' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                data-testid="payment-date-button"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "dd/MM/yyyy", { locale: es })
                ) : (
                  "Fecha de pago"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        )}
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
            data-testid="save-payment-status"
          >
            <Check className="w-4 h-4 mr-1" />
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="flex-1"
            data-testid="cancel-payment-status"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => setIsEditing(true)}
      data-testid="payment-status-display"
    >
      {getStatusText(currentStatus)}
      {paymentDate && currentStatus === 'paid' && (
        <span className="text-xs text-muted-foreground">
          {format(new Date(paymentDate), "dd/MM/yyyy", { locale: es })}
        </span>
      )}
    </div>
  );
}
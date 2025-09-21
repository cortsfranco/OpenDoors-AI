import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
});

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (!user) return;

    // Antes: Usaba window.location.port, que fallaba
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const host = window.location.hostname;
    // const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    // const wsUrl = `${protocol}//${host}:${port}/ws`;

    // Después: La URL se construye de forma fija para tu entorno local
    const wsUrl = `ws://localhost:3000/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Authenticate with user ID
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          handleIncomingMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const handleIncomingMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'invoice_created':
      case 'invoice_updated':
      case 'invoice_deleted':
        // Invalidate invoice queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
        
        // Show notification if from another user
        if (message.userId && message.userId !== user?.id) {
          toast({
            title: "Actualización en tiempo real",
            description: message.message || "Los datos se han actualizado",
            duration: 3000,
          });
        }
        break;
        
      case 'bulk_update':
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
        if (message.userId !== user?.id) {
          toast({
            title: "Actualización masiva",
            description: message.message || "Se han actualizado múltiples facturas",
          });
        }
        break;
        
      case 'bulk_import':
        // Invalidate all financial data after import
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
        
        if (message.userId !== user?.id) {
          toast({
            title: "Importación completada",
            description: message.message || `Datos importados: ${message.data?.success || 0} nuevos registros`,
            duration: 5000,
          });
        }
        break;
        
      case 'data_rollback':
        // Invalidate all data after rollback
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
        
        toast({
          title: "Datos restaurados",
          description: message.message || "Los datos han sido restaurados desde el respaldo",
          variant: "destructive",
          duration: 5000,
        });
        break;
        
      case 'upload:queued':
        // File queued for processing - show subtle info
        toast({
          title: "🕒 Factura en cola",
          description: `${message.data?.fileName} está esperando procesamiento`,
          duration: 2000,
          className: "bg-blue-50 border-blue-200 text-blue-900",
        });
        break;

      case 'upload:processing':
        // File being processed - optional notification
        toast({
          title: "⚡ Procesando",
          description: `Extrayendo datos de ${message.data?.fileName}...`,
          duration: 3000,
          className: "bg-orange-50 border-orange-200 text-orange-900",
        });
        break;

        case 'upload:success':
    // Successful processing - green with check
    toast({
        title: "✅ Factura cargada",
        description: `${message.data?.fileName} se procesó correctamente`,
        duration: 4000,
        className: "bg-green-50 border-green-200 text-green-900",
    });
    
    // Forzar la recarga de los datos de las facturas
    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/recent-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    queryClient.invalidateQueries({ queryKey: ['/api/chart-data'] });
    queryClient.invalidateQueries({ queryKey: ['/api/quick-stats'] });

    // Forzar la recarga de la lista de cargas de facturas
    queryClient.invalidateQueries({ queryKey: ['/api/uploads/recent'] }); // Invalida la caché

    // Y luego, forzar la recarga de la información de la página actual
    const currentPage = 1; // Suponemos que la primera página
    const pageSize = 5;    // y el tamaño de la página son estos
    queryClient.fetchQuery({
        queryKey: ['/api/uploads/recent', currentPage, pageSize],
        queryFn: () => {
            return fetch(`/api/uploads/recent?page=${currentPage}&limit=${pageSize}`).then(res => res.json());
        }
    });

    break;
      case 'upload:duplicate':
        // Duplicate file detected - informative orange
        toast({
          title: "⚠️ Factura duplicada",
          description: `${message.data?.fileName} ya ha sido cargada antes`,
          duration: 5000,
          className: "bg-amber-50 border-amber-200 text-amber-900",
        });
        break;

      case 'upload:error':
        // Processing error - red with X
        toast({
          title: "❌ Error de procesamiento",
          description: `Error al procesar ${message.data?.fileName}: ${message.data?.error || 'Error desconocido'}`,
          duration: 6000,
          className: "bg-red-50 border-red-200 text-red-900",
        });
        break;
        
      case 'authenticated':
        console.log('WebSocket authenticated for user:', message.userId);
        break;
        
      case 'connection':
        // Initial connection message from server, no action needed
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
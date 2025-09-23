import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Cloud, FileText, Camera, FileCheck2, Loader2, XCircle, FileWarning, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import InvoicePreviewModal from "./InvoicePreviewModal";

interface UploadProgressState {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'duplicate' | 'error';
  progress: number;
  timestamp?: number;
  invoiceData?: any;
}

const getIconForStatus = (status: UploadProgressState['status']) => {
  switch (status) {
    case 'uploading':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'success':
      return <FileCheck2 className="h-4 w-4 text-green-500" />;
    case 'duplicate':
      return <FileWarning className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusText = (status: UploadProgressState['status']) => {
  switch (status) {
    case 'pending': return 'En cola...';
    case 'uploading': return 'Subiendo...';
    case 'processing': return 'Procesando con IA...';
    case 'success': return 'Completado';
    case 'duplicate': return 'Duplicado';
    case 'error': return 'Error';
    default: return '';
  }
};

interface UploadZoneProps {
  ownerName?: string;
}

export default function UploadZone({ ownerName }: UploadZoneProps) {
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [uploadState, setUploadState] = useState<UploadProgressState[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [previewModal, setPreviewModal] = useState<{open: boolean, data: any, fileName: string}>({
    open: false,
    data: null,
    fileName: ''
  });
  const queryClient = useQueryClient();

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith('upload:')) {
      const { jobId, status, error, invoiceData } = lastMessage.data;
      if (jobId) {
        setUploadState(prev => prev.map(f => {
          if (f.id === jobId && (f.status === 'error' || f.status === 'duplicate')) {
            return f;
          }
          if (status === 'success') {
            queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
          }
          return f.id === jobId ? {...f, status, error, invoiceData } : f;
        }));
      }
    }
  }, [lastMessage, queryClient]);

  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setUploadState(prev => prev.filter(f => {
        const isFinalState = f.status === 'success' || f.status === 'duplicate' || f.status === 'error';
        return !isFinalState || (Date.now() - (f.timestamp || 0) < 15000); // 15 segundos para errores
      }));
    }, 15000); // 15 segundos

    return () => clearTimeout(cleanupTimer);
  }, [uploadState]);

  const clearFailedNotifications = () => {
    setUploadState(prev => prev.filter(f => f.status !== 'error'));
    toast({
      title: "Notificaciones limpiadas",
      description: "Se han eliminado las notificaciones de error",
      variant: "default",
    });
  };

  const closeNotification = (id: string) => {
    setUploadState(prev => prev.filter(f => f.id !== id));
  };

  const showPreview = (file: UploadProgressState) => {
    if (file.invoiceData) {
      setPreviewModal({
        open: true,
        data: file.invoiceData,
        fileName: file.name
      });
    }
  };

  const handleSaveInvoice = async (data: any) => {
    try {
      // Aquí podrías hacer una llamada a la API para actualizar la factura
      // Por ahora, solo mostramos un mensaje de éxito
      toast({
        title: "Factura actualizada",
        description: "Los datos se han guardado correctamente",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la factura",
        variant: "destructive",
      });
    }
  };

  const handleCancelPreview = () => {
    setPreviewModal({ open: false, data: null, fileName: '' });
  };

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('uploadFile', file);
      
      // DEBUG: Log the ownerName values
      console.log('🔍 DEBUG UploadZone - ownerName prop:', ownerName);
      
      // Add ownerName to FormData if provided
      if (ownerName) {
        formData.append('ownerName', ownerName);
      }
      
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { response: { data: errorData } }; 
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: (data, file) => {
      setUploadState(prev => prev.map(f => f.name === file.name ? {...f, id: data.jobId, status: 'processing'} : f));
      toast({
        title: "Archivo en cola",
        description: `${file.name} se ha subido correctamente. En espera de procesamiento.`,
      });
    },
    // ===============================================================
    // INICIO DE LA CORRECCIÓN FINAL
    // ===============================================================
    onError: (error: any, file) => {
      const serverErrorMessage = error.response?.data?.error || error.message || 'Ocurrió un error desconocido.';
      const isDuplicate = serverErrorMessage.includes('FACTURA DUPLICADA DETECTADA');
      
      setUploadState(prev => prev.map(f => f.name === file.name ? {
        ...f, 
        status: isDuplicate ? 'duplicate' : 'error',
        timestamp: Date.now()
      } : f));
      
      toast({
        title: isDuplicate ? "📋 Factura Duplicada" : "❌ Error en la Carga",
        description: (
          <div className="text-base whitespace-pre-line w-full"> 
            {serverErrorMessage}
          </div>
        ),
        variant: isDuplicate ? "destructive" : "destructive",
        duration: 20000,
        className: 'w-full',
      });
    }
    // ===============================================================
    // FIN DE LA CORRECCIÓN FINAL
    // ===============================================================
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setShowSummary(true);
    const newFiles = acceptedFiles.map(file => ({
      id: file.name,
      name: file.name,
      status: 'pending' as const,
      progress: 0,
      timestamp: Date.now(),
    }));
    setUploadState(prev => [...prev, ...newFiles]);

    acceptedFiles.forEach(file => mutation.mutate(file));
  }, [mutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Open camera');
  };

  const getSummaryMessage = () => {
    const total = uploadState.length;
    if (total === 0) return null;
    const completed = uploadState.filter(f => ['success', 'duplicate', 'error'].includes(f.status)).length;
    const pending = total - completed;
    if (completed === total) {
      return `¡Procesamiento completado! ${completed} de ${total} archivos procesados.`;
    }
    return `Procesando... ${completed} de ${total} archivos procesados. (${pending} pendientes)`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={cn(
          "bg-card rounded-lg border-2 border-dashed border-border p-4 sm:p-6 text-center drag-zone transition-all duration-300 hover:border-primary cursor-pointer",
          (isDragActive || isHovering) && "border-primary/50 bg-gray-50 dark:bg-gray-800"
        )}
        onDragEnter={() => setIsHovering(true)}
        onDragLeave={() => setIsHovering(false)}
        data-testid="upload-zone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="max-w-md mx-auto">
          <Cloud className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 leading-tight">
            {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
            Formatos soportados: PDF, JPG, PNG (máx. 10MB por archivo) - Puedes seleccionar múltiples archivos
          </p>
          <div className="flex flex-col gap-3 justify-center">            <Button
              type="button"
              data-testid="select-files-button"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Seleccionar Archivos</span>
              <span className="sm:hidden">Seleccionar</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCameraClick}
              data-testid="camera-button"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              <Camera className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Usar Cámara</span>
              <span className="sm:hidden">Cámara</span>
            </Button>
          </div>
        </div>
      </div>

      {showSummary && uploadState.length > 0 && (
        <div className="flex flex-col gap-2 p-3 sm:p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
            <FileText className="w-4 h-4" />
            <span>{getSummaryMessage()}</span>
          </div>
          <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            {uploadState.map(file => (
              <li key={file.id} className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getIconForStatus(file.status)}
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={file.status === 'duplicate' || file.status === 'error' ? 'destructive' : file.status === 'success' ? 'default' : 'secondary'}>
                    {getStatusText(file.status)}
                  </Badge>
                  {file.status === 'success' && file.invoiceData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showPreview(file)}
                      className="h-6 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                    >
                      Ver
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeNotification(file.id)}
                    className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {uploadState.some(f => f.status === 'error') && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFailedNotifications}
                className="w-full text-xs"
              >
                <XCircle className="w-3 h-3 mr-2" />
                Limpiar errores
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Preview */}
      <InvoicePreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal(prev => ({ ...prev, open }))}
        invoiceData={previewModal.data}
        fileName={previewModal.fileName}
        onSave={handleSaveInvoice}
        onCancel={handleCancelPreview}
      />
    </div>
  );
}
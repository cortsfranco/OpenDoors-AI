import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Cloud, FileText, Camera, FileCheck2, Loader2, XCircle, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";

interface UploadProgressState {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'duplicate' | 'error';
  progress: number;
  timestamp?: number;
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

export default function UploadZone() {
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [uploadState, setUploadState] = useState<UploadProgressState[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const queryClient = useQueryClient();

  const { lastMessage } = useWebSocket();

  // ===============================================================
  // INICIO DE LA CORRECCIÓN CLAVE
  // ===============================================================
  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith('upload:')) {
      const { jobId, status, error } = lastMessage.data;
      if (jobId) {
        setUploadState(prev => prev.map(f => {
          // Si el archivo ya tiene un estado final (error o duplicado), NO lo sobrescribas.
          if (f.id === jobId && (f.status === 'error' || f.status === 'duplicate')) {
            return f;
          }
          // Si el mensaje es de éxito, invalida la query de facturas recientes para refrescar la lista.
          if (status === 'success') {
            queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
          }
          // Para cualquier otro caso, actualiza el estado normalmente.
          return f.id === jobId ? {...f, status, error } : f;
        }));
      }
    }
  }, [lastMessage, queryClient]);
  // ===============================================================
  // FIN DE LA CORRECCIÓN CLAVE
  // ===============================================================

  // Auto-cleanup successful or duplicate messages from summary after a delay
  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setUploadState(prev => prev.filter(f => {
        const isFinalState = f.status === 'success' || f.status === 'duplicate';
        // Mantenemos los que no están en estado final, o los que sí lo están pero hace menos de 10 seg.
        return !isFinalState || (Date.now() - (f.timestamp || 0) < 10000);
      }));
    }, 10000);

    return () => clearTimeout(cleanupTimer);
  }, [uploadState]);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('uploadFile', file);
      
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
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
    onError: (error: any, file) => {
      const serverErrorMessage = error.response?.data?.error || error.message || 'Ocurrió un error desconocido.';
      const isDuplicate = serverErrorMessage.includes('FACTURA DUPLICADA DETECTADA');
      
      setUploadState(prev => prev.map(f => f.name === file.name ? {
        ...f, 
        status: isDuplicate ? 'duplicate' : 'error',
        timestamp: Date.now() // Actualizamos el timestamp para el cleanup
      } : f));
      
      toast({
        title: isDuplicate ? "📋 Factura Duplicada" : "❌ Error en la Carga",
        description: serverErrorMessage,
        variant: isDuplicate ? "default" : "destructive",
        duration: isDuplicate ? 15000 : 5000
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setShowSummary(true);
    const newFiles = acceptedFiles.map(file => ({
      id: file.name, // ID temporal
      name: file.name,
      status: 'pending' as const,
      progress: 0,
      timestamp: Date.now(),
    }));
    // Añadimos los nuevos archivos sin limpiar los anteriores
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
          "bg-card rounded-lg border-2 border-dashed border-border p-6 text-center drag-zone transition-all duration-300 hover:border-primary cursor-pointer",
          (isDragActive || isHovering) && "border-primary/50 bg-gray-50 dark:bg-gray-800"
        )}
        onDragEnter={() => setIsHovering(true)}
        onDragLeave={() => setIsHovering(false)}
        data-testid="upload-zone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="max-w-md mx-auto">
          <Cloud className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Formatos soportados: PDF, JPG, PNG (máx. 10MB por archivo) - Puedes seleccionar múltiples archivos
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              type="button"
              data-testid="select-files-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              Seleccionar Archivos
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCameraClick}
              data-testid="camera-button"
            >
              <Camera className="w-4 h-4 mr-2" />
              Usar Cámara
            </Button>
          </div>
        </div>
      </div>

      {showSummary && uploadState.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="w-4 h-4" />
            <span>{getSummaryMessage()}</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {uploadState.map(file => (
              <li key={file.id} className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  {getIconForStatus(file.status)}
                  <span className="text-xs">{file.name}</span>
                </div>
                <Badge variant={file.status === 'duplicate' || file.status === 'error' ? 'destructive' : file.status === 'success' ? 'default' : 'secondary'}>
                  {getStatusText(file.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
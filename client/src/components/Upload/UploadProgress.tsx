import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader, Clock, XCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";

interface UploadJob {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'success' | 'duplicate' | 'error' | 'quarantined'; // Agregamos 'quarantined'
  invoiceId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalJobs: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UploadJobsResponse {
  jobs: UploadJob[];
  pagination: PaginationInfo;
}

interface UploadProgressProps {
  showRecentJobs?: boolean;
}

// SessionStorage keys for persistence
const SESSION_KEYS = {
  UPLOAD_JOBS: 'uploadJobs_session',
  UPLOAD_HISTORY: 'uploadHistory_session'
};

// Helper functions for sessionStorage persistence
const saveJobsToSession = (jobs: UploadJob[]) => {
  try {
    sessionStorage.setItem(SESSION_KEYS.UPLOAD_JOBS, JSON.stringify({
      timestamp: Date.now(),
      jobs: jobs
    }));
  } catch (error) {
    console.warn('Error saving jobs to session:', error);
  }
};

const loadJobsFromSession = (): UploadJob[] => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS.UPLOAD_JOBS);
    if (stored) {
      const data = JSON.parse(stored);
      // Only load if data is less than 30 minutes old
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        return data.jobs || [];
      }
    }
  } catch (error) {
    console.warn('Error loading jobs from session:', error);
  }
  return [];
};

// ============ INICIO DE LOS CAMBIOS ============

// 1. Mejoramos los porcentajes de progreso
const getProgress = (status: string) => {
  switch (status) {
    case 'queued': return 10;
    case 'processing': return 60;
    case 'success': return 100;
    case 'duplicate': return 100;
    case 'error': return 100;
    case 'quarantined': return 100;
    default: return 5;
  }
};

// 2. Mejoramos los textos de estado con emojis
const getStatusText = (status: string) => {
  switch (status) {
    case 'queued': return 'En cola de procesamiento...';
    case 'processing': return 'Analizando con Azure AI...';
    case 'success': return 'Factura procesada correctamente ✅';
    case 'duplicate': return 'Factura duplicada - omitida ⚠️';
    case 'error': return 'Error en el procesamiento ❌';
    case 'quarantined': return 'Requiere atención manual 🔍';
    default: return 'Iniciando...';
  }
};

// 3. Iconos mejorados para los nuevos estados
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-income-green" />;
    case 'duplicate':
      return <Clock className="w-4 h-4 text-orange-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-expense-red" />; // Usamos XCircle para errores
    case 'quarantined':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />; // Nuevo icono para cuarentena
    case 'queued':
      return <RefreshCw className="w-4 h-4 text-gray-500" />;
    default:
      return <Loader className="w-4 h-4 animate-spin text-primary" />;
  }
};

export default function UploadProgress({ showRecentJobs = true }: UploadProgressProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [jobs, setJobs] = useState<UploadJob[]>(() => loadJobsFromSession());
  const [showContent, setShowContent] = useState(true); // Nuevo estado para controlar la visibilidad

  // Nuevo useEffect para limpiar la lista después de 5 minutos
  useEffect(() => {
    if (jobs.length > 0) {
      const timer = setTimeout(() => {
        setJobs([]); // Limpia la lista
        saveJobsToSession([]); // Limpia también la sesión
        setShowContent(false); // Oculta el componente
      }, 5 * 60 * 1000); // 5 minutos
      return () => clearTimeout(timer);
    }
  }, [jobs]);
  
  // Fetch recent upload jobs with pagination
  const { data: recentJobsResponse, refetch } = useQuery<UploadJobsResponse>({
    queryKey: ['/api/uploads/recent', currentPage],
    queryFn: () => 
      fetch(`/api/uploads/recent?page=${currentPage}&limit=5`, {
        credentials: 'include'
      }).then(res => res.json()),
    refetchInterval: 2000, // Polling más rápido a 2 segundos
  });

  // Update local state when data changes
  useEffect(() => {
    if (recentJobsResponse?.jobs && Array.isArray(recentJobsResponse.jobs)) {
      setJobs(recentJobsResponse.jobs);
      // Save to session for persistence
      saveJobsToSession(recentJobsResponse.jobs);
    }
  }, [recentJobsResponse]);

  const pagination = recentJobsResponse?.pagination;

  const handlePrevPage = () => {
    if (pagination?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Listen for WebSocket updates
  useWebSocket();

  if (!showRecentJobs || !jobs || jobs.length === 0 || !showContent) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="upload-progress-list">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Cargas de Facturas (últimas 20)</h3>
        {pagination && pagination.totalJobs > 0 && (
          <span className="text-xs text-muted-foreground">
            {pagination.totalJobs} total{pagination.totalJobs !== 1 ? 'es' : ''}
          </span>
        )}
      </div>
      {jobs.map((job) => (
        <Card key={job.id} data-testid={`upload-progress-${job.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground" data-testid="file-name">
                {job.fileName}
              </span>
              <span className="text-sm text-muted-foreground" data-testid="file-size">
                {(job.fileSize / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            
            <div className="mb-2">
              {/* Barra de progreso mejorada con clases dinámicas */}
              <Progress 
                value={getProgress(job.status)}
                className={`h-3 progress-bar ${
                  job.status === 'success'
                    ? 'progress-success [&>div]:bg-green-500' // Quitamos animate-pulse del éxito
                    : job.status === 'duplicate'
                    ? 'progress-duplicate [&>div]:bg-yellow-500'
                    : job.status === 'error' || job.status === 'quarantined'
                    ? 'progress-error [&>div]:bg-red-500'
                    : job.status === 'processing'
                    ? 'progress-processing [&>div]:bg-blue-500 [&>div]:animate-pulse' // El pulso solo en procesamiento
                    : 'progress-queued [&>div]:bg-gray-400'
                }`}
                data-testid="progress-bar"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <span className="text-xs text-muted-foreground" data-testid="status-text">
                  {getStatusText(job.status)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="progress-percent">
                {getProgress(job.status)}%
              </span>
            </div>
            {job.error && (
              <div className="mt-2 text-xs text-expense-red" data-testid="error-message">
                {job.error}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Controles de Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!pagination.hasPrevPage}
            className="flex items-center gap-1"
            data-testid="prev-page-button"
          >
            <ChevronLeft className="w-3 h-3" />
            Anterior
          </Button>
          
          <span className="text-xs text-muted-foreground" data-testid="pagination-info">
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage}
            className="flex items-center gap-1"
            data-testid="next-page-button"
          >
            Siguiente
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
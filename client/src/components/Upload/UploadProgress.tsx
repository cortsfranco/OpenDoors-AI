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
  status: 'queued' | 'processing' | 'success' | 'duplicate' | 'error';
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

export default function UploadProgress({ showRecentJobs = true }: UploadProgressProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [jobs, setJobs] = useState<UploadJob[]>(() => loadJobsFromSession());
  
  // Fetch recent upload jobs with pagination
  const { data: recentJobsResponse, refetch } = useQuery<UploadJobsResponse>({
    queryKey: ['/api/uploads/recent', currentPage],
    queryFn: () => 
      fetch(`/api/uploads/recent?page=${currentPage}&limit=5`, {
        credentials: 'include'
      }).then(res => res.json()),
    refetchInterval: 5000, // Poll every 5 seconds
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued':
        return 'En cola...';
      case 'processing':
        return 'Procesando con IA...';
      case 'success':
        return 'Completado';
      case 'duplicate':
        return 'Duplicado (información)';
      case 'error':
        return 'Error al procesar';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-income-green" />;
      case 'duplicate':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-expense-red" />;
      case 'queued':
        return <RefreshCw className="w-4 h-4 text-gray-500" />;
      default:
        return <Loader className="w-4 h-4 animate-spin text-primary" />;
    }
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'queued': return 50;        // 50% cuando la factura ha sido cargada
      case 'processing': return 75;    // 75% durante procesamiento
      case 'success': return 100;      // 100% cuando los datos han sido procesados
      case 'duplicate': return 100;    // 100% para duplicados (procesamiento completo)
      case 'error': return 100;        // 100% para errores (procesamiento completo)
      default: return 25;              // Estado inicial
    }
  };

  if (!showRecentJobs || !jobs || jobs.length === 0) {
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
              <Progress 
                value={getProgress(job.status)}
                className={`progress-bar ${job.status === 'success' || job.status === 'duplicate' ? 'progress-success' : job.status === 'error' ? 'progress-error' : ''}`}
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

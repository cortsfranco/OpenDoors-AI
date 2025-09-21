import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight, FileText, LogIn, LogOut, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  actionType: 'create' | 'update' | 'delete' | 'upload' | 'login' | 'logout';
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionIcons = {
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
};

const actionLabels = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  upload: 'Carga',
  login: 'Inicio Sesión',
  logout: 'Cierre Sesión',
};

const actionColors = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  upload: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export default function ActivityLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/activity-logs', { 
      userId: filterUser === 'all' ? undefined : filterUser,
      actionType: filterAction === 'all' ? undefined : filterAction,
      entityType: filterEntity === 'all' ? undefined : filterEntity,
      limit,
      offset: page * limit 
    }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`${url}?${searchParams}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      return response.json() as Promise<ActivityLog[]>;
    },
  });

  const logs = data || [];

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card data-testid="activity-logs-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Registro de Actividades
              </CardTitle>
              <CardDescription>
                Historial completo de todas las acciones realizadas en el sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]" data-testid="filter-action">
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="create">Creación</SelectItem>
                <SelectItem value="update">Actualización</SelectItem>
                <SelectItem value="delete">Eliminación</SelectItem>
                <SelectItem value="upload">Carga</SelectItem>
                <SelectItem value="login">Inicio Sesión</SelectItem>
                <SelectItem value="logout">Cierre Sesión</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[180px]" data-testid="filter-entity">
                <SelectValue placeholder="Todas las entidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                <SelectItem value="invoice">Facturas</SelectItem>
                <SelectItem value="client_provider">Clientes/Proveedores</SelectItem>
                <SelectItem value="user">Usuarios</SelectItem>
              </SelectContent>
            </Select>

            {user?.role === 'admin' && (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-[180px]" data-testid="filter-user">
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {/* In a real app, you would fetch users list */}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay registros de actividad
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.userName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionColors[log.actionType]} border-0`}>
                          <span className="flex items-center gap-1">
                            {actionIcons[log.actionType]}
                            {actionLabels[log.actionType]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[400px] truncate" title={log.description}>
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, page * limit + logs.length)} registros
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < limit}
                data-testid="next-page"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
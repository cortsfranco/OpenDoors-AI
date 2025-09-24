import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, 
  Download, 
  Search, 
  Filter,
  FileText,
  File,
  Calendar,
  User,
  DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Invoice } from "@shared/schema";

interface FileWithInvoiceData extends Invoice {
  clientProviderName: string;
}

export default function Files() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Fetch all invoices that have files
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices', { limit: 1000 }],
    queryFn: () => 
      fetch('/api/invoices?limit=1000', {
        credentials: 'include'
      }).then(res => res.json()),
    select: (data: any) => {
      if (!data?.invoices) return [];
      // Filter only invoices that have files
      return data.invoices.filter((invoice: Invoice) => invoice.filePath) as FileWithInvoiceData[];
    }
  });

  // Filter invoices based on search and type
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = searchTerm === '' || 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientProviderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || invoice.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleViewFile = (invoiceId: string) => {
    const fileUrl = `/api/invoices/${invoiceId}/file`;
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = (invoiceId: string, fileName?: string) => {
    const downloadUrl = `/api/invoices/${invoiceId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || `factura_${invoiceId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (filePath?: string) => {
    if (!filePath) return <File className="w-4 h-4" />;
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext === 'pdf' ? <FileText className="w-4 h-4 text-red-600" /> : <File className="w-4 h-4 text-blue-600" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'income' 
      ? "bg-green-100 text-green-800 border-green-200" 
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getClassColor = (invoiceClass: string) => {
    const colors = {
      'A': "bg-blue-100 text-blue-800 border-blue-200",
      'B': "bg-yellow-100 text-yellow-800 border-yellow-200", 
      'C': "bg-purple-100 text-purple-800 border-purple-200"
    };
    return colors[invoiceClass as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Archivos de Facturas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona y visualiza todos los archivos de facturas emitidas y recibidas
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredInvoices.length} archivos
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por número, cliente o propietario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-files"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                data-testid="filter-all"
              >
                Todos
              </Button>
              <Button
                variant={typeFilter === 'income' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('income')}
                data-testid="filter-income"
              >
                Ingresos
              </Button>
              <Button
                variant={typeFilter === 'expense' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('expense')}
                data-testid="filter-expense"
              >
                Egresos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron archivos</h3>
            <p className="text-gray-600">
              {searchTerm || typeFilter !== 'all' 
                ? "Intenta ajustar tus filtros de búsqueda"
                : "No hay archivos de facturas disponibles"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((invoice) => (
            <Card 
              key={invoice.id} 
              className="hover:shadow-md transition-shadow"
              data-testid={`file-card-${invoice.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(invoice.filePath ?? undefined)}
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {invoice.invoiceNumber || 'Sin número'}
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        {invoice.fileName || 'archivo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={getTypeColor(invoice.type)}>
                      {invoice.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                    <Badge className={getClassColor(invoice.invoiceClass || 'A')}>
                      {invoice.invoiceClass || 'A'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">
                      {invoice.date ? formatDate(invoice.date.toString()) : 'Sin fecha'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 font-medium">
                      {formatCurrency(invoice.totalAmount || '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 truncate">
                      {invoice.clientProviderName || invoice.ownerName || 'Sin cliente'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewFile(invoice.id)}
                    className="flex-1"
                    data-testid={`view-file-${invoice.id}`}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(invoice.id, invoice.fileName || undefined)}
                    className="flex-1"
                    data-testid={`download-file-${invoice.id}`}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Descargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
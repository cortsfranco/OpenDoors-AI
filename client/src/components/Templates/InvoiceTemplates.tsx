import { useState } from "react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { File, Plus, Edit3, Trash2, Copy, Zap, Building2, Wrench, Truck, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InvoiceTemplate } from "@shared/schema";

const PREDEFINED_TEMPLATES: InvoiceTemplate[] = [
  {
    id: '1',
    name: 'Servicios de Desarrollo Web',
    description: 'Plantilla para facturación de servicios de desarrollo web y programación',
    category: 'service',
    type: 'income',
    invoiceClass: 'A',
    clientProviderName: '',
    defaultSubtotal: 50000,
    defaultIvaPercentage: 21,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    usageCount: 12,
  },
  {
    id: '2', 
    name: 'Consultoría IT - Mensual',
    description: 'Plantilla recurrente para servicios de consultoría tecnológica',
    category: 'recurring',
    type: 'income',
    invoiceClass: 'A',
    clientProviderName: '',
    defaultSubtotal: 75000,
    defaultIvaPercentage: 21,
    isActive: true,
    createdAt: new Date('2024-12-01'),
    usageCount: 8,
  },
  {
    id: '3',
    name: 'Compra de Hardware',
    description: 'Para registrar compras de equipamiento y hardware',
    category: 'product',
    type: 'expense',
    invoiceClass: 'A',
    clientProviderName: '',
    defaultSubtotal: 25000,
    defaultIvaPercentage: 21,
    isActive: true,
    createdAt: new Date('2024-11-15'),
    usageCount: 5,
  },
  {
    id: '4',
    name: 'Servicios de Marketing Digital',
    description: 'Facturación para campañas publicitarias y marketing online',
    category: 'service',
    type: 'expense',
    invoiceClass: 'B',
    clientProviderName: '',
    defaultSubtotal: 30000,
    defaultIvaPercentage: 21,
    isActive: true,
    createdAt: new Date('2024-10-20'),
    usageCount: 15,
  },
  {
    id: '5',
    name: 'Mantenimiento de Sistemas',
    description: 'Servicios recurrentes de mantenimiento y soporte técnico',
    category: 'recurring',
    type: 'income',
    invoiceClass: 'A',
    clientProviderName: '',
    defaultSubtotal: 20000,
    defaultIvaPercentage: 21,
    isActive: true,
    createdAt: new Date('2024-09-10'),
    usageCount: 20,
  },
];

interface InvoiceTemplatesProps {
  onSelectTemplate?: (template: InvoiceTemplate) => void;
  showAsModal?: boolean;
}

const getCategoryIcon = (category: InvoiceTemplate['category']) => {
  switch (category) {
    case 'service': return Wrench;
    case 'product': return Building2;
    case 'recurring': return Zap;
    case 'custom': return Globe;
    default: return File;
  }
};

const getCategoryColor = (category: InvoiceTemplate['category']) => {
  switch (category) {
    case 'service': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'product': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'recurring': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'custom': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
};

const getCategoryLabel = (category: InvoiceTemplate['category']) => {
  switch (category) {
    case 'service': return 'Servicios';
    case 'product': return 'Productos';
    case 'recurring': return 'Recurrente';
    case 'custom': return 'Personalizado';
    default: return 'General';
  }
};

export default function InvoiceTemplates({ onSelectTemplate, showAsModal = false }: InvoiceTemplatesProps) {
  const { data: templates = PREDEFINED_TEMPLATES, isLoading } = useQuery({
    queryKey: ['/api/templates'],
    refetchInterval: 30000
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const { toast } = useToast();

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const useTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/templates/${id}/use`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    }
  });

  const handleUseTemplate = (template: InvoiceTemplate) => {
    useTemplateMutation.mutate(template.id);
    
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    
    toast({
      title: "Plantilla aplicada",
      description: `Se ha cargado la plantilla "${template.name}"`,
    });
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/templates/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla ha sido eliminada exitosamente",
      });
    }
  });

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const duplicateTemplateMutation = useMutation({
    mutationFn: (template: InvoiceTemplate) => {
      const duplicatedData = {
        name: `${template.name} (Copia)`,
        description: template.description,
        category: template.category,
        type: template.type,
        invoiceClass: template.invoiceClass,
        clientProviderName: template.clientProviderName,
        clientProviderCuit: template.clientProviderCuit,
        defaultSubtotal: template.defaultSubtotal,
        defaultIvaPercentage: template.defaultIvaPercentage,
        isActive: true,
      };
      return apiRequest('/api/templates', {
        method: 'POST',
        body: duplicatedData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Plantilla duplicada",
        description: "Se ha creado una copia exitosamente",
      });
    }
  });

  const handleDuplicateTemplate = (template: InvoiceTemplate) => {
    duplicateTemplateMutation.mutate(template);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const TemplateGrid = () => (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold break-words">Plantillas de Facturas</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acelera la carga con plantillas predefinidas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="service">Servicios</SelectItem>
              <SelectItem value="product">Productos</SelectItem>
              <SelectItem value="recurring">Recurrentes</SelectItem>
              <SelectItem value="custom">Personalizadas</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            data-testid="create-template-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredTemplates.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category);
          return (
            <Card 
              key={template.id} 
              className="relative hover:shadow-md transition-shadow cursor-pointer group"
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${getCategoryColor(template.category)}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium leading-5">
                        {template.name}
                      </CardTitle>
                      <Badge 
                        variant={template.type === 'income' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {template.type === 'income' ? 'Ingreso' : 'Egreso'} - Tipo {template.invoiceClass}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                        }}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTemplate(template);
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0" onClick={() => handleUseTemplate(template)}>
                <CardDescription className="text-xs mb-3 line-clamp-2">
                  {template.description}
                </CardDescription>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal base:</span>
                    <span className="font-medium">{formatCurrency(template.defaultSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA ({template.defaultIvaPercentage}%):</span>
                    <span className="font-medium">
                      {formatCurrency(template.defaultSubtotal * template.defaultIvaPercentage / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold">
                      {formatCurrency(template.defaultSubtotal * (1 + template.defaultIvaPercentage / 100))}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <Badge variant="outline" className={getCategoryColor(template.category)}>
                    {getCategoryLabel(template.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Usado {template.usageCount} veces
                  </span>
                </div>
                
                <Button 
                  className="w-full mt-3" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                >
                  <File className="w-4 h-4 mr-1" />
                  Usar Plantilla
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay plantillas en esta categoría</p>
          <p className="text-sm">Crea una nueva plantilla para comenzar</p>
        </div>
      )}
    </div>
  );

  if (showAsModal) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="open-templates-modal">
            <File className="w-4 h-4 mr-2" />
            Plantillas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plantillas de Facturas</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla para acelerar la carga de tu factura
            </DialogDescription>
          </DialogHeader>
          <TemplateGrid />
        </DialogContent>
      </Dialog>
    );
  }

  return <TemplateGrid />;
}
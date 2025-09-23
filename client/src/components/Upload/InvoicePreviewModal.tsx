import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Building2, FileText, Edit3, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceData {
  type: 'income' | 'expense';
  invoiceClass: 'A' | 'B' | 'C';
  date: string;
  clientProviderName: string;
  clientProviderCuit?: string;
  invoiceNumber?: string;
  description?: string;
  subtotal: string;
  ivaAmount: string;
  totalAmount: string;
  uploadedByName: string;
  ownerName: string;
}

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
  fileName: string;
  onSave: (data: InvoiceData) => void;
  onCancel: () => void;
}

export default function InvoicePreviewModal({ 
  open, 
  onOpenChange, 
  invoiceData, 
  fileName,
  onSave,
  onCancel 
}: InvoicePreviewModalProps) {
  const [formData, setFormData] = useState<InvoiceData>({
    type: 'expense',
    invoiceClass: 'A',
    date: '',
    clientProviderName: '',
    clientProviderCuit: '',
    invoiceNumber: '',
    description: '',
    subtotal: '',
    ivaAmount: '',
    totalAmount: '',
    uploadedByName: '',
    ownerName: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (invoiceData) {
      setFormData(invoiceData);
    }
  }, [invoiceData]);

  const handleSave = () => {
    if (!formData.clientProviderName || !formData.totalAmount) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    onSave(formData);
    setIsEditing(false);
    onOpenChange(false);
    
    toast({
      title: "Factura guardada",
      description: "Los datos se han guardado correctamente",
      variant: "default",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    onCancel();
    onOpenChange(false);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  const getTypeIcon = (type: string) => {
    return type === 'income' ? '📈' : '📉';
  };

  const getClassColor = (invoiceClass: string) => {
    switch (invoiceClass) {
      case 'A': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'C': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumen de Factura Procesada
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Archivo: <span className="font-mono">{fileName}</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Básica */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo de Factura</Label>
                  {isEditing ? (
                    <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Ingreso</SelectItem>
                        <SelectItem value="expense">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span>{getTypeIcon(formData.type)}</span>
                      <span className="font-medium">{formData.type === 'income' ? 'Ingreso' : 'Egreso'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="invoiceClass">Clase</Label>
                  {isEditing ? (
                    <Select value={formData.invoiceClass} onValueChange={(value: 'A' | 'B' | 'C') => 
                      setFormData(prev => ({ ...prev, invoiceClass: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge className={getClassColor(formData.invoiceClass)}>
                        Clase {formData.invoiceClass}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="date">Fecha</Label>
                {isEditing ? (
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(formData.date).toLocaleDateString('es-AR')}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="clientProviderName">Cliente/Proveedor *</Label>
                {isEditing ? (
                  <Input
                    id="clientProviderName"
                    value={formData.clientProviderName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientProviderName: e.target.value }))}
                    placeholder="Nombre del cliente o proveedor"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formData.clientProviderName}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="invoiceNumber">Número de Factura</Label>
                {isEditing ? (
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Número de factura"
                  />
                ) : (
                  <div className="mt-1">
                    <span className="font-mono">{formData.invoiceNumber || 'No especificado'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información Financiera */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Información Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subtotal">Subtotal</Label>
                {isEditing ? (
                  <Input
                    id="subtotal"
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtotal: e.target.value }))}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="mt-1">
                    <span className="font-mono text-lg">{formatCurrency(formData.subtotal)}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="ivaAmount">IVA</Label>
                {isEditing ? (
                  <Input
                    id="ivaAmount"
                    type="number"
                    step="0.01"
                    value={formData.ivaAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, ivaAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="mt-1">
                    <span className="font-mono text-lg">{formatCurrency(formData.ivaAmount)}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="totalAmount">Total *</Label>
                {isEditing ? (
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="mt-1">
                    <span className="font-mono text-xl font-bold text-primary">{formatCurrency(formData.totalAmount)}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción adicional"
                    rows={3}
                  />
                ) : (
                  <div className="mt-1">
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'Sin descripción'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información de Usuario */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Información de Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargado por</Label>
                <div className="mt-1">
                  <span className="font-medium">{formData.uploadedByName}</span>
                </div>
              </div>
              <div>
                <Label>Propietario</Label>
                <div className="mt-1">
                  <span className="font-medium">{formData.ownerName}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar Edición
              </Button>
              <Button onClick={handleSave}>
                <Check className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Datos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import UploadZone from "@/components/Upload/UploadZone";
import UploadProgress from "@/components/Upload/UploadProgress";
import InvoiceSummaryModal from "@/components/Upload/InvoiceSummaryModal";
import ManualInvoiceModal from "@/components/Upload/ManualInvoiceModal";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice } from "@shared/schema";

// SessionStorage keys for persistence
const SESSION_STORAGE_KEYS = {
  UPLOAD_OWNER: 'uploadOwner_session'
};

const saveOwnerToSession = (owner: string) => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.UPLOAD_OWNER, owner);
  } catch (error) {
    console.warn('Error saving owner to session:', error);
  }
};

const loadOwnerFromSession = () => {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.UPLOAD_OWNER) || 'Joni Tagua';
  } catch (error) {
    console.warn('Error loading owner from session:', error);
  }
  return 'Joni Tagua';
};

export default function Upload() {
  const { user } = useAuth();
  const [processedInvoice, setProcessedInvoice] = useState<Invoice | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>(() => loadOwnerFromSession());
  const [customOwner, setCustomOwner] = useState<string>('');
  const { toast } = useToast();

  const createInvoiceMutation = useCreateInvoice();


  // Save owner selection to session
  useEffect(() => {
    saveOwnerToSession(selectedOwner);
  }, [selectedOwner]);


  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    
    if (!user) {
      toast({
        title: "Sesión requerida",
        description: "Por favor inicia sesión para subir archivos",
        variant: "default",
      });
      return;
    }

    // Directly process files using async endpoint
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    try {
      // Process each file individually to ensure proper ownerName assignment
      for (const file of files) {
        const formData = new FormData();
        formData.append('uploadFile', file);
        
        const finalOwnerName = selectedOwner === 'Otro socio' && customOwner ? customOwner : selectedOwner;
        formData.append('ownerName', finalOwnerName);
        
        // DEBUG: Log the ownerName values
        console.log('🔍 DEBUG Frontend - selectedOwner:', selectedOwner);
        console.log('🔍 DEBUG Frontend - customOwner:', customOwner);
        console.log('🔍 DEBUG Frontend - finalOwnerName:', finalOwnerName);
        console.log('🔍 DEBUG Frontend - fileName:', file.name);

        // Send file to async processing endpoint
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        await response.json();
      }

      toast({
        title: "Archivos enviados",
        description: `${files.length} archivo(s) en procesamiento. Puedes navegar libremente.`,
        variant: "success",
      });

    } catch (error: any) {
      const errorMessage = error?.message || 'Error al enviar archivos';
      
      toast({
        title: "Error al enviar",
        description: errorMessage,
        variant: "error",
      });
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="upload-page">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Hola {user?.displayName?.split(' ')[0] || 'Usuario'}, Cargar Nueva Factura
          </h2>
          <p className="text-muted-foreground">
            Arrastra o selecciona archivos para procesar facturas
          </p>
        </div>

        {/* =============================================================== */}
        {/* INICIO CORRECCIÓN: Grid de 3 columnas para los bloques        */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Bloque 1: Owner Selection Section */}
          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-800 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400 mb-4 h-7 flex items-center">
              Propietario de la factura
            </h3>
            <div className="space-y-4 flex-grow">
              <div>
                <Label className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 block">
                  Socio de OpenDoors
                </Label>
                <div className="space-y-2">
                  {/* Hernán Pagani */}
                  <Button
                    type="button"
                    variant={selectedOwner === 'Hernán Pagani' ? 'default' : 'outline'}
                    className={`w-full justify-start text-left h-12 ${
                      selectedOwner === 'Hernán Pagani' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                        : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-300 hover:border-purple-400'
                    }`}
                    onClick={() => setSelectedOwner('Hernán Pagani')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedOwner === 'Hernán Pagani' ? 'bg-white' : 'bg-purple-400'
                      }`} />
                      <span className="font-medium">Hernán Pagani</span>
                    </div>
                  </Button>

                  {/* Joni Tagua */}
                  <Button
                    type="button"
                    variant={selectedOwner === 'Joni Tagua' ? 'default' : 'outline'}
                    className={`w-full justify-start text-left h-12 ${
                      selectedOwner === 'Joni Tagua' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                        : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-300 hover:border-purple-400'
                    }`}
                    onClick={() => setSelectedOwner('Joni Tagua')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedOwner === 'Joni Tagua' ? 'bg-white' : 'bg-purple-400'
                      }`} />
                      <span className="font-medium">Joni Tagua</span>
                    </div>
                  </Button>

                  {/* Otro socio */}
                  <Button
                    type="button"
                    variant={selectedOwner === 'Otro socio' ? 'default' : 'outline'}
                    className={`w-full justify-start text-left h-12 ${
                      selectedOwner === 'Otro socio' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                        : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-300 hover:border-purple-400'
                    }`}
                    onClick={() => setSelectedOwner('Otro socio')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedOwner === 'Otro socio' ? 'bg-white' : 'bg-purple-400'
                      }`} />
                      <span className="font-medium">Otro socio (especificar nombre)</span>
                    </div>
                  </Button>
                </div>
              </div>
              {selectedOwner === 'Otro socio' && (
                <div>
                  <Label htmlFor="customOwner" className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    Nombre del propietario
                  </Label>
                  <Input
                    id="customOwner"
                    type="text"
                    value={customOwner}
                    onChange={(e) => setCustomOwner(e.target.value)}
                    placeholder="Ingrese el nombre del propietario"
                    className="mt-2 border-purple-300 focus:border-purple-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Upload Zone Section */}
          <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mb-4 h-7 flex items-center">
              Cargar archivo de factura
            </h3>
            <div className="flex-grow">
              <UploadZone ownerName={selectedOwner === 'Otro socio' && customOwner ? customOwner : selectedOwner} />
            </div>
          </div>
          
          {/* Bloque 3: Manual Entry Button convertido en Card */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4 h-7 flex items-center">
              ¿No tienes el archivo?
            </h3>
            <div className="flex-grow flex items-center justify-center">
              <Button
                onClick={() => setShowManualForm(true)}
                variant="outline"
                className="w-full bg-white/50"
                data-testid="manual-entry-button"
              >
                <Edit className="w-4 h-4 mr-2" />
                Ingresar Datos Manualmente
              </Button>
            </div>
          </div>
        </div>
        {/* =============================================================== */}
        {/* FIN CORRECCIÓN: Fin del Grid                                  */}
        {/* =============================================================== */}

        {/* Upload Progress - Real-time job tracking */}
        <UploadProgress showRecentJobs={true} />

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3">
              Instrucciones de Carga
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                Asegúrate de que el archivo contenga información clara y legible
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                El sistema extraerá automáticamente los datos principales (fecha emisión, total, IVA, CUIT del emisor)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                Podrás revisar, corregir o agregar información manualmente antes de guardar
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                El proceso puede tardar unos segundos dependiendo del tamaño del archivo
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Invoice Summary Modal */}
        <InvoiceSummaryModal 
          open={showSummaryModal}
          onOpenChange={setShowSummaryModal}
          invoice={processedInvoice}
        />
        
        {/* Manual Invoice Entry Modal */}
        {showManualForm && (
          <ManualInvoiceModal
            open={showManualForm}
            onOpenChange={setShowManualForm}
            uploadedByName={user?.displayName || 'Unknown User'}
            selectedOwner={selectedOwner}
            customOwner={customOwner}
            onOwnerChange={setSelectedOwner}
            onCustomOwnerChange={setCustomOwner}
          />
        )}
      </div>
    </div>
  );
}
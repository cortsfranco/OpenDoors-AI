import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Cloud, FileText, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileSelect(acceptedFiles);
  }, [onFileSelect]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true, // Allow multiple files
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleCameraClick = () => {
    // Camera functionality would be implemented here
    console.log('Open camera');
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "bg-card rounded-lg border-2 border-dashed border-border p-6 text-center drag-zone transition-all duration-300 hover:border-primary cursor-pointer",
        isDragActive && "drag-over",
        disabled && "opacity-50 cursor-not-allowed"
      )}
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
            disabled={disabled}
            data-testid="select-files-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Seleccionar Archivos
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCameraClick}
            disabled={disabled}
            data-testid="camera-button"
          >
            <Camera className="w-4 h-4 mr-2" />
            Usar Cámara
          </Button>
        </div>
      </div>
    </div>
  );
}

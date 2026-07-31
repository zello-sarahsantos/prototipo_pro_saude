import { useRef } from "react";
import { Upload, FileCheck, X } from "lucide-react";

export function ComprovanteUploadBox({
  arquivo,
  onSelect,
  onClear,
}: {
  arquivo: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (arquivo) {
    return (
      <div className="w-full border border-border rounded-lg p-4 flex items-center gap-3">
        <FileCheck className="h-6 w-6 text-status-aprovado-fg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{arquivo.name}</p>
          <p className="text-xs text-muted-foreground">{(arquivo.size / 1024).toFixed(0)} KB</p>
        </div>
        <button type="button" onClick={onClear} aria-label="Remover arquivo">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/50 transition"
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
        <p className="text-sm font-medium">Tocar para enviar</p>
        <p className="text-xs text-muted-foreground">PDF, JPG ou PNG (até 10 MB)</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
    </>
  );
}

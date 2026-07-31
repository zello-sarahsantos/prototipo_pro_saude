import { FileText, ZoomIn } from "lucide-react";

/** Simula um preview de documento inline (mesmo padrão visual usado na fila de requerimentos). */
export function DocPreview({ filename }: { filename: string }) {
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border">
        <FileText className="h-3.5 w-3.5" />
        <span className="truncate font-medium">{filename}</span>
        <span className="ml-auto opacity-60">{isPdf ? "PDF" : "IMG"}</span>
      </div>
      <div className="bg-white h-48 flex flex-col items-center justify-center gap-2 relative">
        <div className="w-16 h-20 border-2 border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center gap-1">
          <FileText className="h-6 w-6 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40 font-mono">{isPdf ? "PDF" : "IMG"}</span>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center px-4">{filename}</p>
        <button className="absolute bottom-2 right-2 text-[10px] text-primary flex items-center gap-1 hover:underline">
          <ZoomIn className="h-3 w-3" /> Ampliar
        </button>
      </div>
    </div>
  );
}

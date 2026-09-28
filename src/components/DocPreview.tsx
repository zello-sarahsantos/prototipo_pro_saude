import { ExternalLink, FileText } from "lucide-react";

/** Prévia de anexos reais; registros de exemplo sem arquivo conservam apenas o nome. */
export function DocPreview({ filename, src }: { filename: string; src?: string }) {
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpe?g|png|webp)$/i.test(filename);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium">{filename}</span>
        {src && <a href={src} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir documento
        </a>}
      </div>
      {src && isPdf ? (
        <iframe title={`Prévia de ${filename}`} src={src} className="w-full h-80 bg-white" loading="lazy" />
      ) : src && isImage ? (
        <div className="bg-white max-h-96 overflow-auto flex justify-center">
          <img src={src} alt={`Documento ${filename}`} className="max-w-full h-auto object-contain" loading="lazy" />
        </div>
      ) : (
        <div className="bg-muted/20 p-5 text-xs text-muted-foreground text-center">
          {src ? 'Este formato não tem prévia integrada; use Abrir documento.' : 'Arquivo de exemplo sem original disponível.'}
        </div>
      )}
    </div>
  );
}

import { useRef } from "react";
import { Upload, FileCheck, X } from "lucide-react";
import { tipoDocumentoArquivoLabels, type TipoDocumentoArquivo } from "@/lib/mock-data";
import { detectarTiposPeloNomeArquivo } from "@/lib/ocr-mock";

export interface ArquivoComTipos {
  file: File;
  tipos: TipoDocumentoArquivo[];
}

/**
 * Upload de um ou mais arquivos complementares para o mesmo envio (ex: fatura técnica +
 * comprovante de pagamento). Cada arquivo tem seu próprio grupo de marcadores indicando quais
 * tipos documentais ele contém — um arquivo pode representar mais de um tipo ao mesmo tempo.
 */
export function ArquivosAnexadosUpload({
  arquivos,
  tiposPermitidos,
  onChange,
}: {
  arquivos: ArquivoComTipos[];
  tiposPermitidos: TipoDocumentoArquivo[];
  onChange: (arquivos: ArquivoComTipos[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function adicionarArquivo(file: File) {
    const tiposDetectados = detectarTiposPeloNomeArquivo(file.name, tiposPermitidos);
    onChange([...arquivos, { file, tipos: tiposDetectados }]);
  }

  function removerArquivo(index: number) {
    onChange(arquivos.filter((_, i) => i !== index));
  }

  function alternarTipo(index: number, tipo: TipoDocumentoArquivo) {
    onChange(
      arquivos.map((a, i) =>
        i === index
          ? { ...a, tipos: a.tipos.includes(tipo) ? a.tipos.filter((t) => t !== tipo) : [...a.tipos, tipo] }
          : a,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {arquivos.map((a, index) => (
        <div key={index} className="w-full border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-status-aprovado-fg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.file.name}</p>
              <p className="text-xs text-muted-foreground">{(a.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => removerArquivo(index)} aria-label="Remover arquivo">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Este arquivo contém:</p>
            <div className="flex flex-wrap gap-2">
              {tiposPermitidos.map((tipo) => {
                const marcado = a.tipos.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => alternarTipo(index, tipo)}
                    className={`text-xs rounded-full border px-3 py-1.5 transition ${
                      marcado ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {marcado ? "☑" : "☐"} {tipoDocumentoArquivoLabels[tipo]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/50 transition"
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
        <p className="text-sm font-medium">{arquivos.length === 0 ? "Tocar para enviar" : "Adicionar outro arquivo"}</p>
        <p className="text-xs text-muted-foreground">PDF, JPG ou PNG (até 10 MB)</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) adicionarArquivo(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

import { useRef } from "react";
import { Upload, FileCheck, X, Check, Users } from "lucide-react";
import {
  tipoDocumentoArquivoLabels,
  type BeneficiarioPagamento,
  type DocumentoDetectado,
  type TipoDocumentoArquivo,
} from "@/lib/mock-data";
import { detectarTiposPeloNomeArquivo } from "@/lib/ocr-mock";
import { getCoberturaDocumental } from "@/lib/comprovante-status";

export interface ArquivoComDocumentos {
  file: File;
  documentos: DocumentoDetectado[];
}

/** Com só 1 beneficiário no envio a cobertura é implícita (sem pergunta); com mais de 1, todo
 *  documento novo começa sem ninguém marcado — o servidor precisa declarar explicitamente. */
function coberturaInicial(beneficiarios: BeneficiarioPagamento[]): string[] | undefined {
  return beneficiarios.length > 1 ? [] : undefined;
}

/**
 * Upload de um ou mais arquivos complementares para o mesmo envio (ex: fatura técnica +
 * comprovante de pagamento). Cada arquivo tem seu próprio grupo de marcadores indicando quais
 * tipos documentais ele contém — um arquivo pode representar mais de um tipo ao mesmo tempo,
 * cada um com sua própria cobertura de beneficiários (`DocumentoDetectado.beneficiarioIds`).
 * Quando o envio tem só 1 beneficiário, a cobertura é implícita e a pergunta não aparece.
 */
export function ArquivosAnexadosUpload({
  arquivos,
  tiposPermitidos,
  beneficiarios,
  modalidadePlano,
  onChange,
}: {
  arquivos: ArquivoComDocumentos[];
  tiposPermitidos: TipoDocumentoArquivo[];
  beneficiarios: BeneficiarioPagamento[];
  modalidadePlano: BeneficiarioPagamento["modalidadePlano"];
  onChange: (arquivos: ArquivoComDocumentos[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const multiplosBeneficiarios = beneficiarios.length > 1;

  function adicionarArquivo(file: File) {
    const tiposDetectados = detectarTiposPeloNomeArquivo(file.name, tiposPermitidos);
    const inicial = coberturaInicial(beneficiarios);
    onChange([...arquivos, { file, documentos: tiposDetectados.map((tipo) => ({ tipo, beneficiarioIds: inicial })) }]);
  }

  function removerArquivo(index: number) {
    onChange(arquivos.filter((_, i) => i !== index));
  }

  function alternarTipo(index: number, tipo: TipoDocumentoArquivo) {
    onChange(
      arquivos.map((a, i) => {
        if (i !== index) return a;
        const jaMarcado = a.documentos.some((d) => d.tipo === tipo);
        return {
          ...a,
          documentos: jaMarcado
            ? a.documentos.filter((d) => d.tipo !== tipo)
            : [...a.documentos, { tipo, beneficiarioIds: coberturaInicial(beneficiarios) }],
        };
      }),
    );
  }

  function definirCobertura(index: number, tipo: TipoDocumentoArquivo, beneficiarioIds: string[]) {
    onChange(
      arquivos.map((a, i) =>
        i === index
          ? { ...a, documentos: a.documentos.map((d) => (d.tipo === tipo ? { ...d, beneficiarioIds } : d)) }
          : a,
      ),
    );
  }

  /** Nenhum tipo documental é obrigatoriamente individual — Recibo e Demonstrativo também
   *  podem listar vários beneficiários, dependendo do que o documento real traz. */
  function alternarBeneficiario(index: number, tipo: TipoDocumentoArquivo, beneficiarioId: string) {
    const documento = arquivos[index].documentos.find((d) => d.tipo === tipo);
    const atual = documento?.beneficiarioIds ?? [];
    const novo = atual.includes(beneficiarioId)
      ? atual.filter((id) => id !== beneficiarioId)
      : [...atual, beneficiarioId];
    definirCobertura(index, tipo, novo);
  }

  const cobertura = getCoberturaDocumental(beneficiarios, arquivos, modalidadePlano);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {modalidadePlano === "empresarial" ? (
          <>
            <p className="font-medium mb-1">Para este grupo, é necessário enviar:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Fatura Técnica</li>
              <li>Comprovante de Pagamento</li>
            </ul>
          </>
        ) : (
          <>
            <p className="font-medium mb-1">Para este grupo, envie uma destas combinações:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Boleto + Comprovante de Pagamento</li>
              <li>ou Recibo</li>
              <li>ou Demonstrativo de Pagamento</li>
            </ul>
          </>
        )}
      </div>

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
                  const marcado = a.documentos.some((d) => d.tipo === tipo);
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

            {multiplosBeneficiarios && a.documentos.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border">
                {a.documentos.map((documento) => {
                  const cobertos = documento.beneficiarioIds ?? [];
                  const todosSelecionados = cobertos.length === beneficiarios.length;
                  return (
                    <div key={documento.tipo}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {tipoDocumentoArquivoLabels[documento.tipo]} cobre:
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            definirCobertura(
                              index,
                              documento.tipo,
                              todosSelecionados ? [] : beneficiarios.map((b) => b.id),
                            )
                          }
                          className="text-xs text-primary font-medium flex items-center gap-1 shrink-0"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {todosSelecionados ? "Limpar seleção" : "Selecionar todos"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {beneficiarios.map((b) => {
                          const selecionado = cobertos.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => alternarBeneficiario(index, documento.tipo, b.id)}
                              className={`text-xs text-left rounded-md border px-3 py-1.5 transition ${
                                selecionado
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              {selecionado ? "☑" : "☐"} {b.nome}
                            </button>
                          );
                        })}
                      </div>
                      {cobertos.length === 0 && (
                        <p className="text-xs text-warning italic mt-1.5">
                          Selecione quem está contemplado neste documento.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

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

      {arquivos.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cobertura por beneficiário
          </p>
          {cobertura.map((c) => {
            const beneficiario = beneficiarios.find((b) => b.id === c.beneficiarioId);
            return (
              <div key={c.beneficiarioId} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">{beneficiario?.nome}</span>
                {c.contemplado ? (
                  <span className="text-success flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {c.tiposEncontrados.map((t) => tipoDocumentoArquivoLabels[t]).join(" + ")}
                  </span>
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <X className="h-3.5 w-3.5 shrink-0" />
                    {c.faltando}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

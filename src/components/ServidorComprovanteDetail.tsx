import { useState } from "react";
import { X, RefreshCw, RotateCcw, XCircle, Loader2 } from "lucide-react";
import { DocPreview } from "@/components/DocPreview";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { ComprovanteUploadBox } from "@/components/ComprovanteUploadBox";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import {
  beneficiariosPagamento,
  formatCompetencia,
  type Comprovante,
  type CampoExtraido,
  type StatusComprovante,
} from "@/lib/mock-data";
import { getCamposDoBeneficiario, getListaStatusBeneficiario } from "@/lib/comprovante-status";
import { processarNovoArquivo, confirmarReenvio } from "@/lib/reenvio-comprovante";

const titular = beneficiariosPagamento.find((b) => b.parentesco === "Titular");
const autorServidor = titular?.nome ?? "Servidor";

type AcaoStep = "upload" | "processando" | "ilegivel" | "revisao";

export function ServidorComprovanteDetail({
  comprovante,
  focusBeneficiarioId,
  onClose,
  onChanged,
}: {
  comprovante: Comprovante;
  focusBeneficiarioId?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [acaoAtiva, setAcaoAtiva] = useState<{ beneficiarioId: string; step: AcaoStep } | null>(null);
  const [campos, setCampos] = useState<CampoExtraido[]>([]);
  const [novoArquivoNome, setNovoArquivoNome] = useState<string>(comprovante.arquivo);

  const lista = getListaStatusBeneficiario(comprovante);
  const ordenada = focusBeneficiarioId
    ? [...lista].sort((a, b) =>
        a.beneficiarioId === focusBeneficiarioId ? -1 : b.beneficiarioId === focusBeneficiarioId ? 1 : 0,
      )
    : lista;

  function nome(id: string) {
    return beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
  }

  function iniciarAcao(beneficiarioId: string) {
    setAcaoAtiva({ beneficiarioId, step: "upload" });
  }

  function selecionarArquivo(beneficiarioId: string, arquivo: File) {
    const beneficiario = beneficiariosPagamento.find((b) => b.id === beneficiarioId);
    if (!beneficiario) return;
    setAcaoAtiva({ beneficiarioId, step: "processando" });
    setNovoArquivoNome(arquivo.name);
    setTimeout(() => {
      const resultado = processarNovoArquivo(comprovante, beneficiario, arquivo);
      if (resultado.ilegivel) {
        setAcaoAtiva({ beneficiarioId, step: "ilegivel" });
      } else {
        setCampos(resultado.campos);
        setAcaoAtiva({ beneficiarioId, step: "revisao" });
      }
    }, 1200);
  }

  function confirmar(beneficiarioId: string, novoStatus: Extract<StatusComprovante, "ilegivel" | "em_analise">) {
    confirmarReenvio({
      comprovante,
      beneficiarioId,
      novoArquivo: novoArquivoNome,
      novoStatus,
      campos,
      autor: autorServidor,
    });
    setAcaoAtiva(null);
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-elevated max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold">{comprovante.arquivo}</h2>
            <p className="text-xs text-muted-foreground">
              {formatCompetencia(comprovante.competencia)}
              {comprovante.isRetroativo && " • Retroativo"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <DocPreview filename={comprovante.arquivo} />

          {comprovante.isRetroativo && comprovante.justificativaAtraso && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-medium text-muted-foreground mb-1">Justificativa do atraso enviada:</p>
              <p>{comprovante.justificativaAtraso}</p>
            </div>
          )}

          {ordenada.map(({ beneficiarioId, status }) => {
            const camposAtuais = getCamposDoBeneficiario(comprovante, beneficiarioId);
            const emAcao = acaoAtiva?.beneficiarioId === beneficiarioId;
            const historico = comprovante.aprovacoes.filter(
              (a) => !a.beneficiarioId || a.beneficiarioId === beneficiarioId,
            );
            const decisaoFinal = [...historico]
              .reverse()
              .find((a) => a.acao === "aprovado" || a.acao === "aprovado_com_ressalva" || a.acao === "recusado");
            const pedidoCorrecao = [...historico].reverse().find((a) => a.acao === "correcao_solicitada");
            const versaoAnterior = comprovante.versoesAnteriores?.at(-1);

            return (
              <div key={beneficiarioId} className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{nome(beneficiarioId)}</p>
                  <ComprovanteStatusBadge status={status} />
                </div>

                {/* ===== Ilegível ===== */}
                {status === "ilegivel" && !emAcao && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Não conseguimos processar este documento com o OCR/IA — o score de leitura ficou abaixo do
                      mínimo exigido. Envie uma foto ou digitalização mais nítida.
                    </p>
                    {versaoAnterior && (
                      <p className="text-xs text-muted-foreground italic">
                        Documento anterior: {versaoAnterior.arquivo} (
                        {new Date(versaoAnterior.dataEnvio).toLocaleString("pt-BR")})
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => iniciarAcao(beneficiarioId)}
                        className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Substituir documento
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== Correção solicitada ===== */}
                {status === "correcao_solicitada" && !emAcao && (
                  <div className="space-y-2">
                    {pedidoCorrecao && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                        <p>
                          <strong>Motivo informado pelo Analista:</strong> {pedidoCorrecao.comentario}
                        </p>
                        <p className="text-muted-foreground">
                          {pedidoCorrecao.aprovadoPor} em {new Date(pedidoCorrecao.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    <CamposExtraidosForm campos={camposAtuais} readOnly />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => iniciarAcao(beneficiarioId)}
                        className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Corrigir e reenviar
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== Em análise (somente leitura) ===== */}
                {status === "em_analise" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm campos={camposAtuais} readOnly />
                    <p className="text-xs text-muted-foreground italic">
                      Em análise pela GERDAB — não é possível editar ou substituir enquanto aguarda conferência.
                    </p>
                  </div>
                )}

                {/* ===== Retroativo aguardando analista/gerência (somente leitura) ===== */}
                {(status === "retroativo_aguardando_analista" || status === "retroativo_aguardando_gerencia") && (
                  <div className="space-y-2">
                    <CamposExtraidosForm campos={camposAtuais} readOnly />
                    <p className="text-xs text-muted-foreground italic">
                      Etapa atual: {status === "retroativo_aguardando_analista" ? "1ª alçada (Analista)" : "2ª alçada (Gerência)"} —
                      somente leitura enquanto aguarda decisão.
                    </p>
                  </div>
                )}

                {/* ===== Aprovado / aprovado com ressalva (somente leitura) ===== */}
                {(status === "aprovado" || status === "aprovado_com_ressalva" || status === "retroativo_aprovado") && (
                  <div className="space-y-2">
                    <CamposExtraidosForm campos={camposAtuais} readOnly />
                    {decisaoFinal && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                        <p>
                          <strong>Decisão:</strong>{" "}
                          {decisaoFinal.acao === "aprovado_com_ressalva" ? "Aprovado com ressalva" : "Aprovado"}
                        </p>
                        {decisaoFinal.comentario && (
                          <p>
                            <strong>Justificativa:</strong> {decisaoFinal.comentario}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          {decisaoFinal.aprovadoPor} ({decisaoFinal.etapa}) em{" "}
                          {new Date(decisaoFinal.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== Recusado (somente leitura, terminal) ===== */}
                {status === "recusado" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm campos={camposAtuais} readOnly />
                    {decisaoFinal && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs space-y-1">
                        <p className="flex items-center gap-1.5 text-destructive font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Recusado
                        </p>
                        {decisaoFinal.motivo && (
                          <p>
                            <strong>Motivo:</strong> {decisaoFinal.motivo}
                          </p>
                        )}
                        {decisaoFinal.comentario && <p>{decisaoFinal.comentario}</p>}
                        <p className="text-muted-foreground">
                          {decisaoFinal.aprovadoPor} em {new Date(decisaoFinal.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      Recusa é definitiva — não é possível reenviar este comprovante.
                    </p>
                  </div>
                )}

                {/* ===== Fluxo inline de substituição/reenvio ===== */}
                {emAcao && acaoAtiva.step === "upload" && (
                  <div className="space-y-2">
                    <ComprovanteUploadBox
                      arquivo={null}
                      onSelect={(f) => selecionarArquivo(beneficiarioId, f)}
                      onClear={() => setAcaoAtiva(null)}
                    />
                    <button
                      onClick={() => setAcaoAtiva(null)}
                      className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {emAcao && acaoAtiva.step === "processando" && (
                  <div className="p-6 text-center space-y-2">
                    <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
                    <p className="text-sm text-muted-foreground">Processando documento com OCR/IA...</p>
                  </div>
                )}

                {emAcao && acaoAtiva.step === "ilegivel" && (
                  <div className="p-4 text-center space-y-2">
                    <XCircle className="h-8 w-8 text-destructive mx-auto" />
                    <p className="text-sm">O novo documento também está ilegível.</p>
                    <button
                      onClick={() => setAcaoAtiva({ beneficiarioId, step: "upload" })}
                      className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {emAcao && acaoAtiva.step === "revisao" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm campos={campos} onChange={setCampos} />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setAcaoAtiva(null)}
                        className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => confirmar(beneficiarioId, "em_analise")}
                        className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light"
                      >
                        Confirmar reenvio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="px-6 py-4 border-t border-border flex justify-end sticky bottom-0 bg-card">
          <button onClick={onClose} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, RefreshCw, RotateCcw, XCircle, Loader2, FilePlus, FileSignature } from "lucide-react";
import { DocPreview } from "@/components/DocPreview";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { ComprovanteUploadBox } from "@/components/ComprovanteUploadBox";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import {
  beneficiariosPagamento,
  formatCompetencia,
  tipoRequerimentoLabels,
  type Comprovante,
  type CampoExtraido,
  type StatusComprovante,
} from "@/lib/mock-data";
import {
  getCamposDoBeneficiario,
  getDecomposicaoValor,
  getDivergenciaBoletoComprovante,
  getElegibilidade,
  getListaStatusBeneficiario,
  type DecomposicaoValor,
} from "@/lib/comprovante-status";
import { gerarItensFinanceiros } from "@/lib/ocr-mock";
import { processarNovoArquivo, confirmarReenvio } from "@/lib/reenvio-comprovante";
import { getBeneficiariosPagamentoAtual } from "@/lib/prosaude-storage";

const titular = beneficiariosPagamento.find((b) => b.parentesco === "Titular");
const autorServidor = titular?.nome ?? "Servidor";

const EMPTY_DECOMPOSICAO: DecomposicaoValor = { itens: [], valorTotal: 0, valorElegivel: 0, valorNaoReembolsavel: 0 };

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
  const [novoArquivoNome, setNovoArquivoNome] = useState<string>(comprovante.arquivos[0]?.nome ?? "documento.pdf");

  // Cadastro "atual" (seed + correções já aplicadas pela GERDAB) — ver mock-data.ts.
  const beneficiariosAtuais = getBeneficiariosPagamentoAtual();

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
    const beneficiario = beneficiariosAtuais.find((b) => b.id === beneficiarioId);
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
            <h2 className="font-semibold">{comprovante.arquivos.map((a) => a.nome).join(", ")}</h2>
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
          <div className="space-y-2">
            {comprovante.arquivos.map((a) => (
              <DocPreview key={a.nome} filename={a.nome} />
            ))}
          </div>

          {comprovante.isRetroativo && comprovante.justificativaAtraso && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-medium text-muted-foreground mb-1">Justificativa do atraso enviada:</p>
              <p>{comprovante.justificativaAtraso}</p>
            </div>
          )}

          {comprovante.solicitacaoComplementar && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-2">
              <p className="font-medium text-warning">GERDAB solicitou documento complementar</p>
              <p>{comprovante.solicitacaoComplementar.motivo}</p>
              <p className="text-muted-foreground">
                {comprovante.solicitacaoComplementar.solicitadoPor} em{" "}
                {new Date(comprovante.solicitacaoComplementar.data).toLocaleString("pt-BR")}
              </p>
              <Link
                to="/servidor/pagamentos/enviar"
                search={{
                  competencia: comprovante.competencia,
                  beneficiario: focusBeneficiarioId ?? comprovante.beneficiarioIds[0],
                }}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-light"
              >
                <FilePlus className="h-3.5 w-3.5" /> Anexar documento complementar
              </Link>
            </div>
          )}

          {comprovante.solicitacaoRequerimento && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-2">
              <p className="font-medium text-warning">
                GERDAB solicitou requerimento de {tipoRequerimentoLabels[comprovante.solicitacaoRequerimento.tipo]}
              </p>
              <p>{comprovante.solicitacaoRequerimento.motivo}</p>
              <p className="text-muted-foreground">
                {comprovante.solicitacaoRequerimento.solicitadoPor} em{" "}
                {new Date(comprovante.solicitacaoRequerimento.data).toLocaleString("pt-BR")}
              </p>
              <Link
                to={
                  comprovante.solicitacaoRequerimento.tipo === "mudanca_plano"
                    ? "/servidor/requerimento/novo-plano"
                    : "/servidor/requerimento/incluir-dependente"
                }
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-light"
              >
                <FileSignature className="h-3.5 w-3.5" /> Abrir requerimento de{" "}
                {tipoRequerimentoLabels[comprovante.solicitacaoRequerimento.tipo]}
              </Link>
            </div>
          )}

          {ordenada.map(({ beneficiarioId, status }) => {
            const camposAtuais = getCamposDoBeneficiario(comprovante, beneficiarioId);
            const beneficiario = beneficiariosAtuais.find((b) => b.id === beneficiarioId);
            const { decomposicao } = beneficiario
              ? getElegibilidade(comprovante, beneficiario)
              : { decomposicao: EMPTY_DECOMPOSICAO };
            const { divergente: boletoComprovanteDivergente } = beneficiario
              ? getDivergenciaBoletoComprovante(comprovante, beneficiario)
              : { divergente: false };
            const emAcao = acaoAtiva?.beneficiarioId === beneficiarioId;
            const historico = comprovante.aprovacoes.filter(
              (a) => !a.beneficiarioId || a.beneficiarioId === beneficiarioId,
            );
            const decisaoFinal = [...historico]
              .reverse()
              .find((a) => a.acao === "aprovado" || a.acao === "aprovado_com_ressalva" || a.acao === "recusado");
            const decisaoAnalista = [...historico]
              .reverse()
              .find((a) => a.etapa === "analista" && (a.acao === "aprovado" || a.acao === "aprovado_com_ressalva"));
            const decisaoGerencia = [...historico]
              .reverse()
              .find((a) => a.etapa === "gerencia" && (a.acao === "aprovado" || a.acao === "aprovado_com_ressalva" || a.acao === "recusado"));
            const pedidoCorrecao = [...historico].reverse().find((a) => a.acao === "correcao_solicitada");
            const devolucaoGerencia = [...historico].reverse().find((a) => a.acao === "devolvido_analista");
            const versaoAnterior = comprovante.versoesAnteriores?.at(-1);

            const HistoricoAlcadas = () =>
              historico.length > 0 ? (
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1.5">
                  <p className="font-medium text-muted-foreground">Histórico das alçadas:</p>
                  {historico.map((a, i) => (
                    <p key={i}>
                      <strong>{a.aprovadoPor}</strong> ({a.etapa}) —{" "}
                      {a.acao === "aprovado" && "aprovou"}
                      {a.acao === "aprovado_com_ressalva" && "aprovou com ressalva"}
                      {a.acao === "correcao_solicitada" && "solicitou correção"}
                      {a.acao === "recusado" && "recusou"}
                      {a.acao === "devolvido_analista" && "devolveu ao Analista"}
                      {a.acao === "documento_substituido" && "substituiu o documento"}
                      {a.acao === "reenviado" && "reenviou o documento"}
                      {" em "}
                      {new Date(a.data).toLocaleString("pt-BR")}
                      {a.comentario && ` — "${a.comentario}"`}
                    </p>
                  ))}
                </div>
              ) : null;

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
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
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
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
                    <p className="text-xs text-muted-foreground italic">
                      Em análise pela GERDAB — não é possível editar ou substituir enquanto aguarda conferência.
                    </p>
                  </div>
                )}

                {/* ===== Retroativo aguardando aprovação (Analista OU Gerência — somente leitura) ===== */}
                {status === "retroativo_aguardando_aprovacao" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
                    <p className="text-xs text-muted-foreground italic">
                      Aguardando aprovação da GERDAB (Analista ou Gerência) — somente leitura enquanto aguarda decisão.
                    </p>
                  </div>
                )}

                {/* ===== Legado: nome de status de antes da Etapa 1 — mesma pendência de "aguardando
                     aprovação", só o nome é antigo; acionável por Analista ou Gerência, sem 2ª alçada. */}
                {(status === "retroativo_aguardando_analista" || status === "retroativo_aguardando_gerencia") && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
                    <p className="text-xs text-muted-foreground italic">
                      Aguardando aprovação da GERDAB (Analista ou Gerência) — somente leitura enquanto aguarda decisão.
                    </p>
                    <HistoricoAlcadas />
                  </div>
                )}

                {/* ===== Legado: retroativo devolvido pela Gerência (somente leitura para o servidor) ===== */}
                {status === "retroativo_devolvido" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
                    {devolucaoGerencia && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-warning">Devolvido pela Gerência — em ajuste pelo Analista</p>
                        <p>{devolucaoGerencia.comentario}</p>
                        <p className="text-muted-foreground">
                          {devolucaoGerencia.aprovadoPor} em {new Date(devolucaoGerencia.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      A Gerência devolveu este retroativo ao Analista para reavaliação — não é uma nova solicitação,
                      o processo continua a partir da 1ª alçada.
                    </p>
                    <HistoricoAlcadas />
                  </div>
                )}

                {/* ===== Retroativo recusado (somente leitura, terminal) ===== */}
                {status === "retroativo_recusado" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
                    {decisaoAnalista && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-muted-foreground">Aprovação anterior do Analista (1ª alçada):</p>
                        <p>
                          {decisaoAnalista.acao === "aprovado_com_ressalva" ? "Aprovou com ressalva" : "Aprovou"}
                          {decisaoAnalista.comentario && ` — "${decisaoAnalista.comentario}"`}
                        </p>
                        <p className="text-muted-foreground">
                          {decisaoAnalista.aprovadoPor} em {new Date(decisaoAnalista.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    {decisaoGerencia && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs space-y-1">
                        <p className="flex items-center gap-1.5 text-destructive font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Recusado pela Gerência (2ª alçada)
                        </p>
                        {decisaoGerencia.motivo && (
                          <p>
                            <strong>Motivo:</strong> {decisaoGerencia.motivo}
                          </p>
                        )}
                        {decisaoGerencia.comentario && <p>{decisaoGerencia.comentario}</p>}
                        <p className="text-muted-foreground">
                          {decisaoGerencia.aprovadoPor} em {new Date(decisaoGerencia.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      Recusa do retroativo é definitiva — não é possível reenviar este comprovante.
                    </p>
                    <HistoricoAlcadas />
                  </div>
                )}

                {/* ===== Aprovado / aprovado com ressalva (somente leitura) ===== */}
                {(status === "aprovado" || status === "aprovado_com_ressalva" || status === "retroativo_aprovado") && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
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
                    {status === "retroativo_aprovado" && <HistoricoAlcadas />}
                  </div>
                )}

                {/* ===== Recusado (somente leitura, terminal) ===== */}
                {status === "recusado" && (
                  <div className="space-y-2">
                    <CamposExtraidosForm
                      campos={camposAtuais}
                      readOnly
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />
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
                    <CamposExtraidosForm
                      campos={campos}
                      onChange={setCampos}
                      decomposicaoValor={
                        beneficiario ? getDecomposicaoValor(gerarItensFinanceiros(beneficiario, novoArquivoNome)) : undefined
                      }
                    />
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

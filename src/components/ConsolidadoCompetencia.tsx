import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, FileText, FileWarning, Paperclip, Wrench } from "lucide-react";
import {
  beneficiariosPagamento,
  formatCompetencia,
  formatCurrency,
  tipoDocumentoArquivoLabels,
  tiposDoArquivo,
  type CampoExtraido,
  type Comprovante,
} from "@/lib/mock-data";
import {
  getComprovantesUnificados,
  getBeneficiariosDispensadosIds,
  dispensarBeneficiario,
  getConclusaoCompetencia,
  updateComprovantePagamento,
  getBeneficiariosPagamentoAtual,
} from "@/lib/prosaude-storage";
import {
  getCamposDoBeneficiario,
  getDivergenciaBoletoComprovante,
  getElegibilidade,
  statusDoBeneficiarioNoDocumento,
  beneficiarioTemCampoVazio,
} from "@/lib/comprovante-status";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { ServidorComprovanteDetail } from "@/components/ServidorComprovanteDetail";

const statusEditavelPeloServidor: Comprovante["status"][] = ["em_analise", "retroativo_aguardando_aprovacao"];
/** Nesses status a correção é sempre "substituir o arquivo" (fluxo já existente em
 *  ServidorComprovanteDetail), não uma simples edição de campos já extraídos. */
const statusExigeSubstituicao: Comprovante["status"][] = ["ilegivel", "correcao_solicitada"];

export function ConsolidadoCompetencia({
  competencia,
  onAnexarDependente,
  onConcluir,
  onRefresh,
  refreshKey,
}: {
  competencia: string;
  onAnexarDependente: (beneficiarioId: string) => void;
  /** "Concluir envio da competência" — só registra a conclusão, não salva comprovantes. */
  onConcluir: () => void;
  /** Força o pai a re-renderizar (incrementa `refreshKey`) após uma dispensa ou edição. */
  onRefresh: () => void;
  /** Incrementar para forçar releitura dos dados persistidos após uma dispensa/edição. */
  refreshKey: number;
}) {
  const [confirmandoDispensa, setConfirmandoDispensa] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [edicaoAtual, setEdicaoAtual] = useState<{ beneficiarioId: string; campos: CampoExtraido[] }[]>([]);
  const [detalheParaCorrigir, setDetalheParaCorrigir] = useState<{
    comprovante: Comprovante;
    beneficiarioId?: string;
  } | null>(null);

  // Cadastro "atual" (seed + correções já aplicadas pela GERDAB) — ver mock-data.ts.
  const beneficiariosAtuais = useMemo(() => getBeneficiariosPagamentoAtual(), [refreshKey]);

  const dados = useMemo(() => {
    const todos = getComprovantesUnificados().filter((c) => c.competencia === competencia);
    const dispensadosIds = new Set(getBeneficiariosDispensadosIds(competencia));

    // Vinculados a associação têm comprovação coletiva — não entram no checklist de pendência
    // individual do Resumo (mesma regra da seleção de beneficiários, ver BeneficiarioSelector).
    const linhas = beneficiariosPagamento.filter((b) => !b.associacao).map((b) => {
      const docs = todos.filter((c) => c.beneficiarioIds.includes(b.id));
      const dispensado = dispensadosIds.has(b.id);

      if (docs.length === 0) {
        return {
          beneficiario: b,
          total: 0,
          semComprovante: true,
          dispensado,
          pendente: !dispensado,
          comprovanteIdPendente: undefined as string | undefined,
        };
      }

      const total = docs.reduce((soma, doc) => {
        const campoValor = getCamposDoBeneficiario(doc, b.id).find((c) => c.chave === "valor");
        return soma + (campoValor ? parseFloat(campoValor.valor) || 0 : 0);
      }, 0);

      const docComPendencia = docs.find((doc) => {
        const status = statusDoBeneficiarioNoDocumento(doc, b.id);
        return status === "ilegivel" || status === "correcao_solicitada" || beneficiarioTemCampoVazio(doc, b.id);
      });

      return {
        beneficiario: b,
        total,
        semComprovante: false,
        dispensado: false,
        pendente: !!docComPendencia,
        comprovanteIdPendente: docComPendencia?.id,
      };
    });

    const documentos = todos.length;
    const pendencias = linhas.filter((l) => l.pendente).length;
    const totalGrupo = linhas.reduce((soma, l) => soma + l.total, 0);

    return { linhas, documentos, pendencias, totalGrupo, todos };
  }, [competencia, refreshKey]);

  const pendenciaAtiva = dados.linhas.some((l) => l.semComprovante && !l.dispensado);

  function confirmarDispensa(beneficiarioId: string) {
    dispensarBeneficiario(beneficiarioId, competencia);
    setConfirmandoDispensa(null);
    onRefresh();
  }

  /** Decide entre editar campos inline (documento ainda não decidido) ou abrir o fluxo de
   *  substituição de arquivo já existente (documento ilegível ou com correção solicitada). */
  function corrigirEnvio(comprovante: Comprovante, beneficiarioId?: string) {
    if (statusExigeSubstituicao.includes(comprovante.status)) {
      setDetalheParaCorrigir({ comprovante, beneficiarioId });
      return;
    }
    expandirEnvio(comprovante);
  }

  function expandirEnvio(comprovante: Comprovante) {
    if (expandidoId === comprovante.id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(comprovante.id);
    setEdicaoAtual(
      comprovante.beneficiarioIds.map((beneficiarioId) => ({
        beneficiarioId,
        campos: getCamposDoBeneficiario(comprovante, beneficiarioId),
      })),
    );
    setTimeout(() => {
      document.getElementById(`envio-${comprovante.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function salvarEdicao(comprovante: Comprovante) {
    if (comprovante.beneficiarioIds.length > 1) {
      updateComprovantePagamento(comprovante.id, { gruposExtraidos: edicaoAtual });
    } else {
      updateComprovantePagamento(comprovante.id, { camposExtraidos: edicaoAtual[0]?.campos ?? [] });
    }
    setExpandidoId(null);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Resumo da competência</h2>
        <p className="text-sm text-muted-foreground">
          Consolidado de todos os comprovantes anexados para este grupo familiar em{" "}
          {formatCompetencia(competencia)}. Confira antes de concluir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{dados.documentos}</p>
          <p className="text-xs text-muted-foreground">Documentos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className={`text-2xl font-bold ${dados.pendencias > 0 ? "text-destructive" : ""}`}>
            {dados.pendencias}
          </p>
          <p className="text-xs text-muted-foreground">Pendências</p>
        </div>
      </div>

      {dados.linhas
        .filter((l) => l.semComprovante && !l.dispensado)
        .map((l) => (
          <div key={l.beneficiario.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-destructive">
                {l.beneficiario.nome} ainda não tem comprovante
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {l.beneficiario.parentesco} · envie o comprovante antes de concluir, ou o valor não entra no reembolso
              desta competência.
            </p>
            {confirmandoDispensa === l.beneficiario.id ? (
              <div className="bg-card rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs">
                  <strong>{l.beneficiario.nome}</strong> não será considerada no cálculo desta competência. Deseja
                  continuar?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmandoDispensa(null)}
                    className="text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => confirmarDispensa(l.beneficiario.id)}
                    className="text-xs bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 hover:opacity-90"
                  >
                    Continuar sem {l.beneficiario.nome.split(" ")[0]}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onAnexarDependente(l.beneficiario.id)}
                  className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light flex items-center gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Anexar comprovante do dependente
                </button>
                <button
                  onClick={() => setConfirmandoDispensa(l.beneficiario.id)}
                  className="text-xs font-medium border border-border rounded-md px-3 py-2 hover:bg-muted"
                >
                  Continuar sem este beneficiário
                </button>
              </div>
            )}
          </div>
        ))}

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {dados.linhas.map((l) => (
          <div key={l.beneficiario.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{l.beneficiario.nome}</p>
              <p className="text-xs text-muted-foreground">{l.beneficiario.parentesco}</p>
              {l.dispensado && (
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  Sem comprovante — não incluída nesta competência
                </p>
              )}
              {l.pendente && !l.semComprovante && (
                <button
                  onClick={() => {
                    const c = dados.todos.find((x) => x.id === l.comprovanteIdPendente);
                    if (c) corrigirEnvio(c, l.beneficiario.id);
                  }}
                  className="text-xs text-destructive italic mt-0.5 flex items-center gap-1 hover:underline"
                >
                  <FileWarning className="h-3 w-3" /> Pendência neste documento — Corrigir agora
                </button>
              )}
            </div>
            {l.dispensado ? (
              <button
                onClick={() => onAnexarDependente(l.beneficiario.id)}
                className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted shrink-0"
              >
                Anexar comprovante
              </button>
            ) : l.semComprovante ? null : (
              <p className="text-sm font-semibold shrink-0">{formatCurrency(l.total)}</p>
            )}
          </div>
        ))}
      </div>

      {dados.todos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Envios desta competência
          </h3>
          <div className="space-y-2">
            {dados.todos.map((c) => {
              const expandido = expandidoId === c.id;
              const editavel = statusEditavelPeloServidor.includes(c.status);
              const nomesBeneficiarios = c.beneficiarioIds
                .map((id) => beneficiariosPagamento.find((b) => b.id === id)?.nome)
                .filter(Boolean)
                .join(", ");

              return (
                <div key={c.id} id={`envio-${c.id}`} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => corrigirEnvio(c)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.arquivos.map((a) => a.nome).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{nomesBeneficiarios}</p>
                    </div>
                    <ComprovanteStatusBadge status={c.status} />
                    {expandido ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {expandido && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div className="space-y-1">
                        {c.arquivos.map((a) => (
                          <p key={a.nome} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{a.nome}</span> —{" "}
                            {tiposDoArquivo(a).map((t) => tipoDocumentoArquivoLabels[t]).join(", ") || "Nenhum tipo marcado"}
                          </p>
                        ))}
                      </div>

                      {edicaoAtual.map((grupo) => {
                        const beneficiario = beneficiariosAtuais.find((b) => b.id === grupo.beneficiarioId);
                        const { situacao } = getElegibilidade(c, grupo.beneficiarioId);
                        const { divergente: boletoComprovanteDivergente } = beneficiario
                          ? getDivergenciaBoletoComprovante(c, beneficiario)
                          : { divergente: false };
                        return (
                          <div key={grupo.beneficiarioId} className="space-y-1.5">
                            <p className="text-xs font-semibold">{beneficiario?.nome}</p>
                            <CamposExtraidosForm
                              campos={grupo.campos}
                              valorCadastrado={beneficiario?.valorCadastrado}
                              situacaoNaoReembolsavel={situacao}
                              divergenciaBoletoComprovante={boletoComprovanteDivergente}
                              readOnly={!editavel}
                              onChange={
                                editavel
                                  ? (campos) =>
                                      setEdicaoAtual((prev) =>
                                        prev.map((g) => (g.beneficiarioId === grupo.beneficiarioId ? { ...g, campos } : g)),
                                      )
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}

                      {editavel ? (
                        <button
                          onClick={() => salvarEdicao(c)}
                          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary-light"
                        >
                          <Wrench className="h-3.5 w-3.5" /> Salvar alterações
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">
                          Este envio já foi decidido e não pode mais ser editado pelo Servidor.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Total do grupo familiar</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(dados.totalGrupo)}</p>
      </div>
      <p className="text-xs text-muted-foreground px-1">
        Sujeito ao teto de {formatCurrency(4000)} por competência — a validação do teto ocorre na etapa de cálculo
        do ressarcimento.
      </p>

      {(() => {
        const conclusao = getConclusaoCompetencia(competencia);
        return conclusao ? (
          <p className="text-xs text-success text-center">
            Competência concluída em {new Date(conclusao.concluidoEm).toLocaleString("pt-BR")}
          </p>
        ) : null;
      })()}

      <button
        onClick={onConcluir}
        disabled={pendenciaAtiva}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
      >
        Concluir envio da competência
      </button>
      {pendenciaAtiva && (
        <p className="text-xs text-muted-foreground text-center">
          Resolva os beneficiários sem comprovante (anexe ou continue sem eles) para concluir.
        </p>
      )}

      {detalheParaCorrigir && (
        <ServidorComprovanteDetail
          comprovante={detalheParaCorrigir.comprovante}
          focusBeneficiarioId={detalheParaCorrigir.beneficiarioId}
          onClose={() => setDetalheParaCorrigir(null)}
          onChanged={() => {
            setDetalheParaCorrigir(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  ArrowUpCircle,
  Undo2,
  FilePlus,
} from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { DocPreview } from "@/components/DocPreview";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { DivergenciaAprovacaoModal } from "@/components/DivergenciaAprovacaoModal";
import { getAdminRole } from "@/components/AdminLayout";
import {
  beneficiariosPagamento,
  formatCompetencia,
  analistaReferencia,
  gerenteReferencia,
  type Comprovante,
  type StatusComprovante,
  type AcaoComprovante,
} from "@/lib/mock-data";
import { getComprovantesUnificados, updateComprovantePagamento } from "@/lib/prosaude-storage";
import {
  getCamposDoBeneficiario,
  getDivergencia,
  getElegibilidade,
  recomputeStatusGeral,
  getListaStatusBeneficiario,
} from "@/lib/comprovante-status";

export const Route = createFileRoute("/admin/comprovantes")({
  component: Comprovantes,
});

type Tab = "comprovantes" | "retroativos" | "historico";

const statusPorTab: Record<Tab, StatusComprovante[]> = {
  comprovantes: ["em_analise"],
  // Os 3 últimos são legado (registros antigos já persistidos); nenhum envio novo chega neles.
  retroativos: [
    "retroativo_aguardando_aprovacao",
    "retroativo_aguardando_analista",
    "retroativo_devolvido",
    "retroativo_aguardando_gerencia",
  ],
  historico: [
    "aprovado",
    "aprovado_com_ressalva",
    "recusado",
    "retroativo_aprovado",
    "retroativo_recusado",
    "correcao_solicitada",
  ],
};

// Status em que há ação disponível — Analista e Gerência têm exatamente as mesmas ações
// (retroativo não exige mais 2ª alçada obrigatória).
const statusComAcaoDisponivel: StatusComprovante[] = ["em_analise", "retroativo_aguardando_aprovacao"];

type SubFormTipo = "ressalva" | "correcao" | "recusar" | "complementar";

function nomeBeneficiario(id: string): string {
  return beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
}

function Comprovantes() {
  const role = getAdminRole();
  const isGerencia = role === "gerencia";
  const autor = isGerencia ? gerenteReferencia : analistaReferencia;
  const etapaAtual: "analista" | "gerencia" = isGerencia ? "gerencia" : "analista";
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<Tab>("comprovantes");
  const [openId, setOpenId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState<{ beneficiarioId: string; tipo: SubFormTipo } | null>(null);
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState("Documento ilegível");
  const [divergencia, setDivergencia] = useState<{
    comprovanteId: string;
    beneficiarioId: string;
    valorExtraido: number;
    valorCadastrado: number;
  } | null>(null);

  const todos = useMemo(() => getComprovantesUnificados(), [refreshKey]);
  const cur = todos.find((c) => c.id === openId) ?? null;
  const filtrados = todos.filter((c) => statusPorTab[tab].includes(c.status));

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function fecharModal() {
    setOpenId(null);
    setSubForm(null);
    setComentario("");
    setMotivo("Documento ilegível");
  }

  function registrarAcao(
    comprovante: Comprovante,
    beneficiarioId: string,
    novoStatus: StatusComprovante,
    acao: Omit<AcaoComprovante, "beneficiarioId">,
  ) {
    const multi = comprovante.beneficiarioIds.length > 1;
    const acaoLog: AcaoComprovante = multi ? { ...acao, beneficiarioId } : acao;

    if (multi) {
      const listaAtual = getListaStatusBeneficiario(comprovante);
      const novaLista = listaAtual.map((s) =>
        s.beneficiarioId === beneficiarioId ? { ...s, status: novoStatus, comentario: acao.comentario } : s,
      );
      updateComprovantePagamento(comprovante.id, {
        statusPorBeneficiario: novaLista,
        status: recomputeStatusGeral(novaLista),
        aprovacoes: [...comprovante.aprovacoes, acaoLog],
      });
    } else {
      updateComprovantePagamento(comprovante.id, {
        status: novoStatus,
        aprovacoes: [...comprovante.aprovacoes, acaoLog],
      });
    }
    refresh();
    setSubForm(null);
    setComentario("");
  }

  /** Próximo status ao aprovar — retroativo tem aprovação única, por qualquer um dos dois papéis. */
  function proximoStatusAprovacao(statusAtual: StatusComprovante): StatusComprovante {
    if (statusAtual === "retroativo_aguardando_aprovacao") return "retroativo_aprovado";
    return "aprovado";
  }

  function aprovar(comprovante: Comprovante, beneficiarioId: string) {
    const beneficiario = beneficiariosPagamento.find((b) => b.id === beneficiarioId);
    if (!beneficiario) return;
    const { divergente, valorExtraido } = getDivergencia(comprovante, beneficiario);

    if (divergente) {
      setDivergencia({
        comprovanteId: comprovante.id,
        beneficiarioId,
        valorExtraido,
        valorCadastrado: beneficiario.valorCadastrado,
      });
      return;
    }

    registrarAcao(comprovante, beneficiarioId, proximoStatusAprovacao(comprovante.status), {
      etapa: etapaAtual,
      acao: "aprovado",
      aprovadoPor: autor,
      data: new Date().toISOString(),
    });
  }

  function confirmarDivergencia(justificativa: string) {
    if (!divergencia) return;
    const comprovante = todos.find((c) => c.id === divergencia.comprovanteId);
    if (!comprovante) return;

    registrarAcao(comprovante, divergencia.beneficiarioId, proximoStatusAprovacao(comprovante.status), {
      etapa: etapaAtual,
      acao: "aprovado_com_ressalva",
      aprovadoPor: autor,
      data: new Date().toISOString(),
      comentario: justificativa,
    });
    setDivergencia(null);
    refresh();
  }

  function confirmarSubForm(comprovante: Comprovante) {
    if (!subForm) return;
    if (subForm.tipo === "ressalva") {
      registrarAcao(comprovante, subForm.beneficiarioId, "aprovado_com_ressalva", {
        etapa: etapaAtual,
        acao: "aprovado_com_ressalva",
        aprovadoPor: autor,
        data: new Date().toISOString(),
        comentario,
      });
    } else if (subForm.tipo === "correcao") {
      registrarAcao(comprovante, subForm.beneficiarioId, "correcao_solicitada", {
        etapa: etapaAtual,
        acao: "correcao_solicitada",
        aprovadoPor: autor,
        data: new Date().toISOString(),
        comentario,
      });
    } else if (subForm.tipo === "recusar") {
      // Recusa em retroativo usa um status próprio, para distinguir de uma recusa comum
      // e permitir exibir a competência original e a justificativa do atraso.
      const statusRecusa: StatusComprovante =
        comprovante.status === "retroativo_aguardando_aprovacao" ? "retroativo_recusado" : "recusado";
      registrarAcao(comprovante, subForm.beneficiarioId, statusRecusa, {
        etapa: etapaAtual,
        acao: "recusado",
        aprovadoPor: autor,
        data: new Date().toISOString(),
        motivo,
        comentario,
      });
    } else if (subForm.tipo === "complementar") {
      // Não altera o status — é apenas um pedido adicional, registrado no histórico e destacado ao Servidor.
      updateComprovantePagamento(comprovante.id, {
        solicitacaoComplementar: { motivo: comentario, solicitadoPor: autor, data: new Date().toISOString() },
        aprovacoes: [
          ...comprovante.aprovacoes,
          {
            etapa: etapaAtual,
            acao: "documento_complementar_solicitado",
            aprovadoPor: autor,
            data: new Date().toISOString(),
            comentario,
          },
        ],
      });
      refresh();
      setSubForm(null);
      setComentario("");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Comprovantes</h1>
        <p className="text-sm text-muted-foreground">
          Conferência de comprovantes do auxílio-saúde • Perfil ativo: {role === "gerencia" ? "Gerência" : "Analista"}
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        {(
          [
            ["comprovantes", "Comprovantes"],
            ["retroativos", "Retroativos"],
            ["historico", "Histórico"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtrados.map((c) => (
          <article key={c.id} className="bg-card rounded-xl border border-border shadow-card p-5">
            <header className="flex justify-between items-start mb-3 gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.arquivos.map((a) => a.nome).join(", ")}</p>
                <p className="text-sm text-muted-foreground">
                  {c.beneficiarioIds.map(nomeBeneficiario).join(", ")} • {formatCompetencia(c.competencia)}
                  {c.isRetroativo && " • Retroativo"}
                </p>
              </div>
              <ComprovanteStatusBadge status={c.status} />
            </header>

            {c.status === "retroativo_aguardando_gerencia" && !isGerencia && (
              <p className="text-xs text-muted-foreground italic mb-2">
                Registro legado (2ª alçada) — somente consulta.
              </p>
            )}
            {c.status === "retroativo_devolvido" && (
              <p className="text-xs text-muted-foreground italic mb-2 flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" /> Registro legado — devolução da antiga 2ª alçada.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setOpenId(c.id)}
                className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Visualizar
              </button>
            </div>
          </article>
        ))}
        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum comprovante nesta aba.</p>
        )}
      </div>

      {/* Modal principal — visualização + ações por beneficiário */}
      {cur && (
        <div className="fixed inset-0 bg-foreground/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-elevated max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-semibold">{cur.arquivos.map((a) => a.nome).join(", ")}</h2>
                <p className="text-xs text-muted-foreground">
                  {formatCompetencia(cur.competencia)}
                  {cur.isRetroativo && " • Retroativo"}
                </p>
              </div>
              <button onClick={fecharModal} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                {cur.arquivos.map((a) => (
                  <DocPreview key={a.nome} filename={a.nome} />
                ))}
              </div>

              {cur.isRetroativo && cur.justificativaAtraso && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs">
                  <p className="font-medium text-muted-foreground mb-1">Justificativa do atraso (servidor):</p>
                  <p>{cur.justificativaAtraso}</p>
                </div>
              )}

              {getListaStatusBeneficiario(cur).map(({ beneficiarioId, status: statusBeneficiario }) => {
                const beneficiario = beneficiariosPagamento.find((b) => b.id === beneficiarioId);
                const campos = getCamposDoBeneficiario(cur, beneficiarioId);
                const historico = cur.aprovacoes.filter(
                  (a) => !a.beneficiarioId || a.beneficiarioId === beneficiarioId,
                );
                const decisaoAnalista = [...historico]
                  .reverse()
                  .find((a) => a.etapa === "analista" && (a.acao === "aprovado" || a.acao === "aprovado_com_ressalva"));
                const devolucaoGerencia = [...historico].reverse().find((a) => a.acao === "devolvido_analista");

                const acoesDisponiveis = statusComAcaoDisponivel.includes(statusBeneficiario);
                const emSubForm = subForm?.beneficiarioId === beneficiarioId;
                const { elegivel } = getElegibilidade(cur, beneficiarioId);

                return (
                  <div key={beneficiarioId} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{beneficiario?.nome}</p>
                      <ComprovanteStatusBadge status={cur.beneficiarioIds.length > 1 ? statusBeneficiario : cur.status} />
                    </div>

                    <CamposExtraidosForm
                      campos={campos}
                      readOnly
                      valorCadastrado={beneficiario?.valorCadastrado}
                    />

                    {!elegivel && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-destructive">
                          <strong>Não elegível — Odontológico.</strong> O Pró-Saúde não cobre assistência
                          odontológica como reembolsável. Aprovação automática ou com ressalva está bloqueada;
                          use Solicitar correção ou Recusar.
                        </p>
                      </div>
                    )}

                    {cur.solicitacaoComplementar && (
                      <p className="text-xs text-muted-foreground italic">
                        Documento complementar já solicitado em{" "}
                        {new Date(cur.solicitacaoComplementar.data).toLocaleString("pt-BR")} por{" "}
                        {cur.solicitacaoComplementar.solicitadoPor} — aguardando o Servidor anexar.
                      </p>
                    )}

                    {statusBeneficiario === "retroativo_devolvido" && devolucaoGerencia && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-warning flex items-center gap-1.5">
                          <Undo2 className="h-3.5 w-3.5" /> Devolvido pela Gerência — ajuste necessário
                        </p>
                        <p>{devolucaoGerencia.comentario}</p>
                        <p className="text-muted-foreground">
                          {devolucaoGerencia.aprovadoPor} em {new Date(devolucaoGerencia.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}

                    {statusBeneficiario === "retroativo_aguardando_gerencia" && decisaoAnalista && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-muted-foreground">Decisão do Analista (1ª alçada):</p>
                        <p>
                          {decisaoAnalista.acao === "aprovado_com_ressalva" ? "Aprovou com ressalva" : "Aprovou"}
                          {decisaoAnalista.comentario && ` — "${decisaoAnalista.comentario}"`}
                        </p>
                        <p className="text-muted-foreground">
                          {decisaoAnalista.aprovadoPor} em {new Date(decisaoAnalista.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}

                    {acoesDisponiveis && !emSubForm && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {elegivel && (
                          <button
                            onClick={() => aprovar(cur, beneficiarioId)}
                            className="text-sm bg-success text-success-foreground rounded-md px-3 py-2 hover:opacity-90 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                          </button>
                        )}
                        {elegivel && (
                          <button
                            onClick={() => setSubForm({ beneficiarioId, tipo: "ressalva" })}
                            className="text-sm border border-warning/40 text-warning rounded-md px-3 py-2 hover:bg-warning/5 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Aprovar com ressalva
                          </button>
                        )}
                        {!cur.solicitacaoComplementar && (
                          <button
                            onClick={() => setSubForm({ beneficiarioId, tipo: "complementar" })}
                            className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted flex items-center gap-1.5"
                          >
                            <FilePlus className="h-3.5 w-3.5" /> Solicitar documento complementar
                          </button>
                        )}
                        <button
                          onClick={() => setSubForm({ beneficiarioId, tipo: "correcao" })}
                          className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Solicitar correção
                        </button>
                        <button
                          onClick={() => setSubForm({ beneficiarioId, tipo: "recusar" })}
                          className="text-sm border border-destructive/30 text-destructive rounded-md px-3 py-2 hover:bg-destructive/5 flex items-center gap-1.5"
                        >
                          <Ban className="h-3.5 w-3.5" /> Recusar
                        </button>
                      </div>
                    )}

                    {emSubForm && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        {subForm.tipo === "recusar" && (
                          <select
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                          >
                            <option>Documento ilegível</option>
                            <option>Documento incompleto</option>
                            <option>Dados inconsistentes</option>
                            <option>Outro</option>
                          </select>
                        )}
                        <textarea
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          rows={3}
                          placeholder={
                            subForm.tipo === "ressalva"
                              ? "Justificativa obrigatória para aprovar com ressalva..."
                              : subForm.tipo === "correcao"
                                ? "Descreva o que precisa ser corrigido..."
                                : subForm.tipo === "complementar"
                                  ? "Descreva qual documento complementar é necessário..."
                                  : "Detalhe o motivo da recusa..."
                          }
                          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSubForm(null);
                              setComentario("");
                            }}
                            className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => confirmarSubForm(cur)}
                            disabled={!comentario.trim()}
                            className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}

                    {!acoesDisponiveis && (
                      <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Sem ações disponíveis neste status.
                      </p>
                    )}
                  </div>
                );
              })}

              {cur.aprovacoes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de ações</p>
                  <ul className="space-y-1.5 text-xs">
                    {cur.aprovacoes.map((a, i) => (
                      <li key={i} className="bg-muted/40 rounded-md px-3 py-2">
                        <strong>{a.aprovadoPor}</strong> ({a.etapa}) —{" "}
                        {a.acao === "aprovado" && "aprovou"}
                        {a.acao === "aprovado_com_ressalva" && "aprovou com ressalva"}
                        {a.acao === "correcao_solicitada" && "solicitou correção"}
                        {a.acao === "recusado" && "recusou"}
                        {a.acao === "devolvido_analista" && "devolveu ao Analista"}
                        {a.acao === "documento_substituido" && "substituiu o documento"}
                        {a.acao === "reenviado" && "reenviou o documento"}
                        {a.acao === "documento_complementar_solicitado" && "solicitou documento complementar"}
                        {a.beneficiarioId && ` — ${nomeBeneficiario(a.beneficiarioId)}`}
                        {" em "}
                        {new Date(a.data).toLocaleString("pt-BR")}
                        {a.motivo && ` • Motivo: ${a.motivo}`}
                        {a.comentario && ` • "${a.comentario}"`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-border flex justify-end sticky bottom-0 bg-card">
              <button onClick={fecharModal} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}

      {divergencia && (
        <DivergenciaAprovacaoModal
          open
          beneficiarioNome={nomeBeneficiario(divergencia.beneficiarioId)}
          valorExtraido={divergencia.valorExtraido}
          valorCadastrado={divergencia.valorCadastrado}
          onConfirm={confirmarDivergencia}
          onCancel={() => setDivergencia(null)}
        />
      )}
    </div>
  );
}

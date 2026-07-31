import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X, Eye, CheckCircle2, AlertTriangle, RotateCcw, Ban, ArrowUpCircle } from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { DocPreview } from "@/components/DocPreview";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { DivergenciaAprovacaoModal } from "@/components/DivergenciaAprovacaoModal";
import { getAdminRole } from "@/components/AdminLayout";
import {
  beneficiariosPagamento,
  formatCompetencia,
  analistaReferencia,
  type Comprovante,
  type StatusComprovante,
  type AcaoComprovante,
} from "@/lib/mock-data";
import { getComprovantesUnificados, updateComprovantePagamento } from "@/lib/prosaude-storage";
import {
  getCamposDoBeneficiario,
  getDivergencia,
  recomputeStatusGeral,
  getListaStatusBeneficiario,
} from "@/lib/comprovante-status";

export const Route = createFileRoute("/admin/comprovantes")({
  component: Comprovantes,
});

type Tab = "comprovantes" | "retroativos" | "historico";

const statusPorTab: Record<Tab, StatusComprovante[]> = {
  comprovantes: ["em_analise"],
  retroativos: ["retroativo_aguardando_analista", "retroativo_aguardando_gerencia"],
  historico: ["aprovado", "aprovado_com_ressalva", "recusado", "retroativo_aprovado", "correcao_solicitada"],
};

type SubFormTipo = "ressalva" | "correcao" | "recusar";

function nomeBeneficiario(id: string): string {
  return beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
}

function Comprovantes() {
  const role = getAdminRole();
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

    const proximoStatus: StatusComprovante =
      comprovante.status === "retroativo_aguardando_analista" ? "retroativo_aguardando_gerencia" : "aprovado";

    registrarAcao(comprovante, beneficiarioId, proximoStatus, {
      etapa: "analista",
      acao: "aprovado",
      aprovadoPor: analistaReferencia,
      data: new Date().toISOString(),
    });
  }

  function confirmarDivergencia(justificativa: string) {
    if (!divergencia) return;
    const comprovante = todos.find((c) => c.id === divergencia.comprovanteId);
    if (!comprovante) return;

    const proximoStatus: StatusComprovante =
      comprovante.status === "retroativo_aguardando_analista"
        ? "retroativo_aguardando_gerencia"
        : "aprovado_com_ressalva";

    registrarAcao(comprovante, divergencia.beneficiarioId, proximoStatus, {
      etapa: "analista",
      acao: "aprovado_com_ressalva",
      aprovadoPor: analistaReferencia,
      data: new Date().toISOString(),
      comentario: justificativa,
    });
    updateComprovantePagamento(comprovante.id, { justificativaDivergencia: justificativa });
    setDivergencia(null);
    refresh();
  }

  function confirmarSubForm(comprovante: Comprovante) {
    if (!subForm) return;
    if (subForm.tipo === "ressalva") {
      registrarAcao(comprovante, subForm.beneficiarioId, "aprovado_com_ressalva", {
        etapa: "analista",
        acao: "aprovado_com_ressalva",
        aprovadoPor: analistaReferencia,
        data: new Date().toISOString(),
        comentario,
      });
    } else if (subForm.tipo === "correcao") {
      registrarAcao(comprovante, subForm.beneficiarioId, "correcao_solicitada", {
        etapa: "analista",
        acao: "correcao_solicitada",
        aprovadoPor: analistaReferencia,
        data: new Date().toISOString(),
        comentario,
      });
    } else if (subForm.tipo === "recusar") {
      registrarAcao(comprovante, subForm.beneficiarioId, "recusado", {
        etapa: "analista",
        acao: "recusado",
        aprovadoPor: analistaReferencia,
        data: new Date().toISOString(),
        motivo,
        comentario,
      });
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
                <p className="font-semibold truncate">{c.arquivo}</p>
                <p className="text-sm text-muted-foreground">
                  {c.beneficiarioIds.map(nomeBeneficiario).join(", ")} • {formatCompetencia(c.competencia)}
                  {c.isRetroativo && " • Retroativo"}
                </p>
              </div>
              <ComprovanteStatusBadge status={c.status} />
            </header>

            {c.status === "retroativo_aguardando_gerencia" && (
              <p className="text-xs text-muted-foreground italic mb-2">
                Aguardando ação da Gerência (2ª alçada) — implementada na Etapa 3.
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
                <h2 className="font-semibold">{cur.arquivo}</h2>
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
              <DocPreview filename={cur.arquivo} />

              {cur.isRetroativo && cur.justificativaAtraso && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs">
                  <p className="font-medium text-muted-foreground mb-1">Justificativa do atraso (servidor):</p>
                  <p>{cur.justificativaAtraso}</p>
                </div>
              )}

              {getListaStatusBeneficiario(cur).map(({ beneficiarioId, status: statusBeneficiario }) => {
                const beneficiario = beneficiariosPagamento.find((b) => b.id === beneficiarioId);
                const campos = getCamposDoBeneficiario(cur, beneficiarioId);
                const acoesDisponiveis =
                  statusBeneficiario === "em_analise" || statusBeneficiario === "retroativo_aguardando_analista";
                const emSubForm = subForm?.beneficiarioId === beneficiarioId;

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

                    {acoesDisponiveis && !emSubForm && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => aprovar(cur, beneficiarioId)}
                          className="text-sm bg-success text-success-foreground rounded-md px-3 py-2 hover:opacity-90 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {cur.status === "retroativo_aguardando_analista" ? "Aprovar (1ª alçada)" : "Aprovar"}
                        </button>
                        {cur.status !== "retroativo_aguardando_analista" && (
                          <button
                            onClick={() => setSubForm({ beneficiarioId, tipo: "ressalva" })}
                            className="text-sm border border-warning/40 text-warning rounded-md px-3 py-2 hover:bg-warning/5 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Aprovar com ressalva
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

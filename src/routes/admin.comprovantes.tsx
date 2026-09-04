import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  FileSignature,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { PlanilhaStatusBadge } from "@/components/PlanilhaStatusBadge";
import { AnalisePlanilhaModal } from "@/components/AnalisePlanilhaModal";
import { DocPreview } from "@/components/DocPreview";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { DivergenciaAprovacaoModal } from "@/components/DivergenciaAprovacaoModal";
import { getAdminRole } from "@/components/AdminLayout";
import {
  beneficiariosPagamento,
  formatCompetencia,
  formatCurrency,
  analistaReferencia,
  gerenteReferencia,
  tipoRequerimentoLabels,
  type Comprovante,
  type StatusComprovante,
  type AcaoComprovante,
  type TipoRequerimento,
} from "@/lib/mock-data";
import {
  getComprovantesUnificados,
  updateComprovantePagamento,
  getBeneficiariosPagamentoAtual,
  atualizarValorCadastradoBeneficiario,
} from "@/lib/prosaude-storage";
import {
  getCamposDoBeneficiario,
  getDivergencia,
  getDivergenciaBoletoComprovante,
  getElegibilidade,
  recomputeStatusGeral,
  getListaStatusBeneficiario,
} from "@/lib/comprovante-status";
import { estaDentroDoPrazoRelatorio } from "@/lib/prazo-competencia";
import {
  listarPlanilhasAssociacao,
  garantirPlanilhaExemplo,
  statusAtualPlanilha,
  versaoVigente,
  type PlanilhaAssociacao,
} from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/admin/comprovantes")({
  component: Comprovantes,
});

type Tab = "comprovantes" | "retroativos" | "historico" | "planilhas";

const statusPorTab: Record<Tab, StatusComprovante[]> = {
  comprovantes: ["em_analise"],
  // Os 3 últimos são legado (nomes de status de antes da Etapa 1; nenhum envio novo os produz
  // mais). "aguardando_analista"/"aguardando_gerencia" continuam pendentes de decisão — mesma
  // coisa que "aguardando_aprovacao", só com o nome antigo — e por isso são acionáveis
  // (ver `statusComAcaoDisponivel`). Só "devolvido" fica só para consulta.
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
  // "Planilhas - Associações" não filtra `StatusComprovante` — tem seu próprio vocabulário de
  // status (`StatusPlanilhaAssociacao`) e sua própria listagem, renderizada à parte (ver
  // `tab === "planilhas"` abaixo). Presente aqui só para satisfazer o tipo `Record<Tab, ...>`.
  planilhas: [],
};

// Status em que há ação disponível — Analista e Gerência têm exatamente as mesmas ações
// (retroativo não exige mais 2ª alçada obrigatória). `retroativo_aguardando_analista` e
// `retroativo_aguardando_gerencia` são a mesma coisa que `retroativo_aguardando_aprovacao`,
// só com o nome antigo — registros presos neles (de antes da renomeação) continuam pendentes
// de decisão, então também ficam acionáveis por qualquer um dos dois papéis. Só
// `retroativo_devolvido` continua exclusivamente histórico (representa uma devolução já
// decidida sob a antiga 2ª alçada, não uma pendência equivalente à aprovação única).
const statusComAcaoDisponivel: StatusComprovante[] = [
  "em_analise",
  "retroativo_aguardando_aprovacao",
  "retroativo_aguardando_analista",
  "retroativo_aguardando_gerencia",
];

type SubFormTipo = "ressalva" | "correcao" | "recusar" | "complementar" | "requerimento";

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
  const [requerimentoTipo, setRequerimentoTipo] = useState<TipoRequerimento>("mudanca_plano");
  const [divergencia, setDivergencia] = useState<{
    comprovanteId: string;
    beneficiarioId: string;
    valorExtraido: number;
    valorCadastrado: number;
    justificativaServidor?: string;
  } | null>(null);

  const todos = useMemo(() => getComprovantesUnificados(), [refreshKey]);
  // Sempre o cadastro "atual" (seed + correções já aplicadas pela GERDAB) — nunca o seed puro,
  // para que uma divergência cadastral já resolvida não volte a aparecer em outro comprovante.
  const beneficiariosAtuais = useMemo(() => getBeneficiariosPagamentoAtual(), [refreshKey]);
  const cur = todos.find((c) => c.id === openId) ?? null;
  const filtrados = todos.filter((c) => statusPorTab[tab].includes(c.status));

  // Aba "Planilhas - Associações" — garante o exemplo permanente (mesmo padrão de
  // `garantirExemploDocumentoEmAnalise`, idempotente) e lê as planilhas já persistidas.
  useEffect(() => {
    garantirPlanilhaExemplo();
    setRefreshKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const planilhas = useMemo(() => listarPlanilhasAssociacao(), [refreshKey]);
  const [planilhaAberta, setPlanilhaAberta] = useState<PlanilhaAssociacao | null>(null);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function fecharModal() {
    setOpenId(null);
    setSubForm(null);
    setComentario("");
    setMotivo("Documento ilegível");
    setRequerimentoTipo("mudanca_plano");
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

  /** Próximo status ao aprovar — retroativo tem aprovação única, por qualquer um dos dois papéis.
   *  Os 2 status legados "aguardando analista/gerência" resolvem para o mesmo lugar que o status
   *  atual (`retroativo_aguardando_aprovacao`) — são a mesma pendência, só com o nome antigo. */
  function proximoStatusAprovacao(statusAtual: StatusComprovante): StatusComprovante {
    if (
      statusAtual === "retroativo_aguardando_aprovacao" ||
      statusAtual === "retroativo_aguardando_analista" ||
      statusAtual === "retroativo_aguardando_gerencia"
    ) {
      return "retroativo_aprovado";
    }
    return "aprovado";
  }

  function aprovar(comprovante: Comprovante, beneficiarioId: string) {
    const beneficiario = beneficiariosAtuais.find((b) => b.id === beneficiarioId);
    if (!beneficiario) return;
    // "valorExtraido" aqui é o valor ELEGÍVEL (não o bruto/total) — é o que a divergência
    // cadastral compara com o cadastro, ver `getDivergencia`/`valorDivergeDoCadastro`.
    const { divergente, valorElegivel: valorExtraido } = getDivergencia(comprovante, beneficiario);

    if (divergente) {
      setDivergencia({
        comprovanteId: comprovante.id,
        beneficiarioId,
        valorExtraido,
        valorCadastrado: beneficiario.valorCadastrado,
        justificativaServidor: comprovante.justificativasDivergencia?.find(
          (j) => j.beneficiarioId === beneficiarioId,
        )?.texto,
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

  /** GERDAB decide que o valor encontrado está correto: corrige o cadastro do beneficiário e
   *  aprova o comprovante normalmente (não é mais "com ressalva" — o cadastro passou a bater). */
  function aprovarEAtualizarCadastro() {
    if (!divergencia) return;
    const comprovante = todos.find((c) => c.id === divergencia.comprovanteId);
    if (!comprovante) return;

    atualizarValorCadastradoBeneficiario(divergencia.beneficiarioId, divergencia.valorExtraido);
    registrarAcao(comprovante, divergencia.beneficiarioId, proximoStatusAprovacao(comprovante.status), {
      etapa: etapaAtual,
      acao: "valor_cadastral_atualizado",
      aprovadoPor: autor,
      data: new Date().toISOString(),
      comentario: divergencia.justificativaServidor,
      valorAnterior: divergencia.valorCadastrado,
      valorNovo: divergencia.valorExtraido,
    });
    setDivergencia(null);
  }

  /** Fecha o modal de divergência e reabre o fluxo padrão de "Solicitar correção"/"Recusar" —
   *  reaproveita 100% da textarea/confirmação já existente, sem duplicar UI. */
  function solicitarCorrecaoDivergencia() {
    if (!divergencia) return;
    setSubForm({ beneficiarioId: divergencia.beneficiarioId, tipo: "correcao" });
    setDivergencia(null);
  }

  function recusarDivergencia() {
    if (!divergencia) return;
    setSubForm({ beneficiarioId: divergencia.beneficiarioId, tipo: "recusar" });
    setDivergencia(null);
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
      // e permitir exibir a competência original e a justificativa do atraso — vale também
      // para os 2 status legados "aguardando analista/gerência" (mesma pendência de antes
      // da renomeação, ver `proximoStatusAprovacao`).
      const statusRecusa: StatusComprovante =
        comprovante.status === "retroativo_aguardando_aprovacao" ||
        comprovante.status === "retroativo_aguardando_analista" ||
        comprovante.status === "retroativo_aguardando_gerencia"
          ? "retroativo_recusado"
          : "recusado";
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
    } else if (subForm.tipo === "requerimento") {
      // Também não altera o status — generaliza o mesmo padrão de "complementar", mas aponta
      // para um requerimento em outro módulo (sem ponte automática de volta, ver mock-data.ts).
      const beneficiarioIdAlvo = comprovante.beneficiarioIds.length > 1 ? subForm.beneficiarioId : undefined;
      updateComprovantePagamento(comprovante.id, {
        solicitacaoRequerimento: {
          tipo: requerimentoTipo,
          motivo: comentario,
          solicitadoPor: autor,
          data: new Date().toISOString(),
          beneficiarioId: beneficiarioIdAlvo,
        },
        aprovacoes: [
          ...comprovante.aprovacoes,
          {
            etapa: etapaAtual,
            acao: "requerimento_solicitado",
            aprovadoPor: autor,
            data: new Date().toISOString(),
            comentario,
            beneficiarioId: beneficiarioIdAlvo,
          },
        ],
      });
      refresh();
      setSubForm(null);
      setComentario("");
      setRequerimentoTipo("mudanca_plano");
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
            ["planilhas", "Planilhas - Associações"],
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

      {tab !== "planilhas" && (
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
                  {c.operadoraDivergenteCadastro && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-warning mt-1">
                      <AlertTriangle className="h-3 w-3" /> Operadora divergente do cadastro
                    </span>
                  )}
                </div>
                <ComprovanteStatusBadge status={c.status} />
              </header>

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
      )}

      {tab === "planilhas" && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Associação</th>
                <th className="text-left px-4 py-3">Competência</th>
                <th className="text-left px-4 py-3">Data de Envio</th>
                <th className="text-center px-4 py-3">Qtd. Registros</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {planilhas.map((p) => {
                const versao = versaoVigente(p);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{p.associacao}</td>
                    <td className="px-4 py-2">{formatCompetencia(p.competencia)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(versao.enviadoEm).toLocaleDateString("pt-BR")}
                      {p.versoes.length > 1 && (
                        <span className="text-xs"> (versão {versao.versao})</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">{versao.registros.length}</td>
                    <td className="px-4 py-2">
                      <PlanilhaStatusBadge status={statusAtualPlanilha(p)} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setPlanilhaAberta(p)}
                        className="inline-flex items-center gap-1.5 text-sm border border-border rounded-md px-3 py-1.5 hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" /> {statusAtualPlanilha(p) === "em_analise" ? "Analisar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {planilhas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" /> Nenhuma planilha de associação recebida ainda.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {planilhaAberta && (
        <AnalisePlanilhaModal
          planilha={planilhaAberta}
          decididoPorNome={autor}
          onFechar={() => setPlanilhaAberta(null)}
          onDecidido={() => {
            refresh();
            setPlanilhaAberta(null);
          }}
        />
      )}

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
                {cur.operadoraDivergenteCadastro && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warning mt-1">
                    <AlertTriangle className="h-3 w-3" /> Operadora divergente do cadastro — considere solicitar
                    requerimento de mudança de plano
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${
                    estaDentroDoPrazoRelatorio(cur.competencia, cur.dataEnvio) ? "text-muted-foreground" : "text-warning"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {estaDentroDoPrazoRelatorio(cur.competencia, cur.dataEnvio)
                    ? `Dentro do prazo do relatório de ${formatCompetencia(cur.competencia)}`
                    : `Fora do prazo — computa como retroativo no relatório de ${formatCompetencia(cur.competencia)}`}
                </span>
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
                const beneficiario = beneficiariosAtuais.find((b) => b.id === beneficiarioId);
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
                const { elegivel, decomposicao } = beneficiario
                  ? getElegibilidade(cur, beneficiario)
                  : { elegivel: true, decomposicao: { itens: [], valorTotal: 0, valorElegivel: 0, valorNaoReembolsavel: 0 } };
                const { divergente: boletoComprovanteDivergente } = beneficiario
                  ? getDivergenciaBoletoComprovante(cur, beneficiario)
                  : { divergente: false };
                const justificativaDivergenciaServidor = cur.justificativasDivergencia?.find(
                  (j) => j.beneficiarioId === beneficiarioId,
                )?.texto;
                const requerimentoRelevante =
                  cur.solicitacaoRequerimento &&
                  (!cur.solicitacaoRequerimento.beneficiarioId || cur.solicitacaoRequerimento.beneficiarioId === beneficiarioId);

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
                      decomposicaoValor={decomposicao}
                      divergenciaBoletoComprovante={boletoComprovanteDivergente}
                    />

                    {justificativaDivergenciaServidor && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-warning flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Justificativa da divergência (servidor):
                        </p>
                        <p>{justificativaDivergenciaServidor}</p>
                      </div>
                    )}

                    {cur.solicitacaoComplementar && (
                      <p className="text-xs text-muted-foreground italic">
                        Documento complementar já solicitado em{" "}
                        {new Date(cur.solicitacaoComplementar.data).toLocaleString("pt-BR")} por{" "}
                        {cur.solicitacaoComplementar.solicitadoPor} — aguardando o Servidor anexar.
                      </p>
                    )}

                    {requerimentoRelevante && cur.solicitacaoRequerimento && (
                      <p className="text-xs text-muted-foreground italic">
                        Requerimento de {tipoRequerimentoLabels[cur.solicitacaoRequerimento.tipo]} já solicitado em{" "}
                        {new Date(cur.solicitacaoRequerimento.data).toLocaleString("pt-BR")} por{" "}
                        {cur.solicitacaoRequerimento.solicitadoPor} — aguardando o Servidor abrir.
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
                        {!cur.solicitacaoRequerimento && (
                          <button
                            onClick={() => setSubForm({ beneficiarioId, tipo: "requerimento" })}
                            className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted flex items-center gap-1.5"
                          >
                            <FileSignature className="h-3.5 w-3.5" /> Solicitar requerimento
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
                        {subForm.tipo === "requerimento" && (
                          <select
                            value={requerimentoTipo}
                            onChange={(e) => setRequerimentoTipo(e.target.value as TipoRequerimento)}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                          >
                            <option value="mudanca_plano">{tipoRequerimentoLabels.mudanca_plano}</option>
                            <option value="inclusao_dependente">{tipoRequerimentoLabels.inclusao_dependente}</option>
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
                                  : subForm.tipo === "requerimento"
                                    ? "Descreva o motivo do requerimento..."
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
                        {a.acao === "requerimento_solicitado" && "solicitou requerimento"}
                        {a.acao === "valor_cadastral_atualizado" && "atualizou o valor cadastral"}
                        {a.beneficiarioId && ` — ${nomeBeneficiario(a.beneficiarioId)}`}
                        {" em "}
                        {new Date(a.data).toLocaleString("pt-BR")}
                        {a.motivo && ` • Motivo: ${a.motivo}`}
                        {a.valorAnterior !== undefined &&
                          a.valorNovo !== undefined &&
                          ` • De ${formatCurrency(a.valorAnterior)} para ${formatCurrency(a.valorNovo)}`}
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
          justificativaServidor={divergencia.justificativaServidor}
          onAprovarEAtualizar={aprovarEAtualizarCadastro}
          onSolicitarCorrecao={solicitarCorrecaoDivergencia}
          onRecusar={recusarDivergencia}
          onCancel={() => setDivergencia(null)}
        />
      )}
    </div>
  );
}

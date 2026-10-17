import { ResumoAnalise } from '@/components/ResumoAnalise';
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
import { listarComprovantesTeste } from "@/lib/ia-cliente";
import { editarCampoBackend, emitirParecerBackend, listarComprovantesBackend, reenviarIaBackend, type BackendComprovante } from "@/lib/backend-cliente";
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
  type CampoExtraido,
  type StatusComprovante,
  type AcaoComprovante,
  type TipoRequerimento,
} from "@/lib/mock-data";
import {
  getComprovantesUnificados,
  importarComprovantesPagamentoTeste,
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
  statusAtualPlanilha,
  versaoVigente,
  type PlanilhaAssociacao,
} from "@/lib/planilhas-associacao";

// Documento que a IA não conseguiu ler (falha da leitura ou erro de comunicação): o analista precisa ver e poder reenviar.
// Gravidade dos achados: a lista e a orientação vêm prontas do backend; a tela só exibe.
// O tipo que a IA identificou, em palavras (a tela nao mostra o valor interno do contrato).
const ROTULO_TIPO_IDENTIFICADO: Record<string, string> = {
  boleto: "Boleto",
  comprovante_pagamento: "Comprovante de pagamento",
  recibo: "Recibo",
  demonstrativo: "Demonstrativo",
  fatura_tecnica: "Fatura técnica",
  indeterminado: "Não identificado",
};
const SEVERIDADE_ACHADO = {
  alta: { rotulo: "Alta", pill: "bg-red-600 text-white", caixa: "border-red-500 bg-red-50" },
  media: { rotulo: "Média", pill: "bg-amber-500 text-white", caixa: "border-amber-500 bg-amber-50" },
  info: { rotulo: "Informativo", pill: "bg-slate-500 text-white", caixa: "border-slate-400 bg-slate-50" },
} as const;
// Ao lado de cada item, o que ele é: assim "PREMIUM FREE 23.16" aparece como odontológica, sem o analista precisar adivinhar.
const rotuloClassificacao = (classificacao?: string) => ({
  plano_saude: "médica", reembolsavel: "médica", odontologico: "odontológica", iof: "IOF", multa: "multa", juros: "juros",
  desconto: "desconto", abatimento: "abatimento", taxa_administrativa: "taxa administrativa",
} as Record<string, string>)[classificacao ?? ""] ?? "sem classificação";
const documentoComFalha = (documento: BackendComprovante) => documento.ia_status === "FALHA" || documento.ia_status.startsWith("ERRO");
const motivoDaFalha = (documento: BackendComprovante) => documento.ia_erro
  ?? (documento.ia_status === "FALHA" ? "A IA não conseguiu ler este documento." : (documento.ia_status.split(":").slice(1).join(":").trim() || documento.ia_status));

export const Route = createFileRoute("/admin/comprovantes")({
  component: Comprovantes,
});

type Tab = "comprovantes" | "retroativos" | "historico" | "planilhas";

const rotuloCampo: Record<CampoExtraido['chave'], string> = {
  nome: 'Nome', cpf: 'CPF', operadora: 'Operadora', competencia: 'Competência',
  vencimento: 'Vencimento', valor: 'Valor', dataPagamento: 'Data do pagamento', pagador: 'Pagador',
};

function ComparacaoAlteracoes({ campos }: { campos: CampoExtraido[] }) {
  const alterados = campos.filter(c => c.origem === 'manual');
  if (!alterados.length) return null;
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3" aria-label="Alterações informadas pelo servidor">
      <div>
        <h3 className="text-sm font-semibold text-amber-950">Alterações informadas pelo servidor</h3>
        <p className="text-xs text-amber-900">Compare a leitura da IA com o dado confirmado antes de decidir.</p>
      </div>
      {alterados.map(campo => (
        <div key={campo.chave} className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold">{rotuloCampo[campo.chave]}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Leitura da IA</p>
              <p className="text-sm break-words">{campo.leituraIA ? campo.leituraIA.valor || 'Não identificado' : 'Leitura original não preservada'}</p>
              {campo.leituraIA && <p className="text-[11px] text-muted-foreground">Confiança: {campo.leituraIA.confianca}</p>}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Informado pelo servidor</p>
              <p className="text-sm font-medium break-words">{campo.valor || 'Não preenchido'}</p>
            </div>
          </div>
          {(campo.leituraIA?.arquivoOrigem || campo.arquivoOrigem) && (
            <p className="text-[11px] text-muted-foreground">Arquivo: {campo.leituraIA?.arquivoOrigem || campo.arquivoOrigem}</p>
          )}
        </div>
      ))}
    </section>
  );
}

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
  const [enviosDoBanco, setEnviosDoBanco] = useState<Comprovante[]>([]);
  const [filaBackend, setFilaBackend] = useState<BackendComprovante[]>([]);
  const [erroFilaBackend, setErroFilaBackend] = useState("");
  const [processoBackendAberto, setProcessoBackendAberto] = useState<BackendComprovante | null>(null);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [erroReenvio, setErroReenvio] = useState("");
  const reenviarDocumento = async (id: string) => {
    setReenviandoId(id); setErroReenvio("");
    try { await reenviarIaBackend(id); setFilaBackend(await listarComprovantesBackend()); }
    catch (erro) { setErroReenvio(erro instanceof Error ? erro.message : "Falha ao reenviar para a IA."); }
    finally { setReenviandoId(null); }
  };
  const [pessoaEmConferencia, setPessoaEmConferencia] = useState<string | null>(null);
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

  const todos = useMemo(() => {
    const locais = getComprovantesUnificados();
    const ids = new Set(locais.map(c => c.id));
    return [...locais, ...enviosDoBanco.filter(c => !ids.has(c.id))];
  }, [refreshKey, enviosDoBanco]);
  useEffect(() => {
    let ativo = true;
    listarComprovantesTeste().then(envios => {
      if (ativo) {
        importarComprovantesPagamentoTeste(envios);
        setEnviosDoBanco(envios);
      }
    }).catch(() => { /* Exemplos locais continuam disponíveis se o serviço de teste estiver offline. */ });
    return () => { ativo = false; };
  }, [refreshKey]);
  useEffect(() => {
    let ativo = true;
    const atualizar = () => listarComprovantesBackend()
      .then((itens) => { if (ativo) { setFilaBackend(itens); setErroFilaBackend(""); } })
      .catch(() => { if (ativo) setErroFilaBackend("Backend local indisponível em http://127.0.0.1:8003."); });
    atualizar();
    const intervalo = window.setInterval(atualizar, 3000);
    return () => { ativo = false; window.clearInterval(intervalo); };
  }, [refreshKey]);
  // Sempre o cadastro "atual" (seed + correções já aplicadas pela GERDAB) — nunca o seed puro,
  // para que uma divergência cadastral já resolvida não volte a aparecer em outro comprovante.
  const beneficiariosAtuais = useMemo(() => getBeneficiariosPagamentoAtual(), [refreshKey]);
  const cur = todos.find((c) => c.id === openId) ?? null;
  const filtrados = todos.filter((c) => statusPorTab[tab].includes(c.status));
  const processosBackend = useMemo(() => {
    const agrupados = new Map<string, BackendComprovante[]>();
    filaBackend.forEach((item) => {
      const chave = item.processo_id ?? item.id;
      agrupados.set(chave, [...(agrupados.get(chave) ?? []), item]);
    });
    return [...agrupados.values()];
  }, [filaBackend]);

  // Aba "Planilhas - Associações" — garante o exemplo permanente (mesmo padrão de
  // `garantirExemploDocumentoEmAnalise`, idempotente) e lê as planilhas já persistidas.
  useEffect(() => {
    // A base de testes começa vazia; exemplos não são inseridos automaticamente.
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

      {filaBackend.length > 0 && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3" aria-label="Fila recebida pelo backend">
          <div><h2 className="font-semibold">Fila recebida pelo backend</h2><p className="text-xs text-muted-foreground">O servidor já foi liberado. Clique em um processo para analisar o histórico e decidir.</p></div>
          {processosBackend.map((documentos) => { const item = documentos[0]; const emFalha = documentos.filter(documentoComFalha); const pendente = documentos.some((documento) => documento.ia_status !== "CONCLUIDA" && !documentoComFalha(documento)); return <button key={item.processo_id ?? item.id} onClick={() => { setProcessoBackendAberto(item); setPessoaEmConferencia(null); }} className="block w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-sm break-all">{((item.candidatos as { nome?: string; competenciaEsperada?: string }[])[0]?.nome ?? "Titular não identificado")} · {((item.candidatos as { competenciaEsperada?: string }[])[0]?.competenciaEsperada ?? "Competência não identificada")}</p><p className="text-xs text-muted-foreground">{documentos.length} {documentos.length === 1 ? "documento" : "documentos"} · {(item.candidatos as unknown[]).length} {(item.candidatos as unknown[]).length === 1 ? "pessoa" : "pessoas"} · IA: {pendente ? "PROCESSANDO" : emFalha.length ? <span className="font-semibold text-red-700">FALHA EM {emFalha.length} {emFalha.length === 1 ? "DOCUMENTO" : "DOCUMENTOS"}</span> : "CONCLUÍDA"}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{item.status === "PARECER_EMITIDO" ? "Parecer emitido" : "Em análise"}</span></div>
          </button>; })}
        </section>
      )}

      {processoBackendAberto && (() => {
        const item = filaBackend.find((registro) => registro.id === processoBackendAberto.id) ?? processoBackendAberto;
        const documentosDoProcesso = filaBackend.filter((registro) => (registro.processo_id ?? registro.id) === (item.processo_id ?? item.id));
        const pessoasDoProcesso = (item.candidatos as { nome?: string }[]).map((pessoa) => pessoa.nome).filter((nome): nome is string => Boolean(nome));
        const pessoaAtual = pessoaEmConferencia && pessoasDoProcesso.includes(pessoaEmConferencia) ? pessoaEmConferencia : pessoasDoProcesso[0];
        const leiturasDosDocumentos = documentosDoProcesso.map((documento) => ({ documento, leitura: documento.leitura_ia as { tipoIdentificado?: string; campos?: Record<string, { valor?: string; confianca?: string; evidencia?: string }>; avisos?: string[] } | null }));
        const leitura = item.leitura_ia as { tipoIdentificado?: string; campos?: Record<string, { valor?: string; confianca?: string; evidencia?: string }>; avisos?: string[] } | null;
        const manual: Record<string, { valor: string; analista_id: string; alterado_em: string }> = Object.assign({}, ...documentosDoProcesso.map((documento) => documento.campos_manuais ?? {}));
        const nomeDocumento = (documento: BackendComprovante) => (documento.arquivo.split(/[\\/]/).pop() ?? "Documento").replace(`${documento.id}-`, "");
        const nomeArquivo = nomeDocumento(item);
        const camposPorChave = new Map<string, { valor?: string; confianca?: string; evidencia?: string; documento: BackendComprovante }>();
        leiturasDosDocumentos.forEach(({ documento, leitura: leituraDocumento }) => Object.entries(leituraDocumento?.campos ?? {}).forEach(([chave, valor]) => {
          const anterior = camposPorChave.get(chave);
          const anteriorTipo = (anterior?.documento.leitura_ia as { tipoIdentificado?: string } | null)?.tipoIdentificado;
          const preferirBoleto = ["operadora", "competencia"].includes(chave) && leituraDocumento?.tipoIdentificado === "boleto" && anteriorTipo !== "boleto";
          if (!anterior || (!anterior.valor && valor?.valor) || (preferirBoleto && valor?.valor)) camposPorChave.set(chave, { ...valor, documento });
        }));
        // O pagador pode ser o titular e os beneficiários podem ser dependentes. Para o campo
        // "nome", usa a lista de beneficiários identificada no boleto, sem confundir com pagador.
        const normalizarNome = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
        const partesDaPessoa = normalizarNome(pessoaAtual ?? "").split(" ").filter(Boolean).slice(0, 2);
        const beneficiarioEncontrado = leiturasDosDocumentos.flatMap(({ documento, leitura: leituraDocumento }) =>
          ((leituraDocumento as { beneficiarios?: { nome?: string; confianca?: string; evidenciaCobertura?: string }[] } | null)?.beneficiarios ?? []).map((beneficiario) => ({ ...beneficiario, documento })),
        ).find((beneficiario) => partesDaPessoa.length > 0 && partesDaPessoa.every((parte) => normalizarNome(beneficiario.nome ?? "").includes(parte)));
        if (beneficiarioEncontrado) {
          camposPorChave.set("nome", {
            valor: beneficiarioEncontrado.nome ?? "",
            confianca: beneficiarioEncontrado.confianca ?? "media",
            evidencia: beneficiarioEncontrado.evidenciaCobertura ?? "Beneficiário identificado no documento",
            documento: beneficiarioEncontrado.documento,
          });
          // Nunca copia o total do boleto para uma pessoa. Só usa valor que a IA tenha
          // atribuído explicitamente ao beneficiário; sem isso o analista precisa conferir.
          const valorIndividual = (beneficiarioEncontrado as { valor?: string }).valor || "";
          camposPorChave.set("valor", {
            valor: valorIndividual,
            confianca: valorIndividual ? (beneficiarioEncontrado.confianca ?? "media") : "nenhuma",
            evidencia: valorIndividual ? "Valor atribuído pela IA ao beneficiário" : "O total do documento não foi usado como valor individual.",
            documento: beneficiarioEncontrado.documento,
          });
        }
        const itensDoProcesso = leiturasDosDocumentos.flatMap(({ leitura: leituraDocumento }) => ((leituraDocumento as { itensFinanceiros?: { descricao?: string; valor?: string; classificacao?: string }[] } | null)?.itensFinanceiros ?? []));
        const itensDaPessoa = (beneficiarioEncontrado as { itens?: { descricao?: string; valor?: string; classificacao?: string }[] } | undefined)?.itens ?? [];
        const campos = [...camposPorChave.entries()];
        const pontosAtencao: { titulo: string; texto: string; tom: "alerta" | "info" }[] = [];
        if (beneficiarioEncontrado && !(beneficiarioEncontrado as { valor?: string }).valor) pontosAtencao.push({ titulo: "Mensalidade individual não confirmada", texto: "Confira no documento qual valor pertence à pessoa selecionada.", tom: "alerta" });
        const normalizarValor = (valor?: string) => Number((valor ?? "").includes(",") ? (valor ?? "").replace(/\./g, "").replace(",", ".") : valor ?? "");
        leiturasDosDocumentos.forEach(({ leitura: leituraDocumento }) => {
          if (leituraDocumento?.tipoIdentificado !== "boleto") return;
          const dados = leituraDocumento as { beneficiarios?: { valor?: string }[]; campos?: { valor?: { valor?: string } } };
          const valores = (dados.beneficiarios ?? []).map((pessoa) => normalizarValor(pessoa.valor));
          const total = normalizarValor(dados.campos?.valor?.valor);
          if (total > 0 && valores.length && valores.every((valor) => valor > 0) && Math.abs(valores.reduce((soma, valor) => soma + valor, 0) - total) > 0.01)
            pontosAtencao.push({ titulo: "Valores do boleto não fecham", texto: "A soma das mensalidades individuais difere do total impresso. Confira os valores no original.", tom: "alerta" });
        });
        itensDoProcesso.forEach((item) => {
          const descricao = item.descricao ?? "Item sem descrição";
          if (/odonto|dental/i.test(descricao)) pontosAtencao.push({ titulo: "Item odontológico", texto: `${descricao}: ${item.valor ?? "valor não identificado"}. Classificação recebida: ${item.classificacao ?? "não informada"}; confira a regra de reembolso.`, tom: "alerta" });
          if (/iof/i.test(descricao)) pontosAtencao.push({ titulo: "IOF identificado", texto: `${descricao}: ${item.valor ?? "valor não identificado"}. Não some automaticamente à mensalidade.`, tom: "alerta" });
          if (item.classificacao === "indeterminado") pontosAtencao.push({ titulo: "Item sem classificação", texto: `${descricao}: ${item.valor ?? "valor não identificado"}.`, tom: "info" });
        });
        const nomeSelecionadoNormalizado = normalizarNome(pessoaAtual ?? "");
        const divergenciasCadastro: typeof pontosAtencao = [];
        leiturasDosDocumentos.flatMap(({ leitura: leituraDocumento }) => ((leituraDocumento as { comparacoesCadastro?: { cadastro?: string; identificada?: string; resultado?: string; justificativa?: string }[] } | null)?.comparacoesCadastro ?? [])).filter((comparacao) => {
          if (!comparacao.resultado || comparacao.resultado === "compativel") return false;
          const cadastro = normalizarNome(comparacao.cadastro ?? "");
          // Comparações nome/valor são individuais; não poluem o formulário do outro dependente.
          return !/(nome|valoresperado)/.test(cadastro) || partesDaPessoa.some((parte) => cadastro.includes(parte));
        }).forEach((comparacao) => {
          if (comparacao.resultado === "divergente") {
            const ponto = { titulo: "Divergência com o cadastro", texto: `${comparacao.cadastro ?? "Dado cadastrado"}; leitura: ${comparacao.identificada || "não identificada"}.`, tom: "alerta" as const };
            pontosAtencao.push(ponto);
            divergenciasCadastro.push(ponto);
          }
        });
        const pontosAtencaoUnicos = pontosAtencao.filter((ponto, indice, lista) => lista.findIndex((outro) => outro.titulo === ponto.titulo && outro.texto === ponto.texto) === indice).slice(0, 8);
        type InsightIA = { titulo?: string; texto?: string; evidencia?: string; beneficiario?: string; pagina?: number | null };
        const leiturasComInsights = leiturasDosDocumentos.filter(({ leitura: leituraDocumento }) => Array.isArray((leituraDocumento as { insightsAnalise?: InsightIA[] } | null)?.insightsAnalise));
        const insightsIA = leiturasComInsights.flatMap(({ documento, leitura: leituraDocumento }) =>
          ((leituraDocumento as { insightsAnalise?: InsightIA[] }).insightsAnalise ?? [])
            .filter((insight) => !insight.beneficiario || normalizarNome(insight.beneficiario) === normalizarNome(pessoaAtual ?? ""))
            .filter((insight) => insight.titulo && insight.texto && insight.evidencia)
            .filter((insight) => !/\b(?:esperad\w*|candidat\w*|cadastr\w*)\b/i.test(`${insight.titulo} ${insight.texto}`))
            .filter((insight) => !(/\bvalor total\b/i.test(insight.titulo ?? "") && !/diverg|difer|incompat|inconclus|não fecha|não corresponde/i.test(`${insight.titulo} ${insight.texto}`)))
            .map((insight) => ({
              titulo: insight.titulo!,
              texto: `${insight.texto} Evidência: ${insight.evidencia}${insight.pagina ? ` (página ${insight.pagina})` : ""}. Fonte: ${nomeDocumento(documento)}.`,
              tom: "alerta" as const,
            })),
        );
        // A comparação com o cadastro é determinística: não pode sumir quando a IA devolve insights (nem quando vêm vazios).
        const pontosExibidos = (leiturasComInsights.length ? [...divergenciasCadastro, ...insightsIA] : pontosAtencaoUnicos)
          .filter((ponto, indice, lista) => lista.findIndex((outro) => outro.titulo === ponto.titulo && outro.texto === ponto.texto) === indice).slice(0, 8);
        // Com os achados do backend, os alertas aparecem uma vez só (painel "Achados para o analista"); este painel fica com os dados lidos.
        const temAchados = Array.isArray(item.achados);
        // O documento com falha ja aparece no painel vermelho (com o motivo e o botao de reenvio): nao repete em "Achados".
        const achadosVisiveis = (item.achados ?? []).filter((achado) => !(achado.codigo === "LEITURA_FALHOU" && documentosDoProcesso.some(documentoComFalha)));
        const camposFormulario: CampoExtraido[] = campos
          .filter(([chave]) => ["nome", "cpf", "operadora", "competencia", "vencimento", "valor", "dataPagamento", "pagador"].includes(chave))
          .map(([chave, dado]) => ({
            chave: chave as CampoExtraido["chave"],
            valor: manual[chave]?.valor ?? dado.valor ?? "",
            origem: manual[chave] ? "manual" : "ocr",
            confianca: (dado.confianca === "alta" || dado.confianca === "media" ? dado.confianca : "nenhuma"),
            arquivoOrigem: nomeDocumento(dado.documento),
            leituraIA: manual[chave] ? { valor: dado.valor ?? "", confianca: (dado.confianca === "alta" || dado.confianca === "media" ? dado.confianca : "nenhuma"), arquivoOrigem: nomeDocumento(dado.documento) } : undefined,
          }));
        return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[94vh] w-[96vw] max-w-[1500px] overflow-y-auto rounded-xl bg-card shadow-xl">
          <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-card p-5"><div><h2 className="font-semibold">{pessoaAtual ?? "Processo"} · {((item.candidatos as { competenciaEsperada?: string }[])[0]?.competenciaEsperada ?? "Competência")}</h2><p className="text-xs text-muted-foreground">Processo com {documentosDoProcesso.length} {documentosDoProcesso.length === 1 ? "documento" : "documentos"} e {pessoasDoProcesso.length} {pessoasDoProcesso.length === 1 ? "pessoa" : "pessoas"}</p></div><button onClick={() => setProcessoBackendAberto(null)} className="rounded border border-border px-3 py-1 text-sm">Fechar</button></header>
          <div className="space-y-4 p-5">
            {documentosDoProcesso.some(documentoComFalha) && <section className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm space-y-2" aria-label="Documentos com falha na leitura"><h3 className="font-semibold text-red-800">Documentos com falha na leitura</h3>{documentosDoProcesso.filter(documentoComFalha).map((documento) => <div key={documento.id} className="flex flex-wrap items-center justify-between gap-2"><div><p><strong>{nomeDocumento(documento)}</strong></p><p className="text-xs text-muted-foreground">{motivoDaFalha(documento)}</p><p className="text-xs text-red-800">Reenvie para a IA. Se falhar de novo, peça um novo arquivo ao servidor.</p></div><button disabled={reenviandoId === documento.id} onClick={() => reenviarDocumento(documento.id)} className="rounded border border-red-400 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50">{reenviandoId === documento.id ? "Reenviando..." : "Reenviar para a IA"}</button></div>)}{erroReenvio && <p className="text-xs text-red-700">{erroReenvio}</p>}</section>}
            <section className="rounded-lg border border-border bg-card p-4 text-sm space-y-3" aria-label="Achados para o analista"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Achados para o analista ({achadosVisiveis.length})</h3><div className="flex gap-1.5 text-xs">{(["alta", "media", "info"] as const).map((nivel) => { const quantos = achadosVisiveis.filter((achado) => achado.severidade === nivel).length; return quantos > 0 && <span key={nivel} className={`rounded-full px-2 py-0.5 font-semibold ${SEVERIDADE_ACHADO[nivel].pill}`}>{quantos} {SEVERIDADE_ACHADO[nivel].rotulo}</span>; })}</div></div>{achadosVisiveis.length === 0 ? <p className="text-muted-foreground">Nenhum achado automático. Confira o original antes de decidir.</p> : achadosVisiveis.map((achado, indice) => <div key={`${achado.codigo}-${indice}`} className={`rounded-md border-l-4 p-3 ${SEVERIDADE_ACHADO[achado.severidade].caixa}`}><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERIDADE_ACHADO[achado.severidade].pill}`}>{SEVERIDADE_ACHADO[achado.severidade].rotulo}</span><strong>{achado.titulo}</strong></div><p className="mt-1">{achado.texto}</p><p className="mt-1"><span className="font-semibold">O que fazer:</span> {achado.acao}</p>{achado.evidencias.some((evidencia) => evidencia.trecho) && <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{achado.evidencias.filter((evidencia) => evidencia.trecho).map((evidencia, i) => <li key={i}>{evidencia.arquivo}: {evidencia.trecho}</li>)}</ul>}</div>)}</section>
            <section className="rounded-lg bg-muted/60 p-3 text-sm"><h3 className="font-medium">Linha do tempo</h3><p>Envio recebido: {new Date(item.criado_em).toLocaleString("pt-BR")}</p><p>Processamento da IA: {item.ia_status}</p>{item.leitura_ia && <p>Leitura técnica recebida: {new Date(item.atualizado_em).toLocaleString("pt-BR")}</p>}{item.parecer && <p>Decisão final: {String(item.parecer.decisao ?? "emitida")}</p>}</section>
            <section className="space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Documentos do processo</span>{documentosDoProcesso.map((documento) => <button key={documento.id} onClick={() => setProcessoBackendAberto(documento)} className={`rounded border px-3 py-1.5 text-xs ${documento.id === item.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{nomeDocumento(documento)}</button>)}</div>{pessoasDoProcesso.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Pessoa em conferência</span>{pessoasDoProcesso.map((nome) => <button key={nome} onClick={() => setPessoaEmConferencia(nome)} className={`rounded border px-3 py-1.5 text-xs ${pessoaAtual === nome ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>{nome}</button>)}</div>}</section>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)] xl:items-start">
              <section className="space-y-2"><h3 className="text-sm font-semibold">Documento original</h3><DocPreview filename={nomeArquivo} src={`/api/backend/comprovantes/${item.id}/arquivo`} /></section>
              <section className="rounded-lg border border-border p-4 space-y-3"><div><h3 className="font-semibold">Conferência do analista</h3><p className="text-xs text-muted-foreground">Compare o original com a leitura. Ao sair do campo, a alteração manual é salva.</p></div>
                {!leitura && <p className="text-sm text-muted-foreground">Aguardando leitura deste documento.</p>}
                {leitura?.tipoIdentificado && <p className="text-xs">Tipo identificado: <strong>{ROTULO_TIPO_IDENTIFICADO[leitura.tipoIdentificado] ?? leitura.tipoIdentificado}</strong></p>}
                <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs space-y-2"><h4 className="font-semibold text-sm">{temAchados ? "Dados lidos da pessoa em conferência" : `Pontos de atenção da análise (${pontosExibidos.length})`}</h4><p className="text-muted-foreground">A IA fornece evidências; a decisão e qualquer ajuste continuam com o analista.</p>{itensDaPessoa.length > 0 && <div><p className="font-medium">Itens vinculados a {pessoaAtual}</p>{itensDaPessoa.map((item, indice) => <p key={`${item.descricao}-${indice}`}>{item.descricao}: {item.valor || "valor não identificado"} <span className="text-xs text-muted-foreground">({rotuloClassificacao(item.classificacao)})</span></p>)}</div>}{temAchados ? <p>{achadosVisiveis.length > 0 ? 'Os alertas deste processo estão em "Achados para o analista", acima.' : "Nenhum alerta automático para este processo. Confira o original antes de decidir."}</p> : pontosExibidos.length > 0 ? <ul className="list-disc space-y-1 pl-5">{pontosExibidos.map((ponto, indice) => <li key={indice} className={ponto.tom === "alerta" ? "text-amber-950" : "text-slate-700"}><strong>{ponto.titulo}.</strong> {ponto.texto}</li>)}</ul> : <p>Nenhum ponto crítico identificado automaticamente. Confira o original antes de decidir.</p>}</section>
                {camposFormulario.length > 0 && <CamposExtraidosForm titulo={pessoaAtual ? `Formulário de ${pessoaAtual}` : "Formulário consolidado"} campos={camposFormulario} onChange={(novosCampos) => {
                  const alterados = novosCampos.filter((campo) => campo.valor !== (camposFormulario.find((original) => original.chave === campo.chave)?.valor ?? ""));
                  if (!alterados.length) return;
                  const agora = new Date().toISOString();
                  setProcessoBackendAberto({ ...item, campos_manuais: { ...manual, ...Object.fromEntries(alterados.map((campo) => [campo.chave, { valor: campo.valor, analista_id: autor, alterado_em: agora }])) } });
                  Promise.all(alterados.map((campo) => editarCampoBackend(item.id, campo.chave, campo.valor, autor))).then(() => setRefreshKey(k => k + 1));
                }} />}
                {camposFormulario.length === 0 && leitura && <p className="text-sm text-muted-foreground">A IA não encontrou campos estruturados.</p>}
              </section>
            </div>
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><h3 className="font-medium mb-2">Alterações manuais registradas</h3>{Object.keys(manual).length === 0 ? <p>Nenhuma alteração manual.</p> : Object.entries(manual).map(([campo, valor]) => <p key={campo}><strong>{campo}:</strong> {valor.valor} <span className="text-muted-foreground">— {valor.analista_id}, {new Date(valor.alterado_em).toLocaleString("pt-BR")}</span></p>)}</section>
            {!item.parecer ? <section className="flex flex-wrap gap-2"><button onClick={() => emitirParecerBackend(item.id, "APROVADO", "Parecer emitido pelo analista.", autor).then((atualizado) => { setProcessoBackendAberto(atualizado); setRefreshKey(k => k + 1); })} className="rounded bg-success px-3 py-2 text-sm font-medium text-success-foreground">Aprovar</button><button onClick={() => emitirParecerBackend(item.id, "RECUSADO", "Parecer emitido pelo analista.", autor).then((atualizado) => { setProcessoBackendAberto(atualizado); setRefreshKey(k => k + 1); })} className="rounded border border-destructive/30 px-3 py-2 text-sm text-destructive">Recusar</button></section> : <section className="rounded-lg bg-success/10 p-3 text-sm"><strong>Parecer final:</strong> {String(item.parecer.decisao ?? "emitido")}</section>}
          </div>
        </div></div>;
      })()}
      {erroFilaBackend && <p className="text-xs text-muted-foreground">{erroFilaBackend}</p>}

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
              <ResumoAnalise comprovante={cur} beneficiarios={beneficiariosAtuais} />
              <div className="space-y-2">
                {cur.arquivos.map((a, index) => (
                  <DocPreview key={`${a.nome}-${index}`} filename={a.nome}
                    src={a.execucaoId ? `/api/ia/simulacao/envios/${encodeURIComponent(cur.id)}/arquivos/${index + 1}` : undefined} />
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

                    <ComparacaoAlteracoes campos={campos} />

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

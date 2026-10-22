import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FlaskConical, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAdminRole } from "@/components/AdminLayout";
import { CelulaObservacao } from "@/components/CelulaObservacao";
import { GuardaPerfilAdmin } from "@/components/negociacoes/ui";
import { FluxoEmissaoSuspensoes, HistoricoEmissoesSuspensoes } from "@/components/FluxoEmissaoSuspensoes";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { getDataReferencia } from "@/lib/dias-uteis";
import { consultarServidorCadastral, ROTULO_FONTE_CADASTRAL, type ServidorCadastral } from "@/lib/cadastro-servidores-busca";
import { SeletorServidorCadastral } from "@/components/SeletorServidorCadastral";
import { responsavelCadastro } from "@/lib/servidor-cadastro";
import { listarRequerimentosAssociacao, statusAtualRequerimento, statusRequerimentoAssociacaoLabels, versaoVigenteRequerimento } from "@/lib/requerimentos-associacao";
import { useRetornoDeFoco } from "@/lib/use-retorno-foco";
import { idsEmitidos, numerosEmitidosPorRegistro } from "@/lib/emissoes-relatorio";
import { COMPETENCIA_DEMONSTRATIVA, definirAmbienteDemo, diagnosticarRestauracaoSuspensoes, restaurarAmbienteDemonstrativo, useAmbienteDemo, type DiagnosticoRestauracaoSuspensoes } from "@/lib/massa-demonstracao-suspensoes";
import { ehRequerimentoDemonstrativo, REQUERIMENTOS_DEMONSTRATIVOS } from "@/lib/fontes-suspensoes";
import { listarEmissoes } from "@/lib/emissoes-relatorio";
import { useEmissoesSuspensoes } from "@/lib/relatorio-suspensoes-geracao";
import { gerarSituacoesDaCompetencia, LIMITACOES_FONTE, type ResultadoGeracaoSuspensao } from "@/lib/relatorio-suspensoes-sugestoes";
import { competenciaPagamentoPadrao, ORIGENS_PAGAMENTO, type OrigemPagamento, type VinculoFuncional } from "@/lib/relatorio-alteracoes";
import {
  atualizarClassificacao,
  atualizarDadosSuspensao,
  atualizarObservacaoSuspensao,
  CLASSIFICACOES,
  confirmarSuspensao,
  descartarSuspensao,
  exigeMotivo,
  MOTIVOS_SUSPENSAO_REFERENCIA,
  PARENTESCOS,
  pendenciasSuspensao,
  prontoSuspensao,
  reabrirSuspensao,
  registrarSuspensao,
  removerSuspensoesDemonstrativas,
  ROTULO_CLASSIFICACAO,
  sugerirObservacaoSuspensao,
  textoDoMotivoSuspensao,
  useRegistrosSuspensoes,
  type ClassificacaoSuspensao,
  type PessoaAfetada,
  VALOR_SUSPENSAO,
  ROTULO_TIPO_PENDENCIA,
  ROTULO_FONTE_SUGESTAO,
  ROTULO_TIPO_SUGESTAO,
  getSuspensao,
  listarSuspensoes,
  confirmarCompetenciasSuspensao,
  type TipoSugestaoSuspensao,
  ESCOPO_EXCLUSAO_DEPENDENTE,
  ESCOPO_EXCLUSAO_TITULAR,
  ROTULO_ORIGEM_REQUERIMENTO,
  atualizarRequerimentoExclusaoSuspensao,
  type OrigemRequerimentoExclusao,
  type RequerimentoExclusaoRef,
  type SituacaoAprovacaoRequerimento,
  atualizarPendenciaSuspensao,
  competenciaMais,
  competenciaPorExtenso,
  intervaloCompetencias,
  textoCompetencias,
  type PendenciaRef,
  type RegistroSuspensao,
  type TipoPendenciaSuspensao,
} from "@/lib/relatorio-suspensoes";

export const Route = createFileRoute("/admin/relatorios/suspensoes")({
  component: RelatorioSuspensoesProtegido,
});

/* ── Utilitários ─────────────────────────────────────────────────────────────────────────────────────────────── */

const ROTULO_FONTE_MODULO: Record<string, string> = {
  comprovantes: "Comprovantes individuais",
  requerimentos: "Requerimentos de Associação",
  planilhas_associacao: "Planilhas das associações",
  ressarcimentos: "Ressarcimentos de meses anteriores",
  fechamento: "Histórico de Fechamento",
  cadastro: "Cadastro",
  manual: "Inclusão manual",
  demonstrativo: "Massa demonstrativa",
};
const CAMPO = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:bg-muted";
const PAGAMENTO_DEMONSTRATIVO = "2026-10";
const BTN_PRIMARIO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
const BTN_SECUNDARIO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";
const BTN_CONTORNO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl border border-primary/50 bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** Como o registro nasceu: inclusão manual, sugestão (de suspensão ou de exclusão) ou investigação (sem classificação). */
type TipoRegistro = "manual" | TipoSugestaoSuspensao;
const tipoDoRegistro = (r: RegistroSuspensao): TipoRegistro => (!r.sugestao ? "manual" : !r.classificacao ? "investigacao" : r.classificacao === "excluir" ? "exclusao" : "suspensao");
const ROTULO_TIPO_REGISTRO: Record<TipoRegistro, string> = { manual: "Inclusão manual", suspensao: "Sugestão de suspensão", exclusao: "Sugestão de exclusão", investigacao: "Investigação" };
const ESTILO_TIPO_REGISTRO: Record<TipoRegistro, string> = {
  manual: "border-border text-foreground/75",
  suspensao: "border-primary/40 bg-primary/5 text-primary",
  exclusao: "border-destructive/40 bg-destructive/5 text-destructive",
  investigacao: "border-status-pendente-fg/50 bg-status-pendente-bg text-status-pendente-fg",
};
type FiltroTipo = "todos" | TipoRegistro;

/** "Comprovante de pagamento de junho/2026" · "Documentação: Comprovante de matrícula · março/2026 a outubro/2026 (início a conferir)"; vazio em registro sem chave. */
function rotuloPendencia(r: RegistroSuspensao): string {
  const p = r.pendenciaRef;
  if (!p) return "";
  if (p.tipo === "comprovante_pagamento") return `Comprovante de pagamento de ${p.competencia ? competenciaPorExtenso(p.competencia) : "competência a informar"}`;
  const cs = textoCompetencias(r.competenciasAfetadas ?? []);
  return `Documentação: ${p.documento?.trim() || "documento a identificar"} · ${cs || "competências a informar"}${cs && !r.competenciaInicialConferida ? " (início a conferir)" : ""}`;
}

/** "Requerimento 123 — aprovado, conferido" · vazio fora de "Excluir". */
function rotuloRequerimento(r: RegistroSuspensao): string {
  if (r.classificacao !== "excluir") return "";
  const q = r.requerimentoExclusao;
  if (!q) return "a informar";
  const situacao = q.situacaoAprovacao === "aprovado" ? "aprovado" : q.situacaoAprovacao === "nao_aprovado" ? "NÃO aprovado" : "aprovação a conferir";
  return `${q.referencia} — ${situacao}${q.conferencia ? ", conferido" : q.situacaoAprovacao === "aprovado" ? ", a conferir" : ""}`;
}

/** Rótulo para a tabela: "Suspender — titular" ou "Excluir — dependente Fulano (enteado)", seguido do motivo. */
function rotuloSituacao(r: RegistroSuspensao): { principal: string; quem: string; motivo: string; pendencia: string; requerimento: string; fonte: string; competencias: string } {
  const quem = r.afetado.tipo === "dependente" ? `dependente ${r.afetado.nomeDependente ?? ""}${r.afetado.parentesco ? ` (${r.afetado.parentesco.toLowerCase()})` : ""}` : "titular";
  return { principal: r.classificacao ? ROTULO_CLASSIFICACAO[r.classificacao] : r.sugestao?.tipo === "investigacao" ? "A verificar" : "Situação a classificar", quem, motivo: r.motivo ? textoDoMotivoSuspensao(r.motivo) : "", pendencia: rotuloPendencia(r), requerimento: rotuloRequerimento(r), fonte: r.sugestao ? ROTULO_FONTE_SUGESTAO[r.sugestao.fonte] : "", competencias: `Ref. ${competenciaPorExtenso(r.competenciaReferencia)} · Pagamento ${competenciaPorExtenso(r.competenciaPagamento)}${r.competenciaEstimada ? " (a conferir)" : ""}` };
}

const prontoDoRegistro = prontoSuspensao;

const mesesDisponiveis = (registros: RegistroSuspensao[]) => {
  const ref = getDataReferencia();
  const atual = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  const lista = new Set<string>(registros.map((r) => r.competenciaReferencia));
  for (let i = 0; i < 8; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    lista.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return { lista: [...lista].sort().reverse(), atual };
};

/** Setas ←/→ (e Home/End) movem entre as abas de um `role="tablist"`. */
function navegarAbas(e: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
  const abas = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')];
  const i = abas.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const j = e.key === "Home" ? 0 : e.key === "End" ? abas.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + abas.length) % abas.length;
  abas[j].focus();
  abas[j].click();
}

/* ── Tela ────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Aba = VinculoFuncional | "sem_vinculo";
type FiltroOrigem = "todas" | OrigemPagamento | "sem_origem";

/** Acesso restrito aos perfis da GERDAB (Analista e Gerência) — mesmo mecanismo já usado em Negociações (`GuardaPerfilAdmin`). */
function RelatorioSuspensoesProtegido() {
  return (
    <GuardaPerfilAdmin modulo="Relatório de Suspensões">
      <RelatorioSuspensoes />
    </GuardaPerfilAdmin>
  );
}

function RelatorioSuspensoes() {
  const registros = useRegistrosSuspensoes();
  const emissoes = useEmissoesSuspensoes();
  const responsavel = responsavelCadastro(getAdminRole());
  const { lista: meses, atual } = useMemo(() => mesesDisponiveis(registros), [registros]);
  const [competencia, setCompetencia] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("ativo");
  const [origem, setOrigem] = useState<FiltroOrigem>("todas");
  const [busca, setBusca] = useState("");
  const [alteracao, setAlteracao] = useState<{ id: string | null } | null>(null);
  const [fluxoAberto, setFluxoAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [geracao, setGeracao] = useState<ResultadoGeracaoSuspensao | null>(null);
  const [detalhesGeracao, setDetalhesGeracao] = useState(false);
  const [destacar, setDestacar] = useState<ReadonlySet<string>>(new Set());
  const tabelaRef = useRef<HTMLElement>(null);
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("todos");

  // Competência inicial: a mais recente que já tem registros; senão, o mês anterior à data de referência.
  useEffect(() => {
    if (competencia !== null || meses.length === 0) return;
    const comRegistro = registros.length ? [...registros].map((r) => r.competenciaReferencia).sort().reverse()[0] : undefined;
    const [a, m] = atual.split("-").map(Number);
    setCompetencia(comRegistro ?? (m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`));
  }, [competencia, meses, registros, atual]);

  const competenciaSel = competencia ?? atual;
  const daCompetencia = useMemo(() => registros.filter((r) => r.competenciaReferencia === competenciaSel), [registros, competenciaSel]);
  const ativos = daCompetencia.filter((r) => r.situacao !== "descartada");
  const prontas = ativos.filter(prontoDoRegistro).length;
  const pagamentosDaCompetencia = useMemo(() => [...new Set(ativos.map((r) => r.competenciaPagamento))].sort(), [ativos]);
  // Competência de pagamento do RELATÓRIO: escolhida pelo analista junto com a de referência, antes de gerar, incluir ou emitir.
  const [pagamentoSel, setPagamentoSel] = useState<string | null>(null);
  const pagamentoDemoRef = useRef<string | null>(null);
  useEffect(() => {
    setPagamentoSel(pagamentoDemoRef.current ?? (pagamentosDaCompetencia.length === 1 ? pagamentosDaCompetencia[0] : null));
    pagamentoDemoRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaSel]);
  const opcoesPagamento = useMemo(() => [...new Set([...intervaloCompetencias(competenciaMais(competenciaSel, 1), competenciaMais(competenciaSel, 6)), ...pagamentosDaCompetencia])].sort(), [competenciaSel, pagamentosDaCompetencia]);
  const divergentes = useMemo(() => (pagamentoSel ? ativos.filter((r) => r.competenciaPagamento !== pagamentoSel) : []), [ativos, pagamentoSel]);
  const emitidos = useMemo(() => numerosEmitidosPorRegistro("suspensoes", competenciaSel), [competenciaSel, emissoes]);
  const contagemAba = { ativo: daCompetencia.filter((r) => r.vinculo === "ativo").length, inativo: daCompetencia.filter((r) => r.vinculo === "inativo").length, sem_vinculo: daCompetencia.filter((r) => !r.vinculo).length };
  const ambienteDemo = useAmbienteDemo();
  const diagnosticoRestauracao = useMemo(() => diagnosticarRestauracaoSuspensoes(registros, listarEmissoes("suspensoes")), [registros, emissoes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCompetencia
      .filter((r) => (aba === "sem_vinculo" ? !r.vinculo : r.vinculo === aba))
      .filter((r) => tipoFiltro === "todos" || tipoDoRegistro(r) === tipoFiltro)
      .filter((r) => (origem === "todas" ? true : origem === "sem_origem" ? !r.origemPagamento : r.origemPagamento === origem))
      .filter((r) => !termo || r.titular.nome.toLowerCase().includes(termo) || (r.titular.matricula ?? "").toLowerCase().includes(termo))
      .sort((a, b) => (a.titular.matricula ?? "￿").localeCompare(b.titular.matricula ?? "￿", "pt-BR", { numeric: true }) || a.titular.nome.localeCompare(b.titular.nome, "pt-BR", { sensitivity: "base" }));
  }, [daCompetencia, aba, origem, busca, tipoFiltro]);

  /** "Gerar situações da competência": inclui direto na tabela os registros identificados para a competência SELECIONADA (sem 2ª ação). */
  function gerarSituacoes() {
    if (!pagamentoSel) {
      setAviso("Selecione a competência de pagamento do relatório antes de gerar as situações.");
      return;
    }
    try {
      const r = gerarSituacoesDaCompetencia(competenciaSel, undefined, { demonstracao: ambienteDemo, competenciaPagamento: pagamentoSel });
      setGeracao(r);
      setDetalhesGeracao(false);
      setAviso(null);
      setDestacar(new Set(r.novosIds));
      // A tabela passa a ser o foco: filtros limpos e a aba que recebeu mais registros novos.
      setOrigem("todas");
      setTipoFiltro("todos");
      setBusca("");
      const novos = listarSuspensoes().filter((x) => r.novosIds.includes(x.id));
      if (novos.length > 0) {
        const cont = { ativo: 0, inativo: 0, sem_vinculo: 0 } as Record<Aba, number>;
        novos.forEach((x) => (cont[x.vinculo ?? "sem_vinculo"] += 1));
        setAba((Object.keys(cont) as Aba[]).sort((x, y) => cont[y] - cont[x])[0]);
      }
      setTimeout(() => tabelaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não foi possível gerar as situações.");
    }
  }

  /**
   * Restaura o ambiente demonstrativo: remove SÓ os registros demonstrativos (e as emissões compostas apenas por eles), com os descartes,
   * conferências e controles de geração que carregam, e deixa a tabela vazia para uma nova execução de "Gerar situações da competência".
   * Registros e emissões reais nunca são tocados.
   */
  function restaurarDemonstracao() {
    const r = restaurarAmbienteDemonstrativo(registros);
    setConfirmarRemocao(false);
    // Só no ambiente demonstrativo os parâmetros são preenchidos (referência setembro/2026, pagamento outubro/2026); no operacional o pagamento nunca é presumido.
    pagamentoDemoRef.current = PAGAMENTO_DEMONSTRATIVO;
    setCompetencia(COMPETENCIA_DEMONSTRATIVA);
    setPagamentoSel(PAGAMENTO_DEMONSTRATIVO);
    setGeracao(null);
    setDestacar(new Set());
    setAba("ativo");
    setOrigem("todas");
    setTipoFiltro("todos");
    setBusca("");
    setAviso(`Demonstração restaurada: ${r.registrosRemovidos} registro(s) demonstrativo(s)${r.emissoesRemovidas ? ` e ${r.emissoesRemovidas} emissão(ões) de demonstração` : ""} removido(s).${r.protegidos ? ` ${r.protegidos} registro(s) constam em emissão real e foram mantidos.` : ""} Registros e emissões reais não foram tocados. Clique em “Gerar situações da competência” para preencher a tabela com os cenários fictícios.`);
  }

  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: "ativo", rotulo: "Ativos", n: contagemAba.ativo },
    { id: "inativo", rotulo: "Inativos", n: contagemAba.inativo },
    ...(contagemAba.sem_vinculo > 0 || aba === "sem_vinculo" ? [{ id: "sem_vinculo" as Aba, rotulo: "Vínculo a conferir", n: contagemAba.sem_vinculo }] : []),
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-3">
        <Link to="/admin/relatorios" className="text-sm font-medium text-primary hover:underline">
          Relatórios
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatório de Suspensões</h1>
            <p className="text-sm text-foreground/75 mt-1">Confira as suspensões, permanências de suspensão e exclusões da competência e prepare o relatório para envio ao NURFI. As situações são escolhidas e confirmadas pela GERDAB; o relatório não altera o cadastro nem a situação real dos beneficiários.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => (pagamentoSel ? setAlteracao({ id: null }) : setAviso("Selecione a competência de pagamento do relatório antes de incluir uma suspensão."))} className={BTN_PRIMARIO}>
              <Plus className="h-4 w-4" /> Incluir suspensão
            </button>
            <button type="button" onClick={gerarSituacoes} className={BTN_CONTORNO} title="Consulta as fontes disponíveis e insere, para conferência, os registros identificados na competência selecionada.">
              <Sparkles className="h-4 w-4" /> Gerar situações da competência
            </button>
            <button type="button" onClick={() => setConfirmarRemocao(true)} className={`${BTN_SECUNDARIO} border-dashed`} title="Prepara o ambiente fictício para apresentação e testes: limpa a demonstração anterior e deixa a tabela vazia para ser preenchida pela geração.">
              <FlaskConical className="h-4 w-4" /> Restaurar demonstração
            </button>
            <button type="button" onClick={() => setHistoricoAberto(true)} className={`${BTN_SECUNDARIO} text-primary`}>
              Histórico
            </button>
            <button type="button" onClick={() => (pagamentoSel ? setFluxoAberto(true) : setAviso("Selecione a competência de pagamento do relatório antes de emitir."))} className={BTN_PRIMARIO}>
              Exportar relatório
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <label className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/70">
            Competência
            <select value={competenciaSel} onChange={(e) => setCompetencia(e.target.value)} aria-label="Competência de referência" className="rounded-xl border border-border bg-white dark:bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {formatCompetencia(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/70">
            Pagamento
            <select value={pagamentoSel ?? ""} onChange={(e) => setPagamentoSel(e.target.value || null)} aria-label="Competência de pagamento" className="rounded-xl border border-border bg-white dark:bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <option value="">Selecione…</option>
              {opcoesPagamento.map((m) => (
                <option key={m} value={m}>
                  {formatCompetencia(m)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-foreground/75 max-w-md">
            {pagamentoSel ? (
              <>
                Relatório: <strong className="text-foreground">referência {formatCompetencia(competenciaSel)}</strong> · <strong className="text-foreground">pagamento {formatCompetencia(pagamentoSel)}</strong>. Gerar, incluir e emitir usam estas duas competências.
              </>
            ) : (
              "Selecione a competência de pagamento para gerar situações, incluir suspensões e emitir o relatório."
            )}
          </p>
        </div>
      </header>

      {divergentes.length > 0 && (
        <p role="alert" className="rounded-xl border border-status-pendente-fg/40 bg-status-pendente-bg px-4 py-3 text-sm">
          <strong>Competências divergentes:</strong> {divergentes.length} registro(s) desta referência têm pagamento diferente de {formatCompetencia(pagamentoSel!)} ({[...new Set(divergentes.map((r) => formatCompetencia(r.competenciaPagamento)))].join(", ")}). Eles <strong>não entram</strong> na emissão de {formatCompetencia(pagamentoSel!)} e não foram corrigidos automaticamente: selecione aquela competência de pagamento para emiti-los em um relatório separado.
        </p>
      )}

      {ambienteDemo && (
        <p role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-sm">
          <span>
            <strong>Ambiente demonstrativo ativo:</strong> “Gerar situações da competência” consulta <strong>fontes fictícias isoladas</strong> (Setembro/2026); registros gerados ou incluídos agora ficam marcados “Demonstrativo”. Nada é gravado em outros módulos.
          </span>
          <button type="button" onClick={() => definirAmbienteDemo(false)} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            Sair do ambiente demonstrativo
          </button>
        </p>
      )}

      {aviso && (
        <p role="status" className="text-sm rounded-xl border border-border bg-muted/40 px-4 py-3">
          {aviso}
        </p>
      )}
      
      {geracao && (
        <ConfirmacaoGeracao
          distribuicao={(["ativo", "inativo", "sem_vinculo"] as Aba[]).map((a) => ({ aba: a, n: registros.filter((r) => geracao.novosIds.includes(r.id) && (r.vinculo ?? "sem_vinculo") === a).length })).filter((d) => d.n > 0)}
          abaAtual={aba}
          onAba={setAba}
          resultado={geracao}
          detalhes={detalhesGeracao}
          onDetalhes={() => setDetalhesGeracao((v) => !v)}
          onIrPara={(c) => {
            setCompetencia(c);
            setGeracao(null);
            setDestacar(new Set());
          }}
          onFechar={() => setGeracao(null)}
        />
      )}

      <section className="grid sm:grid-cols-3 gap-4" aria-label="Resumo da competência">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums">{ativos.length}</p>
          <p className="text-sm text-foreground/75">Registros identificados</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums text-status-aprovado-fg">{prontas}</p>
          <p className="text-sm text-foreground/75">Prontas para o relatório</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums text-status-pendente-fg">{ativos.length - prontas}</p>
          <p className="text-sm text-foreground/75">Precisam de conferência</p>
        </div>
      </section>

      <section ref={tabelaRef} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden scroll-mt-4" aria-label="Situações da competência">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-5">
          <div>
            <h2 className="text-xl font-bold">Situações da competência</h2>
            <p className="text-sm text-foreground/75">Situações operacionais escolhidas pela GERDAB — nenhuma é decidida automaticamente.</p>
          </div>
          <div className="flex gap-1 -mb-px" role="tablist" aria-label="Vínculo funcional" onKeyDown={navegarAbas}>
            {abas.map((a) => (
              <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)} className={`px-3 py-2 text-sm font-semibold border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${aba === a.id ? "border-primary text-primary" : "border-transparent text-foreground/70 hover:text-foreground"}`}>
                {a.rotulo} ({a.n})
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/30 px-6 py-3 mt-3">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Buscar por nome ou matrícula</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula..." className={`${CAMPO} pl-9`} />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de registro">
            {(["todos", "suspensao", "exclusao", "investigacao", "manual"] as FiltroTipo[]).map((t) => {
              const n = t === "todos" ? daCompetencia.length : daCompetencia.filter((r) => tipoDoRegistro(r) === t).length;
              return (
                <button key={t} type="button" aria-pressed={tipoFiltro === t} onClick={() => setTipoFiltro(t)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tipoFiltro === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}>
                  {t === "todos" ? "Todos os tipos" : t === "suspensao" ? "Sugestões de suspensão" : t === "exclusao" ? "Sugestões de exclusão" : t === "investigacao" ? "Investigações" : "Manuais"} ({n})
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Origem de pagamento">
            {(["todas", ...ORIGENS_PAGAMENTO, ...(registros.some((r) => !r.origemPagamento) ? ["sem_origem"] : [])] as FiltroOrigem[]).map((o) => (
              <button key={o} type="button" aria-pressed={origem === o} onClick={() => setOrigem(o)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${origem === o ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80 hover:bg-muted"}`}>
                {o === "todas" ? "Todas" : o === "sem_origem" ? "A conferir" : o}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de registros (rolagem horizontal em telas médias)">
        <div className="lg:min-w-[1092px]">
        <div className="hidden lg:grid-cols-[5rem_minmax(11rem,1.3fr)_minmax(11rem,1.3fr)_6rem_minmax(12rem,1.7fr)_9.5rem_6.25rem] lg:grid gap-x-3 px-6 py-3 text-[11px] font-bold tracking-wider uppercase text-foreground/70 border-t border-border">
          <span>Matrícula</span>
          <span>Nome</span>
          <span>Situação</span>
          <span>Valor NURFI</span>
          <span>Observação NURFI</span>
          <span>Conferência</span>
          <span className="text-right">Ação</span>
        </div>
        {filtrados.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-foreground/75 border-t border-border">{daCompetencia.length === 0 ? "Nenhuma situação registrada nesta competência. Confira as competências de referência e de pagamento e clique em “Gerar situações da competência” para identificar os registros que precisam de conferência." : "Nenhum registro encontrado com os filtros atuais."}</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {filtrados.map((r) => (
              <LinhaRegistro key={r.id} pagamentoRelatorio={pagamentoSel} destaque={destacar.has(r.id)} r={r} emitidoEm={emitidos.get(r.id) ?? []} onAbrir={() => setAlteracao({ id: r.id })} onReabrir={() => { try { reabrirSuspensao(r.id, responsavel); } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} />
            ))}
          </ul>
        )}
        </div>
        </div>
      </section>

      {alteracao && <DialogoSuspensao key={alteracao.id ?? "novo"} registro={alteracao.id ? registros.find((r) => r.id === alteracao.id) ?? null : null} competenciaInicial={competenciaSel} pagamentoRelatorio={pagamentoSel} responsavel={responsavel} ambienteDemo={ambienteDemo} onFechar={(msg) => { setAlteracao(null); if (msg) setAviso(msg); }} />}
      {fluxoAberto && <FluxoEmissaoSuspensoes competencia={competenciaSel} pagamento={pagamentoSel ?? undefined} responsavel={responsavel} onFechar={() => setFluxoAberto(false)} onAbrirHistorico={() => setHistoricoAberto(true)} />}
      {historicoAberto && <HistoricoEmissoesSuspensoes competencia={competenciaSel} onFechar={() => setHistoricoAberto(false)} />}
      {confirmarRemocao && <DialogConfirmaRemocao diagnostico={diagnosticoRestauracao} onFechar={() => setConfirmarRemocao(false)} onConfirmar={restaurarDemonstracao} />}
    </div>
  );
}

/* ── Linha da tabela ─────────────────────────────────────────────────────────────────────────────────────────── */

const COLUNAS = "lg:grid-cols-[5rem_minmax(11rem,1.3fr)_minmax(11rem,1.3fr)_6rem_minmax(12rem,1.7fr)_9.5rem_6.25rem]";

function LinhaRegistro({ r, pagamentoRelatorio, destaque, emitidoEm, onAbrir, onReabrir }: { r: RegistroSuspensao; pagamentoRelatorio: string | null; destaque?: boolean; emitidoEm: number[]; onAbrir: () => void; onReabrir: () => void }) {
  const pronto = prontoDoRegistro(r);
  const descartada = r.situacao === "descartada";
  const pend = pendenciasSuspensao(r).filter((p) => p.impeditiva);
  const sit = rotuloSituacao(r);
  return (
    <li className={`grid gap-x-3 gap-y-2 px-6 py-4 ${COLUNAS} lg:items-start ${descartada ? "opacity-70" : ""} ${destaque ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : ""}`} data-gerado={destaque ? "true" : undefined}>
      <p className="text-sm font-bold lg:font-semibold">
        <span className="lg:hidden text-xs font-medium text-foreground/70">Matrícula </span>
        {r.titular.matricula ?? <span className="text-status-pendente-fg">a informar</span>}
      </p>
      <div className="min-w-0">
        <p className="font-bold leading-snug break-normal [overflow-wrap:anywhere]">{r.titular.nome}</p>
        <span className={`my-1 mr-1 inline-flex w-fit shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight ${ESTILO_TIPO_REGISTRO[tipoDoRegistro(r)]}`} title={r.sugestao ? `${ROTULO_FONTE_SUGESTAO[r.sugestao.fonte]}: ${r.sugestao.justificativa}` : "Registro incluído manualmente pelo analista"}>
          {ROTULO_TIPO_REGISTRO[tipoDoRegistro(r)]}
        </span>
        {r.demonstrativo && <span className="my-1 inline-flex w-fit shrink-0 whitespace-nowrap rounded-full border border-dashed border-current px-2 py-0.5 text-[10px] font-medium leading-tight text-foreground/75">Demonstrativo</span>}
        <button type="button" onClick={onAbrir} className="block whitespace-nowrap text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" aria-label={`Ver origem de ${r.titular.nome}: ${r.origemPagamento ?? "a conferir"}`}>
          Ver origem: {r.origemPagamento ?? "a conferir"}
        </button>
        {!r.vinculo && <span className="block text-xs text-status-pendente-fg">vínculo a conferir</span>}
      </div>
      <div className="min-w-0 text-sm leading-snug break-normal [overflow-wrap:anywhere]">
        <p className={`font-semibold ${r.classificacao === "excluir" ? "text-destructive" : r.classificacao === "permanece_suspenso" ? "text-status-pendente-fg" : ""}`}>{sit.principal}</p>
        <p className="text-xs text-foreground/75">{sit.quem}</p>
        {sit.motivo && <p className="mt-0.5 text-xs text-foreground/75"><span className="font-medium">Motivo:</span> {sit.motivo}</p>}
        {sit.pendencia && <p className="mt-0.5 text-xs text-foreground/75"><span className="font-medium">Pendência:</span> {sit.pendencia}</p>}
        {sit.requerimento && <p className="mt-0.5 text-xs text-foreground/75"><span className="font-medium">Requerimento:</span> {sit.requerimento}</p>}
        {sit.fonte && <p className="mt-0.5 text-xs text-foreground/75"><span className="font-medium">Fonte:</span> {sit.fonte}</p>}
        <p className="mt-0.5 text-xs text-foreground/75">{sit.competencias}{pagamentoRelatorio && !descartada && r.competenciaPagamento !== pagamentoRelatorio ? <strong className="text-status-pendente-fg"> · pagamento diferente do relatório</strong> : null}</p>
      </div>
      <p className="text-sm tabular-nums">
        <span className="lg:hidden text-xs text-foreground/70">Valor NURFI: </span>
        <strong>{formatCurrency(VALOR_SUSPENSAO)}</strong>
      </p>
      <CelulaObservacao texto={r.observacao} vazio={r.sugestao?.tipo === "investigacao" ? "A verificar: classifique a situação para gerar a observação" : "Sem observação"} />
      <div className="space-y-1">
        {descartada ? (
          <>
            <span className="inline-block whitespace-nowrap rounded-full bg-status-inativo-bg px-3 py-1 text-xs font-bold text-status-inativo-fg">Descartada</span>
            <p className="text-xs leading-snug text-foreground/75 break-normal [overflow-wrap:anywhere]">{r.justificativaDescarte}</p>
          </>
        ) : pronto ? (
          <>
            <span className="inline-block whitespace-nowrap rounded-full bg-status-aprovado-bg px-3 py-1 text-xs font-bold text-status-aprovado-fg">Pronto</span>
            {emitidoEm.length > 0 && <span className="block w-fit whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Emitido no Relatório {emitidoEm.join(", ")}</span>}
          </>
        ) : (
          <>
            <span className="inline-block whitespace-nowrap rounded-full bg-status-pendente-bg px-3 py-1 text-xs font-bold text-status-pendente-fg">Conferir</span>
            <p className="text-xs font-semibold leading-snug text-status-pendente-fg">{pend[0]?.tabela ?? "Confirme a análise do registro"}</p>
          </>
        )}
      </div>
      <div className="lg:text-right">
        {descartada ? (
          <button type="button" onClick={onReabrir} className={BTN_SECUNDARIO} aria-label={`Reabrir ${r.titular.nome}`}>
            Reabrir
          </button>
        ) : pronto ? (
          <button type="button" onClick={onAbrir} className={`${BTN_SECUNDARIO} text-primary`} aria-label={`Revisar ${r.titular.nome}`}>
            Revisar
          </button>
        ) : (
          <button type="button" onClick={onAbrir} className={BTN_PRIMARIO} aria-label={`Conferir ${r.titular.nome}`}>
            Conferir
          </button>
        )}
      </div>
    </li>
  );
}

function DialogConfirmaRemocao({ diagnostico, onFechar, onConfirmar }: { diagnostico: DiagnosticoRestauracaoSuspensoes; onFechar: () => void; onConfirmar: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const d = diagnostico;
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco}>
        <DialogTitle>Restaurar a demonstração?</DialogTitle>
        <DialogDescription>
          A restauração limpa <strong>apenas o ambiente demonstrativo</strong> do Relatório de Suspensões e deixa a tabela vazia. Depois, “Gerar situações da competência” volta a preenchê-la com os cenários fictícios.
        </DialogDescription>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">Será apagado (dados demonstrativos):</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>{d.aRemover.length}</strong> registro(s) demonstrativo(s) da fila, incluindo os descartes, as conferências e os controles de geração que carregam ({d.editados} com intervenção sua, {d.descartados} descartado(s), {d.manuais} inclusão(ões) manual(is) feita(s) no ambiente demonstrativo).
              </li>
              <li>
                <strong>{d.emissoesDemonstrativas.length}</strong> emissão(ões) de demonstração (feitas somente com registros demonstrativos) {d.emissoesDemonstrativas.length > 0 ? `(${d.emissoesDemonstrativas.map((e) => `Relatório ${e.numero} de ${formatCompetencia(e.competenciaReferencia)}`).join("; ")})` : ""}.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Não será tocado:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>{d.reaisPreservados}</strong> registro(s) real(is) / manual(is) fora do ambiente demonstrativo.
              </li>
              <li>
                <strong>{d.emissoesMantidas}</strong> emissão(ões) com qualquer linha real{d.protegidos.length > 0 ? ` (e os ${d.protegidos.length} registro(s) demonstrativo(s) que elas contêm)` : ""}.
              </li>
              <li>Cadastro, comprovantes, planilhas, requerimentos, pagamentos e demais módulos: as fontes da demonstração são fictícias e isoladas.</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onFechar} className={BTN_SECUNDARIO}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className={BTN_PRIMARIO}>
            Restaurar demonstração
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Diálogo: incluir suspensão (manual) / conferir ou revisar um registro ───────────────────────────────────── */

const ROTULO_EVENTO: Record<string, string> = {
  inclusao_registro: "Registro incluído",
  alteracao_movimentacao: "Situação alterada",
  alteracao_valor: "Valor informado alterado",
  valor_nao_aplicavel: "Valor não aplicável",
  edicao_observacao: "Observação editada",
  alteracao_dados: "Dados de identificação alterados",
  confirmacao: "Confirmado (pronto)",
  descarte: "Descartado",
  reabertura: "Reaberto para conferência",
};

/**
 * Confirmação COMPACTA da geração (o foco é a tabela). Os detalhes por fonte ficam num bloco secundário ("Ver detalhes"); o que as fontes
 * identificaram para OUTRAS competências não é inserido: aparece aqui para o analista ir até a competência desejada.
 */
function ConfirmacaoGeracao({ resultado, distribuicao, abaAtual, onAba, detalhes, onDetalhes, onIrPara, onFechar }: { resultado: ResultadoGeracaoSuspensao; distribuicao: { aba: Aba; n: number }[]; abaAtual: Aba; onAba: (a: Aba) => void; detalhes: boolean; onDetalhes: () => void; onIrPara: (c: string) => void; onFechar: () => void }) {
  const partes = [resultado.suspensoes ? `${resultado.suspensoes} ${resultado.suspensoes === 1 ? "suspensão" : "suspensões"}` : "", resultado.permanencias ? `${resultado.permanencias} ${resultado.permanencias === 1 ? "permanência de suspensão" : "permanências de suspensão"}` : "", resultado.exclusoes ? `${resultado.exclusoes} ${resultado.exclusoes === 1 ? "exclusão" : "exclusões"}` : "", resultado.investigacoes ? `${resultado.investigacoes} ${resultado.investigacoes === 1 ? "investigação" : "investigações"}` : ""].filter(Boolean);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}` : partes[0];
  return (
    <section role="status" aria-label="Resultado da geração das situações" className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">
          <strong>Situações geradas:</strong>{" "}
          {resultado.novas === 0
            ? `nenhum registro novo para ${formatCompetencia(resultado.competencia)}.`
            : `${resultado.novas} ${resultado.novas === 1 ? "registro incluído" : "registros incluídos"} para conferência, sendo ${lista}.`}
          {resultado.jaExistentes > 0 && ` ${resultado.jaExistentes} já ${resultado.jaExistentes === 1 ? "estava registrado" : "estavam registrados"}${resultado.emOutraCompetencia > 0 ? ` (${resultado.emOutraCompetencia} em outra competência)` : ""} e não ${resultado.jaExistentes === 1 ? "foi alterado" : "foram alterados"}.`}
          {resultado.origemAlterada > 0 && ` ${resultado.origemAlterada} registro(s) aberto(s) têm a informação de origem alterada: reconfira-os.`}{" "}
          <button type="button" onClick={onDetalhes} aria-expanded={detalhes} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            {detalhes ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        </p>
        <button type="button" onClick={onFechar} aria-label="Fechar confirmação da geração" className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
      {distribuicao.length > 1 && (
        <p className="text-sm" role="note">
          Os novos registros estão em:{" "}
          {distribuicao.map((d, i) => (
            <span key={d.aba}>
              {i > 0 && " · "}
              <button type="button" onClick={() => onAba(d.aba)} aria-pressed={abaAtual === d.aba} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                {d.aba === "ativo" ? "Ativos" : d.aba === "inativo" ? "Inativos" : "Vínculo a conferir"} ({d.n})
              </button>
            </span>
          ))}
          .
        </p>
      )}
      {resultado.outrasCompetencias.length > 0 && (
        <p className="text-sm" role="note">
          As fontes identificaram situações em <strong>outras competências</strong>, que <strong>não</strong> foram incluídas aqui:{" "}
          {resultado.outrasCompetencias.map((o, i) => (
            <span key={o.competencia}>
              {i > 0 && ", "}
              {o.quantidade} em{" "}
              <button type="button" onClick={() => onIrPara(o.competencia)} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                {formatCompetencia(o.competencia)}
              </button>
            </span>
          ))}
          . Selecione a competência e gere de novo para incluí-las com a referência original.
        </p>
      )}
      {detalhes && (
        <ul className="grid gap-3 pt-1 md:grid-cols-2" aria-label="Detalhes da geração por fonte">
          {resultado.porFonte.map((f) => (
            <li key={f.fonte} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold">{ROTULO_FONTE_SUGESTAO[f.fonte]}</p>
              <p className="text-xs text-foreground/75 tabular-nums">
                {f.lidos} lido(s) · {f.sugeridas} para esta competência · <strong>{f.novas} novo(s)</strong>
                {f.investigacoes ? ` (${f.investigacoes} investigação)` : ""} · {f.jaExistentes} já registrado(s)
                {f.emOutraCompetencia ? ` (${f.emOutraCompetencia} em outra competência)` : ""}
                {f.tratadasPorContinuidade ? ` · ${f.tratadasPorContinuidade} já suspensa(s) em relatório emitido (tratada(s) como continuidade)` : ""}
                {f.origemAlterada ? ` · ${f.origemAlterada} com origem alterada` : ""}
                {f.reapareceram ? ` · ${f.reapareceram} descartado(s) reapareceu(ram) por mudança na origem` : ""}
              </p>
              {f.ignorados.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-foreground/75">
                  {f.ignorados.map((i) => (
                    <li key={i.motivo}>
                      {i.quantidade} × {i.motivo}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-foreground/75">
                <span className="font-medium">Limitação:</span> {LIMITACOES_FONTE[f.fonte]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Secao({ n, titulo, descricao, children, destaque }: { n: number; titulo: string; descricao?: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <section className={`space-y-3 ${destaque ? "rounded-2xl border border-primary/20 bg-primary/5 p-5" : ""}`} aria-label={titulo}>
      <div>
        <h3 className="text-lg font-bold">
          {n}. {titulo}
        </h3>
        {descricao && <p className="text-sm text-foreground/75">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function DialogoSuspensao({ registro: r, competenciaInicial, pagamentoRelatorio, responsavel, ambienteDemo, onFechar }: { registro: RegistroSuspensao | null; competenciaInicial: string; pagamentoRelatorio: string | null; responsavel: string; ambienteDemo: boolean; onFechar: (mensagem?: string) => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const todos = useRegistrosSuspensoes();
  const atual = r ? todos.find((x) => x.id === r.id) ?? r : null;
  const novo = !atual;
  const confirmada = atual?.situacao === "confirmada";
  const descartada = atual?.situacao === "descartada";
  const [nome, setNome] = useState(atual?.titular.nome ?? "");
  const [matricula, setMatricula] = useState(atual?.titular.matricula ?? "");
  const [cpf, setCpf] = useState(atual?.titular.cpf ?? "");
  const [vinculo, setVinculo] = useState<string>(atual?.vinculo ?? "");
  const [origemPag, setOrigemPag] = useState<string>(atual?.origemPagamento ?? "");
  // As competências são PARÂMETROS DO RELATÓRIO (definidos na tela principal): aqui só são exibidas. Registro novo usa as do relatório; registro
  // existente mantém as suas (nunca corrigidas em silêncio — se divergirem do relatório, o aviso abaixo aponta a inconsistência).
  const refComp = atual?.competenciaReferencia ?? competenciaInicial;
  const pagComp = atual?.competenciaPagamento ?? pagamentoRelatorio ?? "";
  const [trocando, setTrocando] = useState(false);
  const [cadastroEscolhido, setCadastroEscolhido] = useState<ServidorCadastral | null>(null);
  const [ajusteVinculo, setAjusteVinculo] = useState(false);
  const [ajusteOrigem, setAjusteOrigem] = useState(false);
  const [justAjuste, setJustAjuste] = useState("");
  const [depManual, setDepManual] = useState(false);
  const [classificacao, setClassificacao] = useState<ClassificacaoSuspensao | "">(atual?.classificacao ?? "");
  const [quem, setQuem] = useState<"titular" | "dependente">(atual?.afetado.tipo ?? "titular");
  const [nomeDep, setNomeDep] = useState(atual?.afetado.nomeDependente ?? "");
  const [parentesco, setParentesco] = useState(atual?.afetado.parentesco ?? "");
  const [motivo, setMotivo] = useState<string | undefined>(atual?.motivo);
  const [tipoPend, setTipoPend] = useState<TipoPendenciaSuspensao | "">(atual?.pendenciaRef?.tipo ?? "");
  const [docPend, setDocPend] = useState(atual?.pendenciaRef?.documento ?? "");
  const [compPend, setCompPend] = useState(atual?.pendenciaRef?.competencia ?? competenciaInicial);
  const [iniPend, setIniPend] = useState(atual?.pendenciaRef?.tipo === "documentacao_obrigatoria" ? atual.competenciasAfetadas?.[0] ?? "" : "");
  const [fimPend, setFimPend] = useState(atual?.pendenciaRef?.tipo === "documentacao_obrigatoria" ? atual.competenciasAfetadas?.at(-1) ?? "" : atual?.competenciaReferencia ?? competenciaInicial);
  const [conferiuInicio, setConferiuInicio] = useState(!!atual?.competenciaInicialConferida);
  const reqAtual = atual?.requerimentoExclusao;
  const [reqOrigem, setReqOrigem] = useState<OrigemRequerimentoExclusao | "">(reqAtual?.origem ?? "");
  const [reqId, setReqId] = useState(reqAtual?.requerimentoId ?? "");
  const [reqRef, setReqRef] = useState(reqAtual?.origem === "conferencia_manual" ? reqAtual.referencia : "");
  const [reqBenef, setReqBenef] = useState(reqAtual?.origem === "conferencia_manual" ? reqAtual.beneficiarioReferencia ?? "" : "");
  const [reqSituacao, setReqSituacao] = useState<SituacaoAprovacaoRequerimento>(reqAtual?.origem === "conferencia_manual" ? reqAtual.situacaoAprovacao : "nao_verificado");
  const [reqConferido, setReqConferido] = useState(!!reqAtual?.conferencia);
  const [conferiuCompetencias, setConferiuCompetencias] = useState(false);
  const [conferiuAfetado, setConferiuAfetado] = useState(false);
  // Fonte persistida: só requerimentos de ASSOCIAÇÃO do tipo exclusão (a decisão deles é gravada). Os individuais do Admin não são fonte.
  const requerimentosAssociacao = useMemo(() => [...listarRequerimentosAssociacao().filter((q) => q.tipo === "exclusao"), ...(ambienteDemo || ehRequerimentoDemonstrativo(reqAtual?.requerimentoId) ? REQUERIMENTOS_DEMONSTRATIVOS : [])], [ambienteDemo, reqAtual?.requerimentoId]);
  const [observacao, setObservacao] = useState(atual?.observacao ?? "");
  const [observacaoTocada, setObservacaoTocada] = useState(false);
  const [justRevisao, setJustRevisao] = useState("");
  const [justDescarte, setJustDescarte] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Dados cadastrais (somente leitura) do titular: pesquisados pela matrícula/CPF do registro. Nada é gravado no cadastro.
  const cad = useMemo(() => cadastroEscolhido ?? consultarServidorCadastral({ matricula: matricula || undefined, cpf: cpf || undefined }, { demonstracao: ambienteDemo || !!atual?.demonstrativo }), [cadastroEscolhido, matricula, cpf, ambienteDemo, atual?.demonstrativo]);
  const ROTULO_VINCULO: Record<string, string> = { ativo: "Ativo", inativo: "Inativo" };
  const desvia = (valor: string, doCadastro: string | undefined, original: string | undefined) => !!doCadastro && !!valor && valor !== doCadastro && valor !== (original ?? "");
  const desviaVinculo = desvia(vinculo, cad?.vinculo, atual?.vinculo);
  const desviaOrigem = desvia(origemPag, cad?.origemPagamento, atual?.origemPagamento);
  const ajusteNecessario = desviaVinculo || desviaOrigem;
  const ajusteTexto = ajusteNecessario
    ? `Ajuste excepcional de ${[desviaVinculo ? `vínculo funcional (cadastro: ${ROTULO_VINCULO[cad!.vinculo!]} → registro: ${ROTULO_VINCULO[vinculo]})` : "", desviaOrigem ? `origem de pagamento (cadastro: ${cad!.origemPagamento} → registro: ${origemPag})` : ""].filter(Boolean).join(" e ")}: ${justAjuste.trim()}`
    : undefined;
  // Divergências entre o que o registro traz (fonte da sugestão) e o cadastro: apresentadas, nunca substituídas em silêncio.
  const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const divergencias: { campo: string; registro: string; cadastro: string; aplicar: () => void }[] = [];
  if (atual && cad) {
    if (cad.vinculo && vinculo !== cad.vinculo) divergencias.push({ campo: "Vínculo funcional", registro: vinculo ? ROTULO_VINCULO[vinculo] : "a conferir", cadastro: ROTULO_VINCULO[cad.vinculo], aplicar: () => setVinculo(cad.vinculo!) });
    if (cad.origemPagamento && origemPag !== cad.origemPagamento) divergencias.push({ campo: "Origem de pagamento", registro: origemPag || "a conferir", cadastro: cad.origemPagamento, aplicar: () => setOrigemPag(cad.origemPagamento!) });
    if (semAcento(nome) !== semAcento(cad.nome)) divergencias.push({ campo: "Nome do titular", registro: nome, cadastro: cad.nome, aplicar: () => setNome(cad.nome) });
  }
  const depFora = depManual || (!!nomeDep && !!cad && cad.dependentes.length > 0 && !cad.dependentes.some((d) => d.nome === nomeDep));
  const afetado: PessoaAfetada = quem === "dependente" ? { tipo: "dependente", nomeDependente: nomeDep, parentesco: parentesco || undefined } : { tipo: "titular" };
  // A pendência específica só se aplica a Suspender / Permanece suspenso (exclusão tem como base o requerimento aprovado — fora do S3).
  const tipoPendEfetivo: TipoPendenciaSuspensao | "" = classificacao === "excluir" ? "" : tipoPend;
  const competenciasDoc = iniPend && fimPend ? intervaloCompetencias(iniPend, fimPend) : [];
  const pendenciaRef: PendenciaRef | undefined = tipoPendEfetivo === "comprovante_pagamento" ? { tipo: tipoPendEfetivo, competencia: compPend } : tipoPendEfetivo === "documentacao_obrigatoria" ? { tipo: tipoPendEfetivo, documento: docPend.trim() || undefined } : undefined;
  const competenciasAfetadas = tipoPendEfetivo === "comprovante_pagamento" ? (compPend ? [compPend] : []) : tipoPendEfetivo === "documentacao_obrigatoria" ? competenciasDoc : [];
  const opcoesCompetencia = useMemo(() => {
    const [a, m] = pagComp.split("-").map(Number);
    const lista = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(a, m - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    return [...new Set([...lista, ...(atual?.competenciasAfetadas ?? []), compPend, iniPend, fimPend].filter(Boolean))].sort().reverse();
  }, [pagComp, atual, compPend, iniPend, fimPend]);
  const reqSelecionado = requerimentosAssociacao.find((q) => q.id === reqId);
  const conferenciaReq = reqConferido ? reqAtual?.conferencia ?? { responsavel, dataHora: new Date().toISOString() } : undefined;
  const requerimentoExclusao: RequerimentoExclusaoRef | undefined =
    classificacao !== "excluir" || !reqOrigem
      ? undefined
      : reqOrigem === "requerimento_associacao"
        ? reqSelecionado
          ? {
              origem: "requerimento_associacao",
              referencia: reqSelecionado.id,
              requerimentoId: reqSelecionado.id,
              associacao: reqSelecionado.associacao,
              beneficiarioReferencia: reqSelecionado.beneficiarioNome,
              situacaoAprovacao: statusAtualRequerimento(reqSelecionado) === "aprovado" ? "aprovado" : "nao_aprovado",
              statusFonte: statusRequerimentoAssociacaoLabels[statusAtualRequerimento(reqSelecionado)],
              decididoPor: versaoVigenteRequerimento(reqSelecionado).decisao?.decididoPor,
              decididoEm: versaoVigenteRequerimento(reqSelecionado).decisao?.decididoEm,
              conferencia: conferenciaReq,
            }
          : undefined
        : reqRef.trim()
          ? { origem: "conferencia_manual", referencia: reqRef.trim(), beneficiarioReferencia: reqBenef.trim() || undefined, situacaoAprovacao: reqSituacao, conferencia: conferenciaReq }
          : undefined;
  const sugestao = sugerirObservacaoSuspensao(classificacao || undefined, afetado, motivo, { ref: pendenciaRef, competencias: competenciasAfetadas, requerimento: requerimentoExclusao });
  const motivoLivre = !!motivo && !(motivo in MOTIVOS_SUSPENSAO_REFERENCIA);

  useEffect(() => {
    if (!observacaoTocada && !atual?.observacaoEditada) setObservacao(sugestao);
  }, [sugestao, observacaoTocada, atual?.observacaoEditada]);

  const rascunho: RegistroSuspensao = {
    id: atual?.id ?? "novo",
    titular: { nome, matricula: matricula.trim() || undefined, cpf: cpf || undefined },
    vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
    origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
    competenciaReferencia: refComp,
    competenciaPagamento: pagComp,
    competenciaEstimada: atual?.competenciaEstimada && !conferiuCompetencias && refComp === atual.competenciaReferencia && pagComp === atual.competenciaPagamento ? true : undefined,
    afetadoAConferir: atual?.afetadoAConferir && !conferiuAfetado ? atual.afetadoAConferir : undefined,
    classificacao: classificacao || undefined,
    afetado,
    motivo: motivo?.trim() || undefined,
    pendenciaRef,
    requerimentoExclusao,
    competenciasAfetadas: competenciasAfetadas.length ? competenciasAfetadas : undefined,
    competenciaInicialConferida: tipoPendEfetivo === "documentacao_obrigatoria" && conferiuInicio ? atual?.competenciaInicialConferida ?? { responsavel, dataHora: "" } : undefined,
    observacao: observacao.trim() || sugestao,
    observacaoEditada: false,
    origemInformacao: atual?.origemInformacao ?? "manual",
    situacao: "identificada",
    conferencia: [],
    responsavel,
    criadoEm: "",
    atualizadoEm: "",
    historico: [],
  };
  const faltas = [
    ...pendenciasSuspensao(rascunho).filter((p) => p.impeditiva).map((p) => p.rodape),
    ...(!pagComp ? ["Selecione a competência de pagamento do relatório."] : []),
    ...(ajusteNecessario && !justAjuste.trim() ? ["Informe a justificativa do ajuste excepcional de vínculo/origem."] : []),
    ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []),
  ];
  const faltasRascunho = [...(!nome.trim() ? ["Selecione o servidor."] : []), ...(!pagComp ? ["Selecione a competência de pagamento do relatório."] : []), ...(ajusteNecessario && !justAjuste.trim() ? ["Informe a justificativa do ajuste excepcional de vínculo/origem."] : []), ...(quem === "dependente" && !nomeDep.trim() ? ["Identifique o dependente afetado."] : []), ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : [])];

  /** Seleção/troca do servidor: copia os dados do cadastro para ESTE registro (o cadastro original não é tocado). */
  function escolherServidor(sv: ServidorCadastral) {
    setCadastroEscolhido(sv);
    setNome(sv.nome);
    setMatricula(sv.matricula);
    setCpf(sv.cpf ?? "");
    setVinculo(sv.vinculo ?? "");
    setOrigemPag(sv.origemPagamento ?? "");
    setQuem("titular");
    setNomeDep("");
    setParentesco("");
    setDepManual(false);
    setAjusteVinculo(false);
    setAjusteOrigem(false);
    setJustAjuste("");
    setTrocando(false);
  }

  function gravar(): string {
    const j = (confirmada ? justRevisao : "").trim() || undefined;
    if (!atual) {
      const { registro } = registrarSuspensao(
        {
          titular: { nome, matricula: matricula || undefined, cpf: cpf || undefined },
          vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
          origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
          competenciaReferencia: refComp,
          competenciaPagamento: pagComp,
          justificativa: ajusteTexto,
          classificacao: classificacao || undefined,
          afetado,
          motivo,
          pendenciaRef,
          competenciasAfetadas,
          confirmarCompetenciaInicial: conferiuInicio,
          requerimentoExclusao,
          observacao: observacao.trim() && observacao.trim() !== sugestao ? observacao : undefined,
          origemInformacao: "manual",
          demonstrativo: ambienteDemo || undefined, // no ambiente demonstrativo, a inclusão manual também é demonstrativa (limpa pela restauração)
          referenciaOrigem: { modulo: "manual", rotulo: ambienteDemo ? "Inclusão manual (ambiente demonstrativo)" : "Inclusão manual pela GERDAB" },
        },
        responsavel,
      );
      return registro.id;
    }
    const dados: Parameters<typeof atualizarDadosSuspensao>[1] = {};
    if (nome.trim() !== atual.titular.nome) dados.titularNome = nome;
    if ((matricula.trim() || "") !== (atual.titular.matricula ?? "")) dados.matricula = matricula;
    if ((cpf.trim() || "") !== (atual.titular.cpf ?? "")) dados.cpf = cpf;
    if ((vinculo || "") !== (atual.vinculo ?? "")) dados.vinculo = (vinculo || undefined) as VinculoFuncional | undefined;
    if ((origemPag || "") !== (atual.origemPagamento ?? "")) dados.origemPagamento = (origemPag || undefined) as OrigemPagamento | undefined;
    // As competências não são editadas aqui: pertencem ao relatório e as do registro nunca são corrigidas em silêncio.
    if (Object.keys(dados).length) atualizarDadosSuspensao(atual.id, dados, responsavel, [j, ajusteTexto].filter(Boolean).join(" — ") || undefined);
    const sigPend = (ref?: PendenciaRef, cs?: string[], conf?: boolean) => JSON.stringify([ref?.tipo ?? "", ref?.documento?.trim() ?? "", ref?.competencia ?? "", [...(cs ?? [])].sort(), !!conf]);
    if (sigPend(pendenciaRef, competenciasAfetadas, tipoPendEfetivo === "documentacao_obrigatoria" && conferiuInicio) !== sigPend(atual.pendenciaRef, atual.competenciasAfetadas, !!atual.competenciaInicialConferida))
      atualizarPendenciaSuspensao(atual.id, { pendenciaRef, competenciasAfetadas, confirmarCompetenciaInicial: conferiuInicio }, responsavel, j);
    const sig = (c?: string, a?: PessoaAfetada, m?: string) => JSON.stringify([c ?? "", a?.tipo, a?.nomeDependente ?? "", a?.parentesco ?? "", m?.trim() ?? ""]);
    if (sig(classificacao, afetado, motivo) !== sig(atual.classificacao, atual.afetado, atual.motivo) || (atual.afetadoAConferir && conferiuAfetado)) atualizarClassificacao(atual.id, { classificacao: classificacao || undefined, afetado, motivo, afetadoConferido: conferiuAfetado }, responsavel, j);
    const sigReq = (q?: RequerimentoExclusaoRef) => (q ? JSON.stringify([q.origem, q.referencia, q.requerimentoId ?? "", q.situacaoAprovacao, q.beneficiarioReferencia ?? "", !!q.conferencia]) : "");
    if (classificacao === "excluir" && sigReq(requerimentoExclusao) !== sigReq(atual.requerimentoExclusao)) atualizarRequerimentoExclusaoSuspensao(atual.id, requerimentoExclusao, responsavel, j);
    if (conferiuCompetencias && getSuspensao(atual.id)?.competenciaEstimada) confirmarCompetenciasSuspensao(atual.id, responsavel, j);
    const salvo = JSON.parse(localStorage.getItem("prosaude_relatorio_suspensoes") ?? "[]").find((x: RegistroSuspensao) => x.id === atual.id) as RegistroSuspensao | undefined;
    if (salvo && observacao.trim() !== salvo.observacao.trim() && (observacao.trim() || sugestao) !== salvo.observacao) atualizarObservacaoSuspensao(atual.id, observacao, responsavel, j);
    return atual.id;
  }

  function executar(acao: "rascunho" | "confirmar") {
    setErro(null);
    try {
      const id = gravar();
      if (acao === "confirmar") {
        const reg = JSON.parse(localStorage.getItem("prosaude_relatorio_suspensoes") ?? "[]").find((x: RegistroSuspensao) => x.id === id) as RegistroSuspensao;
        if (reg.situacao !== "confirmada") confirmarSuspensao(id, responsavel);
        onFechar(novo ? "Registro incluído e conferido: pronto para o relatório." : "Registro conferido: pronto para o relatório.");
      } else {
        if (confirmada) reabrirSuspensao(id, responsavel, justRevisao.trim());
        onFechar(novo ? "Registro salvo como rascunho (precisa de conferência)." : "Alterações salvas como rascunho (o registro voltou para conferência).");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  const eyebrow = novo ? "Inclusão manual" : confirmada ? "Revisão" : "Conferência";
  const titulo = novo ? "Incluir suspensão" : confirmada ? "Revisar registro" : "Conferir registro";
  const subtitulo = novo ? `Novo registro manual — ${matricula || "Matrícula a informar"}` : `${atual!.titular.nome} — ${atual!.titular.matricula ?? "matrícula a informar"}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco} className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">{eyebrow}</p>
          <DialogTitle className="text-2xl font-bold mt-1">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-foreground/75 mt-1">{subtitulo}</DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {atual?.sugestao && (
            <section className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm" aria-label="Origem da sugestão">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{ROTULO_TIPO_SUGESTAO[atual.sugestao.tipo]} · {ROTULO_FONTE_SUGESTAO[atual.sugestao.fonte]}</p>
              <p>{atual.sugestao.justificativa}</p>
              {atual.sugestao.encontrado && (
                <p>
                  <strong>O que foi encontrado:</strong> {atual.sugestao.encontrado}
                </p>
              )}
              {atual.sugestao.verificar && (
                <p>
                  <strong>O que verificar:</strong> {atual.sugestao.verificar}
                </p>
              )}
              <p className="text-xs text-foreground/75">Sugestão automática (somente leitura das fontes): não está confirmada e não altera cadastro nem pagamentos. Gerada em {dataHora(atual.sugestao.geradaEm)}.</p>
            </section>
          )}
          {atual?.competenciaEstimada && (
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <input type="checkbox" checked={conferiuCompetencias} onChange={(e) => setConferiuCompetencias(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                <strong>Conferi as competências de referência e de pagamento</strong> abaixo: elas foram estimadas pela fonte (a competência de pagamento não vem dela) e precisam da sua conferência.
              </span>
            </label>
          )}
          {atual?.afetadoAConferir && (
            <label className="flex items-start gap-2 rounded-xl border border-status-pendente-fg/40 bg-status-pendente-bg p-3 text-sm">
              <input type="checkbox" checked={conferiuAfetado} onChange={(e) => setConferiuAfetado(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                <strong>Conferi quem é afetado</strong> (indique abaixo se é o titular ou um dependente): {atual.afetadoAConferir}
              </span>
            </label>
          )}
          <Secao n={1} titulo="Situação" descricao="Classifique a situação que será comunicada. A escolha é da GERDAB: o sistema não decide suspensões, permanências nem exclusões.">
            <div className="space-y-3 text-sm">
              {(novo && !nome) || trocando ? (
                <div className="space-y-2">
                  <SeletorServidorCadastral demonstracao={ambienteDemo || !!atual?.demonstrativo} onSelecionar={escolherServidor} autoFocus />
                  {trocando && (
                    <button type="button" onClick={() => setTrocando(false)} className="text-xs font-semibold text-primary hover:underline">
                      Cancelar a troca
                    </button>
                  )}
                  <p className="text-xs text-foreground/75">Os dados vêm do cadastro existente e são copiados somente para este registro: o cadastro original não é alterado.</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-border p-4" role="group" aria-label="Servidor selecionado">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{nome}</p>
                      <p className="text-xs text-foreground/75">
                        Matrícula {matricula || "a conferir"} · CPF {cpf || "a conferir"}
                      </p>
                    </div>
                    <button type="button" onClick={() => setTrocando(true)} className={BTN_SECUNDARIO}>
                      Trocar servidor
                    </button>
                  </div>
                  {cad ? (
                    <p className="text-xs text-foreground/75">
                      Dados consultados em: {ROTULO_FONTE_CADASTRAL[cad.fonte]}.{" "}
                      {cad.conferir.length > 0 && <strong className="text-status-pendente-fg">Precisa de conferência: {cad.conferir.join("; ")}.</strong>}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-status-pendente-fg">Servidor não localizado no cadastro consultado: confira nome, matrícula e vínculo.</p>
                  )}
                </div>
              )}
              {divergencias.length > 0 && (
                <div role="alert" className="space-y-2 rounded-xl border border-status-pendente-fg/40 bg-status-pendente-bg p-3">
                  <p className="font-bold">Divergência com o cadastro — confira antes de confirmar</p>
                  <p className="text-xs">O sistema não substitui o que veio da fonte ou o que você já conferiu; decida abaixo.</p>
                  <ul className="space-y-1">
                    {divergencias.map((d) => (
                      <li key={d.campo} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>{d.campo}:</strong> registro “{d.registro}” × cadastro “{d.cadastro}”
                        </span>
                        <button type="button" onClick={d.aplicar} className="text-xs font-semibold text-primary hover:underline">
                          Usar o valor do cadastro
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <fieldset className="rounded-xl border border-border p-4 text-sm space-y-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-foreground/70">Quem é afetado</legend>
              <div className="flex flex-wrap gap-4">
                {(["titular", "dependente"] as const).map((q) => (
                  <label key={q} className="inline-flex items-center gap-2 font-medium">
                    <input type="radio" name="afetado" checked={quem === q} onChange={() => setQuem(q)} />
                    {q === "titular" ? "O titular" : "Um dependente"}
                  </label>
                ))}
              </div>
              {quem === "dependente" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {cad && cad.dependentes.length > 0 && !depFora ? (
                    <label className="font-semibold">
                      Dependente cadastrado
                      <select
                        value={nomeDep}
                        onChange={(e) => {
                          if (e.target.value === "__manual") {
                            setDepManual(true);
                            setNomeDep("");
                            setParentesco("");
                            return;
                          }
                          const d = cad.dependentes.find((x) => x.nome === e.target.value);
                          setNomeDep(e.target.value);
                          setParentesco(d?.parentesco ?? "");
                        }}
                        className={`${CAMPO} mt-1 font-normal`}
                      >
                        <option value="">Selecione o dependente</option>
                        {cad.dependentes.map((d) => (
                          <option key={d.nome} value={d.nome}>
                            {d.nome}
                            {d.parentesco ? ` (${d.parentesco})` : ""}
                          </option>
                        ))}
                        <option value="__manual">Não consta no cadastro (informar)</option>
                      </select>
                    </label>
                  ) : (
                    <label className="font-semibold">
                      Nome do dependente
                      <input value={nomeDep} onChange={(e) => setNomeDep(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                  )}
                  <label className="font-semibold">
                    Vínculo (parentesco)
                    <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                      <option value="">Selecione</option>
                      {[...new Set([...PARENTESCOS, ...(parentesco ? [parentesco] : [])])].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  {(!cad || cad.dependentes.length === 0 || depFora) && (
                    <p className="sm:col-span-2 text-xs font-semibold text-status-pendente-fg">
                      {cad && (cad.totalDependentes ?? 0) > 0 && cad.dependentes.length === 0 ? `O cadastro informa ${cad.totalDependentes} dependente(s), sem os nomes: ` : "Dependente não consta no cadastro consultado: "}
                      informe e confira o nome e o parentesco.
                    </p>
                  )}
                  <p className="sm:col-span-2 text-xs text-foreground/75">A medida vale apenas para este dependente; ela não é aplicada ao grupo familiar. No documento, a linha continua sendo do titular e a observação descreve o dependente.</p>
                </div>
              )}
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="font-semibold">
                Situação
                <select value={classificacao} onChange={(e) => setClassificacao(e.target.value as ClassificacaoSuspensao | "")} className={`${CAMPO} mt-1 font-normal`}>
                  <option value="">Selecione a situação</option>
                  {CLASSIFICACOES.map((c) => (
                    <option key={c} value={c}>
                      {ROTULO_CLASSIFICACAO[c]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="font-semibold">
                <label>
                  Motivo{exigeMotivo(classificacao || undefined) ? " *" : ""}
                  <select value={motivoLivre ? "__livre" : motivo ?? ""} onChange={(e) => setMotivo(e.target.value === "__livre" ? " " : e.target.value || undefined)} className={`${CAMPO} mt-1 font-normal`}>
                    <option value="">Selecione o motivo</option>
                    {Object.entries(MOTIVOS_SUSPENSAO_REFERENCIA).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                    <option value="__livre">Outro (texto livre)</option>
                  </select>
                </label>
                {motivoLivre && <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${CAMPO} mt-2 font-normal`} placeholder="Descreva o motivo (ex.: Excluído do plano em 26.12.25)" aria-label="Motivo em texto livre" />}
              </div>
              <div className="font-semibold" role="group" aria-label="Competências do relatório">
                Competências do relatório
                <p className="mt-1 rounded-md border border-border bg-muted px-3 py-2 text-sm font-normal">
                  Referência <strong>{formatCompetencia(refComp)}</strong> · Pagamento <strong>{pagComp ? formatCompetencia(pagComp) : "não selecionado"}</strong>
                </p>
                <span className="mt-1 block text-xs font-normal text-foreground/75">Definidas no relatório (tela principal); não são alteradas registro a registro.</span>
                {atual && pagamentoRelatorio && atual.competenciaPagamento !== pagamentoRelatorio && (
                  <span role="alert" className="mt-1 block text-xs font-semibold text-status-pendente-fg">
                    Este registro tem pagamento {formatCompetencia(atual.competenciaPagamento)}, diferente do relatório ({formatCompetencia(pagamentoRelatorio)}): ele não entra nesta emissão e não é corrigido automaticamente.
                  </span>
                )}
              </div>
              <div className="font-semibold">
                Vínculo funcional do titular
                {cad?.vinculo && !ajusteVinculo ? (
                  <p className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-normal">
                    <span>{vinculo ? ROTULO_VINCULO[vinculo] : "A conferir"}</span>
                    <button type="button" onClick={() => setAjusteVinculo(true)} className="text-xs font-semibold text-primary hover:underline">
                      Ajuste excepcional
                    </button>
                  </p>
                ) : (
                  <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} aria-label="Vínculo funcional do titular" className={`${CAMPO} mt-1 font-normal`}>
                    <option value="">A conferir</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                )}
                {!cad?.vinculo && <span className="mt-1 block text-xs font-normal text-status-pendente-fg">Não consta com segurança no cadastro: confira e informe.</span>}
              </div>
              <div className="font-semibold">
                Origem de pagamento
                {cad?.origemPagamento && !ajusteOrigem ? (
                  <p className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-normal">
                    <span>{origemPag || "A conferir"}</span>
                    <button type="button" onClick={() => setAjusteOrigem(true)} className="text-xs font-semibold text-primary hover:underline">
                      Ajuste excepcional
                    </button>
                  </p>
                ) : (
                  <select value={origemPag} onChange={(e) => setOrigemPag(e.target.value)} aria-label="Origem de pagamento" className={`${CAMPO} mt-1 font-normal`}>
                    <option value="">A conferir</option>
                    {ORIGENS_PAGAMENTO.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                )}
                {!cad?.origemPagamento && <span className="mt-1 block text-xs font-normal text-status-pendente-fg">Não consta com segurança no cadastro: confira e informe.</span>}
              </div>
              {(ajusteVinculo || ajusteOrigem) && (
                <label className="font-semibold sm:col-span-2">
                  Justificativa do ajuste excepcional{ajusteNecessario ? " *" : ""}
                  <textarea value={justAjuste} onChange={(e) => setJustAjuste(e.target.value)} rows={2} className={`${CAMPO} mt-1 font-normal`} placeholder="Por que o valor do relatório difere do cadastro?" />
                  <span className="mt-1 block text-xs font-normal text-foreground/75">O ajuste vale só para este registro, fica no histórico (responsável, data e justificativa) e não altera o cadastro original.</span>
                </label>
              )}
            </div>
            {classificacao !== "excluir" && (
              <fieldset className="mt-4 space-y-3 rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-semibold">Pendência e competências afetadas</legend>
                <p className="text-xs text-foreground/75">Opcional. Informe o que motiva o registro. O sistema não presume o mês inicial de uma irregularidade documental nem regulariza pendências automaticamente: um comprovante de outra competência não regulariza o ausente, e documento apresentado só vale após aprovação da GERDAB.</p>
                <label className="block text-sm font-semibold">
                  Tipo de pendência
                  <select
                    value={tipoPend}
                    onChange={(e) => {
                      const t = e.target.value as TipoPendenciaSuspensao | "";
                      setTipoPend(t);
                      if (t === "comprovante_pagamento") setCompPend(refComp);
                      if (t === "documentacao_obrigatoria" && !fimPend) setFimPend(refComp);
                      setConferiuInicio(false);
                    }}
                    className={`${CAMPO} mt-1 font-normal`}
                  >
                    <option value="">Não informar (registro sem pendência específica)</option>
                    {(Object.keys(ROTULO_TIPO_PENDENCIA) as TipoPendenciaSuspensao[]).map((t) => (
                      <option key={t} value={t}>
                        {ROTULO_TIPO_PENDENCIA[t]}
                      </option>
                    ))}
                  </select>
                </label>
                {tipoPend === "comprovante_pagamento" && (
                  <label className="block text-sm font-semibold">
                    Competência do comprovante não apresentado
                    <select value={compPend} onChange={(e) => setCompPend(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                      {opcoesCompetencia.map((m) => (
                        <option key={m} value={m}>
                          {formatCompetencia(m)}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-foreground/75">A pendência fica vinculada a esta competência: apresentar o comprovante de outro mês não a regulariza.</span>
                  </label>
                )}
                {tipoPend === "documentacao_obrigatoria" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">
                      Documento obrigatório pendente
                      <input value={docPend} onChange={(e) => setDocPend(e.target.value)} list="documentos-obrigatorios" placeholder="Ex.: Comprovante de matrícula" className={`${CAMPO} mt-1 font-normal`} />
                      <datalist id="documentos-obrigatorios">
                        <option value="Comprovante de matrícula" />
                        <option value="Declaração de Imposto de Renda" />
                        <option value="Laudo médico de invalidez" />
                      </datalist>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">
                        Competência inicial afetada
                        <select
                          value={iniPend}
                          onChange={(e) => {
                            setIniPend(e.target.value);
                            setConferiuInicio(false);
                          }}
                          className={`${CAMPO} mt-1 font-normal`}
                        >
                          <option value="">Selecione a competência inicial</option>
                          {opcoesCompetencia.map((m) => (
                            <option key={m} value={m}>
                              {formatCompetencia(m)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold">
                        Competência final afetada
                        <select
                          value={fimPend}
                          onChange={(e) => {
                            setFimPend(e.target.value);
                            setConferiuInicio(false);
                          }}
                          className={`${CAMPO} mt-1 font-normal`}
                        >
                          {opcoesCompetencia.map((m) => (
                            <option key={m} value={m}>
                              {formatCompetencia(m)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {iniPend && fimPend && competenciasDoc.length === 0 && <p role="alert" className="text-xs font-semibold text-destructive">A competência inicial não pode ser posterior à final.</p>}
                    {competenciasDoc.length > 0 && (
                      <p className="text-sm">
                        <span className="font-semibold">Competências afetadas ({competenciasDoc.length}):</span> {textoCompetencias(competenciasDoc)}
                      </p>
                    )}
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={conferiuInicio} disabled={competenciasDoc.length === 0} onChange={(e) => setConferiuInicio(e.target.checked)} className="mt-0.5 h-4 w-4" />
                      <span>
                        Conferi a competência inicial{competenciasDoc.length > 0 ? ` (${competenciaPorExtenso(competenciasDoc[0])})` : ""}: ela não foi presumida pelo sistema.
                      </span>
                    </label>
                  </div>
                )}
              </fieldset>
            )}
            {classificacao === "excluir" && (
              <fieldset className="mt-4 space-y-3 rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-semibold">Requerimento de exclusão aprovado</legend>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm" role="note">
                  <strong>Alcance:</strong> {quem === "titular" ? ESCOPO_EXCLUSAO_TITULAR : ESCOPO_EXCLUSAO_DEPENDENTE}.
                </p>
                <p className="text-xs text-foreground/75">Para confirmar a exclusão é preciso informar o requerimento aprovado pela GERDAB e conferi-lo. O sistema não cria requerimentos nem aprovações: requerimentos individuais do Admin não têm a decisão registrada, então a aprovação deles é verificada e declarada por você.</p>
                <label className="block text-sm font-semibold">
                  Origem do requerimento
                  <select
                    value={reqOrigem}
                    onChange={(e) => {
                      setReqOrigem(e.target.value as OrigemRequerimentoExclusao | "");
                      setReqConferido(false);
                    }}
                    className={`${CAMPO} mt-1 font-normal`}
                  >
                    <option value="">Selecione a origem</option>
                    {(Object.keys(ROTULO_ORIGEM_REQUERIMENTO) as OrigemRequerimentoExclusao[]).map((o) => (
                      <option key={o} value={o}>
                        {ROTULO_ORIGEM_REQUERIMENTO[o]}
                      </option>
                    ))}
                  </select>
                </label>
                {reqOrigem === "requerimento_associacao" && (
                  <label className="block text-sm font-semibold">
                    Requerimento de exclusão
                    <select
                      value={reqId}
                      onChange={(e) => {
                        setReqId(e.target.value);
                        setReqConferido(false);
                      }}
                      className={`${CAMPO} mt-1 font-normal`}
                    >
                      <option value="">{requerimentosAssociacao.length ? "Selecione o requerimento" : "Nenhum requerimento de exclusão de associação registrado"}</option>
                      {requerimentosAssociacao.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.id} · {q.beneficiarioNome} · {q.associacao} · {statusRequerimentoAssociacaoLabels[statusAtualRequerimento(q)]}
                        </option>
                      ))}
                    </select>
                    {requerimentosAssociacao.length === 0 && <span className="mt-1 block text-xs font-normal text-foreground/75">Se o requerimento é de outra origem, use a conferência manual.</span>}
                  </label>
                )}
                {reqOrigem === "conferencia_manual" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      Referência do requerimento
                      <input value={reqRef} onChange={(e) => { setReqRef(e.target.value); setReqConferido(false); }} placeholder="Número ou protocolo do requerimento" className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                    <label className="block text-sm font-semibold">
                      Aprovação pela GERDAB
                      <select value={reqSituacao} onChange={(e) => { setReqSituacao(e.target.value as SituacaoAprovacaoRequerimento); setReqConferido(false); }} className={`${CAMPO} mt-1 font-normal`}>
                        <option value="nao_verificado">Ainda não verificada</option>
                        <option value="aprovado">Aprovado (verifiquei)</option>
                        <option value="nao_aprovado">Não aprovado</option>
                      </select>
                    </label>
                    <label className="block text-sm font-semibold sm:col-span-2">
                      Beneficiário ou dependente indicado no requerimento (opcional)
                      <input value={reqBenef} onChange={(e) => setReqBenef(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                  </div>
                )}
                {requerimentoExclusao && (
                  <p className="text-sm">
                    <span className="font-semibold">Situação:</span>{" "}
                    {requerimentoExclusao.situacaoAprovacao === "aprovado" ? "aprovado" : requerimentoExclusao.situacaoAprovacao === "nao_aprovado" ? "NÃO aprovado — a exclusão não pode ser confirmada" : "aprovação ainda não verificada"}
                    {requerimentoExclusao.statusFonte ? ` (status na fonte: ${requerimentoExclusao.statusFonte})` : ""}
                  </p>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={reqConferido} disabled={!requerimentoExclusao} onChange={(e) => setReqConferido(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>Conferi o requerimento de exclusão e a sua aprovação pela GERDAB.</span>
                </label>
              </fieldset>
            )}
          </Secao>

          <Secao n={2} titulo="Valor informado ao NURFI" descricao="Todo registro do Relatório de Suspensões comunica R$ 0,00: não haverá ressarcimento para a situação e a competência indicadas.">
            <p className="text-lg font-bold tabular-nums" aria-label="Valor informado ao NURFI: R$ 0,00 (fixo)">
              {formatCurrency(VALOR_SUSPENSAO)} <span className="text-xs font-normal text-foreground/75">valor fixo, não editável</span>
            </p>
          </Secao>

          <Secao n={3} titulo="Observação NURFI" descricao="Texto administrativo que será exibido no documento. Para dependentes, descreva a situação específica do dependente.">
            <textarea value={observacao} onChange={(e) => { setObservacao(e.target.value); setObservacaoTocada(true); }} rows={4} aria-label="Observação NURFI" placeholder="Descreva a comunicação destinada ao NURFI." className={CAMPO} />
            {sugestao && sugestao !== observacao && (
              <button type="button" onClick={() => { setObservacao(sugestao); setObservacaoTocada(true); }} className="text-xs font-semibold text-primary hover:underline">
                Usar sugestão: {sugestao}
              </button>
            )}
          </Secao>

          {confirmada && (
            <section className="rounded-2xl border border-status-pendente-fg/40 bg-status-pendente-bg p-5 space-y-2">
              <h3 className="text-lg font-bold text-status-pendente-fg">Justificativa da revisão</h3>
              <p className="text-sm text-status-pendente-fg">Esta alteração será registrada no histórico. Informe a justificativa da revisão.</p>
              <textarea value={justRevisao} onChange={(e) => setJustRevisao(e.target.value)} rows={3} aria-label="Justificativa da revisão" placeholder="Descreva o motivo da alteração neste registro confirmado." className={CAMPO} />
            </section>
          )}

          <details className="rounded-2xl border border-border group">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
              Ver detalhes e histórico
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-5 py-4 space-y-3 text-sm">
              <p>
                <strong>Origem:</strong> {atual?.referenciaOrigem?.modulo === "demonstrativo" ? "Massa demonstrativa" : "Inclusão manual pela GERDAB"}
                {atual?.demonstrativo ? " · DEMONSTRATIVO (fictício)" : ""} — registrado manualmente; não há leitura automática de outros módulos.
              </p>
              <p>
                <strong>Responsável:</strong> {atual ? atual.responsavel : "ainda não atribuído"}
              </p>
              <p>
                <strong>Antes:</strong> {atual?.observacao ? "Observação preenchida" : "Sem observação"}
              </p>
              <p>
                <strong>Agora:</strong> {observacao.trim() ? "Observação preenchida" : "Observação pendente"}
              </p>
              {atual && (
                <ol className="space-y-1.5 text-xs">
                  {[...atual.historico].reverse().map((e) => (
                    <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                      <p className="font-semibold">
                        {ROTULO_EVENTO[e.tipo] ?? e.tipo} <span className="font-normal text-foreground/75">— {e.responsavel}, {dataHora(e.dataHora)}</span>
                      </p>
                      {e.justificativa && <p className="text-foreground/80">Justificativa: {e.justificativa}</p>}
                      {e.alteracoes?.map((a, i) => (
                        <p key={i} className="text-foreground/80">
                          {a.campo}: <span className="line-through">{a.anterior ?? "—"}</span> → {a.novo ?? "—"}
                        </p>
                      ))}
                    </li>
                  ))}
                </ol>
              )}
              {atual && !descartada && (
                <div className="space-y-2 border-t border-border pt-3">
                  <label className="block text-xs font-semibold">
                    Descartar este registro (justificativa obrigatória)
                    <input value={justDescarte} onChange={(e) => setJustDescarte(e.target.value)} className={`${CAMPO} mt-1 font-normal`} placeholder="Por que não integrará o relatório" />
                  </label>
                  <button type="button" disabled={!justDescarte.trim()} onClick={() => { try { descartarSuspensao(atual.id, responsavel, justDescarte); onFechar("Registro descartado (permanece no histórico e pode ser reaberto)."); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível descartar."); } }} className={BTN_SECUNDARIO}>
                    Descartar registro
                  </button>
                </div>
              )}
              {atual && descartada && (
                <button type="button" onClick={() => { try { reabrirSuspensao(atual.id, responsavel); onFechar("Registro reaberto para conferência."); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} className={BTN_SECUNDARIO}>
                  Reabrir para conferência
                </button>
              )}
            </div>
          </details>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
        </div>

        <div className="border-t border-border bg-card px-6 py-4 space-y-3">
          {!descartada && faltas.length > 0 && (
            <div role="status" aria-label="O que falta para concluir a conferência" className="rounded-xl bg-status-pendente-bg px-4 py-3 text-sm text-status-pendente-fg">
              <p className="font-bold">{faltas[0]}</p>
              {faltas.length > 1 && (
                <ul className="list-disc ml-5 mt-1 space-y-0.5 text-xs">
                  {faltas.slice(1).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onFechar()} className={BTN_SECUNDARIO}>
              Cancelar
            </button>
            <button type="button" onClick={() => executar("rascunho")} disabled={descartada || faltasRascunho.length > 0} className={`${BTN_CONTORNO} flex-1 sm:flex-none`}>
              Salvar como rascunho
            </button>
            <button type="button" onClick={() => executar("confirmar")} disabled={descartada || faltas.length > 0} className={`${BTN_PRIMARIO} flex-1`}>
              ✓ Confirmar análise e incluir
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

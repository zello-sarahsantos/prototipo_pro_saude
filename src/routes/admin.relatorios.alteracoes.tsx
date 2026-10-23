import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FlaskConical, Plus, Sparkles, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAdminRole } from "@/components/AdminLayout";
import { GuardaPerfilAdmin } from "@/components/negociacoes/ui";
import { CelulaObservacao } from "@/components/CelulaObservacao";
import { FluxoEmissao, HistoricoEmissoes } from "@/components/FluxoEmissaoAlteracoes";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { SeletorServidorCadastral } from "@/components/SeletorServidorCadastral";
import { consultarServidorCadastral, ROTULO_FONTE_CADASTRAL, type ServidorCadastral } from "@/lib/cadastro-servidores-busca";
import { getDataReferencia } from "@/lib/dias-uteis";
import { responsavelCadastro } from "@/lib/servidor-cadastro";
import { useRetornoDeFoco } from "@/lib/use-retorno-foco";
import { numerosEmitidosPorRegistro } from "@/lib/emissoes-relatorio";
import {
  definirAmbienteDemoAlteracoes,
  diagnosticarRestauracaoAlteracoes,
  restaurarAmbienteDemonstrativoAlteracoes,
  useAmbienteDemoAlteracoes,
  COMPETENCIA_DEMONSTRATIVA_ALTERACOES,
  PAGAMENTO_DEMONSTRATIVO_ALTERACOES,
  type DiagnosticoRestauracaoAlteracoes,
} from "@/lib/massa-demonstracao-alteracoes";
import { pessoasDemonstrativasAlteracoes } from "@/lib/fontes-alteracoes";
import { listarEmissoes } from "@/lib/emissoes-relatorio";
import { useEmissoesAlteracoes } from "@/lib/relatorio-alteracoes-geracao";
import { fontesDoAmbiente, lerTodasAsFontes, ROTULO_FONTE, sincronizarSugestoes, type ResultadoFonte, type ResultadoSincronizacao } from "@/lib/relatorio-alteracoes-sugestoes";
import {
  atualizarDados,
  confirmarCompetenciasRegistro,
  atualizarMovimentos,
  atualizarObservacao,
  atualizarValorInformado,
  avaliarRegistro,
  confirmarRegistro,
  definirValorNaoAplicavel,
  descartarRegistro,
  estadoDoValor,
  MOTIVOS_REFERENCIA,
  ORIGENS_PAGAMENTO,
  pendenciasAmigaveis,
  ROTULO_PENDENCIA_VALOR,
  reabrirRegistro,
  registrarMovimentacao,
  ROTULO_TIPO,
  sugerirObservacao,
  textoDoMotivo,
  useRegistrosAlteracoes,
  type Movimento,
  type OrigemPagamento,
  type RegistroAlteracao,
  type TipoMovimentacao,
  type VinculoFuncional,
} from "@/lib/relatorio-alteracoes";

export const Route = createFileRoute("/admin/relatorios/alteracoes")({
  component: RelatorioAlteracoesProtegido,
});

/** Acesso restrito aos perfis da GERDAB (Analista e Gerência) — mesma guarda do Relatório de Suspensões e de Negociações. */
function RelatorioAlteracoesProtegido() {
  return (
    <GuardaPerfilAdmin modulo="Relatório de Alterações">
      <RelatorioAlteracoes />
    </GuardaPerfilAdmin>
  );
}

/** "AAAA-MM" + n meses. */
function somarMeses(c: string, n: number): string {
  const [a, m] = c.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ── Utilitários ─────────────────────────────────────────────────────────────────────────────────────────────── */

const TIPOS: TipoMovimentacao[] = ["incluir", "reincluir", "alterar_valor", "mudanca_plano", "reajuste_plano", "dependente_incluido", "dependente_excluido", "dependente_reincluido"];
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
const ROTULO_EVENTO: Record<string, string> = {
  inclusao_registro: "Registro incluído",
  alteracao_movimentacao: "Movimentações alteradas",
  alteracao_valor: "Valor informado alterado",
  valor_nao_aplicavel: "Valor não aplicável",
  edicao_observacao: "Observação editada",
  alteracao_dados: "Dados de identificação alterados",
  confirmacao: "Confirmado (pronto)",
  descarte: "Descartado",
  reabertura: "Reaberto para conferência",
};
const CAMPO = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:bg-muted";
const BTN_PRIMARIO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
const BTN_SECUNDARIO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";
const BTN_CONTORNO = "inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-xl border border-primary/50 bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const paraTextoEditavel = (v?: number) => (v === undefined ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }));

/** "1.234,56" / "1234,56" / "1234.56" → número; vazio → undefined (ausência de valor NUNCA vira zero). */
function lerValor(texto: string): number | undefined {
  const t = texto.trim();
  if (!t) return undefined;
  const limpo = t.replace(/[R$\s]/g, "");
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido. Use o formato 1234,56.");
  return n;
}

/** Rótulo curto da movimentação para a tabela: "Reajuste do plano", "Inclusão de dependente", "Alteração de valor"… */
function rotuloMovimentacao(movs: Movimento[]): string {
  return movs
    .map((m) => (m.dependente ? `${ROTULO_TIPO[m.tipo]}: ${m.dependente.nome}${m.dependente.pendenteValidacao ? " (a validar)" : ""}` : null) ?? (m.tipo === "alterar_valor" ? (m.motivo ? textoDoMotivo(m.motivo) : "Alteração de valor") : m.tipo === "a_conferir" ? "Movimentação a classificar" : m.motivo && m.tipo !== "dependente_incluido" && m.tipo !== "dependente_excluido" && m.tipo !== "dependente_reincluido" && m.tipo !== "mudanca_plano" && m.tipo !== "reajuste_plano" ? `${ROTULO_TIPO[m.tipo]} — ${textoDoMotivo(m.motivo)}` : ROTULO_TIPO[m.tipo]))
    .join(" + ");
}

const prontoDoRegistro = (r: RegistroAlteracao) => r.situacao === "confirmada" && avaliarRegistro(r).impeditivas.length === 0;

const mesesDisponiveis = (registros: RegistroAlteracao[]) => {
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

function RelatorioAlteracoes() {
  const registros = useRegistrosAlteracoes();
  const emissoes = useEmissoesAlteracoes();
  const responsavel = responsavelCadastro(getAdminRole());
  const { lista: meses, atual } = useMemo(() => mesesDisponiveis(registros), [registros]);
  const [competencia, setCompetencia] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("ativo");
  const [origem, setOrigem] = useState<FiltroOrigem>("todas");
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);
  const [detalhesGeracao, setDetalhesGeracao] = useState(false);
  const [resultadoBusca, setResultadoBusca] = useState<{ sync: ResultadoSincronizacao; fontes: ResultadoFonte[]; em: string } | null>(null);
  const [alteracao, setAlteracao] = useState<{ id: string | null } | null>(null);
  const [fluxoAberto, setFluxoAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pagamentoSel, setPagamentoSel] = useState<string | null>(null);

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
  // Competência de pagamento do RELATÓRIO: escolhida pelo analista junto com a de referência; nunca presumida como "mês seguinte".
  const pagamentoDemoRef = useRef<string | null>(null);
  useEffect(() => {
    setPagamentoSel(pagamentoDemoRef.current ?? (pagamentosDaCompetencia.length === 1 ? pagamentosDaCompetencia[0] : null));
    pagamentoDemoRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaSel]);
  const opcoesPagamento = useMemo(() => [...new Set([...Array.from({ length: 6 }, (_, i) => somarMeses(competenciaSel, i + 1)), ...pagamentosDaCompetencia])].sort(), [competenciaSel, pagamentosDaCompetencia]);
  const divergentes = useMemo(() => (pagamentoSel ? ativos.filter((r) => r.competenciaPagamento !== pagamentoSel) : []), [ativos, pagamentoSel]);
  const exigirPagamento = (acao: string) => setAviso(`Selecione a competência de pagamento do relatório antes de ${acao}.`);
  const emitidos = useMemo(() => numerosEmitidosPorRegistro("alteracoes", competenciaSel), [competenciaSel, emissoes]);
  const contagemAba = { ativo: daCompetencia.filter((r) => r.vinculo === "ativo").length, inativo: daCompetencia.filter((r) => r.vinculo === "inativo").length, sem_vinculo: daCompetencia.filter((r) => !r.vinculo).length };
  const ambienteDemo = useAmbienteDemoAlteracoes();
  const diagnosticoRestauracao = useMemo(() => diagnosticarRestauracaoAlteracoes(registros, listarEmissoes("alteracoes")), [registros, emissoes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCompetencia
      .filter((r) => (aba === "sem_vinculo" ? !r.vinculo : r.vinculo === aba))
      .filter((r) => (origem === "todas" ? true : origem === "sem_origem" ? !r.origemPagamento : r.origemPagamento === origem))
      .filter((r) => !termo || r.titular.nome.toLowerCase().includes(termo) || (r.titular.matricula ?? "").toLowerCase().includes(termo))
      .sort((a, b) => (a.titular.matricula ?? "￿").localeCompare(b.titular.matricula ?? "￿", "pt-BR", { numeric: true }) || a.titular.nome.localeCompare(b.titular.nome, "pt-BR", { sensitivity: "base" }));
  }, [daCompetencia, aba, origem, busca]);

  function gerarSituacoes() {
    setBusy(true);
    try {
      if (!pagamentoSel) return exigirPagamento("buscar e preencher os registros");
      // No ambiente demonstrativo as fontes consultadas são as FICTÍCIAS isoladas; fora dele, as reais (somente leitura).
      const fontes = lerTodasAsFontes(fontesDoAmbiente(ambienteDemo));
      const sync = sincronizarSugestoes(responsavel, { competenciaReferencia: competenciaSel, competenciaPagamento: pagamentoSel }, { demonstracao: ambienteDemo });
      setResultadoBusca({ sync, fontes, em: new Date().toISOString() });
      setDetalhesGeracao(false); // detalhamento recolhido: abre só quando o usuário pedir
      setAviso(null);
    } finally {
      setBusy(false);
    }
  }

  /** "Restaurar demonstração": limpa SÓ o que é demonstrativo, liga o ambiente e seleciona referência set/2026 e pagamento out/2026 (só aqui). A tabela fica vazia. */
  function restaurarDemonstracao() {
    const r = restaurarAmbienteDemonstrativoAlteracoes(registros);
    setConfirmarRemocao(false);
    // O efeito de troca de referência só dispara se a referência mudar; o marcador não pode sobrar para uma troca posterior.
    pagamentoDemoRef.current = competenciaSel === COMPETENCIA_DEMONSTRATIVA_ALTERACOES ? null : PAGAMENTO_DEMONSTRATIVO_ALTERACOES;
    setCompetencia(COMPETENCIA_DEMONSTRATIVA_ALTERACOES);
    setPagamentoSel(PAGAMENTO_DEMONSTRATIVO_ALTERACOES);
    setResultadoBusca(null);
    setAba("ativo");
    setOrigem("todas");
    setBusca("");
    setAviso(`Demonstração restaurada: ${r.registrosRemovidos} registro(s) demonstrativo(s)${r.emissoesRemovidas ? ` e ${r.emissoesRemovidas} emissão(ões) de demonstração` : ""} removido(s).${r.protegidos ? ` ${r.protegidos} foram mantidos por constarem em emissões com registros reais.` : ""} Referência Setembro/2026 e pagamento Outubro/2026 selecionados; clique em “Buscar e preencher registros” para gerar os cenários.`);
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
            <h1 className="text-3xl font-bold">Relatório de Alterações</h1>
            <p className="text-sm text-foreground/75 mt-1">Confira as movimentações da competência e prepare o relatório para envio ao NURFI.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => (pagamentoSel ? setAlteracao({ id: null }) : exigirPagamento("incluir uma alteração"))} className={BTN_PRIMARIO}>
              <Plus className="h-4 w-4" /> Incluir alteração
            </button>
            <button type="button" onClick={gerarSituacoes} disabled={busy} className={BTN_PRIMARIO} title="Consulta os dados da competência selecionada e preenche a tabela com os registros identificados para conferência pela GERDAB.">
              <Sparkles className="h-4 w-4" /> Buscar e preencher registros
            </button>
            <button type="button" onClick={() => setConfirmarRemocao(true)} className={`${BTN_SECUNDARIO} border-dashed`} title="Prepara o ambiente fictício para apresentação e testes: limpa a demonstração anterior, seleciona referência setembro/2026 e pagamento outubro/2026 e deixa a tabela vazia para ser preenchida por “Buscar e preencher registros”.">
              <FlaskConical className="h-4 w-4" /> Restaurar demonstração
            </button>
            <button type="button" onClick={() => setHistoricoAberto(true)} className={`${BTN_SECUNDARIO} text-primary`}>
              Histórico
            </button>
            <button type="button" onClick={() => (pagamentoSel ? setFluxoAberto(true) : exigirPagamento("emitir"))} className={BTN_PRIMARIO}>
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
              "Selecione a competência de pagamento para buscar e preencher registros, incluir alterações e emitir o relatório."
            )}
          </p>
        </div>
      </header>

      {ambienteDemo && (
        <p role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-sm">
          <span>
            <strong>Ambiente demonstrativo ativo:</strong> “Buscar e preencher registros” consulta <strong>fontes fictícias isoladas</strong> (Setembro/2026); registros gerados ou incluídos agora ficam marcados “Demonstrativo”. Nada é gravado em outros módulos.
          </span>
          <button type="button" onClick={() => definirAmbienteDemoAlteracoes(false)} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            Sair do ambiente demonstrativo
          </button>
        </p>
      )}

      {divergentes.length > 0 && (
        <p role="alert" className="rounded-xl border border-status-pendente-fg/40 bg-status-pendente-bg px-4 py-3 text-sm">
          <strong>Competências divergentes:</strong> {divergentes.length} registro(s) desta referência têm pagamento diferente de {formatCompetencia(pagamentoSel!)} ({[...new Set(divergentes.map((r) => formatCompetencia(r.competenciaPagamento)))].join(", ")}). Eles <strong>não entram</strong> na emissão de {formatCompetencia(pagamentoSel!)} e não foram corrigidos automaticamente: selecione aquela competência de pagamento para emiti-los em um relatório separado.
        </p>
      )}

      {aviso && (
        <p role="status" className="text-sm rounded-xl border border-border bg-muted/40 px-4 py-3">
          {aviso}
        </p>
      )}
      {resultadoBusca && <ConfirmacaoGeracao resultado={resultadoBusca} competencia={competenciaSel} ambienteDemo={ambienteDemo} detalhes={detalhesGeracao} onDetalhes={() => setDetalhesGeracao((v) => !v)} onFechar={() => setResultadoBusca(null)} />}

      <section className="grid sm:grid-cols-3 gap-4" aria-label="Resumo da competência">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums">{ativos.length}</p>
          <p className="text-sm text-foreground/75">Alterações identificadas</p>
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

      <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden" aria-label="Movimentações da competência">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-5">
          <div>
            <h2 className="text-xl font-bold">Movimentações da competência</h2>
            <p className="text-sm text-foreground/75">A tabela apresenta somente os campos relevantes para o relatório.</p>
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
          <span>Movimentação</span>
          <span>Valor NURFI</span>
          <span>Observação NURFI</span>
          <span>Situação</span>
          <span className="text-right">Ação</span>
        </div>
        {filtrados.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-foreground/75 border-t border-border">{daCompetencia.length === 0 ? `Nenhuma movimentação registrada para ${formatCompetencia(competenciaSel)}. Confira as competências de referência e de pagamento e clique em “Buscar e preencher registros” (ou use “Incluir alteração”).` : "Nenhum registro com os filtros atuais."}</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {filtrados.map((r) => (
              <LinhaRegistro key={r.id} pagamentoRelatorio={pagamentoSel} r={r} emitidoEm={emitidos.get(r.id) ?? []} onAbrir={() => setAlteracao({ id: r.id })} onReabrir={() => { try { reabrirRegistro(r.id, responsavel); } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} />
            ))}
          </ul>
        )}
        </div>
        </div>
      </section>

      {alteracao && <DialogoAlteracao key={alteracao.id ?? "novo"} registro={alteracao.id ? registros.find((r) => r.id === alteracao.id) ?? null : null} competenciaInicial={competenciaSel} pagamentoRelatorio={pagamentoSel} ambienteDemo={ambienteDemo} responsavel={responsavel} onFechar={(msg) => { setAlteracao(null); if (msg) setAviso(msg); }} />}
      {fluxoAberto && <FluxoEmissao competencia={competenciaSel} pagamento={pagamentoSel ?? undefined} responsavel={responsavel} onFechar={() => setFluxoAberto(false)} onAbrirHistorico={() => setHistoricoAberto(true)} />}
      {historicoAberto && <HistoricoEmissoes competencia={competenciaSel} onFechar={() => setHistoricoAberto(false)} />}
      {confirmarRemocao && <DialogConfirmaRemocao diagnostico={diagnosticoRestauracao} onFechar={() => setConfirmarRemocao(false)} onConfirmar={restaurarDemonstracao} />}
    </div>
  );
}

/* ── Resultado da busca de movimentações ─────────────────────────────────────────────────────────────────────── */

/** Resumo COMPACTO da geração (mesmo padrão da Suspensões): números em uma linha; o detalhamento por fonte fica recolhido até "Ver detalhes". */
function ConfirmacaoGeracao({ resultado, competencia, ambienteDemo, detalhes, onDetalhes, onFechar }: { resultado: { sync: ResultadoSincronizacao; fontes: ResultadoFonte[]; em: string }; competencia: string; ambienteDemo: boolean; detalhes: boolean; onDetalhes: () => void; onFechar: () => void }) {
  const { sync, fontes } = resultado;
  const identificadas = sync.novas + sync.jaExistentes;
  return (
    <section role="status" aria-label="Resultado da geração das situações" className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">
          <strong>Situações geradas:</strong>{" "}
          {identificadas === 0
            ? `nenhuma movimentação identificada para ${formatCompetencia(competencia)} nas fontes ${ambienteDemo ? "demonstrativas" : "disponíveis"}.`
            : `${identificadas} ${identificadas === 1 ? "movimentação identificada" : "movimentações identificadas"} em ${formatCompetencia(competencia)}: ${sync.novas} ${sync.novas === 1 ? "incluída" : "incluídas"} para conferência${sync.jaExistentes > 0 ? ` e ${sync.jaExistentes} já ${sync.jaExistentes === 1 ? "existente" : "existentes"} (nada foi duplicado, e registros confirmados ou descartados não foram alterados)` : ""}.`}{" "}
          <button type="button" onClick={onDetalhes} aria-expanded={detalhes} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            {detalhes ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        </p>
        <button type="button" onClick={onFechar} aria-label="Fechar confirmação da geração" className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
      {sync.outrasCompetencias > 0 && (
        <p className="text-sm" role="note">
          As fontes apontam ainda {sync.outrasCompetencias} movimentação(ões) para <strong>outras competências de referência</strong>, que <strong>não</strong> foram incluídas aqui.
        </p>
      )}
      {detalhes && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground">Geração concluída em {dataHora(resultado.em)}. Fontes consultadas (somente leitura):</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Origem</th>
              <th className="py-1 pr-3 font-medium">Lidos</th>
              <th className="py-1 pr-3 font-medium">Sugestões</th>
              <th className="py-1 pr-3 font-medium">Novas</th>
              <th className="py-1 font-medium">Não geraram sugestão</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => (
              <tr key={f.fonte} className="border-t border-border align-top">
                <td className="py-1.5 pr-3 font-medium">{ROTULO_FONTE[f.fonte]}</td>
                <td className="py-1.5 pr-3 tabular-nums">{f.lidos}</td>
                <td className="py-1.5 pr-3 tabular-nums">{f.sugestoes.length}</td>
                <td className="py-1.5 pr-3 tabular-nums">{sync.porFonte[f.fonte]?.novas ?? 0}</td>
                <td className="py-1.5 text-muted-foreground">{f.ignorados.length === 0 ? "—" : f.ignorados.map((i) => `${i.motivo} (${i.quantidade})`).join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div>
      )}
    </section>
  );
}

/* ── Linha da tabela ─────────────────────────────────────────────────────────────────────────────────────────── */

const COLUNAS = "lg:grid-cols-[5rem_minmax(11rem,1.3fr)_minmax(11rem,1.3fr)_6rem_minmax(12rem,1.7fr)_9.5rem_6.25rem]";

function LinhaRegistro({ r, pagamentoRelatorio, emitidoEm, onAbrir, onReabrir }: { r: RegistroAlteracao; pagamentoRelatorio: string | null; emitidoEm: number[]; onAbrir: () => void; onReabrir: () => void }) {
  const pronto = prontoDoRegistro(r);
  const descartada = r.situacao === "descartada";
  const pend = pendenciasAmigaveis(r);
  const ev = estadoDoValor(r);
  return (
    <li className={`grid gap-x-3 gap-y-2 px-6 py-4 ${COLUNAS} lg:items-start ${descartada ? "opacity-70" : ""}`}>
      <p className="text-sm font-bold lg:font-semibold">
        <span className="lg:hidden text-xs font-medium text-foreground/70">Matrícula </span>
        {r.titular.matricula ?? <span className="text-status-pendente-fg">a informar</span>}
      </p>
      <div className="min-w-0">
        <p className="font-bold leading-snug break-normal [overflow-wrap:anywhere]">{r.titular.nome}</p>
        {r.demonstrativo && <span className="my-1 inline-flex w-fit shrink-0 whitespace-nowrap rounded-full border border-dashed border-current px-2 py-0.5 text-[10px] font-medium leading-tight text-foreground/75">Demonstrativo</span>}
        <button type="button" onClick={onAbrir} className="block whitespace-nowrap text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" aria-label={`Ver origem de ${r.titular.nome}: ${r.origemPagamento ?? "a conferir"}`}>
          Ver origem: {r.origemPagamento ?? "a conferir"}
        </button>
        {!r.vinculo && <span className="block text-xs text-status-pendente-fg">vínculo a conferir</span>}
        <span className="block text-xs text-foreground/75">
          Pagamento {formatCompetencia(r.competenciaPagamento)} · {r.competenciaEfeito ? `Efeito ${formatCompetencia(r.competenciaEfeito)}` : null}
          {pagamentoRelatorio && !descartada && r.competenciaPagamento !== pagamentoRelatorio ? <strong className="text-status-pendente-fg"> · pagamento diferente do relatório</strong> : null}
        </span>
      </div>
      <p className="min-w-0 text-sm leading-snug break-normal [overflow-wrap:anywhere]">{rotuloMovimentacao(r.movimentos)}</p>
      <p className="text-sm tabular-nums">
        <span className="lg:hidden text-xs text-foreground/70">Valor NURFI: </span>
        {ev === "preenchido" ? <strong>{formatCurrency(r.valorInformadoNurfi!)}</strong> : ev === "nao_aplicavel" ? <span className="font-semibold text-foreground/75" title={r.valorNaoAplicavel?.justificativa}>Não aplicável</span> : r.valorSugerido ? (
          <span title={`Valor sugerido pelo sistema (${r.valorSugerido.fonte}, ${formatCompetencia(r.valorSugerido.competencia)}). ${r.valorSugerido.descricao} Ainda não confirmado pela GERDAB.`}>
            <strong>{formatCurrency(r.valorSugerido.valor)}</strong> <span className="ml-1 inline-flex rounded-full border border-dashed border-current px-2 py-0.5 text-[10px] font-medium text-foreground/75">Sugerido</span>
          </span>
        ) : r.valorPendencia ? (
          <span className="font-bold text-status-pendente-fg" title={r.valorPendencia.descricao}>{ROTULO_PENDENCIA_VALOR[r.valorPendencia.tipo]}</span>
        ) : <span className="font-bold text-status-pendente-fg">Pendente</span>}
      </p>
      <CelulaObservacao texto={r.observacao} />
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
            <p className="text-xs font-semibold leading-snug text-status-pendente-fg">{pend[0]?.tabela ?? "Conclua a conferência"}</p>
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

function DialogConfirmaRemocao({ diagnostico, onFechar, onConfirmar }: { diagnostico: DiagnosticoRestauracaoAlteracoes; onFechar: () => void; onConfirmar: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const d = diagnostico;
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco}>
        <DialogTitle>Restaurar a demonstração?</DialogTitle>
        <DialogDescription>
          A restauração limpa <strong>apenas o ambiente demonstrativo</strong> do Relatório de Alterações, seleciona referência Setembro/2026 e pagamento Outubro/2026 e deixa a tabela vazia. Depois, “Buscar e preencher registros” volta a preenchê-la com os cenários fictícios.
        </DialogDescription>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">Será apagado (dados demonstrativos):</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>{d.aRemover.length}</strong> registro(s) demonstrativo(s), incluindo os descartes e as conferências que carregam ({d.editados} com intervenção sua, {d.descartados} descartado(s), {d.manuais} inclusão(ões) manual(is) feita(s) no ambiente demonstrativo).
              </li>
              <li>
                <strong>{d.emissoesDemonstrativas.length}</strong> emissão(ões) de demonstração (feitas somente com registros demonstrativos){d.emissoesDemonstrativas.length > 0 ? ` (${d.emissoesDemonstrativas.map((e) => `Relatório ${e.numero} de ${formatCompetencia(e.competenciaReferencia)}`).join("; ")})` : ""}.
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

/* ── Diálogo: incluir alteração (manual) / conferir ou revisar um registro ───────────────────────────────────── */

type DepForm = { modo: "cadastrado" | "manual"; nome: string; parentesco: string };
type MovForm = { tipo: TipoMovimentacao | ""; motivo?: string; dep?: DepForm };
const TIPOS_DEPENDENTE: TipoMovimentacao[] = ["dependente_incluido", "dependente_excluido", "dependente_reincluido"];

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

function DialogoAlteracao({ registro: r, competenciaInicial, pagamentoRelatorio, ambienteDemo, responsavel, onFechar }: { registro: RegistroAlteracao | null; competenciaInicial: string; pagamentoRelatorio: string | null; ambienteDemo: boolean; responsavel: string; onFechar: (mensagem?: string) => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const registrosTodos = useRegistrosAlteracoes();
  const atual = r ? registrosTodos.find((x) => x.id === r.id) ?? r : null;
  const novo = !atual;
  const confirmada = atual?.situacao === "confirmada";
  const descartada = atual?.situacao === "descartada";
  const { lista: meses } = useMemo(() => mesesDisponiveis(registrosTodos), [registrosTodos]);

  const [trocando, setTrocando] = useState(false);
  const [cadastroEscolhido, setCadastroEscolhido] = useState<ServidorCadastral | null>(null);
  const [ajusteVinculo, setAjusteVinculo] = useState(false);
  const [ajusteOrigem, setAjusteOrigem] = useState(false);
  const [justAjuste, setJustAjuste] = useState("");
  const [nome, setNome] = useState(atual?.titular.nome ?? "");
  const [matricula, setMatricula] = useState(atual?.titular.matricula ?? "");
  const [cpf, setCpf] = useState(atual?.titular.cpf ?? "");
  const [vinculo, setVinculo] = useState<string>(atual?.vinculo ?? "");
  const [origemPag, setOrigemPag] = useState<string>(atual?.origemPagamento ?? "");
  // Referência e pagamento são PARÂMETROS DO RELATÓRIO (tela principal): aqui só são exibidos. Registro novo recebe os do relatório;
  // registro existente mantém os seus (legados nunca são corrigidos em silêncio — divergência é apenas sinalizada).
  const refComp = atual?.competenciaReferencia ?? competenciaInicial;
  const pagComp = atual?.competenciaPagamento ?? pagamentoRelatorio ?? "";
  const [conferiuComp, setConferiuComp] = useState(false);
  const [movs, setMovs] = useState<MovForm[]>(atual ? atual.movimentos.map((m) => ({ tipo: m.tipo === "a_conferir" ? "" : m.tipo, motivo: m.motivo, dep: m.dependente ? { modo: m.dependente.referenciaCadastro ? "cadastrado" : "manual", nome: m.dependente.nome, parentesco: m.dependente.parentesco ?? "" } : undefined })) : [{ tipo: "" }]);
  // O campo já vem preenchido com o valor SUGERIDO (se houver), mas ele só vira valor confirmado quando a GERDAB confirma o registro ou o altera.
  const [valorTexto, setValorTexto] = useState(paraTextoEditavel(atual?.valorInformadoNurfi ?? atual?.valorSugerido?.valor));
  const [valorTocado, setValorTocado] = useState(false);
  const [justValor, setJustValor] = useState("");
  const [naoAplicavel, setNaoAplicavel] = useState(!!atual?.valorNaoAplicavel);
  const [justNA, setJustNA] = useState("");
  const [observacao, setObservacao] = useState(atual?.observacao ?? "");
  const [observacaoTocada, setObservacaoTocada] = useState(false);
  const [justRevisao, setJustRevisao] = useState("");
  const [justDescarte, setJustDescarte] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Dados cadastrais (somente leitura) do titular, pesquisados pela matrícula/CPF do registro. Nada é gravado no cadastro.
  const cad = useMemo(() => cadastroEscolhido ?? consultarServidorCadastral({ matricula: matricula || undefined, cpf: cpf || undefined }, { demonstracao: ambienteDemo || !!atual?.demonstrativo, pessoasDemo: pessoasDemonstrativasAlteracoes() }), [cadastroEscolhido, matricula, cpf, ambienteDemo, atual?.demonstrativo]);
  const movimentosNormalizados: Movimento[] = movs.map((m) => ({
    tipo: m.tipo === "" ? "a_conferir" : m.tipo,
    motivo: m.motivo?.trim() || undefined,
    // O dependente pertence ao MOVIMENTO (só nos tipos de dependente). Fora do cadastro: informado manualmente e pendente de validação.
    ...(m.tipo !== "" && TIPOS_DEPENDENTE.includes(m.tipo) && m.dep?.nome.trim()
      ? { dependente: { nome: m.dep.nome.trim(), parentesco: m.dep.parentesco.trim() || undefined, referenciaCadastro: m.dep.modo === "cadastrado" ? `cadastro:${m.dep.nome.trim()}` : undefined, pendenteValidacao: m.dep.modo === "manual" ? true : undefined } }
      : {}),
  }));
  const ROTULO_VINCULO: Record<string, string> = { ativo: "Ativo", inativo: "Inativo" };
  const desvia = (valor: string, doCadastro: string | undefined, original: string | undefined) => !!doCadastro && !!valor && valor !== doCadastro && valor !== (original ?? "");
  const desviaVinculo = desvia(vinculo, cad?.vinculo, atual?.vinculo);
  const desviaOrigem = desvia(origemPag, cad?.origemPagamento, atual?.origemPagamento);
  const ajusteNecessario = desviaVinculo || desviaOrigem;
  const ajusteTexto = ajusteNecessario
    ? `Ajuste excepcional de ${[desviaVinculo ? `vínculo funcional (cadastro: ${ROTULO_VINCULO[cad!.vinculo!]} → registro: ${ROTULO_VINCULO[vinculo]})` : "", desviaOrigem ? `origem de pagamento (cadastro: ${cad!.origemPagamento} → registro: ${origemPag})` : ""].filter(Boolean).join(" e ")}: ${justAjuste.trim()}`
    : undefined;
  const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const divergencias: { campo: string; registro: string; cadastro: string; aplicar: () => void }[] = [];
  if (atual && cad) {
    if (cad.vinculo && vinculo !== cad.vinculo) divergencias.push({ campo: "Vínculo funcional", registro: vinculo ? ROTULO_VINCULO[vinculo] : "a conferir", cadastro: ROTULO_VINCULO[cad.vinculo], aplicar: () => setVinculo(cad.vinculo!) });
    if (cad.origemPagamento && origemPag !== cad.origemPagamento) divergencias.push({ campo: "Origem de pagamento", registro: origemPag || "a conferir", cadastro: cad.origemPagamento, aplicar: () => setOrigemPag(cad.origemPagamento!) });
    if (semAcento(nome) !== semAcento(cad.nome)) divergencias.push({ campo: "Nome do titular", registro: nome, cadastro: cad.nome, aplicar: () => setNome(cad.nome) });
  }
  const sugestao = sugerirObservacao(movimentosNormalizados);
  const valorLido = (() => {
    try {
      return naoAplicavel ? undefined : lerValor(valorTexto);
    } catch {
      return undefined;
    }
  })();
  const sugerido = atual && atual.valorInformadoNurfi === undefined ? atual.valorSugerido : undefined;
  const ajusteValor = !!sugerido && valorTocado && valorLido !== undefined && Math.abs(valorLido - sugerido.valor) > 0.004;
  const valorInvalido = (() => {
    try {
      lerValor(valorTexto);
      return false;
    } catch {
      return true;
    }
  })();

  // Observação acompanha a sugestão enquanto nunca foi editada à mão.
  useEffect(() => {
    if (!observacaoTocada && !(atual?.observacaoEditada)) setObservacao(sugestao);
  }, [sugestao, observacaoTocada, atual?.observacaoEditada]);

  // Rascunho do registro (para calcular as pendências em tempo real, antes de salvar).
  const rascunho: RegistroAlteracao = {
    id: atual?.id ?? "novo",
    titular: { nome, matricula: matricula.trim() || undefined, cpf: cpf || undefined },
    vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
    origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
    competenciaReferencia: refComp,
    competenciaPagamento: pagComp,
    competenciaEstimada: atual?.competenciaEstimada && !conferiuComp ? true : undefined,
    competenciaEfeito: atual?.competenciaEfeito, // valor histórico preservado (não é mais solicitado na conferência)
    observacaoDetalhadaExigida: atual ? atual.observacaoDetalhadaExigida : true,
    movimentos: movimentosNormalizados,
    valores: atual?.valores ?? {},
    valorInformadoNurfi: valorLido,
    valorNaoAplicavel: naoAplicavel ? atual?.valorNaoAplicavel ?? { justificativa: justNA, responsavel, dataHora: "" } : undefined,
    observacao: observacao.trim() || (movimentosNormalizados.every((m) => m.tipo !== "a_conferir") ? sugestao : ""),
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
    ...pendenciasAmigaveis(rascunho).map((p) => p.rodape),
    ...(!pagComp ? ["Selecione a competência de pagamento do relatório."] : []),
    ...(ajusteValor && !justValor.trim() ? ["Informe a justificativa do ajuste do valor sugerido pelo sistema."] : []),
    ...(ajusteNecessario && !justAjuste.trim() ? ["Informe a justificativa do ajuste excepcional de vínculo/origem."] : []),
    ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa para declarar o valor como não aplicável."] : []),
    ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []),
  ];
  const faltasRascunho = [...(!nome.trim() ? ["Selecione o beneficiário."] : []), ...(!pagComp ? ["Selecione a competência de pagamento do relatório."] : []), ...(ajusteValor && !justValor.trim() ? ["Informe a justificativa do ajuste do valor sugerido pelo sistema."] : []), ...(ajusteNecessario && !justAjuste.trim() ? ["Informe a justificativa do ajuste excepcional de vínculo/origem."] : []), ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []), ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa do valor não aplicável."] : [])];

  /** Seleção/troca do servidor: copia os dados do cadastro para ESTE registro (o cadastro original não é tocado). */
  function escolherServidor(sv: ServidorCadastral) {
    setCadastroEscolhido(sv);
    setNome(sv.nome);
    setMatricula(sv.matricula);
    setCpf(sv.cpf ?? "");
    setVinculo(sv.vinculo ?? "");
    setOrigemPag(sv.origemPagamento ?? "");
    // O titular mudou: a identificação dos dependentes dos movimentos recomeça (nada do titular anterior permanece).
    setMovs((l) => l.map((m) => ({ ...m, dep: undefined })));
    setAjusteVinculo(false);
    setAjusteOrigem(false);
    setJustAjuste("");
    setTrocando(false);
  }

  /** Grava as alterações (auditadas). Retorna o id do registro. */
  function gravar(acao: "rascunho" | "confirmar"): string {
    const j = (confirmada ? justRevisao : "").trim() || undefined;
    // Valor SUGERIDO e não tocado: só é gravado como valor confirmado quando a GERDAB confirma a análise (nunca ao salvar rascunho).
    const naoTocadoComSugestao = !!sugerido && !valorTocado;
    const valor = naoAplicavel ? undefined : naoTocadoComSugestao ? (acao === "confirmar" ? sugerido!.valor : undefined) : lerValor(valorTexto);
    if (!atual) {
      const { registro } = registrarMovimentacao(
        {
          titular: { nome, matricula: matricula || undefined, cpf: cpf || undefined },
          vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
          origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
          competenciaReferencia: refComp,
          competenciaPagamento: pagComp,
          justificativa: ajusteTexto,
          movimentos: movimentosNormalizados,
          valorInformadoNurfi: valor,
          observacao: observacao.trim() && observacao.trim() !== sugestao ? observacao : undefined,
          origemInformacao: "manual",
          demonstrativo: ambienteDemo || undefined, // no ambiente demonstrativo a inclusão manual também é demonstrativa (limpa pela restauração)
          referenciaOrigem: { modulo: "manual", rotulo: ambienteDemo ? "Inclusão manual (ambiente demonstrativo)" : "Inclusão manual pela GERDAB" },
        },
        responsavel,
      );
      if (naoAplicavel) definirValorNaoAplicavel(registro.id, true, responsavel, justNA);
      return registro.id;
    }
    const dados: Parameters<typeof atualizarDados>[1] = {};
    if (nome.trim() !== atual.titular.nome) dados.titularNome = nome;
    if ((matricula.trim() || "") !== (atual.titular.matricula ?? "")) dados.matricula = matricula;
    if ((cpf.trim() || "") !== (atual.titular.cpf ?? "")) dados.cpf = cpf;
    if ((vinculo || "") !== (atual.vinculo ?? "")) dados.vinculo = (vinculo || undefined) as VinculoFuncional | undefined;
    if ((origemPag || "") !== (atual.origemPagamento ?? "")) dados.origemPagamento = (origemPag || undefined) as OrigemPagamento | undefined;
    // As competências de referência e de pagamento não são editadas aqui (pertencem ao relatório).
    if (Object.keys(dados).length) atualizarDados(atual.id, dados, responsavel, [j, ajusteTexto].filter(Boolean).join(" — ") || undefined);
    if (conferiuComp && atual.competenciaEstimada) confirmarCompetenciasRegistro(atual.id, responsavel, j);
    const assinatura = (m: Movimento[]) => JSON.stringify(m.map((x) => [x.tipo, x.motivo ?? "", x.dependente?.nome ?? "", x.dependente?.parentesco ?? "", !!x.dependente?.pendenteValidacao]));
    if (assinatura(movimentosNormalizados) !== assinatura(atual.movimentos)) atualizarMovimentos(atual.id, movimentosNormalizados, responsavel, j);
    if (valor !== atual.valorInformadoNurfi) atualizarValorInformado(atual.id, valor, responsavel, [j, ajusteValor ? justValor.trim() : sugerido && valor !== undefined ? "Valor sugerido pelo sistema confirmado pela GERDAB." : ""].filter(Boolean).join(" — ") || undefined);
    if (naoAplicavel && !atual.valorNaoAplicavel) definirValorNaoAplicavel(atual.id, true, responsavel, justNA || j);
    if (!naoAplicavel && atual.valorNaoAplicavel && valor === undefined) definirValorNaoAplicavel(atual.id, false, responsavel, j);
    const salvo = JSON.parse(localStorage.getItem("prosaude_relatorio_alteracoes") ?? "[]").find((x: RegistroAlteracao) => x.id === atual.id) as RegistroAlteracao | undefined;
    if (salvo && observacao.trim() !== salvo.observacao.trim() && (observacao.trim() || sugestao) !== salvo.observacao) atualizarObservacao(atual.id, observacao, responsavel, j);
    return atual.id;
  }

  function executar(acao: "rascunho" | "confirmar") {
    setErro(null);
    try {
      const id = gravar(acao);
      if (acao === "confirmar") {
        const reg = JSON.parse(localStorage.getItem("prosaude_relatorio_alteracoes") ?? "[]").find((x: RegistroAlteracao) => x.id === id) as RegistroAlteracao;
        if (reg.situacao !== "confirmada") confirmarRegistro(id, responsavel);
        onFechar(novo ? "Alteração incluída e conferida: pronta para o relatório." : "Registro conferido: pronto para o relatório.");
      } else {
        if (confirmada) reabrirRegistro(id, responsavel, justRevisao.trim());
        onFechar(novo ? "Alteração salva como rascunho (precisa de conferência)." : "Alterações salvas como rascunho (o registro voltou para conferência).");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  const resumoValor = (r0: { valorInformadoNurfi?: number; valorNaoAplicavel?: unknown }) => (r0.valorInformadoNurfi !== undefined ? formatCurrency(r0.valorInformadoNurfi) : r0.valorNaoAplicavel ? "Não aplicável" : "Sem valor");
  const eyebrow = novo ? "Inclusão manual" : confirmada ? "Revisão" : "Conferência";
  const titulo = novo ? "Incluir alteração" : confirmada ? "Revisar alteração" : "Conferir alteração";
  const subtitulo = novo ? `Nova alteração manual — ${matricula ? matricula : "Matrícula a informar"}` : `${atual!.titular.nome} — ${atual!.titular.matricula ?? "matrícula a informar"}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco} className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">{eyebrow}</p>
          <DialogTitle className="text-2xl font-bold mt-1">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-foreground/75 mt-1">{subtitulo}</DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          <Secao n={1} titulo="Movimentação" descricao="Classifique a alteração que será comunicada.">
            <div className="space-y-3 text-sm">
              {(novo && !nome) || trocando ? (
                <div className="space-y-2">
                  <SeletorServidorCadastral demonstracao={ambienteDemo || !!atual?.demonstrativo} pessoasDemo={pessoasDemonstrativasAlteracoes()} onSelecionar={escolherServidor} autoFocus rotulo="Pesquisar servidor (nome ou matrícula)" />
                  {trocando && (
                    <button type="button" onClick={() => setTrocando(false)} className="text-xs font-semibold text-primary hover:underline">
                      Cancelar a troca
                    </button>
                  )}
                  <p className="text-xs text-foreground/75">Os dados vêm do cadastro existente e são copiados somente para este registro: o cadastro original não é alterado.</p>
                </div>
              ) : cad ? (
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
                  <p className="text-xs text-foreground/75">
                    Dados consultados em: {ROTULO_FONTE_CADASTRAL[cad.fonte]}.{" "}
                    {cad.conferir.length > 0 && <strong className="text-status-pendente-fg">Precisa de conferência: {cad.conferir.join("; ")}.</strong>}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-status-pendente-fg">Servidor não localizado no cadastro consultado: confira nome e matrícula (ou pesquise o servidor).</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="font-semibold">
                      Beneficiário
                      <input value={nome} onChange={(e) => setNome(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                    <label className="font-semibold">
                      Matrícula
                      <input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Sem correspondência" className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                  </div>
                  <button type="button" onClick={() => setTrocando(true)} className="text-xs font-semibold text-primary hover:underline">
                    Pesquisar no cadastro
                  </button>
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

            {movs.map((m, i) => {
              const livre = !!m.motivo && !(m.motivo in MOTIVOS_REFERENCIA);
              return (
                <div key={i} className="grid sm:grid-cols-2 gap-4 text-sm items-start">
                  <label className="font-semibold">
                    Tipo
                    <select value={m.tipo} onChange={(e) => setMovs((l) => l.map((x, k) => (k === i ? { ...x, tipo: e.target.value as MovForm["tipo"] } : x)))} className={`${CAMPO} mt-1 font-normal`}>
                      <option value="">Selecione o tipo</option>
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {ROTULO_TIPO[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 font-semibold">
                      <label>
                        Motivo
                        <select value={livre ? "__livre" : m.motivo ?? ""} onChange={(e) => setMovs((l) => l.map((x, k) => (k === i ? { ...x, motivo: e.target.value === "__livre" ? " " : e.target.value || undefined } : x)))} className={`${CAMPO} mt-1 font-normal`}>
                          <option value="">Selecione o motivo</option>
                          {Object.entries(MOTIVOS_REFERENCIA).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                          <option value="__livre">Outro (texto livre)</option>
                        </select>
                      </label>
                      {livre && <input value={m.motivo} onChange={(e) => setMovs((l) => l.map((x, k) => (k === i ? { ...x, motivo: e.target.value } : x)))} className={`${CAMPO} mt-2 font-normal`} placeholder="Descreva o motivo" aria-label="Motivo em texto livre" />}
                    </div>
                    {movs.length > 1 && (
                      <button type="button" onClick={() => setMovs((l) => l.filter((_, k) => k !== i))} aria-label="Remover movimentação" className="mt-7 rounded-md p-2 text-foreground/70 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {m.tipo !== "" && TIPOS_DEPENDENTE.includes(m.tipo) && (
                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 rounded-xl border border-dashed border-border p-3">
                      {cad && cad.dependentes.length > 0 && (m.dep?.modo ?? "cadastrado") === "cadastrado" ? (
                        <label className="font-semibold">
                          Dependente cadastrado
                          <select
                            value={m.dep?.nome ?? ""}
                            onChange={(e) => {
                              if (e.target.value === "__manual") return setMovs((l) => l.map((x, k) => (k === i ? { ...x, dep: { modo: "manual", nome: "", parentesco: "" } } : x)));
                              const d = cad.dependentes.find((y) => y.nome === e.target.value);
                              setMovs((l) => l.map((x, k) => (k === i ? { ...x, dep: e.target.value ? { modo: "cadastrado", nome: e.target.value, parentesco: d?.parentesco ?? "" } : undefined } : x)));
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
                          <input value={m.dep?.nome ?? ""} onChange={(e) => setMovs((l) => l.map((x, k) => (k === i ? { ...x, dep: { modo: "manual", nome: e.target.value, parentesco: x.dep?.parentesco ?? "" } } : x)))} className={`${CAMPO} mt-1 font-normal`} />
                        </label>
                      )}
                      <label className="font-semibold">
                        Parentesco
                        <input
                          value={m.dep?.parentesco ?? ""}
                          onChange={(e) => setMovs((l) => l.map((x, k) => (k === i ? { ...x, dep: { modo: x.dep?.modo ?? "manual", nome: x.dep?.nome ?? "", parentesco: e.target.value } } : x)))}
                          className={`${CAMPO} mt-1 font-normal`}
                          readOnly={m.dep?.modo === "cadastrado"}
                        />
                      </label>
                      {(m.dep?.modo === "manual" || !cad || cad.dependentes.length === 0) && (
                        <p className="sm:col-span-2 text-xs font-semibold text-status-pendente-fg">
                          {cad && (cad.totalDependentes ?? 0) > 0 && cad.dependentes.length === 0 ? `O cadastro informa ${cad.totalDependentes} dependente(s), sem os nomes: ` : "Dependente fora do cadastro consultado: "}
                          informe nome e parentesco; o dado fica pendente de validação e o cadastro não é alterado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
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
                {atual?.competenciaEstimada && (
                  <label className="mt-2 flex items-start gap-2 text-xs font-normal">
                    <input type="checkbox" checked={conferiuComp} onChange={(e) => setConferiuComp(e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <span>Conferi a competência de referência (estimada pela fonte, ex.: mês da decisão do requerimento).</span>
                  </label>
                )}
              </div>
              {atual?.competenciaEfeito && (
                <p className="text-xs text-foreground/75 sm:col-span-2">
                  Competência de efeito registrada anteriormente (somente consulta): <strong>{formatCompetencia(atual.competenciaEfeito)}</strong>.
                </p>
              )}
              <div className="font-semibold">
                Vínculo funcional
                {cad?.vinculo && !ajusteVinculo ? (
                  <p className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-normal">
                    <span>{vinculo ? ROTULO_VINCULO[vinculo] : "A conferir"}</span>
                    <button type="button" onClick={() => setAjusteVinculo(true)} className="text-xs font-semibold text-primary hover:underline">
                      Ajuste excepcional
                    </button>
                  </p>
                ) : (
                  <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} aria-label="Vínculo funcional" className={`${CAMPO} mt-1 font-normal`}>
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
                {!cad?.origemPagamento && <span className="mt-1 block text-xs font-normal text-status-pendente-fg">Não consta com segurança no cadastro: a origem não é presumida pela operadora; confira e informe.</span>}
              </div>
              {(ajusteVinculo || ajusteOrigem) && (
                <label className="font-semibold sm:col-span-2">
                  Justificativa do ajuste excepcional{ajusteNecessario ? " *" : ""}
                  <textarea value={justAjuste} onChange={(e) => setJustAjuste(e.target.value)} rows={2} className={`${CAMPO} mt-1 font-normal`} placeholder="Por que o valor do relatório difere do cadastro?" />
                  <span className="mt-1 block text-xs font-normal text-foreground/75">O ajuste vale só para este registro, fica no histórico (responsável, data, valor do cadastro × valor ajustado e justificativa) e não altera o cadastro original.</span>
                </label>
              )}
            </div>
            <button type="button" onClick={() => setMovs((l) => [...l, { tipo: "" }])} className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
              + Adicionar outra movimentação
            </button>
          </Secao>

          <Secao n={2} titulo="Valor a informar ao NURFI" descricao="Valor final do ressarcimento do grupo familiar a ser informado ao NURFI." destaque>
            <label className="block text-sm font-semibold">
              <span className="text-base">Valor NURFI</span>
              <span className="block text-xs font-normal text-foreground/75">Valor final do ressarcimento do grupo familiar a ser informado ao NURFI (não é a soma das movimentações nem apenas a diferença).</span>
              <input value={valorTexto} onChange={(e) => { setValorTexto(e.target.value); setValorTocado(true); if (e.target.value.trim()) setNaoAplicavel(false); }} disabled={naoAplicavel} inputMode="decimal" aria-invalid={valorInvalido} aria-describedby="ajuda-valor" placeholder="Informe o valor" className={`${CAMPO} mt-1 text-lg font-normal`} />
              {sugerido && (
                <span className="mt-1 block rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-normal">
                  <strong>Valor sugerido pelo sistema:</strong> {formatCurrency(sugerido.valor)} — {sugerido.descricao} Ainda não está confirmado: confirme o registro para aceitá-lo ou altere o valor (o ajuste exige justificativa e fica na auditoria).
                </span>
              )}
              {!sugerido && atual?.valorPendencia && atual.valorInformadoNurfi === undefined && (
                <span className="mt-1 block rounded-md border border-dashed border-status-pendente-fg/50 bg-status-pendente-bg px-3 py-2 text-xs font-normal">
                  <strong>{ROTULO_PENDENCIA_VALOR[atual.valorPendencia.tipo]}:</strong> {atual.valorPendencia.descricao} Informe o valor após a conferência (nada foi estimado).
                </span>
              )}
              <span id="ajuda-valor" className="block text-xs font-normal text-foreground/75 mt-1">Formato 1234,56. Nunca use 0 para “sem valor”: deixe em branco (pendente) ou declare o valor como não aplicável.</span>
            </label>
            {ajusteValor && (
              <label className="block text-sm font-semibold">
                Justificativa do ajuste do valor sugerido *
                <textarea value={justValor} onChange={(e) => setJustValor(e.target.value)} rows={2} className={`${CAMPO} mt-1 font-normal`} placeholder="Por que o valor confirmado difere do sugerido?" />
              </label>
            )}
            {naoAplicavel && <span className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-semibold">Valor não aplicável</span>}
            {atual && Object.values(atual.valores).some((v) => v !== undefined) && (
              <details className="rounded-xl border border-dashed border-border px-4 py-2 text-xs text-foreground/75">
                <summary className="cursor-pointer font-semibold">Origem e evidências do valor (consulta)</summary>
                <p className="mt-2">Valores já registrados na origem. São naturezas diferentes e <strong>não equivalem</strong> ao Valor NURFI: servem apenas de apoio à conferência.</p>
                <ul className="mt-1 space-y-0.5">
                  {([["cadastrado", "Valor cadastrado"], ["plano", "Valor do plano"], ["comprovado", "Valor comprovado"], ["calculado", "Valor calculado"]] as const).map(([k, rot]) =>
                    atual.valores[k] !== undefined ? (
                      <li key={k}>
                        {rot}: <strong className="tabular-nums">{formatCurrency(atual.valores[k]!)}</strong>
                      </li>
                    ) : null,
                  )}
                </ul>
              </details>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={naoAplicavel} onChange={(e) => { setNaoAplicavel(e.target.checked); if (e.target.checked) setValorTexto(""); }} className="h-4 w-4" />O valor não é aplicável. Registrar justificativa.
            </label>
            {naoAplicavel && (
              <label className="block text-sm font-semibold">
                Justificativa obrigatória
                <textarea value={atual?.valorNaoAplicavel ? atual.valorNaoAplicavel.justificativa : justNA} onChange={(e) => setJustNA(e.target.value)} readOnly={!!atual?.valorNaoAplicavel} rows={3} placeholder="Explique por que esta movimentação não exige valor financeiro." className={`${CAMPO} mt-1 font-normal`} />
              </label>
            )}
          </Secao>

          <Secao n={3} titulo="Observação NURFI" descricao="Texto administrativo que será exibido no documento.">
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
                <strong>Origem:</strong> {atual ? ROTULO_FONTE_MODULO[atual.referenciaOrigem?.modulo ?? "manual"] : "Inclusão manual"}
                {atual?.referenciaOrigem?.rotulo ? ` — ${atual.referenciaOrigem.rotulo}` : ""}
                {atual ? ` · ${atual.origemInformacao === "automatica" ? "sugerida automaticamente" : "registrada manualmente"}` : ""}
                {atual?.demonstrativo ? " · DEMONSTRATIVO (fictício)" : ""}
              </p>
              {atual?.referenciaOrigem?.decisao && (
                <p>
                  <strong>Decisão na origem:</strong> {atual.referenciaOrigem.decisao.descricao}
                  {atual.referenciaOrigem.decisao.responsavel ? ` Responsável: ${atual.referenciaOrigem.decisao.responsavel}.` : ""}
                  {atual.referenciaOrigem.decisao.dataHora ? ` Em ${dataHora(atual.referenciaOrigem.decisao.dataHora)}.` : ""}
                </p>
              )}
              {atual?.referenciaOrigem?.comparacao && atual.referenciaOrigem.comparacao.length > 0 && (
                <table className="w-full text-xs" aria-label="Comparação entre planilhas">
                  <thead>
                    <tr className="text-left text-foreground/75">
                      <th className="py-1 pr-2 font-semibold">Campo</th>
                      <th className="py-1 pr-2 font-semibold">Anterior</th>
                      <th className="py-1 font-semibold">Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atual.referenciaOrigem.comparacao.map((c) => (
                      <tr key={c.campo} className="border-t border-border align-top">
                        <td className="py-1 pr-2 font-medium">{c.campo}</td>
                        <td className="py-1 pr-2">{c.anterior ?? "—"}</td>
                        <td className="py-1">{c.atual ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {atual && atual.conferencia.length > 0 && (
                <ul className="list-disc ml-5 text-xs text-foreground/80">
                  {atual.conferencia.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <p>
                <strong>Responsável:</strong> {atual ? atual.responsavel : "ainda não atribuído"}
              </p>
              <p>
                <strong>Antes:</strong> {atual ? resumoValor(atual) : "Sem valor"} · {atual?.observacao ? "Observação preenchida" : "Sem observação"}
              </p>
              <p>
                <strong>Agora:</strong> {resumoValor({ valorInformadoNurfi: valorLido, valorNaoAplicavel: naoAplicavel })} · {observacao.trim() ? "Observação preenchida" : "Observação pendente"}
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
                    Descartar esta movimentação (justificativa obrigatória)
                    <input value={justDescarte} onChange={(e) => setJustDescarte(e.target.value)} className={`${CAMPO} mt-1 font-normal`} placeholder="Por que não integrará o relatório" />
                  </label>
                  <button type="button" disabled={!justDescarte.trim()} onClick={() => { try { descartarRegistro(atual.id, responsavel, justDescarte); onFechar("Movimentação descartada (permanece no histórico e pode ser reaberta)."); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível descartar."); } }} className={BTN_SECUNDARIO}>
                    Descartar movimentação
                  </button>
                </div>
              )}
              {atual && descartada && (
                <button type="button" onClick={() => { try { reabrirRegistro(atual.id, responsavel); onFechar("Movimentação reaberta para conferência."); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} className={BTN_SECUNDARIO}>
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

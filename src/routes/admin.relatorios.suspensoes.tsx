import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAdminRole } from "@/components/AdminLayout";
import { CelulaObservacao } from "@/components/CelulaObservacao";
import { FluxoEmissaoSuspensoes, HistoricoEmissoesSuspensoes } from "@/components/FluxoEmissaoSuspensoes";
import { formatCompetencia, formatCurrency, servidoresList } from "@/lib/mock-data";
import { getDataReferencia } from "@/lib/dias-uteis";
import { getAssociacaoResponsavelPorCpf, getClassificacaoAtivoInativoPorCpf } from "@/lib/base-institucional";
import { responsavelCadastro } from "@/lib/servidor-cadastro";
import { useRetornoDeFoco } from "@/lib/use-retorno-foco";
import { idsEmitidos, numerosEmitidosPorRegistro } from "@/lib/emissoes-relatorio";
import { carregarMassaDemonstracaoSuspensoes, TOTAL_MASSA_SUSPENSOES } from "@/lib/massa-demonstracao-suspensoes";
import { useEmissoesSuspensoes } from "@/lib/relatorio-suspensoes-geracao";
import { competenciaPagamentoPadrao, ORIGENS_PAGAMENTO, type OrigemPagamento, type VinculoFuncional } from "@/lib/relatorio-alteracoes";
import {
  atualizarClassificacao,
  atualizarDadosSuspensao,
  atualizarObservacaoSuspensao,
  atualizarValorSuspensao,
  CLASSIFICACOES,
  confirmarSuspensao,
  definirValorNaoAplicavelSuspensao,
  descartarSuspensao,
  estadoDoValorSuspensao,
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
  type RegistroSuspensao,
} from "@/lib/relatorio-suspensoes";

export const Route = createFileRoute("/admin/relatorios/suspensoes")({
  component: RelatorioSuspensoes,
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

/** Rótulo para a tabela: "Suspender — titular" ou "Excluir — dependente Fulano (enteado)", seguido do motivo. */
function rotuloSituacao(r: RegistroSuspensao): { principal: string; quem: string; motivo: string } {
  const quem = r.afetado.tipo === "dependente" ? `dependente ${r.afetado.nomeDependente ?? ""}${r.afetado.parentesco ? ` (${r.afetado.parentesco.toLowerCase()})` : ""}` : "titular";
  return { principal: r.classificacao ? ROTULO_CLASSIFICACAO[r.classificacao] : "Situação a classificar", quem, motivo: r.motivo ? textoDoMotivoSuspensao(r.motivo) : "" };
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
  const emitidos = useMemo(() => numerosEmitidosPorRegistro("suspensoes", competenciaSel), [competenciaSel, emissoes]);
  const contagemAba = { ativo: daCompetencia.filter((r) => r.vinculo === "ativo").length, inativo: daCompetencia.filter((r) => r.vinculo === "inativo").length, sem_vinculo: daCompetencia.filter((r) => !r.vinculo).length };
  const temDemonstrativo = registros.some((r) => r.demonstrativo);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCompetencia
      .filter((r) => (aba === "sem_vinculo" ? !r.vinculo : r.vinculo === aba))
      .filter((r) => (origem === "todas" ? true : origem === "sem_origem" ? !r.origemPagamento : r.origemPagamento === origem))
      .filter((r) => !termo || r.titular.nome.toLowerCase().includes(termo) || (r.titular.matricula ?? "").toLowerCase().includes(termo))
      .sort((a, b) => (a.titular.matricula ?? "￿").localeCompare(b.titular.matricula ?? "￿", "pt-BR", { numeric: true }) || a.titular.nome.localeCompare(b.titular.nome, "pt-BR", { sensitivity: "base" }));
  }, [daCompetencia, aba, origem, busca]);

  function carregarDemonstracao() {
    const r = carregarMassaDemonstracaoSuspensoes();
    setCompetencia("2026-09");
    setAba("ativo");
    setOrigem("todas");
    setBusca("");
    setAviso(
      r.criados > 0
        ? `Dados de demonstração carregados na competência Setembro/2026: ${r.criados} registro(s) fictício(s) novo(s)${r.jaExistentes ? ` (${r.jaExistentes} já existiam e não foram alterados)` : ""}. Eles aparecem como “Demonstrativo” e não são dados oficiais.`
        : `Os ${r.jaExistentes} registros de demonstração já estão carregados (Setembro/2026); nada foi duplicado nem alterado.`,
    );
  }

  /** Restaura os exemplos NÃO EMITIDOS: remove-os e os recria no estado inicial. Registros reais, manuais e os que constam em relatórios emitidos não são tocados. */
  function restaurarDemonstracao() {
    const rm = removerSuspensoesDemonstrativas(idsEmitidos("suspensoes"));
    const r = carregarMassaDemonstracaoSuspensoes();
    setConfirmarRemocao(false);
    setCompetencia("2026-09");
    setAviso(`Demonstração restaurada: ${rm.removidos} exemplo(s) não emitido(s) removido(s) e ${r.criados} recriado(s) no estado inicial.${rm.mantidos ? ` ${rm.mantidos} exemplo(s) foram mantidos por constarem em relatórios emitidos (imutáveis).` : ""} Registros reais e manuais não foram tocados.`);
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
            <button type="button" onClick={() => setAlteracao({ id: null })} className={BTN_SECUNDARIO}>
              <Plus className="h-4 w-4 text-primary" /> <span className="text-primary">Incluir suspensão</span>
            </button>
            <button type="button" onClick={carregarDemonstracao} className={`${BTN_SECUNDARIO} border-dashed`} title={`Cria ${TOTAL_MASSA_SUSPENSOES} registros fictícios em Setembro/2026, em vários estados. Não duplica nem altera o que já existe.`}>
              <FlaskConical className="h-4 w-4" /> Carregar dados de demonstração
            </button>
            {temDemonstrativo && (
              <button type="button" onClick={() => setConfirmarRemocao(true)} className={`${BTN_SECUNDARIO} border-dashed`} title="Remove e recria os exemplos ainda não emitidos, no estado inicial.">
                <Trash2 className="h-4 w-4" /> Restaurar demonstração
              </button>
            )}
            <button type="button" onClick={() => setHistoricoAberto(true)} className={`${BTN_SECUNDARIO} text-primary`}>
              Histórico
            </button>
            <button type="button" onClick={() => setFluxoAberto(true)} className={BTN_PRIMARIO}>
              Exportar relatório
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <label className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/70">
            Competência
            <select value={competenciaSel} onChange={(e) => setCompetencia(e.target.value)} aria-label="Competência de referência" className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {formatCompetencia(m)}
                </option>
              ))}
            </select>
          </label>
          <span className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground/80" title="Sugerida como o mês seguinte (art. 18 da Instrução nº 492/2023); cada registro pode ser conferido individualmente.">
            Pagamento <strong className="text-foreground">{formatCompetencia(competenciaPagamentoPadrao(competenciaSel))}</strong>
          </span>
        </div>
      </header>

      {aviso && (
        <p role="status" className="text-sm rounded-xl border border-border bg-muted/40 px-4 py-3">
          {aviso}
        </p>
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

      <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden" aria-label="Situações da competência">
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
          <p className="px-6 py-10 text-center text-sm text-foreground/75 border-t border-border">{daCompetencia.length === 0 ? `Nenhum registro para ${formatCompetencia(competenciaSel)}. Use “Incluir suspensão” (não há leitura automática de outros módulos).` : "Nenhum registro com os filtros atuais."}</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {filtrados.map((r) => (
              <LinhaRegistro key={r.id} r={r} emitidoEm={emitidos.get(r.id) ?? []} onAbrir={() => setAlteracao({ id: r.id })} onReabrir={() => { try { reabrirSuspensao(r.id, responsavel); } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} />
            ))}
          </ul>
        )}
        </div>
        </div>
      </section>

      {alteracao && <DialogoSuspensao key={alteracao.id ?? "novo"} registro={alteracao.id ? registros.find((r) => r.id === alteracao.id) ?? null : null} competenciaInicial={competenciaSel} responsavel={responsavel} onFechar={(msg) => { setAlteracao(null); if (msg) setAviso(msg); }} />}
      {fluxoAberto && <FluxoEmissaoSuspensoes competencia={competenciaSel} responsavel={responsavel} onFechar={() => setFluxoAberto(false)} onAbrirHistorico={() => setHistoricoAberto(true)} />}
      {historicoAberto && <HistoricoEmissoesSuspensoes competencia={competenciaSel} onFechar={() => setHistoricoAberto(false)} />}
      {confirmarRemocao && <DialogConfirmaRemocao onFechar={() => setConfirmarRemocao(false)} onConfirmar={restaurarDemonstracao} />}
    </div>
  );
}

/* ── Linha da tabela ─────────────────────────────────────────────────────────────────────────────────────────── */

const COLUNAS = "lg:grid-cols-[5rem_minmax(11rem,1.3fr)_minmax(11rem,1.3fr)_6rem_minmax(12rem,1.7fr)_9.5rem_6.25rem]";

function LinhaRegistro({ r, emitidoEm, onAbrir, onReabrir }: { r: RegistroSuspensao; emitidoEm: number[]; onAbrir: () => void; onReabrir: () => void }) {
  const pronto = prontoDoRegistro(r);
  const descartada = r.situacao === "descartada";
  const pend = pendenciasSuspensao(r).filter((p) => p.impeditiva);
  const ev = estadoDoValorSuspensao(r);
  const sit = rotuloSituacao(r);
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
      </div>
      <div className="min-w-0 text-sm leading-snug break-normal [overflow-wrap:anywhere]">
        <p className={`font-semibold ${r.classificacao === "excluir" ? "text-destructive" : r.classificacao === "permanece_suspenso" ? "text-status-pendente-fg" : ""}`}>{sit.principal}</p>
        <p className="text-xs text-foreground/75">{sit.quem}</p>
        {sit.motivo && <p className="mt-0.5 text-xs text-foreground/75"><span className="font-medium">Motivo:</span> {sit.motivo}</p>}
      </div>
      <p className="text-sm tabular-nums">
        <span className="lg:hidden text-xs text-foreground/70">Valor NURFI: </span>
        {ev === "preenchido" ? <strong>{formatCurrency(r.valorInformadoNurfi!)}</strong> : ev === "nao_aplicavel" ? <span className="font-semibold text-foreground/75" title={r.valorNaoAplicavel?.justificativa}>Não aplicável</span> : <span className="font-bold text-status-pendente-fg">Pendente</span>}
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

function DialogConfirmaRemocao({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco}>
        <DialogTitle>Restaurar os dados de demonstração?</DialogTitle>
        <DialogDescription>
          Os exemplos fictícios <strong>ainda não emitidos</strong> serão removidos e recriados no estado inicial (Conferir, Pronto e Descartada). Alterações feitas nesses exemplos serão perdidas. Registros reais, registros manuais e qualquer exemplo que conste em um relatório emitido — assim como os relatórios emitidos — <strong>não serão alterados</strong>.
        </DialogDescription>
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

function DialogoSuspensao({ registro: r, competenciaInicial, responsavel, onFechar }: { registro: RegistroSuspensao | null; competenciaInicial: string; responsavel: string; onFechar: (mensagem?: string) => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const todos = useRegistrosSuspensoes();
  const atual = r ? todos.find((x) => x.id === r.id) ?? r : null;
  const novo = !atual;
  const confirmada = atual?.situacao === "confirmada";
  const descartada = atual?.situacao === "descartada";
  const { lista: meses } = useMemo(() => mesesDisponiveis(todos), [todos]);

  const [benef, setBenef] = useState("");
  const [nome, setNome] = useState(atual?.titular.nome ?? "");
  const [matricula, setMatricula] = useState(atual?.titular.matricula ?? "");
  const [cpf, setCpf] = useState(atual?.titular.cpf ?? "");
  const [vinculo, setVinculo] = useState<string>(atual?.vinculo ?? "");
  const [origemPag, setOrigemPag] = useState<string>(atual?.origemPagamento ?? "");
  const [refComp, setRefComp] = useState(atual?.competenciaReferencia ?? competenciaInicial);
  const [pagComp, setPagComp] = useState(atual?.competenciaPagamento ?? competenciaPagamentoPadrao(competenciaInicial));
  const [classificacao, setClassificacao] = useState<ClassificacaoSuspensao | "">(atual?.classificacao ?? "");
  const [quem, setQuem] = useState<"titular" | "dependente">(atual?.afetado.tipo ?? "titular");
  const [nomeDep, setNomeDep] = useState(atual?.afetado.nomeDependente ?? "");
  const [parentesco, setParentesco] = useState(atual?.afetado.parentesco ?? "");
  const [motivo, setMotivo] = useState<string | undefined>(atual?.motivo);
  const [valorTexto, setValorTexto] = useState(paraTextoEditavel(atual?.valorInformadoNurfi));
  const [naoAplicavel, setNaoAplicavel] = useState(!!atual?.valorNaoAplicavel);
  const [justNA, setJustNA] = useState("");
  const [observacao, setObservacao] = useState(atual?.observacao ?? "");
  const [observacaoTocada, setObservacaoTocada] = useState(false);
  const [justRevisao, setJustRevisao] = useState("");
  const [justDescarte, setJustDescarte] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const afetado: PessoaAfetada = quem === "dependente" ? { tipo: "dependente", nomeDependente: nomeDep, parentesco: parentesco || undefined } : { tipo: "titular" };
  const sugestao = sugerirObservacaoSuspensao(classificacao || undefined, afetado, motivo);
  const valorLido = (() => {
    try {
      return naoAplicavel ? undefined : lerValor(valorTexto);
    } catch {
      return undefined;
    }
  })();
  const valorInvalido = (() => {
    try {
      lerValor(valorTexto);
      return false;
    } catch {
      return true;
    }
  })();
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
    competenciaEstimada: atual?.competenciaEstimada && refComp === atual.competenciaReferencia && pagComp === atual.competenciaPagamento ? true : undefined,
    classificacao: classificacao || undefined,
    afetado,
    motivo: motivo?.trim() || undefined,
    valorInformadoNurfi: valorLido,
    valorNaoAplicavel: naoAplicavel ? atual?.valorNaoAplicavel ?? { justificativa: justNA, responsavel, dataHora: "" } : undefined,
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
    ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa para declarar o valor como não aplicável."] : []),
    ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []),
  ];
  const faltasRascunho = [...(!nome.trim() ? ["Selecione o beneficiário."] : []), ...(quem === "dependente" && !nomeDep.trim() ? ["Identifique o dependente afetado."] : []), ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []), ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa do valor não aplicável."] : [])];

  function escolherBeneficiario(valor: string) {
    setBenef(valor);
    if (valor === "") {
      setNome("");
      setMatricula("");
      setCpf("");
      return;
    }
    if (valor === "__outro") return;
    const s = servidoresList.find((x) => x.matricula === valor);
    if (!s) return;
    setNome(s.nome);
    setMatricula(s.matricula);
    setCpf(s.cpf);
    const c = getClassificacaoAtivoInativoPorCpf(s.cpf);
    setVinculo(c.grupo && !c.requerConferencia ? c.grupo : "");
    const assoc = getAssociacaoResponsavelPorCpf(s.cpf)?.toLowerCase();
    setOrigemPag(assoc === "assefaz" ? "ASSEFAZ" : assoc === "assetran" ? "ASSETRAN" : "Boletos");
  }

  function gravar(): string {
    const j = (confirmada ? justRevisao : "").trim() || undefined;
    const valor = naoAplicavel ? undefined : lerValor(valorTexto);
    if (!atual) {
      const { registro } = registrarSuspensao(
        {
          titular: { nome, matricula: matricula || undefined, cpf: cpf || undefined },
          vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
          origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
          competenciaReferencia: refComp,
          competenciaPagamento: pagComp,
          classificacao: classificacao || undefined,
          afetado,
          motivo,
          valorInformadoNurfi: valor,
          observacao: observacao.trim() && observacao.trim() !== sugestao ? observacao : undefined,
          origemInformacao: "manual",
          referenciaOrigem: { modulo: "manual", rotulo: "Inclusão manual pela GERDAB" },
        },
        responsavel,
      );
      if (naoAplicavel) definirValorNaoAplicavelSuspensao(registro.id, true, responsavel, justNA);
      return registro.id;
    }
    const dados: Parameters<typeof atualizarDadosSuspensao>[1] = {};
    if (nome.trim() !== atual.titular.nome) dados.titularNome = nome;
    if ((matricula.trim() || "") !== (atual.titular.matricula ?? "")) dados.matricula = matricula;
    if ((vinculo || "") !== (atual.vinculo ?? "")) dados.vinculo = (vinculo || undefined) as VinculoFuncional | undefined;
    if ((origemPag || "") !== (atual.origemPagamento ?? "")) dados.origemPagamento = (origemPag || undefined) as OrigemPagamento | undefined;
    if (refComp !== atual.competenciaReferencia) dados.competenciaReferencia = refComp;
    if (pagComp !== atual.competenciaPagamento) dados.competenciaPagamento = pagComp;
    if (Object.keys(dados).length) atualizarDadosSuspensao(atual.id, dados, responsavel, j);
    const sig = (c?: string, a?: PessoaAfetada, m?: string) => JSON.stringify([c ?? "", a?.tipo, a?.nomeDependente ?? "", a?.parentesco ?? "", m?.trim() ?? ""]);
    if (sig(classificacao, afetado, motivo) !== sig(atual.classificacao, atual.afetado, atual.motivo)) atualizarClassificacao(atual.id, { classificacao: classificacao || undefined, afetado, motivo }, responsavel, j);
    if (valor !== atual.valorInformadoNurfi) atualizarValorSuspensao(atual.id, valor, responsavel, j);
    if (naoAplicavel && !atual.valorNaoAplicavel) definirValorNaoAplicavelSuspensao(atual.id, true, responsavel, justNA || j);
    if (!naoAplicavel && atual.valorNaoAplicavel && valor === undefined) definirValorNaoAplicavelSuspensao(atual.id, false, responsavel, j);
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

  const resumoValor = (x: { valorInformadoNurfi?: number; valorNaoAplicavel?: unknown }) => (x.valorInformadoNurfi !== undefined ? formatCurrency(x.valorInformadoNurfi) : x.valorNaoAplicavel ? "Não aplicável" : "Sem valor");
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
          <Secao n={1} titulo="Situação" descricao="Classifique a situação que será comunicada. A escolha é da GERDAB: o sistema não decide suspensões, permanências nem exclusões.">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {novo ? (
                <>
                  <label className="font-semibold">
                    Titular (beneficiário)
                    <select value={benef} onChange={(e) => escolherBeneficiario(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                      <option value="">Selecione um beneficiário</option>
                      {servidoresList.map((s) => (
                        <option key={s.matricula} value={s.matricula}>
                          {s.nome} ({s.matricula})
                        </option>
                      ))}
                      <option value="__outro">Outro (informar manualmente)</option>
                    </select>
                  </label>
                  <label className="font-semibold">
                    Matrícula do titular
                    <input value={matricula} onChange={(e) => setMatricula(e.target.value)} readOnly={benef !== "__outro"} placeholder="Preenchida após a seleção" className={`${CAMPO} mt-1 font-normal ${benef !== "__outro" ? "bg-muted" : ""}`} />
                  </label>
                  {benef === "__outro" && (
                    <label className="font-semibold sm:col-span-2">
                      Nome do titular
                      <input value={nome} onChange={(e) => setNome(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                  )}
                </>
              ) : (
                <>
                  <label className="font-semibold">
                    Titular
                    <input value={nome} onChange={(e) => setNome(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                  </label>
                  <label className="font-semibold">
                    Matrícula do titular
                    <input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Sem correspondência" className={`${CAMPO} mt-1 font-normal`} />
                  </label>
                </>
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
                  <label className="font-semibold">
                    Nome do dependente
                    <input value={nomeDep} onChange={(e) => setNomeDep(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                  </label>
                  <label className="font-semibold">
                    Vínculo (parentesco)
                    <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                      <option value="">Selecione</option>
                      {PARENTESCOS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
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
              <label className="font-semibold">
                Competência
                <select value={refComp} onChange={(e) => { setRefComp(e.target.value); setPagComp(competenciaPagamentoPadrao(e.target.value)); }} className={`${CAMPO} mt-1 font-normal`}>
                  {[...new Set([refComp, ...meses])].sort().reverse().map((m) => (
                    <option key={m} value={m}>
                      {formatCompetencia(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Pagamento
                <select value={pagComp} onChange={(e) => setPagComp(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                  {[...new Set([pagComp, competenciaPagamentoPadrao(refComp)])].sort().map((m) => (
                    <option key={m} value={m}>
                      {formatCompetencia(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Vínculo funcional do titular
                <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                  <option value="">A conferir</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
              <label className="font-semibold">
                Origem de pagamento
                <select value={origemPag} onChange={(e) => setOrigemPag(e.target.value)} className={`${CAMPO} mt-1 font-normal`}>
                  <option value="">A conferir</option>
                  {ORIGENS_PAGAMENTO.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
          </Secao>

          <Secao n={2} titulo="Valor a informar ao NURFI" descricao="Nos modelos de referência a coluna de valor é 0,00; aqui o valor é editável ou pode ser declarado como não aplicável." destaque>
            <label className="block text-sm font-semibold">
              Valor NURFI
              <input value={valorTexto} onChange={(e) => { setValorTexto(e.target.value); if (e.target.value.trim()) setNaoAplicavel(false); }} disabled={naoAplicavel} inputMode="decimal" aria-invalid={valorInvalido} aria-describedby="ajuda-valor-sus" placeholder="Informe o valor (ex.: 0,00)" className={`${CAMPO} mt-1 text-lg font-normal`} />
              <span id="ajuda-valor-sus" className="block text-xs font-normal text-foreground/75 mt-1">Formato 1234,56. Em branco = pendente de conferência. R$ 0,00 só deve ser usado se a GERDAB confirmar essa regra.</span>
            </label>
            {naoAplicavel && <span className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-semibold">Valor não aplicável</span>}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={naoAplicavel} onChange={(e) => { setNaoAplicavel(e.target.checked); if (e.target.checked) setValorTexto(""); }} className="h-4 w-4" />O valor não é aplicável. Registrar justificativa.
            </label>
            {naoAplicavel && (
              <label className="block text-sm font-semibold">
                Justificativa obrigatória
                <textarea value={atual?.valorNaoAplicavel ? atual.valorNaoAplicavel.justificativa : justNA} onChange={(e) => setJustNA(e.target.value)} readOnly={!!atual?.valorNaoAplicavel} rows={3} placeholder="Explique por que este registro não exige valor financeiro." className={`${CAMPO} mt-1 font-normal`} />
              </label>
            )}
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

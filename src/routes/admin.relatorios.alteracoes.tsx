import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAdminRole } from "@/components/AdminLayout";
import { CelulaObservacao } from "@/components/CelulaObservacao";
import { FluxoEmissao, HistoricoEmissoes } from "@/components/FluxoEmissaoAlteracoes";
import { formatCompetencia, formatCurrency, servidoresList } from "@/lib/mock-data";
import { getDataReferencia } from "@/lib/dias-uteis";
import { getAssociacaoResponsavelPorCpf, getClassificacaoAtivoInativoPorCpf } from "@/lib/base-institucional";
import { responsavelCadastro } from "@/lib/servidor-cadastro";
import { useRetornoDeFoco } from "@/lib/use-retorno-foco";
import { numerosEmitidosPorRegistro } from "@/lib/emissoes-relatorio";
import { garantirMassaDemonstracaoAlteracoes } from "@/lib/massa-demonstracao-alteracoes";
import { idsEmitidos } from "@/lib/emissoes-relatorio";
import { useEmissoesAlteracoes } from "@/lib/relatorio-alteracoes-geracao";
import { lerTodasAsFontes, ROTULO_FONTE, sincronizarSugestoes, type ResultadoFonte, type ResultadoSincronizacao } from "@/lib/relatorio-alteracoes-sugestoes";
import {
  atualizarDados,
  atualizarMovimentos,
  atualizarObservacao,
  atualizarValorInformado,
  avaliarRegistro,
  competenciaPagamentoPadrao,
  confirmarRegistro,
  definirValorNaoAplicavel,
  descartarRegistro,
  estadoDoValor,
  MOTIVOS_REFERENCIA,
  ORIGENS_PAGAMENTO,
  pendenciasAmigaveis,
  reabrirRegistro,
  registrarMovimentacao,
  removerRegistrosDemonstrativos,
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
  component: RelatorioAlteracoes,
});

/* ── Utilitários ─────────────────────────────────────────────────────────────────────────────────────────────── */

const TIPOS: TipoMovimentacao[] = ["incluir", "reincluir", "alterar_valor", "dependente_incluido", "dependente_excluido", "dependente_reincluido"];
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
    .map((m) => (m.tipo === "alterar_valor" ? (m.motivo ? textoDoMotivo(m.motivo) : "Alteração de valor") : m.tipo === "a_conferir" ? "Movimentação a classificar" : m.motivo && m.tipo !== "dependente_incluido" && m.tipo !== "dependente_excluido" && m.tipo !== "dependente_reincluido" ? `${ROTULO_TIPO[m.tipo]} — ${textoDoMotivo(m.motivo)}` : ROTULO_TIPO[m.tipo]))
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
  const [resultadoBusca, setResultadoBusca] = useState<{ sync: ResultadoSincronizacao; fontes: ResultadoFonte[]; em: string } | null>(null);
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
  const emitidos = useMemo(() => numerosEmitidosPorRegistro("alteracoes", competenciaSel), [competenciaSel, emissoes]);
  const contagemAba = { ativo: daCompetencia.filter((r) => r.vinculo === "ativo").length, inativo: daCompetencia.filter((r) => r.vinculo === "inativo").length, sem_vinculo: daCompetencia.filter((r) => !r.vinculo).length };
  const temDemonstrativo = registros.some((r) => r.demonstrativo);
  const demoCarregada = registros.some((r) => r.id.startsWith("demo-alt-"));

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCompetencia
      .filter((r) => (aba === "sem_vinculo" ? !r.vinculo : r.vinculo === aba))
      .filter((r) => (origem === "todas" ? true : origem === "sem_origem" ? !r.origemPagamento : r.origemPagamento === origem))
      .filter((r) => !termo || r.titular.nome.toLowerCase().includes(termo) || (r.titular.matricula ?? "").toLowerCase().includes(termo))
      .sort((a, b) => (a.titular.matricula ?? "￿").localeCompare(b.titular.matricula ?? "￿", "pt-BR", { numeric: true }) || a.titular.nome.localeCompare(b.titular.nome, "pt-BR", { sensitivity: "base" }));
  }, [daCompetencia, aba, origem, busca]);

  function buscarMovimentacoes() {
    setBusy(true);
    try {
      const fontes = lerTodasAsFontes();
      const sync = sincronizarSugestoes(responsavel);
      setResultadoBusca({ sync, fontes, em: new Date().toISOString() });
      setAviso(null);
    } finally {
      setBusy(false);
    }
  }

  function carregarDemonstracao() {
    garantirMassaDemonstracaoAlteracoes();
    setCompetencia("2026-09");
    setAviso("Exemplos de demonstração carregados (competência Setembro/2026). Eles estão identificados como “Demonstrativo” e não são dados oficiais.");
  }

  function removerDemonstracao() {
    const r = removerRegistrosDemonstrativos(idsEmitidos("alteracoes"));
    setConfirmarRemocao(false);
    setAviso(`Exemplos de demonstração removidos: ${r.removidos}.${r.mantidosPorVersao ? ` ${r.mantidosPorVersao} foram mantidos por constarem em relatórios emitidos (que são imutáveis).` : ""} Registros reais e manuais não foram tocados.`);
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
            <button type="button" onClick={buscarMovimentacoes} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
              <RefreshCw className="h-4 w-4" /> Buscar movimentações
            </button>
            <button type="button" onClick={() => setAlteracao({ id: null })} className={BTN_SECUNDARIO}>
              <Plus className="h-4 w-4 text-primary" /> <span className="text-primary">Incluir alteração</span>
            </button>
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
      {resultadoBusca && <PainelResultadoBusca resultado={resultadoBusca} onFechar={() => setResultadoBusca(null)} />}

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
          <p className="px-6 py-10 text-center text-sm text-foreground/75 border-t border-border">{daCompetencia.length === 0 ? `Nenhuma movimentação registrada para ${formatCompetencia(competenciaSel)}. Use “Buscar movimentações” ou “Incluir alteração”.` : "Nenhum registro com os filtros atuais."}</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {filtrados.map((r) => (
              <LinhaRegistro key={r.id} r={r} emitidoEm={emitidos.get(r.id) ?? []} onAbrir={() => setAlteracao({ id: r.id })} onReabrir={() => { try { reabrirRegistro(r.id, responsavel); } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível reabrir."); } }} />
            ))}
          </ul>
        )}
        </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/75">
        <FlaskConical className="h-3.5 w-3.5" /> Exemplos de demonstração (fictícios):
        <button type="button" onClick={carregarDemonstracao} disabled={demoCarregada} className="underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          {demoCarregada ? "carregados" : "carregar"}
        </button>
        {temDemonstrativo && (
          <button type="button" onClick={() => setConfirmarRemocao(true)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            <Trash2 className="h-3 w-3" /> remover
          </button>
        )}
      </div>

      {alteracao && <DialogoAlteracao key={alteracao.id ?? "novo"} registro={alteracao.id ? registros.find((r) => r.id === alteracao.id) ?? null : null} competenciaInicial={competenciaSel} responsavel={responsavel} onFechar={(msg) => { setAlteracao(null); if (msg) setAviso(msg); }} />}
      {fluxoAberto && <FluxoEmissao competencia={competenciaSel} responsavel={responsavel} onFechar={() => setFluxoAberto(false)} onAbrirHistorico={() => setHistoricoAberto(true)} />}
      {historicoAberto && <HistoricoEmissoes competencia={competenciaSel} onFechar={() => setHistoricoAberto(false)} />}
      {confirmarRemocao && <DialogConfirmaRemocao onFechar={() => setConfirmarRemocao(false)} onConfirmar={removerDemonstracao} />}
    </div>
  );
}

/* ── Resultado da busca de movimentações ─────────────────────────────────────────────────────────────────────── */

function PainelResultadoBusca({ resultado, onFechar }: { resultado: { sync: ResultadoSincronizacao; fontes: ResultadoFonte[]; em: string }; onFechar: () => void }) {
  const { sync, fontes } = resultado;
  const aConferir = fontes.reduce((n, f) => n + f.sugestoes.filter((s) => s.movimentos.some((m) => m.tipo === "a_conferir")).length, 0);
  const comNota = fontes.reduce((n, f) => n + f.sugestoes.filter((s) => (s.conferencia?.length ?? 0) > 0).length, 0);
  return (
    <div role="region" aria-label="Resultado da busca de movimentações" className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Busca concluída em {dataHora(resultado.em)}</p>
          <p className="text-xs text-muted-foreground">
            <strong>{sync.novas}</strong> sugestão(ões) nova(s) · <strong>{sync.jaExistentes}</strong> já existente(s) (nada foi duplicado nem restaurado) · <strong>{aConferir}</strong> a classificar · <strong>{comNota}</strong> com pendências de identificação
          </p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar resultado da busca" className="rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
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
  );
}

/* ── Linha da tabela ─────────────────────────────────────────────────────────────────────────────────────────── */

const COLUNAS = "lg:grid-cols-[5rem_minmax(11rem,1.3fr)_minmax(11rem,1.3fr)_6rem_minmax(12rem,1.7fr)_9.5rem_6.25rem]";

function LinhaRegistro({ r, emitidoEm, onAbrir, onReabrir }: { r: RegistroAlteracao; emitidoEm: number[]; onAbrir: () => void; onReabrir: () => void }) {
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
      </div>
      <p className="min-w-0 text-sm leading-snug break-normal [overflow-wrap:anywhere]">{rotuloMovimentacao(r.movimentos)}</p>
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

function DialogConfirmaRemocao({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco}>
        <DialogTitle>Remover exemplos de demonstração?</DialogTitle>
        <DialogDescription>Serão removidos apenas os registros marcados como “Demonstrativo”. Registros reais, manuais e qualquer registro que conste em um relatório emitido serão preservados.</DialogDescription>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onFechar} className={BTN_SECUNDARIO}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className={BTN_PRIMARIO}>
            Remover exemplos
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Diálogo: incluir alteração (manual) / conferir ou revisar um registro ───────────────────────────────────── */

type MovForm = { tipo: TipoMovimentacao | ""; motivo?: string };

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

function DialogoAlteracao({ registro: r, competenciaInicial, responsavel, onFechar }: { registro: RegistroAlteracao | null; competenciaInicial: string; responsavel: string; onFechar: (mensagem?: string) => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const registrosTodos = useRegistrosAlteracoes();
  const atual = r ? registrosTodos.find((x) => x.id === r.id) ?? r : null;
  const novo = !atual;
  const confirmada = atual?.situacao === "confirmada";
  const descartada = atual?.situacao === "descartada";
  const { lista: meses } = useMemo(() => mesesDisponiveis(registrosTodos), [registrosTodos]);

  const [benef, setBenef] = useState("");
  const [nome, setNome] = useState(atual?.titular.nome ?? "");
  const [matricula, setMatricula] = useState(atual?.titular.matricula ?? "");
  const [cpf, setCpf] = useState(atual?.titular.cpf ?? "");
  const [vinculo, setVinculo] = useState<string>(atual?.vinculo ?? "");
  const [origemPag, setOrigemPag] = useState<string>(atual?.origemPagamento ?? "");
  const [refComp, setRefComp] = useState(atual?.competenciaReferencia ?? competenciaInicial);
  const [pagComp, setPagComp] = useState(atual?.competenciaPagamento ?? competenciaPagamentoPadrao(competenciaInicial));
  const [movs, setMovs] = useState<MovForm[]>(atual ? atual.movimentos.map((m) => ({ tipo: m.tipo === "a_conferir" ? "" : m.tipo, motivo: m.motivo })) : [{ tipo: "" }]);
  const [valorTexto, setValorTexto] = useState(paraTextoEditavel(atual?.valorInformadoNurfi));
  const [naoAplicavel, setNaoAplicavel] = useState(!!atual?.valorNaoAplicavel);
  const [justNA, setJustNA] = useState("");
  const [observacao, setObservacao] = useState(atual?.observacao ?? "");
  const [observacaoTocada, setObservacaoTocada] = useState(false);
  const [justRevisao, setJustRevisao] = useState("");
  const [justDescarte, setJustDescarte] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const movimentosNormalizados: Movimento[] = movs.map((m) => ({ tipo: m.tipo === "" ? "a_conferir" : m.tipo, motivo: m.motivo?.trim() || undefined }));
  const sugestao = sugerirObservacao(movimentosNormalizados);
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
    competenciaEstimada: atual?.competenciaEstimada && refComp === atual.competenciaReferencia && pagComp === atual.competenciaPagamento ? true : undefined,
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
    ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa para declarar o valor como não aplicável."] : []),
    ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []),
  ];
  const faltasRascunho = [...(!nome.trim() ? ["Selecione o beneficiário."] : []), ...(confirmada && !justRevisao.trim() ? ["Informe a justificativa da revisão."] : []), ...(naoAplicavel && !atual?.valorNaoAplicavel && !justNA.trim() ? ["Informe a justificativa do valor não aplicável."] : [])];

  function escolherBeneficiario(valor: string) {
    setBenef(valor);
    if (valor === "" || valor === "__outro") {
      if (valor === "") { setNome(""); setMatricula(""); setCpf(""); }
      return;
    }
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

  /** Grava as alterações (auditadas). Retorna o id do registro. */
  function gravar(): string {
    const j = (confirmada ? justRevisao : "").trim() || undefined;
    const valor = naoAplicavel ? undefined : lerValor(valorTexto);
    if (!atual) {
      const { registro } = registrarMovimentacao(
        {
          titular: { nome, matricula: matricula || undefined, cpf: cpf || undefined },
          vinculo: (vinculo || undefined) as VinculoFuncional | undefined,
          origemPagamento: (origemPag || undefined) as OrigemPagamento | undefined,
          competenciaReferencia: refComp,
          competenciaPagamento: pagComp,
          movimentos: movimentosNormalizados,
          valorInformadoNurfi: valor,
          observacao: observacao.trim() && observacao.trim() !== sugestao ? observacao : undefined,
          origemInformacao: "manual",
          referenciaOrigem: { modulo: "manual", rotulo: "Inclusão manual pela GERDAB" },
        },
        responsavel,
      );
      if (naoAplicavel) definirValorNaoAplicavel(registro.id, true, responsavel, justNA);
      return registro.id;
    }
    const dados: Parameters<typeof atualizarDados>[1] = {};
    if (nome.trim() !== atual.titular.nome) dados.titularNome = nome;
    if ((matricula.trim() || "") !== (atual.titular.matricula ?? "")) dados.matricula = matricula;
    if ((vinculo || "") !== (atual.vinculo ?? "")) dados.vinculo = (vinculo || undefined) as VinculoFuncional | undefined;
    if ((origemPag || "") !== (atual.origemPagamento ?? "")) dados.origemPagamento = (origemPag || undefined) as OrigemPagamento | undefined;
    if (refComp !== atual.competenciaReferencia) dados.competenciaReferencia = refComp;
    if (pagComp !== atual.competenciaPagamento) dados.competenciaPagamento = pagComp;
    if (Object.keys(dados).length) atualizarDados(atual.id, dados, responsavel, j);
    const assinatura = (m: Movimento[]) => JSON.stringify(m.map((x) => [x.tipo, x.motivo ?? ""]));
    if (assinatura(movimentosNormalizados) !== assinatura(atual.movimentos)) atualizarMovimentos(atual.id, movimentosNormalizados, responsavel, j);
    if (valor !== atual.valorInformadoNurfi) atualizarValorInformado(atual.id, valor, responsavel, j);
    if (naoAplicavel && !atual.valorNaoAplicavel) definirValorNaoAplicavel(atual.id, true, responsavel, justNA || j);
    if (!naoAplicavel && atual.valorNaoAplicavel && valor === undefined) definirValorNaoAplicavel(atual.id, false, responsavel, j);
    const salvo = JSON.parse(localStorage.getItem("prosaude_relatorio_alteracoes") ?? "[]").find((x: RegistroAlteracao) => x.id === atual.id) as RegistroAlteracao | undefined;
    if (salvo && observacao.trim() !== salvo.observacao.trim() && (observacao.trim() || sugestao) !== salvo.observacao) atualizarObservacao(atual.id, observacao, responsavel, j);
    return atual.id;
  }

  function executar(acao: "rascunho" | "confirmar") {
    setErro(null);
    try {
      const id = gravar();
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
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {novo ? (
                <>
                  <label className="font-semibold">
                    Beneficiário
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
                    Matrícula
                    <input value={matricula} onChange={(e) => setMatricula(e.target.value)} readOnly={benef !== "__outro"} placeholder="Preenchida após a seleção" className={`${CAMPO} mt-1 font-normal ${benef !== "__outro" ? "bg-muted" : ""}`} />
                  </label>
                  {benef === "__outro" && (
                    <label className="font-semibold sm:col-span-2">
                      Nome do beneficiário
                      <input value={nome} onChange={(e) => setNome(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                    </label>
                  )}
                </>
              ) : (
                <>
                  <label className="font-semibold">
                    Beneficiário
                    <input value={nome} onChange={(e) => setNome(e.target.value)} className={`${CAMPO} mt-1 font-normal`} />
                  </label>
                  <label className="font-semibold">
                    Matrícula
                    <input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Sem correspondência" className={`${CAMPO} mt-1 font-normal`} />
                  </label>
                </>
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
                </div>
              );
            })}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="font-semibold">
                Competência
                <select value={refComp} onChange={(e) => { setRefComp(e.target.value); setPagComp(competenciaPagamentoPadrao(e.target.value)); }} className={`${CAMPO} mt-1 font-normal`}>
                  {[...new Set([refComp, ...meses])].sort().reverse().map((m) => (
                    <option key={m} value={m}>
                      {formatCompetencia(m)}
                      {atual?.competenciaEstimada && m === atual.competenciaReferencia && refComp === m ? " (estimada — confira)" : ""}
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
                Vínculo funcional
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
            <button type="button" onClick={() => setMovs((l) => [...l, { tipo: "" }])} className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
              + Adicionar outra movimentação
            </button>
          </Secao>

          <Secao n={2} titulo="Valor a informar ao NURFI" descricao="Este é o valor financeiro principal do relatório." destaque>
            <label className="block text-sm font-semibold">
              Valor NURFI
              <input value={valorTexto} onChange={(e) => { setValorTexto(e.target.value); if (e.target.value.trim()) setNaoAplicavel(false); }} disabled={naoAplicavel} inputMode="decimal" aria-invalid={valorInvalido} aria-describedby="ajuda-valor" placeholder="Informe o valor" className={`${CAMPO} mt-1 text-lg font-normal`} />
              <span id="ajuda-valor" className="block text-xs font-normal text-foreground/75 mt-1">Formato 1234,56. Nunca use 0 para “sem valor”: deixe em branco (pendente) ou declare o valor como não aplicável.</span>
            </label>
            {naoAplicavel && <span className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-semibold">Valor não aplicável</span>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([["cadastrado", "Valor cadastrado"], ["plano", "Valor do plano"], ["comprovado", "Valor comprovado"], ["calculado", "Valor calculado"]] as const).map(([k, rot]) => (
                <div key={k} className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-xs text-foreground/75">{rot}</p>
                  <p className="font-bold tabular-nums">{atual?.valores[k] !== undefined ? formatCurrency(atual.valores[k]!) : "Informação não disponível"}</p>
                </div>
              ))}
            </div>
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

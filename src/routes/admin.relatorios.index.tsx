import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  FileClock,
  FolderCheck,
  Users2,
  PieChart,
  Activity,
  RefreshCcw,
  ArrowRight,
  Handshake,
  ClipboardList,
  UserX,
  Search,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { competenciasParaFechamento, formatCompetencia, getResumoFechamento } from "@/lib/fechamento-pagamento";

export const Route = createFileRoute("/admin/relatorios/")({
  component: VisaoGeralRelatorios,
});

// "Comprovante de Rendimentos" NÃO aparece aqui: é funcionalidade exclusiva do Portal do Servidor
// (`/servidor/comprovante-rendimentos`) — o Admin não possui (e não deve possuir) um atalho que
// redirecione para uma rota `/servidor/...` (ver docs/MODULO_RELATORIOS.md, "Separação de perfis").

/** Sem acentos, sem diferenciar maiúsculas/minúsculas. */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Categoria = "Financeiro" | "Documentação" | "Cadastro" | "Gerencial";
const CATEGORIAS: Categoria[] = ["Financeiro", "Documentação", "Cadastro", "Gerencial"];

interface Relatorio {
  titulo: string;
  descricao: string;
  categoria: Categoria;
  icone: LucideIcon;
  to: string;
  search?: Record<string, string>;
  palavras?: string;
}

const RELATORIOS: Relatorio[] = [
  { titulo: "Fechamento de Pagamento", descricao: "Consolidado da competência com adimplentes, inadimplentes, casos a analisar e valor a pagar.", categoria: "Financeiro", icone: BarChart3, to: "/admin/relatorios/pagamentos", palavras: "adimplentes inadimplentes requerem análise valor a pagar competência de referência" },
  { titulo: "Ressarcimento de meses anteriores", descricao: "Análise, consolidação e histórico dos ressarcimentos retroativos.", categoria: "Financeiro", icone: RefreshCcw, to: "/admin/relatorios/retroativos" },
  { titulo: "Ressarcimento de Negociações", descricao: "Parcelas de negociações com quitação confirmada, reunidas em relatório de ressarcimento para o NURFI.", categoria: "Financeiro", icone: Handshake, to: "/admin/relatorios/negociacoes" },
  { titulo: "Relatório de Alterações (NURFI)", descricao: "Conferência das movimentações da competência (alteração de valor, inclusões, reinclusões e dependentes) a comunicar ao NURFI.", categoria: "Financeiro", icone: ClipboardList, to: "/admin/relatorios/alteracoes" },
  { titulo: "Relatório de Suspensões (NURFI)", descricao: "Conferência de suspensões, permanências de suspensão e exclusões de beneficiários para comunicação ao NURFI.", categoria: "Financeiro", icone: UserX, to: "/admin/relatorios/suspensoes" },
  { titulo: "Movimentações do Pró-Saúde — NUPLA", descricao: "Movimentações concluídas por período, modalidade de pagamento e vínculo (dados demonstrativos).", categoria: "Financeiro", icone: Activity, to: "/admin/relatorios/nupla" },
  { titulo: "Histórico de Comprovações", descricao: "Visão consolidada das comprovações apresentadas e analisadas por servidor, com acesso ao extrato individual.", categoria: "Documentação", icone: FileClock, to: "/admin/relatorios/extrato" },
  { titulo: "Documentação e Pendências", descricao: "IRPF, escolaridade e documentação periódica dos beneficiários/dependentes.", categoria: "Documentação", icone: FolderCheck, to: "/admin/relatorios/documentacao" },
  { titulo: "Beneficiários / Contratos", descricao: "Visão cadastral/contratual, com filtro por status (substitui Ativos/Inativos separados).", categoria: "Cadastro", icone: Users2, to: "/admin/servidores", search: { origem: "relatorios" } },
  { titulo: "Visões Gerenciais", descricao: "Operadora, faixa etária e situação atual em relação ao teto familiar.", categoria: "Gerencial", icone: PieChart, to: "/admin/relatorios/gerencial" },
];

const textoBusca = (r: Relatorio) => `${r.titulo} ${r.descricao} ${r.categoria} ${r.palavras ?? ""}`;

function VisaoGeralRelatorios() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | Categoria>("Todos");
  const campo = useRef<HTMLInputElement>(null);
  const q = normalizar(busca);
  const competenciaMaisRecente = competenciasParaFechamento[competenciasParaFechamento.length - 1];
  const resumo = getResumoFechamento(competenciaMaisRecente);

  // Atalho "/" foca a pesquisa (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.key !== "/" || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable) return;
      e.preventDefault();
      campo.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const encontrados = RELATORIOS.filter((r) => !q || normalizar(textoBusca(r)).includes(q));
  const contagem = (c: Categoria) => encontrados.filter((r) => r.categoria === c).length;
  const visiveis = encontrados.filter((r) => filtro === "Todos" || r.categoria === filtro);
  const grupos = CATEGORIAS.map((c) => ({ c, itens: visiveis.filter((r) => r.categoria === c) })).filter((g) => g.itens.length > 0);

  const chips: Array<{ id: "Todos" | Categoria; n: number }> = [
    { id: "Todos", n: encontrados.length },
    ...CATEGORIAS.map((c) => ({ id: c, n: contagem(c) })),
  ];

  const card = (r: Relatorio) => (
    <Link
      key={r.titulo}
      to={r.to}
      search={r.search as never}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <r.icone className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug [overflow-wrap:anywhere]">{r.titulo}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground line-clamp-3 break-normal [overflow-wrap:anywhere]">{r.descricao}</p>
      </div>
      <ArrowRight className="h-4 w-4 mt-1 text-muted-foreground shrink-0 transition group-hover:text-primary" aria-hidden="true" />
    </Link>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Módulo de Relatórios</p>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Indicadores operacionais e acesso às sub-áreas.</p>
      </header>

      {!q && (
        <Link
          to="/admin/relatorios/pagamentos"
          className="block bg-card rounded-2xl border border-border shadow-card p-5 hover:border-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Financeiro</p>
                <p className="font-semibold">Fechamento de Pagamento</p>
                <p className="text-sm text-muted-foreground">
                  Consolidado da competência com adimplentes, inadimplentes, casos a analisar e valor a pagar.
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Adimplentes</p>
              <p className="text-xl font-bold text-status-aprovado-fg">{resumo.adimplentes}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Inadimplentes</p>
              <p className="text-xl font-bold text-status-rejeitado-fg">{resumo.inadimplentes}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Requerem análise</p>
              <p className="text-xl font-bold text-status-pendente-fg">{resumo.requerAnalise}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Valor a pagar</p>
              <p className="text-xl font-bold">{formatCurrency(resumo.valorTotalAdimplentes)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Competência de referência: {formatCompetencia(competenciaMaisRecente)}
          </p>
        </Link>
      )}

      <section aria-labelledby="todos-relatorios" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="todos-relatorios" className="text-lg font-bold">Todos os relatórios</h2>
          <p role="status" className="text-sm text-muted-foreground">
            {visiveis.length} de {RELATORIOS.length}
          </p>
        </div>

        <div role="search" className="relative">
          <label htmlFor="pesquisar-relatorio" className="sr-only">
            Pesquisar relatório
          </label>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/70 pointer-events-none" aria-hidden="true" />
          <input
            ref={campo}
            id="pesquisar-relatorio"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar relatórios…"
            autoComplete="off"
            className="w-full h-14 rounded-2xl border border-border bg-card pr-14 pl-[3.25rem] text-base shadow-md placeholder:text-foreground/65 focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <kbd aria-hidden="true" className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-2.5 py-1 text-sm text-foreground/70">/</kbd>
        </div>

        <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
          {chips.map(({ id, n }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filtro === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              {id} <span className={filtro === id ? "opacity-90" : "text-foreground/70"}>{n}</span>
            </button>
          ))}
        </div>

        {grupos.length === 0 ? (
          <p role="status" className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum relatório encontrado
          </p>
        ) : (
          grupos.map(({ c, itens }) => (
            <div key={c} className="space-y-3">
              {filtro === "Todos" && (
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/75">{c}</h3>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-foreground/75">{itens.length}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{itens.map(card)}</div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

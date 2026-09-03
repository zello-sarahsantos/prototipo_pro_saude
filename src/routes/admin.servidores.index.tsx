import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { servidoresList, formatCurrency, type SituacaoFinanceira } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Settings, ChevronDown, Download, BellRing, Copy, Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

export const Route = createFileRoute("/admin/servidores/")({
  // `origem: "relatorios"` é passado só pelo link do card "Beneficiários / Contratos" em
  // `/admin/relatorios` — mostra um breadcrumb de contexto, sem duplicar tela/dados/lógica. O
  // acesso normal pelo menu "Servidores" não passa esse parâmetro e a tela fica como sempre foi.
  validateSearch: (search: Record<string, unknown>): { origem?: "relatorios" } => ({
    origem: search.origem === "relatorios" ? "relatorios" : undefined,
  }),
  component: Servidores,
});

const TOTAL_REAL = 847;
const PAGE_SIZE = 6;

/** Menu de ações em massa (engrenagem "Ação") — mesmo padrão visual mostrado no mockup do
 *  SISPRO. As ações aqui são simuladas (mock, sem efeito real), igual a outras ações
 *  simuladas do protótipo — o objetivo é o padrão visual, não um novo fluxo de dados. */
function AcaoMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light"
      >
        <Settings className="h-4 w-4" />
        Ação
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated z-20 overflow-hidden">
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Exportar lista (.xlsx)
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left"
          >
            <BellRing className="h-4 w-4 text-muted-foreground" /> Notificar pendentes
          </button>
        </div>
      )}
    </div>
  );
}

/** Segundo indicador da célula de Situação — situação financeira, dimensão independente do
 *  status cadastral (ver `SituacaoFinanceira` em mock-data.ts): um servidor pode estar "Ativo
 *  no Sistema" e, ao mesmo tempo, inadimplente com a competência atual. Texto simples (sem
 *  pílula própria) abaixo do StatusBadge — o suficiente para diferenciar sem duplicar o
 *  formato de badge e poluir a célula. */
function SituacaoFinanceiraLabel({ situacao }: { situacao: SituacaoFinanceira }) {
  const isAdimplente = situacao === "adimplente";
  return (
    <span className={`text-[11px] font-semibold ${isAdimplente ? "text-success" : "text-destructive"}`}>
      {isAdimplente ? "Adimplente" : "Inadimplente"}
    </span>
  );
}

/** Consolida Operadora e Associação em uma única célula, respeitando o cadastro real — nunca
 *  assume que uma associação (sobretudo ASSETRAN) tem operadora vinculada. Quando as duas
 *  informações existem, a associação vem em destaque e a operadora como complemento; quando só
 *  uma existe, mostra só essa; sem nenhuma das duas, mostra um traço. */
function OperadoraAssociacaoCell({ associacao, operadora }: { associacao: string; operadora?: string }) {
  const temAssociacao = associacao !== "—";

  if (temAssociacao && operadora) {
    return (
      <div className="leading-tight">
        <div className="font-medium">{associacao}</div>
        <div className="text-xs text-muted-foreground">{operadora}</div>
      </div>
    );
  }
  if (temAssociacao) return <span className="font-medium">{associacao}</span>;
  if (operadora) return <span className="font-medium">{operadora}</span>;
  return <span className="text-muted-foreground">—</span>;
}

/** Nº do processo SEI com ação rápida de copiar — usado tanto para consulta no SEI quanto para
 *  identificar o servidor sem depender da matrícula (que deixou de ser exibida na tabela). */
function ProcessoSEICell({ numero }: { numero: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-mono text-xs">{numero}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(numero);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
        className="text-muted-foreground hover:text-primary shrink-0"
        aria-label="Copiar número do processo SEI"
        title="Copiar número do processo SEI"
      >
        {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/**
 * Esta tela também é a "Beneficiários / Contratos" do Módulo de Relatórios (ver plano/matriz
 * de tratamento do SISPRO, docs/MODULO_RELATORIOS.md §3.9/§3.10): em vez de construir uma tela
 * nova duplicando dados e lógica, o Módulo de Relatórios só passa a linkar para cá — com
 * `?origem=relatorios` mostrando o breadcrumb "Relatórios > Beneficiários / Contratos" (ver
 * `Route.validateSearch` acima); o acesso normal pelo menu "Servidores" não passa esse
 * parâmetro e a tela fica exatamente como sempre foi. O filtro de "Status" abaixo já cobre
 * Ativos/Inativos/Pendentes/etc. numa única visão — substituindo o que seriam duas telas
 * separadas no SISPRO ("Pró-Saúde dos Ativos"/"Pró-Saúde dos Inativos"). Telefone/e-mail
 * **não** são coluna da tabela principal (ajuste de UX — alta densidade horizontal já existia);
 * continuam disponíveis na ficha individual (`/admin/servidores/$id`) e devem entrar na futura
 * exportação desta visão (ver §3.10).
 */
function Servidores() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAssociacao, setFiltroAssociacao] = useState("");
  const [filtroOperadora, setFiltroOperadora] = useState("");
  const [filtroSituacaoFinanceira, setFiltroSituacaoFinanceira] = useState("");
  const [somentePendencia, setSomentePendencia] = useState(false);

  const filtrados = useMemo(() => {
    return servidoresList.filter((s) => {
      const buscaNormalizada = busca.toLowerCase();
      const matchBusca =
        !busca ||
        s.nome.toLowerCase().includes(buscaNormalizada) ||
        s.matricula.includes(busca) ||
        s.cpf.includes(busca) ||
        s.processoSEI.toLowerCase().includes(buscaNormalizada);
      const matchStatus =
        !filtroStatus || s.status === filtroStatus;
      const matchAssociacao =
        !filtroAssociacao ||
        (filtroAssociacao === "Individual"
          ? s.associacao === "—"
          : s.associacao === filtroAssociacao);
      const matchOperadora =
        !filtroOperadora || (s.operadora ?? "").toLowerCase().includes(filtroOperadora.toLowerCase());
      const matchSituacaoFinanceira =
        !filtroSituacaoFinanceira || s.situacaoFinanceira === filtroSituacaoFinanceira;
      const matchPendencia =
        !somentePendencia || s.status === "pendente" || s.status === "alerta";
      return (
        matchBusca &&
        matchStatus &&
        matchAssociacao &&
        matchOperadora &&
        matchSituacaoFinanceira &&
        matchPendencia
      );
    });
  }, [busca, filtroStatus, filtroAssociacao, filtroOperadora, filtroSituacaoFinanceira, somentePendencia]);

  const totalComPendencia = servidoresList.filter((s) => s.status === "pendente" || s.status === "alerta").length;

  const exibindo = filtrados.length;
  const total =
    busca || filtroStatus || filtroAssociacao || filtroOperadora || filtroSituacaoFinanceira || somentePendencia
      ? exibindo
      : TOTAL_REAL;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {search.origem === "relatorios" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Link to="/admin/relatorios" className="hover:text-primary hover:underline">
            Relatórios
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Beneficiários / Contratos</span>
        </p>
      )}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Servidores</h1>
          <p className="text-sm text-muted-foreground">
            Exibindo {exibindo} de {total} cadastrados
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/carga-inicial"
            className="border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Carga Inicial
          </Link>
          <AcaoMenu />
        </div>
      </header>

      {/* Filtros funcionais — visual em chip, mesma lógica de antes */}
      <div className="bg-card rounded-xl border border-border shadow-card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou processo SEI"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-full bg-background"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-border rounded-full px-3.5 py-2 text-sm font-medium bg-background"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="pendente">Pendentes</option>
          <option value="alerta">Requer Atenção</option>
          <option value="suspenso">Suspensos</option>
        </select>
        <select
          value={filtroSituacaoFinanceira}
          onChange={(e) => setFiltroSituacaoFinanceira(e.target.value)}
          className="border border-border rounded-full px-3.5 py-2 text-sm font-medium bg-background"
        >
          <option value="">Todas as situações</option>
          <option value="adimplente">Adimplente</option>
          <option value="inadimplente">Inadimplente</option>
        </select>
        <select
          value={filtroAssociacao}
          onChange={(e) => setFiltroAssociacao(e.target.value)}
          className="border border-border rounded-full px-3.5 py-2 text-sm font-medium bg-background"
        >
          <option value="">Todas as associações</option>
          <option value="Assefaz">Assefaz</option>
          <option value="Assetran">Assetran</option>
          <option value="Individual">Individual</option>
        </select>
        <select
          value={filtroOperadora}
          onChange={(e) => setFiltroOperadora(e.target.value)}
          className="border border-border rounded-full px-3.5 py-2 text-sm font-medium bg-background"
        >
          <option value="">Todas as operadoras</option>
          <option value="Bradesco">Bradesco</option>
          <option value="SulAmérica">SulAmérica</option>
          <option value="Amil">Amil</option>
          <option value="CASSI">CASSI</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setSomentePendencia((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium border transition ${
            somentePendencia
              ? "bg-status-pendente-bg text-status-pendente-fg border-transparent"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${somentePendencia ? "bg-current" : "bg-border"}`} />
          Só com pendência
          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-background/60 text-[11px] font-semibold">
            {totalComPendencia}
          </span>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Nº Processo SEI</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Servidor</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Operadora / Associação</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Dep.</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Valor Plano</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Auxílio Previsto</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Situação</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum servidor encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => (
                <tr
                  key={s.matricula}
                  onClick={() => navigate({ to: "/admin/servidores/$id", params: { id: s.matricula } })}
                  className="hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <ProcessoSEICell numero={s.processoSEI} />
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{s.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <OperadoraAssociacaoCell associacao={s.associacao} operadora={s.operadora} />
                  </td>
                  <td className="px-4 py-3">{s.dependentes}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(s.valorPlano)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(s.valorAuxilio)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-0.5">
                      <StatusBadge status={s.status} />
                      {s.situacaoFinanceira && <SituacaoFinanceiraLabel situacao={s.situacaoFinanceira} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      to="/admin/servidores/$id"
                      params={{ id: s.matricula }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Rodapé com paginação mock (fix #7) */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
          <span>
            Exibindo {Math.min(exibindo, PAGE_SIZE)} de {total} registros
            {(busca || filtroStatus || filtroAssociacao || filtroOperadora || filtroSituacaoFinanceira) &&
              " (filtros aplicados — base real: 847 servidores)"}
          </span>
          <div className="flex items-center gap-1">
            <button disabled className="px-2 py-1 rounded border border-border opacity-40 cursor-not-allowed">←</button>
            <span className="px-2 py-1 rounded border border-primary bg-primary/5 text-primary font-medium">1</span>
            <button className="px-2 py-1 rounded border border-border hover:bg-muted">2</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-muted">3</button>
            <span className="px-1">…</span>
            <button className="px-2 py-1 rounded border border-border hover:bg-muted">142</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-muted">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

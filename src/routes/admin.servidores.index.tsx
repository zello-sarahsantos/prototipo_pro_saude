import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { servidoresList, formatCurrency } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Settings, ChevronDown, Download, BellRing } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

export const Route = createFileRoute("/admin/servidores/")({
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

function Servidores() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAssociacao, setFiltroAssociacao] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("");
  const [somentePendencia, setSomentePendencia] = useState(false);

  const filtrados = useMemo(() => {
    return servidoresList.filter((s) => {
      const matchBusca =
        !busca ||
        s.nome.toLowerCase().includes(busca.toLowerCase()) ||
        s.matricula.includes(busca);
      const matchStatus =
        !filtroStatus || s.status === filtroStatus;
      const matchAssociacao =
        !filtroAssociacao ||
        (filtroAssociacao === "Individual"
          ? s.associacao === "—"
          : s.associacao === filtroAssociacao);
      const matchPlano =
        !filtroPlano || s.plano.toLowerCase().includes(filtroPlano.toLowerCase());
      const matchPendencia =
        !somentePendencia || s.status === "pendente" || s.status === "alerta";
      return matchBusca && matchStatus && matchAssociacao && matchPlano && matchPendencia;
    });
  }, [busca, filtroStatus, filtroAssociacao, filtroPlano, somentePendencia]);

  const totalComPendencia = servidoresList.filter((s) => s.status === "pendente" || s.status === "alerta").length;

  const exibindo = filtrados.length;
  const total = busca || filtroStatus || filtroAssociacao || filtroPlano || somentePendencia
    ? exibindo
    : TOTAL_REAL;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
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
            placeholder="Buscar por nome ou matrícula"
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
          value={filtroPlano}
          onChange={(e) => setFiltroPlano(e.target.value)}
          className="border border-border rounded-full px-3.5 py-2 text-sm font-medium bg-background"
        >
          <option value="">Todos os planos</option>
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
              <th className="text-left px-4 py-3">Matrícula</th>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Associação</th>
              <th className="text-left px-4 py-3">Dep.</th>
              <th className="text-left px-4 py-3">Valor plano</th>
              <th className="text-left px-4 py-3">Auxílio previsto</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                  <td className="px-4 py-3 font-mono text-xs">{s.matricula}</td>
                  <td className="px-4 py-3 font-medium">{s.nome}</td>
                  <td className="px-4 py-3">{s.plano}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.associacao}</td>
                  <td className="px-4 py-3">{s.dependentes}</td>
                  <td className="px-4 py-3">{formatCurrency(s.valorPlano)}</td>
                  <td className="px-4 py-3">{formatCurrency(s.valorAuxilio)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right">
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
            {(busca || filtroStatus || filtroAssociacao || filtroPlano) &&
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

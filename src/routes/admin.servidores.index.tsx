import { createFileRoute, Link } from "@tanstack/react-router";
import { servidoresList, formatCurrency } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/servidores/")({
  component: Servidores,
});

const TOTAL_REAL = 847;
const PAGE_SIZE = 6;

function Servidores() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAssociacao, setFiltroAssociacao] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("");

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
      return matchBusca && matchStatus && matchAssociacao && matchPlano;
    });
  }, [busca, filtroStatus, filtroAssociacao, filtroPlano]);

  const exibindo = filtrados.length;
  const total = busca || filtroStatus || filtroAssociacao || filtroPlano
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
        <Link
          to="/admin/carga-inicial"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light"
        >
          Carga Inicial
        </Link>
      </header>

      {/* Filtros funcionais */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou matrícula"
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
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
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todas as associações</option>
          <option value="Assefaz">Assefaz</option>
          <option value="Assetran">Assetran</option>
          <option value="Individual">Individual</option>
        </select>
        <select
          value={filtroPlano}
          onChange={(e) => setFiltroPlano(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todos os planos</option>
          <option value="Bradesco">Bradesco</option>
          <option value="SulAmérica">SulAmérica</option>
          <option value="Amil">Amil</option>
          <option value="CASSI">CASSI</option>
        </select>
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
                <tr key={s.matricula} className="hover:bg-muted/30">
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

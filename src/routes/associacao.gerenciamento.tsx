import { createFileRoute, Link } from "@tanstack/react-router";
import { servidoresList, formatCurrency } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, UserPlus } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/associacao/gerenciamento")({
  component: GerenciamentoAssetran,
});

function GerenciamentoAssetran() {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    return servidoresList.filter((s) => {
      const matchBusca = !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.matricula.includes(busca);
      const isAssetran = s.associacao === "Assetran";
      return matchBusca && isAssetran;
    });
  }, [busca]);

  const exibindo = filtrados.length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento ASSETRAN</h1>
          <p className="text-sm text-muted-foreground">
            Beneficiários vinculados à sua associação
          </p>
        </div>
        <Link
          to="/associacao/nova-inclusao"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Nova Inclusão
        </Link>
      </header>

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
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Matrícula</th>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Plano / Operadora</th>
              <th className="text-left px-4 py-3">Dep.</th>
              <th className="text-left px-4 py-3">Valor plano</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum beneficiário encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => (
                <tr key={s.matricula} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{s.matricula}</td>
                  <td className="px-4 py-3 font-medium">{s.nome}</td>
                  <td className="px-4 py-3">{s.plano}</td>
                  <td className="px-4 py-3">{s.dependentes}</td>
                  <td className="px-4 py-3">{formatCurrency(s.valorPlano)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/associacao/gerenciamento/$id"
                      params={{ id: s.matricula }}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Ver / Editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

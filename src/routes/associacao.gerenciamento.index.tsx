import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { servidoresList, requerimentos, formatCurrency, statusLabels } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { getNotificacoesAssociacao } from "@/lib/notificacoes-associacao";
import { Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

// Renomeado de "associacao.gerenciamento.tsx" para "associacao.gerenciamento.index.tsx"
// (mesmo padrão já usado em admin.servidores.index.tsx + admin.servidores.$id.tsx, sem um
// arquivo de layout "associacao.gerenciamento.tsx"): sem isso, "associacao.gerenciamento.tsx"
// vira automaticamente uma rota-pai de "associacao.gerenciamento.$id.tsx" no TanStack Router
// (por causa da convenção de arquivo por ponto), e como esse componente não renderiza
// <Outlet />, a ficha de detalhe nunca aparecia ao clicar em "Ver/Editar" — bug pré-existente,
// corrigido aqui porque o Ajuste B depende diretamente da navegação para a ficha funcionar.
export const Route = createFileRoute("/associacao/gerenciamento/")({
  component: GerenciamentoAssetran,
});

/** Último requerimento/solicitação da GERDAB para este beneficiário (por matrícula) — coluna
 *  separada do status cadastral, para a associação acompanhar o andamento sem abrir a ficha. */
function ultimoRequerimento(matricula: string) {
  const doServidor = requerimentos.filter((r) => r.matricula === matricula);
  return doServidor[doServidor.length - 1];
}

function GerenciamentoAssetran() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    return servidoresList.filter((s) => {
      const matchBusca =
        !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.cpf.includes(busca);
      const isAssetran = s.associacao === "Assetran";
      return matchBusca && isAssetran;
    });
  }, [busca]);

  const exibindo = filtrados.length;
  const notificacoes = useMemo(() => getNotificacoesAssociacao("Assetran"), []);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento ASSETRAN</h1>
            <p className="text-sm text-muted-foreground">
              Beneficiários vinculados à sua associação
            </p>
          </div>
          <Link
            to="/associacao/nova-inclusao"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nova Inclusão
          </Link>
        </div>
        <div className="text-foreground shrink-0 pt-1">
          <NotificationBell notificacoes={notificacoes} />
        </div>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF"
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Processo SEI</th>
              <th className="text-left px-4 py-3">CPF</th>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Plano / Operadora</th>
              <th className="text-left px-4 py-3">Dep.</th>
              <th className="text-left px-4 py-3">Valor plano</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Requerimento (GERDAB)</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum beneficiário encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((s) => {
                const requerimento = ultimoRequerimento(s.matricula);
                return (
                  <tr
                    key={s.matricula}
                    onClick={() => navigate({ to: "/associacao/gerenciamento/$id", params: { id: s.matricula } })}
                    className="hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{s.processoSEI}</td>
                    <td className="px-4 py-3">{s.cpf}</td>
                    <td className="px-4 py-3 font-medium">{s.nome}</td>
                    <td className="px-4 py-3">{s.plano}</td>
                    <td className="px-4 py-3">{s.dependentes}</td>
                    <td className="px-4 py-3">{formatCurrency(s.valorPlano)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      {requerimento ? (
                        <StatusBadge status={requerimento.status} label={statusLabels[requerimento.status]} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Nenhum</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/associacao/gerenciamento/$id"
                        params={{ id: s.matricula }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Ver / Editar
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

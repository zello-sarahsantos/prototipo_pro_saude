import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { servidoresList, requerimentos, formatCurrency, statusLabels } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { getNotificacoesAssociacao } from "@/lib/notificacoes-associacao";
import { Search, UserPlus, ClipboardList, X, Eye, Send, FileText, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UploadBox } from "@/routes/servidor.requerimento.novo-plano";
import { RequerimentoAssociacaoStatusBadge } from "@/components/RequerimentoAssociacaoStatusBadge";
import {
  listarRequerimentosAssociacao,
  complementarRequerimentoAssociacao,
  statusAtualRequerimento,
  statusRequerimentoAssociacaoLabels,
  tipoRequerimentoAssociacaoLabels,
  versaoVigenteRequerimento,
  garantirRequerimentoAssociacaoExemplo,
  type RequerimentoAssociacao,
} from "@/lib/requerimentos-associacao";

// Renomeado de "associacao.gerenciamento.tsx" para "associacao.gerenciamento.index.tsx"
// (mesmo padrão já usado em admin.servidores.index.tsx + admin.servidores.$id.tsx, sem um
// arquivo de layout "associacao.gerenciamento.tsx"): sem isso, "associacao.gerenciamento.tsx"
// vira automaticamente uma rota-pai de "associacao.gerenciamento.$id.tsx" no TanStack Router
// (por causa da convenção de arquivo por ponto), e como esse componente não renderiza
// <Outlet />, a ficha de detalhe nunca aparecia ao clicar em "Ver/Editar" — bug pré-existente,
// corrigido aqui porque o Ajuste B depende diretamente da navegação para a ficha funcionar.
export const Route = createFileRoute("/associacao/gerenciamento/")({
  component: GerenciamentoAssetran,
  // Permite que uma notificação (solicitação de complementação) leve direto ao requerimento
  // correspondente, sem precisar de uma segunda central — mesmo padrão já usado em
  // `servidor.pagamentos.enviar.tsx` (`?competencia=...`).
  validateSearch: (search: Record<string, unknown>): { requerimento?: string } => ({
    requerimento: typeof search.requerimento === "string" ? search.requerimento : undefined,
  }),
});

/** Último requerimento/solicitação da GERDAB para este beneficiário (por matrícula) — coluna
 *  separada do status cadastral, para a associação acompanhar o andamento sem abrir a ficha. */
function ultimoRequerimento(matricula: string) {
  const doServidor = requerimentos.filter((r) => r.matricula === matricula);
  return doServidor[doServidor.length - 1];
}

function GerenciamentoAssetran() {
  const navigate = useNavigate();
  const search = Route.useSearch();
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

  // Requerimentos enviados pela própria associação (Nova Inclusão nesta rodada) — superfície de
  // acompanhamento dedicada, já que nem todo requerimento tem um beneficiário cadastrado ainda
  // (`/associacao/gerenciamento/$id` não serve para uma Nova Inclusão ainda não aprovada). Quando
  // `beneficiarioId` estiver preenchido (beneficiário já existente), o mesmo requerimento também
  // poderá aparecer na aba "Requerimentos" da ficha — arquitetura já preparada para isso, não
  // implementada nesta rodada por não haver, ainda, nenhum requerimento desse tipo gerado.
  const [refreshKey, setRefreshKey] = useState(0);
  // Exemplo permanente (idempotente) — mesma chamada feita em `admin.requerimentos.tsx`, aqui
  // também para não depender de qual lado (Associação ou GERDAB) é aberto primeiro.
  useEffect(() => {
    garantirRequerimentoAssociacaoExemplo();
    setRefreshKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const requerimentosAssoc = useMemo(() => listarRequerimentosAssociacao("Assetran"), [refreshKey]);
  const [reqAberto, setReqAberto] = useState<RequerimentoAssociacao | null>(
    () => requerimentosAssoc.find((r) => r.id === search.requerimento) ?? null,
  );

  const notificacoes = useMemo(() => getNotificacoesAssociacao("Assetran"), [refreshKey]);

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

      {requerimentosAssoc.length > 0 && (
        <section className="bg-card rounded-xl border border-border shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Requerimentos Enviados</h2>
          </div>
          <div className="space-y-2">
            {requerimentosAssoc.map((r) => {
              const status = statusAtualRequerimento(r);
              const versao = versaoVigenteRequerimento(r);
              const pendenteDeAcao = status === "aguardando_complementacao";
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap ${
                    pendenteDeAcao ? "border-warning/40 bg-warning/5" : "border-border"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tipoRequerimentoAssociacaoLabels[r.tipo]} — {r.beneficiarioNome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em {new Date(r.criadoEm).toLocaleDateString("pt-BR")}
                      {r.versoes.length > 1 && ` • versão ${versao.versao}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RequerimentoAssociacaoStatusBadge status={status} />
                    <button
                      onClick={() => setReqAberto(r)}
                      className={`text-xs rounded-md px-3 py-1.5 inline-flex items-center gap-1.5 ${
                        pendenteDeAcao
                          ? "bg-primary text-primary-foreground hover:bg-primary-light"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {pendenteDeAcao ? <Send className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {pendenteDeAcao ? "Enviar Complemento" : "Ver detalhes"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {reqAberto && (
        <DetalheRequerimentoModal
          requerimento={reqAberto}
          onFechar={() => setReqAberto(null)}
          onComplementado={() => {
            setRefreshKey((k) => k + 1);
            setReqAberto(null);
          }}
        />
      )}

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
                    <td className="px-4 py-3">{s.operadora || "—"}</td>
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

/**
 * Acompanhamento de um requerimento enviado pela Associação, incluindo o envio de documentação
 * complementar — mesmo padrão visual/estrutural já usado no histórico de versões de Planilhas
 * (`HistoricoVersoesModal`, `associacao.upload.tsx`): histórico completo, nunca reescreve versão
 * anterior. A complementação nunca cria um novo requerimento — é sempre uma nova versão do
 * mesmo `id`, e ao ser enviada o status já recalcula sozinho para "Pendente de Validação"
 * (`complementarRequerimentoAssociacao`/`statusAtualRequerimento`).
 */
function DetalheRequerimentoModal({
  requerimento,
  onFechar,
  onComplementado,
}: {
  requerimento: RequerimentoAssociacao;
  onFechar: () => void;
  onComplementado: () => void;
}) {
  const [descricaoComplemento, setDescricaoComplemento] = useState("");
  const status = statusAtualRequerimento(requerimento);
  const versao = versaoVigenteRequerimento(requerimento);
  const pendenteDeAcao = status === "aguardando_complementacao";

  function enviarComplemento() {
    if (!descricaoComplemento.trim()) return;
    complementarRequerimentoAssociacao(requerimento.id, {
      resumo: `Complemento enviado: ${descricaoComplemento.trim()}`,
      documentos: [{ nome: descricaoComplemento.trim(), categoria: "complemento" }],
    });
    onComplementado();
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
          <div>
            <h2 className="font-semibold">
              {tipoRequerimentoAssociacaoLabels[requerimento.tipo]} — {requerimento.beneficiarioNome}
            </h2>
            <p className="text-xs text-muted-foreground">
              Enviado em {new Date(requerimento.criadoEm).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <button onClick={onFechar} className="p-1 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <RequerimentoAssociacaoStatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              Versão {versao.versao} de {requerimento.versoes.length}
            </span>
          </div>

          {pendenteDeAcao && versao.decisao?.justificativa && (
            <div className="pendency-banner">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                <strong>GERDAB solicitou documentação complementar:</strong> {versao.decisao.justificativa}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Histórico das movimentações
            </p>
            <ul className="space-y-2">
              {requerimento.versoes.map((v) => (
                <li key={v.versao} className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-1">
                  <p className="font-medium">
                    Versão {v.versao} — enviada em {new Date(v.enviadoEm).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-muted-foreground">{v.resumo}</p>
                  {v.decisao ? (
                    <p>
                      {statusRequerimentoAssociacaoLabels[v.decisao.status]} em{" "}
                      {new Date(v.decisao.decididoEm).toLocaleString("pt-BR")} por {v.decisao.decididoPor}
                      {v.decisao.justificativa && ` — "${v.decisao.justificativa}"`}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">Aguardando decisão da GERDAB.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {pendenteDeAcao && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Anexar documentação complementar
              </p>
              <UploadBox />
              <textarea
                value={descricaoComplemento}
                onChange={(e) => setDescricaoComplemento(e.target.value)}
                rows={2}
                placeholder="Descreva o documento anexado (ex: Certidão de nascimento atualizada)…"
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background"
              />
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
          <button onClick={onFechar} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
            Fechar
          </button>
          {pendenteDeAcao && (
            <button
              onClick={enviarComplemento}
              disabled={!descricaoComplemento.trim()}
              className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> Enviar Complemento
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

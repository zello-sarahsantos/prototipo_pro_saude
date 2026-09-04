import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Lock, Unlock, ExternalLink, Info, X, Building2 } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { formatCurrency } from "@/lib/mock-data";
import {
  competenciasParaFechamento,
  formatCompetencia,
  getRegistrosFechamento,
  getResumoFechamento,
  podeFecharCompetencia,
  statusComprovanteLabels,
  type ClassificacaoFechamento,
  type RegistroFechamento,
} from "@/lib/fechamento-pagamento";
import {
  getFechamentoPagamento,
  salvarFechamentoPagamento,
  getObservacaoNurfi,
  salvarObservacaoNurfi,
} from "@/lib/prosaude-storage";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";
import { PlanilhaStatusBadge } from "@/components/PlanilhaStatusBadge";
import type { StatusPlanilhaAssociacao } from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/admin/relatorios/pagamentos")({
  component: FechamentoDePagamento,
});

type FiltroVinculo = "todos" | "ativo" | "inativo";

const situacaoVinculoLabel: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  pendente_documentacao: "Pendente de documentação",
};

function BadgeVinculo({ situacao }: { situacao: string }) {
  const tone =
    situacao === "ativo"
      ? "bg-status-aprovado-bg text-status-aprovado-fg"
      : situacao === "inativo"
        ? "bg-status-inativo-bg text-status-inativo-fg"
        : "bg-status-analise-bg text-status-analise-fg";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {situacaoVinculoLabel[situacao] ?? situacao}
    </span>
  );
}

function tempoAguardando(dataIso?: string): string {
  if (!dataIso) return "—";
  const dias = Math.max(0, Math.floor((Date.now() - new Date(dataIso).getTime()) / (1000 * 60 * 60 * 24)));
  if (dias === 0) return "Hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function FechamentoDePagamento() {
  const role = getAdminRole();
  const isGerencia = role === "gerencia";
  const fechadoPorReferencia = isGerencia ? "Erandir / Gerência" : "Rebeca / Luciana";

  const [competencia, setCompetencia] = useState(
    competenciasParaFechamento[competenciasParaFechamento.length - 1],
  );
  const [tab, setTab] = useState<ClassificacaoFechamento>("adimplente");
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>("todos");
  const [obsRascunho, setObsRascunho] = useState<Record<string, string>>({});
  const [, forceUpdate] = useState(0);
  // Detalhe de origem da comprovação (P7) — só relevante para registros vindos de planilha de
  // associação aprovada; nunca vira coluna nova na tabela nem na exportação NURFI.
  const [origemDetalhe, setOrigemDetalhe] = useState<RegistroFechamento | null>(null);

  const registros = useMemo(() => getRegistrosFechamento(competencia), [competencia]);
  const resumo = useMemo(() => getResumoFechamento(competencia), [competencia]);
  const podeFechar = useMemo(() => podeFecharCompetencia(competencia), [competencia]);
  const fechamento = getFechamentoPagamento(competencia);

  const registrosFiltrados = useMemo(
    () =>
      registros
        .filter((r) => r.classificacao === tab)
        .filter((r) => filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo),
    [registros, tab, filtroVinculo],
  );

  // Exportação (PDF/XLSX) — uma spec por aba, já que cada classificação tem colunas próprias
  // (não força Adimplentes/Inadimplentes/Requer análise a compartilhar uma tabela genérica).
  // Reaproveita exatamente `registrosFiltrados` (mesmo dado da tela, já com o filtro de
  // Vínculo aplicado) — nenhuma consulta/agregação nova só para exportar.
  const filtrosAplicados = filtroVinculo !== "todos" ? [`Vínculo: ${filtroVinculo === "ativo" ? "Ativos" : "Inativos"}`] : [];
  const competenciaLabel = formatCompetencia(competencia);

  const specAdimplentes: RelatorioExportSpec<RegistroFechamento> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Adimplentes",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "CPF", valor: (r) => r.cpf ?? "—", tipo: "texto" },
        { header: "Nome", valor: (r) => r.nome, tipo: "texto", width: 26 },
        { header: "Situação do Vínculo", valor: (r) => situacaoVinculoLabel[r.situacaoVinculo] ?? r.situacaoVinculo, tipo: "texto" },
        { header: "Competência de Referência", valor: () => competenciaLabel, tipo: "texto" },
        { header: "Valor Aprovado", valor: (r) => r.valor, tipo: "moeda" },
      ],
      linhas: registros.filter((r) => r.classificacao === "adimplente" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo)),
      nomeArquivoBase: `pro-saude_fechamento_pagamento_adimplentes_${competencia}`,
    }),
    [registros, filtroVinculo, competencia, competenciaLabel, filtrosAplicados],
  );

  const specInadimplentes: RelatorioExportSpec<RegistroFechamento> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Inadimplentes",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "CPF", valor: (r) => r.cpf ?? "—", tipo: "texto" },
        { header: "Nome", valor: (r) => r.nome, tipo: "texto", width: 26 },
        { header: "Valor Relacionado à Competência", valor: (r) => r.valor, tipo: "moeda" },
        { header: "Situação", valor: (r) => r.situacao ?? "—", tipo: "texto" },
        { header: "Motivo", valor: (r) => r.motivo ?? "—", tipo: "texto", width: 34 },
        {
          header: "Observação NURFI",
          valor: (r) => getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ?? "",
          tipo: "texto",
          width: 30,
        },
      ],
      linhas: registros.filter((r) => r.classificacao === "inadimplente" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo)),
      nomeArquivoBase: `pro-saude_fechamento_pagamento_inadimplentes_${competencia}`,
    }),
    [registros, filtroVinculo, competencia, competenciaLabel, filtrosAplicados],
  );

  const specRequerAnalise: RelatorioExportSpec<RegistroFechamento> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Requer Análise",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "CPF", valor: (r) => r.cpf ?? "—", tipo: "texto" },
        { header: "Servidor", valor: (r) => r.nome, tipo: "texto", width: 26 },
        { header: "Competência", valor: (r) => formatCompetencia(r.competencia), tipo: "texto" },
        {
          header: "Pendência/Motivo",
          valor: (r) => (r.statusComprovante ? statusComprovanteLabels[r.statusComprovante] : "—"),
          tipo: "texto",
          width: 26,
        },
        { header: "Tempo Aguardando", valor: (r) => tempoAguardando(r.ultimaAcaoEm), tipo: "texto" },
      ],
      linhas: registros.filter((r) => r.classificacao === "requer_analise" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo)),
      nomeArquivoBase: `pro-saude_fechamento_pagamento_requer_analise_${competencia}`,
    }),
    [registros, filtroVinculo, competencia, competenciaLabel, filtrosAplicados],
  );

  const specAtual = tab === "adimplente" ? specAdimplentes : tab === "inadimplente" ? specInadimplentes : specRequerAnalise;

  function irParaAba(c: ClassificacaoFechamento) {
    setTab(c);
    setFiltroVinculo("todos");
  }

  function salvarObservacao(r: RegistroFechamento) {
    const texto = obsRascunho[r.beneficiarioId] ?? getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ?? "";
    salvarObservacaoNurfi(r.beneficiarioId, competencia, texto, fechadoPorReferencia);
    forceUpdate((n) => n + 1);
  }

  function fecharCompetencia() {
    salvarFechamentoPagamento(competencia, fechadoPorReferencia);
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fechamento de Pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Consolidação operacional da competência, conferência da GERDAB e geração do relatório
            para o NURFI — nasce dos dados do Módulo de Pagamento, não de uma nova apuração.
          </p>
        </div>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">Competência</span>
          <select
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-card text-sm"
          >
            {competenciasParaFechamento.map((c) => (
              <option key={c} value={c}>
                {formatCompetencia(c)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* Nota de escopo do protótipo — sem esconder a limitação de dados */}
      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
        O cenário de dados do Módulo de Pagamento hoje cobre 1 grupo familiar (1 servidor
        titular) — os números abaixo são pequenos porque são <strong>reais</strong>, nunca
        inflados para parecer um volume maior. Expandir a base de dados para múltiplos
        servidores é um passo já previsto no plano (etapa "Base de dados necessária"), separado
        desta etapa.
      </div>

      {/* Cabeçalho/resumo — cada número é clicável e leva à aba/lista correspondente (rastreabilidade) */}
      <section className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Total processado</p>
            <p className="text-2xl font-bold">{resumo.total}</p>
          </div>
          <button onClick={() => irParaAba("adimplente")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Adimplentes</p>
            <p className="text-2xl font-bold text-status-aprovado-fg">{resumo.adimplentes}</p>
          </button>
          <button onClick={() => irParaAba("inadimplente")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
            <p className="text-2xl font-bold text-status-rejeitado-fg">{resumo.inadimplentes}</p>
          </button>
          <button onClick={() => irParaAba("requer_analise")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Requerem análise</p>
            <p className="text-2xl font-bold text-status-pendente-fg">{resumo.requerAnalise}</p>
          </button>
          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">Valor a pagar (Adimplentes)</p>
            <p className="text-2xl font-bold">{formatCurrency(resumo.valorTotalAdimplentes)}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          {fechamento ? (
            <span className="inline-flex items-center gap-2 text-sm text-status-aprovado-fg font-medium">
              <Lock className="h-4 w-4" /> Competência fechada em{" "}
              {new Date(fechamento.fechadoEm).toLocaleDateString("pt-BR")} por {fechamento.fechadoPor}
            </span>
          ) : (
            <>
              <button
                onClick={fecharCompetencia}
                disabled={!podeFechar}
                title={
                  podeFechar
                    ? undefined
                    : "Existem registros em 'Requer análise' — trate-os antes de fechar a competência."
                }
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
              >
                <Unlock className="h-4 w-4" /> Fechar competência
              </button>
              {!podeFechar && (
                <p className="text-xs text-muted-foreground">
                  Bloqueado: {resumo.requerAnalise} registro(s) ainda em "Requer análise" (regra a
                  confirmar com a stakeholder — ver docs/MODULO_RELATORIOS.md).
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Abas */}
      <div className="flex items-center justify-between gap-2 border-b border-border">
        <div className="flex gap-1">
          {(
            [
              ["adimplente", "Adimplentes", resumo.adimplentes],
              ["inadimplente", "Inadimplentes", resumo.inadimplentes],
              ["requer_analise", "Requer análise", resumo.requerAnalise],
            ] as [ClassificacaoFechamento, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => irParaAba(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <ExportarRelatorio spec={specAtual} />
      </div>

      {/* Filtro Todos | Ativos | Inativos */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-muted-foreground">Vínculo:</span>
        {(["todos", "ativo", "inativo"] as FiltroVinculo[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltroVinculo(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filtroVinculo === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
          </button>
        ))}
      </div>

      {/* Tabelas por aba */}
      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        {tab === "adimplente" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">CPF</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Situação do vínculo</th>
                <th className="text-left px-4 py-2">Competência de referência</th>
                <th className="text-left px-4 py-2">
                  Competência de pagamento{" "}
                  <span className="text-[10px] font-normal">(a validar)</span>
                </th>
                <th className="text-right px-4 py-2">Valor aprovado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => (
                <tr key={r.beneficiarioId} className="border-t border-border">
                  <td className="px-4 py-2">{r.cpf ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2">
                    <BadgeVinculo situacao={r.situacaoVinculo} />
                  </td>
                  <td className="px-4 py-2">{formatCompetencia(r.competencia)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatCompetencia(r.competencia)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-status-aprovado-fg" />
                      {r.origem === "associacao" && (
                        <button
                          onClick={() => setOrigemDetalhe(r)}
                          title="Ver origem da comprovação"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum registro adimplente para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "inadimplente" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">CPF</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-right px-4 py-2">
                  Valor relacionado à competência <span className="text-[10px] font-normal">(a validar)</span>
                </th>
                <th className="text-left px-4 py-2">Situação</th>
                <th className="text-left px-4 py-2">Motivo</th>
                <th className="text-left px-4 py-2">Observação NURFI</th>
                <th className="text-center px-4 py-2">QT (a validar)</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r, i) => (
                <tr key={r.beneficiarioId} className="border-t border-border align-top">
                  <td className="px-4 py-2">{r.cpf ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-rejeitado-bg text-status-rejeitado-fg">
                      {r.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-[220px]">{r.motivo}</td>
                  <td className="px-4 py-2 min-w-[220px]">
                    <textarea
                      rows={2}
                      placeholder="Complemento excepcional para o NURFI (opcional)"
                      value={
                        obsRascunho[r.beneficiarioId] ??
                        getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ??
                        ""
                      }
                      onChange={(e) =>
                        setObsRascunho((prev) => ({ ...prev, [r.beneficiarioId]: e.target.value }))
                      }
                      onBlur={() => salvarObservacao(r)}
                      className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background"
                    />
                  </td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{i + 1}</td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum registro inadimplente para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "requer_analise" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">CPF</th>
                <th className="text-left px-4 py-2">Servidor</th>
                <th className="text-left px-4 py-2">Competência</th>
                <th className="text-left px-4 py-2">Pendência/Motivo</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Tempo aguardando</th>
                <th className="px-4 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => (
                <tr key={r.beneficiarioId} className="border-t border-border">
                  <td className="px-4 py-2">{r.cpf ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2">{formatCompetencia(r.competencia)}</td>
                  <td className="px-4 py-2 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-status-pendente-fg" />
                    {r.statusComprovante ? statusComprovanteLabels[r.statusComprovante] : "—"}
                  </td>
                  <td className="px-4 py-2">{r.statusComprovante ? statusComprovanteLabels[r.statusComprovante] : "—"}</td>
                  <td className="px-4 py-2">{tempoAguardando(r.ultimaAcaoEm)}</td>
                  <td className="px-4 py-2">
                    <a
                      href="/admin/comprovantes"
                      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                    >
                      Resolver <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" /> Nenhum registro requerendo análise nesta competência.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Detalhe de origem da comprovação (P7) — drill-down, nunca coluna nova na tabela nem na
          exportação NURFI. Só aberto para registros com origem "associacao". */}
      {origemDetalhe?.origemAssociacao && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Origem da Comprovação
                </h2>
                <p className="text-xs text-muted-foreground">{origemDetalhe.nome}</p>
              </div>
              <button onClick={() => setOrigemDetalhe(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <dl className="p-6 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Associação</dt>
                <dd className="font-medium">{origemDetalhe.origemAssociacao.associacao}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Competência</dt>
                <dd className="font-medium">{formatCompetencia(origemDetalhe.origemAssociacao.competencia)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Planilha / envio de origem</dt>
                <dd className="font-medium font-mono text-xs">{origemDetalhe.origemAssociacao.planilhaId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status da análise da planilha</dt>
                <dd className="mt-1">
                  <PlanilhaStatusBadge status={origemDetalhe.origemAssociacao.statusPlanilha as StatusPlanilhaAssociacao} />
                </dd>
              </div>
            </dl>
            <footer className="px-6 py-4 border-t border-border flex justify-end">
              <button
                onClick={() => setOrigemDetalhe(null)}
                className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted"
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

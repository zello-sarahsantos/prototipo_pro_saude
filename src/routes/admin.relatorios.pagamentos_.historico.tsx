import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, FileClock } from "lucide-react";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { montarSpecFechamentoSnapshot } from "@/lib/fechamento-export";
import { getHistoricoFechamentos } from "@/lib/fechamento-pagamento";
import type { SnapshotFechamentoPagamento } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/admin/relatorios/pagamentos_/historico")({
  component: HistoricoFechamentos,
});

type FiltroVinculo = "todos" | "ativo" | "inativo";

/**
 * **Histórico** do Fechamento de Pagamento (Fase 10) — separado do Histórico do Ressarcimento
 * Retroativo (`/admin/relatorios/consolidacoes`), que continua onde está, sem alteração. Cada
 * relatório é um snapshot IMUTÁVEL (ver `gerarRelatorioFechamento`, `fechamento-pagamento.ts`):
 * consultar depois nunca recalcula com dados atuais. Só entram aqui registros já decididos
 * (Adimplente/Inadimplente) — "Requer análise" nunca aparece num relatório gerado.
 */
function HistoricoFechamentos() {
  const [aberto, setAberto] = useState<string | null>(null);
  const snapshots = useMemo(() => getHistoricoFechamentos(), []);
  const snap = snapshots.find((s) => s.id === aberto);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Histórico — Fechamento de Pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Cada relatório gerado para o NURFI, exatamente como foi gerado — nunca recalculado.
          </p>
        </div>
        <Link to="/admin/relatorios/pagamentos" className="text-sm text-primary hover:underline shrink-0">
          Voltar ao Fechamento de Pagamento
        </Link>
      </header>

      {snap ? (
        <Detalhe snap={snap} onVoltar={() => setAberto(null)} />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Relatório</th>
                <th className="text-left px-4 py-2">Competência</th>
                <th className="text-left px-4 py-2">Gerado em</th>
                <th className="text-left px-4 py-2">Responsável</th>
                <th className="text-right px-4 py-2">Adimplentes</th>
                <th className="text-right px-4 py-2">Inadimplentes</th>
                <th className="text-right px-4 py-2">Valor total (Adimplentes)</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => {
                const adimplentes = s.linhas.filter((l) => l.classificacao === "adimplente");
                const inadimplentes = s.linhas.filter((l) => l.classificacao === "inadimplente");
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">Relatório nº {s.sequencia}</td>
                    <td className="px-4 py-2.5">{formatCompetencia(s.competencia)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(s.geradoEm).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5">{s.responsavel}</td>
                    <td className="px-4 py-2.5 text-right">{adimplentes.length}</td>
                    <td className="px-4 py-2.5 text-right">{inadimplentes.length}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatCurrency(adimplentes.reduce((t, l) => t + l.valorRessarcir, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setAberto(s.id)}
                        className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted"
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {snapshots.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <FileClock className="h-4 w-4" /> Nenhum relatório gerado ainda.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detalhe({ snap, onVoltar }: { snap: SnapshotFechamentoPagamento; onVoltar: () => void }) {
  const [aba, setAba] = useState<"adimplente" | "inadimplente">("adimplente");
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>("todos");

  const linhasDaAba = snap.linhas
    .filter((l) => l.classificacao === aba)
    .filter((l) => filtroVinculo === "todos" || l.situacaoVinculo === filtroVinculo);

  const filtrosAplicados = [
    `Relatório nº ${snap.sequencia} — ${formatCompetencia(snap.competencia)}`,
    `Gerado em ${new Date(snap.geradoEm).toLocaleString("pt-BR")} por ${snap.responsavel}`,
    ...(filtroVinculo !== "todos" ? [`Vínculo: ${filtroVinculo === "ativo" ? "Ativos" : "Inativos"}`] : []),
  ];
  const spec = montarSpecFechamentoSnapshot({
    linhas: snap.linhas.filter((l) => filtroVinculo === "todos" || l.situacaoVinculo === filtroVinculo),
    classificacao: aba,
    competencia: snap.competencia,
    sequencia: snap.sequencia,
    filtrosAplicados,
    nomeArquivoBase: `pro-saude_fechamento_pagamento_${snap.competencia}_n${snap.sequencia}_${aba === "adimplente" ? "adimplentes" : "inadimplentes"}`,
  });

  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Histórico
      </button>
      <p className="text-sm text-muted-foreground">
        Relatório nº {snap.sequencia} — {formatCompetencia(snap.competencia)} · snapshot imutável, exatamente como
        foi gerado em {new Date(snap.geradoEm).toLocaleString("pt-BR")} por {snap.responsavel}.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["adimplente", "inadimplente"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setAba(c)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                aba === c ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "adimplente" ? "Adimplentes" : "Inadimplentes"} ({snap.linhas.filter((l) => l.classificacao === c).length})
            </button>
          ))}
        </div>
        <ExportarRelatorio spec={spec} />
      </div>

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

      <section className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Matrícula</th>
              <th className="text-left px-4 py-2">Nome</th>
              <th className="text-left px-4 py-2">Operadora/Associação</th>
              <th className="text-right px-4 py-2">Valor do Plano</th>
              <th className="text-right px-4 py-2">Valor a Ressarcir</th>
              {aba === "inadimplente" && <th className="text-left px-4 py-2">Situação/Motivo</th>}
              <th className="text-left px-4 py-2">Observação NURFI</th>
            </tr>
          </thead>
          <tbody>
            {linhasDaAba.map((l) => (
              <tr key={l.beneficiarioId} className="border-t border-border">
                <td className="px-4 py-2">{l.matricula ?? "—"}</td>
                <td className="px-4 py-2 font-medium">{l.nome}</td>
                <td className="px-4 py-2">{l.operadoraOuAssociacao}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(l.valor)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.valorRessarcir)}</td>
                {aba === "inadimplente" && (
                  <td className="px-4 py-2 text-muted-foreground">
                    {l.situacao ? `${l.situacao} — ${l.motivo ?? ""}` : "—"}
                  </td>
                )}
                <td className="px-4 py-2 text-muted-foreground">{l.observacaoNurfi ?? "—"}</td>
              </tr>
            ))}
            {linhasDaAba.length === 0 && (
              <tr>
                <td colSpan={aba === "inadimplente" ? 7 : 6} className="px-4 py-6 text-center text-muted-foreground">
                  Sem registros nesta classificação/filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

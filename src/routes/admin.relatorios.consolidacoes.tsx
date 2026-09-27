import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import { RetroativosNav } from "@/components/RetroativosNav";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { garantirMassaDemonstracaoRetroativos } from "@/lib/massa-demonstracao";
import { montarSpecConsolidacao } from "@/lib/consolidacao-export";
import { getSnapshotsConsolidacao } from "@/lib/retroativo-fluxo";
import type { SnapshotConsolidacaoRetroativo } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/admin/relatorios/consolidacoes")({
  component: HistoricoConsolidacoes,
});

/**
 * **Histórico** do Ressarcimento Retroativo (consolidações) — separado da fila operacional. Cada consolidação é um
 * snapshot IMUTÁVEL (ciclo, data/hora, responsável, matrícula, valores, observações): consultar
 * depois nunca recalcula com dados atuais (mudanças de cadastro, plano, apuração ou decisão não
 * alteram o que foi consolidado). PDF e XLSX saem do mesmo snapshot, pela mesma `RelatorioExportSpec`.
 */
function HistoricoConsolidacoes() {
  const [versao, setVersao] = useState(0);
  const [aberto, setAberto] = useState<string | null>(null);
  const [aba, setAba] = useState<"ativo" | "inativo">("ativo");

  // DEMONSTRAÇÃO DO PROTÓTIPO: semeadura única da massa simulada (ver `massa-demonstracao.ts`).
  useEffect(() => {
    garantirMassaDemonstracaoRetroativos();
    setVersao((v) => v + 1);
  }, []);

  const snapshots = useMemo(() => getSnapshotsConsolidacao(), [versao]);
  const snap = snapshots.find((s) => s.id === aberto);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Ressarcimento Retroativo</h1>
        <p className="text-sm text-muted-foreground">Histórico: cada relatório gerado para o NURFI, exatamente como foi gerado — não recalculado.</p>
      </header>
      <RetroativosNav ativa="historico" />
      {snap ? <Detalhe snap={snap} aba={aba} setAba={setAba} onVoltar={() => setAberto(null)} /> : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Relatório</th>
                <th className="text-left px-4 py-2">Ciclo</th>
                <th className="text-left px-4 py-2">Gerado em</th>
                <th className="text-left px-4 py-2">Responsável</th>
                <th className="text-right px-4 py-2">Competências</th>
                <th className="text-right px-4 py-2">Total a ressarcir</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">Relatório nº {s.sequencia}</td>
                  <td className="px-4 py-2.5">{formatCompetencia(s.ciclo)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(s.geradoEm).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">{s.responsavel}</td>
                  <td className="px-4 py-2.5 text-right">{s.linhas.length}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(s.linhas.reduce((t, l) => t + l.valorRessarcir, 0))}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setAberto(s.id)} className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted">Visualizar</button>
                  </td>
                </tr>
              ))}
              {snapshots.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum relatório gerado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detalhe({ snap, aba, setAba, onVoltar }: { snap: SnapshotConsolidacaoRetroativo; aba: "ativo" | "inativo"; setAba: (a: "ativo" | "inativo") => void; onVoltar: () => void }) {
  const spec = montarSpecConsolidacao({
    linhas: snap.linhas,
    grupo: aba,
    filtrosAplicados: [`Relatório nº ${snap.sequencia} — ciclo ${formatCompetencia(snap.ciclo)}`, `Gerada em ${new Date(snap.geradoEm).toLocaleString("pt-BR")} por ${snap.responsavel}`],
    nomeArquivoBase: `pro-saude_ressarcimento_retroativo_consolidacao_${snap.ciclo}_n${snap.sequencia}_${aba === "ativo" ? "ativos" : "inativos"}`,
  });
  const linhas = snap.linhas.filter((l) => l.grupo === aba);
  const total = linhas.reduce((t, l) => t + l.valorRessarcir, 0);
  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Voltar ao Histórico</button>
      <p className="text-sm text-muted-foreground">
        Relatório nº {snap.sequencia} — {formatCompetencia(snap.ciclo)} · snapshot imutável, exatamente como foi gerado em {new Date(snap.geradoEm).toLocaleString("pt-BR")} por {snap.responsavel}.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["ativo", "inativo"] as const).map((g) => (
            <button key={g} onClick={() => setAba(g)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${aba === g ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {g === "ativo" ? "Ativos" : "Inativos"} ({snap.linhas.filter((l) => l.grupo === g).length})
            </button>
          ))}
        </div>
        <ExportarRelatorio spec={spec} />
      </div>
      <section className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Matrícula</th>
              <th className="text-left px-4 py-2">Nome</th>
              <th className="text-left px-4 py-2">Mês/Ano Pagamento</th>
              <th className="text-right px-4 py-2">Valor Pago</th>
              <th className="text-right px-4 py-2">Valor Devido</th>
              <th className="text-right px-4 py-2">Valor a ser Ressarcido</th>
              <th className="text-left px-4 py-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.solicitacaoId}-${l.competenciaReferencia}`} className="border-t border-border">
                <td className="px-4 py-2">{l.matricula}</td>
                <td className="px-4 py-2 font-medium">{l.nome}</td>
                <td className="px-4 py-2">{formatCompetencia(l.mesAnoPagamento)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(l.valorPago)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(l.valorDevido)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.valorRessarcir)}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.observacao}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Sem registros neste grupo.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="text-sm">Total do grupo: <span className="font-semibold">{formatCurrency(total)}</span> em {linhas.length} competência(s).</p>
    </div>
  );
}

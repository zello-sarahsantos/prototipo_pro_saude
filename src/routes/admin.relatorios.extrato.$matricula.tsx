import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import {
  beneficiariosPagamentoSeed,
  formatCompetencia,
  getExtratoServidor,
  statusComprovanteLabels,
} from "@/lib/fechamento-pagamento";
import { getBeneficiariosPagamentoAtual } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/admin/relatorios/extrato/$matricula")({
  component: ExtratoServidor,
});

function ExtratoServidor() {
  const { matricula } = Route.useParams();
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titular = beneficiarios.find((b) => b.parentesco === "Titular" && b.matricula === matricula);

  const extrato = useMemo(() => (titular ? getExtratoServidor(titular.id) : []), [titular?.id]);

  if (!titular) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-4">
        <Link to="/admin/relatorios/extrato" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Histórico de Comprovações
        </Link>
        <p className="text-sm text-muted-foreground">
          Nenhum servidor encontrado com a matrícula "{matricula}". No cenário atual do Módulo de
          Pagamento, o único servidor titular disponível é a matrícula{" "}
          {beneficiariosPagamentoSeed.find((b) => b.parentesco === "Titular")?.matricula}.
        </p>
      </div>
    );
  }

  const valorAprovadoNoPeriodo = extrato.reduce((soma, l) => soma + l.valor, 0);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <Link to="/admin/relatorios/extrato" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para Histórico de Comprovações
      </Link>

      <header>
        <p className="text-xs text-muted-foreground mb-1">
          Relatórios → Histórico de Comprovações → Extrato Individual
        </p>
        <h1 className="text-2xl font-bold">Extrato do Servidor</h1>
        <p className="text-sm text-muted-foreground">
          {titular.nome} — matrícula {titular.matricula} — histórico individual de comprovações
          apresentadas e analisadas ao longo das competências, sem afirmar pagamento em folha.
          Visão distinta do Fechamento de Pagamento (coletiva, por competência) e do Comprovante
          de Rendimentos (consolidado anual — funcionalidade exclusiva do Portal do Servidor, ver
          docs/MODULO_RELATORIOS.md).
        </p>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 flex flex-wrap gap-8">
        <div>
          <p className="text-xs text-muted-foreground">Competências no histórico</p>
          <p className="text-2xl font-bold">{extrato.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valor aprovado no período</p>
          <p className="text-2xl font-bold">{formatCurrency(valorAprovadoNoPeriodo)}</p>
        </div>
      </div>

      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Ano</th>
              <th className="text-left px-4 py-2">Competência</th>
              <th className="text-left px-4 py-2">Comprovação aprovada?</th>
              <th className="text-right px-4 py-2">Valor aprovado</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Ocorrência</th>
            </tr>
          </thead>
          <tbody>
            {extrato.map((linha) => (
              <tr key={linha.competencia} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">{linha.ano}</td>
                <td className="px-4 py-2 font-medium">{formatCompetencia(linha.competencia)}</td>
                <td className="px-4 py-2">
                  {linha.houvePagamento ? (
                    <CheckCircle2 className="h-4 w-4 text-status-aprovado-fg" />
                  ) : (
                    <XCircle className="h-4 w-4 text-status-rejeitado-fg" />
                  )}
                </td>
                <td className="px-4 py-2 text-right">{linha.valor > 0 ? formatCurrency(linha.valor) : "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {linha.statusComprovante ? statusComprovanteLabels[linha.statusComprovante] : "Sem envio"}
                </td>
                <td className="px-4 py-2">
                  {linha.ocorrenciaRetroativo && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-analise-fg">
                      <RefreshCcw className="h-3 w-3" /> Retroativo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

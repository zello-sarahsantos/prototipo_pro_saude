import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCcw, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import {
  formatCompetencia,
  getExtratoPorCpf,
  getTitularConsolidadoPorCpf,
  statusComprovanteLabels,
} from "@/lib/fechamento-pagamento";
import { statusPlanilhaLabels } from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/admin/relatorios/extrato/$cpf")({
  component: ExtratoServidor,
});

/**
 * Extrato Individual (HU04) — identificado por **CPF** (não mais matrícula), já que o Histórico
 * de Comprovações consolida titulares de duas origens (comprovação individual e planilha de
 * associação aprovada) e planilha de associação não tem matrícula. `getExtratoPorCpf` reaproveita
 * `getExtratoServidor` (origem individual) e os mesmos dados de associação já usados no
 * Fechamento de Pagamento — nenhum motor de classificação novo.
 *
 * Rastreabilidade da origem (P7, mesmo padrão já usado no Fechamento): cada linha carrega
 * `origem`/`origemAssociacao` — quando a comprovação daquela competência veio de planilha de
 * associação, o detalhe (Associação/Operadora/Situação da planilha) é exibido; nenhum dado é
 * inventado além do que já existe em `origemAssociacao`.
 */
function ExtratoServidor() {
  const { cpf } = Route.useParams();
  const titular = useMemo(() => getTitularConsolidadoPorCpf(cpf), [cpf]);
  const extrato = useMemo(() => (titular ? getExtratoPorCpf(cpf) : []), [titular, cpf]);

  if (!titular) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-4">
        <Link to="/admin/relatorios/extrato" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Histórico de Comprovações
        </Link>
        <p className="text-sm text-muted-foreground">
          Nenhum servidor encontrado com o CPF "{cpf}". Volte ao Histórico de Comprovações e
          acesse o extrato a partir da listagem.
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
          {titular.nome} — CPF {titular.cpf}
          {titular.matricula ? ` — matrícula ${titular.matricula}` : ""} — histórico individual de
          comprovações apresentadas e analisadas ao longo das competências.
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
              <th className="text-left px-4 py-2">Origem</th>
              <th className="text-left px-4 py-2">Ocorrência</th>
            </tr>
          </thead>
          <tbody>
            {extrato.map((linha) => (
              <tr key={linha.competencia} className="border-t border-border align-top">
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
                  {linha.origemAssociacao ? (
                    <div className="space-y-0.5 text-xs">
                      <p className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Building2 className="h-3 w-3" /> Associação
                      </p>
                      <p className="text-muted-foreground">Associação: {linha.origemAssociacao.associacao}</p>
                      {linha.origemAssociacao.operadora && (
                        <p className="text-muted-foreground">Operadora: {linha.origemAssociacao.operadora}</p>
                      )}
                      <p className="text-muted-foreground">
                        Situação da planilha: {statusPlanilhaLabels[linha.origemAssociacao.statusPlanilha as keyof typeof statusPlanilhaLabels] ?? linha.origemAssociacao.statusPlanilha}
                      </p>
                    </div>
                  ) : linha.statusComprovante || linha.houvePagamento ? (
                    <span className="text-xs text-muted-foreground">Individual</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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

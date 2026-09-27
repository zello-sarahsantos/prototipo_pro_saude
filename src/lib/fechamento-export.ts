/**
 * Spec de exportação (PDF/XLSX) do Histórico do Fechamento de Pagamento — mesmo espírito de
 * `consolidacao-export.ts` (Retroativo): uma única `RelatorioExportSpec`, usada só pelo detalhe do
 * snapshot (Fase 10) — nenhuma engine nova. Distinto das specs analíticas já validadas na tela AO
 * VIVO (`admin.relatorios.pagamentos.tsx`, por integrante do grupo familiar): aqui a fonte é o
 * snapshot congelado (`LinhaFechamentoSnapshot`, uma linha por titular), não `RegistroFechamento`
 * — por isso uma spec própria, sem alterar as já validadas.
 */
import { formatCompetencia } from "./mock-data";
import type { RelatorioExportSpec } from "./relatorio-export";
import type { LinhaFechamentoSnapshot } from "./prosaude-storage";

export function montarSpecFechamentoSnapshot(params: {
  linhas: LinhaFechamentoSnapshot[];
  classificacao: "adimplente" | "inadimplente";
  competencia: string;
  sequencia: number;
  filtrosAplicados: string[];
  nomeArquivoBase: string;
}): RelatorioExportSpec<LinhaFechamentoSnapshot> {
  const rotulo = params.classificacao === "adimplente" ? "Adimplentes" : "Inadimplentes";
  const linhas = params.linhas.filter((l) => l.classificacao === params.classificacao);
  return {
    titulo: `Fechamento de Pagamento — Relatório nº ${params.sequencia} — ${rotulo}`,
    origem: "Relatórios",
    competencia: formatCompetencia(params.competencia),
    filtrosAplicados: params.filtrosAplicados,
    colunas: [
      { header: "Matrícula", valor: (l) => l.matricula ?? "—", tipo: "texto" },
      { header: "Nome", valor: (l) => l.nome, tipo: "texto", width: 26 },
      { header: "Operadora/Associação", valor: (l) => l.operadoraOuAssociacao, tipo: "texto", width: 20 },
      { header: "Valor do Plano", valor: (l) => l.valor, tipo: "moeda" },
      { header: "Valor a Ressarcir", valor: (l) => l.valorRessarcir, tipo: "moeda" },
      ...(params.classificacao === "inadimplente"
        ? ([
            { header: "Situação", valor: (l: LinhaFechamentoSnapshot) => l.situacao ?? "—", tipo: "texto" as const },
            { header: "Motivo", valor: (l: LinhaFechamentoSnapshot) => l.motivo ?? "—", tipo: "texto" as const, width: 30 },
          ])
        : []),
      { header: "Observação NURFI", valor: (l) => l.observacaoNurfi ?? "", tipo: "texto", width: 26 },
    ],
    linhas,
    nomeArquivoBase: params.nomeArquivoBase,
  };
}

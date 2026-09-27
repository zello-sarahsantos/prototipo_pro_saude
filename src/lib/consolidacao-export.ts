/**
 * Spec de exportação (PDF/XLSX) da Consolidação NURFI dos retroativos — colunas oficiais, uma linha
 * por competência. Usada pela pré-visualização da Consolidação e pelo snapshot do Histórico: ambos
 * passam pela MESMA `RelatorioExportSpec` (nenhuma engine nova), então tela = PDF = XLSX.
 */
import { formatCompetencia } from "./mock-data";
import type { RelatorioExportSpec } from "./relatorio-export";
import type { LinhaConsolidacaoRetroativo } from "./prosaude-storage";

export function montarSpecConsolidacao(params: {
  linhas: LinhaConsolidacaoRetroativo[];
  grupo: "ativo" | "inativo";
  filtrosAplicados: string[];
  nomeArquivoBase: string;
  tituloExtra?: string;
}): RelatorioExportSpec<LinhaConsolidacaoRetroativo> {
  const rotulo = params.grupo === "ativo" ? "Ativos" : "Inativos";
  return {
    titulo: `Ressarcimento Retroativo — Consolidação — ${rotulo}${params.tituloExtra ? ` (${params.tituloExtra})` : ""}`,
    origem: "Relatórios",
    filtrosAplicados: params.filtrosAplicados,
    colunas: [
      { header: "Matrícula", valor: (l) => l.matricula, tipo: "texto" },
      { header: "Nome", valor: (l) => l.nome, tipo: "texto", width: 26 },
      { header: "Mês/Ano Pagamento", valor: (l) => formatCompetencia(l.mesAnoPagamento), tipo: "texto", width: 18 },
      { header: "Valor Pago", valor: (l) => l.valorPago, tipo: "moeda" },
      { header: "Valor Devido", valor: (l) => l.valorDevido, tipo: "moeda" },
      { header: "Valor a ser Ressarcido", valor: (l) => l.valorRessarcir, tipo: "moeda" },
      { header: "Observação", valor: (l) => l.observacao, tipo: "texto", width: 44 },
    ],
    linhas: params.linhas.filter((l) => l.grupo === params.grupo),
    nomeArquivoBase: params.nomeArquivoBase,
  };
}

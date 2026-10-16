/**
 * Relatório NUPLA — Movimentações do Pró-Saúde. Monta as especificações de exportação (PDF/XLSX)
 * a partir da fonte única `movimentacoes-pro-saude.ts` (a mesma lida pelo Dashboard). Nenhuma
 * contagem é recalculada aqui: tela, PDF e Excel usam exatamente as mesmas linhas.
 *
 * Dois documentos: o relatório principal (8 categorias × 6 agrupamentos, com cabeçalho agrupado por
 * modalidade) e o detalhamento por bimestre (um bimestre ou todos).
 */
import type { RelatorioExportSpec } from "./relatorio-export";
import {
  CATEGORIAS_MOVIMENTACAO,
  GRUPOS_MOVIMENTACAO,
  getDetalhamentoPorBimestre,
  getMovimentacoesDoPeriodo,
  tituloDoPeriodo,
  totalGeral,
  type LinhaMovimentacao,
  type PeriodoMovimentacao,
} from "./movimentacoes-pro-saude";

export const NOTA_MOVIMENTACOES =
  "Somente movimentações concluídas. Cada dependente incluído ou excluído conta individualmente; a mesma pessoa pode ter mais de uma movimentação. Em cada modalidade, Ativos + Inativos = total da modalidade.";
export const NOTA_DEMONSTRATIVO = "Dados demonstrativos: o projeto ainda não possui histórico real de movimentações concluídas.";

function slugPeriodo(p: PeriodoMovimentacao): string {
  if (p.periodicidade === "mensal") return `mensal_${p.ano}-${String(p.indice + 1).padStart(2, "0")}`;
  if (p.periodicidade === "semestral") return `semestral_${p.ano}-S${p.indice}`;
  return `anual_${p.ano}`;
}

export function specNuplaPrincipal(p: PeriodoMovimentacao): RelatorioExportSpec<LinhaMovimentacao> {
  const linhas = getMovimentacoesDoPeriodo(p);
  const tot = totalGeral(linhas);
  return {
    titulo: "Movimentações do Pró-Saúde — NUPLA",
    origem: "Relatórios — NUPLA",
    nomeAba: "NUPLA",
    competencia: tituloDoPeriodo(p),
    rotuloCompetencia: "Período",
    filtrosAplicados: [`Periodicidade: ${p.periodicidade === "mensal" ? "Mensal" : p.periodicidade === "semestral" ? "Semestral" : "Anual"}`],
    gruposCabecalho: [
      { rotulo: "", span: 1 },
      { rotulo: "Boletos", span: 2 },
      { rotulo: "ASSEFAZ", span: 2 },
      { rotulo: "ASSETRAN", span: 2 },
      { rotulo: "", span: 1 },
    ],
    colunas: [
      { header: "Movimentação", valor: (l) => l.categoria, tipo: "texto", width: 30 },
      ...GRUPOS_MOVIMENTACAO.map((g) => ({ header: g.vinculo, valor: (l: LinhaMovimentacao) => l[g.chave], tipo: "numero" as const, width: 12 })),
      { header: "Total", valor: (l) => l.total, tipo: "numero", width: 12 },
    ],
    linhas,
    linhaTotal: { label: "Total de movimentações", valores: [...GRUPOS_MOVIMENTACAO.map((g) => tot[g.chave]), tot.total] },
    notas: [NOTA_MOVIMENTACOES, NOTA_DEMONSTRATIVO],
    nomeArquivoBase: `pro-saude_nupla_${slugPeriodo(p)}`,
    orientacaoPdf: "landscape",
  };
}

interface LinhaBimestre {
  categoria: string;
  valores: (number | null)[];
  total: number;
}

/** `bimestre`: chave `"a-b"` de `getBimestresDoPeriodo` ou `"todos"`. Só existe para semestral/anual. */
export function specNuplaBimestre(p: PeriodoMovimentacao, bimestre: string): RelatorioExportSpec<LinhaBimestre> {
  const det = getDetalhamentoPorBimestre(p);
  const indices = det.bimestres.map((b, i) => ({ b, i })).filter(({ b }) => (bimestre === "todos" ? true : b.chave === bimestre));
  const escolhidos = bimestre === "todos" ? indices : indices.filter(({ b }) => b.temDados);
  const linhas: LinhaBimestre[] = det.linhas.map((l) => {
    const valores = escolhidos.map(({ i }) => l.valores[i]);
    return { categoria: l.categoria, valores, total: valores.reduce<number>((t, v) => t + (v ?? 0), 0) };
  });
  const nomeBim = bimestre === "todos" ? "Todos os bimestres" : (escolhidos[0]?.b.rotulo ?? bimestre);
  const totais = escolhidos.map((_, k) => (linhas.every((l) => l.valores[k] === null) ? null : linhas.reduce((t, l) => t + (l.valores[k] ?? 0), 0)));
  return {
    titulo: "Movimentações do Pró-Saúde — Detalhamento por bimestre",
    origem: "Relatórios — NUPLA",
    nomeAba: "NUPLA",
    competencia: tituloDoPeriodo(p),
    rotuloCompetencia: "Período",
    filtrosAplicados: [`Bimestre: ${nomeBim}`],
    colunas: [
      { header: "Movimentação", valor: (l) => l.categoria, tipo: "texto", width: 30 },
      ...escolhidos.map(({ b }, k) => ({ header: b.emAndamento ? `${b.rotulo} (em andamento)` : b.rotulo, valor: (l: LinhaBimestre) => l.valores[k] ?? "—", tipo: "numero" as const, width: 20 })),
      { header: "Total", valor: (l) => l.total, tipo: "numero", width: 12 },
    ],
    linhas,
    linhaTotal: { label: "Total de movimentações", valores: [...totais.map((t) => (t === null ? "—" : t)), linhas.reduce((t, l) => t + l.total, 0)] },
    notas: ['"Janeiro/Fevereiro" reúne as movimentações ocorridas nos dois meses. Bimestres sem dados aparecem como "—".', NOTA_DEMONSTRATIVO],
    nomeArquivoBase: `pro-saude_nupla_bimestre_${bimestre === "todos" ? "todos" : bimestre}_${slugPeriodo(p)}`,
    orientacaoPdf: "landscape",
  };
}

export { CATEGORIAS_MOVIMENTACAO };

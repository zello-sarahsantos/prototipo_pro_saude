/**
 * Relatório NUPLA — Movimentações do Pró-Saúde. Monta as especificações de exportação (PDF/XLSX)
 * a partir da fonte única `movimentacoes-pro-saude.ts` (a mesma lida pelo Dashboard). Nenhuma
 * contagem é recalculada aqui: tela, PDF e Excel usam exatamente as mesmas linhas.
 *
 * Dois documentos: o relatório principal (8 categorias × 6 agrupamentos, com cabeçalho agrupado por
 * modalidade) e o detalhamento por bimestre (um bimestre ou todos).
 */
import type { RelatorioExportSpec } from "./relatorio-export";
import { registrarEmissao, type EmissaoRelatorio } from "./emissoes-relatorio";
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

export const TIPO_EMISSAO_NUPLA = "nupla";
export type EmissaoNupla = EmissaoRelatorio<LinhaMovimentacao>;
export const ROTULO_PERIODICIDADE = { mensal: "Mensal", semestral: "Semestral", anual: "Anual" } as const;

/** Emissão com histórico (Q40): snapshot do período, número sequencial no período, data e hora e responsável. Exportar não registra emissão. */
export function emitirRelatorioNupla(p: PeriodoMovimentacao, responsavel: string): EmissaoNupla {
  return registrarEmissao<LinhaMovimentacao>({
    tipoRelatorio: TIPO_EMISSAO_NUPLA,
    competenciaReferencia: slugPeriodo(p),
    competenciaPagamento: "",
    responsavel,
    linhas: getMovimentacoesDoPeriodo(p),
    registroIds: [],
    demonstrativo: true,
    parametros: { titulo: tituloDoPeriodo(p), periodicidade: p.periodicidade },
  });
}

/** Exportação de uma emissão: usa somente o conteúdo registrado, sem recalcular. */
export const specNuplaEmissao = (e: EmissaoNupla) =>
  montarSpecPrincipal(e.linhas, e.parametros?.titulo ?? e.competenciaReferencia, ROTULO_PERIODICIDADE[(e.parametros?.periodicidade ?? "mensal") as keyof typeof ROTULO_PERIODICIDADE], `${e.competenciaReferencia}_emissao_${e.numero}`, [
    { label: "Relatório", valor: `Nº ${e.numero}` },
    { label: "Emitido em", valor: new Date(e.geradoEm).toLocaleString("pt-BR") },
    { label: "Responsável pela emissão", valor: e.responsavel },
  ]);

export function specNuplaPrincipal(p: PeriodoMovimentacao): RelatorioExportSpec<LinhaMovimentacao> {
  return montarSpecPrincipal(getMovimentacoesDoPeriodo(p), tituloDoPeriodo(p), ROTULO_PERIODICIDADE[p.periodicidade], slugPeriodo(p));
}

function montarSpecPrincipal(linhas: LinhaMovimentacao[], titulo: string, periodicidade: string, slug: string, identificacao?: { label: string; valor: string }[]): RelatorioExportSpec<LinhaMovimentacao> {
  const tot = totalGeral(linhas);
  return {
    titulo: "Movimentações do Pró-Saúde — NUPLA",
    origem: "Relatórios — NUPLA",
    nomeAba: "NUPLA",
    competencia: titulo,
    rotuloCompetencia: "Período",
    ...(identificacao ? { identificacao } : {}),
    filtrosAplicados: [`Periodicidade: ${periodicidade}`],
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
    nomeArquivoBase: `pro-saude_nupla_${slug}`,
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

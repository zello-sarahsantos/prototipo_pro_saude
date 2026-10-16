/**
 * Movimentações do Pró-Saúde (Relatório NUPLA e indicador "Movimentações realizadas na
 * competência" do Dashboard GERDAB) — **fonte única compartilhada**.
 *
 * **DADOS DEMONSTRATIVOS.** O projeto ainda não registra um histórico de movimentações concluídas
 * (adesões, inclusões/exclusões de dependentes, trocas de plano, suspensões etc.). Até existir essa
 * fonte, os números abaixo são gerados de forma determinística (mesma competência → mesmo valor) só
 * para exercitar a interface; **não representam regra de negócio nem volumes reais**. Dashboard e
 * NUPLA leem exclusivamente este módulo, então os totais sempre coincidem entre as duas telas.
 *
 * Integração futura: substituir apenas `lerMovimentacoesConcluidas` por uma consulta real que devolva,
 * para cada competência, a contagem por (categoria × modalidade de pagamento × vínculo). Todo o
 * resto (agrupamento por período, bimestres, totais) continua igual.
 */
import { getDataReferencia } from "./dias-uteis";

export const MOVIMENTACOES_SAO_DEMONSTRATIVAS = true;

export const CATEGORIAS_MOVIMENTACAO = [
  "Novas adesões",
  "Inclusão de dependentes",
  "Exclusão de dependentes",
  "Troca de plano",
  "Alteração de valor",
  "Reinclusões",
  "Suspensões",
  "Exclusão de titulares",
] as const;
export type CategoriaMovimentacao = (typeof CATEGORIAS_MOVIMENTACAO)[number];

/** Seis agrupamentos: modalidade de pagamento (Boletos, ASSEFAZ, ASSETRAN) × vínculo (Ativos/Inativos). */
export const GRUPOS_MOVIMENTACAO = [
  { chave: "boletoAtivo", modalidade: "Boletos", vinculo: "Ativos" },
  { chave: "boletoInativo", modalidade: "Boletos", vinculo: "Inativos" },
  { chave: "assefazAtivo", modalidade: "ASSEFAZ", vinculo: "Ativos" },
  { chave: "assefazInativo", modalidade: "ASSEFAZ", vinculo: "Inativos" },
  { chave: "assetranAtivo", modalidade: "ASSETRAN", vinculo: "Ativos" },
  { chave: "assetranInativo", modalidade: "ASSETRAN", vinculo: "Inativos" },
] as const;
export type ChaveGrupo = (typeof GRUPOS_MOVIMENTACAO)[number]["chave"];

export type ContagemPorGrupo = Record<ChaveGrupo, number> & { total: number };
export interface LinhaMovimentacao extends ContagemPorGrupo {
  categoria: CategoriaMovimentacao;
}

export const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const zerar = (): ContagemPorGrupo => ({ boletoAtivo: 0, boletoInativo: 0, assefazAtivo: 0, assefazInativo: 0, assetranAtivo: 0, assetranInativo: 0, total: 0 });

/** Total concluído por categoria no mês (`mes` 0–11) — gerador demonstrativo determinístico. */
function totaisDemonstrativosDoMes(ano: number, mes: number): number[] {
  const crescimento = 0.78 + Math.min(mes, 9) * 0.025 + (ano - 2026) * 0.02;
  const base = [28, 61, 26, 38, 22, 5, 7, 4];
  return base.map((b, c) => Math.max(0, Math.round(b * crescimento) - ((mes * 3 + c * 5) % 4)));
}

/** Divide o total de uma categoria entre os seis grupos — cada movimentação cai em exatamente um grupo. */
function dividirEmGrupos(total: number): ContagemPorGrupo {
  const boletos = Math.round(total * 0.3);
  const assefaz = Math.round(total * 0.45);
  const assetran = total - boletos - assefaz;
  const ativos = (n: number) => Math.round(n * 0.85);
  return {
    boletoAtivo: ativos(boletos),
    boletoInativo: boletos - ativos(boletos),
    assefazAtivo: ativos(assefaz),
    assefazInativo: assefaz - ativos(assefaz),
    assetranAtivo: ativos(assetran),
    assetranInativo: assetran - ativos(assetran),
    total,
  };
}

/** Ponto único de leitura — hoje demonstrativo; trocar por consulta real quando existir a fonte. */
function lerMovimentacoesConcluidas(ano: number, mes: number): LinhaMovimentacao[] {
  return totaisDemonstrativosDoMes(ano, mes).map((t, c) => ({ categoria: CATEGORIAS_MOVIMENTACAO[c], ...dividirEmGrupos(t) }));
}

/** Último mês com dados (o mês da data de referência — em andamento). Meses posteriores não têm dados. */
export function getUltimoMesComDados(): { ano: number; mes: number } {
  const ref = getDataReferencia();
  return { ano: ref.getFullYear(), mes: ref.getMonth() };
}

export function mesTemDados(ano: number, mes: number): boolean {
  const u = getUltimoMesComDados();
  return ano < u.ano || (ano === u.ano && mes <= u.mes);
}

export function getMovimentacoesDoMes(ano: number, mes: number): LinhaMovimentacao[] | null {
  return mesTemDados(ano, mes) ? lerMovimentacoesConcluidas(ano, mes) : null;
}

/** Movimentações da competência `"AAAA-MM"` — o mesmo dado usado pelo NUPLA (período mensal). */
export function getMovimentacoesDaCompetencia(competencia: string): LinhaMovimentacao[] | null {
  const [a, m] = competencia.split("-").map(Number);
  return getMovimentacoesDoMes(a, m - 1);
}

export function somarLinhas(linhas: LinhaMovimentacao[][]): LinhaMovimentacao[] {
  return CATEGORIAS_MOVIMENTACAO.map((categoria, c) => {
    const acc: ContagemPorGrupo = zerar();
    linhas.forEach((mes) => {
      (Object.keys(acc) as (keyof ContagemPorGrupo)[]).forEach((k) => {
        acc[k] += mes[c][k];
      });
    });
    return { categoria, ...acc };
  });
}

export function totalGeral(linhas: LinhaMovimentacao[]): ContagemPorGrupo {
  const acc = zerar();
  linhas.forEach((l) => (Object.keys(acc) as (keyof ContagemPorGrupo)[]).forEach((k) => (acc[k] += l[k])));
  return acc;
}

export type Periodicidade = "mensal" | "semestral" | "anual";

export interface PeriodoMovimentacao {
  periodicidade: Periodicidade;
  ano: number;
  /** Mensal: 0–11. Semestral: 1 ou 2. Anual: ignorado. */
  indice: number;
}

/** Meses (0–11) que compõem o período. */
export function mesesDoPeriodo(p: PeriodoMovimentacao): number[] {
  if (p.periodicidade === "mensal") return [p.indice];
  if (p.periodicidade === "semestral") return p.indice === 1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

export function periodoEmAndamento(p: PeriodoMovimentacao): boolean {
  const u = getUltimoMesComDados();
  return mesesDoPeriodo(p).includes(u.mes) && p.ano === u.ano;
}

export function tituloDoPeriodo(p: PeriodoMovimentacao): string {
  const and = periodoEmAndamento(p) ? " (em andamento)" : "";
  if (p.periodicidade === "mensal") return `${MESES_NOME[p.indice]}/${p.ano}${and}`;
  if (p.periodicidade === "semestral") return `${p.indice}º semestre/${p.ano}${and}`;
  return `Anual ${p.ano}${and}`;
}

/** Linhas consolidadas do período (soma dos meses com dados — meses futuros não contam). */
export function getMovimentacoesDoPeriodo(p: PeriodoMovimentacao): LinhaMovimentacao[] {
  const meses = mesesDoPeriodo(p)
    .map((m) => getMovimentacoesDoMes(p.ano, m))
    .filter((x): x is LinhaMovimentacao[] => x !== null);
  return somarLinhas(meses);
}

export interface BimestreMovimentacao {
  chave: string;
  rotulo: string;
  meses: [number, number];
  emAndamento: boolean;
  /** `false` quando nenhum dos dois meses tem dados ainda (aparece como "—"). */
  temDados: boolean;
}

/** Pares de meses do período ("Janeiro/Fevereiro"…). Mensal não tem bimestres. */
export function getBimestresDoPeriodo(p: PeriodoMovimentacao): BimestreMovimentacao[] {
  if (p.periodicidade === "mensal") return [];
  const meses = mesesDoPeriodo(p);
  const u = getUltimoMesComDados();
  const out: BimestreMovimentacao[] = [];
  for (let i = 0; i < meses.length; i += 2) {
    const [a, b] = [meses[i], meses[i + 1]] as [number, number];
    out.push({
      chave: `${a}-${b}`,
      rotulo: `${MESES_NOME[a]}/${MESES_NOME[b]}`,
      meses: [a, b],
      emAndamento: p.ano === u.ano && (a === u.mes || b === u.mes),
      temDados: mesTemDados(p.ano, a),
    });
  }
  return out;
}

/** Totais por categoria em cada bimestre + total da linha — `null` nos bimestres sem dados. */
export function getDetalhamentoPorBimestre(p: PeriodoMovimentacao) {
  const bimestres = getBimestresDoPeriodo(p);
  const linhas = CATEGORIAS_MOVIMENTACAO.map((categoria, c) => {
    let total = 0;
    const valores = bimestres.map((b) => {
      const [ma, mb] = [getMovimentacoesDoMes(p.ano, b.meses[0]), getMovimentacoesDoMes(p.ano, b.meses[1])];
      if (!ma && !mb) return null;
      const v = (ma ? ma[c].total : 0) + (mb ? mb[c].total : 0);
      total += v;
      return v;
    });
    return { categoria, valores, total };
  });
  return { bimestres, linhas };
}

/**
 * Visões Gerenciais (plano do Módulo de Relatórios, seção 2.1 item 6 / 2.10) — agregados
 * tabulares/consolidados sobre `servidoresList`. Reaproveita `regrasProSaude` e
 * `calcularIdade` (mock-data.ts), nenhum motor de cálculo paralelo.
 *
 * Correção explícita: uma versão anterior desta tela calculava "Ativos/Inativos" fundindo
 * pensionistas com aposentados/inativos, sem regra validada — e usava, numa versão ainda
 * anterior, `ServidorListItem.status` (status operacional do cadastro) para essa mesma coisa.
 * Os dois erros foram corrigidos: esta versão usa exclusivamente
 * `ServidorListItem.situacaoBeneficiarioTitular` (o campo já coletado no requerimento de
 * primeira inclusão — ver `SITUACOES_TITULAR`, `form-options.ts`) para qualquer indicador de
 * "população funcional", **preservando as cinco categorias**, sem colapsar pensionista com
 * servidor inativo nem com nenhuma outra categoria.
 */
import { servidoresList, regrasProSaude, calcularIdade, type ServidorListItem } from "./mock-data";
import { SITUACOES_TITULAR } from "./form-options";

export interface LinhaOperadora {
  operadora: string;
  titulares: number;
  dependentes: number;
  totalBeneficiarios: number;
  percentualDaBase: number;
}

/** Consolidado por operadora/seguradora — tabela principal (não substituída por gráfico).
 *  Não inclui Ativos/Inativos: essa dimensão é população funcional, tratada à parte em
 *  `getConsolidadoPorSituacaoTitular` (preservando as 5 categorias reais), nunca colapsada por
 *  operadora sem uma regra de cruzamento explicitamente validada. */
export function getConsolidadoPorOperadora(): LinhaOperadora[] {
  const grupos = new Map<string, ServidorListItem[]>();
  servidoresList.forEach((s) => {
    const chave = s.operadora ?? "Sem operadora";
    grupos.set(chave, [...(grupos.get(chave) ?? []), s]);
  });

  const totalTitulares = servidoresList.length;

  return [...grupos.entries()]
    .map(([operadora, lista]) => {
      const dependentes = lista.reduce((soma, s) => soma + s.dependentes, 0);
      return {
        operadora,
        titulares: lista.length,
        dependentes,
        totalBeneficiarios: lista.length + dependentes,
        percentualDaBase: totalTitulares > 0 ? (lista.length / totalTitulares) * 100 : 0,
      };
    })
    .sort((a, b) => b.titulares - a.titulares);
}

export interface LinhaSituacaoTitular {
  situacao: (typeof SITUACOES_TITULAR)[number];
  titulares: number;
  percentualDaBase: number;
}

/**
 * Consolidado por Situação do Beneficiário Titular — as 5 categorias reais
 * (`SITUACOES_TITULAR`), nenhuma colapsada em "Ativos/Inativos". Esta é a visão correta para
 * "população funcional" nas Visões Gerenciais — nunca `ServidorListItem.status` (status
 * operacional do cadastro no Pró-Saúde, dimensão independente, usado em Beneficiários/
 * Contratos).
 */
export function getConsolidadoPorSituacaoTitular(): LinhaSituacaoTitular[] {
  const totalTitulares = servidoresList.length;
  return SITUACOES_TITULAR.map((situacao) => {
    const titulares = servidoresList.filter((s) => s.situacaoBeneficiarioTitular === situacao).length;
    return {
      situacao,
      titulares,
      percentualDaBase: totalTitulares > 0 ? (titulares / totalTitulares) * 100 : 0,
    };
  });
}

export interface FaixaEtaria {
  label: string;
  min: number;
  max: number;
}

/**
 * Faixas alinhadas às regras já existentes do Pró-Saúde para dependentes (ver
 * `form-options.ts`/`Dependente.parentesco`: "menor de 21", "maior de 21 e menor de 24"), para
 * que a mesma tabela sirva de referência quando dependentes também tiverem faixa calculada.
 */
export const FAIXAS_ETARIAS: FaixaEtaria[] = [
  { label: "0 a 20 anos", min: 0, max: 20 },
  { label: "21 a 23 anos", min: 21, max: 23 },
  { label: "24 a 29 anos", min: 24, max: 29 },
  { label: "30 a 39 anos", min: 30, max: 39 },
  { label: "40 a 49 anos", min: 40, max: 49 },
  { label: "50 a 59 anos", min: 50, max: 59 },
  { label: "60 anos ou mais", min: 60, max: Infinity },
];

export interface LinhaFaixaEtaria {
  faixa: string;
  titulares: number;
  percentualDaBase: number;
}

/**
 * Consolidado por faixa etária dos **titulares** — `dataNascimento` já existe em
 * `ServidorListItem` (campo cadastral real, ver mock-data.ts), então a idade é calculada de
 * verdade, nunca fabricada.
 *
 * **Limitação de dados registrada, não escondida**: dependentes em `servidoresList` são hoje só
 * uma contagem por titular (`dependentes: number`), sem registro individual de data de
 * nascimento nesta base — por isso esta tabela não classifica dependentes por faixa. Quando
 * `servidoresList` passar a ter os dependentes como registros individuais (com `dataNascimento`
 * próprio, como já existe em `Dependente` no cenário do Módulo de Cadastro), esta função pode
 * ser estendida sem redesenho da tabela.
 */
export function getConsolidadoPorFaixaEtaria(): LinhaFaixaEtaria[] {
  const totalTitulares = servidoresList.length;
  return FAIXAS_ETARIAS.map(({ label, min, max }) => {
    const titulares = servidoresList.filter((s) => {
      const idade = calcularIdade(s.dataNascimento);
      return idade >= min && idade <= max;
    }).length;
    return {
      faixa: label,
      titulares,
      percentualDaBase: totalTitulares > 0 ? (titulares / totalTitulares) * 100 : 0,
    };
  });
}

export interface SituacaoTeto {
  totalServidores: number;
  noTetoOuAcima: number;
  percentualNoTeto: number;
  servidoresNoTeto: { nome: string; matricula: string; valorPlano: number }[];
}

/** Quantos servidores têm `valorPlano` no teto familiar ou acima dele **agora** — fotografia
 *  atual (indicador complementar), não uma série histórica. "Evolução de Servidores no Teto"
 *  permanece como pendência de dados (ver docs/MODULO_RELATORIOS.md) — exigiria um histórico
 *  mês a mês de `valorPlano` que não existe e não deve ser fabricado. */
export function getSituacaoTeto(): SituacaoTeto {
  const noTeto = servidoresList.filter((s) => s.valorPlano >= regrasProSaude.tetoFamiliar);
  return {
    totalServidores: servidoresList.length,
    noTetoOuAcima: noTeto.length,
    percentualNoTeto: servidoresList.length > 0 ? (noTeto.length / servidoresList.length) * 100 : 0,
    servidoresNoTeto: noTeto.map((s) => ({ nome: s.nome, matricula: s.matricula, valorPlano: s.valorPlano })),
  };
}

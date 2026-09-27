/**
 * Fechamento de Pagamento — motor de classificação Adimplente / Inadimplente / Requer análise.
 *
 * Ver docs/MODULO_RELATORIOS.md e o plano do Módulo de Relatórios (seções 2.3-2.5, 2.7, 2.10)
 * para o desenho completo. Ponto central a não perder de vista: **este mapeamento é uma
 * proposta técnica, não uma regra de negócio já validada pela stakeholder** (seção 2.4/2.8 do
 * plano) — a estrutura de 3 grupos está aprovada, o critério automático por trás, não.
 *
 * Unidade de classificação: o **servidor titular** (`BeneficiarioPagamento` com
 * `parentesco === 'Titular'`), não cada dependente isoladamente — mesmo que a apuração por
 * trás considere os documentos de todo o grupo familiar dele. Isso é consistente com o pedido
 * do usuário ("Matrícula | Servidor | ...") e com o fato de que quem é notificado/suspenso pelo
 * NURFI é o servidor, não o dependente individualmente.
 *
 * Limitação de dados deste protótipo, registrada explicitamente (não escondida): o cenário de
 * referência do Módulo de Pagamento (`beneficiariosPagamento`, `mock-data.ts`) tem só 1 grupo
 * familiar (Carlos/Marina/Pedro), isolado do cenário de `servidoresList` (decisão já registrada
 * em `mock-data.ts`). Por isso o Fechamento nesta rodada mostra só 1 servidor por competência —
 * o número é pequeno, mas 100% real e rastreável (nunca um total "inflado" artificialmente). A
 * seção "Base de dados necessária" do plano já prevê expandir esse cenário para o módulo ficar
 * representativo em volume — isso é trabalho futuro, não desta etapa.
 */
import {
  beneficiariosPagamento as beneficiariosSeed,
  calcularReembolso,
  competenciaAtual,
  competenciasFechadas,
  formatCompetencia,
  statusComprovanteLabels,
  type BeneficiarioPagamento,
  type Comprovante,
  type StatusComprovante,
} from "./mock-data";
import {
  getBeneficiariosPagamentoAtual,
  getComprovantesUnificados,
  getBeneficiariosDispensadosIds,
  getObservacaoNurfi,
  loadHistoricoFechamentos,
  saveHistoricoFechamentos,
  type SnapshotFechamentoPagamento,
} from "./prosaude-storage";
import { getCamposDoBeneficiario, statusDoBeneficiarioNoDocumento } from "./comprovante-status";
import { getRegistrosAssociacaoAprovadosNaCompetencia, type RegistroAssociacaoConsolidado } from "./planilhas-associacao";
import { getResultadoRetroativoIndividual, getSolicitacoesRetroativas } from "./ressarcimento-retroativo";
import { getMatriculaPorCpf } from "./base-institucional";
import { competenciaEstaFechada, getCicloDeDestino, getDataReferencia, getFechamentoAutomatico } from "./dias-uteis";

/** Competências que fazem sentido para um Fechamento — a atual (ainda em andamento, fechamento
 *  bloqueado por natureza) e as já fechadas para envio (candidatas reais a fechamento GERDAB). */
export const competenciasParaFechamento = [...competenciasFechadas, competenciaAtual];

export type ClassificacaoFechamento = "adimplente" | "inadimplente" | "requer_analise";

/** Status que ainda não têm uma decisão final — vão para "Requer análise" (seção 2.4 do plano). */
const statusRequerAnalise: StatusComprovante[] = [
  "processando",
  "ilegivel",
  "revisao",
  "em_analise",
  "correcao_solicitada",
  "retroativo_aguardando_aprovacao",
  "retroativo_aguardando_analista",
  "retroativo_aguardando_gerencia",
  "retroativo_devolvido",
];

const statusAdimplente: StatusComprovante[] = ["aprovado", "aprovado_com_ressalva", "retroativo_aprovado"];
const statusInadimplente: StatusComprovante[] = ["recusado", "retroativo_recusado"];

/**
 * Origem da comprovação que originou este registro — "individual" é o fluxo de sempre
 * (Comprovante/AcaoComprovante do próprio servidor); "associacao" é uma planilha mensal de
 * associação aprovada pela GERDAB (`planilhas-associacao.ts`). Campo interno, recomputado (nunca
 * persistido) — não vira coluna nova na tabela nem na exportação NURFI nesta rodada (decisão
 * P7); serve só para o detalhe/drill-down do registro identificar a origem.
 */
export type OrigemComprovacao = "individual" | "associacao";

/** Presente só quando `origem === "associacao"` — rastreabilidade completa
 *  associação → competência → planilha → decisão (decisão P7). */
export interface OrigemAssociacaoDetalhe {
  associacao: string;
  competencia: string;
  planilhaId: string;
  statusPlanilha: string;
}

/**
 * Uma linha da composição do grupo familiar de um titular — usada só para o drill-down
 * ("Detalhes") do Fechamento de Pagamento e para a exportação analítica (uma linha por
 * integrante). Nunca uma segunda apuração: é o mesmo detalhe que já existia internamente em
 * `classificarTitularNaCompetencia`/`getRegistrosAssociacaoAprovadosNaCompetencia`, só reexposto
 * em vez de descartado depois de somado.
 */
export interface IntegranteGrupoFechamento {
  beneficiarioId?: string;
  nome: string;
  /** Ausente quando a origem é "individual" e o próprio modelo do Módulo de Pagamento não
   *  registra CPF de dependente (`BeneficiarioPagamento.cpf` só existe no Titular) — nunca
   *  inventado; a origem "associacao" sempre tem CPF por linha (modelo da planilha). */
  cpf?: string;
  parentesco: string;
  valor: number;
  /** Operadora do próprio integrante — origem "individual":
   *  `BeneficiarioPagamento.operadora` do respectivo beneficiário; origem "associacao":
   *  `ComposicaoAssociacaoIntegrante.operadora` (linha da planilha). Nunca assumida igual à do
   *  titular/grupo — cada integrante mantém a sua (ver `formatarOperadoraIntegrante`). */
  operadora?: string;
}

export interface RegistroFechamento {
  beneficiarioId: string;
  /** Mantido por compatibilidade com quem ainda depende de matrícula (ficha do servidor,
   *  Histórico de Comprovações) — nunca removido do modelo, mesmo a coluna apresentada no
   *  Relatório de Pagamento tendo trocado para CPF (decisão P3). Ausente para registros de
   *  origem "associacao" (planilha), que não têm matrícula por natureza — é exatamente por
   *  isso que o Relatório de Pagamento precisou passar a exibir CPF, não matrícula. */
  matricula?: string;
  /** Identificador comum às duas origens (individual e associação) — usado como coluna "CPF"
   *  no Relatório de Pagamento (decisão P3). */
  cpf?: string;
  nome: string;
  situacaoVinculo: BeneficiarioPagamento["situacao"];
  /** Operadora do plano (origem "individual", `BeneficiarioPagamento.operadora`) ou nome da
   *  associação (origem "associacao", `origemAssociacao.associacao`) — nunca cruza com o
   *  Módulo de Cadastro (`servidoresList`); vem sempre de dentro do próprio registro de origem. */
  operadoraOuAssociacao: string;
  competencia: string;
  classificacao: ClassificacaoFechamento;
  /** Origem do dado que gerou a classificação — para rastreabilidade (seção 2.5). */
  comprovanteId?: string;
  /** Valor total do plano do grupo familiar (soma de `composicaoGrupo`) — nunca o valor de
   *  ressarcimento (ver `valorRessarcir`). */
  valor: number;
  /** Ressarcimento do grupo familiar — `calcularReembolso(valor)` (teto + percentual já
   *  existentes, `mock-data.ts`), aplicado UMA VEZ sobre o total do grupo, nunca por integrante
   *  nem por cima de um valor que já passou por este cálculo. Quando a competência veio do
   *  Ressarcimento Retroativo (módulo novo), este número é o `calcularValorRessarcir` que a
   *  GERDAB já apurou lá (ver `valorRessarcirPrecalculado`) — nunca os dois cálculos aplicados
   *  em sequência sobre o mesmo valor. */
  valorRessarcir: number;
  /** Composição do grupo familiar (titular + dependentes) que forma `valor` — drill-down da
   *  tela e base da exportação analítica (uma linha por integrante). */
  composicaoGrupo: IntegranteGrupoFechamento[];
  /** Só presente quando `classificacao === 'inadimplente'`. */
  situacao?: string;
  /** Só presente quando `classificacao === 'inadimplente'`. Reaproveitado do sistema quando
   *  possível (`AcaoComprovante.motivo`) — ver nota em `getRegistrosFechamento`. */
  motivo?: string;
  /** Só presente quando `classificacao === 'requer_analise'` — o próprio status do comprovante,
   *  usado como "Pendência/Motivo" na tabela operacional (seção 2.10). */
  statusComprovante?: StatusComprovante;
  /** Data da última ação registrada no comprovante — base para "Tempo aguardando". */
  ultimaAcaoEm?: string;
  /** Presente só quando a classificação veio do Ressarcimento Retroativo (módulo novo, origem
   *  individual): o `Valor a ser Ressarcido` que a GERDAB já apurou lá (`calcularValorRessarcir`),
   *  reaproveitado tal como está — nunca recalculado por `calcularReembolso`. Ausência = calcula
   *  normalmente (`calcularReembolso(valor)`, como sempre foi). */
  valorRessarcirPrecalculado?: number;
  /** P5/P7 — fonte de comprovação explícita: nunca um `Comprovante` sintético, só um marcador de
   *  origem sobre o mesmo `RegistroFechamento[]` único. */
  origem: OrigemComprovacao;
  origemAssociacao?: OrigemAssociacaoDetalhe;
}

/**
 * Formata a coluna "Operadora/Associação" para 1 integrante do grupo — único ponto que decide
 * essa regra, reaproveitado pela coluna da tela (grupo/titular) e pela exportação analítica
 * (1 linha por integrante), nunca duplicado entre os dois.
 *
 * - Origem "associacao": operadora do próprio integrante (linha da planilha) + nome da
 *   associação responsável — nunca a associação sozinha, nunca um sufixo artificial.
 * - Origem "individual": só a operadora do integrante — não há associação a compor.
 */
export function formatarOperadoraIntegrante(registro: RegistroFechamento, integrante: IntegranteGrupoFechamento): string {
  if (registro.origem === "associacao") {
    const associacao = registro.origemAssociacao?.associacao ?? registro.operadoraOuAssociacao;
    return integrante.operadora ? `${integrante.operadora} / ${associacao}` : associacao;
  }
  return integrante.operadora ?? registro.operadoraOuAssociacao;
}

/** Operadora do titular dentro de uma planilha de associação consolidada — a do integrante com
 *  `vinculo === "Titular"`, nunca a de um dependente qualquer. Fallback ao primeiro integrante só
 *  na ausência defensiva de uma linha "Titular" (não deveria ocorrer). Único ponto que decide essa
 *  regra, reaproveitado por `getRegistrosFechamento` e por `getExtratoPorCpf`. */
function operadoraTitularAssociacao(r: RegistroAssociacaoConsolidado): string | undefined {
  return r.composicao.find((c) => c.vinculo === "Titular")?.operadora ?? r.composicao[0]?.operadora;
}

function ultimoValor(comprovante: Comprovante, beneficiarioId: string): number | undefined {
  const campo = getCamposDoBeneficiario(comprovante, beneficiarioId).find(
    (c) => c.chave === "valor" && c.valor.trim() !== "",
  );
  if (!campo) return undefined;
  const numero = Number(campo.valor.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isNaN(numero) ? undefined : numero;
}

function ultimaAcao(comprovante: Comprovante, beneficiarioId?: string) {
  const acoes = comprovante.aprovacoes ?? [];
  const relevantes = beneficiarioId
    ? acoes.filter((a) => !a.beneficiarioId || a.beneficiarioId === beneficiarioId)
    : acoes;
  return relevantes[relevantes.length - 1];
}

type ClassificacaoDetalhe = Pick<
  RegistroFechamento,
  "classificacao" | "comprovanteId" | "valor" | "situacao" | "motivo" | "statusComprovante" | "ultimaAcaoEm" | "composicaoGrupo" | "valorRessarcirPrecalculado"
>;

/**
 * Núcleo de classificação de 1 servidor titular em 1 competência — extraído para ser
 * reaproveitado tanto pelo Fechamento de Pagamento (`getRegistrosFechamento`, itera titulares
 * numa competência) quanto pelo Extrato do Servidor (`getExtratoServidor`, itera competências
 * para 1 titular). Nenhum motor de cálculo novo, só leitura/derivação dos dados já existentes
 * do Módulo de Pagamento (`Comprovante`, `AcaoComprovante`) — mesmo padrão "recompute on
 * demand, nunca persistir" já usado em notificações.
 *
 * **Ressarcimento Retroativo (módulo novo — ver `ressarcimento-retroativo.ts`):** essa função
 * consulta primeiro `getResultadoRetroativoIndividual`; se houver resultado, ele decide a
 * classificação (adimplente/inadimplente/requer_analise) e a lógica de `Comprovante` abaixo nem
 * roda para aquela competência. Isso é só o suficiente para que Fechamento e Histórico consigam
 * mostrar os resultados do módulo novo — não é uma migração de dados nem uma reconciliação entre
 * os dois fluxos. Reaproveita os rótulos de status já existentes (`retroativo_aprovado`/
 * `retroativo_recusado`/`retroativo_aguardando_aprovacao`), nenhum `StatusComprovante` novo.
 *
 * Nota de protótipo: os registros legados (`isRetroativo`/`retroativo_*`) continuam sendo lidos
 * pelo caminho antigo, sem qualquer conversão para o formato novo. Isso é aceitável aqui porque os
 * dados são mockados e em pequeno número; uma migração real dos registros legados para o módulo
 * novo (ou sua descontinuação de fato) é uma decisão de produção, fora do escopo deste protótipo.
 */
function classificarTitularNaCompetencia(
  titular: BeneficiarioPagamento,
  competencia: string,
  todosBeneficiarios: BeneficiarioPagamento[],
): ClassificacaoDetalhe {
  const retroativoNovo = titular.cpf ? getResultadoRetroativoIndividual(titular.cpf, competencia) : undefined;
  if (retroativoNovo) {
    const composicaoGrupo = todosBeneficiarios
      .filter((b) => !b.associacao)
      .map((b) => ({ beneficiarioId: b.id, nome: b.nome, cpf: b.cpf, parentesco: b.parentesco, valor: b.valorCadastrado, operadora: b.operadora }));
    if (retroativoNovo.estado === "pendente") {
      return {
        classificacao: "requer_analise",
        valor: titular.valorCadastrado,
        statusComprovante: "retroativo_aguardando_aprovacao",
        ultimaAcaoEm: retroativoNovo.ultimaAtualizacaoEm,
        composicaoGrupo,
      };
    }
    if (retroativoNovo.estado === "negado") {
      return {
        classificacao: "inadimplente",
        valor: titular.valorCadastrado,
        situacao: "Suspender",
        motivo: retroativoNovo.justificativaNegado ?? "Ressarcimento retroativo não autorizado pela GERDAB.",
        statusComprovante: "retroativo_recusado",
        ultimaAcaoEm: retroativoNovo.ultimaAtualizacaoEm,
        composicaoGrupo,
      };
    }
    // aprovado: "resolvido" no Histórico mesmo quando Pago = Devido (Ressarcir = 0) — só não entra na
    // Consolidação/NURFI (regra já existente e inalterada em `getRegistrosRelatorioRetroativo`).
    return {
      classificacao: "adimplente",
      valor: retroativoNovo.valorPago ?? titular.valorCadastrado,
      statusComprovante: "retroativo_aprovado",
      ultimaAcaoEm: retroativoNovo.ultimaAtualizacaoEm,
      valorRessarcirPrecalculado: retroativoNovo.valorRessarcir ?? 0,
      composicaoGrupo,
    };
  }

  const comprovantes = getComprovantesUnificados().filter((c) => c.competencia === competencia);
  const dispensadosIds = new Set(getBeneficiariosDispensadosIds(competencia));

  // Grupo familiar do titular, excluindo quem tem comprovação coletiva via associação
  // (regra 6b do Módulo de Pagamento — nunca entra no checklist/classificação individual).
  const grupo = todosBeneficiarios.filter((b) => !b.associacao);

  // Um documento do grupo cobre o titular quando o comprovante inclui qualquer beneficiário
  // do grupo (fatura técnica multi-beneficiário) ou o próprio titular isoladamente.
  const docsGrupo = comprovantes.filter((c) => c.beneficiarioIds.some((id) => grupo.some((b) => b.id === id)));

  // Composição "sem comprovante" — nenhum valor extraído ainda existe para o grupo; usa o
  // valor já cadastrado de cada integrante (mesmo fallback que `titular.valorCadastrado` já
  // usava sozinho, agora explícito por integrante em vez de só a soma).
  const composicaoSemComprovante = (): IntegranteGrupoFechamento[] =>
    grupo.map((b) => ({ beneficiarioId: b.id, nome: b.nome, cpf: b.cpf, parentesco: b.parentesco, valor: b.valorCadastrado, operadora: b.operadora }));

  if (docsGrupo.length === 0) {
    const dispensado = grupo.every((b) => dispensadosIds.has(b.id));
    return {
      classificacao: "inadimplente",
      valor: titular.valorCadastrado,
      situacao: "Suspender",
      motivo: dispensado
        ? "Servidor optou por não apresentar comprovante nesta competência (dispensa registrada)."
        : "Não apresentou comprovante de pagamento nesta competência.",
      composicaoGrupo: composicaoSemComprovante(),
    };
  }

  // Pior status entre os beneficiários do grupo neste documento — qualquer pendência em
  // aberto de qualquer um deles impede classificar o titular como Adimplente.
  const statusPorBeneficiario = docsGrupo.flatMap((c) =>
    c.beneficiarioIds
      .filter((id) => grupo.some((b) => b.id === id))
      .map((id) => ({ comprovante: c, beneficiarioId: id, status: statusDoBeneficiarioNoDocumento(c, id) })),
  );

  const algumRequerAnalise = statusPorBeneficiario.find((s) => statusRequerAnalise.includes(s.status));
  const algumInadimplente = statusPorBeneficiario.find((s) => statusInadimplente.includes(s.status));
  const todosAdimplentes = statusPorBeneficiario.every((s) => statusAdimplente.includes(s.status));

  // Composição do grupo — um integrante por linha, valor extraído do comprovante quando
  // disponível, com o mesmo fallback (`valorCadastrado`) já usado antes só na soma. O total do
  // grupo (`valorTotal`) é sempre a soma desta mesma composição — nunca dois números que possam
  // divergir entre a tela e o drill-down.
  const composicaoGrupo: IntegranteGrupoFechamento[] = grupo.map((b) => {
    const entrada = statusPorBeneficiario.find((s) => s.beneficiarioId === b.id);
    const valorIndividual = entrada ? ultimoValor(entrada.comprovante, b.id) ?? b.valorCadastrado : b.valorCadastrado;
    return { beneficiarioId: b.id, nome: b.nome, cpf: b.cpf, parentesco: b.parentesco, valor: valorIndividual, operadora: b.operadora };
  });
  const valorTotal = composicaoGrupo.reduce((soma, i) => soma + i.valor, 0);

  if (algumRequerAnalise) {
    const ref = algumRequerAnalise;
    const acao = ultimaAcao(ref.comprovante, ref.beneficiarioId);
    return {
      classificacao: "requer_analise",
      comprovanteId: ref.comprovante.id,
      valor: valorTotal || titular.valorCadastrado,
      statusComprovante: ref.status,
      ultimaAcaoEm: acao?.data,
      composicaoGrupo,
    };
  }

  if (algumInadimplente) {
    const ref = algumInadimplente;
    const acao = ultimaAcao(ref.comprovante, ref.beneficiarioId);
    return {
      classificacao: "inadimplente",
      comprovanteId: ref.comprovante.id,
      valor: valorTotal || titular.valorCadastrado,
      situacao: "Suspender",
      motivo: acao?.motivo ?? "Documento recusado na análise.",
      composicaoGrupo,
    };
  }

  if (todosAdimplentes) {
    const primeiro = statusPorBeneficiario[0];
    return {
      classificacao: "adimplente",
      comprovanteId: primeiro?.comprovante.id,
      valor: valorTotal || titular.valorCadastrado,
      composicaoGrupo,
    };
  }

  // Sobra defensiva — não deve ocorrer com os status hoje mapeados, mas evita perder um
  // registro silenciosamente se um novo `StatusComprovante` for adicionado no futuro sem
  // atualizar as listas acima.
  return { classificacao: "requer_analise", valor: titular.valorCadastrado, composicaoGrupo };
}

/**
 * Classifica cada servidor titular para uma competência (visão do Fechamento de Pagamento —
 * itera titulares, ver `classificarTitularNaCompetencia` para o núcleo reaproveitado).
 *
 * P5 — Fonte de comprovação explícita: esta continua sendo a **única** função de consolidação do
 * Fechamento (nunca duplicada). Ela concatena duas fontes normalizadas para o mesmo formato
 * `RegistroFechamento[]`:
 *  1. **individual** — o que já existia: cada titular de `beneficiariosPagamento`, classificado
 *     por `classificarTitularNaCompetencia` a partir de `Comprovante`/`AcaoComprovante` (lógica
 *     desta função **inalterada**);
 *  2. **associacao** — titulares vindos de planilhas de associação já **aprovadas** pela GERDAB
 *     na mesma competência (`getRegistrosAssociacaoAprovadosNaCompetencia`,
 *     `planilhas-associacao.ts`), sempre classificados como Adimplente (uma planilha só chega a
 *     "aprovada" depois de a GERDAB validar 100% dos registros — nunca produz Inadimplente/
 *     Requer análise nesta rodada). Nenhum `Comprovante` sintético é criado para isso.
 */
export function getRegistrosFechamento(competencia: string): RegistroFechamento[] {
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titulares = beneficiarios.filter((b) => b.parentesco === "Titular");

  const registrosIndividuais: RegistroFechamento[] = titulares.map((titular) => {
    const detalhe = classificarTitularNaCompetencia(titular, competencia, beneficiarios);
    return {
      beneficiarioId: titular.id,
      matricula: titular.matricula,
      cpf: titular.cpf,
      nome: titular.nome,
      situacaoVinculo: titular.situacao,
      // Vem direto de `BeneficiarioPagamento.operadora` — mesmo registro de origem, nunca um
      // cruzamento com `servidoresList`/Módulo de Cadastro (datasets intencionalmente isolados).
      operadoraOuAssociacao: titular.operadora,
      competencia,
      origem: "individual",
      ...detalhe,
      // `calcularReembolso` (teto + percentual já existentes, `mock-data.ts`) aplicado uma única
      // vez sobre o total do grupo (`detalhe.valor`) — nunca por integrante. Quando a competência
      // veio do Ressarcimento Retroativo, `valorRessarcirPrecalculado` já é o valor certo (apurado
      // lá pela GERDAB) — não passa de novo por `calcularReembolso` (evitaria aplicar a fórmula duas
      // vezes sobre o mesmo valor).
      valorRessarcir: detalhe.valorRessarcirPrecalculado ?? calcularReembolso(detalhe.valor),
    };
  });

  const registrosAssociacao: RegistroFechamento[] = getRegistrosAssociacaoAprovadosNaCompetencia(competencia).map((r) => {
    const operadoraTitular = operadoraTitularAssociacao(r);
    return {
      beneficiarioId: `associacao:${r.cpfTitular}:${r.competencia}`,
      // Fase 9: planilhas de associação não trazem matrícula (só CPF) — recuperada da base
      // institucional simulada pelo mesmo ponto único já usado pelo Relatório Financeiro
      // Retroativo (`getMatriculaPorCpf`, `base-institucional.ts`). `undefined` quando o CPF não
      // tem correspondência na base simulada (a tela mostra "—", nunca inventa uma matrícula).
      matricula: getMatriculaPorCpf(r.cpfTitular),
      cpf: r.cpfTitular,
      nome: r.nomeTitular,
      // Não há, nesta rodada, um conceito de vínculo funcional (ativo/inativo/pendente de
      // documentação) para quem vem de planilha de associação — "ativo" é o valor neutro mais
      // coerente para o filtro Todos|Ativos|Inativos da tela não quebrar; registrado como
      // simplificação técnica, não como regra de negócio (ver relatório de implementação).
      situacaoVinculo: "ativo",
      // Operadora do titular + associação responsável (correção da coluna "Operadora/Associação"
      // — antes exibia só a associação). Cada integrante mantém a sua própria na exportação
      // analítica (`formatarOperadoraIntegrante`); este campo é só o valor agregado do grupo.
      operadoraOuAssociacao: operadoraTitular ? `${operadoraTitular} / ${r.associacao}` : r.associacao,
      competencia: r.competencia,
      classificacao: "adimplente",
      valor: r.valor,
      valorRessarcir: calcularReembolso(r.valor),
      composicaoGrupo: r.composicao.map((c) => ({
        nome: c.beneficiario,
        cpf: c.cpf,
        parentesco: c.vinculo,
        valor: c.valor,
        operadora: c.operadora,
      })),
      origem: "associacao",
      origemAssociacao: {
        associacao: r.associacao,
        competencia: r.competencia,
        planilhaId: r.planilhaId,
        statusPlanilha: r.statusPlanilha,
      },
    };
  });

  return [...registrosIndividuais, ...registrosAssociacao];
}

export interface ResumoFechamento {
  competencia: string;
  total: number;
  adimplentes: number;
  inadimplentes: number;
  requerAnalise: number;
  valorTotalAdimplentes: number;
}

export function getResumoFechamento(competencia: string): ResumoFechamento {
  const registros = getRegistrosFechamento(competencia);
  return {
    competencia,
    total: registros.length,
    adimplentes: registros.filter((r) => r.classificacao === "adimplente").length,
    inadimplentes: registros.filter((r) => r.classificacao === "inadimplente").length,
    requerAnalise: registros.filter((r) => r.classificacao === "requer_analise").length,
    valorTotalAdimplentes: registros
      .filter((r) => r.classificacao === "adimplente")
      .reduce((soma, r) => soma + r.valor, 0),
  };
}

/**
 * Situação do fechamento automático de uma competência (Fase 9 — substitui o botão manual
 * "Fechar competência"). O ciclo permanece vigente até o fim do 2º dia útil do mês seguinte à
 * competência; a partir do 3º dia útil, encerra automaticamente (`dias-uteis.ts`, Fase 0). Nunca
 * persistido — sempre recomputado a partir da data de referência (real ou simulada pelo
 * protótipo, `getDataReferencia`), mesmo padrão "recompute on demand" do restante do módulo. Sem
 * reabertura/override: não existe mais nenhuma ação que grave um "fechado" manualmente.
 *
 * `direcionamentoSeRecebidoAgora` reaproveita `getCicloDeDestino` para mostrar para qual
 * competência um registro desta seria direcionado se recebido na data de referência atual — usado
 * aqui só como indicador informativo desta tela (Fechamento). O direcionamento **efetivo** de um
 * novo envio ordinário do servidor (até o 2º dia útil → ciclo vigente; a partir do 3º → ciclo
 * seguinte) é aplicado em `servidor.pagamentos.enviar.tsx` (complemento da Fase 9), com a mesma
 * função `getCicloDeDestino` — nenhuma segunda fórmula de calendário.
 *
 * **Dois casos, propositalmente diferentes (não confundir um com o outro):**
 * 1. **Novo envio, a partir do 3º dia útil** — gravado (`Comprovante.competencia`) já no ciclo
 *    seguinte, com aviso explícito ao servidor antes de confirmar (`servidor.pagamentos.enviar.tsx`).
 * 2. **Registro que já existia (qualquer status, inclusive "Requer análise") no momento em que o
 *    ciclo virou** — **nunca** é movido, reclassificado, aprovado, recusado ou excluído
 *    automaticamente por causa da virada; permanece exatamente como estava, rastreável na
 *    competência em que foi gravado. O fechamento (agora automático) não classifica nem
 *    transforma esses registros. O que fazer com eles depois da virada (retroativo/avulso)
 *    continua Não Escopo — pendência já registrada antes desta fase, explicitamente **não**
 *    resolvida agora, a levantar com a stakeholder.
 */
export interface StatusFechamentoAutomatico {
  competencia: string;
  fechada: boolean;
  /** Fim do 2º dia útil do mês seguinte — momento exato do encerramento automático. */
  fechamentoEm: Date;
  direcionamentoSeRecebidoAgora: { competenciaDestino: string; direcionadoAoCicloSeguinte: boolean };
}

export function getStatusFechamentoAutomatico(
  competencia: string,
  dataReferencia: Date = getDataReferencia(),
): StatusFechamentoAutomatico {
  return {
    competencia,
    fechada: competenciaEstaFechada(competencia, dataReferencia),
    fechamentoEm: getFechamentoAutomatico(competencia),
    direcionamentoSeRecebidoAgora: getCicloDeDestino(competencia, dataReferencia),
  };
}

/* ── Fase 10 — Histórico do Fechamento de Pagamento (snapshot imutável para o NURFI) ──────────
 *
 * Duas regras validadas com o usuário, além do padrão já usado no Retroativo (snapshot imutável,
 * nunca recalculado):
 *
 * 1. **"Requer análise" nunca entra no relatório oficial** — só Adimplente/Inadimplente são
 *    "aptos para envio ao NURFI". Isto reaproveita exatamente a distinção que `ClassificacaoFechamento`
 *    já fazia desde sempre (3 estados; só 2 são decisões finais) — nenhuma regra financeira nova,
 *    só a escolha de quais dos 3 estados já existentes compõem o relatório definitivo. A tela ao
 *    vivo continua mostrando as 3 abas normalmente; só a geração do relatório filtra.
 * 2. **Múltiplos relatórios por competência, sem duplicidade** — cada "Gerar relatório" cria um
 *    snapshot com sequência própria (nº 1, nº 2, ...) e nunca sobrescreve o anterior; um registro
 *    (`beneficiarioId`) que já entrou em QUALQUER snapshot daquela competência não pode entrar de
 *    novo (`getBeneficiariosJaConsolidados`). Um registro em "Requer análise" nunca foi incluído,
 *    então, quando resolvido depois, fica disponível para um relatório posterior da mesma
 *    competência — sem nenhuma ação extra além de gerar de novo.
 *
 *    **Isto é uma possibilidade de contingência, não o fluxo operacional principal.** O esperado
 *    é normalmente um único relatório por competência, contendo todos os registros aptos naquele
 *    momento — um segundo relatório (nº 2, nº 3...) só existe para cobrir o caso em que algo ficou
 *    de fora do primeiro (estava "Requer análise" e só foi resolvido depois). O suporte a múltiplos
 *    relatórios existe para não perder rastreabilidade nesse cenário excepcional, não para incentivar
 *    fatiar deliberadamente o envio ao NURFI em vários relatórios pequenos.
 */

/** Registros da competência já decididos (Adimplente ou Inadimplente) — os únicos aptos para o
 *  relatório oficial do NURFI. "Requer análise" fica de fora até ser resolvido. */
function getRegistrosAptosParaNurfi(competencia: string): RegistroFechamento[] {
  return getRegistrosFechamento(competencia).filter((r) => r.classificacao !== "requer_analise");
}

/** Todos os relatórios (snapshots) já gerados para a competência informada (ou todos, se omitida),
 *  do mais recente para o mais antigo. */
export function getHistoricoFechamentos(competencia?: string): SnapshotFechamentoPagamento[] {
  const todos = loadHistoricoFechamentos();
  return (competencia ? todos.filter((s) => s.competencia === competencia) : todos).sort((a, b) =>
    b.geradoEm.localeCompare(a.geradoEm),
  );
}

/** `beneficiarioId`s da competência que já entraram em algum relatório anterior — nunca podem
 *  compor um novo (evita duplicidade entre relatórios da mesma competência). */
function getBeneficiariosJaConsolidados(competencia: string): Set<string> {
  return new Set(getHistoricoFechamentos(competencia).flatMap((s) => s.linhas.map((l) => l.beneficiarioId)));
}

/** Registros aptos (Adimplente/Inadimplente) que ainda não entraram em nenhum relatório desta
 *  competência — o que um clique em "Gerar relatório" incluiria agora. Serve tanto para a geração
 *  em si quanto para a tela mostrar, antes do clique, quantos registros compõem o próximo relatório. */
export function getRegistrosDisponiveisParaRelatorio(competencia: string): RegistroFechamento[] {
  const jaConsolidados = getBeneficiariosJaConsolidados(competencia);
  return getRegistrosAptosParaNurfi(competencia).filter((r) => !jaConsolidados.has(r.beneficiarioId));
}

/**
 * Gera (congela) um novo relatório do Fechamento de Pagamento para o NURFI. Só permitido depois
 * que a competência já encerrou automaticamente (`getStatusFechamentoAutomatico`) — a geração é um
 * ato deliberado da GERDAB sobre uma competência já decidida por data, nunca uma forma alternativa
 * de fechar ou reabrir. Guarda só os valores já calculados (nunca IDs a re-resolver depois) — o
 * mesmo padrão "nunca recalcula" do Histórico de Consolidações do Retroativo.
 */
export function gerarRelatorioFechamento(competencia: string, responsavel: string): SnapshotFechamentoPagamento {
  if (!getStatusFechamentoAutomatico(competencia).fechada) {
    throw new Error("Só é possível gerar o relatório depois que a competência encerrar automaticamente.");
  }
  const disponiveis = getRegistrosDisponiveisParaRelatorio(competencia);
  if (disponiveis.length === 0) {
    throw new Error("Não há registros aptos (Adimplente/Inadimplente) ainda não incluídos em um relatório anterior desta competência.");
  }
  const anteriores = getHistoricoFechamentos(competencia);
  const snapshot: SnapshotFechamentoPagamento = {
    id: `fech-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    competencia,
    sequencia: anteriores.length + 1,
    geradoEm: getDataReferencia().toISOString(),
    responsavel,
    linhas: disponiveis.map((r) => ({
      beneficiarioId: r.beneficiarioId,
      matricula: r.matricula,
      nome: r.nome,
      situacaoVinculo: r.situacaoVinculo,
      operadoraOuAssociacao: r.operadoraOuAssociacao,
      competencia: r.competencia,
      classificacao: r.classificacao as "adimplente" | "inadimplente",
      valor: r.valor,
      valorRessarcir: r.valorRessarcir,
      situacao: r.situacao,
      motivo: r.motivo,
      observacaoNurfi: getObservacaoNurfi(r.beneficiarioId, competencia)?.texto,
      origem: r.origem,
    })),
  };
  saveHistoricoFechamentos([...loadHistoricoFechamentos(), snapshot]);
  return snapshot;
}

/**
 * Extrato do Servidor (seção 2.1 item 3 / 2.10 do plano) — histórico individual do titular ao
 * longo das competências conhecidas. **Distinto do Fechamento de Pagamento** (visão coletiva
 * por competência) **e do Comprovante de Rendimentos** (consolidado anual dos valores pagos,
 * ainda não implementado) — nunca a mesma tela (diretriz explícita do usuário).
 */
export interface LinhaExtrato {
  competencia: string;
  ano: string;
  houvePagamento: boolean;
  valor: number;
  /** Só presente quando houve algum comprovante na competência. */
  statusComprovante?: StatusComprovante;
  /** Sinaliza que o(s) documento(s) da competência são retroativos — só exibição de status,
   *  sem motor de cálculo de diferença/teto (fora de escopo desta rodada, ver plano seção 2.1
   *  item 8 e docs/MODULO_RELATORIOS.md seção 4). */
  ocorrenciaRetroativo: boolean;
  /** Origem da comprovação nesta competência — rastreabilidade no Extrato/Histórico de
   *  Comprovações (HU04). `getExtratoServidor` (só individual) sempre marca "individual";
   *  `getExtratoPorCpf` (consolidado por CPF) marca "associacao" quando a linha vem de uma
   *  planilha de associação aprovada. */
  origem: OrigemComprovacao;
  /** Só presente quando `origem === "associacao"` — mesma estrutura de rastreabilidade já usada
   *  em `RegistroFechamento.origemAssociacao` (P7), reaproveitada aqui. */
  origemAssociacao?: OrigemAssociacaoDetalhe & { operadora?: string };
}

/** Competências consideradas no Extrato: as mesmas do Fechamento, mais qualquer competência com
 *  comprovante real já registrado (cobre retroativos para competências fora dessa lista, se
 *  algum dia existirem). Ordenadas cronologicamente. */
export function getCompetenciasConhecidas(): string[] {
  const doDataset = new Set(competenciasParaFechamento);
  getComprovantesUnificados().forEach((c) => doDataset.add(c.competencia));
  // Ressarcimento Retroativo (módulo novo): competências que ele já tratou também precisam
  // aparecer no Extrato/Histórico de Comprovações, mesmo fora de `competenciasFechadas` (o
  // servidor pode solicitar qualquer competência anterior, não só as "fechadas para envio").
  getSolicitacoesRetroativas()
    .filter((s) => s.origem === "individual")
    .forEach((s) => s.competencias.forEach((c) => doDataset.add(c.competenciaReferencia)));
  return [...doDataset].sort();
}

export function getExtratoServidor(beneficiarioId: string): LinhaExtrato[] {
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titular = beneficiarios.find((b) => b.id === beneficiarioId);
  if (!titular) return [];

  return getCompetenciasConhecidas().map((competencia): LinhaExtrato => {
    const detalhe = classificarTitularNaCompetencia(titular, competencia, beneficiarios);
    const comprovantesDaCompetencia = getComprovantesUnificados().filter((c) => c.competencia === competencia);
    const houveEnvio = comprovantesDaCompetencia.some((c) =>
      c.beneficiarioIds.some((id) => beneficiarios.some((b) => b.id === id && !b.associacao)),
    );
    return {
      competencia,
      ano: competencia.split("-")[0],
      houvePagamento: detalhe.classificacao === "adimplente",
      valor: detalhe.classificacao === "adimplente" ? detalhe.valor : 0,
      // `detalhe.statusComprovante` tem prioridade: hoje pode vir tanto de um `Comprovante` legado
      // quanto do Ressarcimento Retroativo (módulo novo) — nos dois casos já é a informação certa,
      // mesmo sem `houveEnvio` (o módulo novo não cria `Comprovante` nenhum).
      statusComprovante: detalhe.statusComprovante ?? (houveEnvio ? (detalhe.classificacao === "adimplente" ? "aprovado" : "recusado") : undefined),
      ocorrenciaRetroativo: comprovantesDaCompetencia.some((c) => c.isRetroativo) || (detalhe.statusComprovante ?? "").startsWith("retroativo_"),
      origem: "individual",
    };
  });
}

/**
 * Extrato consolidado por CPF do titular (HU04) — mesma ideia de `getExtratoServidor`, mas capaz
 * de identificar o titular tanto pelo fluxo individual (`BeneficiarioPagamento`) quanto por
 * planilhas de associação já **aprovadas** pela GERDAB (`getRegistrosAssociacaoAprovadosNaCompetencia`),
 * usando o CPF como identificador comum entre as duas origens (nunca duplicando o mesmo titular
 * em duas linhas por vir de fontes diferentes). Nenhum motor de classificação novo: reaproveita
 * `getExtratoServidor` para a origem individual e `getRegistrosAssociacaoAprovadosNaCompetencia`
 * (já usada no Fechamento) para a origem associação — só orquestra as duas por competência.
 *
 * Prioridade em caso de sobreposição (mesmo CPF com dado nas duas origens na mesma competência,
 * cenário hipotético — não ocorre nos dados de exemplo atuais): a linha individual prevalece
 * quando existe envio individual real naquela competência; senão, usa a associação aprovada.
 * Nunca soma as duas nem inventa um terceiro valor.
 */
export function getExtratoPorCpf(cpf: string): LinhaExtrato[] {
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titularIndividual = beneficiarios.find((b) => b.parentesco === "Titular" && b.cpf === cpf);
  const linhasIndividuais = titularIndividual ? getExtratoServidor(titularIndividual.id) : [];
  const porCompetenciaIndividual = new Map(linhasIndividuais.map((l) => [l.competencia, l]));

  return getCompetenciasConhecidas().map((competencia): LinhaExtrato => {
    const individual = porCompetenciaIndividual.get(competencia);
    if (individual && (individual.houvePagamento || individual.statusComprovante)) return individual;

    const registroAssociacao = getRegistrosAssociacaoAprovadosNaCompetencia(competencia).find(
      (r) => r.cpfTitular === cpf,
    );
    if (registroAssociacao) {
      return {
        competencia,
        ano: competencia.split("-")[0],
        houvePagamento: true, // planilha só chega a "aprovada" com 100% dos registros válidos.
        valor: registroAssociacao.valor,
        statusComprovante: undefined, // não há StatusComprovante para planilha — situação própria
        // é `origemAssociacao.statusPlanilha`, exposta abaixo (nunca inventada).
        ocorrenciaRetroativo: false, // planilha de associação não tem conceito de retroativo hoje.
        origem: "associacao",
        origemAssociacao: {
          associacao: registroAssociacao.associacao,
          competencia: registroAssociacao.competencia,
          planilhaId: registroAssociacao.planilhaId,
          statusPlanilha: registroAssociacao.statusPlanilha,
          operadora: operadoraTitularAssociacao(registroAssociacao),
        },
      };
    }

    // Sem dado em nenhuma das duas origens nesta competência — mesmo default "sem envio" que
    // `getExtratoServidor` já usa (`origem` é irrelevante aqui, não há nada a rastrear).
    return individual ?? { competencia, ano: competencia.split("-")[0], houvePagamento: false, valor: 0, ocorrenciaRetroativo: false, origem: "individual" };
  });
}

/**
 * Comprovante de Rendimentos (seção 2.1 item 7 / 2.10 do plano) — consolidado **anual** dos
 * valores de auxílio recebidos pelo servidor, para informe/consulta/exportação (uso declarado:
 * declaração de Imposto de Renda). **Nunca a mesma tela** que a Documentação e Pendências (§3.4,
 * docs/MODULO_RELATORIOS.md) — aquela é sobre documentação obrigatória (IRPF/escolaridade/etc.),
 * esta é sobre valores recebidos (correção explícita do usuário à v1 do plano, que confundia os
 * dois conceitos). Reaproveita `getExtratoServidor` (mesma fonte de dados do Extrato do
 * Servidor) — só agrupa por ano, nenhum motor novo.
 *
 * **Limitação de dados conhecida (não resolvida nesta rodada):** `l.houvePagamento` vem de
 * `detalhe.classificacao === "adimplente"`, ou seja, comprovante **aprovado** na competência —
 * o protótipo não tem nenhum dado de confirmação de repasse efetivo em folha/conta (mesma
 * limitação já registrada para o Histórico de Comprovações, ver comentário acima de
 * `LinhaHistoricoComprovacoes`). "Aprovado" é usado aqui como melhor proxy disponível para
 * "recebido", mas as duas coisas **não são a mesma garantia** — não inventar uma equivalência
 * mais forte do que os dados sustentam. Ver nota de limitação em
 * docs/MODULO_RELATORIOS.md §3.19.
 */
export interface ComprovanteRendimentos {
  ano: string;
  nome: string;
  matricula?: string;
  cpf?: string;
  linhas: { competencia: string; valorRecebido: number }[];
  totalAnual: number;
}

export function getAnosDisponiveis(beneficiarioId: string): string[] {
  const anos = new Set(getExtratoServidor(beneficiarioId).map((l) => l.ano));
  return [...anos].sort();
}

export function getComprovanteRendimentos(beneficiarioId: string, ano: string): ComprovanteRendimentos | undefined {
  const titular = getBeneficiariosPagamentoAtual().find((b) => b.id === beneficiarioId);
  if (!titular) return undefined;
  const linhas = getExtratoServidor(beneficiarioId)
    .filter((l) => l.ano === ano)
    .map((l) => ({ competencia: l.competencia, valorRecebido: l.houvePagamento ? l.valor : 0 }));
  return {
    ano,
    nome: titular.nome,
    matricula: titular.matricula,
    cpf: titular.cpf,
    linhas,
    totalAnual: linhas.reduce((soma, l) => soma + l.valorRecebido, 0),
  };
}

/**
 * Titular consolidado por CPF (HU04) — identificador comum entre as duas origens que alimentam o
 * Histórico de Comprovações: o fluxo individual (`BeneficiarioPagamento`) e as planilhas de
 * associação já **aprovadas** pela GERDAB. Um titular com registros nas duas origens (mesmo CPF)
 * aparece como uma única entrada — nunca duplicado por ter vindo de fontes diferentes. Reaproveita
 * exatamente os dados já existentes (`getBeneficiariosPagamentoAtual`,
 * `getRegistrosAssociacaoAprovadosNaCompetencia`); nenhuma fonte paralela de beneficiários.
 */
export interface TitularConsolidadoPorCpf {
  cpf: string;
  nome: string;
  /** Só presente para titulares do fluxo individual — planilha de associação não tem matrícula
   *  (é exatamente por isso que a identificação passou a ser por CPF, não por matrícula). */
  matricula?: string;
  situacaoVinculo: BeneficiarioPagamento["situacao"];
}

function getTitularesConsolidadosPorCpf(): TitularConsolidadoPorCpf[] {
  const porCpf = new Map<string, TitularConsolidadoPorCpf>();

  getBeneficiariosPagamentoAtual()
    .filter((b) => b.parentesco === "Titular" && b.cpf)
    .forEach((b) => porCpf.set(b.cpf!, { cpf: b.cpf!, nome: b.nome, matricula: b.matricula, situacaoVinculo: b.situacao }));

  // Associação — mesma convenção já usada em `getRegistrosFechamento` para `situacaoVinculo`:
  // não há, nesta rodada, conceito de vínculo funcional para quem vem só de planilha, então
  // "ativo" é o valor neutro. Só entra como titular novo se o CPF ainda não veio do individual
  // (prioridade ao cadastro individual quando o mesmo CPF existir nas duas origens).
  getCompetenciasConhecidas().forEach((competencia) => {
    getRegistrosAssociacaoAprovadosNaCompetencia(competencia).forEach((r) => {
      if (!porCpf.has(r.cpfTitular)) {
        porCpf.set(r.cpfTitular, { cpf: r.cpfTitular, nome: r.nomeTitular, situacaoVinculo: "ativo" });
      }
    });
  });

  return [...porCpf.values()];
}

/**
 * Histórico de Comprovações (visão administrativa consolidada — GERDAB) — inverte a dimensão do
 * Extrato do Servidor (que é 1 titular × várias competências): aqui é vários titulares ×
 * histórico consolidado, com drill-down para o Extrato individual de cada um. **Nenhum motor de
 * classificação novo** — reaproveita `getExtratoPorCpf` (que por sua vez reaproveita
 * `getExtratoServidor` e `getRegistrosAssociacaoAprovadosNaCompetencia`, já usadas no Extrato e no
 * Fechamento) só agregando por titular.
 *
 * Identificação por **CPF** (HU04) em vez de matrícula: matrícula não existe para titulares vindos
 * só de planilha de associação, e o CPF é o identificador comum às duas origens — ver
 * `getTitularesConsolidadosPorCpf`.
 *
 * Correção de nomenclatura (era "Histórico de Pagamentos"): o sistema não tem confirmação de
 * que o auxílio foi efetivamente pago em folha — só evidência de comprovação e análise. Por
 * isso "pagas" / "não pagas" / "total pago" viraram "comprovadas" / "não comprovadas" / "valor
 * aprovado" — o mesmo dado, sem alterar o motor de análise, só a semântica exposta.
 */
export interface LinhaHistoricoComprovacoes {
  cpf: string;
  matricula?: string;
  nome: string;
  situacaoVinculo: BeneficiarioPagamento["situacao"];
  competencias: number;
  comprovadas: number;
  naoComprovadas: number;
  emAnalise: number;
  valorAprovado: number;
}

export interface FiltroHistoricoComprovacoes {
  ano?: string;
  competencia?: string;
}

/** Lookup de 1 titular consolidado por CPF — usado pelo Extrato Individual (`/admin/relatorios/
 *  extrato/$cpf`) para obter nome/matrícula/vínculo sem duplicar a lógica de consolidação de
 *  `getTitularesConsolidadosPorCpf` (mesma fonte usada pela listagem do Histórico). */
export function getTitularConsolidadoPorCpf(cpf: string): TitularConsolidadoPorCpf | undefined {
  return getTitularesConsolidadosPorCpf().find((t) => t.cpf === cpf);
}

export function getHistoricoComprovacoes(filtro?: FiltroHistoricoComprovacoes): LinhaHistoricoComprovacoes[] {
  return getTitularesConsolidadosPorCpf().map((titular): LinhaHistoricoComprovacoes => {
    let linhas = getExtratoPorCpf(titular.cpf);
    if (filtro?.ano) linhas = linhas.filter((l) => l.ano === filtro.ano);
    if (filtro?.competencia) linhas = linhas.filter((l) => l.competencia === filtro.competencia);

    // `houvePagamento` é o nome histórico do campo em `LinhaExtrato` — representa, na prática,
    // "comprovação analisada e aprovada" (individual) ou "planilha aprovada" (associação), não
    // confirmação de pagamento em folha. Aqui, na camada de apresentação do Histórico, o
    // significado correto (comprovada) é o que é exposto.
    const comprovadas = linhas.filter((l) => l.houvePagamento).length;
    const emAnalise = linhas.filter(
      (l) => l.statusComprovante && statusRequerAnalise.includes(l.statusComprovante),
    ).length;
    const naoComprovadas = linhas.length - comprovadas - emAnalise;

    return {
      cpf: titular.cpf,
      matricula: titular.matricula,
      nome: titular.nome,
      situacaoVinculo: titular.situacaoVinculo,
      competencias: linhas.length,
      comprovadas,
      naoComprovadas,
      emAnalise,
      valorAprovado: linhas.reduce((soma, l) => soma + l.valor, 0),
    };
  });
}

export { formatCompetencia, statusComprovanteLabels, beneficiariosSeed as beneficiariosPagamentoSeed };
export { getObservacaoNurfi };

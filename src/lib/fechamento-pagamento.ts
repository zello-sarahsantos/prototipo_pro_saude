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
} from "./prosaude-storage";
import { getCamposDoBeneficiario, statusDoBeneficiarioNoDocumento } from "./comprovante-status";

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

export interface RegistroFechamento {
  beneficiarioId: string;
  matricula?: string;
  nome: string;
  situacaoVinculo: BeneficiarioPagamento["situacao"];
  competencia: string;
  classificacao: ClassificacaoFechamento;
  /** Origem do dado que gerou a classificação — para rastreabilidade (seção 2.5). */
  comprovanteId?: string;
  valor: number;
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
  "classificacao" | "comprovanteId" | "valor" | "situacao" | "motivo" | "statusComprovante" | "ultimaAcaoEm"
>;

/**
 * Núcleo de classificação de 1 servidor titular em 1 competência — extraído para ser
 * reaproveitado tanto pelo Fechamento de Pagamento (`getRegistrosFechamento`, itera titulares
 * numa competência) quanto pelo Extrato do Servidor (`getExtratoServidor`, itera competências
 * para 1 titular). Nenhum motor de cálculo novo, só leitura/derivação dos dados já existentes
 * do Módulo de Pagamento (`Comprovante`, `AcaoComprovante`) — mesmo padrão "recompute on
 * demand, nunca persistir" já usado em notificações.
 */
function classificarTitularNaCompetencia(
  titular: BeneficiarioPagamento,
  competencia: string,
  todosBeneficiarios: BeneficiarioPagamento[],
): ClassificacaoDetalhe {
  const comprovantes = getComprovantesUnificados().filter((c) => c.competencia === competencia);
  const dispensadosIds = new Set(getBeneficiariosDispensadosIds(competencia));

  // Grupo familiar do titular, excluindo quem tem comprovação coletiva via associação
  // (regra 6b do Módulo de Pagamento — nunca entra no checklist/classificação individual).
  const grupo = todosBeneficiarios.filter((b) => !b.associacao);

  // Um documento do grupo cobre o titular quando o comprovante inclui qualquer beneficiário
  // do grupo (fatura técnica multi-beneficiário) ou o próprio titular isoladamente.
  const docsGrupo = comprovantes.filter((c) => c.beneficiarioIds.some((id) => grupo.some((b) => b.id === id)));

  if (docsGrupo.length === 0) {
    const dispensado = grupo.every((b) => dispensadosIds.has(b.id));
    return {
      classificacao: "inadimplente",
      valor: titular.valorCadastrado,
      situacao: "Suspender",
      motivo: dispensado
        ? "Servidor optou por não apresentar comprovante nesta competência (dispensa registrada)."
        : "Não apresentou comprovante de pagamento nesta competência.",
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

  const valorTotal = statusPorBeneficiario.reduce(
    (soma, s) => soma + (ultimoValor(s.comprovante, s.beneficiarioId) ?? 0),
    0,
  );

  if (algumRequerAnalise) {
    const ref = algumRequerAnalise;
    const acao = ultimaAcao(ref.comprovante, ref.beneficiarioId);
    return {
      classificacao: "requer_analise",
      comprovanteId: ref.comprovante.id,
      valor: valorTotal || titular.valorCadastrado,
      statusComprovante: ref.status,
      ultimaAcaoEm: acao?.data,
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
    };
  }

  if (todosAdimplentes) {
    const primeiro = statusPorBeneficiario[0];
    return {
      classificacao: "adimplente",
      comprovanteId: primeiro?.comprovante.id,
      valor: valorTotal || titular.valorCadastrado,
    };
  }

  // Sobra defensiva — não deve ocorrer com os status hoje mapeados, mas evita perder um
  // registro silenciosamente se um novo `StatusComprovante` for adicionado no futuro sem
  // atualizar as listas acima.
  return { classificacao: "requer_analise", valor: titular.valorCadastrado };
}

/**
 * Classifica cada servidor titular para uma competência (visão do Fechamento de Pagamento —
 * itera titulares, ver `classificarTitularNaCompetencia` para o núcleo reaproveitado).
 */
export function getRegistrosFechamento(competencia: string): RegistroFechamento[] {
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titulares = beneficiarios.filter((b) => b.parentesco === "Titular");

  return titulares.map((titular): RegistroFechamento => ({
    beneficiarioId: titular.id,
    matricula: titular.matricula,
    nome: titular.nome,
    situacaoVinculo: titular.situacao,
    competencia,
    ...classificarTitularNaCompetencia(titular, competencia, beneficiarios),
  }));
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

/** Regra 2.4 do plano: existir qualquer registro em "Requer análise" bloqueia o fechamento —
 *  recomendação deste plano, marcada como pendente de confirmação com a stakeholder (seção 2.8). */
export function podeFecharCompetencia(competencia: string): boolean {
  return getResumoFechamento(competencia).requerAnalise === 0;
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
}

/** Competências consideradas no Extrato: as mesmas do Fechamento, mais qualquer competência com
 *  comprovante real já registrado (cobre retroativos para competências fora dessa lista, se
 *  algum dia existirem). Ordenadas cronologicamente. */
export function getCompetenciasConhecidas(): string[] {
  const doDataset = new Set(competenciasParaFechamento);
  getComprovantesUnificados().forEach((c) => doDataset.add(c.competencia));
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
      statusComprovante: houveEnvio ? detalhe.statusComprovante ?? (detalhe.classificacao === "adimplente" ? "aprovado" : "recusado") : undefined,
      ocorrenciaRetroativo: comprovantesDaCompetencia.some((c) => c.isRetroativo),
    };
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
 * Histórico de Comprovações (visão administrativa consolidada — GERDAB) — inverte a dimensão do
 * Extrato do Servidor (que é 1 servidor × várias competências): aqui é vários servidores ×
 * histórico consolidado, com drill-down para o Extrato individual de cada um. **Nenhum motor de
 * classificação novo** — reaproveita `getExtratoServidor` (mesma fonte usada pelo Extrato) só
 * agregando por servidor, exatamente como pedido ("não criar um segundo motor de classificação").
 *
 * Correção de nomenclatura (era "Histórico de Pagamentos"): o sistema não tem confirmação de
 * que o auxílio foi efetivamente pago em folha — só evidência de comprovação e análise. Por
 * isso "pagas" / "não pagas" / "total pago" viraram "comprovadas" / "não comprovadas" / "valor
 * aprovado" — o mesmo dado (`getExtratoServidor`), sem alterar o motor de análise, só a
 * semântica exposta.
 */
export interface LinhaHistoricoComprovacoes {
  beneficiarioId: string;
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

export function getHistoricoComprovacoes(filtro?: FiltroHistoricoComprovacoes): LinhaHistoricoComprovacoes[] {
  const beneficiarios = getBeneficiariosPagamentoAtual();
  const titulares = beneficiarios.filter((b) => b.parentesco === "Titular");

  return titulares.map((titular): LinhaHistoricoComprovacoes => {
    let linhas = getExtratoServidor(titular.id);
    if (filtro?.ano) linhas = linhas.filter((l) => l.ano === filtro.ano);
    if (filtro?.competencia) linhas = linhas.filter((l) => l.competencia === filtro.competencia);

    // `houvePagamento` é o nome histórico do campo em `LinhaExtrato` (getExtratoServidor) —
    // representa, na prática, "comprovação analisada e aprovada", não confirmação de pagamento
    // em folha. Mantido sem renomear ali para não alterar o motor de análise; aqui, na camada
    // de apresentação do Histórico de Comprovações, o significado correto (comprovada) é o que
    // é exposto.
    const comprovadas = linhas.filter((l) => l.houvePagamento).length;
    const emAnalise = linhas.filter(
      (l) => l.statusComprovante && statusRequerAnalise.includes(l.statusComprovante),
    ).length;
    const naoComprovadas = linhas.length - comprovadas - emAnalise;

    return {
      beneficiarioId: titular.id,
      matricula: titular.matricula,
      nome: titular.nome,
      situacaoVinculo: titular.situacao,
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

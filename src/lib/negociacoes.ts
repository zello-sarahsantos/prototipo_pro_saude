/**
 * Módulo de Negociações (GERDAB) — regras e persistência. **Fase 1: cadastro e consulta.**
 *
 * Negociação = acordo firmado entre o servidor e a operadora/associação para pagar mensalidades em atraso.
 * O ressarcimento do auxílio Pró-Saúde NÃO usa o valor das prestações do acordo (que podem ter juros, multas e
 * encargos): usa o **auxílio elegível dos meses negociados** (meses originais em atraso). Para cada mês o
 * analista informa o **valor da parcela** original e o sistema calcula o auxílio com a MESMA função da primeira
 * inclusão (`calcularReembolso`: base limitada ao teto × percentual), editável com justificativa. O que o
 * acordo cobra por prestação (`valorCobradoCents`) é só informação complementar opcional.
 *
 * Princípios (decisões da stakeholder, plano v2 e revisão funcional):
 *  - Nenhum OCR/IA: o analista informa os dados lidos da documentação; anexos são só documentais/auditoria.
 *  - Auxílio por mês = `calcularReembolso` (parâmetros ATUAIS de `regrasProSaude`). Para meses antigos isso é
 *    uma referência — não uma afirmação de que seja a regra histórica da época; a GERDAB confere e corrige com
 *    justificativa. Os parâmetros usados ficam gravados na negociação e ela nunca é recalculada depois.
 *  - Dinheiro em **centavos inteiros** (representação com duas casas decimais). Entradas com mais de duas
 *    casas são recusadas — nada é arredondado em silêncio.
 *  - **Truncamento administrativo** (critério SOLICITADO para o protótipo, ainda NÃO homologado pela GERDAB):
 *    para parcelas de mesmo valor, valor por parcela = divisão INTEIRA dos centavos elegíveis pela quantidade
 *    de parcelas (corte seco em duas casas — sem arredondamento matemático). A diferença residual
 *    (total elegível − soma calculada) é apenas EXIBIDA para conferência: nunca é distribuída, somada à última
 *    parcela nem compensada automaticamente. Entrada diferenciada/parcelas distintas (P01) continuam sendo
 *    preenchidas manualmente, com justificativa obrigatória e trilha de auditoria.
 *  - Ajuste/preenchimento manual: justificativa obrigatória; o valor calculado original é preservado.
 *  - Confirmado o cadastro, valores ficam congelados (correção/retificação = pendência P02/P04).
 *  - **Quitação (Fase 2):** sempre MANUAL, confirmada pela GERDAB (data, responsável, histórico), parcela a parcela e
 *    em qualquer ordem. Vencimento passado ou documento anexado NUNCA quitam sozinhos. Só parcela quitada poderá compor
 *    o relatório de ressarcimento (Fase 4); relatórios e encaminhamento ainda não existem.
 *
 * DADOS DEMONSTRATIVOS: ver `garantirMassaDemonstracaoNegociacoes` (fictícios, sem dados pessoais reais).
 */
import { servidoresList, analistaReferencia, gerenteReferencia, calcularReembolso, regrasProSaude, type ServidorListItem } from "./mock-data";
import { getDataReferencia } from "./dias-uteis";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { removerArquivo, salvarArquivo } from "./armazenamento-arquivos";
import { getEnvio, rotuloEnvio } from "./negociacoes-envios";

/* ── Dinheiro (centavos) ───────────────────────────────────────────────────────────────────── */

/** Converte texto pt-BR em centavos. Recusa mais de duas casas decimais (sem arredondamento silencioso). */
export function parseMoedaCentavos(texto: string): { centavos: number } | { erro: string } {
  let t = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return { erro: "Informe o valor." };
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return { erro: "Valor inválido." };
  const [inteiro, frac = ""] = t.split(".");
  if (frac.length > 2) return { erro: "Use no máximo duas casas decimais." };
  return { centavos: Number(inteiro) * 100 + Number(frac.padEnd(2, "0")) };
}

export const formatarCentavos = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto editável (sem símbolo) a partir de centavos — "2000,00". */
export const centavosParaTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/* ── Tipos ─────────────────────────────────────────────────────────────────────────────────── */

/** Tipo de parcelamento IDENTIFICADO pelos valores finais das parcelas (nunca escolhido): "uniforme" = todas iguais;
 *  "diferenciado" = entrada diferenciada ou parcelas distintas — regra de distribuição NÃO validada (P01), o sistema não
 *  distribui automaticamente: vale o que o analista ajustou. Não altera total elegível, cálculos nem ajustes. */
export type CriterioParcelamento = "uniforme" | "diferenciado";

export interface CompetenciaOriginal {
  /** Mês negociado — "AAAA-MM". */
  competencia: string;
  /** "Valor da parcela" original do mês, conforme a documentação (nome interno histórico: `valorOriginalCents`). */
  valorOriginalCents: number;
  /** "Auxílio elegível" FINAL do mês (calculado ou ajustado) — BASE do ressarcimento. */
  valorElegivelCents: number;
  /** Auxílio calculado pelo sistema com `calcularReembolso`. Ausente em negociações anteriores a esta regra,
   *  cujo auxílio foi informado pelo analista. */
  auxilioCalculadoCents?: number;
  /** Base considerada no cálculo (valor da parcela limitado ao teto), em centavos. */
  baseCalculoCents?: number;
  /** Preenchido só quando o analista substituiu o auxílio calculado (valor anterior, novo, quem, quando, por quê). */
  ajusteAuxilio?: AjusteAuxilio;
  observacao?: string;
}

export interface AjusteAuxilio {
  id: string;
  competencia: string;
  calculadoCents: number;
  valorInformadoCents: number;
  responsavel: string;
  dataHora: string;
  justificativa: string;
}

export type OrigemAuxilio = "automatico" | "manual" | "anterior";
/** "anterior" = negociação cadastrada antes do cálculo automático (auxílio informado pelo analista). */
export const origemAuxilio = (c: CompetenciaOriginal): OrigemAuxilio => (c.ajusteAuxilio ? "manual" : c.auxilioCalculadoCents !== undefined ? "automatico" : "anterior");

/** Trilha append-only: toda substituição do valor calculado (ou preenchimento sem cálculo) gera um registro. */
export interface AjusteFinanceiro {
  id: string;
  parcela: number;
  /** Valor calculado pelo sistema na ocasião (`null` = não havia cálculo automático). */
  calculadoCents: number | null;
  valorInformadoCents: number;
  responsavel: string;
  dataHora: string;
  justificativa: string;
}

export interface ValorRessarcimento {
  /** Valor calculado originalmente — preservado para consulta. `null` = sem cálculo automático disponível. */
  calculadoCents: number | null;
  /** Valor final utilizado nas etapas posteriores. */
  finalCents: number;
  origem: "automatico" | "manual";
  ajustes: AjusteFinanceiro[];
}

/** Confirmação MANUAL de quitação (nunca inferida de vencimento ou de anexo). */
export interface Quitacao {
  /** Data da quitação informada pelo analista — "AAAA-MM-DD". */
  data: string;
  responsavel: string;
  /** Quando o analista registrou a confirmação (ISO). */
  confirmadaEm: string;
  /** Documento da própria negociação que fundamenta a informação (opcional). */
  documentoId?: string;
  /** Relatório recebido da associação (Fase 3) apontado MANUALMENTE como origem da informação — o arquivo nunca confirma nada sozinho. */
  envioId?: string;
  observacao?: string;
}

export interface ParcelaNegociada {
  numero: number;
  /** Valor cobrado pela operadora/associação (pode ter juros/multas) — informação complementar OPCIONAL,
   *  nunca base de cálculo. */
  valorCobradoCents?: number;
  /** "AAAA-MM-DD". */
  vencimento: string;
  ressarcimento: ValorRessarcimento;
  /** Reservado para a Fase 2 (quitação manual) — não é preenchido nem exibido como ação na Fase 1. */
  quitacao?: Quitacao;
}

export type TipoDocumentoNegociacao =
  | "contrato_negociacao"
  | "acordo_assinado"
  | "boleto"
  | "comprovante_pagamento"
  | "documento_servidor"
  | "documento_associacao"
  | "outro";

export const TIPOS_DOCUMENTO_NEGOCIACAO: Record<TipoDocumentoNegociacao, string> = {
  contrato_negociacao: "Contrato de negociação",
  acordo_assinado: "Acordo assinado",
  boleto: "Boleto",
  comprovante_pagamento: "Comprovante de pagamento",
  documento_servidor: "Documento enviado pelo servidor",
  documento_associacao: "Documento enviado pela associação",
  outro: "Outro documento",
};

/** Classificação simples (sem lista rígida): o analista declara se o documento FUNDAMENTA a negociação ou é apoio. */
export type FinalidadeDocumento = "fundamenta" | "apoio";
export const FINALIDADES_DOCUMENTO: Record<FinalidadeDocumento, string> = {
  fundamenta: "Fundamenta a negociação",
  apoio: "Apoio / complementar",
};

export interface DocumentoNegociacao {
  id: string;
  nome: string;
  tipo: TipoDocumentoNegociacao;
  finalidade: FinalidadeDocumento;
  descricao?: string;
  tamanho?: number;
  mime?: string;
  incluidoEm: string;
  incluidoPor: string;
  momento: "cadastro" | "acompanhamento";
  /** Conteúdo em IndexedDB (mesmo id). Ausente = documento de demonstração (sem arquivo). */
  comArquivo: boolean;
}

export interface EventoHistoricoNegociacao {
  id: string;
  dataHora: string;
  responsavel: string;
  tipo: "cadastro" | "ajuste_financeiro" | "documento" | "quitacao";
  descricao: string;
}

export interface Negociacao {
  id: string;
  numero: number;
  matricula: string;
  cpf: string;
  nomeServidor: string;
  /** Associação (ASSEFAZ/ASSETRAN) ou "—" quando individual. */
  associacao: string;
  operadora: string;
  processoSEI?: string;
  /** "AAAA-MM-DD". */
  dataFormalizacao: string;
  qtdParcelas: number;
  criterio: CriterioParcelamento;
  observacoes?: string;
  competenciasOriginais: CompetenciaOriginal[];
  totalElegivelCents: number;
  parcelas: ParcelaNegociada[];
  documentos: DocumentoNegociacao[];
  historico: EventoHistoricoNegociacao[];
  criadaEm: string;
  criadaPor: string;
  /** Regra com que os valores calculados foram obtidos (ausente em cadastros anteriores a ela). */
  regraCalculo?: "truncamento_administrativo";
  /** Parâmetros de `regrasProSaude` usados no cálculo do auxílio, gravados na confirmação. Negociações
   *  confirmadas nunca são recalculadas por mudanças futuras nesses parâmetros. */
  regraAuxilio?: { percentual: number; tetoCents: number };
  /** Valores do cadastro do servidor no momento do cadastro da negociação: `associacao`/`operadora`/`processoSEI`
   *  acima podem ter sido ajustados NO CONTEXTO da negociação — o cadastro principal nunca é alterado. */
  contextoCadastro?: { associacao: string; operadora: string; processoSEI?: string };
  /** Registro de demonstração semeado pela massa (nunca definido em cadastros reais). */
  demo?: boolean;
}

/* ── Cálculo ───────────────────────────────────────────────────────────────────────────────── */

/* ── Auxílio elegível por mês (reutiliza `calcularReembolso`) ──────────────────────────────── */

/** Representação monetária com duas casas — a MESMA que o sistema exibe (`formatCurrency` usa 2 casas). Não é uma
 *  regra nova de arredondamento: só converte o resultado de `calcularReembolso` para centavos inteiros. */
const paraCentavos = (reais: number) => parseInt(reais.toFixed(2).replace(".", ""), 10);

export interface CalculoAuxilio {
  /** Valor da parcela original informado. */
  valorParcelaCents: number;
  /** Valor da parcela limitado ao teto familiar (base do cálculo). */
  baseCents: number;
  percentual: number;
  tetoCents: number;
  acimaDoTeto: boolean;
  /** Auxílio elegível calculado. */
  auxilioCents: number;
}

/** Auxílio elegível de UM mês a partir do valor da parcela original — mesma regra da primeira inclusão
 *  (`calcularReembolso`: base = min(valor, teto) × percentual), sem regra paralela. */
export function calcularAuxilioElegivel(valorParcelaCents: number): CalculoAuxilio {
  const tetoCents = paraCentavos(regrasProSaude.tetoFamiliar);
  return {
    valorParcelaCents,
    baseCents: Math.min(valorParcelaCents, tetoCents),
    percentual: regrasProSaude.percentualReembolso,
    tetoCents,
    acimaDoTeto: valorParcelaCents > tetoCents,
    auxilioCents: paraCentavos(calcularReembolso(valorParcelaCents / 100)),
  };
}

export const regraAuxilioVigente = () => ({ percentual: regrasProSaude.percentualReembolso, tetoCents: paraCentavos(regrasProSaude.tetoFamiliar) });

/* ── Vencimentos ───────────────────────────────────────────────────────────────────────────── */

/** Data "AAAA-MM-DD" completa e plausível (ignora valores parciais de digitação, como ano 0002). */
export function vencimentoValido(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 2000 || a > 2100) return false;
  const dt = new Date(a, me - 1, d);
  return dt.getFullYear() === a && dt.getMonth() === me - 1 && dt.getDate() === d;
}

/** Soma `n` meses à data, mantendo o dia (limitado ao último dia do mês). Parte sempre da data BASE, para não
 *  acumular deslocamento (31/01 → 28/02 → 31/03). */
export function somarMesesISO(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const base = new Date(Number(m[1]), Number(m[2]) - 1 + n, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(Math.min(Number(m[3]), ultimo)).padStart(2, "0")}`;
}

/** Alertas objetivos de sequência (não bloqueiam: a documentação pode indicar datas diferentes). */
export function verificarVencimentos(vencimentos: string[]): string[] {
  const avisos: string[] = [];
  vencimentos.forEach((v, i) => {
    if (i === 0 || !vencimentoValido(v) || !vencimentoValido(vencimentos[i - 1])) return;
    if (v === vencimentos[i - 1]) avisos.push(`Parcela ${i + 1}: vencimento repetido (igual ao da parcela ${i}).`);
    else if (v < vencimentos[i - 1]) avisos.push(`Parcela ${i + 1}: vencimento anterior ao da parcela ${i}.`);
  });
  return avisos;
}

export interface MemoriaCalculo {
  totalElegivelCents: number;
  qtdParcelas: number;
  valorPorParcelaCents: number;
  somaCalculadaCents: number;
  /** Total elegível − soma calculada: exibida para conferência, nunca distribuída. */
  residualCents: number;
}

export type ResultadoCalculo =
  | { disponivel: true; valoresCents: number[]; memoria: MemoriaCalculo }
  | { disponivel: false; motivo: string };

/**
 * TRUNCAMENTO ADMINISTRATIVO (parcelas de mesmo valor): valor por parcela = ⌊centavos elegíveis ÷ nº de parcelas⌋,
 * em aritmética de inteiros (corte seco, sem arredondamento matemático). O resto fica como diferença
 * residual exibida; não é redistribuído. Critério do protótipo, sujeito à validação da GERDAB.
 */
export function calcularRessarcimento(totalElegivelCents: number, qtdParcelas: number, criterio: CriterioParcelamento): ResultadoCalculo {
  if (criterio === "diferenciado") {
    return { disponivel: false, motivo: "Entrada diferenciada ou parcelas distintas: a regra de distribuição ainda não foi validada (P01). Preencha manualmente." };
  }
  if (!Number.isInteger(qtdParcelas) || qtdParcelas < 1) return { disponivel: false, motivo: "Informe a quantidade de parcelas negociadas." };
  if (!Number.isInteger(totalElegivelCents) || totalElegivelCents <= 0) return { disponivel: false, motivo: "Informe os meses negociados e o valor da parcela de cada um." };
  const valorPorParcelaCents = Math.floor(totalElegivelCents / qtdParcelas); // divisão inteira (valores positivos)
  if (valorPorParcelaCents < 1) return { disponivel: false, motivo: "O total elegível é menor que um centavo por parcela. Preencha manualmente." };
  const somaCalculadaCents = valorPorParcelaCents * qtdParcelas;
  return {
    disponivel: true,
    valoresCents: Array.from({ length: qtdParcelas }, () => valorPorParcelaCents),
    memoria: { totalElegivelCents, qtdParcelas, valorPorParcelaCents, somaCalculadaCents, residualCents: totalElegivelCents - somaCalculadaCents },
  };
}

/* ── Persistência ──────────────────────────────────────────────────────────────────────────── */

export function loadNegociacoes(): Negociacao[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.negociacoes) ?? "[]") as Negociacao[];
  } catch {
    return [];
  }
}

/** Evento disparado a cada gravação, para que a fila mensal, os indicadores e a central de notificações se atualizem
 *  na hora, sem recarregar a página. */
export const EVENTO_NEGOCIACOES = "prosaude-negociacoes";

function saveNegociacoes(n: Negociacao[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROSAUDE_STORAGE_KEYS.negociacoes, JSON.stringify(n));
  } catch {
    throw new Error("Não foi possível gravar a negociação (armazenamento do navegador cheio).");
  }
  window.dispatchEvent(new Event(EVENTO_NEGOCIACOES));
}

/** Remove negociações que satisfazem o filtro (uso: migração da massa de demonstração). */
export function removerNegociacoes(filtro: (n: Negociacao) => boolean) {
  saveNegociacoes(loadNegociacoes().filter((n) => !filtro(n)));
}

export function listarNegociacoes(): Negociacao[] {
  return loadNegociacoes().sort((a, b) => b.numero - a.numero);
}

export function getNegociacao(id: string): Negociacao | undefined {
  return loadNegociacoes().find((n) => n.id === id);
}

const novoId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const responsavelAtual = (role: string) => (role === "gerencia" ? gerenteReferencia : analistaReferencia);

/* ── Situações e indicadores (derivados) ───────────────────────────────────────────────────── */

export type SituacaoNegociacao = "andamento" | "concluida";
export const ROTULO_SITUACAO: Record<SituacaoNegociacao, string> = { andamento: "Em andamento", concluida: "Concluída" };

/** Concluída = todas as parcelas quitadas (definição a validar — N7). Na Fase 1 ninguém quita, então tudo é "Em andamento". */
export function getSituacaoNegociacao(n: Negociacao): SituacaoNegociacao {
  return n.parcelas.length > 0 && n.parcelas.every((p) => p.quitacao) ? "concluida" : "andamento";
}

export const parcelasQuitadas = (n: Negociacao) => n.parcelas.filter((p) => p.quitacao).length;

export interface IndicadoresNegociacoes {
  emAndamento: number;
  concluidas: number;
  parcelasPendentes: number;
  /** Parcelas com quitação confirmada. Ainda não existe encaminhamento (Fase 4): todas aguardam ressarcimento. */
  parcelasQuitadas: number;
  quitadasAguardandoCents: number;
  totalParcelas: number;
  totalElegivelCents: number;
}

export function getIndicadores(negs: Negociacao[]): IndicadoresNegociacoes {
  return {
    emAndamento: negs.filter((n) => getSituacaoNegociacao(n) === "andamento").length,
    concluidas: negs.filter((n) => getSituacaoNegociacao(n) === "concluida").length,
    parcelasPendentes: negs.reduce((t, n) => t + n.parcelas.filter((p) => !p.quitacao).length, 0),
    parcelasQuitadas: negs.reduce((t, n) => t + parcelasQuitadas(n), 0),
    quitadasAguardandoCents: negs.reduce((t, n) => t + n.parcelas.filter((p) => p.quitacao).reduce((a, p) => a + p.ressarcimento.finalCents, 0), 0),
    totalParcelas: negs.reduce((t, n) => t + n.parcelas.length, 0),
    totalElegivelCents: negs.reduce((t, n) => t + n.totalElegivelCents, 0),
  };
}

/* ── Cadastro ──────────────────────────────────────────────────────────────────────────────── */

export const MSG_DOCUMENTACAO_OBRIGATORIA = "É necessário anexar a documentação comprobatória para confirmar o cadastro da negociação.";
export const MSG_DOCUMENTACAO_SEM_FUNDAMENTO = "Há anexos, mas nenhum foi identificado como fundamento da negociação. Classifique ao menos um documento como “Fundamenta a negociação”.";

/** Valida só a documentação (compartilhada pela tela e pelo serviço). `undefined` = ok. */
export function validarDocumentacao(docs: { finalidade: FinalidadeDocumento }[]): string | undefined {
  if (docs.length === 0) return MSG_DOCUMENTACAO_OBRIGATORIA;
  if (!docs.some((d) => d.finalidade === "fundamenta")) return MSG_DOCUMENTACAO_SEM_FUNDAMENTO;
  return undefined;
}

export interface NovoDocumentoInput {
  arquivo?: File;
  nome: string;
  tipo: TipoDocumentoNegociacao;
  finalidade: FinalidadeDocumento;
  descricao?: string;
}

export interface NovoMesInput {
  /** Mês negociado — "AAAA-MM". */
  competencia: string;
  /** Valor da parcela original do mês, conforme a documentação. O auxílio é calculado pelo serviço. */
  valorParcelaCents: number;
  /** Substitui o auxílio calculado. Exige justificativa. */
  ajuste?: { valorCents: number; justificativa: string };
}

export interface NovaParcelaInput {
  numero: number;
  /** Opcional: informação complementar do acordo. */
  valorCobradoCents?: number;
  vencimento: string;
  /** Valor manual (substitui o calculado ou preenche quando não há cálculo). Exige justificativa. */
  manual?: { valorCents: number; justificativa: string };
}

export interface NovaNegociacaoInput {
  matricula: string;
  /** Contexto da negociação — pré-preenchidos do cadastro, editáveis; NUNCA gravam no cadastro do servidor. */
  associacao?: string;
  operadora?: string;
  processoSEI?: string;
  demo?: boolean;
  dataFormalizacao: string;
  observacoes?: string;
  competencias: NovoMesInput[];
  parcelas: NovaParcelaInput[];
  documentos: NovoDocumentoInput[];
  responsavel: string;
}

function servidorPorMatricula(matricula: string): ServidorListItem | undefined {
  return servidoresList.find((s) => s.matricula === matricula);
}

/**
 * Confirma o cadastro: aplica TODAS as regras (a tela só as antecipa). Grava os anexos em IndexedDB antes do
 * registro — se algum arquivo falhar, nada é confirmado e os já gravados são removidos.
 */
export async function criarNegociacao(input: NovaNegociacaoInput): Promise<Negociacao> {
  const serv = servidorPorMatricula(input.matricula);
  if (!serv) throw new Error("Selecione o servidor a partir do cadastro.");
  if (!input.dataFormalizacao) throw new Error("Informe a data de formalização.");
  if (input.competencias.length === 0) throw new Error("Informe ao menos um mês negociado.");
  const chaves = input.competencias.map((c) => c.competencia);
  if (chaves.some((c) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(c))) throw new Error("Mês negociado inválido.");
  if (new Set(chaves).size !== chaves.length) throw new Error("Há meses negociados repetidos.");
  if (input.competencias.some((c) => !(c.valorParcelaCents > 0))) throw new Error("Informe o valor da parcela de cada mês negociado.");
  if (input.parcelas.length === 0) throw new Error("Informe as parcelas negociadas.");
  if (input.parcelas.some((p) => !vencimentoValido(p.vencimento))) throw new Error("Informe um vencimento válido para todas as parcelas.");
  const msgDoc = validarDocumentacao(input.documentos);
  if (msgDoc) throw new Error(msgDoc);

  const agora = new Date().toISOString();
  // Auxílio elegível de cada mês: `calcularReembolso` (regra da primeira inclusão); ajuste manual exige justificativa.
  const competencias: CompetenciaOriginal[] = input.competencias.map((m) => {
    const calc = calcularAuxilioElegivel(m.valorParcelaCents);
    const base: CompetenciaOriginal = { competencia: m.competencia, valorOriginalCents: m.valorParcelaCents, valorElegivelCents: calc.auxilioCents, auxilioCalculadoCents: calc.auxilioCents, baseCalculoCents: calc.baseCents };
    if (!m.ajuste) return base;
    if (!m.ajuste.justificativa.trim()) throw new Error(`Informe a justificativa do auxílio elegível de ${m.competencia}.`);
    if (!(m.ajuste.valorCents >= 0)) throw new Error(`Auxílio elegível inválido em ${m.competencia}.`);
    return {
      ...base,
      valorElegivelCents: m.ajuste.valorCents,
      ajusteAuxilio: { id: novoId("aja"), competencia: m.competencia, calculadoCents: calc.auxilioCents, valorInformadoCents: m.ajuste.valorCents, responsavel: input.responsavel, dataHora: agora, justificativa: m.ajuste.justificativa.trim() },
    };
  });
  const total = competencias.reduce((t, c) => t + c.valorElegivelCents, 0);
  if (total <= 0) throw new Error("O total elegível deve ser maior que zero.");
  // Cálculo automático (truncamento) sempre como base; o tipo de parcelamento é identificado pelos valores finais.
  const calc = calcularRessarcimento(total, input.parcelas.length, "uniforme");

  const parcelas: ParcelaNegociada[] = input.parcelas
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .map((p, i) => {
      const calculado = calc.disponivel ? calc.valoresCents[i] : null;
      if (!p.vencimento) throw new Error(`Informe o vencimento da parcela ${p.numero}.`);
      if (p.manual) {
        if (!p.manual.justificativa.trim()) throw new Error(`Informe a justificativa do valor do ressarcimento da parcela ${p.numero}.`);
        const ajuste: AjusteFinanceiro = {
          id: novoId("aj"),
          parcela: p.numero,
          calculadoCents: calculado,
          valorInformadoCents: p.manual.valorCents,
          responsavel: input.responsavel,
          dataHora: agora,
          justificativa: p.manual.justificativa.trim(),
        };
        return { numero: p.numero, valorCobradoCents: p.valorCobradoCents, vencimento: p.vencimento, ressarcimento: { calculadoCents: calculado, finalCents: p.manual.valorCents, origem: "manual" as const, ajustes: [ajuste] } };
      }
      if (calculado === null) throw new Error(`A parcela ${p.numero} não tem cálculo automático: preencha o valor do ressarcimento com justificativa.`);
      return { numero: p.numero, valorCobradoCents: p.valorCobradoCents, vencimento: p.vencimento, ressarcimento: { calculadoCents: calculado, finalCents: calculado, origem: "automatico" as const, ajustes: [] } };
    });

  // Anexos: conteúdo em IndexedDB primeiro (falha = nada confirmado).
  const gravados: string[] = [];
  const documentos: DocumentoNegociacao[] = [];
  try {
    for (const d of input.documentos) {
      const id = novoId("doc");
      if (d.arquivo) {
        await salvarArquivo(id, d.arquivo);
        gravados.push(id);
      }
      documentos.push({ id, nome: d.nome, tipo: d.tipo, finalidade: d.finalidade, descricao: d.descricao?.trim() || undefined, tamanho: d.arquivo?.size, mime: d.arquivo?.type || undefined, incluidoEm: agora, incluidoPor: input.responsavel, momento: "cadastro", comArquivo: !!d.arquivo });
    }
  } catch (e) {
    await Promise.all(gravados.map((id) => removerArquivo(id)));
    throw e;
  }

  const todas = loadNegociacoes();
  const negociacao: Negociacao = {
    id: novoId("neg"),
    numero: todas.reduce((m, n) => Math.max(m, n.numero), 0) + 1,
    matricula: serv.matricula,
    cpf: serv.cpf,
    nomeServidor: serv.nome,
    associacao: input.associacao?.trim() || serv.associacao,
    operadora: input.operadora?.trim() || serv.operadora || "—",
    processoSEI: input.processoSEI?.trim() || undefined,
    dataFormalizacao: input.dataFormalizacao,
    qtdParcelas: parcelas.length,
    criterio: new Set(parcelas.map((p) => p.ressarcimento.finalCents)).size > 1 ? "diferenciado" : "uniforme",
    observacoes: input.observacoes?.trim() || undefined,
    competenciasOriginais: competencias,
    totalElegivelCents: total,
    parcelas,
    documentos,
    historico: [
      { id: novoId("ev"), dataHora: agora, responsavel: input.responsavel, tipo: "cadastro", descricao: `Negociação cadastrada: ${competencias.length} mês(es) negociado(s), ${parcelas.length} parcela(s), total elegível ${formatarCentavos(total)}.` },
      ...competencias.flatMap((c) =>
        c.ajusteAuxilio
          ? [
              {
                id: novoId("ev"),
                dataHora: agora,
                responsavel: input.responsavel,
                tipo: "ajuste_financeiro" as const,
                descricao: `Auxílio elegível de ${c.competencia}: valor calculado ${formatarCentavos(c.ajusteAuxilio.calculadoCents)} substituído por ${formatarCentavos(c.ajusteAuxilio.valorInformadoCents)}. Justificativa: ${c.ajusteAuxilio.justificativa}`,
              },
            ]
          : [],
      ),
      ...parcelas.flatMap((p) =>
        p.ressarcimento.ajustes.map((a) => ({
          id: novoId("ev"),
          dataHora: agora,
          responsavel: input.responsavel,
          tipo: "ajuste_financeiro" as const,
          descricao:
            a.calculadoCents === null
              ? `Ressarcimento da parcela ${a.parcela}: valor preenchido manualmente (${formatarCentavos(a.valorInformadoCents)}) — sem cálculo automático. Justificativa: ${a.justificativa}`
              : `Ressarcimento da parcela ${a.parcela}: valor calculado ${formatarCentavos(a.calculadoCents)} substituído por ${formatarCentavos(a.valorInformadoCents)}. Justificativa: ${a.justificativa}`,
        })),
      ),
      ...documentos.map((d) => ({ id: novoId("ev"), dataHora: agora, responsavel: input.responsavel, tipo: "documento" as const, descricao: `Documento anexado: ${d.nome} (${TIPOS_DOCUMENTO_NEGOCIACAO[d.tipo]} · ${FINALIDADES_DOCUMENTO[d.finalidade]}).` })),
    ],
    criadaEm: agora,
    criadaPor: input.responsavel,
    regraCalculo: calc.disponivel ? "truncamento_administrativo" : undefined,
    regraAuxilio: regraAuxilioVigente(),
    contextoCadastro: { associacao: serv.associacao, operadora: serv.operadora ?? "—", processoSEI: serv.processoSEI || undefined },
    demo: input.demo || undefined,
  };
  try {
    saveNegociacoes([...todas, negociacao]);
  } catch (e) {
    await Promise.all(gravados.map((id) => removerArquivo(id)));
    throw e;
  }
  return negociacao;
}

/** Anexa documento a uma negociação já cadastrada (documentos complementares/apoio). */
export async function adicionarDocumento(negociacaoId: string, d: NovoDocumentoInput & { arquivo: File }, responsavel: string): Promise<Negociacao> {
  const todas = loadNegociacoes();
  const alvo = todas.find((n) => n.id === negociacaoId);
  if (!alvo) throw new Error("Negociação não encontrada.");
  const id = novoId("doc");
  await salvarArquivo(id, d.arquivo);
  const agora = new Date().toISOString();
  const doc: DocumentoNegociacao = { id, nome: d.nome, tipo: d.tipo, finalidade: d.finalidade, descricao: d.descricao?.trim() || undefined, tamanho: d.arquivo.size, mime: d.arquivo.type || undefined, incluidoEm: agora, incluidoPor: responsavel, momento: "acompanhamento", comArquivo: true };
  const atualizada: Negociacao = {
    ...alvo,
    documentos: [...alvo.documentos, doc],
    historico: [...alvo.historico, { id: novoId("ev"), dataHora: agora, responsavel, tipo: "documento", descricao: `Documento anexado: ${doc.nome} (${TIPOS_DOCUMENTO_NEGOCIACAO[doc.tipo]} · ${FINALIDADES_DOCUMENTO[doc.finalidade]}).` }],
  };
  try {
    saveNegociacoes(todas.map((n) => (n.id === alvo.id ? atualizada : n)));
  } catch (e) {
    await removerArquivo(id);
    throw e;
  }
  return atualizada;
}

/* ── Quitação manual (Fase 2) ──────────────────────────────────────────────────────────────── */

export interface ConfirmarQuitacaoInput {
  numeroParcela: number;
  /** "AAAA-MM-DD" — não pode ser futura em relação à data de referência do protótipo. */
  data: string;
  responsavel: string;
  /** Documento já anexado à negociação que fundamenta a informação (opcional). */
  documentoId?: string;
  /** Relatório recebido da associação usado como referência (vinculação manual; opcional). */
  envioId?: string;
  /** Comprovante novo, anexado junto da confirmação (opcional): entra como documento de apoio. */
  comprovante?: File;
  observacao?: string;
}

/**
 * Confirma MANUALMENTE a quitação de uma parcela. Regras: só parcela pendente; qualquer ordem (a parcela 3 pode ser
 * quitada com a 2 pendente); data válida e não futura; nada é inferido de vencimento ou de anexos. Registra data,
 * responsável e histórico. Parcelas quitadas não são desfeitas no protótipo (correção/retificação = P02/P04).
 * Gravação atômica: se algo falhar, nem a quitação nem o comprovante são gravados.
 */
export async function confirmarQuitacao(negociacaoId: string, input: ConfirmarQuitacaoInput): Promise<Negociacao> {
  const todas = loadNegociacoes();
  const alvo = todas.find((n) => n.id === negociacaoId);
  if (!alvo) throw new Error("Negociação não encontrada.");
  const parcela = alvo.parcelas.find((p) => p.numero === input.numeroParcela);
  if (!parcela) throw new Error("Parcela não encontrada.");
  if (parcela.quitacao) throw new Error(`A parcela ${parcela.numero} já teve a quitação confirmada em ${parcela.quitacao.data.split("-").reverse().join("/")}.`);
  if (!vencimentoValido(input.data)) throw new Error("Informe uma data de quitação válida.");
  const ref = getDataReferencia();
  const hoje = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`;
  if (input.data > hoje) throw new Error("A data de quitação não pode ser futura.");
  if (input.documentoId && !alvo.documentos.some((d) => d.id === input.documentoId)) throw new Error("Documento de origem inválido.");
  const envio = input.envioId ? getEnvio(input.envioId) : undefined;
  if (input.envioId && !envio) throw new Error("Relatório recebido de origem inválido.");

  const agora = new Date().toISOString();
  let documentoId = input.documentoId;
  let novoDoc: DocumentoNegociacao | undefined;
  let gravado: string | undefined;
  if (input.comprovante) {
    const id = novoId("doc");
    await salvarArquivo(id, input.comprovante);
    gravado = id;
    novoDoc = { id, nome: input.comprovante.name, tipo: "comprovante_pagamento", finalidade: "apoio", descricao: `Comprovante da quitação da parcela ${parcela.numero}`, tamanho: input.comprovante.size, mime: input.comprovante.type || undefined, incluidoEm: agora, incluidoPor: input.responsavel, momento: "acompanhamento", comArquivo: true };
    documentoId = id;
  }
  const origem = documentoId ? [...alvo.documentos, ...(novoDoc ? [novoDoc] : [])].find((d) => d.id === documentoId) : undefined;
  const atualizada: Negociacao = {
    ...alvo,
    parcelas: alvo.parcelas.map((p) => (p.numero === parcela.numero ? { ...p, quitacao: { data: input.data, responsavel: input.responsavel, confirmadaEm: agora, documentoId, envioId: envio?.id, observacao: input.observacao?.trim() || undefined } } : p)),
    documentos: novoDoc ? [...alvo.documentos, novoDoc] : alvo.documentos,
    historico: [
      ...alvo.historico,
      ...(novoDoc ? [{ id: novoId("ev"), dataHora: agora, responsavel: input.responsavel, tipo: "documento" as const, descricao: `Documento anexado: ${novoDoc.nome} (${TIPOS_DOCUMENTO_NEGOCIACAO[novoDoc.tipo]} · ${FINALIDADES_DOCUMENTO[novoDoc.finalidade]}).` }] : []),
      {
        id: novoId("ev"),
        dataHora: agora,
        responsavel: input.responsavel,
        tipo: "quitacao" as const,
        descricao: `Quitação confirmada: parcela ${parcela.numero}/${alvo.parcelas.length} em ${input.data.split("-").reverse().join("/")} — ressarcimento ${formatarCentavos(parcela.ressarcimento.finalCents)}.${origem ? ` Origem da informação: ${origem.nome}.` : ""}${envio ? ` Relatório da associação consultado: ${rotuloEnvio(envio)}.` : ""}${input.observacao?.trim() ? ` Observação: ${input.observacao.trim()}` : ""}`,
      },
    ],
  };
  try {
    saveNegociacoes(todas.map((n) => (n.id === alvo.id ? atualizada : n)));
  } catch (e) {
    if (gravado) await removerArquivo(gravado);
    throw e;
  }
  return atualizada;
}

/* ── Rotina mensal: fila de confirmações de pagamento pendentes ────────────────────────────── */

export type ClassificacaoVencimento = "vence_no_mes" | "em_atraso";
export const ROTULO_CLASSIFICACAO: Record<ClassificacaoVencimento, string> = { vence_no_mes: "Vence neste mês", em_atraso: "Em atraso" };

export interface ItemFila {
  negociacao: Negociacao;
  parcela: ParcelaNegociada;
  /** Apenas indicador de vencimento — a situação administrativa continua "Pendente" até a GERDAB confirmar. */
  classificacao: ClassificacaoVencimento;
}

/** Competência de referência ("AAAA-MM") — mês da data de referência do sistema. */
export function getCompetenciaReferencia(ref: Date = getDataReferencia()): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Fila de CONFIRMAÇÕES DE PAGAMENTO PENDENTES: parcelas com situação "Pendente" cujo vencimento é do mês de referência
 * ("Vence neste mês") ou de meses anteriores ("Em atraso"). Vencimentos em meses futuros não entram; parcelas quitadas
 * também não. Ordenada por vencimento (mais antigo primeiro), sem limite de registros. É uma tarefa de CONFERÊNCIA:
 * nunca altera a situação da parcela por conta do vencimento.
 */
export function getFilaConfirmacoes(negs: Negociacao[] = loadNegociacoes(), ref: Date = getDataReferencia()): ItemFila[] {
  const comp = getCompetenciaReferencia(ref);
  const itens: ItemFila[] = [];
  for (const negociacao of negs) {
    for (const parcela of negociacao.parcelas) {
      if (parcela.quitacao) continue;
      const mes = parcela.vencimento.slice(0, 7);
      if (!mes || mes > comp) continue;
      itens.push({ negociacao, parcela, classificacao: mes === comp ? "vence_no_mes" : "em_atraso" });
    }
  }
  return itens.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento) || a.negociacao.nomeServidor.localeCompare(b.negociacao.nomeServidor) || a.parcela.numero - b.parcela.numero);
}

/**
 * Motor do Ressarcimento Retroativo (Fase 1 do plano v3, ata de 22/09/2026).
 *
 * Modelo **aditivo**: o retroativo "leve" já existente (`Comprovante.isRetroativo`, status
 * `retroativo_*`) permanece intacto. Aqui, uma `SolicitacaoRetroativa` reúne 1..N competências,
 * cada uma com estado, valores e decisão próprios — uma decisão em janeiro nunca altera fevereiro.
 *
 * Regras funcionais fechadas refletidas neste arquivo:
 * - **Valor Pago** = auxílio efetivamente recebido no contracheque; **Valor Devido** = valor
 *   histórico devido na competência. Ambos são apurados/validados pela **GERDAB** — o servidor
 *   nunca os informa e o sistema **nunca** calcula o Valor Devido a partir do cadastro atual nem
 *   de `calcularReembolso`. **Valor a ser Ressarcido = Valor Devido − Valor Pago**, calculado só
 *   depois da validação do Valor Devido (recomputado sob demanda, nunca persistido).
 * - **Mês/Ano de Pagamento** é derivado (competência + 1 mês), nunca digitado pelo servidor; só a
 *   GERDAB corrige, com evento de auditoria.
 * - **Um único gate financeiro por origem**: origem individual → Aprovado/Negado da competência
 *   (`DecisaoCompetencia`); origem associação → Habilitado/Não habilitado do registro Titular +
 *   Competência (`HabilitacaoRegistro`). **Nenhum registro de Associação nasce habilitado**: o envio da
 *   planilha não é autorização financeira; sem decisão explícita da GERDAB o registro permanece
 *   "em análise" (não analisar ≠ negar) e NÃO entra na Consolidação.
 *   Cada função abaixo recusa a origem errada (guards) — nunca se exige os dois estados.
 * - Histórico de decisões e apuração é **append-only**.
 * - **Observação** do relatório: texto determinístico por motivo (`OBSERVACAO_POR_MOTIVO`) +
 *   complemento opcional da GERDAB; nunca a justificativa livre do servidor.
 *
 * Catálogo de motivos e textos de Observação são **PROVISÓRIOS** (lista final e redação
 * institucional pendentes com a stakeholder); "Outros" exige justificativa.
 */
import { anexarEvento, novaAuditoria } from "./auditoria";
import { getAssociacaoResponsavelPorCpf, getClassificacaoAtivoInativoPorCpf, getMatriculaPorCpf, normalizarCpf, type GrupoAtivoInativo } from "./base-institucional";
import { proximaCompetencia } from "./dias-uteis";
import { competenciaAtual, formatCompetencia } from "./mock-data";
import {
  loadSolicitacoesRetroativas,
  saveSolicitacoesRetroativas,
  type CompetenciaRetroativa,
  type ComposicaoRegistroRetroativo,
  type DecisaoCompetencia,
  type DocumentoRetroativo,
  type EventoApuracao,
  type HabilitacaoRegistro,
  type MotivoRessarcimento,
  type OrigemRetroativo,
  type SolicitacaoRetroativa,
  type TipoDocumentoRetroativo,
} from "./prosaude-storage";

export type {
  CompetenciaRetroativa,
  ComposicaoRegistroRetroativo,
  DecisaoCompetencia,
  DocumentoRetroativo,
  EventoApuracao,
  HabilitacaoRegistro,
  MotivoRessarcimento,
  OrigemRetroativo,
  SolicitacaoRetroativa,
  TipoDocumentoRetroativo,
};

/* ── Catálogo PROVISÓRIO de motivos e textos padrão da Observação ─────────────────────────── */

export const MOTIVOS_RESSARCIMENTO: Record<string, string> = {
  comprovante_pagamento: "Apresentação de comprovante de pagamento",
  inclusao_dependente: "Inclusão de dependente",
  reinclusao_dependente: "Reinclusão de dependente",
  declaracao_escolaridade: "Apresentação de declaração de escolaridade",
  declaracao_irpf: "Apresentação de declaração de Imposto de Renda",
  mudanca_faixa_etaria: "Mudança de faixa etária",
  autorizacao_excepcional: "Autorização excepcional",
  outros: "Outros",
};

/** Tipos de documento aceitos por competência retroativa: catálogo COMPLETO, sempre disponível — servem
 *  só para classificar/organizar os anexos para análise manual da GERDAB (não replicam as regras de
 *  IA/OCR do Módulo de Pagamento; nenhuma restrição por tipo de plano nem combinação obrigatória). */
export const TIPOS_DOCUMENTO_RETROATIVO: Record<TipoDocumentoRetroativo, string> = {
  boleto: "Boleto",
  comprovante_pagamento: "Comprovante de pagamento",
  recibo: "Recibo",
  demonstrativo: "Demonstrativo",
  fatura_tecnica: "Fatura técnica",
  documento_motivo: "Documento relacionado ao motivo",
  autorizacao: "Autorização",
  outro: "Outro documento",
};

export const TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO = 80;

/** Regra determinística motivo → texto do sistema (redação provisória, a validar). */
export const OBSERVACAO_POR_MOTIVO: Record<string, string> = {
  comprovante_pagamento: "Ressarcimento retroativo — apresentação de comprovante de pagamento.",
  inclusao_dependente: "Ressarcimento retroativo — inclusão de dependente.",
  reinclusao_dependente: "Ressarcimento retroativo — reinclusão de dependente.",
  declaracao_escolaridade: "Ressarcimento retroativo — apresentação de declaração de escolaridade.",
  declaracao_irpf: "Ressarcimento retroativo — apresentação de declaração de Imposto de Renda.",
  mudanca_faixa_etaria: "Ressarcimento retroativo — mudança de faixa etária.",
  autorizacao_excepcional: "Ressarcimento retroativo — autorização excepcional.",
  outros: "Ressarcimento retroativo — outro motivo aplicável.",
};

/** Observação final = texto do sistema (por motivo) + complemento opcional da GERDAB. */
export function gerarObservacao(solicitacao: SolicitacaoRetroativa, competencia: CompetenciaRetroativa): string {
  const base = OBSERVACAO_POR_MOTIVO[solicitacao.motivo] ?? OBSERVACAO_POR_MOTIVO.outros;
  const complemento = competencia.observacaoComplemento?.trim();
  return complemento ? `${base} ${complemento}` : base;
}

/* ── Derivações ───────────────────────────────────────────────────────────────────────────── */

const FORMATO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mês/Ano de Pagamento derivado: o mês subsequente à competência de referência. */
export function derivarMesAnoPagamento(competenciaReferencia: string): string {
  return proximaCompetencia(competenciaReferencia);
}

export type SituacaoApuracao = "incompleta" | "ok" | "divergente";

/**
 * Situação da apuração da GERDAB para a competência:
 * - `incompleta`: falta registrar o Valor Pago ou validar o Valor Devido;
 * - `ok`: Valor Pago ≤ Valor Devido;
 * - `divergente`: **Valor Pago > Valor Devido** — inconsistência de apuração que deve ser
 *   sinalizada para conferência da GERDAB e **impede a autorização financeira** do registro
 *   enquanto não for corrigida (nunca vira valor negativo nem é zerada em silêncio).
 */
export function getSituacaoApuracao(c: CompetenciaRetroativa): SituacaoApuracao {
  if (!c.valorDevidoValidado || c.valorDevido === undefined || c.valorPagoContracheque === undefined) return "incompleta";
  return c.valorPagoContracheque > c.valorDevido ? "divergente" : "ok";
}

/**
 * Valor a ser Ressarcido — só com apuração `ok` (Valor Devido validado pela GERDAB e Valor Pago
 * registrado): Pago < Devido → Devido − Pago; Pago = Devido → R$ 0,00 (não há diferença retroativa
 * a pagar). **Nunca negativo**: com `divergente` (Pago > Devido) ou `incompleta` retorna
 * `undefined`. Nunca somado entre competências; recomputado sob demanda.
 */
export function calcularValorRessarcir(c: CompetenciaRetroativa): number | undefined {
  if (getSituacaoApuracao(c) !== "ok") return undefined;
  return Math.round((c.valorDevido! - c.valorPagoContracheque!) * 100) / 100;
}

export type EstadoCompetencia = "aguardando_analise" | "aprovado" | "negado" | "habilitado" | "desabilitado";

/** Estado atual = última decisão do domínio da origem. Individual sem decisão → `aguardando_analise`;
 *  associação sem decisão → `aguardando_analise` (nunca nasce habilitado; só uma ação explícita da GERDAB habilita). */
export function getEstadoCompetencia(origem: OrigemRetroativo, c: CompetenciaRetroativa): EstadoCompetencia {
  const ultima = c.decisoes[c.decisoes.length - 1];
  if (origem === "individual") return ultima && ultima.dominio === "competencia_retroativa" ? ultima.decisao : "aguardando_analise";
  return ultima && ultima.dominio === "registro_planilha" ? ultima.decisao : "aguardando_analise";
}

/**
 * Integração com o Fechamento de Pagamento e o Extrato/Histórico de Comprovações
 * (`fechamento-pagamento.ts`): resultado do módulo novo para 1 titular + 1 competência, origem
 * individual — único ponto de leitura para essa integração (o Fechamento nunca recalcula nada,
 * só consulta o que o motor do retroativo já apurou/decidiu). Retorna `undefined` quando o titular
 * não tem nenhuma solicitação cobrindo essa competência (o Fechamento então segue com sua própria
 * lógica de sempre — o retroativo leve legado, para quem ainda tem registro lá).
 */
export interface ResultadoRetroativoIndividual {
  estado: "pendente" | "aprovado" | "negado";
  /** Auxílio efetivamente recebido no contracheque (Valor Pago) — quando já apurado. */
  valorPago?: number;
  /** Valor histórico devido (Valor Devido) — quando já validado. */
  valorDevido?: number;
  /** Só quando `estado === "aprovado"` e a apuração está `ok` (nunca negativo). */
  valorRessarcir?: number;
  /** Só quando `estado === "negado"`. */
  justificativaNegado?: string;
  /** Data/hora do evento mais recente da competência — para "última ação" no Fechamento. */
  ultimaAtualizacaoEm?: string;
}

export function getResultadoRetroativoIndividual(cpfTitular: string, competencia: string): ResultadoRetroativoIndividual | undefined {
  const alvo = normalizarCpf(cpfTitular);
  for (const s of loadSolicitacoesRetroativas()) {
    if (s.origem !== "individual" || normalizarCpf(s.cpfTitular) !== alvo) continue;
    const c = s.competencias.find((x) => x.competenciaReferencia === competencia);
    if (!c) continue;
    const estado = getEstadoCompetencia("individual", c);
    const eventos = [...c.apuracao, ...c.decisoes].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
    const ultimaAtualizacaoEm = eventos[eventos.length - 1]?.dataHora;
    if (estado === "aprovado") {
      return { estado: "aprovado", valorPago: c.valorPagoContracheque, valorDevido: c.valorDevido, valorRessarcir: calcularValorRessarcir(c), ultimaAtualizacaoEm };
    }
    if (estado === "negado") {
      const decisao = c.decisoes[c.decisoes.length - 1];
      return { estado: "negado", justificativaNegado: decisao?.justificativa, ultimaAtualizacaoEm };
    }
    return { estado: "pendente", valorPago: c.valorPagoContracheque, valorDevido: c.valorDevido, ultimaAtualizacaoEm };
  }
  return undefined;
}

/**
 * O que ainda impede a autorização financeira da competência (lista vazia = pronta para autorizar).
 * **Condições obrigatórias, para as duas origens:** Valor Pago registrado; Valor Devido validado;
 * apuração sem divergência (Pago ≤ Devido); **Contracheque conferido**. Individual: só então a
 * competência pode ser aprovada. Associação: só então a habilitação do titular + competência
 * produz autorização financeira (sem decisão explícita o registro fica em análise; só "Habilitar para ressarcimento" o torna apto).
 */
export function getPendenciasAutorizacao(c: CompetenciaRetroativa): string[] {
  const pendencias: string[] = [];
  if (c.valorPagoContracheque === undefined) pendencias.push("Valor Pago ainda não registrado.");
  if (!c.valorDevidoValidado) pendencias.push("Valor Devido ainda não validado.");
  if (getSituacaoApuracao(c) === "divergente") pendencias.push("Divergência de apuração: Valor Pago maior que o Valor Devido.");
  if (!c.contrachequeConferido) pendencias.push("Contracheque ainda não conferido pela GERDAB.");
  return pendencias;
}

/** A competência está autorizada financeiramente? Um único gate por origem (individual: aprovada;
 *  associação: habilitada) **e** sem nenhuma pendência de autorização (apuração completa, sem
 *  divergência e contracheque conferido). Só registros autorizados compõem o relatório. */
export function estaAutorizada(origem: OrigemRetroativo, c: CompetenciaRetroativa): boolean {
  if (getPendenciasAutorizacao(c).length > 0) return false;
  const estado = getEstadoCompetencia(origem, c);
  return origem === "individual" ? estado === "aprovado" : estado === "habilitado";
}

/* ── Seleção de competências (entrada do fluxo, Portal do Servidor) ────────────────────────── */

export const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Anos selecionáveis: do ano vigente até 2010 (a ata não define limite temporal; inclui períodos
 *  anteriores à implantação do sistema). */
export function getAnosRetroativos(): number[] {
  const anoAtual = Number(competenciaAtual.split("-")[0]);
  return Array.from({ length: anoAtual - 2009 }, (_, i) => anoAtual - i);
}

/**
 * Competências do titular que já possuem solicitação retroativa (qualquer estado) no módulo novo —
 * não podem ser solicitadas de novo.
 *
 * Nota de protótipo: o fluxo legado (`Comprovante.isRetroativo`, status `retroativo_*`) não é
 * cruzado aqui. O Portal já não oferece mais o legado como opção para competências passadas (única
 * porta de entrada é este módulo), e a massa de demonstração foi montada para não repetir, no
 * legado e no módulo novo, a mesma competência do mesmo titular. Em produção, com dados e migração
 * reais, seria necessária uma estratégia própria de conciliação entre os dois fluxos (ou a
 * descontinuação efetiva do legado) — isso está fora do escopo deste protótipo.
 */
export function getCompetenciasJaSolicitadas(cpfTitular: string): Set<string> {
  const ja = new Set<string>();
  loadSolicitacoesRetroativas()
    .filter((s) => s.origem === "individual" && s.cpfTitular === cpfTitular)
    .forEach((s) => s.competencias.forEach((c) => ja.add(c.competenciaReferencia)));
  return ja;
}

/** Validação única (usada na página de Pagamentos e no formulário) de uma competência a incluir:
 *  mensagem de erro ou `undefined` se válida. */
export function validarCompetenciaRetroativa(competencia: string, jaSelecionadas: Iterable<string>, jaSolicitadas: Set<string>): string | undefined {
  if (!FORMATO_COMPETENCIA.test(competencia)) return "Selecione o mês e o ano.";
  if (competencia >= competenciaAtual) {
    return `Só competências anteriores a ${formatCompetencia(competenciaAtual)} podem ser solicitadas como retroativas.`;
  }
  if (jaSolicitadas.has(competencia)) return "Essa competência já possui solicitação retroativa.";
  if ([...jaSelecionadas].includes(competencia)) return "Essa competência já foi adicionada.";
  return undefined;
}

/* ── Criação ─────────────────────────────────────────────────────────────────────────────── */

export interface NovaCompetenciaInput {
  competenciaReferencia: string;
  /** Arquivo + tipo + descrição (descrição só para "Outro documento"). */
  documentos?: DocumentoRetroativo[];
  // Origem associação (planilha retroativa):
  dataEmissaoBoleto?: string;
  vencimento?: string;
  dataBaixa?: string;
  composicao?: ComposicaoRegistroRetroativo[];
}

export interface NovaSolicitacaoInput {
  origem: OrigemRetroativo;
  associacao?: string;
  cpfTitular: string;
  nomeTitular: string;
  motivo: MotivoRessarcimento;
  justificativa: string;
  autorizacaoExcepcional?: { instancia: string; referenciaDocumento: string };
  competencias: NovaCompetenciaInput[];
  /** Origem associação: planilha retroativa enviada (comprovação). */
  arquivoId?: string;
}

/**
 * Cria e persiste uma solicitação. Valores (Valor Pago/Valor Devido) e Mês/Ano de Pagamento NÃO
 * fazem parte da entrada: os primeiros são apurados pela GERDAB e o segundo é derivado.
 */
export function criarSolicitacaoRetroativa(input: NovaSolicitacaoInput): SolicitacaoRetroativa {
  if (!input.cpfTitular.trim() || !input.nomeTitular.trim()) throw new Error("Titular obrigatório.");
  if (!input.motivo) throw new Error("Motivo obrigatório.");
  if (!input.justificativa.trim()) throw new Error("Justificativa obrigatória.");
  if (input.motivo === "autorizacao_excepcional" && (!input.autorizacaoExcepcional?.instancia.trim() || !input.autorizacaoExcepcional?.referenciaDocumento.trim())) {
    throw new Error("Autorização excepcional exige a instância autorizadora e a referência ao ato/documento.");
  }
  if (input.origem === "associacao" && !input.associacao) throw new Error("Origem associação exige a associação.");
  // Proteção defensiva (a elegibilidade real é barrada antes, no Portal — `origem-comprovacao.ts`):
  // titular vinculado a Associação responsável não tem retroativo individual.
  if (input.origem === "individual") {
    const responsavel = getAssociacaoResponsavelPorCpf(input.cpfTitular);
    if (responsavel) throw new Error(`Titular vinculado à ${responsavel}: o ressarcimento retroativo é enviado pela Associação, não pelo Portal do Servidor.`);
  }
  if (input.competencias.length === 0) throw new Error("Informe ao menos uma competência.");

  const vistas = new Set<string>();
  const competencias: CompetenciaRetroativa[] = input.competencias.map((n) => {
    if (!FORMATO_COMPETENCIA.test(n.competenciaReferencia)) throw new Error(`Competência inválida: ${n.competenciaReferencia}`);
    if (vistas.has(n.competenciaReferencia)) throw new Error(`Competência repetida: ${n.competenciaReferencia}`);
    vistas.add(n.competenciaReferencia);
    const documentos = (n.documentos ?? []).map((d): DocumentoRetroativo => {
      if (!(d.tipo in TIPOS_DOCUMENTO_RETROATIVO)) throw new Error(`Tipo de documento inválido em ${n.competenciaReferencia}: ${d.nome}`);
      const descricao = d.tipo === "outro" ? d.descricao?.trim().slice(0, TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO) || undefined : undefined;
      // "Outro documento" exige descrição curta (rastreabilidade); os demais tipos não têm descrição.
      if (d.tipo === "outro" && !descricao) throw new Error(`Informe a descrição do "Outro documento" (${d.nome}) em ${n.competenciaReferencia}.`);
      return { nome: d.nome, tipo: d.tipo, descricao, conteudo: d.conteudo, origem: "original", anexadoEm: new Date().toISOString(), anexadoPor: input.nomeTitular };
    });
    // Requisito mínimo (sem combinações obrigatórias): ao menos 1 documento por competência no envio do
    // servidor. Origem associação traz os dados pela planilha retroativa, não por anexos.
    if (input.origem === "individual" && documentos.length === 0) {
      throw new Error(`Anexe ao menos um documento para a competência ${n.competenciaReferencia}.`);
    }
    const composicao = input.origem === "associacao" ? n.composicao : undefined;
    return {
      competenciaReferencia: n.competenciaReferencia,
      mesAnoPagamento: derivarMesAnoPagamento(n.competenciaReferencia),
      documentos,
      valorCobrancaInformado: composicao ? composicao.reduce((soma, l) => soma + l.valorCobranca, 0) : undefined,
      dataEmissaoBoleto: n.dataEmissaoBoleto,
      vencimento: n.vencimento,
      dataBaixa: n.dataBaixa,
      valorDevidoValidado: false,
      contrachequeConferido: false,
      decisoes: [],
      apuracao: [],
      composicao,
    };
  });

  const solicitacao: SolicitacaoRetroativa = {
    id: `retro-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    origem: input.origem,
    associacao: input.associacao,
    cpfTitular: input.cpfTitular,
    nomeTitular: input.nomeTitular,
    motivo: input.motivo,
    justificativa: input.justificativa.trim(),
    autorizacaoExcepcional: input.autorizacaoExcepcional,
    criadaEm: new Date().toISOString(),
    arquivoId: input.arquivoId,
    competencias,
  };
  saveSolicitacoesRetroativas([...loadSolicitacoesRetroativas(), solicitacao]);
  return solicitacao;
}

export function getSolicitacoesRetroativas(): SolicitacaoRetroativa[] {
  return loadSolicitacoesRetroativas();
}

/* ── Alterações (sempre por competência, append-only) ─────────────────────────────────────── */

export function alterarCompetencia(
  solicitacaoId: string,
  competenciaReferencia: string,
  fn: (s: SolicitacaoRetroativa, c: CompetenciaRetroativa) => CompetenciaRetroativa,
): SolicitacaoRetroativa {
  const todas = loadSolicitacoesRetroativas();
  const s = todas.find((x) => x.id === solicitacaoId);
  if (!s) throw new Error("Solicitação não encontrada.");
  const c = s.competencias.find((x) => x.competenciaReferencia === competenciaReferencia);
  if (!c) throw new Error("Competência não encontrada na solicitação.");
  const atualizada: SolicitacaoRetroativa = {
    ...s,
    competencias: s.competencias.map((x) => (x.competenciaReferencia === competenciaReferencia ? fn(s, c) : x)),
  };
  saveSolicitacoesRetroativas(todas.map((x) => (x.id === solicitacaoId ? atualizada : x)));
  return atualizada;
}

function evento(
  tipo: EventoApuracao["tipo"],
  responsavel: string,
  extra: { justificativa?: string; valorAnterior?: string; valorNovo?: string } = {},
): EventoApuracao {
  return { ...novaAuditoria(responsavel, extra.justificativa), dominio: "apuracao", tipo, valorAnterior: extra.valorAnterior, valorNovo: extra.valorNovo };
}

/** GERDAB: registra o auxílio efetivamente recebido no contracheque naquela competência. */
export function registrarValorPago(solicitacaoId: string, competencia: string, valor: number, responsavel: string) {
  if (!(valor >= 0)) throw new Error("Valor Pago inválido.");
  return alterarCompetencia(solicitacaoId, competencia, (_s, c) => ({
    ...c,
    valorPagoContracheque: valor,
    apuracao: anexarEvento(c.apuracao, evento("valor_pago_registrado", responsavel, { valorAnterior: c.valorPagoContracheque?.toString(), valorNovo: valor.toString() })),
  }));
}

/** GERDAB: valida o Valor Devido histórico. Sem fonte histórica automática — sempre apuração humana. */
export function validarValorDevido(solicitacaoId: string, competencia: string, valor: number, responsavel: string) {
  if (!(valor >= 0)) throw new Error("Valor Devido inválido.");
  return alterarCompetencia(solicitacaoId, competencia, (_s, c) => ({
    ...c,
    valorDevido: valor,
    valorDevidoValidado: true,
    apuracao: anexarEvento(c.apuracao, evento("valor_devido_validado", responsavel, { valorAnterior: c.valorDevido?.toString(), valorNovo: valor.toString() })),
  }));
}

/** GERDAB: confere manualmente o contracheque (sem integração com o sistema externo). */
export function marcarContrachequeConferido(solicitacaoId: string, competencia: string, responsavel: string) {
  return alterarCompetencia(solicitacaoId, competencia, (_s, c) => ({
    ...c,
    contrachequeConferido: true,
    apuracao: anexarEvento(c.apuracao, evento("contracheque_conferido", responsavel)),
  }));
}

/** Correção excepcional do Mês/Ano de Pagamento — só a GERDAB, com justificativa e trilha. */
export function corrigirMesAnoPagamento(solicitacaoId: string, competencia: string, novoMesAno: string, justificativa: string, responsavel: string) {
  if (!FORMATO_COMPETENCIA.test(novoMesAno)) throw new Error("Mês/Ano de Pagamento inválido.");
  if (!justificativa.trim()) throw new Error("Justificativa obrigatória para corrigir o Mês/Ano de Pagamento.");
  return alterarCompetencia(solicitacaoId, competencia, (_s, c) => ({
    ...c,
    mesAnoPagamento: novoMesAno,
    apuracao: anexarEvento(c.apuracao, evento("mes_ano_pagamento_corrigido", responsavel, { justificativa, valorAnterior: c.mesAnoPagamento, valorNovo: novoMesAno })),
  }));
}

export function complementarObservacao(solicitacaoId: string, competencia: string, complemento: string, responsavel: string) {
  return alterarCompetencia(solicitacaoId, competencia, (_s, c) => ({
    ...c,
    observacaoComplemento: complemento.trim() || undefined,
    apuracao: anexarEvento(c.apuracao, evento("observacao_complementada", responsavel, { valorAnterior: c.observacaoComplemento, valorNovo: complemento.trim() })),
  }));
}

/* ── Decisões — um gate por origem, com guards ───────────────────────────────────────────── */

function exigirOrigem(s: SolicitacaoRetroativa, esperada: OrigemRetroativo, acao: string) {
  if (s.origem !== esperada) {
    throw new Error(
      esperada === "individual"
        ? `${acao} só se aplica a requerimento retroativo individual; registros de associação usam habilitar/desabilitar.`
        : `${acao} só se aplica a registros de planilha de associação; requerimentos individuais usam aprovar/negar.`,
    );
  }
}

/** Origem individual: Aprovado (único gate financeiro da competência). */
export function aprovarCompetencia(solicitacaoId: string, competencia: string, responsavel: string) {
  return alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    exigirOrigem(s, "individual", "Aprovar competência");
    const pendencias = getPendenciasAutorizacao(c);
    if (pendencias.length > 0) {
      throw new Error(`Não é possível aprovar a competência. Pendências: ${pendencias.join(" ")}`);
    }
    const d: DecisaoCompetencia = { ...novaAuditoria(responsavel), dominio: "competencia_retroativa", decisao: "aprovado" };
    return { ...c, decisoes: anexarEvento(c.decisoes, d) };
  });
}

/** Origem individual: Negado — justificativa obrigatória, visível ao solicitante. */
export function negarCompetencia(solicitacaoId: string, competencia: string, justificativa: string, responsavel: string) {
  if (!justificativa.trim()) throw new Error("Justificativa obrigatória para negar a competência.");
  return alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    exigirOrigem(s, "individual", "Negar competência");
    const d: DecisaoCompetencia = { ...novaAuditoria(responsavel, justificativa), dominio: "competencia_retroativa", decisao: "negado" };
    return { ...c, decisoes: anexarEvento(c.decisoes, d) };
  });
}

/** Origem associação: **Não habilitar** (desabilitar) o registro Titular+Competência — justificativa obrigatória; vale a qualquer momento da análise. */
export function desabilitarRegistroRetroativo(solicitacaoId: string, competencia: string, justificativa: string, responsavel: string) {
  if (!justificativa.trim()) throw new Error("Justificativa obrigatória para desabilitar o registro.");
  return alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    exigirOrigem(s, "associacao", "Desabilitar registro");
    const d: HabilitacaoRegistro = { ...novaAuditoria(responsavel, justificativa), dominio: "registro_planilha", decisao: "desabilitado" };
    return { ...c, decisoes: anexarEvento(c.decisoes, d) };
  });
}

/**
 * Origem associação: **Habilitar para ressarcimento** — ação explícita da GERDAB, só depois da apuração
 * concluída (Valor Pago, Valor Devido, contracheque conferido, sem divergência). É o único gate financeiro
 * desta origem: só o registro habilitado entra na Consolidação. Serve também para reabilitar um registro
 * antes "não habilitado" (a decisão anterior nunca é apagada).
 */
export function habilitarRegistroRetroativo(solicitacaoId: string, competencia: string, responsavel: string, justificativa?: string) {
  return alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    exigirOrigem(s, "associacao", "Habilitar registro");
    const pendencias = getPendenciasAutorizacao(c);
    if (pendencias.length > 0) throw new Error(`Não é possível habilitar o registro. Pendências: ${pendencias.join(" ")}`);
    const d: HabilitacaoRegistro = { ...novaAuditoria(responsavel, justificativa), dominio: "registro_planilha", decisao: "habilitado" };
    return { ...c, decisoes: anexarEvento(c.decisoes, d) };
  });
}

/** Mantido por compatibilidade: reabilitar = habilitar novamente (mesma regra e guards). */
export const reabilitarRegistroRetroativo = habilitarRegistroRetroativo;

/* ── Consolidação para o Relatório Financeiro Retroativo ──────────────────────────────────── */

/** Linha do relatório — exatamente as colunas oficiais; uma por competência, nunca somada. */
export interface LinhaRelatorioRetroativo {
  solicitacaoId: string;
  competenciaReferencia: string;
  /** Titular + competência: dependentes nunca geram linha própria. */
  cpfTitular: string;
  matricula?: string; // via base institucional (simulada); `undefined` = sem correspondência na demonstração
  nome: string;
  mesAnoPagamento: string;
  valorPago: number;
  valorDevido: number;
  valorRessarcir: number;
  observacao: string;
  grupo?: GrupoAtivoInativo; // `undefined` + `classificacaoRequerConferencia` = sem situação funcional confiável/conflito
  classificacaoRequerConferencia: boolean;
  origem: OrigemRetroativo;
}

/**
 * Registros AUTORIZADOS pela GERDAB conforme a origem (individual: competência aprovada;
 * associação: registro habilitado) e com apuração completa (Valor Pago registrado + Valor Devido
 * validado, sem divergência e com **contracheque conferido**) e Valor a Ressarcir maior que zero. Nunca exige `aprovado` e `habilitado` ao mesmo tempo. Filtro opcional por grupo.
 */
export function getRegistrosRelatorioRetroativo(filtro?: { grupo?: GrupoAtivoInativo }): LinhaRelatorioRetroativo[] {
  const linhas: LinhaRelatorioRetroativo[] = [];
  for (const s of loadSolicitacoesRetroativas()) {
    for (const c of s.competencias) {
      if (!estaAutorizada(s.origem, c)) continue;
      const valorRessarcir = calcularValorRessarcir(c);
      if (valorRessarcir === undefined) continue; // apuração incompleta ou divergente: não compõe o relatório
      // Pago = Devido → ressarcimento R$ 0,00: a análise permanece rastreável na solicitação, mas não há
      // valor adicional a pagar, então NÃO entra no relatório financeiro destinado ao NURFI.
      if (valorRessarcir === 0) continue;
      const classificacao = getClassificacaoAtivoInativoPorCpf(s.cpfTitular);
      linhas.push({
        solicitacaoId: s.id,
        competenciaReferencia: c.competenciaReferencia,
        cpfTitular: s.cpfTitular,
        matricula: getMatriculaPorCpf(s.cpfTitular),
        nome: s.nomeTitular,
        mesAnoPagamento: c.mesAnoPagamento,
        valorPago: c.valorPagoContracheque!,
        valorDevido: c.valorDevido!,
        valorRessarcir,
        observacao: gerarObservacao(s, c),
        grupo: classificacao.grupo,
        classificacaoRequerConferencia: classificacao.requerConferencia,
        origem: s.origem,
      });
    }
  }
  const ordenadas = linhas.sort((a, b) => a.nome.localeCompare(b.nome) || a.competenciaReferencia.localeCompare(b.competenciaReferencia));
  return filtro?.grupo ? ordenadas.filter((l) => l.grupo === filtro.grupo) : ordenadas;
}

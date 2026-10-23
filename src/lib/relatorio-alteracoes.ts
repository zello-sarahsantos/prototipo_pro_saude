/**
 * Relatório de Alterações (NURFI) — modelo de dados, armazenamento, auditoria e composição de observações (Etapa 2).
 *
 * Estrutura PRÓPRIA e independente: nenhuma função aqui lê ou grava comprovantes, requerimentos, planilhas, cadastro ou
 * pagamentos. A situação de um registro neste relatório (identificada / confirmada / descartada) **nunca** altera o
 * registro de origem, e a identificação de divergências de valor continua sendo a do fluxo de Comprovantes (aqui só se
 * guarda uma REFERÊNCIA à origem e à decisão, para reuso nas próximas etapas — nenhuma segunda lógica de divergência).
 *
 * Unidade: um `RegistroAlteracao` = uma linha candidata do relatório (titular + competência), que pode reunir mais de uma
 * movimentação (`movimentos`: ex.: reinclusão + alteração de valor). O mesmo titular pode ter vários registros na mesma
 * competência (movimentações diferentes); a duplicidade é decidida pela origem da informação, nunca só por matrícula +
 * competência (ver `chaveDuplicidade`).
 *
 * Valores: os quatro valores de referência (plano, cadastrado, comprovado, calculado) são apenas informativos e podem faltar;
 * `valorInformadoNurfi` é independente e editável, e pode permanecer vazio até a conferência. Nenhuma fórmula financeira
 * é criada aqui e `calcularReembolso` não é usado nem alterado.
 *
 * Auditoria: histórico append-only por registro (`auditoria.ts`) — responsável, data/hora, justificativa e valores anterior/novo.
 * Armazenamento: `localStorage` (chave própria), como os demais módulos do protótipo; sem backend.
 */
import { useEffect, useState } from "react";
import { anexarEvento, novaAuditoria, type AuditoriaBase } from "./auditoria";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";

export const EVENTO_RELATORIO_ALTERACOES = "prosaude-relatorio-alteracoes";

export type VinculoFuncional = "ativo" | "inativo";
export type OrigemPagamento = "Boletos" | "ASSEFAZ" | "ASSETRAN";
export const ORIGENS_PAGAMENTO: readonly OrigemPagamento[] = ["Boletos", "ASSEFAZ", "ASSETRAN"];
export const ROTULO_VINCULO: Record<VinculoFuncional, string> = { ativo: "Ativos", inativo: "Inativos" };

/** Situação NO RELATÓRIO — não é a situação do comprovante, requerimento, beneficiário ou pagamento de origem. */
export type SituacaoAlteracao = "identificada" | "confirmada" | "descartada";
export const ROTULO_SITUACAO: Record<SituacaoAlteracao, string> = { identificada: "Identificada", confirmada: "Confirmada", descartada: "Descartada" };

export type OrigemInformacao = "automatica" | "manual";

/** Tipos de movimentação (lista inicial, derivada do modelo da GERDAB; novos tipos exigem decisão, os MOTIVOS são livres). */
export type TipoMovimentacao =
  | "incluir"
  | "reincluir"
  | "alterar_valor"
  /** Natureza efetiva SEM alteração do ressarcimento final (ex.: troca de plano com o mesmo valor final). Nunca implica "Alterar valor". */
  | "mudanca_plano"
  | "reajuste_plano"
  | "dependente_incluido"
  | "dependente_excluido"
  | "dependente_reincluido"
  /** Movimentação identificada cuja natureza não pôde ser determinada pelos dados disponíveis: a GERDAB classifica na conferência. */
  | "a_conferir";

export const ROTULO_TIPO: Record<TipoMovimentacao, string> = {
  incluir: "Incluir",
  reincluir: "Reincluir",
  alterar_valor: "Alterar valor",
  mudanca_plano: "Mudança de plano",
  reajuste_plano: "Reajuste de plano",
  dependente_incluido: "Inclusão de dependente",
  dependente_excluido: "Exclusão de dependente",
  dependente_reincluido: "Reinclusão de dependente",
  a_conferir: "A conferir",
};

/** Motivos de referência (frases do relatório atual da GERDAB). NÃO é lista fechada: `Movimento.motivo` aceita texto livre. */
export const MOTIVOS_REFERENCIA = {
  reajuste_plano: "Reajuste do plano",
  ajuste_plano: "Ajuste do plano",
  mudou_de_plano: "Mudou de plano",
  mudanca_categoria: "Mudança de categoria",
  incluiu_dependente: "Incluiu dependente(s)",
  excluiu_dependente: "Excluiu dependente(s)",
  reincluiu_dependente: "Reincluiu dependente(s)",
  nova_proposta: "Apresentou nova proposta",
  comprovante_pagamento: "Apresentou comprovante de pagamento",
} as const;
export type ChaveMotivoReferencia = keyof typeof MOTIVOS_REFERENCIA;

/** Dependente envolvido numa movimentação (inclusão/exclusão/reinclusão). Pertence ao MOVIMENTO, não ao registro do titular. */
export interface DependenteMovimento {
  nome: string;
  parentesco?: string;
  /** Referência ao cadastro quando o dependente consta nominalmente nele (ex.: "cadastro:Ana da Silva"); ausente = informado manualmente. */
  referenciaCadastro?: string;
  /** true = informado manualmente, fora do cadastro: precisa de validação pela GERDAB. Nunca altera o cadastro. */
  pendenteValidacao?: boolean;
}

/** Uma movimentação dentro do registro. `motivo`: chave de `MOTIVOS_REFERENCIA` ou texto livre (ou ausente). */
export interface Movimento {
  tipo: TipoMovimentacao;
  motivo?: string;
  /** Opcional (movimentos antigos não têm): dependente envolvido, para os tipos de dependente. */
  dependente?: DependenteMovimento;
}

/**
 * Valor SUGERIDO pelo sistema para o Valor NURFI: resultado final de ressarcimento do grupo familiar já apurado e validado em outro módulo
 * (Fechamento), para o titular e a competência de referência do registro. NÃO é o valor confirmado: o registro continua em conferência
 * e só `valorInformadoNurfi` (confirmado ou ajustado pela GERDAB) vale para o relatório.
 */
export interface ValorSugerido {
  valor: number;
  /** Módulo de origem (ex.: "Fechamento de Pagamento"). */
  fonte: string;
  competencia: string;
  descricao: string;
}
/** Por que NÃO há valor sugerido (o campo permanece pendente; nada é estimado). */
export interface PendenciaValorSugerido {
  tipo: "indisponivel" | "nao_validado" | "divergente";
  descricao: string;
}
export const ROTULO_PENDENCIA_VALOR: Record<PendenciaValorSugerido["tipo"], string> = { indisponivel: "Valor não disponível", nao_validado: "Valor ainda não validado", divergente: "Valores divergentes" };

export interface IdentificacaoTitular {
  nome: string;
  /** Identificador exibido nos relatórios (nunca só CPF). Pode faltar até a conferência. */
  matricula?: string;
  /** Apoio à identificação/duplicidade; não é o identificador visual do relatório. */
  cpf?: string;
}

/** Valores de referência disponíveis para a conferência. Distintos entre si — nunca presumir equivalência. */
export interface ValoresReferencia {
  plano?: number;
  cadastrado?: number;
  comprovado?: number;
  calculado?: number;
}

export type ModuloOrigem = "movimentacoes" | "comprovantes" | "requerimentos" | "planilhas_associacao" | "ressarcimentos" | "cadastro" | "fechamento" | "manual" | "demonstrativo";

/** Referência ao registro original (somente leitura — nunca é alterado por este módulo). */
export interface ReferenciaOrigem {
  modulo: ModuloOrigem;
  registroId?: string;
  /** Texto curto para exibir a origem ao conferir (ex.: "Comprovante — Out/2026"). */
  rotulo?: string;
  /** Decisão já registrada na origem (ex.: decisão da GERDAB sobre divergência de valor), para reuso posterior. */
  decisao?: { descricao: string; responsavel?: string; dataHora?: string };
  /** Dados comparados na identificação (ex.: planilha do mês anterior × atual), para a conferência lado a lado. Só leitura. */
  comparacao?: { campo: string; anterior?: string; atual?: string }[];
  /** Parte da chave de duplicidade além do id (ex.: versão, competência). */
  marcador?: string;
}

export type TipoEventoAlteracao =
  | "inclusao_registro"
  | "alteracao_movimentacao"
  | "alteracao_valor"
  | "valor_nao_aplicavel"
  | "edicao_observacao"
  | "alteracao_dados"
  | "confirmacao"
  | "descarte"
  | "reabertura";

export interface CampoAlterado {
  campo: string;
  anterior?: string | number | null;
  novo?: string | number | null;
}

export interface EventoAlteracao extends AuditoriaBase {
  id: string;
  tipo: TipoEventoAlteracao;
  alteracoes?: CampoAlterado[];
}

export interface RegistroAlteracao {
  id: string;
  titular: IdentificacaoTitular;
  /** Ausente = a conferir (sem situação funcional confiável na base): a geração definitiva exige que seja informado. */
  vinculo?: VinculoFuncional;
  /** Ausente = a conferir (associação/modalidade não determinada): a geração definitiva exige que seja informado. */
  origemPagamento?: OrigemPagamento;
  /** "AAAA-MM" — mês do boleto. */
  competenciaReferencia: string;
  /** true quando a competência de referência foi ESTIMADA pela identificação (ex.: mês da decisão de um requerimento) e ainda não foi conferida. */
  competenciaEstimada?: boolean;
  /** "AAAA-MM" — mês do pagamento em folha (padrão: mês seguinte à referência, Instrução nº 492/2023, art. 18). */
  competenciaPagamento: string;
  /**
   * "AAAA-MM" — competência em que a alteração PASSOU A PRODUZIR EFEITOS. Independente da referência e do pagamento; nunca
   * presumida (nem da data de aprovação do requerimento, nem da referência). Ausente = pendente de conferência pela GERDAB
   * (também em registros anteriores a este campo). Alterações ficam no histórico do registro.
   */
  competenciaEfeito?: string;
  /** @deprecated A competência de efeito deixou de ser exigida (A5-prep): o campo existe só para preservar registros gravados na A3. */
  efeitoObrigatorio?: boolean;
  /**
   * true nos registros criados a partir desta revisão: a observação NURFI precisa descrever a movimentação (natureza + motivo quando
   * comprovado); texto apenas genérico ("Alterar valor.", "Incluir.", "Reincluir.") deixa o registro pendente de complementação.
   * Ausente nos registros anteriores: nada é exigido retroativamente.
   */
  observacaoDetalhadaExigida?: boolean;
  movimentos: Movimento[];
  valores: ValoresReferencia;
  valorInformadoNurfi?: number;
  /** Sugestão do sistema (nunca confirma sozinha). */
  valorSugerido?: ValorSugerido;
  valorPendencia?: PendenciaValorSugerido;
  /**
   * A GERDAB declarou, com justificativa, que a movimentação NÃO possui valor financeiro aplicável. É distinto de "valor
   * pendente" (campo vazio sem declaração) e de "valor preenchido"; nunca é representado por zero.
   */
  valorNaoAplicavel?: { justificativa: string; responsavel: string; dataHora: string };
  observacao: string;
  /** true quando a GERDAB editou o texto: a sugestão automática deixa de substituí-lo. */
  observacaoEditada: boolean;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
  situacao: SituacaoAlteracao;
  justificativaDescarte?: string;
  /** Pendências de conferência apontadas na identificação (ex.: "vínculo funcional a conferir", "natureza da movimentação não determinada"). */
  conferencia: string[];
  /** Último responsável por confirmação ou alteração. */
  responsavel: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Registro de demonstração (nunca dado oficial). */
  demonstrativo?: boolean;
  historico: EventoAlteracao[];
}

/* ── Persistência ───────────────────────────────────────────────────────────────────────────────────────────────── */

export function listarRegistros(): RegistroAlteracao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioAlteracoes);
    return raw ? (JSON.parse(raw) as RegistroAlteracao[]) : [];
  } catch {
    return [];
  }
}

function salvarRegistros(registros: RegistroAlteracao[]) {
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.relatorioAlteracoes, JSON.stringify(registros));
  window.dispatchEvent(new Event(EVENTO_RELATORIO_ALTERACOES));
}

/** Hook: lista de registros, atualizada a cada alteração, em outra aba ou ao recarregar. */
export function useRegistrosAlteracoes(): RegistroAlteracao[] {
  const [registros, setRegistros] = useState<RegistroAlteracao[]>([]);
  useEffect(() => {
    const atualizar = () => setRegistros(listarRegistros());
    atualizar();
    window.addEventListener(EVENTO_RELATORIO_ALTERACOES, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_RELATORIO_ALTERACOES, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return registros;
}

export const getRegistro = (id: string) => listarRegistros().find((r) => r.id === id);

/** Registros confirmados de uma competência de referência — base para a geração (imutável) do relatório nas próximas etapas. */
export const getRegistrosConfirmados = (competenciaReferencia: string) =>
  listarRegistros().filter((r) => r.situacao === "confirmada" && r.competenciaReferencia === competenciaReferencia);

/* ── Competências ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** Mês seguinte ("2026-05" → "2026-06"). Padrão proposto a partir do art. 18 da Instrução nº 492/2023; pode ser informado manualmente. */
export function competenciaPagamentoPadrao(competenciaReferencia: string): string {
  const [ano, mes] = competenciaReferencia.split("-").map(Number);
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

/* ── Observação NURFI (sugestão reutilizável; o texto final é sempre livre) ─────────────────────────────────────────── */

const ORDEM_TIPOS: TipoMovimentacao[] = ["incluir", "reincluir", "alterar_valor", "mudanca_plano", "reajuste_plano", "dependente_incluido", "dependente_excluido", "dependente_reincluido", "a_conferir"];
const FRASE_TIPO: Record<TipoMovimentacao, string> = {
  incluir: "Incluir",
  reincluir: "Reincluir",
  alterar_valor: "Alterar valor",
  mudanca_plano: "Mudou de plano",
  reajuste_plano: "Reajuste do plano",
  dependente_incluido: "Incluiu dependente(s)",
  dependente_excluido: "Excluiu dependente(s)",
  dependente_reincluido: "Reincluiu dependente(s)",
  a_conferir: "",
};

/** Texto de um motivo: chave conhecida → frase de referência; senão o próprio texto livre. */
export function textoDoMotivo(motivo?: string): string {
  const m = motivo?.trim();
  if (!m) return "";
  return (MOTIVOS_REFERENCIA as Record<string, string>)[m] ?? m;
}

const comPonto = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);

/**
 * Sugere a observação a partir das movimentações, no padrão do relatório atual: "Reincluir. Apresentou comprovante de
 * pagamento. Alterar valor. Reajuste do plano." Ordem: incluir/reincluir, alterar valor, dependentes (ordem estável).
 * Movimentos de dependente sem motivo geram só a frase do tipo ("Incluiu dependente(s).") — não presumem alteração de valor.
 */
export function sugerirObservacao(movimentos: Movimento[]): string {
  const ordenados = movimentos.map((m, i) => ({ m, i })).sort((a, b) => ORDEM_TIPOS.indexOf(a.m.tipo) - ORDEM_TIPOS.indexOf(b.m.tipo) || a.i - b.i);
  return ordenados
    .map(({ m }) => {
      const motivo = textoDoMotivo(m.motivo);
      // Tipos cuja própria frase já é a natureza (dependente, mudança e reajuste de plano): o motivo, se houver, substitui a frase (sem repetir).
      const dependente = m.tipo.startsWith("dependente_") || m.tipo === "mudanca_plano" || m.tipo === "reajuste_plano";
      // "a conferir" não tem verbo próprio: só o motivo (se a origem o sustentar); a GERDAB completa a frase.
      if (m.tipo === "a_conferir") return motivo ? comPonto(motivo) : "";
      return dependente && motivo ? comPonto(motivo) : [comPonto(FRASE_TIPO[m.tipo]), motivo ? comPonto(motivo) : ""].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" ");
}

/** Frases de TIPO sozinhas não explicam a movimentação. A observação é genérica quando, tirando-as, não sobra texto. Só vale para os tipos
 *  que exigem motivo (incluir, reincluir e alterar valor); movimentos de dependente já dizem a natureza ("Incluiu dependente(s)."). */
export function observacaoGenerica(observacao: string, movimentos: Movimento[]): boolean {
  if (!movimentos.some((m) => m.tipo === "incluir" || m.tipo === "reincluir" || m.tipo === "alterar_valor")) return false;
  let t = ` ${norm(observacao).replace(/[.;,:]/g, " ")} `;
  for (const f of ["reincluir", "incluir", "alterar valor"]) t = t.split(` ${f} `).join("  ");
  return t.replace(/\s+/g, "") === "";
}

/* ── Duplicidade ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Chave de origem estável de uma movimentação identificada em outro módulo (usada pelas leituras da Etapa 3). */
export const montarChaveOrigem = (ref: Pick<ReferenciaOrigem, "modulo" | "registroId" | "marcador">) =>
  [ref.modulo, ref.registroId ?? "", ref.marcador ?? ""].join("|");

const norm = (t?: string) => (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
export const identificadorTitular = (t: IdentificacaoTitular) => norm(t.matricula) || (t.cpf ?? "").replace(/\D/g, "") || norm(t.nome);

/**
 * Critério de duplicidade:
 *  - com referência de origem: a MESMA origem (módulo + registro + marcador) não gera um segundo registro — nem se o
 *    primeiro foi descartado (um descarte não ressuscita por nova leitura);
 *  - sem referência (inclusão manual): mesmo titular + competência de referência + origem de pagamento + MESMO conjunto de
 *    movimentos (tipo e motivo) em registro não descartado. Movimentações diferentes do mesmo titular na mesma competência
 *    são permitidas — nunca basta coincidirem matrícula e competência.
 */
function acharDuplicado(registros: RegistroAlteracao[], entrada: Pick<RegistroAlteracao, "titular" | "origemPagamento" | "competenciaReferencia" | "movimentos" | "referenciaOrigem">): RegistroAlteracao | undefined {
  const ref = entrada.referenciaOrigem;
  if (ref && ref.modulo !== "manual" && ref.modulo !== "demonstrativo" && ref.registroId) {
    const chave = montarChaveOrigem(ref);
    return registros.find((r) => r.referenciaOrigem && r.referenciaOrigem.modulo === ref.modulo && !!r.referenciaOrigem.registroId && montarChaveOrigem(r.referenciaOrigem) === chave);
  }
  const assinatura = (mv: Movimento[]) => mv.map((m) => `${m.tipo}:${norm(textoDoMotivo(m.motivo))}`).sort().join("|");
  const alvo = assinatura(entrada.movimentos);
  return registros.find(
    (r) =>
      r.situacao !== "descartada" &&
      !(r.referenciaOrigem?.registroId && r.referenciaOrigem.modulo !== "manual" && r.referenciaOrigem.modulo !== "demonstrativo") &&
      identificadorTitular(r.titular) === identificadorTitular(entrada.titular) &&
      r.competenciaReferencia === entrada.competenciaReferencia &&
      r.origemPagamento === entrada.origemPagamento &&
      assinatura(r.movimentos) === alvo,
  );
}

/* ── Operações (todas auditadas, append-only) ───────────────────────────────────────────────────────────────────── */

const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function evento(tipo: TipoEventoAlteracao, responsavel: string, justificativa?: string, alteracoes?: CampoAlterado[]): EventoAlteracao {
  return { ...novaAuditoria(responsavel, justificativa), id: novoId("evt"), tipo, alteracoes: alteracoes?.length ? alteracoes : undefined };
}

function validarMovimentos(movimentos: Movimento[]) {
  if (movimentos.length === 0) throw new Error("Informe ao menos uma movimentação.");
}

function validarValor(valor?: number) {
  if (valor !== undefined && (!Number.isFinite(valor) || valor < 0)) throw new Error("Valor inválido.");
  // Zero nunca representa ausência de informação nem "valor não aplicável" (use o estado próprio ou deixe pendente).
  if (valor === 0) throw new Error("Valor zero não é aceito: deixe em branco (pendente) ou declare o valor como não aplicável, com justificativa.");
}

export interface NovoRegistroAlteracao {
  /** Id estável opcional (ex.: massa demonstrativa). Sem ele, é gerado. */
  id?: string;
  titular: IdentificacaoTitular;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia: string;
  /** Padrão: mês seguinte à referência. */
  competenciaPagamento?: string;
  /** A competência de referência é uma estimativa a conferir. */
  competenciaEstimada?: boolean;
  /** Competência em que a alteração passou a produzir efeitos (opcional; nunca presumida). */
  competenciaEfeito?: string;
  movimentos: Movimento[];
  valores?: ValoresReferencia;
  valorInformadoNurfi?: number;
  valorSugerido?: ValorSugerido;
  valorPendencia?: PendenciaValorSugerido;
  /** Padrão: sugestão a partir das movimentações. */
  observacao?: string;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
  /** Pendências de conferência apontadas na identificação. */
  conferencia?: string[];
  justificativa?: string;
  demonstrativo?: boolean;
}

export interface ResultadoRegistro {
  registro: RegistroAlteracao;
  /** false = já existia um registro equivalente (nada foi criado nem sobrescrito). */
  criado: boolean;
}

/** Cria um registro SEMPRE como "identificada" (nunca confirma sozinho). Idempotente: ver `acharDuplicado`. */
export function registrarMovimentacao(entrada: NovoRegistroAlteracao, responsavel: string): ResultadoRegistro {
  validarMovimentos(entrada.movimentos);
  validarValor(entrada.valorInformadoNurfi);
  if (!entrada.titular.nome.trim()) throw new Error("Informe o nome do titular.");
  const registros = listarRegistros();
  if (entrada.id) {
    const mesmoId = registros.find((r) => r.id === entrada.id);
    if (mesmoId) return { registro: mesmoId, criado: false };
  }
  const dup = acharDuplicado(registros, entrada);
  if (dup) return { registro: dup, criado: false };

  const agora = new Date().toISOString();
  const observacao = entrada.observacao?.trim();
  const registro: RegistroAlteracao = {
    id: entrada.id ?? novoId("alt"),
    titular: { nome: entrada.titular.nome.trim(), matricula: entrada.titular.matricula?.trim() || undefined, cpf: entrada.titular.cpf?.trim() || undefined },
    vinculo: entrada.vinculo,
    origemPagamento: entrada.origemPagamento,
    competenciaReferencia: entrada.competenciaReferencia,
    competenciaPagamento: entrada.competenciaPagamento ?? competenciaPagamentoPadrao(entrada.competenciaReferencia),
    competenciaEstimada: entrada.competenciaEstimada || undefined,
    observacaoDetalhadaExigida: true,
    competenciaEfeito: entrada.competenciaEfeito && /^\d{4}-(0[1-9]|1[0-2])$/.test(entrada.competenciaEfeito) ? entrada.competenciaEfeito : undefined,
    movimentos: entrada.movimentos.map((m) => ({ ...m })),
    valores: { ...(entrada.valores ?? {}) },
    valorInformadoNurfi: entrada.valorInformadoNurfi,
    valorSugerido: entrada.valorSugerido,
    valorPendencia: entrada.valorSugerido ? undefined : entrada.valorPendencia,
    observacao: observacao || sugerirObservacao(entrada.movimentos),
    observacaoEditada: !!observacao,
    origemInformacao: entrada.origemInformacao,
    referenciaOrigem: entrada.referenciaOrigem,
    situacao: "identificada",
    conferencia: [...(entrada.conferencia ?? [])],
    responsavel,
    criadoEm: agora,
    atualizadoEm: agora,
    demonstrativo: entrada.demonstrativo,
    historico: [evento("inclusao_registro", responsavel, entrada.justificativa, [{ campo: "situacao", novo: "identificada" }])],
  };
  salvarRegistros([...registros, registro]);
  return { registro, criado: true };
}

function alterar(id: string, mudar: (r: RegistroAlteracao) => RegistroAlteracao): RegistroAlteracao {
  const registros = listarRegistros();
  const atual = registros.find((r) => r.id === id);
  if (!atual) throw new Error("Registro não encontrado.");
  const novo = mudar(atual);
  salvarRegistros(registros.map((r) => (r.id === id ? novo : r)));
  return novo;
}

const comEvento = (r: RegistroAlteracao, ev: EventoAlteracao, resto: Partial<RegistroAlteracao>): RegistroAlteracao => ({
  ...r,
  ...resto,
  responsavel: ev.responsavel,
  atualizadoEm: ev.dataHora,
  historico: anexarEvento(r.historico, ev),
});

/** Depois de confirmado, qualquer alteração manual de movimentações, valor ou observação exige justificativa. */
function exigirJustificativaSeConfirmado(r: RegistroAlteracao, justificativa?: string) {
  if (r.situacao === "confirmada" && !justificativa?.trim()) throw new Error("Registro confirmado: informe a justificativa da alteração.");
}

/** Descrição auditável das movimentações (inclui o dependente identificado, quando houver). */
export function descreverMovimentos(mv: Movimento[]): string {
  return mv
    .map((m) => `${ROTULO_TIPO[m.tipo]}${m.motivo ? ` — ${textoDoMotivo(m.motivo)}` : ""}${m.dependente ? ` [dependente: ${m.dependente.nome}${m.dependente.parentesco ? ` (${m.dependente.parentesco})` : ""}${m.dependente.pendenteValidacao ? " — pendente de validação" : ""}]` : ""}`)
    .join(" + ");
}

/** Altera as movimentações. Se a observação nunca foi editada à mão, a sugestão é atualizada junto (e o fato fica no histórico). */
export function atualizarMovimentos(id: string, movimentos: Movimento[], responsavel: string, justificativa?: string): RegistroAlteracao {
  validarMovimentos(movimentos);
  return alterar(id, (r) => {
    exigirJustificativaSeConfirmado(r, justificativa);
    const sugestao = sugerirObservacao(movimentos);
    const alteracoes: CampoAlterado[] = [{ campo: "movimentos", anterior: descreverMovimentos(r.movimentos) || "—", novo: descreverMovimentos(movimentos) }];
    const resto: Partial<RegistroAlteracao> = { movimentos: movimentos.map((m) => ({ ...m })) };
    if (!r.observacaoEditada && r.observacao !== sugestao) {
      alteracoes.push({ campo: "observacao", anterior: r.observacao, novo: sugestao });
      resto.observacao = sugestao;
    }
    return comEvento(r, evento("alteracao_movimentacao", responsavel, justificativa, alteracoes), resto);
  });
}

/** Valor informado ao NURFI (independente dos valores de referência). `undefined` limpa o campo. */
export function atualizarValorInformado(id: string, valor: number | undefined, responsavel: string, justificativa?: string): RegistroAlteracao {
  validarValor(valor);
  return alterar(id, (r) => {
    if (r.valorInformadoNurfi === valor) throw new Error("Nenhum valor foi alterado.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const alteracoes: CampoAlterado[] = [{ campo: "valorInformadoNurfi", anterior: r.valorInformadoNurfi ?? null, novo: valor ?? null }];
    // Primeira definição do valor com SUGESTÃO do sistema: confirmar o valor sugerido é a decisão da GERDAB; divergir dele (ajuste manual) exige
    // justificativa. A sugestão e o resultado ficam no histórico (a sugestão original permanece no registro).
    if (r.valorInformadoNurfi === undefined && r.valorSugerido && valor !== undefined) {
      const confirmou = Math.abs(valor - r.valorSugerido.valor) < 0.005;
      if (!confirmou && !justificativa?.trim()) throw new Error("Ajuste do valor sugerido pelo sistema: informe a justificativa.");
      alteracoes.push({ campo: `valor sugerido (${r.valorSugerido.fonte}, ${r.valorSugerido.competencia})`, anterior: r.valorSugerido.valor, novo: confirmou ? "confirmado pela GERDAB" : "ajustado pela GERDAB" });
    }
    // Informar um valor encerra a declaração de "não aplicável" (os dois estados são excludentes); isso fica no histórico.
    if (valor !== undefined && r.valorNaoAplicavel) alteracoes.push({ campo: "valorNaoAplicavel", anterior: r.valorNaoAplicavel.justificativa, novo: null });
    return comEvento(r, evento("alteracao_valor", responsavel, justificativa, alteracoes), { valorInformadoNurfi: valor, valorNaoAplicavel: valor !== undefined ? undefined : r.valorNaoAplicavel });
  });
}

/**
 * Declara que a movimentação não possui valor financeiro aplicável (justificativa obrigatória). Exige que não haja valor
 * preenchido (limpe-o antes) — nunca se usa zero. `aplicavel = true` desfaz a declaração (volta a "pendente").
 */
export function definirValorNaoAplicavel(id: string, naoAplicavel: boolean, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    const j = justificativa?.trim();
    if (naoAplicavel) {
      if (!j) throw new Error("Informe a justificativa de que o valor não se aplica a esta movimentação.");
      if (r.valorInformadoNurfi !== undefined) throw new Error("Há valor informado: remova-o antes de declarar que o valor não se aplica.");
      if (r.valorNaoAplicavel) throw new Error("O valor já está declarado como não aplicável.");
      exigirJustificativaSeConfirmado(r, j);
      const ev = evento("valor_nao_aplicavel", responsavel, j, [{ campo: "valorNaoAplicavel", anterior: null, novo: j }]);
      return comEvento(r, ev, { valorNaoAplicavel: { justificativa: j, responsavel, dataHora: ev.dataHora } });
    }
    if (!r.valorNaoAplicavel) throw new Error("O valor não está declarado como não aplicável.");
    exigirJustificativaSeConfirmado(r, j);
    return comEvento(r, evento("valor_nao_aplicavel", responsavel, j, [{ campo: "valorNaoAplicavel", anterior: r.valorNaoAplicavel.justificativa, novo: null }]), { valorNaoAplicavel: undefined });
  });
}

/** Edição livre da observação (texto vazio volta a usar a sugestão automática). */
export function atualizarObservacao(id: string, texto: string, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    const limpo = texto.trim();
    const novo = limpo || sugerirObservacao(r.movimentos);
    if (novo === r.observacao && !!limpo === r.observacaoEditada) throw new Error("Nenhuma alteração na observação.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("edicao_observacao", responsavel, justificativa, [{ campo: "observacao", anterior: r.observacao, novo }]), { observacao: novo, observacaoEditada: !!limpo });
  });
}

export interface DadosEditaveis {
  titularNome?: string;
  matricula?: string;
  cpf?: string;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia?: string;
  competenciaPagamento?: string;
}

const ROTULO_CAMPO: Record<keyof DadosEditaveis, string> = {
  titularNome: "Nome do titular",
  matricula: "Matrícula",
  cpf: "CPF do titular",
  vinculo: "Vínculo funcional",
  origemPagamento: "Origem de pagamento",
  competenciaReferencia: "Competência de referência",
  competenciaPagamento: "Competência de pagamento",
};

/** Conferência administrativa dos dados de identificação (vínculo, origem, matrícula, competências). Alterar a competência de
 *  referência encerra o "estimada"; a de pagamento volta a ser sugerida como mês seguinte se a referência mudar e ela não for informada. */
export function atualizarDados(id: string, patch: DadosEditaveis, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    const anterior: Record<string, string | undefined> = { titularNome: r.titular.nome, matricula: r.titular.matricula, cpf: r.titular.cpf, vinculo: r.vinculo, origemPagamento: r.origemPagamento, competenciaReferencia: r.competenciaReferencia, competenciaPagamento: r.competenciaPagamento };
    const novoPatch: DadosEditaveis = { ...patch };
    if (patch.competenciaReferencia && patch.competenciaReferencia !== r.competenciaReferencia && patch.competenciaPagamento === undefined) novoPatch.competenciaPagamento = competenciaPagamentoPadrao(patch.competenciaReferencia);
    const alteracoes: CampoAlterado[] = [];
    for (const campo of Object.keys(novoPatch) as (keyof DadosEditaveis)[]) {
      const valorNovo = (novoPatch[campo] ?? "").toString().trim() || undefined;
      if (valorNovo !== anterior[campo]) alteracoes.push({ campo: ROTULO_CAMPO[campo], anterior: anterior[campo] ?? null, novo: valorNovo ?? null });
    }
    if (alteracoes.length === 0) throw new Error("Nenhum dado foi alterado.");
    if (novoPatch.titularNome !== undefined && !novoPatch.titularNome.trim()) throw new Error("Informe o nome do titular.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const resto: Partial<RegistroAlteracao> = {
      titular: { ...r.titular, nome: novoPatch.titularNome?.trim() || r.titular.nome, matricula: "matricula" in novoPatch ? novoPatch.matricula?.trim() || undefined : r.titular.matricula, cpf: "cpf" in novoPatch ? novoPatch.cpf?.trim() || undefined : r.titular.cpf },
      vinculo: "vinculo" in novoPatch ? novoPatch.vinculo : r.vinculo,
      origemPagamento: "origemPagamento" in novoPatch ? novoPatch.origemPagamento : r.origemPagamento,
      competenciaReferencia: novoPatch.competenciaReferencia ?? r.competenciaReferencia,
      competenciaPagamento: novoPatch.competenciaPagamento ?? r.competenciaPagamento,
    };
    if (novoPatch.competenciaReferencia !== undefined || novoPatch.competenciaPagamento !== undefined) resto.competenciaEstimada = undefined;
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, alteracoes), resto);
  });
}

/**
 * Define (ou limpa, voltando a "pendente") a competência de efeito da alteração. Independente da referência e do pagamento; auditada
 * (valor anterior/novo, responsável, data/hora); depois de confirmado o registro, exige justificativa. Não altera emissões já feitas
 * (elas guardam o próprio snapshot) nem nenhum outro módulo.
 */
export function atualizarCompetenciaEfeito(id: string, competencia: string | undefined, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    const novo = competencia?.trim() || undefined;
    if (novo !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(novo)) throw new Error("Competência de efeito inválida (use mês e ano).");
    if (novo === r.competenciaEfeito) throw new Error("Nenhuma alteração na competência de efeito.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, [{ campo: "Competência de efeito", anterior: r.competenciaEfeito ?? null, novo: novo ?? null }]), { competenciaEfeito: novo });
  });
}

/** A GERDAB conferiu a competência de referência estimada (ex.: mês da decisão de um requerimento): encerra o "estimada" sem alterar nenhuma competência. */
export function confirmarCompetenciasRegistro(id: string, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    if (!r.competenciaEstimada) throw new Error("As competências deste registro já estão conferidas.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, [{ campo: "Competências conferidas", anterior: `${r.competenciaReferencia} / pagamento ${r.competenciaPagamento} (referência estimada)`, novo: `${r.competenciaReferencia} / pagamento ${r.competenciaPagamento}` }]), { competenciaEstimada: undefined });
  });
}

/** Confirma o registro para o relatório. Não altera nenhum módulo de origem. */
export function confirmarRegistro(id: string, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    if (r.situacao === "confirmada") throw new Error("O registro já está confirmado.");
    return comEvento(r, evento("confirmacao", responsavel, justificativa, [{ campo: "situacao", anterior: r.situacao, novo: "confirmada" }]), { situacao: "confirmada", justificativaDescarte: undefined });
  });
}

/** Descarta o registro (não integrará o relatório). Justificativa obrigatória; o registro e o histórico permanecem. */
export function descartarRegistro(id: string, responsavel: string, justificativa: string): RegistroAlteracao {
  const j = justificativa.trim();
  if (!j) throw new Error("Informe a justificativa do descarte.");
  return alterar(id, (r) => {
    if (r.situacao === "descartada") throw new Error("O registro já está descartado.");
    return comEvento(r, evento("descarte", responsavel, j, [{ campo: "situacao", anterior: r.situacao, novo: "descartada" }]), { situacao: "descartada", justificativaDescarte: j });
  });
}

/** Devolve um registro confirmado ou descartado a "identificada" (reabre a conferência), sem apagar nada do histórico. */
export function reabrirRegistro(id: string, responsavel: string, justificativa?: string): RegistroAlteracao {
  return alterar(id, (r) => {
    if (r.situacao === "identificada") throw new Error("O registro já está em conferência.");
    return comEvento(r, evento("reabertura", responsavel, justificativa, [{ campo: "situacao", anterior: r.situacao, novo: "identificada" }]), { situacao: "identificada", justificativaDescarte: undefined });
  });
}

/**
 * Regra PROVISÓRIA (a validar com a GERDAB): exigem valor informado ao NURFI as movimentações que alteram o pagamento do
 * titular (incluir, reincluir, alterar valor). Movimentações só de dependente não presumem alteração financeira.
 */
export const TIPOS_QUE_EXIGEM_VALOR: TipoMovimentacao[] = ["incluir", "reincluir", "alterar_valor", "mudanca_plano", "reajuste_plano"];
export const exigeValor = (movimentos: Movimento[]) => movimentos.some((m) => TIPOS_QUE_EXIGEM_VALOR.includes(m.tipo));

export type EstadoValor = "preenchido" | "pendente" | "nao_aplicavel";
export const ROTULO_ESTADO_VALOR: Record<EstadoValor, string> = { preenchido: "Valor preenchido e conferido", pendente: "Valor pendente de conferência", nao_aplicavel: "Valor não aplicável" };
/** Valor preenchido > declarado não aplicável > pendente. (Se houver valor e a declaração, o valor prevalece; a tela impede essa combinação.) */
export const estadoDoValor = (r: Pick<RegistroAlteracao, "valorInformadoNurfi" | "valorNaoAplicavel">): EstadoValor => (r.valorInformadoNurfi !== undefined ? "preenchido" : r.valorNaoAplicavel ? "nao_aplicavel" : "pendente");

export interface AvaliacaoRegistro {
  /** Impedem a geração definitiva (a ciência do analista NÃO as dispensa). */
  impeditivas: string[];
  /** Não impedem a geração, mas devem ser conhecidas na conferência. */
  informativas: string[];
}

const FORMATO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Pendências de conferência DINÂMICAS (recalculadas a cada leitura — somem quando a GERDAB resolve o ponto), separadas em
 * impeditivas e não impeditivas para a geração definitiva. As notas de identificação da origem (`conferencia`) são
 * informativas e ficam à parte.
 */
export function avaliarRegistro(r: RegistroAlteracao): AvaliacaoRegistro {
  const imp: string[] = [];
  const info: string[] = [];
  if (!r.titular.nome.trim()) imp.push("Nome do titular não informado");
  if (!r.titular.matricula) imp.push("Matrícula sem correspondência");
  if (!r.vinculo) imp.push("Vínculo funcional (Ativo/Inativo) a conferir");
  if (!r.origemPagamento) imp.push("Origem de pagamento (Boletos, ASSEFAZ ou ASSETRAN) a conferir");
  if (!FORMATO_COMPETENCIA.test(r.competenciaReferencia)) imp.push("Competência de referência inválida ou ausente");
  if (!FORMATO_COMPETENCIA.test(r.competenciaPagamento)) imp.push("Competência de pagamento inválida ou ausente");
  if (r.competenciaEstimada) imp.push("Competência de referência estimada — ainda não conferida");
  if (r.movimentos.some((m) => m.tipo === "a_conferir")) imp.push("Natureza da movimentação a classificar");
  if (!r.observacao.trim()) imp.push("Observação NURFI vazia");
  const ev = estadoDoValor(r);
  if (ev === "pendente") (exigeValor(r.movimentos) ? imp : info).push(exigeValor(r.movimentos) ? "Valor informado ao NURFI pendente" : "Sem valor informado (não exigido para esta movimentação)");
  if (r.observacaoDetalhadaExigida && r.observacao.trim() && observacaoGenerica(r.observacao, r.movimentos)) imp.push("Observação NURFI genérica: descreva o motivo da movimentação");
  for (const m of r.movimentos) {
    if (!["dependente_incluido", "dependente_excluido", "dependente_reincluido"].includes(m.tipo)) continue;
    // A identificação nominal do dependente é INFORMAÇÃO COMPLEMENTAR: sua ausência nunca gera pendência nem bloqueio (o relatório é
    // por grupo familiar, com uma linha por titular). Só se informa que um nome digitado à mão ainda não foi validado.
    if (m.dependente?.pendenteValidacao) info.push(`Dependente ${m.dependente.nome} informado manualmente — pendente de validação`);
  }
  if (ev === "nao_aplicavel") info.push(`Valor declarado como não aplicável: ${r.valorNaoAplicavel!.justificativa}`);
  return { impeditivas: imp, informativas: info };
}

export interface PendenciaAmigavel {
  chave: "classificar" | "valor" | "competencia" | "vinculo" | "origem" | "matricula" | "observacao" | "nome";
  /** Texto curto para a coluna "Situação" da tabela. */
  tabela: string;
  /** Instrução para o rodapé do diálogo de conferência. */
  rodape: string;
}

/**
 * Pendências IMPEDITIVAS em linguagem de ação, na ordem em que a GERDAB costuma resolvê-las. Mesma fonte de verdade de
 * `avaliarRegistro` (nunca uma regra à parte): vazio = o registro pode ficar "Pronto".
 */
export function pendenciasAmigaveis(r: RegistroAlteracao): PendenciaAmigavel[] {
  const p: PendenciaAmigavel[] = [];
  if (!r.titular.nome.trim()) p.push({ chave: "nome", tabela: "Informe o beneficiário", rodape: "Selecione o beneficiário." });
  if (r.movimentos.some((m) => m.tipo === "a_conferir")) p.push({ chave: "classificar", tabela: "Selecione o tipo de alteração", rodape: "Selecione o tipo de movimentação." });
  const imp = avaliarRegistro(r).impeditivas;
  if (imp.some((x) => x.startsWith("Competência") && !x.startsWith("Competência de efeito"))) p.push({ chave: "competencia", tabela: "Confirme o mês da alteração", rodape: "Confirme a competência da alteração." });
  if (imp.includes("Observação NURFI genérica: descreva o motivo da movimentação")) p.push({ chave: "observacao", tabela: "Complemente a observação NURFI", rodape: "Complemente a observação NURFI com o motivo da movimentação (texto genérico como “Alterar valor.” não basta)." });
  if (imp.some((x) => x.startsWith("Valor informado"))) {
    const temReferencia = Object.values(r.valores).some((v) => v !== undefined);
    p.push(
      r.valorSugerido
        ? { chave: "valor", tabela: "Confirme o valor sugerido", rodape: "Confirme (ou ajuste, com justificativa) o Valor NURFI sugerido pelo sistema." }
        : r.valorPendencia
          ? { chave: "valor", tabela: `${ROTULO_PENDENCIA_VALOR[r.valorPendencia.tipo]}: informe o valor`, rodape: `${ROTULO_PENDENCIA_VALOR[r.valorPendencia.tipo]} — informe o Valor NURFI (ou declare que não se aplica, com justificativa).` }
          : { chave: "valor", tabela: temReferencia ? "Confirme o valor destinado ao NURFI" : "Falta informar o valor", rodape: "Informe o valor destinado ao NURFI (ou declare que não se aplica, com justificativa)." },
    );
  }
  if (!r.vinculo) p.push({ chave: "vinculo", tabela: "Defina o vínculo funcional", rodape: "Defina o vínculo funcional (Ativo ou Inativo)." });
  if (!r.origemPagamento) p.push({ chave: "origem", tabela: "Defina a origem de pagamento", rodape: "Defina a origem de pagamento (Boletos, ASSEFAZ ou ASSETRAN)." });
  if (!r.titular.matricula) p.push({ chave: "matricula", tabela: "Informe a matrícula", rodape: "Informe a matrícula." });
  if (!r.observacao.trim()) p.push({ chave: "observacao", tabela: "Preencha a observação NURFI", rodape: "Preencha a observação que será apresentada no relatório." });
  return p;
}

export const motivosDeConferencia = (r: RegistroAlteracao) => pendenciasAmigaveis(r).map((p) => p.tabela);

/** Todas as pendências (impeditivas primeiro) — usado nos contadores e avisos da conferência. */
export function pendenciasDoRegistro(r: RegistroAlteracao): string[] {
  const a = avaliarRegistro(r);
  return [...a.impeditivas, ...a.informativas.filter((i) => !i.startsWith("Sem valor informado") && !i.startsWith("Valor declarado como não aplicável") && !i.startsWith("Competência de efeito") && !i.startsWith("Dependente "))];
}

/** @deprecated use `pendenciasDoRegistro` (mantido por compatibilidade com a Etapa 2). */
export const avisosDoRegistro = pendenciasDoRegistro;

/**
 * Remove SOMENTE registros demonstrativos (`demonstrativo === true`) que não constem em nenhuma versão gerada (`idsProtegidos`).
 * Registros reais, manuais e os usados em versões são preservados. Zera o marcador da massa para permitir recarregá-la.
 */
export function removerRegistrosDemonstrativos(idsProtegidos: ReadonlySet<string>): { removidos: number; mantidosPorVersao: number } {
  const todos = listarRegistros();
  const alvo = todos.filter((r) => r.demonstrativo);
  const remover = alvo.filter((r) => !idsProtegidos.has(r.id));
  if (remover.length > 0) salvarRegistros(todos.filter((r) => !remover.some((x) => x.id === r.id)));
  try {
    localStorage.removeItem(PROSAUDE_STORAGE_KEYS.massaDemoAlteracoes);
  } catch {
    /* sem armazenamento */
  }
  return { removidos: remover.length, mantidosPorVersao: alvo.length - remover.length };
}

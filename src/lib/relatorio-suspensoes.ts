/**
 * Relatório de Suspensões (NURFI) — modelo, armazenamento, auditoria e observações.
 *
 * ⚠ As três classificações (Suspender, Permanece suspenso, Excluir) são OPERACIONAIS e escolhidas/confirmadas pela GERDAB.
 * Nenhum critério automático foi validado: este módulo NÃO decide suspensões, permanências nem exclusões, NÃO lê comprovantes,
 * planilhas, ressarcimentos ou pendências documentais para sugeri-las e NÃO altera cadastro, elegibilidade, pagamentos ou a
 * situação real de qualquer beneficiário. O relatório é exclusivamente de comunicação administrativa. As regras pendentes estão em
 * `docs/MODULO_RELATORIOS.md` (§3.34).
 *
 * Estrutura própria (arquivos independentes do Relatório de Alterações, cujos tipos básicos — vínculo, origem de pagamento,
 * situação do registro, auditoria — são apenas importados). Cada registro afeta UMA pessoa: o titular OU um dependente identificado;
 * a medida nunca é aplicada automaticamente ao grupo familiar. Na exportação a linha usa matrícula e nome do TITULAR e a observação
 * descreve o dependente.
 */
import { useEffect, useState } from "react";
import { anexarEvento, novaAuditoria } from "./auditoria";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { requerimentoDemonstrativoPorId } from "./fontes-suspensoes";
import { getRequerimentoAssociacao, statusAtualRequerimento, statusRequerimentoAssociacaoLabels, versaoVigenteRequerimento } from "./requerimentos-associacao";
import {
  competenciaPagamentoPadrao,
  identificadorTitular,
  type CampoAlterado,
  type EventoAlteracao,
  type IdentificacaoTitular,
  type OrigemInformacao,
  type OrigemPagamento,
  type ReferenciaOrigem,
  type SituacaoAlteracao,
  type VinculoFuncional,
} from "./relatorio-alteracoes";

export const EVENTO_RELATORIO_SUSPENSOES = "prosaude-relatorio-suspensoes";

/** Todo registro do Relatório de Suspensões comunica ao NURFI R$ 0,00 (não haverá ressarcimento para a situação e competência indicadas). */
export const VALOR_SUSPENSAO = 0;

export type ClassificacaoSuspensao = "suspender" | "permanece_suspenso" | "excluir";
export const ROTULO_CLASSIFICACAO: Record<ClassificacaoSuspensao, string> = { suspender: "Suspender", permanece_suspenso: "Permanece suspenso", excluir: "Excluir" };
export const CLASSIFICACOES: ClassificacaoSuspensao[] = ["suspender", "permanece_suspenso", "excluir"];
const VERBO: Record<ClassificacaoSuspensao, string> = { suspender: "Suspender", permanece_suspenso: "Permanece suspenso", excluir: "Excluir" };

/** Motivos de REFERÊNCIA (frases dos modelos da GERDAB e hipóteses de exclusão da Instrução nº 492/2023). Lista aberta: aceita texto livre. */
export const MOTIVOS_SUSPENSAO_REFERENCIA = {
  sem_comprovante_pagamento: "Não apresentou comprovante de pagamento",
  sem_documentacao: "Não apresentou documentação exigida",
  falecimento: "Faleceu",
  excluido_do_plano: "Excluído do plano",
  perda_condicao_dependente: "Perdeu a condição de dependente",
  cancelamento_a_pedido: "Cancelamento a pedido",
  cancelamento_de_oficio: "Cancelamento de ofício",
} as const;
export const textoDoMotivoSuspensao = (m?: string) => (m?.trim() ? (MOTIVOS_SUSPENSAO_REFERENCIA as Record<string, string>)[m.trim()] ?? m.trim() : "");

export const PARENTESCOS = ["Cônjuge", "Companheiro(a)", "Filho(a)", "Enteado(a)", "Menor sob guarda/tutela", "Outro"] as const;

/* ── Pendência específica e competências afetadas (S3) ─────────────────────────────────────────────────────────── */

export type TipoPendenciaSuspensao = "comprovante_pagamento" | "documentacao_obrigatoria";
export const ROTULO_TIPO_PENDENCIA: Record<TipoPendenciaSuspensao, string> = { comprovante_pagamento: "Comprovante de pagamento", documentacao_obrigatoria: "Documentação obrigatória" };

/**
 * Chave OPCIONAL da pendência específica que motiva o registro. Registros criados antes do S3 não a possuem e continuam válidos.
 *  - `comprovante_pagamento`: `competencia` é a competência do comprovante ausente ("AAAA-MM"). Um comprovante de outra competência
 *    NÃO regulariza esta pendência.
 *  - `documentacao_obrigatoria`: `documento` identifica o documento exigido (texto livre). As competências afetadas são informadas pelo analista.
 * Não há regularização nem continuidade automáticas: a apresentação de um documento não equivale à aprovação pela GERDAB.
 */
export interface PendenciaRef {
  tipo: TipoPendenciaSuspensao;
  documento?: string;
  competencia?: string;
}

const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;
/** "2026-06" → "junho/2026" */
export const competenciaPorExtenso = (c: string) => (COMPETENCIA.test(c) ? `${new Date(Number(c.slice(0, 4)), Number(c.slice(5, 7)) - 1, 1).toLocaleString("pt-BR", { month: "long" })}/${c.slice(0, 4)}` : c);
const proximoMes = (c: string) => {
  const d = new Date(Number(c.slice(0, 4)), Number(c.slice(5, 7)), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
/** Competência `n` meses depois de `c` (n pode ser negativo). */
export function competenciaMais(c: string, n: number): string {
  const d = new Date(Number(c.slice(0, 4)), Number(c.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
/** Competências de `inicio` a `fim` (inclusive), em ordem. Vazio se o intervalo for inválido. */
export function intervaloCompetencias(inicio: string, fim: string): string[] {
  if (!COMPETENCIA.test(inicio) || !COMPETENCIA.test(fim) || inicio > fim) return [];
  const r: string[] = [];
  for (let c = inicio; c <= fim && r.length < 60; c = proximoMes(c)) r.push(c);
  return r;
}
/** "junho/2026" · "março/2026 a outubro/2026" (consecutivas) · "março/2026, junho/2026 e outubro/2026". */
export function textoCompetencias(cs: string[]): string {
  const l = [...new Set(cs)].filter((c) => COMPETENCIA.test(c)).sort();
  if (l.length === 0) return "";
  if (l.length === 1) return competenciaPorExtenso(l[0]);
  if (intervaloCompetencias(l[0], l[l.length - 1]).length === l.length) return `${competenciaPorExtenso(l[0])} a ${competenciaPorExtenso(l[l.length - 1])}`;
  return `${l.slice(0, -1).map(competenciaPorExtenso).join(", ")} e ${competenciaPorExtenso(l[l.length - 1])}`;
}

/* ── Sugestões automáticas (S5) ─────────────────────────────────────────────────────────────────────────────────── */

export type FonteSugestaoSuspensao = "comprovantes" | "pendencias_documentais" | "requerimentos" | "planilhas_associacao" | "continuidade";
export const ROTULO_FONTE_SUGESTAO: Record<FonteSugestaoSuspensao, string> = {
  comprovantes: "Comprovantes e Fechamento",
  pendencias_documentais: "Pendências documentais",
  requerimentos: "Requerimentos de associação (exclusão)",
  planilhas_associacao: "Planilhas das associações",
  continuidade: "Histórico de suspensões (continuidade)",
};
export type TipoSugestaoSuspensao = "suspensao" | "exclusao" | "investigacao";
export const ROTULO_TIPO_SUGESTAO: Record<TipoSugestaoSuspensao, string> = { suspensao: "Sugestão de suspensão", exclusao: "Sugestão de exclusão", investigacao: "Investigação" };

/**
 * Origem de um registro criado por "Buscar e preencher registros". `chave` identifica a pendência (fonte + pessoa + competência + tipo) e
 * `fingerprint` o estado da informação de origem quando foi lida: a mesma chave com o mesmo fingerprint nunca é recriada (nem se descartada);
 * só uma mudança relevante na origem (outro fingerprint) permite uma nova sugestão após descarte.
 * Investigação = informação encontrada que NÃO permite concluir a situação: nasce sem classificação e nunca afirma inadimplência.
 */
export interface SugestaoSuspensao {
  fonte: FonteSugestaoSuspensao;
  tipo: TipoSugestaoSuspensao;
  chave: string;
  fingerprint: string;
  geradaEm: string;
  /** Por que o sistema sugere (ou por que investiga). */
  justificativa: string;
  /** Investigação: o que foi encontrado. */
  encontrado?: string;
  /** Investigação/sugestão: o que o analista precisa verificar. */
  verificar?: string;
}

/* ── Requerimento de exclusão aprovado (S4) ────────────────────────────────────────────────────────────────────── */

export type OrigemRequerimentoExclusao = "requerimento_associacao" | "conferencia_manual";
export const ROTULO_ORIGEM_REQUERIMENTO: Record<OrigemRequerimentoExclusao, string> = { requerimento_associacao: "Requerimento de associação (módulo Requerimentos)", conferencia_manual: "Conferência manual (outra origem)" };
export type SituacaoAprovacaoRequerimento = "aprovado" | "nao_aprovado" | "nao_verificado";

/**
 * Vínculo OPCIONAL de um registro "Excluir" com o requerimento de exclusão que o sustenta. Não há fonte automática de aprovação para
 * requerimentos individuais do Admin (a decisão não é persistida): neles a aprovação é verificada e declarada pelo analista
 * (`conferencia_manual`). O sistema nunca inventa número de requerimento nem aprovação. O alcance da exclusão decorre da pessoa afetada:
 * titular ⇒ todo o grupo familiar; dependente ⇒ exclusivamente o dependente.
 */
export interface RequerimentoExclusaoRef {
  origem: OrigemRequerimentoExclusao;
  /** Identificação do requerimento (id do módulo de associação ou protocolo informado pelo analista). */
  referencia: string;
  /** Só na origem "requerimento_associacao". */
  requerimentoId?: string;
  associacao?: string;
  /** Beneficiário/dependente indicado no requerimento (texto de conferência). */
  beneficiarioReferencia?: string;
  situacaoAprovacao: SituacaoAprovacaoRequerimento;
  /** Rótulo do status na fonte, quando disponível (ex.: "Aprovado"). */
  statusFonte?: string;
  decididoPor?: string;
  decididoEm?: string;
  /** O analista conferiu a referência e a aprovação do requerimento. */
  conferencia?: { responsavel: string; dataHora: string };
}

/** Frase de alcance da exclusão, usada na observação: titular ⇒ grupo familiar; dependente ⇒ exclusiva do dependente. */
export const ESCOPO_EXCLUSAO_TITULAR = "Exclusão do titular, abrangendo todo o grupo familiar";
/** Texto genérico do alcance (usado como aviso na conferência); a observação inclui o nome do dependente. */
export const ESCOPO_EXCLUSAO_DEPENDENTE = "Exclusão exclusiva do dependente; o titular permanece no programa";

/** Quem é afetado: o titular ou UM dependente identificado (nunca o grupo familiar inteiro). */
export interface PessoaAfetada {
  tipo: "titular" | "dependente";
  nomeDependente?: string;
  parentesco?: string;
}

export interface RegistroSuspensao {
  id: string;
  titular: IdentificacaoTitular;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia: string;
  competenciaPagamento: string;
  competenciaEstimada?: boolean;
  /** Ausente = a classificar (impeditivo). */
  classificacao?: ClassificacaoSuspensao;
  afetado: PessoaAfetada;
  /** Chave de `MOTIVOS_SUSPENSAO_REFERENCIA` ou texto livre. */
  motivo?: string;
  /** LEGADO (registros criados antes da regra do valor fixo): preservado sem alteração e nunca usado — todo valor do relatório é {@link VALOR_SUSPENSAO}. */
  valorInformadoNurfi?: number;
  /** LEGADO (idem): declaração antiga de "valor não aplicável"; preservada como histórico, ignorada nas novas emissões. */
  valorNaoAplicavel?: { justificativa: string; responsavel: string; dataHora: string };
  observacao: string;
  observacaoEditada: boolean;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
  /** S5 (opcional): registro criado por "Buscar e preencher registros". Ausente em registros manuais e antigos. */
  sugestao?: SugestaoSuspensao;
  /** S5: a fonte não permite saber se a exclusão atinge o titular ou um dependente — o analista precisa conferir quem é afetado (texto = o que conferir). */
  afetadoAConferir?: string;
  /** S4 (opcional): requerimento de exclusão aprovado que sustenta a classificação "Excluir". Ausente em registros antigos. */
  requerimentoExclusao?: RequerimentoExclusaoRef;
  /** S3 (opcional): pendência específica que motiva o registro. Ausente em registros antigos. */
  pendenciaRef?: PendenciaRef;
  /** S3 (opcional): competências afetadas ("AAAA-MM", ordenadas). Comprovante: só a do comprovante. Documentação: informadas/ajustadas pelo analista. */
  competenciasAfetadas?: string[];
  /** S3: para documentação obrigatória, o analista conferiu a competência inicial das competências afetadas (nunca presumida). */
  competenciaInicialConferida?: { responsavel: string; dataHora: string };
  situacao: SituacaoAlteracao;
  justificativaDescarte?: string;
  conferencia: string[];
  responsavel: string;
  criadoEm: string;
  atualizadoEm: string;
  demonstrativo?: boolean;
  historico: EventoAlteracao[];
}

/* ── Persistência ──────────────────────────────────────────────────────────────────────────────────────────────── */

export function listarSuspensoes(): RegistroSuspensao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioSuspensoes);
    return raw ? (JSON.parse(raw) as RegistroSuspensao[]) : [];
  } catch {
    return [];
  }
}
function salvar(rs: RegistroSuspensao[]) {
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.relatorioSuspensoes, JSON.stringify(rs));
  window.dispatchEvent(new Event(EVENTO_RELATORIO_SUSPENSOES));
}
export const getSuspensao = (id: string) => listarSuspensoes().find((r) => r.id === id);

export function useRegistrosSuspensoes(): RegistroSuspensao[] {
  const [rs, setRs] = useState<RegistroSuspensao[]>([]);
  useEffect(() => {
    const atualizar = () => setRs(listarSuspensoes());
    atualizar();
    window.addEventListener(EVENTO_RELATORIO_SUSPENSOES, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_RELATORIO_SUSPENSOES, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return rs;
}

/* ── Observação NURFI (sugestão; o texto final é sempre livre) ─────────────────────────────────────────────────── */

const comPonto = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);

/**
 * "Suspender. Não apresentou comprovante de pagamento." · "Permanece suspenso." · "Excluir. Faleceu."
 * Dependente: "Suspender. Dependente Maria (cônjuge): Não apresentou comprovante de nascimento." — descreve o dependente na observação,
 * porque a linha do documento é do titular.
 */
export function sugerirObservacaoSuspensao(c: ClassificacaoSuspensao | undefined, afetado: PessoaAfetada, motivo?: string, pendencia?: { ref?: PendenciaRef; competencias?: string[]; requerimento?: RequerimentoExclusaoRef }): string {
  if (!c) return "";
  const base = textoDoMotivoSuspensao(motivo);
  const extra = descricaoPendencia(pendencia?.ref, pendencia?.competencias);
  const m = base && extra ? `${base} ${extra}` : base || extra;
  const dep = afetado.tipo === "dependente" ? `Dependente ${afetado.nomeDependente?.trim() || "(a identificar)"}${afetado.parentesco ? ` (${afetado.parentesco.toLowerCase()})` : ""}` : "";
  const principal = dep ? `${comPonto(VERBO[c])} ${comPonto(m ? `${dep}: ${m}` : dep)}` : m ? `${comPonto(VERBO[c])} ${comPonto(m)}` : comPonto(VERBO[c]);
  if (c !== "excluir") return principal;
  // Exclusão: informa o alcance (grupo familiar × somente o dependente) e o requerimento aprovado, quando referenciado.
  const req = pendencia?.requerimento?.referencia.trim();
  return `${principal} ${comPonto(`${afetado.tipo === "titular" ? ESCOPO_EXCLUSAO_TITULAR : `Exclusão exclusiva do dependente ${afetado.nomeDependente?.trim() || "(a identificar)"}; o titular permanece no programa`}${req ? `, conforme requerimento de exclusão aprovado ${req}` : ""}`)}`;
}

/** Complemento da observação com a pendência específica: "referente a junho/2026" · "(Comprovante de matrícula), competências afetadas: março/2026 a outubro/2026". */
function descricaoPendencia(ref?: PendenciaRef, competencias?: string[]): string {
  if (!ref) return "";
  if (ref.tipo === "comprovante_pagamento") return ref.competencia && COMPETENCIA.test(ref.competencia) ? `referente a ${competenciaPorExtenso(ref.competencia)}` : "";
  const doc = ref.documento?.trim();
  const cs = textoCompetencias(competencias ?? []);
  return [doc ? `(${doc})` : "", cs ? `${doc ? ", " : ""}competências afetadas: ${cs}` : ""].join("").trim();
}
/** Sugestão de observação do registro com a sua pendência (usada quando a observação ainda não foi editada). */
const sugestaoDoRegistro = (r: Pick<RegistroSuspensao, "classificacao" | "afetado" | "motivo" | "pendenciaRef" | "competenciasAfetadas" | "requerimentoExclusao">) => sugerirObservacaoSuspensao(r.classificacao, r.afetado, r.motivo, { ref: r.pendenciaRef, competencias: r.competenciasAfetadas, requerimento: r.requerimentoExclusao });

/* ── Duplicidade ───────────────────────────────────────────────────────────────────────────────────────────────── */

const norm = (t?: string) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const chavePendencia = (p?: PendenciaRef) => (p ? [p.tipo, norm(p.documento), p.competencia ?? ""].join(":") : "");
const assinatura = (r: Pick<RegistroSuspensao, "titular" | "origemPagamento" | "competenciaReferencia" | "classificacao" | "afetado" | "motivo" | "pendenciaRef" | "sugestao">) =>
  [identificadorTitular(r.titular), r.competenciaReferencia, r.origemPagamento ?? "", r.classificacao ?? "", r.afetado.tipo, norm(r.afetado.nomeDependente), norm(textoDoMotivoSuspensao(r.motivo)), chavePendencia(r.pendenciaRef), r.sugestao?.chave ?? ""].join("|");

/* ── Operações (auditadas, append-only) ───────────────────────────────────────────────────────────────────────── */

const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
function evento(tipo: EventoAlteracao["tipo"], responsavel: string, justificativa?: string, alteracoes?: CampoAlterado[]): EventoAlteracao {
  return { ...novaAuditoria(responsavel, justificativa), id: novoId("evt"), tipo, alteracoes: alteracoes?.length ? alteracoes : undefined };
}
function exigirJustificativaSeConfirmado(r: RegistroSuspensao, j?: string) {
  if (r.situacao === "confirmada" && !j?.trim()) throw new Error("Registro confirmado: informe a justificativa da alteração.");
}
function alterar(id: string, f: (r: RegistroSuspensao) => RegistroSuspensao): RegistroSuspensao {
  const rs = listarSuspensoes();
  const a = rs.find((r) => r.id === id);
  if (!a) throw new Error("Registro não encontrado.");
  const n = f(a);
  salvar(rs.map((r) => (r.id === id ? n : r)));
  return n;
}
const comEvento = (r: RegistroSuspensao, ev: EventoAlteracao, resto: Partial<RegistroSuspensao>): RegistroSuspensao => ({ ...r, ...resto, responsavel: ev.responsavel, atualizadoEm: ev.dataHora, historico: anexarEvento(r.historico, ev) });

/** Normaliza a pendência e as competências afetadas. Comprovante: sempre UMA competência (a do comprovante). Documentação: lista ordenada, sem duplicatas. */
function normalizarPendencia(ref: PendenciaRef | undefined, competencias: string[] | undefined): { pendenciaRef?: PendenciaRef; competenciasAfetadas?: string[] } {
  if (!ref) return { pendenciaRef: undefined, competenciasAfetadas: undefined };
  if (ref.tipo === "comprovante_pagamento") {
    const c = ref.competencia?.trim();
    if (c && !COMPETENCIA.test(c)) throw new Error("Competência do comprovante inválida.");
    return { pendenciaRef: { tipo: ref.tipo, competencia: c || undefined }, competenciasAfetadas: c ? [c] : undefined };
  }
  const lista = [...new Set((competencias ?? []).map((c) => c.trim()).filter(Boolean))].sort();
  if (lista.some((c) => !COMPETENCIA.test(c))) throw new Error("Competência afetada inválida.");
  return { pendenciaRef: { tipo: ref.tipo, documento: ref.documento?.trim() || undefined }, competenciasAfetadas: lista.length ? lista : undefined };
}

/** Normaliza o vínculo com o requerimento: a referência é obrigatória e a conferência só vale se foi feita. */
function normalizarRequerimento(r: RequerimentoExclusaoRef | undefined): RequerimentoExclusaoRef | undefined {
  if (!r) return undefined;
  const referencia = r.referencia.trim();
  if (!referencia) throw new Error("Informe a referência do requerimento de exclusão.");
  return {
    origem: r.origem,
    referencia,
    requerimentoId: r.origem === "requerimento_associacao" ? r.requerimentoId : undefined,
    associacao: r.origem === "requerimento_associacao" ? r.associacao : undefined,
    beneficiarioReferencia: r.beneficiarioReferencia?.trim() || undefined,
    situacaoAprovacao: r.situacaoAprovacao,
    statusFonte: r.statusFonte,
    decididoPor: r.decididoPor,
    decididoEm: r.decididoEm,
    conferencia: r.conferencia,
  };
}

export interface NovoRegistroSuspensao {
  id?: string;
  /** S5 */
  sugestao?: SugestaoSuspensao;
  conferencia?: string[];
  competenciaEstimada?: boolean;
  afetadoAConferir?: string;
  /** S3 (opcional). */
  pendenciaRef?: PendenciaRef;
  competenciasAfetadas?: string[];
  /** S3: o analista conferiu a competência inicial (documentação obrigatória). */
  confirmarCompetenciaInicial?: boolean;
  /** S4 (opcional): requerimento de exclusão aprovado (só para "Excluir"). */
  requerimentoExclusao?: RequerimentoExclusaoRef;
  titular: IdentificacaoTitular;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia: string;
  competenciaPagamento?: string;
  classificacao?: ClassificacaoSuspensao;
  afetado: PessoaAfetada;
  motivo?: string;
  observacao?: string;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
  demonstrativo?: boolean;
  justificativa?: string;
}

/** Cria SEMPRE como "identificada". Idempotente por id e por assinatura (titular + competência + origem + classificação + afetado + motivo). */
export function registrarSuspensao(e: NovoRegistroSuspensao, responsavel: string): { registro: RegistroSuspensao; criado: boolean } {
  if (!e.titular.nome.trim()) throw new Error("Informe o nome do titular.");
  if (e.afetado.tipo === "dependente" && !e.afetado.nomeDependente?.trim()) throw new Error("Identifique o dependente afetado.");
  const todos = listarSuspensoes();
  if (e.id && todos.find((r) => r.id === e.id)) return { registro: todos.find((r) => r.id === e.id)!, criado: false };
  const pend = normalizarPendencia(e.pendenciaRef, e.competenciasAfetadas);
  const requerimento = e.classificacao === "excluir" ? normalizarRequerimento(e.requerimentoExclusao) : undefined;
  const candidato = { titular: e.titular, origemPagamento: e.origemPagamento, competenciaReferencia: e.competenciaReferencia, classificacao: e.classificacao, afetado: e.afetado, motivo: e.motivo, pendenciaRef: pend.pendenciaRef, sugestao: e.sugestao };
  const dup = todos.find((r) => r.situacao !== "descartada" && assinatura(r) === assinatura(candidato));
  if (dup) return { registro: dup, criado: false };
  const agora = new Date().toISOString();
  const obs = e.observacao?.trim();
  const registro: RegistroSuspensao = {
    id: e.id ?? novoId("sus"),
    titular: { nome: e.titular.nome.trim(), matricula: e.titular.matricula?.trim() || undefined, cpf: e.titular.cpf?.trim() || undefined },
    vinculo: e.vinculo,
    origemPagamento: e.origemPagamento,
    competenciaReferencia: e.competenciaReferencia,
    competenciaPagamento: e.competenciaPagamento ?? competenciaPagamentoPadrao(e.competenciaReferencia),
    classificacao: e.classificacao,
    afetado: e.afetado.tipo === "dependente" ? { tipo: "dependente", nomeDependente: e.afetado.nomeDependente!.trim(), parentesco: e.afetado.parentesco } : { tipo: "titular" },
    motivo: e.motivo?.trim() || undefined,
    ...pend,
    sugestao: e.sugestao,
    afetadoAConferir: e.afetadoAConferir,
    competenciaEstimada: e.competenciaEstimada || undefined,
    requerimentoExclusao: requerimento,
    competenciaInicialConferida: pend.pendenciaRef?.tipo === "documentacao_obrigatoria" && pend.competenciasAfetadas ? e.confirmarCompetenciaInicial ? { responsavel, dataHora: agora } : undefined : undefined,
    observacao: obs || sugestaoDoRegistro({ classificacao: e.classificacao, afetado: e.afetado, motivo: e.motivo, requerimentoExclusao: requerimento, ...pend }),
    observacaoEditada: !!obs,
    origemInformacao: e.origemInformacao,
    referenciaOrigem: e.referenciaOrigem,
    situacao: "identificada",
    conferencia: e.conferencia ?? [],
    responsavel,
    criadoEm: agora,
    atualizadoEm: agora,
    demonstrativo: e.demonstrativo,
    historico: [evento("inclusao_registro", responsavel, e.justificativa, [{ campo: "situacao", novo: "identificada" }])],
  };
  salvar([...todos, registro]);
  return { registro, criado: true };
}

export interface DadosSuspensao {
  titularNome?: string;
  matricula?: string;
  cpf?: string;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia?: string;
  competenciaPagamento?: string;
}

/** Atualiza a SITUAÇÃO operacional (classificação), a pessoa afetada e o motivo. A observação acompanha a sugestão enquanto não foi editada. */
export function atualizarClassificacao(id: string, patch: { classificacao?: ClassificacaoSuspensao; afetado: PessoaAfetada; motivo?: string; afetadoConferido?: boolean }, responsavel: string, justificativa?: string): RegistroSuspensao {
  if (patch.afetado.tipo === "dependente" && !patch.afetado.nomeDependente?.trim()) throw new Error("Identifique o dependente afetado.");
  return alterar(id, (r) => {
    exigirJustificativaSeConfirmado(r, justificativa);
    const motivo = patch.motivo?.trim() || undefined;
    const afetado: PessoaAfetada = patch.afetado.tipo === "dependente" ? { tipo: "dependente", nomeDependente: patch.afetado.nomeDependente!.trim(), parentesco: patch.afetado.parentesco } : { tipo: "titular" };
    const desc = (c?: ClassificacaoSuspensao, a?: PessoaAfetada, m?: string) => [c ? ROTULO_CLASSIFICACAO[c] : "—", a?.tipo === "dependente" ? `dependente ${a.nomeDependente ?? ""}` : "titular", textoDoMotivoSuspensao(m) || "sem motivo"].join(" · ");
    const antes = desc(r.classificacao, r.afetado, r.motivo);
    const depois = desc(patch.classificacao, afetado, motivo);
    const limpaConferirAfetado = !!patch.afetadoConferido && !!r.afetadoAConferir;
    if (antes === depois && !limpaConferirAfetado) throw new Error("Nenhuma alteração na classificação.");
    const alteracoes: CampoAlterado[] = antes === depois ? [] : [{ campo: "classificação", anterior: antes, novo: depois }];
    if (limpaConferirAfetado) alteracoes.push({ campo: "quem é afetado conferido", anterior: r.afetadoAConferir ?? null, novo: depois });
    const resto: Partial<RegistroSuspensao> = { classificacao: patch.classificacao, afetado, motivo, afetadoAConferir: limpaConferirAfetado ? undefined : r.afetadoAConferir };
    const sugestao = sugestaoDoRegistro({ classificacao: patch.classificacao, afetado, motivo, pendenciaRef: r.pendenciaRef, competenciasAfetadas: r.competenciasAfetadas, requerimentoExclusao: r.requerimentoExclusao });
    if (!r.observacaoEditada && r.observacao !== sugestao) {
      alteracoes.push({ campo: "observacao", anterior: r.observacao, novo: sugestao });
      resto.observacao = sugestao;
    }
    return comEvento(r, evento("alteracao_movimentacao", responsavel, justificativa, alteracoes), resto);
  });
}

/**
 * Define (ou limpa) a pendência específica e as competências afetadas. Nunca presume a competência inicial: ao alterar as competências de
 * uma documentação obrigatória, a conferência anterior é descartada e precisa ser refeita (`confirmarCompetenciaInicial`). A observação
 * acompanha a sugestão enquanto não foi editada. Não regulariza nem avalia continuidade de suspensão.
 */
export function atualizarPendenciaSuspensao(id: string, patch: { pendenciaRef?: PendenciaRef; competenciasAfetadas?: string[]; confirmarCompetenciaInicial?: boolean }, responsavel: string, justificativa?: string): RegistroSuspensao {
  const pend = normalizarPendencia(patch.pendenciaRef, patch.competenciasAfetadas);
  return alterar(id, (r) => {
    const mesmaRef = JSON.stringify(r.pendenciaRef ?? null) === JSON.stringify(pend.pendenciaRef ?? null);
    const mesmasComp = JSON.stringify(r.competenciasAfetadas ?? []) === JSON.stringify(pend.competenciasAfetadas ?? []);
    const documentacao = pend.pendenciaRef?.tipo === "documentacao_obrigatoria";
    // Mantém a conferência só se nada mudou e o analista não a desmarcou; qualquer mudança nas competências exige conferir de novo.
    const manterConfirmacao = documentacao && mesmaRef && mesmasComp && !!r.competenciaInicialConferida && patch.confirmarCompetenciaInicial !== false;
    const confirmacaoNova = documentacao && !!patch.confirmarCompetenciaInicial && !!pend.competenciasAfetadas && !manterConfirmacao;
    const perdeConfirmacao = !!r.competenciaInicialConferida && !manterConfirmacao && !confirmacaoNova;
    if (mesmaRef && mesmasComp && !confirmacaoNova && !perdeConfirmacao) throw new Error("Nenhuma alteração na pendência ou nas competências afetadas.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const desc = (ref?: PendenciaRef, cs?: string[]) => (ref ? `${ROTULO_TIPO_PENDENCIA[ref.tipo]}${ref.documento ? ` (${ref.documento})` : ""}${cs?.length ? ` · ${textoCompetencias(cs)}` : ""}` : "sem pendência específica");
    const alteracoes: CampoAlterado[] = [];
    if (!mesmaRef || !mesmasComp) alteracoes.push({ campo: "pendência e competências afetadas", anterior: desc(r.pendenciaRef, r.competenciasAfetadas), novo: desc(pend.pendenciaRef, pend.competenciasAfetadas) });
    const dataHora = new Date().toISOString();
    const conferida = manterConfirmacao ? r.competenciaInicialConferida : confirmacaoNova ? { responsavel, dataHora } : undefined;
    if (perdeConfirmacao) alteracoes.push({ campo: "competência inicial conferida", anterior: r.competenciaInicialConferida?.responsavel ?? null, novo: null });
    if (confirmacaoNova) alteracoes.push({ campo: "competência inicial conferida", anterior: r.competenciaInicialConferida?.responsavel ?? null, novo: responsavel });
    const resto: Partial<RegistroSuspensao> = { ...pend, competenciaInicialConferida: conferida };
    const sugestaoAnterior = sugestaoDoRegistro(r);
    const sugestaoNova = sugestaoDoRegistro({ ...r, ...pend });
    if (!r.observacaoEditada && r.observacao !== sugestaoNova && (r.observacao === sugestaoAnterior || !r.observacao.trim())) {
      alteracoes.push({ campo: "observacao", anterior: r.observacao, novo: sugestaoNova });
      resto.observacao = sugestaoNova;
    }
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, alteracoes), resto);
  });
}

/**
 * Define (ou remove) o vínculo com o requerimento de exclusão aprovado. A conferência é do analista e fica registrada (responsável e
 * data/hora); trocar a referência ou a situação de aprovação exige conferir de novo. A observação acompanha a sugestão enquanto não
 * foi editada. Não cria nem aprova requerimentos: apenas registra o que o analista verificou.
 */
export function atualizarRequerimentoExclusaoSuspensao(id: string, requerimento: RequerimentoExclusaoRef | undefined, responsavel: string, justificativa?: string): RegistroSuspensao {
  const novo = normalizarRequerimento(requerimento);
  return alterar(id, (r) => {
    const chave = (x?: RequerimentoExclusaoRef) => (x ? JSON.stringify([x.origem, x.referencia, x.requerimentoId ?? "", x.situacaoAprovacao, x.beneficiarioReferencia ?? "", !!x.conferencia]) : "");
    if (chave(novo) === chave(r.requerimentoExclusao)) throw new Error("Nenhuma alteração no requerimento de exclusão.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const desc = (x?: RequerimentoExclusaoRef) => (x ? `${x.referencia} · ${ROTULO_ORIGEM_REQUERIMENTO[x.origem]} · ${x.situacaoAprovacao}${x.conferencia ? " · conferido" : " · não conferido"}` : "sem requerimento");
    const alteracoes: CampoAlterado[] = [{ campo: "requerimento de exclusão", anterior: desc(r.requerimentoExclusao), novo: desc(novo) }];
    const resto: Partial<RegistroSuspensao> = { requerimentoExclusao: novo };
    const sugestaoNova = sugestaoDoRegistro({ ...r, requerimentoExclusao: novo });
    if (!r.observacaoEditada && r.observacao !== sugestaoNova) {
      alteracoes.push({ campo: "observacao", anterior: r.observacao, novo: sugestaoNova });
      resto.observacao = sugestaoNova;
    }
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, alteracoes), resto);
  });
}

export function atualizarObservacaoSuspensao(id: string, texto: string, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    const limpo = texto.trim();
    const novo = limpo || sugestaoDoRegistro(r);
    if (novo === r.observacao && !!limpo === r.observacaoEditada) throw new Error("Nenhuma alteração na observação.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("edicao_observacao", responsavel, justificativa, [{ campo: "observacao", anterior: r.observacao, novo }]), { observacao: novo, observacaoEditada: !!limpo });
  });
}

const ROTULO_CAMPO: Record<keyof DadosSuspensao, string> = { titularNome: "Nome do titular", matricula: "Matrícula", cpf: "CPF do titular", vinculo: "Vínculo funcional", origemPagamento: "Origem de pagamento", competenciaReferencia: "Competência de referência", competenciaPagamento: "Competência de pagamento" };
export function atualizarDadosSuspensao(id: string, patch: DadosSuspensao, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    const anterior: Record<string, string | undefined> = { titularNome: r.titular.nome, matricula: r.titular.matricula, cpf: r.titular.cpf, vinculo: r.vinculo, origemPagamento: r.origemPagamento, competenciaReferencia: r.competenciaReferencia, competenciaPagamento: r.competenciaPagamento };
    const p: DadosSuspensao = { ...patch };
    if (p.competenciaReferencia && p.competenciaReferencia !== r.competenciaReferencia && p.competenciaPagamento === undefined) p.competenciaPagamento = competenciaPagamentoPadrao(p.competenciaReferencia);
    const alt: CampoAlterado[] = [];
    for (const k of Object.keys(p) as (keyof DadosSuspensao)[]) {
      const v = (p[k] ?? "").toString().trim() || undefined;
      if (v !== anterior[k]) alt.push({ campo: ROTULO_CAMPO[k], anterior: anterior[k] ?? null, novo: v ?? null });
    }
    if (alt.length === 0) throw new Error("Nenhum dado foi alterado.");
    if (p.titularNome !== undefined && !p.titularNome.trim()) throw new Error("Informe o nome do titular.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const resto: Partial<RegistroSuspensao> = {
      titular: { ...r.titular, nome: p.titularNome?.trim() || r.titular.nome, matricula: "matricula" in p ? p.matricula?.trim() || undefined : r.titular.matricula, cpf: "cpf" in p ? p.cpf?.trim() || undefined : r.titular.cpf },
      vinculo: "vinculo" in p ? p.vinculo : r.vinculo,
      origemPagamento: "origemPagamento" in p ? p.origemPagamento : r.origemPagamento,
      competenciaReferencia: p.competenciaReferencia ?? r.competenciaReferencia,
      competenciaPagamento: p.competenciaPagamento ?? r.competenciaPagamento,
    };
    if (p.competenciaReferencia !== undefined || p.competenciaPagamento !== undefined) resto.competenciaEstimada = undefined;
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, alt), resto);
  });
}

/** O analista conferiu as competências de referência e de pagamento de um registro com competência estimada (ex.: sugestão automática). */
export function confirmarCompetenciasSuspensao(id: string, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    if (!r.competenciaEstimada) throw new Error("As competências deste registro já estão conferidas.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, [{ campo: "competências conferidas", anterior: `${r.competenciaReferencia} / pagamento ${r.competenciaPagamento} (estimadas)`, novo: `${r.competenciaReferencia} / pagamento ${r.competenciaPagamento}` }]), { competenciaEstimada: undefined });
  });
}

/**
 * Antes de confirmar uma exclusão, relê o status do requerimento NA FONTE (requerimentos de associação). Se a aprovação mudou, o
 * requerimento sumiu ou a decisão foi refeita depois da conferência, o vínculo é atualizado (conferência descartada) e a confirmação é
 * recusada: nova conferência necessária. Sem fonte persistida (conferência manual), não há o que reler.
 */
function verificarRequerimentoNaFonte(id: string) {
  const r = getSuspensao(id);
  const q = r?.requerimentoExclusao;
  if (!r || r.classificacao !== "excluir" || q?.origem !== "requerimento_associacao" || !q.requerimentoId) return;
  const fonte = getRequerimentoAssociacao(q.requerimentoId) ?? requerimentoDemonstrativoPorId(q.requerimentoId); // fictícios do ambiente demonstrativo: só para ids `DEMO-REQ-…`
  const desatualizar = (patch: Partial<RequerimentoExclusaoRef>, mensagem: string): never => {
    atualizarRequerimentoExclusaoSuspensao(id, { ...q, ...patch, conferencia: undefined }, "Sistema (verificação na fonte)");
    throw new Error(mensagem);
  };
  if (!fonte) desatualizar({ situacaoAprovacao: "nao_verificado", statusFonte: undefined }, "O requerimento vinculado não foi encontrado na fonte: a aprovação não pôde ser confirmada. Faça uma nova conferência.");
  const status = statusAtualRequerimento(fonte!);
  const decisao = versaoVigenteRequerimento(fonte!).decisao;
  if (status !== "aprovado") desatualizar({ situacaoAprovacao: "nao_aprovado", statusFonte: statusRequerimentoAssociacaoLabels[status] }, `A aprovação do requerimento mudou (status atual: ${statusRequerimentoAssociacaoLabels[status]}): faça uma nova conferência antes de confirmar.`);
  if (q.decididoEm && decisao?.decididoEm !== q.decididoEm) desatualizar({ decididoEm: decisao?.decididoEm, decididoPor: decisao?.decididoPor }, "A decisão do requerimento foi alterada depois da conferência: faça uma nova conferência antes de confirmar.");
}

export function confirmarSuspensao(id: string, responsavel: string, justificativa?: string): RegistroSuspensao {
  verificarRequerimentoNaFonte(id);
  return alterar(id, (r) => {
    if (r.situacao === "confirmada") throw new Error("O registro já está confirmado.");
    return comEvento(r, evento("confirmacao", responsavel, justificativa, [{ campo: "situacao", anterior: r.situacao, novo: "confirmada" }]), { situacao: "confirmada", justificativaDescarte: undefined });
  });
}
export function descartarSuspensao(id: string, responsavel: string, justificativa: string): RegistroSuspensao {
  const j = justificativa.trim();
  if (!j) throw new Error("Informe a justificativa do descarte.");
  return alterar(id, (r) => {
    if (r.situacao === "descartada") throw new Error("O registro já está descartado.");
    return comEvento(r, evento("descarte", responsavel, j, [{ campo: "situacao", anterior: r.situacao, novo: "descartada" }]), { situacao: "descartada", justificativaDescarte: j });
  });
}
export function reabrirSuspensao(id: string, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    if (r.situacao === "identificada") throw new Error("O registro já está em conferência.");
    return comEvento(r, evento("reabertura", responsavel, justificativa, [{ campo: "situacao", anterior: r.situacao, novo: "identificada" }]), { situacao: "identificada", justificativaDescarte: undefined });
  });
}

/* ── Avaliação e pendências ────────────────────────────────────────────────────────────────────────────────────── */

const FORMATO = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Motivo é exigido para Suspender e Excluir (Permanece suspenso pode ir sem motivo, como nos modelos) — regra PROVISÓRIA a validar. */
export const exigeMotivo = (c?: ClassificacaoSuspensao) => c === "suspender" || c === "excluir";

/**
 * A observação é obrigatória e precisa informar a situação (Suspender / Permanece suspenso / Excluir), o motivo (quando há) e, para
 * dependente, a identificação do dependente. A comparação ignora acentos e maiúsculas; o texto continua livre para edição.
 */
function problemaObservacao(r: RegistroSuspensao): { tabela: string; rodape: string } | undefined {
  const obs = norm(r.observacao);
  if (!obs) return { tabela: "Preencha a observação NURFI", rodape: "Preencha a observação que será apresentada no relatório." };
  if (r.classificacao && !obs.includes(norm(ROTULO_CLASSIFICACAO[r.classificacao]))) return { tabela: "Observação sem a situação", rodape: `A observação deve informar a situação (${ROTULO_CLASSIFICACAO[r.classificacao]}).` };
  const motivo = norm(textoDoMotivoSuspensao(r.motivo));
  if (motivo && !obs.includes(motivo)) return { tabela: "Observação sem o motivo", rodape: "A observação deve informar o motivo da situação." };
  if (r.classificacao === "excluir" && r.afetado.tipo === "titular" && !obs.includes("grupo familiar")) return { tabela: "Observação sem o alcance da exclusão", rodape: "A observação deve informar que a exclusão do titular abrange todo o grupo familiar." };
  if (r.classificacao === "excluir" && r.afetado.tipo === "dependente" && !obs.includes("exclusiv")) return { tabela: "Observação sem o alcance da exclusão", rodape: "A observação deve informar que a exclusão é exclusiva do dependente." };
  if (r.afetado.tipo === "dependente" && r.afetado.nomeDependente?.trim() && !obs.includes(norm(r.afetado.nomeDependente))) return { tabela: "Observação sem o dependente", rodape: "A observação deve identificar o dependente afetado." };
  return undefined;
}

export interface PendenciaSuspensao {
  chave: string;
  impeditiva: boolean;
  tabela: string;
  rodape: string;
}
export function pendenciasSuspensao(r: RegistroSuspensao): PendenciaSuspensao[] {
  const p: PendenciaSuspensao[] = [];
  const add = (chave: string, tabela: string, rodape: string, impeditiva = true) => p.push({ chave, impeditiva, tabela, rodape });
  if (!r.titular.nome.trim()) add("nome", "Informe o beneficiário", "Selecione o beneficiário.");
  if (!r.classificacao) add("classificacao", "Selecione a situação", "Selecione a situação (Suspender, Permanece suspenso ou Excluir).");
  if (r.afetado.tipo === "dependente" && !r.afetado.nomeDependente?.trim()) add("dependente", "Identifique o dependente", "Identifique o dependente afetado.");
  if (exigeMotivo(r.classificacao) && !r.motivo?.trim()) add("motivo", "Informe o motivo", "Informe o motivo da situação.");
  if (!FORMATO.test(r.competenciaReferencia) || !FORMATO.test(r.competenciaPagamento) || r.competenciaEstimada) add("competencia", "Confirme o mês da movimentação", "Confirme a competência.");
  if (!r.vinculo) add("vinculo", "Defina o vínculo funcional", "Defina o vínculo funcional (Ativo ou Inativo).");
  if (!r.origemPagamento) add("origem", "Defina a origem de pagamento", "Defina a origem de pagamento (Boletos, ASSEFAZ ou ASSETRAN).");
  if (!r.titular.matricula) add("matricula", "Informe a matrícula", "Informe a matrícula.");
  if (r.pendenciaRef?.tipo === "comprovante_pagamento" && !(r.pendenciaRef.competencia && FORMATO.test(r.pendenciaRef.competencia))) add("pendencia_competencia", "Informe a competência do comprovante", "Informe a competência do comprovante de pagamento não apresentado.");
  if (r.pendenciaRef?.tipo === "documentacao_obrigatoria") {
    if (!r.pendenciaRef.documento?.trim()) add("pendencia_documento", "Identifique o documento", "Identifique o documento obrigatório pendente.");
    if (!r.competenciasAfetadas?.length) add("pendencia_competencias", "Informe as competências afetadas", "Informe as competências afetadas pela pendência documental.");
    else if (!r.competenciaInicialConferida) add("pendencia_competencia_inicial", "Confirme a competência inicial", "Confira e confirme a competência inicial da irregularidade documental: o sistema não presume o mês de início.");
  }
  if (r.afetadoAConferir) add("afetado_a_conferir", "Confirme quem é afetado", `Confira quem é afetado: ${r.afetadoAConferir}`);
  if (r.classificacao === "excluir") {
    const q = r.requerimentoExclusao;
    if (!q?.referencia.trim()) add("requerimento", "Informe o requerimento aprovado", "Informe a referência do requerimento de exclusão aprovado pela GERDAB.");
    else if (q.situacaoAprovacao === "nao_aprovado") add("requerimento_aprovacao", "Requerimento não aprovado", "O requerimento de exclusão informado não está aprovado: a exclusão só pode ser confirmada com requerimento aprovado.");
    else if (q.situacaoAprovacao === "nao_verificado") add("requerimento_aprovacao", "Confira a aprovação do requerimento", "Confira e declare a aprovação do requerimento de exclusão pela GERDAB.");
    else if (!q.conferencia) add("requerimento_conferencia", "Confirme a conferência do requerimento", "Confirme que você conferiu o requerimento de exclusão aprovado.");
  }
  const falhaObservacao = problemaObservacao(r);
  if (falhaObservacao) add("observacao", falhaObservacao.tabela, falhaObservacao.rodape);
  return p;
}
export const impeditivasSuspensao = (r: RegistroSuspensao) => pendenciasSuspensao(r).filter((x) => x.impeditiva);
export const prontoSuspensao = (r: RegistroSuspensao) => r.situacao === "confirmada" && impeditivasSuspensao(r).length === 0;

/** Remove SOMENTE registros demonstrativos que não constem em relatório emitido. Registros reais e manuais são preservados. */
export function removerSuspensoesDemonstrativas(idsProtegidos: ReadonlySet<string>): { removidos: number; mantidos: number } {
  const todos = listarSuspensoes();
  const alvo = todos.filter((r) => r.demonstrativo);
  const remover = alvo.filter((r) => !idsProtegidos.has(r.id));
  if (remover.length > 0) salvar(todos.filter((r) => !remover.some((x) => x.id === r.id)));
  try {
    localStorage.removeItem(PROSAUDE_STORAGE_KEYS.massaDemoSuspensoes);
  } catch {
    /* sem armazenamento */
  }
  return { removidos: remover.length, mantidos: alvo.length - remover.length };
}

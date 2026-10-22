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
  valorInformadoNurfi?: number;
  valorNaoAplicavel?: { justificativa: string; responsavel: string; dataHora: string };
  observacao: string;
  observacaoEditada: boolean;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
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
export function sugerirObservacaoSuspensao(c: ClassificacaoSuspensao | undefined, afetado: PessoaAfetada, motivo?: string): string {
  if (!c) return "";
  const m = textoDoMotivoSuspensao(motivo);
  const dep = afetado.tipo === "dependente" ? `Dependente ${afetado.nomeDependente?.trim() || "(a identificar)"}${afetado.parentesco ? ` (${afetado.parentesco.toLowerCase()})` : ""}` : "";
  if (dep) return `${comPonto(VERBO[c])} ${comPonto(m ? `${dep}: ${m}` : dep)}`;
  return m ? `${comPonto(VERBO[c])} ${comPonto(m)}` : comPonto(VERBO[c]);
}

/* ── Duplicidade ───────────────────────────────────────────────────────────────────────────────────────────────── */

const norm = (t?: string) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const assinatura = (r: Pick<RegistroSuspensao, "titular" | "origemPagamento" | "competenciaReferencia" | "classificacao" | "afetado" | "motivo">) =>
  [identificadorTitular(r.titular), r.competenciaReferencia, r.origemPagamento ?? "", r.classificacao ?? "", r.afetado.tipo, norm(r.afetado.nomeDependente), norm(textoDoMotivoSuspensao(r.motivo))].join("|");

/* ── Operações (auditadas, append-only) ───────────────────────────────────────────────────────────────────────── */

const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
function evento(tipo: EventoAlteracao["tipo"], responsavel: string, justificativa?: string, alteracoes?: CampoAlterado[]): EventoAlteracao {
  return { ...novaAuditoria(responsavel, justificativa), id: novoId("evt"), tipo, alteracoes: alteracoes?.length ? alteracoes : undefined };
}
function validarValor(v?: number) {
  // Aqui R$ 0,00 é um valor válido (nos modelos de referência a coluna é 0,00); ausência continua sendo "pendente" ou "não aplicável".
  if (v !== undefined && (!Number.isFinite(v) || v < 0)) throw new Error("Valor inválido.");
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

export interface NovoRegistroSuspensao {
  id?: string;
  titular: IdentificacaoTitular;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia: string;
  competenciaPagamento?: string;
  classificacao?: ClassificacaoSuspensao;
  afetado: PessoaAfetada;
  motivo?: string;
  valorInformadoNurfi?: number;
  observacao?: string;
  origemInformacao: OrigemInformacao;
  referenciaOrigem?: ReferenciaOrigem;
  demonstrativo?: boolean;
  justificativa?: string;
}

/** Cria SEMPRE como "identificada". Idempotente por id e por assinatura (titular + competência + origem + classificação + afetado + motivo). */
export function registrarSuspensao(e: NovoRegistroSuspensao, responsavel: string): { registro: RegistroSuspensao; criado: boolean } {
  if (!e.titular.nome.trim()) throw new Error("Informe o nome do titular.");
  validarValor(e.valorInformadoNurfi);
  if (e.afetado.tipo === "dependente" && !e.afetado.nomeDependente?.trim()) throw new Error("Identifique o dependente afetado.");
  const todos = listarSuspensoes();
  if (e.id && todos.find((r) => r.id === e.id)) return { registro: todos.find((r) => r.id === e.id)!, criado: false };
  const candidato = { titular: e.titular, origemPagamento: e.origemPagamento, competenciaReferencia: e.competenciaReferencia, classificacao: e.classificacao, afetado: e.afetado, motivo: e.motivo };
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
    valorInformadoNurfi: e.valorInformadoNurfi,
    observacao: obs || sugerirObservacaoSuspensao(e.classificacao, e.afetado, e.motivo),
    observacaoEditada: !!obs,
    origemInformacao: e.origemInformacao,
    referenciaOrigem: e.referenciaOrigem,
    situacao: "identificada",
    conferencia: [],
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
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  competenciaReferencia?: string;
  competenciaPagamento?: string;
}

/** Atualiza a SITUAÇÃO operacional (classificação), a pessoa afetada e o motivo. A observação acompanha a sugestão enquanto não foi editada. */
export function atualizarClassificacao(id: string, patch: { classificacao?: ClassificacaoSuspensao; afetado: PessoaAfetada; motivo?: string }, responsavel: string, justificativa?: string): RegistroSuspensao {
  if (patch.afetado.tipo === "dependente" && !patch.afetado.nomeDependente?.trim()) throw new Error("Identifique o dependente afetado.");
  return alterar(id, (r) => {
    exigirJustificativaSeConfirmado(r, justificativa);
    const motivo = patch.motivo?.trim() || undefined;
    const afetado: PessoaAfetada = patch.afetado.tipo === "dependente" ? { tipo: "dependente", nomeDependente: patch.afetado.nomeDependente!.trim(), parentesco: patch.afetado.parentesco } : { tipo: "titular" };
    const desc = (c?: ClassificacaoSuspensao, a?: PessoaAfetada, m?: string) => [c ? ROTULO_CLASSIFICACAO[c] : "—", a?.tipo === "dependente" ? `dependente ${a.nomeDependente ?? ""}` : "titular", textoDoMotivoSuspensao(m) || "sem motivo"].join(" · ");
    const antes = desc(r.classificacao, r.afetado, r.motivo);
    const depois = desc(patch.classificacao, afetado, motivo);
    if (antes === depois) throw new Error("Nenhuma alteração na classificação.");
    const alteracoes: CampoAlterado[] = [{ campo: "classificação", anterior: antes, novo: depois }];
    const resto: Partial<RegistroSuspensao> = { classificacao: patch.classificacao, afetado, motivo };
    const sugestao = sugerirObservacaoSuspensao(patch.classificacao, afetado, motivo);
    if (!r.observacaoEditada && r.observacao !== sugestao) {
      alteracoes.push({ campo: "observacao", anterior: r.observacao, novo: sugestao });
      resto.observacao = sugestao;
    }
    return comEvento(r, evento("alteracao_movimentacao", responsavel, justificativa, alteracoes), resto);
  });
}

export function atualizarValorSuspensao(id: string, valor: number | undefined, responsavel: string, justificativa?: string): RegistroSuspensao {
  validarValor(valor);
  return alterar(id, (r) => {
    if (r.valorInformadoNurfi === valor) throw new Error("Nenhum valor foi alterado.");
    exigirJustificativaSeConfirmado(r, justificativa);
    const alt: CampoAlterado[] = [{ campo: "valorInformadoNurfi", anterior: r.valorInformadoNurfi ?? null, novo: valor ?? null }];
    if (valor !== undefined && r.valorNaoAplicavel) alt.push({ campo: "valorNaoAplicavel", anterior: r.valorNaoAplicavel.justificativa, novo: null });
    return comEvento(r, evento("alteracao_valor", responsavel, justificativa, alt), { valorInformadoNurfi: valor, valorNaoAplicavel: valor !== undefined ? undefined : r.valorNaoAplicavel });
  });
}

export function definirValorNaoAplicavelSuspensao(id: string, naoAplicavel: boolean, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    const j = justificativa?.trim();
    if (naoAplicavel) {
      if (!j) throw new Error("Informe a justificativa de que o valor não se aplica a este registro.");
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

export function atualizarObservacaoSuspensao(id: string, texto: string, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    const limpo = texto.trim();
    const novo = limpo || sugerirObservacaoSuspensao(r.classificacao, r.afetado, r.motivo);
    if (novo === r.observacao && !!limpo === r.observacaoEditada) throw new Error("Nenhuma alteração na observação.");
    exigirJustificativaSeConfirmado(r, justificativa);
    return comEvento(r, evento("edicao_observacao", responsavel, justificativa, [{ campo: "observacao", anterior: r.observacao, novo }]), { observacao: novo, observacaoEditada: !!limpo });
  });
}

const ROTULO_CAMPO: Record<keyof DadosSuspensao, string> = { titularNome: "Nome do titular", matricula: "Matrícula", vinculo: "Vínculo funcional", origemPagamento: "Origem de pagamento", competenciaReferencia: "Competência de referência", competenciaPagamento: "Competência de pagamento" };
export function atualizarDadosSuspensao(id: string, patch: DadosSuspensao, responsavel: string, justificativa?: string): RegistroSuspensao {
  return alterar(id, (r) => {
    const anterior: Record<string, string | undefined> = { titularNome: r.titular.nome, matricula: r.titular.matricula, vinculo: r.vinculo, origemPagamento: r.origemPagamento, competenciaReferencia: r.competenciaReferencia, competenciaPagamento: r.competenciaPagamento };
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
      titular: { ...r.titular, nome: p.titularNome?.trim() || r.titular.nome, matricula: "matricula" in p ? p.matricula?.trim() || undefined : r.titular.matricula },
      vinculo: "vinculo" in p ? p.vinculo : r.vinculo,
      origemPagamento: "origemPagamento" in p ? p.origemPagamento : r.origemPagamento,
      competenciaReferencia: p.competenciaReferencia ?? r.competenciaReferencia,
      competenciaPagamento: p.competenciaPagamento ?? r.competenciaPagamento,
    };
    if (p.competenciaReferencia !== undefined || p.competenciaPagamento !== undefined) resto.competenciaEstimada = undefined;
    return comEvento(r, evento("alteracao_dados", responsavel, justificativa, alt), resto);
  });
}

export function confirmarSuspensao(id: string, responsavel: string, justificativa?: string): RegistroSuspensao {
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

export type EstadoValorSuspensao = "preenchido" | "pendente" | "nao_aplicavel";
export const estadoDoValorSuspensao = (r: Pick<RegistroSuspensao, "valorInformadoNurfi" | "valorNaoAplicavel">): EstadoValorSuspensao => (r.valorInformadoNurfi !== undefined ? "preenchido" : r.valorNaoAplicavel ? "nao_aplicavel" : "pendente");

const FORMATO = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Motivo é exigido para Suspender e Excluir (Permanece suspenso pode ir sem motivo, como nos modelos) — regra PROVISÓRIA a validar. */
export const exigeMotivo = (c?: ClassificacaoSuspensao) => c === "suspender" || c === "excluir";

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
  if (estadoDoValorSuspensao(r) === "pendente") add("valor", "Falta informar o valor", "Informe o valor destinado ao NURFI (ou declare que não se aplica, com justificativa).");
  if (!r.vinculo) add("vinculo", "Defina o vínculo funcional", "Defina o vínculo funcional (Ativo ou Inativo).");
  if (!r.origemPagamento) add("origem", "Defina a origem de pagamento", "Defina a origem de pagamento (Boletos, ASSEFAZ ou ASSETRAN).");
  if (!r.titular.matricula) add("matricula", "Informe a matrícula", "Informe a matrícula.");
  if (!r.observacao.trim()) add("observacao", "Preencha a observação NURFI", "Preencha a observação que será apresentada no relatório.");
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

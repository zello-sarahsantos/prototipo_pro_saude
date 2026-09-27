/**
 * Trilha de auditoria comum (append-only) — Fase 0 do plano de Ressarcimento Retroativo.
 *
 * Base compartilhada por decisões de domínios DIFERENTES, que devem ser tipos discriminados
 * separados nas fases seguintes (nunca um mesmo tipo usado nos dois fluxos):
 *  - `aprovado/negado` → decisão da GERDAB sobre uma competência de requerimento retroativo individual;
 *  - `habilitado/desabilitado` → decisão individual sobre registro Titular+Competência de planilha
 *    de Associação.
 * Este arquivo só fornece o padrão comum (quem, quando, por quê) e um utilitário de anexação que
 * nunca reescreve o histórico.
 */
export interface AuditoriaBase {
  responsavel: string;
  /** ISO 8601. */
  dataHora: string;
  justificativa?: string;
}

export function novaAuditoria(responsavel: string, justificativa?: string): AuditoriaBase {
  return { responsavel, dataHora: new Date().toISOString(), justificativa: justificativa?.trim() || undefined };
}

/** Anexa um evento ao histórico sem alterar o array original (append-only). */
export function anexarEvento<T>(historico: readonly T[], evento: T): T[] {
  return [...historico, evento];
}

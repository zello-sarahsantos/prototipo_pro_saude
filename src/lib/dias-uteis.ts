/**
 * Dias úteis e ciclo de fechamento (Fase 0 do plano de Ressarcimento Retroativo, ata 22/09/2026,
 * seção 3.11).
 *
 * **Regra funcional (decisão fechada):** o ciclo permanece vigente até o **encerramento do 2º dia
 * útil**; a partir do **3º dia útil**, novos registros passam ao ciclo subsequente. O fechamento é
 * automático (sem botão manual, reabertura ou override). A competência **não** é considerada
 * encerrada no início do 2º dia útil.
 *
 * **Limitação técnica do protótipo (NÃO é regra de negócio):** não há calendário oficial de
 * feriados; "dia útil" aqui é apenas segunda a sexta, só para demonstração. Em produção a regra
 * deve considerar o calendário institucional/oficial aplicável.
 *
 * Premissa de mapeamento a confirmar na Fase 9: a competência `C` (mês de referência) fecha ao
 * fim do 2º dia útil do mês **seguinte** a `C` — coerente com a ata (competência de junho é paga
 * no contracheque de julho). Datas são tratadas como `Date` locais (sem fuso), suficiente para a
 * demonstração.
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";

export function isDiaUtil(data: Date): boolean {
  const d = data.getDay();
  return d !== 0 && d !== 6;
}

/** N-ésimo dia útil (1-based) do mês (`mes` 1–12). */
export function getNesimoDiaUtil(ano: number, mes: number, n: number): Date {
  let contador = 0;
  for (let dia = 1; dia <= 31; dia++) {
    const d = new Date(ano, mes - 1, dia);
    if (d.getMonth() !== mes - 1) break;
    if (isDiaUtil(d) && ++contador === n) return d;
  }
  throw new Error(`Mês ${mes}/${ano} não possui ${n} dias úteis.`);
}

function fimDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function mesSeguinte(competencia: string): { ano: number; mes: number } {
  const [a, m] = competencia.split("-").map(Number);
  return m === 12 ? { ano: a + 1, mes: 1 } : { ano: a, mes: m + 1 };
}

/** Momento em que a competência (`"AAAA-MM"`) é encerrada automaticamente: fim do 2º dia útil do mês seguinte. */
export function getFechamentoAutomatico(competencia: string): Date {
  const { ano, mes } = mesSeguinte(competencia);
  return fimDoDia(getNesimoDiaUtil(ano, mes, 2));
}

/** Início do 3º dia útil do mês seguinte — a partir daqui novos registros vão ao ciclo subsequente. */
export function getInicioCicloSubsequente(competencia: string): Date {
  const { ano, mes } = mesSeguinte(competencia);
  const d = getNesimoDiaUtil(ano, mes, 3);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** A competência já foi encerrada automaticamente na data informada? (Vigente durante todo o 2º dia útil.) */
export function competenciaEstaFechada(competencia: string, dataReferencia: Date = getDataReferencia()): boolean {
  return dataReferencia.getTime() > getFechamentoAutomatico(competencia).getTime();
}

export function proximaCompetencia(competencia: string): string {
  const { ano, mes } = mesSeguinte(competencia);
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** Ciclo de destino de um registro de `competencia` recebido em `dataRecebimento`: o próprio ciclo
 *  enquanto vigente; o subsequente a partir do 3º dia útil. */
export function getCicloDeDestino(
  competencia: string,
  dataRecebimento: Date = getDataReferencia(),
): { competenciaDestino: string; direcionadoAoCicloSeguinte: boolean } {
  const seguinte = competenciaEstaFechada(competencia, dataRecebimento);
  return { competenciaDestino: seguinte ? proximaCompetencia(competencia) : competencia, direcionadoAoCicloSeguinte: seguinte };
}

/* ── Data de referência simulável (limitação de demonstração) ─────────────────────────────── */

/** "Hoje" do protótipo: a data simulada (`localStorage`) quando definida, senão a data real. */
export function getDataReferencia(): Date {
  if (typeof window === "undefined") return new Date();
  try {
    const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.dataReferenciaPrototipo);
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* localStorage indisponível: usa a data real */
  }
  return new Date();
}

/** Define (ISO, ex.: `"2026-10-05T10:00:00"`) ou limpa (`null`) a data simulada. */
export function setDataReferencia(iso: string | null): void {
  if (typeof window === "undefined") return;
  if (iso === null) localStorage.removeItem(PROSAUDE_STORAGE_KEYS.dataReferenciaPrototipo);
  else localStorage.setItem(PROSAUDE_STORAGE_KEYS.dataReferenciaPrototipo, iso);
}

/**
 * Dias úteis e ciclo de fechamento (Fase 0 do plano de Ressarcimento Retroativo, ata 22/09/2026,
 * seção 3.11).
 *
 * **Regra funcional (decisão fechada):** o ciclo permanece vigente até o **encerramento do 2º dia
 * útil**; a partir do **3º dia útil**, novos registros passam ao ciclo subsequente. O fechamento é
 * automático (sem botão manual, reabertura ou override). A competência **não** é considerada
 * encerrada no início do 2º dia útil.
 *
 * **Dia útil** = segunda a sexta que não seja feriado nacional nem distrital do DF (calendário
 * abaixo, único para todo o sistema — Dashboard, Fechamento, envio do servidor, prazo do relatório
 * e Ressarcimentos de meses anteriores usam estas funções, nunca um cálculo próprio). Feriados
 * considerados: 01/01, Sexta-feira Santa, 21/04 (Tiradentes e aniversário de Brasília), 01/05,
 * 07/09, 12/10, 02/11, 15/11, 20/11, 30/11 (Dia do Evangélico, DF) e 25/12. Carnaval e Corpus
 * Christi são pontos facultativos e não são descontados.
 *
 * **Limitação do protótipo (NÃO é regra de negócio):** o calendário é uma lista fixa para
 * demonstração; em produção deve ser substituído pelo calendário institucional oficial
 * (decretos de ponto facultativo e feriados móveis locais).
 *
 * Premissa de mapeamento a confirmar na Fase 9: a competência `C` (mês de referência) fecha ao
 * fim do 2º dia útil do mês **seguinte** a `C` — coerente com a ata (competência de junho é paga
 * no contracheque de julho). Datas são tratadas como `Date` locais (sem fuso), suficiente para a
 * demonstração.
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher) — base da Sexta-feira Santa. */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Feriados nacionais e do DF do ano (formato `"AAAA-MM-DD"`). */
const FERIADOS_FIXOS: [number, number][] = [[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [11, 20], [11, 30], [12, 25]];
const cacheFeriados = new Map<number, Set<string>>();

function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getFeriados(ano: number): Set<string> {
  const emCache = cacheFeriados.get(ano);
  if (emCache) return emCache;
  const pascoa = domingoDePascoa(ano);
  const sextaSanta = new Date(ano, pascoa.getMonth(), pascoa.getDate() - 2);
  const set = new Set<string>([
    ...FERIADOS_FIXOS.map(([m, d]) => chaveDia(new Date(ano, m - 1, d))),
    chaveDia(sextaSanta),
  ]);
  cacheFeriados.set(ano, set);
  return set;
}

export function isFeriado(data: Date): boolean {
  return getFeriados(data.getFullYear()).has(chaveDia(data));
}

export function isDiaUtil(data: Date): boolean {
  const d = data.getDay();
  return d !== 0 && d !== 6 && !isFeriado(data);
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

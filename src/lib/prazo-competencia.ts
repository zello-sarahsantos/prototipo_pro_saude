import { getNesimoDiaUtil } from "./dias-uteis";

/** 2º dia útil do mês seguinte a `competencia` (formato "YYYY-MM"). Delegado ao calendário único
 *  do sistema (`dias-uteis.ts`: segunda a sexta, sem feriados nacionais e do DF) — nunca um
 *  cálculo próprio, para o prazo do relatório e o fechamento automático nunca divergirem. */
export function segundoDiaUtilMesSeguinte(competencia: string): Date {
  const [ano, mes] = competencia.split("-").map(Number);
  return mes === 12 ? getNesimoDiaUtil(ano + 1, 1, 2) : getNesimoDiaUtil(ano, mes + 1, 2);
}

/** `true` quando `dataEnvio` (ISO string) está dentro do prazo do relatório mensal — até o fim
 *  do 2º dia útil do mês seguinte à `competencia`. Independente de `isRetroativo`/do fluxo de
 *  aprovação: é só uma informação adicional para o Analista/Gerência, não altera nenhum status
 *  do comprovante nem quando ele é tratado como retroativo. */
export function estaDentroDoPrazoRelatorio(competencia: string, dataEnvio: string): boolean {
  const prazo = segundoDiaUtilMesSeguinte(competencia);
  const prazoFimDoDia = new Date(prazo.getFullYear(), prazo.getMonth(), prazo.getDate(), 23, 59, 59, 999);
  return new Date(dataEnvio).getTime() <= prazoFimDoDia.getTime();
}

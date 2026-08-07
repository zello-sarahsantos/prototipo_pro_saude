/** Calcula o 2º dia útil do mês seguinte a `competencia` (formato "YYYY-MM"), pulando
 *  sábados e domingos — sem calendário de feriados (simplificação assumida, documentada em
 *  docs/MODULO_PAGAMENTO.md). Preparação de modelo/indicador para um futuro módulo de Relatório
 *  Mensal, ainda não construído. */
export function segundoDiaUtilMesSeguinte(competencia: string): Date {
  const [ano, mes] = competencia.split("-").map(Number);
  // `mes` (1-indexado, ex: 7 = julho) usado como índice de mês do `Date` (0-indexado) já
  // aponta para o 1º dia do mês seguinte.
  const data = new Date(ano, mes, 1);
  let diasUteisEncontrados = 0;
  while (diasUteisEncontrados < 2) {
    const diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) diasUteisEncontrados++;
    if (diasUteisEncontrados < 2) data.setDate(data.getDate() + 1);
  }
  return data;
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

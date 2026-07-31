import { competenciasFechadas } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";

/**
 * Competências fechadas para as quais nenhum comprovante foi enviado por ninguém do grupo
 * familiar — ficam pendentes assim que a competência fecha, sem prazo de tolerância adicional.
 * Some da lista automaticamente assim que um envio (mesmo retroativo) é registrado para ela.
 */
export function getCompetenciasPendentes(): string[] {
  const comprovantes = getComprovantesUnificados();
  const competenciasComEnvio = new Set(comprovantes.map((c) => c.competencia));
  return competenciasFechadas.filter((competencia) => !competenciasComEnvio.has(competencia));
}

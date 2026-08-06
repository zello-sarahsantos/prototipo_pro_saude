import { beneficiariosPagamento, competenciasFechadas } from "./mock-data";
import { getComprovantesUnificados, getBeneficiariosDispensadosIds } from "./prosaude-storage";
import { statusDoBeneficiarioNoDocumento, beneficiarioTemCampoVazio } from "./comprovante-status";

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

export type MotivoIncompletude = "sem_comprovante" | "documento_ilegivel";

export interface BeneficiarioFaltante {
  beneficiarioId: string;
  motivo: MotivoIncompletude;
}

/**
 * Diferente de "competência sem envio": aqui já existe pelo menos 1 comprovante na
 * competência, mas nem todos os beneficiários ativos (não dispensados) estão contemplados
 * com um documento legível. Retorna `[]` quando a competência está completa ou quando ela
 * não tem nenhum envio ainda (esse caso é "sem envio", tratado por `getCompetenciasPendentes`).
 */
export function getBeneficiariosFaltantes(competencia: string): BeneficiarioFaltante[] {
  const comprovantes = getComprovantesUnificados().filter((c) => c.competencia === competencia);
  if (comprovantes.length === 0) return [];

  const dispensadosIds = new Set(getBeneficiariosDispensadosIds(competencia));

  return beneficiariosPagamento.flatMap((b): BeneficiarioFaltante[] => {
    // Vinculados a associação têm comprovação coletiva — nunca entram no checklist individual.
    if (b.associacao) return [];
    if (dispensadosIds.has(b.id)) return [];
    const docs = comprovantes.filter((c) => c.beneficiarioIds.includes(b.id));

    if (docs.length === 0) {
      return [{ beneficiarioId: b.id, motivo: "sem_comprovante" }];
    }

    const algumLegivel = docs.some((doc) => {
      const status = statusDoBeneficiarioNoDocumento(doc, b.id);
      return status !== "ilegivel" && !beneficiarioTemCampoVazio(doc, b.id);
    });
    if (!algumLegivel) {
      return [{ beneficiarioId: b.id, motivo: "documento_ilegivel" }];
    }

    return [];
  });
}

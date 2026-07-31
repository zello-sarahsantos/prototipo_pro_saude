import type {
  BeneficiarioPagamento,
  CampoExtraido,
  Comprovante,
  StatusBeneficiarioComprovante,
  StatusComprovante,
} from "./mock-data";

/** Campos (do comprovante inteiro, ou de 1 beneficiário específico em fatura técnica). */
export function getCamposDoBeneficiario(
  comprovante: Comprovante,
  beneficiarioId: string,
): CampoExtraido[] {
  if (comprovante.gruposExtraidos) {
    return comprovante.gruposExtraidos.find((g) => g.beneficiarioId === beneficiarioId)?.campos ?? [];
  }
  return comprovante.camposExtraidos;
}

/** Verifica se o valor extraído diverge do valor cadastrado do beneficiário — alerta auxiliar, não um status. */
export function getDivergencia(
  comprovante: Comprovante,
  beneficiario: BeneficiarioPagamento,
): { divergente: boolean; valorExtraido: number } {
  const campos = getCamposDoBeneficiario(comprovante, beneficiario.id);
  const campoValor = campos.find((c) => c.chave === "valor");
  const valorExtraido = campoValor ? parseFloat(campoValor.valor) : beneficiario.valorCadastrado;
  return {
    divergente: !Number.isNaN(valorExtraido) && valorExtraido !== beneficiario.valorCadastrado,
    valorExtraido,
  };
}

/**
 * Deriva o status geral do comprovante a partir do status individual de cada beneficiário
 * (fatura técnica). A ação sobre 1 beneficiário nunca força os demais a mudar de status —
 * o status geral apenas resume o conjunto para fins de fila/badge.
 */
export function recomputeStatusGeral(porBeneficiario: StatusBeneficiarioComprovante[]): StatusComprovante {
  const statuses = porBeneficiario.map((p) => p.status);

  if (statuses.some((s) => s === "em_analise")) return "em_analise";
  if (statuses.every((s) => s === "aprovado")) return "aprovado";
  if (statuses.some((s) => s === "correcao_solicitada")) return "correcao_solicitada";
  if (statuses.some((s) => s === "recusado")) return "aprovado_com_ressalva";
  if (statuses.some((s) => s === "aprovado_com_ressalva")) return "aprovado_com_ressalva";
  return "aprovado";
}

/** Trata comprovantes de 1 beneficiário como uma "lista de 1" — permite reaproveitar a mesma
 *  lógica de status/ação por beneficiário tanto no painel do Analista quanto no detalhe do Servidor. */
export function getListaStatusBeneficiario(c: Comprovante): StatusBeneficiarioComprovante[] {
  if (c.beneficiarioIds.length > 1) {
    return (
      c.statusPorBeneficiario ??
      c.beneficiarioIds.map((id) => ({ beneficiarioId: id, status: "em_analise" as StatusComprovante }))
    );
  }
  return [{ beneficiarioId: c.beneficiarioIds[0], status: c.status }];
}

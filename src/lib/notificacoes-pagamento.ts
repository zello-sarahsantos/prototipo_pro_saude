import { beneficiariosPagamento, competenciaAtual, type StatusComprovante } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";

export interface NotificacaoPagamento {
  id: string;
  mensagem: string;
}

/** Status do comprovante que geram uma notificação relevante para o servidor. */
const statusNotificaveis: Partial<Record<StatusComprovante, (nome: string) => string>> = {
  ilegivel: (nome) => `Documento de ${nome} está ilegível — reenvie o comprovante.`,
  correcao_solicitada: (nome) => `O Analista solicitou correção no comprovante de ${nome}.`,
  aprovado: (nome) => `Comprovante de ${nome} foi aprovado.`,
  aprovado_com_ressalva: (nome) => `Comprovante de ${nome} foi aprovado com ressalva.`,
  recusado: (nome) => `Comprovante de ${nome} foi recusado.`,
  retroativo_aguardando_gerencia: (nome) => `Retroativo de ${nome} está aguardando aprovação da Gerência.`,
  retroativo_aprovado: (nome) => `Retroativo de ${nome} foi aprovado pela Gerência.`,
};

/**
 * Deriva notificações do servidor a partir do status mais recente de cada beneficiário
 * na competência atual — sem backend, calculado a partir dos dados mock/localStorage já
 * usados em `/servidor/pagamentos`.
 */
export function getNotificacoesPagamento(): NotificacaoPagamento[] {
  const comprovantes = getComprovantesUnificados();
  const daCompetenciaAtual = comprovantes.filter((c) => c.competencia === competenciaAtual);

  return beneficiariosPagamento.flatMap((b) => {
    const doBeneficiario = daCompetenciaAtual.filter((c) => c.beneficiarioIds.includes(b.id));
    const maisRecente = doBeneficiario[doBeneficiario.length - 1];
    if (!maisRecente) return [];

    const gerarMensagem = statusNotificaveis[maisRecente.status];
    if (!gerarMensagem) return [];

    return [{ id: `${b.id}-${maisRecente.id}`, mensagem: gerarMensagem(b.nome) }];
  });
}

import { beneficiariosPagamento, competenciaAtual, formatCompetencia, type StatusComprovante } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";
import { getCompetenciasPendentes } from "./competencias-pendentes";

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
  retroativo_devolvido: (nome) => `A Gerência devolveu o retroativo de ${nome} ao Analista para ajuste.`,
  retroativo_aprovado: (nome) => `Retroativo de ${nome} foi aprovado pela Gerência.`,
  retroativo_recusado: (nome) => `Retroativo de ${nome} foi recusado pela Gerência.`,
};

/**
 * Deriva notificações do servidor a partir do status mais recente de cada beneficiário
 * na competência atual (ou de qualquer retroativo em andamento) — sem backend, calculado
 * a partir dos dados mock/localStorage já usados em `/servidor/pagamentos`.
 */
export function getNotificacoesPagamento(): NotificacaoPagamento[] {
  const comprovantes = getComprovantesUnificados();
  const relevantes = comprovantes.filter((c) => c.competencia === competenciaAtual || c.isRetroativo);

  const notificacoesStatus = beneficiariosPagamento.flatMap((b) => {
    const doBeneficiario = relevantes.filter((c) => c.beneficiarioIds.includes(b.id));
    const maisRecente = doBeneficiario[doBeneficiario.length - 1];
    if (!maisRecente) return [];

    const gerarMensagem = statusNotificaveis[maisRecente.status];
    if (!gerarMensagem) return [];

    return [{ id: `${b.id}-${maisRecente.id}`, mensagem: gerarMensagem(b.nome) }];
  });

  // 1 notificação por competência pendente — nomeia claramente o mês sem envio.
  const notificacoesPendentes = getCompetenciasPendentes().map((c) => ({
    id: `pendente-${c}`,
    mensagem: `Você não enviou comprovante da competência de ${formatCompetencia(c)} — prazo encerrado.`,
  }));

  // Pedidos ativos de documento complementar — fora do mapa por status, pois não mudam o `status`.
  const notificacoesComplementar = comprovantes
    .filter((c) => c.solicitacaoComplementar)
    .flatMap((c) =>
      c.beneficiarioIds.map((id) => {
        const nome = beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
        return {
          id: `complementar-${c.id}-${id}`,
          mensagem: `GERDAB solicitou documento complementar para ${nome}.`,
        };
      }),
    );

  return [...notificacoesPendentes, ...notificacoesComplementar, ...notificacoesStatus];
}

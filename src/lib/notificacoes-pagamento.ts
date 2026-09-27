import { beneficiariosPagamento, competenciaAtual, formatCompetencia, type StatusComprovante } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";
import { getCompetenciasPendentes } from "./competencias-pendentes";
import { getNotificacoesRetroativo } from "./retroativo-fluxo";
import { getSolicitacoesRetroativas } from "./ressarcimento-retroativo";

export interface NotificacaoPagamento {
  id: string;
  mensagem: string;
  /** Opcional — quando presente, a notificação vira clicável em `NotificationBell` e leva direto
   *  ao ponto onde a pendência pode ser tratada (ex: um requerimento específico). Reaproveitado
   *  por `NotificacaoAssociacao` (`notificacoes-associacao.ts`) — nunca uma segunda central. */
  href?: string;
}

/** Status do comprovante que geram uma notificação relevante para o servidor. */
const statusNotificaveis: Partial<Record<StatusComprovante, (nome: string) => string>> = {
  ilegivel: (nome) => `Documento de ${nome} está ilegível — reenvie o comprovante.`,
  correcao_solicitada: (nome) => `O Analista solicitou correção no comprovante de ${nome}.`,
  aprovado: (nome) => `Comprovante de ${nome} foi aprovado.`,
  aprovado_com_ressalva: (nome) => `Comprovante de ${nome} foi aprovado com ressalva.`,
  recusado: (nome) => `Comprovante de ${nome} foi recusado.`,
  retroativo_aguardando_aprovacao: (nome) => `Retroativo de ${nome} está aguardando aprovação.`,
  retroativo_aprovado: (nome) => `Retroativo de ${nome} foi aprovado.`,
  retroativo_recusado: (nome) => `Retroativo de ${nome} foi recusado.`,
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

  // Ressarcimento retroativo: pedido de complementação da GERDAB (proposta a validar, `retroativo-fluxo.ts`).
  // Enquanto não lida (o servidor abre o bloco de retroativo), aparece no sino com link para Pagamentos.
  const cpfTitular = beneficiariosPagamento.find((b) => b.parentesco === "Titular")?.cpf;
  const solicitacoesDoTitular = new Set(getSolicitacoesRetroativas().filter((s) => s.origem === "individual" && s.cpfTitular === cpfTitular).map((s) => s.id));
  const notificacoesRetroativo = getNotificacoesRetroativo("servidor", true)
    .filter((n) => solicitacoesDoTitular.has(n.solicitacaoId))
    .map((n) => ({ id: n.id, mensagem: n.mensagem, href: "/servidor/pagamentos" }));

  return [...notificacoesRetroativo, ...notificacoesPendentes, ...notificacoesComplementar, ...notificacoesStatus];
}

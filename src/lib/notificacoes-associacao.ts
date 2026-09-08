import { servidoresList, requerimentos, statusLabels } from "./mock-data";
import type { NotificacaoPagamento } from "./notificacoes-pagamento";
import {
  listarRequerimentosAssociacao,
  statusAtualRequerimento,
  tipoRequerimentoAssociacaoLabels,
  versaoVigenteRequerimento,
} from "./requerimentos-associacao";

/** Mesma forma de `NotificacaoPagamento` (id + mensagem, `href` opcional) — não uma entidade
 *  paralela; `NotificationBell` já aceita as duas indistintamente (ver seu comentário de topo). */
export type NotificacaoAssociacao = NotificacaoPagamento;

/**
 * Deriva notificações para o sino da Área da Associação a partir do status dos requerimentos
 * e do cadastro dos beneficiários vinculados a ela — mesmo espírito de
 * `notificacoes-pagamento.ts` (sem backend, recalculado a partir dos dados já usados na tela
 * de Gerenciamento), mas usando as fontes do módulo de Cadastro (`servidoresList`,
 * `requerimentos`), não as do Módulo de Pagamento (`beneficiariosPagamento`/`Comprovante`),
 * que modelam um cenário totalmente diferente.
 */
export function getNotificacoesAssociacao(associacao: string): NotificacaoAssociacao[] {
  const vinculados = servidoresList.filter((s) => s.associacao === associacao);
  const matriculas = new Set(vinculados.map((s) => s.matricula));

  const deRequerimentos = requerimentos
    .filter((r) => matriculas.has(r.matricula))
    .map((r) => ({
      id: `req-${r.id}`,
      mensagem: `${r.tipo} de ${r.servidor} está ${statusLabels[r.status].toLowerCase()}.`,
    }));

  const deCadastro = vinculados
    .filter((s) => s.status === "pendente" || s.status === "alerta")
    .map((s) => ({
      id: `cad-${s.matricula}`,
      mensagem: `${s.nome} está com o cadastro em "${statusLabels[s.status]}".`,
    }));

  // Requerimentos reais originados por esta associação (Nova Inclusão nesta rodada) — só notifica
  // quando existe ação pendente DA ASSOCIAÇÃO (GERDAB solicitou documentação complementar);
  // "Pendente de Validação" não notifica, porque nesse estado a vez é da GERDAB, não da
  // associação — notificar isso seria ruído, não uma ação necessária dela. O link leva direto ao
  // requerimento (mesmo mecanismo de deep-link já usado em `servidor.pagamentos.enviar.tsx`).
  const deRequerimentosAssociacao = listarRequerimentosAssociacao(associacao)
    .filter((r) => statusAtualRequerimento(r) === "aguardando_complementacao")
    .map((r) => {
      const justificativa = versaoVigenteRequerimento(r).decisao?.justificativa;
      return {
        id: `req-assoc-${r.id}`,
        mensagem: `GERDAB solicitou documentação complementar para "${tipoRequerimentoAssociacaoLabels[r.tipo]} — ${r.beneficiarioNome}"${justificativa ? `: ${justificativa}` : "."}`,
        href: `/associacao/gerenciamento?requerimento=${r.id}`,
      };
    });

  return [...deRequerimentosAssociacao, ...deRequerimentos, ...deCadastro];
}

import { servidoresList, requerimentos, statusLabels } from "./mock-data";

export interface NotificacaoAssociacao {
  id: string;
  mensagem: string;
}

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

  return [...deRequerimentos, ...deCadastro];
}

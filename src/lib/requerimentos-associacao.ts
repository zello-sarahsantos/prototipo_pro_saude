/**
 * Requerimentos originados pela Área da Associação (ex: ASSETRAN) — validação/análise pela
 * GERDAB, reaproveitando visualmente a "Fila de Aprovação" já existente (`admin.requerimentos.tsx`).
 *
 * Fecha a lacuna identificada na análise desta rodada: `associacao.nova-inclusao.tsx` concluía a
 * Nova Inclusão sem gerar nenhum registro real — a tela de sucesso era só cosmética, o
 * requerimento nunca chegava à GERDAB, e a "Fila de Aprovação" existente lia um array estático
 * (`mock-data.ts`) cujos botões (Aprovar/Rejeitar/Solicitar Documento) nunca persistiam nada.
 *
 * Mesmo padrão arquitetural já usado em `planilhas-associacao.ts` (que resolveu o mesmo tipo de
 * lacuna para o Upload de Planilha): persistência real via `prosaude-storage.ts`, status sempre
 * derivado da versão vigente (nunca um campo à parte), versionamento append-only (nunca
 * sobrescreve uma decisão ou complementação anterior).
 *
 * **Modelo genérico, não exclusivo de Nova Inclusão** (decisão explícita desta rodada): o tipo
 * `TipoRequerimentoAssociacao` já lista Mudança de Plano/Inclusão de Dependente/Exclusão — a HU02
 * prevê esses tipos também passando pela ASSETRAN. Nesta rodada só "inclusao_no_plano" é gerado
 * por algum fluxo (`associacao.nova-inclusao.tsx`); os demais tipos poderão reaproveitar
 * integralmente estas mesmas funções (criar/decidir/complementar/listar) quando forem
 * implementados, sem precisar de um segundo mecanismo de requerimentos.
 *
 * **Regra de acesso a formalizar em produção (mesma ressalva já registrada em
 * `planilhas-associacao.ts`, não implementada nesta rodada):** a associação deve ser determinada
 * pelo usuário autenticado — todas as funções abaixo já recebem `associacao` como parâmetro
 * explícito (nunca leem de um estado de sessão), facilitando essa migração futura.
 */
import {
  loadRequerimentosAssociacao,
  saveRequerimentosAssociacao,
  type RequerimentoAssociacao,
  type VersaoRequerimentoAssociacao,
  type DecisaoRequerimentoAssociacao,
  type DocumentoRequerimentoAssociacao,
  type StatusRequerimentoAssociacao,
  type TipoRequerimentoAssociacao,
} from "./prosaude-storage";

export type {
  RequerimentoAssociacao,
  VersaoRequerimentoAssociacao,
  DecisaoRequerimentoAssociacao,
  DocumentoRequerimentoAssociacao,
  StatusRequerimentoAssociacao,
  TipoRequerimentoAssociacao,
};

export const statusRequerimentoAssociacaoLabels: Record<StatusRequerimentoAssociacao, string> = {
  pendente_validacao: "Pendente de Validação",
  aguardando_complementacao: "Aguardando Complementação",
  aprovado: "Aprovado",
  negado: "Negado",
};

export const tipoRequerimentoAssociacaoLabels: Record<TipoRequerimentoAssociacao, string> = {
  inclusao_no_plano: "Nova Inclusão",
  mudanca_plano: "Mudança de Plano",
  inclusao_dependente: "Inclusão de Dependente",
  exclusao: "Exclusão de Dependente/Plano",
};

/** Mapeamento só para reaproveitar a cor já definida em `statusComprovanteCore` — nunca para
 *  reaproveitar o rótulo daquele domínio, que tem vocabulário próprio. Mesmo princípio já usado
 *  em `corPorStatusPlanilha` (`planilhas-associacao.ts`): "não force um status só porque ele já
 *  existe no código" — aqui é só a cor (token visual) que é reaproveitada, o vocabulário de
 *  status em si (`StatusRequerimentoAssociacao`) é próprio deste domínio. */
export const corPorStatusRequerimentoAssociacao: Record<
  StatusRequerimentoAssociacao,
  "em_analise" | "aprovado" | "correcao_solicitada" | "recusado"
> = {
  pendente_validacao: "em_analise",
  aguardando_complementacao: "correcao_solicitada",
  aprovado: "aprovado",
  negado: "recusado",
};

function idRequerimentoAssociacao(): string {
  return `req-assoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Cria um novo requerimento — sempre versão 1, sempre "Pendente de Validação" (nenhuma decisão
 *  ainda). Nunca aprovado/concluído automaticamente pelo envio. `id` é opcional — só usado por
 *  `garantirRequerimentoAssociacaoExemplo` (abaixo), que precisa de um identificador estável
 *  para checar idempotência; todo chamador real (`primeiro-acesso.tsx`) deixa gerar sozinho. */
export function criarRequerimentoAssociacao(args: {
  associacao: string;
  tipo: TipoRequerimentoAssociacao;
  beneficiarioNome: string;
  beneficiarioId?: string;
  resumo: string;
  documentos: DocumentoRequerimentoAssociacao[];
  id?: string;
}): RequerimentoAssociacao {
  const todos = loadRequerimentosAssociacao();
  const novo: RequerimentoAssociacao = {
    id: args.id ?? idRequerimentoAssociacao(),
    associacao: args.associacao,
    tipo: args.tipo,
    beneficiarioNome: args.beneficiarioNome,
    beneficiarioId: args.beneficiarioId,
    criadoEm: new Date().toISOString(),
    versoes: [
      {
        versao: 1,
        enviadoEm: new Date().toISOString(),
        resumo: args.resumo,
        documentos: args.documentos,
      },
    ],
  };
  saveRequerimentosAssociacao([...todos, novo]);
  return novo;
}

export function listarRequerimentosAssociacao(associacao?: string): RequerimentoAssociacao[] {
  const todos = loadRequerimentosAssociacao();
  return (associacao ? todos.filter((r) => r.associacao === associacao) : todos).sort((a, b) =>
    b.criadoEm.localeCompare(a.criadoEm),
  );
}

export function getRequerimentoAssociacao(id: string): RequerimentoAssociacao | undefined {
  return loadRequerimentosAssociacao().find((r) => r.id === id);
}

/** Versão vigente (a mais recente) de um requerimento — nunca undefined se `versoes` não está
 *  vazio. */
export function versaoVigenteRequerimento(r: RequerimentoAssociacao): VersaoRequerimentoAssociacao {
  return r.versoes[r.versoes.length - 1];
}

/** Status atual — sempre derivado da versão vigente, nunca um campo próprio guardado à parte
 *  (mesmo padrão "recompute on demand" de `statusAtualPlanilha`). */
export function statusAtualRequerimento(r: RequerimentoAssociacao): StatusRequerimentoAssociacao {
  return versaoVigenteRequerimento(r).decisao?.status ?? "pendente_validacao";
}

/**
 * Decide a versão vigente de um requerimento — Aprovar, Solicitar Documento Complementar ou
 * Negar. Nunca reabre/edita uma versão já decidida (mesma regra de `decidirPlanilhaAssociacao`).
 *
 * Justificativa obrigatória para "aguardando_complementacao" (o que precisa ser enviado) e
 * "negado" (o motivo) — nunca persiste essas duas decisões sem justificativa, mesmo princípio
 * (P2) já aplicado a Planilhas.
 */
export function decidirRequerimentoAssociacao(
  id: string,
  decisao: {
    status: Exclude<StatusRequerimentoAssociacao, "pendente_validacao">;
    justificativa?: string;
    decididoPor: string;
  },
): void {
  if (
    (decisao.status === "aguardando_complementacao" || decisao.status === "negado") &&
    !decisao.justificativa?.trim()
  ) {
    throw new Error("Justificativa obrigatória para Solicitar Documento Complementar ou Negar.");
  }
  const todos = loadRequerimentosAssociacao();
  const r = todos.find((x) => x.id === id);
  if (!r) return;

  const versoes = [...r.versoes];
  const ultima = versoes[versoes.length - 1];
  versoes[versoes.length - 1] = {
    ...ultima,
    decisao: {
      status: decisao.status,
      decididoEm: new Date().toISOString(),
      decididoPor: decisao.decididoPor,
      justificativa: decisao.justificativa?.trim() || undefined,
    },
  };
  saveRequerimentosAssociacao(todos.map((x) => (x.id === id ? { ...r, versoes } : x)));
}

/**
 * Complementação enviada pela Associação em resposta a uma solicitação da GERDAB — sempre uma
 * NOVA versão (nunca sobrescreve a versão anterior nem sua decisão/justificativa). Como a nova
 * versão nasce sem decisão, `statusAtualRequerimento` já recalcula sozinho para "Pendente de
 * Validação" — nenhum campo de status é setado manualmente aqui (mesmo mecanismo "recompute on
 * demand" usado no resto do protótipo). O requerimento nunca é duplicado: é sempre o mesmo `id`.
 */
export function complementarRequerimentoAssociacao(
  id: string,
  args: { resumo: string; documentos: DocumentoRequerimentoAssociacao[] },
): void {
  const todos = loadRequerimentosAssociacao();
  const r = todos.find((x) => x.id === id);
  if (!r) return;

  const novaVersao: VersaoRequerimentoAssociacao = {
    versao: r.versoes.length + 1,
    enviadoEm: new Date().toISOString(),
    resumo: args.resumo,
    documentos: args.documentos,
  };
  saveRequerimentosAssociacao(todos.map((x) => (x.id === id ? { ...r, versoes: [...r.versoes, novaVersao] } : x)));
}

const ID_REQUERIMENTO_EXEMPLO = "req-assoc-exemplo-assetran";

/**
 * Semeia, uma única vez (idempotente), um requerimento de exemplo permanente — mesmo espírito
 * de `garantirPlanilhaExemplo` (`planilhas-associacao.ts`) e `garantirExemploDocumentoEmAnalise`
 * (`pendencias-documentais.ts`): existe só para a "Fila de Aprovação"/"Requerimentos Enviados"
 * nunca aparecerem vazias, permitindo demonstrar Aprovar/Solicitar Documento/Negar (e tirar
 * prints para a documentação da HU02) sem precisar refazer a Nova Inclusão primeiro. Nenhuma
 * regra nova: usa a mesma `criarRequerimentoAssociacao` e nasce, como qualquer requerimento
 * real, "Pendente de Validação" — a GERDAB decide a partir daqui como decidiria qualquer outro.
 *
 * Cenário coerente com o resto do protótipo — titular + 1 dependente (Cônjuge), com a mesma
 * documentação que a etapa "Docs" da Nova Inclusão pela Associação exige hoje (Requerimento
 * assinado + documentos do titular + documentos do dependente pelo tipo), então as três
 * categorias (Associação/Titular/Dependente) aparecem no modal de análise.
 */
export function garantirRequerimentoAssociacaoExemplo(): void {
  if (typeof window === "undefined") return;
  if (getRequerimentoAssociacao(ID_REQUERIMENTO_EXEMPLO)) return;
  criarRequerimentoAssociacao({
    id: ID_REQUERIMENTO_EXEMPLO,
    associacao: "Assetran",
    tipo: "inclusao_no_plano",
    beneficiarioNome: "Camila Andrade",
    resumo: "Nova Inclusão — Camila Andrade + 1 dependente(s)",
    documentos: [
      { nome: "Requerimento de Inclusão Assinado (Titular)", categoria: "associacao" },
      { nome: "Documento da entidade contratada / contrato do plano", categoria: "titular" },
      { nome: "Documento de identificação do titular", categoria: "titular" },
      { nome: "Último contracheque", categoria: "titular" },
      { nome: "Certidão de casamento", categoria: "dependente", dependenteNome: "Vinícius Andrade" },
      { nome: "Documento de identificação pessoal com foto", categoria: "dependente", dependenteNome: "Vinícius Andrade" },
    ],
  });
}

/**
 * FONTES do Relatório de Alterações — contrato único de leitura + implementação REAL e implementação DEMONSTRATIVA (fictícia, isolada).
 *
 * `relatorio-alteracoes-sugestoes.ts` identifica as movimentações lendo SOMENTE esta interface. A implementação real delega, sem alterar,
 * aos módulos existentes (Comprovantes, Requerimentos de associação, Planilhas, Ressarcimento de meses anteriores, Fechamento e base
 * institucional). A demonstrativa devolve dados fictícios fixos, em memória: nada é lido de nem gravado em nenhum módulo, de modo que o
 * ambiente demonstrativo nunca se mistura com dados operacionais. O MESMO código de identificação roda sobre as duas.
 */
import type { BeneficiarioPagamento, StatusComprovante } from "./mock-data";
import { calcularReembolso, servidoresList } from "./mock-data";
import { getBeneficiariosPagamentoAtual, getComprovantesUnificados, loadHistoricoFechamentos } from "./prosaude-storage";
import type { StatusRequerimentoAssociacao, TipoRequerimentoAssociacao } from "./prosaude-storage";
import { statusDoBeneficiarioNoDocumento } from "./comprovante-status";
import { getRegistrosAssociacaoAprovadosNaCompetencia, listarPlanilhasAssociacao, statusAtualPlanilha, type RegistroAssociacaoConsolidado } from "./planilhas-associacao";
import { getClassificacaoAtivoInativoPorCpf, getMatriculaPorCpf, normalizarCpf } from "./base-institucional";
import { getRegistrosFechamento } from "./fechamento-pagamento";
import { listarRequerimentosAssociacao, statusAtualRequerimento, versaoVigenteRequerimento } from "./requerimentos-associacao";
import { getEstadoCompetencia, getSolicitacoesRetroativas } from "./ressarcimento-retroativo";
import type { Movimento, OrigemPagamento, VinculoFuncional } from "./relatorio-alteracoes";

/* ── Visões mínimas (lite) do que as regras de identificação realmente leem ──────────────────────────────────────── */

export interface AcaoComprovanteLite {
  acao: string;
  beneficiarioId?: string;
  valorAnterior?: number;
  valorNovo?: number;
  data: string;
  aprovadoPor?: string;
  comentario?: string;
  /** Motivo da alteração de valor (ex.: "reajuste_plano", "mudou_de_plano"), quando a fonte o registra. O fluxo real de comprovantes ainda NÃO o registra. */
  motivoAlteracao?: string;
}
export interface ComprovanteLite {
  id: string;
  competencia: string;
  status: StatusComprovante;
  beneficiarioIds: string[];
  aprovacoes: AcaoComprovanteLite[];
  justificativasDivergencia: { beneficiarioId: string; texto: string }[];
  operadoraDivergenteCadastro?: boolean;
  statusDoBeneficiario(beneficiarioId: string): StatusComprovante;
}
export interface RequerimentoLite {
  id: string;
  associacao: string;
  tipo: TipoRequerimentoAssociacao;
  beneficiarioNome: string;
  beneficiarioId?: string;
  status: StatusRequerimentoAssociacao;
  versao: number;
  decididoEm?: string;
  decididoPor?: string;
  /** Motivo registrado no requerimento (ex.: "nova_proposta"). Os requerimentos reais ainda NÃO o registram. */
  motivo?: string;
  /** Em exclusões: se o requerimento é de um dependente ou do titular, quando registrado. */
  alvo?: "dependente" | "titular";
}
export interface PlanilhaLite {
  associacao: string;
  competencia: string;
  /** Análise financeira confirmada pela GERDAB. */
  aprovada: boolean;
}
export interface SolicitacaoRetroativaLite {
  id: string;
  origem: "individual" | "associacao";
  motivo?: string;
  cpfTitular: string;
  nomeTitular: string;
  competencias: { competenciaReferencia: string; aprovada: boolean; ultima?: { responsavel?: string; dataHora?: string } }[];
}
export interface LinhaFechamentoLite {
  beneficiarioId: string;
  matricula?: string;
  nome: string;
  competencia: string;
  classificacao: "adimplente" | "inadimplente";
  origem: "individual" | "associacao";
  operadoraOuAssociacao: string;
}

/** Resultado FINAL de ressarcimento do grupo familiar já apurado pelo Fechamento (`valorRessarcir`), por titular e competência. */
export interface RessarcimentoLite {
  matricula?: string;
  cpf?: string;
  competencia: string;
  classificacao: "adimplente" | "inadimplente" | "requer_analise";
  valorGrupo: number;
  valorRessarcir: number;
  /** Valor vindo do ressarcimento retroativo (diferença): nunca usado como Valor NURFI. */
  retroativo?: boolean;
  origem: "individual" | "associacao";
}
/** Valor de ressarcimento gravado no HISTÓRICO (snapshots imutáveis) de Fechamento. */
export interface RessarcimentoHistoricoLite {
  matricula?: string;
  cpf?: string;
  competencia: string;
  valorRessarcir: number;
}
/** Movimentação com natureza e motivo REGISTRADOS na origem (ficha de movimentação do grupo familiar). Fonte ainda inexistente no sistema real. */
export interface MovimentoInformadoLite {
  id: string;
  titular: { nome: string; matricula?: string; cpf?: string };
  competencia: string;
  origemPagamento: OrigemPagamento;
  movimentos: Movimento[];
  descricao: string;
  responsavel: string;
  data: string;
}

export interface FontesAlteracao {
  /** `true` nas fontes fictícias do ambiente demonstrativo. */
  demonstracao: boolean;
  beneficiarios(): BeneficiarioPagamento[];
  comprovantes(): ComprovanteLite[];
  requerimentos(): RequerimentoLite[];
  planilhas(): PlanilhaLite[];
  registrosPlanilhaAprovados(competencia: string): RegistroAssociacaoConsolidado[];
  solicitacoesRetroativas(): SolicitacaoRetroativaLite[];
  /** Linhas dos relatórios de Fechamento já gerados (histórico). */
  linhasFechamento(): LinhaFechamentoLite[];
  /** Ressarcimento final do grupo familiar (Fechamento) para o titular na competência. Somente leitura; nunca recalculado aqui. */
  ressarcimentoAtual(titular: { matricula?: string; cpf?: string }, competencia: string): RessarcimentoLite | undefined;
  ressarcimentoHistorico(titular: { matricula?: string; cpf?: string }, competencia: string): RessarcimentoHistoricoLite | undefined;
  movimentosInformados(): MovimentoInformadoLite[];
  servidorPorMatricula(matricula: string): { cpf: string; matricula: string } | undefined;
  vinculoPorCpf(cpf: string): { grupo?: VinculoFuncional; requerConferencia?: boolean; motivo?: string };
  matriculaPorCpf(cpf: string): string | undefined;
}

/* ── Fontes REAIS (somente leitura dos módulos existentes) ───────────────────────────────────────────────────────── */

export function fontesReais(): FontesAlteracao {
  const cacheFechamento = new Map<string, ReturnType<typeof getRegistrosFechamento>>();
  return {
    demonstracao: false,
    beneficiarios: getBeneficiariosPagamentoAtual,
    comprovantes: () =>
      getComprovantesUnificados().map((c) => ({
        id: c.id,
        competencia: c.competencia,
        status: c.status,
        beneficiarioIds: c.beneficiarioIds,
        aprovacoes: (c.aprovacoes ?? []) as AcaoComprovanteLite[],
        justificativasDivergencia: c.justificativasDivergencia ?? [],
        operadoraDivergenteCadastro: c.operadoraDivergenteCadastro,
        statusDoBeneficiario: (id: string) => statusDoBeneficiarioNoDocumento(c, id),
      })),
    requerimentos: () =>
      listarRequerimentosAssociacao().map((r) => {
        const v = versaoVigenteRequerimento(r);
        return { id: r.id, associacao: r.associacao, tipo: r.tipo, beneficiarioNome: r.beneficiarioNome, beneficiarioId: r.beneficiarioId, status: statusAtualRequerimento(r), versao: v.versao, decididoEm: v.decisao?.decididoEm, decididoPor: v.decisao?.decididoPor };
      }),
    planilhas: () => listarPlanilhasAssociacao().map((p) => ({ associacao: p.associacao, competencia: p.competencia, aprovada: statusAtualPlanilha(p) === "aprovada" })),
    registrosPlanilhaAprovados: getRegistrosAssociacaoAprovadosNaCompetencia,
    solicitacoesRetroativas: () =>
      getSolicitacoesRetroativas().map((s) => ({
        id: s.id,
        origem: s.origem,
        motivo: s.motivo,
        cpfTitular: s.cpfTitular,
        nomeTitular: s.nomeTitular,
        competencias: s.competencias.map((c) => ({ competenciaReferencia: c.competenciaReferencia, aprovada: getEstadoCompetencia(s.origem, c) === "aprovado", ultima: c.decisoes[c.decisoes.length - 1] })),
      })),
    linhasFechamento: () => loadHistoricoFechamentos().flatMap((sn) => sn.linhas.map((l) => ({ beneficiarioId: l.beneficiarioId, matricula: l.matricula, nome: l.nome, competencia: l.competencia, classificacao: l.classificacao, origem: l.origem, operadoraOuAssociacao: l.operadoraOuAssociacao }))),
    ressarcimentoAtual: (t, competencia) => {
      let regs = cacheFechamento.get(competencia);
      if (!regs) {
        regs = getRegistrosFechamento(competencia);
        cacheFechamento.set(competencia, regs);
      }
      const r = regs.find((x) => mesmoTitular(t, x));
      return r ? { matricula: r.matricula, cpf: r.cpf, competencia, classificacao: r.classificacao, valorGrupo: r.valor, valorRessarcir: r.valorRessarcir, retroativo: r.statusComprovante?.startsWith("retroativo") || undefined, origem: r.origem === "associacao" ? "associacao" : "individual" } : undefined;
    },
    ressarcimentoHistorico: (t, competencia) => {
      const snaps = loadHistoricoFechamentos();
      for (const sn of [...snaps].reverse()) {
        const l = sn.linhas.find((x) => x.competencia === competencia && mesmoTitular(t, x));
        if (l) return { matricula: l.matricula, competencia, valorRessarcir: l.valorRessarcir };
      }
      return undefined;
    },
    movimentosInformados: () => [], // Ainda não existe fonte real que registre natureza e motivo da movimentação do grupo familiar.
    servidorPorMatricula: (m) => {
      const s = servidoresList.find((x) => x.matricula === m);
      return s ? { cpf: s.cpf, matricula: s.matricula } : undefined;
    },
    vinculoPorCpf: getClassificacaoAtivoInativoPorCpf,
    matriculaPorCpf: getMatriculaPorCpf,
  };
}

const mesmoTitular = (t: { matricula?: string; cpf?: string }, x: { matricula?: string; cpf?: string }) =>
  (!!t.matricula && x.matricula === t.matricula) || (!!t.cpf && !!x.cpf && normalizarCpf(t.cpf) === normalizarCpf(x.cpf));

/* ── Fontes DEMONSTRATIVAS (fictícias, fixas, em memória) ────────────────────────────────────────────────────── */

/** Competência em que os cenários estão reunidos. */
export const COMPETENCIA_DEMONSTRATIVA_ALTERACOES = "2026-09";
/** Pagamento pré-selecionado ao restaurar a demonstração (só nela; no ambiente operacional o pagamento nunca é presumido). */
export const PAGAMENTO_DEMONSTRATIVO_ALTERACOES = "2026-10";
const ANTERIOR = "2026-08";

interface PessoaDemo {
  nome: string;
  matricula: string;
  cpf: string;
  associacao: "—" | "Assefaz" | "Assetran";
  vinculo: VinculoFuncional;
  dependentes: { nome: string; parentesco: string }[];
}
const P = {
  aurora: { nome: "Aurora Valadares Teste", matricula: "F2001", cpf: "900.200.001-01", associacao: "—", vinculo: "ativo", dependentes: [{ nome: "Beatriz Valadares Demo", parentesco: "Filho(a)" }] },
  bento: { nome: "Bento Operadora Exemplo", matricula: "F2002", cpf: "900.200.002-02", associacao: "—", vinculo: "ativo", dependentes: [] },
  cecilia: { nome: "Cecília Inclusão Exemplo", matricula: "F2003", cpf: "900.200.003-03", associacao: "Assefaz", vinculo: "ativo", dependentes: [] },
  davi: { nome: "Davi Dependente Exemplo", matricula: "F2004", cpf: "900.200.004-04", associacao: "Assetran", vinculo: "ativo", dependentes: [{ nome: "Eduarda Dependente Demo", parentesco: "Filho(a)" }] },
  elisa: { nome: "Elisa Mudança Exemplo", matricula: "F2005", cpf: "900.200.005-05", associacao: "Assefaz", vinculo: "inativo", dependentes: [] },
  fabio: { nome: "Fábio Dependente Exemplo", matricula: "F2006", cpf: "900.200.006-06", associacao: "—", vinculo: "ativo", dependentes: [{ nome: "Gael Fábio Demo", parentesco: "Filho(a)" }] },
  giovana: { nome: "Giovana Reinclusão Exemplo", matricula: "F2007", cpf: "900.200.007-07", associacao: "—", vinculo: "ativo", dependentes: [{ nome: "Heloísa Giovana Demo", parentesco: "Cônjuge" }] },
  henrique: { nome: "Henrique Reajuste Exemplo", matricula: "F2008", cpf: "900.200.008-08", associacao: "Assetran", vinculo: "inativo", dependentes: [] },
  isadora: { nome: "Isadora Planilha Exemplo", matricula: "F2009", cpf: "900.200.009-09", associacao: "Assefaz", vinculo: "ativo", dependentes: [{ nome: "Lia Isadora Demo", parentesco: "Filho(a)" }] },
  joana: { nome: "Joana Regularizada Exemplo", matricula: "F2010", cpf: "900.200.010-10", associacao: "—", vinculo: "ativo", dependentes: [] },
  kleber: { nome: "Kléber Exclusão Exemplo", matricula: "F2011", cpf: "900.200.011-11", associacao: "Assefaz", vinculo: "ativo", dependentes: [{ nome: "Mateus Kléber Demo", parentesco: "Filho(a)" }] },
  lucia: { nome: "Lúcia Reinclusão e Reajuste Exemplo", matricula: "F2012", cpf: "900.200.012-12", associacao: "—", vinculo: "ativo", dependentes: [] },
  marta: { nome: "Marta Comprovante Exemplo", matricula: "F2013", cpf: "900.200.013-13", associacao: "—", vinculo: "ativo", dependentes: [] },
  nelson: { nome: "Nelson Motivo Insuficiente Exemplo", matricula: "F2014", cpf: "900.200.014-14", associacao: "—", vinculo: "ativo", dependentes: [] },
  paulo: { nome: "Paulo Reinclusão Sem Reajuste Exemplo", matricula: "F2016", cpf: "900.200.016-16", associacao: "—", vinculo: "ativo", dependentes: [] },
  quiteria: { nome: "Quitéria Mudança Sem Reajuste Exemplo", matricula: "F2017", cpf: "900.200.017-17", associacao: "Assefaz", vinculo: "ativo", dependentes: [] },
  rita: { nome: "Rita Reinclusão e Reajuste Exemplo", matricula: "F2018", cpf: "900.200.018-18", associacao: "—", vinculo: "ativo", dependentes: [] },
  olivia: { nome: "Olívia Reajuste no Teto Exemplo", matricula: "F2015", cpf: "900.200.015-15", associacao: "—", vinculo: "ativo", dependentes: [] },
} satisfies Record<string, PessoaDemo>;
const TODAS: PessoaDemo[] = Object.values(P);

/** Pessoas FICTÍCIAS (e seus dependentes fictícios) do ambiente demonstrativo, para a pesquisa de servidores. Só em memória. */
export const pessoasDemonstrativasAlteracoes = () => TODAS.map((p) => ({ nome: p.nome, matricula: p.matricula, cpf: p.cpf, associacao: p.associacao, vinculo: p.vinculo, dependentes: p.dependentes }));

const benef = (id: string, p: PessoaDemo, parentesco: BeneficiarioPagamento["parentesco"], nome: string, valor: number, operadora: string): BeneficiarioPagamento => ({
  id,
  nome,
  parentesco,
  ...(parentesco === "Titular" ? { matricula: p.matricula, cpf: p.cpf } : {}),
  operadora,
  valorCadastrado: valor,
  situacao: "ativo",
  modalidadePlano: "individual_familiar",
});
const BENEFICIARIOS_DEMO: BeneficiarioPagamento[] = [
  benef("demo-alt-ben-aurora", P.aurora, "Titular", P.aurora.nome, 3400, "Operadora Demo A"),
  benef("demo-alt-ben-aurora-dep", P.aurora, "Filho", P.aurora.dependentes[0].nome, 0, "Operadora Demo A"),
  benef("demo-alt-ben-bento", P.bento, "Titular", P.bento.nome, 2100, "Operadora Demo B"),
  benef("demo-alt-ben-giovana", P.giovana, "Titular", P.giovana.nome, 1800, "Operadora Demo F"),
  benef("demo-alt-ben-giovana-dep", P.giovana, "Cônjuge", P.giovana.dependentes[0].nome, 1200, "Operadora Demo F"),
  benef("demo-alt-ben-nelson", P.nelson, "Titular", P.nelson.nome, 2400, "Operadora Demo G"),
  benef("demo-alt-ben-rita", P.rita, "Titular", P.rita.nome, 2300, "Operadora Demo I"),
  benef("demo-alt-ben-olivia", P.olivia, "Titular", P.olivia.nome, 4800, "Operadora Demo H"),
];

const comprovante = (id: string, competencia: string, beneficiarioIds: string[], extra: Partial<ComprovanteLite>): ComprovanteLite => ({
  id,
  competencia,
  status: "aprovado",
  beneficiarioIds,
  aprovacoes: [],
  justificativasDivergencia: [],
  statusDoBeneficiario: () => "aprovado",
  ...extra,
});
const atualizacaoValor = (beneficiarioId: string, valorAnterior: number, valorNovo: number, motivoAlteracao?: string): AcaoComprovanteLite => ({
  acao: "valor_cadastral_atualizado",
  beneficiarioId,
  valorAnterior,
  valorNovo,
  data: "2026-09-18T10:00:00.000Z",
  aprovadoPor: "Analista GERDAB (exemplo)",
  comentario: "Valor atualizado conforme o comprovante (exemplo demonstrativo).",
  motivoAlteracao,
});
const COMPROVANTES_DEMO: ComprovanteLite[] = [
  // Reajuste do plano comprovado na fonte (motivo registrado).
  comprovante("demo-alt-cmp-aurora", "2026-09", ["demo-alt-ben-aurora", "demo-alt-ben-aurora-dep"], { aprovacoes: [atualizacaoValor("demo-alt-ben-aurora", 3000, 3400, "reajuste_plano")] }),
  // Alteração originada no DEPENDENTE (cônjuge de Giovana, que mudou de plano): a movimentação é vinculada ao TITULAR do grupo.
  comprovante("demo-alt-cmp-giovana", "2026-09", ["demo-alt-ben-giovana", "demo-alt-ben-giovana-dep"], { aprovacoes: [atualizacaoValor("demo-alt-ben-giovana-dep", 1000, 1200, "mudou_de_plano")] }),
  // Valor atualizado, mas a fonte NÃO registra o motivo: a observação fica pendente de complementação.
  comprovante("demo-alt-cmp-nelson", "2026-09", ["demo-alt-ben-nelson"], { aprovacoes: [atualizacaoValor("demo-alt-ben-nelson", 2000, 2400)] }),
  // Reajuste comprovado, mas o grupo já estava acima do teto familiar: o ressarcimento final NÃO muda (movimentação mantida, sem "Alterar valor").
  comprovante("demo-alt-cmp-olivia", "2026-09", ["demo-alt-ben-olivia"], { aprovacoes: [atualizacaoValor("demo-alt-ben-olivia", 4500, 4800, "reajuste_plano")] }),
  // Mesmo titular com DUAS fontes na competência: reinclusão por comprovante (registro informado) + reajuste (comprovante) → UMA linha consolidada.
  comprovante("demo-alt-cmp-rita", "2026-09", ["demo-alt-ben-rita"], { aprovacoes: [atualizacaoValor("demo-alt-ben-rita", 2000, 2300, "reajuste_plano")] }),
  comprovante("demo-alt-cmp-bento", "2026-09", ["demo-alt-ben-bento"], { operadoraDivergenteCadastro: true }),
];

const requerimento = (n: number, associacao: string, tipo: TipoRequerimentoAssociacao, p: PessoaDemo, extra: Partial<RequerimentoLite> = {}): RequerimentoLite => ({
  id: `DEMO-ALT-REQ-2026-${String(n).padStart(4, "0")}`,
  associacao,
  tipo,
  beneficiarioNome: p.nome, // como nos requerimentos reais: identifica o SERVIDOR (titular); o dependente só consta no resumo
  beneficiarioId: p.matricula,
  status: "aprovado",
  versao: 1,
  decididoEm: "2026-09-12T10:00:00.000Z",
  decididoPor: "GERDAB (exemplo demonstrativo)",
  ...extra,
});
const REQUERIMENTOS_DEMO: RequerimentoLite[] = [
  requerimento(1, "Assefaz", "inclusao_no_plano", P.cecilia, { motivo: "nova_proposta" }),
  requerimento(2, "Assetran", "inclusao_dependente", P.davi),
  requerimento(3, "Assefaz", "mudanca_plano", P.elisa),
  requerimento(4, "Assefaz", "exclusao", P.kleber, { alvo: "dependente" }),
  requerimento(5, "Assefaz", "mudanca_plano", P.quiteria),
];

const ret = (id: string, motivo: string, p: PessoaDemo): SolicitacaoRetroativaLite => ({
  id,
  origem: "individual",
  motivo,
  cpfTitular: p.cpf,
  nomeTitular: p.nome,
  competencias: [{ competenciaReferencia: "2026-09", aprovada: true, ultima: { responsavel: "Analista GERDAB (exemplo)", dataHora: "2026-09-20T10:00:00.000Z" } }],
});
const RETROATIVOS_DEMO: SolicitacaoRetroativaLite[] = [
  ret("demo-alt-ret-fabio", "inclusao_dependente", P.fabio),
  ret("demo-alt-ret-giovana", "reinclusao_dependente", P.giovana),
  // Mesmo titular (Aurora) com uma segunda movimentação na mesma competência: CONSOLIDADA na mesma linha do relatório.
  ret("demo-alt-ret-aurora", "inclusao_dependente", P.aurora),
];

/** Movimentações com natureza e motivo REGISTRADOS na origem (fonte que ainda não existe no sistema real). */
const informado = (id: string, p: PessoaDemo, movimentos: Movimento[], descricao: string): MovimentoInformadoLite => ({
  id,
  titular: { nome: p.nome, matricula: p.matricula, cpf: p.cpf },
  competencia: "2026-09",
  origemPagamento: "Boletos",
  movimentos,
  descricao,
  responsavel: "Analista GERDAB (exemplo)",
  data: "2026-09-21T10:00:00.000Z",
});
const INFORMADOS_DEMO: MovimentoInformadoLite[] = [
  informado("demo-alt-inf-marta", P.marta, [{ tipo: "reincluir", motivo: "comprovante_pagamento" }], "Reinclusão após apresentação do comprovante de pagamento (exemplo demonstrativo)."),
  informado("demo-alt-inf-paulo", P.paulo, [{ tipo: "reincluir", motivo: "comprovante_pagamento" }], "Reinclusão após apresentação do comprovante de pagamento, sem reajuste (exemplo demonstrativo)."),
  informado("demo-alt-inf-rita", P.rita, [{ tipo: "reincluir", motivo: "comprovante_pagamento" }], "Reinclusão após apresentação do comprovante de pagamento (exemplo demonstrativo)."),
  informado("demo-alt-inf-lucia", P.lucia, [{ tipo: "reincluir", motivo: "comprovante_pagamento" }, { tipo: "alterar_valor", motivo: "reajuste_plano" }], "Reinclusão com comprovante e reajuste do plano (exemplo demonstrativo)."),
];

const integrante = (nome: string, cpf: string, vinculo: string, valor: number, operadora: string) => ({ beneficiario: nome, cpf, vinculo, valor, operadora });
const grupoPlanilha = (p: PessoaDemo, associacao: string, competencia: string, composicao: ReturnType<typeof integrante>[]): RegistroAssociacaoConsolidado => ({
  cpfTitular: p.cpf,
  nomeTitular: p.nome,
  valor: composicao.reduce((t, c) => t + c.valor, 0),
  associacao,
  competencia,
  planilhaId: `demo-alt-pl-${associacao}-${competencia}`,
  statusPlanilha: "aprovada",
  composicao,
});
const PLANILHAS_DEMO_REGISTROS: Record<string, RegistroAssociacaoConsolidado[]> = {
  "2026-08": [
    grupoPlanilha(P.henrique, "Assetran", "2026-08", [integrante(P.henrique.nome, P.henrique.cpf, "Titular", 1500, "Operadora Demo C")]),
    grupoPlanilha(P.isadora, "Assefaz", "2026-08", [integrante(P.isadora.nome, P.isadora.cpf, "Titular", 900, "Operadora Demo D"), integrante(P.isadora.dependentes[0].nome, "900.209.009-90", "Filho(a)", 600, "Operadora Demo D")]),
  ],
  "2026-09": [
    grupoPlanilha(P.henrique, "Assetran", "2026-09", [integrante(P.henrique.nome, P.henrique.cpf, "Titular", 1800, "Operadora Demo C")]),
    grupoPlanilha(P.isadora, "Assefaz", "2026-09", [integrante(P.isadora.nome, P.isadora.cpf, "Titular", 900, "Operadora Demo D")]),
  ],
};
const PLANILHAS_DEMO: PlanilhaLite[] = ["2026-08", "2026-09"].flatMap((competencia) => ["Assetran", "Assefaz"].map((associacao) => ({ associacao, competencia, aprovada: true })));

const linhaFech = (p: PessoaDemo, competencia: string, classificacao: "adimplente" | "inadimplente"): LinhaFechamentoLite => ({ beneficiarioId: `demo-alt-fech-${p.matricula}`, matricula: p.matricula, nome: p.nome, competencia, classificacao, origem: "individual", operadoraOuAssociacao: "Operadora Demo E" });
const FECHAMENTO_DEMO: LinhaFechamentoLite[] = [linhaFech(P.joana, "2026-08", "inadimplente"), linhaFech(P.joana, "2026-09", "adimplente")];

/**
 * RESSARCIMENTO FINAL do grupo familiar por titular e competência — o que o Fechamento apura (`valorRessarcir`). Os valores fictícios do grupo são
 * passados pela PRÓPRIA `calcularReembolso` do sistema (base limitada ao teto × 90%), nunca por fórmula paralela nem por valor fixo desvinculado.
 */
const rg = (p: PessoaDemo, competencia: string, valorGrupo: number, classificacao: RessarcimentoLite["classificacao"] = "adimplente", origem: RessarcimentoLite["origem"] = "individual"): RessarcimentoLite => ({
  matricula: p.matricula,
  cpf: p.cpf,
  competencia,
  classificacao,
  valorGrupo,
  valorRessarcir: calcularReembolso(valorGrupo),
  origem,
});
const hg = (p: PessoaDemo, competencia: string, valorGrupo: number): RessarcimentoHistoricoLite => ({ matricula: p.matricula, cpf: p.cpf, competencia, valorRessarcir: calcularReembolso(valorGrupo) });
const mes = COMPETENCIA_DEMONSTRATIVA_ALTERACOES;
const RESSARCIMENTO_ATUAL_DEMO: RessarcimentoLite[] = [
  rg(P.aurora, mes, 3400), // reajuste: R$ 2.700,00 → R$ 3.060,00
  rg(P.bento, mes, 2100), // sem alteração do valor final
  rg(P.cecilia, mes, 1500, "adimplente", "associacao"),
  rg(P.davi, mes, 2600, "adimplente", "associacao"),
  rg(P.elisa, mes, 2200, "adimplente", "associacao"),
  rg(P.fabio, mes, 4800), // acima do teto: R$ 3.600,00 nos dois meses → sem impacto
  rg(P.giovana, mes, 2500),
  rg(P.henrique, mes, 1800, "adimplente", "associacao"),
  rg(P.isadora, mes, 900, "adimplente", "associacao"), // atual R$ 810,00 × histórico R$ 855,00 → divergente
  rg(P.joana, mes, 1700, "requer_analise"), // ainda não validado
  rg(P.kleber, mes, 1900, "adimplente", "associacao"),
  rg(P.lucia, mes, 2300),
  // Marta: sem resultado de Fechamento → valor não disponível.
  rg(P.nelson, mes, 2400),
  rg(P.olivia, mes, 4800), // R$ 3.600,00 nos dois meses (teto familiar)
  rg(P.paulo, mes, 2000), // reinclusão sem reajuste: mesmo valor final
  rg(P.quiteria, mes, 2200, "adimplente", "associacao"), // mudança de plano sem reajuste: mesmo valor final
  rg(P.rita, mes, 2300),
];
const RESSARCIMENTO_HISTORICO_DEMO: RessarcimentoHistoricoLite[] = [
  hg(P.aurora, ANTERIOR, 3000),
  hg(P.bento, ANTERIOR, 2100),
  hg(P.davi, ANTERIOR, 2000),
  hg(P.elisa, ANTERIOR, 1800),
  hg(P.fabio, ANTERIOR, 4500),
  hg(P.giovana, ANTERIOR, 2000),
  hg(P.henrique, ANTERIOR, 1500),
  hg(P.isadora, ANTERIOR, 1500),
  hg(P.kleber, ANTERIOR, 2400),
  hg(P.lucia, ANTERIOR, 2000),
  hg(P.nelson, ANTERIOR, 2000),
  hg(P.olivia, ANTERIOR, 4500),
  hg(P.paulo, ANTERIOR, 2000),
  hg(P.quiteria, ANTERIOR, 2200),
  hg(P.rita, ANTERIOR, 2000),
  hg(P.isadora, mes, 950), // histórico de set/2026 difere do Fechamento atual
];

/** Fontes fictícias isoladas (sem acesso a armazenamento algum). */
export function fontesDemonstracaoAlteracoes(): FontesAlteracao {
  return {
    demonstracao: true,
    beneficiarios: () => BENEFICIARIOS_DEMO,
    comprovantes: () => COMPROVANTES_DEMO,
    requerimentos: () => REQUERIMENTOS_DEMO,
    planilhas: () => PLANILHAS_DEMO,
    registrosPlanilhaAprovados: (c) => PLANILHAS_DEMO_REGISTROS[c] ?? [],
    solicitacoesRetroativas: () => RETROATIVOS_DEMO,
    linhasFechamento: () => FECHAMENTO_DEMO,
    ressarcimentoAtual: (t, competencia) => RESSARCIMENTO_ATUAL_DEMO.find((r) => r.competencia === competencia && mesmoTitular(t, r)),
    ressarcimentoHistorico: (t, competencia) => RESSARCIMENTO_HISTORICO_DEMO.find((r) => r.competencia === competencia && mesmoTitular(t, r)),
    movimentosInformados: () => INFORMADOS_DEMO,
    servidorPorMatricula: (m) => {
      const p = TODAS.find((x) => x.matricula === m);
      return p ? { cpf: p.cpf, matricula: p.matricula } : undefined;
    },
    vinculoPorCpf: (cpf) => {
      const p = TODAS.find((x) => x.cpf === cpf);
      return p ? { grupo: p.vinculo } : { requerConferencia: true, motivo: "CPF fora da base demonstrativa." };
    },
    matriculaPorCpf: (cpf) => TODAS.find((x) => x.cpf === cpf)?.matricula,
  };
}

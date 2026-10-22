/**
 * Relatório de Suspensões — FONTES consultadas por "Gerar situações da competência" e CAMADA DE FONTES DEMONSTRATIVAS (isolada).
 *
 * `FontesSuspensao` é a interface que os leitores (S5/S6, `relatorio-suspensoes-sugestoes.ts`) usam para ler comprovantes/Fechamento,
 * pendências documentais, requerimentos de exclusão, planilhas das associações e o histórico de suspensões. Há duas implementações:
 *  - fontes REAIS (no próprio módulo de sugestões): leem os módulos do protótipo, em modo somente leitura;
 *  - fontes DEMONSTRATIVAS (aqui): dados 100% FICTÍCIOS e FIXOS, em memória, que **não existem em nenhum outro módulo** (nada é gravado em
 *    comprovantes, planilhas, requerimentos, cadastro, pagamentos ou emissões reais). Servem para apresentar o fluxo completo percorrendo as
 *    regras reais de S5 e S6. Quem escolhe qual conjunto usar é o ambiente demonstrativo (ver `massa-demonstracao-suspensoes.ts`).
 *
 * Este arquivo é "folha": só importa TIPOS (sem dependência circular com o restante do módulo).
 */
import type { RegistroSuspensao } from "./relatorio-suspensoes";
import type { PendenciaDocumental } from "./pendencias-documentais";
import type { RegistroFechamento } from "./fechamento-pagamento";
import type { RegistroPlanilhaAssociacao, RequerimentoAssociacao, StatusRequerimentoAssociacao } from "./prosaude-storage";
import type { VinculoFuncional } from "./relatorio-alteracoes";

/* ── Contrato das fontes ──────────────────────────────────────────────────────────────────────────────────────── */

export type FechamentoFonte = Pick<RegistroFechamento, "beneficiarioId" | "matricula" | "cpf" | "nome" | "origem" | "classificacao" | "comprovanteId" | "statusComprovante" | "motivo">;
export type PendenciaFonteLite = Pick<PendenciaDocumental, "id" | "tipo" | "documento" | "dependenteId" | "dependenteNome" | "origem" | "criadoEm" | "prazo">;

export interface PessoaFonte {
  nome: string;
  matricula: string;
  cpf: string;
  /** "—" = sem associação (comprovação individual). */
  associacao: string;
}
export interface PendenciaFonte {
  servidor: PessoaFonte;
  pendencia: PendenciaFonteLite;
  parentesco?: string;
}
export interface RequerimentoExclusaoFonte {
  id: string;
  associacao: string;
  beneficiarioNome: string;
  beneficiarioId?: string;
  criadoEm: string;
  status: StatusRequerimentoAssociacao;
  versao: number;
  decididoEm?: string;
  decididoPor?: string;
}
export interface PlanilhaFonte {
  associacao: string;
  competencia: string;
  /** Análise financeira confirmada pela GERDAB. */
  confirmada: boolean;
  versao: number;
  linhas: RegistroPlanilhaAssociacao[];
  /** Titulares considerados na planilha confirmada. */
  titulares: { cpfTitular: string; nomeTitular: string }[];
}
export interface StatusDocumentoFonte {
  /** A fonte cobre este titular? (a documental real cobre só o servidor de referência) */
  coberto: boolean;
  estado?: "aprovado" | "aguardando_analise" | "aguardando_envio" | "desconhecido";
  analisadoPor?: string;
  detalhe?: string;
}
export interface HistoricoSuspensoes {
  registros: RegistroSuspensao[];
  /** Registros que constam em emissão: numero/referência da emissão mais recente. */
  emitidos: Map<string, { numero: number; referencia: string; geradoEm: string }>;
}

export interface FontesSuspensao {
  /** `true` nas fontes fictícias do ambiente demonstrativo. */
  demonstracao: boolean;
  /** Competências percorridas pela geração por comprovante (Fechamento). */
  competenciasGeracao: string[];
  /** Competências para as quais o Fechamento pode verificar a regularização de um comprovante. */
  competenciasVerificaveis: string[];
  registrosFechamento(competencia: string): FechamentoFonte[];
  /** O servidor registrou dispensa do comprovante nesta competência? */
  dispensado(competencia: string, titular: FechamentoFonte): boolean;
  hoje(): Date;
  pendenciasDocumentais(): PendenciaFonte[];
  statusDocumento(matricula: string, documento: string, afetado: { tipo: "titular" | "dependente"; nomeDependente?: string }): StatusDocumentoFonte;
  requerimentosExclusao(): RequerimentoExclusaoFonte[];
  /** Quantidade de requerimentos individuais de exclusão do Admin (decisão não persistida: não são fonte). */
  requerimentosIndividuaisExclusao(): number;
  titularPorMatricula(matricula: string): { nome: string; matricula: string; cpf: string } | undefined;
  planilhas(): PlanilhaFonte[];
  vinculoPorCpf(cpf: string): { grupo?: VinculoFuncional; requerConferencia?: boolean; motivo?: string };
  matriculaPorCpf(cpf: string): string | undefined;
  historico(): HistoricoSuspensoes;
}

/* ── Dados DEMONSTRATIVOS (fictícios, fixos, em memória) ─────────────────────────────────────────────────────── */

/** Competência em que os cenários estão reunidos, para facilitar a apresentação. */
export const COMPETENCIA_DEMONSTRATIVA = "2026-09";
/** Identificador dos requerimentos fictícios (nunca coincide com ids reais). */
export const PREFIXO_REQUERIMENTO_DEMO = "DEMO-REQ-";
const RESPONSAVEL_HISTORICO = "Sistema (histórico demonstrativo)";

const P = {
  livia: { nome: "Lívia Cardoso Teste", matricula: "F1001", cpf: "900.000.001-01", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  heitor: { nome: "Heitor Recusado Exemplo", matricula: "F1011", cpf: "900.000.011-11", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  nuno: { nome: "Nuno Dispensa Exemplo", matricula: "F1017", cpf: "900.000.017-17", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  ana: { nome: "Ana Regular Exemplo", matricula: "F1020", cpf: "900.000.020-20", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  pedro: { nome: "Pedro Duas Pendências Exemplo", matricula: "F1019", cpf: "900.000.019-19", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  julio: { nome: "Júlio Permanência Exemplo", matricula: "F1013", cpf: "900.000.013-13", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  otavio: { nome: "Otávio Fora da Cobertura Exemplo", matricula: "F1022", cpf: "900.000.022-22", associacao: "—", vinculo: "ativo" as VinculoFuncional },
  iara: { nome: "Iara Documento Exemplo", matricula: "F1012", cpf: "900.000.012-12", associacao: "Assefaz", vinculo: "ativo" as VinculoFuncional },
  quiteria: { nome: "Quitéria Lobo Simulada", matricula: "F1005", cpf: "900.000.005-05", associacao: "Assefaz", vinculo: "inativo" as VinculoFuncional },
  regina: { nome: "Regina Regularizada Exemplo", matricula: "F1021", cpf: "900.000.021-21", associacao: "Assefaz", vinculo: "ativo" as VinculoFuncional },
  lara: { nome: "Lara Grupo Exemplo", matricula: "F1015", cpf: "900.000.015-15", associacao: "Assefaz", vinculo: "ativo" as VinculoFuncional },
  olga: { nome: "Olga Planilha Exemplo", matricula: "F1018", cpf: "900.000.018-18", associacao: "Assefaz", vinculo: "inativo" as VinculoFuncional },
  mario: { nome: "Mário Planilha Exemplo", matricula: "F1023", cpf: "900.000.023-23", associacao: "Assefaz", vinculo: "ativo" as VinculoFuncional },
  katia: { nome: "Kátia Continuidade Exemplo", matricula: "F1014", cpf: "900.000.014-14", associacao: "Assetran", vinculo: "inativo" as VinculoFuncional },
  sonia: { nome: "Sônia Valença Ilustrativa", matricula: "F1007", cpf: "900.000.007-07", associacao: "Assetran", vinculo: "ativo" as VinculoFuncional },
  rafael: { nome: "Rafael Tavares Amostra", matricula: "F1006", cpf: "900.000.006-06", associacao: "Assetran", vinculo: "inativo" as VinculoFuncional },
  sandra: { nome: "Sandra Planilha Exemplo", matricula: "F1024", cpf: "900.000.024-24", associacao: "Assetran", vinculo: "ativo" as VinculoFuncional },
};
const TODAS = Object.values(P);

export interface PessoaDemonstrativa {
  nome: string;
  matricula: string;
  cpf: string;
  associacao: string;
  vinculo: VinculoFuncional;
  dependentes: { nome: string; parentesco: string }[];
}
/** Pessoas FICTÍCIAS (e seus dependentes fictícios) do ambiente demonstrativo, para a pesquisa de servidores. Só em memória. */
export function pessoasDemonstrativas(): PessoaDemonstrativa[] {
  return TODAS.map((p) => {
    const deps = new Map<string, string>();
    PENDENCIAS.filter((x) => x.servidor.matricula === p.matricula && x.pendencia.dependenteNome).forEach((x) => deps.set(x.pendencia.dependenteNome!, x.parentesco ?? "Dependente"));
    if (p.matricula === P.sonia.matricula) deps.set("Tiago Valença Demo", "Filho(a)");
    return { ...p, dependentes: [...deps.entries()].map(([nome, parentesco]) => ({ nome, parentesco })) };
  });
}
const pessoa = (p: (typeof P)[keyof typeof P]): PessoaFonte => ({ nome: p.nome, matricula: p.matricula, cpf: p.cpf, associacao: p.associacao });
const origemPagamentoDe = (p: (typeof P)[keyof typeof P]) => (p.associacao === "Assefaz" ? "ASSEFAZ" : p.associacao === "Assetran" ? "ASSETRAN" : "Boletos");
const HOJE = () => new Date("2026-10-20T12:00:00");

/** Fechamento fictício: comprovante AUSENTE, RECUSADO, dispensado, regular e (em junho) um ausente verificável pela continuidade. */
const FECHAMENTO: Record<string, FechamentoFonte[]> = {
  "2026-06": [{ beneficiarioId: "demo-ben-julio", matricula: P.julio.matricula, cpf: P.julio.cpf, nome: P.julio.nome, origem: "individual", classificacao: "inadimplente", motivo: "Não apresentou comprovante de pagamento nesta competência." }],
  "2026-09": [
    { beneficiarioId: "demo-ben-livia", matricula: P.livia.matricula, cpf: P.livia.cpf, nome: P.livia.nome, origem: "individual", classificacao: "inadimplente", motivo: "Não apresentou comprovante de pagamento nesta competência." },
    { beneficiarioId: "demo-ben-heitor", matricula: P.heitor.matricula, cpf: P.heitor.cpf, nome: P.heitor.nome, origem: "individual", classificacao: "inadimplente", comprovanteId: "demo-comprovante-recusado", motivo: "Documento ilegível." },
    { beneficiarioId: "demo-ben-nuno", matricula: P.nuno.matricula, cpf: P.nuno.cpf, nome: P.nuno.nome, origem: "individual", classificacao: "inadimplente", motivo: "Servidor optou por não apresentar comprovante nesta competência (dispensa registrada)." },
    { beneficiarioId: "demo-ben-ana", matricula: P.ana.matricula, cpf: P.ana.cpf, nome: P.ana.nome, origem: "individual", classificacao: "adimplente", comprovanteId: "demo-comprovante-aprovado" },
    { beneficiarioId: "demo-ben-pedro", matricula: P.pedro.matricula, cpf: P.pedro.cpf, nome: P.pedro.nome, origem: "individual", classificacao: "inadimplente", motivo: "Não apresentou comprovante de pagamento nesta competência." },
  ],
};

const prazoVencido = (texto: string, iso: string) => ({ data: new Date(iso), texto });
const pend = (id: string, p: (typeof P)[keyof typeof P], documento: string, dependente?: { id: string; nome: string; parentesco: string }): PendenciaFonte => ({
  servidor: pessoa(p),
  parentesco: dependente?.parentesco,
  pendencia: { id, tipo: "outro", documento, dependenteId: dependente?.id, dependenteNome: dependente?.nome, origem: "sistema", criadoEm: "2026-05-04T10:00:00.000Z", prazo: prazoVencido("2º semestre — venceu em 04/08/2026", "2026-08-04T23:59:59") },
});
const PENDENCIAS: PendenciaFonte[] = [
  pend("demo-pend-iara", P.iara, "Comprovante de matrícula", { id: "demo-dep-jonas", nome: "Jonas Documento Demo", parentesco: "Filho(a)" }),
  pend("demo-pend-pedro", P.pedro, "Comprovante de matrícula", { id: "demo-dep-pietra", nome: "Pietra Dependente Demo", parentesco: "Filho(a)" }),
  pend("demo-pend-katia", P.katia, "Declaração de Imposto de Renda"),
  pend("demo-pend-quiteria", P.quiteria, "Laudo médico de invalidez"),
];
/** Aprovação/entrega dos documentos, só para os titulares que a fonte documental fictícia cobre. */
const DOCUMENTOS: { matricula: string; documento: string; nomeDependente?: string; estado: "aprovado" | "aguardando_analise" | "aguardando_envio"; analisadoPor?: string }[] = [
  { matricula: P.katia.matricula, documento: "Declaração de Imposto de Renda", estado: "aguardando_analise" },
  { matricula: P.quiteria.matricula, documento: "Laudo médico de invalidez", estado: "aguardando_envio" },
  { matricula: P.regina.matricula, documento: "Comprovante de matrícula", estado: "aprovado", analisadoPor: "Analista GERDAB (exemplo)" },
  { matricula: P.pedro.matricula, documento: "Comprovante de matrícula", nomeDependente: "Pietra Dependente Demo", estado: "aguardando_envio" },
  { matricula: P.iara.matricula, documento: "Comprovante de matrícula", nomeDependente: "Jonas Documento Demo", estado: "aguardando_envio" },
];

/** Requerimentos de exclusão FICTÍCIOS (objetos completos, com a mesma forma dos de associação: usados também pelo diálogo de conferência). */
function requerimento(n: number, associacao: string, beneficiarioNome: string, beneficiarioId: string | undefined, aprovado: boolean): RequerimentoAssociacao {
  const id = `${PREFIXO_REQUERIMENTO_DEMO}2026-${String(n).padStart(4, "0")}`;
  return {
    id,
    associacao,
    tipo: "exclusao",
    beneficiarioNome,
    beneficiarioId,
    criadoEm: "2026-09-02T10:00:00.000Z",
    versoes: [
      {
        versao: 1,
        enviadoEm: "2026-09-02T10:00:00.000Z",
        resumo: "Requerimento de exclusão (exemplo demonstrativo — fictício)",
        documentos: [],
        decisao: aprovado ? { status: "aprovado", decididoEm: "2026-09-10T10:00:00.000Z", decididoPor: "GERDAB (exemplo demonstrativo)" } : undefined,
      },
    ],
  };
}
export const REQUERIMENTOS_DEMONSTRATIVOS: RequerimentoAssociacao[] = [
  requerimento(1, "Assefaz", P.lara.nome, P.lara.matricula, true),
  requerimento(2, "Assetran", "Tiago Valença Demo", P.sonia.matricula, true),
  requerimento(3, "Assefaz", "Beto Pendente Exemplo", undefined, false),
];
export const ehRequerimentoDemonstrativo = (id?: string) => !!id && id.startsWith(PREFIXO_REQUERIMENTO_DEMO);
export const requerimentoDemonstrativoPorId = (id?: string) => REQUERIMENTOS_DEMONSTRATIVOS.find((r) => r.id === id);

const linha = (p: (typeof P)[keyof typeof P], status: RegistroPlanilhaAssociacao["status"], beneficiario = p.nome, motivo?: string): RegistroPlanilhaAssociacao => ({
  servidor: p.nome,
  cpfTitular: p.cpf,
  beneficiario,
  cpf: beneficiario === p.nome ? p.cpf : p.cpf.replace("-", "9-"),
  vinculo: beneficiario === p.nome ? "Titular" : "Filho(a)",
  valor: 500,
  operadora: "Operadora Demonstrativa",
  dataPagamento: "2026-09-10",
  status,
  motivo,
});
const planilha = (associacao: string, competencia: string, linhas: RegistroPlanilhaAssociacao[], titulares: (typeof P)[keyof typeof P][]): PlanilhaFonte => ({ associacao, competencia, confirmada: true, versao: 1, linhas, titulares: titulares.map((t) => ({ cpfTitular: t.cpf, nomeTitular: t.nome })) });
const PLANILHAS: PlanilhaFonte[] = [
  planilha("Assefaz", "2026-08", [linha(P.olga, "válido"), linha(P.mario, "válido")], [P.olga, P.mario]),
  planilha("Assefaz", "2026-09", [linha(P.mario, "válido")], [P.mario]), // Olga some em setembro: investigação, nunca suspensão
  planilha("Assetran", "2026-08", [linha(P.rafael, "válido"), linha(P.sandra, "válido")], [P.rafael, P.sandra]),
  planilha("Assetran", "2026-09", [linha(P.rafael, "válido"), linha(P.rafael, "atenção", "Dependente (exemplo)", "Data de pagamento inconsistente (exemplo)"), linha(P.sandra, "válido")], [P.rafael, P.sandra]),
];

/** Histórico FICTÍCIO de suspensões JÁ EMITIDAS (evidência da continuidade). Fica só em memória: nunca se mistura com as emissões reais. */
function registroHistorico(id: string, p: (typeof P)[keyof typeof P], referencia: string, pendenciaRef: NonNullable<RegistroSuspensao["pendenciaRef"]>, opcoes: { afetado?: RegistroSuspensao["afetado"]; competenciasAfetadas?: string[]; motivo: string }): RegistroSuspensao {
  const agora = `${referencia}-28T10:00:00.000Z`;
  return {
    id,
    titular: { nome: p.nome, matricula: p.matricula, cpf: p.cpf },
    vinculo: p.vinculo,
    origemPagamento: origemPagamentoDe(p) as RegistroSuspensao["origemPagamento"],
    competenciaReferencia: referencia,
    competenciaPagamento: `${referencia.slice(0, 4)}-${String(Number(referencia.slice(5)) + 1).padStart(2, "0")}`,
    classificacao: "suspender",
    afetado: opcoes.afetado ?? { tipo: "titular" },
    motivo: opcoes.motivo,
    observacao: "Registro do histórico demonstrativo (fictício).",
    observacaoEditada: false,
    origemInformacao: "manual",
    pendenciaRef,
    competenciasAfetadas: opcoes.competenciasAfetadas,
    competenciaInicialConferida: pendenciaRef.tipo === "documentacao_obrigatoria" ? { responsavel: "Analista GERDAB (exemplo)", dataHora: agora } : undefined,
    situacao: "confirmada",
    conferencia: [],
    responsavel: RESPONSAVEL_HISTORICO,
    criadoEm: agora,
    atualizadoEm: agora,
    demonstrativo: true,
    historico: [],
  };
}
const HISTORICO_BASE: { registro: RegistroSuspensao; referencia: string }[] = [
  { registro: registroHistorico("demo-hist-julio", P.julio, "2026-06", { tipo: "comprovante_pagamento", competencia: "2026-06" }, { motivo: "sem_comprovante_pagamento" }), referencia: "2026-06" },
  { registro: registroHistorico("demo-hist-katia", P.katia, "2026-08", { tipo: "documentacao_obrigatoria", documento: "Declaração de Imposto de Renda" }, { motivo: "sem_documentacao", competenciasAfetadas: ["2026-07", "2026-08"] }), referencia: "2026-08" },
  { registro: registroHistorico("demo-hist-quiteria", P.quiteria, "2026-07", { tipo: "documentacao_obrigatoria", documento: "Laudo médico de invalidez" }, { motivo: "sem_documentacao", competenciasAfetadas: ["2026-06", "2026-07"] }), referencia: "2026-07" },
  { registro: registroHistorico("demo-hist-regina", P.regina, "2026-07", { tipo: "documentacao_obrigatoria", documento: "Comprovante de matrícula" }, { motivo: "sem_documentacao", competenciasAfetadas: ["2026-06", "2026-07"] }), referencia: "2026-07" },
  { registro: registroHistorico("demo-hist-otavio", P.otavio, "2026-08", { tipo: "documentacao_obrigatoria", documento: "Comprovante de matrícula" }, { motivo: "sem_documentacao", competenciasAfetadas: ["2026-07", "2026-08"] }), referencia: "2026-08" },
];

const norm = (t?: string) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Fontes fictícias isoladas (sem acesso a armazenamento algum). */
export function fontesDemonstracao(): FontesSuspensao {
  return {
    demonstracao: true,
    competenciasGeracao: [COMPETENCIA_DEMONSTRATIVA],
    competenciasVerificaveis: ["2026-06", "2026-07", "2026-08", "2026-09"],
    registrosFechamento: (c) => FECHAMENTO[c] ?? [],
    dispensado: (_c, t) => t.matricula === P.nuno.matricula,
    hoje: HOJE,
    pendenciasDocumentais: () => PENDENCIAS,
    statusDocumento: (matricula, documento, afetado) => {
      const d = DOCUMENTOS.find((x) => x.matricula === matricula && norm(x.documento) === norm(documento) && (afetado.tipo === "titular" ? !x.nomeDependente : norm(x.nomeDependente) === norm(afetado.nomeDependente)));
      if (!d) return { coberto: false, detalhe: "A fonte documental demonstrativa não cobre este titular." };
      return { coberto: true, estado: d.estado, analisadoPor: d.analisadoPor };
    },
    requerimentosExclusao: () =>
      REQUERIMENTOS_DEMONSTRATIVOS.map((r) => {
        const v = r.versoes[r.versoes.length - 1];
        return { id: r.id, associacao: r.associacao, beneficiarioNome: r.beneficiarioNome, beneficiarioId: r.beneficiarioId, criadoEm: r.criadoEm, status: (v.decisao?.status ?? "pendente_validacao") as StatusRequerimentoAssociacao, versao: v.versao, decididoEm: v.decisao?.decididoEm, decididoPor: v.decisao?.decididoPor };
      }),
    requerimentosIndividuaisExclusao: () => 0,
    titularPorMatricula: (m) => {
      const p = TODAS.find((x) => x.matricula === m);
      return p ? { nome: p.nome, matricula: p.matricula, cpf: p.cpf } : undefined;
    },
    planilhas: () => PLANILHAS,
    vinculoPorCpf: (cpf) => {
      const p = TODAS.find((x) => x.cpf === cpf);
      return p ? { grupo: p.vinculo } : { requerConferencia: true, motivo: "CPF fora da base demonstrativa." };
    },
    matriculaPorCpf: (cpf) => TODAS.find((x) => x.cpf === cpf)?.matricula,
    historico: () => ({
      registros: HISTORICO_BASE.map((h) => h.registro),
      emitidos: new Map(HISTORICO_BASE.map((h) => [h.registro.id, { numero: 1, referencia: h.referencia, geradoEm: `${h.referencia}-29T12:00:00.000Z` }] as const)),
    }),
  };
}

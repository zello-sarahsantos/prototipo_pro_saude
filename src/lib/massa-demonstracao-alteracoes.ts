/**
 * MASSA DE DEMONSTRAÇÃO do Relatório de Alterações — SOMENTE PROTÓTIPO. Nove registros (um por cenário do modelo da GERDAB),
 * distribuídos entre Ativos/Inativos e Boletos/ASSEFAZ/ASSETRAN para validar os agrupamentos do relatório.
 *
 * Tudo fictício: nomes, matrículas ("F" + número, para nunca coincidir com matrícula real) e valores. Todos nascem
 * "identificada" (nenhum é confirmado sozinho) e sem "valor informado ao NURFI" (a GERDAB preenche na conferência). Não lê nem
 * altera nenhum outro módulo; usa só a API de `relatorio-alteracoes.ts`.
 *
 * Idempotente: cada registro tem id fixo (`demo-alt-NN`) e só é criado se esse id ainda não existir — recarregar não duplica,
 * e um registro editado, confirmado ou descartado nunca é sobrescrito nem ressuscitado. Marcador de versão no `localStorage`
 * evita refazer a verificação a cada acesso (aumentar `VERSAO` acrescenta apenas registros novos).
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { registrarMovimentacao, type NovoRegistroAlteracao } from "./relatorio-alteracoes";

const VERSAO = "1";
const RESPONSAVEL = "Sistema (massa demonstrativa)";
const REF = "2026-09";

type Demo = Omit<NovoRegistroAlteracao, "competenciaReferencia" | "origemInformacao" | "demonstrativo" | "referenciaOrigem"> & { id: string; origemInformacao?: "automatica" | "manual"; referenciaOrigem?: NovoRegistroAlteracao["referenciaOrigem"] };

const DEMO: Demo[] = [
  // 1 — Reajuste do plano · Ativo · Boletos (referência à decisão de um comprovante, para o reuso da Etapa 3).
  {
    id: "demo-alt-01",
    titular: { nome: "Aurora Valadares Teste", matricula: "F0001" },
    vinculo: "ativo",
    origemPagamento: "Boletos",
    movimentos: [{ tipo: "alterar_valor", motivo: "reajuste_plano" }],
    valores: { plano: 2900, cadastrado: 2700, comprovado: 2900 },
    origemInformacao: "automatica",
    referenciaOrigem: { modulo: "demonstrativo", rotulo: "Comprovante (demonstração)", decisao: { descricao: "Divergência de valor aprovada pela GERDAB (demonstração)", responsavel: "GERDAB (demonstração)" } },
  },
  // 2 — Mudança de plano · Ativo · ASSEFAZ (planilha da associação: conferência manual).
  {
    id: "demo-alt-02",
    titular: { nome: "Bento Caldeira Fictício", matricula: "F0002" },
    vinculo: "ativo",
    origemPagamento: "ASSEFAZ",
    movimentos: [{ tipo: "alterar_valor", motivo: "mudou_de_plano" }],
    valores: { plano: 2150, cadastrado: 2400 },
    origemInformacao: "manual",
  },
  // 3 — Mudança de categoria · Ativo · ASSETRAN.
  {
    id: "demo-alt-03",
    titular: { nome: "Cecília Montenegro Exemplo", matricula: "F0003" },
    vinculo: "ativo",
    origemPagamento: "ASSETRAN",
    movimentos: [{ tipo: "alterar_valor", motivo: "mudanca_categoria" }],
    valores: { plano: 1800, cadastrado: 1650 },
    origemInformacao: "manual",
  },
  // 4 — Inclusão de dependente com alteração de valor · Inativo · Boletos.
  {
    id: "demo-alt-04",
    titular: { nome: "Davi Albuquerque Modelo", matricula: "F0004" },
    vinculo: "inativo",
    origemPagamento: "Boletos",
    movimentos: [{ tipo: "alterar_valor", motivo: "incluiu_dependente" }],
    valores: { plano: 3300, cadastrado: 2100, comprovado: 3300 },
    origemInformacao: "automatica",
  },
  // 5 — Exclusão de dependente com alteração de valor · Ativo · ASSEFAZ.
  {
    id: "demo-alt-05",
    titular: { nome: "Elisa Fontenele Demo", matricula: "F0005" },
    vinculo: "ativo",
    origemPagamento: "ASSEFAZ",
    movimentos: [{ tipo: "alterar_valor", motivo: "excluiu_dependente" }],
    valores: { plano: 1950, cadastrado: 3100 },
    origemInformacao: "manual",
  },
  // 6 — Reinclusão de dependente com alteração de valor · Inativo · ASSETRAN.
  {
    id: "demo-alt-06",
    titular: { nome: "Fábio Guimarães Simulado", matricula: "F0006" },
    vinculo: "inativo",
    origemPagamento: "ASSETRAN",
    movimentos: [{ tipo: "alterar_valor", motivo: "reincluiu_dependente" }],
    valores: { plano: 2750, cadastrado: 1900 },
    origemInformacao: "manual",
  },
  // 7 — Inclusão por nova proposta · Inativo · ASSEFAZ.
  {
    id: "demo-alt-07",
    titular: { nome: "Giovana Haddad Ilustrativa", matricula: "F0007" },
    vinculo: "inativo",
    origemPagamento: "ASSEFAZ",
    movimentos: [{ tipo: "incluir", motivo: "nova_proposta" }],
    valores: { plano: 2300 },
    origemInformacao: "manual",
  },
  // 8 — Reinclusão com comprovante de pagamento · Ativo · Boletos.
  {
    id: "demo-alt-08",
    titular: { nome: "Henrique Itapuã Ficticio", matricula: "F0008" },
    vinculo: "ativo",
    origemPagamento: "Boletos",
    movimentos: [{ tipo: "reincluir", motivo: "comprovante_pagamento" }],
    valores: { plano: 3050, comprovado: 3050 },
    origemInformacao: "automatica",
  },
  // 9 — Reinclusão acompanhada de alteração de valor · Ativo · ASSETRAN.
  {
    id: "demo-alt-09",
    titular: { nome: "Isadora Jaguaribe Amostra", matricula: "F0009" },
    vinculo: "ativo",
    origemPagamento: "ASSETRAN",
    movimentos: [{ tipo: "reincluir", motivo: "comprovante_pagamento" }, { tipo: "alterar_valor", motivo: "reajuste_plano" }],
    valores: { plano: 3400, cadastrado: 3100, comprovado: 3400 },
    origemInformacao: "manual",
  },
];

/** Cria os registros que faltam. Seguro para chamar a cada acesso. */
export function garantirMassaDemonstracaoAlteracoes() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoAlteracoes) === VERSAO) return;
    for (const d of DEMO) {
      registrarMovimentacao(
        { ...d, competenciaReferencia: REF, origemInformacao: d.origemInformacao ?? "manual", demonstrativo: true, referenciaOrigem: d.referenciaOrigem ?? { modulo: "demonstrativo", registroId: d.id, rotulo: "Massa demonstrativa" } },
        RESPONSAVEL,
      );
    }
    localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoAlteracoes, VERSAO);
  } catch {
    /* sem armazenamento: a demonstração simplesmente não é semeada */
  }
}

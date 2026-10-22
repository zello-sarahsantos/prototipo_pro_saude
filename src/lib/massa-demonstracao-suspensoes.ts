/**
 * MASSA DE DEMONSTRAÇÃO do Relatório de Suspensões — SOMENTE PROTÓTIPO, 100% fictícia (nomes, matrículas "F1xxx" e valores).
 * Oito registros cobrindo as três classificações (Suspender, Permanece suspenso, Excluir), titular e dependente, e as seis combinações de
 * vínculo × origem de pagamento. Todos nascem "identificada" e com valor R$ 0,00 só como VALOR INICIAL DEMONSTRATIVO (a GERDAB pode
 * editar ou declarar "não aplicável"); nada aqui é critério de suspensão — as classificações foram escolhidas à mão para ilustrar.
 *
 * Idempotente: ids fixos (`demo-sus-NN`), criados só se ainda não existirem; nunca sobrescreve registro editado, confirmado ou descartado.
 * Ação controlada: nunca é executada automaticamente ao abrir a tela.
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { confirmarSuspensao, definirValorNaoAplicavelSuspensao, descartarSuspensao, registrarSuspensao, type NovoRegistroSuspensao } from "./relatorio-suspensoes";

const VERSAO = "2";
const REF = "2026-09";
const RESPONSAVEL = "Sistema (massa demonstrativa)";

/** Estado inicial de cada registro demonstrativo (aplicado SÓ na criação; nunca reaplicado a um registro existente). */
type Estado = "conferir" | "pronto" | "descartada" | "valor_nao_aplicavel_pronto";
type Demo = Omit<NovoRegistroSuspensao, "competenciaReferencia" | "origemInformacao" | "demonstrativo" | "referenciaOrigem"> & { estado: Estado };

const DEMO: Demo[] = [
  // Pronto
  { id: "demo-sus-01", estado: "pronto", titular: { nome: "Lívia Cardoso Teste", matricula: "F1001" }, vinculo: "ativo", origemPagamento: "Boletos", classificacao: "suspender", afetado: { tipo: "titular" }, motivo: "sem_comprovante_pagamento", valorInformadoNurfi: 0 },
  { id: "demo-sus-03", estado: "valor_nao_aplicavel_pronto", titular: { nome: "Nina Rezende Exemplo", matricula: "F1003" }, vinculo: "ativo", origemPagamento: "ASSETRAN", classificacao: "suspender", afetado: { tipo: "dependente", nomeDependente: "Otávio Rezende Demo", parentesco: "Filho(a)" }, motivo: "Não apresentou comprovante de nascimento" },
  { id: "demo-sus-05", estado: "pronto", titular: { nome: "Quitéria Lobo Simulada", matricula: "F1005" }, vinculo: "inativo", origemPagamento: "ASSEFAZ", classificacao: "permanece_suspenso", afetado: { tipo: "titular" }, valorInformadoNurfi: 0 },
  { id: "demo-sus-07", estado: "pronto", titular: { nome: "Sônia Valença Ilustrativa", matricula: "F1007" }, vinculo: "ativo", origemPagamento: "Boletos", classificacao: "excluir", afetado: { tipo: "dependente", nomeDependente: "Tiago Valença Demo", parentesco: "Enteado(a)" }, motivo: "perda_condicao_dependente", valorInformadoNurfi: 0 },
  // Conferir (cada um com uma pendência diferente para testar a conferência)
  { id: "demo-sus-02", estado: "conferir", titular: { nome: "Mateus Brandão Fictício", matricula: "F1002" }, vinculo: "ativo", origemPagamento: "ASSEFAZ", classificacao: "suspender", afetado: { tipo: "titular" }, motivo: "sem_documentacao" }, // valor pendente
  { id: "demo-sus-04", estado: "conferir", titular: { nome: "Paulo Siqueira Modelo", matricula: "F1004" }, vinculo: "ativo", origemPagamento: "Boletos", classificacao: "permanece_suspenso", afetado: { tipo: "titular" }, valorInformadoNurfi: 0 }, // só falta confirmar
  { id: "demo-sus-06", estado: "conferir", titular: { nome: "Rafael Tavares Amostra", matricula: "F1006" }, vinculo: "inativo", origemPagamento: "ASSETRAN", classificacao: "excluir", afetado: { tipo: "titular" }, valorInformadoNurfi: 0 }, // falta o motivo
  { id: "demo-sus-08", estado: "conferir", titular: { nome: "Ulisses Prado Ficticio", matricula: "F1008" }, vinculo: "inativo", origemPagamento: "Boletos", classificacao: "excluir", afetado: { tipo: "titular" }, motivo: "excluido_do_plano", valorInformadoNurfi: 0 },
  { id: "demo-sus-10", estado: "conferir", titular: { nome: "Viviane Castro Simulacao", matricula: "F1010" }, vinculo: "ativo", origemPagamento: "ASSETRAN", afetado: { tipo: "dependente", nomeDependente: "Wesley Castro Demo", parentesco: "Cônjuge" } }, // situação a classificar + valor pendente
  // Descartada
  { id: "demo-sus-09", estado: "descartada", titular: { nome: "Yara Mendes Demonstracao", matricula: "F1009" }, vinculo: "ativo", origemPagamento: "ASSEFAZ", classificacao: "suspender", afetado: { tipo: "titular" }, motivo: "sem_comprovante_pagamento", valorInformadoNurfi: 0 },
];

export interface ResultadoMassaSuspensoes {
  criados: number;
  jaExistentes: number;
}

/**
 * Cria os registros que ainda não existem (ids fixos `demo-sus-NN`). Idempotente: carregar de novo não duplica nem altera nada que já
 * exista (editado, confirmado, descartado ou emitido). Só roda por ação explícita da GERDAB na tela — nunca ao abrir a página.
 */
export function carregarMassaDemonstracaoSuspensoes(): ResultadoMassaSuspensoes {
  if (typeof window === "undefined") return { criados: 0, jaExistentes: 0 };
  let criados = 0;
  let jaExistentes = 0;
  for (const { estado, ...d } of DEMO) {
    const { registro, criado } = registrarSuspensao({ ...d, competenciaReferencia: REF, origemInformacao: "manual", demonstrativo: true, referenciaOrigem: { modulo: "demonstrativo", registroId: d.id, rotulo: "Massa demonstrativa" } }, RESPONSAVEL);
    if (!criado) {
      jaExistentes++;
      continue;
    }
    criados++;
    if (estado === "valor_nao_aplicavel_pronto") definirValorNaoAplicavelSuspensao(registro.id, true, RESPONSAVEL, "Valor demonstrativo: dependente sem reflexo financeiro (exemplo fictício).");
    if (estado === "pronto" || estado === "valor_nao_aplicavel_pronto") confirmarSuspensao(registro.id, RESPONSAVEL);
    if (estado === "descartada") descartarSuspensao(registro.id, RESPONSAVEL, "Exemplo fictício de registro descartado na conferência.");
  }
  try {
    localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoSuspensoes, VERSAO);
  } catch {
    /* sem armazenamento */
  }
  return { criados, jaExistentes };
}

export const TOTAL_MASSA_SUSPENSOES = DEMO.length;

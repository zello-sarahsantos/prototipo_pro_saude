import { comprovantes as comprovantesSeed, type Comprovante } from "./mock-data";

export const PROSAUDE_STORAGE_KEYS = {
  titularCadastro: "prosaude_titular_cadastro",
  requerimentoMudancaPlano: "prosaude_requerimento_mudanca_plano",
  comprovantesPagamento: "prosaude_comprovantes_pagamento",
} as const;

export type TitularCadastroPlano = {
  operadora: string;
  outraOperadora: string;
  administradora: string;
  proposta: string;
  modalidade: string;
  vigencia: string;
  valorTitular: number;
  empresarial: boolean;
};

export type TitularCadastro = {
  titular: Record<string, unknown>;
  plano: TitularCadastroPlano;
  dependentes: unknown[];
  updatedAt: string;
};

export function saveTitularCadastro(cadastro: TitularCadastro) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.titularCadastro, JSON.stringify(cadastro));
}

export function loadTitularCadastro(): TitularCadastro | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.titularCadastro);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TitularCadastro;
  } catch {
    return null;
  }
}

export type RequerimentoMudancaPlanoDraft = {
  newPlanData: Record<string, unknown>;
  dependentsData: Record<string, unknown>;
  novosDependentes: unknown[];
  updatedAt: string;
};

export function saveRequerimentoMudancaPlano(draft: RequerimentoMudancaPlanoDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.requerimentoMudancaPlano, JSON.stringify(draft));
}

export function loadRequerimentoMudancaPlano(): RequerimentoMudancaPlanoDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.requerimentoMudancaPlano);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RequerimentoMudancaPlanoDraft;
  } catch {
    return null;
  }
}

/**
 * Comprovantes enviados pelo servidor durante a sessão do protótipo (Módulo de Pagamento).
 * Complementa (não substitui) os comprovantes de exemplo em `mock-data.ts`, permitindo que o
 * fluxo do Analista/Gerência (próximas etapas) enxergue os envios feitos nesta sessão.
 */
export function loadComprovantesPagamento(): Comprovante[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.comprovantesPagamento);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Comprovante[];
  } catch {
    return [];
  }
}

export function addComprovantePagamento(comprovante: Comprovante) {
  if (typeof window === "undefined") return;
  const atuais = loadComprovantesPagamento();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.comprovantesPagamento,
    JSON.stringify([...atuais, comprovante]),
  );
}

/**
 * Une os comprovantes de exemplo (`mock-data.ts`) com os persistidos em `localStorage`,
 * deduplicando por `id` — a versão do `localStorage` sempre prevalece (é a mais recente,
 * já que toda ação do Servidor/Analista/Gerência é persistida ali).
 */
export function getComprovantesUnificados(): Comprovante[] {
  const persistidos = loadComprovantesPagamento();
  const idsPersistidos = new Set(persistidos.map((c) => c.id));
  const seedNaoSobreposto = comprovantesSeed.filter((c) => !idsPersistidos.has(c.id));
  return [...seedNaoSobreposto, ...persistidos];
}

/**
 * Atualiza um comprovante (seed ou já persistido) e grava no `localStorage`. Se o registro
 * ainda não existir lá (caso comum: é um comprovante de exemplo que o Analista está tocando
 * pela primeira vez), ele é "promovido" para o `localStorage` já com o patch aplicado.
 */
export function updateComprovantePagamento(id: string, patch: Partial<Comprovante>) {
  if (typeof window === "undefined") return;
  const atuais = loadComprovantesPagamento();
  const existente = atuais.find((c) => c.id === id) ?? comprovantesSeed.find((c) => c.id === id);
  if (!existente) return;
  const atualizado = { ...existente, ...patch };
  const semAntigo = atuais.filter((c) => c.id !== id);
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.comprovantesPagamento, JSON.stringify([...semAntigo, atualizado]));
}

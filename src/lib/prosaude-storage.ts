import {
  comprovantes as comprovantesSeed,
  tipoPlanoPagamentoPadrao,
  type Comprovante,
  type ConclusaoCompetencia,
  type BeneficiarioDispensado,
} from "./mock-data";

export const PROSAUDE_STORAGE_KEYS = {
  titularCadastro: "prosaude_titular_cadastro",
  requerimentoMudancaPlano: "prosaude_requerimento_mudanca_plano",
  comprovantesPagamento: "prosaude_comprovantes_pagamento",
  competenciasConcluidas: "prosaude_competencias_concluidas",
  beneficiariosDispensados: "prosaude_beneficiarios_dispensados",
  tipoPlanoPagamento: "prosaude_tipo_plano_pagamento",
} as const;

/**
 * Tipo de plano do cenário de referência do Módulo de Pagamento — controla quais tipos de
 * documento (Boleto/Recibo/Demonstrativo x Fatura Técnica) podem ser marcados no upload.
 * Persistido em localStorage (mesmo padrão de `prosaude_role`) para permitir simular o perfil
 * "empresarial" sem editar código nem rebuildar — no console do navegador:
 * `localStorage.setItem('prosaude_tipo_plano_pagamento', 'empresarial')` e recarregar a página.
 */
export function getTipoPlanoPagamento(): "empresarial" | "individual_familiar" {
  if (typeof window === "undefined") return tipoPlanoPagamentoPadrao;
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.tipoPlanoPagamento);
  return raw === "empresarial" || raw === "individual_familiar" ? raw : tipoPlanoPagamentoPadrao;
}

export function setTipoPlanoPagamento(tipo: "empresarial" | "individual_familiar") {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.tipoPlanoPagamento, tipo);
}

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

/**
 * Persiste um novo comprovante. Como isso altera o conjunto de documentos da competência,
 * também: (1) remove a dispensa de "continuar sem comprovante" de qualquer beneficiário
 * contemplado neste envio, já que ele passou a ter documento; (2) invalida uma eventual
 * conclusão anterior da competência, pois o conjunto de documentos mudou e precisa ser
 * revisado/concluído de novo pelo servidor.
 */
export function addComprovantePagamento(comprovante: Comprovante) {
  if (typeof window === "undefined") return;
  const atuais = loadComprovantesPagamento();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.comprovantesPagamento,
    JSON.stringify([...atuais, comprovante]),
  );
  comprovante.beneficiarioIds.forEach((id) => {
    removerDispensaBeneficiario(id, comprovante.competencia);
    limparSolicitacaoComplementar(id, comprovante.competencia);
  });
  invalidarConclusaoCompetencia(comprovante.competencia);
}

/** Remove o pedido de documento complementar de qualquer comprovante do beneficiário/competência
 *  quando um novo documento chega — o pedido deixa de fazer sentido, já que foi atendido. */
function limparSolicitacaoComplementar(beneficiarioId: string, competencia: string) {
  const comPedidoAtivo = getComprovantesUnificados().filter(
    (c) => c.competencia === competencia && c.beneficiarioIds.includes(beneficiarioId) && c.solicitacaoComplementar,
  );
  comPedidoAtivo.forEach((c) => updateComprovantePagamento(c.id, { solicitacaoComplementar: undefined }));
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

/** Conclusão do envio de uma competência pelo servidor — não representa novos comprovantes,
 *  apenas o registro de que ele fechou a montagem daquela tela conscientemente. */
export function loadConclusoesCompetencia(): ConclusaoCompetencia[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.competenciasConcluidas);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConclusaoCompetencia[];
  } catch {
    return [];
  }
}

export function getConclusaoCompetencia(competencia: string): ConclusaoCompetencia | undefined {
  return loadConclusoesCompetencia().find((c) => c.competencia === competencia);
}

export function saveConclusaoCompetencia(competencia: string) {
  if (typeof window === "undefined") return;
  const atuais = loadConclusoesCompetencia().filter((c) => c.competencia !== competencia);
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.competenciasConcluidas,
    JSON.stringify([...atuais, { competencia, concluidoEm: new Date().toISOString() }]),
  );
}

/** Invalida a conclusão de uma competência — chamado sempre que um novo comprovante é
 *  adicionado a ela, pois o conjunto de documentos mudou e precisa ser revisado de novo. */
export function invalidarConclusaoCompetencia(competencia: string) {
  if (typeof window === "undefined") return;
  const atuais = loadConclusoesCompetencia().filter((c) => c.competencia !== competencia);
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.competenciasConcluidas, JSON.stringify(atuais));
}

/** Beneficiários que o servidor optou conscientemente por deixar sem comprovante em uma
 *  competência específica — não é uma exclusão, apenas remove o alerta/pendência ativa. */
export function loadBeneficiariosDispensados(): BeneficiarioDispensado[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.beneficiariosDispensados);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BeneficiarioDispensado[];
  } catch {
    return [];
  }
}

export function getBeneficiariosDispensadosIds(competencia: string): string[] {
  return loadBeneficiariosDispensados()
    .filter((d) => d.competencia === competencia)
    .map((d) => d.beneficiarioId);
}

export function dispensarBeneficiario(beneficiarioId: string, competencia: string) {
  if (typeof window === "undefined") return;
  const atuais = loadBeneficiariosDispensados().filter(
    (d) => !(d.beneficiarioId === beneficiarioId && d.competencia === competencia),
  );
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.beneficiariosDispensados,
    JSON.stringify([
      ...atuais,
      { beneficiarioId, competencia, motivo: "continuar_sem_comprovante" as const, data: new Date().toISOString() },
    ]),
  );
}

/** Remove a dispensa de um beneficiário — chamado automaticamente quando um comprovante
 *  dele é anexado, para que ele nunca fique marcado como dispensado tendo documento salvo. */
export function removerDispensaBeneficiario(beneficiarioId: string, competencia: string) {
  if (typeof window === "undefined") return;
  const atuais = loadBeneficiariosDispensados().filter(
    (d) => !(d.beneficiarioId === beneficiarioId && d.competencia === competencia),
  );
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.beneficiariosDispensados, JSON.stringify(atuais));
}

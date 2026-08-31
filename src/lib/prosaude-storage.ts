import {
  comprovantes as comprovantesSeed,
  beneficiariosPagamento,
  type BeneficiarioPagamento,
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
  valoresCadastradosBeneficiarios: "prosaude_valores_cadastrados_beneficiarios",
  observacoesGerdab: "prosaude_observacoes_gerdab",
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

/**
 * Valores cadastrados atualizados pelo Analista/Gerência ao resolver uma divergência cadastral
 * (ver `DivergenciaAprovacaoModal`, "Aprovar e atualizar valor cadastral"). `beneficiariosPagamento`
 * (`mock-data.ts`) continua sendo o cadastro "seed", nunca mutado diretamente — o valor efetivo
 * de cada beneficiário é sempre resolvido via `getBeneficiariosPagamentoAtual()`, que sobrepõe
 * esses overrides por cima do seed, mesmo padrão já usado para comprovantes.
 */
function loadValoresCadastradosBeneficiarios(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.valoresCadastradosBeneficiarios);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Atualiza o valor cadastrado de 1 beneficiário — usado quando a GERDAB resolve uma divergência
 *  cadastral escolhendo "Aprovar e atualizar valor cadastral". O histórico da própria mudança
 *  (valor anterior/novo/responsável/data/justificativa) fica em `Comprovante.aprovacoes`
 *  (`acao: 'valor_cadastral_atualizado'`), não aqui — esta função só mantém o valor "atual". */
export function atualizarValorCadastradoBeneficiario(beneficiarioId: string, novoValor: number) {
  if (typeof window === "undefined") return;
  const atuais = loadValoresCadastradosBeneficiarios();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.valoresCadastradosBeneficiarios,
    JSON.stringify({ ...atuais, [beneficiarioId]: novoValor }),
  );
}

/** `beneficiariosPagamento` (seed) com os valores cadastrados atualizados sobrepostos — é isso
 *  que todo consumidor do Módulo de Pagamento deve usar sempre que `valorCadastrado` importa
 *  (badges de divergência, formulários de conferência, geração de campos mock), para que uma
 *  correção cadastral feita pela GERDAB se reflita imediatamente em toda a aplicação. */
export function getBeneficiariosPagamentoAtual(): BeneficiarioPagamento[] {
  const overrides = loadValoresCadastradosBeneficiarios();
  return beneficiariosPagamento.map((b) =>
    overrides[b.id] !== undefined ? { ...b, valorCadastrado: overrides[b.id] } : b,
  );
}

/**
 * Observações do Analista/Gerência GERDAB sobre um servidor — anotação livre, direcionada ao
 * próprio servidor ou à associação a que ele é vinculado. Diferente do log de "Histórico" (que
 * é gerado automaticamente pelas próprias ações do sistema e não pode ser editado/apagado),
 * Observação é um registro manual: pode ser criado e excluído pelo analista/gerência a
 * qualquer momento — mesmo espírito de "aprovações"/`AcaoComprovante` já usado no Módulo de
 * Pagamento (anotação com autor, cargo e data/hora), aplicado aqui ao lado GERDAB de Cadastro.
 */
export type ObservacaoDestino = "servidor" | "associacao";

/** "observacao" é a anotação livre original; "solicitacao_documento" é um pedido estruturado de
 *  documento complementar — mesma aba, mas com um campo a mais (`documento`, o nome/tipo do que
 *  está sendo pedido) e um destaque visual diferente na listagem, já que é um pedido em aberto,
 *  não só uma nota informativa. */
export type ObservacaoTipo = "observacao" | "solicitacao_documento";

export type ObservacaoGerdab = {
  id: string;
  servidorMatricula: string;
  destino: ObservacaoDestino;
  associacao?: string;
  tipo: ObservacaoTipo;
  documento?: string;
  autor: string;
  cargo: string;
  texto: string;
  criadoEm: string;
};

export function loadObservacoesGerdab(): ObservacaoGerdab[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.observacoesGerdab);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ObservacaoGerdab[];
  } catch {
    return [];
  }
}

export function addObservacaoGerdab(observacao: ObservacaoGerdab) {
  if (typeof window === "undefined") return;
  const atuais = loadObservacoesGerdab();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.observacoesGerdab,
    JSON.stringify([...atuais, observacao]),
  );
}

export function removeObservacaoGerdab(id: string) {
  if (typeof window === "undefined") return;
  const atuais = loadObservacoesGerdab();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.observacoesGerdab,
    JSON.stringify(atuais.filter((o) => o.id !== id)),
  );
}

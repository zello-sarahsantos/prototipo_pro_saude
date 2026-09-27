import {
  comprovantes as comprovantesSeed,
  beneficiariosPagamento,
  type BeneficiarioPagamento,
  type Comprovante,
  type ConclusaoCompetencia,
  type BeneficiarioDispensado,
  type ObservacaoNurfi,
} from "./mock-data";
import type { AuditoriaBase } from "./auditoria";

export const PROSAUDE_STORAGE_KEYS = {
  titularCadastro: "prosaude_titular_cadastro",
  requerimentoMudancaPlano: "prosaude_requerimento_mudanca_plano",
  comprovantesPagamento: "prosaude_comprovantes_pagamento",
  competenciasConcluidas: "prosaude_competencias_concluidas",
  beneficiariosDispensados: "prosaude_beneficiarios_dispensados",
  valoresCadastradosBeneficiarios: "prosaude_valores_cadastrados_beneficiarios",
  observacoesGerdab: "prosaude_observacoes_gerdab",
  observacoesNurfi: "prosaude_observacoes_nurfi",
  planilhasAssociacao: "prosaude_planilhas_associacao",
  massaDemoPlanilhas: "prosaude_massa_demo_planilhas",
  requerimentosAssociacao: "prosaude_requerimentos_associacao",
  // Ressarcimento Retroativo (plano v3, ata 22/09/2026). Dados de demonstração — persistência real
  // das solicitações/snapshots é preenchida nas Fases 1 e 10.
  planilhasRetroativasOriginais: "prosaude_planilhas_retroativas_originais",
  notificacoesRetroativo: "prosaude_notificacoes_retroativo",
  consolidacoesRetroativo: "prosaude_consolidacoes_retroativo",
  massaDemoRetroativos: "prosaude_massa_demo_retroativos",
  solicitacoesRetroativas: "prosaude_solicitacoes_retroativas",
  // Fase 10 — Histórico do Fechamento de Pagamento (chave já reservada desde a Fase 0).
  historicoFechamentos: "prosaude_historico_relatorios",
  /** Data simulada do protótipo (limitação de demonstração — ver `dias-uteis.ts`). */
  dataReferenciaPrototipo: "prosaude_data_referencia",
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
  /** Declaração do próprio servidor, no requerimento padrão de primeira inclusão: se ele faz
   *  parte de alguma associação parceira (hoje só ASSEFAZ é oferecida como opção). Não altera
   *  Operadora/Administradora, que continuam preenchidas normalmente — é só um dado a mais. */
  associacaoVinculada?: boolean;
  associacao?: string;
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

/**
 * Fase 10 — Histórico do Fechamento de Pagamento: snapshot IMUTÁVEL do relatório gerado para o
 * NURFI. Substitui de vez o antigo `FechamentoPagamento`/`salvarFechamentoPagamento` (marcador
 * manual de "fechado", já sem uso desde a Fase 9): aquele marcava só um booleano de fechamento;
 * este guarda o próprio conteúdo do relatório, congelado. Mesmo padrão do Retroativo
 * (`SnapshotConsolidacaoRetroativo`, `loadConsolidacoesRetroativo`) — consulta posterior nunca
 * recalcula com dados atuais.
 *
 * Só entram aqui registros **Adimplente ou Inadimplente** (as duas classificações já decididas);
 * "Requer análise" nunca é congelado — ver `gerarRelatorioFechamento` (`fechamento-pagamento.ts`).
 */
export interface LinhaFechamentoSnapshot {
  beneficiarioId: string;
  matricula?: string;
  nome: string;
  situacaoVinculo: BeneficiarioPagamento["situacao"];
  operadoraOuAssociacao: string;
  competencia: string;
  classificacao: "adimplente" | "inadimplente";
  valor: number;
  valorRessarcir: number;
  /** Só quando `classificacao === "inadimplente"`. */
  situacao?: string;
  motivo?: string;
  observacaoNurfi?: string;
  origem: "individual" | "associacao";
}

export interface SnapshotFechamentoPagamento {
  id: string;
  competencia: string;
  /** Sequência dentro da própria competência (podem existir vários: "Julho/2026 nº 1", "nº 2"...). */
  sequencia: number;
  geradoEm: string;
  responsavel: string;
  linhas: LinhaFechamentoSnapshot[];
}

export function loadHistoricoFechamentos(): SnapshotFechamentoPagamento[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.historicoFechamentos);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SnapshotFechamentoPagamento[];
  } catch {
    return [];
  }
}

export function saveHistoricoFechamentos(lista: SnapshotFechamentoPagamento[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.historicoFechamentos, JSON.stringify(lista));
}

/** Observações excepcionais da GERDAB para o NURFI — ver `ObservacaoNurfi` (`mock-data.ts`).
 *  Nunca sobrescreve: cada chamada substitui só o registro daquele par (beneficiário,
 *  competência), mesmo padrão de override-por-chave já usado em outros dados do módulo. */
export function loadObservacoesNurfi(): ObservacaoNurfi[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.observacoesNurfi);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ObservacaoNurfi[];
  } catch {
    return [];
  }
}

export function getObservacaoNurfi(beneficiarioId: string, competencia: string): ObservacaoNurfi | undefined {
  return loadObservacoesNurfi().find((o) => o.beneficiarioId === beneficiarioId && o.competencia === competencia);
}

export function salvarObservacaoNurfi(beneficiarioId: string, competencia: string, texto: string, registradoPor: string) {
  if (typeof window === "undefined") return;
  const atuais = loadObservacoesNurfi().filter(
    (o) => !(o.beneficiarioId === beneficiarioId && o.competencia === competencia),
  );
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.observacoesNurfi,
    JSON.stringify([...atuais, { beneficiarioId, competencia, texto, registradoPor, data: new Date().toISOString() }]),
  );
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

/** Estado da análise de um documento já enviado — mesmo espírito de validação já usado nos
 *  requerimentos/comprovantes (`AcaoComprovante` no Módulo de Pagamento), simplificado para
 *  este fluxo: "aguardando_analise" assim que o documento chega, "aprovado" quando o
 *  analista/gerência aceita, "reenvio_solicitado" quando há falha na leitura/documento
 *  inválido — sempre com justificativa. */
export type AnaliseDocumentoStatus = "aguardando_analise" | "aprovado" | "reenvio_solicitado";

export type ObservacaoGerdab = {
  id: string;
  servidorMatricula: string;
  /** A quem pertence o documento pedido — `"titular"` ou o `id` de um `Dependente`. Só
   *  preenchido em `tipo: "solicitacao_documento"`; permite mostrar, na aba Documentação, de
   *  quem é cada pendência sem misturar beneficiários diferentes do grupo familiar. */
  beneficiarioId?: string;
  /** Nome do beneficiário, denormalizado para exibição sem precisar re-resolver `beneficiarioId`
   *  contra `dependentes`/`servidorAtual` em todo lugar que lista solicitações. */
  beneficiarioNome?: string;
  destino: ObservacaoDestino;
  associacao?: string;
  tipo: ObservacaoTipo;
  documento?: string;
  autor: string;
  cargo: string;
  texto: string;
  criadoEm: string;
  /** Preenchido quando quem recebeu a solicitação (servidor ou associação) envia o documento
   *  pedido — a partir daí a solicitação some dos banners de pendência (Portal do Servidor /
   *  Área da Associação), mas continua existindo no histórico de Observações, agora "atendida". */
  atendidaEm?: string;
  /** A partir daqui, campos da validação do documento já enviado — só fazem sentido depois de
   *  `atendidaEm` preenchido. */
  analiseStatus?: AnaliseDocumentoStatus;
  analisadoPor?: string;
  analisadoCargo?: string;
  analisadoEm?: string;
  /** Obrigatória quando `analiseStatus === "reenvio_solicitado"` — motivo apresentado a quem
   *  enviou (servidor ou associação), ex.: falha na leitura do documento. */
  justificativaReenvio?: string;
};

/** Renomeações de documento aplicadas a bases já persistidas (o nome à esquerda saiu das regras
 *  de negócio e é substituído pelo da direita ao ler/gravar). */
const RENOMEACOES_DOCUMENTO: Record<string, string> = {
  "Atestado de Frequência Escolar": "Comprovante de Matrícula",
};

export function loadObservacoesGerdab(): ObservacaoGerdab[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.observacoesGerdab);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ObservacaoGerdab[];
    let alterou = false;
    const normalizadas = parsed.map((o) => {
      const novoNome = o.documento ? RENOMEACOES_DOCUMENTO[o.documento] : undefined;
      if (!novoNome) return o;
      alterou = true;
      return { ...o, documento: novoNome };
    });
    if (alterou) {
      localStorage.setItem(PROSAUDE_STORAGE_KEYS.observacoesGerdab, JSON.stringify(normalizadas));
    }
    return normalizadas;
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

/** Solicitações de documento em aberto (não atendidas ainda) para um servidor, filtradas pelo
 *  destino — "servidor" alimenta o banner do Portal do Servidor, "associacao" alimenta o banner
 *  da ficha do beneficiário na Área da Associação. Usada por ambos os lados para não duplicar a
 *  lógica de filtro. */
export function getSolicitacoesDocumentoPendentes(
  servidorMatricula: string,
  destino: ObservacaoDestino,
): ObservacaoGerdab[] {
  return loadObservacoesGerdab().filter(
    (o) =>
      o.tipo === "solicitacao_documento" &&
      o.servidorMatricula === servidorMatricula &&
      o.destino === destino &&
      !o.atendidaEm,
  );
}

/** Marca que o documento foi enviado — a partir daqui ele entra na fila de análise do
 *  analista/gerência (`analiseStatus: "aguardando_analise"`), não fica "pronto" sozinho. */
export function marcarObservacaoAtendida(id: string) {
  if (typeof window === "undefined") return;
  const atuais = loadObservacoesGerdab();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.observacoesGerdab,
    JSON.stringify(
      atuais.map((o) =>
        o.id === id
          ? { ...o, atendidaEm: new Date().toISOString(), analiseStatus: "aguardando_analise" as const }
          : o,
      ),
    ),
  );
}

/** Registra a decisão do analista/gerência sobre um documento já enviado — "aprovado" encerra o
 *  ciclo; "reenvio_solicitado" exige justificativa (mostrada a quem enviou) e é sempre
 *  acompanhado, por quem chama esta função, da criação de uma nova solicitação em aberto (ver
 *  `pendencias-documentais.ts`) — o registro atual nunca é apagado nem perde a justificativa,
 *  só deixa de ser "a pendência atual" quando a nova solicitação é criada. */
export function registrarAnaliseObservacao(
  id: string,
  analise: {
    analiseStatus: "aprovado" | "reenvio_solicitado";
    analisadoPor: string;
    analisadoCargo: string;
    justificativaReenvio?: string;
  },
) {
  if (typeof window === "undefined") return;
  const atuais = loadObservacoesGerdab();
  localStorage.setItem(
    PROSAUDE_STORAGE_KEYS.observacoesGerdab,
    JSON.stringify(
      atuais.map((o) =>
        o.id === id
          ? {
              ...o,
              analiseStatus: analise.analiseStatus,
              analisadoPor: analise.analisadoPor,
              analisadoCargo: analise.analisadoCargo,
              analisadoEm: new Date().toISOString(),
              justificativaReenvio: analise.justificativaReenvio,
            }
          : o,
      ),
    ),
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

/**
 * Planilhas mensais enviadas pelas associações/operadoras — nova evolução do fluxo de upload
 * (`associacao.upload.tsx`) + análise/conciliação pela GERDAB (`admin.comprovantes.tsx`, aba
 * "Planilhas - Associações"). Camada de persistência crua (CRUD), na mesma convenção já usada
 * para `ObservacaoGerdab` acima — a lógica de negócio (decidir aprovação, normalizar registros
 * para o Fechamento de Pagamento etc.) vive em `planilhas-associacao.ts`, que consome estas
 * funções, exatamente como `pendencias-documentais.ts` consome `loadObservacoesGerdab`.
 *
 * Uma "planilha" aqui é, na prática, o par (Associação, Competência) — nunca sobrescrita: cada
 * novo envio (inicial ou reenvio após "Correção Solicitada") gera uma nova entrada em `versoes`,
 * preservando as anteriores (decisão P6 — "não sobrescreva silenciosamente a tentativa anterior").
 */
export type StatusPlanilhaAssociacao = "em_analise" | "aprovada" | "correcao_solicitada" | "negada";

export interface RegistroPlanilhaAssociacao {
  servidor: string;
  cpfTitular: string;
  beneficiario: string;
  cpf: string;
  vinculo: string;
  /** Rótulo no arquivo/tela: "Valor Mensal Individual (R$)" — substitui qualquer nomenclatura
   *  genérica de "Valor" no domínio da planilha da associação (modelo oficial aprovado). */
  valor: number;
  /** Novo campo (modelo oficial aprovado) — preservado entre envio, correção, reenvio e
   *  histórico/download de cada versão, exatamente como os demais campos da planilha. */
  operadora: string;
  /** Fase 5 (ata 22/09/2026): modelo da ASSEFAZ traz `Nome do Plano` (categoria do plano) no lugar
   *  de `Operadora do Plano`. Preenchido só em planilhas da ASSEFAZ; nas da ASSETRAN fica ausente
   *  e vale `operadora`. Nunca preenchido pelo outro campo. */
  nomePlano?: string;
  /** Novo campo (modelo oficial aprovado) — data em formato ISO (`AAAA-MM-DD`). Preservada por
   *  versão, mesmo tratamento de `operadora`. Não é a competência do envio (essa é
   *  Associação+Competência, identificando o envio como um todo — nunca uma coluna por linha). */
  dataPagamento: string;
  status: "válido" | "atenção" | "não_elegível";
  motivo?: string;
}

/** Decisão da GERDAB sobre uma versão específica de envio — ausente enquanto a versão ainda
 *  está "Em Análise". */
export interface DecisaoPlanilhaAssociacao {
  status: Exclude<StatusPlanilhaAssociacao, "em_analise">;
  decididoEm: string;
  decididoPor: string;
  /** Obrigatória para "correcao_solicitada" e "negada" (decisão P2); ausente para "aprovada". */
  justificativa?: string;
}

/** Confirmação da conferência financeira (Fase 7, revisão): quais linhas (índices em `registros` desta
 *  versão) a GERDAB manteve selecionadas. Append-only na versão — cada "Confirmar análise" é um novo
 *  evento; a última é a vigente. O arquivo (`registros`) nunca é alterado por essa decisão. */
export interface AnaliseFinanceiraPlanilha {
  concluidaEm: string;
  responsavel: string;
  indicesConsiderados: number[];
}

export interface VersaoPlanilhaAssociacao {
  versao: number;
  enviadoEm: string;
  registros: RegistroPlanilhaAssociacao[];
  decisao?: DecisaoPlanilhaAssociacao;
  /** Trilha das confirmações da conferência financeira desta versão (ver `AnaliseFinanceiraPlanilha`). */
  analises?: AnaliseFinanceiraPlanilha[];
}

/** @deprecated Substituído pela conferência por linha (`AnaliseFinanceiraPlanilha`, Fase 7 revisão) —
 *  mantido só para não quebrar dados antigos eventualmente salvos; não é mais escrito nem lido. */
export type HabilitacaoTitularPlanilha = HabilitacaoRegistro & { cpfTitular: string };

export interface PlanilhaAssociacao {
  id: string;
  associacao: string;
  competencia: string;
  /** @deprecated Modelo antigo (habilitação por titular). Não é mais escrito nem lido. */
  habilitacoes?: HabilitacaoTitularPlanilha[];
  /** Sempre em ordem cronológica — a última é a vigente. Nunca removida/reescrita. */
  versoes: VersaoPlanilhaAssociacao[];
}

export function loadPlanilhasAssociacao(): PlanilhaAssociacao[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.planilhasAssociacao);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlanilhaAssociacao[];
  } catch {
    return [];
  }
}

export function savePlanilhasAssociacao(planilhas: PlanilhaAssociacao[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.planilhasAssociacao, JSON.stringify(planilhas));
}

/**
 * Requerimentos originados pela Área da Associação (ex: ASSETRAN) perante a GERDAB — camada de
 * persistência crua (CRUD), mesma convenção de `PlanilhaAssociacao` acima (a lógica de negócio
 * vive em `requerimentos-associacao.ts`, que consome estas funções).
 *
 * Modelo genérico por `tipo` — nesta rodada só "inclusao_no_plano" (Nova Inclusão) é
 * efetivamente gerado por algum fluxo (`associacao.nova-inclusao.tsx`); os demais valores do
 * enum existem para que Mudança de Plano/Inclusão de Dependente/Exclusão (HU02) possam
 * futuramente reaproveitar a MESMA estrutura de status/decisão/versionamento/notificação, sem
 * precisar de um mecanismo de requerimentos paralelo — nada aqui é exclusivo de Nova Inclusão.
 *
 * Mesmo padrão de versionamento já usado em `PlanilhaAssociacao`: cada submissão (envio inicial
 * ou complementação solicitada pela GERDAB) é uma nova entrada em `versoes`, nunca sobrescreve
 * a anterior; o status atual é sempre derivado da decisão da versão vigente (`decisao?.status`),
 * nunca um campo próprio guardado à parte.
 */
export type TipoRequerimentoAssociacao =
  | "inclusao_no_plano"
  | "mudanca_plano"
  | "inclusao_dependente"
  | "exclusao";

export type StatusRequerimentoAssociacao =
  | "pendente_validacao"
  | "aguardando_complementacao"
  | "aprovado"
  | "negado";

export interface DocumentoRequerimentoAssociacao {
  nome: string;
  categoria: "titular" | "dependente" | "associacao" | "complemento";
  dependenteNome?: string;
}

/** Decisão da GERDAB sobre uma versão específica do requerimento — ausente enquanto a versão
 *  ainda está "Pendente de Validação". */
export interface DecisaoRequerimentoAssociacao {
  status: Exclude<StatusRequerimentoAssociacao, "pendente_validacao">;
  decididoEm: string;
  decididoPor: string;
  /** Obrigatória para "aguardando_complementacao" (o que falta enviar) e "negado" (o motivo);
   *  ausente para "aprovado". */
  justificativa?: string;
}

export interface VersaoRequerimentoAssociacao {
  versao: number;
  enviadoEm: string;
  /** Resumo textual desta versão — no envio inicial, um resumo do titular/dependentes; numa
   *  complementação, o que foi anexado (a lista completa fica em `documentos`). */
  resumo: string;
  documentos: DocumentoRequerimentoAssociacao[];
  decisao?: DecisaoRequerimentoAssociacao;
}

export interface RequerimentoAssociacao {
  id: string;
  associacao: string;
  tipo: TipoRequerimentoAssociacao;
  beneficiarioNome: string;
  /** Preenchido só quando o requerimento já pode ser associado a um beneficiário existente no
   *  cadastro (matrícula) — numa Nova Inclusão o beneficiário ainda não existe, então fica
   *  undefined; é o campo que permitirá, no futuro, a aba "Requerimentos" da ficha
   *  (`associacao.gerenciamento.$id.tsx`) também exibir requerimentos reais deste beneficiário,
   *  sem precisar de outra estrutura. */
  beneficiarioId?: string;
  criadoEm: string;
  /** Sempre em ordem cronológica — a última é a vigente. Nunca removida/reescrita. */
  versoes: VersaoRequerimentoAssociacao[];
}

export function loadRequerimentosAssociacao(): RequerimentoAssociacao[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.requerimentosAssociacao);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RequerimentoAssociacao[];
  } catch {
    return [];
  }
}

export function saveRequerimentosAssociacao(requerimentos: RequerimentoAssociacao[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.requerimentosAssociacao, JSON.stringify(requerimentos));
}

/**
 * Ressarcimento Retroativo (plano v3, ata 22/09/2026) — camada de persistência crua. A lógica de
 * negócio vive em `ressarcimento-retroativo.ts` (mesma separação de `planilhas-associacao.ts`).
 *
 * **Decisões de domínios diferentes têm tipos discriminados separados** (nunca um mesmo tipo nos
 * dois fluxos), todos com a mesma trilha de auditoria (`AuditoriaBase`, append-only):
 *  - `DecisaoCompetencia` (`aprovado`/`negado`) → requerimento retroativo INDIVIDUAL do servidor;
 *  - `HabilitacaoRegistro` (`habilitado`/`desabilitado`) → registro Titular+Competência de
 *    planilha de Associação.
 * A autorização financeira é UM único gate, conforme a origem — nunca os dois.
 */
export type OrigemRetroativo = "individual" | "associacao";

/** Chave de um catálogo PROVISÓRIO (lista final ainda pendente com a stakeholder). */
export type MotivoRessarcimento = string;

export type DecisaoCompetencia = AuditoriaBase & {
  dominio: "competencia_retroativa";
  decisao: "aprovado" | "negado";
};

export type HabilitacaoRegistro = AuditoriaBase & {
  dominio: "registro_planilha";
  /** "habilitado" = habilitação EXPLÍCITA pela GERDAB (nunca o estado inicial: sem decisão o registro está em análise e não entra na Consolidação). */
  decisao: "habilitado" | "desabilitado";
};

export type EventoApuracao = AuditoriaBase & {
  dominio: "apuracao";
  tipo: "valor_pago_registrado" | "valor_devido_validado" | "mes_ano_pagamento_corrigido" | "observacao_complementada" | "contracheque_conferido";
  valorAnterior?: string;
  valorNovo?: string;
};

export interface ComposicaoRegistroRetroativo {
  beneficiario: string;
  cpf: string;
  vinculo: string;
  /** Valor da cobrança/plano informado pela associação, sem juros — NÃO é o Valor Pago do relatório. */
  valorCobranca: number;
  /** Fase 6: `Nome do Plano` (ASSEFAZ) ou `Operadora do Plano` (ASSETRAN), conforme o modelo da associação. */
  plano?: string;
}

/** Tipo de documento anexado a uma competência retroativa — identificação individual, SEM combinações
 *  obrigatórias (casos retroativos podem ter naturezas diferentes; a apuração é manual pela GERDAB).
 *  Não replica as regras documentais/IA do Módulo de Pagamento, mas não impede reaproveitá-las depois. */
export type TipoDocumentoRetroativo =
  | "boleto"
  | "comprovante_pagamento"
  | "recibo"
  | "demonstrativo"
  | "fatura_tecnica"
  | "documento_motivo"
  | "autorizacao"
  | "outro";

/** Arquivo + tipo documental + descrição (só quando aplicável, ex.: "Outro documento"). */
export interface DocumentoRetroativo {
  nome: string;
  tipo: TipoDocumentoRetroativo;
  descricao?: string;
  /** Complementação documental (PROPOSTA a validar com a GERDAB): "original" = enviado na solicitação;
   *  "complementar" = enviado depois, em resposta a um pedido da GERDAB. Ausente = original. */
  origem?: "original" | "complementar";
  anexadoEm?: string;
  anexadoPor?: string;
  /** LIMITAÇÃO DO PROTÓTIPO: conteúdo do arquivo como data URL (só para poder abrir o documento na
   *  demonstração; em produção o arquivo vive em armazenamento próprio). Ausente = documento de demonstração. */
  conteudo?: string;
}

/** Complementação documental — PROPOSTA funcional a validar com a GERDAB (não fechada na reunião).
 *  Trilha append-only por competência: pedido da GERDAB → resposta do servidor. */
export type EventoComplementacao = AuditoriaBase & {
  dominio: "complementacao";
  id: string;
  tipo: "solicitada" | "recebida";
  /** solicitada: o que precisa ser enviado/complementado. */
  texto?: string;
  /** recebida: nomes dos documentos enviados e id do pedido respondido. */
  documentos?: string[];
  respondeA?: string;
};

/** Notificação/indicador do fluxo retroativo (destino Portal do Servidor ou GERDAB). "Lida" nunca
 *  significa "analisada"; a trilha de auditoria da competência é independente e nunca é apagada. */
export interface NotificacaoRetroativo {
  id: string;
  destino: "servidor" | "gerdab";
  solicitacaoId: string;
  competenciaReferencia: string;
  mensagem: string;
  criadaEm: string;
  lida: boolean;
  lidaEm?: string;
}

export interface LinhaConsolidacaoRetroativo {
  solicitacaoId: string;
  competenciaReferencia: string;
  matricula: string;
  nome: string;
  grupo: "ativo" | "inativo";
  mesAnoPagamento: string;
  valorPago: number;
  valorDevido: number;
  valorRessarcir: number;
  observacao: string;
  origem: OrigemRetroativo;
  /** Ciclo operacional (classificação temporal) em que a competência ficou apta. */
  cicloAptidao: string;
}

/** Snapshot IMUTÁVEL de uma consolidação destinada ao NURFI: consultas posteriores nunca recalculam. */
export interface SnapshotConsolidacaoRetroativo {
  id: string;
  /** Ciclo operacional (AAAA-MM) da geração e sequência dentro do ciclo (pode haver mais de uma). */
  ciclo: string;
  sequencia: number;
  geradoEm: string;
  responsavel: string;
  linhas: LinhaConsolidacaoRetroativo[];
}

export interface CompetenciaRetroativa {
  /** "AAAA-MM" — competência de referência. */
  competenciaReferencia: string;
  /** Derivado (referência + 1 mês); só a GERDAB corrige, com `EventoApuracao`. */
  mesAnoPagamento: string;
  documentos: DocumentoRetroativo[];
  /** Só origem associação: soma de `composicao` (valor da cobrança, sem juros). */
  valorCobrancaInformado?: number;
  dataEmissaoBoleto?: string;
  vencimento?: string;
  dataBaixa?: string;
  /** Auxílio efetivamente recebido no contracheque — apurado pela GERDAB (nunca pelo servidor). */
  valorPagoContracheque?: number;
  /** Valor histórico devido — apurado/validado pela GERDAB; sem cálculo a partir do cadastro atual. */
  valorDevido?: number;
  valorDevidoValidado: boolean;
  contrachequeConferido: boolean;
  observacaoComplemento?: string;
  /** Origem individual → `DecisaoCompetencia`; origem associação → `HabilitacaoRegistro`. */
  decisoes: (DecisaoCompetencia | HabilitacaoRegistro)[];
  apuracao: EventoApuracao[];
  /** Complementação documental (proposta): pedidos da GERDAB e respostas do servidor, append-only. */
  complementacoes?: EventoComplementacao[];
  /** Origem associação: linhas de beneficiários que compõem o registro Titular+Competência (só detalhamento). */
  composicao?: ComposicaoRegistroRetroativo[];
}

export interface SolicitacaoRetroativa {
  id: string;
  origem: OrigemRetroativo;
  associacao?: string;
  cpfTitular: string;
  nomeTitular: string;
  /** Um motivo por solicitação — SUPOSIÇÃO sinalizada (pendência: pode variar por competência?). */
  motivo: MotivoRessarcimento;
  justificativa: string;
  autorizacaoExcepcional?: { instancia: string; referenciaDocumento: string };
  criadaEm: string;
  /** Origem associação: planilha retroativa enviada (`PlanilhaRetroativaOriginal`) que comprova este registro. */
  arquivoId?: string;
  competencias: CompetenciaRetroativa[];
}

/** Planilha retroativa enviada por uma Associação — fonte de comprovação dos registros Titular + Competência
 *  que ela contém. LIMITAÇÃO DO PROTÓTIPO: o conteúdo é guardado como data URL só até um limite; sem conteúdo
 *  (massa de demonstração ou arquivo grande) o download é uma reconstrução dos registros normalizados. */
export interface PlanilhaRetroativaOriginal {
  id: string;
  associacao: string;
  nome: string;
  enviadoEm: string;
  conteudo?: string;
}

export function loadPlanilhasRetroativasOriginais(): PlanilhaRetroativaOriginal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.planilhasRetroativasOriginais) ?? "[]") as PlanilhaRetroativaOriginal[];
  } catch {
    return [];
  }
}

export function savePlanilhasRetroativasOriginais(p: PlanilhaRetroativaOriginal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.planilhasRetroativasOriginais, JSON.stringify(p));
}

export function loadSolicitacoesRetroativas(): SolicitacaoRetroativa[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.solicitacoesRetroativas);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SolicitacaoRetroativa[];
  } catch {
    return [];
  }
}

export function saveSolicitacoesRetroativas(solicitacoes: SolicitacaoRetroativa[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.solicitacoesRetroativas, JSON.stringify(solicitacoes));
}

export function loadNotificacoesRetroativo(): NotificacaoRetroativo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.notificacoesRetroativo) ?? "[]") as NotificacaoRetroativo[];
  } catch {
    return [];
  }
}

export function saveNotificacoesRetroativo(n: NotificacaoRetroativo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.notificacoesRetroativo, JSON.stringify(n));
}

export function loadConsolidacoesRetroativo(): SnapshotConsolidacaoRetroativo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.consolidacoesRetroativo) ?? "[]") as SnapshotConsolidacaoRetroativo[];
  } catch {
    return [];
  }
}

export function saveConsolidacoesRetroativo(c: SnapshotConsolidacaoRetroativo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.consolidacoesRetroativo, JSON.stringify(c));
}

export type StatusKey =
  | "pendente"
  | "aprovado"
  | "rejeitado"
  | "inativo"
  | "analise"
  | "ativo"
  | "alerta"
  | "importado"
  | "aguardando_ativacao"
  | "aguardando_validacao"
  | "divergencia";

export const statusLabels: Record<StatusKey, string> = {
  pendente: "Pendente de Validação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  inativo: "Inativo",
  analise: "Em Análise",
  ativo: "Ativo no Sistema",
  alerta: "Requer Atenção",
  importado: "Pré-cadastrado / Importado",
  aguardando_ativacao: "Aguardando Ativação",
  aguardando_validacao: "Aguardando Validação GERDAB",
  divergencia: "Divergência Cadastral",
};

export const regrasProSaude = {
  percentualReembolso: 0.9,
  tetoFamiliar: 4000,
  faseAtual: "Fase 1 — Módulo de Cadastro",
  fases: [
    { nome: "Fase 1", modulo: "Cadastro", status: "Em prototipação", escopo: "Servidores, dependentes, requerimentos, carga inicial, teto e validação GERDAB." },
    { nome: "Fase 2", modulo: "Comprovação", status: "Evolutiva", escopo: "Upload de comprovantes/planilhas, OCR, retroativos, reajustes e alteração de valor." },
    { nome: "Fase 3", modulo: "Relatórios e integrações", status: "Evolutiva", escopo: "Relatório mensal ao NURFI, SEI, FIG e notificações." },
  ],
};

export const calcularReembolso = (valorPlano: number, teto = regrasProSaude.tetoFamiliar) => {
  const base = Math.min(valorPlano, teto);
  return base * regrasProSaude.percentualReembolso;
};

export const servidorAtual = {
  id: "12345678",
  nome: "João da Silva",
  cargo: "Analista de Trânsito",
  matricula: "12345678",
  cpf: "123.456.789-00",
  rg: "2.345.678 SSP/DF",
  dataNascimento: "10/06/1980",
  email: "joao.silva@detran.df.gov.br",
  telefone: "(61) 98765-4321", // legado
  telefoneCelular: "(61) 98765-4321",
  telefoneSetor: "(61) 3344-5566",
  telefoneResidencial: "",
  dataAdmissao: "01/01/2010",
  endereco: "Brasília/DF",
  plano: "Bradesco Saúde",
  tipoPlano: "Coletivo empresarial",
  operadora: "Bradesco Saúde",
  administradora: "Qualicorp",
  ans: "005711",
  associacao: "—",
  processoSEI: "00050.001234/2024-10",
  inicioBeneficio: "01/02/2024",
  tetoFamiliar: regrasProSaude.tetoFamiliar,
  valorPlano: 3190,
  status: "ativo" as StatusKey,
};

export type Dependente = {
  id: string;
  nome: string;
  parentesco:
    | "Cônjuge"
    | "Companheiro(a)"
    | "Filho(a) menor de 21 anos"
    | "Filho(a) maior de 21 e menor de 24 anos"
    | "Filho(a) com invalidez"
    | "Enteado(a)"
    | "Menor tutelado ou sob guarda";
  dataNascimento: string;
  idade: number;
  cpf: string;
  plano: string;
  valor: number;
  status: StatusKey;
  alerta?: string;
};

export const dependentes: Dependente[] = [
  {
    id: "d1",
    nome: "Ana da Silva",
    parentesco: "Cônjuge",
    dataNascimento: "15/03/1985",
    idade: 41,
    cpf: "234.567.890-11",
    plano: "Bradesco (grupo familiar)",
    valor: 890,
    status: "ativo",
  },
  {
    id: "d2",
    nome: "Pedro da Silva",
    parentesco: "Filho(a) menor de 21 anos",
    dataNascimento: "22/08/2017",
    idade: 8,
    cpf: "345.678.901-22",
    plano: "Bradesco (grupo familiar)",
    valor: 450,
    status: "ativo",
  },
  {
    id: "d3",
    nome: "Lucas Souza",
    parentesco: "Filho(a) maior de 21 e menor de 24 anos",
    dataNascimento: "12/11/2002",
    idade: 23,
    cpf: "456.789.012-33",
    plano: "Bradesco (grupo familiar)",
    valor: 450,
    status: "alerta",
    alerta:
      "Pendência documental: Aguardando envio de comprovante de matrícula do semestre atual.",
  },
  {
    id: "d4",
    nome: "Marcos Lima",
    parentesco: "Enteado(a)",
    dataNascimento: "05/01/2010",
    idade: 16,
    cpf: "567.890.123-44",
    plano: "Bradesco (grupo familiar)",
    valor: 450,
    status: "alerta",
    alerta: "Pendência documental anual: Exige envio da declaração de Imposto de Renda para comprovação da dependência.",
  },
];

export type Requerimento = {
  id: string;
  numero: string;
  tipo: "Inclusão no Plano" | "Mudança de Plano" | "Inclusão de Dependente" | "Exclusão" | "Alteração de Valor" | "Ativação de Acesso";
  servidor: string;
  matricula: string;
  detalhe: string;
  abertoEm: string;
  status: StatusKey;
  documentos: string[];
  checklist: string[];
};

export const requerimentos: Requerimento[] = [
  {
    id: "r100",
    numero: "ACT-2026-0882",
    tipo: "Ativação de Acesso",
    servidor: "João da Silva",
    matricula: "12345678",
    detalhe: "Conferência de dados importados (Bradesco Saúde)",
    status: "pendente",
    abertoEm: "Hoje",
    documentos: [],
    checklist: [
      "Dados de contato atualizados",
      "Confirmação de dados importados",
      "Declaração de veracidade aceita"
    ],
  },
  {
    id: "r101",
    numero: "REQ-2026-0051",
    tipo: "Inclusão no Plano",
    servidor: "Ricardo Mendes",
    matricula: "99887766",
    detalhe: "Solicitação inicial de inclusão (SulAmérica)",
    status: "pendente",
    abertoEm: "Hoje",
    documentos: [
      "contrato_plano.pdf",
      "identidade_titular.pdf",
      "ultimo_contracheque.pdf"
    ],
    checklist: [
      "Documento da entidade contratada completo",
      "Identidade do titular legível",
      "Contracheque atualizado",
      "Declarações obrigatórias aceitas"
    ],
  },
  { id: "r1", numero: "REQ-2026-0047", tipo: "Inclusão de Dependente", servidor: "João da Silva", matricula: "12345", detalhe: "Enteado(a), 23 anos — exige IRPF e atenção ao limite de idade", abertoEm: "02/05/2026", status: "pendente", documentos: ["certidao_nascimento.pdf", "irpf_dependente.pdf", "declaracao_plano.pdf"], checklist: ["Parentesco comprovado", "IRPF anexado para enteado", "Valor individual informado", "Dependente consta no contrato/plano"] },
  { id: "r2", numero: "REQ-2026-0046", tipo: "Mudança de Plano", servidor: "Maria Oliveira", matricula: "23456", detalhe: "Exclusão do plano anterior + inclusão do novo plano SulAmérica", abertoEm: "02/05/2026", status: "analise", documentos: ["requerimento_exclusao.pdf", "requerimento_inclusao.pdf", "contrato_novo_plano.pdf"], checklist: ["Processo SEI do auxílio reaberto", "Plano anterior informado", "Novo contrato/declaração anexado", "Vigência dentro da competência"] },
  { id: "r3", numero: "REQ-2026-0045", tipo: "Exclusão", servidor: "Carlos Pereira", matricula: "34567", detalhe: "Exclusão do titular — encerra grupo familiar", abertoEm: "01/05/2026", status: "aprovado", documentos: ["requerimento_exclusao.pdf"], checklist: ["Opção de exclusão do titular marcada", "Data de exclusão informada", "Motivo registrado"] },
  { id: "r4", numero: "REQ-2026-0044", tipo: "Alteração de Valor", servidor: "Fernanda Lima", matricula: "45678", detalhe: "Reajuste anual de R$ 1.850,00 para R$ 2.120,00 — documentação pendente", abertoEm: "30/04/2026", status: "rejeitado", documentos: ["boleto.pdf"], checklist: ["Justificativa de alteração de valor", "Documento da operadora", "Validação GERDAB"] },
];

export const servidoresList = [
  { matricula: "12345", nome: "João da Silva", cargo: "Analista de Trânsito", plano: "Bradesco", associacao: "—", dependentes: 3, valorPlano: 3190, valorAuxilio: calcularReembolso(3190), status: "ativo" as StatusKey },
  { matricula: "23456", nome: "Maria Oliveira", cargo: "Técnico de Trânsito", plano: "SulAmérica", associacao: "Assefaz", dependentes: 1, valorPlano: 1800, valorAuxilio: calcularReembolso(1800), status: "ativo" as StatusKey },
  { matricula: "34567", nome: "Carlos Pereira", cargo: "Agente de Trânsito", plano: "Amil", associacao: "Assetran", dependentes: 0, valorPlano: 900, valorAuxilio: calcularReembolso(900), status: "pendente" as StatusKey },
  { matricula: "45678", nome: "Fernanda Lima", cargo: "Analista de Trânsito", plano: "Bradesco", associacao: "—", dependentes: 3, valorPlano: 5120, valorAuxilio: calcularReembolso(5120), status: "alerta" as StatusKey },
  { matricula: "56789", nome: "Roberto Santos", cargo: "Pensionista Temporário", plano: "CASSI", associacao: "Assetran", dependentes: 1, valorPlano: 1100, valorAuxilio: calcularReembolso(1100), status: "inativo" as StatusKey },
  { matricula: "67890", nome: "Patrícia Costa", cargo: "Pensionista Vitalício", plano: "SulAmérica", associacao: "Assefaz", dependentes: 2, valorPlano: 2500, valorAuxilio: calcularReembolso(2500), status: "ativo" as StatusKey },
];

export const formatCurrency = (v: number) => {
  if (v === undefined || v === null) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Base simulada de servidores já beneficiários (importados da planilha)
export const baseImportadaGerdab = [
  {
    cpf: "123.456.789-00",
    matricula: "12345678",
    nome: "João da Silva",
    dataNascimento: "1980-06-10",
    processoSEI: "00050.001234/2024-10",
    tipoPlano: "Coletivo empresarial",
    operadora: "Bradesco Saúde",
    valorTitular: 1200.00,
    dependentes: [
      { nome: "Ana da Silva", parentesco: "Cônjuge", valor: 890.00 },
      { nome: "Pedro da Silva", parentesco: "Filho(a) menor de 21 anos", valor: 450.00 },
    ]
  },
  {
    cpf: "234.567.890-11",
    matricula: "87654321",
    nome: "Maria Oliveira",
    dataNascimento: "1985-03-15",
    processoSEI: "00050.005678/2024-20",
    tipoPlano: "Individual",
    operadora: "SulAmérica",
    valorTitular: 1800.00,
    dependentes: []
  }
];

/** ===== MÓDULO DE PAGAMENTO (Etapa 2) ===== */

export type StatusComprovante =
  | 'processando'
  | 'ilegivel'
  | 'revisao'
  | 'em_analise'
  | 'correcao_solicitada'
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'recusado'
  | 'retroativo_aguardando_aprovacao'
  /** @deprecated Legado da 2ª alçada obrigatória (removida) — mantido só para exibir
   *  registros antigos já persistidos; nenhum código novo produz estes 3 valores. */
  | 'retroativo_aguardando_analista'
  | 'retroativo_aguardando_gerencia'
  | 'retroativo_devolvido'
  | 'retroativo_aprovado'
  | 'retroativo_recusado';

export interface CampoExtraido {
  chave:
    | 'nome'
    | 'cpf'
    | 'operadora'
    | 'competencia'
    | 'vencimento'
    | 'valor'
    | 'dataPagamento'
    | 'pagador';
  valor: string;
  origem: 'ocr' | 'manual';
  confianca: 'alta' | 'media' | 'nenhuma';
  /** Nome do arquivo (dentre os anexados ao envio) que originou este campo — permite ao
   *  Servidor/Analista/Gerência ver de qual documento cada informação veio. */
  arquivoOrigem?: string;
}

/**
 * Situações que a IA identifica automaticamente a partir do documento e que tornam o gasto
 * não reembolsável pelo Pró-Saúde — não são mais um `CampoExtraido` editável (como era
 * `tipoAssistencia`), e sim um alerta calculado, exibido como banner para Servidor, Analista
 * e Gerência (ver `getElegibilidade`/`getSituacaoNaoReembolsavel`, `comprovante-status.ts`).
 * No protótipo a detecção é por nome de arquivo; no sistema real seria pelo conteúdo do documento.
 */
export type SituacaoNaoReembolsavel = 'odontologico' | 'multa' | 'taxa_administrativa' | 'juros';

export const situacaoNaoReembolsavelLabels: Record<SituacaoNaoReembolsavel, string> = {
  odontologico: 'Assistência odontológica',
  multa: 'Multa',
  taxa_administrativa: 'Taxa administrativa',
  juros: 'Juros/encargos',
};

/** Tipos documentais que um arquivo anexado pode representar — um mesmo arquivo pode
 *  conter mais de um (ex: fatura técnica que já inclui o comprovante de pagamento). */
export type TipoDocumentoArquivo =
  | 'fatura_tecnica'
  | 'comprovante_pagamento'
  | 'boleto'
  | 'recibo'
  | 'demonstrativo';

export const tipoDocumentoArquivoLabels: Record<TipoDocumentoArquivo, string> = {
  fatura_tecnica: 'Fatura Técnica',
  comprovante_pagamento: 'Comprovante de Pagamento',
  boleto: 'Boleto',
  recibo: 'Recibo',
  demonstrativo: 'Demonstrativo de Pagamento',
};

/** Um tipo documental detectado dentro de um arquivo, com os beneficiários que ele cobre.
 *  `beneficiarioIds` ausente = cobre todos os beneficiários selecionados no envio. Nenhum tipo
 *  documental é obrigatoriamente individual — Recibo e Demonstrativo também podem listar mais
 *  de 1 beneficiário, dependendo do que o documento real traz (ver `getCoberturaDocumental`). */
export interface DocumentoDetectado {
  tipo: TipoDocumentoArquivo;
  beneficiarioIds?: string[];
}

/** Um arquivo anexado a um envio — pode conter mais de um documento/tipo (ex: um único PDF
 *  que é ao mesmo tempo Fatura Técnica e Comprovante de Pagamento), cada um com sua própria
 *  cobertura de beneficiários. */
export interface ArquivoAnexado {
  nome: string;
  documentos: DocumentoDetectado[];
}

/** Lista simples dos tipos marcados num arquivo — para exibição, sem cobertura por beneficiário. */
export function tiposDoArquivo(arquivo: { documentos: DocumentoDetectado[] }): TipoDocumentoArquivo[] {
  return arquivo.documentos.map((d) => d.tipo);
}

/**
 * Fallback usado apenas antes de qualquer beneficiário ser selecionado no wizard de envio
 * (`servidor.pagamentos.enviar.tsx`). A partir da seleção, a modalidade de plano que restringe
 * os tipos de documento vem do grupo de beneficiários escolhido (`BeneficiarioPagamento.modalidadePlano`),
 * não mais de um valor único e global do sistema — ver seção 6 de docs/MODULO_PAGAMENTO.md.
 */
export const tipoPlanoPagamentoPadrao: 'empresarial' | 'individual_familiar' = 'individual_familiar';

export const tiposDocumentoPorPlano: Record<'empresarial' | 'individual_familiar', TipoDocumentoArquivo[]> = {
  empresarial: ['fatura_tecnica', 'comprovante_pagamento'],
  individual_familiar: ['boleto', 'recibo', 'demonstrativo', 'comprovante_pagamento'],
};

export const modalidadePlanoLabels: Record<'empresarial' | 'individual_familiar', string> = {
  empresarial: 'Empresarial',
  individual_familiar: 'Individual/Familiar',
};

/** Registro de uma ação tomada sobre o comprovante (ou sobre um beneficiário específico dele). */
export interface AcaoComprovante {
  etapa: 'servidor' | 'analista' | 'gerencia';
  acao:
    | 'aprovado'
    | 'aprovado_com_ressalva'
    | 'correcao_solicitada'
    | 'recusado'
    | 'documento_substituido'
    | 'reenviado'
    | 'devolvido_analista'
    | 'documento_complementar_solicitado';
  aprovadoPor: string;
  data: string;
  motivo?: string;
  comentario?: string;
  /** Presente quando a ação se refere a apenas 1 beneficiário de um comprovante multi-beneficiário. */
  beneficiarioId?: string;
}

/** Pedido do Analista/Gerência por um documento adicional (não uma correção do documento
 *  atual) — ex: solicitação de documento complementar pela GERDAB. Não altera o `status`. */
export interface SolicitacaoComplementar {
  motivo: string;
  solicitadoPor: string;
  data: string;
}

/** Status individual de cada beneficiário dentro de um comprovante multi-beneficiário (fatura técnica). */
export interface StatusBeneficiarioComprovante {
  beneficiarioId: string;
  status: StatusComprovante;
  comentario?: string;
}

export interface Comprovante {
  id: string;
  /** Um envio pode ter mais de um arquivo complementar (ex: fatura técnica + comprovante de pagamento). */
  arquivos: ArquivoAnexado[];
  beneficiarioIds: string[];
  competencia: string;
  isRetroativo: boolean;
  justificativaAtraso?: string;
  /** Campos extraídos do documento — usado quando há 1 único beneficiário. */
  camposExtraidos: CampoExtraido[];
  /** Usado quando `beneficiarioIds.length > 1` (ex: fatura técnica) — 1 conjunto de campos por beneficiário. */
  gruposExtraidos?: { beneficiarioId: string; campos: CampoExtraido[] }[];
  /** Justificativas do Servidor quando o valor extraído diverge do valor cadastrado — 1 por
   *  beneficiário divergente, obrigatória (≥3 palavras) antes de confirmar aquele beneficiário. */
  justificativasDivergencia?: { beneficiarioId: string; texto: string }[];
  /** Status geral do comprovante (fila, badges). Em comprovantes multi-beneficiário, é derivado de `statusPorBeneficiario`. */
  status: StatusComprovante;
  /** Usado quando `beneficiarioIds.length > 1` — permite aprovar/corrigir cada beneficiário individualmente. */
  statusPorBeneficiario?: StatusBeneficiarioComprovante[];
  /** Versões anteriores do arquivo — preservadas ao substituir (ilegível) ou reenviar (correção solicitada). */
  versoesAnteriores?: { arquivo: string; dataEnvio: string; status: StatusComprovante }[];
  /** Pedido ativo do Analista/Gerência por um documento complementar — não altera `status`;
   *  removido automaticamente quando um novo documento chega para o beneficiário/competência. */
  solicitacaoComplementar?: SolicitacaoComplementar;
  aprovacoes: AcaoComprovante[];
  dataEnvio: string;
}

export const statusComprovanteLabels: Record<StatusComprovante, string> = {
  'processando': 'Processando',
  'ilegivel': 'Documento Ilegível',
  'revisao': 'Em Revisão',
  'em_analise': 'Em Análise',
  'correcao_solicitada': 'Correção Solicitada',
  'aprovado': 'Aprovado',
  'aprovado_com_ressalva': 'Aprovado com Ressalva',
  'recusado': 'Recusado',
  'retroativo_aguardando_aprovacao': 'Retroativo — Aguardando Aprovação',
  'retroativo_aguardando_analista': 'Retroativo — Aguardando Analista (legado)',
  'retroativo_aguardando_gerencia': 'Retroativo — Aguardando Gerência (legado)',
  'retroativo_devolvido': 'Retroativo — Devolvido (legado)',
  'retroativo_aprovado': 'Retroativo Aprovado',
  'retroativo_recusado': 'Retroativo Recusado',
};

export const statusComprovanteCore: Record<StatusComprovante, { bg: string; fg: string }> = {
  'processando': { bg: '#fef3c7', fg: '#b45309' },
  'ilegivel': { bg: '#fee2e2', fg: '#dc2626' },
  'revisao': { bg: '#fef3c7', fg: '#b45309' },
  'em_analise': { bg: '#fef3c7', fg: '#b45309' },
  'correcao_solicitada': { bg: '#fef3c7', fg: '#b45309' },
  'aprovado': { bg: '#dcfce7', fg: '#166534' },
  'aprovado_com_ressalva': { bg: '#fef3c7', fg: '#b45309' },
  'recusado': { bg: '#fee2e2', fg: '#dc2626' },
  'retroativo_aguardando_aprovacao': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_aguardando_analista': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_aguardando_gerencia': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_devolvido': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_aprovado': { bg: '#dcfce7', fg: '#166534' },
  'retroativo_recusado': { bg: '#fee2e2', fg: '#dc2626' },
};

/**
 * Cenário de referência do Módulo de Pagamento (Carlos Eduardo Ramos e grupo familiar).
 * Independente de `servidorAtual`/`dependentes` (usados no Módulo de Cadastro) — mantém
 * o escopo do pagamento isolado, sem alterar dados de outros módulos.
 */
export interface BeneficiarioPagamento {
  id: string;
  nome: string;
  parentesco: 'Titular' | 'Cônjuge' | 'Filho';
  operadora: string;
  valorCadastrado: number;
  situacao: 'ativo' | 'pendente_documentacao' | 'inativo';
  /** Modalidade do plano deste beneficiário — determina a exigência documental do grupo de
   *  envio que ele integra (Etapa 3). Não é mais um valor único e global do sistema. */
  modalidadePlano: 'empresarial' | 'individual_familiar';
  /** Quando presente, este beneficiário tem comprovação coletiva feita pela associação —
   *  não participa de envio individual, não entra em checklist de pendência, e não aparece
   *  no alerta de "competência incompleta". Independente de `servidorAtual.associacao`
   *  (Módulo de Cadastro), que cobre o titular inteiro; aqui é por beneficiário. */
  associacao?: string;
}

/**
 * Cenário de referência "de fábrica": Carlos e Marina compartilham operadora e modalidade
 * (formam 1 grupo de envio); Pedro está vinculado a uma associação (comprovação coletiva,
 * excluído do envio individual sem bloquear Carlos/Marina). Demonstra automaticamente o
 * padrão "titular em operadora normal + dependente em associação" — ver docs/MODULO_PAGAMENTO.md
 * para como editar estes registros e demonstrar os outros 2 padrões descritos pelo stakeholder.
 */
export const beneficiariosPagamento: BeneficiarioPagamento[] = [
  { id: 'ben-titular', nome: 'Carlos Eduardo Ramos', parentesco: 'Titular', operadora: 'Assefaz', valorCadastrado: 420, situacao: 'ativo', modalidadePlano: 'individual_familiar' },
  { id: 'ben-conjuge', nome: 'Marina Ramos', parentesco: 'Cônjuge', operadora: 'Assefaz', valorCadastrado: 310, situacao: 'ativo', modalidadePlano: 'individual_familiar' },
  { id: 'ben-filho', nome: 'Pedro Ramos', parentesco: 'Filho', operadora: 'Assefaz', valorCadastrado: 310, situacao: 'ativo', modalidadePlano: 'individual_familiar', associacao: 'Assetran' },
];

export const analistaReferencia = "Sarah Santos";
export const gerenteReferencia = "Francisco";

export const competenciaAtual = "2026-07";
export const competenciaRetroativa = "2026-05";

/** Competências já fechadas (anteriores à atual) elegíveis para envio retroativo. */
export const competenciasFechadas = ["2026-04", "2026-05", "2026-06"];

/** Registro de que o servidor concluiu a montagem do envio daquela competência. */
export interface ConclusaoCompetencia {
  competencia: string;
  concluidoEm: string;
}

/** Registro de que o servidor optou conscientemente por seguir sem o comprovante de um beneficiário. */
export interface BeneficiarioDispensado {
  beneficiarioId: string;
  competencia: string;
  motivo: "continuar_sem_comprovante";
  data: string;
}

const nomesMeses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const nome = nomesMeses[Number(mes) - 1] ?? mes;
  return `${nome}/${ano}`;
}

export const comprovantes: Comprovante[] = [
  // Exemplo 1: individual aprovado
  {
    id: "comp001",
    arquivos: [{ nome: "boleto_julho_carlos.pdf", documentos: [{ tipo: "boleto" }] }],
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'operadora', valor: 'Assefaz', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '420.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'vencimento', valor: '10/07/2026', origem: 'ocr', confianca: 'media' },
    ],
    status: 'aprovado',
    aprovacoes: [
      { etapa: 'analista', acao: 'aprovado', aprovadoPor: 'Sarah Santos', data: '2026-08-01', comentario: 'Campos conferidos' }
    ],
    dataEnvio: '2026-08-01T09:30:00Z',
  },
  // Exemplo 2: em análise
  {
    id: "comp002",
    arquivos: [{ nome: "recibo_julho_marina.pdf", documentos: [{ tipo: "recibo" }] }],
    beneficiarioIds: ["ben-conjuge"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Marina Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '234.567.890-11', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '310.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'vencimento', valor: '08/07/2026', origem: 'ocr', confianca: 'media' },
    ],
    status: 'em_analise',
    aprovacoes: [],
    dataEnvio: '2026-08-02T14:15:00Z',
  },
  // Exemplo 3: ilegível com opção de reenvio
  {
    id: "comp003",
    arquivos: [{ nome: "boleto_julho_pedro_ilegivel.pdf", documentos: [{ tipo: "boleto" }] }],
    beneficiarioIds: ["ben-filho"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [],
    status: 'ilegivel',
    aprovacoes: [],
    dataEnvio: '2026-08-03T11:00:00Z',
  },
  // Exemplo 4: retroativo aguardando analista
  {
    id: "comp004",
    arquivos: [{ nome: "recibo_maio_carlos_retroativo.pdf", documentos: [{ tipo: "recibo" }] }],
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaRetroativa,
    isRetroativo: true,
    justificativaAtraso: 'Comprovante foi enviado pelo banco com atraso no mês anterior',
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-05', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '420.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'vencimento', valor: '08/05/2026', origem: 'ocr', confianca: 'media' },
    ],
    status: 'retroativo_aguardando_aprovacao',
    aprovacoes: [],
    dataEnvio: '2026-08-04T10:00:00Z',
  },
  // Exemplo 5: retroativo com divergência de valor
  {
    id: "comp005",
    arquivos: [{ nome: "demonstrativo_julho_carlos_divergente.pdf", documentos: [{ tipo: "demonstrativo" }] }],
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '520.00', origem: 'ocr', confianca: 'alta' }, // Divergente do cadastrado (420)
      { chave: 'vencimento', valor: '10/07/2026', origem: 'ocr', confianca: 'media' },
    ],
    status: 'em_analise',
    aprovacoes: [],
    dataEnvio: '2026-08-05T09:45:00Z',
  },
];

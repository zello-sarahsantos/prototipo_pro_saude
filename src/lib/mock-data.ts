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
  | 'retroativo_aguardando_analista'
  | 'retroativo_aguardando_gerencia'
  | 'retroativo_aprovado';

export interface CampoExtraido {
  chave: 'nome' | 'cpf' | 'operadora' | 'competencia' | 'valor' | 'dataPagamento' | 'banco';
  valor: string;
  origem: 'ocr' | 'manual';
  confianca: 'alta' | 'media' | 'nenhuma';
}

/** Registro de uma ação tomada sobre o comprovante (ou sobre um beneficiário específico dele). */
export interface AcaoComprovante {
  etapa: 'servidor' | 'analista' | 'gerencia';
  acao:
    | 'aprovado'
    | 'aprovado_com_ressalva'
    | 'correcao_solicitada'
    | 'recusado'
    | 'documento_substituido'
    | 'reenviado';
  aprovadoPor: string;
  data: string;
  motivo?: string;
  comentario?: string;
  /** Presente quando a ação se refere a apenas 1 beneficiário de um comprovante multi-beneficiário. */
  beneficiarioId?: string;
}

/** Status individual de cada beneficiário dentro de um comprovante multi-beneficiário (fatura técnica). */
export interface StatusBeneficiarioComprovante {
  beneficiarioId: string;
  status: StatusComprovante;
  comentario?: string;
}

export interface Comprovante {
  id: string;
  arquivo: string;
  tipoDocumento: 'boleto_individual' | 'recibo' | 'demonstrativo' | 'fatura_tecnica';
  beneficiarioIds: string[];
  competencia: string;
  isRetroativo: boolean;
  justificativaAtraso?: string;
  /** Campos extraídos do documento — usado quando há 1 único beneficiário. */
  camposExtraidos: CampoExtraido[];
  /** Usado quando `beneficiarioIds.length > 1` (ex: fatura técnica) — 1 conjunto de campos por beneficiário. */
  gruposExtraidos?: { beneficiarioId: string; campos: CampoExtraido[] }[];
  /** Preenchida quando o valor extraído diverge do valor cadastrado do beneficiário. */
  justificativaDivergencia?: string;
  /** Status geral do comprovante (fila, badges). Em comprovantes multi-beneficiário, é derivado de `statusPorBeneficiario`. */
  status: StatusComprovante;
  /** Usado quando `beneficiarioIds.length > 1` — permite aprovar/corrigir cada beneficiário individualmente. */
  statusPorBeneficiario?: StatusBeneficiarioComprovante[];
  /** Versões anteriores do arquivo — preservadas ao substituir (ilegível) ou reenviar (correção solicitada). */
  versoesAnteriores?: { arquivo: string; dataEnvio: string; status: StatusComprovante }[];
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
  'retroativo_aguardando_analista': 'Retroativo — Aguardando Analista',
  'retroativo_aguardando_gerencia': 'Retroativo — Aguardando Gerência',
  'retroativo_aprovado': 'Retroativo Aprovado',
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
  'retroativo_aguardando_analista': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_aguardando_gerencia': { bg: '#ede9fe', fg: '#6d28d9' },
  'retroativo_aprovado': { bg: '#dcfce7', fg: '#166534' },
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
}

export const beneficiariosPagamento: BeneficiarioPagamento[] = [
  { id: 'ben-titular', nome: 'Carlos Eduardo Ramos', parentesco: 'Titular', operadora: 'Assefaz', valorCadastrado: 420, situacao: 'ativo' },
  { id: 'ben-conjuge', nome: 'Marina Ramos', parentesco: 'Cônjuge', operadora: 'Assefaz', valorCadastrado: 310, situacao: 'ativo' },
  { id: 'ben-filho', nome: 'Pedro Ramos', parentesco: 'Filho', operadora: 'Assefaz', valorCadastrado: 310, situacao: 'ativo' },
];

export const analistaReferencia = "Sarah Santos";
export const gerenteReferencia = "Francisco";

export const competenciaAtual = "2026-07";
export const competenciaRetroativa = "2026-05";

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
    arquivo: "boleto_julho_carlos.pdf",
    tipoDocumento: "boleto_individual",
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'operadora', valor: 'Assefaz', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '420.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'dataPagamento', valor: '31/07/2026', origem: 'ocr', confianca: 'media' },
      { chave: 'banco', valor: 'Banco do Brasil', origem: 'ocr', confianca: 'alta' },
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
    arquivo: "recibo_julho_marina.pdf",
    tipoDocumento: "recibo",
    beneficiarioIds: ["ben-conjuge"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Marina Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '234.567.890-11', origem: 'ocr', confianca: 'alta' },
      { chave: 'operadora', valor: 'Assefaz', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '310.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'dataPagamento', valor: '28/07/2026', origem: 'ocr', confianca: 'media' },
      { chave: 'banco', valor: 'Banco Bradesco', origem: 'ocr', confianca: 'alta' },
    ],
    status: 'em_analise',
    aprovacoes: [],
    dataEnvio: '2026-08-02T14:15:00Z',
  },
  // Exemplo 3: ilegível com opção de reenvio
  {
    id: "comp003",
    arquivo: "boleto_julho_pedro_ilegivel.pdf",
    tipoDocumento: "boleto_individual",
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
    arquivo: "recibo_maio_carlos_retroativo.pdf",
    tipoDocumento: "recibo",
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaRetroativa,
    isRetroativo: true,
    justificativaAtraso: 'Comprovante foi enviado pelo banco com atraso no mês anterior',
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'operadora', valor: 'Assefaz', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-05', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '420.00', origem: 'ocr', confianca: 'alta' },
      { chave: 'dataPagamento', valor: '30/05/2026', origem: 'ocr', confianca: 'media' },
      { chave: 'banco', valor: 'Caixa Econômica', origem: 'ocr', confianca: 'alta' },
    ],
    status: 'retroativo_aguardando_analista',
    aprovacoes: [],
    dataEnvio: '2026-08-04T10:00:00Z',
  },
  // Exemplo 5: retroativo com divergência de valor
  {
    id: "comp005",
    arquivo: "demonstrativo_julho_carlos_divergente.pdf",
    tipoDocumento: "demonstrativo",
    beneficiarioIds: ["ben-titular"],
    competencia: competenciaAtual,
    isRetroativo: false,
    camposExtraidos: [
      { chave: 'nome', valor: 'Carlos Eduardo Ramos', origem: 'ocr', confianca: 'alta' },
      { chave: 'cpf', valor: '123.456.789-00', origem: 'ocr', confianca: 'alta' },
      { chave: 'operadora', valor: 'Assefaz', origem: 'ocr', confianca: 'alta' },
      { chave: 'competencia', valor: '2026-07', origem: 'ocr', confianca: 'alta' },
      { chave: 'valor', valor: '520.00', origem: 'ocr', confianca: 'alta' }, // Divergente do cadastrado (420)
      { chave: 'dataPagamento', valor: '31/07/2026', origem: 'ocr', confianca: 'media' },
      { chave: 'banco', valor: 'Banco do Brasil', origem: 'ocr', confianca: 'alta' },
    ],
    status: 'em_analise',
    aprovacoes: [],
    dataEnvio: '2026-08-05T09:45:00Z',
  },
];

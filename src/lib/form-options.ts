/** Operadoras disponíveis na solicitação inicial e inclusão de dependente. */
export const OPERADORAS = [
  "ALLCARE",
  "AMIL",
  "ASSEFAZ / OUTRO CONVÊNIO",
  "BB SEG / SULAMÉRICA",
  "BRADESCO",
  "BRADESCO / ALLCARE",
  "BRADESCO / ELO",
  "BRADESCO / EMPRESARIAL",
  "BRADESCO / QUALICORP",
  "CASSI",
  "CASSI / FAMÍLIA",
  "CEAM BRASIL",
  "EASYPLAN",
  "HAPVIDA",
  "HAPVIDA / QUALICORP",
  "MEDSENIOR",
  "PORTO SAÚDE - PORTO SEGURO",
  "QUALLITY",
  "SULAMÉRICA",
  "SULAMÉRICA / EMPRESARIAL",
  "SULAMÉRICA / EXTRAMED",
  "SULAMÉRICA / QUALICORP",
  "UNIMED",
  "UNIMED / ALLCARE",
  "UNIMED GOIÂNIA",
  "UNIMED RIO",
  "UNIMED SEG.",
] as const;

export const CARGOS_SERVIDOR = [
  "Agente",
  "Técnico",
  "Assistente/Analista",
  "Especialista",
] as const;

/** Situação do beneficiário titular — vocabulário canônico e única fonte de verdade,
 *  usado no requerimento de primeira inclusão (`primeiro-acesso.tsx`) e reaproveitado
 *  integralmente pelo Módulo de Relatórios (Visões Gerenciais, `ServidorListItem.situacaoBeneficiarioTitular`
 *  em `mock-data.ts`) — nunca duplicar ou criar variação paralela deste domínio. */
export const SITUACOES_TITULAR = [
  "Servidor efetivo ativo",
  "Servidor efetivo inativo",
  "Servidor comissionado",
  "Titular de pensão vitalícia",
  "Titular de pensão temporária",
] as const;

export const TIPOS_DEPENDENTE = [
  "Cônjuge",
  "Companheiro(a)",
  "Filho(a) menor de 21 anos",
  "Filho(a) maior de 21 e menor de 24 anos",
  "Filho(a) com invalidez",
  "Enteado(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos",
  "Enteado(a) com invalidez",
  "Menor tutelado ou sob guarda",
] as const;

export type TipoDependente = (typeof TIPOS_DEPENDENTE)[number];

/** Documentos obrigatórios por tipo de dependente (conforme instrução). */
export const DOCUMENTOS_POR_TIPO_DEPENDENTE: Record<TipoDependente, readonly string[]> = {
  "Cônjuge": [
    "Certidão de casamento",
    "Documento de identificação pessoal com foto",
  ],
  "Companheiro(a)": [
    "Escritura Pública de União Estável",
    "Documento de identificação pessoal com foto",
  ],
  "Filho(a) menor de 21 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
  ],
  "Filho(a) maior de 21 e menor de 24 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Comprovante de matrícula em instituição do ensino regular",
  ],
  "Filho(a) com invalidez": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Laudo médico emitido por junta médica oficial",
  ],
  "Enteado(a) menor de 21 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Declaração de Imposto de Renda",
  ],
  "Enteado(a) maior de 21 e menor de 24 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Comprovante de matrícula em instituição do ensino regular",
    "Declaração de Imposto de Renda",
  ],
  "Enteado(a) com invalidez": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Laudo médico emitido por junta médica oficial",
    "Declaração de Imposto de Renda",
  ],
  "Menor tutelado ou sob guarda": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Termo de tutela ou termo de guarda",
  ],
};

const TIPOS_COM_LIMITE_24 = new Set<TipoDependente>([
  "Filho(a) menor de 21 anos",
  "Filho(a) maior de 21 e menor de 24 anos",
  "Enteado(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos",
]);

const TIPOS_ESCOLARIDADE_21_24 = new Set<TipoDependente>([
  "Filho(a) maior de 21 e menor de 24 anos",
  "Filho(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos",
  "Enteado(a) menor de 21 anos",
]);

export function calcularIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

export function mostrarAlertaEscolaridadeDependente(tipo: TipoDependente, idade: number): boolean {
  if (idade < 21 || idade >= 24) return false;
  return TIPOS_ESCOLARIDADE_21_24.has(tipo);
}

export function mostrarBloqueioIdade24Dependente(tipo: TipoDependente, idade: number): boolean {
  return idade >= 24 && TIPOS_COM_LIMITE_24.has(tipo);
}

export function tipoDependenteExigeIrpf(tipo: TipoDependente): boolean {
  return tipo.startsWith("Enteado(a)");
}

/** Texto complementar de regra (quando aplicável), exibido acima da lista de documentos. */
export const REGRA_POR_TIPO_DEPENDENTE: Partial<Record<TipoDependente, string>> = {
  "Filho(a) menor de 21 anos": "Regra: Até 21 anos.",
  "Filho(a) maior de 21 e menor de 24 anos":
    "Regra: Até 24 anos se estiver cursando ensino regular. Exige comprovante de matrícula semestral (geralmente em março e agosto).",
  "Filho(a) com invalidez":
    "Regra: Direito permanente sem limite de idade, mediante laudo médico emitido por junta médica oficial.",
  "Enteado(a) menor de 21 anos":
    "Regra: Até 21 anos. Obrigatória a comprovação de dependência econômica via Imposto de Renda.",
  "Enteado(a) maior de 21 e menor de 24 anos":
    "Regra: Até 24 anos se estiver cursando ensino regular. Obrigatória a comprovação de dependência econômica via Imposto de Renda.",
  "Enteado(a) com invalidez":
    "Regra: Direito permanente sem limite de idade, mediante laudo médico. Obrigatória a comprovação de dependência econômica via Imposto de Renda.",
};

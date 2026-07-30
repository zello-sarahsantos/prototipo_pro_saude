const OPERADORAS = [
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
  "UNIMED SEG."
];
const CARGOS_SERVIDOR = [
  "Agente",
  "Técnico",
  "Assistente/Analista",
  "Especialista"
];
const SITUACOES_TITULAR = [
  "Servidor efetivo ativo",
  "Servidor inativo",
  "Servidor comissionado",
  "Titular de pensão vitalícia",
  "Titular de pensão temporária"
];
const TIPOS_DEPENDENTE = [
  "Cônjuge",
  "Companheiro(a)",
  "Filho(a) menor de 21 anos",
  "Filho(a) maior de 21 e menor de 24 anos",
  "Filho(a) com invalidez",
  "Enteado(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos",
  "Enteado(a) com invalidez",
  "Menor tutelado ou sob guarda"
];
const DOCUMENTOS_POR_TIPO_DEPENDENTE = {
  "Cônjuge": [
    "Certidão de casamento",
    "Documento de identificação pessoal com foto"
  ],
  "Companheiro(a)": [
    "Escritura Pública de União Estável",
    "Documento de identificação pessoal com foto"
  ],
  "Filho(a) menor de 21 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto"
  ],
  "Filho(a) maior de 21 e menor de 24 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Comprovante de matrícula em instituição do ensino regular"
  ],
  "Filho(a) com invalidez": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Laudo médico emitido por junta médica oficial"
  ],
  "Enteado(a) menor de 21 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Declaração de Imposto de Renda"
  ],
  "Enteado(a) maior de 21 e menor de 24 anos": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Comprovante de matrícula em instituição do ensino regular",
    "Declaração de Imposto de Renda"
  ],
  "Enteado(a) com invalidez": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Laudo médico emitido por junta médica oficial",
    "Declaração de Imposto de Renda"
  ],
  "Menor tutelado ou sob guarda": [
    "Certidão de nascimento ou documento de identificação pessoal com foto",
    "Termo de tutela ou termo de guarda"
  ]
};
const TIPOS_COM_LIMITE_24 = /* @__PURE__ */ new Set([
  "Filho(a) menor de 21 anos",
  "Filho(a) maior de 21 e menor de 24 anos",
  "Enteado(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos"
]);
const TIPOS_ESCOLARIDADE_21_24 = /* @__PURE__ */ new Set([
  "Filho(a) maior de 21 e menor de 24 anos",
  "Filho(a) menor de 21 anos",
  "Enteado(a) maior de 21 e menor de 24 anos",
  "Enteado(a) menor de 21 anos"
]);
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;
  const hoje = /* @__PURE__ */ new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || m === 0 && hoje.getDate() < nasc.getDate()) {
    idade--;
  }
  return idade;
}
function mostrarAlertaEscolaridadeDependente(tipo, idade) {
  if (idade < 21 || idade >= 24) return false;
  return TIPOS_ESCOLARIDADE_21_24.has(tipo);
}
function mostrarBloqueioIdade24Dependente(tipo, idade) {
  return idade >= 24 && TIPOS_COM_LIMITE_24.has(tipo);
}
const REGRA_POR_TIPO_DEPENDENTE = {
  "Filho(a) menor de 21 anos": "Regra: Até 21 anos.",
  "Filho(a) maior de 21 e menor de 24 anos": "Regra: Até 24 anos se estiver cursando ensino regular. Exige comprovante de matrícula semestral (geralmente em março e agosto).",
  "Filho(a) com invalidez": "Regra: Direito permanente sem limite de idade, mediante laudo médico emitido por junta médica oficial.",
  "Enteado(a) menor de 21 anos": "Regra: Até 21 anos. Obrigatória a comprovação de dependência econômica via Imposto de Renda.",
  "Enteado(a) maior de 21 e menor de 24 anos": "Regra: Até 24 anos se estiver cursando ensino regular. Obrigatória a comprovação de dependência econômica via Imposto de Renda.",
  "Enteado(a) com invalidez": "Regra: Direito permanente sem limite de idade, mediante laudo médico. Obrigatória a comprovação de dependência econômica via Imposto de Renda."
};
export {
  CARGOS_SERVIDOR as C,
  DOCUMENTOS_POR_TIPO_DEPENDENTE as D,
  OPERADORAS as O,
  REGRA_POR_TIPO_DEPENDENTE as R,
  SITUACOES_TITULAR as S,
  TIPOS_DEPENDENTE as T,
  mostrarBloqueioIdade24Dependente as a,
  calcularIdade as c,
  mostrarAlertaEscolaridadeDependente as m
};

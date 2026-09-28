import type { BeneficiarioPagamento } from './mock-data';

// Cadastros de demonstração transcritos dos conjuntos numerados. Não são saída OCR.
function pessoa(id: string, nome: string, parentesco: BeneficiarioPagamento['parentesco'], operadora: string, valor: number, empresarial = false): BeneficiarioPagamento {
  return { id, nome, parentesco, operadora, valorCadastrado: valor, situacao: 'ativo', modalidadePlano: empresarial ? 'empresarial' : 'individual_familiar' };
}
export const personasDocumentos = [
  { id: '1', nome: '1 — Eduardo Germano Krauss Cespedes', detalhe: 'Anexos 1: boleto Uniconsult/Uniplan + comprovante. Valores de referência transcritos do boleto.', beneficiarios: [
    pessoa('doc1-eduardo', 'Eduardo Germano Krauss Cespedes', 'Titular', 'Uniplan', 1637.21),
    pessoa('doc1-jasmilene', 'Jasmilene Rodrigues da Silva', 'Cônjuge', 'Uniplan', 1048.47),
  ] },
  { id: '2', nome: '2 — Joaquim Alberto Peixoto Maia', detalhe: 'Anexos 2: boleto MedSenior + comprovante de pagamento.', beneficiarios: [
    pessoa('doc2-joaquim', 'Joaquim Alberto Peixoto Maia', 'Titular', 'MedSenior', 2150.68),
  ] },
  { id: '3', nome: '3 — Gabriella Emilly de Oliveira Santos', detalhe: 'Anexos 3: boleto Hapvida + comprovante. Gabriella é a pagadora; os beneficiários listados são Benicio e Bernardo. Parentesco não informado. Referência médica por pessoa: R$ 246,43, sem odontologia e reajuste.', beneficiarios: [
    pessoa('doc3-benicio', 'Benicio Ferreira de Oliveirq', 'Beneficiário', 'Hapvida', 246.43),
    pessoa('doc3-bernardo', 'Bernardo Ferreira de Oliveirq', 'Beneficiário', 'Hapvida', 246.43),
  ] },
  { id: '4', nome: '4 — Marcelo Silveira Arraes', detalhe: 'Anexos 4: fatura técnica SulAmérica + comprovante. Pagador do título: D3M Odontologia LTDA. Valores por segurado transcritos da fatura, sem ratear IOF.', beneficiarios: [
    pessoa('doc4-marcelo', 'Marcelo Silveira Arraes', 'Titular', 'SulAmérica', 2070.60, true),
    pessoa('doc4-deborah', 'Deborah Galli Leyser Arraes', 'Cônjuge', 'SulAmérica', 1732.16, true),
    pessoa('doc4-bianca', 'Bianca Leyser Arraes', 'Filho', 'SulAmérica', 811.13, true),
    pessoa('doc4-eduardo', 'Eduardo Leyser Arraes', 'Filho', 'SulAmérica', 811.13, true),
  ] },
];

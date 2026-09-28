export function schemaExtracao(chaves: string[]) {
  const dinheiro = { type: 'string', pattern: '^\\d+\\.\\d{2}$' };
  const dinheiroOpcional = { type: 'string', pattern: '^(|\\d+\\.\\d{2})$' };
  return {
    type: 'object', additionalProperties: false, required: ['legivel', 'tipoIdentificado', 'campos', 'itensFinanceiros', 'beneficiarios', 'comparacoesOperadora'],
    properties: {
      legivel: { type: 'boolean' },
      comparacoesOperadora: { type: 'array', items: { type: 'object', additionalProperties: false,
        required: ['cadastro', 'identificada', 'resultado', 'justificativa'], properties: {
          cadastro: { type: 'string' }, identificada: { type: 'string' },
          resultado: { type: 'string', enum: ['compativel', 'divergente', 'inconclusivo'] }, justificativa: { type: 'string' },
        } } },
      tipoIdentificado: { type: 'string', enum: ['boleto', 'comprovante_pagamento', 'recibo', 'demonstrativo', 'fatura_tecnica', 'indeterminado'] },
      beneficiarios: { type: 'array', items: { type: 'object', additionalProperties: false,
        required: ['nome', 'valor', 'confianca', 'itens'], properties: {
          nome: { type: 'string' }, tipoBeneficiario: { type: 'string' }, plano: { type: 'string' }, evidenciaCobertura: { type: 'string' }, valor: dinheiroOpcional,
          confianca: { type: 'string', enum: ['alta', 'media', 'nenhuma'] },
          itens: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['descricao', 'valor', 'classificacao'], properties: {
            descricao: { type: 'string' }, valor: dinheiro,
            classificacao: { type: 'string', enum: ['plano_saude', 'odontologico', 'desconto', 'abatimento', 'multa', 'juros', 'taxa_administrativa', 'iof'] },
          } } },
        } } },
      campos: { type: 'object', additionalProperties: false, required: chaves,
        properties: Object.fromEntries(chaves.map(chave => [chave, {
          type: 'object', additionalProperties: false, required: ['valor', 'confianca'],
          properties: { valor: chave === 'valor' ? dinheiroOpcional : { type: 'string' }, confianca: { type: 'string', enum: ['alta', 'media', 'nenhuma'] } },
        }])) },
      itensFinanceiros: { type: 'array', items: { type: 'object', additionalProperties: false,
        required: ['descricao', 'valor', 'classificacao'], properties: {
          descricao: { type: 'string' }, valor: dinheiro,
          classificacao: { type: 'string', enum: ['reembolsavel', 'odontologico', 'multa', 'juros', 'taxa_administrativa', 'iof'] },
        } } },
    },
  };
}

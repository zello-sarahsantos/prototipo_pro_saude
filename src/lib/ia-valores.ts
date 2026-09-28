/** Aceita formatos explícitos; nunca infere separadores ou centavos ausentes. */
export function numeroMonetario(valor: unknown): number {
  const texto = String(valor ?? '').replace(/^R\$\s*/, '').trim();
  let decimal = texto;
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(texto) || /^\d+,\d{2}$/.test(texto)) {
    decimal = texto.replace(/\./g, '').replace(',', '.');
  } else if (!/^\d+(\.\d{1,2})?$/.test(texto)) return NaN;
  const n = Number(decimal);
  return Number.isSafeInteger(Math.round(n * 100)) ? n : NaN;
}

export function validarValores(resultado: any): string[] {
  const erros: string[] = [];
  const conferir = (v: unknown) => Number.isFinite(numeroMonetario(v));
  const total = resultado.campos?.valor?.valor;
  if (total !== undefined && total !== '' && !conferir(total)) erros.push('Total monetário inválido');
  for (const pessoa of resultado.beneficiarios ?? []) {
    if (pessoa.valor !== '' && !conferir(pessoa.valor)) erros.push('Valor individual inválido');
    const itens = pessoa.itens ?? [];
    if (itens.some((i: any) => !conferir(i.valor))) erros.push('Item individual com valor ambíguo');
    const medicos = itens.filter((i: any) => i.classificacao === 'plano_saude');
    if (medicos.length && pessoa.valor !== '' && itens.every((i: any) => i.classificacao === 'plano_saude')) {
      const soma = medicos.reduce((s: number, i: any) => s + Math.round(numeroMonetario(i.valor) * 100), 0);
      if (soma !== Math.round(numeroMonetario(pessoa.valor) * 100)) erros.push('Valor médico diverge dos itens individuais');
    }
  }
  if ((resultado.itensFinanceiros ?? []).some((i: any) => !conferir(i.valor))) erros.push('Item do documento com valor ambíguo');
  return [...new Set(erros)];
}

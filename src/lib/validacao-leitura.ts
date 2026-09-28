export function nomesIguais(a: string, b: string): boolean {
  const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
  return normalizar(a) === normalizar(b);
}

export function composicaoConfere(total: number, valores: number[]): boolean {
  if (!Number.isFinite(total) || total <= 0 || !valores.length) return false;
  const centavos = valores.map(v => Math.round(v * 100));
  const alvo = Math.round(total * 100);
  return centavos.every(v => Number.isSafeInteger(v) && v > 0 && v <= alvo)
    && Math.abs(centavos.reduce((a, b) => a + b, 0) - alvo) <= 1;
}

export function nomeAbreviadoCompativel(a: string, b: string): boolean {
  const tokens = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\./g, '').trim().split(/\s+/);
  const x = tokens(a), y = tokens(b);
  return x.length >= 3 && x.length === y.length && x[0] === y[0] && x.at(-1) === y.at(-1)
    && x.every((t, i) => t === y[i] || (t.length === 1 || y[i].length === 1) && t[0] === y[i][0]);
}

export function nomeOCRCompativel(a: string, b: string): boolean {
  const tokens = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\./g, '').trim().split(/\s+/);
  const distancia = (x: string, y: string) => {
    const d = Array.from({ length: y.length + 1 }, (_, i) => i);
    for (let i = 1; i <= x.length; i += 1) {
      let anterior = d[0]; d[0] = i;
      for (let j = 1; j <= y.length; j += 1) {
        const atual = d[j]; d[j] = x[i - 1] === y[j - 1] ? anterior : Math.min(anterior + 1, d[j] + 1, d[j - 1] + 1); anterior = atual;
      }
    }
    return d[y.length];
  };
  const x = tokens(a), y = tokens(b);
  return x.length >= 3 && x.length === y.length && x[0] === y[0] && x.at(-1) === y.at(-1) && x.every((t, i) => t === y[i] || distancia(t, y[i]) <= 1);
}

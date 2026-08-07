/** `true` quando o texto tem pelo menos `n` palavras — usado para exigir justificativas
 *  minimamente descritivas (retroativo, divergência de valor), não só "não vazias". */
export function temPeloMenosNPalavras(texto: string, n = 3): boolean {
  return texto.trim().split(/\s+/).filter(Boolean).length >= n;
}

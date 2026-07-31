import type { BeneficiarioPagamento, CampoExtraido } from "./mock-data";

/**
 * Simula a extração OCR/IA a partir do nome do arquivo — convenção também usada nos
 * comprovantes de exemplo (`mock-data.ts`): incluir "ilegivel" ou "divergente" no nome
 * do arquivo permite demonstrar esses fluxos de forma determinística no protótipo.
 */
export function arquivoEhIlegivel(nomeArquivo: string): boolean {
  return nomeArquivo.toLowerCase().includes("ilegivel");
}

function arquivoEhDivergente(nomeArquivo: string): boolean {
  return nomeArquivo.toLowerCase().includes("divergente");
}

const bancos = ["Banco do Brasil", "Caixa Econômica", "Bradesco", "Itaú"];

export function gerarCamposExtraidos(
  beneficiario: BeneficiarioPagamento,
  competencia: string,
  nomeArquivo: string,
): CampoExtraido[] {
  const divergente = arquivoEhDivergente(nomeArquivo);
  const valor = divergente ? beneficiario.valorCadastrado + 100 : beneficiario.valorCadastrado;
  const [ano, mes] = competencia.split("-");
  const dataPagamento = `28/${mes}/${ano}`;

  return [
    { chave: "nome", valor: beneficiario.nome, origem: "ocr", confianca: "alta" },
    { chave: "operadora", valor: beneficiario.operadora, origem: "ocr", confianca: "alta" },
    { chave: "competencia", valor: competencia, origem: "ocr", confianca: "media" },
    { chave: "valor", valor: valor.toFixed(2), origem: "ocr", confianca: divergente ? "media" : "alta" },
    { chave: "dataPagamento", valor: dataPagamento, origem: "ocr", confianca: "media" },
    { chave: "banco", valor: bancos[nomeArquivo.length % bancos.length], origem: "ocr", confianca: "nenhuma" },
  ];
}

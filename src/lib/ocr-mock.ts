import { beneficiariosPagamento, type BeneficiarioPagamento, type CampoExtraido } from "./mock-data";

const titularPagamento = beneficiariosPagamento.find((b) => b.parentesco === "Titular");

/**
 * Simula a extração OCR/IA a partir do nome do arquivo — convenção também usada nos
 * comprovantes de exemplo (`mock-data.ts`): incluir "ilegivel", "divergente" ou "incompleto"
 * no nome do arquivo permite demonstrar esses fluxos de forma determinística no protótipo.
 */
export function arquivoEhIlegivel(nomeArquivo: string): boolean {
  return nomeArquivo.toLowerCase().includes("ilegivel");
}

function arquivoEhDivergente(nomeArquivo: string): boolean {
  return nomeArquivo.toLowerCase().includes("divergente") && !nomeArquivo.toLowerCase().includes("pagador");
}

/** O pagamento deve ter sido feito pelo titular — simula um comprovante com pagador diferente. */
function arquivoTemPagadorDivergente(nomeArquivo: string): boolean {
  const nome = nomeArquivo.toLowerCase();
  return nome.includes("pagador_divergente") || nome.includes("pagador-divergente");
}

/**
 * Simula uma extração parcial da IA (nome e valor não identificados) para um beneficiário
 * específico dentro de uma fatura técnica. `"incompleto"` sozinho no nome afeta todos os
 * beneficiários do documento; `"incompleto_<primeironome>"` (ex: "incompleto_pedro") afeta
 * somente aquele beneficiário, permitindo simular fatura técnica com 1 pendência isolada.
 */
export function arquivoEhIncompleto(nomeArquivo: string, beneficiario: BeneficiarioPagamento): boolean {
  const nome = nomeArquivo.toLowerCase();
  if (!nome.includes("incompleto")) return false;
  const primeiroNome = beneficiario.nome.split(" ")[0].toLowerCase();
  const direcionado = nome.includes(`incompleto_${primeiroNome}`) || nome.includes(`incompleto-${primeiroNome}`);
  const generico = nome.includes("incompleto") && !/incompleto[_-]\w+/.test(nome);
  return direcionado || generico;
}

const bancos = ["Banco do Brasil", "Caixa Econômica", "Bradesco", "Itaú"];

export function gerarCamposExtraidos(
  beneficiario: BeneficiarioPagamento,
  competencia: string,
  nomeArquivo: string,
): CampoExtraido[] {
  const divergente = arquivoEhDivergente(nomeArquivo);
  const incompleto = arquivoEhIncompleto(nomeArquivo, beneficiario);
  const pagadorDivergente = arquivoTemPagadorDivergente(nomeArquivo);
  const valor = divergente ? beneficiario.valorCadastrado + 100 : beneficiario.valorCadastrado;
  const [ano, mes] = competencia.split("-");
  const dataPagamento = `28/${mes}/${ano}`;

  // O pagamento deve ter sido feito pelo titular, independentemente de quem é o beneficiário do plano.
  const nomePagador = pagadorDivergente
    ? beneficiario.parentesco === "Titular"
      ? "Terceiro Pagador"
      : beneficiario.nome
    : titularPagamento?.nome ?? beneficiario.nome;

  return [
    {
      chave: "nome",
      valor: incompleto ? "" : beneficiario.nome,
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : "alta",
    },
    { chave: "operadora", valor: beneficiario.operadora, origem: "ocr", confianca: "alta" },
    { chave: "competencia", valor: competencia, origem: "ocr", confianca: "media" },
    {
      chave: "valor",
      valor: incompleto ? "" : valor.toFixed(2),
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : divergente ? "media" : "alta",
    },
    { chave: "dataPagamento", valor: dataPagamento, origem: "ocr", confianca: "media" },
    { chave: "banco", valor: bancos[nomeArquivo.length % bancos.length], origem: "ocr", confianca: "nenhuma" },
    {
      chave: "pagador",
      valor: incompleto ? "" : nomePagador,
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : pagadorDivergente ? "media" : "alta",
    },
  ];
}

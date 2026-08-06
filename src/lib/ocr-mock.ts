import {
  beneficiariosPagamento,
  type BeneficiarioPagamento,
  type CampoExtraido,
  type TipoDocumentoArquivo,
} from "./mock-data";

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

/** Simula um documento de assistência odontológica — não reembolsável pelo Pró-Saúde. */
function arquivoEhOdontologico(nomeArquivo: string): boolean {
  const nome = nomeArquivo.toLowerCase();
  return nome.includes("odontologico") || nome.includes("odonto");
}

/** Palavras-chave que, no nome do arquivo, indicam qual(is) tipo(s) documental(is) marcar
 *  automaticamente ao anexar — mesma convenção usada para ilegível/divergente/odontológico. */
const palavrasChavePorTipo: Record<TipoDocumentoArquivo, string[]> = {
  fatura_tecnica: ["fatura_tecnica", "fatura-tecnica", "faturatecnica"],
  comprovante_pagamento: ["comprovante_pagamento", "comprovante-pagamento"],
  boleto: ["boleto"],
  recibo: ["recibo"],
  demonstrativo: ["demonstrativo"],
};

/**
 * Detecta, a partir do nome do arquivo, quais tipos documentais marcar automaticamente no
 * upload — só considera os tipos presentes em `tiposPermitidos` (respeitando a restrição por
 * tipo de plano). Ex: um arquivo "fatura_tecnica_julho.pdf" pré-marca "Fatura Técnica" apenas
 * se a modalidade de plano do grupo selecionado permitir esse tipo (ver `tiposDocumentoPorPlano`).
 */
export function detectarTiposPeloNomeArquivo(
  nomeArquivo: string,
  tiposPermitidos: TipoDocumentoArquivo[],
): TipoDocumentoArquivo[] {
  const nome = nomeArquivo.toLowerCase();
  return tiposPermitidos.filter((tipo) => palavrasChavePorTipo[tipo].some((kw) => nome.includes(kw)));
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

/**
 * Quais campos cada tipo documental tipicamente traz — um arquivo só contribui com os campos
 * dos tipos marcados para ele; os demais campos ficam para outro arquivo do mesmo envio
 * completar (ver `mesclarCamposDeArquivos`).
 */
const camposPorTipoDocumento: Record<TipoDocumentoArquivo, CampoExtraido["chave"][]> = {
  fatura_tecnica: ["nome", "operadora", "competencia", "tipoAssistencia"],
  demonstrativo: ["nome", "operadora", "competencia", "valor", "tipoAssistencia"],
  boleto: ["nome", "valor", "dataPagamento", "banco", "competencia"],
  recibo: ["nome", "valor", "dataPagamento", "pagador"],
  comprovante_pagamento: ["valor", "dataPagamento", "banco", "pagador"],
};

/** Gera os campos que UM arquivo (com os tipos documentais marcados) contribui para 1 beneficiário. */
export function gerarCamposExtraidos(
  beneficiario: BeneficiarioPagamento,
  competencia: string,
  nomeArquivo: string,
  tipos: TipoDocumentoArquivo[],
): CampoExtraido[] {
  const divergente = arquivoEhDivergente(nomeArquivo);
  const incompleto = arquivoEhIncompleto(nomeArquivo, beneficiario);
  const pagadorDivergente = arquivoTemPagadorDivergente(nomeArquivo);
  const odontologico = arquivoEhOdontologico(nomeArquivo);
  const valor = divergente ? beneficiario.valorCadastrado + 100 : beneficiario.valorCadastrado;
  const [ano, mes] = competencia.split("-");
  const dataPagamento = `28/${mes}/${ano}`;

  // O pagamento deve ter sido feito pelo titular, independentemente de quem é o beneficiário do plano.
  const nomePagador = pagadorDivergente
    ? beneficiario.parentesco === "Titular"
      ? "Terceiro Pagador"
      : beneficiario.nome
    : titularPagamento?.nome ?? beneficiario.nome;

  const camposPossiveis: CampoExtraido[] = [
    {
      chave: "nome",
      valor: incompleto ? "" : beneficiario.nome,
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : "alta",
      arquivoOrigem: nomeArquivo,
    },
    { chave: "operadora", valor: beneficiario.operadora, origem: "ocr", confianca: "alta", arquivoOrigem: nomeArquivo },
    { chave: "competencia", valor: competencia, origem: "ocr", confianca: "media", arquivoOrigem: nomeArquivo },
    {
      chave: "valor",
      valor: incompleto ? "" : valor.toFixed(2),
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : divergente ? "media" : "alta",
      arquivoOrigem: nomeArquivo,
    },
    { chave: "dataPagamento", valor: dataPagamento, origem: "ocr", confianca: "media", arquivoOrigem: nomeArquivo },
    {
      chave: "banco",
      valor: bancos[nomeArquivo.length % bancos.length],
      origem: "ocr",
      confianca: "nenhuma",
      arquivoOrigem: nomeArquivo,
    },
    {
      chave: "pagador",
      valor: incompleto ? "" : nomePagador,
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : pagadorDivergente ? "media" : "alta",
      arquivoOrigem: nomeArquivo,
    },
    {
      chave: "tipoAssistencia",
      valor: odontologico ? "odontologico" : "medico_hospitalar",
      origem: "ocr",
      confianca: "alta",
      arquivoOrigem: nomeArquivo,
    },
  ];

  const chavesDoArquivo = new Set(tipos.flatMap((t) => camposPorTipoDocumento[t]));
  return camposPossiveis.filter((c) => chavesDoArquivo.has(c.chave));
}

const todasAsChaves: CampoExtraido["chave"][] = [
  "nome",
  "operadora",
  "competencia",
  "valor",
  "dataPagamento",
  "banco",
  "pagador",
  "tipoAssistencia",
];

/**
 * Consolida os campos extraídos de vários arquivos anexados a um mesmo envio, para 1
 * beneficiário — para cada campo, usa o primeiro arquivo (na ordem de upload) que produziu
 * um valor não vazio. Se nenhum arquivo trouxer o campo, ele fica "não identificado" (mesmo
 * comportamento já usado para documentos incompletos).
 */
export function mesclarCamposDeArquivos(porArquivo: { nome: string; campos: CampoExtraido[] }[]): CampoExtraido[] {
  return todasAsChaves.map((chave) => {
    for (const arquivo of porArquivo) {
      const campo = arquivo.campos.find((c) => c.chave === chave && c.valor.trim() !== "");
      if (campo) return campo;
    }
    return { chave, valor: "", origem: "ocr" as const, confianca: "nenhuma" as const };
  });
}

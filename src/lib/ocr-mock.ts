import {
  beneficiariosPagamento,
  situacaoNaoReembolsavelLabels,
  valorMockItemNaoReembolsavel,
  type BeneficiarioPagamento,
  type CampoExtraido,
  type ItemFinanceiro,
  type SituacaoNaoReembolsavel,
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

/** Palavras-chave que, no nome do arquivo, simulam uma situação não reembolsável pelo
 *  Pró-Saúde — no sistema real essa identificação viria do conteúdo do documento (OCR/IA),
 *  não do nome do arquivo escolhido pelo servidor. */
const palavrasChavePorSituacaoNaoReembolsavel: Record<SituacaoNaoReembolsavel, string[]> = {
  odontologico: ["odontologico", "odonto"],
  multa: ["multa"],
  taxa_administrativa: ["taxa_administrativa", "taxa-administrativa"],
  juros: ["juros"],
};

/** Detecta, a partir do nome do arquivo, **todas** as situações não reembolsáveis presentes —
 *  um mesmo documento pode ter mais de uma (ex: "boleto_odontologico_juros_misto.jpg"). */
export function detectarSituacoesNaoReembolsaveis(nomeArquivo: string): SituacaoNaoReembolsavel[] {
  const nome = nomeArquivo.toLowerCase();
  return (Object.keys(palavrasChavePorSituacaoNaoReembolsavel) as SituacaoNaoReembolsavel[]).filter((s) =>
    palavrasChavePorSituacaoNaoReembolsavel[s].some((kw) => nome.includes(kw)),
  );
}

/**
 * Gera os itens financeiros (linhas) que um arquivo contribui para 1 beneficiário — a
 * elegibilidade ao Pró-Saúde é avaliada por item, não pelo documento inteiro. Convenção de nome
 * de arquivo (mock, sem OCR real):
 * - nenhuma palavra-chave de situação não reembolsável → 1 item, 100% reembolsável (mensalidade).
 * - palavra-chave presente (ex: "odontologico") **sem** "misto" → documento 100% não
 *   reembolsável: só o(s) item(ns) não reembolsável(is), sem item de mensalidade — mesmo
 *   comportamento já usado nos testes anteriores a esta convenção (preserva os cenários antigos).
 * - palavra-chave presente **com** "misto" (ex: "odontologico_misto") → mensalidade reembolsável
 *   + o(s) item(ns) não reembolsável(is) juntos, como um boleto real que discrimina "Mensalidade
 *   Plano de Saúde" e "Valor de Odontologia" em linhas separadas.
 */
export function gerarItensFinanceiros(
  beneficiario: BeneficiarioPagamento,
  nomeArquivo: string,
): ItemFinanceiro[] {
  const divergente = arquivoEhDivergente(nomeArquivo);
  const valorMensalidade = divergente ? beneficiario.valorCadastrado + 100 : beneficiario.valorCadastrado;
  const situacoes = detectarSituacoesNaoReembolsaveis(nomeArquivo);

  if (situacoes.length === 0) {
    return [{ descricao: "Mensalidade Plano de Saúde", valor: valorMensalidade, reembolsavel: true }];
  }

  const itensNaoReembolsaveis: ItemFinanceiro[] = situacoes.map((situacao) => ({
    descricao: situacaoNaoReembolsavelLabels[situacao],
    valor: valorMockItemNaoReembolsavel[situacao],
    reembolsavel: false,
    situacaoNaoReembolsavel: situacao,
  }));

  const misto = nomeArquivo.toLowerCase().includes("misto");
  if (!misto) return itensNaoReembolsaveis;

  return [
    { descricao: "Mensalidade Plano de Saúde", valor: valorMensalidade, reembolsavel: true },
    ...itensNaoReembolsaveis,
  ];
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

/**
 * Quais campos cada tipo documental traz — taxonomia literal definida pelo stakeholder.
 * Comprovante de Pagamento é a única fonte de `pagador` e `dataPagamento` (é o único documento
 * que comprova quando e por quem o pagamento foi feito); Boleto/Recibo/Demonstrativo trazem
 * `vencimento` no lugar disso (data de vencimento impressa no documento, não de pagamento).
 * Recibo/Demonstrativo não trazem `operadora` (simplificação assumida — ver docs/MODULO_PAGAMENTO.md):
 * um envio só-recibo/só-demonstrativo não terá operadora extraída, fica "não identificado".
 * Um arquivo só contribui com os campos dos tipos marcados para ele; os demais campos ficam
 * para outro arquivo do mesmo envio completar (ver `mesclarCamposDeArquivos`).
 */
const camposPorTipoDocumento: Record<TipoDocumentoArquivo, CampoExtraido["chave"][]> = {
  comprovante_pagamento: ["pagador", "valor", "dataPagamento", "vencimento", "operadora"],
  boleto: ["nome", "operadora", "competencia", "vencimento", "valor"],
  recibo: ["nome", "competencia", "vencimento", "valor"],
  demonstrativo: ["nome", "competencia", "vencimento", "valor"],
  fatura_tecnica: ["nome", "operadora", "competencia", "vencimento"],
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
  // "Valor" bruto/total do documento — soma de todos os itens financeiros (reembolsáveis e não),
  // ver `gerarItensFinanceiros`. Continua sendo "o valor identificado no documento", só que agora
  // reconciliado com a decomposição por item em vez de sempre repetir o valor cadastrado.
  const itensFinanceiros = incompleto ? [] : gerarItensFinanceiros(beneficiario, nomeArquivo);
  const valor = itensFinanceiros.reduce((soma, item) => soma + item.valor, 0);
  const [ano, mes] = competencia.split("-");
  const dataPagamento = `28/${mes}/${ano}`;
  const vencimento = `10/${mes}/${ano}`;

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
    { chave: "vencimento", valor: vencimento, origem: "ocr", confianca: "alta", arquivoOrigem: nomeArquivo },
    {
      chave: "pagador",
      valor: incompleto ? "" : nomePagador,
      origem: "ocr",
      confianca: incompleto ? "nenhuma" : pagadorDivergente ? "media" : "alta",
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
  "vencimento",
  "valor",
  "dataPagamento",
  "pagador",
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

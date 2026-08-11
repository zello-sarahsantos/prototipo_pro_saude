import type {
  ArquivoAnexado,
  BeneficiarioPagamento,
  CampoExtraido,
  Comprovante,
  ItemFinanceiro,
  StatusBeneficiarioComprovante,
  StatusComprovante,
  TipoDocumentoArquivo,
} from "./mock-data";
import { gerarCamposExtraidos, gerarItensFinanceiros } from "./ocr-mock";

/** Campos (do comprovante inteiro, ou de 1 beneficiário específico em fatura técnica). */
export function getCamposDoBeneficiario(
  comprovante: Comprovante,
  beneficiarioId: string,
): CampoExtraido[] {
  if (comprovante.gruposExtraidos) {
    return comprovante.gruposExtraidos.find((g) => g.beneficiarioId === beneficiarioId)?.campos ?? [];
  }
  return comprovante.camposExtraidos;
}

/**
 * Itens financeiros (linhas do documento) de 1 beneficiário — recomputados sob demanda a partir
 * dos `arquivos` persistidos (`gerarItensFinanceiros` é determinístico), nunca guardados como
 * campo novo no `Comprovante` (mesmo padrão já usado por `getDivergenciaBoletoComprovante`).
 * Usa a mesma regra de "primeiro arquivo, na ordem de upload, que produzir o campo `valor`"
 * já usada em `mesclarCamposDeArquivos` — o arquivo que "vence" o campo `valor` consolidado é
 * o mesmo que fornece os itens financeiros.
 */
export function getItensFinanceiros(
  comprovante: Pick<Comprovante, "arquivos" | "beneficiarioIds" | "competencia">,
  beneficiario: BeneficiarioPagamento,
): ItemFinanceiro[] {
  const todosIds = comprovante.beneficiarioIds;
  for (const arquivo of comprovante.arquivos) {
    // `?? []` protege contra comprovantes persistidos antes da renomeação de `tipos` para
    // `documentos` (Etapa 3, ver `tiposDoArquivo`) — sem isso, um comprovante antigo no
    // localStorage derruba a tela inteira em vez de simplesmente não render itens para ele.
    const tiposQueCobrem = (arquivo.documentos ?? [])
      .filter((d) => beneficiariosCobertosPeloDocumento(d, todosIds).includes(beneficiario.id))
      .map((d) => d.tipo);
    if (tiposQueCobrem.length === 0) continue;
    const campos = gerarCamposExtraidos(beneficiario, comprovante.competencia, arquivo.nome, tiposQueCobrem);
    const campoValor = campos.find((c) => c.chave === "valor" && c.valor.trim() !== "");
    if (!campoValor) continue;
    return gerarItensFinanceiros(beneficiario, arquivo.nome);
  }
  return [];
}

/** Decomposição do valor de um documento em total, elegível (soma dos itens reembolsáveis) e
 *  não reembolsável (total - elegível) — ver `ItemFinanceiro`, `mock-data.ts`. */
export interface DecomposicaoValor {
  itens: ItemFinanceiro[];
  valorTotal: number;
  valorElegivel: number;
  valorNaoReembolsavel: number;
}

export function getDecomposicaoValor(itens: ItemFinanceiro[]): DecomposicaoValor {
  const valorTotal = itens.reduce((soma, item) => soma + item.valor, 0);
  const valorElegivel = itens.filter((item) => item.reembolsavel).reduce((soma, item) => soma + item.valor, 0);
  return { itens, valorTotal, valorElegivel, valorNaoReembolsavel: valorTotal - valorElegivel };
}

/** Verifica se o `valor` **elegível** (soma dos itens reembolsáveis, não o valor bruto/total)
 *  diverge de `valorCadastrado` — pura, usada tanto por `getDivergencia` (comprovante já
 *  persistido) quanto por telas que ainda operam sobre itens do wizard antes de o comprovante
 *  existir (ex: `ConferenciaBeneficiarios`). O campo `valor` bruto (`CampoExtraido`) continua
 *  consultável separadamente — esta função nunca olha para ele. */
export function valorDivergeDoCadastro(
  itens: ItemFinanceiro[],
  valorCadastrado: number,
): { divergente: boolean; valorElegivel: number } {
  if (itens.length === 0) return { divergente: false, valorElegivel: valorCadastrado };
  const valorElegivel = itens.filter((item) => item.reembolsavel).reduce((soma, item) => soma + item.valor, 0);
  return { divergente: valorElegivel !== valorCadastrado, valorElegivel };
}

/** Verifica se o valor elegível diverge do valor cadastrado do beneficiário — alerta auxiliar, não um status. */
export function getDivergencia(
  comprovante: Comprovante,
  beneficiario: BeneficiarioPagamento,
): { divergente: boolean; valorElegivel: number } {
  const itens = getItensFinanceiros(comprovante, beneficiario);
  return valorDivergeDoCadastro(itens, beneficiario.valorCadastrado);
}

/** Verifica se a `operadora` extraída em `campos` diverge da operadora cadastrada — só considera
 *  divergência quando o campo foi de fato identificado (Recibo/Demonstrativo não extraem
 *  `operadora`, então nunca acionam esse alerta, ver taxonomia da Etapa 4). */
export function operadoraDivergeDoCadastro(
  campos: CampoExtraido[],
  operadoraCadastrada: string,
): { divergente: boolean; operadoraExtraida?: string } {
  const campoOperadora = campos.find((c) => c.chave === "operadora");
  const operadoraExtraida = campoOperadora?.valor.trim();
  if (!operadoraExtraida) return { divergente: false };
  return { divergente: operadoraExtraida !== operadoraCadastrada, operadoraExtraida };
}

/**
 * Verifica a elegibilidade ao Pró-Saúde **por item financeiro**, não pelo documento inteiro:
 * um mesmo documento pode ter itens reembolsáveis (ex: mensalidade) e não reembolsáveis (ex:
 * odontológico) ao mesmo tempo — nesse caso o documento continua elegível, só os itens não
 * reembolsáveis são desconsiderados do valor elegível. Só fica **não elegível** (bloqueia
 * Aprovar/Aprovar com ressalva) quando não sobra nenhum valor elegível no documento.
 */
export function getElegibilidade(
  comprovante: Pick<Comprovante, "arquivos" | "beneficiarioIds" | "competencia">,
  beneficiario: BeneficiarioPagamento,
): { elegivel: boolean; decomposicao: DecomposicaoValor } {
  const itens = getItensFinanceiros(comprovante, beneficiario);
  const decomposicao = getDecomposicaoValor(itens);
  const temItemNaoReembolsavel = itens.some((item) => !item.reembolsavel);
  const elegivel = !temItemNaoReembolsavel || decomposicao.valorElegivel > 0;
  return { elegivel, decomposicao };
}

/**
 * Deriva o status geral do comprovante a partir do status individual de cada beneficiário
 * (fatura técnica). A ação sobre 1 beneficiário nunca força os demais a mudar de status —
 * o status geral apenas resume o conjunto para fins de fila/badge.
 */
export function recomputeStatusGeral(porBeneficiario: StatusBeneficiarioComprovante[]): StatusComprovante {
  const statuses = porBeneficiario.map((p) => p.status);

  if (statuses.some((s) => s === "em_analise")) return "em_analise";
  if (statuses.every((s) => s === "aprovado")) return "aprovado";
  if (statuses.some((s) => s === "correcao_solicitada")) return "correcao_solicitada";
  if (statuses.some((s) => s === "recusado")) return "aprovado_com_ressalva";
  if (statuses.some((s) => s === "aprovado_com_ressalva")) return "aprovado_com_ressalva";
  return "aprovado";
}

/** Trata comprovantes de 1 beneficiário como uma "lista de 1" — permite reaproveitar a mesma
 *  lógica de status/ação por beneficiário tanto no painel do Analista quanto no detalhe do Servidor. */
export function getListaStatusBeneficiario(c: Comprovante): StatusBeneficiarioComprovante[] {
  if (c.beneficiarioIds.length > 1) {
    return (
      c.statusPorBeneficiario ??
      c.beneficiarioIds.map((id) => ({ beneficiarioId: id, status: "em_analise" as StatusComprovante }))
    );
  }
  return [{ beneficiarioId: c.beneficiarioIds[0], status: c.status }];
}

/** Status de um beneficiário específico dentro de um comprovante (single ou multi-beneficiário). */
export function statusDoBeneficiarioNoDocumento(c: Comprovante, beneficiarioId: string): StatusComprovante {
  return getListaStatusBeneficiario(c).find((s) => s.beneficiarioId === beneficiarioId)?.status ?? c.status;
}

/** Verifica se algum campo do beneficiário (nesse comprovante) não foi identificado pela IA. */
export function beneficiarioTemCampoVazio(c: Comprovante, beneficiarioId: string): boolean {
  return getCamposDoBeneficiario(c, beneficiarioId).some((campo) => campo.valor.trim() === "");
}

/** Um grupo de beneficiários que podem ser enviados juntos no mesmo comprovante — mesma
 *  operadora e mesma modalidade de plano. */
export interface GrupoBeneficiarios {
  chave: string;
  operadora: string;
  modalidadePlano: BeneficiarioPagamento["modalidadePlano"];
  beneficiarios: BeneficiarioPagamento[];
}

/**
 * Agrupa beneficiários elegíveis a envio individual por `operadora + modalidadePlano`, e
 * separa quem tem `associacao` (comprovação coletiva, nunca participa de envio individual).
 * Beneficiários do mesmo grupo podem ser selecionados juntos no mesmo comprovante; beneficiários
 * de grupos diferentes exigem envios separados — ver `BeneficiarioSelector.tsx`.
 */
export function agruparBeneficiariosElegiveis(beneficiarios: BeneficiarioPagamento[]): {
  grupos: GrupoBeneficiarios[];
  vinculadosAssociacao: BeneficiarioPagamento[];
} {
  const elegiveis = beneficiarios.filter((b) => !b.associacao);
  const vinculadosAssociacao = beneficiarios.filter((b) => b.associacao);

  const porChave = new Map<string, GrupoBeneficiarios>();
  for (const b of elegiveis) {
    const chave = `${b.operadora}|${b.modalidadePlano}`;
    const grupo = porChave.get(chave);
    if (grupo) {
      grupo.beneficiarios.push(b);
    } else {
      porChave.set(chave, { chave, operadora: b.operadora, modalidadePlano: b.modalidadePlano, beneficiarios: [b] });
    }
  }

  return { grupos: [...porChave.values()], vinculadosAssociacao };
}

/** Beneficiários que um documento (tipo dentro de um arquivo) cobre. `beneficiarioIds` ausente
 *  significa "cobre todos os selecionados no envio" — vale para todos os tipos documentais,
 *  incluindo Recibo e Demonstrativo: nenhum tipo é obrigatoriamente individual, um recibo ou
 *  demonstrativo pode listar 1 ou vários beneficiários dependendo do que o documento real traz. */
export function beneficiariosCobertosPeloDocumento(
  documento: { tipo: TipoDocumentoArquivo; beneficiarioIds?: string[] },
  todosIds: string[],
): string[] {
  return documento.beneficiarioIds ?? todosIds;
}

/** Resultado da checklist de cobertura documental de 1 beneficiário do grupo selecionado. */
export interface CoberturaBeneficiario {
  beneficiarioId: string;
  contemplado: boolean;
  tiposEncontrados: TipoDocumentoArquivo[];
  /** Texto amigável do que falta — só presente quando `contemplado` é `false`. */
  faltando?: string;
}

/**
 * Calcula, para cada beneficiário do grupo selecionado, se a combinação de documentos já
 * anexados (por tipo, considerando quem cada um cobre) satisfaz a regra de obrigatoriedade
 * da modalidade do grupo:
 * - Empresarial: Fatura Técnica **e** Comprovante de Pagamento.
 * - Individual/familiar: (Boleto **e** Comprovante) **ou** Recibo **ou** Demonstrativo.
 */
export function getCoberturaDocumental(
  beneficiarios: BeneficiarioPagamento[],
  arquivos: Pick<ArquivoAnexado, "documentos">[],
  modalidadePlano: BeneficiarioPagamento["modalidadePlano"],
): CoberturaBeneficiario[] {
  const todosIds = beneficiarios.map((b) => b.id);

  return beneficiarios.map((b) => {
    const tiposEncontrados = new Set<TipoDocumentoArquivo>();
    for (const arquivo of arquivos) {
      for (const documento of arquivo.documentos ?? []) {
        if (beneficiariosCobertosPeloDocumento(documento, todosIds).includes(b.id)) {
          tiposEncontrados.add(documento.tipo);
        }
      }
    }
    const tipos = [...tiposEncontrados];

    if (modalidadePlano === "empresarial") {
      const temFatura = tipos.includes("fatura_tecnica");
      const temComprovante = tipos.includes("comprovante_pagamento");
      if (temFatura && temComprovante) {
        return { beneficiarioId: b.id, contemplado: true, tiposEncontrados: tipos };
      }
      const faltam = [!temFatura && "Fatura Técnica", !temComprovante && "Comprovante de Pagamento"].filter(
        (v): v is string => !!v,
      );
      const faltando = faltam.length === 1 ? `Falta ${faltam[0]}` : `Faltam ${faltam.join(" e ")}`;
      return { beneficiarioId: b.id, contemplado: false, tiposEncontrados: tipos, faltando };
    }

    const temRecibo = tipos.includes("recibo");
    const temDemonstrativo = tipos.includes("demonstrativo");
    const temBoleto = tipos.includes("boleto");
    const temComprovante = tipos.includes("comprovante_pagamento");
    if (temRecibo || temDemonstrativo || (temBoleto && temComprovante)) {
      return { beneficiarioId: b.id, contemplado: true, tiposEncontrados: tipos };
    }
    // Se há progresso parcial (só Boleto ou só Comprovante), aponta exatamente o que falta.
    // Sem nenhum indício, seria enganoso apontar 1 caminho específico entre os 3 válidos.
    const faltando =
      temBoleto && !temComprovante
        ? "Falta Comprovante de Pagamento"
        : temComprovante && !temBoleto
          ? "Falta Boleto"
          : "Falta uma combinação válida de documentos";
    return { beneficiarioId: b.id, contemplado: false, tiposEncontrados: tipos, faltando };
  });
}

/**
 * `true` quando, com mais de 1 beneficiário no grupo, todo documento (tipo dentro de um
 * arquivo) já tem cobertura declarada explicitamente (`beneficiarioIds` não vazio) — impede
 * avançar com um tipo anexado cuja cobertura ainda não foi definida, mesmo que a checklist já
 * esteja satisfeita por outros documentos.
 */
export function todosDocumentosComCoberturaDefinida(
  arquivos: Pick<ArquivoAnexado, "documentos">[],
  totalBeneficiarios: number,
): boolean {
  if (totalBeneficiarios <= 1) return true;
  return arquivos.every((a) => (a.documentos ?? []).every((d) => (d.beneficiarioIds?.length ?? 0) > 0));
}

/** `true` quando todo o grupo selecionado (não vazio) já está contemplado — usado para liberar
 *  o avanço do passo de upload. */
export function todosContemplados(cobertura: CoberturaBeneficiario[]): boolean {
  return cobertura.length > 0 && cobertura.every((c) => c.contemplado);
}

export interface DivergenciaBoletoComprovante {
  divergente: boolean;
  valorBoleto?: number;
  valorComprovante?: number;
}

/**
 * Compara o valor bruto extraído do Boleto com o do Comprovante de Pagamento (antes da
 * consolidação) para 1 beneficiário. Recomputado sob demanda a partir dos arquivos persistidos
 * (`gerarCamposExtraidos` é determinístico) em vez de guardado como campo novo — a consolidação
 * (`mesclarCamposDeArquivos`) descarta o valor do arquivo que não "venceu", então não dá para
 * comparar os 2 lados só a partir dos campos já mesclados.
 */
export function getDivergenciaBoletoComprovante(
  comprovante: Pick<Comprovante, "arquivos" | "beneficiarioIds" | "competencia">,
  beneficiario: BeneficiarioPagamento,
): DivergenciaBoletoComprovante {
  const todosIds = comprovante.beneficiarioIds;

  const valorPorTipo = (tipo: TipoDocumentoArquivo): number | undefined => {
    for (const arquivo of comprovante.arquivos) {
      const documento = (arquivo.documentos ?? []).find((d) => d.tipo === tipo);
      if (!documento) continue;
      if (!beneficiariosCobertosPeloDocumento(documento, todosIds).includes(beneficiario.id)) continue;
      const campos = gerarCamposExtraidos(beneficiario, comprovante.competencia, arquivo.nome, [tipo]);
      const campoValor = campos.find((c) => c.chave === "valor" && c.valor.trim() !== "");
      if (campoValor) return parseFloat(campoValor.valor);
    }
    return undefined;
  };

  const valorBoleto = valorPorTipo("boleto");
  const valorComprovante = valorPorTipo("comprovante_pagamento");
  const divergente = valorBoleto !== undefined && valorComprovante !== undefined && valorBoleto !== valorComprovante;
  return { divergente, valorBoleto, valorComprovante };
}

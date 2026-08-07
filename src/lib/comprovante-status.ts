import type {
  ArquivoAnexado,
  BeneficiarioPagamento,
  CampoExtraido,
  Comprovante,
  StatusBeneficiarioComprovante,
  StatusComprovante,
  TipoDocumentoArquivo,
} from "./mock-data";

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

/** Verifica se o valor extraído diverge do valor cadastrado do beneficiário — alerta auxiliar, não um status. */
export function getDivergencia(
  comprovante: Comprovante,
  beneficiario: BeneficiarioPagamento,
): { divergente: boolean; valorExtraido: number } {
  const campos = getCamposDoBeneficiario(comprovante, beneficiario.id);
  const campoValor = campos.find((c) => c.chave === "valor");
  const valorExtraido = campoValor ? parseFloat(campoValor.valor) : beneficiario.valorCadastrado;
  return {
    divergente: !Number.isNaN(valorExtraido) && valorExtraido !== beneficiario.valorCadastrado,
    valorExtraido,
  };
}

/** Verifica se o tipo de assistência do documento é reembolsável — odontológico não é
 *  amparado pelo Pró-Saúde, então nunca pode ser aprovado (automaticamente ou com ressalva). */
export function getElegibilidade(
  comprovante: Comprovante,
  beneficiarioId: string,
): { elegivel: boolean; tipoAssistencia?: string } {
  const campos = getCamposDoBeneficiario(comprovante, beneficiarioId);
  const campo = campos.find((c) => c.chave === "tipoAssistencia");
  return {
    elegivel: campo?.valor !== "odontologico",
    tipoAssistencia: campo?.valor,
  };
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
      for (const documento of arquivo.documentos) {
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
  return arquivos.every((a) => a.documentos.every((d) => (d.beneficiarioIds?.length ?? 0) > 0));
}

/** `true` quando todo o grupo selecionado (não vazio) já está contemplado — usado para liberar
 *  o avanço do passo de upload. */
export function todosContemplados(cobertura: CoberturaBeneficiario[]): boolean {
  return cobertura.length > 0 && cobertura.every((c) => c.contemplado);
}

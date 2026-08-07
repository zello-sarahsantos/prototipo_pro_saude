import type { BeneficiarioPagamento, CampoExtraido, Comprovante, StatusComprovante } from "./mock-data";
import { arquivoEhIlegivel, gerarCamposExtraidos } from "./ocr-mock";
import { updateComprovantePagamento } from "./prosaude-storage";
import { getListaStatusBeneficiario, recomputeStatusGeral } from "./comprovante-status";

/** Roda o processamento mockado (OCR/IA) para o novo arquivo enviado — herda os tipos
 *  documentais já marcados para o documento (esta tela substitui o documento inteiro). */
export function processarNovoArquivo(
  comprovante: Comprovante,
  beneficiario: BeneficiarioPagamento,
  arquivo: File,
): { ilegivel: boolean; campos: CampoExtraido[] } {
  const ilegivel = arquivoEhIlegivel(arquivo.name);
  const tipos = [...new Set(comprovante.arquivos.flatMap((a) => a.documentos.map((d) => d.tipo)))];
  const campos = ilegivel ? [] : gerarCamposExtraidos(beneficiario, comprovante.competencia, arquivo.name, tipos);
  return { ilegivel, campos };
}

/**
 * Confirma a substituição/reenvio de um documento (usado tanto para "ilegível → substituir"
 * quanto para "correção solicitada → corrigir e reenviar"). Preserva a versão anterior do
 * arquivo, atualiza o mesmo comprovante (nunca cria um novo/duplicado na competência) e
 * registra a ação no histórico.
 */
export function confirmarReenvio(params: {
  comprovante: Comprovante;
  beneficiarioId: string;
  novoArquivo: string;
  novoStatus: Extract<StatusComprovante, "ilegivel" | "em_analise">;
  campos: CampoExtraido[];
  autor: string;
}) {
  const { comprovante, beneficiarioId, novoArquivo, novoStatus, campos, autor } = params;
  const multi = comprovante.beneficiarioIds.length > 1;
  const agora = new Date().toISOString();

  const versaoAnterior = {
    arquivo: comprovante.arquivos.map((a) => a.nome).join(", "),
    dataEnvio: comprovante.dataEnvio,
    status: comprovante.status,
  };
  const tiposHerdados = [...new Set(comprovante.arquivos.flatMap((a) => a.documentos.map((d) => d.tipo)))];
  const documentosHerdados = tiposHerdados.map((tipo) => ({ tipo }));

  const acaoLog = {
    etapa: "servidor" as const,
    acao: (novoStatus === "ilegivel" ? "documento_substituido" : "reenviado") as
      | "documento_substituido"
      | "reenviado",
    aprovadoPor: autor,
    data: agora,
    beneficiarioId: multi ? beneficiarioId : undefined,
  };

  if (multi) {
    const listaAtual = getListaStatusBeneficiario(comprovante);
    const novaLista = listaAtual.map((s) =>
      s.beneficiarioId === beneficiarioId ? { ...s, status: novoStatus, comentario: undefined } : s,
    );
    const gruposAtualizados = (comprovante.gruposExtraidos ?? []).map((g) =>
      g.beneficiarioId === beneficiarioId ? { ...g, campos } : g,
    );
    updateComprovantePagamento(comprovante.id, {
      arquivos: [{ nome: novoArquivo, documentos: documentosHerdados }],
      statusPorBeneficiario: novaLista,
      status: recomputeStatusGeral(novaLista),
      gruposExtraidos: gruposAtualizados,
      versoesAnteriores: [...(comprovante.versoesAnteriores ?? []), versaoAnterior],
      aprovacoes: [...comprovante.aprovacoes, acaoLog],
      dataEnvio: agora,
    });
  } else {
    updateComprovantePagamento(comprovante.id, {
      arquivos: [{ nome: novoArquivo, documentos: documentosHerdados }],
      status: novoStatus,
      camposExtraidos: campos,
      versoesAnteriores: [...(comprovante.versoesAnteriores ?? []), versaoAnterior],
      aprovacoes: [...comprovante.aprovacoes, acaoLog],
      dataEnvio: agora,
    });
  }
}

import type { TipoDocumentoArquivo } from "./mock-data";

export type Achado = {
  codigo: string;
  severidade: "alta" | "media" | "info";
  titulo: string;
  texto: string;
  acao: string;
  evidencias: { arquivo: string; trecho: string }[];
  documentoIds: string[];
};

export type BackendComprovante = {
  id: string;
  status: string;
  arquivo: string;
  tipo: string;
  processo_id?: string;
  candidatos: unknown[];
  ia_execucao_id?: string | null;
  ia_status: string;
  ia_erro?: string | null;
  achados?: Achado[];
  leitura_ia?: Record<string, unknown> | null;
  insights_processo?: { titulo: string; texto: string; evidencias: { documentoId: string; arquivo: string; trecho: string }[]; documentoIds: string[] }[] | null;
  campos_manuais?: Record<string, { valor: string; analista_id: string; alterado_em: string }> | null;
  parecer?: Record<string, unknown> | null;
  criado_em: string;
  atualizado_em: string;
};

export async function enviarParaAnalise(
  file: File,
  tipo: TipoDocumentoArquivo,
  candidatos: { nome: string; operadora?: string; valorCadastrado?: number }[],
  competencia: string,
  processoId: string,
): Promise<BackendComprovante> {
  const form = new FormData();
  form.append("arquivo", file);
  form.append("tipo", tipo);
  form.append("processo_id", processoId);
  form.append("candidatos", JSON.stringify(candidatos.map((c) => ({
    nome: c.nome,
    operadora: c.operadora ?? "",
    valorEsperado: c.valorCadastrado ?? 0,
    competenciaEsperada: competencia,
  }))));
  const response = await fetch("/api/backend/comprovantes", { method: "POST", body: form, signal: AbortSignal.timeout(120000) });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(typeof erro.detail === "string" ? erro.detail : `Falha ao registrar envio: HTTP ${response.status}`);
  }
  return response.json() as Promise<BackendComprovante>;
}

export async function listarComprovantesBackend(): Promise<BackendComprovante[]> {
  const response = await fetch("/api/backend/comprovantes", { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Falha ao consultar a fila: HTTP ${response.status}`);
  return response.json() as Promise<BackendComprovante[]>;
}

export async function reenviarIaBackend(id: string): Promise<BackendComprovante> {
  const response = await fetch(`/api/backend/comprovantes/${id}/reenviar-ia`, { method: "POST", signal: AbortSignal.timeout(120000) });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(typeof erro.detail === "string" ? erro.detail : `Falha ao reenviar para a IA: HTTP ${response.status}`);
  }
  return response.json() as Promise<BackendComprovante>;
}

export async function emitirParecerBackend(id: string, decisao: string, justificativa: string, analista_id: string): Promise<BackendComprovante> {
  const response = await fetch(`/api/backend/comprovantes/${id}/parecer`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decisao, justificativa, analista_id }),
  });
  if (!response.ok) throw new Error(`Falha ao emitir parecer: HTTP ${response.status}`);
  return response.json() as Promise<BackendComprovante>;
}

export async function editarCampoBackend(id: string, campo: string, valor: string, analista_id: string): Promise<BackendComprovante> {
  const response = await fetch(`/api/backend/comprovantes/${id}/campos/${encodeURIComponent(campo)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valor, analista_id }),
  });
  if (!response.ok) throw new Error(`Falha ao salvar campo manual: HTTP ${response.status}`);
  return response.json() as Promise<BackendComprovante>;
}

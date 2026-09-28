import type { Comprovante, TipoDocumentoArquivo } from "./mock-data";

export async function listarComprovantesTeste(): Promise<Comprovante[]> {
  const response = await fetch('/api/ia/simulacao/comprovantes', { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Falha ao consultar envios: HTTP ${response.status}`);
  return await response.json() as Comprovante[];
}

export async function registrarEnvioTeste(comprovante: Comprovante, execucoes: string[]): Promise<void> {
  const response = await fetch('/api/ia/simulacao/envios', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comprovante, execucoes }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(typeof erro.detail === 'string' ? erro.detail : `Falha ao salvar no banco de teste: HTTP ${response.status}`);
  }
}

export async function iniciarExtracao(file: File, tipo: TipoDocumentoArquivo, candidatos: { nome: string; operadora?: string; valorCadastrado?: number }[] = [], competencia = '', modo: 'async' | 'sync' = 'async'): Promise<{ id: string; status: string; resultado?: any; erro?: string }> {
  const form = new FormData();
  form.append("arquivo", file);
  form.append("tipo", tipo);
  form.append("candidatos", JSON.stringify(candidatos.map(({ nome, operadora, valorCadastrado }) => ({
    nome,
    operadora: operadora ?? "",
    valorEsperado: Number.isFinite(valorCadastrado) && (valorCadastrado ?? 0) > 0 ? valorCadastrado!.toFixed(2) : "",
    competenciaEsperada: competencia,
  }))));
  // O upload inclui PDF e recortes de detalhe; permita tempo suficiente para o proxy
  // responder mesmo quando o navegador estiver enviando um arquivo grande.
  const response = await fetch(`/api/ia/extracoes?modo=${modo}`, { method: "POST", body: form, signal: AbortSignal.timeout(120000) });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(typeof erro.detail === "string" ? erro.detail : `Serviço de IA respondeu HTTP ${response.status}`);
  }
  const inicial = await response.json();
  if (!inicial.id) throw new Error('Serviço de IA não devolveu o ID da execução.');
  if (inicial.status === 'FALHA') throw new Error(inicial.erro || 'Falha no processamento da IA.');
  return inicial;
}

export async function aguardarExtracao(inicial: { id: string; status: string; resultado?: any; erro?: string }): Promise<{ id: string; resultado: any }> {
  const { id } = inicial;
  if (inicial.status === 'CONCLUIDA') return { id, resultado: inicial.resultado };
  let resultado: any;
  const prazo = Date.now() + 10 * 60 * 1000;
  while (Date.now() < prazo) {
    const consulta = await fetch(`/api/ia/execucoes/${id}`, { signal: AbortSignal.timeout(15000) });
    if (!consulta.ok) throw new Error(`Falha ao consultar execução ${id}: HTTP ${consulta.status}`);
    const execucao = await consulta.json();
    if (execucao.status === "FALHA") throw new Error(execucao.erro || "Falha no processamento da IA.");
    if (execucao.status === "CONCLUIDA") { resultado = execucao.resultado; break; }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  if (!resultado) throw new Error(`Processamento ainda não concluído. Execução: ${id}`);
  return { id, resultado };
}

export async function solicitarExtracaoComId(file: File, tipo: TipoDocumentoArquivo, candidatos: { nome: string; operadora?: string; valorCadastrado?: number }[] = [], competencia = ''): Promise<{ id: string; resultado: any }> {
  const modo = import.meta.env.VITE_IA_EXECUTION_MODE === 'sync' ? 'sync' : 'async';
  return aguardarExtracao(await iniciarExtracao(file, tipo, candidatos, competencia, modo));
}

export async function solicitarExtracao(file: File, tipo: TipoDocumentoArquivo, candidatos: { nome: string; operadora?: string; valorCadastrado?: number }[] = [], competencia = ''): Promise<any> {
  return (await solicitarExtracaoComId(file, tipo, candidatos, competencia)).resultado;
}

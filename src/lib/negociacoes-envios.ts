/**
 * Relatório de Negociações enviado pelas Associações (Fase 3). A associação seleciona a competência, anexa o arquivo e
 * confirma o envio; a GERDAB consulta o MESMO arquivo e o usa como referência para conferir parcelas manualmente.
 *
 * O arquivo **nunca é interpretado**: sem OCR, IA, importação estruturada, preenchimento de negociações, alteração de
 * cálculos, baixa ou confirmação de pagamento. Um arquivo pode conter vários servidores; a vinculação às negociações é
 * manual (a GERDAB pode apontá-lo como "origem da informação" ao confirmar uma quitação).
 *
 * Cada envio é um registro independente (arquivo, data/hora e situação próprios); nenhum registro é sobrescrito.
 * Conteúdo dos arquivos em IndexedDB (`armazenamento-arquivos.ts`), sem limite artificial de tamanho; metadados aqui.
 * O seletor de associação das telas simula a associação autenticada (limitação do protótipo).
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { obterArquivo, removerArquivo, salvarArquivo } from "./armazenamento-arquivos";

export interface EnvioRelatorioNegociacao {
  id: string;
  associacao: string;
  /** "AAAA-MM". */
  competencia: string;
  nomeArquivo: string;
  tamanho?: number;
  mime?: string;
  enviadoEm: string;
  enviadoPor: string;
  /** "recebido" = registrado pela GERDAB; "conferido" = a GERDAB marcou manualmente que conferiu (não altera nada financeiro). */
  situacao: "recebido" | "conferido";
  conferidoEm?: string;
  conferidoPor?: string;
  /** Arquivo em IndexedDB (mesmo id). Ausente = arquivo de demonstração sem conteúdo. */
  comArquivo: boolean;
  /** Registro de demonstração. */
  demo?: boolean;
}

export const ASSOCIACOES_ENVIO = ["Assefaz", "Assetran"] as const;
const EVENTO = "prosaude-negociacoes"; // mesmo evento de `negociacoes.ts` (fila, indicadores e notificações recarregam)

export function loadEnvios(): EnvioRelatorioNegociacao[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.negociacoesEnvios) ?? "[]") as EnvioRelatorioNegociacao[];
  } catch {
    return [];
  }
}

function saveEnvios(e: EnvioRelatorioNegociacao[]) {
  try {
    localStorage.setItem(PROSAUDE_STORAGE_KEYS.negociacoesEnvios, JSON.stringify(e));
  } catch {
    throw new Error("Não foi possível registrar o envio (armazenamento do navegador cheio).");
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Mais recentes primeiro. */
export function listarEnvios(associacao?: string): EnvioRelatorioNegociacao[] {
  return loadEnvios()
    .filter((e) => !associacao || e.associacao === associacao)
    .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
}

export function getEnvio(id: string): EnvioRelatorioNegociacao | undefined {
  return loadEnvios().find((e) => e.id === id);
}

/** Nomenclatura ÚNICA da situação (Portal da Associação e área da GERDAB). "Pendente de conferência" (amarelo) é automático
 *  ao enviar; "Conferido" (verde) só existe após a GERDAB executar "Marcar como conferido". Receber o arquivo nunca é verde. */
export const ROTULO_SITUACAO_ENVIO: Record<EnvioRelatorioNegociacao["situacao"], string> = { recebido: "Pendente de conferência", conferido: "Conferido" };

export const rotuloEnvio = (e: EnvioRelatorioNegociacao) => `Relatório ${e.associacao.toUpperCase()} — competência ${e.competencia.split("-").reverse().join("/")}`;

const novoId = () => `env-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Registra o envio. Nunca interpreta o arquivo e nunca toca em negociações, cálculos ou parcelas. */
export async function enviarRelatorioNegociacoes(input: { associacao: string; competencia: string; arquivo: File; enviadoPor: string; demo?: boolean }): Promise<EnvioRelatorioNegociacao> {
  if (!input.associacao) throw new Error("Selecione a associação.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.competencia)) throw new Error("Informe a competência de referência (mês e ano).");
  if (!input.arquivo) throw new Error("Selecione o arquivo do relatório.");
  const todos = loadEnvios();
  const id = novoId();
  await salvarArquivo(id, input.arquivo);
  const envio: EnvioRelatorioNegociacao = {
    id,
    associacao: input.associacao,
    competencia: input.competencia,
    nomeArquivo: input.arquivo.name,
    tamanho: input.arquivo.size,
    mime: input.arquivo.type || undefined,
    enviadoEm: new Date().toISOString(),
    enviadoPor: input.enviadoPor,
    situacao: "recebido",
    comArquivo: true,
    demo: input.demo || undefined,
  };
  try {
    saveEnvios([...todos, envio]);
  } catch (e) {
    await removerArquivo(id);
    throw e;
  }
  return envio;
}

/** Marcação MANUAL da GERDAB ("conferi este arquivo"). Não gera baixa, não confirma pagamento, não altera cálculo. */
export function marcarEnvioConferido(id: string, responsavel: string): EnvioRelatorioNegociacao {
  const todos = loadEnvios();
  const alvo = todos.find((e) => e.id === id);
  if (!alvo) throw new Error("Envio não encontrado.");
  if (alvo.situacao === "conferido") return alvo;
  const atualizado: EnvioRelatorioNegociacao = { ...alvo, situacao: "conferido", conferidoEm: new Date().toISOString(), conferidoPor: responsavel };
  saveEnvios(todos.map((e) => (e.id === id ? atualizado : e)));
  return atualizado;
}

/** Envios aguardando conferência da GERDAB (base da notificação). */
export const enviosAguardandoConferencia = () => loadEnvios().filter((e) => e.situacao === "recebido");

/** Abre/baixa o MESMO arquivo que a associação enviou (do IndexedDB). Sem conteúdo (demonstração), mostra uma página identificando-o. */
export async function abrirArquivoEnvio(e: EnvioRelatorioNegociacao, baixar = false) {
  const blob = e.comArquivo ? await obterArquivo(e.id) : undefined;
  let url: string;
  if (blob) {
    url = URL.createObjectURL(blob);
  } else {
    const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    url = URL.createObjectURL(new Blob([`<!doctype html><meta charset="utf-8"><title>${esc(e.nomeArquivo)}</title><body style="font-family:sans-serif;padding:2rem"><h2>${esc(e.nomeArquivo)}</h2><p>${esc(rotuloEnvio(e))}</p><p style="color:#666">Arquivo de demonstração do protótipo (sem conteúdo).</p></body>`], { type: "text/html" }));
  }
  if (baixar) {
    const a = document.createElement("a");
    a.href = url;
    a.download = blob ? e.nomeArquivo : `${e.nomeArquivo}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

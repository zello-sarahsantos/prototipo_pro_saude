/**
 * Motor GENÉRICO de emissões independentes de relatórios — reutilizável por qualquer tipo de relatório (`tipoRelatorio`).
 *
 * Regras:
 *  - Cada emissão é um documento próprio, com **número sequencial independente por tipo + competência de referência**
 *    ("Relatório 1", "Relatório 2"…), snapshot integral das linhas e dos registros incluídos. Nada edita ou apaga emissões.
 *  - Emitir de novo na mesma competência NÃO é correção: é outra emissão independente (sem justificativa), com os registros que
 *    a GERDAB selecionar. Registros não selecionados continuam disponíveis para emissões futuras.
 *  - Reemitir um registro que já consta em outra emissão é permitido, mas exige confirmação explícita de duplicidade, que fica
 *    registrada na emissão (`reemissao`).
 *  - O conteúdo (`linhas`) é opaco para o motor: cada relatório define o seu formato e a sua exportação.
 *
 * Hoje usado só pelo Relatório de Alterações (`tipoRelatorio = "alteracoes"`). O Relatório de Suspensões deverá reutilizá-lo
 * quando suas regras forem validadas com a GERDAB — nenhuma regra de suspensão existe aqui.
 */
import { useEffect, useState } from "react";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";

export const EVENTO_EMISSOES_RELATORIO = "prosaude-emissoes-relatorio";

export interface EmissaoRelatorio<L = unknown> {
  id: string;
  tipoRelatorio: string;
  /** 1, 2, 3… independente por tipo + competência de referência. */
  numero: number;
  competenciaReferencia: string;
  competenciaPagamento: string;
  /** Data e hora de emissão (ISO) — preservada em toda reexportação. */
  geradoEm: string;
  responsavel: string;
  /** Conteúdo integral consolidado (snapshot): exportações usam exclusivamente isto. */
  linhas: L[];
  /** Registros de origem que compõem a emissão. */
  registroIds: string[];
  totalLinhas: number;
  totalRegistros: number;
  demonstrativo: boolean;
  /** Parâmetro de apresentação gravado na emissão (ex.: prefixo numérico dos títulos). */
  parametros?: Record<string, string>;
  /** Presente quando a emissão repete registros já emitidos antes, com a confirmação explícita de duplicidade. */
  reemissao?: { registroIds: string[]; confirmadoPor: string; dataHora: string };
}

export function listarEmissoes<L = unknown>(tipoRelatorio: string): EmissaoRelatorio<L>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
    const todas = raw ? (JSON.parse(raw) as EmissaoRelatorio<L>[]) : [];
    return todas.filter((e) => e.tipoRelatorio === tipoRelatorio);
  } catch {
    return [];
  }
}

/** Emissões de uma competência de referência, da mais recente para a mais antiga. */
export const emissoesDaCompetencia = <L = unknown>(tipoRelatorio: string, competenciaReferencia: string) =>
  listarEmissoes<L>(tipoRelatorio)
    .filter((e) => e.competenciaReferencia === competenciaReferencia)
    .sort((a, b) => b.numero - a.numero);

export const proximoNumeroEmissao = (tipoRelatorio: string, competenciaReferencia: string) => Math.max(0, ...listarEmissoes(tipoRelatorio).filter((e) => e.competenciaReferencia === competenciaReferencia).map((e) => e.numero)) + 1;

/** Para cada registro, os números das emissões da competência em que ele já foi incluído. */
export function numerosEmitidosPorRegistro(tipoRelatorio: string, competenciaReferencia: string): Map<string, number[]> {
  const mapa = new Map<string, number[]>();
  for (const e of emissoesDaCompetencia(tipoRelatorio, competenciaReferencia).slice().reverse()) for (const id of e.registroIds) mapa.set(id, [...(mapa.get(id) ?? []), e.numero]);
  return mapa;
}

/** Ids de registros que constam em qualquer emissão do tipo (não podem ser removidos como demonstração). */
export const idsEmitidos = (tipoRelatorio: string): Set<string> => new Set(listarEmissoes(tipoRelatorio).flatMap((e) => e.registroIds));

/** Acrescenta uma emissão (append-only). O número é atribuído aqui, dentro da competência. */
export function registrarEmissao<L>(dados: Omit<EmissaoRelatorio<L>, "id" | "numero" | "geradoEm" | "totalLinhas" | "totalRegistros">): EmissaoRelatorio<L> {
  const emissao: EmissaoRelatorio<L> = {
    ...dados,
    id: `emi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    numero: proximoNumeroEmissao(dados.tipoRelatorio, dados.competenciaReferencia),
    geradoEm: new Date().toISOString(),
    totalLinhas: dados.linhas.length,
    totalRegistros: dados.registroIds.length,
    // cópia profunda: o snapshot não compartilha referências com nada que possa mudar depois
    linhas: JSON.parse(JSON.stringify(dados.linhas)),
  };
  const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
  const todas = raw ? (JSON.parse(raw) as EmissaoRelatorio[]) : [];
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes, JSON.stringify([...todas, emissao]));
  window.dispatchEvent(new Event(EVENTO_EMISSOES_RELATORIO));
  return emissao;
}

export function useEmissoes<L = unknown>(tipoRelatorio: string): EmissaoRelatorio<L>[] {
  const [lista, setLista] = useState<EmissaoRelatorio<L>[]>([]);
  useEffect(() => {
    const atualizar = () => setLista(listarEmissoes<L>(tipoRelatorio));
    atualizar();
    window.addEventListener(EVENTO_EMISSOES_RELATORIO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_EMISSOES_RELATORIO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [tipoRelatorio]);
  return lista;
}

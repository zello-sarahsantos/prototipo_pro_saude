/**
 * AMBIENTE DEMONSTRATIVO do Relatório de Alterações — SOMENTE PROTÓTIPO, 100% fictício.
 *
 * A demonstração NÃO insere registros diretamente na tabela. O fluxo é: **Restaurar demonstração** (limpa o que é demonstrativo, liga o
 * ambiente e seleciona referência setembro/2026 e pagamento outubro/2026) → tabela vazia → **Buscar e preencher registros** → o mesmo código real de
 * identificação percorre as FONTES FICTÍCIAS isoladas (`fontes-alteracoes.ts`, em memória) e cria os registros, sempre "identificada"
 * (pendente de conferência) → conferir/editar/descartar/incluir → emitir.
 *
 * Isolamento: nada é gravado em comprovantes, planilhas, requerimentos, cadastro, pagamentos nem nas emissões reais. Enquanto o ambiente
 * está ativo, os registros gerados e os incluídos manualmente nascem marcados "Demonstrativo" (e as emissões feitas com eles, também) — é isso
 * que permite à restauração limpar SÓ o que é demonstrativo. Registros e emissões reais nunca são tocados.
 *
 * Cenários (Setembro/2026): ver `fontes-alteracoes.ts`. A natureza de cada movimentação é a que o mecanismo realmente identifica nas fontes
 * (nada é classificado à mão): o que a fonte não informa chega "A conferir" para a GERDAB classificar.
 */
import { useSyncExternalStore } from "react";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { EVENTO_EMISSOES_RELATORIO, listarEmissoes, type EmissaoRelatorio } from "./emissoes-relatorio";
import { removerRegistrosDemonstrativos, type RegistroAlteracao } from "./relatorio-alteracoes";
import { COMPETENCIA_DEMONSTRATIVA_ALTERACOES, PAGAMENTO_DEMONSTRATIVO_ALTERACOES } from "./fontes-alteracoes";
import type { LinhaRelatorio } from "./relatorio-alteracoes-geracao";

export { COMPETENCIA_DEMONSTRATIVA_ALTERACOES, PAGAMENTO_DEMONSTRATIVO_ALTERACOES };

export const EVENTO_AMBIENTE_DEMO_ALTERACOES = "prosaude-ambiente-demo-alteracoes";

export const ambienteDemoAlteracoesAtivo = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PROSAUDE_STORAGE_KEYS.ambienteDemoAlteracoes) === "1";
  } catch {
    return false;
  }
};
export function definirAmbienteDemoAlteracoes(ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(PROSAUDE_STORAGE_KEYS.ambienteDemoAlteracoes, "1");
    else localStorage.removeItem(PROSAUDE_STORAGE_KEYS.ambienteDemoAlteracoes);
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_AMBIENTE_DEMO_ALTERACOES));
}
const assinar = (aviso: () => void) => {
  window.addEventListener(EVENTO_AMBIENTE_DEMO_ALTERACOES, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO_AMBIENTE_DEMO_ALTERACOES, aviso);
    window.removeEventListener("storage", aviso);
  };
};
/** Ambiente demonstrativo ativo? (falso no servidor e na hidratação; o valor real entra logo depois). */
export const useAmbienteDemoAlteracoes = () => useSyncExternalStore(assinar, ambienteDemoAlteracoesAtivo, () => false);

/* ── Restauração ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface DiagnosticoRestauracaoAlteracoes {
  aRemover: RegistroAlteracao[];
  editados: number;
  descartados: number;
  manuais: number;
  /** Emissões feitas SOMENTE com registros demonstrativos: serão removidas do histórico. */
  emissoesDemonstrativas: EmissaoRelatorio<LinhaRelatorio>[];
  /** Emissões com qualquer linha real: NUNCA são removidas (e protegem os registros que contêm). */
  emissoesMantidas: number;
  protegidos: RegistroAlteracao[];
  reaisPreservados: number;
}

const ehEmissaoDemonstrativa = (e: EmissaoRelatorio<LinhaRelatorio>) => e.linhas.length > 0 && e.linhas.every((l) => l.demonstrativo === true);

/** Delimita o alcance da limpeza (função pura: não grava nada). */
export function diagnosticarRestauracaoAlteracoes(registros: RegistroAlteracao[], emissoes: EmissaoRelatorio<LinhaRelatorio>[]): DiagnosticoRestauracaoAlteracoes {
  const mantidas = emissoes.filter((e) => !ehEmissaoDemonstrativa(e));
  const idsMantidos = new Set(mantidas.flatMap((e) => e.registroIds));
  const demos = registros.filter((r) => r.demonstrativo);
  const protegidos = demos.filter((r) => idsMantidos.has(r.id));
  const aRemover = demos.filter((r) => !idsMantidos.has(r.id));
  // Intervenção do analista = qualquer evento além da inclusão do registro (a busca é atribuída ao analista que a acionou).
  const editado = (r: RegistroAlteracao) => r.historico.some((e) => e.tipo !== "inclusao_registro");
  return {
    aRemover,
    editados: aRemover.filter(editado).length,
    descartados: aRemover.filter((r) => r.situacao === "descartada").length,
    manuais: aRemover.filter((r) => r.origemInformacao === "manual").length,
    emissoesDemonstrativas: emissoes.filter(ehEmissaoDemonstrativa),
    emissoesMantidas: mantidas.length,
    protegidos,
    reaisPreservados: registros.length - demos.length,
  };
}

export interface ResultadoRestauracaoAlteracoes {
  registrosRemovidos: number;
  emissoesRemovidas: number;
  protegidos: number;
}

/**
 * Restaura o ambiente demonstrativo: remove SÓ os registros demonstrativos (e as emissões compostas apenas por eles), limpando junto os
 * descartes e as conferências (guardados nos próprios registros), e liga o ambiente. Não toca registros reais, emissões com qualquer linha
 * real nem dados de outros módulos. Deixa a tabela vazia para uma nova execução de "Buscar e preencher registros".
 */
export function restaurarAmbienteDemonstrativoAlteracoes(registros: RegistroAlteracao[]): ResultadoRestauracaoAlteracoes {
  const emissoes = listarEmissoes<LinhaRelatorio>("alteracoes");
  const diag = diagnosticarRestauracaoAlteracoes(registros, emissoes);
  const rm = removerRegistrosDemonstrativos(new Set(diag.protegidos.map((r) => r.id)));
  let emissoesRemovidas = 0;
  if (diag.emissoesDemonstrativas.length > 0) {
    const ids = new Set(diag.emissoesDemonstrativas.map((e) => e.id));
    try {
      const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
      const todas = raw ? (JSON.parse(raw) as EmissaoRelatorio[]) : [];
      const restantes = todas.filter((e) => !(e.tipoRelatorio === "alteracoes" && ids.has(e.id)));
      emissoesRemovidas = todas.length - restantes.length;
      if (restantes.length > 0) localStorage.setItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes, JSON.stringify(restantes));
      else localStorage.removeItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
      window.dispatchEvent(new Event(EVENTO_EMISSOES_RELATORIO));
    } catch {
      /* sem armazenamento */
    }
  }
  definirAmbienteDemoAlteracoes(true);
  return { registrosRemovidos: rm.removidos, emissoesRemovidas, protegidos: diag.protegidos.length };
}

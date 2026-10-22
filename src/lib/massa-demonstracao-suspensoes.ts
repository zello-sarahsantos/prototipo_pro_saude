/**
 * AMBIENTE DEMONSTRATIVO do Relatório de Suspensões — SOMENTE PROTÓTIPO, 100% fictício.
 *
 * A demonstração NÃO insere registros diretamente na tabela. O fluxo é: **Restaurar demonstração** (limpa o que é demonstrativo e liga o
 * ambiente) → tabela vazia → **Gerar situações da competência** → o mesmo código real de S5/S6 percorre as FONTES FICTÍCIAS isoladas
 * (`fontes-suspensoes.ts`: comprovantes/Fechamento, pendências documentais, requerimentos de exclusão, planilhas e um histórico de suspensões
 * já emitidas, tudo em memória) e preenche a tabela → conferir/editar/descartar/incluir → emitir.
 *
 * Isolamento: nada é gravado em comprovantes, planilhas, requerimentos, cadastro, pagamentos nem nas emissões reais. Enquanto o ambiente
 * está ativo, os registros gerados e os incluídos manualmente nascem marcados "Demonstrativo" (e as emissões feitas com eles, também) — é isso
 * que permite à restauração limpar SÓ o que é demonstrativo. Registros e emissões reais nunca são tocados.
 *
 * Cenários (competência demonstrativa Setembro/2026): Suspender por comprovante ausente (Boleto) e recusado (Boleto), por documentação
 * (ASSEFAZ e Boleto, este último com mais de uma pendência); Permanece suspenso por comprovante anterior (Boleto) e por documentação
 * (ASSETRAN em análise; ASSEFAZ aguardando envio); Excluir por requerimento aprovado (ASSEFAZ e ASSETRAN); investigações por dispensa de
 * comprovante, por titular ausente de planilha (ASSEFAZ), por informação inconclusiva em planilha (status Atenção, ASSETRAN) e por
 * continuidade sem como verificar a regularização; e uma pendência já regularizada que NÃO gera nova sugestão.
 */
import { useSyncExternalStore } from "react";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { EVENTO_EMISSOES_RELATORIO, listarEmissoes, type EmissaoRelatorio } from "./emissoes-relatorio";
import { removerSuspensoesDemonstrativas, type RegistroSuspensao } from "./relatorio-suspensoes";
import { COMPETENCIA_DEMONSTRATIVA } from "./fontes-suspensoes";
import type { LinhaRelatorio } from "./relatorio-alteracoes-geracao";

export { COMPETENCIA_DEMONSTRATIVA };

export const EVENTO_AMBIENTE_DEMO = "prosaude-ambiente-demo-suspensoes";
/** Responsável gravado pelo próprio sistema: qualquer evento de outro responsável num registro demonstrativo indica intervenção do analista. */
export const RESPONSAVEL_BUSCA_DEMONSTRATIVA = "Sistema (leitura dos módulos)";

export const ambienteDemoAtivo = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PROSAUDE_STORAGE_KEYS.ambienteDemoSuspensoes) === "1";
  } catch {
    return false;
  }
};
export function definirAmbienteDemo(ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(PROSAUDE_STORAGE_KEYS.ambienteDemoSuspensoes, "1");
    else localStorage.removeItem(PROSAUDE_STORAGE_KEYS.ambienteDemoSuspensoes);
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_AMBIENTE_DEMO));
}
const assinar = (aviso: () => void) => {
  window.addEventListener(EVENTO_AMBIENTE_DEMO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO_AMBIENTE_DEMO, aviso);
    window.removeEventListener("storage", aviso);
  };
};
/** Ambiente demonstrativo ativo? (falso no servidor e na hidratação; o valor real entra logo depois). */
export const useAmbienteDemo = () => useSyncExternalStore(assinar, ambienteDemoAtivo, () => false);

/* ── Restauração ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface DiagnosticoRestauracaoSuspensoes {
  /** Registros demonstrativos que serão removidos (geração demonstrativa e inclusões manuais feitas no ambiente demonstrativo). */
  aRemover: RegistroSuspensao[];
  /** Destes, quantos tiveram intervenção do analista (edição, conferência ou descarte). */
  editados: number;
  descartados: number;
  /** Inclusões manuais feitas no ambiente demonstrativo (sem origem automática). */
  manuais: number;
  /** Emissões feitas SOMENTE com registros demonstrativos: serão removidas do histórico. */
  emissoesDemonstrativas: EmissaoRelatorio<LinhaRelatorio>[];
  /** Emissões com qualquer linha real: NUNCA são removidas (e protegem os registros que contêm). */
  emissoesMantidas: number;
  /** Registros demonstrativos que constam numa emissão mantida: permanecem. */
  protegidos: RegistroSuspensao[];
  /** Registros reais (não demonstrativos): preservados. */
  reaisPreservados: number;
}

const ehEmissaoDemonstrativa = (e: EmissaoRelatorio<LinhaRelatorio>) => e.linhas.length > 0 && e.linhas.every((l) => l.demonstrativo === true);

/** Delimita o alcance da limpeza (função pura: não grava nada). */
export function diagnosticarRestauracaoSuspensoes(registros: RegistroSuspensao[], emissoes: EmissaoRelatorio<LinhaRelatorio>[]): DiagnosticoRestauracaoSuspensoes {
  const mantidas = emissoes.filter((e) => !ehEmissaoDemonstrativa(e));
  const idsMantidos = new Set(mantidas.flatMap((e) => e.registroIds));
  const demos = registros.filter((r) => r.demonstrativo);
  const protegidos = demos.filter((r) => idsMantidos.has(r.id));
  const aRemover = demos.filter((r) => !idsMantidos.has(r.id));
  const editado = (r: RegistroSuspensao) => r.historico.some((e) => e.responsavel !== RESPONSAVEL_BUSCA_DEMONSTRATIVA);
  return {
    aRemover,
    editados: aRemover.filter(editado).length,
    descartados: aRemover.filter((r) => r.situacao === "descartada").length,
    manuais: aRemover.filter((r) => !r.sugestao).length,
    emissoesDemonstrativas: emissoes.filter(ehEmissaoDemonstrativa),
    emissoesMantidas: mantidas.length,
    protegidos,
    reaisPreservados: registros.length - demos.length,
  };
}

export interface ResultadoRestauracaoSuspensoes {
  registrosRemovidos: number;
  emissoesRemovidas: number;
  protegidos: number;
}

/**
 * Restaura o ambiente demonstrativo: remove SÓ os registros demonstrativos (e as emissões compostas apenas por eles), limpando junto os
 * descartes, as conferências e os controles de geração (guardados nos próprios registros), e liga o ambiente. Não toca registros reais, emissões
 * com qualquer linha real nem dados de outros módulos. Deixa a tabela vazia para uma nova execução de "Gerar situações da competência".
 */
export function restaurarAmbienteDemonstrativo(registros: RegistroSuspensao[]): ResultadoRestauracaoSuspensoes {
  const emissoes = listarEmissoes<LinhaRelatorio>("suspensoes");
  const diag = diagnosticarRestauracaoSuspensoes(registros, emissoes);
  const idsMantidos = new Set(diag.protegidos.map((r) => r.id));
  const rm = removerSuspensoesDemonstrativas(idsMantidos);
  let emissoesRemovidas = 0;
  if (diag.emissoesDemonstrativas.length > 0) {
    const ids = new Set(diag.emissoesDemonstrativas.map((e) => e.id));
    try {
      const raw = localStorage.getItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
      const todas = raw ? (JSON.parse(raw) as EmissaoRelatorio[]) : [];
      const restantes = todas.filter((e) => !(e.tipoRelatorio === "suspensoes" && ids.has(e.id)));
      emissoesRemovidas = todas.length - restantes.length;
      if (restantes.length > 0) localStorage.setItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes, JSON.stringify(restantes));
      else localStorage.removeItem(PROSAUDE_STORAGE_KEYS.relatorioEmissoes);
      window.dispatchEvent(new Event(EVENTO_EMISSOES_RELATORIO));
    } catch {
      /* sem armazenamento */
    }
  }
  definirAmbienteDemo(true);
  return { registrosRemovidos: rm.removidos, emissoesRemovidas, protegidos: diag.protegidos.length };
}

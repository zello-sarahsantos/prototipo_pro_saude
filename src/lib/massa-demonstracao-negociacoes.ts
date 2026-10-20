/**
 * **MASSA DE DEMONSTRAÇÃO do Módulo de Negociações — SOMENTE PROTÓTIPO.** Fictícia: servidores do cadastro
 * de demonstração (`servidoresList`), valores inventados; nenhum dado pessoal real. Semeada uma única vez
 * (marcador em `localStorage`) pelo próprio motor (`criarNegociacao`), então respeita as mesmas regras do
 * cadastro real — inclusive o auxílio calculado por `calcularReembolso` a partir do valor da parcela. Os anexos
 * são **de demonstração** (sem arquivo): ao abrir, o sistema mostra uma página identificando o documento.
 *
 * Cenários (quitação/relatórios/envios das associações entram nas Fases 2–4):
 *  1. Maria Oliveira — 2 meses de R$ 2.500,00 → auxílio R$ 2.250,00 cada; total R$ 4.500,00; 10 parcelas de R$ 450,00.
 *  2. Carlos Pereira — auxílio de um mês AJUSTADO manualmente + uma parcela de ressarcimento ajustada.
 *  3. Fernanda Lima — 3 meses de R$ 3.500,00; total R$ 9.450,00; 6 parcelas de R$ 1.575,00.
 *  4. Ana Beatriz Ferreira — parcela acima do teto (R$ 4.300,00 → base R$ 4.000,00 → auxílio R$ 3.600,00) e entrada
 *     diferenciada: ressarcimento preenchido manualmente (regra não validada, P01).
 *  5. João da Silva — total R$ 1.000,00 em 3 parcelas: truncamento (R$ 333,33; resíduo R$ 0,01).
 *  6. Patrícia Costa — 2 meses de R$ 2.000,00; total R$ 3.600,00; 4 parcelas de R$ 900,00.
 *  7. Roberto Santos — total R$ 3.800,00 em 12 parcelas: truncamento (R$ 316,66; soma R$ 3.799,92; resíduo R$ 0,08).
 *  8. Eduardo Nascimento — Janeiro, Fevereiro e Março/2026 de R$ 1.000,00 → R$ 900,00 cada; total R$ 2.700,00; 9 parcelas de R$ 300,00.
 * Fase 2 (quitação manual): Carlos 2/6 quitadas; João com quitação fora de ordem; Patrícia concluída (4/4); Roberto com
 * duas parcelas quitadas no mesmo mês; Fernanda segue sem quitação. Versão 5: os registros de demonstração anteriores (`demo`, ou da versão 1 sem arquivo nos anexos) são
 * substituídos; negociações cadastradas pelo usuário são preservadas.
 */
import { analistaReferencia, gerenteReferencia } from "./mock-data";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { removerArquivo } from "./armazenamento-arquivos";
import { loadEmissoes, removerEmissoes } from "./negociacoes-ressarcimento";
import { confirmarQuitacao, criarNegociacao, loadNegociacoes, removerNegociacoes, somarMesesISO, type NovaNegociacaoInput, type NovoDocumentoInput } from "./negociacoes";

const VERSAO_MASSA = "5";

const vencimentos = (primeiro: string, n: number) => Array.from({ length: n }, (_, i) => somarMesesISO(primeiro, i));
const doc = (nome: string, tipo: NovoDocumentoInput["tipo"], finalidade: NovoDocumentoInput["finalidade"], descricao?: string): NovoDocumentoInput => ({ nome, tipo, finalidade, descricao });
const parcelas = (venc: string[], manual?: Record<number, { valorCents: number; justificativa: string }>) => venc.map((v, i) => ({ numero: i + 1, vencimento: v, manual: manual?.[i + 1] }));

const CENARIOS: NovaNegociacaoInput[] = [
  {
    matricula: "23456",
    processoSEI: "00050.100001/2026-11",
    dataFormalizacao: "2026-10-05",
    observacoes: "Acordo firmado diretamente com a associação.",
    competencias: [
      { competencia: "2025-10", valorParcelaCents: 250000 },
      { competencia: "2025-11", valorParcelaCents: 250000 },
    ],
    parcelas: parcelas(vencimentos("2026-11-10", 10)),
    documentos: [doc("contrato_negociacao_demo.pdf", "contrato_negociacao", "fundamenta", "Contrato firmado entre o servidor e a associação."), doc("boleto_parcela_1_demo.pdf", "boleto", "apoio")],
    responsavel: analistaReferencia,
  },
  {
    matricula: "34567",
    processoSEI: "00050.100002/2026-22",
    dataFormalizacao: "2026-08-20",
    competencias: [
      { competencia: "2025-08", valorParcelaCents: 90000 },
      { competencia: "2025-09", valorParcelaCents: 90000, ajuste: { valorCents: 72000, justificativa: "Ajuste demonstrativo: componente não elegível identificado na documentação do mês." } },
      { competencia: "2025-10", valorParcelaCents: 90000 },
    ],
    parcelas: parcelas(vencimentos("2026-09-10", 6), {
      3: { valorCents: 37000, justificativa: "Ajuste demonstrativo: valor conferido manualmente com a documentação recebida da associação." },
    }),
    documentos: [doc("acordo_assinado_demo.pdf", "acordo_assinado", "fundamenta"), doc("relatorio_associacao_demo.xlsx", "documento_associacao", "apoio", "Relatório recebido da associação.")],
    responsavel: gerenteReferencia,
  },
  {
    matricula: "45678",
    processoSEI: "00050.100003/2026-33",
    dataFormalizacao: "2026-04-28",
    competencias: [
      { competencia: "2025-05", valorParcelaCents: 350000 },
      { competencia: "2025-06", valorParcelaCents: 350000 },
      { competencia: "2025-07", valorParcelaCents: 350000 },
    ],
    parcelas: parcelas(vencimentos("2026-05-10", 6)),
    documentos: [doc("contrato_negociacao_demo.pdf", "contrato_negociacao", "fundamenta"), doc("documentos_servidor_demo.pdf", "documento_servidor", "apoio", "Documentação encaminhada diretamente pelo servidor.")],
    responsavel: analistaReferencia,
  },
  {
    matricula: "89012",
    dataFormalizacao: "2026-09-15",
    observacoes: "Entrada de 50% e restante em três parcelas — regra de distribuição pendente de validação (P01).",
    competencias: [
      { competencia: "2025-03", valorParcelaCents: 430000 },
      { competencia: "2025-04", valorParcelaCents: 430000 },
    ],
    parcelas: parcelas(vencimentos("2026-09-20", 4), (() => {
      const j = "Entrada diferenciada: valor preenchido manualmente conforme o acordo anexado (regra de distribuição ainda não validada).";
      return { 1: { valorCents: 360000, justificativa: j }, 2: { valorCents: 120000, justificativa: j }, 3: { valorCents: 120000, justificativa: j }, 4: { valorCents: 120000, justificativa: j } };
    })()),
    documentos: [doc("acordo_assinado_demo.pdf", "acordo_assinado", "fundamenta", "Acordo com entrada diferenciada.")],
    responsavel: analistaReferencia,
  },
  {
    matricula: "12345",
    dataFormalizacao: "2026-10-02",
    competencias: [{ competencia: "2025-09", valorParcelaCents: 111111 }],
    parcelas: parcelas(vencimentos("2026-11-15", 3)),
    documentos: [doc("contrato_negociacao_demo.pdf", "contrato_negociacao", "fundamenta")],
    responsavel: analistaReferencia,
  },
  {
    matricula: "67890",
    processoSEI: "00050.100006/2026-66",
    dataFormalizacao: "2026-05-20",
    competencias: [
      { competencia: "2025-12", valorParcelaCents: 200000 },
      { competencia: "2026-01", valorParcelaCents: 200000 },
    ],
    parcelas: parcelas(vencimentos("2026-06-10", 4)),
    documentos: [doc("acordo_assinado_demo.pdf", "acordo_assinado", "fundamenta"), doc("relatorio_associacao_demo.xlsx", "documento_associacao", "apoio")],
    responsavel: gerenteReferencia,
  },
  {
    matricula: "56789",
    processoSEI: "00050.100007/2026-77",
    dataFormalizacao: "2026-07-30",
    observacoes: "Total elegível R$ 3.800,00 em 12 parcelas: valor truncado por parcela, com diferença residual exibida para conferência.",
    competencias: [
      { competencia: "2025-06", valorParcelaCents: 211111 },
      { competencia: "2025-07", valorParcelaCents: 211111 },
    ],
    parcelas: parcelas(vencimentos("2026-08-10", 12)),
    documentos: [doc("contrato_negociacao_demo.pdf", "contrato_negociacao", "fundamenta"), doc("relatorio_associacao_demo.xlsx", "documento_associacao", "apoio")],
    responsavel: analistaReferencia,
  },
  {
    matricula: "78901",
    dataFormalizacao: "2026-10-12",
    observacoes: "Três meses de R$ 1.000,00 negociados em 9 parcelas.",
    competencias: [
      { competencia: "2026-01", valorParcelaCents: 100000 },
      { competencia: "2026-02", valorParcelaCents: 100000 },
      { competencia: "2026-03", valorParcelaCents: 100000 },
    ],
    parcelas: parcelas(vencimentos("2026-11-05", 9)),
    documentos: [doc("contrato_negociacao_demo.pdf", "contrato_negociacao", "fundamenta")],
    responsavel: analistaReferencia,
  },
];

/** Quitações demonstrativas (cenários da Fase 2), registradas pelo próprio serviço — sempre manuais, fora de ordem quando indicado.
 *  `doc` = índice do documento de origem da própria negociação. */
const QUITACOES: Record<string, { parcela: number; data: string; doc?: number }[]> = {
  // Carlos: 2 de 6 quitadas (negociação em andamento), a 1ª com documento de origem.
  "34567": [{ parcela: 1, data: "2026-09-11", doc: 1 }, { parcela: 2, data: "2026-10-09" }],
  // João: quitação FORA DE ORDEM — parcela 2 quitada com a 1 ainda pendente.
  "12345": [{ parcela: 2, data: "2026-10-15" }],
  // Patrícia: todas quitadas → negociação concluída.
  "67890": [{ parcela: 1, data: "2026-06-12" }, { parcela: 2, data: "2026-07-13" }, { parcela: 3, data: "2026-08-11" }, { parcela: 4, data: "2026-09-10" }],
  // Roberto: duas parcelas quitadas no mesmo mês.
  "56789": [{ parcela: 1, data: "2026-10-05" }, { parcela: 2, data: "2026-10-06" }],
};

let semeando: Promise<void> | null = null;

/** Idempotente. Na migração de versão remove só a massa de demonstração anterior (marcada `demo` ou, na versão 1,
 *  com todos os anexos sem arquivo) e preserva qualquer negociação cadastrada pelo usuário. */
export function garantirMassaDemonstracaoNegociacoes(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes) === VERSAO_MASSA) return Promise.resolve();
  if (semeando) return semeando;
  semeando = (async () => {
    // Marca primeiro: evita semeadura duplicada em renderizações simultâneas.
    const anterior = localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes);
    localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes, VERSAO_MASSA);
    if (anterior) removerNegociacoes((n) => n.demo === true || (anterior === "1" && n.documentos.every((d) => !d.comArquivo)));
    for (const c of CENARIOS) {
      const neg = await criarNegociacao({ ...c, demo: true });
      for (const q of QUITACOES[c.matricula] ?? []) {
        try {
          await confirmarQuitacao(neg.id, { numeroParcela: q.parcela, data: q.data, responsavel: c.responsavel, documentoId: q.doc !== undefined ? neg.documentos[q.doc]?.id : undefined });
        } catch {
          /* data de referência simulada anterior à quitação demonstrativa: segue sem ela */
        }
      }
    }
  })().finally(() => {
    semeando = null;
  });
  return semeando;
}

/** RECURSO EXCLUSIVO DO PROTÓTIPO: apaga as negociações e semeia a massa novamente. */
export async function restaurarMassaDemonstracaoNegociacoes(): Promise<void> {
  localStorage.removeItem(PROSAUDE_STORAGE_KEYS.negociacoes);
  localStorage.removeItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes);
  await garantirMassaDemonstracaoNegociacoes();
}

/* ── Restauração do cenário demonstrativo do Relatório de Ressarcimento (Fase 4) ─────────────────────────────────────────
 * Identificação segura: as negociações de demonstração têm `demo === true` (gravado pela própria massa); negociações
 * cadastradas pelo usuário nunca recebem essa marca. Uma emissão é "demonstrativa" somente quando TODAS as suas linhas
 * pertencem a negociações demonstrativas; emissões que incluam qualquer negociação manual são preservadas. */

export interface DiagnosticoRestauracaoDemo {
  negociacoesDemo: number;
  quitacoesDemo: number;
  emissoesDemo: number;
  negociacoesManuais: number;
  emissoesPreservadas: number;
}

export function diagnosticarRestauracaoDemo(): DiagnosticoRestauracaoDemo {
  const negs = loadNegociacoes();
  const demo = negs.filter((n) => n.demo === true);
  const ids = new Set(demo.map((n) => n.id));
  const emissoes = loadEmissoes();
  const emissoesDemo = emissoes.filter((e) => e.linhas.length > 0 && e.linhas.every((l) => ids.has(l.negociacaoId)));
  return {
    negociacoesDemo: demo.length,
    quitacoesDemo: demo.reduce((t, n) => t + n.parcelas.filter((p) => p.quitacao).length, 0),
    emissoesDemo: emissoesDemo.length,
    negociacoesManuais: negs.length - demo.length,
    emissoesPreservadas: emissoes.length - emissoesDemo.length,
  };
}

/** Disponível só no contexto demonstrativo: existe massa de demonstração (ou o marcador de semeadura). */
export const haCenarioDemo = () => typeof window !== "undefined" && (loadNegociacoes().some((n) => n.demo === true) || localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes) !== null);

/** Remove SOMENTE as negociações `demo` (com seus anexos em IndexedDB) e as emissões demonstrativas, e semeia o cenário inicial
 *  de novo pelo mesmo mecanismo da massa. Negociações, quitações, documentos e emissões manuais não são tocados. */
export async function restaurarCenarioDemoRessarcimento(): Promise<DiagnosticoRestauracaoDemo> {
  const antes = diagnosticarRestauracaoDemo();
  const negs = loadNegociacoes();
  const ids = new Set(negs.filter((n) => n.demo === true).map((n) => n.id));
  const arquivos = negs.filter((n) => n.demo === true).flatMap((n) => n.documentos.filter((d) => d.comArquivo).map((d) => d.id));
  removerEmissoes((e) => e.linhas.length > 0 && e.linhas.every((l) => ids.has(l.negociacaoId)));
  removerNegociacoes((n) => n.demo === true);
  await Promise.all(arquivos.map((id) => removerArquivo(id).catch(() => undefined)));
  localStorage.removeItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoes);
  await garantirMassaDemonstracaoNegociacoes();
  return antes;
}

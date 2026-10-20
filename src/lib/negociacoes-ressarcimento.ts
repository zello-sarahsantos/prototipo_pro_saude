/**
 * Relatório de Ressarcimento de Negociações (Fase 4). Reúne, para o NURFI, as parcelas de negociação com QUITAÇÃO
 * MANUAL já confirmada (Fase 2) que ainda não foram incluídas em nenhum relatório emitido.
 *
 * Regras:
 *  - O valor é sempre `parcela.ressarcimento.finalCents` — nada é recalculado aqui.
 *  - A emissão grava um SNAPSHOT imutável (linhas e total congelados). Nenhuma negociação ou quitação é alterada.
 *  - Fonte única do controle de duplicidade: as próprias emissões gravadas. "Já incluída" é DERIVADO delas
 *    (negociacaoId + numeroParcela); não existe índice persistido separado.
 *  - Antes de gravar, a elegibilidade é conferida de novo contra o armazenamento. Limitação do protótipo: localStorage não
 *    tem transações; duas abas emitindo no mesmo instante não são totalmente protegidas.
 *  - Sem cancelamento/retificação, sem Ativo/Inativo, sem envio automático ao NURFI, sem notificação.
 */
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { EVENTO_NEGOCIACOES, loadNegociacoes, type Negociacao, type ParcelaNegociada } from "./negociacoes";
import type { RelatorioExportSpec } from "./relatorio-export";

export interface LinhaEmissaoRessarcimento {
  negociacaoId: string;
  numeroParcela: number;
  negociacaoNumero: number;
  matricula: string;
  nome: string;
  /** Associação da negociação ou, quando individual, a operadora. */
  associacaoOperadora: string;
  totalParcelas: number;
  /** "AAAA-MM-DD". */
  dataQuitacao: string;
  valorCents: number;
  ajusteManual: boolean;
}

export interface EmissaoRessarcimento {
  id: string;
  sequencia: number;
  emitidaEm: string;
  responsavel: string;
  linhas: LinhaEmissaoRessarcimento[];
  totalCents: number;
  demo?: boolean;
}

export const chaveParcela = (negociacaoId: string, numeroParcela: number) => `${negociacaoId}:${numeroParcela}`;

export function loadEmissoes(): EmissaoRessarcimento[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROSAUDE_STORAGE_KEYS.negociacoesEmissoes) ?? "[]") as EmissaoRessarcimento[];
  } catch {
    return [];
  }
}

/** Mais recentes primeiro. */
export const listarEmissoes = () => loadEmissoes().sort((a, b) => b.sequencia - a.sequencia);
export const getEmissao = (id: string) => loadEmissoes().find((e) => e.id === id);

/** Chaves (negociacaoId:parcela) já incluídas em alguma emissão — derivadas das emissões gravadas. */
export const chavesJaEmitidas = (emissoes: EmissaoRessarcimento[] = loadEmissoes()) =>
  new Set(emissoes.flatMap((e) => e.linhas.map((l) => chaveParcela(l.negociacaoId, l.numeroParcela))));

export interface ParcelaDisponivel {
  chave: string;
  negociacao: Negociacao;
  parcela: ParcelaNegociada;
}

/** Parcelas com quitação manual confirmada e ainda não incluídas em relatório emitido — independente da competência. */
export function getParcelasDisponiveis(negs: Negociacao[] = loadNegociacoes(), emissoes: EmissaoRessarcimento[] = loadEmissoes()): ParcelaDisponivel[] {
  const emitidas = chavesJaEmitidas(emissoes);
  const itens: ParcelaDisponivel[] = [];
  for (const negociacao of negs) {
    for (const parcela of negociacao.parcelas) {
      const chave = chaveParcela(negociacao.id, parcela.numero);
      if (parcela.quitacao && !emitidas.has(chave)) itens.push({ chave, negociacao, parcela });
    }
  }
  return itens.sort((a, b) => a.parcela.quitacao!.data.localeCompare(b.parcela.quitacao!.data) || a.negociacao.nomeServidor.localeCompare(b.negociacao.nomeServidor) || a.negociacao.numero - b.negociacao.numero || a.parcela.numero - b.parcela.numero);
}

export const associacaoOuOperadora = (n: Negociacao) => (n.associacao && n.associacao !== "—" ? n.associacao : n.operadora || "—");

/** Linha do relatório — usa o valor final já gravado na parcela, sem recalcular. */
export function montarLinha(d: ParcelaDisponivel): LinhaEmissaoRessarcimento {
  const { negociacao: n, parcela: p } = d;
  return {
    negociacaoId: n.id,
    numeroParcela: p.numero,
    negociacaoNumero: n.numero,
    matricula: n.matricula,
    nome: n.nomeServidor,
    associacaoOperadora: associacaoOuOperadora(n),
    totalParcelas: n.parcelas.length,
    dataQuitacao: p.quitacao!.data,
    valorCents: p.ressarcimento.finalCents,
    ajusteManual: p.ressarcimento.origem === "manual",
  };
}

/** Pré-visualização: monta as linhas das parcelas informadas SEM gravar nada. */
export const previaLinhas = (selecionadas: ParcelaDisponivel[]) => selecionadas.map(montarLinha);
export const somarCents = (linhas: { valorCents: number }[]) => linhas.reduce((t, l) => t + l.valorCents, 0);

/**
 * Emissão definitiva: confere de novo a elegibilidade contra o armazenamento atual (parcela ainda quitada e fora de
 * qualquer emissão), grava o snapshot e dispara o evento de atualização. Falha por inteiro (nada é gravado) se alguma
 * parcela deixou de ser elegível.
 */
export function emitirRelatorio(chaves: string[], responsavel: string): EmissaoRessarcimento {
  const unicas = Array.from(new Set(chaves));
  if (unicas.length === 0) throw new Error("Selecione ao menos uma parcela para emitir o relatório.");
  const emissoes = loadEmissoes();
  const disponiveis = new Map(getParcelasDisponiveis(loadNegociacoes(), emissoes).map((d) => [d.chave, d]));
  const indisponiveis = unicas.filter((c) => !disponiveis.has(c));
  if (indisponiveis.length > 0) {
    throw new Error(`${indisponiveis.length} parcela(s) selecionada(s) não está(ão) mais disponível(is) (já incluída(s) em outro relatório ou sem quitação). Atualize a lista e tente novamente; nada foi emitido.`);
  }
  const linhas = unicas.map((c) => montarLinha(disponiveis.get(c)!)).sort((a, b) => a.nome.localeCompare(b.nome) || a.negociacaoNumero - b.negociacaoNumero || a.numeroParcela - b.numeroParcela);
  const emissao: EmissaoRessarcimento = {
    id: `emi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sequencia: emissoes.reduce((m, e) => Math.max(m, e.sequencia), 0) + 1,
    emitidaEm: new Date().toISOString(),
    responsavel,
    linhas,
    totalCents: somarCents(linhas),
  };
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.negociacoesEmissoes, JSON.stringify([...emissoes, emissao]));
  window.dispatchEvent(new Event(EVENTO_NEGOCIACOES));
  return emissao;
}

/** Uso exclusivo da restauração da demonstração: remove emissões que satisfazem o filtro (as demais permanecem intactas). */
export function removerEmissoes(filtro: (e: EmissaoRessarcimento) => boolean) {
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.negociacoesEmissoes, JSON.stringify(loadEmissoes().filter((e) => !filtro(e))));
  window.dispatchEvent(new Event(EVENTO_NEGOCIACOES));
}

/** "20/10/2026, às 11h51" — horário de Brasília, como nos demais documentos. */
function dataHoraEmissao(iso: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}, às ${p.hour}h${p.minute}`;
}

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Mesma especificação para PDF e Excel: lê SOMENTE o snapshot (nunca os dados atuais). Sem ressalvas de regra provisória. */
export function specEmissao(e: EmissaoRessarcimento): RelatorioExportSpec<LinhaEmissaoRessarcimento> {
  return {
    titulo: `Ressarcimento de Negociações — Relatório nº ${e.sequencia}`,
    origem: "Negociações",
    nomeAba: "Ressarcimento Negociações",
    // Data e responsável identificam a EMISSÃO (não são filtros): bloco de identificação, sem linha "Filtros".
    identificacao: [
      { label: "Emitido em", valor: dataHoraEmissao(e.emitidaEm) },
      { label: "Responsável pela emissão", valor: e.responsavel },
    ],
    filtrosAplicados: [],
    ocultarLinhaFiltrosSeVazia: true,
    colunas: [
      { header: "Matrícula", valor: (l) => l.matricula, tipo: "texto", width: 12 },
      { header: "Nome", valor: (l) => l.nome, tipo: "texto", width: 28 },
      { header: "Associação/Operadora", valor: (l) => l.associacaoOperadora, tipo: "texto", width: 20 },
      { header: "Negociação", valor: (l) => `Nº ${l.negociacaoNumero}`, tipo: "texto", width: 12 },
      { header: "Parcela", valor: (l) => `${l.numeroParcela}/${l.totalParcelas}`, tipo: "texto", width: 9 },
      { header: "Data da quitação", valor: (l) => dataBR(l.dataQuitacao), tipo: "texto", width: 14 },
      { header: "Valor a ressarcir", valor: (l) => l.valorCents / 100, tipo: "moeda", width: 16 },
      { header: "Observação", valor: (l) => (l.ajusteManual ? "Preenchido manualmente" : ""), tipo: "texto", width: 22 },
    ],
    linhas: e.linhas,
    linhaTotal: { label: "Total geral", valores: [null, null, null, null, null, e.totalCents / 100, null] },
    nomeArquivoBase: `pro-saude_ressarcimento_negociacoes_${String(e.sequencia).padStart(3, "0")}`,
    orientacaoPdf: "landscape",
  };
}

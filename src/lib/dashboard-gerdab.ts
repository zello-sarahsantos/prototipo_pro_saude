/**
 * Seletores do Dashboard GERDAB — **somente dados reais do protótipo** (mesmas fontes das telas de
 * destino: Fechamento, Comprovantes, Ressarcimentos de meses anteriores, Documentação, Visões
 * Gerenciais, Históricos). Nada aqui inventa número: o que não tem fonte real vive em
 * `dashboard-gerdab-demo.ts` / `movimentacoes-pro-saude.ts` e é sinalizado como demonstrativo.
 */
import {
  beneficiariosPagamento,
  formatCompetencia,
  servidorAtual,
  servidoresList,
  statusLabels,
  type Comprovante,
  type ServidorListItem,
  type StatusComprovante,
} from "./mock-data";
import { competenciaEstaFechada, getDataReferencia, getFechamentoAutomatico, getInicioCicloSubsequente, proximaCompetencia } from "./dias-uteis";
import { getComprovantesUnificados, loadHistoricoFechamentos, loadConsolidacoesRetroativo } from "./prosaude-storage";
import { competenciasParaFechamento, getRegistrosFechamento, getResumoFechamento } from "./fechamento-pagamento";
import { getSolicitacoesRetroativas } from "./ressarcimento-retroativo";
import { getStatusRetroativo, ROTULO_STATUS, type StatusRetroativo } from "./retroativo-fluxo";
import { getConsolidadoPorSituacaoTitular, getSituacaoTeto } from "./visoes-gerenciais";
import { estaVencida, getPendenciasDocumentaisDoServidor, getStatusDocumentosDoServidor, type StatusDocumentoPendente } from "./pendencias-documentais";

/* ── Competências e fechamento ─────────────────────────────────────────────────────────────── */

const PRIMEIRA_COMPETENCIA = competenciasParaFechamento[0] ?? "2026-04";

/** Competência vigente: a primeira que ainda não encerrou automaticamente na data de referência. */
export function getCompetenciaVigente(ref: Date = getDataReferencia()): string {
  let [a, m] = PRIMEIRA_COMPETENCIA.split("-").map(Number);
  for (let i = 0; i < 36; i++) {
    const c = `${a}-${String(m).padStart(2, "0")}`;
    if (!competenciaEstaFechada(c, ref)) return c;
    if (m === 12) {
      m = 1;
      a += 1;
    } else {
      m += 1;
    }
  }
  return PRIMEIRA_COMPETENCIA;
}

/** Competências selecionáveis: da primeira com dados no sistema até a vigente (mais antiga → mais recente). */
export function getCompetenciasDashboard(ref: Date = getDataReferencia()): { chave: string; rotulo: string }[] {
  const vigente = getCompetenciaVigente(ref);
  const lista: { chave: string; rotulo: string }[] = [];
  let c = PRIMEIRA_COMPETENCIA;
  while (c <= vigente && lista.length < 36) {
    lista.push({ chave: c, rotulo: formatCompetencia(c) });
    c = proximaCompetencia(c);
  }
  return lista;
}

export interface SituacaoFechamentoCompetencia {
  fechada: boolean;
  vigente: boolean;
  fechamentoEm: Date;
  terceiroDiaUtil: Date;
  proximaCompetencia: string;
}

export function getSituacaoFechamentoCompetencia(competencia: string, ref: Date = getDataReferencia()): SituacaoFechamentoCompetencia {
  return {
    fechada: competenciaEstaFechada(competencia, ref),
    vigente: competencia === getCompetenciaVigente(ref),
    fechamentoEm: getFechamentoAutomatico(competencia),
    terceiroDiaUtil: getInicioCicloSubsequente(competencia),
    proximaCompetencia: formatCompetencia(proximaCompetencia(competencia)),
  };
}

/* ── Comprovantes ──────────────────────────────────────────────────────────────────────────── */

export type SituacaoComprovantes = "aguardando" | "validados" | "devolvidos";

const STATUS_POR_SITUACAO: Record<SituacaoComprovantes, StatusComprovante[]> = {
  aguardando: ["em_analise", "retroativo_aguardando_aprovacao", "retroativo_aguardando_analista", "retroativo_aguardando_gerencia"],
  validados: ["aprovado", "aprovado_com_ressalva", "retroativo_aprovado"],
  devolvidos: ["correcao_solicitada", "recusado", "retroativo_recusado", "retroativo_devolvido"],
};

export const ROTULO_SITUACAO_COMPROVANTES: Record<SituacaoComprovantes, string> = {
  aguardando: "Aguardando análise",
  validados: "Validados",
  devolvidos: "Devolvidos",
};

export const statusDaSituacaoComprovantes = (s: SituacaoComprovantes) => STATUS_POR_SITUACAO[s];

export interface LinhaComprovanteDashboard {
  id: string;
  nome: string;
  arquivo: string;
  situacaoRotulo: string;
  /** Último profissional que registrou ação no comprovante (dado real); ausente se ainda sem ação. */
  responsavel?: string;
}

function nomeBeneficiario(id: string): string {
  return beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
}

export function getResumoComprovantes(competencia: string) {
  const doMes = getComprovantesUnificados().filter((c) => c.competencia === competencia);
  const por = (s: SituacaoComprovantes): Comprovante[] => doMes.filter((c) => STATUS_POR_SITUACAO[s].includes(c.status));
  const linhas = (s: SituacaoComprovantes): LinhaComprovanteDashboard[] =>
    por(s).map((c) => ({
      id: c.id,
      nome: c.beneficiarioIds.map(nomeBeneficiario).join(", "),
      arquivo: c.arquivos.map((a) => a.nome).join(", "),
      situacaoRotulo: ROTULO_SITUACAO_COMPROVANTES[s],
      responsavel: c.aprovacoes.length ? c.aprovacoes[c.aprovacoes.length - 1].aprovadoPor : undefined,
    }));
  return {
    total: doMes.length,
    aguardando: por("aguardando").length,
    validados: por("validados").length,
    devolvidos: por("devolvidos").length,
    linhas,
  };
}

/* ── Ressarcimentos de meses anteriores (fila real) ────────────────────────────────────────── */

const EM_FILA: StatusRetroativo[] = ["em_analise", "aguardando_complementacao", "complementacao_recebida"];

export interface ResumoFilaRessarcimentos {
  total: number;
  aguardando: number;
  emAnalise: number;
  aguardandoComplementacao: number;
  complementacaoRecebida: number;
  porAssociacao: { associacao: string; aguardando: number }[];
}

/** Competências da fila de Ressarcimentos de meses anteriores, por origem (Servidor ou Associações). */
export function getResumoFilaRessarcimentos(origem: "individual" | "associacao"): ResumoFilaRessarcimentos {
  const contagem = { total: 0, aguardando: 0, emAnalise: 0, aguardandoComplementacao: 0, complementacaoRecebida: 0 };
  const assoc = new Map<string, number>();
  for (const s of getSolicitacoesRetroativas().filter((x) => x.origem === origem)) {
    for (const c of s.competencias) {
      contagem.total += 1;
      const st = getStatusRetroativo(s.origem, c);
      if (!EM_FILA.includes(st)) continue;
      contagem.aguardando += 1;
      if (st === "em_analise") contagem.emAnalise += 1;
      if (st === "aguardando_complementacao") contagem.aguardandoComplementacao += 1;
      if (st === "complementacao_recebida") contagem.complementacaoRecebida += 1;
      if (origem === "associacao") assoc.set(s.associacao ?? "Associação", (assoc.get(s.associacao ?? "Associação") ?? 0) + 1);
    }
  }
  const porAssociacao = ["Assefaz", "Assetran"].map((associacao) => ({ associacao, aguardando: assoc.get(associacao) ?? 0 }));
  return { ...contagem, porAssociacao };
}

export interface LinhaRessarcimentoDashboard {
  id: string;
  nome: string;
  referencia: string;
  statusRotulo: string;
  aguardando: boolean;
  origemRotulo: string;
  /** Último profissional da GERDAB que apurou/decidiu a competência (dado real). */
  responsavel?: string;
}

/** Competências de Ressarcimentos de meses anteriores (todas), com as pendentes primeiro. */
export function getLinhasRessarcimentos(origem: "individual" | "associacao"): LinhaRessarcimentoDashboard[] {
  const linhas: LinhaRessarcimentoDashboard[] = [];
  for (const s of getSolicitacoesRetroativas().filter((x) => x.origem === origem)) {
    for (const c of s.competencias) {
      const st = getStatusRetroativo(s.origem, c);
      const ultimo = [...(c.decisoes ?? []), ...(c.apuracao ?? [])].sort((a, b) => a.dataHora.localeCompare(b.dataHora)).pop();
      linhas.push({
        id: `${s.id}-${c.competenciaReferencia}`,
        nome: s.nomeTitular,
        referencia: formatCompetencia(c.competenciaReferencia),
        statusRotulo: origem === "associacao" && st === "autorizada" ? "Habilitada" : origem === "associacao" && st === "nao_autorizada" ? "Desabilitada" : ROTULO_STATUS[st],
        aguardando: EM_FILA.includes(st),
        origemRotulo: origem === "individual" ? "Servidor" : (s.associacao ?? "Associação"),
        responsavel: ultimo?.responsavel,
      });
    }
  }
  return linhas.sort((a, b) => Number(b.aguardando) - Number(a.aguardando));
}

/* ── Fechamento da competência (Consolidação vigente) ─────────────────────────────────────── */

export interface RegistroInadimplente {
  nome: string;
  chave: string;
  matricula?: string;
}

export function getResumoFechamentoDashboard(competencia: string) {
  const resumo = getResumoFechamento(competencia);
  const registros = getRegistrosFechamento(competencia);
  const adimplentes = registros.filter((r) => r.classificacao === "adimplente");
  const vidasDe = (lista: typeof registros) => lista.reduce((n, r) => n + Math.max(1, r.composicaoGrupo.length), 0);
  const inadimplentes: RegistroInadimplente[] = registros
    .filter((r) => r.classificacao === "inadimplente")
    .map((r) => ({ nome: r.nome, chave: r.cpf ?? r.beneficiarioId, matricula: r.matricula }));
  return {
    ...resumo,
    aptos: {
      registros: adimplentes.length,
      vidas: vidasDe(adimplentes),
      vidasTotal: vidasDe(registros),
      valorRessarcir: adimplentes.reduce((s, r) => s + r.valorRessarcir, 0),
      linhas: adimplentes.map((r) => ({ id: r.beneficiarioId, nome: r.nome, matricula: r.matricula ?? "", plano: r.operadoraOuAssociacao, vidas: Math.max(1, r.composicaoGrupo.length), valor: r.valorRessarcir })),
    },
    inadimplentes,
  };
}

export interface LinhaRecorrencia {
  posicao: number;
  nome: string;
  chave: string;
  matricula?: string;
  competencias: string[];
}

/** Inadimplência por servidor no intervalo (no máximo uma ocorrência por competência), da mais recorrente para a menos. */
export function getInadimplenciaRecorrente(de: string, ate: string): LinhaRecorrencia[] {
  const mapa = new Map<string, { nome: string; matricula?: string; competencias: string[] }>();
  let c = de;
  for (let i = 0; c <= ate && i < 36; i++, c = proximaCompetencia(c)) {
    for (const r of getRegistrosFechamento(c).filter((x) => x.classificacao === "inadimplente")) {
      const chave = r.cpf ?? r.beneficiarioId;
      const atual = mapa.get(chave) ?? { nome: r.nome, matricula: r.matricula, competencias: [] };
      if (!atual.competencias.includes(c)) atual.competencias.push(c);
      mapa.set(chave, atual);
    }
  }
  return [...mapa.entries()]
    .map(([chave, v]) => ({ chave, ...v }))
    .sort((a, b) => b.competencias.length - a.competencias.length || a.nome.localeCompare(b.nome))
    .map((v, i) => ({ posicao: i + 1, ...v }));
}

/* ── Prazos e alertas documentais + busca de servidores ───────────────────────────────────── */

export interface AlertaDocumental {
  id: string;
  documento: string;
  beneficiario: string;
  titular: string;
  matricula: string;
  prazoTexto: string;
  vencido: boolean;
  etapa: StatusDocumentoPendente;
  etapaRotulo: string;
}

const ETAPA_ROTULO: Record<StatusDocumentoPendente, string> = {
  aguardando_envio: "Solicitação registrada · aguardando envio",
  aguardando_analise: "Documento enviado · aguardando análise",
  aprovado: "Solicitação atendida",
};

/** Mesma fonte da tela Documentação e Pendências: o servidor de referência do protótipo (`servidorAtual`). */
export function getAlertasDocumentais(): AlertaDocumental[] {
  const titular = servidoresList.find((s) => s.nome === servidorAtual.nome);
  const matricula = titular?.matricula ?? servidorAtual.matricula;
  const destino = servidorAtual.associacao !== "—" ? "associacao" : "servidor";
  const abertas = getPendenciasDocumentaisDoServidor(servidorAtual.matricula, destino);
  return getStatusDocumentosDoServidor(servidorAtual.matricula).map((d) => {
    const p = abertas.find((x) => x.dependenteId === d.beneficiarioId && x.documento === d.documento);
    return {
      id: d.id,
      documento: d.documento,
      beneficiario: d.beneficiarioNome,
      titular: servidorAtual.nome,
      matricula,
      prazoTexto: p?.prazo?.texto ?? (d.status === "aprovado" ? "Atendido" : "Sem prazo cadastrado"),
      vencido: p ? estaVencida(p) : false,
      etapa: d.status,
      etapaRotulo: ETAPA_ROTULO[d.status],
    };
  });
}

export interface FichaResumoServidor {
  matricula: string;
  nome: string;
  situacaoFuncional: string;
  statusProSaude: string;
  plano: string;
  vidas: number;
  dependentes: string;
  situacoes: { tipo: string; descricao: string; tom: "red" | "amber" | "neutral" | "green" }[];
}

const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarServidores(termo: string): ServidorListItem[] {
  const q = normaliza(termo.trim());
  if (!q) return [];
  return servidoresList.filter((s) => normaliza(s.nome).includes(q) || s.matricula.includes(termo.trim()) || s.cpf.includes(termo.trim()));
}

export function getFichaResumo(s: ServidorListItem, competencias: string[]): FichaResumoServidor {
  const situacoes: FichaResumoServidor["situacoes"] = [];
  if (s.status !== "ativo") situacoes.push({ tipo: "Situação cadastral relevante", descricao: `Status Pró-Saúde: ${statusLabels[s.status]}.`, tom: "amber" });
  if (s.situacaoFinanceira === "inadimplente") situacoes.push({ tipo: "Inadimplência", descricao: "Consta como inadimplente na situação financeira atual do cadastro.", tom: "red" });
  if (s.nome === servidorAtual.nome) {
    for (const a of getAlertasDocumentais()) {
      situacoes.push({ tipo: a.etapa === "aprovado" ? "Solicitação atendida" : "Pendência documental", descricao: `${a.documento} de ${a.beneficiario} — ${a.prazoTexto.toLowerCase()}.`, tom: a.etapa === "aprovado" ? "green" : a.vencido ? "red" : "amber" });
    }
  }
  const emInad = competencias.filter((c) => getRegistrosFechamento(c).some((r) => r.classificacao === "inadimplente" && r.nome === s.nome));
  if (emInad.length) situacoes.push({ tipo: "Inadimplência registrada", descricao: `Consta como inadimplente em ${emInad.map(formatCompetencia).join(", ")}.`, tom: "amber" });
  return {
    matricula: s.matricula,
    nome: s.nome,
    situacaoFuncional: s.situacaoBeneficiarioTitular,
    statusProSaude: statusLabels[s.status],
    plano: s.associacao !== "—" ? `${s.associacao}${s.operadora ? ` · ${s.operadora}` : ""}` : (s.operadora ?? "—"),
    vidas: 1 + s.dependentes,
    dependentes: s.dependentes === 0 ? "Sem dependentes cadastrados" : `${s.dependentes} dependente${s.dependentes > 1 ? "s" : ""} cadastrado${s.dependentes > 1 ? "s" : ""}`,
    situacoes,
  };
}

/* ── Panorama da base ──────────────────────────────────────────────────────────────────────── */

export function getPanoramaBase() {
  const titulares = servidoresList.length;
  const teto = getSituacaoTeto();
  return {
    titulares,
    dependentes: servidoresList.reduce((n, s) => n + s.dependentes, 0),
    noTeto: teto.noTetoOuAcima,
    percentualNoTeto: teto.percentualNoTeto,
    situacoes: getConsolidadoPorSituacaoTitular().map((l) => ({ rotulo: l.situacao, titulares: l.titulares, percentual: l.percentualDaBase })),
  };
}

/** Identificador estável (URL) de cada situação do titular — usado no parâmetro `situacao` de Servidores. */
export const slugSituacaoTitular = (rotulo: string) => normaliza(rotulo).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ── Últimos relatórios gerados (histórico real) ───────────────────────────────────────────── */

export interface RelatorioGerado {
  id: string;
  tipo: "Fechamento de Pagamento" | "Ressarcimentos de meses anteriores";
  /** Sequência do relatório dentro da própria competência/ciclo (não é numeração global). */
  sequencia: number;
  referencia: string;
  responsavel: string;
  geradoEm: string;
  destino: "/admin/relatorios/pagamentos/historico" | "/admin/relatorios/consolidacoes";
}

export function getUltimosRelatoriosGerados(limite = 4): RelatorioGerado[] {
  const fech: RelatorioGerado[] = loadHistoricoFechamentos().map((s) => ({
    id: s.id,
    tipo: "Fechamento de Pagamento",
    sequencia: s.sequencia,
    referencia: formatCompetencia(s.competencia),
    responsavel: s.responsavel,
    geradoEm: s.geradoEm,
    destino: "/admin/relatorios/pagamentos/historico",
  }));
  const retro: RelatorioGerado[] = loadConsolidacoesRetroativo().map((s) => ({
    id: s.id,
    tipo: "Ressarcimentos de meses anteriores",
    sequencia: s.sequencia,
    referencia: formatCompetencia(s.ciclo),
    responsavel: s.responsavel,
    geradoEm: s.geradoEm,
    destino: "/admin/relatorios/consolidacoes",
  }));
  return [...fech, ...retro].sort((a, b) => b.geradoEm.localeCompare(a.geradoEm)).slice(0, limite);
}

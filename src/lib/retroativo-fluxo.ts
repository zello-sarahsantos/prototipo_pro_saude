/**
 * Fluxo operacional do Ressarcimento Retroativo além do motor de apuração (`ressarcimento-retroativo.ts`):
 * complementação documental, notificações, ciclos operacionais e Consolidação NURFI.
 *
 * ⚠ **PROPOSTA FUNCIONAL A VALIDAR COM A GERDAB.** A complementação documental (estado "Aguardando
 * complementação", pedido da GERDAB, resposta do servidor, notificações) NÃO foi fechada
 * explicitamente pela stakeholder na reunião de 22/09/2026 — é uma proposta demonstrada no protótipo.
 * Não existe prazo máximo de resposta, cancelamento automático nem reabertura de solicitação não
 * autorizada (nada disso foi definido e nada disso é implementado). No protótipo o fluxo vale para o
 * retroativo **individual** do servidor; a origem Associação mantém habilitar/desabilitar (não se
 * cria fluxo de complementação para Associação sem requisito da stakeholder).
 *
 * **Estados na interface** (rótulos; a regra interna continua `aprovado`/`negado`/`habilitado`/
 * `desabilitado`): Em análise · Aguardando complementação · Complementação recebida (requer nova
 * análise) · Autorizada · Não autorizada. Uma competência pendente NUNCA bloqueia as demais nem é
 * negada automaticamente.
 *
 * **Ciclo operacional = apenas classificação temporal.** Derivado de `getCicloDeDestino` (regra do
 * 2º/3º dia útil já existente) aplicado à data de cada evento; nunca expira solicitação, nega,
 * muda estado de competência, bloqueia complementação nem cria regra de corte nova.
 *
 * **Consolidação:** ação explícita "Gerar relatório" (para o NURFI) que congela um snapshot IMUTÁVEL com as
 * competências autorizadas e aptas naquele momento e ainda não consolidadas; pendências ficam na
 * fila operacional e uma competência autorizada depois entra na consolidação posterior aplicável.
 *
 * "Lida" (notificação) ≠ "analisada" (competência); a trilha de auditoria nunca é apagada.
 */
import { anexarEvento, novaAuditoria } from "./auditoria";
import { getCicloDeDestino, getDataReferencia } from "./dias-uteis";
import { formatCompetencia } from "./mock-data";
import {
  loadConsolidacoesRetroativo,
  loadNotificacoesRetroativo,
  saveConsolidacoesRetroativo,
  saveNotificacoesRetroativo,
  type CompetenciaRetroativa,
  type DocumentoRetroativo,
  type EventoComplementacao,
  type LinhaConsolidacaoRetroativo,
  type NotificacaoRetroativo,
  type OrigemRetroativo,
  type SnapshotConsolidacaoRetroativo,
  type SolicitacaoRetroativa,
} from "./prosaude-storage";
import {
  TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO,
  TIPOS_DOCUMENTO_RETROATIVO,
  alterarCompetencia,
  estaAutorizada,
  getEstadoCompetencia,
  getRegistrosRelatorioRetroativo,
  getSolicitacoesRetroativas,
  marcarContrachequeConferido,
  registrarValorPago,
  validarValorDevido,
} from "./ressarcimento-retroativo";

/* ── Estados de exibição ──────────────────────────────────────────────────────────────────── */

export type StatusRetroativo = "em_analise" | "aguardando_complementacao" | "complementacao_recebida" | "autorizada" | "nao_autorizada";

export const ROTULO_STATUS: Record<StatusRetroativo, string> = {
  em_analise: "Em análise",
  aguardando_complementacao: "Aguardando complementação",
  complementacao_recebida: "Complementação recebida",
  autorizada: "Autorizada",
  nao_autorizada: "Não autorizada",
};

/** Situação da complementação: sem pedido, pedido pendente, ou resposta recebida ainda sem nova decisão. */
export function getSituacaoComplementacao(c: CompetenciaRetroativa): "nenhuma" | "aguardando" | "recebida" {
  const eventos = c.complementacoes ?? [];
  const ultimo = eventos[eventos.length - 1];
  if (!ultimo) return "nenhuma";
  if (ultimo.tipo === "solicitada") return "aguardando";
  const decisaoPosterior = c.decisoes.some((d) => d.dataHora > ultimo.dataHora);
  return decisaoPosterior ? "nenhuma" : "recebida";
}

export function getStatusRetroativo(origem: OrigemRetroativo, c: CompetenciaRetroativa): StatusRetroativo {
  const estado = getEstadoCompetencia(origem, c);
  if (estado === "negado" || estado === "desabilitado") return "nao_autorizada";
  if (estaAutorizada(origem, c)) return "autorizada";
  if (origem === "individual") {
    const compl = getSituacaoComplementacao(c);
    if (compl === "aguardando") return "aguardando_complementacao";
    if (compl === "recebida") return "complementacao_recebida";
  }
  return "em_analise";
}

/* ── Notificações ─────────────────────────────────────────────────────────────────────────── */

function notificar(destino: NotificacaoRetroativo["destino"], solicitacaoId: string, competenciaReferencia: string, mensagem: string) {
  saveNotificacoesRetroativo([
    ...loadNotificacoesRetroativo(),
    { id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, destino, solicitacaoId, competenciaReferencia, mensagem, criadaEm: new Date().toISOString(), lida: false },
  ]);
}

export function getNotificacoesRetroativo(destino: NotificacaoRetroativo["destino"], apenasNaoLidas = false): NotificacaoRetroativo[] {
  return loadNotificacoesRetroativo().filter((n) => n.destino === destino && (!apenasNaoLidas || !n.lida));
}

/** Marca como lidas (indicador de novidade some). NÃO altera o estado da competência nem a trilha. */
export function marcarNotificacoesLidas(destino: NotificacaoRetroativo["destino"], solicitacaoId: string, competenciaReferencia?: string) {
  const agora = new Date().toISOString();
  saveNotificacoesRetroativo(
    loadNotificacoesRetroativo().map((n) =>
      n.destino === destino && n.solicitacaoId === solicitacaoId && !n.lida && (!competenciaReferencia || n.competenciaReferencia === competenciaReferencia)
        ? { ...n, lida: true, lidaEm: agora }
        : n,
    ),
  );
}

/* ── Complementação documental (proposta) ─────────────────────────────────────────────────── */

/** GERDAB pede complementação de UMA competência (origem individual, ainda sem decisão). */
export function solicitarComplementacao(solicitacaoId: string, competencia: string, texto: string, responsavel: string) {
  if (!texto.trim()) throw new Error("Informe o que precisa ser enviado ou complementado.");
  const atualizada = alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    if (s.origem !== "individual") throw new Error("Complementação documental é tratada, nesta rodada, só no retroativo individual do servidor.");
    if (getEstadoCompetencia(s.origem, c) !== "aguardando_analise") throw new Error("A competência já possui decisão; não é possível solicitar complementação.");
    if (getSituacaoComplementacao(c) === "aguardando") throw new Error("Já existe uma solicitação de complementação pendente para esta competência.");
    const e: EventoComplementacao = { ...novaAuditoria(responsavel), dominio: "complementacao", id: `compl-${Date.now()}`, tipo: "solicitada", texto: texto.trim() };
    return { ...c, complementacoes: anexarEvento(c.complementacoes ?? [], e) };
  });
  notificar("servidor", solicitacaoId, competencia, `GERDAB solicitou complementação do ressarcimento retroativo de ${formatCompetencia(competencia)}: ${texto.trim()}`);
  return atualizada;
}

/** Servidor responde ao pedido, dentro da solicitação original: documentos novos ficam vinculados à
 *  mesma competência; os originais nunca são apagados nem substituídos. */
export function enviarComplementacao(solicitacaoId: string, competencia: string, documentos: DocumentoRetroativo[], autor: string) {
  if (documentos.length === 0) throw new Error("Anexe ao menos um documento.");
  const agora = new Date().toISOString();
  const novos = documentos.map((d): DocumentoRetroativo => {
    if (!(d.tipo in TIPOS_DOCUMENTO_RETROATIVO)) throw new Error(`Tipo de documento inválido: ${d.nome}`);
    const descricao = d.tipo === "outro" ? d.descricao?.trim().slice(0, TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO) || undefined : undefined;
    if (d.tipo === "outro" && !descricao) throw new Error(`Informe a descrição do "Outro documento" (${d.nome}).`);
    return { nome: d.nome, tipo: d.tipo, descricao, conteudo: d.conteudo, origem: "complementar", anexadoEm: agora, anexadoPor: autor };
  });
  const atualizada = alterarCompetencia(solicitacaoId, competencia, (s, c) => {
    if (s.origem !== "individual") throw new Error("Complementação documental só se aplica ao retroativo individual.");
    if (getSituacaoComplementacao(c) !== "aguardando") throw new Error("Não há solicitação de complementação pendente para esta competência.");
    const pedido = [...(c.complementacoes ?? [])].reverse().find((e) => e.tipo === "solicitada")!;
    const e: EventoComplementacao = { ...novaAuditoria(autor), dominio: "complementacao", id: `compl-${Date.now()}`, tipo: "recebida", documentos: novos.map((d) => d.nome), respondeA: pedido.id };
    return { ...c, documentos: [...c.documentos, ...novos], complementacoes: anexarEvento(c.complementacoes ?? [], e) };
  });
  notificar("gerdab", solicitacaoId, competencia, `Complementação recebida — ${formatCompetencia(competencia)}: requer nova análise.`);
  return atualizada;
}

/* ── Documentos (abrir para conferência) ──────────────────────────────────────────────────── */

/** LIMITAÇÃO DO PROTÓTIPO: tamanho máximo guardado localmente para poder reabrir o arquivo. */
export const LIMITE_BYTES_DOCUMENTO_DEMO = 1_000_000;

/** Lê o arquivo como data URL para o protótipo poder abri-lo depois; acima do limite, não guarda o conteúdo. */
export function lerArquivoComoDataUrl(file: File): Promise<string | undefined> {
  if (file.size > LIMITE_BYTES_DOCUMENTO_DEMO) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : undefined);
    r.onerror = () => resolve(undefined);
    r.readAsDataURL(file);
  });
}

/** Abre o documento em nova aba. Sem conteúdo guardado (massa de demonstração ou arquivo grande),
 *  abre uma página de demonstração identificando o documento — nunca um arquivo real inventado. */
export async function abrirDocumentoRetroativo(d: DocumentoRetroativo) {
  let url: string;
  if (d.conteudo) {
    url = URL.createObjectURL(await (await fetch(d.conteudo)).blob());
  } else {
    const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(d.nome)}</title><body style="font-family:sans-serif;padding:2rem"><h2>${esc(d.nome)}</h2><p>Tipo: ${esc(TIPOS_DOCUMENTO_RETROATIVO[d.tipo])}${d.descricao ? ` — ${esc(d.descricao)}` : ""}</p><p style="color:#666">Documento de demonstração do protótipo. Em produção, aqui abre o arquivo enviado.</p></body>`;
    url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  }
  window.open(url, "_blank", "noopener");
}

/* ── Apuração financeira (um único bloco: preencher e salvar) ─────────────────────────────────── */

/** Salva a apuração de uma vez: Valor Pago, Valor Devido e, se marcado, a conferência do contracheque. Cada
 *  campo só gera evento de trilha quando muda (append-only); nada é apagado. */
export function salvarApuracao(
  solicitacaoId: string,
  competencia: string,
  dados: { pago?: number; devido?: number; contrachequeConferido?: boolean },
  responsavel: string,
) {
  const atual = getSolicitacoesRetroativas().find((s) => s.id === solicitacaoId)?.competencias.find((c) => c.competenciaReferencia === competencia);
  if (!atual) throw new Error("Competência não encontrada.");
  if (dados.pago !== undefined && dados.pago !== atual.valorPagoContracheque) registrarValorPago(solicitacaoId, competencia, dados.pago, responsavel);
  if (dados.devido !== undefined && (dados.devido !== atual.valorDevido || !atual.valorDevidoValidado)) validarValorDevido(solicitacaoId, competencia, dados.devido, responsavel);
  if (dados.contrachequeConferido && !atual.contrachequeConferido) marcarContrachequeConferido(solicitacaoId, competencia, responsavel);
}

/** Último evento de apuração (quem salvou e quando) e a conferência do contracheque, para exibir depois de salvo. */
export function getResumoApuracao(c: CompetenciaRetroativa) {
  const eventos = c.apuracao.filter((e) => ["valor_pago_registrado", "valor_devido_validado", "contracheque_conferido"].includes(e.tipo));
  const ultimo = [...eventos].sort((a, b) => a.dataHora.localeCompare(b.dataHora)).pop();
  const conferencia = c.apuracao.find((e) => e.tipo === "contracheque_conferido");
  return { salvaPor: ultimo?.responsavel, salvaEm: ultimo?.dataHora, conferidoPor: conferencia?.responsavel, conferidoEm: conferencia?.dataHora };
}

/* ── Ciclos operacionais (classificação temporal) ─────────────────────────────────────────── */

/** Ciclo operacional (competência "AAAA-MM") aberto na data: o mês anterior enquanto vigente
 *  (até o fim do 2º dia útil), senão o mês da data — via `getCicloDeDestino`. Só classifica no tempo. */
export function getCicloOperacional(data: Date = getDataReferencia()): string {
  const anterior = new Date(data.getFullYear(), data.getMonth() - 1, 1);
  const comp = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
  return getCicloDeDestino(comp, data).competenciaDestino;
}

export interface CiclosCompetencia {
  apresentacao: string;
  /** Ciclo da última ação da GERDAB (apuração, decisão ou pedido de complementação); `undefined` se ainda sem análise. */
  analise?: string;
  /** Ciclo em que ficou apta (autorizada); `undefined` se ainda não autorizada. */
  aptidao?: string;
}

export function getCiclosCompetencia(s: SolicitacaoRetroativa, c: CompetenciaRetroativa): CiclosCompetencia {
  const acoes = [...c.apuracao, ...c.decisoes, ...(c.complementacoes ?? []).filter((e) => e.tipo === "solicitada")].map((e) => e.dataHora).sort();
  const ultima = acoes[acoes.length - 1];
  return {
    apresentacao: getCicloOperacional(new Date(s.criadaEm)),
    analise: ultima ? getCicloOperacional(new Date(ultima)) : undefined,
    aptidao: estaAutorizada(s.origem, c) ? getCicloOperacional(new Date(dataAptidao(s, c))) : undefined,
  };
}

/** Momento em que a competência ficou apta: individual = aprovação; associação = última ação que
 *  completou a autorização (apuração/habilitação). */
function dataAptidao(s: SolicitacaoRetroativa, c: CompetenciaRetroativa): string {
  const candidatos = s.origem === "individual" ? c.decisoes.filter((d) => d.decisao === "aprovado").map((d) => d.dataHora) : [...c.apuracao, ...c.decisoes].map((e) => e.dataHora);
  return candidatos.sort().pop() ?? s.criadaEm;
}

/** Última atividade da solicitação (para "Última atualização" na fila). */
export function getUltimaAtualizacao(s: SolicitacaoRetroativa): string {
  const datas = [s.criadaEm, ...s.competencias.flatMap((c) => [...c.apuracao, ...c.decisoes, ...(c.complementacoes ?? [])].map((e) => e.dataHora))];
  return datas.sort().pop()!;
}

/* ── Consolidação NURFI e snapshots ───────────────────────────────────────────────────────── */

const chaveItem = (solicitacaoId: string, competencia: string) => `${solicitacaoId}|${competencia}`;

/** Chave estável de uma linha da Consolidação (para seleção). */
export const chaveLinhaConsolidacao = (l: { solicitacaoId: string; competenciaReferencia: string }) => chaveItem(l.solicitacaoId, l.competenciaReferencia);

export function getSnapshotsConsolidacao(): SnapshotConsolidacaoRetroativo[] {
  return loadConsolidacoesRetroativo().sort((a, b) => b.geradoEm.localeCompare(a.geradoEm));
}

function jaConsolidados(): Set<string> {
  return new Set(loadConsolidacoesRetroativo().flatMap((sn) => sn.linhas.map((l) => chaveItem(l.solicitacaoId, l.competenciaReferencia))));
}

export interface SituacaoConsolidacao {
  /** Autorizadas, com matrícula e classificação Ativo/Inativo, ainda não consolidadas — compõem a próxima consolidação. */
  aptas: LinhaConsolidacaoRetroativo[];
  /** Autorizadas mas retidas por pendência cadastral (matrícula ou classificação) — seguem na fila. */
  retidasPorCadastro: { nome: string; competenciaReferencia: string; motivo: string }[];
  /** Competências ainda sem autorização (em análise, aguardando/recebida complementação) — não bloqueiam. */
  pendentesNaFila: number;
}

export function getSituacaoConsolidacao(): SituacaoConsolidacao {
  const feitos = jaConsolidados();
  const solicitacoes = getSolicitacoesRetroativas();
  const aptas: LinhaConsolidacaoRetroativo[] = [];
  const retidasPorCadastro: SituacaoConsolidacao["retidasPorCadastro"] = [];
  for (const l of getRegistrosRelatorioRetroativo()) {
    if (feitos.has(chaveItem(l.solicitacaoId, l.competenciaReferencia))) continue;
    const s = solicitacoes.find((x) => x.id === l.solicitacaoId)!;
    const c = s.competencias.find((x) => x.competenciaReferencia === l.competenciaReferencia)!;
    if (!l.matricula) {
      retidasPorCadastro.push({ nome: l.nome, competenciaReferencia: l.competenciaReferencia, motivo: "Matrícula não localizada — requer conferência cadastral" });
      continue;
    }
    if (!l.grupo) {
      retidasPorCadastro.push({ nome: l.nome, competenciaReferencia: l.competenciaReferencia, motivo: "Sem classificação Ativo/Inativo confiável" });
      continue;
    }
    aptas.push({
      solicitacaoId: l.solicitacaoId,
      competenciaReferencia: l.competenciaReferencia,
      matricula: l.matricula,
      nome: l.nome,
      grupo: l.grupo,
      mesAnoPagamento: l.mesAnoPagamento,
      valorPago: l.valorPago,
      valorDevido: l.valorDevido,
      valorRessarcir: l.valorRessarcir,
      observacao: l.observacao,
      origem: l.origem,
      cicloAptidao: getCiclosCompetencia(s, c).aptidao ?? getCicloOperacional(),
    });
  }
  const pendentesNaFila = solicitacoes.reduce(
    (n, s) => n + s.competencias.filter((c) => ["em_analise", "aguardando_complementacao", "complementacao_recebida"].includes(getStatusRetroativo(s.origem, c))).length,
    0,
  );
  return { aptas, retidasPorCadastro, pendentesNaFila };
}

/** **Gerar relatório** (antes "Consolidar ciclo"): congela as competências selecionadas (ou todas as aptas, sem seleção) num snapshot imutável. Não é bloqueada por
 *  pendências; o que ainda não está autorizado permanece na fila para consolidação posterior. */
export function consolidarCiclo(responsavel: string, agora: Date = getDataReferencia(), selecionadas?: string[]): SnapshotConsolidacaoRetroativo {
  const todas = getSituacaoConsolidacao().aptas;
  if (todas.length === 0) throw new Error("Não há competências autorizadas e aptas para consolidar.");
  // Com seleção, só as linhas escolhidas entram no relatório; as demais permanecem na Consolidação.
  const aptas = selecionadas ? todas.filter((l) => selecionadas.includes(chaveLinhaConsolidacao(l))) : todas;
  if (selecionadas && (aptas.length === 0 || aptas.length !== selecionadas.length)) throw new Error("Selecione competências aptas para gerar o relatório.");
  const ciclo = getCicloOperacional(agora);
  const todos = loadConsolidacoesRetroativo();
  const snapshot: SnapshotConsolidacaoRetroativo = {
    id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ciclo,
    sequencia: todos.filter((t) => t.ciclo === ciclo).length + 1,
    geradoEm: agora.toISOString(),
    responsavel,
    linhas: aptas.map((l) => ({ ...l })),
  };
  saveConsolidacoesRetroativo([...todos, snapshot]);
  return snapshot;
}

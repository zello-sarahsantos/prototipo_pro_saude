/**
 * Notificações do ambiente administrativo (sino do Admin). Duas origens, sempre identificadas:
 *  - "real": derivadas do que já existe no sistema (requerimentos enviados por associações aguardando
 *    avaliação; solicitações de ressarcimento de meses anteriores aguardando análise) — mesmo espírito de
 *    `notificacoes-pagamento.ts`/`notificacoes-associacao.ts`, recalculadas a cada leitura;
 *  - "demonstrativa": exemplos fixos para ilustrar os demais eventos do protótipo aprovado enquanto não
 *    existe evento real equivalente. Aparecem com o selo "Demonstrativa" e nunca se misturam em silêncio.
 * O estado "lida" é ÚNICO por acontecimento e por PERFIL (Analista/Gerência) no navegador (localStorage) — protótipo, sem backend
 * nem identidade individual: duas pessoas com o mesmo perfil compartilham a leitura (limitação documentada). Sino, menu lateral e
 * Dashboard leem a MESMA lista (`useNotificacoesAdmin`), então qualquer leitura atualiza os três ao mesmo tempo.
 *
 * Cada acontecimento tem id estável (`modulo:registro:tipo:marcador`): uma nova atualização do mesmo registro (nova versão,
 * novo reenvio) gera NOVA notificação; recarregar a página nunca duplica. As demonstrativas só aparecem no sino — não têm
 * módulo/indicador e por isso não alimentam os contadores do menu e do Dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { beneficiariosPagamento, formatCompetencia } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";
import { getNotificacoesRetroativo } from "./retroativo-fluxo";
import { getStatusRetroativo } from "./retroativo-fluxo";
import { listarRequerimentosAssociacao, statusAtualRequerimento, tipoRequerimentoAssociacaoLabels } from "./requerimentos-associacao";
import { getEstadoCompetencia, getSolicitacoesRetroativas } from "./ressarcimento-retroativo";
import { getCompetenciaReferencia, getFilaConfirmacoes } from "./negociacoes";
import { enviosAguardandoConferencia } from "./negociacoes-envios";

export interface NotificacaoAdmin {
  id: string;
  titulo: string;
  descricao: string;
  /** Texto de tempo já formatado ("há 12 min", "06/10/2026"). */
  quando: string;
  origem: "real" | "demonstrativa";
  lida: boolean;
  /** Rota interna de destino (opcional). */
  href?: string;
  /** Chave usada para registrar a leitura (padrão: `id`). */
  chaveLeitura?: string;
  /** Módulo do menu lateral a que o acontecimento pertence (ausente nas demonstrativas: não alimentam contadores). */
  modulo?: ModuloNotificacao;
  /** Indicadores do Dashboard em que o MESMO acontecimento também é sinalizado (um acontecimento = uma notificação no sino). */
  indicadores?: IndicadorDashboard[];
  /** Instante do acontecimento (ISO), quando disponível. */
  dataHora?: string;
  /** Servidor/beneficiário/entidade relacionada e descrição objetiva do acontecimento (usados na modal do Dashboard). */
  entidade?: string;
  acontecimento?: string;
}

export type ModuloNotificacao = "requerimentos" | "comprovantes" | "retroativos" | "negociacoes";
export type IndicadorDashboard = "alteracoes" | "comprovantes" | "ress_servidor" | "ress_associacoes" | "prazos";
export const ROTULO_MODULO_NOTIFICACAO: Record<ModuloNotificacao, string> = {
  requerimentos: "Requerimentos",
  comprovantes: "Comprovantes",
  retroativos: "Ressarcimentos de meses anteriores",
  negociacoes: "Negociações",
};
/** Nomes dos indicadores do Dashboard (mesma ordem dos cartões) usados nas modais de atualizações. */
export const ROTULO_INDICADOR_DASHBOARD: Record<IndicadorDashboard, string> = {
  alteracoes: "Alterações mensais",
  comprovantes: "Comprovantes",
  ress_servidor: "Ressarcimentos de meses anteriores — Servidor",
  ress_associacoes: "Ressarcimentos de meses anteriores — Associações",
  prazos: "Prazos e alertas documentais",
};
export const ORDEM_INDICADORES: IndicadorDashboard[] = ["alteracoes", "comprovantes", "ress_servidor", "ress_associacoes", "prazos"];
export const EVENTO_NOTIFICACOES_ADMIN = "prosaude-notificacoes-admin";

/** Id fixo da notificação da fila de Negociações; "lida" vale para a contagem em que foi lida (nova contagem = pendente de leitura de novo). */
export const ID_NEGOCIACOES = "real-negociacoes-fila";
export const ID_ENVIOS = "real-negociacoes-envios";
const CHAVE_LIDAS = "prosaude_notificacoes_admin_lidas";

/** Exemplos do protótipo aprovado (Dashboard GERDAB). Não representam eventos reais. */
const DEMONSTRATIVAS: Omit<NotificacaoAdmin, "origem">[] = [
  { id: "demo-1", lida: false, titulo: "Novo documento recebido para análise", descricao: "Carlos Eduardo Ramos enviou fatura técnica da competência Outubro/2026.", quando: "há 12 min", href: "/admin/comprovantes" },
  { id: "demo-2", lida: false, titulo: "Ressarcimento de meses anteriores — Servidor", descricao: "Nova solicitação de Carlos Eduardo Ramos · referência Maio/2026, com justificativa de atraso.", quando: "há 1 h", href: "/admin/retroativos" },
  { id: "demo-3", lida: false, titulo: "Complementação documental recebida", descricao: "Júlia Mendes · Comprovante de Matrícula do 2º semestre/2026.", quando: "Hoje, 08:05", href: "/admin/relatorios/documentacao" },
  { id: "demo-4", lida: false, titulo: "Novo requerimento aguardando avaliação", descricao: "Ricardo Mendes · inclusão de dependente.", quando: "Ontem, 17:40", href: "/admin/requerimentos" },
  { id: "demo-5", lida: true, titulo: "Relatório financeiro disponível para consulta", descricao: "Consolidação vigente Setembro/2026 · NURFI.", quando: "06/10/2026", href: "/admin/relatorios/consolidacoes" },
  { id: "demo-6", lida: true, titulo: "Fechamento automático da competência concluído", descricao: "Competência Setembro/2026 fechada no 2º dia útil.", quando: "02/10/2026", href: "/admin/relatorios/pagamentos" },
  { id: "demo-7", lida: true, titulo: "Ressarcimento de meses anteriores — Associação", descricao: "Assefaz enviou planilha referente a Julho/2026.", quando: "25/09/2026", href: "/admin/retroativos?origem=associacao" },
];

const dataBR = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
};

const perfilAtual = () => (typeof window === "undefined" ? "gerencia" : localStorage.getItem("prosaude_role") || "gerencia");
const chaveLidasPerfil = () => `${CHAVE_LIDAS}:${perfilAtual()}`;

/** Leituras do perfil atual. Na primeira vez, herda a lista antiga (única por navegador) para não perder o que já foi lido. */
export function lerIdsLidos(): Set<string> {
  try {
    const propria = localStorage.getItem(chaveLidasPerfil());
    if (propria !== null) return new Set(JSON.parse(propria) as string[]);
    return new Set(JSON.parse(localStorage.getItem(CHAVE_LIDAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function salvarIdsLidos(ids: Set<string>) {
  try {
    localStorage.setItem(chaveLidasPerfil(), JSON.stringify([...ids]));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

/** Marca como lidas (só leitura: não altera nenhum registro operacional) e avisa sino, menu e Dashboard. */
export function marcarComoLidas(ids: string[]) {
  const lidos = lerIdsLidos();
  ids.forEach((i) => lidos.add(i));
  salvarIdsLidos(lidos);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_NOTIFICACOES_ADMIN));
}

const dataHoraBR = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const temHora = /T\d{2}:\d{2}/.test(iso);
  return temHora ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR");
};

/** Eventos reais derivados dos registros persistidos. Aparecem enquanto o registro aguarda a GERDAB (comportamento já existente). */
function getNotificacoesReais(): Omit<NotificacaoAdmin, "lida">[] {
  // Requerimentos da Associação: novo requerimento (versão 1) ou complementação recebida (versão > 1), ainda pendentes de validação.
  const reqs = listarRequerimentosAssociacao()
    .filter((r) => statusAtualRequerimento(r) === "pendente_validacao")
    .map((r) => {
      const v = r.versoes[r.versoes.length - 1];
      const compl = r.versoes.length > 1;
      return {
        // v1 mantém o id anterior (preserva leituras já feitas); complementações geram id novo por versão.
        id: compl ? `real-req-${r.id}-compl-v${v.versao}` : `real-req-${r.id}`,
        origem: "real" as const,
        titulo: compl ? "Complementação recebida — requerimento da associação" : "Novo requerimento aguardando avaliação",
        descricao: `${tipoRequerimentoAssociacaoLabels[r.tipo]} · ${r.beneficiarioNome} (${r.associacao}).`,
        quando: dataHoraBR(v.enviadoEm),
        dataHora: v.enviadoEm,
        href: "/admin/requerimentos",
        entidade: r.beneficiarioNome,
        acontecimento: compl ? `Documentação complementar anexada pela ${r.associacao.toUpperCase()} — ${tipoRequerimentoAssociacaoLabels[r.tipo]}.` : `Nova solicitação recebida — ${tipoRequerimentoAssociacaoLabels[r.tipo]} (${r.associacao.toUpperCase()}).`,
        modulo: "requerimentos" as const,
        indicadores: compl ? (["alteracoes", "prazos"] as IndicadorDashboard[]) : (["alteracoes"] as IndicadorDashboard[]),
      };
    });

  // Ressarcimentos: nova solicitação aguardando análise + complementação documental recebida (repositório de notificações da GERDAB).
  const ress: Omit<NotificacaoAdmin, "lida">[] = [];
  const complGerdab = getNotificacoesRetroativo("gerdab");
  for (const s of getSolicitacoesRetroativas()) {
    const ind: IndicadorDashboard = s.origem === "associacao" ? "ress_associacoes" : "ress_servidor";
    for (const c of s.competencias) {
      if (getEstadoCompetencia(s.origem, c) === "aguardando_analise") {
        ress.push({
          id: `real-ress-${s.id}-${c.competenciaReferencia}`,
          origem: "real",
          titulo: `Ressarcimento de meses anteriores — ${s.origem === "associacao" ? "Associação" : "Servidor"}`,
          descricao: `${s.nomeTitular} · referência ${formatCompetencia(c.competenciaReferencia)} aguardando análise.`,
          quando: dataBR(s.criadaEm),
          dataHora: s.criadaEm,
          href: `/admin/retroativos?origem=${s.origem}`,
          entidade: s.nomeTitular,
          acontecimento: `Nova solicitação aguardando análise — referência ${formatCompetencia(c.competenciaReferencia)}.`,
          modulo: "retroativos",
          indicadores: [ind],
        });
      }
      if (s.origem === "individual" && getStatusRetroativo(s.origem, c) === "complementacao_recebida") {
        const n = complGerdab.filter((x) => x.solicitacaoId === s.id && x.competenciaReferencia === c.competenciaReferencia).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))[0];
        if (n) {
          ress.push({
            id: `real-ress-compl-${n.id}`,
            origem: "real",
            titulo: "Complementação recebida — ressarcimento de meses anteriores",
            descricao: `${s.nomeTitular} · referência ${formatCompetencia(c.competenciaReferencia)}: requer nova análise.`,
            quando: dataHoraBR(n.criadaEm),
            dataHora: n.criadaEm,
            href: "/admin/retroativos?origem=individual",
            entidade: s.nomeTitular,
            acontecimento: `Complementação documental recebida — referência ${formatCompetencia(c.competenciaReferencia)}.`,
            modulo: "retroativos",
            indicadores: [ind, "prazos"],
          });
        }
      }
    }
  }

  // Comprovantes: novo comprovante recebido e comprovante corrigido/reenviado, ainda aguardando análise.
  const comps: Omit<NotificacaoAdmin, "lida">[] = [];
  for (const c of getComprovantesUnificados()) {
    if (c.status !== "em_analise" && c.status !== "retroativo_aguardando_aprovacao") continue;
    const acoes = c.aprovacoes ?? [];
    const ultima = acoes[acoes.length - 1];
    const reenviado = ultima?.acao === "reenviado";
    const nomes = c.beneficiarioIds.map((id) => beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id).join(", ");
    const quando = reenviado ? ultima!.data : c.dataEnvio;
    comps.push({
      id: reenviado ? `real-comp-${c.id}-reenviado-${ultima!.data}` : `real-comp-${c.id}-novo`,
      origem: "real",
      titulo: reenviado ? "Comprovante corrigido e reenviado" : "Novo comprovante recebido",
      descricao: `Comprovante de ${formatCompetencia(c.competencia)} · ${nomes} aguardando análise.`,
      quando: dataHoraBR(quando),
      dataHora: quando,
      href: `/admin/comprovantes?competencia=${c.competencia}&situacao=aguardando`,
      entidade: nomes,
      acontecimento: reenviado ? `Comprovante corrigido e reenviado — ${formatCompetencia(c.competencia)}.` : `Novo comprovante recebido — ${formatCompetencia(c.competencia)}.`,
      modulo: "comprovantes",
      indicadores: reenviado ? ["comprovantes", "prazos"] : ["comprovantes"],
    });
  }
  const porRecencia = (a: { dataHora?: string }, b: { dataHora?: string }) => (b.dataHora ?? "").localeCompare(a.dataHora ?? "");
  return [...getNotificacaoNegociacoes(), ...getNotificacaoEnvios(), ...[...reqs, ...comps, ...ress].sort(porRecencia)];
}

/** Notificação DINÂMICA e única da fila de confirmações de pagamento das Negociações (tarefa de conferência — não indica
 *  que houve pagamento). Some quando a fila fica vazia; o id é fixo, então nunca se duplica por acesso ou recarga.
 *  Perfis: só Analista e Gerência (o sino do Admin só existe para eles; aqui reforçado). */
function getNotificacaoNegociacoes(): Omit<NotificacaoAdmin, "lida">[] {
  if (typeof window === "undefined") return [];
  const perfil = localStorage.getItem("prosaude_role") || "gerencia";
  if (perfil !== "analista" && perfil !== "gerencia") return [];
  const fila = getFilaConfirmacoes();
  if (fila.length === 0) return [];
  return [
    {
      id: ID_NEGOCIACOES,
      origem: "real",
      titulo: "Negociações — Confirmações pendentes",
      descricao: `Existem ${fila.length} ${fila.length === 1 ? "parcela" : "parcelas"} de negociações aguardando conferência de pagamento.`,
      quando: `Competência ${getCompetenciaReferencia().split("-").reverse().join("/")}`,
      href: "/admin/negociacoes?rotina=1",
      chaveLeitura: `${ID_NEGOCIACOES}:${fila.length}`,
      modulo: "negociacoes",
      indicadores: [],
    },
  ];
}

/** Relatórios de Negociações enviados por associações e ainda não conferidos pela GERDAB — notificação única e dinâmica
 *  (some quando todos foram conferidos). Indica consulta/conferência manual; nada é lido nem baixado automaticamente. */
function getNotificacaoEnvios(): Omit<NotificacaoAdmin, "lida">[] {
  if (typeof window === "undefined") return [];
  const perfil = localStorage.getItem("prosaude_role") || "gerencia";
  if (perfil !== "analista" && perfil !== "gerencia") return [];
  const aguardando = enviosAguardandoConferencia();
  if (aguardando.length === 0) return [];
  const associacoes = [...new Set(aguardando.map((e) => e.associacao.toUpperCase()))].join(", ");
  return [
    {
      id: ID_ENVIOS,
      origem: "real",
      titulo: "Negociações — Relatórios recebidos das associações",
      descricao: `${aguardando.length} ${aguardando.length === 1 ? "relatório aguarda" : "relatórios aguardam"} consulta e conferência (${associacoes}).`,
      quando: new Date(Math.max(...aguardando.map((e) => new Date(e.enviadoEm).getTime()))).toLocaleDateString("pt-BR"),
      href: "/admin/negociacoes/recebidos",
      chaveLeitura: `${ID_ENVIOS}:${aguardando.map((e) => e.id).sort().join(",")}`,
      modulo: "negociacoes",
      indicadores: [],
    },
  ];
}

/** Reais primeiro (mais acionáveis), depois as demonstrativas. */
export function getNotificacoesAdmin(): NotificacaoAdmin[] {
  const lidos = lerIdsLidos();
  const reais = getNotificacoesReais().map((n) => ({ ...n, lida: lidos.has(n.chaveLeitura ?? n.id) }));
  const demo = DEMONSTRATIVAS.map((n) => ({ ...n, origem: "demonstrativa" as const, lida: n.lida || lidos.has(n.id) }));
  return [...reais, ...demo];
}

/* ── Contagens e hook compartilhados (sino, menu lateral e Dashboard) ─────────────────────────────────────────── */

export interface ContagensNotificacoes {
  /** Total do sino (inclui as demonstrativas, que continuam visíveis e identificadas). */
  totalSino: number;
  /** Só notificações reais, por módulo do menu. */
  porModulo: Record<ModuloNotificacao, number>;
  /** Só notificações reais, por indicador do Dashboard. */
  porIndicador: Record<IndicadorDashboard, number>;
  /** Acontecimentos reais não lidos ligados a algum indicador do Dashboard — cada um conta UMA vez (não soma ao total do sino). */
  dashboard: number;
}

export function calcularContagens(itens: NotificacaoAdmin[]): ContagensNotificacoes {
  const naoLidas = itens.filter((n) => !n.lida);
  const reais = naoLidas.filter((n) => n.origem === "real" && n.modulo);
  const porModulo: Record<ModuloNotificacao, number> = { requerimentos: 0, comprovantes: 0, retroativos: 0, negociacoes: 0 };
  const porIndicador: Record<IndicadorDashboard, number> = { alteracoes: 0, comprovantes: 0, ress_servidor: 0, ress_associacoes: 0, prazos: 0 };
  let dashboard = 0;
  for (const n of reais) {
    porModulo[n.modulo!] += 1;
    const ind = n.indicadores ?? [];
    ind.forEach((i) => (porIndicador[i] += 1));
    if (ind.length > 0) dashboard += 1;
  }
  return { totalSino: naoLidas.length, porModulo, porIndicador, dashboard };
}

/** Lista única de notificações + contagens, atualizadas ao ler uma notificação, trocar de tela, voltar à aba ou alterar Negociações. */
export function useNotificacoesAdmin() {
  const { pathname } = useLocation();
  const [itens, setItens] = useState<NotificacaoAdmin[]>([]);
  useEffect(() => {
    const atualizar = () => setItens(getNotificacoesAdmin());
    atualizar();
    window.addEventListener(EVENTO_NOTIFICACOES_ADMIN, atualizar);
    window.addEventListener("prosaude-negociacoes", atualizar);
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.removeEventListener(EVENTO_NOTIFICACOES_ADMIN, atualizar);
      window.removeEventListener("prosaude-negociacoes", atualizar);
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, [pathname]);
  const contagens = useMemo(() => calcularContagens(itens), [itens]);
  return { itens, ...contagens };
}

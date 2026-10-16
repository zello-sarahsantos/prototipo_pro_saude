/**
 * Notificações do ambiente administrativo (sino do Admin). Duas origens, sempre identificadas:
 *  - "real": derivadas do que já existe no sistema (requerimentos enviados por associações aguardando
 *    avaliação; solicitações de ressarcimento de meses anteriores aguardando análise) — mesmo espírito de
 *    `notificacoes-pagamento.ts`/`notificacoes-associacao.ts`, recalculadas a cada leitura;
 *  - "demonstrativa": exemplos fixos para ilustrar os demais eventos do protótipo aprovado enquanto não
 *    existe evento real equivalente. Aparecem com o selo "Demonstrativa" e nunca se misturam em silêncio.
 * O estado "lida" é por navegador (localStorage) — protótipo, sem backend.
 */
import { formatCompetencia } from "./mock-data";
import { listarRequerimentosAssociacao, statusAtualRequerimento, tipoRequerimentoAssociacaoLabels } from "./requerimentos-associacao";
import { getEstadoCompetencia, getSolicitacoesRetroativas } from "./ressarcimento-retroativo";

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
}

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

export function lerIdsLidos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_LIDAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function salvarIdsLidos(ids: Set<string>) {
  try {
    localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...ids]));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

export function marcarComoLidas(ids: string[]) {
  const lidos = lerIdsLidos();
  ids.forEach((i) => lidos.add(i));
  salvarIdsLidos(lidos);
}

/** Eventos reais derivados do que está pendente de ação da GERDAB. */
function getNotificacoesReais(): Omit<NotificacaoAdmin, "lida">[] {
  const reqs = listarRequerimentosAssociacao()
    .filter((r) => statusAtualRequerimento(r) === "pendente_validacao")
    .map((r) => ({
      id: `real-req-${r.id}`,
      origem: "real" as const,
      titulo: "Novo requerimento aguardando avaliação",
      descricao: `${tipoRequerimentoAssociacaoLabels[r.tipo]} · ${r.beneficiarioNome} (${r.associacao}).`,
      quando: dataBR(r.criadoEm),
      href: "/admin/requerimentos",
    }));
  const ress = getSolicitacoesRetroativas().flatMap((s) =>
    s.competencias
      .filter((c) => getEstadoCompetencia(s.origem, c) === "aguardando_analise")
      .map((c) => ({
        id: `real-ress-${s.id}-${c.competenciaReferencia}`,
        origem: "real" as const,
        titulo: `Ressarcimento de meses anteriores — ${s.origem === "associacao" ? "Associação" : "Servidor"}`,
        descricao: `${s.nomeTitular} · referência ${formatCompetencia(c.competenciaReferencia)} aguardando análise.`,
        quando: dataBR(s.criadaEm),
        href: `/admin/retroativos?origem=${s.origem}`,
      })),
  );
  return [...reqs, ...ress];
}

/** Reais primeiro (mais acionáveis), depois as demonstrativas. */
export function getNotificacoesAdmin(): NotificacaoAdmin[] {
  const lidos = lerIdsLidos();
  const reais = getNotificacoesReais().map((n) => ({ ...n, lida: lidos.has(n.id) }));
  const demo = DEMONSTRATIVAS.map((n) => ({ ...n, origem: "demonstrativa" as const, lida: n.lida || lidos.has(n.id) }));
  return [...reais, ...demo];
}

/**
 * Acompanhamento de SOLICITAÇÕES DOCUMENTAIS COMPLEMENTARES registradas em outros módulos, para a seção "Prazos e alertas
 * documentais" do Dashboard. Só LEITURA: um adaptador independente por origem, sem fila, módulo ou fluxo novo — o tratamento
 * continua no registro original. Só entram registros com solicitação persistida, estado persistido e identificação:
 *
 *  - Requerimentos da Associação (persistidos): "aguardando_complementacao" → aguardando envio (Associação); nova versão
 *    sem decisão após esse pedido → recebido para análise (GERDAB).
 *  - Comprovantes: "correcao_solicitada" e pedido de documento complementar vigente → aguardando envio (Servidor);
 *    reenvio após correção (`em_analise` com última ação "reenviado") → recebido para análise (GERDAB).
 *  - Ressarcimentos de meses anteriores (individual): evento "solicitada" → aguardando envio (Servidor); "recebida" sem
 *    nova decisão → recebido para análise (GERDAB).
 *
 *  - Requerimentos do Servidor: solicitação gravada ao confirmar "Solicitar documento comprobatório" → aguardando envio (Servidor).
 *  - Ressarcimentos de meses anteriores das associações: mesmos eventos da origem individual → aguardando envio (Associação).
 *  - Planilhas das associações: decisão "correcao_solicitada" → aguardando envio (Associação); nova versão sem decisão após esse
 *    pedido → recebido para análise (GERDAB).
 *
 * NÃO incluído, por falta de dado persistido confiável:
 *  - Recebimento de "documento complementar" de Comprovante: o pedido é apagado ao chegar o documento e não deixa marca.
 * Nenhuma obrigação automática (alerta de vencimento) vira solicitação aqui: esses alertas seguem na lista original.
 */
import { beneficiariosPagamento, formatCompetencia } from "./mock-data";
import { getComprovantesUnificados } from "./prosaude-storage";
import { getSolicitacoesRetroativas } from "./ressarcimento-retroativo";
import { getStatusRetroativo } from "./retroativo-fluxo";
import { listarRequerimentosAssociacao, statusAtualRequerimento, tipoRequerimentoAssociacaoLabels } from "./requerimentos-associacao";
import { listarPlanilhasAssociacao, statusAtualPlanilha } from "./planilhas-associacao";

export type EstadoComplementar = "aguardando_envio" | "recebido_analise";
export type OrigemComplementar = "Requerimentos" | "Requerimentos do servidor" | "Comprovantes" | "Ressarcimentos de meses anteriores" | "Planilhas das associações";

export type DestinoComplementar =
  | { to: "/admin/requerimentos" }
  | { to: "/admin/comprovantes"; competencia: string; situacao: "aguardando" | "devolvidos" }
  | { to: "/admin/retroativos"; origem: "individual" | "associacao" }
  | { to: "/admin/planilhas/$id"; id: string };

export interface SolicitacaoComplementar {
  id: string;
  origem: OrigemComplementar;
  estado: EstadoComplementar;
  titulo: string;
  detalhe: string;
  /** Apresentação em tabela (aditivos; derivados dos mesmos dados): servidor, referência e documento/motivo solicitado. */
  servidor: string;
  referencia: string;
  documento: string;
  /** ISO — da solicitação (aguardando envio) ou do recebimento (recebido para análise). */
  data: string;
  /** Quem deve agir agora. */
  proximaAcao: string;
  /** Quem registrou a solicitação, quando conhecido. */
  solicitadoPor?: string;
  destino: DestinoComplementar;
}

const nomeBeneficiario = (id: string) => beneficiariosPagamento.find((b) => b.id === id)?.nome ?? id;
const ultimo = <T,>(l: readonly T[] | undefined): T | undefined => (l && l.length ? l[l.length - 1] : undefined);

function deRequerimentosAssociacao(): SolicitacaoComplementar[] {
  const out: SolicitacaoComplementar[] = [];
  for (const r of listarRequerimentosAssociacao()) {
    const status = statusAtualRequerimento(r);
    const vigente = r.versoes[r.versoes.length - 1];
    const anterior = r.versoes.length > 1 ? r.versoes[r.versoes.length - 2] : undefined;
    const titulo = `${tipoRequerimentoAssociacaoLabels[r.tipo]} — ${r.beneficiarioNome}`;
    if (status === "aguardando_complementacao" && vigente.decisao) {
      out.push({ id: `req-${r.id}`, origem: "Requerimentos", estado: "aguardando_envio", servidor: r.beneficiarioNome, referencia: tipoRequerimentoAssociacaoLabels[r.tipo], documento: vigente.decisao.justificativa ?? "Documento complementar solicitado", titulo, detalhe: `${r.associacao.toUpperCase()} · ${vigente.decisao.justificativa ?? "Documento complementar solicitado"}`, data: vigente.decisao.decididoEm, proximaAcao: `Associação (${r.associacao.toUpperCase()})`, solicitadoPor: vigente.decisao.decididoPor, destino: { to: "/admin/requerimentos" } });
    } else if (status === "pendente_validacao" && anterior?.decisao?.status === "aguardando_complementacao") {
      out.push({ id: `req-${r.id}`, origem: "Requerimentos", estado: "recebido_analise", servidor: r.beneficiarioNome, referencia: tipoRequerimentoAssociacaoLabels[r.tipo], documento: vigente.documentos.length ? `Documento recebido: ${vigente.documentos.map((d) => d.nome).join(", ")}` : `Complementação enviada (versão ${vigente.versao})`, titulo, detalhe: `${r.associacao.toUpperCase()} · complementação enviada (versão ${vigente.versao})`, data: vigente.enviadoEm, proximaAcao: "GERDAB", solicitadoPor: anterior.decisao.decididoPor, destino: { to: "/admin/requerimentos" } });
    }
  }
  return out;
}

function deComprovantes(): SolicitacaoComplementar[] {
  const out: SolicitacaoComplementar[] = [];
  for (const c of getComprovantesUnificados()) {
    const nomes = c.beneficiarioIds.map(nomeBeneficiario).join(", ");
    const titulo = `Comprovante de ${formatCompetencia(c.competencia)} — ${nomes}`;
    const acoes = c.aprovacoes ?? [];
    const correcaoPendente = c.status === "correcao_solicitada" || (c.statusPorBeneficiario ?? []).some((s) => s.status === "correcao_solicitada");
    if (correcaoPendente) {
      const a = [...acoes].reverse().find((x) => x.acao === "correcao_solicitada");
      out.push({ id: `comp-corr-${c.id}`, origem: "Comprovantes", estado: "aguardando_envio", servidor: nomes, referencia: formatCompetencia(c.competencia), documento: `Correção solicitada${a?.comentario ? ` · ${a.comentario}` : ""}`, titulo, detalhe: `Correção solicitada${a?.comentario ? ` · ${a.comentario}` : ""}`, data: a?.data ?? c.dataEnvio, proximaAcao: "Servidor", solicitadoPor: a?.aprovadoPor, destino: { to: "/admin/comprovantes", competencia: c.competencia, situacao: "devolvidos" } });
    } else if (c.status === "em_analise" && ultimo(acoes)?.acao === "reenviado" && acoes.some((x) => x.acao === "correcao_solicitada")) {
      out.push({ id: `comp-reenv-${c.id}`, origem: "Comprovantes", estado: "recebido_analise", servidor: nomes, referencia: formatCompetencia(c.competencia), documento: "Documento corrigido reenviado após solicitação de correção", titulo, detalhe: "Documento corrigido reenviado após solicitação de correção", data: ultimo(acoes)!.data, proximaAcao: "GERDAB", solicitadoPor: [...acoes].reverse().find((x) => x.acao === "correcao_solicitada")?.aprovadoPor, destino: { to: "/admin/comprovantes", competencia: c.competencia, situacao: "aguardando" } });
    }
    if (c.solicitacaoComplementar) {
      out.push({ id: `comp-compl-${c.id}`, origem: "Comprovantes", estado: "aguardando_envio", servidor: nomes, referencia: formatCompetencia(c.competencia), documento: `Documento complementar solicitado · ${c.solicitacaoComplementar.motivo}`, titulo, detalhe: `Documento complementar solicitado · ${c.solicitacaoComplementar.motivo}`, data: c.solicitacaoComplementar.data, proximaAcao: "Servidor", solicitadoPor: c.solicitacaoComplementar.solicitadoPor, destino: { to: "/admin/comprovantes", competencia: c.competencia, situacao: "aguardando" } });
    }
  }
  return out;
}

/** Solicitações de documento registradas nos requerimentos do servidor (somente demonstração local). */
const CHAVE_SOLICITACOES_REQ_SERVIDOR = "prosaude_solicitacoes_requerimento_servidor";
interface SolicitacaoRequerimentoServidor {
  requerimentoId: string;
  numero: string;
  tipo: string;
  servidor: string;
  documento: string;
  data: string;
  solicitadoPor?: string;
}
function lerSolicitacoesReqServidor(): SolicitacaoRequerimentoServidor[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SOLICITACOES_REQ_SERVIDOR) ?? "[]") as SolicitacaoRequerimentoServidor[];
  } catch {
    return [];
  }
}
/** Grava o pedido de documento do requerimento do servidor; um pedido novo do mesmo requerimento substitui o anterior. */
export function registrarSolicitacaoRequerimentoServidor(s: Omit<SolicitacaoRequerimentoServidor, "data">) {
  const lista = lerSolicitacoesReqServidor().filter((x) => x.requerimentoId !== s.requerimentoId);
  localStorage.setItem(CHAVE_SOLICITACOES_REQ_SERVIDOR, JSON.stringify([...lista, { ...s, data: new Date().toISOString() }]));
}
function deRequerimentosServidor(): SolicitacaoComplementar[] {
  return lerSolicitacoesReqServidor().map((s) => ({
    id: `req-serv-${s.requerimentoId}`,
    origem: "Requerimentos do servidor",
    estado: "aguardando_envio",
    servidor: s.servidor,
    referencia: `${s.tipo} · ${s.numero}`,
    documento: s.documento,
    titulo: `${s.tipo} — ${s.servidor}`,
    detalhe: `Documento solicitado: ${s.documento}`,
    data: s.data,
    proximaAcao: "Servidor",
    solicitadoPor: s.solicitadoPor,
    destino: { to: "/admin/requerimentos" },
  }));
}

function dePlanilhas(): SolicitacaoComplementar[] {
  const out: SolicitacaoComplementar[] = [];
  for (const p of listarPlanilhasAssociacao()) {
    const status = statusAtualPlanilha(p);
    const vigente = p.versoes[p.versoes.length - 1];
    const anterior = p.versoes.length > 1 ? p.versoes[p.versoes.length - 2] : undefined;
    const referencia = formatCompetencia(p.competencia);
    const titulo = `Planilha de ${referencia} — ${p.associacao}`;
    const base = { id: `plan-${p.id}`, origem: "Planilhas das associações" as const, servidor: p.associacao, referencia, titulo, destino: { to: "/admin/planilhas/$id" as const, id: p.id } };
    if (status === "correcao_solicitada" && vigente.decisao) {
      out.push({ ...base, estado: "aguardando_envio", documento: vigente.decisao.justificativa ?? "Correção da planilha", detalhe: `Correção solicitada: ${vigente.decisao.justificativa ?? "—"}`, data: vigente.decisao.decididoEm, proximaAcao: "Associação", solicitadoPor: vigente.decisao.decididoPor });
    } else if (status === "em_analise" && anterior?.decisao?.status === "correcao_solicitada") {
      out.push({ ...base, estado: "recebido_analise", documento: anterior.decisao.justificativa ?? "Correção da planilha", detalhe: "Planilha corrigida recebida para análise.", data: vigente.enviadoEm, proximaAcao: "GERDAB", solicitadoPor: anterior.decisao.decididoPor });
    }
  }
  return out;
}

function deRessarcimentos(): SolicitacaoComplementar[] {
  const out: SolicitacaoComplementar[] = [];
  for (const s of getSolicitacoesRetroativas()) {
    for (const c of s.competencias) {
      const st = getStatusRetroativo(s.origem, c);
      const e = ultimo(c.complementacoes);
      if (!e) continue;
      const titulo = `Ressarcimento de meses anteriores — ${s.nomeTitular} · ref. ${formatCompetencia(c.competenciaReferencia)}`;
      if (st === "aguardando_complementacao") {
        out.push({ id: `ress-${s.id}-${c.competenciaReferencia}`, origem: "Ressarcimentos de meses anteriores", estado: "aguardando_envio", servidor: s.nomeTitular, referencia: formatCompetencia(c.competenciaReferencia), documento: e.texto ?? "Complementação solicitada", titulo, detalhe: e.texto ?? "Complementação solicitada", data: e.dataHora, proximaAcao: "Servidor", solicitadoPor: e.responsavel, destino: { to: "/admin/retroativos", origem: "individual" } });
      } else if (st === "complementacao_recebida") {
        const pedido = [...(c.complementacoes ?? [])].reverse().find((x) => x.tipo === "solicitada");
        out.push({ id: `ress-${s.id}-${c.competenciaReferencia}`, origem: "Ressarcimentos de meses anteriores", estado: "recebido_analise", servidor: s.nomeTitular, referencia: formatCompetencia(c.competenciaReferencia), documento: "Complementação documental recebida do servidor", titulo, detalhe: "Complementação documental recebida do servidor", data: e.dataHora, proximaAcao: "GERDAB", solicitadoPor: pedido?.responsavel, destino: { to: "/admin/retroativos", origem: "individual" } });
      }
    }
  }
  return out;
}

/** Solicitações complementares em aberto (aguardando envio ou recebidas para análise), mais recentes primeiro. */
export function getSolicitacoesComplementares(): SolicitacaoComplementar[] {
  return [...deRequerimentosAssociacao(), ...deRequerimentosServidor(), ...deComprovantes(), ...deRessarcimentos(), ...dePlanilhas()].sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Relatório de Suspensões (NURFI) — S5: geração automática das situações da competência ("Gerar situações da competência").
 *
 * Lê, em MODO SOMENTE LEITURA, informações que já existem no Pró-Saúde e as transforma em registros "Conferir" (origem automática) para a
 * conferência do analista/Gerência GERDAB. NUNCA altera cadastro, pagamentos, comprovantes, requerimentos, planilhas ou a situação de
 * beneficiários, e nunca confirma nada: a classificação e a emissão continuam dependendo da conferência.
 *
 * Regras gerais:
 *  - "Suspender" só é sugerido quando a PRÓPRIA FONTE sustenta a classificação (comprovante ausente/recusado pelas regras do Fechamento;
 *    pendência documental vencida). "Excluir" só nasce de requerimento de exclusão APROVADO e persistido (associação).
 *  - Informação inconclusiva vira INVESTIGAÇÃO: registro sem classificação, com o que foi encontrado, por que não permite concluir e o
 *    que verificar. Nunca afirma inadimplência.
 *  - "Gerar situações da competência": a geração respeita a competência SELECIONADA na tela. Fontes com competência própria (comprovantes,
 *    planilhas) só geram registros da competência selecionada; o que for identificado em OUTRAS competências não é inserido em silêncio
 *    — é apenas informado. Fontes sem competência própria (pendências documentais, requerimentos) entram na competência selecionada.
 *  - Competências: a de pagamento não vem das fontes — reaproveita a já conferida nos demais registros da competência, ou é pré-preenchida
 *    e marcada como ESTIMADA (impeditiva até conferida). A competência inicial de uma pendência documental NÃO é presumida pelo vencimento:
 *    as competências afetadas ficam vazias para o analista informar.
 *  - Continuidade (S6): "Permanece suspenso" só é sugerido quando a MESMA pendência (`pendenciaRef`) teve uma suspensão efetivamente EMITIDA
 *    antes e continua sem regularização na fonte. Registro anterior só sugerido, em Conferir, Pronto não emitido ou descartado NÃO comprova
 *    suspensão comunicada; registros sem `pendenciaRef` não servem de evidência. Sem como verificar a regularização ⇒ investigação.
 *  - Idempotente: cada sugestão tem `chave` (fonte + pessoa + competência + tipo) e `fingerprint` (estado da origem). A mesma chave com o
 *    mesmo fingerprint nunca é recriada — inclusive se já descartada, confirmada ou emitida. Edições manuais nunca são sobrescritas.
 *
 * Fontes: os leitores consultam uma `FontesSuspensao` (ver `fontes-suspensoes.ts`): as fontes REAIS (abaixo, leitura dos módulos) ou, no
 * AMBIENTE DEMONSTRATIVO, as fontes FICTÍCIAS isoladas — o mesmo código de S5/S6 percorre os dois conjuntos; nada é gravado nos módulos de origem.
 *
 * Limitações das fontes (ver `LIMITACOES_FONTE`): requerimentos individuais do Admin não persistem a decisão (não são fonte); a fonte
 * documental cobre só o servidor de referência; planilhas não marcam inadimplência; o Fechamento cobre o cenário de dados do protótipo.
 */
import { competenciasFechadas, dependentes, formatCompetencia, requerimentos as requerimentosAdmin, servidorAtual, servidoresList } from "./mock-data";
import { competenciasParaFechamento, getRegistrosFechamento } from "./fechamento-pagamento";
import { idsEmitidos, listarEmissoes } from "./emissoes-relatorio";
import { getBeneficiariosDispensadosIds, getBeneficiariosPagamentoAtual } from "./prosaude-storage";
import { estaVencida, getPendenciasDocumentaisDoServidor, getStatusDocumentosDoServidor } from "./pendencias-documentais";
import { fontesDemonstracao, type FontesSuspensao } from "./fontes-suspensoes";
import { listarRequerimentosAssociacao, statusAtualRequerimento, statusRequerimentoAssociacaoLabels, versaoVigenteRequerimento } from "./requerimentos-associacao";
import { getAssociacaoModelo, getRegistrosAssociacaoAprovadosNaCompetencia, listarPlanilhasAssociacao, statusAtualPlanilha, versaoVigente } from "./planilhas-associacao";
import { getClassificacaoAtivoInativoPorCpf, getMatriculaPorCpf } from "./base-institucional";
import { getDataReferencia } from "./dias-uteis";
import { competenciaPagamentoPadrao, identificadorTitular, type OrigemPagamento, type VinculoFuncional } from "./relatorio-alteracoes";
import {
  listarSuspensoes,
  registrarSuspensao,
  competenciaPorExtenso,
  textoCompetencias,
  type FonteSugestaoSuspensao,
  type NovoRegistroSuspensao,
  type RegistroSuspensao,
  type TipoSugestaoSuspensao,
} from "./relatorio-suspensoes";

export const RESPONSAVEL_BUSCA = "Sistema (leitura dos módulos)";

export const LIMITACOES_FONTE: Record<FonteSugestaoSuspensao, string> = {
  comprovantes: "Cobre o cenário de dados do Fechamento do protótipo (competências fechadas) e a comprovação individual; origem Associação não tem comprovante individual.",
  pendencias_documentais: "A fonte documental cobre apenas o servidor de referência do protótipo, não toda a base. O vencimento do prazo não define a competência inicial da irregularidade.",
  requerimentos: "Só requerimentos de associação têm a decisão persistida. Requerimentos individuais do Admin não são usados: a aprovação deles não é gravada.",
  planilhas_associacao: "Planilhas não marcam inadimplência: ausência do beneficiário ou status Atenção geram apenas investigação, nunca Suspender.",
  continuidade: "Só suspensões já EMITIDAS com `pendenciaRef` servem de evidência. A regularização de comprovante vem do Fechamento (cenário do protótipo); a de documento só é verificável para o servidor de referência.",
};

const norm = (t?: string) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/* ── Fontes REAIS (somente leitura dos módulos do protótipo) ──────────────────────────────────────────────────── */

export function fontesReais(): FontesSuspensao {
  const servidorRef = () => ({ nome: servidorAtual.nome, matricula: servidorAtual.matricula, cpf: servidorAtual.cpf, associacao: servidorAtual.associacao });
  const destino = () => (servidorAtual.associacao !== "—" ? ("associacao" as const) : ("servidor" as const));
  return {
    demonstracao: false,
    competenciasGeracao: [...competenciasFechadas],
    competenciasVerificaveis: competenciasParaFechamento,
    registrosFechamento: (c) => getRegistrosFechamento(c),
    dispensado: (c) => {
      const grupo = getBeneficiariosPagamentoAtual().filter((b) => !b.associacao);
      const dispensados = new Set(getBeneficiariosDispensadosIds(c));
      return grupo.length > 0 && grupo.every((b) => dispensados.has(b.id));
    },
    hoje: getDataReferencia,
    pendenciasDocumentais: () =>
      getPendenciasDocumentaisDoServidor(servidorAtual.matricula, destino(), getDataReferencia()).map((p) => ({ servidor: servidorRef(), pendencia: p, parentesco: p.dependenteId ? dependentes.find((d) => d.id === p.dependenteId)?.parentesco : undefined })),
    statusDocumento: (matricula, documento, afetado) => {
      if (matricula !== servidorAtual.matricula) return { coberto: false, detalhe: "A fonte documental cobre apenas o servidor de referência do protótipo: não há como verificar a regularização deste titular." };
      const doc = norm(documento);
      const nomeAlvo = afetado.tipo === "dependente" ? norm(afetado.nomeDependente) : "";
      const visao = getStatusDocumentosDoServidor(servidorAtual.matricula).find((v) => norm(v.documento) === doc && (afetado.tipo === "titular" ? v.beneficiarioId === "titular" : norm(v.beneficiarioNome) === nomeAlvo));
      if (visao) return { coberto: true, estado: visao.status, analisadoPor: visao.analisadoPor };
      const aberta = getPendenciasDocumentaisDoServidor(servidorAtual.matricula, destino(), getDataReferencia()).some((p) => norm(p.documento) === doc && (afetado.tipo === "titular" ? !p.dependenteId : norm(p.dependenteNome) === nomeAlvo));
      return aberta ? { coberto: true, estado: "aguardando_envio", detalhe: "cadastro" } : { coberto: true, estado: "desconhecido" };
    },
    requerimentosExclusao: () =>
      listarRequerimentosAssociacao()
        .filter((r) => r.tipo === "exclusao")
        .map((r) => {
          const v = versaoVigenteRequerimento(r);
          return { id: r.id, associacao: r.associacao, beneficiarioNome: r.beneficiarioNome, beneficiarioId: r.beneficiarioId, criadoEm: r.criadoEm, status: statusAtualRequerimento(r), versao: v.versao, decididoEm: v.decisao?.decididoEm, decididoPor: v.decisao?.decididoPor };
        }),
    requerimentosIndividuaisExclusao: () => requerimentosAdmin.filter((r) => r.tipo === "Exclusão").length,
    titularPorMatricula: (m) => servidoresList.find((s) => s.matricula === m),
    planilhas: () =>
      listarPlanilhasAssociacao().map((p) => {
        const v = versaoVigente(p);
        const confirmada = statusAtualPlanilha(p) === "aprovada";
        return { associacao: p.associacao, competencia: p.competencia, confirmada, versao: v.versao, linhas: v.registros, titulares: confirmada ? getRegistrosAssociacaoAprovadosNaCompetencia(p.competencia).filter((g) => g.associacao === p.associacao).map((g) => ({ cpfTitular: g.cpfTitular, nomeTitular: g.nomeTitular })) : [] };
      }),
    vinculoPorCpf: (cpf) => getClassificacaoAtivoInativoPorCpf(cpf),
    matriculaPorCpf: (cpf) => getMatriculaPorCpf(cpf),
    historico: () => {
      const emitidos = new Map<string, { numero: number; referencia: string; geradoEm: string }>();
      for (const e of listarEmissoes("suspensoes"))
        for (const id of e.registroIds) {
          const atual = emitidos.get(id);
          if (!atual || e.competenciaReferencia + String(e.numero).padStart(4, "0") > atual.referencia + String(atual.numero).padStart(4, "0")) emitidos.set(id, { numero: e.numero, referencia: e.competenciaReferencia, geradoEm: e.geradoEm });
        }
      return { registros: listarSuspensoes(), emitidos };
    },
  };
}

/** Fontes em uso na leitura corrente (definidas por `gerarSituacoesDaCompetencia`; sem ambiente demonstrativo, as reais). */
let fontesCorrentes: FontesSuspensao | undefined;
const F = (): FontesSuspensao => (fontesCorrentes ??= fontesReais());

/* ── Utilitários ──────────────────────────────────────────────────────────────────────────────────────────────── */

export interface ResultadoFonteSuspensao {
  fonte: FonteSugestaoSuspensao;
  /** Itens lidos da fonte (antes de qualquer filtro). */
  lidos: number;
  sugestoes: NovoRegistroSuspensao[];
  /** Lidos que NÃO geraram sugestão nem investigação, com o motivo. */
  ignorados: { motivo: string; quantidade: number }[];
}

class Contador {
  private m = new Map<string, number>();
  somar(motivo: string) {
    this.m.set(motivo, (this.m.get(motivo) ?? 0) + 1);
  }
  lista() {
    return [...this.m.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade }));
  }
}

const hash = (t: string) => {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const mesAnterior = (c: string) => {
  const [a, m] = c.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};
const dataCurta = (iso?: string) => {
  const d = iso ? new Date(iso) : undefined;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : iso ?? "";
};

/** Vínculo funcional pela regra institucional existente; sem situação confiável → indefinido + aviso (nunca escolhe em silêncio). */
function resolverVinculo(cpf?: string): { vinculo?: VinculoFuncional; aviso?: string } {
  if (!cpf) return { aviso: "Vínculo funcional (Ativo/Inativo) a conferir: titular sem CPF na fonte." };
  const c = F().vinculoPorCpf(cpf);
  return c.grupo && !c.requerConferencia ? { vinculo: c.grupo } : { aviso: `Vínculo funcional (Ativo/Inativo) a conferir: ${c.motivo ?? "sem situação funcional confiável."}` };
}

function origemPorAssociacao(associacao?: string): { origem?: OrigemPagamento; aviso?: string } {
  const a = associacao ? getAssociacaoModelo(associacao) : undefined;
  if (a === "Assefaz") return { origem: "ASSEFAZ" };
  if (a === "Assetran") return { origem: "ASSETRAN" };
  return { aviso: "Origem de pagamento (ASSEFAZ/ASSETRAN) a conferir: associação não reconhecida." };
}

const AVISO_PAGAMENTO = "A competência de pagamento não vem da fonte: usa a já conferida nos demais registros da competência ou, se não houver, é pré-preenchida como o mês seguinte e fica marcada para conferência. Confira as competências antes de confirmar.";

interface Base {
  fonte: FonteSugestaoSuspensao;
  tipo: TipoSugestaoSuspensao;
  chave: string;
  fingerprint: string;
  justificativa: string;
  encontrado?: string;
  verificar?: string;
  avisos?: (string | undefined)[];
}

/** Monta o registro sugerido: id determinístico (chave + fingerprint), origem automática, competência estimada. */
function sugerir(b: Base, dados: Omit<NovoRegistroSuspensao, "id" | "sugestao" | "origemInformacao" | "conferencia" | "competenciaEstimada">): NovoRegistroSuspensao {
  const conferencia = [b.justificativa, ...(b.encontrado ? [`Encontrado: ${b.encontrado}`] : []), ...(b.verificar ? [`Verificar: ${b.verificar}`] : []), AVISO_PAGAMENTO, ...(b.avisos ?? []).filter((x): x is string => !!x)];
  return {
    ...dados,
    id: `sug-${hash(`${b.chave}|${b.fingerprint}`)}`,
    origemInformacao: "automatica",
    competenciaEstimada: true,
    conferencia,
    sugestao: { fonte: b.fonte, tipo: b.tipo, chave: b.chave, fingerprint: b.fingerprint, geradaEm: new Date().toISOString(), justificativa: b.justificativa, encontrado: b.encontrado, verificar: b.verificar },
    competenciaPagamento: dados.competenciaPagamento ?? competenciaPagamentoPadrao(dados.competenciaReferencia),
  };
}

/* ── 1. Comprovantes e Fechamento ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Usa a classificação que o Fechamento já faz por titular e competência (`getRegistrosFechamento`), somente nas competências FECHADAS e na
 * comprovação INDIVIDUAL (Boletos). Inadimplente por comprovante AUSENTE ou RECUSADO ⇒ sugestão "Suspender" presa à competência do
 * comprovante. Dispensa registrada pelo servidor e ressarcimento retroativo negado ⇒ INVESTIGAÇÃO.
 */
export function lerSugestoesComprovantes(): ResultadoFonteSuspensao {
  const ign = new Contador();
  const sugestoes: NovoRegistroSuspensao[] = [];
  let lidos = 0;
  for (const comp of F().competenciasGeracao) {
    for (const r of F().registrosFechamento(comp)) {
      lidos++;
      const grupoDispensado = F().dispensado(comp, r);
      if (r.origem !== "individual") {
        ign.somar("Origem Associação: a comprovação é coletiva (planilha), não há comprovante individual a cobrar");
        continue;
      }
      if (r.classificacao === "adimplente") {
        ign.somar("Titular adimplente na competência");
        continue;
      }
      if (r.classificacao === "requer_analise") {
        ign.somar("Comprovante em análise pela GERDAB (ainda não é inadimplência)");
        continue;
      }
      const v = resolverVinculo(r.cpf);
      const base = {
        titular: { nome: r.nome, matricula: r.matricula, cpf: r.cpf },
        vinculo: v.vinculo,
        origemPagamento: "Boletos" as OrigemPagamento,
        competenciaReferencia: comp,
        afetado: { tipo: "titular" as const },
        referenciaOrigem: { modulo: "comprovantes" as const, registroId: `${r.beneficiarioId}:${comp}`, rotulo: `Fechamento — ${formatCompetencia(comp)}` },
      };
      const chaveBase = `comprovantes|${r.matricula ?? r.cpf ?? r.beneficiarioId}|${comp}`;
      if (r.statusComprovante === "retroativo_recusado") {
        sugestoes.push(
          sugerir(
            { fonte: "comprovantes", tipo: "investigacao", chave: `${chaveBase}|retroativo`, fingerprint: `retroativo_recusado:${r.motivo ?? ""}`, justificativa: `Investigação: o ressarcimento de meses anteriores de ${formatCompetencia(comp)} não foi autorizado pela GERDAB.`, encontrado: `O Fechamento classifica ${r.nome} como inadimplente em ${formatCompetencia(comp)} porque o retroativo foi negado${r.motivo ? ` (${r.motivo})` : ""}.`, verificar: "Verifique se a negação do ressarcimento retroativo implica suspensão ou se o comprovante da competência foi apresentado por outra via.", avisos: [v.aviso] },
            base,
          ),
        );
        continue;
      }
      if (!r.comprovanteId) {
        if (grupoDispensado) {
          sugestoes.push(
            sugerir(
              { fonte: "comprovantes", tipo: "investigacao", chave: `${chaveBase}|dispensa`, fingerprint: "dispensa", justificativa: `Investigação: há dispensa de comprovante registrada para ${formatCompetencia(comp)}.`, encontrado: `O servidor optou por não apresentar o comprovante de ${formatCompetencia(comp)} (dispensa registrada).`, verificar: "Verifique se a dispensa é válida para esta competência. Dispensa registrada não gera suspensão automática.", avisos: [v.aviso] },
              base,
            ),
          );
          continue;
        }
        sugestoes.push(
          sugerir(
            { fonte: "comprovantes", tipo: "suspensao", chave: `${chaveBase}|comprovante`, fingerprint: "ausente", justificativa: `O Fechamento classifica ${r.nome} como inadimplente em ${formatCompetencia(comp)}: nenhum comprovante de pagamento foi apresentado para a competência.`, verificar: "Confirme que o comprovante realmente não foi apresentado e informe a competência de pagamento.", avisos: [v.aviso] },
            { ...base, classificacao: "suspender", motivo: "sem_comprovante_pagamento", pendenciaRef: { tipo: "comprovante_pagamento", competencia: comp } },
          ),
        );
        continue;
      }
      const detalhe = (r.motivo ?? "").trim().replace(/\.$/, "");
      sugestoes.push(
        sugerir(
          { fonte: "comprovantes", tipo: "suspensao", chave: `${chaveBase}|comprovante`, fingerprint: `recusado:${r.comprovanteId}:${detalhe}`, justificativa: `O Fechamento classifica ${r.nome} como inadimplente em ${formatCompetencia(comp)}: o comprovante apresentado foi recusado na análise${detalhe ? ` (${detalhe})` : ""}.`, verificar: "Confirme se o comprovante da competência continua sem regularização.", avisos: [v.aviso] },
          { ...base, classificacao: "suspender", motivo: `Comprovante de pagamento recusado${detalhe ? `: ${detalhe}` : ""}`, pendenciaRef: { tipo: "comprovante_pagamento", competencia: comp } },
        ),
      );
    }
  }
  return { fonte: "comprovantes", lidos, sugestoes, ignorados: ign.lista() };
}

/* ── 2. Pendências documentais ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Pendências documentais do SERVIDOR DE REFERÊNCIA do protótipo (única cobertura da fonte). Vencida ⇒ sugestão "Suspender" por
 * documentação obrigatória, SEM competências afetadas (o analista as informa e confirma a competência inicial: o vencimento não a define).
 * Sem prazo definido ⇒ investigação. Dentro do prazo ⇒ ignorada.
 */
export function lerSugestoesPendencias(competencia: string): ResultadoFonteSuspensao {
  const ign = new Contador();
  const sugestoes: NovoRegistroSuspensao[] = [];
  const hoje = F().hoje();
  const itens = F().pendenciasDocumentais();
  for (const { servidor, pendencia: p, parentesco } of itens) {
    const v = resolverVinculo(servidor.cpf);
    const origem = servidor.associacao !== "—" ? origemPorAssociacao(servidor.associacao) : { origem: "Boletos" as OrigemPagamento, aviso: undefined };
    if (p.tipo === "limite_idade") {
      ign.somar("Limite de idade não é entrega de documento (não gera suspensão por documentação)");
      continue;
    }
    const afetado = p.dependenteId ? { tipo: "dependente" as const, nomeDependente: p.dependenteNome ?? "(dependente)", parentesco } : { tipo: "titular" as const };
    const quem = p.dependenteId ? `do dependente ${p.dependenteNome}` : "do titular";
    const base = {
      titular: { nome: servidor.nome, matricula: servidor.matricula, cpf: servidor.cpf },
      vinculo: v.vinculo,
      origemPagamento: origem.origem,
      competenciaReferencia: competencia,
      afetado,
      motivo: "sem_documentacao",
      pendenciaRef: { tipo: "documentacao_obrigatoria" as const, documento: p.documento },
      referenciaOrigem: { modulo: "cadastro" as const, registroId: p.id, rotulo: `Pendência documental — ${p.documento}` },
    };
    const chave = `pendencias_documentais|${servidor.matricula}|${p.dependenteId ?? "titular"}|${p.tipo}|${p.documento}`;
    const avisos = [v.aviso, origem.aviso, `Incluída na competência selecionada (${formatCompetencia(competencia)}). As competências afetadas ficam em branco: informe-as e confirme a competência inicial — o vencimento do prazo não a define.`];
    if (p.prazo === null) {
      sugestoes.push(
        sugerir(
          { fonte: "pendencias_documentais", tipo: "investigacao", chave, fingerprint: `sem_prazo:${p.criadoEm.slice(0, 10)}`, justificativa: `Investigação: o documento "${p.documento}" ${quem} está pendente, mas não há prazo definido pelo sistema.`, encontrado: `Pendência "${p.documento}" em aberto, sem prazo (${p.origem === "analista" ? "solicitada por analista" : "regra do sistema"}).`, verificar: "Verifique se a ausência do documento já enseja suspensão e a partir de qual competência.", avisos },
          { ...base, motivo: undefined, afetado, pendenciaRef: base.pendenciaRef },
        ),
      );
      continue;
    }
    if (!estaVencida(p as Parameters<typeof estaVencida>[0], hoje)) {
      ign.somar("Pendência dentro do prazo: não demonstra irregularidade");
      continue;
    }
    sugestoes.push(
      sugerir(
        { fonte: "pendencias_documentais", tipo: "suspensao", chave, fingerprint: `vencida:${p.prazo.data.toISOString().slice(0, 10)}`, justificativa: `O documento "${p.documento}" ${quem} está pendente e o prazo (${p.prazo.texto}) já venceu.`, verificar: "Informe as competências afetadas e confirme a competência inicial da irregularidade; confirme que o documento não foi apresentado e aprovado.", avisos },
        { ...base, classificacao: "suspender" },
      ),
    );
  }
  return { fonte: "pendencias_documentais", lidos: itens.length, sugestoes, ignorados: ign.lista() };
}

/* ── 3. Requerimentos de exclusão ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Só requerimentos de ASSOCIAÇÃO do tipo exclusão com decisão "aprovado" persistida. O requerimento não informa se a exclusão atinge o
 * titular ou um dependente: o registro nasce com `afetadoAConferir` (impeditivo até o analista conferir). Requerimentos individuais do
 * Admin não são fonte (a decisão não é persistida).
 */
export function lerSugestoesRequerimentos(competencia: string): ResultadoFonteSuspensao {
  const ign = new Contador();
  const sugestoes: NovoRegistroSuspensao[] = [];
  const todos = F().requerimentosExclusao();
  for (const r of todos) {
    if (r.status !== "aprovado") {
      ign.somar(`Requerimento de exclusão não aprovado (${statusRequerimentoAssociacaoLabels[r.status]})`);
      continue;
    }
    const servidor = r.beneficiarioId ? F().titularPorMatricula(r.beneficiarioId) : undefined;
    const v = resolverVinculo(servidor?.cpf);
    const origem = origemPorAssociacao(r.associacao);
    sugestoes.push(
      sugerir(
        {
          fonte: "requerimentos",
          tipo: "exclusao",
          chave: `requerimentos|${r.id}`,
          fingerprint: `v${r.versao}:aprovado:${r.decididoEm ?? ""}`,
          justificativa: `Requerimento de exclusão ${r.id} (${r.associacao}) aprovado pela GERDAB em ${dataCurta(r.decididoEm)}${r.decididoPor ? ` por ${r.decididoPor}` : ""}.`,
          verificar: `Confirme quem é afetado (titular: exclui todo o grupo familiar; dependente: exclusão exclusiva), informe o motivo e confira o requerimento. Incluído na competência selecionada; a decisão ocorreu em ${dataCurta(r.decididoEm)}.`,
          avisos: [v.aviso, origem.aviso, servidor ? undefined : "O requerimento não identifica o titular por matrícula: informe nome e matrícula do titular."],
        },
        {
          titular: { nome: servidor?.nome ?? r.beneficiarioNome, matricula: servidor?.matricula, cpf: servidor?.cpf },
          vinculo: v.vinculo,
          origemPagamento: origem.origem,
          competenciaReferencia: competencia,
          classificacao: "excluir",
          afetado: { tipo: "titular" },
          afetadoAConferir: `o requerimento ${r.id} identifica "${r.beneficiarioNome}" e não informa se a exclusão é do titular (todo o grupo familiar) ou de um dependente.`,
          requerimentoExclusao: { origem: "requerimento_associacao", referencia: r.id, requerimentoId: r.id, associacao: r.associacao, beneficiarioReferencia: r.beneficiarioNome, situacaoAprovacao: "aprovado", statusFonte: statusRequerimentoAssociacaoLabels.aprovado, decididoPor: r.decididoPor, decididoEm: r.decididoEm },
          referenciaOrigem: { modulo: "requerimentos", registroId: r.id, marcador: `v${r.versao}:aprovado`, rotulo: `Requerimento de exclusão — ${r.associacao}`, decisao: { descricao: `Aprovado pela GERDAB em ${dataCurta(r.decididoEm)}.`, responsavel: r.decididoPor, dataHora: r.decididoEm } },
        },
      ),
    );
  }
  const individuais = F().requerimentosIndividuaisExclusao();
  if (individuais > 0) for (let i = 0; i < individuais; i++) ign.somar("Requerimento individual do Admin: a decisão não é persistida, por isso não é usado como fonte de aprovação");
  return { fonte: "requerimentos", lidos: todos.length + individuais, sugestoes, ignorados: ign.lista() };
}

/* ── 4. Planilhas das associações ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Planilha NÃO prova inadimplência. Dois indícios geram apenas INVESTIGAÇÃO (sem classificação): (a) linha com status "Atenção" numa
 * planilha confirmada; (b) titular que constava na planilha confirmada do mês anterior e não consta na do mês.
 */
export function lerSugestoesPlanilhas(): ResultadoFonteSuspensao {
  const ign = new Contador();
  const sugestoes: NovoRegistroSuspensao[] = [];
  const planilhas = F().planilhas();
  let lidos = 0;
  for (const p of planilhas) {
    lidos++;
    if (!p.confirmada) {
      ign.somar("Planilha sem análise financeira confirmada pela GERDAB");
      continue;
    }
    const origem = origemPorAssociacao(p.associacao);
    const rotulo = `Planilha ${p.associacao} — ${formatCompetencia(p.competencia)}`;
    const base = (nome: string, cpf?: string) => {
      const v = resolverVinculo(cpf);
      const matricula = cpf ? F().matriculaPorCpf(cpf) : undefined;
      return {
        v,
        matricula,
        dados: {
          titular: { nome, matricula, cpf },
          vinculo: v.vinculo,
          origemPagamento: origem.origem,
          competenciaReferencia: p.competencia,
          afetado: { tipo: "titular" as const },
          referenciaOrigem: { modulo: "planilhas_associacao" as const, registroId: `${p.associacao}:${cpf ?? nome}:${p.competencia}`, rotulo },
        },
      };
    };
    // (a) status Atenção
    const atencao = new Map<string, { nome: string; linhas: string[] }>();
    for (const l of p.linhas.filter((x) => x.status === "atenção")) {
      const k = l.cpfTitular;
      const e = atencao.get(k) ?? { nome: l.servidor, linhas: [] };
      e.linhas.push(`${l.beneficiario}${l.motivo ? ` — ${l.motivo}` : ""}`);
      atencao.set(k, e);
    }
    for (const [cpf, e] of atencao) {
      const b = base(e.nome, cpf);
      sugestoes.push(
        sugerir(
          { fonte: "planilhas_associacao", tipo: "investigacao", chave: `planilhas_associacao|${p.associacao}|${cpf}|${p.competencia}|atencao`, fingerprint: `v${p.versao}:${hash(e.linhas.join("|"))}`, justificativa: `Investigação: a planilha da ${p.associacao} de ${formatCompetencia(p.competencia)} traz linha(s) com status Atenção para ${e.nome}.`, encontrado: `Linha(s) com status Atenção: ${e.linhas.join("; ")}.`, verificar: "Status Atenção indica ressalva no preenchimento, não prova ausência de comprovação nem inadimplência. Verifique o motivo e se há comprovação pendente.", avisos: [b.v.aviso, origem.aviso, b.matricula ? undefined : "Matrícula não encontrada na base institucional a partir do CPF."] },
          b.dados,
        ),
      );
    }
    // (b) titular ausente em relação ao mês anterior
    const anterior = planilhas.find((x) => x.associacao === p.associacao && x.competencia === mesAnterior(p.competencia));
    if (!anterior || !anterior.confirmada) {
      ign.somar("Sem planilha confirmada do mês anterior para comparar a presença dos titulares (evidência insuficiente)");
      continue;
    }
    const atuais = new Set(p.titulares.map((g) => g.cpfTitular));
    for (const g of anterior.titulares) {
      if (atuais.has(g.cpfTitular)) continue;
      const b = base(g.nomeTitular, g.cpfTitular);
      sugestoes.push(
        sugerir(
          { fonte: "planilhas_associacao", tipo: "investigacao", chave: `planilhas_associacao|${p.associacao}|${g.cpfTitular}|${p.competencia}|ausente`, fingerprint: `ausente:${anterior.competencia}:v${p.versao}:v${anterior.versao}`, justificativa: `Investigação: ${g.nomeTitular} consta na planilha da ${p.associacao} de ${formatCompetencia(anterior.competencia)} e não consta na de ${formatCompetencia(p.competencia)}.`, encontrado: `Titular presente em ${formatCompetencia(anterior.competencia)} e ausente em ${formatCompetencia(p.competencia)}.`, verificar: "A ausência pode ter outras causas (exclusão, mudança de associação, erro no envio). Verifique antes de classificar; não é prova de inadimplência.", avisos: [b.v.aviso, origem.aviso, b.matricula ? undefined : "Matrícula não encontrada na base institucional a partir do CPF."] },
          b.dados,
        ),
      );
    }
  }
  return { fonte: "planilhas_associacao", lidos, sugestoes, ignorados: ign.lista() };
}

/* ── 5. Continuidade de suspensão (S6) ────────────────────────────────────────────────────────────────────────── */

type EstadoRegularizacao = "regularizada" | "aberta" | "apresentada_nao_aprovada" | "nao_verificavel";
interface Verificacao {
  estado: EstadoRegularizacao;
  detalhe: string;
}

const afetadoChave = (r: RegistroSuspensao) => `${r.afetado.tipo}:${norm(r.afetado.nomeDependente)}`;
const pendenciaChave = (r: RegistroSuspensao) => (r.pendenciaRef ? `${r.pendenciaRef.tipo}:${norm(r.pendenciaRef.documento)}:${r.pendenciaRef.competencia ?? ""}` : "");

/** Comprovante: a regularização é verificada SOMENTE na competência da própria pendência (comprovante de outro mês não a regulariza). */
function verificarComprovante(base: RegistroSuspensao): Verificacao {
  const comp = base.pendenciaRef?.competencia;
  if (!comp) return { estado: "nao_verificavel", detalhe: "A pendência não informa a competência do comprovante." };
  if (base.origemPagamento !== "Boletos") return { estado: "nao_verificavel", detalhe: "A comprovação desta origem é coletiva (planilha da associação): não há comprovante individual para verificar." };
  if (!F().competenciasVerificaveis.includes(comp)) return { estado: "nao_verificavel", detalhe: `${competenciaPorExtenso(comp)} está fora do cenário de dados do Fechamento: não há como verificar o comprovante.` };
  const r = F().registrosFechamento(comp).find((x) => x.origem === "individual" && ((!!x.matricula && x.matricula === base.titular.matricula) || (!!x.cpf && x.cpf === base.titular.cpf)));
  if (!r) return { estado: "nao_verificavel", detalhe: `O titular não consta no Fechamento de ${competenciaPorExtenso(comp)}.` };
  if (r.classificacao === "adimplente") return { estado: "regularizada", detalhe: `O Fechamento de ${competenciaPorExtenso(comp)} classifica o titular como adimplente (comprovante aprovado).` };
  if (r.classificacao === "requer_analise") return { estado: "apresentada_nao_aprovada", detalhe: `Há comprovante de ${competenciaPorExtenso(comp)} apresentado, ainda em análise pela GERDAB: a entrega não equivale à aprovação.` };
  return { estado: "aberta", detalhe: `O Fechamento de ${competenciaPorExtenso(comp)} segue classificando o titular como inadimplente (comprovante ausente ou recusado). Comprovantes de outras competências não regularizam esta.` };
}

/** Documentação obrigatória: regularizada só quando apresentada E APROVADA pela GERDAB. A cobertura depende da fonte (a real cobre só o servidor de referência). */
function verificarDocumento(base: RegistroSuspensao): Verificacao {
  const documento = base.pendenciaRef?.documento;
  if (!norm(documento)) return { estado: "nao_verificavel", detalhe: "A pendência não identifica o documento." };
  const st = F().statusDocumento(base.titular.matricula ?? "", documento!, base.afetado);
  if (!st.coberto) return { estado: "nao_verificavel", detalhe: st.detalhe ?? "A fonte documental não cobre este titular: não há como verificar a regularização." };
  if (st.estado === "aprovado") return { estado: "regularizada", detalhe: `O documento "${documento}" foi apresentado e aprovado pela GERDAB${st.analisadoPor ? ` (${st.analisadoPor})` : ""}.` };
  if (st.estado === "aguardando_analise") return { estado: "apresentada_nao_aprovada", detalhe: `O documento "${documento}" foi apresentado, mas ainda não foi aprovado pela GERDAB: a simples entrega não regulariza a pendência.` };
  if (st.estado === "aguardando_envio") return { estado: "aberta", detalhe: st.detalhe === "cadastro" ? "A pendência documental continua em aberto no cadastro." : `O documento "${documento}" continua aguardando envio.` };
  return { estado: "nao_verificavel", detalhe: "A pendência não consta mais em aberto, mas não há registro de aprovação do documento pela GERDAB: não é possível confirmar a regularização." };
}

/** Identidade da pendência: titular + pessoa afetada + `pendenciaRef` (mesma regra da continuidade). */
const identidadePendencia = (r: Pick<RegistroSuspensao, "titular" | "afetado" | "pendenciaRef">) => `${identificadorTitular(r.titular)}|${r.afetado.tipo}:${norm(r.afetado.nomeDependente)}|${r.pendenciaRef ? `${r.pendenciaRef.tipo}:${norm(r.pendenciaRef.documento)}:${r.pendenciaRef.competencia ?? ""}` : ""}`;

const verificar = (base: RegistroSuspensao): Verificacao => (base.pendenciaRef!.tipo === "comprovante_pagamento" ? verificarComprovante(base) : verificarDocumento(base));

/**
 * Continuidade por PENDÊNCIA ESPECÍFICA (mesmo titular + pessoa afetada + `pendenciaRef`). Evidência = suspensão efetivamente EMITIDA antes
 * da competência selecionada. A competência original da pendência e as competências afetadas são preservadas no novo registro; a
 * competência selecionada é apenas a do relatório em que a permanência será comunicada.
 */
export function lerSugestoesContinuidade(competencia: string): ResultadoFonteSuspensao {
  const ign = new Contador();
  const sugestoes: NovoRegistroSuspensao[] = [];
  const { registros, emitidos } = F().historico(); // evidência: histórico real (armazenamento) ou, no ambiente demonstrativo, o histórico fictício isolado
  const registrosDaCompetencia = listarSuspensoes(); // o que já foi gerado/registrado de fato
  const suspensoesAnteriores = registros.filter((r) => (r.classificacao === "suspender" || r.classificacao === "permanece_suspenso") && r.competenciaReferencia < competencia);
  const semChave = suspensoesAnteriores.filter((r) => !r.pendenciaRef && r.situacao !== "descartada").length;
  if (semChave > 0) for (let i = 0; i < semChave; i++) ign.somar("Suspensão anterior sem identificação da pendência (`pendenciaRef`): não é evidência automática de continuidade");
  const grupos = new Map<string, RegistroSuspensao[]>();
  for (const r of suspensoesAnteriores.filter((x) => x.pendenciaRef)) {
    const k = `${identificadorTitular(r.titular)}|${afetadoChave(r)}|${pendenciaChave(r)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), r]);
  }
  let lidos = 0;
  for (const [k, g] of grupos) {
    lidos++;
    if (registrosDaCompetencia.some((r) => r.pendenciaRef && `${identificadorTitular(r.titular)}|${afetadoChave(r)}|${pendenciaChave(r)}` === k && r.competenciaReferencia === competencia)) {
      ign.somar("Pendência já tratada na competência selecionada");
      continue;
    }
    const abertas = g.filter((r) => r.situacao !== "descartada");
    if (abertas.length === 0) {
      ign.somar("Suspensão anterior descartada: não comprova suspensão comunicada");
      continue;
    }
    const emitidasDoGrupo = abertas.filter((r) => emitidos.has(r.id)).sort((a, b) => (emitidos.get(b.id)!.referencia + String(emitidos.get(b.id)!.numero).padStart(4, "0")).localeCompare(emitidos.get(a.id)!.referencia + String(emitidos.get(a.id)!.numero).padStart(4, "0")));
    const modelo = emitidasDoGrupo[0] ?? [...abertas].sort((a, b) => b.competenciaReferencia.localeCompare(a.competenciaReferencia))[0];
    const v = verificar(modelo);
    if (v.estado === "regularizada") {
      ign.somar("Pendência comprovadamente regularizada: não há continuidade");
      continue;
    }
    const quem = modelo.afetado.tipo === "dependente" ? ` do dependente ${modelo.afetado.nomeDependente}` : "";
    const pendTxt = modelo.pendenciaRef!.tipo === "comprovante_pagamento" ? `comprovante de pagamento de ${competenciaPorExtenso(modelo.pendenciaRef!.competencia ?? "")}` : `documentação obrigatória "${modelo.pendenciaRef!.documento ?? ""}" (${textoCompetencias(modelo.competenciasAfetadas ?? []) || "competências a informar"})`;
    const chaveBase = `continuidade|${k}|${competencia}`;
    const dados = {
      titular: { ...modelo.titular },
      vinculo: modelo.vinculo,
      origemPagamento: modelo.origemPagamento,
      competenciaReferencia: competencia,
      afetado: { ...modelo.afetado },
      pendenciaRef: { ...modelo.pendenciaRef! },
      competenciasAfetadas: modelo.competenciasAfetadas,
      referenciaOrigem: { modulo: (modelo.pendenciaRef!.tipo === "comprovante_pagamento" ? "fechamento" : "cadastro") as "fechamento" | "cadastro", registroId: modelo.id, marcador: `base:${modelo.id}`, rotulo: `Pendência — ${pendTxt}` },
    };
    // A conferência da competência inicial do registro anterior é só INFORMAÇÃO HISTÓRICA: o novo registro exige a sua própria conferência.
    const avisoInicial = modelo.pendenciaRef!.tipo === "documentacao_obrigatoria" ? `Competências afetadas copiadas do registro anterior${modelo.competenciaInicialConferida ? ` (competência inicial conferida por ${modelo.competenciaInicialConferida.responsavel} naquele registro)` : ""}. Este registro exige a sua própria conferência da competência inicial antes da emissão: ajuste as competências se a irregularidade se estendeu.` : undefined;
    const emitida = emitidos.get(modelo.id);
    if (v.estado === "nao_verificavel" || !emitida) {
      const semEmissao = !emitida ? `O registro anterior da mesma pendência (${competenciaPorExtenso(modelo.competenciaReferencia)}) ${modelo.situacao === "confirmada" ? "está Pronto, mas não foi emitido" : "está em Conferir"}: não comprova suspensão comunicada.` : "";
      sugestoes.push(
        sugerir(
          { fonte: "continuidade", tipo: "investigacao", chave: chaveBase, fingerprint: `${emitida ? "emitida" : "nao_emitida"}:${modelo.id}:${v.estado}`, justificativa: `Investigação: a pendência de ${pendTxt}${quem} pode continuar, mas faltam evidências para confirmar a permanência da suspensão.`, encontrado: [semEmissao, v.estado === "nao_verificavel" ? v.detalhe : ""].filter(Boolean).join(" "), verificar: "Verifique se houve suspensão comunicada anteriormente e se a pendência continua sem regularização; depois classifique a situação.", avisos: [avisoInicial] },
          dados,
        ),
      );
      continue;
    }
    sugestoes.push(
      sugerir(
        { fonte: "continuidade", tipo: "suspensao", chave: chaveBase, fingerprint: `emitida:${modelo.id}:${v.estado}:${emitida.numero}`, justificativa: `A suspensão da pendência de ${pendTxt}${quem} foi comunicada no Relatório ${emitida.numero} (${competenciaPorExtenso(emitida.referencia)}) e a pendência continua sem regularização.`, encontrado: v.detalhe, verificar: v.estado === "apresentada_nao_aprovada" ? "Há entrega registrada, ainda não aprovada: confirme se a suspensão deve permanecer." : "Confirme que a pendência continua sem regularização.", avisos: [avisoInicial] },
        { ...dados, classificacao: "permanece_suspenso", motivo: v.estado === "apresentada_nao_aprovada" ? (modelo.pendenciaRef!.tipo === "comprovante_pagamento" ? "Comprovante apresentado e ainda não aprovado pela GERDAB" : "Documento apresentado e ainda não aprovado pela GERDAB") : modelo.motivo },
      ),
    );
  }
  return { fonte: "continuidade", lidos, sugestoes, ignorados: ign.lista() };
}

/* ── Geração das situações da competência (idempotente) ──────────────────────────────────────────────────────────── */

/** Lê todas as fontes para a competência selecionada, sem gravar nada. */
const lerTodasAsFontesCorrentes = (competencia: string): ResultadoFonteSuspensao[] => [lerSugestoesComprovantes(), lerSugestoesPendencias(competencia), lerSugestoesRequerimentos(competencia), lerSugestoesPlanilhas(), lerSugestoesContinuidade(competencia)];

export interface ResumoFonteBusca {
  fonte: FonteSugestaoSuspensao;
  lidos: number;
  /** Sugestões da competência selecionada. */
  sugeridas: number;
  novas: number;
  /** Já registradas (qualquer estado, inclusive descartadas ou emitidas) com a mesma origem: nada foi criado nem alterado. */
  jaExistentes: number;
  /** Já registradas em OUTRA competência (não duplicadas na selecionada). */
  emOutraCompetencia: number;
  /** Sugestões novas que são investigações. */
  investigacoes: number;
  /** Pendência cuja suspensão já foi emitida antes: não é nova suspensão — a continuidade é avaliada por S6, sem duplicar. */
  tratadasPorContinuidade: number;
  /** Existe registro aberto da mesma pendência, mas a informação de origem mudou: não foi sobrescrito (reconferir). */
  origemAlterada: number;
  /** Descartadas antes, recriadas porque a origem mudou de forma relevante. */
  reapareceram: number;
  /** Identificadas na fonte para OUTRAS competências: NÃO foram incluídas. */
  outrasCompetencias: { competencia: string; quantidade: number }[];
  ignorados: { motivo: string; quantidade: number }[];
}
export interface ResultadoGeracaoSuspensao {
  competencia: string;
  novas: number;
  suspensoes: number;
  /** "Permanece suspenso" sugerido por continuidade (S6). */
  permanencias: number;
  exclusoes: number;
  investigacoes: number;
  /** Ids dos registros criados agora (para destaque na tabela). */
  novosIds: string[];
  jaExistentes: number;
  emOutraCompetencia: number;
  origemAlterada: number;
  /** Identificadas para outras competências e NÃO incluídas (o analista decide em qual competência gerar). */
  outrasCompetencias: { competencia: string; quantidade: number }[];
  porFonte: ResumoFonteBusca[];
}

const chaveEquivalente = (r: Pick<RegistroSuspensao, "pendenciaRef" | "requerimentoExclusao">) => (r.pendenciaRef ? `${r.pendenciaRef.tipo}:${r.pendenciaRef.documento ?? ""}:${r.pendenciaRef.competencia ?? ""}` : r.requerimentoExclusao ? `req:${r.requerimentoExclusao.referencia}` : "");

/** Registro manual (sem origem automática) que já cobre a mesma pendência/requerimento do mesmo titular e competência. */
function equivalenteManual(s: NovoRegistroSuspensao, existentes: RegistroSuspensao[]): boolean {
  const k = chaveEquivalente({ pendenciaRef: s.pendenciaRef, requerimentoExclusao: s.requerimentoExclusao });
  if (!k || !s.classificacao) return false;
  return existentes.some((r) => !r.sugestao && r.situacao !== "descartada" && identificadorTitular(r.titular) === identificadorTitular(s.titular) && r.competenciaReferencia === s.competenciaReferencia && r.classificacao === s.classificacao && chaveEquivalente(r) === k && r.afetado.tipo === s.afetado.tipo && (r.afetado.nomeDependente ?? "") === (s.afetado.nomeDependente ?? ""));
}

/** Competência de pagamento já CONFERIDA nos demais registros da mesma referência (a mais frequente); sem ela, nada é presumido. */
function pagamentoConferido(ref: string, existentes: RegistroSuspensao[]): string | undefined {
  const freq = new Map<string, number>();
  existentes.filter((r) => r.competenciaReferencia === ref && r.situacao !== "descartada" && !r.competenciaEstimada).forEach((r) => freq.set(r.competenciaPagamento, (freq.get(r.competenciaPagamento) ?? 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * "Gerar situações da competência": lê as fontes e INCLUI diretamente, na competência selecionada, os registros identificados — sempre como
 * "identificada" (Conferir) e origem automática. Idempotente; nunca altera nem recria registros existentes (editados, confirmados,
 * descartados ou emitidos), salvo reaparecimento de uma sugestão DESCARTADA cuja informação de origem mudou. O que a fonte identifica
 * para OUTRAS competências não é inserido: volta em `outrasCompetencias` para o analista decidir.
 */
export const lerTodasAsFontesSuspensao = (competencia: string, fontes: FontesSuspensao = fontesReais()): ResultadoFonteSuspensao[] => {
  const anteriores = fontesCorrentes;
  fontesCorrentes = fontes;
  try {
    return lerTodasAsFontesCorrentes(competencia);
  } finally {
    fontesCorrentes = anteriores;
  }
};

/** Marca a sugestão como do ambiente demonstrativo: chave e id próprios (nunca colidem com os reais) e registro "Demonstrativo". */
function comoDemonstrativa(s: NovoRegistroSuspensao): NovoRegistroSuspensao {
  const sug = s.sugestao!;
  const chave = `demo|${sug.chave}`;
  return { ...s, id: `sug-${hash(`${chave}|${sug.fingerprint}`)}`, demonstrativo: true, sugestao: { ...sug, chave, justificativa: `${sug.justificativa} (dados fictícios do ambiente demonstrativo)` }, conferencia: [...(s.conferencia ?? []), "Registro gerado a partir das FONTES DEMONSTRATIVAS (dados fictícios): não veio de nenhum módulo real."] };
}

export function gerarSituacoesDaCompetencia(competencia: string, responsavel = RESPONSAVEL_BUSCA, opcoes: { demonstracao?: boolean; competenciaPagamento?: string } = {}): ResultadoGeracaoSuspensao {
  const fontes = opcoes.demonstracao ? fontesDemonstracao() : fontesReais();
  const anteriores = fontesCorrentes;
  fontesCorrentes = fontes;
  try {
    return gerarComFontes(competencia, responsavel, fontes, opcoes.competenciaPagamento);
  } finally {
    fontesCorrentes = anteriores;
  }
}

function gerarComFontes(competencia: string, responsavel: string, fontes: FontesSuspensao, pagamentoDoRelatorio?: string): ResultadoGeracaoSuspensao {
  const porFonte: ResumoFonteBusca[] = [];
  const total: ResultadoGeracaoSuspensao = { competencia, novas: 0, suspensoes: 0, permanencias: 0, exclusoes: 0, investigacoes: 0, novosIds: [], jaExistentes: 0, emOutraCompetencia: 0, origemAlterada: 0, outrasCompetencias: [], porFonte };
  const outras = new Map<string, number>();
  for (const leitura of lerTodasAsFontesCorrentes(competencia)) {
    const resumo: ResumoFonteBusca = { fonte: leitura.fonte, lidos: leitura.lidos, sugeridas: 0, novas: 0, jaExistentes: 0, emOutraCompetencia: 0, investigacoes: 0, tratadasPorContinuidade: 0, origemAlterada: 0, reapareceram: 0, outrasCompetencias: [], ignorados: leitura.ignorados };
    const foraDaFonte = new Map<string, number>();
    for (const s0 of leitura.sugestoes) {
      const s = fontes.demonstracao ? comoDemonstrativa(s0) : s0;
      if (s.competenciaReferencia !== competencia) {
        foraDaFonte.set(s.competenciaReferencia, (foraDaFonte.get(s.competenciaReferencia) ?? 0) + 1);
        outras.set(s.competenciaReferencia, (outras.get(s.competenciaReferencia) ?? 0) + 1);
        continue;
      }
      const existentes = listarSuspensoes();
      // Pendência documental cuja suspensão já foi EMITIDA em competência anterior: não é uma nova suspensão (evita "Suspender" duplicando
      // o "Permanece suspenso"/regularização que a continuidade avalia).
      if (s.sugestao!.fonte === "pendencias_documentais" && s.pendenciaRef) {
        const hist = fontes.historico();
        const k = identidadePendencia(s);
        if (hist.registros.some((r) => r.pendenciaRef && hist.emitidos.has(r.id) && r.competenciaReferencia < competencia && identidadePendencia(r) === k)) {
          resumo.tratadasPorContinuidade++;
          continue;
        }
      }
      resumo.sugeridas++;
      const mesmaChave = existentes.filter((r) => r.sugestao?.chave === s.sugestao!.chave);
      if (mesmaChave.some((r) => r.sugestao!.fingerprint === s.sugestao!.fingerprint) || equivalenteManual(s, existentes)) {
        resumo.jaExistentes++;
        if (mesmaChave.length > 0 && !mesmaChave.some((r) => r.competenciaReferencia === competencia)) resumo.emOutraCompetencia++;
        continue;
      }
      if (mesmaChave.some((r) => r.situacao !== "descartada")) {
        resumo.origemAlterada++;
        continue;
      }
      // Pagamento: o do relatório (selecionado pelo analista antes de gerar); sem ele, reaproveita o já conferido; senão fica estimado (a conferir).
      const pag = pagamentoDoRelatorio ?? pagamentoConferido(s.competenciaReferencia, existentes);
      const entrada: NovoRegistroSuspensao = pag ? { ...s, competenciaPagamento: pag, competenciaEstimada: false } : s;
      const { registro, criado } = registrarSuspensao(entrada, responsavel);
      if (!criado) {
        resumo.jaExistentes++;
        continue;
      }
      resumo.novas++;
      total.novosIds.push(registro.id);
      const tipo = s.sugestao!.tipo;
      if (tipo === "investigacao") resumo.investigacoes++;
      if (tipo === "investigacao") total.investigacoes++;
      else if (tipo === "exclusao") total.exclusoes++;
      else if (s.classificacao === "permanece_suspenso") total.permanencias++;
      else total.suspensoes++;
      if (mesmaChave.length > 0) resumo.reapareceram++;
    }
    resumo.outrasCompetencias = [...foraDaFonte.entries()].sort().map(([c, quantidade]) => ({ competencia: c, quantidade }));
    porFonte.push(resumo);
    total.novas += resumo.novas;
    total.jaExistentes += resumo.jaExistentes;
    total.emOutraCompetencia += resumo.emOutraCompetencia;
    total.origemAlterada += resumo.origemAlterada;
  }
  total.outrasCompetencias = [...outras.entries()].sort().map(([c, quantidade]) => ({ competencia: c, quantidade }));
  return total;
}

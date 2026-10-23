/**
 * Relatório de Alterações — leitura dos módulos existentes para IDENTIFICAR SUGESTÕES (Etapa 3).
 *
 * REGRAS (todas verificadas no código; ver `docs`):
 *  - Adaptadores EXCLUSIVAMENTE DE LEITURA: nenhum dado de Comprovantes, Requerimentos, Planilhas, Ressarcimentos, Cadastro ou
 *    Fechamento é alterado. A única escrita possível é no armazenamento do próprio relatório (`sincronizarSugestoes`).
 *  - Uma sugestão é só "identificada": nada entra no relatório definitivo sem confirmação da GERDAB. A existência de um
 *    requerimento, comprovante ou diferença de valor NUNCA é tratada como movimentação aprovada por si só.
 *  - NENHUMA lógica própria de divergência de valor: reaproveita as decisões já persistidas pelo fluxo de Comprovantes
 *    (`AcaoComprovante.acao === "valor_cadastral_atualizado"`, `justificativasDivergencia`, `operadoraDivergenteCadastro`).
 *  - Planilhas de associações NÃO passam pela análise de divergência do fluxo de comprovantes: só se apontam INDÍCIOS entre duas
 *    planilhas já confirmadas pela GERDAB, sempre como "a conferir" (natureza não inventada).
 *  - Sem evidência persistida suficiente, a fonte simplesmente não gera sugestão (e o motivo é contabilizado em `ignorados`).
 *  - Duplicidade: cada sugestão tem `referenciaOrigem` estável (módulo + registro + marcador). `registrarMovimentacao` nunca cria
 *    duas vezes a mesma origem e nunca recria uma sugestão descartada.
 *  - Valores: nada é calculado nem preenchido em `valorInformadoNurfi`; só se repassam valores já existentes na origem.
 *
 * NÃO consultados (por decisão): `movimentacoes-pro-saude.ts` e os números do Dashboard (demonstrativos, não são eventos
 * administrativos); `servidor-cadastro.ts` (só registra alteração de telefone — não é movimentação do auxílio).
 */
import { formatCompetencia, type BeneficiarioPagamento, type StatusComprovante } from "./mock-data";
import { getAssociacaoModelo, type RegistroAssociacaoConsolidado } from "./planilhas-associacao";
import { normalizarCpf } from "./base-institucional";
import { tipoRequerimentoAssociacaoLabels } from "./requerimentos-associacao";
import { fontesDemonstracaoAlteracoes, fontesReais, type ComprovanteLite, type FontesAlteracao, type RessarcimentoLite } from "./fontes-alteracoes";
import { registrarMovimentacao, ROTULO_PENDENCIA_VALOR, type Movimento, type NovoRegistroAlteracao, type OrigemPagamento, type PendenciaValorSugerido, type ValorSugerido, type VinculoFuncional } from "./relatorio-alteracoes";

export type FonteSugestao = "movimentacoes" | "comprovantes" | "requerimentos" | "planilhas_associacao" | "ressarcimentos" | "fechamento";

export const ROTULO_FONTE: Record<FonteSugestao, string> = {
  movimentacoes: "Movimentações registradas (natureza e motivo informados)",
  comprovantes: "Comprovantes individuais",
  requerimentos: "Requerimentos de Associação",
  planilhas_associacao: "Planilhas das associações",
  ressarcimentos: "Ressarcimentos de meses anteriores",
  fechamento: "Histórico de Fechamento",
};

export type SugestaoAlteracao = Omit<NovoRegistroAlteracao, "origemInformacao" | "demonstrativo"> & { fonte: FonteSugestao };

export interface ResultadoFonte {
  fonte: FonteSugestao;
  /** Registros lidos da fonte (antes de qualquer filtro). */
  lidos: number;
  sugestoes: SugestaoAlteracao[];
  /** Registros lidos que NÃO geraram sugestão, com o motivo (evidência insuficiente, ainda pendente, etc.). */
  ignorados: { motivo: string; quantidade: number }[];
}

/* ── Utilitários de identificação (somente leitura) ─────────────────────────────────────────────────────────────── */

class Contador {
  private m = new Map<string, number>();
  somar(motivo: string) {
    this.m.set(motivo, (this.m.get(motivo) ?? 0) + 1);
  }
  lista() {
    return [...this.m.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade }));
  }
}

const cpfPorMatricula = (f: FontesAlteracao, matricula?: string) => (matricula ? f.servidorPorMatricula(matricula)?.cpf : undefined);

/** Vínculo funcional pela regra institucional já existente; sem situação confiável → `undefined` + pendência (nunca escolhe em silêncio). */
function resolverVinculo(f: FontesAlteracao, cpf?: string, matricula?: string): { vinculo?: VinculoFuncional; pendencia?: string } {
  const alvo = cpf ?? cpfPorMatricula(f, matricula);
  if (!alvo) return { pendencia: "Vínculo funcional (Ativo/Inativo) a conferir: titular sem CPF/matrícula correspondente na base." };
  const c = f.vinculoPorCpf(alvo);
  return c.grupo && !c.requerConferencia ? { vinculo: c.grupo } : { pendencia: `Vínculo funcional (Ativo/Inativo) a conferir: ${c.motivo ?? "sem situação funcional confiável."}` };
}

/** Origem de pagamento pela associação (`Assefaz`/`Assetran`); qualquer outro nome fica a conferir. */
function origemPorAssociacao(associacao?: string): { origem?: OrigemPagamento; pendencia?: string } {
  const a = associacao ? getAssociacaoModelo(associacao) : undefined;
  if (a === "Assefaz") return { origem: "ASSEFAZ" };
  if (a === "Assetran") return { origem: "ASSETRAN" };
  return { pendencia: "Origem (ASSEFAZ/ASSETRAN) a conferir: associação não reconhecida." };
}

const dataCurta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
};
const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mesDe = (iso: string) => iso.slice(0, 7);
const mesAnterior = (c: string) => {
  const [a, m] = c.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};

/* ── 1. Comprovantes individuais ────────────────────────────────────────────────────────────────────────────────── */

const STATUS_APROVADOS: StatusComprovante[] = ["aprovado", "aprovado_com_ressalva", "retroativo_aprovado"];

function titularDoGrupo(b: BeneficiarioPagamento, c: ComprovanteLite, todos: BeneficiarioPagamento[]): { titular?: BeneficiarioPagamento; ehDependente: boolean } {
  if (b.parentesco === "Titular") return { titular: b, ehDependente: false };
  const titulares = todos.filter((x) => x.parentesco === "Titular");
  const doEnvio = titulares.find((t) => c.beneficiarioIds.includes(t.id));
  return { titular: doEnvio ?? (titulares.length === 1 ? titulares[0] : undefined), ehDependente: true };
}

/**
 * Fonte de maior confiança. Só gera "alterar valor" confirmável quando há DECISÃO PERSISTIDA da GERDAB —
 * a ação `valor_cadastral_atualizado` (com valor anterior/novo) — e o beneficiário permanece aprovado naquele comprovante.
 * Comprovante aprovado SEM essa ação nunca é prova de alteração; se houve divergência justificada pelo servidor, vira "a conferir".
 */
export function lerSugestoesComprovantes(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const todosBen = f.beneficiarios();
  const ignorados = new Contador();
  const sugestoes: SugestaoAlteracao[] = [];
  const comprovantes = f.comprovantes();

  for (const c of comprovantes) {
    const acoes = c.aprovacoes;
    const consideradas = new Set<string>();

    const base = (b: BeneficiarioPagamento) => {
      const { titular, ehDependente } = titularDoGrupo(b, c, todosBen);
      const conferencia: string[] = [];
      if (!titular) conferencia.push("Titular do grupo não identificado a partir do comprovante.");
      if (ehDependente) conferencia.push(`A informação refere-se ao beneficiário dependente ${b.nome}; confira o titular exibido.`);
      const v = resolverVinculo(f, titular?.cpf, titular?.matricula);
      if (v.pendencia) conferencia.push(v.pendencia);
      return {
        titular: { nome: (titular ?? b).nome, matricula: titular?.matricula, cpf: titular?.cpf },
        vinculo: v.vinculo,
        origemPagamento: "Boletos" as OrigemPagamento, // comprovação individual (boleto); associações usam planilha
        competenciaReferencia: c.competencia,
        conferencia,
      };
    };

    // (a) Decisão de atualização do valor cadastral — a evidência que sustenta "Alterar valor".
    for (const a of acoes) {
      if (a.acao !== "valor_cadastral_atualizado" || !a.beneficiarioId) continue;
      const b = todosBen.find((x) => x.id === a.beneficiarioId);
      if (!b) {
        ignorados.somar("Atualização de valor cadastral de beneficiário que não consta mais no cadastro");
        continue;
      }
      const status = c.statusDoBeneficiario(b.id);
      if (!STATUS_APROVADOS.includes(status)) {
        ignorados.somar("Atualização de valor registrada, mas o comprovante não está aprovado para o beneficiário");
        continue;
      }
      consideradas.add(b.id);
      const info = base(b);
      sugestoes.push({
        fonte: "comprovantes",
        ...info,
        movimentos: [{ tipo: "alterar_valor", ...(a.motivoAlteracao ? { motivo: a.motivoAlteracao } : {}) }],
        valores: a.valorNovo !== undefined ? { cadastrado: a.valorNovo } : {},
        referenciaOrigem: {
          modulo: "comprovantes",
          registroId: `${c.id}:${b.id}`,
          marcador: `valor_cadastral_atualizado:${a.data}`,
          rotulo: `Comprovante de ${formatCompetencia(c.competencia)}`,
          decisao: {
            descricao: `Valor cadastral atualizado${a.valorAnterior !== undefined && a.valorNovo !== undefined ? ` de ${real(a.valorAnterior)} para ${real(a.valorNovo)}` : ""} e comprovante aprovado${a.comentario ? ` — justificativa do servidor: ${a.comentario}` : ""}.`,
            responsavel: a.aprovadoPor,
            dataHora: a.data,
          },
        },
        conferencia: [...info.conferencia, ...(a.motivoAlteracao ? [] : ["Motivo da alteração (reajuste, mudança de plano etc.) não é registrado pela fonte: informe na conferência."])],
      });
    }

    // (b) Divergência de valor justificada e comprovante aprovado, sem atualização do cadastro: natureza não determinada.
    for (const j of c.justificativasDivergencia) {
      if (consideradas.has(j.beneficiarioId)) continue;
      const b = todosBen.find((x) => x.id === j.beneficiarioId);
      if (!b) continue;
      const status = c.statusDoBeneficiario(b.id);
      if (!STATUS_APROVADOS.includes(status)) {
        ignorados.somar("Divergência de valor ainda em análise, recusada ou devolvida para correção");
        continue;
      }
      const info = base(b);
      sugestoes.push({
        fonte: "comprovantes",
        ...info,
        movimentos: [{ tipo: "a_conferir" }],
        valores: { cadastrado: b.valorCadastrado },
        referenciaOrigem: {
          modulo: "comprovantes",
          registroId: `${c.id}:${b.id}`,
          marcador: "divergencia_aprovada_sem_atualizacao",
          rotulo: `Comprovante de ${formatCompetencia(c.competencia)}`,
          decisao: { descricao: `Comprovante aprovado (${status}) com divergência de valor justificada pelo servidor: ${j.texto}` },
        },
        conferencia: [...info.conferencia, "Divergência de valor com comprovante aprovado, sem registro de atualização do valor cadastral: verifique se há alteração a comunicar ao NURFI."],
      });
    }

    // (c) Operadora do documento diferente do cadastro, com comprovante aprovado: possível mudança de plano (a conferir).
    if (c.operadoraDivergenteCadastro && !STATUS_APROVADOS.includes(c.status)) ignorados.somar("Operadora divergente em comprovante ainda sem aprovação");
    if (c.operadoraDivergenteCadastro && STATUS_APROVADOS.includes(c.status)) {
      const primeiro = todosBen.find((x) => c.beneficiarioIds.includes(x.id));
      if (primeiro) {
        const info = base(primeiro);
        sugestoes.push({
          fonte: "comprovantes",
          ...info,
          movimentos: [{ tipo: "a_conferir" }],
          valores: {},
          referenciaOrigem: { modulo: "comprovantes", registroId: c.id, marcador: "operadora_divergente", rotulo: `Comprovante de ${formatCompetencia(c.competencia)}`, decisao: { descricao: "Comprovante aprovado com operadora diferente da cadastrada (sinalizado pelo servidor)." } },
          conferencia: [...info.conferencia, "Operadora do documento difere do cadastro: pode indicar mudança de plano, mas isso não foi decidido no comprovante."],
        });
      }
    }
  }

  return { fonte: "comprovantes", lidos: comprovantes.length, sugestoes, ignorados: ignorados.lista() };
}

/* ── 2. Requerimentos de Associação ─────────────────────────────────────────────────────────────────────────────── */

/** Só requerimentos com decisão "aprovado" PERSISTIDA na versão vigente. Pendentes, em complementação ou negados nunca viram sugestão. */
export function lerSugestoesRequerimentos(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const todos = f.requerimentos();
  const ignorados = new Contador();
  const sugestoes: SugestaoAlteracao[] = [];
  for (const r of todos) {
    const status = r.status;
    if (status !== "aprovado") {
      ignorados.somar(status === "pendente_validacao" ? "Requerimento pendente de validação (não aprovado)" : status === "aguardando_complementacao" ? "Requerimento aguardando complementação (não aprovado)" : "Requerimento negado");
      continue;
    }
    const versao = { versao: r.versao };
    const decidido = { decididoEm: r.decididoEm!, decididoPor: r.decididoPor };
    const { origem, pendencia: pOrigem } = origemPorAssociacao(r.associacao);
    const servidor = r.beneficiarioId ? f.servidorPorMatricula(r.beneficiarioId) : undefined;
    const titularConhecido = r.tipo === "inclusao_no_plano" || r.tipo === "mudanca_plano";
    const v = titularConhecido ? resolverVinculo(f, servidor?.cpf, servidor?.matricula) : { pendencia: "Vínculo funcional (Ativo/Inativo) a conferir: titular não identificado no requerimento." };
    const movimentos: Movimento[] =
      r.tipo === "inclusao_no_plano"
        ? [{ tipo: "incluir", ...(r.motivo ? { motivo: r.motivo } : {}) }]
        : r.tipo === "inclusao_dependente"
          ? [{ tipo: "dependente_incluido" }]
          : r.tipo === "mudanca_plano"
            ? [{ tipo: "a_conferir", motivo: "mudou_de_plano" }]
            : r.tipo === "exclusao" && r.alvo === "dependente"
              ? [{ tipo: "dependente_excluido" }]
              : [{ tipo: "a_conferir" }];
    const conferencia = [
      ...(pOrigem ? [pOrigem] : []),
      ...(v.pendencia ? [v.pendencia] : []),
      `Competência de referência estimada pelo mês da decisão (${formatCompetencia(mesDe(decidido.decididoEm))}): confira o mês de início do benefício.`,
      ...(titularConhecido ? [] : [`O requerimento identifica o beneficiário ${r.beneficiarioNome}, não necessariamente o titular: informe o titular na conferência.`]),
      ...(r.tipo === "inclusao_no_plano" && !r.motivo ? ["Motivo da inclusão (ex.: nova proposta) não é registrado no requerimento: informe na conferência."] : []),
      ...(r.tipo === "mudanca_plano" ? ["O requerimento não registra se houve alteração de valor."] : []),
      ...(r.tipo === "exclusao" && r.alvo !== "dependente" ? ["Requerimento de exclusão: confirme se é de dependente (Alterações) ou do plano/titular (Suspensões/Exclusões)."] : []),
    ];
    sugestoes.push({
      fonte: "requerimentos",
      titular: { nome: r.beneficiarioNome, matricula: servidor?.matricula, cpf: servidor?.cpf },
      vinculo: v.vinculo,
      origemPagamento: origem,
      competenciaReferencia: mesDe(decidido.decididoEm),
      competenciaEstimada: true,
      movimentos,
      valores: {},
      referenciaOrigem: {
        modulo: "requerimentos",
        registroId: r.id,
        marcador: `v${versao.versao}:aprovado`,
        rotulo: `${tipoRequerimentoAssociacaoLabels[r.tipo]} — ${r.associacao}`,
        decisao: { descricao: `Requerimento aprovado pela GERDAB em ${dataCurta(decidido.decididoEm)}.`, responsavel: decidido.decididoPor, dataHora: decidido.decididoEm },
      },
      conferencia,
    });
  }
  return { fonte: "requerimentos", lidos: todos.length, sugestoes, ignorados: ignorados.lista() };
}

/* ── 3. Planilhas das associações ───────────────────────────────────────────────────────────────────────────────── */

const chaveGrupo = (g: RegistroAssociacaoConsolidado) => g.cpfTitular;
const somenteDigitos = (c: string) => normalizarCpf(c);

/**
 * Planilhas NÃO passam por análise de divergência pela IA. Compara só duas planilhas consecutivas (mês N e N-1) da MESMA associação,
 * ambas com análise confirmada pela GERDAB, e aponta INDÍCIOS (valor do grupo, operadora do titular, beneficiários que entraram/saíram,
 * titular novo). Toda sugestão é "a conferir": a natureza não é inventada e nenhuma diferença é tratada como alteração aprovada.
 * Sem planilha confirmada do mês anterior, não há base de comparação e nada é sugerido.
 */
export function lerSugestoesPlanilhas(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const planilhas = f.planilhas();
  const ignorados = new Contador();
  const sugestoes: SugestaoAlteracao[] = [];
  let lidos = 0;

  for (const p of planilhas) {
    lidos++;
    if (!p.aprovada) {
      ignorados.somar("Planilha sem análise financeira confirmada pela GERDAB");
      continue;
    }
    const anterior = planilhas.find((x) => x.associacao === p.associacao && x.competencia === mesAnterior(p.competencia));
    if (!anterior || !anterior.aprovada) {
      ignorados.somar("Sem planilha confirmada do mês anterior para comparação (evidência insuficiente)");
      continue;
    }
    const { origem, pendencia: pOrigem } = origemPorAssociacao(p.associacao);
    const atuais = f.registrosPlanilhaAprovados(p.competencia).filter((g) => g.associacao === p.associacao);
    const antes = new Map(f.registrosPlanilhaAprovados(anterior.competencia).filter((g) => g.associacao === p.associacao).map((g) => [chaveGrupo(g), g]));

    for (const g of atuais) {
      const ant = antes.get(chaveGrupo(g));
      const indicios: string[] = [];
      const comparacao: { campo: string; anterior?: string; atual?: string }[] = [{ campo: "Planilhas comparadas (competência)", anterior: formatCompetencia(anterior.competencia), atual: formatCompetencia(p.competencia) }];
      if (!ant) {
        indicios.push(`titular presente na planilha de ${formatCompetencia(p.competencia)} e ausente na de ${formatCompetencia(anterior.competencia)}`);
        comparacao.push({ campo: "Presença na planilha", anterior: `Ausente em ${formatCompetencia(anterior.competencia)}`, atual: `Presente em ${formatCompetencia(p.competencia)} (${real(g.valor)})` });
      } else {
        if (Math.abs(g.valor - ant.valor) > 0.004) {
          indicios.push(`valor do grupo na planilha passou de ${real(ant.valor)} para ${real(g.valor)}`);
          comparacao.push({ campo: "Valor do grupo na planilha", anterior: real(ant.valor), atual: real(g.valor) });
        }
        const opTitular = (x: RegistroAssociacaoConsolidado) => x.composicao.find((c) => somenteDigitos(c.cpf) === somenteDigitos(x.cpfTitular))?.operadora;
        if (opTitular(g) && opTitular(ant) && opTitular(g) !== opTitular(ant)) {
          indicios.push(`operadora do titular passou de ${opTitular(ant)} para ${opTitular(g)}`);
          comparacao.push({ campo: "Operadora do titular", anterior: opTitular(ant), atual: opTitular(g) });
        }
        const cpfs = (x: RegistroAssociacaoConsolidado) => new Set(x.composicao.map((c) => somenteDigitos(c.cpf)));
        const novos = g.composicao.filter((c) => !cpfs(ant).has(somenteDigitos(c.cpf))).map((c) => c.beneficiario);
        const saiu = ant.composicao.filter((c) => !cpfs(g).has(somenteDigitos(c.cpf))).map((c) => c.beneficiario);
        if (novos.length) indicios.push(`beneficiário(s) que passaram a constar na planilha: ${novos.join(", ")}`);
        if (saiu.length) indicios.push(`beneficiário(s) que deixaram de constar na planilha: ${saiu.join(", ")}`);
        if (novos.length) comparacao.push({ campo: "Beneficiários incluídos na planilha", anterior: "—", atual: novos.join(", ") });
        if (saiu.length) comparacao.push({ campo: "Beneficiários ausentes na planilha", anterior: saiu.join(", "), atual: "—" });
      }
      if (indicios.length === 0) {
        ignorados.somar("Titular sem diferença entre as duas planilhas");
        continue;
      }
      const v = resolverVinculo(f, g.cpfTitular);
      const matricula = f.matriculaPorCpf(g.cpfTitular);
      sugestoes.push({
        fonte: "planilhas_associacao",
        titular: { nome: g.nomeTitular, matricula, cpf: g.cpfTitular },
        vinculo: v.vinculo,
        origemPagamento: origem,
        competenciaReferencia: p.competencia,
        movimentos: [{ tipo: "a_conferir" }],
        valores: { plano: g.valor },
        referenciaOrigem: {
          modulo: "planilhas_associacao",
          registroId: `${p.associacao}:${g.cpfTitular}:${p.competencia}`,
          marcador: "variacao_entre_planilhas",
          rotulo: `Planilha ${p.associacao} — ${formatCompetencia(p.competencia)}`,
          decisao: { descricao: `Indícios entre planilhas confirmadas: ${indicios.join("; ")}.` },
          comparacao,
        },
        conferencia: [
          "Planilha de associação não passa pela análise de divergência de valores: a diferença é apenas um indício, não uma alteração aprovada.",
          ...(pOrigem ? [pOrigem] : []),
          ...(v.pendencia ? [v.pendencia] : []),
          ...(matricula ? [] : ["Matrícula não encontrada na base institucional a partir do CPF."]),
        ],
      });
    }
  }
  return { fonte: "planilhas_associacao", lidos, sugestoes, ignorados: ignorados.lista() };
}

/* ── 4. Ressarcimentos de meses anteriores ──────────────────────────────────────────────────────────────────────── */

/**
 * Só competências com decisão "aprovado" persistida na origem individual e cujo MOTIVO é movimentação de dependente (inclusão/reinclusão).
 * Pedidos pendentes/negados, outros motivos e a origem Associação (sem motivo no envio) não geram sugestão — e um ressarcimento
 * nunca é lido como prova de regularização de suspensão.
 */
export function lerSugestoesRessarcimentos(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const solicitacoes = f.solicitacoesRetroativas();
  const ignorados = new Contador();
  const sugestoes: SugestaoAlteracao[] = [];
  for (const s of solicitacoes) {
    for (const c of s.competencias) {
      if (s.origem !== "individual") {
        ignorados.somar("Origem Associação: o envio não informa a natureza da movimentação");
        continue;
      }
      if (!c.aprovada) {
        ignorados.somar("Competência sem aprovação persistida (pendente ou negada)");
        continue;
      }
      const tipo = s.motivo === "inclusao_dependente" ? "dependente_incluido" : s.motivo === "reinclusao_dependente" ? "dependente_reincluido" : undefined;
      if (!tipo) {
        ignorados.somar("Motivo do ressarcimento não indica movimentação de dependente (não é tratado como alteração)");
        continue;
      }
      const ultima = c.ultima;
      const v = resolverVinculo(f, s.cpfTitular);
      const matricula = f.matriculaPorCpf(s.cpfTitular);
      sugestoes.push({
        fonte: "ressarcimentos",
        titular: { nome: s.nomeTitular, matricula, cpf: s.cpfTitular },
        vinculo: v.vinculo,
        origemPagamento: "Boletos",
        competenciaReferencia: c.competenciaReferencia,
        movimentos: [{ tipo }],
        valores: {},
        referenciaOrigem: {
          modulo: "ressarcimentos",
          registroId: `${s.id}:${c.competenciaReferencia}`,
          marcador: `aprovado:${ultima?.dataHora ?? ""}`,
          rotulo: `Ressarcimento de meses anteriores — ${formatCompetencia(c.competenciaReferencia)}`,
          decisao: { descricao: "Competência aprovada pela GERDAB no ressarcimento de meses anteriores.", responsavel: ultima?.responsavel, dataHora: ultima?.dataHora },
        },
        conferencia: [
          "Ressarcimento aprovado indica a movimentação de dependente na competência de referência; não prova alteração de valor nem regularização de suspensão.",
          ...(v.pendencia ? [v.pendencia] : []),
          ...(matricula ? [] : ["Matrícula não encontrada na base institucional a partir do CPF."]),
        ],
      });
    }
  }
  return { fonte: "ressarcimentos", lidos: solicitacoes.length, sugestoes, ignorados: ignorados.lista() };
}

/* ── 5. Histórico de Fechamento ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * Relatórios (snapshots) do Fechamento já gerados: titular inadimplente numa competência e adimplente na seguinte aparece como
 * "a conferir" (possível regularização/reinclusão). O Fechamento não registra a decisão de reinclusão — a GERDAB classifica.
 */
export function lerSugestoesFechamento(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const linhasFechamento = f.linhasFechamento();
  const ignorados = new Contador();
  const sugestoes: SugestaoAlteracao[] = [];
  const porTitular = new Map<string, Map<string, { classificacao: "adimplente" | "inadimplente"; nome: string; matricula?: string; origem: "individual" | "associacao"; operadoraOuAssociacao: string }>>();
  for (const l of linhasFechamento) {
    const chave = l.matricula ?? l.beneficiarioId;
    const m = porTitular.get(chave) ?? new Map();
    m.set(l.competencia, { classificacao: l.classificacao, nome: l.nome, matricula: l.matricula, origem: l.origem, operadoraOuAssociacao: l.operadoraOuAssociacao });
    porTitular.set(chave, m);
  }
  for (const [chave, porComp] of porTitular) {
    for (const [comp, atual] of porComp) {
      const prev = porComp.get(mesAnterior(comp));
      if (!prev || prev.classificacao !== "inadimplente" || atual.classificacao !== "adimplente") continue;
      const v = resolverVinculo(f, undefined, atual.matricula);
      const assoc = atual.origem === "associacao" ? origemPorAssociacao(atual.operadoraOuAssociacao.split("/").pop()?.trim()) : { origem: "Boletos" as OrigemPagamento, pendencia: undefined };
      sugestoes.push({
        fonte: "fechamento",
        titular: { nome: atual.nome, matricula: atual.matricula },
        vinculo: v.vinculo,
        origemPagamento: assoc.origem,
        competenciaReferencia: comp,
        movimentos: [{ tipo: "a_conferir" }],
        valores: {},
        referenciaOrigem: { modulo: "fechamento", registroId: `${chave}:${comp}`, marcador: "inadimplente_para_adimplente", rotulo: `Fechamento — ${formatCompetencia(mesAnterior(comp))} → ${formatCompetencia(comp)}`, decisao: { descricao: `Inadimplente em ${formatCompetencia(mesAnterior(comp))} e adimplente em ${formatCompetencia(comp)} nos relatórios de Fechamento gerados.` } },
        conferencia: ["O Fechamento não registra decisão de reinclusão: verifique se houve regularização/reinclusão a comunicar ao NURFI.", ...(v.pendencia ? [v.pendencia] : []), ...(assoc.pendencia ? [assoc.pendencia] : [])],
      });
    }
  }
  if (linhasFechamento.length === 0) ignorados.somar("Nenhum relatório de Fechamento gerado ainda (sem histórico para comparar)");
  return { fonte: "fechamento", lidos: linhasFechamento.length, sugestoes, ignorados: ignorados.lista() };
}

/* ── 6. Movimentações registradas (natureza e motivo informados) ────────────────────────────────────────────────── */

/** Fonte que traz a NATUREZA e o MOTIVO já registrados na origem (ex.: reinclusão por comprovante). Não existe fonte real ainda: só a demonstrativa. */
export function lerSugestoesInformadas(f: FontesAlteracao = fontesReais()): ResultadoFonte {
  const itens = f.movimentosInformados();
  const sugestoes: SugestaoAlteracao[] = itens.map((it) => {
    const v = resolverVinculo(f, it.titular.cpf, it.titular.matricula);
    return {
      fonte: "movimentacoes",
      titular: it.titular,
      vinculo: v.vinculo,
      origemPagamento: it.origemPagamento,
      competenciaReferencia: it.competencia,
      movimentos: it.movimentos,
      valores: {},
      referenciaOrigem: { modulo: "movimentacoes", registroId: it.id, marcador: "informada", rotulo: "Movimentação registrada", decisao: { descricao: it.descricao, responsavel: it.responsavel, dataHora: it.data } },
      conferencia: ["Natureza e motivo vêm do registro da movimentação: confira antes de confirmar.", ...(v.pendencia ? [v.pendencia] : [])],
    };
  });
  return { fonte: "movimentacoes", lidos: itens.length, sugestoes, ignorados: [] };
}

/* ── Valor NURFI sugerido e impacto financeiro (reutiliza o resultado do Fechamento; nenhuma fórmula aqui) ───────── */

const FONTE_VALOR = "Fechamento de Pagamento";
const MOTIVO_DEPENDENTE = { dependente_incluido: "incluiu_dependente", dependente_excluido: "excluiu_dependente", dependente_reincluido: "reincluiu_dependente" } as const;

/**
 * Valor sugerido = `valorRessarcir` do Fechamento do TITULAR na competência de REFERÊNCIA: ressarcimento final do grupo familiar, já com teto e
 * 90% aplicados pelo módulo de origem. Só é usado quando: o titular corresponde, o Fechamento da competência o classifica como ADIMPLENTE
 * (validado), não é valor de retroativo (diferença) e não diverge do histórico gravado. Em qualquer outro caso NÃO há sugestão: o campo
 * permanece pendente, com o motivo (nunca valor cadastrado/mensalidade bruta e nenhuma estimativa).
 */
export function avaliarValorSugerido(f: FontesAlteracao, titular: { matricula?: string; cpf?: string }, competencia: string): { sugerido?: ValorSugerido; pendencia?: PendenciaValorSugerido; atual?: RessarcimentoLite } {
  if (!titular.matricula && !titular.cpf) return { pendencia: { tipo: "indisponivel", descricao: "Titular sem matrícula/CPF para localizar o resultado do Fechamento." } };
  const atual = f.ressarcimentoAtual(titular, competencia);
  if (!atual) return { pendencia: { tipo: "indisponivel", descricao: `O Fechamento não tem resultado de ressarcimento para o titular em ${formatCompetencia(competencia)}.` } };
  if (atual.retroativo) return { atual, pendencia: { tipo: "indisponivel", descricao: "O resultado do Fechamento vem do ressarcimento retroativo (diferença), que não representa o ressarcimento final do grupo." } };
  if (atual.classificacao !== "adimplente") return { atual, pendencia: { tipo: "nao_validado", descricao: `O Fechamento de ${formatCompetencia(competencia)} ainda não validou o titular (situação: ${atual.classificacao === "requer_analise" ? "requer análise" : "inadimplente"}).` } };
  const hist = f.ressarcimentoHistorico(titular, competencia);
  if (hist && Math.abs(hist.valorRessarcir - atual.valorRessarcir) > 0.004) return { atual, pendencia: { tipo: "divergente", descricao: `Fechamento atual ${real(atual.valorRessarcir)} × histórico gravado ${real(hist.valorRessarcir)} para ${formatCompetencia(competencia)}: confira qual vale.` } };
  return { atual, sugerido: { valor: atual.valorRessarcir, fonte: FONTE_VALOR, competencia, descricao: `Ressarcimento final do grupo familiar (grupo de ${real(atual.valorGrupo)}, teto familiar e 90% já aplicados) apurado no Fechamento de ${formatCompetencia(competencia)}.` } };
}

/**
 * Acrescenta à sugestão o valor sugerido (ou o motivo de estar pendente) e reflete o IMPACTO no ressarcimento final, comparando o resultado da
 * competência com o histórico da anterior: alteração de valor sem mudança do ressarcimento (ex.: teto) NÃO é classificada como "Alterar valor"
 * (a movimentação é mantida); movimentação de dependente ou mudança de plano que mudou o ressarcimento passa a "Alterar valor" com o motivo.
 */
export function enriquecerComFinanceiro(s: SugestaoAlteracao, f: FontesAlteracao): SugestaoAlteracao {
  const ref = { matricula: s.titular.matricula, cpf: s.titular.cpf };
  const av = avaliarValorSugerido(f, ref, s.competenciaReferencia);
  const anterior = f.ressarcimentoHistorico(ref, mesAnterior(s.competenciaReferencia))?.valorRessarcir;
  const mudou = av.sugerido && anterior !== undefined ? Math.abs(av.sugerido.valor - anterior) > 0.004 : undefined;
  const notas: string[] = [];
  let movimentos = s.movimentos;
  if (mudou !== undefined) {
    notas.push(`Ressarcimento final do grupo: ${real(anterior!)} (${formatCompetencia(mesAnterior(s.competenciaReferencia))}) → ${real(av.sugerido!.valor)} (${formatCompetencia(s.competenciaReferencia)}).`);
    movimentos = s.movimentos.map((m): Movimento => {
      // "Alterar valor" só existe quando o ressarcimento final mudou. Sem mudança, vale a NATUREZA efetiva comprovada (reajuste, mudança de plano);
      // sem natureza comprovada, a movimentação é mantida para a GERDAB classificar (nunca descartada).
      if (m.tipo === "alterar_valor" && !mudou) {
        notas.push("O ressarcimento final não se alterou: a movimentação foi mantida, mas não é classificada como “Alterar valor”.");
        return { ...m, tipo: m.motivo === "reajuste_plano" ? "reajuste_plano" : m.motivo === "mudou_de_plano" ? "mudanca_plano" : "a_conferir" };
      }
      if (!mudou && m.tipo === "a_conferir" && m.motivo === "mudou_de_plano") return { ...m, tipo: "mudanca_plano" };
      if (mudou && (m.tipo === "dependente_incluido" || m.tipo === "dependente_excluido" || m.tipo === "dependente_reincluido")) return { tipo: "alterar_valor", motivo: m.motivo ?? MOTIVO_DEPENDENTE[m.tipo] };
      if (mudou && m.tipo === "a_conferir" && m.motivo === "mudou_de_plano") return { ...m, tipo: "alterar_valor" };
      return m;
    });
  }
  return { ...s, movimentos, valorSugerido: av.sugerido, valorPendencia: av.pendencia, conferencia: [...(s.conferencia ?? []), ...notas, ...(av.pendencia ? [`${ROTULO_PENDENCIA_VALOR[av.pendencia.tipo]}: ${av.pendencia.descricao}`] : [])] };
}

/* ── Composição, diagnóstico e sincronização ────────────────────────────────────────────────────────────────────── */

/** Lê todas as fontes (sem gravar nada). */
export function lerTodasAsFontes(f: FontesAlteracao = fontesReais()): ResultadoFonte[] {
  return [lerSugestoesInformadas(f), lerSugestoesComprovantes(f), lerSugestoesRequerimentos(f), lerSugestoesPlanilhas(f), lerSugestoesRessarcimentos(f), lerSugestoesFechamento(f)].map((r) => ({ ...r, sugestoes: r.sugestoes.map((s) => enriquecerComFinanceiro(s, f)) }));
}

/** Fontes a consultar: as FICTÍCIAS isoladas no ambiente demonstrativo; as REAIS (somente leitura) fora dele. */
export const fontesDoAmbiente = (demonstracao: boolean): FontesAlteracao => (demonstracao ? fontesDemonstracaoAlteracoes() : fontesReais());

export interface ResultadoSincronizacao {
  novas: number;
  /** Já existiam (inclusive descartadas): nada foi criado nem alterado. */
  jaExistentes: number;
  porFonte: Record<FonteSugestao, { sugeridas: number; novas: number }>;
  /** Sugestões das fontes para OUTRAS competências de referência (não inseridas quando há parâmetros do relatório). */
  outrasCompetencias: number;
}

/**
 * Registra no ARMAZENAMENTO DO RELATÓRIO as sugestões ainda não registradas, sempre como "identificada" e origem "automática".
 * Idempotente (ver `registrarMovimentacao`): reler não duplica, não sobrescreve edições e não recria sugestões descartadas.
 * Não deve ser chamada automaticamente ao abrir telas — a Etapa 4 a aciona por ação explícita da GERDAB.
 */
export function sincronizarSugestoes(responsavel = "Sistema (leitura dos módulos)", parametros?: { competenciaReferencia: string; competenciaPagamento: string }, opcoes: { demonstracao?: boolean } = {}): ResultadoSincronizacao {
  const fontes = fontesDoAmbiente(!!opcoes.demonstracao);
  const porFonte = {} as ResultadoSincronizacao["porFonte"];
  let novas = 0;
  let jaExistentes = 0;
  let outrasCompetencias = 0;
  for (const r of lerTodasAsFontes(fontes)) {
    porFonte[r.fonte] = { sugeridas: r.sugestoes.length, novas: 0 };
    for (const { fonte: _fonte, ...entrada } of r.sugestoes) {
      void _fonte;
      // Com parâmetros do relatório: só a competência de referência selecionada é registrada, e ela recebe o pagamento selecionado
      // (nunca o "mês seguinte" presumido). O que a fonte aponta para outras referências NÃO é inserido (apenas contado).
      if (parametros && entrada.competenciaReferencia !== parametros.competenciaReferencia) {
        outrasCompetencias++;
        continue;
      }
      // Ambiente demonstrativo: registros nascem "Demonstrativo" e com origem própria (nunca colidem com a origem de um registro real).
      const demo = fontes.demonstracao ? { demonstrativo: true, referenciaOrigem: entrada.referenciaOrigem ? { ...entrada.referenciaOrigem, registroId: entrada.referenciaOrigem.registroId ? `demo:${entrada.referenciaOrigem.registroId}` : undefined } : undefined } : {};
      const { criado } = registrarMovimentacao({ ...entrada, ...(parametros ? { competenciaPagamento: parametros.competenciaPagamento } : {}), ...demo, origemInformacao: "automatica" }, responsavel);
      if (criado) {
        novas++;
        porFonte[r.fonte].novas++;
      } else jaExistentes++;
    }
  }
  return { novas, jaExistentes, porFonte, outrasCompetencias };
}

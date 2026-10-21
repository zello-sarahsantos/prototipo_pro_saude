/**
 * **DADOS DEMONSTRATIVOS do Dashboard GERDAB** — base administrativa fictícia, determinística e
 * coerente entre si (totais dos indicadores = tamanho das listas dos detalhamentos), usada para
 * avaliar a experiência de uso com volumes realistas. Tudo o que está aqui é inventado:
 * nomes, matrículas, responsáveis, valores e datas. **Nada aqui é regra de negócio** e nada
 * substitui as consultas reais — o Dashboard só usa este módulo quando a fonte "Demonstrativos" está
 * selecionada (ou nos blocos que ainda não têm nenhuma fonte real) e sempre o sinaliza.
 *
 * Substituição futura: cada função exportada devolve o mesmo formato das consultas reais de
 * `dashboard-gerdab.ts`; basta trocar a implementação por uma consulta real (respeitando as regras
 * de negócio) sem alterar nenhum componente.
 */
import { getDataReferencia } from "./dias-uteis";

/* ── Seleção da fonte de dados (preferência do avaliador, só protótipo) ──────────────────────── */

export type FonteDados = "real" | "demonstrativo";
/** Origem de um bloco de dados do Dashboard. */
export type OrigemDadoTipo = FonteDados;
const CHAVE_FONTE = "prosaude_dashboard_fonte";

export function getFonteDados(): FonteDados {
  if (typeof window === "undefined") return "demonstrativo";
  try {
    return localStorage.getItem(CHAVE_FONTE) === "real" ? "real" : "demonstrativo";
  } catch {
    return "demonstrativo";
  }
}

export function setFonteDados(f: FonteDados) {
  try {
    localStorage.setItem(CHAVE_FONTE, f);
  } catch {
    /* sem localStorage: a escolha vale só nesta sessão */
  }
}

/* ── Gerador determinístico ──────────────────────────────────────────────────────────────── */

function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
const pick = <T,>(arr: readonly T[], r: () => number): T => arr[Math.floor(r() * arr.length)];
const dois = (n: number) => String(n).padStart(2, "0");

/** Responsáveis FICTÍCIOS (demonstrativos) — nunca o usuário logado. */
export const RESPONSAVEIS_DEMO = [
  { nome: "Rebeca", cargo: "Analista" },
  { nome: "Luciana", cargo: "Analista" },
  { nome: "Erandir", cargo: "Gerente" },
] as const;
export const rotuloResponsavel = (r: (typeof RESPONSAVEIS_DEMO)[number]) => `${r.nome} (${r.cargo})`;

const NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Marina", "Nelson", "Olívia", "Paulo", "Queila", "Ricardo", "Sandra", "Tiago", "Úrsula", "Vinícius", "Wagner", "Xênia", "Yara", "Zeca", "Aline", "Beatriz", "Camila", "Diego"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Ferraz", "Rocha", "Almeida", "Costa", "Pereira", "Barbosa", "Ramos", "Duarte", "Freitas", "Mendes", "Nunes", "Prado", "Teles", "Moreira", "Carvalho", "Ribeiro", "Martins", "Araújo", "Gomes", "Cardoso", "Teixeira", "Correia", "Pinto", "Monteiro", "Nascimento"];
const SITUACOES = ["Servidor efetivo ativo", "Servidor efetivo inativo", "Servidor comissionado", "Titular de pensão vitalícia", "Titular de pensão temporária"] as const;
const PLANOS = ["Assefaz", "Assetran", "Bradesco Saúde", "SulAmérica", "Amil · boleto", "CASSI", "Unimed · boleto"] as const;
const ARQUIVOS = ["boleto.pdf", "fatura_tecnica.pdf", "recibo.pdf", "comprovante.pdf", "demonstrativo.pdf", "boleto.jpg", "boleto_assefaz.pdf"];

/** Tamanho da base demonstrativa de titulares. */
export const TOTAL_TITULARES_DEMO = 847;

export interface ServidorDemo {
  indice: number;
  nome: string;
  matricula: string;
  situacao: (typeof SITUACOES)[number];
  statusProSaude: "Ativo" | "Pendente" | "Suspenso";
  plano: string;
  dependentes: string[];
  valorPlano: number;
}

const cacheBase = new Map<number, ServidorDemo>();

/** Servidor demonstrativo nº `i` (0 … 846) — sempre o mesmo para o mesmo índice. */
export function servidorDemo(i: number): ServidorDemo {
  const c = cacheBase.get(i);
  if (c) return c;
  const r = rng(`srv-${i}`);
  const nome = `${NOMES[i % NOMES.length]} ${SOBRENOMES[(Math.floor(i / NOMES.length) * 7 + i * 3) % SOBRENOMES.length]}`;
  const nDep = (() => {
    const x = r();
    return x < 0.25 ? 0 : x < 0.6 ? 1 : x < 0.85 ? 2 : 3;
  })();
  const s: ServidorDemo = {
    indice: i,
    nome: i === 0 ? "Carlos Eduardo Ramos" : nome,
    matricula: String(10000000 + ((i * 7919 + 4243) % 89999999)),
    situacao: r() < 0.62 ? SITUACOES[0] : r() < 0.5 ? SITUACOES[1] : r() < 0.55 ? SITUACOES[2] : r() < 0.6 ? SITUACOES[3] : SITUACOES[4],
    statusProSaude: r() < 0.9 ? "Ativo" : r() < 0.7 ? "Pendente" : "Suspenso",
    plano: pick(PLANOS, r),
    dependentes: Array.from({ length: nDep }, (_, k) => `${pick(NOMES, r)} ${SOBRENOMES[(i + k * 5) % SOBRENOMES.length]}`),
    valorPlano: Math.round(700 + r() * 4500),
  };
  cacheBase.set(i, s);
  return s;
}

export function buscarServidoresDemo(termo: string): ServidorDemo[] {
  const q = termo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (!q) return [];
  const out: ServidorDemo[] = [];
  for (let i = 0; i < TOTAL_TITULARES_DEMO && out.length < TOTAL_TITULARES_DEMO; i++) {
    const s = servidorDemo(i);
    const nome = s.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (nome.includes(q) || s.matricula.includes(q)) out.push(s);
  }
  return out;
}

/** Quantos meses a competência `AAAA-MM` está antes do mês da data de referência. */
function mesesAtras(competencia: string): number {
  const ref = getDataReferencia();
  const [a, m] = competencia.split("-").map(Number);
  return (ref.getFullYear() - a) * 12 + (ref.getMonth() + 1 - m);
}

/* ── Alterações mensais ─────────────────────────────────────────────────────────────────────── */

export type GrupoAlteracao = "cadastral" | "documento";

export interface SolicitacaoAlteracao {
  id: string;
  nome: string;
  matricula: string;
  data: string;
  aguardandoAnalise: boolean;
  responsavel?: string;
}

export interface AlteracaoMensal {
  chave: string;
  rotulo: string;
  grupo: GrupoAlteracao;
  recebidas: number;
  aguardandoAnalise: number;
}

const TIPOS_ALTERACAO: [string, string, GrupoAlteracao, number, number][] = [
  ["primeira", "Primeira inclusão no Pró-Saúde", "cadastral", 28, 2],
  ["inclusao_dependente", "Inclusão de dependentes", "cadastral", 64, 4],
  ["exclusao_dependente", "Exclusão", "cadastral", 28, 2],
  ["mudanca_plano", "Mudança de plano", "cadastral", 41, 3],
  ["comprovante_matricula", "Comprovante de matrícula", "documento", 96, 4],
  ["irpf_enteado", "Declaração de IRPF de enteados", "documento", 37, 2],
  ["laudo_invalidez", "Laudo médico de invalidez temporária", "documento", 9, 1],
];

/** Lista completa de solicitações do tipo na competência (aguardando análise primeiro). */
export function getSolicitacoesAlteracaoDemo(competencia: string, chave: string): SolicitacaoAlteracao[] {
  const def = TIPOS_ALTERACAO.find((t) => t[0] === chave);
  if (!def) return [];
  const atras = mesesAtras(competencia);
  const fator = Math.max(0.7, 1 - Math.max(0, atras) * 0.035);
  const pendencia = atras <= 0 ? 1 : atras === 1 ? 0.25 : 0;
  const total = Math.round(def[3] * fator);
  const aguardando = Math.min(total, Math.round(def[4] * pendencia));
  const r = rng(`alt-${competencia}-${chave}`);
  const [ano, mes] = competencia.split("-").map(Number);
  return Array.from({ length: total }, (_, k) => {
    const s = servidorDemo(Math.floor(r() * TOTAL_TITULARES_DEMO));
    const pend = k < aguardando;
    const resp = pick(RESPONSAVEIS_DEMO, r);
    return {
      id: `${chave}-${k}`,
      nome: s.nome,
      matricula: s.matricula,
      data: `${dois(1 + Math.floor(r() * (atras <= 0 ? Math.max(1, getDataReferencia().getDate()) : 27)))}/${dois(mes)}/${ano}`,
      aguardandoAnalise: pend,
      responsavel: pend ? undefined : rotuloResponsavel(resp),
    };
  });
}

export function getAlteracoesMensaisDemo(competencia: string): AlteracaoMensal[] {
  return TIPOS_ALTERACAO.map(([chave, rotulo, grupo]) => {
    const lista = getSolicitacoesAlteracaoDemo(competencia, chave);
    return { chave, rotulo, grupo, recebidas: lista.length, aguardandoAnalise: lista.filter((x) => x.aguardandoAnalise).length };
  });
}

/* ── Comprovantes (competência) ─────────────────────────────────────────────────────────────── */

export type SituacaoComprovantesDemo = "aguardando" | "validados" | "devolvidos";

export interface LinhaComprovanteDemo {
  id: string;
  nome: string;
  matricula: string;
  arquivo: string;
  situacaoRotulo: string;
  responsavel?: string;
}

const MOTIVOS_DEVOLUCAO = ["Substituição — valor divergente do cadastro", "Complementação — documento ilegível", "Substituição — beneficiário divergente", "Substituição — competência incorreta", "Complementação — falta dependente"];

export function getContagemComprovantesDemo(competencia: string) {
  const atras = mesesAtras(competencia);
  const r = rng(`comp-${competencia}`);
  const total = Math.round(540 + r() * 80);
  const aguardando = atras <= 0 ? 12 : atras === 1 ? 3 : atras === 2 ? 1 : 0;
  const devolvidos = Math.round(total * (0.06 + r() * 0.04));
  return { total, aguardando, devolvidos, validados: total - aguardando - devolvidos };
}

export function getLinhasComprovantesDemo(competencia: string, situacao: SituacaoComprovantesDemo): LinhaComprovanteDemo[] {
  const c = getContagemComprovantesDemo(competencia);
  const n = c[situacao];
  const r = rng(`comp-${competencia}-${situacao}`);
  return Array.from({ length: n }, (_, k) => {
    const s = servidorDemo(Math.floor(r() * TOTAL_TITULARES_DEMO));
    const resp = pick(RESPONSAVEIS_DEMO, r);
    const rotulo =
      situacao === "validados" ? (r() < 0.07 ? "Validado com ressalva" : "Validado") : situacao === "aguardando" ? (r() < 0.2 ? "Campo preenchido manualmente" : "Aguardando conferência") : pick(MOTIVOS_DEVOLUCAO, r);
    return { id: `${situacao}-${k}`, nome: s.nome, matricula: s.matricula, arquivo: pick(ARQUIVOS, r), situacaoRotulo: rotulo, responsavel: situacao === "aguardando" ? undefined : rotuloResponsavel(resp) };
  });
}

/* ── Ressarcimentos de meses anteriores (fila) ──────────────────────────────────────────────── */

export interface LinhaRessarcimentoDemo {
  id: string;
  nome: string;
  matricula: string;
  referencia: string;
  statusRotulo: string;
  aguardando: boolean;
  origemRotulo: string;
  responsavel?: string;
}

const STATUS_SERVIDOR: [string, boolean, number][] = [
  ["Em análise", true, 3],
  ["Complementação recebida", true, 2],
  ["Aguardando complementação", true, 1],
  ["Autorizada", false, 20],
  ["Não autorizada", false, 9],
];
const STATUS_ASSOCIACAO: [string, boolean, number, string][] = [
  ["Em análise", true, 1, "Assefaz"],
  ["Em análise", true, 2, "Assetran"],
  ["Habilitada", false, 4, "Assefaz"],
  ["Habilitada", false, 2, "Assetran"],
  ["Desabilitada", false, 3, "Assefaz"],
];
const MESES_REF = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro"];

export function getLinhasRessarcimentosDemo(origem: "individual" | "associacao"): LinhaRessarcimentoDemo[] {
  const r = rng(`ress-${origem}`);
  const out: LinhaRessarcimentoDemo[] = [];
  const add = (status: string, aguardando: boolean, origemRotulo: string) => {
    const s = servidorDemo(Math.floor(r() * TOTAL_TITULARES_DEMO));
    const resp = pick(RESPONSAVEIS_DEMO, r);
    out.push({ id: `${origem}-${out.length}`, nome: s.nome, matricula: s.matricula, referencia: `${pick(MESES_REF, r)}/2026`, statusRotulo: status, aguardando, origemRotulo, responsavel: aguardando ? undefined : rotuloResponsavel(resp) });
  };
  if (origem === "individual") STATUS_SERVIDOR.forEach(([st, ag, n]) => Array.from({ length: n }).forEach(() => add(st, ag, "Servidor")));
  else STATUS_ASSOCIACAO.forEach(([st, ag, n, assoc]) => Array.from({ length: n }).forEach(() => add(st, ag, assoc)));
  return out.sort((a, b) => Number(b.aguardando) - Number(a.aguardando));
}

/* ── Fechamento da competência (universo de titulares) ──────────────────────────────────────── */

export type Classificacao = "adimplente" | "inadimplente" | "requer_analise";

/** Titulares que se repetem na inadimplência (para a consulta de recorrência fazer sentido). */
const RECORRENTES = 36;

export function classificacaoDemo(i: number, competencia: string): Classificacao {
  const atras = mesesAtras(competencia);
  const r = rng(`cls-${i}-${competencia}`)();
  const pInad = i < RECORRENTES ? 0.55 : 0.012;
  if (r < pInad) return "inadimplente";
  const pReq = atras <= 0 ? 0.026 : atras === 1 ? 0.004 : 0;
  const r2 = rng(`req-${i}-${competencia}`)();
  return r2 < pReq ? "requer_analise" : "adimplente";
}

export function getFechamentoDemo(competencia: string) {
  const inadimplentes: { nome: string; chave: string; matricula: string; indice: number }[] = [];
  let adimplentes = 0;
  let requerAnalise = 0;
  let vidasApt = 0;
  let vidasTot = 0;
  let valor = 0;
  const aptos: { id: string; nome: string; matricula: string; plano: string; vidas: number; valor: number }[] = [];
  for (let i = 0; i < TOTAL_TITULARES_DEMO; i++) {
    const s = servidorDemo(i);
    const c = classificacaoDemo(i, competencia);
    const vidas = 1 + s.dependentes.length;
    vidasTot += vidas;
    if (c === "inadimplente") inadimplentes.push({ nome: s.nome, chave: s.matricula, matricula: s.matricula, indice: i });
    else if (c === "requer_analise") requerAnalise += 1;
    else {
      adimplentes += 1;
      vidasApt += vidas;
      const ressarcir = Math.round(Math.min(s.valorPlano, 4000) * 0.9 * 100) / 100;
      valor += ressarcir;
      aptos.push({ id: `apto-${i}`, nome: s.nome, matricula: s.matricula, plano: s.plano, vidas, valor: ressarcir });
    }
  }
  return { adimplentes, requerAnalise, inadimplentes, aptos: { registros: adimplentes, vidas: vidasApt, vidasTotal: vidasTot, valorRessarcir: valor, linhas: aptos } };
}

export function getRecorrenciaDemo(competencias: string[]) {
  const mapa = new Map<number, string[]>();
  for (const c of competencias) {
    for (let i = 0; i < TOTAL_TITULARES_DEMO; i++) {
      if (classificacaoDemo(i, c) === "inadimplente") mapa.set(i, [...(mapa.get(i) ?? []), c]);
    }
  }
  return [...mapa.entries()]
    .map(([i, comps]) => ({ s: servidorDemo(i), comps }))
    .sort((a, b) => b.comps.length - a.comps.length || a.s.nome.localeCompare(b.s.nome))
    .map(({ s, comps }, k) => ({ posicao: k + 1, nome: s.nome, chave: s.matricula, matricula: s.matricula, competencias: comps }));
}

/* ── Prazos e alertas documentais; ficha ────────────────────────────────────────────────────── */

export interface AlertaDemo {
  id: string;
  documento: string;
  beneficiario: string;
  titular: string;
  matricula: string;
  prazoTexto: string;
  vencido: boolean;
  etapa: "aguardando_envio" | "aguardando_analise" | "aprovado";
  etapaRotulo: string;
}

const MODELO_ALERTAS: { doc: string; prazo: string; vencido: boolean; etapa: AlertaDemo["etapa"]; rotulo: string }[] = [
  { doc: "Comprovante de Matrícula · 2º semestre/2026", prazo: "Vencido em 04/08/2026", vencido: true, etapa: "aguardando_envio", rotulo: "Identificada · sem solicitação" },
  { doc: "Comprovante de Matrícula · 2º semestre/2026", prazo: "Prazo 15/10/2026", vencido: false, etapa: "aguardando_envio", rotulo: "Solicitação registrada · pendente" },
  { doc: "Declaração de IR de enteado · exercício 2026", prazo: "Vencido em 31/05/2026", vencido: true, etapa: "aguardando_envio", rotulo: "Identificada · sem solicitação" },
  { doc: "Limite de idade de dependente", prazo: "Aviso · sem prazo de envio", vencido: false, etapa: "aguardando_envio", rotulo: "Identificada · sem solicitação" },
  { doc: "Laudo de invalidez", prazo: "Sem data-base cadastrada", vencido: false, etapa: "aguardando_analise", rotulo: "Solicitação registrada · pendente" },
  { doc: "Comprovante de Matrícula · 2º semestre/2026", prazo: "Recebido em 10/10/2026", vencido: false, etapa: "aprovado", rotulo: "Solicitação atendida" },
];

export function getAlertasDemo(): AlertaDemo[] {
  const r = rng("alertas");
  return MODELO_ALERTAS.map((m, k) => {
    const s = servidorDemo(1 + Math.floor(r() * 120));
    return { id: `alerta-${k}`, documento: m.doc, beneficiario: s.dependentes[0] ?? `${pick(NOMES, r)} ${s.nome.split(" ")[1]}`, titular: s.nome, matricula: s.matricula, prazoTexto: m.prazo, vencido: m.vencido, etapa: m.etapa, etapaRotulo: m.rotulo };
  });
}

/* ── Panorama da base ───────────────────────────────────────────────────────────────────────── */

export function getPanoramaDemo() {
  let dependentes = 0;
  let noTeto = 0;
  const cont = new Map<string, number>();
  for (let i = 0; i < TOTAL_TITULARES_DEMO; i++) {
    const s = servidorDemo(i);
    dependentes += s.dependentes.length;
    if (s.valorPlano >= 4000) noTeto += 1;
    cont.set(s.situacao, (cont.get(s.situacao) ?? 0) + 1);
  }
  return {
    titulares: TOTAL_TITULARES_DEMO,
    dependentes,
    noTeto,
    percentualNoTeto: (noTeto / TOTAL_TITULARES_DEMO) * 100,
    situacoes: SITUACOES.map((rotulo) => ({ rotulo, titulares: cont.get(rotulo) ?? 0, percentual: ((cont.get(rotulo) ?? 0) / TOTAL_TITULARES_DEMO) * 100 })),
  };
}

/* ── Últimos relatórios gerados ─────────────────────────────────────────────────────────────── */

export function getRelatoriosDemo() {
  const ref = getDataReferencia();
  const modelos: { tipo: "Fechamento de Pagamento" | "Ressarcimentos de meses anteriores"; atras: number; seq: number; resp: number; dia: number }[] = [
    { tipo: "Fechamento de Pagamento", atras: 1, seq: 1, resp: 0, dia: 6 },
    { tipo: "Ressarcimentos de meses anteriores", atras: 1, seq: 1, resp: 1, dia: 3 },
    { tipo: "Fechamento de Pagamento", atras: 2, seq: 1, resp: 0, dia: 5 },
    { tipo: "Fechamento de Pagamento", atras: 2, seq: 2, resp: 2, dia: 14 },
    { tipo: "Ressarcimentos de meses anteriores", atras: 3, seq: 1, resp: 1, dia: 4 },
  ];
  const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return modelos.map((m, k) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - m.atras + 1, m.dia);
    const comp = new Date(ref.getFullYear(), ref.getMonth() - m.atras, 1);
    return { id: `rel-demo-${k}`, tipo: m.tipo, sequencia: m.seq, referencia: `${nomes[comp.getMonth()]}/${comp.getFullYear()}`, responsavel: rotuloResponsavel(RESPONSAVEIS_DEMO[m.resp]), geradoEm: d.toISOString() };
  });
}

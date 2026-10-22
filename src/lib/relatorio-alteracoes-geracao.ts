/**
 * Relatório de Alterações (NURFI) — consolidação, pré-visualização, versões imutáveis e especificação de exportação (Etapa 5).
 *
 * Regras:
 *  - Só registros CONFIRMADOS compõem o relatório; identificados e descartados nunca entram.
 *  - UMA linha por titular + competência de referência + origem de pagamento. Os registros individuais (e seus históricos)
 *    continuam no armazenamento do relatório; a linha só os referencia.
 *  - Observações reunidas sem repetir frases idênticas. Valores NUNCA são somados: o valor da linha é o valor informado ao NURFI
 *    pela GERDAB; se os registros do grupo informam valores diferentes, a linha é bloqueada (conflito).
 *  - Pendências impeditivas (ver `avaliarRegistro`) bloqueiam a geração definitiva — a ciência do analista não as dispensa.
 *  - Competências de pagamento diferentes entre os confirmados da mesma referência não se misturam: a GERDAB escolhe uma.
 *  - Cada geração cria uma VERSÃO numerada e IMUTÁVEL (snapshot integral das linhas); nenhuma função aqui altera ou apaga versões.
 *    Exportar uma versão usa sempre o seu snapshot, nunca os dados atuais.
 *  - Gerar não altera cadastro, valores, comprovantes, requerimentos nem qualquer módulo de origem.
 */
import { emissoesDaCompetencia, numerosEmitidosPorRegistro, registrarEmissao, useEmissoes, type EmissaoRelatorio } from "./emissoes-relatorio";
import { compararAlfabetico, type RelatorioExportSpec, type SecaoExport } from "./relatorio-export";
import {
  avaliarRegistro,
  estadoDoValor,
  exigeValor,
  identificadorTitular,
  listarRegistros,
  motivosDeConferencia,
  ORIGENS_PAGAMENTO,
  ROTULO_TIPO,
  textoDoMotivo,
  type Movimento,
  type OrigemPagamento,
  type RegistroAlteracao,
  type VinculoFuncional,
} from "./relatorio-alteracoes";

/* ── Competências e títulos ─────────────────────────────────────────────────────────────────────────────────────── */

const nomeMes = (comp: string) => new Date(Number(comp.slice(0, 4)), Number(comp.slice(5, 7)) - 1, 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase();
/** "2026-09" → "SETEMBRO" */
export const mesPorExtenso = nomeMes;
/** "Relatório de Alterações referente a SETEMBRO com pagamento em OUTUBRO/2026" */
export const tituloRelatorio = (ref: string, pag: string) => `Relatório de Alterações referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)}`;

export const SECOES_RELATORIO: { vinculo: VinculoFuncional; origem: OrigemPagamento }[] = (["ativo", "inativo"] as VinculoFuncional[]).flatMap((vinculo) => ORIGENS_PAGAMENTO.map((origem) => ({ vinculo, origem })));
export const chaveSecao = (v: VinculoFuncional, o: OrigemPagamento) => `${v}|${o}`;
const rotuloVinculoCaixaAlta = (v: VinculoFuncional) => (v === "ativo" ? "ATIVOS" : "INATIVOS");
const rotuloVinculoTitulo = (v: VinculoFuncional) => (v === "ativo" ? "Ativos" : "Inativos");

/**
 * HIPÓTESE (a confirmar com a GERDAB): o prefixo numérico dos títulos nos PDFs de referência ("06 - …") corresponde ao mês de
 * pagamento (06 = junho nos modelos). Não é regra administrativa validada: por isso o prefixo é um PARÂMETRO da geração
 * (`prefixoTitulo`), gravado na versão, e pode ser trocado ou omitido. As competências de referência e de pagamento sempre
 * aparecem por extenso no título, independentemente do prefixo.
 */
export const prefixoSugerido = (pag: string) => pag.slice(5, 7);

/** Título de seção no padrão dos PDFs da GERDAB. `prefixo`: texto antes do " - " (vazio = sem prefixo; omitido = sugestão provisória). */
export function tituloSecao(ref: string, pag: string, v: VinculoFuncional, o: OrigemPagamento, prefixo?: string): string {
  const p = (prefixo ?? prefixoSugerido(pag)).trim();
  return `${p ? `${p} - ` : ""}Relatório de alterações Pró-saúde dos ${rotuloVinculoTitulo(v)} - referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)} - ${o.toUpperCase()} - ${rotuloVinculoCaixaAlta(v)} - ALTERAÇÕES`;
}

/* ── Consolidação ───────────────────────────────────────────────────────────────────────────────────────────────── */

export interface LinhaRelatorio {
  chave: string;
  vinculo: VinculoFuncional;
  origem: OrigemPagamento;
  matricula: string;
  nome: string;
  /** Valor final conferido pela GERDAB; ausente apenas quando nenhuma movimentação do grupo o exige. */
  valor?: number;
  /** A GERDAB declarou que a movimentação não tem valor financeiro aplicável (nunca representado por zero). */
  valorNaoAplicavel?: boolean;
  observacao: string;
  qt: number;
  /** Registros individuais que originaram a linha (preservados, com seus históricos, no armazenamento do relatório). */
  registroIds: string[];
  movimentos: string[];
  demonstrativo: boolean;
}

export interface Bloqueio {
  /** Registro ou grupo afetado. */
  titular: string;
  registroIds: string[];
  motivos: string[];
}

export interface PreparacaoRelatorio {
  competenciaReferencia: string;
  /** Competências de pagamento distintas entre os confirmados da referência. */
  pagamentosDisponiveis: string[];
  /** Competência de pagamento efetivamente usada (a única existente ou a escolhida). */
  competenciaPagamento?: string;
  linhas: LinhaRelatorio[];
  bloqueios: Bloqueio[];
  /** Mensagem quando há mais de uma competência de pagamento e nenhuma foi escolhida. */
  selecaoPendente: boolean;
  totalRegistros: number;
  porSecao: { vinculo: VinculoFuncional; origem: OrigemPagamento; quantidade: number }[];
  /** Confirmados da referência que ficaram de fora por pertencerem a outra competência de pagamento. */
  foraDaSelecao: number;
  podeGerar: boolean;
}

const normalizaFrase = (f: string) => f.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.\s]+$/g, "").replace(/\s+/g, " ").trim();

/** Reúne observações separando em frases e descartando as repetidas (ignora caixa, acento e ponto final). Ordem preservada. */
export function consolidarObservacoes(observacoes: string[]): string {
  const vistas = new Set<string>();
  const frases: string[] = [];
  for (const o of observacoes) {
    for (const f of o.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
      const k = normalizaFrase(f);
      if (!k || vistas.has(k)) continue;
      vistas.add(k);
      frases.push(/[.!?]$/.test(f) ? f : `${f}.`);
    }
  }
  return frases.join(" ");
}

const centavos = (v: number) => Math.round(v * 100);

/** Monta as linhas consolidadas a partir dos registros CONFIRMADOS da referência, aplicando bloqueios. Pura (não grava nada). */
export function prepararRelatorio(competenciaReferencia: string, pagamentoEscolhido?: string, registros: RegistroAlteracao[] = listarRegistros(), selecionados?: ReadonlySet<string>): PreparacaoRelatorio {
  const confirmados = registros.filter((r) => r.situacao === "confirmada" && r.competenciaReferencia === competenciaReferencia && (!selecionados || selecionados.has(r.id))).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const pagamentos = [...new Set(confirmados.map((r) => r.competenciaPagamento))].sort();
  const pagamento = pagamentoEscolhido && pagamentos.includes(pagamentoEscolhido) ? pagamentoEscolhido : pagamentos.length === 1 ? pagamentos[0] : undefined;
  const selecaoPendente = pagamentos.length > 1 && !pagamento;
  const usados = pagamento ? confirmados.filter((r) => r.competenciaPagamento === pagamento) : [];

  const bloqueios: Bloqueio[] = [];
  // 1) pendências impeditivas por registro
  for (const r of usados) {
    const { impeditivas } = avaliarRegistro(r);
    if (impeditivas.length) bloqueios.push({ titular: r.titular.nome, registroIds: [r.id], motivos: impeditivas });
  }
  const comImpedimento = new Set(bloqueios.flatMap((b) => b.registroIds));

  // 2) grupos: titular + referência + origem
  const grupos = new Map<string, RegistroAlteracao[]>();
  for (const r of usados) {
    if (comImpedimento.has(r.id) || !r.vinculo || !r.origemPagamento) continue;
    const chave = `${identificadorTitular(r.titular)}|${r.competenciaReferencia}|${r.origemPagamento}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }
  const brutas: Omit<LinhaRelatorio, "qt">[] = [];
  for (const [chave, grupo] of grupos) {
    const valores = [...new Set(grupo.filter((r) => r.valorInformadoNurfi !== undefined).map((r) => centavos(r.valorInformadoNurfi!)))];
    if (valores.length > 1) {
      bloqueios.push({ titular: grupo[0].titular.nome, registroIds: grupo.map((r) => r.id), motivos: [`Valores conflitantes nos registros do mesmo titular e origem (${valores.map((c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })).join(" × ")}) — não são somados: informe o valor final conferido`] });
      continue;
    }
    const vinculos = new Set(grupo.map((r) => r.vinculo));
    if (vinculos.size > 1) {
      bloqueios.push({ titular: grupo[0].titular.nome, registroIds: grupo.map((r) => r.id), motivos: ["Vínculo funcional diferente entre os registros do mesmo titular — corrija na conferência"] });
      continue;
    }
    const primeiro = grupo[0];
    brutas.push({
      chave,
      vinculo: primeiro.vinculo!,
      origem: primeiro.origemPagamento!,
      matricula: primeiro.titular.matricula!,
      nome: primeiro.titular.nome,
      valor: valores.length === 1 ? valores[0] / 100 : undefined,
      valorNaoAplicavel: valores.length === 0 && grupo.some((r) => estadoDoValor(r) === "nao_aplicavel") ? true : undefined,
      observacao: consolidarObservacoes(grupo.map((r) => r.observacao)),
      registroIds: grupo.map((r) => r.id),
      movimentos: grupo.flatMap((r) => r.movimentos.map((m) => descreverMovimento(m))),
      demonstrativo: grupo.some((r) => r.demonstrativo),
    });
  }
  // 3) valor exigido por grupo (já garantido por registro; reforço para grupos sem nenhum valor)
  const linhas: LinhaRelatorio[] = [];
  for (const secao of SECOES_RELATORIO) {
    const daSecao = brutas.filter((l) => l.vinculo === secao.vinculo && l.origem === secao.origem).sort((a, b) => compararAlfabetico(a.nome, b.nome));
    daSecao.forEach((l, i) => linhas.push({ ...l, qt: i + 1 }));
  }
  for (const l of linhas) {
    const grupo = grupos.get(l.chave) ?? [];
    if (l.valor === undefined && !l.valorNaoAplicavel && exigeValor(grupo.flatMap((r) => r.movimentos))) bloqueios.push({ titular: l.nome, registroIds: l.registroIds, motivos: ["Valor informado ao NURFI pendente"] });
  }
  const bloqueadosFinais = new Set(bloqueios.flatMap((b) => b.registroIds));
  const linhasValidas = linhas.filter((l) => !l.registroIds.some((id) => bloqueadosFinais.has(id)));
  return {
    competenciaReferencia,
    pagamentosDisponiveis: pagamentos,
    competenciaPagamento: pagamento,
    linhas,
    bloqueios,
    selecaoPendente,
    totalRegistros: usados.length,
    porSecao: SECOES_RELATORIO.map((s) => ({ ...s, quantidade: linhas.filter((l) => l.vinculo === s.vinculo && l.origem === s.origem).length })),
    foraDaSelecao: confirmados.length - usados.length,
    podeGerar: !!pagamento && linhas.length > 0 && bloqueios.length === 0 && linhasValidas.length === linhas.length,
  };
}

function descreverMovimento(m: Movimento): string {
  return m.motivo ? `${ROTULO_TIPO[m.tipo]} — ${textoDoMotivo(m.motivo)}` : ROTULO_TIPO[m.tipo];
}

/* ── Emissões independentes (motor genérico em `emissoes-relatorio.ts`) ────────────────────────────────────────── */

export const TIPO_RELATORIO_ALTERACOES = "alteracoes";
export type EmissaoAlteracoes = EmissaoRelatorio<LinhaRelatorio>;

export const useEmissoesAlteracoes = () => useEmissoes<LinhaRelatorio>(TIPO_RELATORIO_ALTERACOES);
export const emissoesAlteracoes = (ref: string) => emissoesDaCompetencia<LinhaRelatorio>(TIPO_RELATORIO_ALTERACOES, ref);

/** Item da tela de revisão: um registro da competência, pronto (selecionável) ou bloqueado por pendências. */
export interface ItemRevisao {
  registro: RegistroAlteracao;
  pronto: boolean;
  /** Motivo curto do bloqueio (primeira pendência impeditiva, ou competência de pagamento diferente). */
  motivoBloqueio?: string;
  /** Números das emissões da competência em que o registro já foi incluído. */
  emitidoEm: number[];
}

export interface RevisaoRelatorio {
  competenciaReferencia: string;
  /** Competências de pagamento distintas entre os registros PRONTOS. */
  pagamentosDisponiveis: string[];
  competenciaPagamento?: string;
  itens: ItemRevisao[];
}

/**
 * Classifica os registros da competência para a revisão da emissão. **Pronto** = confirmado e sem pendência impeditiva
 * (e da competência de pagamento escolhida). Identificados, confirmados com pendência e prontos de outra competência de
 * pagamento ficam bloqueados. Descartados não aparecem. A competência de pagamento nunca é misturada: havendo mais de
 * uma entre os prontos, a GERDAB escolhe.
 */
export function revisarRelatorio(competenciaReferencia: string, pagamentoEscolhido?: string, registros: RegistroAlteracao[] = listarRegistros()): RevisaoRelatorio {
  const emitidos = numerosEmitidosPorRegistro(TIPO_RELATORIO_ALTERACOES, competenciaReferencia);
  const daCompetencia = registros.filter((r) => r.competenciaReferencia === competenciaReferencia && r.situacao !== "descartada");
  const prontosBrutos = daCompetencia.filter((r) => r.situacao === "confirmada" && avaliarRegistro(r).impeditivas.length === 0);
  const pagamentos = [...new Set(prontosBrutos.map((r) => r.competenciaPagamento))].sort();
  const pagamento = pagamentoEscolhido && pagamentos.includes(pagamentoEscolhido) ? pagamentoEscolhido : pagamentos.length === 1 ? pagamentos[0] : undefined;
  const itens = daCompetencia
    .map<ItemRevisao>((r) => {
      const imp = avaliarRegistro(r).impeditivas;
      const confirmada = r.situacao === "confirmada";
      if (!confirmada || imp.length > 0) return { registro: r, pronto: false, motivoBloqueio: motivosDeConferencia(r)[0] ?? "Conclua a conferência", emitidoEm: emitidos.get(r.id) ?? [] };
      if (pagamento && r.competenciaPagamento !== pagamento) return { registro: r, pronto: false, motivoBloqueio: `Pagamento em outra competência (${r.competenciaPagamento.split("-").reverse().join("/")})`, emitidoEm: emitidos.get(r.id) ?? [] };
      if (!pagamento) return { registro: r, pronto: false, motivoBloqueio: "Escolha a competência de pagamento", emitidoEm: emitidos.get(r.id) ?? [] };
      return { registro: r, pronto: true, emitidoEm: emitidos.get(r.id) ?? [] };
    })
    .sort((a, b) => a.registro.titular.nome.localeCompare(b.registro.titular.nome, "pt-BR", { sensitivity: "base" }));
  return { competenciaReferencia, pagamentosDisponiveis: pagamentos, competenciaPagamento: pagamento, itens };
}

/**
 * Emite um novo relatório INDEPENDENTE com os registros selecionados (sem justificativa). Recusa se houver bloqueios na
 * consolidação (ex.: valores conflitantes) e, se algum registro selecionado já constar em outra emissão, exige a confirmação
 * explícita de duplicidade (`reemissaoConfirmada`). Não altera nenhum registro nem módulo de origem.
 */
export function emitirRelatorio(competenciaReferencia: string, competenciaPagamento: string, responsavel: string, selecionados: ReadonlySet<string>, opcoes: { reemissaoConfirmada?: boolean; prefixoTitulo?: string } = {}): EmissaoAlteracoes {
  const registros = listarRegistros();
  const revisao = revisarRelatorio(competenciaReferencia, competenciaPagamento, registros);
  const prontos = new Set(revisao.itens.filter((i) => i.pronto).map((i) => i.registro.id));
  const escolhidos = [...selecionados].filter((id) => prontos.has(id));
  if (escolhidos.length === 0) throw new Error("Selecione ao menos um registro pronto.");
  if (escolhidos.length !== selecionados.size) throw new Error("A seleção contém registros que não estão prontos: volte à revisão.");
  const prep = prepararRelatorio(competenciaReferencia, competenciaPagamento, registros, new Set(escolhidos));
  if (!prep.podeGerar) throw new Error("Há bloqueios na consolidação (ex.: valores conflitantes): volte à revisão.");
  const jaEmitidos = escolhidos.filter((id) => (revisao.itens.find((i) => i.registro.id === id)?.emitidoEm.length ?? 0) > 0);
  if (jaEmitidos.length > 0 && !opcoes.reemissaoConfirmada) throw new Error(`${jaEmitidos.length} registro(s) já constam em outra emissão: confirme explicitamente a duplicidade para reemitir.`);
  return registrarEmissao<LinhaRelatorio>({
    tipoRelatorio: TIPO_RELATORIO_ALTERACOES,
    competenciaReferencia,
    competenciaPagamento,
    responsavel,
    linhas: prep.linhas,
    registroIds: escolhidos,
    demonstrativo: prep.linhas.some((l) => l.demonstrativo),
    parametros: { prefixoTitulo: (opcoes.prefixoTitulo ?? prefixoSugerido(competenciaPagamento)).trim() },
    reemissao: jaEmitidos.length ? { registroIds: jaEmitidos, confirmadoPor: responsavel, dataHora: new Date().toISOString() } : undefined,
  });
}

/** Cabeçalho do relatório com o número da emissão: "Relatório de Alterações — Relatório 2". */
export const tituloEmissao = (numero: number, ref: string, pag: string) => `Relatório de Alterações — Relatório ${numero} — referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)}`;

type DadosEmissao = Pick<EmissaoAlteracoes, "numero" | "competenciaReferencia" | "competenciaPagamento" | "geradoEm" | "responsavel" | "linhas" | "demonstrativo"> & Partial<Pick<EmissaoAlteracoes, "parametros" | "reemissao">>;

/** Especificação de exportação (motor com `secoes[]`) construída EXCLUSIVAMENTE a partir do conteúdo da emissão. */
export function montarSpecEmissao(e: DadosEmissao): RelatorioExportSpec<LinhaRelatorio> {
  const ref = e.competenciaReferencia;
  const pag = e.competenciaPagamento;
  const mesPag = nomeMes(pag);
  const prefixo = e.parametros?.prefixoTitulo;
  const secoes: SecaoExport<LinhaRelatorio>[] = SECOES_RELATORIO.map((s) => ({
    titulo: tituloSecao(ref, pag, s.vinculo, s.origem, prefixo),
    nomeAba: `${rotuloVinculoTitulo(s.vinculo)} - ${s.origem}`,
    linhas: e.linhas.filter((l) => l.vinculo === s.vinculo && l.origem === s.origem),
  }));
  const notas = [`Relatório ${e.numero} — emitido por ${e.responsavel}. Cada emissão é independente; este documento preserva o conteúdo original da emissão.`];
  if (e.reemissao) notas.push(`Reemissão: ${e.reemissao.registroIds.length} registro(s) já constavam em emissão anterior (duplicidade confirmada por ${e.reemissao.confirmadoPor}).`);
  if (e.linhas.some((l) => l.valorNaoAplicavel)) notas.push("N/A: valor financeiro declarado como não aplicável à movimentação pela GERDAB.");
  if (e.demonstrativo) notas.push("Contém registros DEMONSTRATIVOS (fictícios) — documento de demonstração, sem valor oficial.");
  return {
    titulo: tituloEmissao(e.numero, ref, pag),
    origem: "Relatório de Alterações (NURFI)",
    competencia: `Referência ${nomeMes(ref)}/${ref.slice(0, 4)} · Pagamento ${mesPag}/${pag.slice(0, 4)}`,
    rotuloCompetencia: "Competências",
    identificacao: [
      { label: "Relatório", valor: `nº ${e.numero} da competência ${nomeMes(ref)}/${ref.slice(0, 4)}` },
      { label: "Responsável pela emissão", valor: e.responsavel },
    ],
    filtrosAplicados: [],
    ocultarLinhaFiltrosSeVazia: true,
    dataEmissao: e.geradoEm,
    colunas: [
      { header: "MATRÍCULA", valor: (l) => l.matricula, tipo: "texto", width: 14, larguraPdf: 28 },
      { header: "NOME", valor: (l) => l.nome, tipo: "texto", width: 46, larguraPdf: 80 },
      { header: mesPag, valor: (l) => (l.valorNaoAplicavel ? "N/A" : l.valor === undefined ? "" : l.valor), tipo: "decimal", width: 14, larguraPdf: 28 },
      { header: "OBSERVAÇÕES NURFI", valor: (l) => l.observacao, tipo: "texto", width: 70, larguraPdf: 111 },
    ],
    secoes,
    ordenarPor: (l) => l.nome,
    numeracao: { cabecalho: "QT" },
    manterSecoesVazias: false,
    linhas: [],
    notas,
    nomeArquivoBase: `pro-saude_relatorio_alteracoes_ref-${ref}_pag-${pag}_relatorio-${e.numero}`,
    orientacaoPdf: "landscape",
  };
}

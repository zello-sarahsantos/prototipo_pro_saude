/**
 * Relatório de Suspensões (NURFI) — revisão, consolidação, emissões independentes e exportação.
 *
 * Mesmo modelo do Relatório de Alterações (reaproveita o motor genérico `emissoes-relatorio.ts` com `tipoRelatorio = "suspensoes"` e
 * o motor de exportação por seções). Regras:
 *  - Só registros PRONTOS (confirmados e sem pendência impeditiva) podem ser emitidos.
 *  - Uma linha por TITULAR + competência de referência + origem de pagamento (matrícula e nome do titular). A situação de um
 *    dependente aparece na OBSERVAÇÃO da linha — nunca se estende ao grupo familiar. Observações reunidas sem frases repetidas.
 *  - Valores nunca somados; valores diferentes no mesmo grupo bloqueiam. Duas classificações diferentes para o próprio TITULAR
 *    na mesma linha (ex.: Suspender e Excluir) também bloqueiam — a GERDAB corrige na conferência.
 *  - Cada emissão é independente (número sequencial por competência), sem justificativa; reemissão exige confirmação de duplicidade.
 *  - Emitir não altera nenhum cadastro, pagamento, elegibilidade ou situação real de beneficiário.
 */
import { emissoesDaCompetencia, numerosEmitidosPorRegistro, registrarEmissao, useEmissoes, type EmissaoRelatorio } from "./emissoes-relatorio";
import { compararAlfabetico, type RelatorioExportSpec, type SecaoExport } from "./relatorio-export";
import { ROTULO_VINCULO, identificadorTitular, type VinculoFuncional } from "./relatorio-alteracoes";
import { chaveSecao, consolidarObservacoes, mesPorExtenso, prefixoSugerido, SECOES_RELATORIO, type Bloqueio, type LinhaRelatorio } from "./relatorio-alteracoes-geracao";
import { estadoDoValorSuspensao, impeditivasSuspensao, listarSuspensoes, pendenciasSuspensao, ROTULO_CLASSIFICACAO, type RegistroSuspensao } from "./relatorio-suspensoes";

export const TIPO_RELATORIO_SUSPENSOES = "suspensoes";
export type EmissaoSuspensoes = EmissaoRelatorio<LinhaRelatorio>;
export const useEmissoesSuspensoes = () => useEmissoes<LinhaRelatorio>(TIPO_RELATORIO_SUSPENSOES);
export const emissoesSuspensoes = (ref: string) => emissoesDaCompetencia<LinhaRelatorio>(TIPO_RELATORIO_SUSPENSOES, ref);

const rotuloVinculoTitulo = (v: VinculoFuncional) => (v === "ativo" ? "Ativos" : "Inativos");
const nomeMes = mesPorExtenso;

export const tituloEmissaoSuspensoes = (numero: number, ref: string, pag: string) => `Relatório de Suspensões — Relatório ${numero} — referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)}`;

/** Título de seção no padrão dos PDFs da GERDAB; o prefixo numérico é um PARÂMETRO (hipótese: mês de pagamento — ver alterações). */
export function tituloSecaoSuspensoes(ref: string, pag: string, v: VinculoFuncional, origem: string, prefixo?: string): string {
  const p = (prefixo ?? prefixoSugerido(pag)).trim();
  return `${p ? `${p} - ` : ""}Relatório de suspensões Pró-saúde dos ${rotuloVinculoTitulo(v)} - referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)} - ${origem.toUpperCase()} - ${v === "ativo" ? "ATIVOS" : "INATIVOS"} - SUSPENSÕES`;
}

/* ── Revisão ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface ItemRevisaoSuspensao {
  registro: RegistroSuspensao;
  pronto: boolean;
  motivoBloqueio?: string;
  emitidoEm: number[];
}
export interface RevisaoSuspensoes {
  competenciaReferencia: string;
  pagamentosDisponiveis: string[];
  competenciaPagamento?: string;
  itens: ItemRevisaoSuspensao[];
}

export function revisarSuspensoes(ref: string, pagamentoEscolhido?: string, registros: RegistroSuspensao[] = listarSuspensoes()): RevisaoSuspensoes {
  const emitidos = numerosEmitidosPorRegistro(TIPO_RELATORIO_SUSPENSOES, ref);
  const daCompetencia = registros.filter((r) => r.competenciaReferencia === ref && r.situacao !== "descartada");
  const prontosBrutos = daCompetencia.filter((r) => r.situacao === "confirmada" && impeditivasSuspensao(r).length === 0);
  const pagamentos = [...new Set(prontosBrutos.map((r) => r.competenciaPagamento))].sort();
  const pagamento = pagamentoEscolhido && pagamentos.includes(pagamentoEscolhido) ? pagamentoEscolhido : pagamentos.length === 1 ? pagamentos[0] : undefined;
  const itens = daCompetencia
    .map<ItemRevisaoSuspensao>((r) => {
      const emi = emitidos.get(r.id) ?? [];
      const imp = impeditivasSuspensao(r);
      if (r.situacao !== "confirmada" || imp.length > 0) return { registro: r, pronto: false, motivoBloqueio: imp[0]?.tabela ?? "Confirme a análise do registro", emitidoEm: emi };
      if (!pagamento) return { registro: r, pronto: false, motivoBloqueio: "Escolha a competência de pagamento", emitidoEm: emi };
      if (r.competenciaPagamento !== pagamento) return { registro: r, pronto: false, motivoBloqueio: `Pagamento em outra competência (${r.competenciaPagamento.split("-").reverse().join("/")})`, emitidoEm: emi };
      return { registro: r, pronto: true, emitidoEm: emi };
    })
    .sort((a, b) => a.registro.titular.nome.localeCompare(b.registro.titular.nome, "pt-BR", { sensitivity: "base" }));
  return { competenciaReferencia: ref, pagamentosDisponiveis: pagamentos, competenciaPagamento: pagamento, itens };
}

/* ── Consolidação ──────────────────────────────────────────────────────────────────────────────────────────────── */

export interface PreparacaoSuspensoes {
  linhas: LinhaRelatorio[];
  bloqueios: Bloqueio[];
  podeGerar: boolean;
}

const centavos = (v: number) => Math.round(v * 100);

/** Consolida os registros SELECIONADOS (devem ser prontos) em linhas do titular. Pura: não grava nada. */
export function prepararSuspensoes(ref: string, pag: string, registros: RegistroSuspensao[], selecionados: ReadonlySet<string>): PreparacaoSuspensoes {
  const usados = registros.filter((r) => selecionados.has(r.id) && r.situacao === "confirmada" && r.competenciaReferencia === ref && r.competenciaPagamento === pag).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const bloqueios: Bloqueio[] = [];
  for (const r of usados) {
    const imp = impeditivasSuspensao(r);
    if (imp.length) bloqueios.push({ titular: r.titular.nome, registroIds: [r.id], motivos: imp.map((x) => x.tabela) });
  }
  const comImpedimento = new Set(bloqueios.flatMap((b) => b.registroIds));
  const grupos = new Map<string, RegistroSuspensao[]>();
  for (const r of usados) {
    if (comImpedimento.has(r.id) || !r.vinculo || !r.origemPagamento) continue;
    const k = `${identificadorTitular(r.titular)}|${r.competenciaReferencia}|${r.origemPagamento}`;
    grupos.set(k, [...(grupos.get(k) ?? []), r]);
  }
  const brutas: Omit<LinhaRelatorio, "qt">[] = [];
  for (const [chave, g] of grupos) {
    const valores = [...new Set(g.filter((r) => r.valorInformadoNurfi !== undefined).map((r) => centavos(r.valorInformadoNurfi!)))];
    if (valores.length > 1) {
      bloqueios.push({ titular: g[0].titular.nome, registroIds: g.map((r) => r.id), motivos: [`Valores conflitantes no mesmo titular e origem (${valores.map((c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })).join(" × ")}) — não são somados: informe o valor final`] });
      continue;
    }
    const classTitular = [...new Set(g.filter((r) => r.afetado.tipo === "titular").map((r) => r.classificacao))];
    if (classTitular.length > 1) {
      bloqueios.push({ titular: g[0].titular.nome, registroIds: g.map((r) => r.id), motivos: [`Situações diferentes para o próprio titular (${classTitular.map((c) => ROTULO_CLASSIFICACAO[c!]).join(" × ")}) — corrija na conferência`] });
      continue;
    }
    if (new Set(g.map((r) => r.vinculo)).size > 1) {
      bloqueios.push({ titular: g[0].titular.nome, registroIds: g.map((r) => r.id), motivos: ["Vínculo funcional diferente entre os registros do mesmo titular — corrija na conferência"] });
      continue;
    }
    const p = g[0];
    brutas.push({
      chave,
      vinculo: p.vinculo!,
      origem: p.origemPagamento!,
      matricula: p.titular.matricula!,
      nome: p.titular.nome,
      valor: valores.length === 1 ? valores[0] / 100 : undefined,
      valorNaoAplicavel: valores.length === 0 && g.some((r) => estadoDoValorSuspensao(r) === "nao_aplicavel") ? true : undefined,
      observacao: consolidarObservacoes(g.map((r) => r.observacao)),
      registroIds: g.map((r) => r.id),
      movimentos: g.map((r) => `${ROTULO_CLASSIFICACAO[r.classificacao!]}${r.afetado.tipo === "dependente" ? ` (dependente ${r.afetado.nomeDependente})` : ""}`),
      demonstrativo: g.some((r) => r.demonstrativo),
    });
  }
  const linhas: LinhaRelatorio[] = [];
  for (const s of SECOES_RELATORIO) brutas.filter((l) => l.vinculo === s.vinculo && l.origem === s.origem).sort((a, b) => compararAlfabetico(a.nome, b.nome)).forEach((l, i) => linhas.push({ ...l, qt: i + 1 }));
  const bloqueados = new Set(bloqueios.flatMap((b) => b.registroIds));
  const ok = bloqueios.length === 0 && linhas.length > 0 && linhas.every((l) => !l.registroIds.some((id) => bloqueados.has(id)));
  return { linhas, bloqueios, podeGerar: ok };
}

/** Emite um relatório INDEPENDENTE (sem justificativa). Reemissão de registro já emitido exige a confirmação explícita de duplicidade. */
export function emitirSuspensoes(ref: string, pag: string, responsavel: string, selecionados: ReadonlySet<string>, opcoes: { reemissaoConfirmada?: boolean; prefixoTitulo?: string } = {}): EmissaoSuspensoes {
  const registros = listarSuspensoes();
  const revisao = revisarSuspensoes(ref, pag, registros);
  const prontos = new Set(revisao.itens.filter((i) => i.pronto).map((i) => i.registro.id));
  const escolhidos = [...selecionados].filter((id) => prontos.has(id));
  if (escolhidos.length === 0) throw new Error("Selecione ao menos um registro pronto.");
  if (escolhidos.length !== selecionados.size) throw new Error("A seleção contém registros que não estão prontos: volte à revisão.");
  const prep = prepararSuspensoes(ref, pag, registros, new Set(escolhidos));
  if (!prep.podeGerar) throw new Error("Há bloqueios na consolidação: volte à revisão.");
  const jaEmitidos = escolhidos.filter((id) => (revisao.itens.find((i) => i.registro.id === id)?.emitidoEm.length ?? 0) > 0);
  if (jaEmitidos.length > 0 && !opcoes.reemissaoConfirmada) throw new Error(`${jaEmitidos.length} registro(s) já constam em outra emissão: confirme explicitamente a duplicidade para reemitir.`);
  return registrarEmissao<LinhaRelatorio>({
    tipoRelatorio: TIPO_RELATORIO_SUSPENSOES,
    competenciaReferencia: ref,
    competenciaPagamento: pag,
    responsavel,
    linhas: prep.linhas,
    registroIds: escolhidos,
    demonstrativo: prep.linhas.some((l) => l.demonstrativo),
    parametros: { prefixoTitulo: (opcoes.prefixoTitulo ?? prefixoSugerido(pag)).trim() },
    reemissao: jaEmitidos.length ? { registroIds: jaEmitidos, confirmadoPor: responsavel, dataHora: new Date().toISOString() } : undefined,
  });
}

/* ── Exportação ────────────────────────────────────────────────────────────────────────────────────────────────── */

type DadosEmissao = Pick<EmissaoSuspensoes, "numero" | "competenciaReferencia" | "competenciaPagamento" | "geradoEm" | "responsavel" | "linhas" | "demonstrativo"> & Partial<Pick<EmissaoSuspensoes, "parametros" | "reemissao">>;

/** Especificação de exportação construída EXCLUSIVAMENTE a partir do snapshot da emissão (nunca dos dados atuais). */
export function montarSpecSuspensoes(e: DadosEmissao): RelatorioExportSpec<LinhaRelatorio> {
  const ref = e.competenciaReferencia;
  const pag = e.competenciaPagamento;
  const mesPag = nomeMes(pag);
  const secoes: SecaoExport<LinhaRelatorio>[] = SECOES_RELATORIO.map((s) => ({
    titulo: tituloSecaoSuspensoes(ref, pag, s.vinculo, s.origem, e.parametros?.prefixoTitulo),
    nomeAba: `${rotuloVinculoTitulo(s.vinculo)} - ${s.origem}`,
    linhas: e.linhas.filter((l) => l.vinculo === s.vinculo && l.origem === s.origem),
  }));
  const notas = [`Relatório ${e.numero} — emitido por ${e.responsavel}. Cada emissão é independente; este documento preserva o conteúdo original da emissão.`, "Comunicação administrativa: a emissão não altera cadastro, pagamento nem a situação real dos beneficiários. Situações de dependentes constam na observação do titular."];
  if (e.reemissao) notas.push(`Reemissão: ${e.reemissao.registroIds.length} registro(s) já constavam em emissão anterior (duplicidade confirmada por ${e.reemissao.confirmadoPor}).`);
  if (e.linhas.some((l) => l.valorNaoAplicavel)) notas.push("N/A: valor financeiro declarado como não aplicável pela GERDAB.");
  if (e.demonstrativo) notas.push("Contém registros DEMONSTRATIVOS (fictícios) — documento de demonstração, sem valor oficial.");
  return {
    titulo: tituloEmissaoSuspensoes(e.numero, ref, pag),
    origem: "Relatório de Suspensões (NURFI)",
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
    nomeArquivoBase: `pro-saude_relatorio_suspensoes_ref-${ref}_pag-${pag}_relatorio-${e.numero}`,
    orientacaoPdf: "landscape",
  };
}

export { chaveSecao, ROTULO_VINCULO, pendenciasSuspensao };

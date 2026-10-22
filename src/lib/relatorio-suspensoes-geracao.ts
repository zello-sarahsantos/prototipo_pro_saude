/**
 * Relatório de Suspensões (NURFI) — revisão, consolidação, emissões independentes e exportação.
 *
 * Mesmo modelo do Relatório de Alterações (reaproveita o motor genérico `emissoes-relatorio.ts` com `tipoRelatorio = "suspensoes"` e
 * o motor de exportação por seções). Regras:
 *  - Só registros PRONTOS (confirmados e sem pendência impeditiva) podem ser emitidos.
 *  - Uma linha por TITULAR + competência de referência + origem de pagamento (matrícula e nome do titular). A situação de um
 *    dependente aparece na OBSERVAÇÃO da linha — nunca se estende ao grupo familiar. Observações reunidas sem frases repetidas.
 *  - O valor de toda linha é R$ 0,00 ({@link VALOR_SUSPENSAO}): os valores gravados em registros antigos NÃO são usados nem reescritos.
 *    Duas classificações diferentes para o próprio TITULAR na mesma linha (ex.: Suspender e Excluir) bloqueiam — a GERDAB corrige na conferência.
 *  - QT: titulares numerados de 1 a N em CADA seção (vínculo × origem); dependentes consolidados na linha do titular não são contados.
 *  - Título de seção: formato "v2" (gravado na emissão em `parametros.formatoTitulo`); emissões sem esse parâmetro mantêm o título original.
 *  - Cada emissão é independente (número sequencial por competência), sem justificativa; reemissão exige confirmação de duplicidade.
 *  - Emitir não altera nenhum cadastro, pagamento, elegibilidade ou situação real de beneficiário.
 */
import { emissoesDaCompetencia, numerosEmitidosPorRegistro, registrarEmissao, useEmissoes, type EmissaoRelatorio } from "./emissoes-relatorio";
import { compararAlfabetico, type RelatorioExportSpec, type SecaoExport } from "./relatorio-export";
import { ROTULO_VINCULO, identificadorTitular, type VinculoFuncional } from "./relatorio-alteracoes";
import { chaveSecao, consolidarObservacoes, mesPorExtenso, prefixoSugerido, SECOES_RELATORIO, type Bloqueio, type LinhaRelatorio } from "./relatorio-alteracoes-geracao";
import { impeditivasSuspensao, listarSuspensoes, pendenciasSuspensao, ROTULO_CLASSIFICACAO, VALOR_SUSPENSAO, type RegistroSuspensao } from "./relatorio-suspensoes";

export const TIPO_RELATORIO_SUSPENSOES = "suspensoes";
export type EmissaoSuspensoes = EmissaoRelatorio<LinhaRelatorio>;
export const useEmissoesSuspensoes = () => useEmissoes<LinhaRelatorio>(TIPO_RELATORIO_SUSPENSOES);
export const emissoesSuspensoes = (ref: string) => emissoesDaCompetencia<LinhaRelatorio>(TIPO_RELATORIO_SUSPENSOES, ref);

const rotuloVinculoTitulo = (v: VinculoFuncional) => (v === "ativo" ? "Ativos" : "Inativos");
const nomeMes = mesPorExtenso;

export const tituloEmissaoSuspensoes = (numero: number, ref: string, pag: string) => `Relatório de Suspensões — Relatório ${numero} — referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)}`;

/** Formato de título gravado nas emissões novas (`parametros.formatoTitulo`). Ausente = emissão antiga, que mantém o título original. */
export const FORMATO_TITULO_ATUAL = "v2";

const mesAno = (c: string) => `${new Date(Number(c.slice(0, 4)), Number(c.slice(5, 7)) - 1, 1).toLocaleString("pt-BR", { month: "long" })}/${c.slice(0, 4)}`;
const ROTULO_ORIGEM_TITULO: Record<string, string> = { Boletos: "Boleto" };

/** "Relatório de Suspensões — Ativos — Boleto — Referente a junho/2026 — Pagamento outubro/2026 — Inadimplentes". */
export function tituloSecaoSuspensoesV2(ref: string, pag: string, v: VinculoFuncional, origem: string): string {
  return `Relatório de Suspensões — ${rotuloVinculoTitulo(v)} — ${ROTULO_ORIGEM_TITULO[origem] ?? origem} — Referente a ${mesAno(ref)} — Pagamento ${mesAno(pag)} — Inadimplentes`;
}

/** Título de seção no padrão dos PDFs da GERDAB (formato ORIGINAL, usado só por emissões antigas); o prefixo numérico é um PARÂMETRO. */
export function tituloSecaoSuspensoes(ref: string, pag: string, v: VinculoFuncional, origem: string, prefixo?: string): string {
  const p = (prefixo ?? prefixoSugerido(pag)).trim();
  return `${p ? `${p} - ` : ""}Relatório de suspensões Pró-saúde dos ${rotuloVinculoTitulo(v)} - referente a ${nomeMes(ref)} com pagamento em ${nomeMes(pag)}/${pag.slice(0, 4)} - ${origem.toUpperCase()} - ${v === "ativo" ? "ATIVOS" : "INATIVOS"} - SUSPENSÕES`;
}

/** Título da seção conforme o formato gravado na emissão (`parametros.formatoTitulo`); sem ele, o título original da emissão antiga. */
export function tituloSecaoDaEmissao(ref: string, pag: string, v: VinculoFuncional, origem: string, parametros?: Record<string, string>): string {
  return parametros?.formatoTitulo === FORMATO_TITULO_ATUAL ? tituloSecaoSuspensoesV2(ref, pag, v, origem) : tituloSecaoSuspensoes(ref, pag, v, origem, parametros?.prefixoTitulo);
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
  // O pagamento escolhido pelo analista no relatório vale mesmo sem registro pronto nele (os demais ficam bloqueados como divergentes).
  const pagamento = pagamentoEscolhido ?? (pagamentos.length === 1 ? pagamentos[0] : undefined);
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

/** Consolida os registros SELECIONADOS (devem ser prontos) em linhas do titular. Pura: não grava nada. */
export function prepararSuspensoes(ref: string, pag: string, registros: RegistroSuspensao[], selecionados: ReadonlySet<string>): PreparacaoSuspensoes {
  const bloqueios: Bloqueio[] = [];
  // Defesa: registro selecionado com referência/pagamento diferentes dos do relatório NUNCA entra silenciosamente na emissão (nem é corrigido).
  for (const r of registros.filter((x) => selecionados.has(x.id) && x.situacao !== "descartada" && (x.competenciaReferencia !== ref || x.competenciaPagamento !== pag))) {
    bloqueios.push({ titular: r.titular.nome, registroIds: [r.id], motivos: [`Competências divergentes do relatório: referência ${r.competenciaReferencia.split("-").reverse().join("/")}, pagamento ${r.competenciaPagamento.split("-").reverse().join("/")} (o relatório é de ${ref.split("-").reverse().join("/")} · pagamento ${pag.split("-").reverse().join("/")})`] });
  }
  const usados = registros.filter((r) => selecionados.has(r.id) && r.situacao === "confirmada" && r.competenciaReferencia === ref && r.competenciaPagamento === pag).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
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
    // Exclusão do TITULAR = exclusão de todo o grupo familiar: a linha é uma só (a do titular). Registros de dependentes do mesmo grupo não
    // geram linha própria nem são descartados em silêncio: ficam citados na observação, em `movimentos` e em `registroIds` (rastreabilidade).
    const titularExcluido = g.some((r) => r.classificacao === "excluir" && r.afetado.tipo === "titular");
    const absorvidos = titularExcluido ? g.filter((r) => r.afetado.tipo === "dependente") : [];
    const observacaoLinha = titularExcluido
      ? [consolidarObservacoes(g.filter((r) => r.afetado.tipo === "titular").map((r) => r.observacao)), absorvidos.length ? `Registros de dependentes abrangidos pela exclusão do grupo familiar: ${absorvidos.map((r) => `${r.afetado.nomeDependente} (${ROTULO_CLASSIFICACAO[r.classificacao!]})`).join("; ")}.` : ""].filter(Boolean).join(" ")
      : consolidarObservacoes(g.map((r) => r.observacao));
    brutas.push({
      chave,
      vinculo: p.vinculo!,
      origem: p.origemPagamento!,
      matricula: p.titular.matricula!,
      nome: p.titular.nome,
      valor: VALOR_SUSPENSAO,
      observacao: observacaoLinha,
      registroIds: g.map((r) => r.id),
      movimentos: g.map((r) => `${ROTULO_CLASSIFICACAO[r.classificacao!]}${r.afetado.tipo === "dependente" ? ` (dependente ${r.afetado.nomeDependente})${titularExcluido ? " — abrangido pela exclusão do titular" : ""}` : r.classificacao === "excluir" ? " (titular — grupo familiar)" : ""}`),
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
export function emitirSuspensoes(ref: string, pag: string, responsavel: string, selecionados: ReadonlySet<string>, opcoes: { reemissaoConfirmada?: boolean } = {}): EmissaoSuspensoes {
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
    parametros: { formatoTitulo: FORMATO_TITULO_ATUAL },
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
    titulo: tituloSecaoDaEmissao(ref, pag, s.vinculo, s.origem, e.parametros),
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

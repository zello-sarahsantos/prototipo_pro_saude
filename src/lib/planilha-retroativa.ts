/**
 * Planilha retroativa das associações (Fase 6, ata 22/09/2026, seção 3.9).
 *
 * Fluxo: a associação (autenticada; no protótipo, simulada pelo seletor) baixa o modelo retroativo
 * (`planilha-modelo.ts`), preenche e envia. Esta camada faz a **validação em duas camadas antes do
 * envio** — (1) estrutura do cabeçalho contra o modelo da associação (`validarEstruturaModelo`);
 * (2) conteúdo linha a linha — e, com 100% das linhas válidas, **consolida por Titular +
 * Competência** (unidade financeira; dependentes só compõem `composicao`, sem lançamento próprio)
 * e cria as `SolicitacaoRetroativa` de origem `associacao` no motor (`ressarcimento-retroativo.ts`).
 *
 * Diferente do fluxo mensal ordinário (que ainda opera sobre conteúdo simulado), aqui o arquivo
 * `.xlsx` enviado é **lido de verdade** (ExcelJS, importado dinamicamente). `.csv` não é suportado.
 *
 * Regras de linha (todas objetivas, derivadas do modelo): todos os campos obrigatórios; CPFs com 11
 * dígitos; `Mês/Ano de Referência` em texto `MM/AAAA`, anterior à competência vigente; datas
 * válidas; `Valor` numérico maior que zero (cobrança/plano, sem juros — NÃO é o Valor Pago do
 * relatório); linha duplicada (mesmo titular, beneficiário e mês); titular + mês já enviado por
 * esta associação; **titular que não pertence à associação do envio** (sem associação responsável ou
 * vinculado a outra — `validarVinculoTitularAssociacao`, sem trocar nem inferir vínculo) (proteção defensiva contra reenvio do mesmo arquivo — não é um cenário de negócio, ver abaixo). **Não** valida elegibilidade de vínculo nem existência do titular na base
 * institucional: matrícula ausente é pendência cadastral tratada pela GERDAB/relatório (Fase 4).
 *
 * **Origem única:** servidor vinculado a Associação tem comprovação ordinária e retroativa só pela
 * Associação (`origem-comprovacao.ts` bloqueia o envio individual no Portal); por isso não há
 * conciliação nem escolha entre "Portal × Associação" para o mesmo Titular + Competência.
 *
 * A associação nunca informa Valor Pago, Valor Devido, matrícula nem Mês/Ano de Pagamento.
 */
import { validarVinculoTitularAssociacao } from "./base-institucional";
import { competenciaAtual } from "./mock-data";
import {
  loadPlanilhasRetroativasOriginais,
  savePlanilhasRetroativasOriginais,
  type PlanilhaRetroativaOriginal,
} from "./prosaude-storage";
import { getColunasModelo, LINHA_CABECALHO_MODELO, validarEstruturaModelo } from "./planilhas-associacao";
import {
  criarSolicitacaoRetroativa,
  type CompetenciaRetroativa,
  getSolicitacoesRetroativas,
  type ComposicaoRegistroRetroativo,
  type MotivoRessarcimento,
  type SolicitacaoRetroativa,
} from "./ressarcimento-retroativo";

export interface ErroLinhaRetroativa {
  /** Número da linha no arquivo (1-based); 0 = erro geral do arquivo. */
  linha: number;
  mensagem: string;
}

/** Um titular + competência consolidado a partir de N linhas de beneficiários. */
export interface RegistroRetroativoConsolidado {
  cpfTitular: string;
  nomeTitular: string;
  /** `AAAA-MM`. */
  competencia: string;
  composicao: ComposicaoRegistroRetroativo[];
  /** Soma das cobranças das linhas do grupo (valor da cobrança/plano, sem juros). */
  valorCobranca: number;
  /** ISO `AAAA-MM-DD` — da primeira linha do grupo. */
  dataEmissaoBoleto: string;
  vencimento: string;
  dataBaixa: string;
}

export interface ResultadoLeituraRetroativa {
  estruturaValida: boolean;
  problemasEstrutura: string[];
  totalLinhas: number;
  linhasValidas: number;
  erros: ErroLinhaRetroativa[];
  /** Vazio enquanto houver erro — só há consolidação com 100% das linhas válidas. */
  registros: RegistroRetroativoConsolidado[];
}

type Celula = unknown;

function textoCelula(v: Celula): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown };
    if (o.richText) return o.richText.map((t) => t.text).join("").trim();
    if (typeof o.text === "string") return o.text.trim();
    if (o.result !== undefined) return textoCelula(o.result);
  }
  return "";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Data → ISO `AAAA-MM-DD`. Aceita célula de data ou texto `dd/mm/aaaa`; `undefined` se inválida. */
function lerData(v: Celula): string | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  const m = typeof v === "string" ? v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null;
  if (!m) return undefined;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, mes - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d ? `${a}-${pad(mes)}-${pad(d)}` : undefined;
}

function formatarCpf(v: Celula): string | undefined {
  const digitos = textoCelula(v).replace(/\D/g, "");
  // CPF lido como número perde zeros à esquerda (ex.: relatório da ASSETRAN) — completa até 11.
  const completo = typeof v === "number" ? digitos.padStart(11, "0") : digitos;
  if (completo.length !== 11) return undefined;
  return `${completo.slice(0, 3)}.${completo.slice(3, 6)}.${completo.slice(6, 9)}-${completo.slice(9)}`;
}

/** `MM/AAAA` (texto) → `AAAA-MM`; `undefined` se fora do formato. */
function lerMesAno(v: Celula): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = v.trim().match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : undefined;
}

/** Titular + competência já enviados (qualquer estado) por esta associação — checagem defensiva do motor (ex.: reenvio do mesmo arquivo), não fluxo esperado de negócio. */
export function getCompetenciasJaEnviadasAssociacao(associacao: string): Set<string> {
  const ja = new Set<string>();
  getSolicitacoesRetroativas()
    .filter((s) => s.origem === "associacao" && s.associacao === associacao)
    .forEach((s) => s.competencias.forEach((c) => ja.add(`${s.cpfTitular.replace(/\D/g, "")}|${c.competenciaReferencia}`)));
  return ja;
}

/** Lê e valida o arquivo retroativo enviado. Nunca lança para conteúdo inválido — devolve os problemas. */
export async function lerPlanilhaRetroativa(arquivo: ArrayBuffer, associacao: string): Promise<ResultadoLeituraRetroativa> {
  const vazio = (problemas: string[]): ResultadoLeituraRetroativa => ({
    estruturaValida: false,
    problemasEstrutura: problemas,
    totalLinhas: 0,
    linhasValidas: 0,
    erros: [],
    registros: [],
  });

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arquivo);
  } catch {
    return vazio(["Arquivo não é um .xlsx válido."]);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return vazio(["O arquivo não possui nenhuma aba."]);

  // Camada 1 — estrutura do cabeçalho.
  const colunas = getColunasModelo(associacao, "retroativo");
  const cabecalho = colunas.map((_, i) => textoCelula(sheet.getRow(LINHA_CABECALHO_MODELO).getCell(i + 1).value));
  // Colunas extras à direita do modelo também precisam ser detectadas.
  const extras: string[] = [];
  for (let c = colunas.length + 1; c <= sheet.getRow(LINHA_CABECALHO_MODELO).cellCount; c++) {
    const t = textoCelula(sheet.getRow(LINHA_CABECALHO_MODELO).getCell(c).value);
    if (t) extras.push(t);
  }
  const estrutura = validarEstruturaModelo([...cabecalho, ...extras], associacao, "retroativo");
  if (!estrutura.valida) return { ...vazio(estrutura.problemas), estruturaValida: false };

  // Camada 2 — conteúdo linha a linha.
  const jaEnviadas = getCompetenciasJaEnviadasAssociacao(associacao);
  const erros: ErroLinhaRetroativa[] = [];
  const grupos = new Map<string, RegistroRetroativoConsolidado>();
  const vistas = new Set<string>();
  let totalLinhas = 0;
  let linhasValidas = 0;

  for (let n = LINHA_CABECALHO_MODELO + 1; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    const v = colunas.map((_, i) => row.getCell(i + 1).value);
    if (v.every((c) => textoCelula(c) === "")) continue;
    totalLinhas++;
    const problemas: string[] = [];

    const servidor = textoCelula(v[0]);
    const cpfTitular = formatarCpf(v[1]);
    const beneficiario = textoCelula(v[2]);
    const cpfBenef = formatarCpf(v[3]);
    const vinculo = textoCelula(v[4]);
    const competencia = lerMesAno(v[5]);
    const emissao = lerData(v[6]);
    const vencimento = lerData(v[7]);
    const baixa = lerData(v[8]);
    const valor = typeof v[9] === "number" ? v[9] : undefined;
    const plano = textoCelula(v[10]);
    const rotuloPlano = colunas[10];

    if (!servidor) problemas.push(`${colunas[0]} não informado.`);
    if (!cpfTitular) problemas.push(`${colunas[1]} inválido (11 dígitos) — apague as linhas de exemplo do modelo.`);
    else {
      // Vínculo Associação × Titular (fonte institucional simulada): a associação só envia os seus titulares.
      const divergencia = validarVinculoTitularAssociacao(cpfTitular, servidor, associacao);
      if (divergencia) problemas.push(divergencia);
    }
    if (!beneficiario) problemas.push(`${colunas[2]} não informado.`);
    if (!cpfBenef) problemas.push(`${colunas[3]} inválido (11 dígitos).`);
    if (!vinculo) problemas.push(`${colunas[4]} não informado.`);
    if (!competencia) problemas.push(`${colunas[5]} inválido — use texto no formato MM/AAAA.`);
    else if (competencia >= competenciaAtual) problemas.push(`${colunas[5]} deve ser anterior à competência vigente.`);
    if (!emissao) problemas.push(`${colunas[6]} inválida.`);
    if (!vencimento) problemas.push(`${colunas[7]} inválido.`);
    if (!baixa) problemas.push(`${colunas[8]} inválida.`);
    if (valor === undefined || !(valor > 0)) problemas.push(`${colunas[9]} deve ser um número maior que zero.`);
    if (!plano) problemas.push(`${rotuloPlano} não informado.`);

    if (problemas.length === 0) {
      const chaveTitular = cpfTitular!.replace(/\D/g, "");
      const chaveLinha = `${chaveTitular}|${cpfBenef!.replace(/\D/g, "")}|${competencia}`;
      if (vistas.has(chaveLinha)) problemas.push("Linha duplicada (mesmo titular, beneficiário e mês de referência).");
      vistas.add(chaveLinha);
      if (jaEnviadas.has(`${chaveTitular}|${competencia}`)) problemas.push("Envio já registrado por esta associação para este titular e mês de referência (não reenviar).");
    }

    if (problemas.length > 0) {
      problemas.forEach((mensagem) => erros.push({ linha: n, mensagem }));
      continue;
    }
    linhasValidas++;
    const chave = `${cpfTitular!.replace(/\D/g, "")}|${competencia}`;
    const grupo = grupos.get(chave) ?? {
      cpfTitular: cpfTitular!,
      nomeTitular: servidor,
      competencia: competencia!,
      composicao: [],
      valorCobranca: 0,
      dataEmissaoBoleto: emissao!,
      vencimento: vencimento!,
      dataBaixa: baixa!,
    };
    grupo.composicao.push({ beneficiario, cpf: cpfBenef!, vinculo, valorCobranca: valor!, plano });
    grupo.valorCobranca = Math.round((grupo.valorCobranca + valor!) * 100) / 100;
    grupos.set(chave, grupo);
  }

  if (totalLinhas === 0) erros.push({ linha: 0, mensagem: "Nenhuma linha de dados encontrada abaixo do cabeçalho." });

  return {
    estruturaValida: true,
    problemasEstrutura: [],
    totalLinhas,
    linhasValidas,
    erros,
    registros: erros.length === 0 ? [...grupos.values()] : [],
  };
}

export interface EnvioRetroativoAssociacaoInput {
  /** Arquivo enviado: nome e (protótipo) conteúdo como data URL, para a GERDAB/associação baixarem o original. */
  arquivo?: { nome: string; conteudo?: string };
  associacao: string;
  registros: RegistroRetroativoConsolidado[];
}

/**
 * Cria uma `SolicitacaoRetroativa` (origem associação) por titular, com uma competência por mês —
 * nunca somando meses. Os registros nascem "habilitados" por derivação (ausência de decisão), o
 * que **não** é autorização financeira: a GERDAB ainda apura Valor Pago/Devido e confere o
 * contracheque (`estaAutorizada`). Só envia com validação 100% concluída (`registros` do resultado).
 */
export function enviarRetroativoAssociacao(input: EnvioRetroativoAssociacaoInput): SolicitacaoRetroativa[] {
  if (input.registros.length === 0) throw new Error("Nenhum registro válido para enviar.");
  const arquivoId = registrarPlanilhaOriginal({ associacao: input.associacao, nome: input.arquivo?.nome ?? `planilha_retroativa_${input.associacao.toLowerCase()}.xlsx`, conteudo: input.arquivo?.conteudo });
  const porTitular = new Map<string, RegistroRetroativoConsolidado[]>();
  for (const r of input.registros) {
    const k = r.cpfTitular.replace(/\D/g, "");
    porTitular.set(k, [...(porTitular.get(k) ?? []), r]);
  }
  return [...porTitular.values()].map((regs) =>
    criarSolicitacaoRetroativa({
      origem: "associacao",
      associacao: input.associacao,
      cpfTitular: regs[0].cpfTitular,
      nomeTitular: regs[0].nomeTitular,
      arquivoId,
      competencias: regs
        .sort((a, b) => a.competencia.localeCompare(b.competencia))
        .map((r) => ({
          competenciaReferencia: r.competencia,
          dataEmissaoBoleto: r.dataEmissaoBoleto,
          vencimento: r.vencimento,
          dataBaixa: r.dataBaixa,
          composicao: r.composicao,
        })),
    }),
  );
}

/* ── Planilha original enviada (fonte de comprovação da origem Associação) ────────────────────── */

/** Registra a planilha enviada e devolve o id que as solicitações referenciam (`arquivoId`). */
export function registrarPlanilhaOriginal(p: Omit<PlanilhaRetroativaOriginal, "id" | "enviadoEm"> & { enviadoEm?: string }): string {
  const id = `plan-retro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  savePlanilhasRetroativasOriginais([...loadPlanilhasRetroativasOriginais(), { ...p, id, enviadoEm: p.enviadoEm ?? new Date().toISOString() }]);
  return id;
}

export function getPlanilhaOriginal(id: string | undefined): PlanilhaRetroativaOriginal | undefined {
  return id ? loadPlanilhasRetroativasOriginais().find((p) => p.id === id) : undefined;
}

/** Planilhas enviadas por uma associação, com quantos titulares e competências cada uma contém. */
export function listarEnviosPlanilhaAssociacao(associacao: string) {
  const solicitacoes = getSolicitacoesRetroativas();
  return loadPlanilhasRetroativasOriginais()
    .filter((p) => p.associacao === associacao)
    .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))
    .map((p) => {
      const doArquivo = solicitacoes.filter((s) => s.arquivoId === p.id);
      return { planilha: p, titulares: doArquivo.length, competencias: doArquivo.reduce((n, s) => n + s.competencias.length, 0) };
    });
}

/**
 * Arquivo original enviado pela associação. Com conteúdo guardado devolve exatamente o arquivo; sem
 * conteúdo (massa de demonstração ou arquivo acima do limite do protótipo) reconstrói o `.xlsx` no
 * modelo retroativo da associação com os registros já normalizados — a nota da linha 2 diz isso.
 */
export async function obterArquivoPlanilhaOriginal(id: string): Promise<{ blob: Blob; nome: string; reconstruido: boolean } | undefined> {
  const p = getPlanilhaOriginal(id);
  if (!p) return undefined;
  if (p.conteudo) return { blob: await (await fetch(p.conteudo)).blob(), nome: p.nome, reconstruido: false };

  const ExcelJS = (await import("exceljs")).default;
  const colunas = getColunasModelo(p.associacao, "retroativo");
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(`${p.associacao} retroativo`.slice(0, 31));
  sheet.getCell("A1").value = `Envio retroativo — ${p.associacao.toUpperCase()} — enviado em ${new Date(p.enviadoEm).toLocaleDateString("pt-BR")}`;
  sheet.getCell("A2").value = "Reconstrução dos registros normalizados, gerada pelo protótipo — o arquivo literal enviado não está armazenado.";
  sheet.getRow(LINHA_CABECALHO_MODELO).values = colunas;
  sheet.getRow(LINHA_CABECALHO_MODELO).font = { bold: true };
  let n = LINHA_CABECALHO_MODELO + 1;
  for (const l of getLinhasPlanilhaCompleta(id)) {
    sheet.getRow(n++).values = [l.titular, l.cpfTitular, l.beneficiario, l.cpfBeneficiario, l.vinculo, l.referencia, l.emissao, l.vencimento, l.baixa, l.valor, l.plano];
  }
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nome: p.nome, reconstruido: true };
}

export interface LinhaPlanilhaRetroativa {
  titular: string;
  cpfTitular: string;
  beneficiario: string;
  cpfBeneficiario: string;
  vinculo: string;
  /** `MM/AAAA`. */
  referencia: string;
  /** Datas em `dd/mm/aaaa` (vazio se não informada). */
  emissao: string;
  vencimento: string;
  baixa: string;
  valor: number;
  plano: string;
  /** Chave da competência (`AAAA-MM`) e do titular, para destacar/filtrar o recorte analisado. */
  competenciaReferencia: string;
}

const dataBR = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");

/** Linhas de UM registro (titular + competência) no formato da planilha — o recorte "Dados deste titular nesta
 *  planilha". Vem da própria composição do registro, então nunca fica vazio para uma competência de Associação. */
export function getLinhasDoRegistro(s: SolicitacaoRetroativa, c: CompetenciaRetroativa): LinhaPlanilhaRetroativa[] {
  const [ano, mes] = c.competenciaReferencia.split("-");
  return (c.composicao ?? []).map((l) => ({
    titular: s.nomeTitular,
    cpfTitular: s.cpfTitular,
    beneficiario: l.beneficiario,
    cpfBeneficiario: l.cpf,
    vinculo: l.vinculo,
    referencia: `${mes}/${ano}`,
    emissao: dataBR(c.dataEmissaoBoleto),
    vencimento: dataBR(c.vencimento),
    baixa: dataBR(c.dataBaixa),
    valor: l.valorCobranca,
    plano: l.plano ?? "",
    competenciaReferencia: c.competenciaReferencia,
  }));
}

/**
 * Linhas da planilha completa enviada pela associação, para "Visualizar planilha" e para a reconstrução do
 * arquivo. **LIMITAÇÃO DO PROTÓTIPO:** as linhas são remontadas dos registros já normalizados das solicitações
 * que referenciam o arquivo (`arquivoId`) — não da leitura do `.xlsx` armazenado. Em produção, a visualização
 * e o download devem usar o XLSX efetivamente enviado e armazenado.
 */
export function getLinhasPlanilhaCompleta(arquivoId: string): LinhaPlanilhaRetroativa[] {
  const linhas: LinhaPlanilhaRetroativa[] = [];
  for (const s of getSolicitacoesRetroativas().filter((x) => x.arquivoId === arquivoId)) {
    for (const c of s.competencias) {
      const [ano, mes] = c.competenciaReferencia.split("-");
      for (const l of c.composicao ?? []) {
        linhas.push({
          titular: s.nomeTitular,
          cpfTitular: s.cpfTitular,
          beneficiario: l.beneficiario,
          cpfBeneficiario: l.cpf,
          vinculo: l.vinculo,
          referencia: `${mes}/${ano}`,
          emissao: dataBR(c.dataEmissaoBoleto),
          vencimento: dataBR(c.vencimento),
          baixa: dataBR(c.dataBaixa),
          valor: l.valorCobranca,
          plano: l.plano ?? "",
          competenciaReferencia: c.competenciaReferencia,
        });
      }
    }
  }
  return linhas;
}

/** Quantos titulares e competências a planilha enviada contém (quando disponível). */
export function getResumoPlanilha(arquivoId: string): { titulares: number; competencias: number } {
  const doArquivo = getSolicitacoesRetroativas().filter((s) => s.arquivoId === arquivoId);
  return { titulares: doArquivo.length, competencias: doArquivo.reduce((n, s) => n + s.competencias.length, 0) };
}

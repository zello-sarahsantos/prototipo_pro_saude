/**
 * Camada comum de exportação (PDF/XLSX) para os relatórios administrativos do Módulo de
 * Relatórios. Um único formato de especificação (`RelatorioExportSpec`) alimenta tanto o PDF
 * (`relatorio-export-pdf.ts`) quanto o XLSX (`relatorio-export-xlsx.ts`) — nenhuma tela monta
 * seu próprio PDF/XLSX, e nenhuma consulta/classificação/agregação é duplicada aqui: cada tela
 * continua calculando seus dados do jeito que já calcula (mesmas funções de
 * `fechamento-pagamento.ts`/`visoes-gerenciais.ts`/etc.) e só entrega o resultado já filtrado
 * (sem paginação visual) para esta camada formatar.
 *
 * Identidade documental (cabeçalho institucional, título, tabela, rodapé paginado) inspirada no
 * padrão SISPRO fornecido como referência (`relatorio-de-seguradoras.pdf`/`.xlsx`) — mas as
 * colunas de cada relatório são sempre as do modelo de dados novo do Pró-Saúde, nunca as do
 * legado (ver `docs/MODULO_RELATORIOS.md`, seção de Exportação).
 */

/** "decimal": número com 2 casas e vírgula, sem símbolo de moeda nem separador de milhar ("4000,00") — formato dos
 *  modelos de relatório enviados ao NURFI (Relatório de Alterações). "moeda" continua "R$ 4.000,00". */
export type TipoColunaExport = "texto" | "numero" | "moeda" | "percentual" | "decimal";

export interface ColunaExport<T> {
  /** Cabeçalho exibido — igual ao já usado na tela (nunca um nome técnico/coluna interna). */
  header: string;
  /** Extrai o valor bruto da linha — número para tipos numéricos, string para texto. */
  valor: (linha: T) => string | number;
  tipo?: TipoColunaExport;
  align?: "left" | "center" | "right";
  /** Largura aproximada em caracteres — usada para a largura de coluna no XLSX. */
  width?: number;
  /** Largura da coluna no PDF, em mm (opcional). Sem ela, o PDF distribui a largura automaticamente (comportamento de sempre). */
  larguraPdf?: number;
}

/** Uma seção de um relatório com várias tabelas (ex.: Ativos/Inativos × Boletos/ASSEFAZ/ASSETRAN), cada uma com título
 *  próprio. Usada via `RelatorioExportSpec.secoes`. */
export interface SecaoExport<T> {
  /** Título da seção, impresso como primeira linha do cabeçalho da tabela (repetido em cada página da seção). */
  titulo: string;
  /** Nome da aba no XLSX (opcional; senão deriva do título, máx. 31 caracteres, sem repetir nomes). */
  nomeAba?: string;
  linhas: T[];
}

export interface LinhaTotalExport {
  /** Rótulo da primeira coluna da linha de total (ex.: "Total"). */
  label: string;
  /** Valores das demais colunas, na mesma ordem de `colunas` — `null`/`undefined` para células
   *  vazias (ex.: colunas que não fazem sentido somar). */
  valores: (string | number | null | undefined)[];
}

export interface RelatorioExportSpec<T> {
  /** Título do relatório, como já exibido na tela (ex.: "Consolidado por Operadora / Seguradora"). */
  titulo: string;
  /** Nome do módulo/tela de origem, para o cabeçalho institucional (ex.: "Visões Gerenciais"). */
  origem: string;
  /** Competência/período — omitido quando o relatório é uma fotografia sem recorte temporal. */
  competencia?: string;
  /** Rótulo exibido antes de `competencia` (ex.: "Competência", "Ano-calendário"). Padrão:
   *  "Competência" — só é preciso informar quando o período do relatório não é uma competência
   *  mensal (ex.: o Comprovante de Rendimentos, que é anual). */
  rotuloCompetencia?: string;
  /** Descrição legível dos filtros aplicados na tela no momento da exportação (ex.:
   *  ["Vínculo: Ativos", "Operadora: Bradesco"]) — vazio quando nenhum filtro está ativo. */
  filtrosAplicados: string[];
  /** Quando true, e `filtrosAplicados` estiver vazio, omite a linha "Filtros: Todos" — usado por
   *  documentos individuais (ex.: Comprovante de Rendimentos) onde "filtros" não é um conceito
   *  relevante e a linha soaria fora de contexto num documento formal de uma só pessoa. Se
   *  `filtrosAplicados` não estiver vazio, a linha é sempre exibida independente desta opção. */
  ocultarLinhaFiltrosSeVazia?: boolean;
  /** Bloco opcional de identificação (ex.: Nome/Matrícula/CPF do titular), exibido entre o título
   *  e os parâmetros — usado por documentos individuais que precisam identificar a pessoa a quem
   *  o documento se refere, algo que não se aplica a relatórios administrativos agregados. */
  identificacao?: { label: string; valor: string }[];
  colunas: ColunaExport<T>[];
  /** Cabeçalho agrupado opcional (linha acima dos cabeçalhos das colunas): cada item cobre `span`
   *  colunas consecutivas, na ordem; a soma dos `span` deve ser igual a `colunas.length`. Rótulo
   *  vazio = célula sem título (ex.: a coluna de descrição). Usado pelo Relatório NUPLA. */
  gruposCabecalho?: { rotulo: string; span: number }[];
  /** Documentos com data de EMISSÃO própria (ex.: versão definitiva de um relatório): ISO 8601. Quando informada, o cabeçalho traz
   *  "Data de emissão" (esta) e "Data de exportação" (o momento do download) em vez do "Gerado em" — reexportar uma versão antiga
   *  preserva a emissão original. Omitida = "Gerado em" como sempre. */
  dataEmissao?: string;
  /** Nome da aba no XLSX; se omitido, deriva do título (máx. 31 caracteres). */
  nomeAba?: string;
  /** Notas explicativas impressas abaixo da tabela (PDF) e em linhas após o total (XLSX). */
  notas?: string[];
  /** Linhas já filtradas exatamente como exibidas na tela — nunca só a página visual atual. Com `secoes`, é ignorado
   *  (use `[]`). */
  linhas: T[];
  /** Opcional. Relatório com várias tabelas: PDF = uma seção por página (quebra automática se passar de uma), XLSX = uma
   *  aba por seção. As seções vazias não são impressas (`manterSecoesVazias` as imprime com a mensagem "Sem registros").
   *  Sem `secoes`, o comportamento é exatamente o de sempre. `linhaTotal` não é usado em modo de seções. */
  secoes?: SecaoExport<T>[];
  manterSecoesVazias?: boolean;
  /** Só com `secoes`. Ordena as linhas de cada seção em ordem alfabética (pt-BR, sem distinguir acento/caixa) pela chave
   *  informada. Omitido = mantém a ordem recebida. */
  ordenarPor?: (linha: T) => string;
  /** Só com `secoes`. Acrescenta uma última coluna de numeração (1..n) que **recomeça em cada seção**. */
  numeracao?: { cabecalho: string };
  linhaTotal?: LinhaTotalExport;
  /** Base do nome do arquivo, sem extensão e sem acentos/espaços (ex.: "pro-saude_visao_operadoras_2026-09"). */
  nomeArquivoBase: string;
  /** PDF em paisagem quando a quantidade de colunas exigir — se omitido, decidido automaticamente. */
  orientacaoPdf?: "portrait" | "landscape";
}

export function decidirOrientacao<T>(spec: RelatorioExportSpec<T>): "portrait" | "landscape" {
  return spec.orientacaoPdf ?? (spec.colunas.length + (spec.secoes && spec.numeracao ? 1 : 0) > 5 ? "landscape" : "portrait");
}

/** Seção já preparada para impressão: linhas ordenadas e, quando pedido, com o número QT da própria seção. */
export interface SecaoPreparada<T> {
  titulo: string;
  nomeAba: string;
  linhas: { linha: T; qt?: number }[];
}

/** Ordem alfabética pt-BR (ignora acento e caixa; números em ordem natural) — a mesma para PDF e XLSX. */
export const compararAlfabetico = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });

/** Nome de aba válido e único: máx. 31 caracteres, sem `* ? : \ / [ ]`; repetições ganham sufixo " (2)", " (3)". */
function nomesDeAbaUnicos(nomes: string[]): string[] {
  const usados = new Set<string>();
  return nomes.map((bruto) => {
    const base = (bruto.replace(/[*?:\\/[\]]/g, "-").trim() || "Relatório").slice(0, 31);
    let nome = base;
    for (let n = 2; usados.has(nome.toLowerCase()); n++) {
      const sufixo = ` (${n})`;
      nome = base.slice(0, 31 - sufixo.length) + sufixo;
    }
    usados.add(nome.toLowerCase());
    return nome;
  });
}

/** Único ponto que decide seções, ordenação e numeração QT — PDF e XLSX consomem exatamente o mesmo resultado. */
export function prepararSecoes<T>(spec: RelatorioExportSpec<T>): SecaoPreparada<T>[] {
  const secoes = (spec.secoes ?? []).filter((s) => spec.manterSecoesVazias || s.linhas.length > 0);
  const abas = nomesDeAbaUnicos(secoes.map((s) => s.nomeAba ?? s.titulo));
  return secoes.map((s, i) => {
    const ordenadas = spec.ordenarPor ? [...s.linhas].sort((a, b) => compararAlfabetico(spec.ordenarPor!(a), spec.ordenarPor!(b))) : [...s.linhas];
    return { titulo: s.titulo, nomeAba: abas[i], linhas: ordenadas.map((linha, k) => ({ linha, qt: spec.numeracao ? k + 1 : undefined })) };
  });
}

/** Formata um valor de célula para exibição textual (PDF e fallback do XLSX) — moeda/percentual
 *  seguem o padrão pt-BR já usado no restante do protótipo (`formatCurrency`, `mock-data.ts`). */
export function formatarValorExport(valor: string | number, tipo: TipoColunaExport = "texto"): string {
  if (typeof valor === "string") return valor;
  if (tipo === "moeda") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (tipo === "decimal") {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  }
  if (tipo === "percentual") {
    return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  return valor.toLocaleString("pt-BR");
}

/** Data/hora de geração do documento, no padrão pt-BR — chamada no momento da exportação (não
 *  recebida do spec), a mesma função usada por PDF e XLSX para nunca haver divergência entre os
 *  dois formatos. */
/** Sempre horário de Brasília (America/Sao_Paulo), explicitamente — independente do fuso do
 *  navegador/servidor de quem gera o arquivo. Documento oficial não deve variar de horário
 *  conforme o timezone de quem clicou em exportar. */
export function formatarDataHoraGeracao(data: Date = new Date()): string {
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Linhas de data do cabeçalho — única regra, usada por PDF e XLSX. */
export function linhasDeData<T>(spec: RelatorioExportSpec<T>): string[] {
  if (!spec.dataEmissao) return [`Gerado em: ${formatarDataHoraGeracao()}`];
  return [`Data de emissão: ${formatarDataHoraGeracao(new Date(spec.dataEmissao))}`, `Data de exportação: ${formatarDataHoraGeracao()}`];
}

/** Texto da linha de filtros/parâmetros do relatório — "Filtros: Todos" quando nada está ativo,
 *  senão só os filtros efetivamente aplicados, separados por " • ". Único ponto que decide essa
 *  regra, reaproveitado por PDF e XLSX. */
export function textoFiltros(filtrosAplicados: string[]): string {
  return filtrosAplicados.length > 0 ? `Filtros: ${filtrosAplicados.join(" • ")}` : "Filtros: Todos";
}

/** Dispara o download de um Blob já pronto — único ponto que toca o DOM (createObjectURL +
 *  clique num link temporário), reaproveitado pelos dois formatos. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CABECALHO_INSTITUCIONAL = [
  "GOVERNO DO DISTRITO FEDERAL",
  "SECRETARIA DE SEGURANÇA PÚBLICA",
  "DEPARTAMENTO DE TRÂNSITO DO DISTRITO FEDERAL",
] as const;

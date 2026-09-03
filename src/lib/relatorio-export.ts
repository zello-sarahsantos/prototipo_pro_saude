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

export type TipoColunaExport = "texto" | "numero" | "moeda" | "percentual";

export interface ColunaExport<T> {
  /** Cabeçalho exibido — igual ao já usado na tela (nunca um nome técnico/coluna interna). */
  header: string;
  /** Extrai o valor bruto da linha — número para tipos numéricos, string para texto. */
  valor: (linha: T) => string | number;
  tipo?: TipoColunaExport;
  align?: "left" | "center" | "right";
  /** Largura aproximada em caracteres — usada para a largura de coluna no XLSX. */
  width?: number;
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
  /** Descrição legível dos filtros aplicados na tela no momento da exportação (ex.:
   *  ["Vínculo: Ativos", "Operadora: Bradesco"]) — vazio quando nenhum filtro está ativo. */
  filtrosAplicados: string[];
  colunas: ColunaExport<T>[];
  /** Linhas já filtradas exatamente como exibidas na tela — nunca só a página visual atual. */
  linhas: T[];
  linhaTotal?: LinhaTotalExport;
  /** Base do nome do arquivo, sem extensão e sem acentos/espaços (ex.: "pro-saude_visao_operadoras_2026-09"). */
  nomeArquivoBase: string;
  /** PDF em paisagem quando a quantidade de colunas exigir — se omitido, decidido automaticamente. */
  orientacaoPdf?: "portrait" | "landscape";
}

export function decidirOrientacao<T>(spec: RelatorioExportSpec<T>): "portrait" | "landscape" {
  return spec.orientacaoPdf ?? (spec.colunas.length > 5 ? "landscape" : "portrait");
}

/** Formata um valor de célula para exibição textual (PDF e fallback do XLSX) — moeda/percentual
 *  seguem o padrão pt-BR já usado no restante do protótipo (`formatCurrency`, `mock-data.ts`). */
export function formatarValorExport(valor: string | number, tipo: TipoColunaExport = "texto"): string {
  if (typeof valor === "string") return valor;
  if (tipo === "moeda") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

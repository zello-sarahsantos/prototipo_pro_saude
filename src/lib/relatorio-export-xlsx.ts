/**
 * Geração de XLSX institucional para os relatórios administrativos — motor único (ExcelJS),
 * consumido por todos os relatórios via `RelatorioExportSpec` (ver `relatorio-export.ts`).
 * Estrutura equivalente ao PDF (mesmo cabeçalho institucional, título, período/filtros) mais o
 * que só faz sentido em planilha: cabeçalho congelado, autofiltro, formatos de número/moeda/
 * percentual nativos (não texto), larguras de coluna ajustadas. Nenhuma coluna técnica/ID
 * interno — as colunas exportadas são sempre as mesmas já validadas na tela.
 */
import ExcelJS from "exceljs";
import {
  CABECALHO_INSTITUCIONAL,
  formatarDataHoraGeracao,
  textoFiltros,
  type RelatorioExportSpec,
} from "./relatorio-export";

const NUM_FORMATS: Record<string, string> = {
  moeda: '"R$" #,##0.00',
  percentual: "0.0%",
  numero: "#,##0",
  texto: "@",
};

/** Nome de aba do Excel: máx. 31 caracteres e sem `* ? : \ / [ ]` (limitação do formato .xlsx,
 *  não do ExcelJS) — o título do relatório costuma ter "/" (ex.: "Operadora / Seguradora"),
 *  então nunca usar o título bruto como nome de aba. */
function nomeAbaValido(titulo: string): string {
  const limpo = titulo.replace(/[*?:\\/[\]]/g, "-").trim();
  return (limpo || "Relatório").slice(0, 31);
}

export async function buildRelatorioXlsxBlob<T>(spec: RelatorioExportSpec<T>): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pró-Saúde";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(nomeAbaValido(spec.titulo));

  const totalColunas = spec.colunas.length;

  function mergeCentralizada(texto: string, linha: number, negrito = true, tamanho = 12) {
    sheet.mergeCells(linha, 1, linha, totalColunas);
    const cell = sheet.getCell(linha, 1);
    cell.value = texto;
    cell.font = { name: "Times New Roman", size: tamanho, bold: negrito };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  let linhaAtual = 1;
  CABECALHO_INSTITUCIONAL.forEach((texto) => {
    mergeCentralizada(texto, linhaAtual, true, 12);
    linhaAtual++;
  });
  mergeCentralizada(`Pró-Saúde — ${spec.origem}`, linhaAtual, false, 10);
  linhaAtual += 2; // linha em branco
  mergeCentralizada(spec.titulo, linhaAtual, true, 12);
  linhaAtual++;

  if (spec.competencia) {
    mergeCentralizada(`Competência: ${spec.competencia}`, linhaAtual, false, 10);
    linhaAtual++;
  }
  mergeCentralizada(textoFiltros(spec.filtrosAplicados), linhaAtual, false, 10);
  linhaAtual++;
  mergeCentralizada(`Gerado em: ${formatarDataHoraGeracao()}`, linhaAtual, false, 10);
  linhaAtual += 2; // linha em branco antes do cabeçalho da tabela

  const linhaCabecalho = linhaAtual;
  spec.colunas.forEach((coluna, i) => {
    const cell = sheet.getCell(linhaCabecalho, i + 1);
    cell.value = coluna.header;
    cell.font = { name: "Times New Roman", size: 10, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  spec.linhas.forEach((linha, indiceLinha) => {
    const linhaExcel = linhaCabecalho + 1 + indiceLinha;
    spec.colunas.forEach((coluna, i) => {
      const cell = sheet.getCell(linhaExcel, i + 1);
      const bruto = coluna.valor(linha);
      cell.value = bruto;
      cell.font = { name: "Times New Roman", size: 10 };
      cell.alignment = { horizontal: coluna.align ?? (coluna.tipo === "texto" || !coluna.tipo ? "left" : "right") };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      if (coluna.tipo && coluna.tipo !== "texto" && typeof bruto === "number") {
        cell.numFmt = NUM_FORMATS[coluna.tipo];
        if (coluna.tipo === "percentual") cell.value = bruto / 100;
      }
    });
  });

  const ultimaLinhaDados = linhaCabecalho + spec.linhas.length;
  let ultimaLinha = ultimaLinhaDados;

  if (spec.linhaTotal) {
    ultimaLinha += 1;
    const cellLabel = sheet.getCell(ultimaLinha, 1);
    cellLabel.value = spec.linhaTotal.label;
    cellLabel.font = { name: "Times New Roman", size: 10, bold: true };
    cellLabel.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    spec.linhaTotal.valores.forEach((valor, i) => {
      const coluna = spec.colunas[i + 1];
      const cell = sheet.getCell(ultimaLinha, i + 2);
      if (valor !== null && valor !== undefined) {
        cell.value = coluna?.tipo === "percentual" && typeof valor === "number" ? valor / 100 : valor;
        if (coluna?.tipo && coluna.tipo !== "texto" && typeof valor === "number") cell.numFmt = NUM_FORMATS[coluna.tipo];
      }
      cell.font = { name: "Times New Roman", size: 10, bold: true };
      cell.alignment = { horizontal: coluna?.align ?? "right" };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });
  }

  // Largura de coluna: usa `width` do spec quando informado, senão estima pelo cabeçalho.
  spec.colunas.forEach((coluna, i) => {
    sheet.getColumn(i + 1).width = coluna.width ?? Math.max(coluna.header.length + 4, 12);
  });

  // Cabeçalho congelado (linhas institucionais + título/filtros + cabeçalho da tabela ficam
  // fixas ao rolar) e autofiltro cobrindo cabeçalho + linhas de dados (nunca só o cabeçalho —
  // do contrário o filtro aparece mas não tem nada para filtrar; a linha de Total, quando
  // existe, fica fora do autofiltro para não ser escondida/confundida com dado filtrável).
  sheet.views = [{ state: "frozen", ySplit: linhaCabecalho, xSplit: 0 }];
  if (spec.linhas.length > 0) {
    sheet.autoFilter = {
      from: { row: linhaCabecalho, column: 1 },
      to: { row: ultimaLinhaDados, column: totalColunas },
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportarRelatorioXLSX<T>(spec: RelatorioExportSpec<T>) {
  const { baixarBlob } = await import("./relatorio-export");
  const blob = await buildRelatorioXlsxBlob(spec);
  baixarBlob(blob, `${spec.nomeArquivoBase}.xlsx`);
}

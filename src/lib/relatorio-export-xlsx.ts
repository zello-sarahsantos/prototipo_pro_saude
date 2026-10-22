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
  linhasDeData,
  prepararSecoes,
  textoFiltros,
  type RelatorioExportSpec,
} from "./relatorio-export";

const NUM_FORMATS: Record<string, string> = {
  moeda: '"R$" #,##0.00',
  percentual: "0.0%",
  decimal: "0.00",
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

/** Preenche uma aba. Sem `secao`, é a tabela única de sempre (linhas, total e notas); com `secao`, é uma das tabelas do
 *  modo `secoes` (título da seção abaixo do título do relatório, numeração QT própria, sem total). */
function preencherAba<T>(
  sheet: ExcelJS.Worksheet,
  spec: RelatorioExportSpec<T>,
  secao?: { titulo: string; linhas: { linha: T; qt?: number }[]; ultima: boolean },
) {
  const temQt = !!(secao && spec.numeracao);
  const totalColunas = spec.colunas.length + (temQt ? 1 : 0);
  const linhasDaAba: { linha: T; qt?: number }[] = secao ? secao.linhas : spec.linhas.map((linha) => ({ linha }));

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
  if (secao) {
    mergeCentralizada(secao.titulo, linhaAtual, true, 11);
    linhaAtual++;
  }

  // Bloco de identificação (documentos individuais, ex.: Comprovante de Rendimentos) — Nome/
  // Matrícula/CPF do titular. Ausente em relatórios administrativos agregados.
  if (spec.identificacao && spec.identificacao.length > 0) {
    spec.identificacao.forEach(({ label, valor }) => {
      mergeCentralizada(`${label}: ${valor}`, linhaAtual, false, 10);
      linhaAtual++;
    });
  }

  if (spec.competencia) {
    mergeCentralizada(`${spec.rotuloCompetencia ?? "Competência"}: ${spec.competencia}`, linhaAtual, false, 10);
    linhaAtual++;
  }
  if (spec.filtrosAplicados.length > 0 || !spec.ocultarLinhaFiltrosSeVazia) {
    mergeCentralizada(textoFiltros(spec.filtrosAplicados), linhaAtual, false, 10);
    linhaAtual++;
  }
  linhasDeData(spec).forEach((linha) => {
    mergeCentralizada(linha, linhaAtual, false, 10);
    linhaAtual++;
  });
  linhaAtual--;
  linhaAtual += 2; // linha em branco antes do cabeçalho da tabela

  if (spec.gruposCabecalho && spec.gruposCabecalho.length > 0) {
    let col = 1;
    spec.gruposCabecalho.forEach((g) => {
      if (g.span > 1) sheet.mergeCells(linhaAtual, col, linhaAtual, col + g.span - 1);
      for (let k = 0; k < g.span; k++) {
        const c = sheet.getCell(linhaAtual, col + k);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
        c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      }
      const cell = sheet.getCell(linhaAtual, col);
      cell.value = g.rotulo;
      cell.font = { name: "Times New Roman", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      col += g.span;
    });
    linhaAtual++;
  }
  const linhaCabecalho = linhaAtual;
  if (temQt) {
    const cellQt = sheet.getCell(linhaCabecalho, totalColunas);
    cellQt.value = spec.numeracao!.cabecalho;
    cellQt.font = { name: "Times New Roman", size: 10, bold: true };
    cellQt.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cellQt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
    cellQt.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  }
  spec.colunas.forEach((coluna, i) => {
    const cell = sheet.getCell(linhaCabecalho, i + 1);
    cell.value = coluna.header;
    cell.font = { name: "Times New Roman", size: 10, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  linhasDaAba.forEach(({ linha, qt }, indiceLinha) => {
    const linhaExcel = linhaCabecalho + 1 + indiceLinha;
    if (qt !== undefined) {
      const cellQt = sheet.getCell(linhaExcel, totalColunas);
      cellQt.value = qt;
      cellQt.numFmt = "0";
      cellQt.font = { name: "Times New Roman", size: 10 };
      cellQt.alignment = { horizontal: "right" };
      cellQt.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    }
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

  const ultimaLinhaDados = linhaCabecalho + linhasDaAba.length;
  let ultimaLinha = ultimaLinhaDados;

  if (spec.linhaTotal && !secao) {
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

  if (spec.notas && spec.notas.length > 0 && (!secao || secao.ultima)) {
    ultimaLinha += 2;
    spec.notas.forEach((n) => {
      sheet.mergeCells(ultimaLinha, 1, ultimaLinha, totalColunas);
      const c = sheet.getCell(ultimaLinha, 1);
      c.value = n;
      c.font = { name: "Times New Roman", size: 9, italic: true };
      c.alignment = { wrapText: true, vertical: "top" };
      sheet.getRow(ultimaLinha).height = 28;
      ultimaLinha++;
    });
  }

  // Largura de coluna: usa `width` do spec quando informado, senão estima pelo cabeçalho.
  spec.colunas.forEach((coluna, i) => {
    sheet.getColumn(i + 1).width = coluna.width ?? Math.max(coluna.header.length + 4, 12);
  });
  if (temQt) sheet.getColumn(totalColunas).width = Math.max(spec.numeracao!.cabecalho.length + 4, 8);

  // Cabeçalho congelado (linhas institucionais + título/filtros + cabeçalho da tabela ficam
  // fixas ao rolar) e autofiltro cobrindo cabeçalho + linhas de dados (nunca só o cabeçalho —
  // do contrário o filtro aparece mas não tem nada para filtrar; a linha de Total, quando
  // existe, fica fora do autofiltro para não ser escondida/confundida com dado filtrável).
  sheet.views = [{ state: "frozen", ySplit: linhaCabecalho, xSplit: 0 }];
  if (linhasDaAba.length > 0) {
    sheet.autoFilter = {
      from: { row: linhaCabecalho, column: 1 },
      to: { row: ultimaLinhaDados, column: totalColunas },
    };
  }
}

export async function buildRelatorioXlsxBlob<T>(spec: RelatorioExportSpec<T>): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pró-Saúde";
  workbook.created = new Date();
  if (spec.secoes) {
    const secoes = prepararSecoes(spec);
    // Sem nenhuma seção a imprimir, mantém uma aba com o cabeçalho e a mensagem de vazio.
    if (secoes.length === 0) preencherAba(workbook.addWorksheet(nomeAbaValido(spec.nomeAba ?? spec.titulo)), spec, { titulo: "Sem registros", linhas: [], ultima: true });
    secoes.forEach((secao, i) => preencherAba(workbook.addWorksheet(secao.nomeAba), spec, { titulo: secao.titulo, linhas: secao.linhas, ultima: i === secoes.length - 1 }));
  } else {
    preencherAba(workbook.addWorksheet(nomeAbaValido(spec.nomeAba ?? spec.titulo)), spec);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportarRelatorioXLSX<T>(spec: RelatorioExportSpec<T>) {
  const { baixarBlob } = await import("./relatorio-export");
  const blob = await buildRelatorioXlsxBlob(spec);
  baixarBlob(blob, `${spec.nomeArquivoBase}.xlsx`);
}

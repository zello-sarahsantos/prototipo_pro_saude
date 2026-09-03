/**
 * Geração de PDF institucional para os relatórios administrativos — motor único (jsPDF +
 * autoTable), consumido por todos os relatórios via `RelatorioExportSpec` (ver
 * `relatorio-export.ts`). Organização documental aproximada do SISPRO fornecido como referência
 * (cabeçalho institucional, título, parâmetros, tabela com cabeçalho destacado repetido em cada
 * página, rodapé paginado) — nunca a interface visual do SISPRO, só a identidade do documento
 * exportado. Nenhum logo/imagem institucional inventada (não há asset oficial no projeto).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CABECALHO_INSTITUCIONAL,
  decidirOrientacao,
  formatarValorExport,
  formatarDataHoraGeracao,
  textoFiltros,
  baixarBlob,
  type RelatorioExportSpec,
} from "./relatorio-export";

const MARGEM = 12;

function desenharCabecalhoInstitucional(doc: jsPDF, origem: string, larguraPagina: number) {
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  let y = 15;
  CABECALHO_INSTITUCIONAL.forEach((linha) => {
    doc.text(linha, larguraPagina / 2, y, { align: "center" });
    y += 5;
  });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(`Pró-Saúde — ${origem}`, larguraPagina / 2, y, { align: "center" });
  y += 3;
  // Linha divisória — separa o cabeçalho institucional do corpo do relatório (organização
  // documental mais clara, sem copiar o visual do SISPRO).
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y, larguraPagina - MARGEM, y);
  return y + 7;
}

function desenharRodape(doc: jsPDF, larguraPagina: number, alturaPagina: number, pagina: number, totalPaginas: number) {
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text("Pró-Saúde", MARGEM, alturaPagina - 8);
  doc.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - MARGEM, alturaPagina - 8, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function buildRelatorioPdfBlob<T>(spec: RelatorioExportSpec<T>): Blob {
  const orientacao = decidirOrientacao(spec);
  const doc = new jsPDF({ orientation: orientacao, unit: "mm", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();

  let y = desenharCabecalhoInstitucional(doc, spec.origem, larguraPagina);

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(spec.titulo, larguraPagina / 2, y, { align: "center" });
  y += 7;

  // Área de parâmetros do relatório — competência (quando existir), filtros efetivamente
  // aplicados (ou "Filtros: Todos") e data/hora de geração. Bloco discreto, tipograficamente
  // menor que o título, para separar claramente "o que é o relatório" de "com que recorte".
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  if (spec.competencia) {
    doc.text(`Competência: ${spec.competencia}`, MARGEM, y);
    y += 5;
  }
  doc.text(textoFiltros(spec.filtrosAplicados), MARGEM, y);
  y += 5;
  doc.text(`Gerado em: ${formatarDataHoraGeracao()}`, MARGEM, y);
  y += 3;
  doc.setTextColor(0, 0, 0);

  const head = [spec.colunas.map((c) => c.header)];
  const body = spec.linhas.map((linha) =>
    spec.colunas.map((c) => formatarValorExport(c.valor(linha), c.tipo)),
  );
  if (spec.linhaTotal) {
    body.push([
      spec.linhaTotal.label,
      ...spec.linhaTotal.valores.map((v, i) =>
        v === null || v === undefined ? "" : formatarValorExport(v, spec.colunas[i + 1]?.tipo),
      ),
    ]);
  }

  const columnStyles: Record<number, { halign: "left" | "center" | "right" }> = {};
  spec.colunas.forEach((c, i) => {
    columnStyles[i] = { halign: c.align ?? (c.tipo === "texto" || !c.tipo ? "left" : "right") };
  });

  autoTable(doc, {
    startY: y + 3,
    head,
    body,
    margin: { left: MARGEM, right: MARGEM, bottom: 16 },
    styles: { font: "times", fontSize: 9, cellPadding: 2.2, lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [221, 221, 221], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [246, 246, 246] },
    columnStyles,
    showHead: "everyPage",
    didParseCell: (data) => {
      // Linha de total (última linha, quando existir) em negrito, sem alternância de cor.
      if (spec.linhaTotal && data.row.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    desenharRodape(doc, larguraPagina, alturaPagina, p, totalPaginas);
  }

  return doc.output("blob");
}

export function exportarRelatorioPDF<T>(spec: RelatorioExportSpec<T>) {
  const blob = buildRelatorioPdfBlob(spec);
  baixarBlob(blob, `${spec.nomeArquivoBase}.pdf`);
}

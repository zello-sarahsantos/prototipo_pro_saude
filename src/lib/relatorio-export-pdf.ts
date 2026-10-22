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
  prepararSecoes,
  formatarValorExport,
  linhasDeData,
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

  // Bloco de identificação (documentos individuais, ex.: Comprovante de Rendimentos) — Nome/
  // Matrícula/CPF do titular a quem o documento se refere. Não existe em relatórios
  // administrativos agregados (spec.identificacao omitido nesses casos).
  if (spec.identificacao && spec.identificacao.length > 0) {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    spec.identificacao.forEach(({ label, valor }) => {
      doc.text(`${label}: ${valor}`, MARGEM, y);
      y += 5;
    });
    y += 1;
  }

  // Área de parâmetros do relatório — competência (quando existir), filtros efetivamente
  // aplicados (ou "Filtros: Todos") e data/hora de geração. Bloco discreto, tipograficamente
  // menor que o título, para separar claramente "o que é o relatório" de "com que recorte".
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  if (spec.competencia) {
    doc.text(`${spec.rotuloCompetencia ?? "Competência"}: ${spec.competencia}`, MARGEM, y);
    y += 5;
  }
  if (spec.filtrosAplicados.length > 0 || !spec.ocultarLinhaFiltrosSeVazia) {
    doc.text(textoFiltros(spec.filtrosAplicados), MARGEM, y);
    y += 5;
  }
  linhasDeData(spec).forEach((linha, i, todas) => {
    doc.text(linha, MARGEM, y);
    y += i < todas.length - 1 ? 5 : 3;
  });
  doc.setTextColor(0, 0, 0);

  if (spec.secoes) {
    // Várias tabelas: cada seção começa em página própria; o título da seção é a primeira linha do cabeçalho da tabela
    // (repetido em cada página da seção). A numeração QT recomeça em cada seção (ver `prepararSecoes`).
    const secoes = prepararSecoes(spec);
    const colunasTabela = spec.colunas.length + (spec.numeracao ? 1 : 0);
    const alinhamentos: ("left" | "center" | "right")[] = spec.colunas.map((c) => c.align ?? (c.tipo === "texto" || !c.tipo ? "left" : "right"));
    if (spec.numeracao) alinhamentos.push("right");
    const estilosColuna: Record<number, { halign: "left" | "center" | "right"; cellWidth?: number }> = {};
    const largurasPdf = spec.colunas.map((c) => c.larguraPdf);
    const usarLarguras = largurasPdf.every((l) => l !== undefined);
    alinhamentos.forEach((a, i) => (estilosColuna[i] = { halign: a, ...(usarLarguras && i < largurasPdf.length ? { cellWidth: largurasPdf[i] } : {}) }));
    if (usarLarguras && spec.numeracao) estilosColuna[largurasPdf.length] = { halign: "right", cellWidth: 18 };
    if (secoes.length === 0) {
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.text("Nenhum registro para os parâmetros informados.", MARGEM, y + 8);
    }
    secoes.forEach((secao, i) => {
      if (i > 0) {
        doc.addPage();
        y = 18;
      }
      const head = [
        [{ content: secao.titulo, colSpan: colunasTabela, styles: { halign: "center" as const } }],
        [...spec.colunas.map((c) => c.header), ...(spec.numeracao ? [spec.numeracao.cabecalho] : [])],
      ];
      const body = secao.linhas.length
        ? secao.linhas.map(({ linha, qt }) => [...spec.colunas.map((c) => formatarValorExport(c.valor(linha), c.tipo)), ...(qt !== undefined ? [String(qt)] : [])])
        : [[{ content: "Sem registros.", colSpan: colunasTabela, styles: { halign: "center" as const, fontStyle: "italic" as const } }]];
      autoTable(doc, {
        startY: i === 0 ? y + 3 : y,
        head,
        body,
        margin: { left: MARGEM, right: MARGEM, bottom: 16 },
        styles: { font: "times", fontSize: 9, cellPadding: 2.2, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [221, 221, 221], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [246, 246, 246] },
        columnStyles: estilosColuna,
        showHead: "everyPage",
      });
    });
  } else {
  const head: (string | { content: string; colSpan: number; styles?: Record<string, unknown> })[][] = [];
    if (spec.gruposCabecalho && spec.gruposCabecalho.length > 0) {
      head.push(spec.gruposCabecalho.map((g) => ({ content: g.rotulo, colSpan: g.span, styles: { halign: "center" } })));
    }
    head.push(spec.colunas.map((c) => c.header));
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
  
}

  if (spec.notas && spec.notas.length > 0) {
    const ultimo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    let yn = (ultimo?.finalY ?? y) + 6;
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    spec.notas.forEach((n) => {
      const linhas = doc.splitTextToSize(n, larguraPagina - MARGEM * 2) as string[];
      if (yn + linhas.length * 4 > alturaPagina - 16) {
        doc.addPage();
        yn = 20;
      }
      doc.text(linhas, MARGEM, yn);
      yn += linhas.length * 4 + 1;
    });
    doc.setTextColor(0, 0, 0);
  }

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

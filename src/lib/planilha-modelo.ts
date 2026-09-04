/**
 * Modelo em branco de envio mensal — gerado pelo botão "Baixar Modelo (.xlsx)"
 * (`associacao.upload.tsx`). Reproduz exatamente `docs/modelo_envio_mensal_associacoes.xlsx`
 * (o modelo oficial aprovado), usando a **mesma fonte única de colunas**
 * (`COLUNAS_MODELO_PLANILHA`/`LARGURAS_MODELO_PLANILHA`, `planilhas-associacao.ts`) também
 * usada pela reconstrução por versão da GERDAB (`planilha-arquivo-versao.ts`) — garante que as
 * duas nunca divirjam, por construção, nunca por disciplina manual de manter duas listas em
 * sincronia.
 *
 * Gerado em código (nunca lido de um arquivo estático em `public/`) para que o botão do
 * protótipo e o arquivo versionado em `docs/` sejam sempre a mesma estrutura — se um dia
 * divergirem, é porque o arquivo em `docs/` foi atualizado manualmente sem repetir aqui, nunca
 * por um segundo gerador concorrente.
 *
 * Importado dinamicamente pelo botão (nunca no topo de um arquivo estático) para não inflar o
 * bundle de `associacao.upload.tsx` com a biblioteca ExcelJS — mesmo padrão já usado em
 * `planilha-arquivo-versao.ts`/`relatorio-export-xlsx.ts`.
 */
import ExcelJS from "exceljs";
import { COLUNAS_MODELO_PLANILHA, LARGURAS_MODELO_PLANILHA } from "./planilhas-associacao";

const LINHAS_EXEMPLO: [string, string, string, string, string, number, string, Date, string][] = [
  ["João da Silva", "xxx.xxx.xxx-xx", "João da Silva", "xxx.xxx.xxx-xx", "Titular", 1200, "AMIL", new Date(2026, 7, 8), "EXEMPLO — apagar antes de enviar"],
  ["João da Silva", "xxx.xxx.xxx-xx", "Ana da Silva", "xxx.xxx.xxx-xx", "Cônjuge", 890, "SULAMERICA", new Date(2026, 7, 10), "EXEMPLO — apagar antes de enviar"],
  ["Maria Oliveira", "xxx.xxx.xxx-xx", "Maria Oliveira", "xxx.xxx.xxx-xx", "Titular", 1800, "AMIL", new Date(2026, 7, 10), "EXEMPLO — apagar antes de enviar"],
];

export async function buildModeloEnvioBlob(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nomeAbaValido("Assetran v1"));

  sheet.columns = LARGURAS_MODELO_PLANILHA.map((width) => ({ width }));

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Envio mensal - Preencher uma linha por beneficiário";
  sheet.getCell("A1").font = { bold: true, size: 12 };

  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value =
    "Apague as 3 linhas de exemplo antes de enviar. O envio so e aceito com 100% dos registros validos.";
  sheet.getCell("A2").font = { size: 9, color: { argb: "FFFF0000" } };

  const linhaCabecalho = 4;
  sheet.getRow(linhaCabecalho).values = [...COLUNAS_MODELO_PLANILHA];
  sheet.getRow(linhaCabecalho).font = { bold: true };
  sheet.getRow(linhaCabecalho).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
  });

  LINHAS_EXEMPLO.forEach((linha, i) => {
    const row = sheet.getRow(linhaCabecalho + 1 + i);
    row.values = linha;
    row.getCell(6).numFmt = '"R$" #,##0.00';
    row.getCell(8).numFmt = "mm-dd-yy";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function nomeAbaValido(titulo: string): string {
  return titulo.replace(/[*?:\\/[\]]/g, "-").slice(0, 31);
}

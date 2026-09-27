/**
 * Modelos em branco de envio (mensal ordinário e retroativo) por associação — gerados pelo botão "Baixar Modelo (.xlsx)"
 * (`associacao.upload.tsx`). O modelo ordinário da ASSETRAN reproduz exatamente `docs/modelo_envio_mensal_associacoes.xlsx`
 * (o modelo oficial aprovado, que não é sobrescrito), usando a **mesma fonte única de colunas**
 * (`getColunasModelo`/`getLargurasModelo`, `planilhas-associacao.ts`, derivadas de `COLUNAS_MODELO_PLANILHA`) também
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
import {
  getAssociacaoModelo,
  getColunasModelo,
  getLargurasModelo,
  LINHA_CABECALHO_MODELO,
  type AssociacaoModelo,
  type TipoModeloPlanilha,
} from "./planilhas-associacao";

const OBS_EXEMPLO = "EXEMPLO — apagar antes de enviar";

/** Exemplos ordinários — idênticos ao modelo aprovado (ASSETRAN); a ASSEFAZ troca só a coluna de plano. */
function linhasExemploOrdinario(a: AssociacaoModelo): (string | number | Date)[][] {
  const plano = a === "Assefaz"
    ? ["ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL", "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL", "ASSEFAZ SAFIRA APARTAMENTO EMPRESARIAL"]
    : ["AMIL", "SULAMERICA", "AMIL"];
  return [
    ["João da Silva", "xxx.xxx.xxx-xx", "João da Silva", "xxx.xxx.xxx-xx", "Titular", 1200, plano[0], new Date(2026, 7, 8), OBS_EXEMPLO],
    ["João da Silva", "xxx.xxx.xxx-xx", "Ana da Silva", "xxx.xxx.xxx-xx", "Cônjuge", 890, plano[1], new Date(2026, 7, 10), OBS_EXEMPLO],
    ["Maria Oliveira", "xxx.xxx.xxx-xx", "Maria Oliveira", "xxx.xxx.xxx-xx", "Titular", 1800, plano[2], new Date(2026, 7, 10), OBS_EXEMPLO],
  ];
}

/** Exemplos retroativos — um mês por linha (nunca somados); `Valor` = cobrança/plano sem juros. */
function linhasExemploRetroativo(a: AssociacaoModelo): (string | number | Date)[][] {
  const plano = a === "Assefaz" ? "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL" : "AMIL";
  return [
    ["João da Silva", "xxx.xxx.xxx-xx", "João da Silva", "xxx.xxx.xxx-xx", "Titular", "03/2026", new Date(2026, 2, 1), new Date(2026, 2, 10), new Date(2026, 2, 9), 1200, plano],
    ["João da Silva", "xxx.xxx.xxx-xx", "João da Silva", "xxx.xxx.xxx-xx", "Titular", "04/2026", new Date(2026, 3, 1), new Date(2026, 3, 10), new Date(2026, 3, 9), 1200, plano],
    ["João da Silva", "xxx.xxx.xxx-xx", "Ana da Silva", "xxx.xxx.xxx-xx", "Cônjuge", "03/2026", new Date(2026, 2, 1), new Date(2026, 2, 10), new Date(2026, 2, 9), 890, plano],
  ];
}

/** Modelo em branco da associação e do tipo. Ordinário/ASSETRAN é o modelo aprovado, inalterado. */
export async function buildModeloBlob(associacao: string, tipo: TipoModeloPlanilha): Promise<Blob> {
  const a = getAssociacaoModelo(associacao);
  if (!a) throw new Error(`Associação sem modelo de planilha definido: ${associacao}`);
  const colunas = getColunasModelo(a, tipo);
  const ultimaColuna = String.fromCharCode(64 + colunas.length); // A..K (≤ 26 colunas)

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nomeAbaValido(tipo === "retroativo" ? `${a} retroativo v1` : `${a} v1`));
  sheet.columns = getLargurasModelo(tipo).map((width) => ({ width }));

  // Ordinário mantém a mesma mesclagem do modelo aprovado (A1:G1); retroativo cobre a grade toda.
  const fimTitulo = tipo === "retroativo" ? ultimaColuna : "G";
  sheet.mergeCells(`A1:${fimTitulo}1`);
  sheet.getCell("A1").value =
    tipo === "retroativo"
      ? `Envio retroativo — ${a.toUpperCase()} — Preencher uma linha por beneficiário e por mês de referência`
      : "Envio mensal - Preencher uma linha por beneficiário";
  sheet.getCell("A1").font = { bold: true, size: 12 };

  sheet.mergeCells(`A2:${fimTitulo}2`);
  sheet.getCell("A2").value =
    tipo === "retroativo"
      ? "Apague as 3 linhas de exemplo antes de enviar. Cada mês em linha própria (nunca somar meses). Valor = cobrança/plano do mês, sem juros. Mês/Ano de Referência no formato MM/AAAA."
      : "Apague as 3 linhas de exemplo antes de enviar. O envio so e aceito com 100% dos registros validos.";
  sheet.getCell("A2").font = { size: 9, color: { argb: "FFFF0000" } };

  sheet.getRow(LINHA_CABECALHO_MODELO).values = colunas;
  sheet.getRow(LINHA_CABECALHO_MODELO).font = { bold: true };
  sheet.getRow(LINHA_CABECALHO_MODELO).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
  });

  const exemplos = tipo === "retroativo" ? linhasExemploRetroativo(a) : linhasExemploOrdinario(a);
  exemplos.forEach((linha, i) => {
    const row = sheet.getRow(LINHA_CABECALHO_MODELO + 1 + i);
    row.values = linha;
    if (tipo === "retroativo") {
      [7, 8, 9].forEach((c) => (row.getCell(c).numFmt = "dd/mm/yyyy"));
      row.getCell(10).numFmt = '"R$" #,##0.00';
    } else {
      row.getCell(6).numFmt = '"R$" #,##0.00';
      row.getCell(8).numFmt = "mm-dd-yy";
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function nomeAbaValido(titulo: string): string {
  return titulo.replace(/[*?:\\/[\]]/g, "-").slice(0, 31);
}

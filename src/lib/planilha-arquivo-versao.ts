/**
 * Reconstrução do arquivo `.xlsx` de uma versão de planilha de associação, para download pela
 * GERDAB na tela de análise (`AnalisePlanilhaModal.tsx`).
 *
 * **Princípio (correção conceitual já aplicada em rodada anterior, reforçada nesta):** planilha
 * enviada = planilha baixada pela GERDAB; resultado da análise = informação do sistema. O arquivo
 * reconstruído aqui reproduz **exatamente a estrutura, a ordem e a nomenclatura de colunas do
 * modelo oficial aprovado** (`COLUNAS_MODELO_PLANILHA`, `planilhas-associacao.ts` — fonte única,
 * nunca duplicada aqui) — mesmas 9 colunas de `docs/modelo_envio_mensal_associacoes.xlsx`:
 * Servidor (Titular) | CPF do Titular | Beneficiário | CPF do Beneficiário | Vínculo | Valor
 * Mensal Individual (R$) | Operadora do Plano | Data do Pagamento | Observações. **Não inclui
 * `Status` nem `Motivo`** — essas duas colunas são resultado da validação/análise, não fazem
 * parte da planilha que a associação enviou, e continuam existindo só na interface
 * (`AnalisePlanilhaModal.tsx`), associadas à mesma versão. **Também não inclui `Competência`** —
 * ela identifica o envio como um todo (Associação + Competência), não é uma coluna por linha;
 * aparece só no título (linha 1) e no cabeçalho da tela de análise.
 *
 * **Limitação registrada explicitamente, não escondida:** o protótipo ainda não captura nem
 * armazena o arquivo `.xlsx`/`.csv` original enviado pela associação — `associacao.upload.tsx`
 * nunca leu bytes de arquivo nenhum (a "conferência" sempre operou sobre um array de registros já
 * simulado, ver `planilhas-associacao.ts`). Por isso, esta função **não baixa o arquivo original
 * literal** — ela reconstrói, em `.xlsx` real (gerado de verdade, não um mock de interface), os
 * mesmos registros normalizados já persistidos para aquela versão
 * (`VersaoPlanilhaAssociacao.registros`), agora só com as colunas que a própria associação
 * preenche no modelo — nunca os campos de validação/decisão da GERDAB. A informação técnica de
 * que se trata de uma reconstrução do protótipo fica **fora da grade de dados** (linha 2, acima
 * do cabeçalho), nunca como coluna extra dentro da mesma estrutura do modelo.
 *
 * A coluna "Observações" existe na estrutura (mesma posição do modelo) mas fica **vazia**: é um
 * campo de texto livre da própria associação, e o modelo de dados do protótipo não captura esse
 * conteúdo hoje — não é inventado nem preenchido com `motivo` (que é informação de validação, não
 * observação da associação).
 *
 * Importado dinamicamente pelo modal (nunca no topo de um arquivo estático) para não inflar o
 * bundle de `admin.comprovantes.tsx` com a biblioteca ExcelJS — mesmo padrão já usado em
 * `relatorio-export-xlsx.ts`/`ExportarRelatorio.tsx`.
 */
import ExcelJS from "exceljs";
import { formatCompetencia } from "./mock-data";
import { COLUNAS_MODELO_PLANILHA, LARGURAS_MODELO_PLANILHA } from "./planilhas-associacao";
import type { PlanilhaAssociacao, VersaoPlanilhaAssociacao } from "./prosaude-storage";

function nomeAbaValido(titulo: string): string {
  return titulo.replace(/[*?:\\/[\]]/g, "-").slice(0, 31);
}

export async function buildArquivoVersaoBlob(
  planilha: PlanilhaAssociacao,
  versao: VersaoPlanilhaAssociacao,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nomeAbaValido(`${planilha.associacao} v${versao.versao}`));

  // Larguras idênticas ao modelo oficial aprovado (mesma fonte única — `planilhas-associacao.ts`).
  sheet.columns = LARGURAS_MODELO_PLANILHA.map((width) => ({ width }));

  const ultimaColuna = String.fromCharCode(65 + COLUNAS_MODELO_PLANILHA.length - 1); // "I"

  sheet.mergeCells(`A1:${ultimaColuna}1`);
  sheet.getCell("A1").value =
    `Envio mensal — ${planilha.associacao} — Versão ${versao.versao} — Competência ${formatCompetencia(planilha.competencia)}`;
  sheet.getCell("A1").font = { bold: true, size: 12 };

  // Nota técnica fora da grade de dados (nunca uma coluna extra) — sinaliza que é reconstrução.
  sheet.mergeCells(`A2:${ultimaColuna}2`);
  sheet.getCell("A2").value =
    "Reconstrução dos registros normalizados desta versão, gerada pelo protótipo — o arquivo literal enviado pela associação ainda não é armazenado.";
  sheet.getCell("A2").font = { size: 9, color: { argb: "FF6B7280" } };

  const linhaCabecalho = 4;
  sheet.getRow(linhaCabecalho).values = [...COLUNAS_MODELO_PLANILHA];
  sheet.getRow(linhaCabecalho).font = { bold: true };
  sheet.getRow(linhaCabecalho).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
  });

  // Só as colunas que a própria associação preenche no modelo — nunca `status`/`motivo`
  // (resultado da validação/análise, exibido só na interface, nunca no arquivo).
  versao.registros.forEach((r, i) => {
    const row = sheet.getRow(linhaCabecalho + 1 + i);
    // `operadora`/`dataPagamento` podem faltar em planilhas semeadas/persistidas antes destes
    // campos existirem no modelo de dados (localStorage de rodadas de teste anteriores) — usa
    // célula vazia em vez de "undefined"/Invalid Date.
    row.values = [
      r.servidor,
      r.cpfTitular,
      r.beneficiario,
      r.cpf,
      r.vinculo,
      r.valor,
      r.operadora ?? "",
      r.dataPagamento ? new Date(r.dataPagamento) : "",
      "",
    ];
    row.getCell(6).numFmt = '"R$" #,##0.00';
    if (r.dataPagamento) row.getCell(8).numFmt = "mm-dd-yy";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * **MASSA DE DEMONSTRAÇÃO dos Relatórios de Negociações enviados pelas Associações — SOMENTE PROTÓTIPO.**
 * Cenário: associação que enviou um relatório com dados de VÁRIOS servidores (fictícios), um segundo envio da mesma
 * associação/competência (registro independente) e um envio já marcado como conferido pela GERDAB. Os arquivos .xlsx são
 * gerados aqui, com a estrutura "mensalidades originais × parcelas geradas" (referência: relatório da operadora), valores
 * inventados e nomes do cadastro fictício — nenhum dado real. Semeada uma única vez (marcador em `localStorage`).
 */
import { analistaReferencia } from "./mock-data";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { enviarRelatorioNegociacoes, loadEnvios, marcarEnvioConferido } from "./negociacoes-envios";

const VERSAO = "1";

type Linha = [string, string, string, string, string, string, number];

async function gerarXlsx(nome: string, linhas: Linha[]): Promise<File> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Negociações");
  ws.addRow(["ORIGEM", "Ano Base", "Mês Base", "Num Negociação", "Nome", "Parcela", "Vencimento", "Vlr. Título"]);
  linhas.forEach((l) => ws.addRow(l));
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], nome, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const ORIG = "ORIGINAIS";
const GER = "PARCELA GERADA";

export async function garantirMassaDemonstracaoEnvios(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoesEnvios) === VERSAO) return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoNegociacoesEnvios, VERSAO);
  if (loadEnvios().some((e) => e.demo)) return;
  try {
    const assefaz1 = await gerarXlsx("relatorio_negociacoes_assefaz_2026-09.xlsx", [
      [ORIG, "2025", "10", "000001", "Maria Oliveira", "—", 2500],
      [ORIG, "2025", "11", "000001", "Maria Oliveira", "—", 2500],
      [GER, "2026", "11", "000001", "Maria Oliveira", "001", 520],
      [GER, "2026", "12", "000001", "Maria Oliveira", "002", 520],
      [ORIG, "2025", "12", "000002", "Patrícia Costa", "—", 2000],
      [GER, "2026", "06", "000002", "Patrícia Costa", "001", 1050],
    ] as unknown as Linha[]);
    const assefaz2 = await gerarXlsx("relatorio_negociacoes_assefaz_2026-09_2.xlsx", [
      [ORIG, "2025", "10", "000001", "Maria Oliveira", "—", 2500],
      [GER, "2026", "11", "000001", "Maria Oliveira", "001", 520],
      [ORIG, "2025", "12", "000002", "Patrícia Costa", "—", 2000],
      [GER, "2026", "06", "000002", "Patrícia Costa", "001", 1050],
      [GER, "2026", "07", "000002", "Patrícia Costa", "002", 1050],
      [GER, "2026", "08", "000002", "Patrícia Costa", "003", 1050],
    ] as unknown as Linha[]);
    const assetran = await gerarXlsx("relatorio_negociacoes_assetran_2026-10.xlsx", [
      [ORIG, "2025", "08", "000003", "Carlos Pereira", "—", 900],
      [GER, "2026", "09", "000003", "Carlos Pereira", "001", 480],
      [GER, "2026", "10", "000003", "Carlos Pereira", "002", 480],
      [ORIG, "2025", "06", "000004", "Roberto Santos", "—", 2111.11],
      [GER, "2026", "08", "000004", "Roberto Santos", "001", 360],
    ] as unknown as Linha[]);
    const e1 = await enviarRelatorioNegociacoes({ associacao: "Assefaz", competencia: "2026-09", arquivo: assefaz1, enviadoPor: "ASSEFAZ (demonstração)", demo: true });
    marcarEnvioConferido(e1.id, analistaReferencia);
    await enviarRelatorioNegociacoes({ associacao: "Assefaz", competencia: "2026-09", arquivo: assefaz2, enviadoPor: "ASSEFAZ (demonstração)", demo: true });
    await enviarRelatorioNegociacoes({ associacao: "Assetran", competencia: "2026-10", arquivo: assetran, enviadoPor: "ASSETRAN (demonstração)", demo: true });
  } catch {
    /* sem IndexedDB/ExcelJS no ambiente: a demonstração segue sem os envios de exemplo */
  }
}

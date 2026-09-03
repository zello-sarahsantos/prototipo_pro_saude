import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";

// Import dinâmico — jsPDF/autoTable e ExcelJS só entram no bundle quando o usuário efetivamente
// clica em exportar, em vez de inflar o chunk de cada tela que usa este componente.

/**
 * Ação única de exportação — mesmo componente para todos os relatórios administrativos (ver
 * `docs/MODULO_RELATORIOS.md`, seção de Exportação). Evita dois botões grandes separados por
 * tela: "Exportar ▾" com PDF e Excel como itens do menu, com feedback de geração/processamento.
 */
export function ExportarRelatorio<T>({ spec }: { spec: RelatorioExportSpec<T> }) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState<"pdf" | "xlsx" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  async function gerarPdf() {
    setGerando("pdf");
    try {
      const { exportarRelatorioPDF } = await import("@/lib/relatorio-export-pdf");
      exportarRelatorioPDF(spec);
    } finally {
      setGerando(null);
      setAberto(false);
    }
  }

  async function gerarXlsx() {
    setGerando("xlsx");
    try {
      const { exportarRelatorioXLSX } = await import("@/lib/relatorio-export-xlsx");
      await exportarRelatorioXLSX(spec);
    } finally {
      setGerando(null);
      setAberto(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={gerando !== null}
        className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {gerando === "pdf" ? "Gerando PDF…" : gerando === "xlsx" ? "Gerando Excel…" : "Exportar"}
        {!gerando && <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-elevated z-20 overflow-hidden">
          <button
            onClick={gerarPdf}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left"
          >
            <FileText className="h-4 w-4 text-muted-foreground" /> PDF
          </button>
          <button
            onClick={gerarXlsx}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ChevronDown, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";

// Import dinâmico — jsPDF/autoTable e ExcelJS só entram no bundle quando o usuário efetivamente
// clica em exportar, em vez de inflar o chunk de cada tela que usa este componente.

/**
 * Ação única de exportação — mesmo componente para todos os relatórios administrativos (ver
 * `docs/MODULO_RELATORIOS.md`, seção de Exportação). Evita dois botões grandes separados por
 * tela: "Exportar ▾" com PDF e Excel como itens do menu, com feedback de geração/processamento.
 */
export function ExportarRelatorio<T>({ spec, rotulo = "Exportar", flutuante = false }: { spec: RelatorioExportSpec<T>; rotulo?: string; flutuante?: boolean }) {
  // `flutuante`: para uso dentro de contêineres com `overflow` (tabelas/listas responsivas), onde o menu absoluto seria cortado.
  // O menu vai para o <body> (portal), com posição fixa calculada a partir do botão e abertura para cima quando faltar espaço.
  const menuRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState<"pdf" | "xlsx" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (ref.current && !ref.current.contains(alvo) && !menuRef.current?.contains(alvo)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  useLayoutEffect(() => {
    if (!flutuante || !aberto) return;
    const calcular = () => {
      const r = botaoRef.current?.getBoundingClientRect();
      if (!r) return;
      const altura = menuRef.current?.offsetHeight ?? 96;
      const abaixo = window.innerHeight - r.bottom;
      const right = Math.max(8, window.innerWidth - r.right);
      setPos(abaixo >= altura + 12 || abaixo >= r.top ? { top: r.bottom + 8, right } : { bottom: window.innerHeight - r.top + 8, right });
    };
    calcular();
    const fechar = () => setAberto(false);
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", fechar, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [flutuante, aberto]);

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

  const itens = (
    <>
      <button role="menuitem" onClick={gerarPdf} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left">
        <FileText className="h-4 w-4 text-muted-foreground" /> PDF
      </button>
      <button role="menuitem" onClick={gerarXlsx} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> Excel (.xlsx)
      </button>
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        ref={botaoRef}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        disabled={gerando !== null}
        className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {gerando === "pdf" ? "Gerando PDF…" : gerando === "xlsx" ? "Gerando Excel…" : rotulo}
        {!gerando && <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {aberto && !flutuante && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-elevated z-20 overflow-hidden">
          {itens}
        </div>
      )}
      {aberto && flutuante && typeof document !== "undefined" &&
        createPortal(
          <div ref={menuRef} role="menu" style={{ position: "fixed", zIndex: 80, width: 192, visibility: pos ? "visible" : "hidden", ...pos }} className="bg-card border border-border rounded-xl shadow-elevated overflow-hidden text-foreground">
            {itens}
          </div>,
          document.body,
        )}
    </div>
  );
}

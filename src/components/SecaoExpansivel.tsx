import { ChevronDown } from "lucide-react";

/**
 * Seção expansível do padrão de análise (Ressarcimento Retroativo e Planilhas das Associações): cabeçalho com
 * título, resumo do estado e chevron. O corpo fica sempre montado (apenas oculto quando recolhido) para
 * preservar o que foi digitado. `alerta` pinta o resumo em laranja (só estado/atenção, nunca ação).
 */
export function SecaoExpansivel({
  id,
  numero,
  titulo,
  resumo,
  alerta,
  aberta,
  onAlternar,
  children,
}: {
  id: string;
  numero: number;
  titulo: string;
  resumo: string;
  alerta?: boolean;
  aberta: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberta}
        aria-controls={`secao-${id}`}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition rounded-lg"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-lg font-semibold">{numero}. {titulo}</span>
          <span className={`block text-sm mt-0.5 ${alerta ? "text-warning font-medium" : "text-muted-foreground"}`}>{resumo}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${aberta ? "rotate-180" : ""}`} />
      </button>
      <div id={`secao-${id}`} hidden={!aberta} className={aberta ? "px-5 pb-5 pt-1 space-y-4 border-t border-border" : "hidden"}>
        {children}
      </div>
    </div>
  );
}

import { ChevronDown } from "lucide-react";

/**
 * Controle ÚNICO de Expandir/Recolher do Portal do Servidor (Prazos e alertas documentais, Histórico de Comprovações e Ressarcimento de meses
 * anteriores): texto + chevron discreto (20 px) em azul institucional, no canto superior direito do cabeçalho. Recolhido: "Expandir" + chevron
 * para baixo; expandido: "Recolher" + chevron para cima. A transição é suave e some com `prefers-reduced-motion`.
 */
export function ControleExpansaoVisual({ aberto }: { aberto: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary whitespace-nowrap select-none">
      {aberto ? "Recolher" : "Expandir"}
      <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} />
    </span>
  );
}

/**
 * Botão do controle (texto + ícone são UM só botão, com área de toque ≥ 44 px, foco visível e `aria-expanded`). Não tem `onClick` próprio de
 * propósito: o clique sobe até o CABEÇALHO, que alterna o estado — assim clicar em qualquer ponto do cabeçalho expande/recolhe, e o teclado
 * (Enter/Espaço no botão) faz o mesmo.
 */
export function BotaoExpansao({ aberto, controla }: { aberto: boolean; controla: string }) {
  return (
    <button
      type="button"
      aria-expanded={aberto}
      aria-controls={controla}
      className="shrink-0 -my-2 -mr-2 min-h-[44px] px-2 inline-flex items-center rounded-md hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ControleExpansaoVisual aberto={aberto} />
    </button>
  );
}

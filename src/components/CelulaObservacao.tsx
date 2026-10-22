import { useId, useState } from "react";

/**
 * Observação NURFI na tabela: até 3 linhas, com quebra só entre palavras. Quando o texto é longo, oferece "Ver completa" (expansão
 * acessível, `aria-expanded`) — o texto integral nunca fica inacessível; o `title` repete o conteúdo completo ao passar o mouse.
 */
export function CelulaObservacao({ texto, vazio = "Sem observação" }: { texto: string; vazio?: string }) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  const longa = texto.length > 110;
  return (
    <div className="min-w-0 text-sm">
      <div title={longa ? texto : undefined} className="rounded-lg bg-muted/60 px-3 py-2">
        <p id={id} className={`leading-snug break-normal [overflow-wrap:anywhere] ${aberta ? "" : "line-clamp-3"}`}>
          {texto || <span className="text-foreground/60">{vazio}</span>}
        </p>
      </div>
      {longa && (
        <button type="button" onClick={() => setAberta((v) => !v)} aria-expanded={aberta} aria-controls={id} className="mt-1 whitespace-nowrap rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {aberta ? "Recolher" : "Ver observação completa"}
        </button>
      )}
    </div>
  );
}

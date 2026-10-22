import { useRef } from "react";

/**
 * Devolve o foco ao elemento que abriu um diálogo controlado por estado (o Radix só faz isso para um `DialogTrigger`).
 * Captura o elemento ativo na primeira renderização — antes de o diálogo mover o foco — e, se ele não existir mais, usa
 * `fallbackSeletor`. Uso: `<DialogContent onCloseAutoFocus={useRetornoDeFoco()}>`.
 */
export function useRetornoDeFoco(fallbackSeletor = "main h1") {
  const origem = useRef<HTMLElement | null>(typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
  return (e: Event) => {
    e.preventDefault();
    const alvo = origem.current?.isConnected && origem.current !== document.body ? origem.current : (document.querySelector(fallbackSeletor) as HTMLElement | null);
    if (alvo && !alvo.hasAttribute("tabindex") && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName)) alvo.setAttribute("tabindex", "-1");
    alvo?.focus();
  };
}

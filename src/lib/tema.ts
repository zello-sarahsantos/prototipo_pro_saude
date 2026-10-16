/**
 * Tema claro/escuro do sistema — preferência única, persistida e aplicada pela classe `.dark` em
 * <html> (os tokens vivem em `styles.css`). Um script no <head> (ver `__root.tsx`) aplica o tema
 * salvo antes da primeira pintura, para não haver "flash" de tema claro ao navegar/recarregar.
 */
import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro";
export const CHAVE_TEMA = "prosaude_tema";

/** Mesmo código do script inline do <head>: mantém a leitura em um único lugar. */
export const SCRIPT_TEMA_INICIAL = `try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t==="escuro")document.documentElement.classList.add("dark")}catch(e){}`;

export function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "escuro");
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* armazenamento indisponível: o tema vale só nesta sessão */
  }
}

/** Estado reativo do tema; sincroniza entre abas e entre componentes (evento `storage`/customizado). */
export function useTema(): { tema: Tema; alternar: () => void } {
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => {
    setTema(lerTema());
    const aoMudar = () => setTema(lerTema());
    window.addEventListener("storage", aoMudar);
    window.addEventListener("prosaude-tema", aoMudar);
    return () => {
      window.removeEventListener("storage", aoMudar);
      window.removeEventListener("prosaude-tema", aoMudar);
    };
  }, []);
  const alternar = useCallback(() => {
    const proximo: Tema = lerTema() === "escuro" ? "claro" : "escuro";
    aplicarTema(proximo);
    setTema(proximo);
    window.dispatchEvent(new Event("prosaude-tema"));
  }, []);
  return { tema, alternar };
}

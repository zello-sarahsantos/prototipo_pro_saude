import { useSyncExternalStore } from "react";

const assinar = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};
const perfilDoNavegador = () => localStorage.getItem("prosaude_role") || "gerencia";

/**
 * Perfil administrativo lido do localStorage sem divergir do HTML do servidor: no servidor e durante a hidratação o valor é
 * `padrao` ("gerencia", como `getAdminRole`); logo em seguida o React relê o valor real do navegador. Passe `null` quando a tela
 * não deve mostrar nada antes de conhecer o perfil (ex.: conteúdo restrito à Gerência).
 */
export function useAdminRole<P extends string | null = "gerencia">(padrao: P = "gerencia" as P): string | P {
  return useSyncExternalStore<string | P>(assinar, perfilDoNavegador, () => padrao);
}

/**
 * Regra ÚNICA de autorização dos relatórios internos da GERDAB (Suspensões, Alterações) e de Negociações: só Analista e Gerência.
 * Usada pela guarda das rotas (`GuardaPerfilAdmin`) e pela visibilidade dos cartões na Central de Relatórios, para nunca divergirem.
 * Compara o identificador técnico do perfil (`localStorage.prosaude_role`), sem espaços e sem diferenciar maiúsculas — nunca o nome exibido.
 */
export const PERFIS_GERDAB = ["analista", "gerencia"] as const;
export const ehPerfilGerdab = (perfil: string | null | undefined): boolean => PERFIS_GERDAB.includes((perfil ?? "").trim().toLowerCase() as (typeof PERFIS_GERDAB)[number]);

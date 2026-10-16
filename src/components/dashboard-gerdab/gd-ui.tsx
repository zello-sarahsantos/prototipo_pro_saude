import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown, Info } from "lucide-react";

/** Blocos visuais compartilhados do Dashboard GERDAB — seguem os estilos do protótipo aprovado
 *  (variáveis `--gd-*` definidas em `styles.css`). */
export const V = {
  bg: "var(--gd-bg)",
  card: "var(--gd-card)",
  border: "var(--gd-border)",
  text: "var(--gd-text)",
  muted: "var(--gd-muted)",
  primary: "var(--gd-primary)",
  primarySoft: "var(--gd-primary-soft)",
  onPrimary: "var(--gd-on-primary)",
  amber: "var(--gd-amber)",
  amberSoft: "var(--gd-amber-soft)",
  red: "var(--gd-red)",
  redSoft: "var(--gd-red-soft)",
  green: "var(--gd-green)",
  greenSoft: "var(--gd-green-soft)",
  track: "var(--gd-track)",
} as const;

export const num = (n: number) => n.toLocaleString("pt-BR");

export const cardBase: CSSProperties = {
  background: V.card,
  border: `1px solid ${V.border}`,
  borderRadius: 12,
};

export const linkNegrito: CSSProperties = { fontSize: 13, fontWeight: 600 };
export const botaoTexto: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: "inherit",
  cursor: "pointer",
};

/** Ícone "i" com a explicação de X e Y — igual ao protótipo. */
export function IconeInfo({ texto }: { texto: string }) {
  return (
    <span role="img" tabIndex={0} aria-label={texto} title={texto} style={{ display: "inline-flex", alignSelf: "center", color: V.muted, cursor: "help" }}>
      <Info size={14} />
    </span>
  );
}

export function NadaPendente() {
  return (
    <div style={{ fontSize: 13, color: V.muted, display: "flex", alignItems: "center", gap: 6 }}>
      <Check size={14} color={V.green} />
      Nada pendente
    </div>
  );
}

/** Seção que abre e fecha ao clicar em QUALQUER ponto do cabeçalho (título, resumo ou seta). */
export function SecaoRecolhivel({
  titulo,
  resumo,
  aberta,
  onAlternar,
  children,
  selo,
}: {
  titulo: string;
  resumo: ReactNode;
  aberta: boolean;
  onAlternar: () => void;
  children: ReactNode;
  selo?: ReactNode;
}) {
  return (
    <section className="gd-sec gd-bar" style={{ ...cardBase, padding: "20px 20px 18px", display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberta}
        className="gd-sec-head"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, width: "100%", minHeight: 34, background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {titulo} {selo}
        </h2>
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: V.muted, textAlign: "right" }}>{resumo}</span>
          <span style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${aberta ? V.primary : V.border}`, background: aberta ? V.primarySoft : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: V.primary, transition: "background-color 180ms ease, border-color 180ms ease" }}>
            <ChevronDown size={18} style={{ transform: aberta ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
          </span>
        </span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: aberta ? "1fr" : "0fr", transition: "grid-template-rows 240ms ease" }}>
        <div style={{ overflow: "hidden", minHeight: 0, visibility: aberta ? "visible" : "hidden", transition: "visibility 240ms" }}>{children}</div>
      </div>
    </section>
  );
}

/** Lista com "Mostrar mais": exibe `passo` itens por vez e informa sempre quantos aparecem e o total existente.
 *  Use `key` no pai para reiniciar a paginação quando a lista mudar. */
export function ListaPaginada<T>({
  itens,
  passo = 8,
  rotulo,
  render,
  vazio,
}: {
  itens: T[];
  passo?: number;
  rotulo: string;
  render: (item: T, indice: number) => ReactNode;
  vazio?: string;
}) {
  const [visiveis, setVisiveis] = useState(passo);
  const total = itens.length;
  if (total === 0) return <div style={{ fontSize: 13, color: V.muted, padding: "10px 0", borderTop: `1px solid ${V.border}` }}>{vazio ?? "Nenhum registro."}</div>;
  const mostrados = Math.min(visiveis, total);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {itens.slice(0, mostrados).map((it, i) => render(it, i))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 8, borderTop: `1px solid ${V.border}` }}>
        <span style={{ fontSize: 12, color: V.muted, fontVariantNumeric: "tabular-nums" }}>
          Mostrando {num(mostrados)} de {num(total)} {rotulo}
          {mostrados < total ? " · amostra" : ""}
        </span>
        {mostrados < total && (
          <button type="button" onClick={() => setVisiveis((v) => v + passo)} style={{ ...botaoTexto, fontSize: 12, fontWeight: 600, color: V.primary }}>
            Mostrar mais {Math.min(passo, total - mostrados)}
          </button>
        )}
      </div>
    </div>
  );
}

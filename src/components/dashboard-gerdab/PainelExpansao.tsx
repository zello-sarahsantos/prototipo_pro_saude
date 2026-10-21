import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { V, num } from "./gd-ui";

/**
 * Blocos compartilhados das expansões dos indicadores do Dashboard (cabeçalho padronizado, barra de pesquisa/filtros, tabela
 * operacional, rodapé de consulta progressiva e aviso de atualização selecionada). Só apresentação: os dados, as rotas e os
 * estados vêm de quem usa. Estilos em `styles.css` (classes `gd-painel-head`, `gd-cta-principal`, `gd-tab-*`).
 */

export type TomSelo = "neutro" | "azul" | "ambar" | "verde" | "rosa";
const COR_SELO: Record<TomSelo, string> = { neutro: V.text, azul: V.primary, ambar: V.amber, verde: V.green, rosa: V.red };

/** Badge resumido do cabeçalho: fundo branco, borda discreta, texto pequeno em negrito (cor só quando semântica). */
export function SeloResumo({ texto, tom = "neutro" }: { texto: string; tom?: TomSelo }) {
  return <span style={{ fontSize: 12, fontWeight: 700, color: COR_SELO[tom], background: V.card, border: `1px solid ${V.border}`, padding: "6px 12px", borderRadius: 10, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{texto}</span>;
}

/** Cabeçalho único das expansões: categoria + título + descrição à esquerda; badges, CTA principal e fechar à direita. */
export function CabecalhoExpansao({ categoria, titulo, descricao, badges, acao, onFechar, rotuloFechar }: { categoria: string; titulo: string; descricao: string; badges?: ReactNode; acao?: ReactNode; onFechar: () => void; rotuloFechar: string }) {
  return (
    <div className="gd-painel-head">
      <div style={{ minWidth: 0, flex: "1 1 280px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: V.primary }}>{categoria}</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0", lineHeight: 1.25 }}>{titulo}</h3>
        <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0", lineHeight: 1.45 }}>{descricao}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        {badges}
        {acao}
        <button type="button" onClick={onFechar} aria-label={rotuloFechar} className="gd-fechar">
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Botão/link de CTA principal (azul preenchido) — usar com um <Link> ou <button> que tenha destino real. */
export const CLASSE_CTA_PRINCIPAL = "gd-cta-principal";
export const IconeCta = () => <ChevronRight size={16} aria-hidden />;

export function FiltroSituacao({ rotulo, n, ativo, onClick }: { rotulo: string; n: number; ativo: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={ativo} data-sel={ativo ? "true" : undefined} onClick={onClick} className="gd-filtro" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, height: 40, padding: "0 16px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap", ...(ativo ? {} : { border: `1px solid ${V.border}`, background: V.card, color: V.text }) }}>
      {rotulo} <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(n)}</span>
    </button>
  );
}

/** Área operacional: pesquisa + filtros (ou quantitativo total, quando não há filtros). */
export function BarraOperacional({ valor, onValor, placeholder, ariaLabel, filtros, total }: { valor: string; onValor: (v: string) => void; placeholder: string; ariaLabel: string; filtros?: ReactNode; total?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "14px 20px", background: V.card }}>
      <div style={{ flex: "1 1 260px", position: "relative", display: "flex", alignItems: "center" }}>
        <Search size={16} color={V.muted} style={{ position: "absolute", left: 12 }} aria-hidden />
        <input type="search" value={valor} onChange={(e) => onValor(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 12px 0 36px", border: `1px solid ${V.border}`, borderRadius: 12, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 14 }} />
      </div>
      {filtros && <div role="group" aria-label="Filtrar por situação" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{filtros}</div>}
      {total && <span style={{ fontSize: 14, color: V.muted, fontVariantNumeric: "tabular-nums" }}>{total}</span>}
    </div>
  );
}

/** Tabela operacional responsiva (vira cartões em contêineres estreitos). `colunas` = grid-template-columns do desktop. */
export function TabelaOperacional({ colunas, cabecalhos, children, vazio }: { colunas: string; cabecalhos: string[]; children: ReactNode; vazio?: string }) {
  return (
    <div className="gd-tab" style={{ ["--cols" as string]: colunas }}>
      <div className="gd-tab-row gd-tab-head" role="row">
        {cabecalhos.map((c, i) => (
          <span key={c} className={`gd-t${i + 1}`} role="columnheader">{c}</span>
        ))}
      </div>
      {vazio ? <div style={{ padding: "22px 20px", fontSize: 14, color: V.muted, borderTop: `1px solid ${V.border}` }}>{vazio}</div> : children}
    </div>
  );
}

export function RodapeLista({ mostrando, total, rotulo, onMais, passo, nota }: { mostrando: number; total: number; rotulo: string; onMais: () => void; passo: number; nota?: string }) {
  const resta = total - mostrando;
  return (
    <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 20px", background: V.bg, borderTop: `1px solid ${V.border}` }}>
      <span style={{ fontSize: 13, color: V.muted, fontVariantNumeric: "tabular-nums" }}>
        Mostrando {num(mostrando)} de {num(total)} {rotulo}
        {nota ? ` · ${nota}` : ""}
      </span>
      {resta > 0 && (
        <button type="button" onClick={onMais} style={{ background: "none", border: "none", padding: "6px 4px", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: V.primary, cursor: "pointer" }}>
          Mostrar mais {Math.min(passo, resta)}
        </button>
      )}
    </footer>
  );
}

/** Atualização escolhida numa notificação: indica qual registro localizar e leva à fila de origem (nenhuma rota abre o registro direto). */
export interface AtualizacaoSelecionada {
  entidade: string;
  acontecimento: string;
  href?: string;
}

export function AvisoAtualizacao({ aviso, encontrada, onDispensar }: { aviso: AtualizacaoSelecionada; encontrada: boolean; onDispensar: () => void }) {
  const navigate = useNavigate();
  return (
    <div role="status" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px", padding: "12px 20px", background: V.primarySoft, borderBottom: `1px solid ${V.border}` }}>
      <div style={{ flex: "1 1 260px", minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
        <strong style={{ fontWeight: 700 }}>Atualização selecionada:</strong> {aviso.entidade} — {aviso.acontecimento}{" "}
        <span style={{ color: V.muted }}>{encontrada ? "O registro está destacado na lista." : "Este registro não consta na lista demonstrativa desta expansão; abra a fila de origem para localizá-lo."}</span>
      </div>
      {aviso.href && (
        <button type="button" onClick={() => navigate({ to: aviso.href as string })} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: `1px solid ${V.primary}`, background: V.card, color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Abrir na fila de origem
        </button>
      )}
      <button type="button" onClick={onDispensar} aria-label="Dispensar aviso" style={{ background: "none", border: "none", color: V.muted, cursor: "pointer", padding: 4 }}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

/** Divide "Nome · mat. 123" (formato das listas demonstrativas) em nome e matrícula. */
export function separarNomeMatricula(texto: string): { nome: string; matricula?: string } {
  const m = /^(.*?)\s*·\s*mat\.\s*(\S+)\s*$/.exec(texto);
  return m ? { nome: m[1], matricula: m[2] } : { nome: texto };
}

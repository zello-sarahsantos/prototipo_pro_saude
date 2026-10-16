import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { GRUPOS_MOVIMENTACAO, type LinhaMovimentacao } from "@/lib/movimentacoes-pro-saude";
import { SecaoRecolhivel, V, num } from "./gd-ui";

/** "Movimentações realizadas na competência" — lê a fonte compartilhada com o Relatório NUPLA.
 *  Cada categoria é selecionável e abre o detalhamento por modalidade de pagamento e vínculo. */
export function MovimentacoesCard({ competencia, competenciaRotulo, linhas }: { competencia: string; competenciaRotulo: string; linhas: LinhaMovimentacao[] | null }) {
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);
  const total = linhas?.reduce((n, l) => n + l.total, 0) ?? 0;
  const sel = linhas?.find((l) => l.categoria === categoria);
  return (
    <SecaoRecolhivel
      titulo="Movimentações realizadas na competência"
      resumo={linhas ? `${num(total)} movimentações concluídas em ${competenciaRotulo}` : `Sem dados para ${competenciaRotulo}`}
      aberta={aberto}
      onAlternar={() => setAberto((v) => !v)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {(linhas ?? []).map((l) => {
            const on = categoria === l.categoria;
            return (
              <button
                key={l.categoria}
                type="button"
                className="gd-clk"
                data-sel={on ? "true" : undefined}
                aria-pressed={on}
                onClick={() => setCategoria(on ? null : l.categoria)}
                style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: "10px 12px", background: on ? V.primarySoft : "transparent", fontFamily: "inherit", color: V.text, textAlign: "left" }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: V.muted, lineHeight: 1.35 }}>{l.categoria}</div>
                <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{num(l.total)}</div>
              </button>
            );
          })}
        </div>
        {sel && (
          <div role="region" aria-label={`Detalhamento de ${sel.categoria}`} style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: 14, background: V.bg }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {sel.categoria} · {competenciaRotulo} <span style={{ fontWeight: 400, color: V.muted }}>· {num(sel.total)} movimentações por modalidade de pagamento e vínculo</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {GRUPOS_MOVIMENTACAO.map((g) => (
                <div key={g.chave} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 10px", background: V.card }}>
                  <div style={{ fontSize: 11, color: V.muted, fontWeight: 600 }}>{g.modalidade} · {g.vinculo}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(sel[g.chave])}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: V.muted, marginTop: 8 }}>A soma dos seis agrupamentos é igual ao total da categoria.</div>
          </div>
        )}
        <span style={{ fontSize: 12, color: V.muted, lineHeight: 1.5 }}>
          Somente movimentações concluídas. Cada dependente incluído ou excluído conta individualmente; a mesma pessoa pode ter mais de uma movimentação no período.
        </span>
        <div style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 18px" }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: V.primarySoft, color: V.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={20} />
          </span>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>Relatório de Movimentações do Pró-Saúde — NUPLA</div>
            <div style={{ fontSize: 13, color: V.muted, marginTop: 3, lineHeight: 1.5 }}>
              Consulte as movimentações concluídas por período, modalidade de pagamento e vínculo do servidor, com opções de exportação em PDF e Excel.
            </div>
          </div>
          <Link to="/admin/relatorios/nupla" search={{ periodicidade: "mensal", competencia }} style={{ display: "inline-flex", alignItems: "center", height: 44, padding: "0 18px", borderRadius: 8, background: V.primary, color: V.onPrimary, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", textDecoration: "none" }}>
            Acessar relatório NUPLA ↗
          </Link>
        </div>
      </div>
    </SecaoRecolhivel>
  );
}

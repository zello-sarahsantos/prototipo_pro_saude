import { Link } from "@tanstack/react-router";
import { BarChart3, ClipboardList, FileCheck, RefreshCcw, Users } from "lucide-react";
import { slugSituacaoTitular, type RelatorioGerado } from "@/lib/dashboard-gerdab";
import { V, cardBase, num } from "./gd-ui";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

interface PanoramaProps {
  titulares: number;
  dependentes: number;
  noTeto: number;
  percentualNoTeto: number;
  situacoes: { rotulo: string; titulares: number; percentual: number }[];
}

const metrica = { display: "block", color: V.text, textDecoration: "none", padding: "6px 8px", margin: "-6px -8px", borderRadius: 8 };
const colunas = "minmax(0, 1fr) 56px 56px";

export function PanoramaBase({ panorama, competenciaRotulo }: { panorama: PanoramaProps; competenciaRotulo: string; demo?: boolean }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
        Panorama da base <span style={{ fontWeight: 500, color: V.muted, fontSize: 14 }}>· posição atual do cadastro ({competenciaRotulo})</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div className="gd-bar" style={{ ...cardBase, padding: "20px 20px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 16, alignContent: "start" }}>
          <Link to="/admin/servidores" title="Abrir Servidores · titulares" className="gd-clk" style={{ ...metrica, border: `1px solid transparent` }}>
            <div style={{ fontSize: 13, color: V.muted, fontWeight: 600 }}>Titulares</div>
            <div style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{num(panorama.titulares)}</div>
          </Link>
          <div title="Servidores ainda não tem uma visão de dependentes." style={{ ...metrica, cursor: "default", border: "1px solid transparent" }}>
            <div style={{ fontSize: 13, color: V.muted, fontWeight: 600 }}>Dependentes</div>
            <div style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{num(panorama.dependentes)}</div>
            <div style={{ fontSize: 11, color: V.muted, marginTop: 2 }}>Visão própria ainda não disponível</div>
          </div>
          <Link to="/admin/relatorios/gerencial" hash="servidores-no-teto-familiar" title="Abrir o relatório Servidores no Teto Familiar (Visões Gerenciais)" className="gd-clk" style={{ ...metrica, border: `1px solid transparent` }}>
            <div style={{ fontSize: 13, color: V.muted, fontWeight: 600 }}>Servidores no Teto Familiar</div>
            <div style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
              {num(panorama.noTeto)} <span style={{ fontSize: 14, fontWeight: 600, color: V.muted }}>{pct(panorama.percentualNoTeto)}</span>
            </div>
          </Link>
        </div>
        <div className="gd-bar" style={{ ...cardBase, padding: "17px 20px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: colunas, gap: "0 12px", fontSize: 12, fontWeight: 600, color: V.muted, padding: "4px 0 8px", borderBottom: `1px solid ${V.border}` }}>
            <span>Situação do Beneficiário Titular</span><span style={{ textAlign: "right" }}>Qtd.</span><span style={{ textAlign: "right" }}>%</span>
          </div>
          {panorama.situacoes.map((s) => (
            <Link key={s.rotulo} to="/admin/servidores" search={{ situacao: slugSituacaoTitular(s.rotulo) }} title="Abrir Servidores filtrado por esta situação" className="gd-row" data-click="true" style={{ display: "grid", gridTemplateColumns: colunas, gap: "0 12px", fontSize: 14, padding: "9px 8px", margin: "0 -8px", borderRadius: 6, borderBottom: `1px solid ${V.border}`, color: V.text, textDecoration: "none" }}>
              <span>{s.rotulo}</span>
              <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(s.titulares)}</span>
              <span style={{ textAlign: "right", color: V.muted, fontVariantNumeric: "tabular-nums" }}>{pct(s.percentual)}</span>
            </Link>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: colunas, gap: "0 12px", fontSize: 14, padding: "9px 0 4px" }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(panorama.titulares)}</span>
            <span style={{ textAlign: "right", color: V.muted }}>100%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const atalho = { display: "flex", alignItems: "center", gap: 10, padding: 12, border: `1px solid ${V.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: V.text, minHeight: 44, boxSizing: "border-box" as const, textDecoration: "none" };

export function AtalhosERelatorios({ relatorios }: { relatorios: RelatorioGerado[] }) {
  const colunasRel = "44px 112px minmax(0, 1fr) auto";
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignItems: "stretch" }}>
      <div style={{ ...cardBase, padding: "18px 20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Atalhos</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <Link to="/admin/relatorios" className="gd-clk" style={atalho}><BarChart3 size={18} color={V.primary} />Relatórios</Link>
          <Link to="/admin/servidores" className="gd-clk" style={atalho}><Users size={18} color={V.primary} />Servidores</Link>
          <Link to="/admin/retroativos" className="gd-clk" style={{ ...atalho, lineHeight: 1.3 }}><RefreshCcw size={18} color={V.primary} />Ressarcimentos de meses anteriores</Link>
          <Link to="/admin/comprovantes" className="gd-clk" style={atalho}><FileCheck size={18} color={V.primary} />Comprovantes</Link>
          <Link to="/admin/requerimentos" className="gd-clk" style={atalho}><ClipboardList size={18} color={V.primary} />Requerimentos</Link>
        </div>
      </div>
      <div style={{ ...cardBase, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Últimos relatórios gerados</h2>
          <Link to="/admin/relatorios" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Ver todos →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: colunasRel, gap: "0 12px", fontSize: 12, color: V.muted, fontWeight: 600, padding: "6px 0" }}>
          <span>Seq.</span><span>Tipo</span><span>Competência · responsável</span><span>Data</span>
        </div>
        {relatorios.length === 0 && (
          <div style={{ fontSize: 13, color: V.muted, padding: "10px 0", borderTop: `1px solid ${V.border}` }}>
            Nenhum relatório gerado ainda. Os relatórios do Fechamento de Pagamento e das Consolidações de Ressarcimentos de meses anteriores aparecem aqui.
          </div>
        )}
        {relatorios.map((r) => {
          const vigente = r.tipo === "Fechamento de Pagamento";
          return (
            <Link key={r.id} to={r.destino} search={r.destino === "/admin/relatorios/pagamentos/historico" ? { relatorio: r.id } : undefined} title="Abrir registro histórico do relatório (somente leitura)" className="gd-row" data-click="true" style={{ display: "grid", gridTemplateColumns: colunasRel, gap: "0 12px", fontSize: 13, alignItems: "center", padding: "8px 8px", margin: "0 -8px", borderRadius: 6, borderTop: `1px solid ${V.border}`, color: V.text, textDecoration: "none" }}>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.sequencia}</span>
              <span style={{ justifySelf: "start", fontSize: 11, fontWeight: 600, color: vigente ? V.primary : V.amber, background: vigente ? V.primarySoft : V.amberSoft, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{vigente ? "Vigente" : "Meses anteriores"}</span>
              <span style={{ minWidth: 0 }}>{r.referencia} · <span style={{ color: V.muted }}>{r.responsavel}</span></span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: V.muted }}>{new Date(r.geradoEm).toLocaleDateString("pt-BR")}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Info, Search, X } from "lucide-react";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";
import { formatCompetencia } from "@/lib/mock-data";
import type { LinhaRecorrencia, RegistroInadimplente, SituacaoFechamentoCompetencia } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { ListaPaginada, V, botaoTexto, cardBase, num } from "./gd-ui";

const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

interface Props {
  dados: DadosDashboard;
  competencia: string;
  competenciaRotulo: string;
  situacao: SituacaoFechamentoCompetencia;
  competencias: { chave: string; rotulo: string }[];
}

const tile = { display: "flex", flexDirection: "column" as const, gap: 4, padding: "12px 14px", border: `1px solid ${V.border}`, borderRadius: 10, color: V.text, textDecoration: "none" };
const rotuloTile = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: V.muted };
const valorTile = { fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" as const };
const acaoTile = { fontSize: 13, fontWeight: 600, color: V.primary };

export function FechamentoCompetencia({ dados, competencia, competenciaRotulo, situacao, competencias }: Props) {
  const { adimplentes, inadimplentes, requerAnalise } = dados.fechamento;
  const [aberta, setAberta] = useState(false);
  const [aba, setAba] = useState<"competencia" | "recorrente">("competencia");
  const [de, setDe] = useState(competencias[0]?.chave ?? competencia);
  const [ate, setAte] = useState(competencias[competencias.length - 1]?.chave ?? competencia);
  const [gerando, setGerando] = useState<"pdf" | "xlsx" | null>(null);
  const total = adimplentes + inadimplentes.length + requerAnalise;
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : "0%");
  const recorrentes: LinhaRecorrencia[] = useMemo(() => (aberta && aba === "recorrente" ? dados.recorrencia(de, ate) : []), [aberta, aba, de, ate, dados]);
  const periodo = `${formatCompetencia(de)} a ${formatCompetencia(ate)}`;
  // Pesquisa por nome ou matrícula do titular — uma por aba, para os resultados de uma consulta nunca aparecerem na outra.
  const [buscaComp, setBuscaComp] = useState("");
  const [buscaRec, setBuscaRec] = useState("");
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const bate = (nome: string, matricula: string | undefined, termo: string) => {
    const q = norm(termo);
    return !q || norm(nome).includes(q) || (matricula ?? "").includes(termo.trim());
  };
  const inadFiltrados = useMemo(() => inadimplentes.filter((r) => bate(r.nome, r.matricula, buscaComp)), [inadimplentes, buscaComp]);
  const recFiltrados = useMemo(() => recorrentes.filter((r) => bate(r.nome, r.matricula, buscaRec)), [recorrentes, buscaRec]);

  const specCompetencia: RelatorioExportSpec<RegistroInadimplente> = {
    titulo: "Inadimplentes da competência",
    origem: "Dashboard",
    competencia: competenciaRotulo,
    filtrosAplicados: buscaComp.trim() ? [`Busca: "${buscaComp.trim()}"`] : [],
    colunas: [
      { header: "Servidor", valor: (r) => r.nome, tipo: "texto", width: 30 },
      { header: "Matrícula", valor: (r) => r.matricula ?? "—", tipo: "texto" },
      { header: "Competência", valor: () => competenciaRotulo, tipo: "texto" },
    ],
    linhas: inadFiltrados,
    nomeArquivoBase: `pro-saude_inadimplentes_${competencia}`,
  };
  const specRecorrente: RelatorioExportSpec<LinhaRecorrencia> = {
    titulo: "Inadimplência recorrente",
    origem: "Dashboard",
    competencia: periodo,
    filtrosAplicados: buscaRec.trim() ? [`Busca: "${buscaRec.trim()}"`] : [],
    colunas: [
      { header: "Posição", valor: (r) => r.posicao, tipo: "numero" },
      { header: "Servidor", valor: (r) => r.nome, tipo: "texto", width: 30 },
      { header: "Matrícula", valor: (r) => r.matricula ?? "—", tipo: "texto" },
      { header: "Competências", valor: (r) => r.competencias.map(formatCompetencia).join(", "), tipo: "texto", width: 36 },
      { header: "Ocorrências", valor: (r) => r.competencias.length, tipo: "numero" },
    ],
    linhas: recFiltrados,
    nomeArquivoBase: `pro-saude_inadimplencia_recorrente_${de}_${ate}`,
  };

  async function exportar(formato: "pdf" | "xlsx") {
    setGerando(formato);
    try {
      if (formato === "pdf") {
        const { exportarRelatorioPDF } = await import("@/lib/relatorio-export-pdf");
        aba === "competencia" ? exportarRelatorioPDF(specCompetencia) : exportarRelatorioPDF(specRecorrente);
      } else {
        const { exportarRelatorioXLSX } = await import("@/lib/relatorio-export-xlsx");
        await (aba === "competencia" ? exportarRelatorioXLSX(specCompetencia) : exportarRelatorioXLSX(specRecorrente));
      }
    } finally {
      setGerando(null);
    }
  }

  const fichaLink = (matricula?: string) =>
    matricula ? (
      <Link to="/admin/servidores/$id" params={{ id: matricula }} style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Ver ficha →</Link>
    ) : (
      <span title="Registro de origem Associação: não há matrícula no modelo de dados." style={{ fontSize: 12, color: V.muted }}>Sem matrícula</span>
    );
  const campoBusca = (valor: string, set: (v: string) => void) => (
    <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: 8 }}>
      <Search size={16} color={V.muted} style={{ position: "absolute", left: 12 }} />
      <input
        type="search"
        value={valor}
        onChange={(e) => set(e.target.value)}
        placeholder="Pesquisar servidor por nome ou matrícula…"
        aria-label="Pesquisar servidor por nome ou matrícula"
        style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 40px 0 36px", border: `1px solid ${V.border}`, borderRadius: 10, background: V.bg, color: V.text, fontFamily: "inherit", fontSize: 14 }}
      />
      {valor && (
        <button type="button" onClick={() => set("")} aria-label="Limpar pesquisa" style={{ ...botaoTexto, position: "absolute", right: 8, width: 28, height: 28, borderRadius: 6, color: V.muted, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
  const abrirComp = () => {
    if (aberta && aba === "competencia") setAberta(false);
    else {
      setAberta(true);
      setAba("competencia");
    }
  };
  const abaEstilo = (on: boolean) => ({ flex: "1 1 auto", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 12px", borderRadius: 7, cursor: "pointer", background: on ? V.card : "transparent", color: on ? V.text : V.muted, boxShadow: on ? "0 1px 2px rgba(10,22,40,0.12)" : "none" });
  const botExp = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, padding: "0 12px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" } as const;
  const seletor = { height: 36, padding: "0 8px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 13 } as const;
  const linhaLista = { display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "4px 14px", padding: "8px 8px", margin: "0 -8px", borderRadius: 6, borderTop: `1px solid ${V.border}` };

  return (
    <section className="gd-bar" style={{ ...cardBase, padding: "20px 20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          Fechamento da competência <span style={{ fontWeight: 500, color: V.muted, fontSize: 14 }}>· {competenciaRotulo}</span>
        </h2>
        <span style={{ fontSize: 13, color: V.muted }}>
          {situacao.fechada ? "Fechada automaticamente em" : "Fechamento automático em"} <strong style={{ color: V.text }}>{dataCurta(situacao.fechamentoEm)}</strong> · 2º dia útil
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        <Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} title="Consolidação vigente · Adimplentes" className="gd-clk gd-card-ind gd-card-sec" style={tile}>
          <span className="gd-titulo" style={rotuloTile}><span style={{ width: 8, height: 8, borderRadius: 2, background: V.green }} />Adimplentes</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={valorTile}>{num(adimplentes)}</span><span style={{ fontSize: 13, color: V.muted }}>servidores</span></span>
          <span style={acaoTile}>Ver relação →</span>
        </Link>
        <button type="button" onClick={abrirComp} aria-expanded={aberta && aba === "competencia"} className="gd-clk gd-card-ind gd-card-sec" data-sel={aberta && aba === "competencia" ? "true" : undefined} style={{ ...tile, alignItems: "flex-start", background: V.card, fontFamily: "inherit", textAlign: "left" }}>
          <span className="gd-titulo" style={rotuloTile}><span style={{ width: 8, height: 8, borderRadius: 2, background: V.red }} />Inadimplentes</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={valorTile}>{num(inadimplentes.length)}</span><span style={{ fontSize: 13, color: V.muted }}>servidores</span></span>
          <span style={acaoTile}>Consultar e exportar →</span>
        </button>
        <Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "requer_analise" }} title="Consolidação vigente · Requer análise" className="gd-clk gd-card-ind gd-card-sec" style={tile}>
          <span className="gd-titulo" style={rotuloTile}><span style={{ width: 8, height: 8, borderRadius: 2, background: V.amber }} />Requer análise</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={valorTile}>{num(requerAnalise)}</span><span style={{ fontSize: 13, color: V.muted }}>servidores</span></span>
          <span style={acaoTile}>Ver pendências →</span>
        </Link>
      </div>

      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: V.track, gap: 2 }}>
        <div style={{ width: pct(adimplentes), background: V.green }} />
        <div style={{ width: pct(inadimplentes.length), background: V.red }} />
        <div style={{ width: pct(requerAnalise), background: V.amber }} />
      </div>

      <p style={{ fontSize: 12, color: V.muted, margin: 0, lineHeight: 1.5 }}>
        {situacao.fechada
          ? `Registros recebidos a partir de ${dataCurta(situacao.terceiroDiaUtil)} (3º dia útil) passaram a integrar a competência ${situacao.proximaCompetencia}.`
          : `A partir de ${dataCurta(situacao.terceiroDiaUtil)} (3º dia útil), novos registros passam a integrar a competência ${situacao.proximaCompetencia}.`}{" "}
        Não há fechamento manual pela GERDAB. A Consolidação vigente não inclui Ressarcimentos de meses anteriores.
      </p>

      <div style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: V.primarySoft, color: V.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Info size={16} /></span>
        <span style={{ flex: "1 1 260px", fontSize: 13, color: V.muted, lineHeight: 1.5 }}>Consulte os inadimplentes da competência, identifique recorrências e exporte os resultados em PDF ou Excel.</span>
        <button type="button" className="gd-clk" onClick={() => { if (aberta && aba === "recorrente") setAberta(false); else { setAberta(true); setAba("recorrente"); } }} aria-expanded={aberta && aba === "recorrente"} style={{ height: 40, padding: "0 14px", border: `1px solid ${V.primary}`, borderRadius: 8, background: V.primary, color: V.onPrimary, boxShadow: aberta && aba === "recorrente" ? `0 0 0 3px ${V.primarySoft}` : undefined, fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          Consultar inadimplência recorrente ↗
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateRows: aberta ? "1fr" : "0fr", marginTop: aberta ? 0 : -14, transition: "grid-template-rows 260ms ease, margin-top 260ms ease" }}>
        <div style={{ overflow: "hidden", minHeight: 0, visibility: aberta ? "visible" : "hidden", transition: "visibility 260ms" }}>
          <div style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Consulta de inadimplência</span>
              <button type="button" onClick={() => setAberta(false)} style={{ ...botaoTexto, fontSize: 13, fontWeight: 600, color: V.muted }}>Fechar consulta ×</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div role="tablist" style={{ display: "flex", gap: 4, background: V.track, padding: 4, borderRadius: 10 }}>
                <button role="tab" type="button" className="gd-opt" aria-selected={aba === "competencia"} onClick={() => setAba("competencia")} style={abaEstilo(aba === "competencia")}>Inadimplentes da competência</button>
                <button role="tab" type="button" className="gd-opt" aria-selected={aba === "recorrente"} onClick={() => setAba("recorrente")} style={abaEstilo(aba === "recorrente")}>Inadimplência recorrente</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>Exportar consulta:</span>
                <button type="button" className="gd-opt" onClick={() => exportar("pdf")} disabled={gerando !== null} style={botExp}><FileDown size={14} />{gerando === "pdf" ? "Gerando..." : "Exportar PDF"}</button>
                <button type="button" className="gd-opt" onClick={() => exportar("xlsx")} disabled={gerando !== null} style={botExp}><FileSpreadsheet size={14} />{gerando === "xlsx" ? "Gerando..." : "Exportar Excel"}</button>
              </div>
            </div>

            {aba === "competencia" ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13, color: V.muted, paddingBottom: 8 }}>
                  <span>Competência consultada: <strong style={{ color: V.text }}>{competenciaRotulo}</strong></span>
                  <span><strong style={{ color: V.text, fontVariantNumeric: "tabular-nums" }}>{num(inadFiltrados.length)}</strong> {buscaComp.trim() ? `de ${num(inadimplentes.length)} servidores encontrados` : "servidores identificados"}</span>
                </div>
                {campoBusca(buscaComp, setBuscaComp)}
                <ListaPaginada
                  key={"inad" + competencia + dados.fonte + buscaComp}
                  itens={inadFiltrados}
                  passo={10}
                  rotulo="inadimplentes"
                  vazio={buscaComp.trim() ? `Nenhum servidor encontrado para “${buscaComp.trim()}”.` : "Nenhum inadimplente nesta competência."}
                  render={(r) => (
                    <div key={r.chave} className="gd-row" style={linhaLista}>
                      <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{r.nome}</span> {r.matricula && <span style={{ color: V.muted }}>· mat. {r.matricula}</span>}</div>
                      <span style={{ fontSize: 12, color: V.muted }}>{competenciaRotulo}</span>
                      {fichaLink(r.matricula)}
                    </div>
                  )}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: V.muted }}>De
                    <select value={de} onChange={(e) => { setDe(e.target.value); if (e.target.value > ate) setAte(e.target.value); }} style={seletor}>
                      {competencias.map((c) => <option key={c.chave} value={c.chave} disabled={c.chave > ate}>{c.rotulo}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: V.muted }}>Até
                    <select value={ate} onChange={(e) => { setAte(e.target.value); if (e.target.value < de) setDe(e.target.value); }} style={seletor}>
                      {competencias.map((c) => <option key={c.chave} value={c.chave} disabled={c.chave < de}>{c.rotulo}</option>)}
                    </select>
                  </label>
                  <span style={{ fontSize: 12, color: V.muted }}>{periodo} · {buscaRec.trim() ? `${recFiltrados.length} de ${recorrentes.length} servidores encontrados` : `${recorrentes.length} servidores`}</span>
                </div>
                {campoBusca(buscaRec, setBuscaRec)}
                <ListaPaginada
                  key={"rec" + de + ate + dados.fonte + buscaRec}
                  itens={recFiltrados}
                  passo={10}
                  rotulo="servidores"
                  vazio={buscaRec.trim() ? `Nenhum servidor encontrado para “${buscaRec.trim()}”.` : "Nenhuma ocorrência de inadimplência no período."}
                  render={(r) => {
                    const n = r.competencias.length;
                    const tom = n >= 4 ? { fg: V.red, bg: V.redSoft } : n >= 2 ? { fg: V.amber, bg: V.amberSoft } : { fg: V.muted, bg: V.track };
                    return (
                      <div key={r.chave} className="gd-row" style={linhaLista}>
                        <span style={{ width: 22, fontSize: 12, color: V.muted, fontVariantNumeric: "tabular-nums" }}>{r.posicao}º</span>
                        <div style={{ flex: "1 1 200px", minWidth: 0, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{r.nome}</span> {r.matricula && <span style={{ color: V.muted }}>· mat. {r.matricula}</span>}</div>
                        <span style={{ flex: "1 1 160px", fontSize: 12, color: V.muted }}>{r.competencias.map((c) => formatCompetencia(c)).join(", ")}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tom.fg, background: tom.bg, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{n} {n === 1 ? "ocorrência" : "ocorrências"}</span>
                        {fichaLink(r.matricula)}
                      </div>
                    );
                  }}
                />
                <div style={{ fontSize: 12, color: V.muted, paddingTop: 8, borderTop: `1px solid ${V.border}`, lineHeight: 1.5 }}>
                  Considera no máximo uma ocorrência por servidor em cada competência, com os dados disponíveis neste sistema.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

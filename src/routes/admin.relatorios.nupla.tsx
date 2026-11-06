import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, FileCheck2, FileSpreadsheet, FileText, History, Loader2, X } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { useEmissoes } from "@/lib/emissoes-relatorio";
import { getDataReferencia } from "@/lib/dias-uteis";
import {
  GRUPOS_MOVIMENTACAO,
  MESES_NOME,
  getBimestresDoPeriodo,
  getDetalhamentoPorBimestre,
  getMovimentacoesDoPeriodo,
  getUltimoMesComDados,
  mesTemDados,
  periodoEmAndamento,
  tituloDoPeriodo,
  totalGeral,
  type Periodicidade,
  type PeriodoMovimentacao,
} from "@/lib/movimentacoes-pro-saude";
import { ROTULO_PERIODICIDADE, TIPO_EMISSAO_NUPLA, emitirRelatorioNupla, specNuplaBimestre, specNuplaEmissao, specNuplaPrincipal, NOTA_MOVIMENTACOES, type EmissaoNupla } from "@/lib/relatorio-nupla";
import { responsavelCadastro } from "@/lib/servidor-cadastro";
import { V, num } from "@/components/dashboard-gerdab/gd-ui";

interface NuplaSearch {
  periodicidade?: Periodicidade;
  /** Mensal: competência `AAAA-MM`. */
  competencia?: string;
  /** Semestral: 1 ou 2. */
  semestre?: 1 | 2;
  /** Detalhamento: chave do bimestre (`"a-b"`) ou `"todos"`. */
  bimestre?: string;
}

export const Route = createFileRoute("/admin/relatorios/nupla")({
  // Parâmetros vindos do Dashboard (Movimentações realizadas na competência).
  validateSearch: (s: Record<string, unknown>): NuplaSearch => ({
    periodicidade: s.periodicidade === "mensal" || s.periodicidade === "semestral" || s.periodicidade === "anual" ? s.periodicidade : undefined,
    competencia: typeof s.competencia === "string" && /^\d{4}-\d{2}$/.test(s.competencia) ? s.competencia : undefined,
    semestre: s.semestre === 1 || s.semestre === "1" ? 1 : s.semestre === 2 || s.semestre === "2" ? 2 : undefined,
    bimestre: typeof s.bimestre === "string" && /^(todos|\d{1,2}-\d{1,2})$/.test(s.bimestre) ? s.bimestre : undefined,
  }),
  component: RelatorioNupla,
});

const REGRA: Record<Periodicidade, string> = {
  mensal: "Mensal: considera as movimentações concluídas no mês selecionado.",
  semestral: "Semestral: consolida as movimentações concluídas em cada mês do semestre, sem duplicar registros.",
  anual: "Anual: consolida as movimentações concluídas em cada mês do ano, sem duplicar registros.",
};

const th: React.CSSProperties = { padding: "8px", fontWeight: 600, borderBottom: `1px solid ${V.border}` };
const celula: React.CSSProperties = { padding: "9px 8px", textAlign: "right", borderBottom: `1px solid ${V.border}` };
const separador = `1px solid ${V.border}`;

function BotaoExportar({ tipo, rotulo, onClick, ocupado, desabilitado }: { tipo: "pdf" | "xlsx"; rotulo: string; onClick: () => void; ocupado: boolean; desabilitado?: boolean }) {
  const Icone = tipo === "pdf" ? FileText : FileSpreadsheet;
  return (
    <button type="button" className="gd-opt" onClick={onClick} disabled={ocupado || desabilitado} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 14px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: ocupado || desabilitado ? "not-allowed" : "pointer", opacity: desabilitado ? 0.5 : 1 }}>
      {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Icone size={14} color={tipo === "pdf" ? "var(--gd-red)" : "var(--gd-green)"} />}
      {rotulo}
    </button>
  );
}

const fundoModal: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,22,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" };
const caixaModal: React.CSSProperties = { background: V.card, color: V.text, border: `1px solid ${V.border}`, borderRadius: 12, padding: 20, maxHeight: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 };
const botaoAcao: React.CSSProperties = { height: 36, padding: "0 12px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" };

/** Histórico das emissões do relatório NUPLA: consulta e reexportação a partir do conteúdo registrado (Q40). */
function HistoricoEmissoesNupla({ emissoes, onFechar }: { emissoes: EmissaoNupla[]; onFechar: () => void }) {
  const [ver, setVer] = useState<EmissaoNupla | null>(null);
  const lista = [...emissoes].sort((a, b) => b.geradoEm.localeCompare(a.geradoEm));
  async function baixar(e: EmissaoNupla, formato: "pdf" | "xlsx") {
    if (formato === "pdf") {
      const { exportarRelatorioPDF } = await import("@/lib/relatorio-export-pdf");
      exportarRelatorioPDF(specNuplaEmissao(e));
    } else {
      const { exportarRelatorioXLSX } = await import("@/lib/relatorio-export-xlsx");
      await exportarRelatorioXLSX(specNuplaEmissao(e));
    }
  }
  return (
    <div style={fundoModal} onMouseDown={(ev) => ev.target === ev.currentTarget && onFechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="nupla-hist" style={{ ...caixaModal, width: "min(720px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="nupla-hist" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Histórico de emissões</h2>
            <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Cada emissão preserva o conteúdo registrado, sem recálculo.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" style={{ background: "none", border: "none", color: V.muted, cursor: "pointer", height: 32, width: 32 }}><X size={18} /></button>
        </div>
        {lista.length === 0 ? (
          <p style={{ fontSize: 13, color: V.muted, margin: 0 }}>Nenhum relatório emitido.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {lista.map((e) => (
              <li key={e.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, minWidth: 0 }}>
                  <strong>Relatório nº {e.numero} — {e.parametros?.titulo}</strong>
                  <span style={{ display: "block", fontSize: 12, color: V.muted }}>{ROTULO_PERIODICIDADE[(e.parametros?.periodicidade ?? "mensal") as keyof typeof ROTULO_PERIODICIDADE]} · {new Date(e.geradoEm).toLocaleString("pt-BR")} · {e.responsavel}</span>
                </span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button type="button" style={botaoAcao} onClick={() => setVer(ver?.id === e.id ? null : e)}>Visualizar</button>
                  <button type="button" style={botaoAcao} onClick={() => baixar(e, "pdf")}>PDF</button>
                  <button type="button" style={botaoAcao} onClick={() => baixar(e, "xlsx")}>Excel</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {ver && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <thead><tr><th style={{ ...th, textAlign: "left" }}>Movimentação</th>{GRUPOS_MOVIMENTACAO.map((g) => <th key={g.chave} style={{ ...th, textAlign: "right" }}>{g.modalidade} {g.vinculo}</th>)}<th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
              <tbody>
                {ver.linhas.map((l) => (
                  <tr key={l.categoria}><td style={{ ...celula, textAlign: "left" }}>{l.categoria}</td>{GRUPOS_MOVIMENTACAO.map((g) => <td key={g.chave} style={celula}>{num(l[g.chave])}</td>)}<td style={{ ...celula, fontWeight: 700 }}>{num(l.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RelatorioNupla() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/relatorios/nupla" });
  const ref = getDataReferencia();
  const ultimo = getUltimoMesComDados();

  const periodicidade: Periodicidade = busca.periodicidade ?? "mensal";
  // Competência de origem → ano/mês; sem parâmetro, o mês da data de referência (em andamento).
  const [anoC, mesC] = busca.competencia ? busca.competencia.split("-").map(Number) : [ultimo.ano, ultimo.mes + 1];
  const ano = anoC;
  const mesIdx = mesTemDados(ano, mesC - 1) ? mesC - 1 : ultimo.mes;
  const semestre = busca.semestre ?? (ano === ref.getFullYear() && ultimo.mes >= 6 ? 2 : busca.competencia ? (mesIdx >= 6 ? 2 : 1) : ultimo.mes >= 6 ? 2 : 1);

  const periodo: PeriodoMovimentacao = useMemo(
    () => ({ periodicidade, ano, indice: periodicidade === "mensal" ? mesIdx : periodicidade === "semestral" ? semestre : 0 }),
    [periodicidade, ano, mesIdx, semestre],
  );

  const linhas = useMemo(() => getMovimentacoesDoPeriodo(periodo), [periodo]);
  const tot = totalGeral(linhas);
  const det = useMemo(() => getDetalhamentoPorBimestre(periodo), [periodo]);
  const bimestresComDados = useMemo(() => getBimestresDoPeriodo(periodo).filter((b) => b.temDados), [periodo]);
  const bimSel = busca.bimestre && (busca.bimestre === "todos" || bimestresComDados.some((b) => b.chave === busca.bimestre)) ? busca.bimestre : "todos";
  const titulo = tituloDoPeriodo(periodo);
  const comBimestres = periodicidade !== "mensal";

  const [gerando, setGerando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const emissoes = useEmissoes<EmissaoNupla["linhas"][number]>(TIPO_EMISSAO_NUPLA);
  const [confirmandoEmissao, setConfirmandoEmissao] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  function emitir() {
    const e = emitirRelatorioNupla(periodo, responsavelCadastro(getAdminRole()));
    setConfirmandoEmissao(false);
    setAviso(`Relatório nº ${e.numero} de ${titulo} emitido e registrado no histórico.`);
  }

  async function exportar(chave: string, formato: "pdf" | "xlsx", bimestre: boolean) {
    setGerando(chave);
    setAviso("");
    try {
      if (formato === "pdf") {
        const { exportarRelatorioPDF } = await import("@/lib/relatorio-export-pdf");
        bimestre ? exportarRelatorioPDF(specNuplaBimestre(periodo, bimSel)) : exportarRelatorioPDF(specNuplaPrincipal(periodo));
      } else {
        const { exportarRelatorioXLSX } = await import("@/lib/relatorio-export-xlsx");
        await (bimestre ? exportarRelatorioXLSX(specNuplaBimestre(periodo, bimSel)) : exportarRelatorioXLSX(specNuplaPrincipal(periodo)));
      }
      setAviso(`${formato === "pdf" ? "PDF" : "Excel"} gerado: ${bimestre ? "detalhamento por bimestre" : "relatório principal"} — ${titulo}.`);
    } finally {
      setGerando(null);
    }
  }

  const definir = (p: NuplaSearch) => navigate({ search: (a) => ({ ...a, bimestre: undefined, ...p }), replace: true });
  const opcoesMes = Array.from({ length: ultimo.mes + 1 }, (_, i) => i).filter((i) => mesTemDados(ano, i));
  const semestres: (1 | 2)[] = ano === ultimo.ano ? (ultimo.mes >= 6 ? [1, 2] : [1]) : [1, 2];

  const seletor: React.CSSProperties = { height: 40, minWidth: 200, padding: "0 10px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 14, fontWeight: 600 };

  return (
    <div className="gd" style={{ padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 20, background: V.bg, minHeight: "100%" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Link to="/admin/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600, color: V.muted }}><ChevronLeft size={14} /> Dashboard</Link>
          <div style={{ fontSize: 12, fontWeight: 600, color: V.muted, marginTop: 6 }}>Relatórios › NUPLA</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: "4px 0 0" }}>Movimentações do Pró-Saúde — NUPLA</h1>
          <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Movimentações concluídas, por forma de pagamento e vínculo.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span title="Os números deste relatório são fictícios: o projeto ainda não registra o histórico real de movimentações." style={{ fontSize: 11, fontWeight: 600, color: V.amber, background: V.amberSoft, padding: "3px 9px", borderRadius: 999 }}>Dados demonstrativos</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>Relatório principal:</span>
          <BotaoExportar tipo="pdf" rotulo="Exportar PDF" ocupado={gerando === "p-pdf"} onClick={() => exportar("p-pdf", "pdf", false)} />
          <BotaoExportar tipo="xlsx" rotulo="Exportar Excel" ocupado={gerando === "p-xlsx"} onClick={() => exportar("p-xlsx", "xlsx", false)} />
          <button type="button" className="gd-opt" onClick={() => setConfirmandoEmissao(true)} style={{ ...botaoAcao, height: 40, display: "inline-flex", alignItems: "center", gap: 6 }}><FileCheck2 size={14} /> Emitir relatório</button>
          <button type="button" className="gd-opt" onClick={() => setHistoricoAberto(true)} style={{ ...botaoAcao, height: 40, display: "inline-flex", alignItems: "center", gap: 6 }}><History size={14} /> Histórico de emissões ({num(emissoes.length)})</button>
        </div>
      </header>

      {aviso && <div role="status" style={{ fontSize: 13, color: V.primary, background: V.primarySoft, padding: "10px 14px", borderRadius: 8 }}>{aviso}</div>}

      <section style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "16px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>Periodicidade</span>
          <div role="tablist" style={{ display: "flex", gap: 4, background: V.track, padding: 4, borderRadius: 10 }}>
            {(["mensal", "semestral", "anual"] as const).map((k) => {
              const on = periodicidade === k;
              return (
                <button key={k} role="tab" type="button" aria-selected={on} onClick={() => definir({ periodicidade: k })} style={{ border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 7, cursor: "pointer", background: on ? V.card : "transparent", color: on ? V.text : V.muted }}>
                  {k === "mensal" ? "Mensal" : k === "semestral" ? "Semestral" : "Anual"}
                </button>
              );
            })}
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: V.muted }}>
          {periodicidade === "mensal" ? "Mês" : periodicidade === "semestral" ? "Semestre" : "Ano"}
          {periodicidade === "mensal" && (
            <select value={mesIdx} onChange={(e) => definir({ competencia: `${ano}-${String(Number(e.target.value) + 1).padStart(2, "0")}` })} style={seletor}>
              {opcoesMes.map((i) => (
                <option key={i} value={i}>{tituloDoPeriodo({ periodicidade: "mensal", ano, indice: i })}</option>
              ))}
            </select>
          )}
          {periodicidade === "semestral" && (
            <select value={semestre} onChange={(e) => definir({ semestre: Number(e.target.value) as 1 | 2 })} style={seletor}>
              {semestres.map((s) => (
                <option key={s} value={s}>{tituloDoPeriodo({ periodicidade: "semestral", ano, indice: s })}</option>
              ))}
            </select>
          )}
          {periodicidade === "anual" && (
            <select value={ano} onChange={() => undefined} style={seletor}>
              <option value={ano}>{tituloDoPeriodo({ periodicidade: "anual", ano, indice: 0 }).replace("Anual ", "")}</option>
            </select>
          )}
        </label>
        <p style={{ flex: "1 1 300px", fontSize: 12, color: V.muted, margin: 0, lineHeight: 1.5 }}>{REGRA[periodicidade]}</p>
      </section>

      <section style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${V.border}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 16px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: V.muted, letterSpacing: 0.3 }}>GOVERNO DO DISTRITO FEDERAL · DETRAN-DF · GERDAB</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Movimentações do Pró-Saúde — {titulo}</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ color: V.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 }}>
                <th style={{ padding: "10px 20px 4px" }} />
                {(["Boletos", "ASSEFAZ", "ASSETRAN"] as const).map((m, i) => (
                  <th key={m} colSpan={2} style={{ textAlign: "center", padding: "10px 8px 4px", fontWeight: 600, borderBottom: separador, borderLeft: i ? separador : undefined }}>{m}</th>
                ))}
                <th style={{ borderLeft: separador }} />
              </tr>
              <tr style={{ color: V.muted, fontSize: 12 }}>
                <th style={{ ...th, textAlign: "left", padding: "8px 20px" }}>Movimentação</th>
                {GRUPOS_MOVIMENTACAO.map((g, i) => (
                  <th key={g.chave} style={{ ...th, textAlign: "right", borderLeft: i % 2 === 0 && i > 0 ? separador : undefined }}>{g.vinculo}</th>
                ))}
                <th style={{ ...th, textAlign: "right", padding: "8px 20px", fontWeight: 700, color: V.text, borderLeft: separador }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.categoria} className="gd-row">
                  <td style={{ ...celula, textAlign: "left", padding: "9px 20px" }}>{l.categoria}</td>
                  {GRUPOS_MOVIMENTACAO.map((g, i) => (
                    <td key={g.chave} style={{ ...celula, borderLeft: i % 2 === 0 && i > 0 ? separador : undefined }}>{num(l[g.chave])}</td>
                  ))}
                  <td style={{ ...celula, padding: "9px 20px", fontWeight: 700, borderLeft: separador }}>{num(l.total)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: V.primarySoft }}>
                <td style={{ padding: "10px 20px" }}>Total de movimentações</td>
                {GRUPOS_MOVIMENTACAO.map((g, i) => (
                  <td key={g.chave} style={{ padding: "10px 8px", textAlign: "right", borderLeft: i % 2 === 0 && i > 0 ? separador : undefined }}>{num(tot[g.chave])}</td>
                ))}
                <td style={{ padding: "10px 20px", textAlign: "right", borderLeft: separador }}>{num(tot.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: V.muted, margin: 0, padding: "12px 20px", lineHeight: 1.5 }}>{NOTA_MOVIMENTACOES}</p>
      </section>

      {comBimestres && (
        <section style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.border}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "10px 16px" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Detalhamento por bimestre</div>
              <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>Como na planilha de referência: “Janeiro/Fevereiro” reúne as movimentações ocorridas nos dois meses.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: V.muted }}>
                Exportar
                <select value={bimSel} onChange={(e) => definir({ bimestre: e.target.value })} aria-label="Bimestre a exportar" style={{ ...seletor, minWidth: 0, fontSize: 13, padding: "0 8px" }}>
                  <option value="todos">Todos os bimestres</option>
                  {bimestresComDados.map((b) => (
                    <option key={b.chave} value={b.chave}>{b.rotulo}{b.emAndamento ? " (em andamento)" : ""}</option>
                  ))}
                </select>
              </label>
              <BotaoExportar tipo="pdf" rotulo="Detalhamento PDF" ocupado={gerando === "b-pdf"} onClick={() => exportar("b-pdf", "pdf", true)} />
              <BotaoExportar tipo="xlsx" rotulo="Detalhamento Excel" ocupado={gerando === "b-xlsx"} onClick={() => exportar("b-xlsx", "xlsx", true)} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ color: V.muted, fontSize: 12 }}>
                  <th style={{ ...th, textAlign: "left", padding: "8px 20px" }}>Movimentação</th>
                  {det.bimestres.map((b) => (
                    <th key={b.chave} style={{ ...th, textAlign: "right", whiteSpace: "nowrap", background: bimSel === b.chave ? V.primarySoft : "transparent" }}>
                      {b.rotulo}
                      {b.emAndamento && <div style={{ fontSize: 10, color: V.amber }}>em andamento</div>}
                    </th>
                  ))}
                  <th style={{ ...th, textAlign: "right", padding: "8px 20px", fontWeight: 700, color: V.text }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {det.linhas.map((l) => (
                  <tr key={l.categoria} className="gd-row">
                    <td style={{ ...celula, textAlign: "left", padding: "9px 20px" }}>{l.categoria}</td>
                    {l.valores.map((v, i) => (
                      <td key={i} style={{ ...celula, color: v === null ? V.muted : V.text, background: bimSel === det.bimestres[i].chave ? V.primarySoft : "transparent" }}>{v === null ? "—" : num(v)}</td>
                    ))}
                    <td style={{ ...celula, padding: "9px 20px", fontWeight: 700 }}>{num(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5, color: V.muted }}>
        Dados disponíveis até {MESES_NOME[ultimo.mes]}/{ultimo.ano}{periodoEmAndamento(periodo) || ano === ultimo.ano ? " (em andamento)" : ""}; meses futuros aparecem como “—”. Os totais de cada mês coincidem com “Movimentações realizadas na competência” no Dashboard.
      </p>
      {confirmandoEmissao && (
        <div style={fundoModal} onMouseDown={(ev) => ev.target === ev.currentTarget && setConfirmandoEmissao(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="nupla-emitir" style={{ ...caixaModal, width: "min(480px, 100%)" }}>
            <h2 id="nupla-emitir" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Emitir relatório — {titulo}</h2>
            <p style={{ fontSize: 13, margin: 0 }}>A emissão registra no histórico o conteúdo do período, com número sequencial, data e hora e responsável. O envio ao NUPLA permanece a cargo da GERDAB.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={botaoAcao} onClick={() => setConfirmandoEmissao(false)}>Cancelar</button>
              <button type="button" style={{ ...botaoAcao, background: V.primary, color: "#fff", borderColor: V.primary }} onClick={emitir}>Confirmar emissão</button>
            </div>
          </div>
        </div>
      )}
      {historicoAberto && <HistoricoEmissoesNupla emissoes={emissoes as EmissaoNupla[]} onFechar={() => setHistoricoAberto(false)} />}
    </div>
  );
}

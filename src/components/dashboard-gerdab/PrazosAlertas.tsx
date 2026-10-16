import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import type { FichaResumoServidor } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { ListaPaginada, SecaoRecolhivel, V, botaoTexto } from "./gd-ui";

const COR_TOM: Record<FichaResumoServidor["situacoes"][number]["tom"], string> = { red: V.red, amber: V.amber, neutral: V.muted, green: V.green };

function Rotulo({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: V.muted }}>{k}</div>
      <div style={{ fontSize: 13, fontWeight: k === "Servidor" ? 600 : 400, fontVariantNumeric: mono ? "tabular-nums" : undefined }}>{v}</div>
    </div>
  );
}

function FichaMini({ ficha }: { ficha: FichaResumoServidor }) {
  return (
    <div style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: 10, padding: "14px 16px", margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px 16px" }}>
        <Rotulo k="Servidor" v={ficha.nome} />
        <Rotulo k="Matrícula" v={ficha.matricula} mono />
        <Rotulo k="Situação funcional" v={ficha.situacaoFuncional} />
        <Rotulo k="Status Pró-Saúde" v={ficha.statusProSaude} />
        <Rotulo k="Plano" v={ficha.plano} />
        <Rotulo k="Vidas beneficiadas" v={String(ficha.vidas)} mono />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: V.muted, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>Situações registradas</div>
      {ficha.situacoes.length === 0 && (
        <div style={{ fontSize: 13, color: V.muted, display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={14} color={V.green} />
          Nenhuma pendência ou situação registrada para este servidor.
        </div>
      )}
      {ficha.situacoes.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: COR_TOM[s.tom] }} />
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600 }}>{s.tipo}</span> <span style={{ color: V.muted }}>— {s.descricao}</span>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 12, color: V.muted, margin: 0, lineHeight: 1.5 }}>
        Situações registradas que podem estar relacionadas ao não recebimento do benefício. Não indicam, por si só, a causa — a análise cabe à GERDAB.
      </p>
      <Link to="/admin/servidores/$id" params={{ id: ficha.matricula }} style={{ fontSize: 13, fontWeight: 600, alignSelf: "flex-start" }}>
        Abrir ficha completa em Servidores →
      </Link>
    </div>
  );
}

function Chip({ txt, fg, bg, border }: { txt: string; fg: string; bg: string; border: string }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: fg, background: bg, border: `1px solid ${border}`, padding: "2px 9px", borderRadius: 999, fontVariantNumeric: "tabular-nums" }}>{txt}</span>;
}

export function PrazosAlertas({ dados }: { dados: DadosDashboard }) {
  const alertas = dados.alertas.itens;
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [fichaAberta, setFichaAberta] = useState<string | null>(null);
  const resultados = useMemo(() => (busca.trim() ? dados.buscar(busca) : []), [busca, dados]);
  const pend = alertas.filter((a) => a.etapa === "aguardando_envio").length;
  const analise = alertas.filter((a) => a.etapa === "aguardando_analise").length;
  const atendidas = alertas.filter((a) => a.etapa === "aprovado").length;
  const resumo = `${pend} aguardando envio · ${analise} aguardando análise · ${atendidas} atendida${atendidas === 1 ? "" : "s"}`;
  const fichaPorMatricula = (matricula: string) => dados.buscar(matricula)[0] ?? null;
  const q = busca.trim();
  const buscaResumo = q ? (resultados.length === 1 ? "1 servidor encontrado na base" : `${resultados.length} servidores encontrados na base`) : `${alertas.length} alertas documentais`;

  const linha = (id: string, cab: React.ReactNode, chips: React.ReactNode, ficha: FichaResumoServidor | null) => {
    const on = fichaAberta === id;
    return (
      <div key={id} style={{ borderTop: `1px solid ${V.border}` }}>
        <div className="gd-row" data-click={ficha ? "true" : undefined} onClick={(e) => { if (ficha && !(e.target as HTMLElement).closest("a,button")) setFichaAberta(on ? null : id); }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px", padding: "10px 8px", margin: "0 -8px", borderRadius: 8 }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>{cab}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>{chips}</div>
          {ficha && (
            <button type="button" onClick={() => setFichaAberta(on ? null : id)} aria-expanded={on} style={{ ...botaoTexto, fontSize: 13, fontWeight: 600, color: V.primary, display: "inline-flex", alignItems: "center", gap: 4, minWidth: 96, justifyContent: "flex-end" }}>
              Abrir ficha <ChevronDown size={14} style={{ transform: on ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
            </button>
          )}
        </div>
        {on && ficha && <FichaMini ficha={ficha} />}
      </div>
    );
  };

  return (
    <SecaoRecolhivel titulo="Prazos e alertas documentais" resumo={resumo} aberta={aberto} onAlternar={() => setAberto((v) => !v)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>
        <p style={{ fontSize: 12, color: V.muted, margin: 0, lineHeight: 1.5 }}>
          Obrigações são identificadas automaticamente; a solicitação documental só existe quando registrada pela GERDAB. Um vencimento identificado não gera solicitação automática.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "6px 0 4px" }}>
          <div style={{ flex: "1 1 280px", position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={16} color={V.muted} style={{ position: "absolute", left: 12 }} />
            <input
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setFichaAberta(null);
              }}
              placeholder="Pesquisar servidor por nome ou matrícula..."
              aria-label="Pesquisar servidor por nome ou matrícula"
              style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 12px 0 36px", border: `1px solid ${V.border}`, borderRadius: 10, background: V.bg, color: V.text, fontFamily: "inherit", fontSize: 14 }}
            />
          </div>
          <span style={{ fontSize: 12, color: V.muted }}>{buscaResumo}</span>
        </div>

        {q && resultados.length === 0 && <div style={{ fontSize: 14, color: V.muted, padding: "14px 0", borderTop: `1px solid ${V.border}` }}>Nenhum servidor encontrado para "{q}".</div>}
        {!q && alertas.length === 0 && <div style={{ fontSize: 14, color: V.muted, padding: "14px 0", borderTop: `1px solid ${V.border}` }}>Nenhum prazo próximo</div>}

        {q
          ? <ListaPaginada key={q} itens={resultados} rotulo="servidores" render={(ficha) => {
              const s = { nome: ficha.nome, matricula: ficha.matricula };
              const n = ficha.situacoes.length;
              return linha(
                "s" + s.matricula,
                <>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.nome} <span style={{ fontWeight: 400, color: V.muted }}>· mat. {s.matricula}</span></div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{ficha.situacaoFuncional} · Status {ficha.statusProSaude} <span style={{ color: V.muted }}>· {ficha.plano} · {ficha.vidas} {ficha.vidas === 1 ? "vida" : "vidas"}</span></div>
                  <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>{ficha.dependentes}</div>
                </>,
                n > 0 ? <Chip txt={`${n} ${n === 1 ? "situação registrada" : "situações registradas"}`} fg={V.amber} bg={V.amberSoft} border={V.amberSoft} /> : <Chip txt="Sem pendências registradas" fg={V.green} bg={V.greenSoft} border={V.greenSoft} />,
                ficha,
              );
            }} />
          : alertas.map((a) => {
              const tom = a.etapa === "aprovado" ? { fg: V.green, bg: V.greenSoft } : a.vencido ? { fg: V.red, bg: V.redSoft } : { fg: V.amber, bg: V.amberSoft };
              const etapa = a.etapa === "aprovado" ? { fg: V.green, border: V.green } : a.etapa === "aguardando_envio" ? { fg: V.amber, border: V.amber } : { fg: V.muted, border: V.border };
              return linha(
                a.id,
                <>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.documento}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{a.titular} <span style={{ color: V.muted }}>· mat. {a.matricula}</span></div>
                  <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>Dependente: {a.beneficiario}</div>
                </>,
                <>
                  <Chip txt={a.prazoTexto} fg={tom.fg} bg={tom.bg} border={tom.bg} />
                  <Chip txt={a.etapaRotulo} fg={etapa.fg} bg="transparent" border={etapa.border} />
                </>,
                fichaPorMatricula(a.matricula),
              );
            })}
      </div>
    </SecaoRecolhivel>
  );
}

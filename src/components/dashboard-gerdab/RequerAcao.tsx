import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, FileText, FolderOpen } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { ROTULO_SITUACAO_COMPROVANTES, type LinhaRessarcimentoDashboard, type SituacaoComprovantes } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { IconeInfo, ListaPaginada, NadaPendente, V, botaoTexto, cardBase, linkNegrito, num } from "./gd-ui";

interface Props {
  dados: DadosDashboard;
  competencia: string;
  competenciaRotulo: string;
  vigente: boolean;
}

type Painel = "alt" | SituacaoComprovantes | "rs" | "ra" | "aptos" | null;

const DICA_XY = "X: solicitações recebidas na competência que ainda aguardam análise. Y: total de solicitações recebidas na competência.";

/** Categorias de Alterações mensais que têm Requerimentos como destino (por tipo); as demais vão para Documentação. */
const TIPO_REQUERIMENTO: Record<string, string> = {
  primeira: "Inclusão no Plano",
  inclusao_dependente: "Inclusão de Dependente",
  exclusao_dependente: "Exclusão",
  mudanca_plano: "Mudança de Plano",
};

function Valor({ x, y, cor, info = true }: { x: number; y: number; cor?: string; info?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.15, color: cor }}>{num(x)}</span>
      <span style={{ fontSize: 13, color: V.muted }}>de {num(y)} aguardando análise</span>
      {info && <IconeInfo texto={DICA_XY} />}
    </div>
  );
}

/** Rodapé do indicador: separa o conteúdo da ação. Esquerda = expandir o detalhamento; direita = abrir o módulo. */
function Rodape({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px 8px", flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

const acaoRodape: CSSProperties = { ...linkNegrito, display: "inline-flex", alignItems: "center", gap: 4 };

function BotaoExpandir({ aberto, onClick, rotulo }: { aberto: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={aberto} style={{ ...botaoTexto, ...acaoRodape, color: V.primary }}>
      {rotulo} <ChevronDown size={14} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }} />
    </button>
  );
}

/** Cartão de indicador. Com `aoClicar`, qualquer ponto do cartão abre/fecha o detalhamento (hover com elevação,
 *  seleção enquanto aberto); links e botões internos mantêm a própria ação e garantem o acesso por teclado. */
function Cartao({
  kicker,
  titulo,
  pendente,
  ativo,
  aoClicar,
  className,
  children,
  extra,
}: {
  kicker: string;
  titulo: ReactNode;
  pendente?: boolean;
  ativo?: boolean;
  aoClicar?: () => void;
  className?: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  const handler = (e: MouseEvent<HTMLDivElement>) => {
    if (!aoClicar) return;
    if ((e.target as HTMLElement).closest("a,button,[role=img]")) return;
    aoClicar();
  };
  return (
    <div
      onClick={handler}
      data-sel={ativo ? "true" : undefined}
      className={`gd-bar ${aoClicar ? "gd-clk " : ""}${className ?? ""}`}
      style={{ ...cardBase, padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: V.muted }}>{kicker}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {extra}
          {pendente !== undefined && <span title={pendente ? "Com pendências" : "Sem pendências"} style={{ width: 9, height: 9, borderRadius: "50%", background: pendente ? V.amber : V.green }} />}
        </span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{titulo}</span>
      {children}
    </div>
  );
}

const painelEstilo: CSSProperties = {
  gridColumn: "1 / -1",
  ...cardBase,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  animation: "gd-alt-in 220ms ease-out",
  minWidth: 0,
};

function CabecalhoPainel({ titulo, detalhe, onFechar }: { titulo: ReactNode; detalhe?: ReactNode; onFechar: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 700, display: "inline-flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        {titulo} {detalhe && <span style={{ fontWeight: 400, color: V.muted }}>{detalhe}</span>}
      </span>
      <button type="button" onClick={onFechar} style={{ ...botaoTexto, fontSize: 13, fontWeight: 600, color: V.muted }}>Fechar ×</button>
    </div>
  );
}

const linhaBase: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", padding: "8px 8px", margin: "0 -8px", borderRadius: 6, borderTop: `1px solid ${V.border}` };

function ListaRessarcimentos({ linhas, rotulo }: { linhas: LinhaRessarcimentoDashboard[]; rotulo: string }) {
  return (
    <ListaPaginada
      itens={linhas}
      rotulo={rotulo}
      render={(l) => (
        <div key={l.id} className="gd-row" style={linhaBase}>
          <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{l.nome}</span> <span style={{ color: V.muted }}>· {l.origemRotulo} · ref. {l.referencia}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: l.aguardando ? V.amber : V.muted, background: l.aguardando ? V.amberSoft : V.track, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{l.statusRotulo}</span>
          <span style={{ flex: "1 1 160px", fontSize: 12, color: V.muted }}>{l.responsavel ? `Responsável: ${l.responsavel}` : "Sem decisão registrada"}</span>
        </div>
      )}
    />
  );
}

/** Ordem fixa das solicitações cadastrais (não depende da quantidade de pendências). */
const ORDEM_CADASTRAL = ["primeira", "inclusao_dependente", "exclusao_dependente", "mudanca_plano"];
const ORDEM_DOCUMENTAL = ["comprovante_matricula", "irpf_enteado", "laudo_invalidez"];

/** Número de colunas do grid de categorias (mesma regra do `auto-fill`), para posicionar o detalhamento
 *  logo abaixo da linha de cartões da categoria selecionada. No mobile (1 coluna) fica abaixo do próprio cartão. */
function useColunas(minimo: number, folga: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [colunas, setColunas] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calcular = () => setColunas(Math.max(1, Math.floor((el.clientWidth + folga) / (minimo + folga))));
    calcular();
    const ro = new ResizeObserver(calcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minimo, folga]);
  return { ref, colunas };
}

function GrupoAlteracoes({
  grupo,
  itens,
  selecionada,
  onSelecionar,
  solicitacoes,
  competencia,
  competenciaRotulo,
}: {
  grupo: { chave: "cadastral" | "documento"; titulo: string; recNome: string; modulo: string };
  itens: DadosDashboard["alteracoes"]["itens"];
  selecionada: string | null;
  onSelecionar: (chave: string | null) => void;
  solicitacoes: (chave: string) => ReturnType<DadosDashboard["alteracoes"]["solicitacoes"]>;
  competencia: string;
  competenciaRotulo: string;
}) {
  const { ref, colunas } = useColunas(200, 10);
  const ag = itens.reduce((s, a) => s + a.aguardandoAnalise, 0);
  const rec = itens.reduce((s, a) => s + a.recebidas, 0);
  const cadastral = grupo.chave === "cadastral";
  const idxSel = itens.findIndex((a) => a.chave === selecionada);
  // A prévia entra após o último cartão da linha em que a categoria selecionada está (no mobile, 1 coluna: logo abaixo do cartão).
  const idxPrevia = idxSel < 0 ? -1 : Math.min(itens.length - 1, (Math.floor(idxSel / colunas) + 1) * colunas - 1);
  const sel = idxSel >= 0 ? itens[idxSel] : undefined;
  const destino = (chave: string, estilo: CSSProperties, texto: ReactNode) =>
    cadastral ? (
      <Link to="/admin/requerimentos" search={{ tipo: TIPO_REQUERIMENTO[chave], competencia }} style={estilo}>{texto}</Link>
    ) : (
      <Link to="/admin/relatorios/documentacao" search={{ status: "aguardando_analise" }} style={estilo}>{texto}</Link>
    );
  
  const previa = sel && (
    <div key={"previa-" + sel.chave} role="region" aria-label={`Prévia da categoria — ${sel.rotulo}`} style={{ gridColumn: "1 / -1", border: `1px solid ${V.border}`, borderRadius: 12, background: V.card, overflow: "hidden", animation: "gd-alt-in 220ms ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 16px", background: V.bg }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: V.primary }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: V.primary }} />
            {cadastral ? "Prévia da categoria" : "Prévia das pendências documentais"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{sel.rotulo}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: V.muted, fontVariantNumeric: "tabular-nums" }}>
            {num(sel.aguardandoAnalise)} de {num(sel.recebidas)} aguardando análise · {competenciaRotulo}
          </span>
          <button type="button" onClick={() => onSelecionar(null)} aria-label="Fechar prévia" style={{ ...botaoTexto, width: 32, height: 32, borderRadius: 8, color: V.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
      </div>
      <div style={{ background: V.card, borderTop: `1px solid ${V.border}` }}>
        {!cadastral && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${V.border}` }}>
            {[
              ["Aguardando análise", sel.aguardandoAnalise],
              ["Recebidos na competência", sel.recebidas],
              ["Já tratados", sel.recebidas - sel.aguardandoAnalise],
            ].map(([k, v]) => (
              <div key={k as string} style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: V.muted }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(v as number)}</div>
              </div>
            ))}
          </div>
        )}
        {(() => {
          const todas = solicitacoes(sel.chave);
          const lista = todas.slice(0, 5);
          if (lista.length === 0) return <div style={{ padding: "14px 16px", fontSize: 13, color: V.muted }}>Nenhuma solicitação neste tipo na competência.</div>;
          return (
            <>
              {lista.map((s, i) => (
                <div key={s.id} className="gd-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px", padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${V.border}` }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.nome}</div>
                    <div style={{ fontSize: 12, color: V.muted }}>Matrícula {s.matricula} · Recebida em {s.data}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.aguardandoAnalise ? V.amber : V.green, background: s.aguardandoAnalise ? V.amberSoft : V.greenSoft, padding: "2px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{s.aguardandoAnalise ? "Aguardando análise" : "Concluída"}</span>
                  <span style={{ flex: "0 1 190px", fontSize: 12, color: V.muted }}>{s.responsavel ? `Responsável: ${s.responsavel}` : ""}</span>
                  <Link to="/admin/servidores/$id" params={{ id: s.matricula }} style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Abrir ficha →</Link>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 16px", borderTop: `1px solid ${V.border}`, background: V.bg }}>
                <span style={{ fontSize: 12, color: V.muted, fontVariantNumeric: "tabular-nums" }}>Prévia: {lista.length} de {num(todas.length)} solicitações</span>
                {destino(sel.chave, { fontSize: 13, fontWeight: 600 }, <>{cadastral ? "Ver todas as solicitações →" : "Abrir relatório Documentação e Pendências →"}</>)}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );

  const filhos: ReactNode[] = [];
  itens.forEach((a, i) => {
    const on = selecionada === a.chave;
    filhos.push(
      <div
        key={a.chave}
        role="button"
        tabIndex={0}
        aria-expanded={on}
        aria-label={`${a.rotulo}: ${a.aguardandoAnalise} aguardando análise de ${a.recebidas}. ${on ? "Fechar" : "Ver"} prévia da fila`}
        className="gd-clk gd-bar"
        data-sel={on ? "true" : undefined}
        onClick={() => onSelecionar(on ? null : a.chave)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelecionar(on ? null : a.chave);
          }
        }}
        style={{ background: on ? V.primarySoft : V.card, border: `1px solid ${V.border}`, borderRadius: 12, padding: "17px 16px 14px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "4px 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>{a.rotulo}</span>
          {on && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2, color: V.primary, background: V.card, border: `1px solid ${V.primary}`, padding: "1px 6px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0, maxWidth: "100%" }}>SELECIONADO</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: "auto", paddingTop: 6 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, color: a.aguardandoAnalise === 0 ? V.muted : undefined }}>{num(a.aguardandoAnalise)}</span>
              <span style={{ fontSize: 13, color: V.muted }}>{a.aguardandoAnalise === 1 ? "pendente" : "pendentes"}</span>
            </div>
            <div style={{ fontSize: 12, color: V.muted, fontVariantNumeric: "tabular-nums" }}>{num(a.recebidas)} recebidas no total</div>
          </div>
          <span aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: on ? V.primary : V.track, color: on ? V.bg : V.muted, transition: "background-color 200ms ease, color 200ms ease" }}>
            <ChevronDown size={16} style={{ transform: on ? "none" : "rotate(-90deg)", transition: "transform 200ms ease" }} />
          </span>
        </div>
      </div>,
    );
    if (i === idxPrevia && previa) filhos.push(previa);
  });

  const tipoCtx = cadastral && sel ? TIPO_REQUERIMENTO[sel.chave] : undefined;
  const botaoGrupo: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: V.primary, color: V.onPrimary, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" };
  const Icone = cadastral ? FileText : FolderOpen;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px", borderTop: cadastral ? "none" : `4px solid ${V.track}`, background: V.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: cadastral ? V.primarySoft : V.track, color: cadastral ? V.primary : V.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icone size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px 10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{grupo.titulo}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", color: cadastral ? V.primary : V.muted, background: cadastral ? V.primarySoft : V.track }}>
                {cadastral ? "Fluxo: Requerimentos" : "Fluxo: Relatório"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: V.muted }}>
              {cadastral ? "Inclusões, exclusões e mudanças são tratadas na área de Requerimentos." : "Documentos e pendências são acompanhados em relatório específico."}
            </div>
            <div style={{ fontSize: 12, color: V.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{ag} de {num(rec)} aguardando análise</div>
          </div>
        </div>
        {cadastral ? (
          <Link to="/admin/requerimentos" search={{ tipo: tipoCtx, competencia }} style={botaoGrupo}>Acessar Requerimentos →</Link>
        ) : (
          <Link to="/admin/relatorios/documentacao" style={botaoGrupo}>Abrir Documentação e Pendências →</Link>
        )}
      </div>
      <div ref={ref} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>{filhos}</div>
    </div>
  );
}

export function RequerAcao({ dados, competencia, competenciaRotulo, vigente }: Props) {
  const [painel, setPainel] = useState<Painel>(null);
  const [catAlt, setCatAlt] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const { alteracoes, comprovantes, ressServidor, ressAssociacoes, aptos } = dados;
  const altAg = alteracoes.itens.reduce((n, a) => n + a.aguardandoAnalise, 0);
  const altRec = alteracoes.itens.reduce((n, a) => n + a.recebidas, 0);
  const filas = [altAg, comprovantes.aguardando, ressServidor.resumo.aguardando, ressAssociacoes.resumo.aguardando].filter((n) => n > 0).length;
  const alternar = (p: Exclude<Painel, null>) => {
    setCatAlt(null);
    setPainel((atual) => (atual === p ? null : p));
  };
  const compAberto = painel === "aguardando" || painel === "validados" || painel === "devolvidos";

  // Reiniciar a seleção ao trocar de competência/fonte.
  useEffect(() => {
    setPainel(null);
    setCatAlt(null);
  }, [competencia, dados.fonte]);

  // Ao abrir um painel fora da área visível, rola até ele (como no protótipo).
  useEffect(() => {
    const el = painelRef.current;
    if (!painel || !el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight - 160) window.scrollBy({ top: r.top - 24, behavior: "smooth" });
  }, [painel]);

  const grupos = [
    { chave: "cadastral" as const, titulo: "Solicitações cadastrais", recNome: "solicitações recebidas", modulo: "Requerimentos" },
    { chave: "documento" as const, titulo: "Documentação para manutenção do benefício", recNome: "documentos recebidos", modulo: "Documentação e Pendências" },
  ];
  const situacoes: { chave: SituacaoComprovantes; cor: string }[] = [
    { chave: "validados", cor: V.green },
    { chave: "aguardando", cor: V.amber },
    { chave: "devolvidos", cor: V.red },
  ];
  const catSelecionada = alteracoes.itens.find((a) => a.chave === catAlt);
  const cntCad = alteracoes.itens.filter((a) => a.grupo === "cadastral").reduce((t, a) => t + a.aguardandoAnalise, 0);
  const cntDoc = alteracoes.itens.filter((a) => a.grupo !== "cadastral").reduce((t, a) => t + a.aguardandoAnalise, 0);
  const ordemPainel = "max-md:order-1 md:order-1";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Requer ação</h2>
        <span style={{ fontSize: 13, color: V.muted }}>
          {filas === 0 ? "Nenhuma fila com atividades pendentes" : `${filas} ${filas === 1 ? "fila com atividades pendentes" : "filas com atividades pendentes"}`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(170px, calc((100% - 28px) / 3)), 1fr))", gap: 14 }}>
        <Cartao kicker="Gestão de benefícios" titulo="Alterações mensais" pendente={altAg > 0} ativo={painel === "alt"} aoClicar={() => alternar("alt")}>
          <Valor x={altAg} y={altRec} />
          <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>{cntCad} solicitações cadastrais · {cntDoc} pendências documentais</div>
          <Rodape>
            <BotaoExpandir aberto={painel === "alt"} onClick={() => alternar("alt")} rotulo="Ver detalhes" />
          </Rodape>
        </Cartao>

        <Cartao kicker="Documentação" titulo="Comprovantes" pendente={comprovantes.aguardando > 0} ativo={compAberto} aoClicar={() => alternar("aguardando")} className="max-md:order-2">
          <Valor x={comprovantes.aguardando} y={comprovantes.total} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {situacoes.map((s) => {
              const on = painel === s.chave;
              return (
                <button
                  key={s.chave}
                  type="button"
                  className="gd-opt"
                  data-sel={on ? "true" : undefined}
                  onClick={() => alternar(s.chave)}
                  aria-pressed={on}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${V.border}`, background: "transparent", fontFamily: "inherit", fontSize: 13, color: V.text, textAlign: "left" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: s.cor }} />
                    {ROTULO_SITUACAO_COMPROVANTES[s.chave]}
                  </span>
                  <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{num(comprovantes[s.chave])}</span>
                </button>
              );
            })}
          </div>
          <Rodape>
            <BotaoExpandir aberto={compAberto} onClick={() => alternar("aguardando")} rotulo="Ver detalhes" />
            <Link to="/admin/comprovantes" search={{ competencia, situacao: "aguardando" }} style={acaoRodape}>Abrir fila ›</Link>
          </Rodape>
        </Cartao>

        <Cartao kicker="Ressarcimentos" titulo="Meses anteriores — Servidor" pendente={ressServidor.resumo.aguardando > 0} ativo={painel === "rs"} aoClicar={() => alternar("rs")} className="max-md:order-4">
          <Valor x={ressServidor.resumo.aguardando} y={ressServidor.resumo.total} cor={ressServidor.resumo.aguardando === 0 ? V.muted : undefined} />
          {ressServidor.resumo.aguardando === 0 ? (
            <NadaPendente />
          ) : (
            <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>
              {ressServidor.resumo.emAnalise} em análise · {ressServidor.resumo.complementacaoRecebida} complementação recebida · {ressServidor.resumo.aguardandoComplementacao} aguardando complementação
            </div>
          )}
          <Rodape>
            <BotaoExpandir aberto={painel === "rs"} onClick={() => alternar("rs")} rotulo="Ver detalhes" />
            <Link to="/admin/retroativos" search={{ origem: "individual" }} style={acaoRodape}>Abrir fila ›</Link>
          </Rodape>
        </Cartao>

        {painel === "alt" && (
          <div ref={painelRef} role="region" aria-label={`Alterações mensais ${competenciaRotulo}`} className={ordemPainel} style={{ ...painelEstilo, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 20px", background: V.primarySoft, borderBottom: `1px solid ${V.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: V.primary }}>Alterações mensais · {competenciaRotulo}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{num(altAg)} itens requerem atenção</div>
                <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>Cada tipo de pendência possui um fluxo de tratamento diferente.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {grupos.map((g) => {
                  const n = alteracoes.itens.filter((a) => a.grupo === g.chave).reduce((t, a) => t + a.aguardandoAnalise, 0);
                  return (
                    <span key={g.chave} style={{ fontSize: 12, fontWeight: 600, color: V.primary, background: V.card, border: `1px solid ${V.border}`, padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap" }}>
                      {n} {g.chave === "cadastral" ? "solicitações cadastrais" : "pendências documentais"}
                    </span>
                  );
                })}
                <button type="button" onClick={() => setPainel(null)} aria-label="Fechar alterações mensais" style={{ ...botaoTexto, width: 32, height: 32, borderRadius: 8, color: V.muted, fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {grupos.map((g) => (
                <GrupoAlteracoes
                  key={g.chave}
                  grupo={g}
                  itens={g.chave === "cadastral" ? ORDEM_CADASTRAL.map((c) => alteracoes.itens.find((a) => a.chave === c)!).filter(Boolean) : ORDEM_DOCUMENTAL.map((c) => alteracoes.itens.find((a) => a.chave === c)!).filter(Boolean)}
                  selecionada={catAlt}
                  onSelecionar={setCatAlt}
                  solicitacoes={alteracoes.solicitacoes}
                  competencia={competencia}
                  competenciaRotulo={competenciaRotulo}
                />
              ))}
            </div>
          </div>
        )}

        {compAberto && painel && (
          <div ref={painelRef} role="region" aria-label={`Comprovantes ${ROTULO_SITUACAO_COMPROVANTES[painel].toLowerCase()}`} className="max-md:order-3 md:order-1" style={{ ...painelEstilo, gap: 6 }}>
            <CabecalhoPainel titulo={`Comprovantes ${ROTULO_SITUACAO_COMPROVANTES[painel].toLowerCase()} · ${competenciaRotulo}`} detalhe={`· ${num(comprovantes[painel])}`} onFechar={() => setPainel(null)} />
            <ListaPaginada
              key={painel + competencia + dados.fonte}
              itens={comprovantes.linhas(painel)}
              rotulo="comprovantes"
              vazio="Nenhum comprovante nesta situação."
              render={(r) => (
                <div key={r.id} className="gd-row" style={linhaBase}>
                  <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{r.nome}</span></div>
                  <div style={{ flex: "1 1 200px", minWidth: 0, fontSize: 12, color: V.muted }}>{r.arquivo} · {r.situacaoRotulo}</div>
                  <div style={{ flex: "0 1 170px", fontSize: 12, color: V.muted }}>{r.responsavel ? `Responsável: ${r.responsavel}` : "Sem ação registrada"}</div>
                  <Link to="/admin/comprovantes" search={{ competencia, situacao: painel }} style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Abrir →</Link>
                </div>
              )}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
              <Link to="/admin/comprovantes" search={{ competencia, situacao: painel }} style={{ fontSize: 12, fontWeight: 600 }}>Abrir relação completa →</Link>
            </div>
          </div>
        )}

        {painel === "rs" && (
          <div ref={painelRef} role="region" aria-label="Ressarcimentos de meses anteriores — Servidor" className={ordemPainel} style={{ ...painelEstilo, gap: 6 }}>
            <CabecalhoPainel titulo="Ressarcimentos de meses anteriores — Servidor" detalhe={`· ${num(ressServidor.resumo.aguardando)} aguardando análise de ${num(ressServidor.resumo.total)}`} onFechar={() => setPainel(null)} />
            <ListaRessarcimentos key={"rs" + dados.fonte} linhas={ressServidor.linhas} rotulo="competências" />
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
              <Link to="/admin/retroativos" search={{ origem: "individual" }} style={{ fontSize: 12, fontWeight: 600 }}>Abrir na fila de análise →</Link>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(170px, calc((100% - 14px) / 2)), 1fr))", gap: 14 }}>
        <Cartao kicker="Ressarcimentos" titulo="Meses anteriores — Associações" pendente={ressAssociacoes.resumo.aguardando > 0} ativo={painel === "ra"} aoClicar={() => alternar("ra")}>
          <Valor x={ressAssociacoes.resumo.aguardando} y={ressAssociacoes.resumo.total} cor={ressAssociacoes.resumo.aguardando === 0 ? V.muted : undefined} />
          {ressAssociacoes.resumo.aguardando === 0 ? (
            <NadaPendente />
          ) : (
            <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>{ressAssociacoes.resumo.porAssociacao.map((p) => `${p.associacao} ${p.aguardando}`).join(" · ")}</div>
          )}
          <Rodape>
            <BotaoExpandir aberto={painel === "ra"} onClick={() => alternar("ra")} rotulo="Ver detalhes" />
            <Link to="/admin/retroativos" search={{ origem: "associacao" }} style={acaoRodape}>Abrir fila ›</Link>
          </Rodape>
        </Cartao>

        <Cartao
          kicker={vigente ? "Consolidação vigente" : `Consolidação · ${competenciaRotulo}`}
          titulo="Aptos na consolidação"
          extra={<span title="Atividade disponível para execução — não conta como pendência" style={{ fontSize: 11, fontWeight: 600, color: V.green, background: V.greenSoft, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>Disponível</span>}
          ativo={painel === "aptos"}
          aoClicar={() => alternar("aptos")}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>{num(aptos.vidas)}</span>
            <span style={{ fontSize: 13, color: V.muted }}>de {num(aptos.vidasTotal)} vidas beneficiadas</span>
          </div>
          <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>
            <span style={{ color: V.text, fontWeight: 600 }}>{formatCurrency(aptos.valorRessarcir)}</span> a ressarcir · fechamento mensal · não inclui Ressarcimentos de meses anteriores
          </div>
          <Rodape>
            <BotaoExpandir aberto={painel === "aptos"} onClick={() => alternar("aptos")} rotulo="Ver detalhes" />
            <Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} style={acaoRodape}>Abrir consolidação ›</Link>
          </Rodape>
        </Cartao>

        {painel === "ra" && (
          <div ref={painelRef} role="region" aria-label="Ressarcimentos de meses anteriores — Associações" style={{ ...painelEstilo, gap: 6, gridColumn: "1 / -1" }}>
            <CabecalhoPainel titulo="Ressarcimentos de meses anteriores — Associações" detalhe={`· ${num(ressAssociacoes.resumo.aguardando)} aguardando análise de ${num(ressAssociacoes.resumo.total)}`} onFechar={() => setPainel(null)} />
            <ListaRessarcimentos key={"ra" + dados.fonte} linhas={ressAssociacoes.linhas} rotulo="competências" />
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
              <Link to="/admin/retroativos" search={{ origem: "associacao" }} style={{ fontSize: 12, fontWeight: 600 }}>Abrir na fila de análise →</Link>
            </div>
          </div>
        )}

        {painel === "aptos" && (
          <div ref={painelRef} role="region" aria-label="Aptos na Consolidação" style={{ ...painelEstilo, gap: 6 }}>
            <CabecalhoPainel titulo={`Aptos na Consolidação · ${competenciaRotulo}`} detalhe={`· ${num(aptos.registros)} titulares`} onFechar={() => setPainel(null)} />
            <ListaPaginada
              key={"aptos" + competencia + dados.fonte}
              itens={aptos.linhas}
              rotulo="titulares aptos"
              vazio="Nenhum titular apto nesta competência."
              render={(l) => (
                <div key={l.id} className="gd-row" style={linhaBase}>
                  <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{l.nome}</span> {l.matricula && <span style={{ color: V.muted }}>· mat. {l.matricula}</span>}</div>
                  <span style={{ flex: "1 1 140px", fontSize: 12, color: V.muted }}>{l.plano} · {l.vidas} {l.vidas === 1 ? "vida" : "vidas"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(l.valor)}</span>
                </div>
              )}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
              <Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} style={{ fontSize: 12, fontWeight: 600 }}>Abrir a Consolidação →</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

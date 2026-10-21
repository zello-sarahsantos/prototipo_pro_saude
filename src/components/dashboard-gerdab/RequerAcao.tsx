import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, FileText, FolderOpen } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { ROTULO_SITUACAO_COMPROVANTES, type LinhaRessarcimentoDashboard, type SituacaoComprovantes } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { ContadorNotificacoes, EVENTO_FOCO_DASHBOARD, type FocoDashboard } from "@/components/ContadorNotificacoes";
import { ROTULO_INDICADOR_DASHBOARD, useNotificacoesAdmin, type IndicadorDashboard } from "@/lib/notificacoes-admin";
import { BotaoAtualizacoes } from "./AtualizacoesDashboard";
import { AvisoAtualizacao, CabecalhoExpansao, SeloResumo, type AtualizacaoSelecionada } from "./PainelExpansao";
import { PainelAptos, PainelComprovantes, PainelRessarcimentos } from "./PaineisIndicadores";
import { IconeInfo, NadaPendente, V, botaoTexto, cardBase, linkNegrito, num } from "./gd-ui";

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
      <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.15, color: cor }}>{num(x)}</span>
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
    <button type="button" onClick={onClick} aria-expanded={aberto} className="gd-cta" style={{ ...botaoTexto, ...acaoRodape, color: V.primary }}>
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
  prioritario,
  indicador,
  botaoModal,
}: {
  kicker: string;
  titulo: ReactNode;
  pendente?: boolean;
  ativo?: boolean;
  aoClicar?: () => void;
  className?: string;
  children: ReactNode;
  extra?: ReactNode;
  /** Linha principal de indicadores: altura mínima maior (apenas visual). */
  prioritario?: boolean;
  /** Indicador de notificações não lidas deste cartão (círculo vermelho ao lado do título). Independe das contagens operacionais. */
  indicador?: IndicadorDashboard;
  /** Botão inferior da modal de atualizações deste indicador. */
  botaoModal?: { rotulo: string; href?: string; onClick?: () => void };
}) {
  const { itens } = useNotificacoesAdmin();
  const naoLidas = indicador ? itens.filter((n) => !n.lida && n.origem === "real" && n.indicadores?.includes(indicador)) : [];
  const handler = (e: MouseEvent<HTMLDivElement>) => {
    if (!aoClicar) return;
    if ((e.target as HTMLElement).closest("a,button,[role=img]")) return;
    aoClicar();
  };
  return (
    <div
      onClick={handler}
      data-sel={ativo ? "true" : undefined}
      className={`gd-bar ${aoClicar ? "gd-clk gd-card-ind " : ""}${prioritario ? "" : "gd-card-sec "}${className ?? ""}`}
      style={{ ...cardBase, padding: 20, display: "flex", flexDirection: "column", gap: 10, minWidth: 0, minHeight: prioritario ? 224 : undefined }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: V.muted }}>{kicker}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {extra}
          {naoLidas.length > 0 ? (
            <ContadorNotificacoes itens={naoLidas} rotulo={indicador ? ROTULO_INDICADOR_DASHBOARD[indicador] : "Notificações"} indicadorId={indicador} className="!min-w-6 !h-6 !text-xs" modal={{ indicador: indicador ? ROTULO_INDICADOR_DASHBOARD[indicador] : "Indicador", botao: botaoModal, aoSelecionar: (n) => window.dispatchEvent(new CustomEvent<FocoDashboard>(EVENTO_FOCO_DASHBOARD, { detail: { indicador: indicador ?? "", entidade: n.entidade ?? n.titulo, acontecimento: n.acontecimento ?? n.descricao, href: n.href } })) }} />
          ) : (
            pendente !== undefined && <span title={pendente ? "Com pendências" : "Sem pendências"} style={{ width: 9, height: 9, borderRadius: "50%", background: pendente ? V.amber : V.green }} />
          )}
        </span>
      </div>
      <span className="gd-titulo" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{titulo}</span>
      {children}
    </div>
  );
}

const painelEstilo: CSSProperties = {
  scrollMarginTop: 72,
  gridColumn: "1 / -1",
  ...cardBase,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  animation: "gd-alt-in 220ms ease-out",
  minWidth: 0,
};

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
        className="gd-clk gd-cat"
        data-sel={on ? "true" : undefined}
        onClick={() => onSelecionar(on ? null : a.chave)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelecionar(on ? null : a.chave);
          }
        }}
        style={{ background: on ? V.primarySoft : V.card, border: `1px solid ${V.border}`, borderRadius: 12, padding: "16px 16px 14px 20px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "4px 8px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>{a.rotulo}</span>
          {on && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2, color: V.primary, background: V.card, border: `1px solid ${V.primary}`, padding: "1px 6px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0, maxWidth: "100%" }}>SELECIONADO</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: "auto", paddingTop: 6 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, color: a.aguardandoAnalise === 0 ? V.muted : undefined }}>{num(a.aguardandoAnalise)}</span>
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
  const botaoGrupo: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: V.primary, color: V.onPrimary, border: `1px solid ${V.primary}`, padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" };
  const Icone = cadastral ? FileText : FolderOpen;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px", borderTop: cadastral ? "none" : `4px solid ${V.track}`, background: V.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: cadastral ? V.primarySoft : V.track, color: cadastral ? V.primary : V.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icone size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px 10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{grupo.titulo}</span>
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
  const [aviso, setAviso] = useState<(AtualizacaoSelecionada & { indicador: string }) | null>(null);
  const avisoDe = (ind: string) => (aviso && aviso.indicador === ind ? aviso : null);
  const { alteracoes, comprovantes, ressServidor, ressAssociacoes, aptos } = dados;
  const altAg = alteracoes.itens.reduce((n, a) => n + a.aguardandoAnalise, 0);
  const altRec = alteracoes.itens.reduce((n, a) => n + a.recebidas, 0);
  const filas = [altAg, comprovantes.aguardando, ressServidor.resumo.aguardando, ressAssociacoes.resumo.aguardando].filter((n) => n > 0).length;
  const alternar = (p: Exclude<Painel, null>) => {
    setCatAlt(null);
    setPainel((atual) => (atual === p ? null : p));
  };
  const compAberto = painel === "aguardando" || painel === "validados" || painel === "devolvidos";

  // Atualização escolhida numa notificação do Dashboard: abre (e só ela) a expansão do indicador, destaca o registro e rola até o painel.
  useEffect(() => {
    const aoFocar = (e: Event) => {
      const d = (e as CustomEvent<FocoDashboard>).detail;
      const alvo: Partial<Record<string, Exclude<Painel, null>>> = { alteracoes: "alt", comprovantes: "aguardando", ress_servidor: "rs", ress_associacoes: "ra" };
      const p = alvo[d.indicador];
      if (!p) return;
      setCatAlt(null);
      setPainel(p);
      setAviso({ indicador: d.indicador, entidade: d.entidade, acontecimento: d.acontecimento, href: d.href });
      setTimeout(() => painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    };
    window.addEventListener(EVENTO_FOCO_DASHBOARD, aoFocar);
    return () => window.removeEventListener(EVENTO_FOCO_DASHBOARD, aoFocar);
  }, []);
  useEffect(() => {
    if (!painel) setAviso(null);
  }, [painel]);

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
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Requer ação</h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: V.muted }}>
            {filas === 0 ? "Nenhuma fila com atividades pendentes" : `${filas} ${filas === 1 ? "fila com atividades pendentes" : "filas com atividades pendentes"}`}
          </span>
          <BotaoAtualizacoes />
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(170px, calc((100% - 28px) / 3)), 1fr))", gap: 14 }}>
        <Cartao prioritario indicador="alteracoes" botaoModal={{ rotulo: "Ver detalhes das alterações", onClick: () => { setCatAlt(null); setPainel("alt"); } }} kicker="Gestão de benefícios" titulo="Alterações mensais" pendente={altAg > 0} ativo={painel === "alt"} aoClicar={() => alternar("alt")}>
          <Valor x={altAg} y={altRec} />
          <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>{cntCad} solicitações cadastrais · {cntDoc} pendências documentais</div>
          <Rodape>
            <BotaoExpandir aberto={painel === "alt"} onClick={() => alternar("alt")} rotulo={painel === "alt" ? "Ocultar detalhes" : "Ver detalhes"} />
          </Rodape>
        </Cartao>

        <Cartao prioritario indicador="comprovantes" botaoModal={{ rotulo: "Abrir fila de comprovantes", href: `/admin/comprovantes?competencia=${competencia}&situacao=aguardando` }} kicker="Documentação" titulo="Comprovantes" pendente={comprovantes.aguardando > 0} ativo={compAberto} aoClicar={() => alternar("aguardando")} className="max-md:order-2">
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
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "6px 10px", borderRadius: 10, border: `1px solid ${V.border}`, background: V.bg, fontFamily: "inherit", fontSize: 13, color: V.text, textAlign: "left" }}
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
            <BotaoExpandir aberto={compAberto} onClick={() => alternar("aguardando")} rotulo={compAberto ? "Ocultar detalhes" : "Ver detalhes"} />
            <Link to="/admin/comprovantes" search={{ competencia, situacao: "aguardando" }} className="gd-cta" style={acaoRodape}>Abrir fila <span className="gd-seta" aria-hidden>›</span></Link>
          </Rodape>
        </Cartao>

        <Cartao prioritario indicador="ress_servidor" botaoModal={{ rotulo: "Abrir fila de ressarcimentos", href: "/admin/retroativos?origem=individual" }} kicker="Ressarcimentos" titulo="Meses anteriores — Servidor" pendente={ressServidor.resumo.aguardando > 0} ativo={painel === "rs"} aoClicar={() => alternar("rs")} className="max-md:order-4">
          <Valor x={ressServidor.resumo.aguardando} y={ressServidor.resumo.total} cor={ressServidor.resumo.aguardando === 0 ? V.muted : undefined} />
          {ressServidor.resumo.aguardando === 0 ? (
            <NadaPendente />
          ) : (
            <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>
              {ressServidor.resumo.emAnalise} em análise · {ressServidor.resumo.complementacaoRecebida} complementação recebida · {ressServidor.resumo.aguardandoComplementacao} aguardando complementação
            </div>
          )}
          <Rodape>
            <BotaoExpandir aberto={painel === "rs"} onClick={() => alternar("rs")} rotulo={painel === "rs" ? "Ocultar detalhes" : "Ver detalhes"} />
            <Link to="/admin/retroativos" search={{ origem: "individual" }} className="gd-cta" style={acaoRodape}>Abrir fila <span className="gd-seta" aria-hidden>›</span></Link>
          </Rodape>
        </Cartao>

        {painel === "alt" && (
          <div ref={painelRef} role="region" aria-label={`Alterações mensais ${competenciaRotulo}`} className={`${ordemPainel} gd-painel`} style={{ ...painelEstilo, padding: 0, overflow: "hidden" }}>
            <CabecalhoExpansao
              categoria={`Alterações mensais · ${competenciaRotulo}`}
              titulo={`${num(altAg)} itens requerem atenção`}
              descricao="Cada tipo de pendência possui um fluxo de tratamento diferente."
              badges={grupos.map((g) => {
                const n = alteracoes.itens.filter((a) => a.grupo === g.chave).reduce((t, a) => t + a.aguardandoAnalise, 0);
                return <SeloResumo key={g.chave} texto={`${n} ${g.chave === "cadastral" ? "solicitações cadastrais" : "pendências documentais"}`} tom={g.chave === "cadastral" ? "azul" : "neutro"} />;
              })}
              onFechar={() => setPainel(null)}
              rotuloFechar="Fechar alterações mensais"
            />
            {avisoDe("alteracoes") && <AvisoAtualizacao aviso={avisoDe("alteracoes")!} encontrada={false} onDispensar={() => setAviso(null)} />}
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
          <div ref={painelRef} role="region" aria-label={`Comprovantes ${ROTULO_SITUACAO_COMPROVANTES[painel].toLowerCase()}`} className="max-md:order-3 md:order-1 gd-painel" style={{ ...painelEstilo, padding: 0, overflow: "hidden" }}>
            <PainelComprovantes dados={comprovantes} situacao={painel} onSituacao={(sit) => { setCatAlt(null); setPainel(sit); }} competencia={competencia} competenciaRotulo={competenciaRotulo} onFechar={() => setPainel(null)} aviso={avisoDe("comprovantes")} onDispensarAviso={() => setAviso(null)} fonte={dados.fonte} />
          </div>
        )}

        {painel === "rs" && (
          <div ref={painelRef} role="region" aria-label="Ressarcimentos de meses anteriores — Servidor" className={`${ordemPainel} gd-painel`} style={{ ...painelEstilo, padding: 0, overflow: "hidden" }}>
            <PainelRessarcimentos origem="individual" dados={ressServidor} competenciaRotulo={competenciaRotulo} onFechar={() => setPainel(null)} aviso={avisoDe("ress_servidor")} onDispensarAviso={() => setAviso(null)} />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(170px, calc((100% - 14px) / 2)), 1fr))", gap: 14 }}>
        <Cartao indicador="ress_associacoes" botaoModal={{ rotulo: "Abrir fila de ressarcimentos", href: "/admin/retroativos?origem=associacao" }} kicker="Ressarcimentos" titulo="Meses anteriores — Associações" pendente={ressAssociacoes.resumo.aguardando > 0} ativo={painel === "ra"} aoClicar={() => alternar("ra")}>
          <Valor x={ressAssociacoes.resumo.aguardando} y={ressAssociacoes.resumo.total} cor={ressAssociacoes.resumo.aguardando === 0 ? V.muted : undefined} />
          {ressAssociacoes.resumo.aguardando === 0 ? (
            <NadaPendente />
          ) : (
            <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>{ressAssociacoes.resumo.porAssociacao.map((p) => `${p.associacao} ${p.aguardando}`).join(" · ")}</div>
          )}
          <Rodape>
            <BotaoExpandir aberto={painel === "ra"} onClick={() => alternar("ra")} rotulo={painel === "ra" ? "Ocultar detalhes" : "Ver detalhes"} />
            <Link to="/admin/retroativos" search={{ origem: "associacao" }} className="gd-cta" style={acaoRodape}>Abrir fila <span className="gd-seta" aria-hidden>›</span></Link>
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
            <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>{num(aptos.vidas)}</span>
            <span style={{ fontSize: 13, color: V.muted }}>de {num(aptos.vidasTotal)} vidas beneficiadas</span>
          </div>
          <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.4 }}>
            <span style={{ color: V.text, fontWeight: 600 }}>{formatCurrency(aptos.valorRessarcir)}</span> a ressarcir · fechamento mensal · não inclui Ressarcimentos de meses anteriores
          </div>
          <Rodape>
            <BotaoExpandir aberto={painel === "aptos"} onClick={() => alternar("aptos")} rotulo={painel === "aptos" ? "Ocultar detalhes" : "Ver detalhes"} />
            <Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} className="gd-cta" style={acaoRodape}>Abrir consolidação <span className="gd-seta" aria-hidden>›</span></Link>
          </Rodape>
        </Cartao>

        {painel === "ra" && (
          <div ref={painelRef} role="region" aria-label="Ressarcimentos de meses anteriores — Associações" className="gd-painel" style={{ ...painelEstilo, padding: 0, overflow: "hidden", gridColumn: "1 / -1" }}>
            <PainelRessarcimentos origem="associacao" dados={ressAssociacoes} competenciaRotulo={competenciaRotulo} onFechar={() => setPainel(null)} aviso={avisoDe("ress_associacoes")} onDispensarAviso={() => setAviso(null)} />
          </div>
        )}

        {painel === "aptos" && (
          <div ref={painelRef} role="region" aria-label="Aptos na Consolidação" className="gd-painel" style={{ ...painelEstilo, padding: 0, overflow: "hidden" }}>
            <PainelAptos aptos={aptos} competencia={competencia} competenciaRotulo={competenciaRotulo} vigente={vigente} onFechar={() => setPainel(null)} />
          </div>
        )}
      </div>
    </section>
  );
}

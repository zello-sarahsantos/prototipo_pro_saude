import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Check, Search } from "lucide-react";
import type { FichaResumoServidor } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { ContadorNotificacoes, EVENTO_FOCO_DASHBOARD, type FocoDashboard } from "@/components/ContadorNotificacoes";
import { AvisoAtualizacao, CabecalhoExpansao, CLASSE_CTA_PRINCIPAL, IconeCta, SeloResumo } from "./PainelExpansao";
import { useNotificacoesAdmin } from "@/lib/notificacoes-admin";
import { getSolicitacoesComplementares, type SolicitacaoComplementar } from "@/lib/acompanhamento-documental";
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

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const eyebrow = { fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const };
const PASSO_FILA = 5;
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Pilula({ txt, fg, bg }: { txt: string; fg: string; bg: string }) {
  return <span style={{ fontSize: 13, fontWeight: 600, color: fg, background: bg, padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{txt}</span>;
}

function BotaoAcesso({ s }: { s: SolicitacaoComplementar }) {
  const analisar = s.estado === "recebido_analise";
  const estilo = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" as const, textDecoration: "none", border: `1px solid ${V.primary}`, background: analisar ? V.primary : V.card, color: analisar ? V.onPrimary : V.primary };
  const rotulo = analisar ? "Analisar" : "Abrir na origem";
  const aria = `${rotulo} em ${s.origem}: ${s.servidor}`;
  const d = s.destino;
  const conteudo = <>{rotulo} <ChevronRight size={15} aria-hidden /></>;
  if (d.to === "/admin/requerimentos") return <Link to="/admin/requerimentos" aria-label={aria} style={estilo}>{conteudo}</Link>;
  if (d.to === "/admin/comprovantes") return <Link to="/admin/comprovantes" search={{ competencia: d.competencia, situacao: d.situacao }} aria-label={aria} style={estilo}>{conteudo}</Link>;
  return <Link to="/admin/retroativos" search={{ origem: d.origem }} aria-label={aria} style={estilo}>{conteudo}</Link>;
}

/** Bloco 2 — Fila operacional. Só leitura: o tratamento continua no registro de origem (o botão abre a fila do módulo). */
function FilaOperacional({ itens, foco, onDispensarFoco }: { itens: SolicitacaoComplementar[]; foco?: FocoDashboard | null; onDispensarFoco: () => void }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | SolicitacaoComplementar["estado"]>("todas");
  const [pagina, setPagina] = useState(0);
  // Atualização escolhida numa notificação: pesquisa pelo servidor e destaca o registro correspondente.
  useEffect(() => {
    if (!foco) return;
    setBusca(foco.entidade);
    setFiltro("todas");
    setPagina(0);
  }, [foco]);
  const nEnvio = itens.filter((i) => i.estado === "aguardando_envio").length;
  const nRecebido = itens.length - nEnvio;
  const q = norm(busca.trim());
  const filtrados = itens.filter((i) => (filtro === "todas" || i.estado === filtro) && (!q || norm(`${i.servidor} ${i.referencia} ${i.documento} ${i.origem}`).includes(q)));
  const paginas = Math.max(1, Math.ceil(filtrados.length / PASSO_FILA));
  const atual = Math.min(pagina, paginas - 1);
  const visiveis = filtrados.slice(atual * PASSO_FILA, atual * PASSO_FILA + PASSO_FILA);
  const botaoFiltro = (chave: typeof filtro, rotulo: string, n: number, cor: string) => {
    const on = filtro === chave;
    return (
      <button key={chave} type="button" aria-pressed={on} data-sel={on ? "true" : undefined} onClick={() => { setFiltro(chave); setPagina(0); }} className="gd-filtro" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, height: 40, padding: "0 16px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap", ...(on ? {} : { border: `1px solid ${cor === V.text ? V.border : cor}`, background: V.card, color: cor }) }}>
        {rotulo} <span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span>
      </button>
    );
  };
  return (
    <section id="fila-complementares" aria-label="Solicitações documentais complementares" className="gd-fila" style={{ border: `1px solid ${V.border}`, borderRadius: 12, overflow: "hidden", background: V.card }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", padding: "18px 20px 16px" }}>
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          <div style={{ ...eyebrow, color: V.primary }}>Fila operacional</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 0" }}>Solicitações documentais complementares</h3>
          <p style={{ fontSize: 13, color: V.muted, margin: "6px 0 0", lineHeight: 1.5 }}>Acompanhe solicitações abertas em outros módulos. O tratamento permanece no registro de origem, incluindo ressarcimentos de meses anteriores.</p>
        </div>
        <Pilula txt={`${itens.length} ${itens.length === 1 ? "solicitação ativa" : "solicitações ativas"}`} fg={V.text} bg={V.track} />
      </header>
      {foco && <AvisoAtualizacao aviso={{ entidade: foco.entidade, acontecimento: foco.acontecimento, href: foco.href }} encontrada={itens.some((i) => i.servidor === foco.entidade)} onDispensar={onDispensarFoco} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "14px 20px", background: V.bg, borderTop: `1px solid ${V.border}`, borderBottom: `1px solid ${V.border}` }}>
        <div style={{ flex: "1 1 260px", position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={16} color={V.muted} style={{ position: "absolute", left: 12 }} />
          <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0); }} placeholder="Pesquisar servidor, referência ou documento..." aria-label="Pesquisar solicitações complementares por servidor, referência ou documento" style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 12px 0 36px", border: `1px solid ${V.border}`, borderRadius: 12, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 14 }} />
        </div>
        <div role="group" aria-label="Filtrar por situação" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {botaoFiltro("todas", "Todas", itens.length, V.text)}
          {botaoFiltro("aguardando_envio", "Aguardando envio", nEnvio, V.amber)}
          {botaoFiltro("recebido_analise", "Recebido para análise", nRecebido, V.primary)}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ padding: "22px 20px", fontSize: 14, color: V.muted }}>{itens.length === 0 ? "Nenhuma solicitação documental complementar registrada nos módulos de origem." : "Nenhuma solicitação para os filtros informados."}</div>
      ) : (
        <>
          <div className="gd-fila-row gd-fila-head" style={{ background: V.card }}>
            <span className="gd-c-sit">Situação</span><span className="gd-c-org">Origem e servidor</span><span className="gd-c-doc">Documento solicitado</span><span className="gd-c-prox">Próxima ação</span><span className="gd-c-acc" style={{ textAlign: "right" }}>Acesso</span>
          </div>
          {visiveis.map((s) => {
            const envio = s.estado === "aguardando_envio";
            return (
              <div key={s.id} className="gd-fila-row gd-row" data-destaque={foco && s.servidor === foco.entidade ? "true" : undefined}>
                <span className="gd-c-sit">
                  <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 999, color: envio ? V.amber : V.primary, background: envio ? V.amberSoft : V.primarySoft }}>{envio ? "Aguardando envio" : "Recebido para análise"}</span>
                </span>
                <span className="gd-c-org" style={{ minWidth: 0 }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, color: V.muted, border: `1px solid ${V.border}`, borderRadius: 6, padding: "1px 8px", marginBottom: 4 }}>{s.origem}</span>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, overflowWrap: "anywhere" }}>{s.servidor}</span>
                  <span style={{ display: "block", fontSize: 13, color: V.muted }}>Referência {s.referencia}</span>
                </span>
                <span className="gd-c-doc" style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, overflowWrap: "anywhere" }}>{s.documento}</span>
                  <span style={{ display: "block", fontSize: 12, color: V.muted, marginTop: 2 }}>{envio ? "Solicitado" : "Recebido"} em {dataBR(s.data)}{s.solicitadoPor ? ` · por ${s.solicitadoPor}` : ""}</span>
                </span>
                <span className="gd-c-prox" style={{ fontSize: 14, fontWeight: 700, color: s.proximaAcao === "GERDAB" ? V.primary : V.text }}><span className="gd-lbl">Próxima ação: </span>{s.proximaAcao}</span>
                <span className="gd-c-acc" style={{ textAlign: "right" }}><BotaoAcesso s={s} /></span>
              </div>
            );
          })}
        </>
      )}
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 20px", background: V.bg, borderTop: `1px solid ${V.border}` }}>
        <span style={{ fontSize: 13, color: V.muted, fontVariantNumeric: "tabular-nums" }}>Mostrando {visiveis.length} de {filtrados.length} {filtrados.length === 1 ? "solicitação ativa" : "solicitações ativas"}</span>
        {paginas > 1 && (
          <nav aria-label="Paginação das solicitações" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" disabled={atual === 0} onClick={() => setPagina(atual - 1)} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: `1px solid ${V.border}`, background: V.card, color: atual === 0 ? V.muted : V.primary, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: atual === 0 ? "default" : "pointer" }}>Anterior</button>
            <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Página {atual + 1} de {paginas}</span>
            <button type="button" disabled={atual >= paginas - 1} onClick={() => setPagina(atual + 1)} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: `1px solid ${V.border}`, background: V.card, color: atual >= paginas - 1 ? V.muted : V.primary, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: atual >= paginas - 1 ? "default" : "pointer" }}>Próxima</button>
          </nav>
        )}
      </footer>
    </section>
  );
}

type FiltroAlerta = "todos" | "vencidos" | "atencao" | "recebidos";
const ROTULO_FILTRO_ALERTA: Record<FiltroAlerta, string> = { todos: "Todos os alertas", vencidos: "Vencidos", atencao: "Requerem atenção", recebidos: "Recebidos" };

export function PrazosAlertas({ dados, competenciaRotulo }: { dados: DadosDashboard; competenciaRotulo?: string }) {
  const alertas = dados.alertas.itens;
  const { itens: notificacoes } = useNotificacoesAdmin();
  const naoLidasPrazos = notificacoes.filter((n) => !n.lida && n.origem === "real" && n.indicadores?.includes("prazos"));
  const [aberto, setAberto] = useState(false);
  /** Expande a seção e rola suavemente até ela (ação do botão da modal de atualizações). */
  const abrirSecao = () => {
    setAberto(true);
    setTimeout(() => document.getElementById("secao-prazos-alertas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  const [foco, setFoco] = useState<FocoDashboard | null>(null);
  useEffect(() => {
    const aoFocar = (e: Event) => {
      const d = (e as CustomEvent<FocoDashboard>).detail;
      if (d.indicador !== "prazos") return;
      setAberto(true);
      setFoco(d);
      setTimeout(() => document.getElementById("fila-complementares")?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    };
    window.addEventListener(EVENTO_FOCO_DASHBOARD, aoFocar);
    return () => window.removeEventListener(EVENTO_FOCO_DASHBOARD, aoFocar);
  }, []);
  const [busca, setBusca] = useState("");
  const [fichaAberta, setFichaAberta] = useState<string | null>(null);
  const [filtroAlerta, setFiltroAlerta] = useState<FiltroAlerta>("todos");
  const resultados = useMemo(() => (busca.trim() ? dados.buscar(busca) : []), [busca, dados]);
  const pend = alertas.filter((a) => a.etapa === "aguardando_envio").length;
  const analise = alertas.filter((a) => a.etapa === "aguardando_analise").length;
  const atendidas = alertas.filter((a) => a.etapa === "aprovado").length;
  const [complementares, setComplementares] = useState<SolicitacaoComplementar[]>([]);
  useEffect(() => {
    const atualizar = () => setComplementares(getSolicitacoesComplementares());
    atualizar();
    window.addEventListener("storage", atualizar);
    return () => window.removeEventListener("storage", atualizar);
  }, [dados, aberto]);
  const compEnvio = complementares.filter((c) => c.estado === "aguardando_envio").length;
  const compRecebidas = complementares.length - compEnvio;
  // Contadores atuais intactos; os complementares entram como indicador separado e identificado.
  const resumoBase = `${pend} aguardando envio · ${analise} aguardando análise · ${atendidas} atendida${atendidas === 1 ? "" : "s"}`;
  const resumo = complementares.length > 0 ? `${resumoBase} · Complementares: ${compEnvio} aguardando envio · ${compRecebidas} recebida${compRecebidas === 1 ? "" : "s"}` : resumoBase;
  const fichaPorMatricula = (matricula: string) => dados.buscar(matricula)[0] ?? null;
  const q = busca.trim();

  // Indicadores do cabeçalho do bloco 1: partição dos alertas existentes (recebido = atendido; vencido; demais requerem atenção).
  const categoria = (a: (typeof alertas)[number]): Exclude<FiltroAlerta, "todos"> => (a.etapa === "aprovado" ? "recebidos" : a.vencido ? "vencidos" : "atencao");
  const nVencidos = alertas.filter((a) => categoria(a) === "vencidos").length;
  const nAtencao = alertas.filter((a) => categoria(a) === "atencao").length;
  const nRecebidos = alertas.filter((a) => categoria(a) === "recebidos").length;
  const alertasFiltrados = filtroAlerta === "todos" ? alertas : alertas.filter((a) => categoria(a) === filtroAlerta);
  const buscaResumo = q ? (resultados.length === 1 ? "1 servidor encontrado na base" : `${resultados.length} servidores encontrados na base`) : `${alertasFiltrados.length} ${alertasFiltrados.length === 1 ? "registro" : "registros"}`;

  const linha = (id: string, cab: React.ReactNode, chips: React.ReactNode, ficha: FichaResumoServidor | null) => {
    const on = fichaAberta === id;
    return (
      <div key={id} style={{ borderTop: `1px solid ${V.border}` }}>
        <div className="gd-row" data-click={ficha ? "true" : undefined} onClick={(e) => { if (ficha && !(e.target as HTMLElement).closest("a,button")) setFichaAberta(on ? null : id); }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px", padding: "14px 20px", cursor: ficha ? "pointer" : "default" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>{cab}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{chips}</div>
          {ficha && (
            <button type="button" onClick={() => setFichaAberta(on ? null : id)} aria-expanded={on} style={{ ...botaoTexto, fontSize: 14, fontWeight: 600, color: V.primary, display: "inline-flex", alignItems: "center", gap: 4, minWidth: 104, justifyContent: "flex-end" }}>
              Abrir ficha <ChevronDown size={14} style={{ transform: on ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
            </button>
          )}
        </div>
        {on && ficha && <div style={{ padding: "0 20px" }}><FichaMini ficha={ficha} /></div>}
      </div>
    );
  };

  return (
    <div id="secao-prazos-alertas" style={{ scrollMarginTop: 72 }}>
    <SecaoRecolhivel titulo="Prazos e alertas documentais" resumo={resumo} aberta={aberto} onAlternar={() => setAberto((v) => !v)} contador={naoLidasPrazos.length > 0 ? <ContadorNotificacoes itens={naoLidasPrazos} rotulo="Prazos e alertas documentais" indicadorId="prazos" className="!min-w-6 !h-6 !text-xs" modal={{ indicador: "Prazos e alertas documentais", botao: { rotulo: "Abrir a seção", onClick: abrirSecao }, aoSelecionar: (n) => window.dispatchEvent(new CustomEvent<FocoDashboard>(EVENTO_FOCO_DASHBOARD, { detail: { indicador: "prazos", entidade: n.entidade ?? n.titulo, acontecimento: n.acontecimento ?? n.descricao, href: n.href } })) }} /> : undefined}>
      <div style={{ marginTop: 14, border: "1px solid var(--gd-panel-border, var(--gd-border))", borderRadius: 16, overflow: "hidden", background: V.card }}>
      <CabecalhoExpansao
        categoria={`Prazos e alertas documentais${competenciaRotulo ? ` · ${competenciaRotulo}` : ""}`}
        titulo="Prazos e alertas documentais"
        descricao="Acompanhe os prazos, as solicitações complementares e as pendências documentais que exigem atenção."
        badges={
          <>
            <SeloResumo texto={`${nVencidos} ${nVencidos === 1 ? "vencido" : "vencidos"}`} tom="rosa" />
            <SeloResumo texto={`${nAtencao} ${nAtencao === 1 ? "requer atenção" : "requerem atenção"}`} tom="ambar" />
            <SeloResumo texto={`${nRecebidos} ${nRecebidos === 1 ? "recebido" : "recebidos"}`} tom="verde" />
            <SeloResumo texto={`${complementares.length} ${complementares.length === 1 ? "solicitação complementar" : "solicitações complementares"}`} tom="azul" />
          </>
        }
        acao={<Link to="/admin/relatorios/documentacao" className={CLASSE_CTA_PRINCIPAL}>Abrir relação completa <IconeCta /></Link>}
        onFechar={() => setAberto(false)}
        rotuloFechar="Fechar prazos e alertas documentais"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
        <section aria-label="Validades e obrigações" style={{ border: `1px solid ${V.border}`, borderRadius: 12, overflow: "hidden", background: V.card }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", padding: "18px 20px 16px" }}>
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <div style={{ ...eyebrow, color: V.muted }}>Validades e obrigações</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 0" }}>Documentos com prazo, vencimento ou recebimento</h3>
              <p style={{ fontSize: 13, color: V.muted, margin: "6px 0 0", lineHeight: 1.5 }}>Obrigações identificadas automaticamente e documentos recebidos após uma solicitação.</p>
              <p style={{ fontSize: 12, color: V.muted, margin: "6px 0 0", lineHeight: 1.5 }}>A solicitação documental só existe quando registrada pela GERDAB. Um vencimento identificado não gera solicitação automática.</p>
            </div>
          </header>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "14px 20px", background: V.bg, borderTop: `1px solid ${V.border}` }}>
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
                style={{ width: "100%", height: 44, boxSizing: "border-box", padding: "0 12px 0 36px", border: `1px solid ${V.border}`, borderRadius: 12, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 14 }}
              />
            </div>
            <select value={filtroAlerta} onChange={(e) => { setFiltroAlerta(e.target.value as FiltroAlerta); setFichaAberta(null); }} aria-label="Filtrar alertas" disabled={!!q} style={{ height: 44, padding: "0 12px", border: `1px solid ${V.border}`, borderRadius: 12, background: V.card, color: V.text, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: q ? "not-allowed" : "pointer", opacity: q ? 0.6 : 1 }}>
              {(Object.keys(ROTULO_FILTRO_ALERTA) as FiltroAlerta[]).map((k) => <option key={k} value={k}>{ROTULO_FILTRO_ALERTA[k]}</option>)}
            </select>
            <span style={{ fontSize: 14, color: V.muted, fontVariantNumeric: "tabular-nums" }}>{buscaResumo}</span>
          </div>

          {q && resultados.length === 0 && <div style={{ fontSize: 14, color: V.muted, padding: "16px 20px", borderTop: `1px solid ${V.border}` }}>Nenhum servidor encontrado para "{q}".</div>}
          {!q && alertas.length === 0 && <div style={{ fontSize: 14, color: V.muted, padding: "16px 20px", borderTop: `1px solid ${V.border}` }}>Nenhum prazo próximo</div>}
          {!q && alertas.length > 0 && alertasFiltrados.length === 0 && <div style={{ fontSize: 14, color: V.muted, padding: "16px 20px", borderTop: `1px solid ${V.border}` }}>Nenhum alerta nesta situação.</div>}

          {q
            ? <div style={{ padding: "0 0 4px" }}><ListaPaginada key={q} itens={resultados} rotulo="servidores" render={(ficha) => {
                const s = { nome: ficha.nome, matricula: ficha.matricula };
                const n = ficha.situacoes.length;
                return linha(
                  "s" + s.matricula,
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{s.nome} <span style={{ fontWeight: 400, color: V.muted }}>· mat. {s.matricula}</span></div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{ficha.situacaoFuncional} · Status {ficha.statusProSaude} <span style={{ color: V.muted }}>· {ficha.plano} · {ficha.vidas} {ficha.vidas === 1 ? "vida" : "vidas"}</span></div>
                    <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>{ficha.dependentes}</div>
                  </>,
                  n > 0 ? <Chip txt={`${n} ${n === 1 ? "situação registrada" : "situações registradas"}`} fg={V.amber} bg={V.amberSoft} border={V.amberSoft} /> : <Chip txt="Sem pendências registradas" fg={V.green} bg={V.greenSoft} border={V.greenSoft} />,
                  ficha,
                );
              }} /></div>
            : alertasFiltrados.map((a) => {
                const tom = a.etapa === "aprovado" ? { fg: V.green, bg: V.greenSoft } : a.vencido ? { fg: V.red, bg: V.redSoft } : { fg: V.amber, bg: V.amberSoft };
                const etapa = a.etapa === "aprovado" ? { fg: V.green, border: V.green } : a.etapa === "aguardando_envio" ? { fg: V.amber, border: V.amber } : { fg: V.muted, border: V.border };
                return linha(
                  a.id,
                  <>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{a.documento}</div>
                    <div style={{ fontSize: 14, marginTop: 3 }}>{a.titular} <span style={{ color: V.muted }}>· mat. {a.matricula}</span></div>
                    <div style={{ fontSize: 12, color: V.muted, marginTop: 2 }}>Dependente: {a.beneficiario}</div>
                  </>,
                  <>
                    <Chip txt={a.prazoTexto} fg={tom.fg} bg={tom.bg} border={tom.bg} />
                    <Chip txt={a.etapaRotulo} fg={etapa.fg} bg="transparent" border={etapa.border} />
                  </>,
                  fichaPorMatricula(a.matricula),
                );
              })}

          <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 20px", background: V.bg, borderTop: `1px solid ${V.border}` }}>
            <span style={{ fontSize: 13, color: V.muted, fontVariantNumeric: "tabular-nums" }}>
              {q ? `${resultados.length} ${resultados.length === 1 ? "servidor encontrado" : "servidores encontrados"} na base` : `Mostrando ${alertasFiltrados.length} de ${alertas.length} alertas documentais`}
            </span>
            <Link to="/admin/relatorios/documentacao" style={{ fontSize: 14, fontWeight: 600 }}>Ver todos os alertas</Link>
          </footer>
        </section>

        <FilaOperacional itens={complementares} foco={foco} onDispensarFoco={() => setFoco(null)} />
      </div>
      </div>
    </SecaoRecolhivel>
    </div>
  );
}

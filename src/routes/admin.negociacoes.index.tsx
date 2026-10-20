import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Handshake, Plus, Search, X } from "lucide-react";
import { enviosAguardandoConferencia } from "@/lib/negociacoes-envios";
import { garantirMassaDemonstracaoEnvios } from "@/lib/massa-demonstracao-envios";
import { ConfirmarQuitacaoModal } from "@/components/negociacoes/ConfirmarQuitacaoModal";
import { GuardaPerfilAdmin, NegociacoesNav, SeloSituacao, botaoPrimario, formatarData, inputEstilo } from "@/components/negociacoes/ui";
import { ListaPaginada, V, cardBase, num } from "@/components/dashboard-gerdab/gd-ui";
import { garantirMassaDemonstracaoNegociacoes, restaurarMassaDemonstracaoNegociacoes } from "@/lib/massa-demonstracao-negociacoes";
import { formatCompetencia } from "@/lib/mock-data";
import { EVENTO_NEGOCIACOES, ROTULO_CLASSIFICACAO, ROTULO_SITUACAO, formatarCentavos, getCompetenciaReferencia, getFilaConfirmacoes, getIndicadores, getSituacaoNegociacao, listarNegociacoes, parcelasQuitadas, type Negociacao, type SituacaoNegociacao } from "@/lib/negociacoes";

interface BuscaNegociacoes {
  q?: string;
  associacao?: string;
  situacao?: SituacaoNegociacao;
  /** Vindo da central de notificações: abre a Rotina mensal com a fila expandida. */
  rotina?: number;
}

export const Route = createFileRoute("/admin/negociacoes/")({
  validateSearch: (s: Record<string, unknown>): BuscaNegociacoes => ({
    // A busca por matrícula (ex.: 34567) chega como número do parser de URL: normaliza para texto.
    q: (typeof s.q === "string" || typeof s.q === "number") && String(s.q) ? String(s.q) : undefined,
    associacao: typeof s.associacao === "string" && s.associacao ? s.associacao : undefined,
    situacao: s.situacao === "andamento" || s.situacao === "concluida" ? s.situacao : undefined,
    rotina: s.rotina === true || s.rotina === "true" ? 1 : Number(s.rotina) > 0 ? Number(s.rotina) : undefined,
  }),
  component: () => (
    <GuardaPerfilAdmin>
      <ConsultaNegociacoes />
    </GuardaPerfilAdmin>
  ),
});

const rotuloAssociacao = (n: Negociacao) => (n.associacao !== "—" ? `${n.associacao} · ${n.operadora}` : n.operadora);

function Indicador({ titulo, valor, sub, ativo, onClick }: { titulo: string; valor: string; sub?: string; ativo?: boolean; onClick?: () => void }) {
  const props = onClick ? { role: "button", tabIndex: 0, onClick, onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) } : {};
  return (
    <div {...props} data-sel={ativo ? "true" : undefined} aria-pressed={onClick ? !!ativo : undefined} className={`gd-bar ${onClick ? "gd-clk" : ""}`} style={{ ...cardBase, padding: "20px 18px 14px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: V.muted }}>{titulo}</span>
      <span style={{ fontSize: "clamp(19px, 1.7vw, 26px)", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.2, whiteSpace: "nowrap" }}>{valor}</span>
      {sub && <span style={{ fontSize: 12, color: V.muted }}>{sub}</span>}
    </div>
  );
}

function ConsultaNegociacoes() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/negociacoes/" });
  const [negs, setNegs] = useState<Negociacao[] | null>(null);
  const [termo, setTermo] = useState(busca.q ?? "");
  const [filaAberta, setFilaAberta] = useState(true);
  const [confirmando, setConfirmando] = useState<{ negociacaoId: string; numero: number } | null>(null);
  const [avisoFila, setAvisoFila] = useState("");
  const secaoRotina = useRef<HTMLElement>(null);
  const [atualizadaEm, setAtualizadaEm] = useState("");
  const [aguardandoEnvios, setAguardandoEnvios] = useState(0);

  useEffect(() => {
    garantirMassaDemonstracaoNegociacoes().finally(() => {
      void garantirMassaDemonstracaoEnvios();
      setAguardandoEnvios(enviosAguardandoConferencia().length);
      setNegs(listarNegociacoes());
      setAtualizadaEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    });
  }, []);
  useEffect(() => setTermo(busca.q ?? ""), [busca.q]);

  // A fila e os indicadores se atualizam na hora a cada gravação (confirmação de quitação, novo cadastro…).
  useEffect(() => {
    const recarregar = () => {
      setNegs(listarNegociacoes());
      setAguardandoEnvios(enviosAguardandoConferencia().length);
      setAtualizadaEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    };
    window.addEventListener(EVENTO_NEGOCIACOES, recarregar);
    return () => window.removeEventListener(EVENTO_NEGOCIACOES, recarregar);
  }, []);

  // Chegada pela notificação: fila expandida e seção à vista.
  useEffect(() => {
    if (!busca.rotina || negs === null) return;
    setFilaAberta(true);
    secaoRotina.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [busca.rotina, negs === null]);

  const definir = (p: BuscaNegociacoes) => navigate({ search: (a) => ({ ...a, ...p }), replace: true });
  const todas = negs ?? [];
  const ind = useMemo(() => getIndicadores(todas), [negs]);
  const fila = useMemo(() => getFilaConfirmacoes(todas), [negs]);
  const competenciaRef = getCompetenciaReferencia();
  const nMes = fila.filter((f) => f.classificacao === "vence_no_mes").length;
  const nAtraso = fila.length - nMes;
  const alvoModal = confirmando ? todas.find((n) => n.id === confirmando.negociacaoId) : undefined;
  const parcelaModal = alvoModal?.parcelas.find((p) => p.numero === confirmando?.numero);
  const associacoes = useMemo(() => [...new Set(todas.map((n) => (n.associacao !== "—" ? n.associacao : n.operadora)))].sort(), [negs]);
  const filtradas = useMemo(() => {
    const t = (busca.q ?? "").trim().toLowerCase();
    return todas.filter(
      (n) =>
        (!t || n.nomeServidor.toLowerCase().includes(t) || n.matricula.toLowerCase().includes(t)) &&
        (!busca.associacao || (n.associacao !== "—" ? n.associacao : n.operadora) === busca.associacao) &&
        (!busca.situacao || getSituacaoNegociacao(n) === busca.situacao),
    );
  }, [negs, busca.q, busca.associacao, busca.situacao]);
  const filtrando = !!(busca.q || busca.associacao || busca.situacao);

  return (
    <div className="gd" style={{ padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 20, background: V.bg, minHeight: "100%" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Handshake size={24} color={V.primary} aria-hidden /> Negociações
          </h1>
          <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Acompanhe acordos e confirme mensalmente as parcelas pagas pelos servidores.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span title="Os registros deste módulo são fictícios, para validar o fluxo do protótipo." style={{ fontSize: 11, fontWeight: 600, color: V.amber, background: V.amberSoft, padding: "3px 9px", borderRadius: 999 }}>Dados demonstrativos</span>
          <Link to="/admin/negociacoes/nova" style={botaoPrimario}>
            <Plus size={16} aria-hidden /> Nova negociação
          </Link>
        </div>
      </header>

      <NegociacoesNav ativa="negociacoes" aguardando={aguardandoEnvios} />

      <section ref={secaoRotina} id="rotina-mensal" aria-labelledby="rotina-titulo" style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: V.amber }}>Rotina mensal</div>
            <h2 id="rotina-titulo" style={{ fontSize: 20, fontWeight: 700, margin: "2px 0 0" }}>Ações que requerem sua atenção</h2>
            <p style={{ fontSize: 14, color: V.muted, margin: "4px 0 0" }}>Competência {formatCompetencia(competenciaRef)}{atualizadaEm ? ` · atualizada hoje às ${atualizadaEm}` : ""}</p>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: V.muted, background: V.track, padding: "6px 14px", borderRadius: 999 }} aria-live="polite">
            {fila.length} {fila.length === 1 ? "parcela aguardando ação" : "parcelas aguardando ação"}
          </span>
        </div>

        <div className="neg-fila" style={{ ...cardBase, overflow: "hidden", borderLeft: `4px solid ${V.amber}` }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", padding: "16px 20px" }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 10, background: V.amberSoft, color: V.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{fila.length}</span>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Confirmações de pagamento pendentes</h3>
              <p style={{ fontSize: 13, color: V.muted, margin: "3px 0 0" }}>
                {fila.length === 0 ? "Nenhuma parcela aguardando conferência nesta competência." : `${nMes} ${nMes === 1 ? "vence" : "vencem"} neste mês e ${nAtraso} ${nAtraso === 1 ? "permanece" : "permanecem"} em atraso. Confirme somente após validar o pagamento.`}
              </p>
            </div>
            <button type="button" onClick={() => setFilaAberta((v) => !v)} aria-expanded={filaAberta} aria-controls="fila-confirmacoes" style={botaoPrimario}>
              {filaAberta ? "Ocultar fila" : "Exibir fila"} <ChevronDown size={16} style={{ transform: filaAberta ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }} />
            </button>
          </div>
          {avisoFila && <p role="status" style={{ fontSize: 13, fontWeight: 600, color: V.green, margin: 0, padding: "0 20px 12px" }}>{avisoFila}</p>}
          <div id="fila-confirmacoes" hidden={!filaAberta} style={{ borderTop: `1px solid ${V.border}` }}>
            {negs === null ? (
              <p style={{ fontSize: 13, color: V.muted, padding: "14px 20px", margin: 0 }}>Carregando…</p>
            ) : fila.length === 0 ? (
              <p style={{ fontSize: 13, color: V.muted, padding: "14px 20px", margin: 0 }}>Nenhuma confirmação de pagamento pendente para a competência {formatCompetencia(competenciaRef)}.</p>
            ) : (
              <>
                <div className="neg-fila-row neg-fila-head" style={{ background: V.bg }}>
                  <span>Servidor</span><span>Parcela</span><span>Vencimento</span><span style={{ textAlign: "right" }}>Valor</span><span>Situação</span><span style={{ textAlign: "right" }}>Ação</span>
                </div>
                {fila.map((f) => {
                  const atraso = f.classificacao === "em_atraso";
                  const vinculo = f.negociacao.associacao !== "—" ? `${f.negociacao.associacao} · ${f.negociacao.operadora}` : f.negociacao.operadora;
                  return (
                    <div key={`${f.negociacao.id}-${f.parcela.numero}`} className="neg-fila-row gd-row">
                      <span style={{ minWidth: 0 }}>
                        <Link to="/admin/negociacoes/$id" params={{ id: f.negociacao.id }} style={{ fontWeight: 600, color: V.text }}>{f.negociacao.nomeServidor}</Link>
                        <span style={{ display: "block", fontSize: 12, color: V.muted }}>Matrícula {f.negociacao.matricula} · {vinculo}</span>
                      </span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Parcela</span>{f.parcela.numero}/{f.negociacao.parcelas.length}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Vencimento</span>{formatarData(f.parcela.vencimento)}</span>
                      <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Valor</span>{formatarCentavos(f.parcela.ressarcimento.finalCents)}</span>
                      <span><span className="neg-lbl">Situação</span><span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: atraso ? V.red : V.amber, background: atraso ? V.redSoft : V.amberSoft }}>{ROTULO_CLASSIFICACAO[f.classificacao]}</span></span>
                      <span style={{ textAlign: "right" }}>
                        <button type="button" onClick={() => { setAvisoFila(""); setConfirmando({ negociacaoId: f.negociacao.id, numero: f.parcela.numero }); }} aria-label={`Confirmar pagamento — ${f.negociacao.nomeServidor}, parcela ${f.parcela.numero}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.primary, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                          <Check size={15} aria-hidden /> Confirmar
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </section>

      <div style={{ marginTop: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Visão geral das negociações</h2>
        <p style={{ fontSize: 14, color: V.muted, margin: "4px 0 0" }}>Indicadores de acompanhamento; não representam tarefas pendentes.</p>
      </div>

      <section aria-label="Indicadores" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <Indicador titulo="Em andamento" valor={num(ind.emAndamento)} sub="negociações" ativo={busca.situacao === "andamento"} onClick={() => definir({ situacao: busca.situacao === "andamento" ? undefined : "andamento" })} />
        <Indicador titulo="Concluídas" valor={num(ind.concluidas)} sub="todas as parcelas quitadas" ativo={busca.situacao === "concluida"} onClick={() => definir({ situacao: busca.situacao === "concluida" ? undefined : "concluida" })} />
        <Indicador titulo="Parcelas aguardando quitação" valor={num(ind.parcelasPendentes)} sub={`de ${num(ind.totalParcelas)} parcelas · situação Pendente`} />
        <Indicador titulo="Quitadas aguardando ressarcimento" valor={num(ind.parcelasQuitadas)} sub={`${formatarCentavos(ind.quitadasAguardandoCents)} a ressarcir`} />
        <Indicador titulo="Total elegível cadastrado" valor={formatarCentavos(ind.totalElegivelCents)} sub="base de cálculo das negociações" />
      </section>

      <section style={{ ...cardBase, padding: 16, display: "flex", flexWrap: "wrap", gap: "12px 14px", alignItems: "flex-end" }}>
        <label style={{ flex: "2 1 260px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
          Pesquisar
          <span style={{ position: "relative", display: "block" }}>
            <Search size={15} aria-hidden style={{ position: "absolute", left: 10, top: 12, color: V.muted }} />
            <input
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value);
                definir({ q: e.target.value || undefined });
              }}
              placeholder="Servidor por nome ou matrícula…"
              style={{ ...inputEstilo, paddingLeft: 32, paddingRight: termo ? 32 : 10 }}
            />
            {termo && (
              <button type="button" aria-label="Limpar pesquisa" onClick={() => definir({ q: undefined })} style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, border: "none", background: "transparent", color: V.muted, cursor: "pointer" }}>
                <X size={15} />
              </button>
            )}
          </span>
        </label>
        <label style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
          Associação ou operadora
          <select value={busca.associacao ?? ""} onChange={(e) => definir({ associacao: e.target.value || undefined })} style={inputEstilo}>
            <option value="">Todas</option>
            {associacoes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
          Situação
          <select value={busca.situacao ?? ""} onChange={(e) => definir({ situacao: (e.target.value || undefined) as SituacaoNegociacao | undefined })} style={inputEstilo}>
            <option value="">Todas</option>
            {(Object.keys(ROTULO_SITUACAO) as SituacaoNegociacao[]).map((s) => (
              <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>
            ))}
          </select>
        </label>
        {filtrando && (
          <button type="button" onClick={() => navigate({ search: {}, replace: true })} style={{ background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 40 }}>
            Limpar filtros
          </button>
        )}
      </section>

      <section className="gd-bar neg-list" style={{ ...cardBase, padding: "18px 12px 12px" }} aria-live="polite">
        {negs === null ? (
          <p style={{ fontSize: 13, color: V.muted, padding: "10px 12px", margin: 0 }}>Carregando negociações…</p>
        ) : todas.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: V.muted, margin: "0 0 12px" }}>Nenhuma negociação cadastrada.</p>
            <Link to="/admin/negociacoes/nova" style={botaoPrimario}>Nova negociação</Link>
          </div>
        ) : (
          <>
            <div className="neg-row neg-head" role="row">
              <span>Servidor</span><span>Matrícula</span><span>Associação / operadora</span><span style={{ textAlign: "right" }}>Parcelas</span><span style={{ textAlign: "right" }}>Total elegível</span><span>Situação</span><span />
            </div>
            <ListaPaginada
              key={`${busca.q}|${busca.associacao}|${busca.situacao}`}
              itens={filtradas}
              passo={10}
              rotulo="negociações"
              vazio="Nenhuma negociação encontrada para os filtros informados."
              render={(n) => (
                <Link key={n.id} to="/admin/negociacoes/$id" params={{ id: n.id }} className="gd-row neg-row" data-click="true" title="Abrir detalhamento da negociação">
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ fontWeight: 600 }}>{n.nomeServidor}</strong>
                    <span style={{ display: "block", fontSize: 12, color: V.muted }}>Negociação nº {n.numero} · formalizada em {formatarData(n.dataFormalizacao)}</span>
                  </span>
                  <span><span className="neg-lbl">Matrícula</span>{n.matricula}</span>
                  <span><span className="neg-lbl">Associação / operadora</span>{rotuloAssociacao(n)}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Parcelas quitadas</span>{parcelasQuitadas(n)}/{n.parcelas.length}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Total elegível</span>{formatarCentavos(n.totalElegivelCents)}</span>
                  <span><span className="neg-lbl">Situação</span><SeloSituacao situacao={getSituacaoNegociacao(n)} /></span>
                  <span style={{ color: V.primary, fontWeight: 600, textAlign: "right" }}>Abrir →</span>
                </Link>
              )}
            />
          </>
        )}
      </section>

      {/* RECURSO EXCLUSIVO DO PROTÓTIPO: não é requisito funcional de produção. */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          title="Recurso exclusivo do protótipo — não é requisito funcional de produção"
          onClick={async () => {
            if (window.confirm("Restaurar os dados de demonstração das Negociações? (recurso só do protótipo; apaga as negociações cadastradas)")) {
              await restaurarMassaDemonstracaoNegociacoes();
              setNegs(listarNegociacoes());
            }
          }}
          style={{ fontSize: 12, color: V.muted, background: "none", border: `1px dashed ${V.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Restaurar dados de demonstração
        </button>
      </div>
      {alvoModal && parcelaModal && (
        <ConfirmarQuitacaoModal
          negociacao={alvoModal}
          parcela={parcelaModal}
          onFechar={() => setConfirmando(null)}
          onConfirmada={() => {
            setConfirmando(null);
            setAvisoFila(`Quitação de ${alvoModal.nomeServidor} (parcela ${parcelaModal.numero}/${alvoModal.parcelas.length}) confirmada. A parcela saiu da fila e o registro está no histórico da negociação.`);
          }}
        />
      )}
    </div>
  );
}

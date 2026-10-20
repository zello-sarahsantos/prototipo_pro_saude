import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, FileCheck2, Loader2, RotateCcw, X } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import { V, cardBase, num } from "@/components/dashboard-gerdab/gd-ui";
import { NegociacoesNav, botaoPrimario, botaoSecundario, formatarData, formatarDataHora, inputEstilo } from "@/components/negociacoes/ui";
import { diagnosticarRestauracaoDemo, garantirMassaDemonstracaoNegociacoes, haCenarioDemo, restaurarCenarioDemoRessarcimento, type DiagnosticoRestauracaoDemo } from "@/lib/massa-demonstracao-negociacoes";
import { formatarCentavos, responsavelAtual } from "@/lib/negociacoes";
import { associacaoOuOperadora, emitirRelatorio, getEmissao, getParcelasDisponiveis, listarEmissoes, previaLinhas, somarCents, specEmissao, type EmissaoRessarcimento, type LinhaEmissaoRessarcimento, type ParcelaDisponivel } from "@/lib/negociacoes-ressarcimento";

const PASSO = 10;
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Relatório de Ressarcimento de Negociações (Fase 4). UMA implementação e UMA fonte de dados, usada pelas duas entradas:
 * Negociações (aba) e Central de Relatórios. Seleção de parcelas → pré-visualização (não grava) → confirmação → emissão
 * (snapshot imutável no histórico) → consulta/exportação PDF e Excel. Nada altera negociações, quitações ou cálculos.
 */
export function RessarcimentoNegociacoes({ contexto }: { contexto: "negociacoes" | "relatorios" }) {
  const [disponiveis, setDisponiveis] = useState<ParcelaDisponivel[] | null>(null);
  const [emissoes, setEmissoes] = useState<EmissaoRessarcimento[]>([]);
  const [desmarcadas, setDesmarcadas] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [associacao, setAssociacao] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO);
  const [previa, setPrevia] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState(false);
  const [temDemo, setTemDemo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string; emissaoId?: string } | null>(null);

  useEffect(() => {
    const recarregar = () => {
      setDisponiveis(getParcelasDisponiveis());
      setEmissoes(listarEmissoes());
      setTemDemo(haCenarioDemo());
    };
    garantirMassaDemonstracaoNegociacoes().finally(recarregar);
    recarregar();
    window.addEventListener("prosaude-negociacoes", recarregar);
    window.addEventListener("storage", recarregar);
    return () => {
      window.removeEventListener("prosaude-negociacoes", recarregar);
      window.removeEventListener("storage", recarregar);
    };
  }, []);

  const todas = disponiveis ?? [];
  const opcoesAssociacao = useMemo(() => Array.from(new Set(todas.map((d) => associacaoOuOperadora(d.negociacao)))).sort(), [disponiveis]);
  const filtradas = useMemo(() => {
    const q = semAcento(busca.trim());
    return todas.filter((d) => (!associacao || associacaoOuOperadora(d.negociacao) === associacao) && (!q || semAcento(d.negociacao.nomeServidor).includes(q) || d.negociacao.matricula.includes(q) || String(d.negociacao.numero) === q));
  }, [disponiveis, busca, associacao]);
  useEffect(() => setVisiveis(PASSO), [busca, associacao]);

  // A seleção é GLOBAL (todas as páginas e filtros). Guarda-se o que foi desmarcado; novas parcelas disponíveis entram marcadas.
  const selecionadas = todas.filter((d) => !desmarcadas.has(d.chave));
  const linhasSel = previaLinhas(selecionadas);
  const totalSel = somarCents(linhasSel);
  const filtroAtivo = !!busca.trim() || !!associacao;

  const alternar = (chave: string) => setDesmarcadas((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });
  const marcarFiltradas = () => setDesmarcadas((s) => { const n = new Set(s); filtradas.forEach((d) => n.delete(d.chave)); return n; });
  const desmarcarFiltradas = () => setDesmarcadas((s) => { const n = new Set(s); filtradas.forEach((d) => n.add(d.chave)); return n; });
  const escopo = filtroAtivo ? `as ${num(filtradas.length)} parcelas do filtro (todas as páginas)` : `todas as ${num(todas.length)} parcelas disponíveis (todas as páginas)`;

  function emitir() {
    try {
      const e = emitirRelatorio(selecionadas.map((d) => d.chave), responsavelAtual(getAdminRole()));
      setAviso({ tipo: "ok", texto: `Relatório nº ${e.sequencia} emitido e registrado no histórico: ${num(e.linhas.length)} parcela(s), total ${formatarCentavos(e.totalCents)}.`, emissaoId: e.id });
      setDesmarcadas(new Set());
      setPrevia(false);
    } catch (err) {
      setAviso({ tipo: "erro", texto: err instanceof Error ? err.message : "Não foi possível emitir o relatório." });
    }
    setConfirmando(false);
    setDisponiveis(getParcelasDisponiveis());
    setEmissoes(listarEmissoes());
  }

  const emissaoDetalhe = detalhe ? getEmissao(detalhe) : undefined;
  const cabecalho = (
    <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        {contexto === "relatorios" && (
          <Link to="/admin/relatorios" style={{ fontSize: 13, fontWeight: 600, color: V.primary, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", marginBottom: 6 }}><ArrowLeft size={14} aria-hidden /> Relatórios</Link>
        )}
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <FileCheck2 size={24} color={V.primary} aria-hidden /> {contexto === "relatorios" ? "Ressarcimento de Negociações" : "Negociações"}
        </h1>
        <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Parcelas com quitação confirmada, reunidas em relatório de ressarcimento para o NURFI.</p>
      </div>
      <span title="Os registros deste módulo são fictícios, para validar o fluxo do protótipo." style={{ fontSize: 11, fontWeight: 600, color: V.amber, background: V.amberSoft, padding: "3px 9px", borderRadius: 999 }}>Dados demonstrativos</span>
    </header>
  );

  if (emissaoDetalhe) {
    return (
      <div className="gd" style={pagina}>
        {cabecalho}
        {contexto === "negociacoes" && <NegociacoesNav ativa="ressarcimento" />}
        <DetalheEmissao emissao={emissaoDetalhe} onVoltar={() => setDetalhe(null)} />
      </div>
    );
  }

  return (
    <div className="gd" style={pagina}>
      {cabecalho}
      {contexto === "negociacoes" && <NegociacoesNav ativa="ressarcimento" />}

      <section aria-label="Resumo da seleção" className="neg-res-resumo">
        <Indicador rotulo="Parcelas disponíveis" valor={num(todas.length)} />
        <Indicador rotulo="Selecionadas" valor={num(selecionadas.length)} destaque />
        <Indicador rotulo="Não selecionadas" valor={num(todas.length - selecionadas.length)} />
        <Indicador rotulo="Valor total selecionado" valor={formatarCentavos(totalSel)} destaque />
      </section>

      {aviso && (
        <p role={aviso.tipo === "erro" ? "alert" : "status"} style={{ fontSize: 13, fontWeight: 600, color: aviso.tipo === "erro" ? V.red : V.green, margin: 0 }}>
          {aviso.texto}{" "}
          {aviso.emissaoId && <button type="button" onClick={() => setDetalhe(aviso.emissaoId!)} style={linkBotao}>Consultar relatório</button>}
        </p>
      )}

      <section style={{ ...cardBase, padding: 16, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="res-sel-titulo">
        <div>
          <h2 id="res-sel-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>1. Parcelas disponíveis para emissão</h2>
          <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0", lineHeight: 1.5 }}>
            Todas as parcelas com quitação confirmada que ainda não constam em relatório emitido, de qualquer competência. Desmarque as que não devem entrar nesta emissão: elas não são alteradas e continuam disponíveis para as próximas. A emissão inclui todas as parcelas marcadas, mesmo as fora do filtro atual.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", alignItems: "flex-end" }}>
          <label style={rotuloCampo}>Buscar servidor
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, matrícula ou nº da negociação" style={inputEstilo} />
          </label>
          <label style={rotuloCampo}>Associação/Operadora
            <select value={associacao} onChange={(e) => setAssociacao(e.target.value)} style={inputEstilo}>
              <option value="">Todas</option>
              {opcoesAssociacao.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {filtroAtivo && <button type="button" onClick={() => { setBusca(""); setAssociacao(""); }} style={{ ...linkBotao, height: 40 }}>Limpar filtros</button>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={marcarFiltradas} disabled={filtradas.length === 0} style={{ ...botaoSecundario, height: 34, fontSize: 13 }}>Selecionar todas</button>
          <button type="button" onClick={desmarcarFiltradas} disabled={filtradas.length === 0} style={{ ...botaoSecundario, height: 34, fontSize: 13 }}>Desmarcar todas</button>
          <span style={{ fontSize: 12, color: V.muted }}>Alcance: {escopo}.{filtroAtivo ? " Parcelas fora do filtro não são afetadas." : ""}</span>
        </div>

        <div className="neg-res">
          {disponiveis === null ? (
            <p style={vazio}>Carregando…</p>
          ) : todas.length === 0 ? (
            <p style={vazio}>Nenhuma parcela disponível: as parcelas quitadas já constam em relatórios emitidos ou ainda não há quitações confirmadas.</p>
          ) : filtradas.length === 0 ? (
            <p style={vazio}>Nenhuma parcela para os filtros informados.</p>
          ) : (
            <>
              <div className="neg-res-row neg-res-head" style={{ background: V.bg }}>
                <span /><span>Servidor</span><span>Associação/Operadora</span><span>Negociação</span><span>Quitação</span><span style={{ textAlign: "right" }}>Valor a ressarcir</span>
              </div>
              {filtradas.slice(0, visiveis).map((d) => {
                const marcada = !desmarcadas.has(d.chave);
                const n = d.negociacao;
                return (
                  <label key={d.chave} className="neg-res-row gd-row" style={{ cursor: "pointer", background: marcada ? undefined : V.bg }}>
                    <input type="checkbox" checked={marcada} onChange={() => alternar(d.chave)} aria-label={`Incluir ${n.nomeServidor}, negociação ${n.numero}, parcela ${d.parcela.numero} de ${n.parcelas.length}`} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{n.nomeServidor}</strong>
                      <span style={{ display: "block", fontSize: 12, color: V.muted }}>Matrícula {n.matricula}</span>
                    </span>
                    <span style={{ overflowWrap: "anywhere" }}><span className="neg-lbl">Associação/Operadora</span>{associacaoOuOperadora(n)}</span>
                    <span><span className="neg-lbl">Negociação</span>Nº {n.numero} · parcela {d.parcela.numero}/{n.parcelas.length}</span>
                    <span><span className="neg-lbl">Quitação</span>{formatarData(d.parcela.quitacao!.data)}</span>
                    <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      <span className="neg-lbl">Valor a ressarcir</span>{formatarCentavos(d.parcela.ressarcimento.finalCents)}
                      {d.parcela.ressarcimento.origem === "manual" && <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: V.amber }}>Preenchido manualmente</span>}
                    </span>
                  </label>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "10px 16px", borderTop: `1px solid ${V.border}` }}>
                <span style={{ fontSize: 12, color: V.muted }}>Mostrando {num(Math.min(visiveis, filtradas.length))} de {num(filtradas.length)} parcela(s)</span>
                {visiveis < filtradas.length && <button type="button" onClick={() => setVisiveis((v) => v + PASSO)} style={linkBotao}>Mostrar mais {Math.min(PASSO, filtradas.length - visiveis)}</button>}
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setPrevia((v) => !v)} disabled={selecionadas.length === 0} style={botaoSecundario}><Eye size={16} aria-hidden /> {previa ? "Ocultar pré-visualização" : "Pré-visualizar relatório"}</button>
          <button type="button" onClick={() => setConfirmando(true)} disabled={selecionadas.length === 0} style={{ ...botaoPrimario, opacity: selecionadas.length === 0 ? 0.5 : 1, cursor: selecionadas.length === 0 ? "not-allowed" : "pointer" }}><FileCheck2 size={16} aria-hidden /> Emitir relatório</button>
          {selecionadas.length === 0 && todas.length > 0 && <span style={{ fontSize: 12, color: V.muted }}>Selecione ao menos uma parcela para emitir.</span>}
        </div>
      </section>

      {previa && selecionadas.length > 0 && (
        <section style={{ ...cardBase, padding: 16, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="res-prev-titulo">
          <div>
            <h2 id="res-prev-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Pré-visualização</h2>
            <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Conteúdo do relatório com as parcelas selecionadas. Nada é gravado até a emissão.</p>
          </div>
          <TabelaLinhas linhas={linhasSel} totalCents={totalSel} />
        </section>
      )}

      <section style={{ ...cardBase, padding: 16, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="res-hist-titulo">
        <h2 id="res-hist-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>2. Histórico de emissões</h2>
        {emissoes.length === 0 ? (
          <p style={vazio}>Nenhum relatório emitido ainda.</p>
        ) : (
          <div className="neg-res">
            <div className="neg-hist-row neg-hist-head" style={{ background: V.bg }}>
              <span>Relatório</span><span>Emitido em</span><span>Responsável</span><span style={{ textAlign: "right" }}>Parcelas</span><span style={{ textAlign: "right" }}>Total</span><span style={{ textAlign: "right" }}>Ações</span>
            </div>
            {emissoes.map((e) => (
              <div key={e.id} className="neg-hist-row gd-row">
                <strong>Relatório nº {e.sequencia}</strong>
                <span><span className="neg-lbl">Emitido em</span>{formatarDataHora(e.emitidaEm)}</span>
                <span><span className="neg-lbl">Responsável</span>{e.responsavel}</span>
                <span style={{ textAlign: "right" }}><span className="neg-lbl">Parcelas</span>{num(e.linhas.length)}</span>
                <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}><span className="neg-lbl">Total</span>{formatarCentavos(e.totalCents)}</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setDetalhe(e.id)} style={{ ...botaoSecundario, height: 34, fontSize: 13, color: V.primary, border: `1px solid ${V.primary}` }}><Eye size={14} aria-hidden /> Consultar</button>
                  <ExportarRelatorio spec={specEmissao(e)} flutuante />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {temDemo && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setRestaurando(true)} style={{ ...linkBotao, color: V.muted, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}><RotateCcw size={13} aria-hidden /> Restaurar dados de demonstração</button>
        </div>
      )}

      {restaurando && (
        <RestaurarDemo
          onCancelar={() => setRestaurando(false)}
          onRestaurado={(d) => {
            setRestaurando(false);
            setDesmarcadas(new Set());
            setPrevia(false);
            setDetalhe(null);
            setBusca("");
            setAssociacao("");
            setDisponiveis(getParcelasDisponiveis());
            setEmissoes(listarEmissoes());
            setAviso({ tipo: "ok", texto: `Dados de demonstração restaurados: ${num(d.negociacoesDemo)} negociação(ões) e ${num(d.emissoesDemo)} emissão(ões) demonstrativa(s) recriadas/removidas. Registros cadastrados manualmente foram preservados.` });
          }}
        />
      )}

      {confirmando && <ConfirmarEmissao quantidade={selecionadas.length} totalCents={totalSel} onConfirmar={emitir} onCancelar={() => setConfirmando(false)} />}
    </div>
  );
}

function DetalheEmissao({ emissao, onVoltar }: { emissao: EmissaoRessarcimento; onVoltar: () => void }) {
  return (
    <section style={{ ...cardBase, padding: 16, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="res-det-titulo">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <button type="button" onClick={onVoltar} style={{ ...linkBotao, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}><ArrowLeft size={14} aria-hidden /> Voltar</button>
          <h2 id="res-det-titulo" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Relatório nº {emissao.sequencia}</h2>
          <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Emitido em {formatarDataHora(emissao.emitidaEm)} por {emissao.responsavel} · {num(emissao.linhas.length)} parcela(s) · total {formatarCentavos(emissao.totalCents)}. Registro imutável: reflete exatamente o que foi emitido.</p>
        </div>
        <ExportarRelatorio spec={specEmissao(emissao)} />
      </div>
      <TabelaLinhas linhas={emissao.linhas} totalCents={emissao.totalCents} />
    </section>
  );
}

function TabelaLinhas({ linhas, totalCents }: { linhas: LinhaEmissaoRessarcimento[]; totalCents: number }) {
  return (
    <div className="neg-res">
      <div className="neg-rel-row neg-rel-head" style={{ background: V.bg }}>
        <span>Matrícula</span><span>Nome</span><span>Associação/Operadora</span><span>Negociação</span><span>Parcela</span><span>Quitação</span><span style={{ textAlign: "right" }}>Valor a ressarcir</span>
      </div>
      {linhas.map((l) => (
        <div key={`${l.negociacaoId}:${l.numeroParcela}`} className="neg-rel-row gd-row">
          <span><span className="neg-lbl">Matrícula</span>{l.matricula}</span>
          <strong style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{l.nome}</strong>
          <span style={{ overflowWrap: "anywhere" }}><span className="neg-lbl">Associação/Operadora</span>{l.associacaoOperadora}</span>
          <span><span className="neg-lbl">Negociação</span>Nº {l.negociacaoNumero}</span>
          <span><span className="neg-lbl">Parcela</span>{l.numeroParcela}/{l.totalParcelas}</span>
          <span><span className="neg-lbl">Quitação</span>{formatarData(l.dataQuitacao)}</span>
          <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            <span className="neg-lbl">Valor a ressarcir</span>{formatarCentavos(l.valorCents)}
            {l.ajusteManual && <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: V.amber }}>Preenchido manualmente</span>}
          </span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderTop: `2px solid ${V.border}`, fontWeight: 700 }}>
        <span>Total geral</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{formatarCentavos(totalCents)}</span>
      </div>
    </div>
  );
}

function ConfirmarEmissao({ quantidade, totalCents, onConfirmar, onCancelar }: { quantidade: number; totalCents: number; onConfirmar: () => void; onCancelar: () => void }) {
  const [emitindo, setEmitindo] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botao.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCancelar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onCancelar]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,22,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="emi-titulo" style={{ ...cardBase, width: "min(480px, 100%)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 id="emi-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Emitir relatório de ressarcimento?</h2>
          <button type="button" onClick={onCancelar} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: V.muted }}><X size={18} /></button>
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 14 }}>
          <dt style={{ color: V.muted }}>Parcelas selecionadas</dt><dd style={{ margin: 0, fontWeight: 700 }}>{num(quantidade)}</dd>
          <dt style={{ color: V.muted }}>Valor total</dt><dd style={{ margin: 0, fontWeight: 700 }}>{formatarCentavos(totalCents)}</dd>
        </dl>
        <p style={{ fontSize: 13, color: V.muted, margin: 0, lineHeight: 1.5 }}>A emissão será registrada no histórico e as parcelas incluídas deixarão de estar disponíveis para novas emissões. Emitir não confirma repasse nem altera negociações ou quitações.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button ref={botao} type="button" disabled={emitindo} onClick={() => { setEmitindo(true); onConfirmar(); }} style={botaoPrimario}>{emitindo ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <FileCheck2 size={16} aria-hidden />} Confirmar emissão</button>
          <button type="button" onClick={onCancelar} style={botaoSecundario}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function RestaurarDemo({ onCancelar, onRestaurado }: { onCancelar: () => void; onRestaurado: (d: DiagnosticoRestauracaoDemo) => void }) {
  const [diag] = useState(() => diagnosticarRestauracaoDemo());
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botao.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !executando && onCancelar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onCancelar, executando]);
  async function restaurar() {
    setExecutando(true);
    setErro("");
    try {
      onRestaurado(await restaurarCenarioDemoRessarcimento());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível restaurar os dados de demonstração.");
      setExecutando(false);
    }
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,22,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && !executando && onCancelar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="rest-titulo" style={{ ...cardBase, width: "min(520px, 100%)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 id="rest-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Restaurar dados de demonstração?</h2>
        <p style={{ fontSize: 13, color: V.muted, margin: 0, lineHeight: 1.5 }}>Esta ação afeta <strong style={{ color: V.text }}>somente os registros identificados como demonstrativos</strong>, para repetir os testes de seleção e emissão:</p>
        <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>As <strong>{num(diag.negociacoesDemo)} negociações de demonstração</strong> (com suas parcelas, documentos e as <strong>{num(diag.quitacoesDemo)} quitações</strong> demonstrativas) voltam ao estado inicial. Quitações ou ajustes feitos por você nelas durante os testes também são desfeitos.</li>
          <li>As <strong>{num(diag.emissoesDemo)} emissão(ões) demonstrativa(s)</strong> (compostas apenas por parcelas de demonstração) são removidas do histórico, e as parcelas voltam a ficar disponíveis.</li>
        </ul>
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: V.green }}>Preservados sem alteração: {num(diag.negociacoesManuais)} negociação(ões) cadastrada(s) manualmente, com suas quitações e documentos, e {num(diag.emissoesPreservadas)} emissão(ões) que incluam qualquer registro manual.</p>
        {erro && <p role="alert" style={{ color: V.red, fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button ref={botao} type="button" onClick={restaurar} disabled={executando} style={botaoPrimario}>{executando ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RotateCcw size={16} aria-hidden />} Restaurar dados de demonstração</button>
          <button type="button" onClick={onCancelar} disabled={executando} style={botaoSecundario}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="gd-bar" style={{ ...cardBase, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: V.muted }}>{rotulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: destaque ? V.primary : V.text, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{valor}</div>
    </div>
  );
}

const pagina = { padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 18, background: V.bg, minHeight: "100%" } as const;
const rotuloCampo = { flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted } as const;
const vazio = { fontSize: 13, color: V.muted, padding: "20px 16px", margin: 0, textAlign: "center" } as const;
const linkBotao = { background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 } as const;

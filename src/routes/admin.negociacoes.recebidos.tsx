import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Download, Eye, Handshake } from "lucide-react";
import { GuardaPerfilAdmin, NegociacoesNav, botaoPrimario, formatarDataHora, inputEstilo } from "@/components/negociacoes/ui";
import { V, cardBase, num } from "@/components/dashboard-gerdab/gd-ui";
import { getAdminRole } from "@/components/AdminLayout";
import { garantirMassaDemonstracaoEnvios } from "@/lib/massa-demonstracao-envios";
import { garantirMassaDemonstracaoNegociacoes } from "@/lib/massa-demonstracao-negociacoes";
import { formatCompetencia } from "@/lib/mock-data";
import { ASSOCIACOES_ENVIO, ROTULO_SITUACAO_ENVIO, abrirArquivoEnvio, listarEnvios, marcarEnvioConferido, type EnvioRelatorioNegociacao } from "@/lib/negociacoes-envios";
import { responsavelAtual } from "@/lib/negociacoes";

interface BuscaRecebidos {
  associacao?: string;
  competencia?: string;
}

export const Route = createFileRoute("/admin/negociacoes/recebidos")({
  validateSearch: (s: Record<string, unknown>): BuscaRecebidos => ({
    associacao: typeof s.associacao === "string" && s.associacao ? s.associacao : undefined,
    competencia: typeof s.competencia === "string" && /^\d{4}-\d{2}$/.test(s.competencia) ? s.competencia : undefined,
  }),
  component: () => (
    <GuardaPerfilAdmin>
      <RelatoriosRecebidos />
    </GuardaPerfilAdmin>
  ),
});

function RelatoriosRecebidos() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/negociacoes/recebidos" });
  const [envios, setEnvios] = useState<EnvioRelatorioNegociacao[] | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const recarregar = () => setEnvios(listarEnvios());
    garantirMassaDemonstracaoNegociacoes().finally(() => garantirMassaDemonstracaoEnvios().finally(recarregar));
    recarregar();
    window.addEventListener("prosaude-negociacoes", recarregar);
    return () => window.removeEventListener("prosaude-negociacoes", recarregar);
  }, []);

  const definir = (p: BuscaRecebidos) => navigate({ search: (a) => ({ ...a, ...p }), replace: true });
  const todos = envios ?? [];
  const filtrados = useMemo(() => todos.filter((e) => (!busca.associacao || e.associacao === busca.associacao) && (!busca.competencia || e.competencia === busca.competencia)), [envios, busca.associacao, busca.competencia]);
  const aguardando = todos.filter((e) => e.situacao === "recebido").length;

  function conferir(e: EnvioRelatorioNegociacao) {
    marcarEnvioConferido(e.id, responsavelAtual(getAdminRole()));
    setAviso(`${e.associacao.toUpperCase()} — ${formatCompetencia(e.competencia)} marcado como conferido. Isso não altera negociações, cálculos nem quitações.`);
  }

  return (
    <div className="gd" style={{ padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 18, background: V.bg, minHeight: "100%" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Handshake size={24} color={V.primary} aria-hidden /> Negociações
          </h1>
          <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Relatórios de negociações enviados pelas associações, para consulta e conferência manual.</p>
        </div>
        <span title="Os registros deste módulo são fictícios, para validar o fluxo do protótipo." style={{ fontSize: 11, fontWeight: 600, color: V.amber, background: V.amberSoft, padding: "3px 9px", borderRadius: 999 }}>Dados demonstrativos</span>
      </header>
      <NegociacoesNav ativa="recebidos" aguardando={aguardando} />

      <div style={{ ...cardBase, padding: "12px 16px", fontSize: 13, color: V.muted, lineHeight: 1.5 }}>
        Um arquivo pode conter vários servidores. O sistema <strong style={{ color: V.text }}>não interpreta o conteúdo</strong>, não preenche negociações e não confirma pagamentos: use o arquivo como referência e confirme a quitação, manualmente, na negociação do servidor.
      </div>

      <section style={{ ...cardBase, padding: 16, display: "flex", flexWrap: "wrap", gap: "12px 14px", alignItems: "flex-end" }}>
        <label style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
          Associação
          <select value={busca.associacao ?? ""} onChange={(e) => definir({ associacao: e.target.value || undefined })} style={inputEstilo}>
            <option value="">Todas</option>
            {ASSOCIACOES_ENVIO.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
          </select>
        </label>
        <label style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
          Competência
          <input type="month" value={busca.competencia ?? ""} onChange={(e) => definir({ competencia: e.target.value || undefined })} style={inputEstilo} />
        </label>
        {(busca.associacao || busca.competencia) && (
          <button type="button" onClick={() => navigate({ search: {}, replace: true })} style={{ background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 40 }}>Limpar filtros</button>
        )}
        <span style={{ fontSize: 13, color: V.muted, marginLeft: "auto" }}>{num(filtrados.length)} de {num(todos.length)} envio(s)</span>
      </section>

      {aviso && <p role="status" style={{ fontSize: 13, fontWeight: 600, color: V.green, margin: 0 }}>{aviso}</p>}

      <section className="gd-bar neg-env" style={{ ...cardBase, padding: "6px 0 0", overflow: "hidden" }} aria-live="polite">
        {envios === null ? (
          <p style={{ fontSize: 13, color: V.muted, padding: "16px 20px", margin: 0 }}>Carregando…</p>
        ) : filtrados.length === 0 ? (
          <p style={{ fontSize: 13, color: V.muted, padding: "24px 20px", margin: 0, textAlign: "center" }}>{todos.length === 0 ? "Nenhum relatório de negociações recebido ainda." : "Nenhum envio para os filtros informados."}</p>
        ) : (
          <>
            <div className="neg-env-row neg-env-head" style={{ background: V.bg }}>
              <span>Arquivo</span><span>Enviado em</span><span>Competência</span><span>Situação</span><span style={{ textAlign: "right" }}>Ações</span>
            </div>
            {filtrados.map((e) => {
              return (
                <div key={e.id} className="neg-env-row gd-row">
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{e.nomeArquivo}</strong>
                    <span style={{ display: "block", fontSize: 12, color: V.muted }}>{e.associacao.toUpperCase()} · {e.enviadoPor}</span>
                  </span>
                  <span style={{ fontSize: 13 }}><span className="neg-lbl">Enviado em</span>{formatarDataHora(e.enviadoEm)}</span>
                  <span><span className="neg-lbl">Competência</span>{formatCompetencia(e.competencia)}</span>
                  <span>
                    <span className="neg-lbl">Situação</span>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: e.situacao === "conferido" ? V.green : V.amber, background: e.situacao === "conferido" ? V.greenSoft : V.amberSoft }}>{ROTULO_SITUACAO_ENVIO[e.situacao]}</span>
                    {e.situacao === "conferido" && e.conferidoPor && e.conferidoEm && <span style={{ display: "block", fontSize: 11, color: V.muted }}>por {e.conferidoPor} em {formatarDataHora(e.conferidoEm)}</span>}
                  </span>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => abrirArquivoEnvio(e)} style={{ ...botaoPrimario, height: 34, fontSize: 13, background: V.card, color: V.primary, border: `1px solid ${V.primary}` }}><Eye size={14} /> Visualizar</button>
                    <button type="button" onClick={() => abrirArquivoEnvio(e, true)} aria-label={`Baixar ${e.nomeArquivo}`} style={{ ...botaoPrimario, height: 34, fontSize: 13, background: V.card, color: V.primary, border: `1px solid ${V.primary}` }}><Download size={14} /> Baixar</button>
                    {e.situacao === "recebido" && (
                      <button type="button" onClick={() => conferir(e)} style={{ ...botaoPrimario, height: 34, fontSize: 13 }}><Check size={14} /> Marcar como conferido</button>
                    )}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}

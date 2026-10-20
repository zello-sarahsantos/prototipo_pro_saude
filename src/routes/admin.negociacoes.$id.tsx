import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Download, Eye, Loader2, Plus } from "lucide-react";
import { Campo, GuardaPerfilAdmin, MarcadorAjuste, MemoriaAuxilioView, AjudaArquivo, MemoriaRessarcimentoView, SeletorArquivo, SeloOrigemValor, SeloSituacao, abrirDocumentoNegociacao, botaoPrimario, formatarData, formatarDataHora, inputEstilo, rotuloDocumento } from "@/components/negociacoes/ui";
import { ConfirmarQuitacaoModal } from "@/components/negociacoes/ConfirmarQuitacaoModal";
import { V, cardBase, num } from "@/components/dashboard-gerdab/gd-ui";
import { SecaoExpansivel as Secao } from "@/components/SecaoExpansivel";
import { getAdminRole } from "@/components/AdminLayout";
import { getEnvio, rotuloEnvio } from "@/lib/negociacoes-envios";
import { garantirMassaDemonstracaoNegociacoes } from "@/lib/massa-demonstracao-negociacoes";
import { formatCompetencia, servidoresList } from "@/lib/mock-data";
import {
  FINALIDADES_DOCUMENTO,
  origemAuxilio,
  TIPOS_DOCUMENTO_NEGOCIACAO,
  adicionarDocumento,
  formatarCentavos,
  getNegociacao,
  getSituacaoNegociacao,
  parcelasQuitadas,
  responsavelAtual,
  type FinalidadeDocumento,
  type Negociacao,
  type TipoDocumentoNegociacao,
} from "@/lib/negociacoes";

export const Route = createFileRoute("/admin/negociacoes/$id")({
  validateSearch: (s: Record<string, unknown>): { novo?: boolean } => ({ novo: s.novo === true || s.novo === "true" ? true : undefined }),
  component: () => (
    <GuardaPerfilAdmin>
      <DetalheNegociacao />
    </GuardaPerfilAdmin>
  ),
});

const th = (dir: "left" | "right" = "left"): React.CSSProperties => ({ padding: "6px 8px", borderBottom: `1px solid ${V.border}`, fontWeight: 600, textAlign: dir, color: V.muted, fontSize: 12 });
const td = (dir: "left" | "right" = "left"): React.CSSProperties => ({ padding: "8px", borderBottom: `1px solid ${V.border}`, textAlign: dir });
const Tabela = ({ children }: { children: React.ReactNode }) => (
  <div style={{ overflowX: "auto", paddingTop: 14 }}>
    <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{children}</table>
  </div>
);

function DetalheNegociacao() {
  const { id } = Route.useParams();
  const { novo } = Route.useSearch();
  const [neg, setNeg] = useState<Negociacao | null | undefined>(undefined);
  const [abertas, setAbertas] = useState<Record<string, boolean>>({ dados: true, competencias: false, calculo: false, parcelas: true, documentos: false, historico: false });
  const alternar = (k: string) => setAbertas((a) => ({ ...a, [k]: !a[k] }));
  // Anexo posterior
  const [arq, setArq] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoDocumentoNegociacao | "">("");
  const [fin, setFin] = useState<FinalidadeDocumento | "">("");
  const [desc, setDesc] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const [quitando, setQuitando] = useState<number | null>(null);
  const [avisoQuitacao, setAvisoQuitacao] = useState("");

  useEffect(() => {
    garantirMassaDemonstracaoNegociacoes().finally(() => setNeg(getNegociacao(id) ?? null));
  }, [id]);

  if (neg === undefined) return <div className="gd" style={{ padding: 32, color: V.muted, background: V.bg, minHeight: "100%" }}>Carregando negociação…</div>;
  if (neg === null) {
    return (
      <div className="gd" style={{ padding: 32, background: V.bg, minHeight: "100%" }}>
        <div role="alert" style={{ ...cardBase, padding: 24, maxWidth: 520 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Negociação não encontrada</h1>
          <p style={{ color: V.muted, fontSize: 14 }}>O registro pode ter sido removido ao restaurar os dados de demonstração.</p>
          <Link to="/admin/negociacoes" style={{ fontWeight: 600 }}>‹ Voltar às negociações</Link>
        </div>
      </div>
    );
  }

  const n = neg;
  const totalFinal = n.parcelas.reduce((t, p) => t + p.ressarcimento.finalCents, 0);
  const pendentes = n.parcelas.filter((p) => !p.quitacao).length;
  const quitadoCents = n.parcelas.filter((p) => p.quitacao).reduce((t, p) => t + p.ressarcimento.finalCents, 0);
  const ajustesAuxilio = n.competenciasOriginais.flatMap((c) => (c.ajusteAuxilio ? [c.ajusteAuxilio] : []));
  const ajustes = n.parcelas.flatMap((p) => p.ressarcimento.ajustes);
  const dados: [string, string][] = [
    ["Servidor", n.nomeServidor],
    ["Matrícula", n.matricula],
    ["CPF", n.cpf],
    ["Associação da negociação", n.associacao !== "—" ? n.associacao : "Sem associação"],
    ["Operadora da negociação", n.operadora],
    ["Processo SEI", n.processoSEI ?? "—"],
    ["Data de formalização", formatarData(n.dataFormalizacao)],
    ["Parcelas negociadas", String(n.qtdParcelas)],
    ["Critério do parcelamento", n.criterio === "uniforme" ? "Parcelas de mesmo valor" : "Entrada diferenciada / parcelas distintas"],
    ["Cadastrada por", `${n.criadaPor} em ${formatarDataHora(n.criadaEm)}`],
    ["Observações", n.observacoes ?? "—"],
  ];
  // Dados ATUAIS do cadastro do servidor (consulta; nunca substituem o que foi registrado na negociação).
  const atual = servidoresList.find((x) => x.matricula === n.matricula);
  const atualAssoc = atual?.associacao ?? "—";
  const atualOper = atual?.operadora ?? "—";
  const vinculoDiferente = !!atual && (atualAssoc !== n.associacao || atualOper !== n.operadora);

  async function anexar() {
    if (!arq || !tipo || !fin) return setErro("Selecione o arquivo, o tipo e a finalidade do documento.");
    if (tipo === "outro" && !desc.trim()) return setErro("Descreva o documento (tipo “Outro documento”).");
    setErro("");
    setEnviando(true);
    try {
      const nova = await adicionarDocumento(n.id, { arquivo: arq, nome: arq.name, tipo, finalidade: fin, descricao: desc }, responsavelAtual(getAdminRole()));
      setNeg(nova);
      setArq(null);
      setTipo("");
      setFin("");
      setDesc("");
      setMsg("Documento anexado e registrado no histórico.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível anexar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  const tile = (rotulo: string, valor: string, sub?: string) => (
    <div className="gd-bar" style={{ ...cardBase, padding: "18px 16px 12px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: V.muted }}>{rotulo}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: V.muted }}>{sub}</div>}
    </div>
  );

  return (
    <div className="gd" style={{ padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 16, background: V.bg, minHeight: "100%" }}>
      <header>
        <Link to="/admin/negociacoes" style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>‹ Negociações</Link>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "6px 0 0" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: 0 }}>{n.nomeServidor}</h1>
          <SeloSituacao situacao={getSituacaoNegociacao(n)} />
          <span style={{ fontSize: 11, fontWeight: 600, color: V.amber, background: V.amberSoft, padding: "3px 9px", borderRadius: 999 }}>Dados demonstrativos</span>
        </div>
        <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Negociação nº {n.numero} · matrícula {n.matricula} · {n.associacao !== "—" ? `${n.associacao} · ` : ""}{n.operadora}</p>
      </header>

      {novo && (
        <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", background: V.greenSoft, color: V.green, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 600 }}>
          <Check size={16} /> Negociação cadastrada. Os valores confirmados estão congelados e o histórico foi registrado.
        </div>
      )}

      <section aria-label="Resumo" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        {tile("Total elegível", formatarCentavos(n.totalElegivelCents), "base de cálculo")}
        {tile("Ressarcimento", formatarCentavos(totalFinal), "soma das parcelas")}
        {tile("Parcelas quitadas", `${parcelasQuitadas(n)}/${n.parcelas.length}`, `${formatarCentavos(quitadoCents)} a ressarcir (aguardando relatório)`)}
        {tile("Parcelas pendentes", num(pendentes), "aguardando confirmação de quitação")}
      </section>

      <section className="rounded-xl border border-border bg-muted/30 p-4 space-y-3" aria-label="Detalhamento da negociação">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1">
          <h2 className="text-xl font-semibold">Detalhamento da negociação nº {n.numero}</h2>
          <span className="text-sm text-muted-foreground">Seis seções — expanda ou recolha cada uma.</span>
          <button type="button" onClick={() => setAbertas((a) => { const todas = Object.values(a).every(Boolean); return Object.fromEntries(Object.keys(a).map((k) => [k, !todas])) as typeof a; })} className="ml-auto text-sm font-medium text-primary hover:underline">
            {Object.values(abertas).every(Boolean) ? "Recolher todas" : "Expandir todas"}
          </button>
        </header>
      <Secao id="dados" numero={1} titulo="Dados gerais" resumo={`Cadastrada em ${formatarData(n.criadaEm)}`} aberta={abertas.dados} onAlternar={() => alternar("dados")}>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px 24px", margin: 0, paddingTop: 14 }}>
          {dados.map(([r, v]) => (
            <div key={r} style={{ minWidth: 0 }}>
              <dt style={{ fontSize: 12, color: V.muted, fontWeight: 600 }}>{r}</dt>
              <dd style={{ margin: 0, fontSize: 14, overflowWrap: "anywhere" }}>{v}</dd>
            </div>
          ))}
        </dl>
        {vinculoDiferente && (
          <div style={{ marginTop: 14 }}>
            <p role="status" style={{ fontSize: 12, color: V.amber, margin: 0 }}>Vínculo diferente do cadastro atual do servidor.</p>
            <details style={{ marginTop: 6, fontSize: 13 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: V.primary }}>Consultar dados atuais do cadastro</summary>
              <p style={{ margin: "6px 0 0", color: V.muted }}>
                Cadastro atual do servidor: associação <strong style={{ color: V.text }}>{atualAssoc !== "—" ? atualAssoc : "sem associação"}</strong> · operadora <strong style={{ color: V.text }}>{atualOper}</strong>. Consulta apenas: os dados acima são os registrados nesta negociação e não mudam com o cadastro.
              </p>
            </details>
          </div>
        )}
      </Secao>

      <Secao id="competencias" numero={2} titulo="Meses negociados" resumo={`${n.competenciasOriginais.length} mês(es) · ${formatarCentavos(n.totalElegivelCents)} elegíveis`} aberta={abertas.competencias} onAlternar={() => alternar("competencias")}>
        <Tabela>
          <thead><tr><th style={th()}>Mês negociado</th><th style={th("right")}>Valor da parcela</th><th style={th("right")}>Auxílio elegível</th><th style={th()}>Origem</th></tr></thead>
          <tbody>
            {n.competenciasOriginais.map((c) => {
              const origem = origemAuxilio(c);
              return (
                <tr key={c.competencia} className="gd-row">
                  <td style={td()}>{formatCompetencia(c.competencia)}</td>
                  <td style={td("right")}>{formatarCentavos(c.valorOriginalCents)}</td>
                  <td style={{ ...td("right"), fontWeight: 700 }}>{formatarCentavos(c.valorElegivelCents)}</td>
                  <td style={td()}>{origem === "anterior" ? <span style={{ fontSize: 11, color: V.muted }}>Informado pelo analista (cadastro anterior)</span> : <SeloOrigemValor origem={origem} />}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}><td style={td()}>Total elegível</td><td style={td("right")} /><td style={td("right")}>{formatarCentavos(n.totalElegivelCents)}</td><td style={td()} /></tr>
          </tbody>
        </Tabela>
        <p style={{ fontSize: 12, color: V.muted, margin: "10px 0 0" }}>O valor da parcela é o do plano original no mês em atraso — não a prestação do acordo. O ressarcimento usa apenas o auxílio elegível, sem juros, multas ou valores não elegíveis.</p>
      </Secao>

      <Secao id="calculo" numero={3} titulo="Cálculo do ressarcimento" resumo={`${ajustesAuxilio.length + ajustes.length} ajuste(s) manual(is)`} aberta={abertas.calculo} onAlternar={() => alternar("calculo")}>
        <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>A. Auxílio elegível</h3>
            <MemoriaAuxilioView
              formatarMes={formatCompetencia}
              percentual={n.regraAuxilio?.percentual}
              tetoCents={n.regraAuxilio?.tetoCents}
              meses={n.competenciasOriginais.map((c) => ({ competencia: c.competencia, valorParcelaCents: c.valorOriginalCents, baseCents: c.baseCalculoCents, calculadoCents: c.auxilioCalculadoCents, finalCents: c.valorElegivelCents }))}
            />
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>B. Ressarcimento da negociação</h3>
            {(() => {
              const calc = n.parcelas.map((p) => p.ressarcimento.calculadoCents);
              const todas = calc.every((c) => c !== null);
              const soma = todas ? (calc as number[]).reduce((t, c) => t + c, 0) : 0;
              const memoria = todas ? { totalElegivelCents: n.totalElegivelCents, qtdParcelas: n.qtdParcelas, valorPorParcelaCents: calc[0] as number, somaCalculadaCents: soma, residualCents: n.totalElegivelCents - soma } : null;
              return (
                <MemoriaRessarcimentoView
                  totalCents={n.totalElegivelCents}
                  qtd={n.qtdParcelas}
                  criterio={n.criterio}
                  memoria={memoria}
                  semCalculo={!todas ? (n.criterio === "uniforme" ? "Cadastro anterior ao critério de truncamento administrativo: valores preenchidos manualmente, sem cálculo automático registrado." : "Entrada diferenciada ou parcelas distintas (cadastro anterior): valores preenchidos manualmente, sem cálculo automático.") : undefined}
                  somaFinaisCents={totalFinal}
                  ajustes={n.parcelas.filter((p) => p.ressarcimento.origem === "manual").map((p) => ({ parcela: p.numero, calculadoCents: p.ressarcimento.calculadoCents, valorInformadoCents: p.ressarcimento.finalCents }))}
                />
              );
            })()}
          </div>
          {(ajustesAuxilio.length > 0 || ajustes.length > 0) && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Ajustes manuais (auditoria)</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {ajustesAuxilio.map((a) => (
                  <li key={a.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <strong>Auxílio de {formatCompetencia(a.competencia)}:</strong> calculado {formatarCentavos(a.calculadoCents)} → informado {formatarCentavos(a.valorInformadoCents)}
                    <div style={{ color: V.muted, fontSize: 12 }}>{a.responsavel} · {formatarDataHora(a.dataHora)} · Justificativa: {a.justificativa}</div>
                  </li>
                ))}
                {ajustes.map((a) => (
                  <li key={a.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <strong>Ressarcimento da parcela {a.parcela}:</strong> {a.calculadoCents !== null ? `calculado ${formatarCentavos(a.calculadoCents)} → informado ${formatarCentavos(a.valorInformadoCents)}` : `sem cálculo automático → informado ${formatarCentavos(a.valorInformadoCents)}`}
                    <div style={{ color: V.muted, fontSize: 12 }}>{a.responsavel} · {formatarDataHora(a.dataHora)} · Justificativa: {a.justificativa}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Secao>

      <Secao id="parcelas" numero={4} titulo="Parcelas e pagamentos" resumo={`${parcelasQuitadas(n)} quitada(s) · ${pendentes} pendente(s)`} aberta={abertas.parcelas} onAlternar={() => alternar("parcelas")}>
        <Tabela>
          <thead><tr><th style={th()}>Parcela</th><th style={th()}>Vencimento</th><th style={th("right")}>Valor do ressarcimento</th><th style={th()}>Situação</th><th style={th()}>Quitação</th></tr></thead>
          <tbody>
            {n.parcelas.map((p) => (
              <tr key={p.numero} className="gd-row">
                <td style={td()}>{p.numero}/{n.parcelas.length}</td>
                <td style={td()}>{formatarData(p.vencimento)}</td>
                <td style={{ ...td("right"), fontWeight: 700 }}>{formatarCentavos(p.ressarcimento.finalCents)}<MarcadorAjuste manual={p.ressarcimento.origem === "manual"} /></td>
                <td style={td()}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: p.quitacao ? V.green : V.muted, background: p.quitacao ? V.greenSoft : V.track }}>{p.quitacao ? "Quitada" : "Pendente"}</span></td>
                <td style={td()}>
                  {p.quitacao ? (
                    <span style={{ fontSize: 12, color: V.muted }}>
                      {formatarData(p.quitacao.data)} · {p.quitacao.responsavel}
                      {p.quitacao.envioId && getEnvio(p.quitacao.envioId) ? <span style={{ display: "block" }}>Relatório da associação: {rotuloEnvio(getEnvio(p.quitacao.envioId)!)}</span> : null}
                      {p.quitacao.documentoId && n.documentos.find((d) => d.id === p.quitacao!.documentoId) ? <span style={{ display: "block" }}>Origem: {n.documentos.find((d) => d.id === p.quitacao!.documentoId)!.nome}</span> : null}
                    </span>
                  ) : (
                    <button type="button" onClick={() => { setAvisoQuitacao(""); setQuitando(p.numero); }} style={{ background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center", padding: 0, whiteSpace: "nowrap" }}>
                      <Check size={13} /> Confirmar quitação
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
        {avisoQuitacao && <p role="status" style={{ fontSize: 13, fontWeight: 600, color: V.green, margin: "10px 0 0" }}>{avisoQuitacao}</p>}
        {n.parcelas.some((p) => p.valorCobradoCents !== undefined) && (
          <p style={{ fontSize: 12, color: V.muted, margin: "10px 0 0" }}>
            Informação complementar do acordo (valor cobrado por prestação, não usado no cálculo): {n.parcelas.map((p) => (p.valorCobradoCents !== undefined ? `${p.numero}ª ${formatarCentavos(p.valorCobradoCents)}` : "")).filter(Boolean).join(" · ")}.
          </p>
        )}
        <p style={{ fontSize: 12, color: V.muted, margin: "10px 0 0" }}>A quitação é confirmada manualmente pela GERDAB, parcela a parcela e em qualquer ordem; vencimento passado ou documento anexado não quitam a parcela. Somente parcelas quitadas poderão compor o relatório de ressarcimento (etapa posterior).</p>
      </Secao>

      <Secao id="documentos" numero={5} titulo="Documentos comprobatórios" resumo={`${n.documentos.length} documento(s)`} aberta={abertas.documentos} onAlternar={() => alternar("documentos")}>
        <ul style={{ listStyle: "none", margin: 0, padding: "14px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {n.documentos.map((d) => (
            <li key={d.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
              <span style={{ flex: "1 1 240px", minWidth: 0, fontSize: 13 }}>
                <strong style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{d.nome}</strong>
                <span style={{ display: "block", fontSize: 12, color: V.muted }}>{rotuloDocumento(d)}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                <span style={{ display: "block", fontSize: 12, color: V.muted }}>{d.incluidoPor} · {formatarDataHora(d.incluidoEm)} · {d.momento === "cadastro" ? "documentação inicial" : "anexado no acompanhamento"}{d.comArquivo ? "" : " · demonstração (sem arquivo)"}</span>
              </span>
              <button type="button" onClick={() => abrirDocumentoNegociacao(d)} style={{ ...botaoPrimario, height: 34, fontSize: 13, background: V.card, color: V.primary, border: `1px solid ${V.primary}` }}><Eye size={14} /> Visualizar</button>
              <button type="button" onClick={() => abrirDocumentoNegociacao(d, true)} style={{ ...botaoPrimario, height: 34, fontSize: 13, background: V.card, color: V.primary, border: `1px solid ${V.primary}` }}><Download size={14} /> Baixar</button>
            </li>
          ))}
        </ul>
        {n.associacao !== "—" && (
          <p style={{ fontSize: 12, margin: "12px 0 0" }}>
            <Link to="/admin/negociacoes/recebidos" search={{ associacao: n.associacao }} style={{ fontWeight: 600 }}>Consultar relatórios recebidos da associação ({n.associacao.toUpperCase()}) →</Link>
            <span style={{ color: V.muted }}> — referência para a conferência manual; o arquivo não confirma pagamentos.</span>
          </p>
        )}
        <div className="neg-doc-wrap" style={{ borderTop: `1px solid ${V.border}`, marginTop: 14, paddingTop: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>Adicionar documento</h3>
          <p style={{ fontSize: 12, color: V.muted, margin: "0 0 10px" }}>Finalidade documental e de auditoria — o sistema não lê nem extrai dados do arquivo.</p>
          <div className="neg-doc-grid">
            <SeletorArquivo id="neg-arquivo-detalhe" arquivo={arq} onChange={setArq} />
            <Campo rotulo="Tipo" obrigatorio>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumentoNegociacao | "")} style={inputEstilo}>
                <option value="">Selecione…</option>
                {(Object.keys(TIPOS_DOCUMENTO_NEGOCIACAO) as TipoDocumentoNegociacao[]).map((t) => <option key={t} value={t}>{TIPOS_DOCUMENTO_NEGOCIACAO[t]}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Finalidade" obrigatorio>
              <select value={fin} onChange={(e) => setFin(e.target.value as FinalidadeDocumento | "")} style={inputEstilo}>
                <option value="">Selecione…</option>
                {(Object.keys(FINALIDADES_DOCUMENTO) as FinalidadeDocumento[]).map((f) => <option key={f} value={f}>{FINALIDADES_DOCUMENTO[f]}</option>)}
              </select>
            </Campo>
            <Campo rotulo={tipo === "outro" ? "Descrição" : "Descrição (opcional)"} obrigatorio={tipo === "outro"}><input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputEstilo} /></Campo>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <AjudaArquivo id="neg-arquivo-detalhe" arquivo={arq} />
            <div><button type="button" disabled={enviando} onClick={anexar} style={{ ...botaoPrimario, opacity: enviando ? 0.7 : 1 }}>{enviando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {enviando ? "Anexando…" : "Anexar"}</button></div>
          </div>
          {erro && <p role="alert" style={{ color: V.red, fontSize: 13, margin: "8px 0 0" }}>{erro}</p>}
          {msg && !erro && <p role="status" style={{ color: V.green, fontSize: 13, margin: "8px 0 0" }}>{msg}</p>}
        </div>
      </Secao>

      <Secao id="historico" numero={6} titulo="Histórico administrativo e financeiro" resumo={`${n.historico.length} registro(s)`} aberta={abertas.historico} onAlternar={() => alternar("historico")}>
        <ol style={{ listStyle: "none", margin: 0, padding: "14px 0 0", display: "flex", flexDirection: "column", gap: 0 }}>
          {[...n.historico].reverse().map((e) => (
            <li key={e.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: `1px solid ${V.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, height: "fit-content", whiteSpace: "nowrap", color: e.tipo === "ajuste_financeiro" ? V.amber : e.tipo === "quitacao" ? V.green : V.primary, background: e.tipo === "ajuste_financeiro" ? V.amberSoft : e.tipo === "quitacao" ? V.greenSoft : V.primarySoft }}>
                {e.tipo === "cadastro" ? "Cadastro" : e.tipo === "ajuste_financeiro" ? "Valor financeiro" : e.tipo === "quitacao" ? "Quitação" : "Documento"}
              </span>
              <span style={{ minWidth: 0, fontSize: 13 }}>
                {e.descricao}
                <span style={{ display: "block", fontSize: 12, color: V.muted }}>{e.responsavel} · {formatarDataHora(e.dataHora)}</span>
              </span>
            </li>
          ))}
        </ol>
      </Secao>
      </section>
      {quitando !== null && n.parcelas.find((p) => p.numero === quitando) && (
        <ConfirmarQuitacaoModal
          negociacao={n}
          parcela={n.parcelas.find((p) => p.numero === quitando)!}
          onFechar={() => setQuitando(null)}
          onConfirmada={(nova) => {
            setNeg(nova);
            setQuitando(null);
            setAvisoQuitacao(`Quitação da parcela ${quitando} confirmada e registrada no histórico.`);
          }}
        />
      )}
    </div>
  );
}

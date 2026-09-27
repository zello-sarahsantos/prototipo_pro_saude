import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { PlanilhaStatusBadge } from "@/components/PlanilhaStatusBadge";
import { SecaoExpansivel as Secao } from "@/components/SecaoExpansivel";
import { BTN_NEGATIVO, BTN_NEUTRO, BTN_POSITIVO, BTN_PRIMARIO } from "@/lib/ui-botoes";
import { analistaReferencia, formatCompetencia, formatCurrency, gerenteReferencia } from "@/lib/mock-data";
import {
  confirmarAnaliseFinanceira,
  decidirPlanilhaAssociacao,
  garantirPlanilhaExemplo,
  getAnaliseFinanceiraVigente,
  getAssociacaoModelo,
  getColunasModelo,
  getHistoricoAnaliseFinanceira,
  listarPlanilhasAssociacao,
  statusAtualPlanilha,
  statusPlanilhaLabels,
  versaoVigente,
  type RegistroPlanilhaAssociacao,
  type VersaoPlanilhaAssociacao,
} from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/admin/planilhas/$id")({
  component: AnalisePlanilhaAssociacao,
});

/**
 * Análise da planilha mensal ordinária de uma Associação — tela ampla (substitui o modal estreito).
 *
 * **Revisão (Fase 7):** eliminado o gate duplo "Aprovar planilha → habilitar titular". A própria
 * planilha completa É a área de conferência: cada LINHA original (titular e cada
 * beneficiário/dependente) tem seu próprio checkbox — a seleção nunca é consolidada
 * antecipadamente no titular. Enquanto a conferência não é concluída, o status é só **Em
 * análise** (laranja). Uma única ação, **Confirmar análise**, registra de uma vez as linhas
 * consideradas para o Fechamento/NURFI — status passa a **Análise concluída** (valor técnico
 * interno continua `"aprovada"`, só o rótulo mudou). Não existe mais "Habilitar"/"Não habilitar"
 * por titular nem justificativa por linha — a decisão é a própria seleção, confirmada de uma vez.
 * A seleção pode ser reaberta ("Editar seleção"); cada confirmação é um evento novo na trilha
 * (histórico nunca apagado). O arquivo original (`registros`) nunca é alterado por essa decisão.
 *
 * A recusa/solicitação de correção do ARQUIVO (estrutural — planilha ilegível, fora do modelo)
 * continua disponível como ação secundária, separada da conferência financeira.
 *
 * No Fechamento (`getRegistrosAssociacaoAprovadosNaCompetencia`), os registros continuam
 * agrupados por titular — nenhum dependente vira linha financeira independente; o valor do grupo
 * é a soma só das linhas mantidas selecionadas, e `calcularReembolso` (regra de ressarcimento já
 * existente) é aplicado sobre essa soma, sem fórmula nova.
 */

const dataISO = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—");
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR");

function AnalisePlanilhaAssociacao() {
  const { id } = Route.useParams();
  const responsavel = getAdminRole() === "gerencia" ? gerenteReferencia : analistaReferencia;
  const [tick, setTick] = useState(0);
  const recarregar = () => setTick((t) => t + 1);

  // DEMONSTRAÇÃO DO PROTÓTIPO: garante as planilhas de exemplo (ver `garantirPlanilhaExemplo`); não é
  // comportamento esperado para produção.
  useEffect(() => {
    garantirPlanilhaExemplo();
    recarregar();
  }, []);

  const planilha = useMemo(() => listarPlanilhasAssociacao().find((p) => p.id === id), [id, tick]);

  const [acaoArquivo, setAcaoArquivo] = useState<"correcao" | "recusar" | null>(null);
  const [justificativaArquivo, setJustificativaArquivo] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [editando, setEditando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const [baixando, setBaixando] = useState<number | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const status = planilha ? statusAtualPlanilha(planilha) : undefined;
  const analiseVigente = planilha ? getAnaliseFinanceiraVigente(planilha) : undefined;

  // Ao trocar de planilha, ou quando ela passa a ter análise concluída pela primeira vez, entra em
  // modo leitura pré-preenchido com a última seleção; sem análise nenhuma, começa em edição vazia
  // (nada é presumido).
  useEffect(() => {
    setSelecionados(new Set(analiseVigente?.indicesConsiderados ?? []));
    setEditando(!analiseVigente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, analiseVigente?.concluidaEm]);

  if (!planilha || !status) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-4">
        <Link to="/admin/comprovantes" className={`inline-flex items-center gap-1 ${BTN_NEUTRO}`}><ArrowLeft className="h-4 w-4" /> Voltar para Planilhas</Link>
        <p className="text-sm text-muted-foreground">Planilha não encontrada.</p>
      </div>
    );
  }

  const p = planilha; // narrowing estável para os closures abaixo (TS não propaga a narrowing do guard para funções aninhadas)
  const versao = versaoVigente(p);
  const ehAssefaz = getAssociacaoModelo(p.associacao) === "Assefaz";
  const colunas = getColunasModelo(p.associacao, "ordinario");
  const encerrada = status === "correcao_solicitada" || status === "negada";
  const validos = versao.registros.map((r, i) => (r.status === "válido" ? i : -1)).filter((i) => i >= 0);
  const naoValidos = versao.registros.length - validos.length;
  const historico = getHistoricoAnaliseFinanceira(p);

  function valorPlano(r: RegistroPlanilhaAssociacao) {
    return (ehAssefaz ? r.nomePlano : r.operadora) || "—";
  }

  async function baixar(v: VersaoPlanilhaAssociacao) {
    setBaixando(v.versao);
    try {
      const [{ buildArquivoVersaoBlob }, { baixarBlob }] = await Promise.all([import("@/lib/planilha-arquivo-versao"), import("@/lib/relatorio-export")]);
      baixarBlob(await buildArquivoVersaoBlob(p, v), `pro-saude_planilha_${p.associacao}_${p.competencia}_v${v.versao}.xlsx`);
    } finally {
      setBaixando(null);
    }
  }

  function decidirArquivo(novo: "correcao_solicitada" | "negada") {
    setErro("");
    try {
      decidirPlanilhaAssociacao(p.associacao, p.competencia, { status: novo, justificativa: justificativaArquivo, decididoPor: responsavel });
      setAcaoArquivo(null);
      setJustificativaArquivo("");
      recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    }
  }

  function alternarLinha(i: number) {
    setSelecionados((atual) => {
      const n = new Set(atual);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function confirmar() {
    setErro("");
    try {
      confirmarAnaliseFinanceira(p.associacao, p.competencia, [...selecionados], responsavel);
      setConfirmando(false);
      setEditando(false);
      recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar a análise.");
      setConfirmando(false);
    }
  }

  const gruposSelecionados = new Set(validos.filter((i) => selecionados.has(i)).map((i) => versao.registros[i].cpfTitular)).size;
  const valorSelecionado = validos.filter((i) => selecionados.has(i)).reduce((t, i) => t + versao.registros[i].valor, 0);
  const naoSelecionados = validos.length - selecionados.size;

  const resumoStatus = status === "em_analise"
    ? "Em análise — aguardando conferência"
    : status === "aprovada"
      ? `Análise concluída — ${analiseVigente?.indicesConsiderados.length ?? 0} de ${validos.length} linhas consideradas`
      : `${statusPlanilhaLabels[status]}${versao.decisao ? ` por ${versao.decisao.decididoPor} em ${dataHora(versao.decisao.decididoEm)}` : ""}`;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-5">
      <Link to="/admin/comprovantes" className={`inline-flex items-center gap-1 ${BTN_NEUTRO}`}>
        <ArrowLeft className="h-4 w-4" /> Voltar para Planilhas
      </Link>

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-2xl font-bold">{planilha.associacao} — {formatCompetencia(planilha.competencia)}</h1>
        <PlanilhaStatusBadge status={status} />
        <span className="text-sm text-muted-foreground">
          Planilha mensal de pagamento · versão {versao.versao} de {planilha.versoes.length} · enviada em {dataHora(versao.enviadoEm)}
        </span>
      </header>

      {/* Conferência: a própria planilha completa é a área de conferência — sem etapa separada de "aprovar" antes. */}
      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-lg font-semibold">Planilha e conferência</p>
          <p className={`text-sm mt-0.5 ${status === "em_analise" ? "text-warning font-medium" : "text-muted-foreground"}`}>{resumoStatus}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {encerrada ? (
            <p className="text-sm rounded-md bg-muted/50 px-3 py-2" role="status">
              Esta versão foi encerrada ({statusPlanilhaLabels[status].toLowerCase()}) — a conferência financeira não está disponível. A associação já pode reenviar.
              {versao.decisao?.justificativa && <> Justificativa: {versao.decisao.justificativa}</>}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Titular e cada beneficiário/dependente têm checkbox próprio. <strong>Marcado</strong> = considerado na composição do Fechamento;{" "}
                <strong>desmarcado</strong> = não considerado. Nada é presumido — a seleção começa vazia.
              </p>
              {editando && (
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-2.5">
                  <span className="text-sm" role="status">
                    <span className="font-medium">{selecionados.size}</span> de {validos.length} linha(s) selecionada(s)
                    {selecionados.size > 0 && <> · {formatCurrency(valorSelecionado)}</>}
                  </span>
                  <button onClick={() => setSelecionados(new Set(validos))} className={BTN_NEUTRO}>Selecionar todos</button>
                  <button onClick={() => setSelecionados(new Set())} disabled={selecionados.size === 0} className={`${BTN_NEUTRO} disabled:opacity-50`}>Limpar seleção</button>
                  <button onClick={() => setConfirmando(true)} disabled={validos.length === 0} className={`${BTN_PRIMARIO} !px-4 !py-2 !text-sm ml-auto disabled:opacity-50`}>
                    Confirmar análise
                  </button>
                </div>
              )}
              {!editando && (
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-2.5">
                  <span className="text-sm">
                    Análise concluída por <strong>{analiseVigente?.responsavel}</strong> em {analiseVigente ? dataHora(analiseVigente.concluidaEm) : "—"}.
                  </span>
                  <button onClick={() => setEditando(true)} className={`${BTN_NEUTRO} ml-auto`}>Editar seleção</button>
                </div>
              )}
            </>
          )}
          {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

          <div className="overflow-auto border border-border rounded-lg max-h-[30rem]" aria-label="Planilha completa enviada pela Associação">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground sticky top-0">
                <tr>
                  {(!encerrada) && <th className="px-3 py-2 w-10" />}
                  {colunas.map((c) => (<th key={c} className={`px-3 py-2 whitespace-nowrap ${c.startsWith("Valor") ? "text-right" : "text-left"}`}>{c}</th>))}
                  <th className="text-left px-3 py-2 whitespace-nowrap">Validação (sistema)</th>
                </tr>
              </thead>
              <tbody>
                {versao.registros.map((r, i) => {
                  const valido = r.status === "válido";
                  const marcada = selecionados.has(i);
                  const podeSelecionar = valido && !encerrada && editando;
                  const considerada = valido && !editando && marcada;
                  const naoConsiderada = valido && !editando && !marcada;
                  return (
                    <tr
                      key={i}
                      className={`border-t border-border ${!valido ? "bg-warning/5" : considerada ? "bg-success/5" : naoConsiderada ? "opacity-50" : marcada ? "bg-primary/5" : ""}`}
                    >
                      {!encerrada && (
                        <td className="px-3 py-2">
                          {podeSelecionar ? (
                            <input type="checkbox" checked={marcada} onChange={() => alternarLinha(i)} aria-label={`Selecionar linha ${r.beneficiario || r.servidor}`} className="h-4 w-4" />
                          ) : valido ? (
                            <span className={`text-xs font-medium ${considerada ? "text-success" : "text-muted-foreground"}`} title={considerada ? "Considerada" : "Não considerada"}>
                              {considerada ? "✓" : "—"}
                            </span>
                          ) : null}
                        </td>
                      )}
                      <td className="px-3 py-2 whitespace-nowrap">{r.servidor}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.cpfTitular}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.beneficiario || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.cpf || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.vinculo}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(r.valor)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{valorPlano(r)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{dataISO(r.dataPagamento)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={r.status === "válido" ? "" : "font-medium text-warning"}>{r.status === "válido" ? "Válido" : r.status === "atenção" ? "Atenção" : "Não elegível"}</span>
                        {r.motivo && <span className="text-xs text-muted-foreground"> — {r.motivo}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            A coluna "Validação (sistema)" é resultado da conferência automática e não faz parte do arquivo da Associação — o arquivo original nunca é
            alterado pela decisão da GERDAB. {naoValidos > 0 && `${naoValidos} linha(s) com pendência de validação não podem ser selecionadas.`} Protótipo:
            o download é uma reconstrução dos registros normalizados da versão; em produção entrega o XLSX efetivamente enviado e armazenado.
          </p>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => baixar(versao)} disabled={baixando !== null} className={`inline-flex items-center gap-1.5 ${BTN_NEUTRO} disabled:opacity-50`}>
              {baixando === versao.versao ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Baixar planilha original
            </button>
            {status === "em_analise" && !acaoArquivo && (
              <>
                <button onClick={() => setAcaoArquivo("recusar")} className={BTN_NEGATIVO}>Recusar arquivo</button>
                <button onClick={() => setAcaoArquivo("correcao")} className={`${BTN_NEUTRO} !px-4 !py-2 !text-sm`}>Solicitar correção do arquivo</button>
              </>
            )}
          </div>
          {acaoArquivo && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm text-muted-foreground">Motivo estrutural (arquivo ilegível, fora do modelo etc.) — separado da conferência financeira.</p>
              <textarea
                value={justificativaArquivo}
                onChange={(e) => setJustificativaArquivo(e.target.value)}
                rows={2}
                placeholder={acaoArquivo === "correcao" ? "Descreva o que precisa ser corrigido na planilha…" : "Descreva o motivo da recusa…"}
                className="w-full border border-border rounded-md px-3 py-2 text-base bg-background"
              />
              <div className="flex gap-2">
                <button
                  disabled={!justificativaArquivo.trim()}
                  onClick={() => decidirArquivo(acaoArquivo === "correcao" ? "correcao_solicitada" : "negada")}
                  className={`${acaoArquivo === "recusar" ? BTN_NEGATIVO : BTN_NEUTRO} disabled:opacity-50`}
                >
                  {acaoArquivo === "correcao" ? "Confirmar solicitação de correção" : "Confirmar recusa"}
                </button>
                <button onClick={() => { setAcaoArquivo(null); setJustificativaArquivo(""); }} className={BTN_NEUTRO}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Histórico */}
      <Secao id="historico" numero={2} titulo="Histórico" resumo={`${planilha.versoes.length} versão(ões) enviada(s) · ${historico.length} análise(s) confirmada(s)`} aberta={historicoAberto} onAlternar={() => setHistoricoAberto((v) => !v)}>
        {historico.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1.5">Confirmações da conferência financeira (versão vigente)</p>
            <ul className="space-y-1 text-sm">
              {historico.map((h, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-foreground">{h.indicesConsiderados.length} linha(s) consideradas</span> — {h.responsavel}, {dataHora(h.concluidaEm)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-sm font-medium mb-1.5">Versões enviadas</p>
          <ul className="space-y-2 text-sm">
            {planilha.versoes.map((v) => (
              <li key={v.versao} className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-border rounded-md px-4 py-2.5">
                <span className="font-medium">Versão {v.versao} — enviada em {dataHora(v.enviadoEm)}</span>
                <span className="text-muted-foreground">
                  {v.decisao ? `${statusPlanilhaLabels[v.decisao.status]} por ${v.decisao.decididoPor} em ${dataHora(v.decisao.decididoEm)}${v.decisao.justificativa ? ` — "${v.decisao.justificativa}"` : ""}` : "Em análise — sem decisão"}
                </span>
                <button onClick={() => baixar(v)} disabled={baixando !== null} className={`ml-auto ${BTN_NEUTRO} disabled:opacity-50`}>Baixar planilha original</button>
              </li>
            ))}
          </ul>
        </div>
      </Secao>

      {confirmando && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar-analise">
          <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full p-6 space-y-4">
            <h2 id="titulo-confirmar-analise" className="text-lg font-semibold">Confirmar análise?</h2>
            <ul className="text-sm space-y-1">
              <li><strong>{selecionados.size}</strong> registro(s)/beneficiário(s) selecionado(s).</li>
              <li><strong>{naoSelecionados}</strong> registro(s) não selecionado(s).</li>
              <li><strong>{gruposSelecionados}</strong> titular(es)/grupo(s) familiar(es) afetado(s).</li>
              <li>Valor total considerado: <strong>{formatCurrency(valorSelecionado)}</strong>.</li>
            </ul>
            <p className="text-sm text-muted-foreground">Os registros selecionados serão utilizados na composição do Fechamento de Pagamento.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmando(false)} className="text-sm font-medium border border-border rounded-md px-4 py-2 hover:bg-muted">Cancelar</button>
              <button onClick={confirmar} className="text-sm font-medium bg-primary text-primary-foreground rounded-md px-4 py-2">Confirmar análise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

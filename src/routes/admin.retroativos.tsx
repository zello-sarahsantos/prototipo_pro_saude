import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronDown, ExternalLink, Search } from "lucide-react";
import { BTN_NEGATIVO, BTN_NEUTRO, BTN_POSITIVO, BTN_PRIMARIO } from "@/lib/ui-botoes";
import { SecaoExpansivel as Secao } from "@/components/SecaoExpansivel";
import { getAdminRole } from "@/components/AdminLayout";
import { RetroativosNav } from "@/components/RetroativosNav";
import { analistaReferencia, formatCompetencia, formatCurrency, gerenteReferencia } from "@/lib/mock-data";
import { garantirMassaDemonstracaoRetroativos } from "@/lib/massa-demonstracao";
import { getMatriculaPorCpf } from "@/lib/base-institucional";
import { getAssociacaoModelo, ROTULO_PLANO_POR_ASSOCIACAO } from "@/lib/planilhas-associacao";
import { getLinhasDoRegistro, getPlanilhaOriginal, getResumoPlanilha, obterArquivoPlanilhaOriginal } from "@/lib/planilha-retroativa";
import { PlanilhaCompleta, TabelaPlanilhaRetroativa } from "@/components/PlanilhaRetroativaVisao";
import {
  ROTULO_STATUS,
  abrirDocumentoRetroativo,
  getCiclosCompetencia,
  getNotificacoesRetroativo,
  getResumoApuracao,
  getSituacaoComplementacao,
  getStatusRetroativo,
  salvarApuracao,
  getUltimaAtualizacao,
  marcarNotificacoesLidas,
  solicitarComplementacao,
  type StatusRetroativo,
} from "@/lib/retroativo-fluxo";
import {
  MOTIVOS_RESSARCIMENTO,
  TIPOS_DOCUMENTO_RETROATIVO,
  aprovarCompetencia,
  calcularValorRessarcir,
  complementarObservacao,
  corrigirMesAnoPagamento,
  desabilitarRegistroRetroativo,
  gerarObservacao,
  getEstadoCompetencia,
  getPendenciasAutorizacao,
  getSituacaoApuracao,
  getSolicitacoesRetroativas,
  marcarContrachequeConferido,
  negarCompetencia,
  habilitarRegistroRetroativo,
  registrarValorPago,
  validarValorDevido,
  type CompetenciaRetroativa,
  type SolicitacaoRetroativa,
} from "@/lib/ressarcimento-retroativo";

export const Route = createFileRoute("/admin/retroativos")({
  component: AnaliseRetroativos,
});

/**
 * Análise da GERDAB — Ressarcimento Retroativo. Arquitetura: **Fila mensal → detalhe da solicitação →
 * detalhe da competência** (divulgação progressiva: situação, depois análise, depois histórico),
 * separada da **Consolidação NURFI** e do **Histórico de consolidações** (`RetroativosNav`).
 *
 * UI: lista/tabela de trabalho, cor só para exceções que exigem atenção (complementação recebida,
 * divergência, pendência cadastral); um status principal por linha. Rótulo "Não autorizada" na
 * interface; a regra interna continua `negado`/`desabilitado`.
 *
 * Complementação documental = PROPOSTA a validar com a GERDAB (ver `retroativo-fluxo.ts`): pedido por
 * competência, resposta dentro da solicitação original, indicador "Atualizada" na fila. Uma competência
 * pendente não bloqueia as demais nem é negada automaticamente.
 *
 * Regras de apuração/autorização (Fase 3) inalteradas: Valor Pago e Devido pela GERDAB, contracheque
 * conferido obrigatório, um gate por origem (individual: aprovar/não autorizar; associação:
 * habilitar/desabilitar).
 */

type Filtro = "todos" | "em_analise" | "aguardando" | "atualizadas" | "autorizadas";

const PLURAL: Record<StatusRetroativo, [string, string]> = {
  autorizada: ["autorizada", "autorizadas"],
  em_analise: ["em análise", "em análise"],
  aguardando_complementacao: ["aguardando complementação", "aguardando complementação"],
  complementacao_recebida: ["complementação recebida", "complementações recebidas"],
  nao_autorizada: ["não autorizada", "não autorizadas"],
};
const ORDEM: StatusRetroativo[] = ["complementacao_recebida", "em_analise", "aguardando_complementacao", "autorizada", "nao_autorizada"];

function resumoSituacao(s: SolicitacaoRetroativa): string {
  const contagem = new Map<StatusRetroativo, number>();
  s.competencias.forEach((c) => {
    const st = getStatusRetroativo(s.origem, c);
    contagem.set(st, (contagem.get(st) ?? 0) + 1);
  });
  return ORDEM.filter((st) => contagem.has(st))
    .map((st) => `${contagem.get(st)} ${PLURAL[st][contagem.get(st) === 1 ? 0 : 1]}`)
    .join(" · ");
}

const dataISO = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—");
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR");
const dinheiro = (v: number | undefined) => (v === undefined ? "—" : formatCurrency(v));
const origemRotulo = (s: SolicitacaoRetroativa) => (s.origem === "individual" ? "Servidor" : (s.associacao ?? "Associação"));

function AnaliseRetroativos() {
  const isGerencia = getAdminRole() === "gerencia";
  const responsavel = isGerencia ? gerenteReferencia : analistaReferencia;

  const [versao, setVersao] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [solId, setSolId] = useState<string | null>(null);

  // DEMONSTRAÇÃO DO PROTÓTIPO: a semeadura automática abaixo é apenas um recurso para visualizar os
  // estados da tela (ver `massa-demonstracao.ts`). NÃO é comportamento funcional esperado para
  // produção — lá a lista vem exclusivamente das solicitações reais (Portal do Servidor e planilhas
  // das Associações), sem nenhuma carga automática.
  useEffect(() => {
    garantirMassaDemonstracaoRetroativos();
    setVersao((v) => v + 1);
  }, []);

  const solicitacoes = useMemo(() => getSolicitacoesRetroativas(), [versao]);
  const naoLidas = useMemo(() => getNotificacoesRetroativo("gerdab", true), [versao]);
  const recarregar = () => setVersao((v) => v + 1);

  const comAtualizacao = (s: SolicitacaoRetroativa) => naoLidas.some((n) => n.solicitacaoId === s.id);
  const statusDe = (s: SolicitacaoRetroativa) => s.competencias.map((c) => getStatusRetroativo(s.origem, c));
  const passaFiltro = (s: SolicitacaoRetroativa) => {
    const st = statusDe(s);
    if (filtro === "em_analise") return st.some((x) => x === "em_analise" || x === "complementacao_recebida");
    if (filtro === "aguardando") return st.includes("aguardando_complementacao");
    if (filtro === "atualizadas") return comAtualizacao(s);
    if (filtro === "autorizadas") return st.includes("autorizada");
    return true;
  };

  const linhas = solicitacoes
    .filter((s) => {
      const alvo = busca.trim().toLowerCase();
      return !alvo || s.nomeTitular.toLowerCase().includes(alvo) || s.cpfTitular.toLowerCase().includes(alvo);
    })
    .filter(passaFiltro)
    // Prioriza as que voltaram do servidor; depois a atualização mais recente.
    .sort((a, b) => Number(comAtualizacao(b)) - Number(comAtualizacao(a)) || getUltimaAtualizacao(b).localeCompare(getUltimaAtualizacao(a)));

  const selecionada = solId ? solicitacoes.find((s) => s.id === solId) : undefined;
  const nAtualizadas = solicitacoes.filter(comAtualizacao).length;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Ressarcimento Retroativo</h1>
        <p className="text-sm text-muted-foreground">Fila de análise por competência — cada competência é decidida individualmente.</p>
      </header>
      <RetroativosNav ativa="fila" />

      {selecionada ? (
        <SolicitacaoView s={selecionada} responsavel={responsavel} onVoltar={() => setSolId(null)} onMudou={recarregar} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {(
                [
                  ["todos", "Todas"],
                  ["em_analise", "Em análise"],
                  ["aguardando", "Aguardando complementação"],
                  ["atualizadas", `Com atualização${nAtualizadas ? ` (${nAtualizadas})` : ""}`],
                  ["autorizadas", "Autorizadas"],
                ] as [Filtro, string][]
              ).map(([k, rotulo]) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${filtro === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou CPF" className="border border-border rounded-md pl-8 pr-3 py-2 bg-background text-sm" />
            </div>
          </div>

          {nAtualizadas > 0 && (
            <p className="text-sm" role="status">
              <span className="font-medium">{nAtualizadas} solicitação(ões) com atualização</span>
              <span className="text-muted-foreground"> — respostas de servidores que voltaram para a sua fila.</span>
            </p>
          )}

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Titular</th>
                  <th className="text-left px-4 py-2">Origem</th>
                  <th className="text-right px-4 py-2">Competências</th>
                  <th className="text-left px-4 py-2">Situação da solicitação</th>
                  <th className="text-left px-4 py-2">Última atualização</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">
                      {s.nomeTitular}
                      {comAtualizacao(s) && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-warning">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> Atualizada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{origemRotulo(s)}</td>
                    <td className="px-4 py-2.5 text-right">{s.competencias.length}</td>
                    <td className="px-4 py-2.5">{resumoSituacao(s)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{dataCurta(getUltimaAtualizacao(s))}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setSolId(s.id)} className={BTN_PRIMARIO}>
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma solicitação para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Detalhe da solicitação ───────────────────────────────────────────────────────────────── */

function SolicitacaoView({ s, responsavel, onVoltar, onMudou }: { s: SolicitacaoRetroativa; responsavel: string; onVoltar: () => void; onMudou: () => void }) {
  const [compRef, setCompRef] = useState<string | null>(null);
  const matricula = getMatriculaPorCpf(s.cpfTitular);
  const c = compRef ? s.competencias.find((x) => x.competenciaReferencia === compRef) : undefined;

  function abrir(ref: string) {
    setCompRef(ref);
    // Abrir a competência trata a novidade (indicador "lido"); NÃO altera a situação da competência nem a trilha.
    marcarNotificacoesLidas("gerdab", s.id, ref);
    onMudou();
  }

  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className={`inline-flex items-center gap-1 ${BTN_NEUTRO}`}>
        <ArrowLeft className="h-4 w-4" /> Voltar à fila
      </button>

      <section className="bg-card rounded-xl border border-border p-5 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold">{s.nomeTitular}</h2>
          <span className="text-xs text-muted-foreground">CPF {s.cpfTitular}</span>
          {matricula ? (
            <span className="text-xs text-muted-foreground">Matrícula {matricula}</span>
          ) : (
            <span className="text-xs font-medium text-warning" role="status">
              Matrícula não localizada — requer conferência cadastral (não entra na consolidação do NURFI)
            </span>
          )}
          <span className="text-xs text-muted-foreground">Origem: {origemRotulo(s)}</span>
        </div>
        {s.motivo ? (
          <>
            <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {MOTIVOS_RESSARCIMENTO[s.motivo] ?? s.motivo} <span className="text-muted-foreground">· Enviada em</span> {dataCurta(s.criadaEm)}</p>
            <p className="text-sm"><span className="text-muted-foreground">Justificativa:</span> {s.justificativa}</p>
          </>
        ) : (
          <p className="text-sm"><span className="text-muted-foreground">Enviada em</span> {dataCurta(s.criadaEm)}</p>
        )}
        {s.autorizacaoExcepcional && (
          <p className="text-sm"><span className="text-muted-foreground">Autorização excepcional:</span> {s.autorizacaoExcepcional.instancia} — {s.autorizacaoExcepcional.referenciaDocumento}</p>
        )}
      </section>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Competência</th>
              <th className="text-left px-4 py-2">Documentos</th>
              <th className="text-right px-4 py-2">Valor a Ressarcir</th>
              <th className="text-left px-4 py-2">Situação</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {s.competencias.map((x) => {
              const st = getStatusRetroativo(s.origem, x);
              const precisaAcao = st === "em_analise" || st === "complementacao_recebida";
              const diverge = getSituacaoApuracao(x) === "divergente";
              return (
                <tr key={x.competenciaReferencia} className={`border-t border-border ${compRef === x.competenciaReferencia ? "bg-muted/40" : ""}`}>
                  <td className="px-4 py-2.5 font-medium">{formatCompetencia(x.competenciaReferencia)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.origem === "associacao" ? "Planilha da associação" : `${x.documentos.length} documento${x.documentos.length === 1 ? "" : "s"}`}
                  </td>
                  <td className="px-4 py-2.5 text-right">{dinheiro(calcularValorRessarcir(x))}</td>
                  <td className="px-4 py-2.5">
                    {/* Um status principal por linha; cor só para o que exige atenção. */}
                    <span className={st === "complementacao_recebida" ? "font-medium text-warning" : ""}>{ROTULO_STATUS[st]}</span>
                    {diverge && <span className="ml-2 text-xs font-medium text-warning">· Divergência de apuração</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => abrir(x.competenciaReferencia)}
                      className={precisaAcao ? BTN_PRIMARIO : BTN_NEUTRO}
                    >
                      {precisaAcao ? "Analisar" : "Visualizar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {c && <CompetenciaView key={c.competenciaReferencia} s={s} c={c} responsavel={responsavel} onMudou={onMudou} onFechar={() => setCompRef(null)} />}
    </div>
  );
}

/* ── Detalhe da competência ───────────────────────────────────────────────────────────────── */

function CompetenciaView({ s, c, responsavel, onMudou, onFechar }: { s: SolicitacaoRetroativa; c: CompetenciaRetroativa; responsavel: string; onMudou: () => void; onFechar: () => void }) {
  const estado = getEstadoCompetencia(s.origem, c);
  const status = getStatusRetroativo(s.origem, c);
  const situacao = getSituacaoApuracao(c);
  const ressarcirSalvo = calcularValorRessarcir(c);
  const individual = s.origem === "individual";
  const decidida = individual && (estado === "aprovado" || estado === "negado");
  const ciclos = getCiclosCompetencia(s, c);
  const compl = c.complementacoes ?? [];
  const ultimaRecebida = [...compl].reverse().find((e) => e.tipo === "recebida");
  const pedidoPendente = getSituacaoComplementacao(c) === "aguardando" ? [...compl].reverse().find((e) => e.tipo === "solicitada") : undefined;
  const resumo = getResumoApuracao(c);
  const salvo = c.valorPagoContracheque !== undefined || c.valorDevidoValidado || c.contrachequeConferido;

  const [pago, setPago] = useState(c.valorPagoContracheque?.toString() ?? "");
  const [devido, setDevido] = useState(c.valorDevido?.toString() ?? "");
  const [conferido, setConferido] = useState(false);
  const [editando, setEditando] = useState(!salvo);
  const [complemento, setComplemento] = useState(c.observacaoComplemento ?? "");
  const [novoMesAno, setNovoMesAno] = useState(c.mesAnoPagamento);
  const [justMesAno, setJustMesAno] = useState("");
  const [corrigindoMesAno, setCorrigindoMesAno] = useState(false);
  const [justDecisao, setJustDecisao] = useState("");
  const [pedindoJust, setPedindoJust] = useState(false);
  const [pedindoCompl, setPedindoCompl] = useState(false);
  const [textoCompl, setTextoCompl] = useState("");
  const [verPlanilha, setVerPlanilha] = useState(false);
  const [erro, setErro] = useState("");
  // Seções expansíveis: só "Comprovação recebida" abre por padrão. O conteúdo permanece montado (apenas oculto)
  // ao recolher, então valores digitados e o estado da análise não se perdem.
  const [abertas, setAbertas] = useState<Record<SecaoId, boolean>>({ comprovacao: true, apuracao: false, observacao: false, decisao: false, historico: false });
  const alternar = (id: SecaoId) => setAbertas((a) => ({ ...a, [id]: !a[id] }));

  function executar(acao: () => void) {
    setErro("");
    try {
      acao();
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    }
  }

  const numero = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
  const pagoN = numero(pago);
  const devidoN = numero(devido);
  const editavel = !decidida; // associação "não habilitada" ainda pode ter a apuração revista antes de habilitar
  const alterou = (!Number.isNaN(pagoN) && pagoN !== c.valorPagoContracheque) || (!Number.isNaN(devidoN) && (devidoN !== c.valorDevido || !c.valorDevidoValidado)) || (conferido && !c.contrachequeConferido);
  // Resultado ao vivo enquanto preenche; depois de salvo vale o cálculo do motor.
  const ressarcirAoVivo = !Number.isNaN(pagoN) && !Number.isNaN(devidoN) && pagoN <= devidoN ? Math.round((devidoN - pagoN) * 100) / 100 : undefined;
  const divergenteAoVivo = !Number.isNaN(pagoN) && !Number.isNaN(devidoN) && pagoN > devidoN;
  const resultado = editando ? ressarcirAoVivo : ressarcirSalvo;
  const divergente = editando ? divergenteAoVivo : situacao === "divergente";

  // Lista curta do que falta para autorizar (a partir do que já foi salvo).
  const faltam: string[] = [];
  if (c.valorPagoContracheque === undefined) faltam.push("Valor Pago");
  if (!c.valorDevidoValidado) faltam.push("Valor Devido");
  if (situacao === "divergente") faltam.push("Corrigir a divergência");
  if (!c.contrachequeConferido) faltam.push("Conferência do contracheque");
  const aprovarHabilitado = getPendenciasAutorizacao(c).length === 0;
  const trilha = [...c.apuracao, ...c.decisoes, ...compl].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const podePedirCompl = individual && estado === "aguardando_analise" && !pedidoPendente;
  const planilha = !individual ? getPlanilhaOriginal(s.arquivoId) : undefined;
  const resumoPlanilha = s.arquivoId ? getResumoPlanilha(s.arquivoId) : undefined;
  const rotuloPlano = ROTULO_PLANO_POR_ASSOCIACAO[getAssociacaoModelo(s.associacao ?? "") ?? "Assetran"];
  const assocMaiusc = (s.associacao ?? "Associação").toUpperCase();

  // PROTÓTIPO: a ação "Baixar planilha original" é uma simulação navegável (arquivo enviado quando guardado, ou
  // reconstrução dos registros normalizados). No desenvolvimento real, deve disponibilizar o XLSX efetivamente
  // enviado pela Associação e armazenado.
  async function baixarOriginal() {
    if (!s.arquivoId) return;
    const arq = await obterArquivoPlanilhaOriginal(s.arquivoId);
    if (!arq) return;
    const { baixarBlob } = await import("@/lib/relatorio-export");
    baixarBlob(arq.blob, arq.nome);
  }

  // Resumos de cada seção (leitura rápida sem abrir).
  const resumoComprovacao = individual
    ? `${c.documentos.length} documento${c.documentos.length === 1 ? "" : "s"} apresentado${c.documentos.length === 1 ? "" : "s"}${pedidoPendente ? " · complementação solicitada" : ""}`
    : `${assocMaiusc} — planilha retroativa${planilha ? ` · ${planilha.nome}` : ""}`;
  const resumoApuracao = divergente
    ? "Divergência na apuração"
    : salvo
      ? `Valor Pago ${dinheiro(c.valorPagoContracheque)} · Valor Devido ${c.valorDevidoValidado ? dinheiro(c.valorDevido) : "pendente"}${ressarcirSalvo !== undefined ? ` · Ressarcir ${dinheiro(ressarcirSalvo)}` : ""}`
      : "Apuração ainda não preenchida";
  const resumoObservacao = c.observacaoComplemento ? "Texto do sistema + complemento da GERDAB" : "Texto gerado pelo sistema";
  const resumoDecisao = individual
    ? decidida
      ? estado === "aprovado" ? "Competência autorizada" : "Competência não autorizada"
      : faltam.length > 0
        ? `${faltam.length} pendência${faltam.length === 1 ? "" : "s"} ${faltam.length === 1 ? "impede" : "impedem"} a autorização`
        : "Apta para decisão"
    : estado === "habilitado"
      ? "Habilitado para ressarcimento"
      : estado === "desabilitado"
        ? "Não habilitado"
        : faltam.length > 0
          ? `Em análise · ${faltam.length} pendência${faltam.length === 1 ? "" : "s"} ${faltam.length === 1 ? "impede" : "impedem"} a habilitação`
          : "Em análise · apta para decisão";
  const resumoHistorico = `${trilha.length} evento${trilha.length === 1 ? "" : "s"} registrado${trilha.length === 1 ? "" : "s"}`;
  const linhasDoTitular = getLinhasDoRegistro(s, c);

  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4 space-y-3" aria-label={`Análise de ${formatCompetencia(c.competenciaReferencia)}`}>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1">
        <h3 className="text-xl font-semibold">{formatCompetencia(c.competenciaReferencia)}</h3>
        <span className={`text-base ${status === "complementacao_recebida" ? "font-medium text-warning" : "text-muted-foreground"}`}>
          {ROTULO_STATUS[status]}{status === "complementacao_recebida" ? " — requer nova análise" : ""}
        </span>
        <span className="text-sm text-muted-foreground">
          Ciclos — apresentação {ciclos.apresentacao}{ciclos.analise ? ` · análise ${ciclos.analise}` : ""}{ciclos.aptidao ? ` · apta em ${ciclos.aptidao}` : ""}
        </span>
        <button onClick={onFechar} className={`ml-auto ${BTN_NEUTRO}`}>Fechar</button>
      </header>

      {/* 1 — Comprovação recebida */}
      <Secao id="comprovacao" numero={1} titulo="Comprovação recebida" resumo={resumoComprovacao} aberta={abertas.comprovacao} onAlternar={() => alternar("comprovacao")}>
        {individual ? (
          <>
            {c.documentos.length === 0 ? (
              <p className="text-base text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg bg-card">
                {c.documentos.map((d, i) => {
                  const novo = status === "complementacao_recebida" && d.origem === "complementar" && ultimaRecebida?.documentos?.includes(d.nome);
                  return (
                    <li key={`${d.nome}-${i}`} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="text-base font-medium">{d.nome}{novo && <span className="ml-2 text-xs font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5 align-middle">Novo</span>}</p>
                        <p className="text-sm text-muted-foreground">
                          {TIPOS_DOCUMENTO_RETROATIVO[d.tipo]}{d.tipo === "outro" && d.descricao ? ` (${d.descricao})` : ""} · {d.origem === "complementar" ? "Complementar" : "Original"}
                          {d.origem === "complementar" && d.anexadoEm ? ` · ${d.anexadoPor ?? ""} · ${dataHora(d.anexadoEm)}` : ""}
                        </p>
                      </div>
                      <button onClick={() => abrirDocumentoRetroativo(d)} className={`ml-auto inline-flex items-center gap-1 ${BTN_NEUTRO}`}>
                        <ExternalLink className="h-3.5 w-3.5" /> Visualizar documento
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Complementação documental (proposta em validação) — ação secundária dentro desta seção */}
            {pedidoPendente && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-0.5">
                <p className="text-base font-medium">Complementação solicitada</p>
                <p className="text-base">{pedidoPendente.texto}</p>
                <p className="text-sm text-muted-foreground">Aguardando resposta do servidor · solicitada em {dataHora(pedidoPendente.dataHora)} por {pedidoPendente.responsavel}.</p>
              </div>
            )}
            {compl.length > 0 && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">Trilha da complementação ({compl.length}) <span className="font-normal">— proposta em validação</span></summary>
                <ol className="mt-1 space-y-0.5">
                  {compl.map((e) => (
                    <li key={e.id}>{dataHora(e.dataHora)} — {e.tipo === "solicitada" ? `GERDAB (${e.responsavel}) solicitou: “${e.texto}”` : `Servidor (${e.responsavel}) respondeu com ${e.documentos?.join(", ")}`}</li>
                  ))}
                </ol>
              </details>
            )}
            {podePedirCompl && !pedindoCompl && <button onClick={() => setPedindoCompl(true)} className={BTN_NEUTRO}>Solicitar complementação documental</button>}
            {pedindoCompl && (
              <div className="space-y-2">
                <textarea
                  value={textoCompl}
                  onChange={(e) => setTextoCompl(e.target.value)}
                  rows={2}
                  placeholder={`O que precisa ser enviado? Ex.: Anexar comprovante de pagamento referente à competência ${formatCompetencia(c.competenciaReferencia)}.`}
                  className="w-full border border-border rounded-md px-3 py-2 text-base bg-background"
                />
                <div className="flex gap-2">
                  <button disabled={!textoCompl.trim()} onClick={() => executar(() => { solicitarComplementacao(s.id, c.competenciaReferencia, textoCompl, responsavel); setPedindoCompl(false); setTextoCompl(""); })} className={`${BTN_PRIMARIO} disabled:opacity-50`}>Confirmar complementação</button>
                  <button onClick={() => setPedindoCompl(false)} className={BTN_NEUTRO}>Cancelar</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div>
                <p className="text-lg font-semibold">{assocMaiusc} — Planilha Retroativa</p>
                <p className="text-base">{planilha?.nome ?? "Arquivo não identificado"}</p>
                <p className="text-sm text-muted-foreground">Planilha completa que originou este registro.</p>
                <p className="text-sm text-muted-foreground">
                  Enviada em {dataCurta(planilha?.enviadoEm ?? s.criadaEm)}
                  {resumoPlanilha ? ` · ${resumoPlanilha.titulares} titular${resumoPlanilha.titulares === 1 ? "" : "es"} · ${resumoPlanilha.competencias} competência${resumoPlanilha.competencias === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.arquivoId && <button onClick={() => setVerPlanilha((v) => !v)} aria-expanded={verPlanilha} className={BTN_NEUTRO}>{verPlanilha ? "Ocultar planilha" : "Visualizar planilha"}</button>}
                {s.arquivoId && <button onClick={baixarOriginal} className={BTN_NEUTRO}>Baixar planilha original</button>}
              </div>
              {verPlanilha && s.arquivoId && <PlanilhaCompleta arquivoId={s.arquivoId} associacao={s.associacao ?? ""} destaque={{ cpfTitular: s.cpfTitular, competenciaReferencia: c.competenciaReferencia }} />}
              <p className="text-xs text-muted-foreground">Protótipo: a visualização e o download são simulados a partir dos registros normalizados; em produção usam o XLSX efetivamente enviado e armazenado.</p>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold">Dados deste titular nesta planilha</p>
              <p className="text-sm text-muted-foreground">Somente {s.nomeTitular} — {formatCompetencia(c.competenciaReferencia)}.</p>
              <TabelaPlanilhaRetroativa linhas={linhasDoTitular} associacao={s.associacao ?? ""} altura="max-h-60" />
            </div>
          </>
        )}
      </Secao>

      {/* 2 — Apuração financeira: um único bloco (preencher e salvar) */}
      <Secao id="apuracao" numero={2} titulo="Apuração financeira" resumo={resumoApuracao} alerta={divergente} aberta={abertas.apuracao} onAlternar={() => alternar("apuracao")}>
        <div className="text-base">
          <span className="text-muted-foreground">Mês/Ano de Pagamento:</span> <span className="font-medium">{formatCompetencia(c.mesAnoPagamento)}</span>{" "}
          <span className="text-sm text-muted-foreground">(derivado pelo sistema)</span>
          {editavel && !corrigindoMesAno && <button onClick={() => setCorrigindoMesAno(true)} className={`ml-2 ${BTN_NEUTRO}`}>Corrigir</button>}
        </div>
        {corrigindoMesAno && (
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex gap-2">
              <input type="month" value={novoMesAno} onChange={(e) => setNovoMesAno(e.target.value)} className="border border-border rounded-md px-2 py-1.5 text-sm bg-background" />
              <input value={justMesAno} onChange={(e) => setJustMesAno(e.target.value)} placeholder="Justificativa da correção" className="flex-1 border border-border rounded-md px-2 py-1.5 text-sm bg-background" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => executar(() => { corrigirMesAnoPagamento(s.id, c.competenciaReferencia, novoMesAno, justMesAno, responsavel); setCorrigindoMesAno(false); setJustMesAno(""); })} className={BTN_PRIMARIO}>Confirmar correção</button>
              <button onClick={() => setCorrigindoMesAno(false)} className={BTN_NEUTRO}>Cancelar</button>
            </div>
          </div>
        )}

        {editando ? (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label>
                <span className="block text-sm text-muted-foreground mb-1">Valor Pago no contracheque</span>
                <input type="number" step="0.01" min="0" value={pago} onChange={(e) => setPago(e.target.value)} placeholder="R$ 0,00" aria-label="Valor Pago no contracheque" className="w-full border border-border rounded-md px-3 py-2 text-base bg-background" />
              </label>
              <label>
                <span className="block text-sm text-muted-foreground mb-1">Valor Devido na competência</span>
                <input type="number" step="0.01" min="0" value={devido} onChange={(e) => setDevido(e.target.value)} placeholder="R$ 0,00" aria-label="Valor Devido na competência" className="w-full border border-border rounded-md px-3 py-2 text-base bg-background" />
              </label>
            </div>
            {c.contrachequeConferido ? (
              <p className="text-base">✓ Contracheque conferido em {resumo.conferidoEm ? dataCurta(resumo.conferidoEm) : "—"} por {resumo.conferidoPor}</p>
            ) : (
              <label className="flex items-start gap-2 text-base">
                <input type="checkbox" checked={conferido} onChange={(e) => setConferido(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>Contracheque conferido na fonte oficial<span className="block text-sm text-muted-foreground">Obrigatório para autorizar o ressarcimento.</span></span>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={!alterou} onClick={() => executar(() => { salvarApuracao(s.id, c.competenciaReferencia, { pago: Number.isNaN(pagoN) ? undefined : pagoN, devido: Number.isNaN(devidoN) ? undefined : devidoN, contrachequeConferido: conferido }, responsavel); setEditando(false); setConferido(false); })} className={`${BTN_PRIMARIO} disabled:opacity-50 disabled:cursor-not-allowed`}>Salvar apuração</button>
              {salvo && <button onClick={() => { setEditando(false); setPago(c.valorPagoContracheque?.toString() ?? ""); setDevido(c.valorDevido?.toString() ?? ""); setConferido(false); }} className={BTN_NEUTRO}>Cancelar</button>}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-base">
            <p><span className="text-muted-foreground">Valor Pago no contracheque:</span> <span className="font-medium">{dinheiro(c.valorPagoContracheque)}</span></p>
            <p><span className="text-muted-foreground">Valor Devido na competência:</span> <span className="font-medium">{dinheiro(c.valorDevido)}</span></p>
            <p>{c.contrachequeConferido ? `✓ Contracheque conferido em ${resumo.conferidoEm ? dataCurta(resumo.conferidoEm) : "—"} por ${resumo.conferidoPor}` : <span className="text-muted-foreground">Contracheque ainda não conferido.</span>}</p>
            {resumo.salvaEm && <p className="text-sm text-muted-foreground">Apuração salva por {resumo.salvaPor} em {dataHora(resumo.salvaEm)}.</p>}
            {editavel && <button onClick={() => setEditando(true)} className={BTN_NEUTRO}>Editar apuração</button>}
          </div>
        )}

        {/* Resultado — não é campo de entrada */}
        <div className="rounded-lg bg-card border border-border px-4 py-3 flex flex-wrap items-baseline gap-x-3">
          <span className="text-base text-muted-foreground">Valor a Ressarcir</span>
          <span className="text-2xl font-semibold">{dinheiro(resultado)}</span>
          {editando && <span className="text-sm text-muted-foreground">Calculado automaticamente</span>}
        </div>
        {divergente && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-base" role="alert">
            <p className="font-medium text-warning flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Divergência na apuração</p>
            <p>Valor Pago é maior que Valor Devido. Revise os valores antes de prosseguir.</p>
          </div>
        )}
      </Secao>

      {/* 3 — Observação da análise */}
      <Secao id="observacao" numero={3} titulo="Observação da análise" resumo={resumoObservacao} aberta={abertas.observacao} onAlternar={() => alternar("observacao")}>
        <p className="text-base rounded-md bg-card border border-border px-3 py-2">{gerarObservacao(s, c)}</p>
        <div className="flex flex-wrap gap-2">
          <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento da GERDAB (opcional)" className="flex-1 min-w-[12rem] border border-border rounded-md px-3 py-2 text-base bg-background" />
          <button onClick={() => executar(() => complementarObservacao(s.id, c.competenciaReferencia, complemento, responsavel))} className={BTN_NEUTRO}>Salvar complemento</button>
        </div>
      </Secao>

      {/* 4 — Decisão: um único gate por origem */}
      <Secao id="decisao" numero={4} titulo="Decisão" resumo={resumoDecisao} aberta={abertas.decisao} onAlternar={() => alternar("decisao")}>
        {!decidida && (
          faltam.length === 0 ? (
            <p className="text-base" role="status">✓ Apuração concluída. Competência apta para decisão.</p>
          ) : (
            <div className="text-base" role="status">
              <p className="text-muted-foreground">{individual ? "Para autorizar, conclua:" : "Para habilitar, conclua:"}</p>
              <ul className="mt-0.5">{faltam.map((f) => <li key={f}>○ {f}</li>)}</ul>
            </div>
          )
        )}
        {individual ? (
          !decidida ? (
            !pedindoJust ? (
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => setPedindoJust(true)} className={BTN_NEGATIVO}>Não autorizar</button>
                <button disabled={!aprovarHabilitado} onClick={() => executar(() => aprovarCompetencia(s.id, c.competenciaReferencia, responsavel))} className={`${BTN_POSITIVO} disabled:opacity-50 disabled:cursor-not-allowed`}>Autorizar competência</button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea value={justDecisao} onChange={(e) => setJustDecisao(e.target.value)} rows={2} placeholder="Justificativa (obrigatória; visível ao servidor)" className="w-full border border-border rounded-md px-3 py-2 text-base bg-background" />
                <div className="flex gap-2">
                  <button onClick={() => executar(() => { negarCompetencia(s.id, c.competenciaReferencia, justDecisao, responsavel); setPedindoJust(false); })} className={BTN_NEGATIVO}>Confirmar — não autorizada</button>
                  <button onClick={() => setPedindoJust(false)} className={BTN_NEUTRO}>Cancelar</button>
                </div>
              </div>
            )
          ) : (
            <p className="text-base text-muted-foreground">
              Decisão registrada — {estado === "aprovado" ? "autorizada" : "não autorizada"} por {c.decisoes[c.decisoes.length - 1].responsavel} em {dataHora(c.decisoes[c.decisoes.length - 1].dataHora)}.
              {estado === "negado" && c.decisoes[c.decisoes.length - 1].justificativa ? ` Justificativa: ${c.decisoes[c.decisoes.length - 1].justificativa}` : ""}
            </p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-base">
              Situação do registro: <span className="font-medium">{estado === "habilitado" ? "Habilitado para ressarcimento" : estado === "desabilitado" ? "Não habilitado" : "Em análise"}</span>
            </p>
            {estado === "desabilitado" && c.decisoes[c.decisoes.length - 1]?.justificativa && (
              <p className="text-base text-muted-foreground">Justificativa: {c.decisoes[c.decisoes.length - 1].justificativa}</p>
            )}
            {!pedindoJust ? (
              <div className="flex flex-wrap gap-2 items-center">
                {estado !== "desabilitado" && <button onClick={() => setPedindoJust(true)} className={BTN_NEGATIVO}>Não habilitar</button>}
                {estado !== "habilitado" && (
                  <button disabled={!aprovarHabilitado} onClick={() => executar(() => habilitarRegistroRetroativo(s.id, c.competenciaReferencia, responsavel))} className={`${BTN_POSITIVO} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    Habilitar para ressarcimento
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea value={justDecisao} onChange={(e) => setJustDecisao(e.target.value)} rows={2} placeholder="Justificativa (obrigatória; visível à associação)" className="w-full border border-border rounded-md px-3 py-2 text-base bg-background" />
                <div className="flex gap-2">
                  <button onClick={() => executar(() => { desabilitarRegistroRetroativo(s.id, c.competenciaReferencia, justDecisao, responsavel); setPedindoJust(false); })} className={BTN_NEGATIVO}>Confirmar — não habilitado</button>
                  <button onClick={() => setPedindoJust(false)} className={BTN_NEUTRO}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}
        {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}
      </Secao>

      {/* 5 — Histórico (recolhido por padrão; trilha completa preservada) */}
      <Secao id="historico" numero={5} titulo="Histórico" resumo={resumoHistorico} aberta={abertas.historico} onAlternar={() => alternar("historico")}>
        {trilha.length === 0 ? (
          <p className="text-base text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {trilha.map((e, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="text-foreground">{textoEvento(e)}</span> — {e.responsavel}, {dataHora(e.dataHora)}
                {e.justificativa ? ` (${e.justificativa})` : ""}
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </section>
  );
}

type SecaoId = "comprovacao" | "apuracao" | "observacao" | "decisao" | "historico";

function textoEvento(e: CompetenciaRetroativa["apuracao"][number] | CompetenciaRetroativa["decisoes"][number] | NonNullable<CompetenciaRetroativa["complementacoes"]>[number]): string {
  if (e.dominio === "complementacao") return e.tipo === "solicitada" ? `Complementação solicitada: ${e.texto}` : `Complementação recebida: ${e.documentos?.join(", ")}`;
  if (e.dominio === "apuracao") {
    switch (e.tipo) {
      case "valor_pago_registrado": return `Valor Pago registrado: ${formatCurrency(Number(e.valorNovo))}`;
      case "valor_devido_validado": return `Valor Devido validado: ${formatCurrency(Number(e.valorNovo))}`;
      case "contracheque_conferido": return "Contracheque conferido";
      case "mes_ano_pagamento_corrigido": return `Mês/Ano de Pagamento corrigido de ${e.valorAnterior} para ${e.valorNovo}`;
      case "observacao_complementada": return "Observação complementada";
    }
  }
  return { aprovado: "Competência autorizada", negado: "Competência não autorizada", habilitado: "Registro habilitado para ressarcimento", desabilitado: "Registro não habilitado" }[e.decisao];
}

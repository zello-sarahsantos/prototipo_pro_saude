import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileText, Loader2, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { Stepper } from "@/components/Stepper";
import { Campo, GuardaPerfilAdmin, MarcadorAjuste, MemoriaAuxilioView, AjudaArquivo, MemoriaRessarcimentoView, SeletorArquivo, SeloOrigemValor, botaoPrimario, botaoSecundario, formatarData, inputEstilo } from "@/components/negociacoes/ui";
import { V, cardBase } from "@/components/dashboard-gerdab/gd-ui";
import { getAdminRole } from "@/components/AdminLayout";
import { getDataReferencia } from "@/lib/dias-uteis";
import { formatCompetencia, servidoresList, type ServidorListItem } from "@/lib/mock-data";
import {
  FINALIDADES_DOCUMENTO,
  TIPOS_DOCUMENTO_NEGOCIACAO,
  calcularAuxilioElegivel,
  calcularRessarcimento,
  centavosParaTexto,
  criarNegociacao,
  formatarCentavos,
  parseMoedaCentavos,
  regraAuxilioVigente,
  responsavelAtual,
  somarMesesISO,
  validarDocumentacao,
  verificarVencimentos,
  vencimentoValido,
  type CriterioParcelamento,
  type FinalidadeDocumento,
  type TipoDocumentoNegociacao,
} from "@/lib/negociacoes";

export const Route = createFileRoute("/admin/negociacoes/nova")({
  component: () => (
    <GuardaPerfilAdmin>
      <NovaNegociacao />
    </GuardaPerfilAdmin>
  ),
});

const ETAPAS = ["Identificação", "Meses negociados", "Parcelas", "Documentos", "Conferência"];

interface LinhaMes { key: string; competencia: string; valorParcela: string; ajuste?: { valor: string; justificativa: string; calculadoRef: number } }
interface LinhaParcela { key: string; vencimento: string; manualVenc: boolean; valorCobrado: string }
interface DocumentoForm { key: string; arquivo: File; tipo: TipoDocumentoNegociacao; finalidade: FinalidadeDocumento; descricao: string }
interface AjusteParcela { valor: string; justificativa: string; calculadoRef: number | null }

const chave = () => Math.random().toString(36).slice(2, 9);
const hojeISO = () => {
  const d = getDataReferencia();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tamanhoLegivel = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function CampoMoeda({ valor, onChange, rotulo, erro, obrigatorio }: { valor: string; onChange: (v: string) => void; rotulo: string; erro?: string; obrigatorio?: boolean }) {
  const parsed = valor.trim() ? parseMoedaCentavos(valor) : null;
  const msg = erro ?? (parsed && "erro" in parsed ? parsed.erro : undefined);
  return (
    <Campo rotulo={rotulo} erro={msg} obrigatorio={obrigatorio}>
      <input inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} placeholder="0,00" aria-invalid={!!msg} style={{ ...inputEstilo, borderColor: msg ? V.red : V.border, textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
    </Campo>
  );
}

function NovaNegociacao() {
  const navigate = useNavigate();
  const role = typeof window === "undefined" ? "gerencia" : getAdminRole();
  const [etapa, setEtapa] = useState(0);
  const [tentou, setTentou] = useState<Record<number, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroFinal, setErroFinal] = useState("");
  const topo = useRef<HTMLDivElement>(null);

  // Etapa 1 — identificação (dados do cadastro pré-preenchidos; ajustes só valem na negociação)
  const [busca, setBusca] = useState("");
  const [servidor, setServidor] = useState<ServidorListItem | null>(null);
  const [processoSEI, setProcessoSEI] = useState("");
  const [usarCadastro, setUsarCadastro] = useState(true);
  const [assocCtx, setAssocCtx] = useState("—");
  const [operadoraCtx, setOperadoraCtx] = useState("");
  const [dataFormalizacao, setDataFormalizacao] = useState(hojeISO());
  const [observacoes, setObservacoes] = useState("");
  // Etapa 2 — meses negociados
  const [meses, setMeses] = useState<LinhaMes[]>([{ key: chave(), competencia: "", valorParcela: "" }]);
  const [editandoMes, setEditandoMes] = useState<string | null>(null);
  const [rascunhoMes, setRascunhoMes] = useState({ valor: "", justificativa: "" });
  const [erroMes, setErroMes] = useState("");
  // Etapa 3 — parcelas do acordo
  const [qtd, setQtd] = useState("");
  const [parcelas, setParcelas] = useState<LinhaParcela[]>([]);
  const [valorPadrao, setValorPadrao] = useState("");
  const [ajustesParc, setAjustesParc] = useState<Record<number, AjusteParcela>>({});
  const [editandoParc, setEditandoParc] = useState<number | null>(null);
  const [rascunhoParc, setRascunhoParc] = useState({ valor: "", justificativa: "" });
  const [erroParc, setErroParc] = useState("");
  // Etapa 4 — documentos
  const [docs, setDocs] = useState<DocumentoForm[]>([]);
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [novoTipo, setNovoTipo] = useState<TipoDocumentoNegociacao | "">("");
  const [novaFinalidade, setNovaFinalidade] = useState<FinalidadeDocumento | "">("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [erroDoc, setErroDoc] = useState("");

  function escolherServidor(sv: ServidorListItem | null) {
    setServidor(sv);
    setUsarCadastro(true);
    setAssocCtx(sv?.associacao ?? "—");
    setOperadoraCtx(sv?.operadora ?? "");
    setProcessoSEI(sv?.processoSEI ?? "");
  }

  // Vínculo DA NEGOCIAÇÃO: pode diferir do cadastro atual (mensalidades de períodos anteriores). Nunca grava no cadastro.
  const assocEfetiva = usarCadastro ? (servidor?.associacao ?? "—") : assocCtx;
  const operadoraEfetiva = usarCadastro ? (servidor?.operadora ?? "") : operadoraCtx;
  const vinculoDiferente = !!servidor && (assocEfetiva !== servidor.associacao || operadoraEfetiva !== (servidor.operadora ?? ""));

  const sujo = !!(servidor || qtd || docs.length || meses.some((m) => m.competencia || m.valorParcela));
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  /* ── Derivados: auxílio elegível de cada mês (mesma regra da primeira inclusão) ── */
  const qtdNum = /^\d+$/.test(qtd.trim()) ? Number(qtd) : NaN;
  const qtdValida = Number.isInteger(qtdNum) && qtdNum >= 1 && qtdNum <= 120;

  const mesesCalc = meses.map((m) => {
    const parc = m.valorParcela.trim() ? parseMoedaCentavos(m.valorParcela) : null;
    const valorParcela = parc && "centavos" in parc && parc.centavos > 0 ? parc.centavos : null;
    const calc = valorParcela !== null ? calcularAuxilioElegivel(valorParcela) : null;
    const aj = m.ajuste ? parseMoedaCentavos(m.ajuste.valor) : null;
    const ajustado = !!(m.ajuste && aj && "centavos" in aj && m.ajuste.justificativa.trim());
    const final = ajustado ? (aj as { centavos: number }).centavos : (calc?.auxilioCents ?? null);
    return { valorParcela, calc, ajustado, final };
  });
  const totalElegivel = mesesCalc.reduce((t, m) => t + (m.final ?? 0), 0);
  const mesesUsados = meses.map((m) => m.competencia).filter(Boolean);

  // O cálculo automático (truncamento) é sempre a base; o tipo de parcelamento é identificado depois, pelos valores finais.
  const calculo = calcularRessarcimento(totalElegivel, qtdValida ? qtdNum : 0, "uniforme");

  // Linhas de parcela acompanham a quantidade; vencimentos seguem a parcela 1 (nunca sobrescrevem datas editadas).
  useEffect(() => {
    if (!qtdValida) return;
    setParcelas((atual) => {
      if (atual.length === qtdNum) return atual;
      if (atual.length > qtdNum) return atual.slice(0, qtdNum);
      const primeiro = atual[0]?.vencimento ?? "";
      const novas = [...atual];
      while (novas.length < qtdNum) {
        const k = novas.length;
        novas.push({ key: chave(), vencimento: k > 0 && vencimentoValido(primeiro) ? somarMesesISO(primeiro, k) : "", manualVenc: false, valorCobrado: "" });
      }
      return novas;
    });
    setAjustesParc((a) => Object.fromEntries(Object.entries(a).filter(([n]) => Number(n) <= qtdNum)));
  }, [qtdNum, qtdValida]);

  function definirVencimento(i: number, valor: string) {
    setParcelas((l) => {
      const novo = l.map((p, k) => (k === i ? { ...p, vencimento: valor, manualVenc: i === 0 ? false : valor !== "" } : p));
      if (i === 0 && vencimentoValido(valor)) return novo.map((p, k) => (k > 0 && !p.manualVenc ? { ...p, vencimento: somarMesesISO(valor, k) } : p));
      return novo;
    });
  }
  const resultados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return [];
    return servidoresList.filter((s) => s.nome.toLowerCase().includes(t) || s.matricula.includes(t)).slice(0, 8);
  }, [busca]);

  // Valor do ressarcimento de cada parcela: calculado quando há regra; ajuste manual nunca é sobrescrito.
  const finais = parcelas.map((_, i) => {
    const n = i + 1;
    const calculado = calculo.disponivel ? (calculo.valoresCents[i] ?? null) : null;
    const aj = ajustesParc[n];
    const ajParsed = aj ? parseMoedaCentavos(aj.valor) : null;
    if (aj && ajParsed && "centavos" in ajParsed) return { n, calculado, final: ajParsed.centavos, origem: "manual" as const, justificativa: aj.justificativa, desatualizado: aj.calculadoRef !== calculado };
    if (calculado !== null) return { n, calculado, final: calculado, origem: "automatico" as const, justificativa: "", desatualizado: false };
    return { n, calculado, final: null as number | null, origem: "manual" as const, justificativa: "", desatualizado: false };
  });
  const somaFinais = finais.reduce((t, f) => t + (f.final ?? 0), 0);
  const todasComValor = finais.length > 0 && finais.every((f) => f.final !== null);
  // Tipo de parcelamento: identificado automaticamente (somente leitura) a partir dos valores finais. Não altera total
  // elegível, valores calculados, ajustes nem justificativas; se os valores voltarem a ser iguais, volta a "mesmo valor".
  const finaisNumericos = finais.flatMap((f) => (f.final !== null ? [f.final] : []));
  const criterio: CriterioParcelamento = new Set(finaisNumericos).size > 1 ? "diferenciado" : "uniforme";

  /* ── Validação por etapa ── */
  const errosEtapa1: string[] = [];
  if (!servidor) errosEtapa1.push("Selecione o servidor.");
  if (!dataFormalizacao) errosEtapa1.push("Informe a data de formalização.");

  const errosEtapa2: string[] = [];
  meses.forEach((m, i) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.competencia)) errosEtapa2.push(`Mês ${i + 1}: informe mês e ano.`);
    if (mesesCalc[i].valorParcela === null) errosEtapa2.push(`Mês ${i + 1}: informe o valor da parcela.`);
  });
  if (new Set(mesesUsados).size !== mesesUsados.length) errosEtapa2.push("Há meses negociados repetidos.");
  if (totalElegivel <= 0 && errosEtapa2.length === 0) errosEtapa2.push("O total elegível deve ser maior que zero.");

  const errosEtapa3: string[] = [];
  if (!qtdValida) errosEtapa3.push("Informe a quantidade de parcelas do acordo (1 a 120).");
  parcelas.forEach((p, i) => {
    if (!vencimentoValido(p.vencimento)) errosEtapa3.push(`Parcela ${i + 1}: informe um vencimento válido.`);
    if (p.valorCobrado.trim() && "erro" in parseMoedaCentavos(p.valorCobrado)) errosEtapa3.push(`Parcela ${i + 1}: valor cobrado inválido.`);
  });

  const msgDoc = validarDocumentacao(docs.map((d) => ({ finalidade: d.finalidade })));
  const errosEtapa5: string[] = [];
  if (!todasComValor) errosEtapa5.push("Há parcelas sem valor de ressarcimento: use “Ajustar” para preencher, com justificativa, as parcelas sem cálculo automático.");
  if (msgDoc) errosEtapa5.push(msgDoc);
  const errosPorEtapa = [errosEtapa1, errosEtapa2, errosEtapa3, [] as string[], errosEtapa5];

  // Alertas objetivos (não bloqueiam)
  const alertas: string[] = [];
  alertas.push(...verificarVencimentos(parcelas.map((p) => p.vencimento)));
  finais.filter((f) => f.desatualizado).forEach((f) => alertas.push(`Parcela ${f.n}: valor manual mantido; o valor calculado mudou para ${f.calculado !== null ? formatarCentavos(f.calculado) : "indisponível"} desde o ajuste — confira.`));
  meses.forEach((m, i) => {
    const c = mesesCalc[i].calc;
    if (m.ajuste && c && m.ajuste.calculadoRef !== c.auxilioCents) alertas.push(`Mês ${formatCompetencia(m.competencia) || i + 1}: o auxílio calculado mudou desde o ajuste manual — confira.`);
  });

  function avancar() {
    setTentou((t) => ({ ...t, [etapa]: true }));
    if (errosPorEtapa[etapa].length > 0) return;
    setEtapa((e) => Math.min(ETAPAS.length - 1, e + 1));
    topo.current?.scrollIntoView({ block: "start" });
  }

  function adicionarDocumento() {
    if (!novoArquivo || !novoTipo || !novaFinalidade) return setErroDoc("Selecione o arquivo, o tipo e a finalidade do documento.");
    if (novoTipo === "outro" && !novaDescricao.trim()) return setErroDoc("Descreva o documento (tipo “Outro documento”).");
    setErroDoc("");
    setDocs((d) => [...d, { key: chave(), arquivo: novoArquivo, tipo: novoTipo, finalidade: novaFinalidade, descricao: novaDescricao }]);
    setNovoArquivo(null);
    setNovoTipo("");
    setNovaFinalidade("");
    setNovaDescricao("");
  }

  /* ── Ajustes ── */
  function abrirAjusteMes(m: LinhaMes, i: number) {
    const f = mesesCalc[i].final;
    setRascunhoMes(m.ajuste ? { valor: m.ajuste.valor, justificativa: m.ajuste.justificativa } : { valor: f !== null ? centavosParaTexto(f) : "", justificativa: "" });
    setErroMes("");
    setEditandoMes(m.key);
  }
  function aplicarAjusteMes(i: number) {
    const v = parseMoedaCentavos(rascunhoMes.valor);
    if ("erro" in v) return setErroMes(v.erro);
    if (!rascunhoMes.justificativa.trim()) return setErroMes("A justificativa é obrigatória para ajustar o auxílio elegível.");
    const calc = mesesCalc[i].calc;
    if (!calc) return setErroMes("Informe antes o valor da parcela do mês.");
    setMeses((l) => l.map((m, k) => (k === i ? { ...m, ajuste: { valor: rascunhoMes.valor, justificativa: rascunhoMes.justificativa.trim(), calculadoRef: calc.auxilioCents } } : m)));
    setEditandoMes(null);
  }
  function abrirAjusteParcela(n: number) {
    const f = finais[n - 1];
    setRascunhoParc(ajustesParc[n] ? { valor: ajustesParc[n].valor, justificativa: ajustesParc[n].justificativa } : { valor: f?.final != null ? centavosParaTexto(f.final) : "", justificativa: "" });
    setErroParc("");
    setEditandoParc(n);
  }
  function aplicarAjusteParcela() {
    const v = parseMoedaCentavos(rascunhoParc.valor);
    if ("erro" in v) return setErroParc(v.erro);
    if (!rascunhoParc.justificativa.trim()) return setErroParc("A justificativa é obrigatória para ajustar ou preencher o valor do ressarcimento.");
    const n = editandoParc!;
    setAjustesParc((a) => ({ ...a, [n]: { valor: rascunhoParc.valor, justificativa: rascunhoParc.justificativa.trim(), calculadoRef: finais[n - 1]?.calculado ?? null } }));
    setEditandoParc(null);
  }

  async function confirmar() {
    setTentou((t) => ({ ...t, 4: true }));
    setErroFinal("");
    if (errosEtapa1.length || errosEtapa2.length || errosEtapa3.length) {
      setErroFinal("Há campos pendentes nas etapas anteriores. Revise as etapas 1 a 3.");
      return;
    }
    if (errosEtapa5.length) return;
    setSalvando(true);
    try {
      const neg = await criarNegociacao({
        matricula: servidor!.matricula,
        associacao: assocEfetiva,
        operadora: operadoraEfetiva,
        processoSEI,
        dataFormalizacao,
        observacoes,
        competencias: meses.map((m, i) => ({
          competencia: m.competencia,
          valorParcelaCents: mesesCalc[i].valorParcela!,
          ajuste: mesesCalc[i].ajustado ? { valorCents: mesesCalc[i].final!, justificativa: m.ajuste!.justificativa } : undefined,
        })),
        parcelas: parcelas.map((p, i) => ({
          numero: i + 1,
          vencimento: p.vencimento,
          valorCobradoCents: p.valorCobrado.trim() ? (parseMoedaCentavos(p.valorCobrado) as { centavos: number }).centavos : undefined,
          manual: finais[i].origem === "manual" ? { valorCents: finais[i].final!, justificativa: finais[i].justificativa } : undefined,
        })),
        documentos: docs.map((d) => ({ arquivo: d.arquivo, nome: d.arquivo.name, tipo: d.tipo, finalidade: d.finalidade, descricao: d.descricao })),
        responsavel: responsavelAtual(role),
      });
      navigate({ to: "/admin/negociacoes/$id", params: { id: neg.id }, search: { novo: true } });
    } catch (e) {
      setErroFinal(e instanceof Error ? e.message : "Não foi possível confirmar o cadastro.");
      setSalvando(false);
    }
  }

  const mostrar = (e: number) => !!tentou[e];
  const vazioCalc = !calculo.disponivel ? calculo.motivo : "";
  const regra = regraAuxilioVigente();

  const secao = (children: React.ReactNode) => <div className="gd-bar" style={{ ...cardBase, padding: "22px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>;
  const linhaErros = (e: number) =>
    mostrar(e) && errosPorEtapa[e].length > 0 ? (
      <div role="alert" style={{ background: V.redSoft, color: V.red, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{errosPorEtapa[e].map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
    ) : null;

  const celula: React.CSSProperties = { padding: "8px", borderBottom: `1px solid ${V.border}` };

  /** Tabela principal de ressarcimento (etapas 3 e 5): Parcela | Vencimento | Valor do ressarcimento | Situação | Ajustar. */
  const tabelaRessarcimento = (editarVenc: boolean) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr style={{ color: V.muted, fontSize: 12, textAlign: "left" }}>
            {["Parcela", "Vencimento", "Valor do ressarcimento", "Situação", ""].map((h, i) => <th key={i} style={{ ...celula, fontWeight: 600, textAlign: i === 2 ? "right" : "left" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {finais.map((f, i) => (
            <>
              <tr key={f.n} className="gd-row">
                <td style={{ ...celula, fontWeight: 600 }}>{f.n}/{finais.length}</td>
                <td style={celula}>
                  {editarVenc ? (
                    <input type="date" min="2000-01-01" max="2100-12-31" aria-label={`Vencimento da parcela ${f.n}`} value={parcelas[i].vencimento} onChange={(e) => definirVencimento(i, e.target.value)} style={{ ...inputEstilo, width: 160, height: 34 }} />
                  ) : (
                    formatarData(parcelas[i].vencimento)
                  )}
                </td>
                <td style={{ ...celula, textAlign: "right", fontWeight: 700 }}>
                  {f.final !== null ? <>{formatarCentavos(f.final)}<MarcadorAjuste manual={f.origem === "manual"} /></> : <span style={{ color: V.red, fontWeight: 600 }}>Pendente de preenchimento</span>}
                </td>
                <td style={celula}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: V.muted, background: V.track }}>Pendente</span></td>
                <td style={{ ...celula, textAlign: "right", whiteSpace: "nowrap" }}>
                  {editandoParc !== f.n && (
                    <button type="button" onClick={() => abrirAjusteParcela(f.n)} style={{ background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}>
                      <Pencil size={13} /> Ajustar
                    </button>
                  )}
                </td>
              </tr>
              {editandoParc === f.n && (
                <tr key={`aj-${f.n}`}>
                  <td colSpan={5} style={{ padding: 12, borderBottom: `1px solid ${V.border}`, background: V.primarySoft }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div>
                        <CampoMoeda rotulo={`Valor do ressarcimento — parcela ${f.n}`} obrigatorio valor={rascunhoParc.valor} onChange={(v) => setRascunhoParc((r) => ({ ...r, valor: v }))} />
                        <p style={{ fontSize: 12, color: V.muted, margin: "6px 0 0" }}>Valor calculado pelo sistema: <strong>{f.calculado !== null ? formatarCentavos(f.calculado) : "indisponível"}</strong></p>
                      </div>
                      <Campo rotulo="Justificativa" obrigatorio ajuda="Obrigatória: registra o motivo do valor informado.">
                        <textarea value={rascunhoParc.justificativa} onChange={(e) => setRascunhoParc((r) => ({ ...r, justificativa: e.target.value }))} rows={3} style={{ ...inputEstilo, height: "auto", padding: 10, resize: "vertical" }} />
                      </Campo>
                    </div>
                    <p style={{ fontSize: 12, color: V.muted, margin: "8px 0" }}>Informe apenas o auxílio elegível. Juros, multas e valores não elegíveis não entram no ressarcimento.</p>
                    {erroParc && <p role="alert" style={{ color: V.red, fontSize: 13, margin: "0 0 8px" }}>{erroParc}</p>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" onClick={aplicarAjusteParcela} style={botaoPrimario}><Check size={16} /> Aplicar valor</button>
                      <button type="button" onClick={() => setEditandoParc(null)} style={botaoSecundario}><X size={16} /> Cancelar</button>
                      {ajustesParc[f.n] && f.calculado !== null && (
                        <button type="button" onClick={() => { setAjustesParc((a) => { const n = { ...a }; delete n[f.n]; return n; }); setEditandoParc(null); }} style={botaoSecundario}><Undo2 size={16} /> Restaurar valor calculado</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: "8px" }}>Total do ressarcimento</td>
            <td style={{ padding: "8px", textAlign: "right" }}>{todasComValor ? formatarCentavos(somaFinais) : "—"}</td>
            <td colSpan={2} style={{ padding: "8px", fontWeight: 400, color: V.muted }}>Total elegível: {formatarCentavos(totalElegivel)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const alertasView = alertas.map((a) => <div key={a} role="status" style={{ display: "flex", gap: 8, fontSize: 13, background: V.amberSoft, color: V.amber, borderRadius: 8, padding: "8px 12px" }}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{a}</div>);

  return (
    <div className="gd" ref={topo} style={{ padding: "28px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 18, background: V.bg, minHeight: "100%" }}>
      <header>
        <Link to="/admin/negociacoes" style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>‹ Negociações</Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.3px", margin: "6px 0 0" }}>Nova negociação</h1>
        <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 0" }}>Informe os dados identificados na documentação; o sistema calcula o auxílio elegível e o ressarcimento das parcelas. O sistema não lê nem extrai dados dos documentos.</p>
      </header>

      <div className="neg-stepper"><Stepper steps={ETAPAS} current={etapa} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ gridColumn: "span 2", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }} className="neg-main">
          {etapa === 0 && secao(
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>1. Identificação</h2>
              {!servidor ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Campo rotulo="Servidor (cadastro do Pró-Saúde)" obrigatorio>
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por nome ou matrícula…" style={inputEstilo} />
                  </Campo>
                  {busca.trim() && resultados.length === 0 && <p style={{ fontSize: 13, color: V.muted, margin: 0 }}>Nenhum servidor encontrado no cadastro.</p>}
                  {resultados.map((s) => (
                    <button key={s.matricula} type="button" className="gd-row" onClick={() => escolherServidor(s)} style={{ textAlign: "left", background: "none", border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: V.text, fontFamily: "inherit", fontSize: 13 }}>
                      <strong>{s.nome}</strong> · matrícula {s.matricula} <span style={{ color: V.muted }}>· {s.associacao !== "—" ? `${s.associacao} · ` : ""}{s.operadora ?? "—"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: 14, background: V.primarySoft, display: "flex", flexWrap: "wrap", gap: "10px 24px", alignItems: "center" }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{servidor.nome}</div>
                    <div style={{ fontSize: 13, color: V.muted }}>Matrícula {servidor.matricula} · CPF {servidor.cpf}</div>
                    <div style={{ fontSize: 11, color: V.muted, marginTop: 4 }}>Nome, matrícula e CPF vêm do cadastro do Pró-Saúde (somente leitura).</div>
                  </div>
                  <button type="button" onClick={() => escolherServidor(null)} style={botaoSecundario}>Trocar servidor</button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: V.muted, whiteSpace: "nowrap" }}>Dados da negociação</span>
                <hr aria-hidden style={{ flex: 1, border: 0, borderTop: `1px solid ${V.border}`, margin: 0 }} />
              </div>
              {servidor && (
                <>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={usarCadastro}
                      onChange={(e) => {
                        setUsarCadastro(e.target.checked);
                        if (e.target.checked) {
                          setAssocCtx(servidor.associacao);
                          setOperadoraCtx(servidor.operadora ?? "");
                        }
                      }}
                      style={{ marginTop: 4 }}
                    />
                    <span>
                      <strong style={{ fontWeight: 600 }}>Utilizar os dados atuais do cadastro</strong>
                      <span style={{ display: "block", fontSize: 12, color: V.muted }}>Desmarque se a negociação se refere a período em que o servidor tinha outra associação ou operadora. O cadastro do servidor não é alterado.</span>
                    </span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, alignItems: "start" }}>
                    <Campo rotulo="Associação da negociação">
                      <select value={assocEfetiva} disabled={usarCadastro} onChange={(e) => setAssocCtx(e.target.value)} style={{ ...inputEstilo, opacity: usarCadastro ? 0.75 : 1 }}>
                        {[...new Set(["—", "Assefaz", "Assetran", servidor.associacao, assocEfetiva])].map((a) => <option key={a} value={a}>{a === "—" ? "Sem associação" : a}</option>)}
                      </select>
                    </Campo>
                    <Campo rotulo="Operadora da negociação">
                      <input list="operadoras-negociacao" value={operadoraEfetiva} disabled={usarCadastro} onChange={(e) => setOperadoraCtx(e.target.value)} placeholder="Operadora do plano" style={{ ...inputEstilo, opacity: usarCadastro ? 0.75 : 1 }} />
                      <datalist id="operadoras-negociacao">{[...new Set(servidoresList.map((x) => x.operadora).filter(Boolean))].map((o) => <option key={o} value={o as string} />)}</datalist>
                    </Campo>
                  </div>
                  {vinculoDiferente && (
                    <p role="status" style={{ fontSize: 12, color: V.amber, margin: 0 }}>
                      Vínculo diferente do cadastro atual do servidor. <span style={{ color: V.muted }}>(Cadastro atual: {servidor.associacao !== "—" ? servidor.associacao : "sem associação"} · {servidor.operadora ?? "operadora não informada"}.)</span>
                    </p>
                  )}
                </>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, alignItems: "start" }}>
                <Campo rotulo="Processo SEI" ajuda={servidor?.processoSEI ? (processoSEI !== servidor.processoSEI ? `Alterado nesta negociação (cadastro: ${servidor.processoSEI}).` : "Do cadastro; editável só nesta negociação.") : "Quando aplicável."}><input value={processoSEI} onChange={(e) => setProcessoSEI(e.target.value)} placeholder="00000.000000/0000-00" style={inputEstilo} /></Campo>
                <Campo rotulo="Data de formalização" obrigatorio><input type="date" value={dataFormalizacao} onChange={(e) => setDataFormalizacao(e.target.value)} style={inputEstilo} /></Campo>
              </div>
              <Campo rotulo="Observações administrativas"><textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} style={{ ...inputEstilo, height: "auto", padding: 10, resize: "vertical" }} /></Campo>
              {linhaErros(0)}
            </>,
          )}

          {etapa === 1 && secao(
            <>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>2. Meses negociados</h2>
                <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Informe cada mês em atraso incluído no acordo e o <strong>valor da parcela</strong> original do plano, conforme a documentação — não o valor das prestações do acordo. O <strong>auxílio elegível</strong> é calculado automaticamente, com a mesma regra da primeira inclusão, e pode ser ajustado.</p>
              </div>
              {meses.map((m, i) => {
                const c = mesesCalc[i];
                return (
                  <div key={m.key} style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, alignItems: "start" }}>
                      <Campo rotulo="Mês negociado" obrigatorio><input type="month" value={m.competencia} onChange={(e) => setMeses((l) => l.map((x) => (x.key === m.key ? { ...x, competencia: e.target.value } : x)))} style={inputEstilo} /></Campo>
                      <CampoMoeda rotulo="Valor da parcela" obrigatorio valor={m.valorParcela} onChange={(v) => setMeses((l) => l.map((x) => (x.key === m.key ? { ...x, valorParcela: v } : x)))} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted }}>
                        <span>Auxílio elegível</span>
                        <div style={{ minHeight: 40, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 16, color: V.text, fontVariantNumeric: "tabular-nums" }}>{c.final !== null ? formatarCentavos(c.final) : "—"}</strong>
                          {c.final !== null && <SeloOrigemValor origem={c.ajustado ? "manual" : "automatico"} />}
                          {c.calc && editandoMes !== m.key && (
                            <button type="button" onClick={() => abrirAjusteMes(m, i)} style={{ background: "none", border: "none", color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center", padding: 0 }}>
                              <Pencil size={13} /> Ajustar
                            </button>
                          )}
                        </div>
                        {c.calc?.acimaDoTeto && <span style={{ fontWeight: 400 }}>Valor acima do teto: base limitada a {formatarCentavos(c.calc.tetoCents)}.</span>}
                        {c.ajustado && c.calc && <span style={{ fontWeight: 400 }}>Calculado: {formatarCentavos(c.calc.auxilioCents)}</span>}
                      </div>
                      {meses.length > 1 && (
                        <button type="button" aria-label={`Remover mês ${i + 1}`} onClick={() => setMeses((l) => l.filter((x) => x.key !== m.key))} style={{ ...botaoSecundario, color: V.red, alignSelf: "end", width: 40, padding: 0 }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {editandoMes === m.key && (
                      <div style={{ background: V.primarySoft, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                          <div>
                            <CampoMoeda rotulo="Auxílio elegível do mês" obrigatorio valor={rascunhoMes.valor} onChange={(v) => setRascunhoMes((r) => ({ ...r, valor: v }))} />
                            <p style={{ fontSize: 12, color: V.muted, margin: "6px 0 0" }}>Valor calculado pelo sistema: <strong>{c.calc ? formatarCentavos(c.calc.auxilioCents) : "—"}</strong></p>
                          </div>
                          <Campo rotulo="Justificativa" obrigatorio ajuda="Ex.: componente não elegível, valor histórico, outra situação identificada pela GERDAB.">
                            <textarea value={rascunhoMes.justificativa} onChange={(e) => setRascunhoMes((r) => ({ ...r, justificativa: e.target.value }))} rows={3} style={{ ...inputEstilo, height: "auto", padding: 10, resize: "vertical" }} />
                          </Campo>
                        </div>
                        {erroMes && <p role="alert" style={{ color: V.red, fontSize: 13, margin: "8px 0 0" }}>{erroMes}</p>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          <button type="button" onClick={() => aplicarAjusteMes(i)} style={botaoPrimario}><Check size={16} /> Aplicar valor</button>
                          <button type="button" onClick={() => setEditandoMes(null)} style={botaoSecundario}><X size={16} /> Cancelar</button>
                          {m.ajuste && (
                            <button type="button" onClick={() => { setMeses((l) => l.map((x) => (x.key === m.key ? { ...x, ajuste: undefined } : x))); setEditandoMes(null); }} style={botaoSecundario}><Undo2 size={16} /> Restaurar valor calculado</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <button type="button" onClick={() => setMeses((l) => [...l, { key: chave(), competencia: "", valorParcela: "" }])} style={botaoSecundario}><Plus size={16} /> Adicionar mês</button>
                <div style={{ fontSize: 14 }}>Total elegível: <strong style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{formatarCentavos(totalElegivel)}</strong></div>
              </div>
              <p style={{ fontSize: 12, color: V.muted, margin: 0 }}>Auxílio calculado com {Math.round(regra.percentual * 100)}% e teto de {formatarCentavos(regra.tetoCents)}, parâmetros atualmente vigentes no sistema. Para meses antigos é uma referência, não necessariamente a regra da época: confira e ajuste, com justificativa, quando necessário.</p>
              {linhaErros(1)}
            </>,
          )}

          {etapa === 2 && secao(
            <>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>3. Parcelas do acordo</h2>
                <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Informe a quantidade de parcelas e o vencimento da primeira. O sistema gera as linhas, sugere os vencimentos mensais e preenche o valor do ressarcimento de cada parcela.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, alignItems: "start" }}>
                <Campo rotulo="Quantidade de parcelas" obrigatorio erro={qtd && !qtdValida ? "Informe um número inteiro de 1 a 120." : undefined}>
                  <input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} style={inputEstilo} />
                </Campo>
                <div style={{ gridColumn: "span 2", border: `1px solid ${V.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 13 }} aria-live="polite">
                  <span style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>Tipo de parcelamento (identificado automaticamente)</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{criterio === "uniforme" ? "Parcelas de mesmo valor" : "Entrada diferenciada ou parcelas distintas"}</div>
                  <div style={{ fontSize: 12, color: V.muted }}>{criterio === "uniforme" ? "Ressarcimento calculado por truncamento (corte em duas casas; a diferença residual é só exibida). Critério sujeito à validação da GERDAB." : "Há valores finais diferentes entre as parcelas. Os valores calculados e ajustes foram mantidos; o sistema não distribui automaticamente a entrada diferenciada (regra ainda não validada)."}</div>
                </div>
              </div>
              {!qtdValida ? (
                <p style={{ fontSize: 13, color: V.muted, margin: 0 }}>Informe a quantidade de parcelas para gerar as linhas.</p>
              ) : (
                <>
                  {!calculo.disponivel && <div role="status" style={{ display: "flex", gap: 8, fontSize: 13, background: V.amberSoft, color: V.amber, borderRadius: 8, padding: "10px 12px" }}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> Cálculo automático indisponível: {vazioCalc}</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: V.muted, flex: "1 1 260px" }}>O vencimento da parcela 1 gera automaticamente os demais, mês a mês. Cada data pode ser editada, e as datas alteradas manualmente são preservadas.</span>
                  </div>
                  {tabelaRessarcimento(true)}
                  <details style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: "8px 12px" }}>
                    <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Informações complementares do acordo (opcional)</summary>
                    <p style={{ fontSize: 12, color: V.muted, margin: "8px 0" }}>Valor cobrado em cada prestação pela operadora ou associação (pode incluir juros e encargos). É apenas informativo: <strong>não entra</strong> no cálculo do auxílio nem do ressarcimento.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
                      <div style={{ width: 200 }}><CampoMoeda rotulo="Valor cobrado padrão" valor={valorPadrao} onChange={setValorPadrao} /></div>
                      <button type="button" disabled={!valorPadrao.trim() || "erro" in parseMoedaCentavos(valorPadrao)} onClick={() => setParcelas((l) => l.map((p) => ({ ...p, valorCobrado: valorPadrao })))} style={{ ...botaoSecundario, opacity: valorPadrao.trim() && !("erro" in parseMoedaCentavos(valorPadrao)) ? 1 : 0.5 }}>Replicar em todas as parcelas</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                      {parcelas.map((p, i) => (
                        <CampoMoeda key={p.key} rotulo={`Parcela ${i + 1}`} valor={p.valorCobrado} onChange={(v) => setParcelas((l) => l.map((x) => (x.key === p.key ? { ...x, valorCobrado: v } : x)))} />
                      ))}
                    </div>
                  </details>
                </>
              )}
              {alertasView}
              {linhaErros(2)}
            </>,
          )}

          {etapa === 3 && secao(
            <>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>4. Documentação comprobatória</h2>
                <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Anexos documentais e de auditoria. O sistema <strong>não lê nem extrai dados</strong> dos arquivos. Identifique ao menos um documento que fundamenta a negociação.</p>
              </div>
              <div role="status" style={{ fontSize: 13, fontWeight: 600, padding: "8px 12px", borderRadius: 8, color: msgDoc ? (docs.length ? V.amber : V.red) : V.green, background: msgDoc ? (docs.length ? V.amberSoft : V.redSoft) : V.greenSoft }}>
                {msgDoc ?? `Documentação suficiente: ${docs.filter((d) => d.finalidade === "fundamenta").length} documento(s) fundamenta(m) a negociação.`}
              </div>
              <div className="neg-doc" style={{ border: `1px dashed ${V.border}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="neg-doc-grid">
                <SeletorArquivo id="neg-arquivo-cadastro" arquivo={novoArquivo} onChange={setNovoArquivo} />
                <Campo rotulo="Tipo do documento" obrigatorio>
                  <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as TipoDocumentoNegociacao | "")} style={inputEstilo}>
                    <option value="">Selecione…</option>
                    {(Object.keys(TIPOS_DOCUMENTO_NEGOCIACAO) as TipoDocumentoNegociacao[]).map((t) => <option key={t} value={t}>{TIPOS_DOCUMENTO_NEGOCIACAO[t]}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Finalidade" obrigatorio>
                  <select value={novaFinalidade} onChange={(e) => setNovaFinalidade(e.target.value as FinalidadeDocumento | "")} style={inputEstilo}>
                    <option value="">Selecione…</option>
                    {(Object.keys(FINALIDADES_DOCUMENTO) as FinalidadeDocumento[]).map((f) => <option key={f} value={f}>{FINALIDADES_DOCUMENTO[f]}</option>)}
                  </select>
                </Campo>
                <Campo rotulo={novoTipo === "outro" ? "Descrição do documento" : "Descrição (opcional)"} obrigatorio={novoTipo === "outro"}><input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} style={inputEstilo} /></Campo>
                </div>
                <AjudaArquivo id="neg-arquivo-cadastro" arquivo={novoArquivo} />
                <div><button type="button" onClick={adicionarDocumento} style={botaoPrimario}><Plus size={16} /> Anexar documento</button></div>
              </div>
              {erroDoc && <p role="alert" style={{ color: V.red, fontSize: 13, margin: 0 }}>{erroDoc}</p>}
              {docs.length === 0 ? (
                <p style={{ fontSize: 13, color: V.muted, margin: 0 }}>Nenhum documento anexado.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {docs.map((d) => (
                    <li key={d.key} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
                      <FileText size={16} color={V.muted} aria-hidden />
                      <span style={{ flex: "1 1 200px", minWidth: 0, fontSize: 13 }}>
                        <strong style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{d.arquivo.name}</strong> <span style={{ color: V.muted }}>({tamanhoLegivel(d.arquivo.size)})</span>
                        <span style={{ display: "block", fontSize: 12, color: V.muted }}>{TIPOS_DOCUMENTO_NEGOCIACAO[d.tipo]}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                      </span>
                      <select aria-label="Finalidade do documento" value={d.finalidade} onChange={(e) => setDocs((l) => l.map((x) => (x.key === d.key ? { ...x, finalidade: e.target.value as FinalidadeDocumento } : x)))} style={{ ...inputEstilo, width: 210 }}>
                        {(Object.keys(FINALIDADES_DOCUMENTO) as FinalidadeDocumento[]).map((f) => <option key={f} value={f}>{FINALIDADES_DOCUMENTO[f]}</option>)}
                      </select>
                      <button type="button" aria-label={`Remover ${d.arquivo.name}`} onClick={() => setDocs((l) => l.filter((x) => x.key !== d.key))} style={{ ...botaoSecundario, color: V.red, width: 40, padding: 0 }}><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </>,
          )}

          {etapa === 4 && secao(
            <>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>5. Conferência</h2>
                <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>Confira os valores calculados antes de confirmar. Depois da confirmação os valores ficam congelados e qualquer mudança passa a ser retificação (pendência P02/P04).</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                {[["Servidor", servidor ? `${servidor.nome} · ${servidor.matricula}` : "—"], ["Total elegível", formatarCentavos(totalElegivel)], ["Parcelas", qtdValida ? String(qtdNum) : "—"], ["Critério", criterio === "uniforme" ? "Parcelas de mesmo valor" : "Entrada diferenciada / distintas"]].map(([r, v]) => (
                  <div key={r} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: V.muted, fontWeight: 600 }}>{r}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{v}</div>
                  </div>
                ))}
              </div>
              {!calculo.disponivel && <div role="status" style={{ display: "flex", gap: 8, fontSize: 13, background: V.amberSoft, color: V.amber, borderRadius: 8, padding: "10px 12px" }}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> Cálculo automático indisponível: {vazioCalc}</div>}
              {tabelaRessarcimento(false)}
              <div style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Memória de cálculo</h3>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>A. Auxílio elegível</h4>
                  <MemoriaAuxilioView
                    formatarMes={formatCompetencia}
                    percentual={regra.percentual}
                    tetoCents={regra.tetoCents}
                    meses={meses.map((m, i) => ({ competencia: m.competencia, valorParcelaCents: mesesCalc[i].valorParcela ?? 0, baseCents: mesesCalc[i].calc?.baseCents, calculadoCents: mesesCalc[i].calc?.auxilioCents, finalCents: mesesCalc[i].final ?? 0 }))}
                  />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>B. Ressarcimento da negociação</h4>
                  <MemoriaRessarcimentoView
                    totalCents={totalElegivel}
                    qtd={qtdValida ? qtdNum : null}
                    criterio={criterio}
                    memoria={calculo.disponivel ? calculo.memoria : null}
                    semCalculo={!calculo.disponivel ? calculo.motivo : undefined}
                    somaFinaisCents={todasComValor ? somaFinais : null}
                    ajustes={finais.filter((f) => f.origem === "manual" && f.final !== null).map((f) => ({ parcela: f.n, calculadoCents: f.calculado, valorInformadoCents: f.final! }))}
                  />
                </div>
              </div>
              {alertasView}
              <div style={{ fontSize: 13 }}>
                <strong>Documentos ({docs.length}):</strong> {docs.length ? docs.map((d) => d.arquivo.name).join(", ") : "nenhum"}
                {" · "}<button type="button" onClick={() => setEtapa(3)} style={{ background: "none", border: "none", padding: 0, color: V.primary, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Revisar documentos</button>
              </div>
              {linhaErros(4)}
              {erroFinal && <div role="alert" style={{ background: V.redSoft, color: V.red, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{erroFinal}</div>}
            </>,
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" disabled={etapa === 0 || salvando} onClick={() => setEtapa((e) => Math.max(0, e - 1))} style={{ ...botaoSecundario, opacity: etapa === 0 ? 0.5 : 1 }}>Voltar</button>
              <Link to="/admin/negociacoes" onClick={(e) => { if (sujo && !window.confirm("Descartar o cadastro em andamento?")) e.preventDefault(); }} style={{ ...botaoSecundario, color: V.muted }}>Cancelar</Link>
            </div>
            {etapa < ETAPAS.length - 1 ? (
              <button type="button" onClick={avancar} style={botaoPrimario}>Próximo</button>
            ) : (
              <button type="button" onClick={confirmar} disabled={salvando} style={{ ...botaoPrimario, opacity: salvando ? 0.7 : 1 }}>
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {salvando ? "Confirmando…" : "Confirmar cadastro"}
              </button>
            )}
          </div>
        </div>

        <aside className="gd-bar" aria-label="Resumo do cálculo" style={{ ...cardBase, padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6, position: "sticky", top: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: V.muted }}>Resumo</span>
          <div style={{ fontSize: 13, color: V.muted }}>Total elegível</div>
          <div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatarCentavos(totalElegivel)}</div>
          <div style={{ fontSize: 13, color: V.muted }}>{mesesUsados.length ? mesesUsados.map(formatCompetencia).join(", ") : "Nenhum mês negociado informado"}</div>
          <hr style={{ border: 0, borderTop: `1px solid ${V.border}`, width: "100%" }} />
          <div style={{ fontSize: 13, color: V.muted }}>Parcelas: <strong style={{ color: V.text }}>{qtdValida ? qtdNum : "—"}</strong></div>
          <div style={{ fontSize: 13, color: V.muted }}>Ressarcimento por parcela</div>
          {calculo.disponivel ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatarCentavos(calculo.memoria.valorPorParcelaCents)}</div>
              {calculo.memoria.residualCents > 0 && <div style={{ fontSize: 12, color: V.amber }}>Diferença residual: {formatarCentavos(calculo.memoria.residualCents)}</div>}
            </>
          ) : (
            <div style={{ fontSize: 12, color: V.amber }}>{qtdValida ? "Preenchimento manual" : "Informe a quantidade de parcelas."}</div>
          )}
          <p style={{ fontSize: 11, color: V.muted, margin: "4px 0 0" }}>Recalculado a cada alteração. A memória completa está na etapa de conferência.</p>
        </aside>
      </div>
    </div>
  );
}

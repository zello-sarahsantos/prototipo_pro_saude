import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileCheck, Plus, Upload, X } from "lucide-react";
import { Stepper, StepNav, Field, FormError, inputCls } from "@/components/Stepper";
import { competenciaAtual, formatCompetencia } from "@/lib/mock-data";
import { getBeneficiariosPagamentoAtual } from "@/lib/prosaude-storage";
import { ComprovacaoPelaAssociacaoAviso } from "@/components/ComprovacaoPelaAssociacaoAviso";
import { lerArquivoComoDataUrl } from "@/lib/retroativo-fluxo";
import { getOrigemComprovacaoServidorLogado } from "@/lib/origem-comprovacao";
import { temPeloMenosNPalavras } from "@/lib/validation-pagamento";
import {
  MESES_PT,
  MOTIVOS_RESSARCIMENTO,
  TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO,
  TIPOS_DOCUMENTO_RETROATIVO,
  criarSolicitacaoRetroativa,
  derivarMesAnoPagamento,
  getAnosRetroativos,
  getCompetenciasJaSolicitadas,
  validarCompetenciaRetroativa,
  type TipoDocumentoRetroativo,
} from "@/lib/ressarcimento-retroativo";

export const Route = createFileRoute("/servidor/retroativo/novo")({
  component: SolicitarRessarcimentoRetroativoGuard,
  // `competencias`: lista separada por vírgulas, vinda da página de Pagamentos (identificadas + adicionadas).
  // `competencia` (única) segue aceita por compatibilidade.
  validateSearch: (search: Record<string, unknown>): { competencias?: string; competencia?: string } => ({
    competencias: typeof search.competencias === "string" ? search.competencias : undefined,
    competencia: typeof search.competencia === "string" ? search.competencia : undefined,
  }),
});

/**
 * Solicitação de Ressarcimento Retroativo — Portal do Servidor (Fase 2, plano v3, ata 22/09/2026).
 *
 * Uma única solicitação reúne uma ou mais competências (inclusive de anos diferentes), cada uma
 * com seus próprios documentos. O servidor informa apenas: motivo, justificativa, competências e
 * documentos de cada competência. **Não informa** Valor Pago, Valor Devido, Matrícula nem
 * Mês/Ano de Pagamento — este último é derivado pelo sistema (competência + 1 mês) e mostrado só
 * para conferência; valores são apurados pela GERDAB. Este fluxo é aditivo: o envio retroativo
 * "leve" de comprovante (`/servidor/pagamentos/enviar`) permanece como está.
 *
 * **Fluxo único:** as "Competências pendentes" detectadas pelo sistema são apenas atalhos para este
 * mesmo formulário (a competência chega pré-selecionada via `?competencia=AAAA-MM`, e o servidor
 * pode acrescentar outras); "Solicitar outro período" abre o mesmo formulário sem pré-seleção, para
 * qualquer período histórico — inclusive anterior à implantação do sistema. Ambos geram a mesma
 * `SolicitacaoRetroativa`; nenhum motor, persistência ou regra é duplicado.
 *
 * **Documentos:** cada arquivo recebe individualmente um Tipo de Documento (obrigatório — não há
 * upload sem identificação), com descrição curta OBRIGATÓRIA quando "Outro documento". Não há combinações
 * obrigatórias entre tipos (ex.: não exige Boleto nem Comprovante): o mínimo é 1 documento por
 * competência, pois casos retroativos têm naturezas diferentes e a apuração é manual pela GERDAB. A
 * conferência do contracheque NÃO é documento exigido do servidor. Não replica as regras de IA/OCR
 * do Módulo de Pagamento, sem impedir reaproveitá-las depois. Guarda, por competência,
 * `arquivo + tipo + descrição`.
 *
 * O motivo é único para a solicitação (suposição sinalizada — pendência com a stakeholder) e o
 * catálogo é provisório (`MOTIVOS_RESSARCIMENTO`).
 */

const etapas = ["Motivo", "Competências", "Documentos", "Revisão"];
const anoAtual = Number(competenciaAtual.split("-")[0]);
const ANOS = getAnosRetroativos();
const FORMATO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

interface DocumentoSelecionado {
  file: File;
  tipo?: TipoDocumentoRetroativo; // obrigatório antes de avançar
  descricao?: string; // só "Outro documento"
}

/** Servidor de Associação não tem ressarcimento retroativo individual (retroativo é da Associação). */
function SolicitarRessarcimentoRetroativoGuard() {
  const { associacao } = getOrigemComprovacaoServidorLogado();
  if (associacao) {
    return (
      <div className="p-4 space-y-4">
        <Link to="/servidor/pagamentos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Pagamentos
        </Link>
        <ComprovacaoPelaAssociacaoAviso associacao={associacao} />
      </div>
    );
  }
  return <SolicitarRessarcimentoRetroativo />;
}

function SolicitarRessarcimentoRetroativo() {
  const { competencias: competenciasPreSelecionadas, competencia: competenciaUnica } = Route.useSearch();
  // Sem autenticação real: "o servidor logado" é o titular do cenário do Módulo de Pagamento.
  const titular = useMemo(() => getBeneficiariosPagamentoAtual().find((b) => b.parentesco === "Titular"), []);

  const [step, setStep] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [instancia, setInstancia] = useState("");
  const [referenciaAto, setReferenciaAto] = useState("");
  // Competências selecionadas na página de Pagamentos (identificadas + adicionadas): chegam pré-selecionadas.
  const [competencias, setCompetencias] = useState<string[]>(() => {
    const brutas = [...(competenciasPreSelecionadas?.split(",") ?? []), ...(competenciaUnica ? [competenciaUnica] : [])];
    // Ignora inválidas e as que já possuem solicitação retroativa (não podem ser solicitadas de novo).
    const jaSolicitadasInicial = getCompetenciasJaSolicitadas(titular?.cpf ?? "");
    const validas = brutas.map((c) => c.trim()).filter((c) => FORMATO_COMPETENCIA.test(c) && c < competenciaAtual && !jaSolicitadasInicial.has(c));
    return [...new Set(validas)].sort();
  });
  const [documentos, setDocumentos] = useState<Record<string, DocumentoSelecionado[]>>({});
  const [mesSel, setMesSel] = useState("");
  const [anoSel, setAnoSel] = useState(String(anoAtual));
  const [erroCompetencia, setErroCompetencia] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  if (!titular) return null;
  const jaSolicitadas = getCompetenciasJaSolicitadas(titular.cpf ?? "");

  const excepcional = motivo === "autorizacao_excepcional";
  const justificativaOk = temPeloMenosNPalavras(justificativa);
  const etapa1Ok = !!motivo && justificativaOk && (!excepcional || (instancia.trim() !== "" && referenciaAto.trim() !== ""));
  const etapa2Ok = competencias.length > 0;
  // Mínimo: 1 documento por competência, cada um com seu tipo informado. Nenhuma combinação obrigatória.
  // "Outro documento" exige descrição curta. Catálogo de tipos completo, sem restrição por tipo de plano.
  const etapa3Ok = competencias.every(
    (c) => (documentos[c]?.length ?? 0) > 0 && documentos[c].every((d) => !!d.tipo && (d.tipo !== "outro" || (d.descricao?.trim() ?? "") !== "")),
  );
  const tiposDisponiveis = Object.keys(TIPOS_DOCUMENTO_RETROATIVO) as TipoDocumentoRetroativo[];

  function adicionarCompetencia() {
    setErroCompetencia("");
    if (!mesSel) return setErroCompetencia("Selecione o mês.");
    const comp = `${anoSel}-${mesSel}`;
    const erro = validarCompetenciaRetroativa(comp, competencias, jaSolicitadas);
    if (erro) return setErroCompetencia(erro);
    setCompetencias([...competencias, comp].sort());
    setMesSel("");
  }

  function removerCompetencia(comp: string) {
    setCompetencias(competencias.filter((c) => c !== comp));
    setDocumentos(({ [comp]: _removido, ...resto }) => resto);
  }

  function anexar(comp: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos = Array.from(files).map((file) => ({ file }));
    setDocumentos({ ...documentos, [comp]: [...(documentos[comp] ?? []), ...novos] });
  }

  function atualizarDocumento(comp: string, indice: number, patch: Partial<DocumentoSelecionado>) {
    setDocumentos({ ...documentos, [comp]: (documentos[comp] ?? []).map((d, i) => (i === indice ? { ...d, ...patch } : d)) });
  }

  function removerDocumento(comp: string, indice: number) {
    setDocumentos({ ...documentos, [comp]: (documentos[comp] ?? []).filter((_, i) => i !== indice) });
  }

  async function enviar() {
    setErroEnvio("");
    try {
      // Protótipo: guarda o conteúdo dos arquivos (até um limite) só para a GERDAB poder abri-los na conferência.
      const conteudos = new Map<File, string | undefined>(
        await Promise.all(Object.values(documentos).flat().map(async (d) => [d.file, await lerArquivoComoDataUrl(d.file)] as const)),
      );
      criarSolicitacaoRetroativa({
        origem: "individual",
        cpfTitular: titular!.cpf ?? "",
        nomeTitular: titular!.nome,
        motivo,
        justificativa,
        autorizacaoExcepcional: excepcional ? { instancia: instancia.trim(), referenciaDocumento: referenciaAto.trim() } : undefined,
        competencias: competencias.map((c) => ({
          competenciaReferencia: c,
          documentos: (documentos[c] ?? []).map((d) => ({ nome: d.file.name, tipo: d.tipo!, descricao: d.descricao, conteudo: conteudos.get(d.file) })),
        })),
      });
      setEnviado(true);
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Não foi possível enviar a solicitação.");
    }
  }

  if (enviado) {
    return (
      <div className="p-4 space-y-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-success mx-auto mt-6" />
        <h2 className="text-lg font-semibold">Solicitação enviada</h2>
        <p className="text-sm text-muted-foreground">
          Sua solicitação de ressarcimento retroativo com {competencias.length}{" "}
          {competencias.length === 1 ? "competência" : "competências"} foi enviada para análise da
          GERDAB. Cada competência será analisada individualmente.
        </p>
        <Link to="/servidor/pagamentos" className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium">
          Voltar para Pagamentos
        </Link>
      </div>
    );
  }

  return (
    // pb-24: a ação flutuante "Novo Requerimento" do layout não deve cobrir os botões de navegação da etapa.
    <div className="p-4 pb-24 space-y-4">
      <Link to="/servidor/pagamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pagamentos
      </Link>
      <div>
        <h2 className="text-lg font-semibold">Ressarcimento retroativo</h2>
        <p className="text-sm text-muted-foreground">
          Solicite o ressarcimento de uma ou mais competências anteriores em um único pedido. Titular: {titular.nome}.
        </p>
      </div>

      <Stepper steps={etapas} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Motivo do ressarcimento" required>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
              <option value="">Selecione…</option>
              {Object.entries(MOTIVOS_RESSARCIMENTO).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>{rotulo}</option>
              ))}
            </select>
          </Field>
          <Field label={motivo === "outros" ? "Descreva o motivo" : "Justificativa"} required>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
              placeholder="Explique o motivo do pedido (mínimo 3 palavras)…"
              className={inputCls}
            />
            {justificativa.trim() !== "" && !justificativaOk && <FormError message="Informe ao menos 3 palavras." />}
          </Field>
          {excepcional && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Casos autorizados excepcionalmente por instância superior (ex.: PROJUR, chefia ou Direção-Geral).
              </p>
              <Field label="Instância autorizadora" required>
                <input value={instancia} onChange={(e) => setInstancia(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Referência ao ato/documento autorizativo" required>
                <input value={referenciaAto} onChange={(e) => setReferenciaAto(e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}
          <StepNav onNext={() => setStep(1)} disabled={!etapa1Ok} cancelTo="/servidor/pagamentos" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adicione as competências de referência que deseja receber. Podem ser meses de anos
            diferentes; cada uma será analisada separadamente.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Mês</label>
              <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className={inputCls}>
                <option value="">Mês…</option>
                {MESES_PT.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1.5">Ano</label>
              <select value={anoSel} onChange={(e) => setAnoSel(e.target.value)} className={inputCls}>
                {ANOS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <button onClick={adicionarCompetencia} className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-2.5 text-sm font-medium">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          <FormError message={erroCompetencia} />

          {competencias.length > 0 && (
            <ul className="space-y-2">
              {competencias.map((c) => (
                <li key={c} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatCompetencia(c)}</p>
                    <p className="text-xs text-muted-foreground">
                      Mês/Ano de Pagamento previsto: {formatCompetencia(derivarMesAnoPagamento(c))} (definido pelo sistema; a GERDAB confere)
                    </p>
                  </div>
                  <button onClick={() => removerCompetencia(c)} aria-label={`Remover ${formatCompetencia(c)}`} className="p-1 hover:bg-muted rounded">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <StepNav onPrev={() => setStep(0)} onNext={() => setStep(2)} disabled={!etapa2Ok} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Anexe os documentos de cada competência (PDF, JPG ou PNG) e informe o tipo de cada um. Cada
            competência precisa de ao menos um documento; não há combinação obrigatória de tipos.
          </p>
          {competencias.map((c) => (
            <div key={c} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-sm font-semibold">{formatCompetencia(c)}</p>
              {(documentos[c] ?? []).map((d, i) => (
                <div key={`${d.file.name}-${i}`} className="rounded-lg border border-border p-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCheck className="h-4 w-4 text-success shrink-0" />
                    <span className="flex-1 truncate">{d.file.name}</span>
                    <button onClick={() => removerDocumento(c, i)} aria-label={`Remover ${d.file.name}`} className="p-1 hover:bg-muted rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    aria-label={`Tipo de documento — ${d.file.name}`}
                    value={d.tipo ?? ""}
                    onChange={(e) => atualizarDocumento(c, i, { tipo: (e.target.value || undefined) as TipoDocumentoRetroativo | undefined })}
                    className={`${inputCls} ${!d.tipo ? "border-destructive/60" : ""}`}
                  >
                    <option value="">Tipo de documento…</option>
                    {tiposDisponiveis.map((t) => (
                      <option key={t} value={t}>{TIPOS_DOCUMENTO_RETROATIVO[t]}</option>
                    ))}
                  </select>
                  {d.tipo === "outro" && (
                    <input
                      aria-label={`Descrição — ${d.file.name}`}
                      value={d.descricao ?? ""}
                      maxLength={TAMANHO_MAXIMO_DESCRICAO_DOCUMENTO}
                      onChange={(e) => atualizarDocumento(c, i, { descricao: e.target.value })}
                      placeholder="Descrição curta do documento (obrigatória)"
                      className={`${inputCls} ${!(d.descricao?.trim()) ? "border-destructive/60" : ""}`}
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => inputsRef.current[c]?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:border-primary/50 flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" /> Anexar documento
              </button>
              <input
                ref={(el) => { inputsRef.current[c] = el; }}
                data-competencia={c}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { anexar(c, e.target.files); e.target.value = ""; }}
              />
            </div>
          ))}
          <StepNav onPrev={() => setStep(1)} onNext={() => setStep(3)} disabled={!etapa3Ok} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Motivo:</span> {MOTIVOS_RESSARCIMENTO[motivo]}</p>
            <p><span className="text-muted-foreground">Justificativa:</span> {justificativa}</p>
            {excepcional && (
              <p><span className="text-muted-foreground">Autorização:</span> {instancia} — {referenciaAto}</p>
            )}
          </div>
          <ul className="space-y-2">
            {competencias.map((c) => (
              <li key={c} className="rounded-xl border border-border bg-card p-3 text-sm">
                <p className="font-medium">{formatCompetencia(c)}</p>
                <p className="text-xs text-muted-foreground">Mês/Ano de Pagamento previsto: {formatCompetencia(derivarMesAnoPagamento(c))}</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {(documentos[c] ?? []).map((d, i) => (
                    <li key={`${d.file.name}-${i}`} className="truncate">
                      {d.file.name} — {TIPOS_DOCUMENTO_RETROATIVO[d.tipo!]}
                      {d.tipo === "outro" && d.descricao?.trim() ? ` (${d.descricao.trim()})` : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Os valores pagos e devidos de cada competência são apurados pela GERDAB durante a análise.
          </p>
          <FormError message={erroEnvio} />
          <StepNav onPrev={() => setStep(2)} onNext={enviar} nextLabel="Enviar solicitação" isLast />
        </div>
      )}
    </div>
  );
}

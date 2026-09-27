import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCw, XCircle } from "lucide-react";
import { Stepper, StepNav } from "@/components/Stepper";
import { BeneficiarioSelector } from "@/components/BeneficiarioSelector";
import { ArquivosAnexadosUpload, type ArquivoComDocumentos } from "@/components/ArquivosAnexadosUpload";
import { ResumoPagamento } from "@/components/ResumoPagamento";
import { LendoComprovante, type EtapaLeitura } from "@/components/LendoComprovante";
import { ConferenciaBeneficiarios } from "@/components/ConferenciaBeneficiarios";
import { ConsolidadoCompetencia } from "@/components/ConsolidadoCompetencia";
import {
  beneficiariosPagamento,
  competenciaAtual,
  competenciasFechadas,
  formatCompetencia,
  tiposDocumentoPorPlano,
  tipoPlanoPagamentoPadrao,
  type ArquivoAnexado,
  type Comprovante,
  type CampoExtraido,
} from "@/lib/mock-data";
import { arquivoEhIlegivel, gerarCamposExtraidos, mesclarCamposDeArquivos } from "@/lib/ocr-mock";
import {
  beneficiariosCobertosPeloDocumento,
  getCoberturaDocumental,
  todosContemplados,
  todosDocumentosComCoberturaDefinida,
} from "@/lib/comprovante-status";
import { ComprovacaoPelaAssociacaoAviso } from "@/components/ComprovacaoPelaAssociacaoAviso";
import { getOrigemComprovacaoServidorLogado } from "@/lib/origem-comprovacao";
import { temPeloMenosNPalavras } from "@/lib/validation-pagamento";
import {
  addComprovantePagamento,
  getComprovantesUnificados,
  saveConclusaoCompetencia,
  getBeneficiariosPagamentoAtual,
} from "@/lib/prosaude-storage";
import { getCicloDeDestino, getDataReferencia } from "@/lib/dias-uteis";

const titularPagamento = beneficiariosPagamento.find((b) => b.parentesco === "Titular");

export const Route = createFileRoute("/servidor/pagamentos/enviar")({
  validateSearch: (search: Record<string, unknown>): { competencia?: string; beneficiario?: string } => ({
    competencia: typeof search.competencia === "string" ? search.competencia : undefined,
    beneficiario: typeof search.beneficiario === "string" ? search.beneficiario : undefined,
  }),
  component: EnviarComprovanteGuard,
});

type Step =
  | "selecao"
  | "upload"
  | "lendo"
  | "ilegivel"
  | "conferencia_beneficiarios"
  | "confirmar_documento"
  | "resumo_competencia";

const stepLabels = ["Beneficiários", "Documento", "Revisão", "Resumo"];

function stepIndex(step: Step): number {
  if (step === "selecao") return 0;
  if (step === "upload" || step === "lendo" || step === "ilegivel") return 1;
  if (step === "conferencia_beneficiarios") return 2;
  return 3;
}

/** Servidor de Associação não tem envio individual de comprovante (comprovação é da Associação). */
function EnviarComprovanteGuard() {
  const { associacao } = getOrigemComprovacaoServidorLogado();
  if (associacao) {
    return (
      <div className="p-4">
        <ComprovacaoPelaAssociacaoAviso associacao={associacao} />
      </div>
    );
  }
  return <EnviarComprovante />;
}

function EnviarComprovante() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  // Quando aberta a partir do alerta de "competência pendente", a competência vem preenchida e travada.
  const competenciaViaAlerta =
    search.competencia && competenciasFechadas.includes(search.competencia) ? search.competencia : undefined;
  const beneficiarioViaAlerta =
    search.beneficiario && beneficiariosPagamento.some((b) => b.id === search.beneficiario)
      ? search.beneficiario
      : undefined;

  const [step, setStep] = useState<Step>("selecao");
  const [travarCompetencia, setTravarCompetencia] = useState(!!competenciaViaAlerta);
  const [competencia, setCompetencia] = useState(competenciaViaAlerta ?? competenciaAtual);
  const [justificativaAtraso, setJustificativaAtraso] = useState("");
  const [justificativasDivergencia, setJustificativasDivergencia] = useState<Record<string, string>>({});
  const [operadoraDivergenteConfirmada, setOperadoraDivergenteConfirmada] = useState<Record<string, boolean>>({});
  const [beneficiariosSelecionados, setBeneficiariosSelecionados] = useState<string[]>(
    beneficiarioViaAlerta ? [beneficiarioViaAlerta] : [],
  );
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoComDocumentos[]>([]);
  const [arquivosIlegiveis, setArquivosIlegiveis] = useState<string[]>([]);
  const [gruposExtraidos, setGruposExtraidos] = useState<
    { beneficiarioId: string; campos: CampoExtraido[] }[]
  >([]);
  const [etapaLeitura, setEtapaLeitura] = useState<EtapaLeitura>(0);
  const [leituraConcluida, setLeituraConcluida] = useState(false);
  const [refreshResumoKey, setRefreshResumoKey] = useState(0);

  const comprovantesExistentes = useMemo(() => getComprovantesUnificados(), [step]);
  // Cadastro "atual" (seed + correções já aplicadas pela GERDAB) — garante que uma divergência
  // cadastral já resolvida não volte a ser sinalizada num novo envio deste beneficiário.
  const beneficiariosAtuais = useMemo(() => getBeneficiariosPagamentoAtual(), [step]);

  const isRetroativo = competencia !== competenciaAtual;

  // Fase 9 (complemento) — direcionamento efetivo ao ciclo vigente/seguinte (`getCicloDeDestino`,
  // `dias-uteis.ts`, Fase 0 — nenhuma fórmula de calendário nova). Só se aplica ao envio ORDINÁRIO
  // (`competencia === competenciaAtual`, seja na primeira etapa ou ao "anexar dependente" depois,
  // que trava a mesma competência); o caminho do alerta de retroativo LEGADO (`competencia` já
  // travada numa competência antiga e fechada) não é redirecionado — não faz sentido mover um
  // registro que já pertence, por natureza, a uma competência passada específica.
  //
  // Isto NÃO é o mesmo conceito de `isRetroativo`/justificativa do atraso acima: aquele é sobre o
  // SERVIDOR ter escolhido deliberadamente uma competência passada; isto é sobre, mesmo num envio
  // ordinário da competência aberta, o RELÓGIO já ter passado do 3º dia útil — o envio continua
  // ordinário (sem justificativa, sem aprovação especial), só é contado no Fechamento do ciclo
  // seguinte em vez do vigente.
  const cicloOrdinario = getCicloDeDestino(competenciaAtual, getDataReferencia());
  const direcionadoAoCicloSeguinte = competencia === competenciaAtual && cicloOrdinario.direcionadoAoCicloSeguinte;
  const competenciaEfetiva = competencia === competenciaAtual ? cicloOrdinario.competenciaDestino : competencia;
  const beneficiariosEscolhidos = beneficiariosAtuais.filter((b) =>
    beneficiariosSelecionados.includes(b.id),
  );
  // Modalidade do grupo selecionado determina os tipos de documento permitidos — não é mais
  // um valor único e global do sistema (ver mock-data.ts, BeneficiarioPagamento.modalidadePlano).
  const modalidadeDoGrupo = beneficiariosEscolhidos[0]?.modalidadePlano ?? tipoPlanoPagamentoPadrao;
  const tiposPermitidos = tiposDocumentoPorPlano[modalidadeDoGrupo];

  const podeAvancarSelecao =
    beneficiariosSelecionados.length > 0 && (!isRetroativo || temPeloMenosNPalavras(justificativaAtraso));
  const coberturaDocumental = getCoberturaDocumental(beneficiariosEscolhidos, arquivosSelecionados, modalidadeDoGrupo);
  const podeAvancarUpload =
    arquivosSelecionados.length > 0 &&
    todosContemplados(coberturaDocumental) &&
    todosDocumentosComCoberturaDefinida(arquivosSelecionados, beneficiariosEscolhidos.length);

  function iniciarProcessamento() {
    setStep("lendo");
    setEtapaLeitura(0);
    setLeituraConcluida(false);
    setArquivosIlegiveis([]);

    setTimeout(() => {
      setEtapaLeitura(1);
      setTimeout(() => {
        const ilegiveis = arquivosSelecionados
          .filter((a) => arquivoEhIlegivel(a.file.name))
          .map((a) => a.file.name);
        if (ilegiveis.length > 0) {
          setArquivosIlegiveis(ilegiveis);
          setTimeout(() => setStep("ilegivel"), 700);
          return;
        }
        setEtapaLeitura(2);
        setTimeout(() => {
          const todosIds = beneficiariosEscolhidos.map((b) => b.id);
          const grupos = beneficiariosEscolhidos.map((b) => {
            // Só entram campos de arquivos com pelo menos 1 documento (tipo) que cobre este
            // beneficiário — e só com os tipos que de fato o cobrem, não todos os do arquivo.
            // Mesma regra de cobertura usada no checklist (`getCoberturaDocumental`).
            const porArquivo = arquivosSelecionados.flatMap((a) => {
              const tiposQueCobrem = a.documentos
                .filter((d) => beneficiariosCobertosPeloDocumento(d, todosIds).includes(b.id))
                .map((d) => d.tipo);
              if (tiposQueCobrem.length === 0) return [];
              return [{ nome: a.file.name, campos: gerarCamposExtraidos(b, competencia, a.file.name, tiposQueCobrem) }];
            });
            return { beneficiarioId: b.id, campos: mesclarCamposDeArquivos(porArquivo) };
          });
          setGruposExtraidos(grupos);
          setLeituraConcluida(true);
          setTimeout(() => {
            setStep("conferencia_beneficiarios");
          }, 500);
        }, 600);
      }, 500);
    }, 350);
  }

  function corrigirIlegivel() {
    setArquivosIlegiveis([]);
    setStep("upload");
  }

  function handleChangeGrupo(beneficiarioId: string, campos: CampoExtraido[]) {
    setGruposExtraidos((prev) => prev.map((g) => (g.beneficiarioId === beneficiarioId ? { ...g, campos } : g)));
  }

  /** Persiste o documento em revisão — reflete no Resumo da competência, que só lê dados salvos. */
  function confirmarDocumento() {
    const arquivosDoEnvio: ArquivoAnexado[] = arquivosSelecionados.map((a) => ({
      nome: a.file.name,
      documentos: a.documentos,
    }));
    const primeiro = gruposExtraidos[0];
    const justificativasDivergenciaArray = Object.entries(justificativasDivergencia)
      .filter(([, texto]) => texto.trim() !== "")
      .map(([beneficiarioId, texto]) => ({ beneficiarioId, texto }));
    const novoComprovante: Comprovante = {
      id: `comp-${Date.now()}`,
      arquivos: arquivosDoEnvio,
      beneficiarioIds: beneficiariosSelecionados,
      // `competenciaEfetiva`, não `competencia`: o registro é gravado no ciclo de destino
      // (vigente ou seguinte, conforme o 2º/3º dia útil) — ver nota acima de `cicloOrdinario`.
      competencia: competenciaEfetiva,
      isRetroativo,
      justificativaAtraso: isRetroativo ? justificativaAtraso : undefined,
      camposExtraidos: primeiro?.campos ?? [],
      gruposExtraidos: gruposExtraidos.length > 1 ? gruposExtraidos : undefined,
      status: isRetroativo ? "retroativo_aguardando_aprovacao" : "em_analise",
      justificativasDivergencia:
        justificativasDivergenciaArray.length > 0 ? justificativasDivergenciaArray : undefined,
      operadoraDivergenteCadastro: Object.values(operadoraDivergenteConfirmada).some(Boolean) || undefined,
      aprovacoes: [],
      dataEnvio: new Date().toISOString(),
    };
    addComprovantePagamento(novoComprovante);
    setRefreshResumoKey((k) => k + 1);
    setStep("resumo_competencia");
  }

  /** "Anexar comprovante do dependente" a partir do Resumo — mantém a competência travada,
   *  preserva tudo já salvo e reabre o wizard só com o beneficiário faltante pré-selecionado. */
  function handleAnexarDependente(beneficiarioId: string) {
    setJustificativaAtraso("");
    setJustificativasDivergencia({});
    setOperadoraDivergenteConfirmada({});
    setArquivosSelecionados([]);
    setGruposExtraidos([]);
    setBeneficiariosSelecionados([beneficiarioId]);
    setTravarCompetencia(true);
    setStep("selecao");
  }

  function handleConcluir() {
    saveConclusaoCompetencia(competenciaEfetiva);
    navigate({ to: "/servidor/pagamentos" });
  }

  return (
    <div className="p-4">
      {step !== "resumo_competencia" && (
        <>
          <h2 className="text-lg font-semibold mb-1">Enviar Comprovante</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Etapa {stepIndex(step) + 1} de {stepLabels.length}
          </p>
          <Stepper steps={stepLabels} current={stepIndex(step)} />
        </>
      )}

      {step === "selecao" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Competência</label>
            <select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={travarCompetencia}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-70"
            >
              <option value={competenciaAtual}>{formatCompetencia(competenciaAtual)} (aberta)</option>
              {/* Revisão (integração com o Ressarcimento Retroativo): o envio ordinário não abre mais
                  competências passadas para escolha livre — o novo módulo é a única porta de entrada
                  para elas (`/servidor/retroativo/novo`, via o bloco "Ressarcimento retroativo" em
                  `servidor.pagamentos.index.tsx`). A única exceção é completar um envio retroativo
                  LEGADO já existente (ex.: "Anexar documento complementar" de um registro antigo),
                  quando a competência chega travada por link — nunca escolhida aqui. */}
              {travarCompetencia && competencia !== competenciaAtual && (
                <option value={competencia}>{formatCompetencia(competencia)} (retroativo — registro legado)</option>
              )}
            </select>
            {travarCompetencia ? (
              <p className="text-xs text-muted-foreground mt-1">
                Competência preenchida automaticamente — os comprovantes já enviados foram preservados.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Para uma competência anterior, use o Ressarcimento Retroativo, no menu Pagamentos.
              </p>
            )}
            {/* Ciclo de destino efetivo — mostrado antes da confirmação do envio (não só no resumo
                final), conforme o 2º/3º dia útil (`cicloOrdinario`). Só se aplica ao caminho
                ordinário; o alerta de retroativo legado não é redirecionado. */}
            {competencia === competenciaAtual && (
              <p
                className={`text-xs mt-1 ${
                  direcionadoAoCicloSeguinte ? "text-status-pendente-fg font-medium" : "text-muted-foreground"
                }`}
              >
                {direcionadoAoCicloSeguinte
                  ? `${formatCompetencia(competenciaAtual)} já encerrou automaticamente (a partir do 3º dia útil) — este envio será registrado no ciclo seguinte: ${formatCompetencia(competenciaEfetiva)}.`
                  : `Este envio será registrado em ${formatCompetencia(competenciaEfetiva)} (ciclo vigente).`}
              </p>
            )}
          </div>

          {isRetroativo && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Justificativa do atraso <span className="text-destructive">*</span>
              </label>
              <textarea
                value={justificativaAtraso}
                onChange={(e) => setJustificativaAtraso(e.target.value)}
                rows={3}
                placeholder="Explique o motivo do envio retroativo (mínimo 3 palavras)..."
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                  justificativaAtraso.trim().length > 0 && !temPeloMenosNPalavras(justificativaAtraso)
                    ? "border-destructive/50"
                    : "border-input"
                }`}
              />
              {justificativaAtraso.trim().length > 0 && !temPeloMenosNPalavras(justificativaAtraso) ? (
                <p className="text-xs text-destructive mt-1">Escreva pelo menos 3 palavras.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Envios retroativos são aprovados pela GERDAB (Analista ou Gerência) antes de valer para fins de reembolso.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Beneficiários</label>
            <BeneficiarioSelector
              beneficiarios={beneficiariosAtuais}
              competencia={competencia}
              comprovantesExistentes={comprovantesExistentes}
              selecionados={beneficiariosSelecionados}
              onChange={setBeneficiariosSelecionados}
            />
          </div>

          <StepNav
            onNext={() => setStep("upload")}
            nextLabel="Próximo"
            disabled={!podeAvancarSelecao}
            cancelTo="/servidor/pagamentos"
          />
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie o(s) comprovante(s) para {beneficiariosEscolhidos.map((b) => b.nome).join(", ")}. Você pode
            anexar mais de um arquivo quando as informações estiverem em documentos complementares (ex: fatura
            técnica + comprovante de pagamento).
          </p>
          <ArquivosAnexadosUpload
            arquivos={arquivosSelecionados}
            tiposPermitidos={tiposPermitidos}
            beneficiarios={beneficiariosEscolhidos}
            modalidadePlano={modalidadeDoGrupo}
            onChange={setArquivosSelecionados}
          />
          <StepNav
            onPrev={() => setStep("selecao")}
            onNext={iniciarProcessamento}
            nextLabel="Enviar para processamento"
            disabled={!podeAvancarUpload}
          />
        </div>
      )}

      {step === "lendo" && (
        <LendoComprovante
          nomesArquivos={arquivosSelecionados.map((a) => a.file.name)}
          etapaAtual={etapaLeitura}
          concluido={leituraConcluida}
          falhouLegibilidade={arquivosIlegiveis.length > 0}
          onVoltar={() => setStep("upload")}
        />
      )}

      {step === "ilegivel" && (
        <div className="p-6 text-center space-y-4">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h3 className="text-base font-semibold">Não foi possível ler o documento</h3>
          <p className="text-sm text-muted-foreground px-2">
            {arquivosIlegiveis.length > 1
              ? `Os arquivos ${arquivosIlegiveis.join(", ")} estão ilegíveis.`
              : `O arquivo ${arquivosIlegiveis[0] ?? ""} está ilegível.`}{" "}
            Remova-o(s), tire uma nova foto ou digitalize novamente e reenvie.
          </p>
          <button
            onClick={corrigirIlegivel}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-primary-light"
          >
            <RefreshCw className="h-4 w-4" /> Corrigir arquivos
          </button>
        </div>
      )}

      {step === "conferencia_beneficiarios" && (
        <ConferenciaBeneficiarios
          arquivos={arquivosSelecionados.map((a) => ({ nome: a.file.name, documentos: a.documentos }))}
          beneficiarios={beneficiariosEscolhidos}
          competencia={competencia}
          gruposExtraidos={gruposExtraidos}
          onChangeGrupo={handleChangeGrupo}
          onVoltar={() => setStep("upload")}
          onContinuar={() => setStep("confirmar_documento")}
          nomeTitular={titularPagamento?.nome}
          justificativasDivergencia={justificativasDivergencia}
          onChangeJustificativaDivergencia={(beneficiarioId, texto) =>
            setJustificativasDivergencia((prev) => ({ ...prev, [beneficiarioId]: texto }))
          }
          operadoraDivergenteConfirmada={operadoraDivergenteConfirmada}
          onConfirmarOperadoraDivergente={(beneficiarioId) =>
            setOperadoraDivergenteConfirmada((prev) => ({ ...prev, [beneficiarioId]: true }))
          }
        />
      )}

      {step === "confirmar_documento" && (
        <div className="space-y-4">
          <ResumoPagamento
            arquivos={arquivosSelecionados.map((a) => ({ nome: a.file.name, documentos: a.documentos }))}
            beneficiarios={beneficiariosEscolhidos}
            competencia={competencia}
            isRetroativo={isRetroativo}
            justificativaAtraso={justificativaAtraso}
            gruposExtraidos={gruposExtraidos}
          />
          {/* Última confirmação do ciclo de destino antes de gravar o envio (mesma regra da etapa
              "Beneficiários" — repetida aqui para ficar visível bem antes do clique final). */}
          {competencia === competenciaAtual && (
            <div
              className={`text-sm rounded-md border px-3 py-2 ${
                direcionadoAoCicloSeguinte
                  ? "border-status-pendente-bg bg-status-pendente-bg/40 text-status-pendente-fg"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {direcionadoAoCicloSeguinte
                ? `Atenção: ${formatCompetencia(competenciaAtual)} já encerrou automaticamente — este envio será registrado no ciclo seguinte (${formatCompetencia(competenciaEfetiva)}), não na competência aberta originalmente.`
                : `Este envio será registrado em ${formatCompetencia(competenciaEfetiva)} (ciclo vigente).`}
            </div>
          )}
          <StepNav
            onPrev={() => setStep("conferencia_beneficiarios")}
            onNext={confirmarDocumento}
            nextLabel="Confirmar documento"
            isLast
          />
        </div>
      )}

      {step === "resumo_competencia" && (
        <ConsolidadoCompetencia
          // `competenciaEfetiva`: o resumo precisa refletir o ciclo em que o envio foi
          // efetivamente gravado (`confirmarDocumento`), não necessariamente a competência aberta.
          competencia={competenciaEfetiva}
          onAnexarDependente={handleAnexarDependente}
          onConcluir={handleConcluir}
          onRefresh={() => setRefreshResumoKey((k) => k + 1)}
          refreshKey={refreshResumoKey}
        />
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Stepper, StepNav } from "@/components/Stepper";
import { BeneficiarioSelector } from "@/components/BeneficiarioSelector";
import { ComprovanteUploadBox } from "@/components/ComprovanteUploadBox";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { ResumoPagamento } from "@/components/ResumoPagamento";
import {
  beneficiariosPagamento,
  comprovantes as comprovantesSeed,
  competenciaAtual,
  competenciaRetroativa,
  formatCompetencia,
  type Comprovante,
  type CampoExtraido,
} from "@/lib/mock-data";
import { arquivoEhIlegivel, gerarCamposExtraidos } from "@/lib/ocr-mock";
import { addComprovantePagamento, loadComprovantesPagamento } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/servidor/pagamentos/enviar")({
  component: EnviarComprovante,
});

type Step = "selecao" | "upload" | "processando" | "ilegivel" | "revisao" | "resumo" | "enviado";

const stepLabels = ["Beneficiários", "Documento", "Revisão", "Resumo"];

function stepIndex(step: Step): number {
  if (step === "selecao") return 0;
  if (step === "upload" || step === "processando" || step === "ilegivel") return 1;
  if (step === "revisao") return 2;
  return 3;
}

const tipoDocumentoOpcoes = [
  { value: "boleto_individual", label: "Boleto individual" },
  { value: "recibo", label: "Recibo" },
  { value: "demonstrativo", label: "Demonstrativo de pagamento" },
  { value: "fatura_tecnica", label: "Fatura técnica (múltiplos beneficiários)" },
] as const;

function EnviarComprovante() {
  const [step, setStep] = useState<Step>("selecao");
  const [tipoDocumento, setTipoDocumento] =
    useState<Comprovante["tipoDocumento"]>("boleto_individual");
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [justificativaAtraso, setJustificativaAtraso] = useState("");
  const [beneficiariosSelecionados, setBeneficiariosSelecionados] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [gruposExtraidos, setGruposExtraidos] = useState<
    { beneficiarioId: string; campos: CampoExtraido[] }[]
  >([]);
  const [dataEnvio, setDataEnvio] = useState<string | null>(null);

  const comprovantesExistentes = useMemo(
    () => [...comprovantesSeed, ...loadComprovantesPagamento()],
    [],
  );

  const isRetroativo = competencia === competenciaRetroativa;
  const beneficiariosEscolhidos = beneficiariosPagamento.filter((b) =>
    beneficiariosSelecionados.includes(b.id),
  );

  const podeAvancarSelecao =
    beneficiariosSelecionados.length > 0 && (!isRetroativo || justificativaAtraso.trim().length > 0);

  function iniciarProcessamento(file: File) {
    setArquivo(file);
    setStep("processando");
    setTimeout(() => {
      if (arquivoEhIlegivel(file.name)) {
        setStep("ilegivel");
        return;
      }
      const grupos = beneficiariosEscolhidos.map((b) => ({
        beneficiarioId: b.id,
        campos: gerarCamposExtraidos(b, competencia, file.name),
      }));
      setGruposExtraidos(grupos);
      setStep("revisao");
    }, 1200);
  }

  function reenviar() {
    setArquivo(null);
    setStep("upload");
  }

  function confirmarEnvio() {
    const primeiro = gruposExtraidos[0];
    const novoComprovante: Comprovante = {
      id: `comp-${Date.now()}`,
      arquivo: arquivo?.name ?? "documento.pdf",
      tipoDocumento,
      beneficiarioIds: beneficiariosSelecionados,
      competencia,
      isRetroativo,
      justificativaAtraso: isRetroativo ? justificativaAtraso : undefined,
      camposExtraidos: primeiro?.campos ?? [],
      gruposExtraidos: gruposExtraidos.length > 1 ? gruposExtraidos : undefined,
      status: isRetroativo ? "retroativo_aguardando_analista" : "em_analise",
      aprovacoes: [],
      dataEnvio: new Date().toISOString(),
    };
    addComprovantePagamento(novoComprovante);
    setDataEnvio(novoComprovante.dataEnvio);
    setStep("enviado");
  }

  if (step === "enviado") {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Comprovante enviado com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
            Status
          </p>
          <p className="text-lg font-bold text-status-analise-fg">
            {isRetroativo ? "Retroativo — Aguardando Analista" : "Em Análise"}
          </p>
        </div>
        {dataEnvio && (
          <p className="text-xs text-muted-foreground">
            Enviado em {new Date(dataEnvio).toLocaleString("pt-BR")}
          </p>
        )}
        <p className="text-xs text-muted-foreground italic px-2">
          A GERDAB realizará a conferência das informações e documentos enviados.
        </p>
        <div className="space-y-2 pt-2">
          <Link
            to="/servidor/pagamentos"
            className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium"
          >
            Ver histórico de pagamentos
          </Link>
          <Link
            to="/servidor/inicio"
            className="block w-full border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-1">Enviar Comprovante</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Etapa {stepIndex(step) + 1} de {stepLabels.length}
      </p>
      <Stepper steps={stepLabels} current={stepIndex(step)} />

      {step === "selecao" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de documento</label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as Comprovante["tipoDocumento"])}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            >
              {tipoDocumentoOpcoes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Competência</label>
            <select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            >
              <option value={competenciaAtual}>{formatCompetencia(competenciaAtual)} (aberta)</option>
              <option value={competenciaRetroativa}>
                {formatCompetencia(competenciaRetroativa)} (fechada — retroativo)
              </option>
            </select>
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
                placeholder="Explique o motivo do envio retroativo..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Envios retroativos passam por dupla aprovação: Analista e Gerência.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Beneficiários</label>
            <BeneficiarioSelector
              beneficiarios={beneficiariosPagamento}
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
            Envie o comprovante para {beneficiariosEscolhidos.map((b) => b.nome).join(", ")}.
          </p>
          <ComprovanteUploadBox
            arquivo={arquivo}
            onSelect={(f) => setArquivo(f)}
            onClear={() => setArquivo(null)}
          />
          <StepNav
            onPrev={() => setStep("selecao")}
            onNext={() => arquivo && iniciarProcessamento(arquivo)}
            nextLabel="Enviar para processamento"
            disabled={!arquivo}
          />
        </div>
      )}

      {step === "processando" && (
        <div className="p-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
          <p className="text-sm font-medium">Processando documento com OCR/IA...</p>
          <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
        </div>
      )}

      {step === "ilegivel" && (
        <div className="p-6 text-center space-y-4">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h3 className="text-base font-semibold">Não foi possível ler o documento</h3>
          <p className="text-sm text-muted-foreground px-2">
            O arquivo enviado está ilegível. Tire uma nova foto ou digitalize novamente e reenvie.
          </p>
          <button
            onClick={reenviar}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-primary-light"
          >
            <RefreshCw className="h-4 w-4" /> Reenviar documento
          </button>
        </div>
      )}

      {step === "revisao" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Confira os campos extraídos. Campos editados passam a ser marcados como "Preenchido manualmente".
          </p>
          {gruposExtraidos.map((grupo, idx) => {
            const beneficiario = beneficiariosEscolhidos.find((b) => b.id === grupo.beneficiarioId);
            return (
              <CamposExtraidosForm
                key={grupo.beneficiarioId}
                titulo={beneficiario?.nome}
                campos={grupo.campos}
                valorCadastrado={beneficiario?.valorCadastrado}
                onChange={(campos) =>
                  setGruposExtraidos((prev) =>
                    prev.map((g, i) => (i === idx ? { ...g, campos } : g)),
                  )
                }
              />
            );
          })}
          <StepNav onPrev={() => setStep("upload")} onNext={() => setStep("resumo")} nextLabel="Continuar" />
        </div>
      )}

      {step === "resumo" && (
        <div className="space-y-4">
          <ResumoPagamento
            arquivo={arquivo?.name ?? ""}
            beneficiarios={beneficiariosEscolhidos}
            competencia={competencia}
            isRetroativo={isRetroativo}
            justificativaAtraso={justificativaAtraso}
            gruposExtraidos={gruposExtraidos}
          />
          <StepNav
            onPrev={() => setStep("revisao")}
            onNext={confirmarEnvio}
            nextLabel="Confirmar e Enviar"
            isLast
          />
        </div>
      )}
    </div>
  );
}

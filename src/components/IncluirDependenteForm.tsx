import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Stepper, StepNav, Field, inputCls } from "@/components/Stepper";
import { UploadBox } from "@/routes/servidor.requerimento.novo-plano";
import { maskCPF, maskCurrency } from "@/lib/utils";
import {
  getCurrencyError,
  isCpfComplete,
  validationMessages,
} from "@/lib/validation";
import {
  OPERADORAS,
  TIPOS_DEPENDENTE,
  DOCUMENTOS_POR_TIPO_DEPENDENTE,
  type TipoDependente,
  calcularIdade,
  mostrarAlertaEscolaridadeDependente,
  mostrarBloqueioIdade24Dependente,
} from "@/lib/form-options";
import {
  DocumentosDependenteUploads,
  OrientacaoTipoDependente,
} from "@/components/DocumentosDependente";
import { modalidadePlanoLabels, type ModalidadePlano } from "@/lib/mock-data";

const steps = ["Dependente", "Plano", "Documentos", "Revisão"];

export type IncluirDependentePlano = {
  operadora: string;
  outraOperadora: string;
  /** Modalidade do plano do **dependente** — nunca herdada automaticamente do titular quando o
   *  plano é diferente (`mesmoPlano === "nao"`): dependente e titular podem ter operadoras,
   *  modalidades e vínculos de associação diferentes. Vocabulário compartilhado com o Módulo de
   *  Pagamento (`ModalidadePlano`, `mock-data.ts`), para uso futuro sem tradução de valores. */
  modalidade: ModalidadePlano | "";
  vigencia: string;
};

export type IncluirDependenteValue = {
  parentesco: TipoDependente;
  nome: string;
  cpf: string;
  dataNascimento: string;
  mesmoPlano: "sim" | "nao";
  valorDependente: string;
  planoDependente: IncluirDependentePlano;
  tipoLaudo: string;
};

export function IncluirDependenteForm({
  submitLabel = "Enviar Requerimento",
  onSubmit,
}: {
  submitLabel?: string;
  onSubmit: (value: IncluirDependenteValue) => void;
}) {
  const [step, setStep] = useState(0);
  const [parentesco, setParentesco] = useState<TipoDependente>("Cônjuge");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [mesmoPlano, setMesmoPlano] = useState<"sim" | "nao">("sim");
  const [valorDependente, setValorDependente] = useState("");
  const [planoDependente, setPlanoDependente] = useState<IncluirDependentePlano>({
    operadora: "",
    outraOperadora: "",
    modalidade: "",
    vigencia: "",
  });
  const [tipoLaudo, setTipoLaudo] = useState("");
  const [error, setError] = useState("");

  const selecionarMesmoPlano = (v: "sim" | "nao") => {
    setMesmoPlano(v);
    if (v === "sim") {
      setPlanoDependente({ operadora: "", outraOperadora: "", modalidade: "", vigencia: "" });
    }
  };

  const idade = useMemo(() => calcularIdade(dataNascimento), [dataNascimento]);
  const mostrarAlertaEscolaridade = step === 0 && mostrarAlertaEscolaridadeDependente(parentesco, idade);
  const mostrarBloqueioIdade = step === 0 && mostrarBloqueioIdade24Dependente(parentesco, idade);

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!nome.trim() || !dataNascimento) {
        setError(validationMessages.obrigatorios);
        return false;
      }
      if (!isCpfComplete(cpf)) {
        setError(validationMessages.cpf);
        return false;
      }
      if (mostrarBloqueioIdade) {
        setError("Dependente com 24 anos ou mais não é elegível para inclusão neste vínculo.");
        return false;
      }
      if ((parentesco === "Filho(a) com invalidez" || parentesco === "Enteado(a) com invalidez") && !tipoLaudo) {
        setError("Selecione o tipo do laudo (temporário ou definitivo).");
        return false;
      }
    }
    if (s === 1) {
      if (mesmoPlano === "nao") {
        if (!planoDependente.operadora || !planoDependente.modalidade || !planoDependente.vigencia) {
          setError(validationMessages.obrigatorios);
          return false;
        }
        if (planoDependente.operadora === "Outra" && !planoDependente.outraOperadora) {
          setError(validationMessages.obrigatorios);
          return false;
        }
      } else {
        if (!planoDependente.vigencia) {
          setError(validationMessages.obrigatorios);
          return false;
        }
      }
      const errValor = getCurrencyError(valorDependente);
      if (errValor) {
        setError(errValor);
        return false;
      }
    }
    setError("");
    return true;
  };

  const submitValue: IncluirDependenteValue = useMemo(
    () => ({
      parentesco,
      nome,
      cpf,
      dataNascimento,
      mesmoPlano,
      valorDependente,
      planoDependente,
      tipoLaudo,
    }),
    [cpf, dataNascimento, mesmoPlano, nome, parentesco, planoDependente, tipoLaudo, valorDependente],
  );

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < steps.length - 1) setStep(step + 1);
    else onSubmit(submitValue);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Etapa {step + 1} de {steps.length}</p>
      <Stepper steps={steps} current={step} />

      {error && (
        <div className="mb-3 bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <Field label="Nome completo" required>
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="CPF" required>
            <input
              className={inputCls}
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
            />
          </Field>
          <Field label="Data de nascimento" required>
            <input
              type="date"
              className={inputCls}
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </Field>
          <Field label="Tipo de dependente" required>
            <select
              className={inputCls}
              value={parentesco}
              onChange={(e) => setParentesco(e.target.value as TipoDependente)}
            >
              {TIPOS_DEPENDENTE.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          {(parentesco === "Filho(a) com invalidez" || parentesco === "Enteado(a) com invalidez") && (
            <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3">
              <Field label="O laudo médico é temporário ou definitivo?" required>
                <select className={inputCls} value={tipoLaudo} onChange={(e) => setTipoLaudo(e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="Temporário">Temporário</option>
                  <option value="Definitivo">Definitivo</option>
                </select>
              </Field>
              {tipoLaudo === "Temporário" && (
                <div className="bg-amber-50 text-amber-800 text-[10px] p-2 rounded border border-amber-200">
                  <strong>Atenção:</strong> Como o laudo é temporário, o sistema solicitará o envio de um novo laudo atualizado a cada 24 meses. Será gerado um alerta antes do vencimento.
                </div>
              )}
            </div>
          )}

          <OrientacaoTipoDependente tipo={parentesco} />

          {mostrarAlertaEscolaridade && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Atenção — Regra de escolaridade:</p>
              <p>
                Ao completar 21 anos, o dependente deverá apresentar comprovante de matrícula no início de cada semestre (março e agosto), até completar 24 anos.
              </p>
              <p className="mt-1 font-semibold">
                Ao completar 24 anos, ocorrerá a inabilitação automática do dependente.
              </p>
            </div>
          )}

          {mostrarBloqueioIdade && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
              <p className="font-semibold mb-1">Inabilidade por idade:</p>
              <p>
                Dependentes (filhos ou enteados) com 24 anos ou mais não são elegíveis para o benefício.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <Field label="Está no mesmo plano do titular?" required>
            <div className="flex gap-2">
              {(["sim", "nao"] as const).map((v) => (
                <label
                  key={v}
                  className={`flex-1 border rounded-md py-2 text-center text-sm cursor-pointer ${
                    mesmoPlano === v
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="mesmoplano"
                    className="hidden"
                    checked={mesmoPlano === v}
                    onChange={() => selecionarMesmoPlano(v)}
                  />
                  {v === "sim" ? "Sim" : "Não"}
                </label>
              ))}
            </div>
          </Field>

          {mesmoPlano === "sim" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Valor do dependente no plano" required>
                  <input
                    className={inputCls}
                    placeholder="R$ 0,00"
                    value={valorDependente}
                    onChange={(e) => setValorDependente(maskCurrency(e.target.value))}
                  />
                </Field>
                <Field label="Data da Vigência" required>
                  <input
                    type="date"
                    className={inputCls}
                    value={planoDependente.vigencia}
                    onChange={(e) => setPlanoDependente({ ...planoDependente, vigencia: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Comprovante de inclusão no plano" required>
                <UploadBox />
              </Field>
            </>
          ) : (
            <>
              <Field label="Operadora do plano do dependente" required>
                <select
                  className={inputCls}
                  value={planoDependente.operadora}
                  onChange={(e) =>
                    setPlanoDependente({ ...planoDependente, operadora: e.target.value })
                  }
                >
                  <option value="">Selecione a operadora</option>
                  {OPERADORAS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                  <option value="Outra">Outra</option>
                </select>
              </Field>
              {planoDependente.operadora === "Outra" && (
                <Field label="Digite o nome da operadora" required>
                  <input className={inputCls} value={planoDependente.outraOperadora} onChange={e => setPlanoDependente({ ...planoDependente, outraOperadora: e.target.value })} />
                </Field>
              )}
              <Field label="Modalidade do plano do dependente" required>
                <select
                  className={inputCls}
                  value={planoDependente.modalidade}
                  onChange={(e) =>
                    setPlanoDependente({ ...planoDependente, modalidade: e.target.value as ModalidadePlano })
                  }
                >
                  <option value="">Selecione a modalidade</option>
                  <option value="individual_familiar">{modalidadePlanoLabels.individual_familiar}</option>
                  <option value="empresarial">{modalidadePlanoLabels.empresarial}</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Valor individual do plano do dependente" required>
                  <input
                    className={inputCls}
                    placeholder="R$ 0,00"
                    value={valorDependente}
                    onChange={(e) => setValorDependente(maskCurrency(e.target.value))}
                  />
                </Field>
                <Field label="Data da Vigência" required>
                  <input
                    type="date"
                    className={inputCls}
                    value={planoDependente.vigencia}
                    onChange={(e) => setPlanoDependente({ ...planoDependente, vigencia: e.target.value })}
                  />
                </Field>
              </div>
              <Field
                label="Documento da entidade contratada / contrato ou declaração de permanência do plano do dependente"
                required
              >
                <UploadBox />
              </Field>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Documentos obrigatórios para <strong>{parentesco}</strong>:
          </p>
          <DocumentosDependenteUploads tipo={parentesco} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-muted rounded-xl p-4 text-sm space-y-2">
            <Row k="Nome" v={nome || "—"} />
            <Row k="Tipo de dependente" v={parentesco} />
            <Row k="Plano" v={mesmoPlano === "sim" ? "Mesmo do titular" : "Plano diferente do titular"} />
            {mesmoPlano === "nao" && (
              <Row
                k="Modalidade do plano do dependente"
                v={planoDependente.modalidade ? modalidadePlanoLabels[planoDependente.modalidade] : "—"}
              />
            )}
            <Row k="Documentos" v={`${DOCUMENTOS_POR_TIPO_DEPENDENTE[parentesco].length} anexos`} />
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" defaultChecked />
              <span>Declaro que o(s) dependente(s) informado(s) não recebe(m) nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" defaultChecked />
              <span>Declaro que sou responsável pelo pagamento das despesas do plano de saúde do(s) beneficiário(s) dependente(s), ainda que o dependente seja o titular do contrato no plano apresentado.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" defaultChecked />
              <span>Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras.</span>
            </label>
          </div>
        </div>
      )}

      <StepNav
        onPrev={step > 0 ? () => { setError(""); setStep(step - 1); } : undefined}
        onNext={handleNext}
        nextLabel={step === steps.length - 1 ? submitLabel : "Próximo"}
        isLast={step === steps.length - 1}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}


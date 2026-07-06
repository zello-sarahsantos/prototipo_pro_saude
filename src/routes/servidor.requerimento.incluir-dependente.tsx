import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Stepper, StepNav, Field, inputCls } from "@/components/Stepper";
import { UploadBox } from "./servidor.requerimento.novo-plano";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { maskCPF, maskCurrency } from "@/lib/utils";
import {
  isCpfComplete,
  getCurrencyError,
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
  OrientacaoTipoDependente,
  DocumentosDependenteUploads,
} from "@/components/DocumentosDependente";

export const Route = createFileRoute("/servidor/requerimento/incluir-dependente")({
  component: IncluirDep,
});

const steps = ["Dependente", "Plano", "Documentos", "Revisão"];

function IncluirDep() {
  const [step, setStep] = useState(0);
  const [parentesco, setParentesco] = useState<TipoDependente>("Cônjuge");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [mesmoPlano, setMesmoPlano] = useState<"sim" | "nao">("sim");
  const [valorDependente, setValorDependente] = useState("");
  const [planoDependente, setPlanoDependente] = useState({
    operadora: "",
    outraOperadora: "",
    modalidade: "",
    vigencia: "",
  });
  const [tipoLaudo, setTipoLaudo] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const selecionarMesmoPlano = (v: "sim" | "nao") => {
    setMesmoPlano(v);
    if (v === "sim") {
      setPlanoDependente({ operadora: "", outraOperadora: "", modalidade: "", vigencia: "" });
    }
  };

  const idade = calcularIdade(dataNascimento);
  const mostrarAlertaEscolaridade =
    step === 0 && mostrarAlertaEscolaridadeDependente(parentesco, idade);
  const mostrarBloqueioIdade =
    step === 0 && mostrarBloqueioIdade24Dependente(parentesco, idade);

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
        if (!planoDependente.operadora || !planoDependente.modalidade.trim() || !planoDependente.vigencia) {
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

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < steps.length - 1) setStep(step + 1);
    else setDone(true);
  };

  if (done) {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
          <p className="text-lg font-bold text-status-analise-fg">Em análise</p>
        </div>
        <p className="text-xs text-muted-foreground italic px-2">
          A GERDAB realizará a conferência das informações e documentos enviados.
        </p>
        <Link to="/servidor/dependentes" className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2">
          Ver meus dependentes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-1">Inclusão de Dependente</h2>
      <p className="text-xs text-muted-foreground mb-4">Etapa {step + 1} de {steps.length}</p>
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
                    onChange={e => setPlanoDependente({...planoDependente, vigencia: e.target.value})} 
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
                  <input className={inputCls} value={planoDependente.outraOperadora} onChange={e => setPlanoDependente({...planoDependente, outraOperadora: e.target.value})} />
                </Field>
              )}
              <Field label="Modalidade/tipo do plano" required>
                <input
                  className={inputCls}
                  placeholder="Ex: Coletivo Empresarial"
                  value={planoDependente.modalidade}
                  onChange={(e) =>
                    setPlanoDependente({ ...planoDependente, modalidade: e.target.value })
                  }
                />
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
                    onChange={e => setPlanoDependente({...planoDependente, vigencia: e.target.value})} 
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
        nextLabel={step === steps.length - 1 ? "Enviar Requerimento" : "Próximo"}
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

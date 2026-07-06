import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link, U as UploadBox } from "./router-Btr6HUAC.js";
import { S as Stepper, F as Field, i as inputCls, a as StepNav } from "./Stepper-CtlJM4Ft.js";
import { b as maskCPF, c as maskCurrency } from "./utils-BB8mpi5a.js";
import { O as OrientacaoTipoDependente, a as DocumentosDependenteUploads, v as validationMessages, i as isCpfComplete, g as getCurrencyError } from "./DocumentosDependente-8laKcXvq.js";
import { c as calcularIdade, m as mostrarAlertaEscolaridadeDependente, a as mostrarBloqueioIdade24Dependente, T as TIPOS_DEPENDENTE, O as OPERADORAS, D as DOCUMENTOS_POR_TIPO_DEPENDENTE } from "./form-options-CM1uU9Xo.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import { T as TriangleAlert } from "./triangle-alert-htGW9gin.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const steps = ["Dependente", "Plano", "Documentos", "Revisão"];
function IncluirDep() {
  const [step, setStep] = reactExports.useState(0);
  const [parentesco, setParentesco] = reactExports.useState("Cônjuge");
  const [nome, setNome] = reactExports.useState("");
  const [cpf, setCpf] = reactExports.useState("");
  const [dataNascimento, setDataNascimento] = reactExports.useState("");
  const [mesmoPlano, setMesmoPlano] = reactExports.useState("sim");
  const [valorDependente, setValorDependente] = reactExports.useState("");
  const [planoDependente, setPlanoDependente] = reactExports.useState({
    operadora: "",
    outraOperadora: "",
    modalidade: "",
    vigencia: ""
  });
  const [tipoLaudo, setTipoLaudo] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const [done, setDone] = reactExports.useState(false);
  const selecionarMesmoPlano = (v) => {
    setMesmoPlano(v);
    if (v === "sim") {
      setPlanoDependente({
        operadora: "",
        outraOperadora: "",
        modalidade: "",
        vigencia: ""
      });
    }
  };
  const idade = calcularIdade(dataNascimento);
  const mostrarAlertaEscolaridade = step === 0 && mostrarAlertaEscolaridadeDependente(parentesco, idade);
  const mostrarBloqueioIdade = step === 0 && mostrarBloqueioIdade24Dependente(parentesco, idade);
  const validateStep = (s) => {
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
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-16 w-16 text-success mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Solicitação enviada com sucesso!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg py-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold text-status-analise-fg", children: "Em análise" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground italic px-2", children: "A GERDAB realizará a conferência das informações e documentos enviados." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/dependentes", className: "block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2", children: "Ver meus dependentes" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-1", children: "Inclusão de Dependente" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mb-4", children: [
      "Etapa ",
      step + 1,
      " de ",
      steps.length
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { steps, current: step }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4 shrink-0" }),
      error
    ] }),
    step === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: nome, onChange: (e) => setNome(e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "000.000.000-00", value: cpf, onChange: (e) => setCpf(maskCPF(e.target.value)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data de nascimento", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: dataNascimento, onChange: (e) => setDataNascimento(e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo de dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: inputCls, value: parentesco, onChange: (e) => setParentesco(e.target.value), children: TIPOS_DEPENDENTE.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t)) }) }),
      (parentesco === "Filho(a) com invalidez" || parentesco === "Enteado(a) com invalidez") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/30 p-3 rounded-lg border border-border space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "O laudo médico é temporário ou definitivo?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: tipoLaudo, onChange: (e) => setTipoLaudo(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Temporário", children: "Temporário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Definitivo", children: "Definitivo" })
        ] }) }),
        tipoLaudo === "Temporário" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 text-amber-800 text-[10px] p-2 rounded border border-amber-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Atenção:" }),
          " Como o laudo é temporário, o sistema solicitará o envio de um novo laudo atualizado a cada 24 meses. Será gerado um alerta antes do vencimento."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(OrientacaoTipoDependente, { tipo: parentesco }),
      mostrarAlertaEscolaridade && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Atenção — Regra de escolaridade:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Ao completar 21 anos, o dependente deverá apresentar comprovante de matrícula no início de cada semestre (março e agosto), até completar 24 anos." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold", children: "Ao completar 24 anos, ocorrerá a inabilitação automática do dependente." })
      ] }),
      mostrarBloqueioIdade && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Inabilidade por idade:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Dependentes (filhos ou enteados) com 24 anos ou mais não são elegíveis para o benefício." })
      ] })
    ] }),
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Está no mesmo plano do titular?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: ["sim", "nao"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex-1 border rounded-md py-2 text-center text-sm cursor-pointer ${mesmoPlano === v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "mesmoplano", className: "hidden", checked: mesmoPlano === v, onChange: () => selecionarMesmoPlano(v) }),
        v === "sim" ? "Sim" : "Não"
      ] }, v)) }) }),
      mesmoPlano === "sim" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor do dependente no plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "R$ 0,00", value: valorDependente, onChange: (e) => setValorDependente(maskCurrency(e.target.value)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da Vigência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: planoDependente.vigencia, onChange: (e) => setPlanoDependente({
            ...planoDependente,
            vigencia: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Comprovante de inclusão no plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Operadora do plano do dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: planoDependente.operadora, onChange: (e) => setPlanoDependente({
          ...planoDependente,
          operadora: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a operadora" }),
          OPERADORAS.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op, children: op }, op)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outra", children: "Outra" })
        ] }) }),
        planoDependente.operadora === "Outra" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Digite o nome da operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: planoDependente.outraOperadora, onChange: (e) => setPlanoDependente({
          ...planoDependente,
          outraOperadora: e.target.value
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Modalidade/tipo do plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "Ex: Coletivo Empresarial", value: planoDependente.modalidade, onChange: (e) => setPlanoDependente({
          ...planoDependente,
          modalidade: e.target.value
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor individual do plano do dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "R$ 0,00", value: valorDependente, onChange: (e) => setValorDependente(maskCurrency(e.target.value)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da Vigência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: planoDependente.vigencia, onChange: (e) => setPlanoDependente({
            ...planoDependente,
            vigencia: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Documento da entidade contratada / contrato ou declaração de permanência do plano do dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) })
      ] })
    ] }),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "Documentos obrigatórios para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: parentesco }),
        ":"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentosDependenteUploads, { tipo: parentesco })
    ] }),
    step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-xl p-4 text-sm space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Nome", v: nome || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Tipo de dependente", v: parentesco }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Plano", v: mesmoPlano === "sim" ? "Mesmo do titular" : "Plano diferente do titular" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Documentos", v: `${DOCUMENTOS_POR_TIPO_DEPENDENTE[parentesco].length} anexos` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que o(s) dependente(s) informado(s) não recebe(m) nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que sou responsável pelo pagamento das despesas do plano de saúde do(s) beneficiário(s) dependente(s), ainda que o dependente seja o titular do contrato no plano apresentado." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras." })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StepNav, { onPrev: step > 0 ? () => {
      setError("");
      setStep(step - 1);
    } : void 0, onNext: handleNext, nextLabel: step === steps.length - 1 ? "Enviar Requerimento" : "Próximo", isLast: step === steps.length - 1 })
  ] });
}
function Row({
  k,
  v
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-right", children: v })
  ] });
}
export {
  IncluirDep as component
};

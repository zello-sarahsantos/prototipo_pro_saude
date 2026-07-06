import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, U as UploadBox, L as Link } from "./router-Btr6HUAC.js";
import { F as Field, i as inputCls } from "./Stepper-CtlJM4Ft.js";
import { f as formatCurrency, b as baseImportadaGerdab } from "./mock-data-CAjhD170.js";
import { m as maskMatricula, a as maskRG, b as maskCPF, c as maskCurrency } from "./utils-BB8mpi5a.js";
import { p as parseCurrency, D as DocumentosDependenteLista, a as DocumentosDependenteUploads, v as validationMessages, i as isCpfComplete, g as getCurrencyError } from "./DocumentosDependente-8laKcXvq.js";
import { c as calcularIdade, m as mostrarAlertaEscolaridadeDependente, a as mostrarBloqueioIdade24Dependente, C as CARGOS_SERVIDOR, S as SITUACOES_TITULAR, O as OPERADORAS, T as TIPOS_DEPENDENTE } from "./form-options-CM1uU9Xo.js";
import { T as TriangleAlert } from "./triangle-alert-htGW9gin.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import { X } from "./x-DChqQA7u.js";
import { F as FileText } from "./file-text-CTAMIDRg.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import { S as ShieldCheck } from "./shield-check-sQZFp6Kk.js";
import { S as Search } from "./search-PqmaaW7D.js";
import { I as Info } from "./info-CiBF30ja.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
const Pencil = createLucideIcon("pencil", __iconNode);
function PrimeiroAcesso() {
  const [flow, setFlow] = reactExports.useState(null);
  const [done, setDone] = reactExports.useState(false);
  if (done) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-sm bg-card rounded-2xl p-8 shadow-elevated text-center space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-14 w-14 text-success mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Solicitação enviada com sucesso!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: flow === "ativacao" ? "Sua solicitação de ativação de acesso foi encaminhada à GERDAB." : "Seu requerimento de inclusão inicial foi encaminhado à GERDAB." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg py-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold text-status-analise-fg", children: "Em análise" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground italic px-2", children: "A GERDAB realizará a conferência das informações e documentos enviados." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2", children: "Voltar ao login" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-6 text-primary-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-10 w-10 mx-auto mb-2 opacity-90" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold", children: "Pró-Saúde — Primeiro Acesso" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm opacity-75", children: "Ativação de acesso ou solicitação de inclusão" })
    ] }),
    !flow ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl p-6 shadow-elevated space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold text-center mb-2", children: "Você já recebe o auxílio Pró-Saúde?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setFlow("inclusao"), className: "flex flex-col items-start p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition text-left group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-sm group-hover:text-primary", children: "Não, ainda não recebo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground mt-1", children: "Quero solicitar minha inclusão no programa Pró-Saúde pela primeira vez." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "block text-center text-xs text-muted-foreground hover:underline", children: "Voltar ao login" }) })
    ] }) : flow === "ativacao" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FlowAtivacao, { onCancel: () => setFlow(null), onDone: () => setDone(true) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FlowInclusao, { onCancel: () => setFlow(null), onDone: () => setDone(true) })
  ] }) });
}
function FlowAtivacao({
  onCancel,
  onDone
}) {
  const [step, setStep] = reactExports.useState(0);
  const [cpf, setCpf] = reactExports.useState("");
  const [matricula, setMatricula] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [dadosEncontrados, setDadosEncontrados] = reactExports.useState(null);
  const [error, setError] = reactExports.useState("");
  const handleBuscar = () => {
    if (!isCpfComplete(cpf)) {
      setError(validationMessages.cpf);
      return;
    }
    if (!matricula) {
      setError(validationMessages.matricula);
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const found = baseImportadaGerdab.find((s) => s.cpf === cpf) || baseImportadaGerdab[0];
      setDadosEncontrados(found);
      setLoading(false);
      setStep(1);
    }, 1200);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl p-6 shadow-elevated space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-bold flex items-center gap-2 border-b border-border pb-3", children: "Ativação de acesso ao sistema" }),
    step === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Informe seus dados para localizarmos seu cadastro na base importada da GERDAB." }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" }),
        error
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "000.000.000-00", value: cpf, onChange: (e) => setCpf(maskCPF(e.target.value)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Matrícula", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "12345678", value: matricula, onChange: (e) => setMatricula(maskMatricula(e.target.value)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onCancel, className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleBuscar, disabled: loading, className: "flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2", children: loading ? "Buscando..." : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4" }),
          " Buscar Cadastro"
        ] }) })
      ] })
    ] }),
    step === 1 && dadosEncontrados && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800 flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-4 w-4 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Como você já consta como beneficiário do Pró-Saúde, os documentos de inclusão já entregues anteriormente não serão solicitados novamente neste primeiro acesso." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/50 rounded-xl p-4 space-y-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase mb-2", children: "Dados Encontrados" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Nome", v: dadosEncontrados.nome }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Matrícula", v: dadosEncontrados.matricula }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Situação", v: "Já beneficiário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Operadora", v: dadosEncontrados.operadora }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Plano", v: dadosEncontrados.tipoPlano }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Valor Titular", v: formatCurrency(dadosEncontrados.valorTitular) }),
        dadosEncontrados.dependentes.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 mt-2 border-t border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase mb-1", children: "Dependentes" }),
          dadosEncontrados.dependentes.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: d.nome, v: `${d.parentesco} (${formatCurrency(d.valor)})` }, i))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Confirmar e-mail de contato", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "seu-email@detran.df.gov.br" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que conferi os dados importados do meu cadastro no Pró-Saúde e que as informações apresentadas estão corretas, ou sinalizei as divergências necessárias para análise da GERDAB." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStep(0), className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted", children: "Voltar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onDone, className: "flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium", children: "Confirmar Ativação" })
      ] })
    ] })
  ] });
}
function FlowInclusao({
  onCancel,
  onDone,
  isAssociacao
}) {
  const [step, setStep] = reactExports.useState(0);
  const [deps, setDeps] = reactExports.useState([]);
  const [showDepForm, setShowDepForm] = reactExports.useState(false);
  const [editingIndex, setEditingIndex] = reactExports.useState(null);
  const [valorTitular, setValorTitular] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const [titular, setTitular] = reactExports.useState({
    nome: "",
    matricula: "",
    nascimento: "",
    cargo: "",
    lotacao: "",
    situacao: "",
    rg: "",
    orgao: "",
    cpf: "",
    email: "",
    telefoneCelular: "",
    telefoneSetor: "",
    telefoneResidencial: "",
    dataAdmissao: "",
    endereco: ""
  });
  const [plano, setPlano] = reactExports.useState({
    operadora: "",
    outraOperadora: "",
    administradora: "",
    proposta: "",
    modalidade: "",
    vigencia: ""
  });
  const isPensionista = titular.situacao.startsWith("Titular de pensão");
  const isInativo = titular.situacao === "Servidor inativo";
  const isAtivo = titular.situacao === "Servidor efetivo ativo" || titular.situacao === "Servidor comissionado";
  const steps = isPensionista ? ["Titular", "Plano", "Docs", "Final"] : ["Titular", "Plano", "Dependentes", "Docs", "Final"];
  const currentStepName = steps[step];
  const handleNext = () => {
    if (currentStepName === "Titular") {
      if (!titular.nome || !titular.matricula || !titular.nascimento || !titular.cpf || !titular.email || !titular.rg || !titular.orgao || !titular.situacao || !titular.endereco || !titular.telefoneCelular) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (isAtivo && !titular.dataAdmissao) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !isInativo && !titular.cargo) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !titular.lotacao) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !isInativo && !titular.telefoneSetor) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isCpfComplete(titular.cpf)) {
        setError(validationMessages.cpf);
        return;
      }
    }
    if (currentStepName === "Plano") {
      if (!plano.operadora || !plano.modalidade || !plano.vigencia || !valorTitular) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (plano.operadora === "Outra" && !plano.outraOperadora) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (plano.operadora !== "ASSEFAZ / OUTRO CONVÊNIO" && !plano.administradora) {
        setError(validationMessages.obrigatorios);
        return;
      }
      const errValor = getCurrencyError(valorTitular);
      if (errValor) {
        setError(errValor);
        return;
      }
    }
    if (currentStepName === "Dependentes" && showDepForm) {
      setError("Salve ou cancele o formulário do dependente antes de continuar.");
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const [newDep, setNewDep] = reactExports.useState({
    nome: "",
    cpf: "",
    dataNascimento: "",
    parentesco: "Cônjuge",
    valor: "",
    mesmoPlano: "Sim"
  });
  const addDep = () => {
    if (!newDep.nome || !newDep.cpf || !newDep.dataNascimento || !newDep.parentesco) {
      setError(validationMessages.obrigatorios);
      return;
    }
    if (mostrarBloqueioIdade24Dependente(newDep.parentesco, calcularIdade(newDep.dataNascimento))) {
      setError("Dependente com 24 anos ou mais não é elegível para inclusão neste vínculo.");
      return;
    }
    if (!isCpfComplete(newDep.cpf)) {
      setError(validationMessages.cpf);
      return;
    }
    const errDepValor = getCurrencyError(newDep.valor);
    if (errDepValor) {
      setError(errDepValor);
      return;
    }
    if (newDep.mesmoPlano === "Não") {
      if (!newDep.operadora || !newDep.modalidade || !newDep.vigencia) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (newDep.operadora === "Outra" && !newDep.outraOperadora) {
        setError(validationMessages.obrigatorios);
        return;
      }
    }
    if ((newDep.parentesco === "Filho(a) com invalidez" || newDep.parentesco === "Enteado(a) com invalidez") && !newDep.tipoLaudo) {
      setError("Selecione o tipo do laudo (temporário ou definitivo).");
      return;
    }
    setError("");
    if (newDep.nome && newDep.cpf) {
      if (editingIndex !== null) {
        const updatedDeps = [...deps];
        updatedDeps[editingIndex] = newDep;
        setDeps(updatedDeps);
      } else {
        setDeps([...deps, newDep]);
      }
      setNewDep({
        nome: "",
        cpf: "",
        dataNascimento: "",
        parentesco: "Cônjuge",
        valor: "",
        mesmoPlano: "Sim"
      });
      setShowDepForm(false);
      setEditingIndex(null);
    }
  };
  const handleEditDep = (index) => {
    setNewDep(deps[index]);
    setEditingIndex(index);
    setShowDepForm(true);
  };
  const totalDepsValue = deps.reduce((acc, curr) => acc + parseCurrency(curr.valor), 0);
  const valorTitularNum = parseCurrency(valorTitular);
  const valorTotalGrupo = valorTitularNum + totalDepsValue;
  const renderResumoValores = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Valor do titular:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: formatCurrency(valorTitularNum) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Total dos dependentes:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: formatCurrency(totalDepsValue) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 border-t border-slate-200 flex justify-between text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "Total do grupo familiar:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-primary", children: formatCurrency(valorTotalGrupo) })
    ] })
  ] });
  const idadeNovoDep = calcularIdade(newDep.dataNascimento);
  const alertaEscolaridadeDep = showDepForm && mostrarAlertaEscolaridadeDependente(newDep.parentesco, idadeNovoDep);
  const bloqueioIdadeDep = showDepForm && mostrarBloqueioIdade24Dependente(newDep.parentesco, idadeNovoDep);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl p-6 shadow-elevated space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-bold border-b border-border pb-3", children: "Solicitação inicial de inclusão no Pró-Saúde" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between text-[10px] mb-2", children: steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 flex-1 relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-5 w-5 rounded-full flex items-center justify-center font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: i + 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: i <= step ? "text-primary font-bold" : "text-muted-foreground", children: s })
    ] }, s)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[60vh] overflow-y-auto px-1 space-y-4", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" }),
        error
      ] }),
      currentStepName === "Titular" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.nome, onChange: (e) => setTitular({
          ...titular,
          nome: e.target.value
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Matrícula", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.matricula, onChange: (e) => setTitular({
            ...titular,
            matricula: maskMatricula(e.target.value)
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data de nascimento", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: titular.nascimento, onChange: (e) => setTitular({
            ...titular,
            nascimento: e.target.value
          }) }) })
        ] }),
        (!isPensionista || !isInativo) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          !isPensionista && !isInativo && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Cargo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: titular.cargo, onChange: (e) => setTitular({
            ...titular,
            cargo: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione o cargo" }),
            CARGOS_SERVIDOR.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c))
          ] }) }),
          !isPensionista && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Lotação", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.lotacao, onChange: (e) => setTitular({
            ...titular,
            lotacao: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data de Admissão", required: isAtivo, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: titular.dataAdmissao, onChange: (e) => setTitular({
            ...titular,
            dataAdmissao: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone Celular", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "(00) 00000-0000", value: titular.telefoneCelular, onChange: (e) => setTitular({
            ...titular,
            telefoneCelular: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone Residencial", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "(00) 0000-0000", value: titular.telefoneResidencial, onChange: (e) => setTitular({
            ...titular,
            telefoneResidencial: e.target.value
          }) }) }),
          !isPensionista && !isInativo && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone do Setor", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "(00) 0000-0000", value: titular.telefoneSetor, onChange: (e) => setTitular({
            ...titular,
            telefoneSetor: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Situação do beneficiário titular", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: titular.situacao, onChange: (e) => setTitular({
          ...titular,
          situacao: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a situação" }),
          SITUACOES_TITULAR.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s }, s))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "RG", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.rg, onChange: (e) => setTitular({
            ...titular,
            rg: maskRG(e.target.value)
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Órgão Exped.", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.orgao, onChange: (e) => setTitular({
            ...titular,
            orgao: e.target.value.toUpperCase()
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.cpf, onChange: (e) => setTitular({
            ...titular,
            cpf: maskCPF(e.target.value)
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "E-mail", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", className: inputCls, value: titular.email, onChange: (e) => setTitular({
          ...titular,
          email: e.target.value
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Endereço completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: titular.endereco, onChange: (e) => setTitular({
          ...titular,
          endereco: e.target.value
        }) }) })
      ] }),
      currentStepName === "Plano" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: plano.operadora, onChange: (e) => setPlano({
            ...plano,
            operadora: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a operadora" }),
            OPERADORAS.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op, children: op }, op)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outra", children: "Outra" })
          ] }) }),
          plano.operadora === "Outra" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Digite o nome da operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: plano.outraOperadora, onChange: (e) => setPlano({
            ...plano,
            outraOperadora: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Modalidade do Plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "Ex: Coletivo Empresarial", value: plano.modalidade, onChange: (e) => setPlano({
            ...plano,
            modalidade: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Administradora", required: plano.operadora !== "ASSEFAZ / OUTRO CONVÊNIO", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "Nome da administradora", value: plano.administradora, onChange: (e) => setPlano({
            ...plano,
            administradora: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor Titular (R$)", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "R$ 0,00", value: valorTitular, onChange: (e) => setValorTitular(maskCurrency(e.target.value)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da Vigência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: plano.vigencia, onChange: (e) => setPlano({
            ...plano,
            vigencia: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Número da Proposta / Contrato", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: plano.proposta, onChange: (e) => setPlano({
          ...plano,
          proposta: e.target.value
        }) }) }) })
      ] }),
      currentStepName === "Dependentes" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold", children: [
            "Dependentes (",
            deps.length,
            ")"
          ] }),
          !showDepForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setEditingIndex(null);
            setNewDep({
              nome: "",
              cpf: "",
              dataNascimento: "",
              parentesco: "Cônjuge",
              valor: ""
            });
            setShowDepForm(true);
          }, className: "text-xs text-primary font-bold flex items-center gap-1 hover:underline", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-3 w-3" }),
            " Adicionar"
          ] })
        ] }),
        showDepForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3 relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setShowDepForm(false);
            setEditingIndex(null);
          }, className: "absolute top-2 right-2 text-muted-foreground hover:text-foreground", "aria-label": "Fechar", title: "Fechar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold uppercase text-primary mb-2", children: editingIndex !== null ? "Editar Dependente" : "Novo Dependente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: newDep.nome, onChange: (e) => setNewDep({
            ...newDep,
            nome: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "000.000.000-00", value: newDep.cpf, onChange: (e) => setNewDep({
              ...newDep,
              cpf: maskCPF(e.target.value)
            }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nascimento", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: newDep.dataNascimento, onChange: (e) => setNewDep({
              ...newDep,
              dataNascimento: e.target.value
            }) }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo de dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: newDep.parentesco, onChange: (e) => setNewDep({
            ...newDep,
            parentesco: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione o tipo de dependente" }),
            TIPOS_DEPENDENTE.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t))
          ] }) }),
          (newDep.parentesco === "Filho(a) com invalidez" || newDep.parentesco === "Enteado(a) com invalidez") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/30 p-3 rounded-lg border border-border space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "O laudo médico é temporário ou definitivo?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: newDep.tipoLaudo || "", onChange: (e) => setNewDep({
              ...newDep,
              tipoLaudo: e.target.value
            }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Temporário", children: "Temporário" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Definitivo", children: "Definitivo" })
            ] }) }),
            newDep.tipoLaudo === "Temporário" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 text-amber-800 text-[10px] p-2 rounded border border-amber-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Atenção:" }),
              " Como o laudo é temporário, o sistema solicitará o envio de um novo laudo atualizado a cada 24 meses. Será gerado um alerta antes do vencimento."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Está no mesmo plano do titular?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4 mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "mesmoPlano", value: "Sim", checked: newDep.mesmoPlano === "Sim", onChange: () => setNewDep({
                ...newDep,
                mesmoPlano: "Sim"
              }) }),
              " Sim"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "mesmoPlano", value: "Não", checked: newDep.mesmoPlano === "Não", onChange: () => setNewDep({
                ...newDep,
                mesmoPlano: "Não"
              }) }),
              " Não"
            ] })
          ] }) }),
          newDep.mesmoPlano === "Não" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/30 p-3 rounded-lg border border-border space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: newDep.operadora || "", onChange: (e) => setNewDep({
              ...newDep,
              operadora: e.target.value
            }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a operadora" }),
              OPERADORAS.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op, children: op }, op)),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outra", children: "Outra" })
            ] }) }),
            newDep.operadora === "Outra" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Digite o nome da operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: newDep.outraOperadora || "", onChange: (e) => setNewDep({
              ...newDep,
              outraOperadora: e.target.value
            }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Modalidade do Plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "Ex: Coletivo Empresarial", value: newDep.modalidade || "", onChange: (e) => setNewDep({
              ...newDep,
              modalidade: e.target.value
            }) }) })
          ] }),
          newDep.parentesco && /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentosDependenteLista, { tipo: newDep.parentesco }),
          alertaEscolaridadeDep && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Atenção — Regra de escolaridade:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Ao completar 21 anos, o dependente deverá apresentar comprovante de matrícula no início de cada semestre (março e agosto), até completar 24 anos." })
          ] }),
          bloqueioIdadeDep && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-[10px] text-destructive", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Inabilidade por idade:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Dependentes com 24 anos ou mais não são elegíveis para este vínculo." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor no plano (R$)", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "R$ 0,00", value: newDep.valor, onChange: (e) => setNewDep({
              ...newDep,
              valor: maskCurrency(e.target.value)
            }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da Vigência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: newDep.vigencia || "", onChange: (e) => setNewDep({
              ...newDep,
              vigencia: e.target.value
            }) }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: addDep, className: "w-full bg-primary text-primary-foreground rounded-md py-2 text-xs font-bold mt-2", children: editingIndex !== null ? "Salvar Alterações" : "Salvar Dependente" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: deps.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-6 border-2 border-dashed border-border rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhum dependente adicionado." }) }) : deps.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold truncate", children: d.nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
              d.parentesco,
              " • ",
              formatCurrency(parseCurrency(d.valor))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleEditDep(i), className: "p-1.5 text-muted-foreground hover:text-primary transition-colors", "aria-label": "Editar dependente", title: "Editar dependente", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDeps(deps.filter((_, idx) => idx !== i)), className: "text-muted-foreground hover:text-destructive", "aria-label": "Remover dependente", title: "Remover dependente", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
          ] })
        ] }, i)) }),
        renderResumoValores()
      ] }),
      currentStepName === "Docs" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Anexe a documentação necessária:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Os documentos dos dependentes adicionados também devem ser incluídos aqui." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          isAssociacao && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase", children: "Documentos da Associação" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Requerimento de Inclusão no Pró-Saúde já assinado pelo beneficiário", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) })
          ] }),
          plano.operadora === "ASSEFAZ / OUTRO CONVÊNIO" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Inclusão pela associação (ASSEFAZ / OUTROS):" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Não é necessário o envio de comprovantes neste momento. A associação será a responsável pelo envio das documentações junto à GERDAB." })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase", children: "Documentos do Titular" }),
            isPensionista && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Publicação de Pensão Vitalícia (ou documento equivalente)", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Documento da entidade contratada / contrato do plano", required: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 bg-muted/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground mb-1 italic", children: "O documento deve conter:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc ml-4 grid grid-cols-1 gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Condição de beneficiário titular; Indicação dos dependentes;" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Tipos de cobertura; Prazo de validade/vigência;" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Valores mensais individualizados;" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Cópia do contrato ou declaração equivalente." })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Documento de identificação do titular", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Último contracheque", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) })
          ] })
        ] }),
        deps.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 bg-blue-50/50 border border-blue-200 rounded-xl p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-bold text-primary flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-3.5 w-3.5" }),
            " Documentos de ",
            d.nome,
            " (",
            d.parentesco,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentosDependenteUploads, { tipo: d.parentesco })
        ] }, i))
      ] }),
      currentStepName === "Final" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Confirme as declarações obrigatórias para prosseguir." })
        ] }),
        renderResumoValores(),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase", children: "Declarações do Titular" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que não percebo nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que sou responsável pelo pagamento das despesas do seguro/plano de saúde de todos os dependentes relacionados neste requerimento." })
          ] }),
          deps.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-muted-foreground uppercase pt-2", children: "Declarações sobre Dependentes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que o(s) dependente(s) informado(s) não percebe(m) nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que sou responsável pelo pagamento das despesas do plano de saúde do(s) beneficiário(s) dependente(s), ainda que o dependente seja o titular do contrato no plano apresentado." })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs pt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras." })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2 border-t border-border mt-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: step === 0 ? onCancel : () => setStep(step - 1), className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted", children: step === 0 ? "Cancelar" : "Voltar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => step < steps.length - 1 ? handleNext() : onDone(), disabled: showDepForm, className: "flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50", children: step === steps.length - 1 ? "Enviar Solicitação" : "Próximo" })
    ] })
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
  FlowInclusao,
  PrimeiroAcesso as component
};

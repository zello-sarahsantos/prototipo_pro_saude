import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link, U as UploadBox } from "./router-Btr6HUAC.js";
import { F as Field, i as inputCls } from "./Stepper-CtlJM4Ft.js";
import { b as maskCPF, m as maskMatricula, c as maskCurrency } from "./utils-BB8mpi5a.js";
import { O as OPERADORAS } from "./form-options-CM1uU9Xo.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import { A as ArrowLeft } from "./arrow-left-DhcisJd5.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function NovaInclusaoAssetran() {
  const [done, setDone] = reactExports.useState(false);
  const [nome, setNome] = reactExports.useState("");
  const [cpf, setCpf] = reactExports.useState("");
  const [matricula, setMatricula] = reactExports.useState("");
  const [operadora, setOperadora] = reactExports.useState("");
  const [outraOperadora, setOutraOperadora] = reactExports.useState("");
  const [administradora, setAdministradora] = reactExports.useState("");
  const [valor, setValor] = reactExports.useState("");
  if (done) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 sm:p-8 max-w-2xl mx-auto mt-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl p-8 shadow-elevated text-center space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-14 w-14 text-success mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Solicitação enviada com sucesso!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "O requerimento de inclusão para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: nome }),
        " foi encaminhado à GERDAB com a documentação anexada."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg py-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold", children: "Associação Responsável" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold text-primary", children: "ASSETRAN" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/associacao/gerenciamento", className: "block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2", children: "Voltar ao Gerenciamento" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-3xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/associacao/gerenciamento", className: "inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4 mr-1" }),
        " Voltar"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-6 w-6 text-primary" }),
        "Nova Inclusão de Beneficiário"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Preencha os dados reais do plano contratado e anexe a documentação." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated p-6 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2", children: "1. Dados Cadastrais do Servidor/Titular" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome Completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: nome, onChange: (e) => setNome(e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: cpf, onChange: (e) => setCpf(maskCPF(e.target.value)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Matrícula", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: matricula, onChange: (e) => setMatricula(maskMatricula(e.target.value)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2", children: "2. Dados do Plano Contratado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Operadora Real", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: operadora, onChange: (e) => setOperadora(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a operadora" }),
            OPERADORAS.filter((op) => op !== "ASSEFAZ / OUTRO CONVÊNIO").map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op, children: op }, op)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outra", children: "Outra" })
          ] }) }),
          operadora === "Outra" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Digite o nome da operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: outraOperadora, onChange: (e) => setOutraOperadora(e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Administradora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: administradora, onChange: (e) => setAdministradora(e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor Mensal do Titular", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: valor, onChange: (e) => setValor(maskCurrency(e.target.value)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2", children: "3. Anexos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Atenção:" }),
          " Como a solicitação está sendo feita pela ASSETRAN, inclua todos os documentos necessários, inclusive o requerimento devidamente assinado."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Requerimento de Inclusão Assinado (Titular)", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Documentos do Titular (RG, CPF, Contracheque, etc.)", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Documentos dos Dependentes (se houver)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-4 border-t border-border flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDone(true), disabled: !nome || !cpf || !matricula || !operadora || !administradora || !valor, className: "bg-primary text-primary-foreground rounded-md px-6 py-2.5 text-sm font-medium hover:bg-primary-light disabled:opacity-50", children: "Enviar Solicitação à GERDAB" }) })
    ] })
  ] });
}
export {
  NovaInclusaoAssetran as component
};

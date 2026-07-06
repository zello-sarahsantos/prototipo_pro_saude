import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link } from "./router-Btr6HUAC.js";
import { F as Field, i as inputCls } from "./Stepper-CtlJM4Ft.js";
import { d as dependentes } from "./mock-data-CAjhD170.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import { T as TriangleAlert } from "./triangle-alert-htGW9gin.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function Exclusao() {
  const [tipo, setTipo] = reactExports.useState("dependente");
  const [dependenteSelecionado, setDependenteSelecionado] = reactExports.useState(dependentes.filter((d) => d.status === "ativo")[0]?.nome || "");
  const [done, setDone] = reactExports.useState(false);
  const [showConfirm, setShowConfirm] = reactExports.useState(false);
  if (done) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-16 w-16 text-success mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Solicitação enviada com sucesso!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg py-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold text-status-analise-fg", children: "Em análise" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground italic px-2", children: "O Analista realizará a conferência das informações, podendo solicitar documento comprobatório se necessário." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/inicio", className: "block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2", children: "Voltar ao início" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Solicitar Exclusão" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "O que deseja excluir?", required: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: [{
        v: "dependente",
        l: "Dependente"
      }, {
        v: "titular",
        l: "Titular"
      }].map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex-1 border rounded-md py-2 text-center text-sm cursor-pointer ${tipo === o.v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", className: "hidden", checked: tipo === o.v, onChange: () => setTipo(o.v) }),
        o.v === "titular" ? "Titular" : "Dependente"
      ] }, o.v)) }),
      tipo === "titular" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[11px] text-muted-foreground italic leading-tight", children: "Representa a exclusão do titular do Programa Pró-Saúde." })
    ] }),
    tipo === "dependente" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Selecionar dependente", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: inputCls, value: dependenteSelecionado, onChange: (e) => setDependenteSelecionado(e.target.value), children: dependentes.filter((d) => d.status === "ativo").map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: d.nome, children: [
      d.nome,
      " — ",
      d.parentesco
    ] }, d.id)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Motivo da exclusão", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 4, className: inputCls, placeholder: "Descreva o motivo da exclusão" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da exclusão", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/dependentes", className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted text-center", children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowConfirm(true), className: "flex-1 bg-destructive text-destructive-foreground rounded-md py-2.5 text-sm font-medium", children: "Confirmar Exclusão" })
    ] }),
    showConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card w-full max-w-sm rounded-2xl p-6 shadow-elevated space-y-4 animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold", children: "Atenção!" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-600 leading-relaxed", children: tipo === "titular" ? "Ao solicitar a exclusão do titular, todo o grupo familiar vinculado ao Pró-Saúde também será excluído do benefício. Deseja continuar?" : `Tem certeza de que deseja solicitar a exclusão de ${dependenteSelecionado} do Pró-Saúde?` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDone(true), className: "w-full bg-destructive text-destructive-foreground rounded-md py-2.5 text-sm font-bold", children: tipo === "titular" ? "Confirmar exclusão do titular" : "Confirmar exclusão do dependente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowConfirm(false), className: "w-full border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted", children: "Cancelar" })
      ] })
    ] }) })
  ] });
}
export {
  Exclusao as component
};

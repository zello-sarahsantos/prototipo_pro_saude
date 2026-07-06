import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link } from "./router-Btr6HUAC.js";
import { s as servidorAtual, d as dependentes, f as formatCurrency } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { P as Plus } from "./plus-Co1miWYI.js";
import { U as User } from "./user-CRcAnwmm.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function Dependentes() {
  const isPensionista = servidorAtual.cargo.startsWith("Pensionista");
  if (isPensionista) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-muted/40 border border-border rounded-xl p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-muted-foreground uppercase mb-1", children: "Acesso Restrito" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "A gestão de dependentes não está disponível para o perfil de ",
        servidorAtual.cargo,
        "."
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Meus Dependentes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/servidor/requerimento/incluir-dependente", className: "inline-flex items-center gap-1 text-sm font-medium text-primary", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Incluir"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: dependentes.map((d) => {
      const inactive = d.status === "inativo";
      const pending = d.status === "pendente";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: `bg-card rounded-xl border border-border p-4 shadow-card ${inactive ? "opacity-60" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-start gap-3 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 rounded-full bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-5 w-5 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: d.nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              d.parentesco,
              " • ",
              d.idade,
              " anos"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: d.status })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "text-sm space-y-1 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Data de nasc.", value: d.dataNascimento }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "CPF", value: d.cpf }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Plano", value: d.plano }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Valor no plano", value: formatCurrency(d.valor) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: inactive || pending, className: "flex-1 text-sm border border-border rounded-md py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed", children: "Ver detalhes" }),
          d.alerta && d.status === "alerta" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flex-1 text-sm text-center border border-warning/50 bg-warning/10 text-warning-foreground rounded-md py-2 hover:bg-warning/20", children: "Enviar Comprovante" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/requerimento/exclusao", className: `flex-1 text-sm text-center border border-destructive/30 text-destructive rounded-md py-2 hover:bg-destructive/5 ${inactive || pending ? "pointer-events-none opacity-50" : ""}`, children: "Solicitar exclusão" })
        ] })
      ] }, d.id);
    }) })
  ] });
}
function Row({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "font-medium text-right", children: value })
  ] });
}
export {
  Dependentes as component
};

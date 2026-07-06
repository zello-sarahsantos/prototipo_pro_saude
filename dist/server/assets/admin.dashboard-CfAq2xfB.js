import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, L as Link } from "./router-Btr6HUAC.js";
import { r as regrasProSaude, a as requerimentos } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { C as ClipboardList } from "./clipboard-list-CtFjs4jP.js";
import { U as Users } from "./users-Dcj6BZdL.js";
import { A as ArrowRight } from "./arrow-right-Bj4gvUsl.js";
import { C as CircleAlert } from "./circle-alert-BY1u1Jbi.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["path", { d: "m16 11 2 2 4-4", key: "9rsbq5" }],
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
];
const UserCheck = createLucideIcon("user-check", __iconNode);
function Dashboard() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-7xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Dashboard" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Visão geral do módulo de cadastro. Comprovação, OCR, retroativos e relatório mensal são evolutivas." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 md:grid-cols-3", children: regrasProSaude.fases.map((fase) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: fase.nome }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: fase.modulo }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1 text-muted-foreground", children: fase.status })
    ] }, fase.nome)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "h-5 w-5" }), label: "Requerimentos", value: "12", sub: "3 urgentes", tone: "warning" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "h-5 w-5" }), label: "Servidores ativos", value: "847", sub: "23 inativos", tone: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-5 w-5" }), label: "Dependentes ativos", value: "1.234", sub: "5 pendentes", tone: "success" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "lg:col-span-2 bg-card rounded-xl border border-border shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-5 py-4 border-b border-border flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Últimos requerimentos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/admin/requerimentos", className: "text-sm text-primary inline-flex items-center gap-1", children: [
            "Ver fila ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3 w-3" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border", children: requerimentos.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "px-5 py-3 flex items-center gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium", children: [
              r.numero,
              " • ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground font-normal", children: r.tipo })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              r.servidor,
              " • ",
              r.detalhe
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status })
        ] }, r.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card rounded-xl border border-border shadow-card p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-5 w-5 text-warning" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-sm", children: "Alertas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Próximos vencimentos" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { text: "Lucas Souza (enteado) — 23 anos. Limite de idade/IRPF pendente de confirmação." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { text: "Comprovação IRPF de 1 enteado vence em 30 dias." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { text: "2 servidores com requerimentos > 7 dias na fila." })
        ] })
      ] })
    ] })
  ] });
}
function StatCard({
  icon,
  label,
  value,
  sub,
  tone
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-status-aprovado-bg text-status-aprovado-fg",
    warning: "bg-status-pendente-bg text-status-pendente-fg"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `inline-flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`, children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-3", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-3xl font-bold tracking-tight mt-1", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: sub })
  ] });
}
function Alert({
  text
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-xs px-3 py-2 rounded-md bg-status-pendente-bg/40 text-status-pendente-fg border border-status-pendente-bg", children: text });
}
export {
  Dashboard as component
};

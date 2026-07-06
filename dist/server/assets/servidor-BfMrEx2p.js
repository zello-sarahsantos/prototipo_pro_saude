import { U as jsxRuntimeExports, _ as Outlet } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, L as Link } from "./router-Btr6HUAC.js";
import { u as useLocation, L as LogOut } from "./log-out-BKNAi6Q3.js";
import { P as Plus } from "./plus-Co1miWYI.js";
import { U as Users } from "./users-Dcj6BZdL.js";
import { F as FileText } from "./file-text-CTAMIDRg.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "r6nss1"
    }
  ]
];
const House = createLucideIcon("house", __iconNode);
function ServidorLayout() {
  const loc = useLocation();
  const isNovo = loc.pathname.startsWith("/servidor/requerimento");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-elevated", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: "DETRAN • Pró-Saúde" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-semibold", children: "Portal do Servidor" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "opacity-90 hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-5 w-5" }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 pb-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }),
    !isNovo && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Link,
      {
        to: "/servidor/requerimento/novo",
        className: "fixed bottom-20 right-4 sm:right-[calc(50%-13rem)] bg-primary text-primary-foreground rounded-full shadow-elevated px-4 py-3 flex items-center gap-2 text-sm font-medium hover:bg-primary-light transition",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Novo Requerimento"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:max-w-md sm:mx-auto bg-card border-t border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavTab, { to: "/servidor/inicio", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "h-5 w-5" }), label: "Início" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavTab, { to: "/servidor/dependentes", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-5 w-5" }), label: "Dependentes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavTab, { to: "/servidor/meus-dados", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-5 w-5" }), label: "Meus Dados" })
    ] }) })
  ] });
}
function NavTab({ to, icon, label }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to,
      className: `flex flex-col items-center gap-1 py-3 text-xs ${active ? "text-primary font-semibold" : "text-muted-foreground"}`,
      children: [
        icon,
        label
      ]
    }
  );
}
const SplitComponent = ServidorLayout;
export {
  SplitComponent as component
};

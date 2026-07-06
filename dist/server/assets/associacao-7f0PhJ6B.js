import { r as reactExports, U as jsxRuntimeExports, _ as Outlet } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, a as Upload, L as Link } from "./router-Btr6HUAC.js";
import { u as useLocation, L as LogOut } from "./log-out-BKNAi6Q3.js";
import { X } from "./x-DChqQA7u.js";
import { M as Menu, S as Shield } from "./shield-DHy239Lw.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["path", { d: "M10 12h4", key: "a56b0p" }],
  ["path", { d: "M10 8h4", key: "1sr2af" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3", key: "1rgiei" }],
  [
    "path",
    {
      d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",
      key: "secmi2"
    }
  ],
  ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", key: "16ra0t" }]
];
const Building2 = createLucideIcon("building-2", __iconNode);
function AssociacaoLayout() {
  const loc = useLocation();
  const [open, setOpen] = reactExports.useState(false);
  const items = [{
    to: "/associacao/upload",
    icon: Upload,
    label: "Upload de Planilha (ASSEFAZ)"
  }, {
    to: "/associacao/gerenciamento",
    icon: UserPlus,
    label: "Gerenciamento (ASSETRAN)"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background lg:flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "lg:hidden sticky top-0 z-40 bg-primary text-primary-foreground border-b border-primary-dark px-4 py-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "h-5 w-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] opacity-70 tracking-wider font-bold", children: "DETRAN • PRÓ-SAÚDE" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-sm font-semibold", children: "Área da Associação" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setOpen(!open), className: "p-2 rounded-md hover:bg-primary-dark", "aria-label": "Abrir menu", children: open ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-5 w-5" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: `${open ? "block" : "hidden"} lg:flex lg:w-64 bg-slate-900 text-white flex-col lg:min-h-screen lg:sticky lg:top-0 z-30`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden lg:block px-6 py-6 border-b border-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-6 w-6 text-primary-light" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] opacity-70 tracking-widest font-bold", children: "DETRAN • PRÓ-SAÚDE" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-semibold", children: "Associação" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 p-3 space-y-1", children: items.map((it) => {
        const active = loc.pathname === it.to;
        const Icon = it.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: it.to, onClick: () => setOpen(false), className: `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${active ? "bg-primary text-white font-medium shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }),
          it.label
        ] }, it.to);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-slate-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "ASSEFAZ / ASSETRAN" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: "Associações Parceiras" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/login", className: "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }),
          " Sair"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 bg-slate-50 min-h-screen", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
  ] });
}
export {
  AssociacaoLayout as component
};

import { r as reactExports, U as jsxRuntimeExports, _ as Outlet } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, a as Upload, L as Link } from "./router-Btr6HUAC.js";
import { u as useLocation, L as LogOut } from "./log-out-BKNAi6Q3.js";
import { U as Users } from "./users-Dcj6BZdL.js";
import { C as ClipboardList } from "./clipboard-list-CtFjs4jP.js";
import { S as Shield, M as Menu } from "./shield-DHy239Lw.js";
import { X } from "./x-DChqQA7u.js";
const __iconNode$1 = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
];
const LayoutDashboard = createLucideIcon("layout-dashboard", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", __iconNode);
const baseItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/servidores", icon: Users, label: "Servidores" },
  { to: "/admin/requerimentos", icon: ClipboardList, label: "Requerimentos" },
  { to: "/admin/carga-inicial", icon: Upload, label: "Carga Inicial" }
];
function getAdminRole() {
  if (typeof window === "undefined") return "gerencia";
  return localStorage.getItem("prosaude_role") || "gerencia";
}
function AdminLayout() {
  const loc = useLocation();
  const [open, setOpen] = reactExports.useState(false);
  const role = getAdminRole();
  const isGerencia = role === "gerencia";
  const items = reactExports.useMemo(
    () => [
      ...baseItems,
      ...isGerencia ? [{ to: "/admin/parametros", icon: Settings, label: "Parâmetros" }] : []
    ],
    [isGerencia]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background lg:flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "lg:hidden sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 py-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-5 w-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] opacity-70", children: "DETRAN • GERDAB" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-sm font-semibold", children: "Pró-Saúde Admin" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setOpen(!open), className: "p-2 rounded-md hover:bg-sidebar-accent", "aria-label": "Abrir menu", children: open ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-5 w-5" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: `${open ? "block" : "hidden"} lg:flex lg:w-64 bg-sidebar text-sidebar-foreground flex-col lg:min-h-screen lg:sticky lg:top-0 z-30`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden lg:block px-6 py-6 border-b border-sidebar-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-6 w-6" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-70", children: "DETRAN • GERDAB" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-semibold", children: "Pró-Saúde Admin" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 p-3 space-y-1", children: items.map((it) => {
        const active = loc.pathname.startsWith(it.to);
        const Icon = it.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: it.to,
            onClick: () => setOpen(false),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }),
              it.label
            ]
          },
          it.to
        );
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border-t border-sidebar-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: isGerencia ? "Erandir / Gerência" : "Rebeca / Luciana" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-70", children: isGerencia ? "Gerência GERDAB" : "Analista GERDAB — sem acesso a parâmetros" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/login", className: "flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }),
          " Sair"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
  ] });
}
export {
  AdminLayout as A,
  getAdminRole as g
};

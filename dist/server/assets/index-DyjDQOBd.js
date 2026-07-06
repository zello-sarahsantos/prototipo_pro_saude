import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, L as Link } from "./router-Btr6HUAC.js";
import { r as regrasProSaude } from "./mock-data-CAjhD170.js";
import { S as ShieldCheck } from "./shield-check-sQZFp6Kk.js";
import { A as ArrowRight } from "./arrow-right-Bj4gvUsl.js";
import { U as Users } from "./users-Dcj6BZdL.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$3 = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "m9 14 2 2 4-4", key: "df797q" }]
];
const ClipboardCheck = createLucideIcon("clipboard-check", __iconNode$3);
const __iconNode$2 = [
  ["circle", { cx: "12", cy: "16", r: "1", key: "1au0dj" }],
  ["rect", { x: "3", y: "10", width: "18", height: "12", rx: "2", key: "6s8ecr" }],
  ["path", { d: "M7 10V7a5 5 0 0 1 10 0v3", key: "1pqi11" }]
];
const LockKeyhole = createLucideIcon("lock-keyhole", __iconNode$2);
const __iconNode$1 = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2", key: "1yt0o3" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }]
];
const Smartphone = createLucideIcon("smartphone", __iconNode$1);
const __iconNode = [
  ["path", { d: "M10 2h4", key: "n1abiw" }],
  ["path", { d: "M12 14v-4", key: "1evpnu" }],
  ["path", { d: "M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6", key: "1ts96g" }],
  ["path", { d: "M9 17H4v5", key: "8t5av" }]
];
const TimerReset = createLucideIcon("timer-reset", __iconNode);
function Landing() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-gradient-to-b from-background to-muted", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-4 sm:px-6 py-4 max-w-6xl mx-auto flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-6 w-6 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "DETRAN • GERDAB" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Pró-Saúde" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium", children: "Protótipo v0.2" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-primary mb-3", children: regrasProSaude.faseAtual }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl sm:text-5xl font-bold tracking-tight text-foreground", children: "Sistema Pró-Saúde" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-muted-foreground", children: "Protótipo navegável ajustado para validar a primeira entrega: cadastro de servidores, dependentes e requerimentos. Comprovação mensal, OCR, retroativos, relatórios e integrações aparecem como evolutivas." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 grid gap-3 md:grid-cols-3", children: regrasProSaude.fases.map((fase) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "rounded-2xl bg-card border border-border p-4 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-semibold", children: [
            fase.nome,
            " • ",
            fase.modulo
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[11px] px-2 py-1 rounded-full ${fase.status === "Evolutiva" ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`, children: fase.status })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: fase.escopo })
      ] }, fase.nome)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 grid gap-6 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/servidor/inicio", className: "group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "h-8 w-8 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold", children: "Portal do Servidor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Mobile-first. Permite requerer inclusão/mudança de plano, incluir/excluir dependentes e acompanhar análise da GERDAB." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all", children: [
            "Entrar como servidor ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/login", className: "group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-8 w-8 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold", children: "Painel GERDAB" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Responsivo para desktop e celular. A fila de análise fica para analistas; parâmetros sensíveis ficam apenas para a gerência." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all", children: [
            "Escolher perfil ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 grid gap-3 md:grid-cols-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCheck, { className: "h-4 w-4" }), title: "Regras de cadastro", text: "Campos dos requerimentos foram aproximados dos modelos oficiais, sem replicar o layout SEI." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LockKeyhole, { className: "h-4 w-4" }), title: "Segurança de parâmetros", text: "Teto e percentual não ficam visíveis para analistas comuns." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TimerReset, { className: "h-4 w-4" }), title: "Evolutivas marcadas", text: "Upload de comprovantes, reajustes, retroativos e OCR ficam sinalizados como Fase 2." })
      ] })
    ] })
  ] });
}
function InfoCard({
  icon,
  title,
  text
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-4 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [
      icon,
      title
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-muted-foreground", children: text })
  ] });
}
export {
  Landing as component
};

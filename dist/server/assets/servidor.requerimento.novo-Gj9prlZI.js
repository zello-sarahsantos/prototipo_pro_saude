import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, L as Link } from "./router-Btr6HUAC.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import { C as ChevronRight } from "./chevron-right-C8Gm63sw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$1 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M9 15h6", key: "cctwl0" }],
  ["path", { d: "M12 18v-6", key: "17g6i2" }]
];
const FilePlus = createLucideIcon("file-plus", __iconNode$1);
const __iconNode = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["line", { x1: "22", x2: "16", y1: "11", y2: "11", key: "1shjgl" }]
];
const UserMinus = createLucideIcon("user-minus", __iconNode);
const opts = [{
  to: "/servidor/requerimento/novo-plano",
  icon: FilePlus,
  title: "Mudança de Plano, Categoria ou Operadora",
  desc: "Solicitar alteração de plano, categoria ou operadora, com informação do plano anterior e do novo plano."
}, {
  to: "/servidor/requerimento/incluir-dependente",
  icon: UserPlus,
  title: "Inclusão de Dependente",
  desc: "Adicionar cônjuge, companheiro(a), filho(a), enteado(a) ou menor sob guarda."
}, {
  to: "/servidor/requerimento/exclusao",
  icon: UserMinus,
  title: "Exclusão de Dependente / Plano",
  desc: "Encerrar dependente ativo ou sair do benefício."
}];
const associacao = null;
function NovoReq() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Novo Requerimento" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Selecione o tipo de solicitação. Alterações de valor com comprovante/reajuste entram na Fase 2, mas a intenção já fica mapeada no fluxo de mudança de plano." }),
    associacao,
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: opts.map((o) => {
      const Icon = o.icon;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: o.to, className: "flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card hover:border-primary/40 transition", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm", children: o.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: o.desc })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-5 w-5 text-muted-foreground" })
      ] }, o.to);
    }) })
  ] });
}
export {
  NovoReq as component
};

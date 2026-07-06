import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { g as getAdminRole } from "./AdminLayout-DLRCIbBD.js";
import { c as createLucideIcon } from "./router-Btr6HUAC.js";
import { X } from "./x-DChqQA7u.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./log-out-BKNAi6Q3.js";
import "./users-Dcj6BZdL.js";
import "./clipboard-list-CtFjs4jP.js";
import "./shield-DHy239Lw.js";
const __iconNode$1 = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
];
const History = createLucideIcon("history", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "M12 8v4", key: "1got3b" }],
  ["path", { d: "M12 16h.01", key: "1drbdi" }]
];
const ShieldAlert = createLucideIcon("shield-alert", __iconNode);
const initialParams = [{
  id: "teto",
  nome: "Teto máximo de reembolso por família",
  valor: "R$ 4.000,00",
  definido: true,
  descricao: "Valor máximo considerado como base de cálculo antes de aplicar o percentual."
}, {
  id: "perc",
  nome: "Percentual de reembolso",
  valor: "90%",
  definido: true,
  descricao: "Percentual aplicado sobre a base (min(plano, teto))."
}, {
  id: "idadeFilho",
  nome: "Limite de idade — filhos",
  valor: "21 / 24 anos",
  definido: true,
  descricao: "Idade máxima para filho(a) permanecer como dependente (24 anos se cursando graduação)."
}, {
  id: "idadeEnteado",
  nome: "Limite de idade — enteados",
  valor: "21 / 24 anos",
  definido: true,
  descricao: "Idade máxima para enteado(a) permanecer como dependente (24 anos se cursando graduação; exige IRPF)."
}];
const initialHistorico = [{
  quem: "Erandir L.",
  quando: "15/03/2026 14:22",
  o: "Teto familiar",
  de: "R$ 3.500,00",
  para: "R$ 4.000,00",
  justificativa: "Reajuste aprovado em reunião de 14/03/2026."
}, {
  quem: "Rebeca M.",
  quando: "02/01/2026 09:10",
  o: "Percentual",
  de: "85%",
  para: "90%",
  justificativa: "Adequação ao normativo interno DG-002/2026."
}];
function Parametros() {
  const isGerencia = getAdminRole() === "gerencia";
  const [params, setParams] = reactExports.useState(initialParams);
  const [historico, setHistorico] = reactExports.useState(initialHistorico);
  const [editando, setEditando] = reactExports.useState(null);
  const [novoValor, setNovoValor] = reactExports.useState("");
  const [justificativa, setJustificativa] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState("");
  if (!isGerencia) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 sm:p-8 max-w-3xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-2xl p-6 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "h-10 w-10 text-destructive mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold", children: "Acesso restrito à Gerência GERDAB" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-2", children: "Parâmetros como teto máximo, percentual de reembolso e regras de inativação podem afetar toda a base de beneficiários." })
    ] }) });
  }
  function abrirEdicao(p) {
    setEditando(p);
    setNovoValor(p.definido ? p.valor : "");
    setJustificativa("");
    setErro("");
  }
  function confirmarEdicao() {
    if (!novoValor.trim()) {
      setErro("Informe o novo valor.");
      return;
    }
    if (!justificativa.trim()) {
      setErro("Justificativa é obrigatória.");
      return;
    }
    const agora = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(",", "");
    setHistorico([{
      quem: "Erandir L.",
      quando: agora,
      o: editando.nome,
      de: editando.valor,
      para: novoValor,
      justificativa
    }, ...historico]);
    setParams(params.map((p) => p.id === editando.id ? {
      ...p,
      valor: novoValor,
      definido: true
    } : p));
    setEditando(null);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-5xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Parâmetros do Sistema" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Configurações gerais — visíveis apenas para a Gerência GERDAB." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border shadow-card overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-5 py-3", children: "Parâmetro" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-5 py-3", children: "Valor atual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-5 py-3", children: "Ação" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: params.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-5 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: p.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: p.descricao })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `px-5 py-4 font-mono ${p.definido ? "" : "text-warning italic"}`, children: p.valor }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-5 py-4 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => abrirEdicao(p), className: "text-sm text-primary font-medium hover:underline", children: "Editar" }) })
      ] }, p.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card rounded-xl border border-border shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-5 py-4 border-b border-border flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-sm", children: "Histórico de alterações" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border text-sm", children: historico.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: h.quem }),
          " alterou ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: h.o }),
          ":",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground line-through", children: h.de }),
          " ",
          "→ ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success font-medium", children: h.para })
        ] }),
        h.justificativa && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground italic mt-0.5", children: [
          '"',
          h.justificativa,
          '"'
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: h.quando })
      ] }, i)) })
    ] }),
    editando && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-sm w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Editar parâmetro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: editando.nome })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditando(null), className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/50 rounded-lg px-4 py-2 flex justify-between text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Valor atual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-medium", children: editando.valor })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Novo valor *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: novoValor, onChange: (e) => setNovoValor(e.target.value), placeholder: editando.id === "perc" ? "Ex: 92%" : "Ex: R$ 4.500,00", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Justificativa *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: justificativa, onChange: (e) => setJustificativa(e.target.value), rows: 3, placeholder: "Ex: Reajuste aprovado em reunião do dia...", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" })
        ] }),
        erro && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: erro })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "px-6 py-4 border-t border-border flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditando(null), className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: confirmarEdicao, className: "text-sm bg-primary text-primary-foreground rounded-md px-4 py-2", children: "Confirmar alteração" })
      ] })
    ] }) })
  ] });
}
export {
  Parametros as component
};

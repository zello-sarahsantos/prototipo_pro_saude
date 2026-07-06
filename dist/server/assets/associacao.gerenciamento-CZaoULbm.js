import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link } from "./router-Btr6HUAC.js";
import { e as servidoresList, f as formatCurrency } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import { S as Search } from "./search-PqmaaW7D.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function GerenciamentoAssetran() {
  const [busca, setBusca] = reactExports.useState("");
  const filtrados = reactExports.useMemo(() => {
    return servidoresList.filter((s) => {
      const matchBusca = !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.matricula.includes(busca);
      const isAssetran = s.associacao === "Assetran";
      return matchBusca && isAssetran;
    });
  }, [busca]);
  filtrados.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-7xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Gerenciamento ASSETRAN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Beneficiários vinculados à sua associação" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/associacao/nova-inclusao", className: "bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4" }),
        "Nova Inclusão"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-64", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: busca, onChange: (e) => setBusca(e.target.value), placeholder: "Buscar por nome ou matrícula", className: "w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border shadow-card overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Matrícula" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Plano / Operadora" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Dep." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Valor plano" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-3", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: filtrados.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "Nenhum beneficiário encontrado." }) }) : filtrados.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-muted/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs", children: s.matricula }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: s.nome }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: s.plano }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: s.dependentes }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: formatCurrency(s.valorPlano) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: s.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/associacao/gerenciamento/$id", params: {
          id: s.matricula
        }, className: "text-primary text-sm font-medium hover:underline", children: "Ver / Editar" }) })
      ] }, s.matricula)) })
    ] }) })
  ] });
}
export {
  GerenciamentoAssetran as component
};

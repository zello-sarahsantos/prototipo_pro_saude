import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link } from "./router-Btr6HUAC.js";
import { e as servidoresList, f as formatCurrency } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { S as Search } from "./search-PqmaaW7D.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const TOTAL_REAL = 847;
const PAGE_SIZE = 6;
function Servidores() {
  const [busca, setBusca] = reactExports.useState("");
  const [filtroStatus, setFiltroStatus] = reactExports.useState("");
  const [filtroAssociacao, setFiltroAssociacao] = reactExports.useState("");
  const [filtroPlano, setFiltroPlano] = reactExports.useState("");
  const filtrados = reactExports.useMemo(() => {
    return servidoresList.filter((s) => {
      const matchBusca = !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.matricula.includes(busca);
      const matchStatus = !filtroStatus || s.status === filtroStatus;
      const matchAssociacao = !filtroAssociacao || (filtroAssociacao === "Individual" ? s.associacao === "—" : s.associacao === filtroAssociacao);
      const matchPlano = !filtroPlano || s.plano.toLowerCase().includes(filtroPlano.toLowerCase());
      return matchBusca && matchStatus && matchAssociacao && matchPlano;
    });
  }, [busca, filtroStatus, filtroAssociacao, filtroPlano]);
  const exibindo = filtrados.length;
  const total = busca || filtroStatus || filtroAssociacao || filtroPlano ? exibindo : TOTAL_REAL;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-7xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Servidores" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Exibindo ",
          exibindo,
          " de ",
          total,
          " cadastrados"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/admin/carga-inicial", className: "bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light", children: "Carga Inicial" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-64", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: busca, onChange: (e) => setBusca(e.target.value), placeholder: "Buscar por nome ou matrícula", className: "w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filtroStatus, onChange: (e) => setFiltroStatus(e.target.value), className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ativo", children: "Ativos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "inativo", children: "Inativos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pendente", children: "Pendentes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "alerta", children: "Requer Atenção" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filtroAssociacao, onChange: (e) => setFiltroAssociacao(e.target.value), className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todas as associações" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Assefaz", children: "Assefaz" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Assetran", children: "Assetran" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Individual", children: "Individual" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filtroPlano, onChange: (e) => setFiltroPlano(e.target.value), className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os planos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Bradesco", children: "Bradesco" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "SulAmérica", children: "SulAmérica" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Amil", children: "Amil" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "CASSI", children: "CASSI" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card overflow-x-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Matrícula" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Plano" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Associação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Dep." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Valor plano" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Auxílio previsto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-3", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: filtrados.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "Nenhum servidor encontrado com os filtros aplicados." }) }) : filtrados.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-muted/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs", children: s.matricula }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: s.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: s.plano }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.associacao }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: s.dependentes }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: formatCurrency(s.valorPlano) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: formatCurrency(s.valorAuxilio) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: s.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/admin/servidores/$id", params: {
            id: s.matricula
          }, className: "text-primary text-sm font-medium hover:underline", children: "Ver" }) })
        ] }, s.matricula)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Exibindo ",
          Math.min(exibindo, PAGE_SIZE),
          " de ",
          total,
          " registros",
          (busca || filtroStatus || filtroAssociacao || filtroPlano) && " (filtros aplicados — base real: 847 servidores)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: true, className: "px-2 py-1 rounded border border-border opacity-40 cursor-not-allowed", children: "←" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-1 rounded border border-primary bg-primary/5 text-primary font-medium", children: "1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-2 py-1 rounded border border-border hover:bg-muted", children: "2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-2 py-1 rounded border border-border hover:bg-muted", children: "3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1", children: "…" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-2 py-1 rounded border border-border hover:bg-muted", children: "142" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-2 py-1 rounded border border-border hover:bg-muted", children: "→" })
        ] })
      ] })
    ] })
  ] });
}
export {
  Servidores as component
};

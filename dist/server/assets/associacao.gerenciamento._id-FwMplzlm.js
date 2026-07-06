import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { R as Route, L as Link } from "./router-Btr6HUAC.js";
import { s as servidorAtual, d as dependentes, f as formatCurrency } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { A as ArrowLeft } from "./arrow-left-DhcisJd5.js";
import { U as UserPlus } from "./user-plus-CebG5NKs.js";
import { X } from "./x-DChqQA7u.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const tabs = ["Dados", "Dependentes", "Requerimentos"];
function DetalheBeneficiarioAssetran() {
  const {
    id
  } = Route.useParams();
  const [tab, setTab] = reactExports.useState("Dados");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-6xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/associacao/gerenciamento", className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4" }),
      " Voltar"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: servidorAtual.nome }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Matrícula ",
          id,
          " • ",
          servidorAtual.plano,
          " • ASSETRAN"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "ativo" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/servidor/requerimento/incluir-dependente", className: "bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4" }),
        " Incluir Dependente"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/requerimento/exclusao", className: "border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-muted", children: "Solicitar Exclusão" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border flex gap-1 overflow-x-auto", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`, children: t }, t)) }),
    tab === "Dados" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabDados, {}),
    tab === "Dependentes" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabDependentes, {}),
    tab === "Requerimentos" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabRequerimentos, {})
  ] });
}
function TabDados() {
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const fields = [["Nome completo", "nome", servidorAtual.nome], ["Matrícula", "matricula", servidorAtual.matricula], ["CPF", "cpf", servidorAtual.cpf], ["Data de nascimento", "dataNascimento", servidorAtual.dataNascimento], ["E-mail institucional", "email", servidorAtual.email], ["Telefone", "telefone", servidorAtual.telefone], ["RG", "rg", servidorAtual.rg], ["Endereço", "endereco", servidorAtual.endereco], ["Plano", "plano", servidorAtual.plano], ["Tipo de plano", "tipoPlano", servidorAtual.tipoPlano], ["Operadora", "operadora", servidorAtual.operadora], ["Associação", "associacao", "ASSETRAN"], ["Processo SEI", "processoSEI", servidorAtual.processoSEI], ["Início do benefício", "inicioBeneficio", servidorAtual.inicioBeneficio]];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(true), className: "text-sm border border-border rounded-md px-3 py-1.5 hover:bg-muted", children: "Editar" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "bg-card rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-x-6", children: fields.map(([k, , v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: k }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-medium mt-0.5", children: v })
    ] }, k)) }),
    editOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Editar dados do beneficiário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            servidorAtual.nome,
            " — mat. ",
            servidorAtual.matricula
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(false), className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-3", children: [
        fields.filter(([k]) => !["Matrícula", "CPF", "Associação"].includes(k)).map(([k, , v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: k }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { defaultValue: v === "—" ? "" : v, className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" })
        ] }, k)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Justificativa da alteração *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, placeholder: "Descreva o motivo da alteração dos dados...", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(false), className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(false), className: "text-sm bg-primary text-primary-foreground rounded-md px-4 py-2", children: "Salvar alterações" })
      ] })
    ] }) })
  ] });
}
function TabDependentes() {
  const [inativarId, setInativarId] = reactExports.useState(null);
  dependentes.find((d) => d.id === inativarId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/servidor/requerimento/incluir-dependente", className: "text-sm bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4 inline mr-1" }),
      " Incluir Dependente"
    ] }) }),
    dependentes.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: d.nome }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          d.parentesco,
          " • ",
          d.idade,
          " anos • CPF ",
          d.cpf
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
          "Valor: ",
          formatCurrency(d.valor)
        ] }),
        d.alerta && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-warning mt-1", children: [
          "⚠ ",
          d.alerta
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: d.status }),
      d.status !== "inativo" && /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/requerimento/exclusao", className: "text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5", children: "Solicitar Exclusão" })
    ] }, d.id))
  ] });
}
function TabRequerimentos() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border bg-card rounded-xl border border-border", children: [{
    id: "r1",
    numero: "REQ-2026-0047",
    tipo: "Inclusão de Dependente",
    detalhe: "Enteado(a), 23 anos — exige IRPF",
    abertoEm: "02/05/2026",
    status: "pendente"
  }, {
    id: "r3",
    numero: "REQ-2026-0045",
    tipo: "Exclusão",
    detalhe: "Exclusão de dependente",
    abertoEm: "01/05/2026",
    status: "aprovado"
  }].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "px-5 py-3 flex items-center gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium", children: [
        r.numero,
        " • ",
        r.tipo
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        r.detalhe,
        " • ",
        r.abertoEm
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status })
  ] }, r.id)) });
}
export {
  DetalheBeneficiarioAssetran as component
};

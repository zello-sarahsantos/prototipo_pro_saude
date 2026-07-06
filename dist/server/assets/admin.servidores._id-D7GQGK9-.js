import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { b as Route, L as Link } from "./router-Btr6HUAC.js";
import { s as servidorAtual, d as dependentes, f as formatCurrency, a as requerimentos, c as calcularReembolso } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { A as ArrowLeft } from "./arrow-left-DhcisJd5.js";
import { X } from "./x-DChqQA7u.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const tabs = ["Dados", "Dependentes", "Requerimentos", "Cálculo do Reembolso", "Histórico"];
function DetalheServidor() {
  const {
    id
  } = Route.useParams();
  const [inativarTitularOpen, setInativarTitularOpen] = reactExports.useState(false);
  const [tab, setTab] = reactExports.useState("Dados");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-6xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/admin/servidores", className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground", children: [
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
          servidorAtual.plano
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarTitularOpen(true), className: "text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5 font-medium", children: "Alterar para Inativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "ativo" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border flex gap-1 overflow-x-auto", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`, children: t }, t)) }),
    tab === "Dados" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabDados, {}),
    tab === "Dependentes" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabDependentes, {}),
    tab === "Requerimentos" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabRequerimentos, {}),
    tab === "Cálculo do Reembolso" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabCalculo, {}),
    tab === "Histórico" && /* @__PURE__ */ jsxRuntimeExports.jsx(TabHistorico, {}),
    inativarTitularOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-md w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-destructive", children: "Alterar Status para Inativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarTitularOpen(false), className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Você está alterando o status de ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: servidorAtual.nome }),
          " para Inativo."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Motivo da inativação *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Aposentadoria" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Exoneração" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Óbito" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Decisão Administrativa" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Outro" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Data de vigência" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 bg-muted/40 border border-border rounded-lg space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 cursor-pointer font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-0.5", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Solicitar Documentação Complementar" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground pl-5", children: "Uma notificação será enviada ao beneficiário para anexar documento comprobatório (ex: Diário Oficial de Aposentadoria)." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Observação para Histórico" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 2, className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background", placeholder: "Ex: Publicado no DODF..." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "px-6 py-4 border-t border-border flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarTitularOpen(false), className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarTitularOpen(false), className: "text-sm bg-destructive text-destructive-foreground rounded-md px-4 py-2", children: "Confirmar e Inativar" })
      ] })
    ] }) })
  ] });
}
function TabDados() {
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const fields = [["Nome completo", "nome", servidorAtual.nome], ["Matrícula", "matricula", servidorAtual.matricula], ["CPF", "cpf", servidorAtual.cpf], ["Data de nascimento", "dataNascimento", servidorAtual.dataNascimento], ["E-mail institucional", "email", servidorAtual.email], ["Telefone", "telefone", servidorAtual.telefone], ["RG", "rg", servidorAtual.rg], ["Endereço", "endereco", servidorAtual.endereco], ["Plano", "plano", servidorAtual.plano], ["Tipo de plano", "tipoPlano", servidorAtual.tipoPlano], ["Operadora", "operadora", servidorAtual.operadora], ["Associação", "associacao", servidorAtual.associacao], ["Processo SEI", "processoSEI", servidorAtual.processoSEI], ["Início do benefício", "inicioBeneficio", servidorAtual.inicioBeneficio]];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(true), className: "text-sm border border-border rounded-md px-3 py-1.5 hover:bg-muted", children: "Editar" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "bg-card rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-x-6", children: fields.map(([k, , v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: k }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-medium mt-0.5", children: v })
    ] }, k)) }),
    editOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Editar dados do servidor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            servidorAtual.nome,
            " — mat. ",
            servidorAtual.matricula
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditOpen(false), className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-3", children: [
        fields.filter(([k]) => !["Matrícula", "CPF"].includes(k)).map(([k, , v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
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
  const dep = dependentes.find((d) => d.id === inativarId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
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
      d.status !== "inativo" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarId(d.id), className: "text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5", children: "Inativar manualmente" })
    ] }, d.id)),
    dep && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-sm w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-destructive", children: "Inativar dependente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarId(null), className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Você está prestes a inativar ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: dep.nome }),
          " (",
          dep.parentesco,
          "). Esta ação encerrará o vínculo com o auxílio-saúde do titular."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Motivo da inativação *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Atingiu limite de idade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Deixou de ser dependente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Solicitação do titular" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Óbito" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Outro" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Data de vigência" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Observação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 2, className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "px-6 py-4 border-t border-border flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarId(null), className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInativarId(null), className: "text-sm bg-destructive text-destructive-foreground rounded-md px-4 py-2", children: "Confirmar Inativação" })
      ] })
    ] }) })
  ] });
}
function TabRequerimentos() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border bg-card rounded-xl border border-border", children: requerimentos.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "px-5 py-3 flex items-center gap-4", children: [
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
function TabCalculo() {
  const totalDeps = dependentes.filter((d) => d.status === "ativo").reduce((s, d) => s + d.valor, 0);
  const valorTitular = Math.max(0, servidorAtual.valorPlano - totalDeps);
  const total = servidorAtual.valorPlano;
  const teto = servidorAtual.tetoFamiliar;
  const final = calcularReembolso(total, teto);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 max-w-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Validar com GERDAB se o servidor pode visualizar este detalhamento." }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border p-6 font-mono text-sm space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: "Titular", v: valorTitular }),
      dependentes.filter((d) => d.status === "ativo").map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: `${d.parentesco}`, v: d.valor }, d.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-2 border-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: "Total do plano", v: total, bold: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: "Base limitada ao teto", v: Math.min(total, teto) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: "Percentual aplicado", v: 0.9, percent: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { k: "Teto configurado", v: teto }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-2 border-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-base font-bold text-success", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "REEMBOLSO" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatCurrency(final) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground font-sans", children: "✓ Abaixo do teto familiar." })
    ] })
  ] });
}
function TabHistorico() {
  const logs = [{
    data: "05/06/2026",
    responsavel: "Analista João (GERDAB)",
    de: "Aguardando Validação",
    para: "Ativo",
    obs: "Documentação deferida."
  }, {
    data: "01/05/2026",
    responsavel: "Sistema",
    de: "Em Análise",
    para: "Aguardando Validação",
    obs: "Solicitação inicial concluída pelo servidor."
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm text-left", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3", children: "Data" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3", children: "Responsável" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3", children: "De" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3", children: "Para" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3", children: "Observação" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: logs.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-muted/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: l.data }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: l.responsavel }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-1 rounded bg-muted text-xs", children: l.de }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-1 rounded bg-primary/10 text-primary font-medium text-xs", children: l.para }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: l.obs })
    ] }, i)) })
  ] }) }) });
}
function Line({
  k,
  v,
  bold,
  percent
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex justify-between ${bold ? "font-bold" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: percent ? `${Math.round(v * 100)}%` : formatCurrency(v) })
  ] });
}
export {
  DetalheServidor as component
};

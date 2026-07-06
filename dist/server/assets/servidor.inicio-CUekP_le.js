import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { L as Link } from "./router-Btr6HUAC.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { s as servidorAtual, f as formatCurrency, c as calcularReembolso, d as dependentes, a as requerimentos } from "./mock-data-CAjhD170.js";
import { I as Info } from "./info-CiBF30ja.js";
import { U as User } from "./user-CRcAnwmm.js";
import { C as ChevronRight } from "./chevron-right-C8Gm63sw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function Inicio() {
  const competenciaAtual = "abril/2026";
  const folhaPagamento = "maio/2026";
  const [showModalImportado, setShowModalImportado] = reactExports.useState(true);
  const isPensionista = servidorAtual.cargo.startsWith("Pensionista");
  const isPensionistaTemporario = servidorAtual.cargo === "Pensionista Temporário";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-5", children: [
    showModalImportado && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold text-primary", children: "Atualização Cadastral Obrigatória" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Identificamos que seu cadastro foi importado da base legada (GERDAB)." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "Para acessar o painel do Pró-Saúde, confirme seus dados de contato e declare ciência das regras do auxílio." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium mb-1", children: "Confirme seu E-mail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background", defaultValue: servidorAtual.email })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium mb-1", children: "Confirme seu Telefone" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background", defaultValue: servidorAtual.telefone })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2 mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold", children: "Termos de Responsabilidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-0.5", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que os dependentes importados permanecem elegíveis conforme as regras do Pró-Saúde." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-0.5", defaultChecked: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Comprometo-me a enviar os documentos comprobatórios atualizados quando solicitado pelo sistema na Fase 2." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "px-6 py-4 border-t border-border flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowModalImportado(false), className: "bg-primary text-primary-foreground font-medium text-sm px-6 py-2 rounded-md hover:bg-primary/90", children: "Confirmar e Acessar" }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Olá," }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold", children: servidorAtual.nome }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Matrícula ",
        servidorAtual.matricula
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-card rounded-xl p-4 shadow-card border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wide", children: "Meu cadastro" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "ativo", label: "Ativo" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "space-y-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Plano", value: servidorAtual.plano }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Associação", value: servidorAtual.associacao }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Valor total do grupo", value: formatCurrency(servidorAtual.valorPlano) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Teto familiar", value: formatCurrency(servidorAtual.tetoFamiliar) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Reembolso previsto (90%)", value: formatCurrency(calcularReembolso(servidorAtual.valorPlano)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-foreground", children: [
            "Competência ",
            competenciaAtual
          ] }),
          " — o reembolso referente a este mês será lançado na folha de pagamento de",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: folhaPagamento }),
          ". O auxílio-saúde é indenizatório: você comprova o gasto no mês atual e recebe no mês seguinte."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-warning", children: "Fase atual: cadastro" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground mt-1", children: "Comprovantes mensais, ressarcimentos retroativos e reajustes de valor serão tratados na Fase 2. Nesta fase, o foco é manter o cadastro base correto para análise da GERDAB." })
    ] }),
    isPensionistaTemporario,
    isPensionista ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "bg-muted/40 border border-border rounded-xl p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-muted-foreground uppercase mb-1", children: "Dependentes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "A gestão de grupo familiar não está disponível para o perfil de ",
        servidorAtual.cargo,
        "."
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold uppercase tracking-wide text-muted-foreground", children: "Meus Dependentes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/dependentes", className: "text-sm text-primary font-medium", children: "Ver todos" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: dependentes.slice(0, 2).map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl p-3 border border-border flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-9 w-9 rounded-full bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4 text-muted-foreground" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium truncate", children: d.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            d.parentesco,
            " • ",
            d.idade,
            " anos"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: d.status })
      ] }, d.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold uppercase tracking-wide text-muted-foreground", children: "Requerimentos recentes" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: requerimentos.slice(0, 3).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl p-3 border border-border flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium truncate", children: r.tipo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: r.abertoEm })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 text-muted-foreground" })
      ] }, r.id)) })
    ] })
  ] });
}
function Row({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "font-medium text-right", children: value })
  ] });
}
export {
  Inicio as component
};

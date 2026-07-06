import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { a as Upload } from "./router-Btr6HUAC.js";
import { F as FileSpreadsheet } from "./file-spreadsheet-BmqdWGwf.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const cols = ["Processo SEI", "Matrícula", "Nome", "Data de nascimento", "Tipo de plano", "Valor do plano", "Valor do auxílio", "Valor de pagamento"];
function Carga() {
  const [stage, setStage] = reactExports.useState("upload");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Carga Inicial de Dados" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Importação em lote a partir de planilha Excel." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 text-sm", children: ["upload", "map", "preview", "done"].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${stage === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: i + 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: stage === s ? "font-medium" : "text-muted-foreground", children: ["Upload", "Mapeamento", "Preview", "Concluído"][i] }),
      i < 3 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground mx-2", children: "→" })
    ] }, s)) }),
    stage === "upload" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border shadow-card p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStage("map"), className: "w-full border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-muted/30 transition", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-10 w-10 text-muted-foreground mx-auto mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-medium", children: "Selecionar planilha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Arquivos .xlsx até 20 MB" })
    ] }) }),
    stage === "map" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "h-5 w-5 text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "servidores_2026.xlsx" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "• 847 linhas" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Mapeamento de colunas" }),
        cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: c.toLowerCase().replace(/ /g, "_") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "—" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-muted-foreground", children: [
            "→ ",
            c
          ] })
        ] }, c))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStage("upload"), className: "text-sm border border-border rounded-md px-4 py-2", children: "Voltar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStage("preview"), className: "text-sm bg-primary text-primary-foreground rounded-md px-4 py-2", children: "Pré-visualizar" })
      ] })
    ] }),
    stage === "preview" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 py-3 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-sm", children: "Primeiros 5 registros" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 whitespace-nowrap", children: c }, c)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: Array.from({
          length: 5
        }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-2 font-mono", children: [
            "00050.00",
            1234 + i,
            "/2024-10"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: 12345 + i }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-2", children: [
            "Servidor ",
            i + 1
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-2", children: [
            "10/06/198",
            i
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: "Bradesco" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: "R$ 1.200,00" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: "R$ 1.080,00" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: "R$ 1.080,00" })
        ] }, i)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-3 border-t border-border flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStage("map"), className: "text-sm border border-border rounded-md px-4 py-2", children: "Voltar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStage("done"), className: "text-sm bg-primary text-primary-foreground rounded-md px-4 py-2", children: "Importar 847 registros" })
      ] })
    ] }),
    stage === "done" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-12 w-12 text-success mx-auto mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Importação concluída" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "843" }),
        " inseridos • ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "4" }),
        " atualizados • ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "0" }),
        " com erro"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStage("upload"), className: "mt-5 text-sm bg-primary text-primary-foreground rounded-md px-4 py-2", children: "Nova importação" })
    ] })
  ] });
}
export {
  Carga as component
};

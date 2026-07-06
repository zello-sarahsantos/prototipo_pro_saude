import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { a as requerimentos } from "./mock-data-CAjhD170.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { c as createLucideIcon, t as toast } from "./router-Btr6HUAC.js";
import { E as Eye } from "./eye-Di6m-2Ll.js";
import { X } from "./x-DChqQA7u.js";
import { F as FileText } from "./file-text-CTAMIDRg.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14", key: "1vmskp" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
];
const ZoomIn = createLucideIcon("zoom-in", __iconNode);
function DocPreview({
  filename
}) {
  const isPdf = filename.endsWith(".pdf");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-lg overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-3.5 w-3.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate font-medium", children: filename }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto opacity-60", children: isPdf ? "PDF" : "IMG" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white h-48 flex flex-col items-center justify-center gap-2 relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-16 h-20 border-2 border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-6 w-6 text-muted-foreground/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-muted-foreground/40 font-mono", children: "PDF" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground/60 text-center px-4", children: filename }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "absolute bottom-2 right-2 text-[10px] text-primary flex items-center gap-1 hover:underline", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "h-3 w-3" }),
        " Ampliar"
      ] })
    ] })
  ] });
}
function Fila() {
  const [openId, setOpenId] = reactExports.useState(null);
  const [mode, setMode] = reactExports.useState(null);
  const [filtroTipo, setFiltroTipo] = reactExports.useState("");
  const [filtroStatus, setFiltroStatus] = reactExports.useState("");
  const cur = requerimentos.find((r) => r.id === openId);
  const filtrados = requerimentos.filter((r) => {
    const matchTipo = !filtroTipo || r.tipo === filtroTipo;
    const matchStatus = !filtroStatus || r.status === filtroStatus;
    return matchTipo && matchStatus;
  });
  const pendentes = requerimentos.filter((r) => r.status === "pendente" || r.status === "analise").length;
  function openModal(id, m) {
    setOpenId(id);
    setMode(m);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-8 max-w-7xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Fila de Aprovação" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        pendentes,
        " aguardando análise • aprovação efetiva alterações somente após validação da GERDAB"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border shadow-card p-4 flex flex-col sm:flex-row gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filtroTipo, onChange: (e) => setFiltroTipo(e.target.value), className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os tipos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Ativação de Acesso", children: "Ativação de Acesso (Importados)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Inclusão no Plano", children: "Inclusão Inicial" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Inclusão de Dependente", children: "Inclusão de Dependente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Exclusão", children: "Exclusão" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Mudança de Plano", children: "Mudança de Plano" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filtroStatus, onChange: (e) => setFiltroStatus(e.target.value), className: "border border-input rounded-md px-3 py-2 text-sm bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pendente", children: "Pendente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "analise", children: "Em análise" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aprovado", children: "Aprovado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rejeitado", children: "Rejeitado" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      filtrados.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "bg-card rounded-xl border border-border shadow-card p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex justify-between items-start mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: r.numero }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground font-normal", children: [
                " • ",
                r.tipo
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "Servidor: ",
              r.servidor,
              " (mat. ",
              r.matricula,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: r.detalhe }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
              "Aberto em ",
              r.abertoEm
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status })
        ] }),
        (r.status === "pendente" || r.status === "analise") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-3 border-t border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => openModal(r.id, "visualizar"), className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }),
            " Visualizar Documentos"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openModal(r.id, "solicitar_doc"), className: "text-sm border border-border text-foreground rounded-md px-4 py-2 hover:bg-muted", children: "Solicitar Documento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openModal(r.id, "rejeitar"), className: "text-sm border border-destructive/30 text-destructive rounded-md px-4 py-2 hover:bg-destructive/5", children: "Rejeitar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openModal(r.id, "aprovar"), className: "text-sm bg-success text-success-foreground rounded-md px-4 py-2 hover:opacity-90", children: "Aprovar" })
        ] })
      ] }, r.id)),
      filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center py-8", children: "Nenhum requerimento encontrado com os filtros aplicados." })
    ] }),
    cur && mode && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-t-2xl sm:rounded-2xl shadow-elevated max-w-2xl w-full max-h-[92vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-semibold", children: [
            mode === "visualizar" && "Documentos anexados",
            mode === "aprovar" && "Aprovar requerimento",
            mode === "rejeitar" && "Rejeitar requerimento",
            mode === "solicitar_doc" && "Solicitar Documento Comprobatório"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            cur.numero,
            " • ",
            cur.servidor
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setOpenId(null);
          setMode(null);
        }, className: "p-1 hover:bg-muted rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
        mode === "visualizar" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg p-3 text-sm space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tipo:" }),
              " ",
              cur.tipo
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Detalhe:" }),
              " ",
              cur.detalhe
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium mb-3", children: [
              "Documentos (",
              cur.documentos.length,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: cur.documentos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(DocPreview, { filename: d }, d)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground", children: "Esta é uma visualização somente leitura. Para aprovar ou rejeitar, feche e use os botões correspondentes." })
        ] }),
        mode === "aprovar" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg p-4 space-y-1 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Beneficiário:" }),
              " ",
              cur.servidor
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tipo:" }),
              " ",
              cur.tipo
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Detalhe:" }),
              " ",
              cur.detalhe
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Regra:" }),
              " Requerimentos de cadastro ficam pendentes até aprovação GERDAB."
            ] })
          ] }),
          cur.tipo.includes("Inclusão") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Atenção (Pensionistas):" }),
            " Se esta for a solicitação inicial de um Pensionista, um ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Processo SEI individual" }),
            " será criado e vinculado a ele automaticamente após esta aprovação, onde ocorrerão suas futuras movimentações."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "text-sm font-medium cursor-pointer list-none flex items-center gap-2 py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5 text-muted-foreground" }),
              "Ver documentos (",
              cur.documentos.length,
              ")",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground ml-auto group-open:hidden", children: "▼ expandir" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground ml-auto hidden group-open:block", children: "▲ recolher" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3", children: cur.documentos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(DocPreview, { filename: d }, d)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium mb-2", children: "Checklist de verificação" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 text-sm", children: cur.checklist.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", defaultChecked: true }),
              c
            ] }, c)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium mb-1.5", children: "Observação interna" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
          ] })
        ] }),
        mode === "rejeitar" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg p-4 space-y-1 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Servidor:" }),
              " ",
              cur.servidor
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tipo:" }),
              " ",
              cur.tipo
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Detalhe:" }),
              " ",
              cur.detalhe
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium mb-1.5", children: "Motivo da rejeição *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Documento ilegível" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Documento incompleto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Dados inconsistentes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Outro" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, placeholder: "Detalhe o motivo (será notificado ao servidor)", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
          ] })
        ] }),
        mode === "solicitar_doc" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg p-4 space-y-1 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Servidor:" }),
              " ",
              cur.servidor
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tipo:" }),
              " ",
              cur.tipo
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Detalhe:" }),
              " ",
              cur.detalhe
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium mb-1.5", children: "Qual documento está faltando?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, placeholder: "Descreva o documento comprobatório necessário (ex: Certidão de óbito, Divórcio, etc.)", className: "w-full border border-input rounded-md px-3 py-2 text-sm bg-background" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-orange-500/10 text-orange-600 p-3 text-xs mt-4", children: [
            "Ao confirmar, o status será alterado para ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: '"Pendente de complementação"' }),
            " e o servidor receberá uma notificação."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setOpenId(null);
          setMode(null);
        }, className: "text-sm border border-border rounded-md px-4 py-2 hover:bg-muted", children: mode === "visualizar" ? "Fechar" : "Cancelar" }),
        mode !== "visualizar" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          if (mode === "solicitar_doc") toast.success("Notificação enviada ao beneficiário.");
          else if (mode === "aprovar") {
            toast.success("Requerimento aprovado com sucesso.");
            if (cur.tipo.includes("Inclusão")) {
              toast.info("Processo SEI individual gerado (se pensionista).");
            }
          } else if (mode === "rejeitar") toast.success("Requerimento rejeitado com sucesso.");
          setOpenId(null);
          setMode(null);
        }, className: `text-sm rounded-md px-4 py-2 text-primary-foreground ${mode === "rejeitar" ? "bg-destructive" : mode === "solicitar_doc" ? "bg-primary" : "bg-success"}`, children: mode === "rejeitar" ? "Confirmar Rejeição" : mode === "solicitar_doc" ? "Enviar Solicitação" : "Confirmar Aprovação" })
      ] })
    ] }) })
  ] });
}
export {
  Fila as component
};

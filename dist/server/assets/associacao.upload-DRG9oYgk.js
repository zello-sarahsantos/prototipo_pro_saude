import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { F as Field, i as inputCls } from "./Stepper-CtlJM4Ft.js";
import { S as StatusBadge } from "./StatusBadge-Byz3gZgk.js";
import { f as formatCurrency } from "./mock-data-CAjhD170.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import { c as createLucideIcon, a as Upload } from "./router-Btr6HUAC.js";
import { F as FileSpreadsheet } from "./file-spreadsheet-BmqdWGwf.js";
import { I as Info } from "./info-CiBF30ja.js";
import { E as Eye } from "./eye-Di6m-2Ll.js";
import { C as CircleAlert } from "./circle-alert-BY1u1Jbi.js";
import { A as ArrowRight } from "./arrow-right-Bj4gvUsl.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$2 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$1);
const __iconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
];
const RotateCcw = createLucideIcon("rotate-ccw", __iconNode);
function UploadPlanilha() {
  const [step, setStep] = reactExports.useState("upload");
  const [competencia, setCompetencia] = reactExports.useState("05/2026");
  const dadosSimulados = [{
    servidor: "João da Silva",
    matricula: "12345678",
    beneficiario: "João da Silva",
    cpf: "123.***.***-00",
    vinculo: "Titular",
    valor: 1200,
    status: "válido"
  }, {
    servidor: "João da Silva",
    matricula: "12345678",
    beneficiario: "Ana da Silva",
    cpf: "234.***.***-11",
    vinculo: "Cônjuge",
    valor: 890,
    status: "válido"
  }, {
    servidor: "Maria Oliveira",
    matricula: "87654321",
    beneficiario: "Maria Oliveira",
    cpf: "345.***.***-22",
    vinculo: "Titular",
    valor: 1800,
    status: "válido"
  }, {
    servidor: "Maria Oliveira",
    matricula: "87654321",
    beneficiario: "José Oliveira",
    cpf: "",
    vinculo: "Pai",
    valor: 1100,
    status: "não_elegível",
    motivo: "Vínculo não elegível para o Pró-Saúde"
  }, {
    servidor: "Ricardo Mendes",
    matricula: "99887766",
    beneficiario: "Ricardo Mendes",
    cpf: "456.***.***-33",
    vinculo: "Titular",
    valor: 950,
    status: "atenção",
    motivo: "Número do processo SEI ausente"
  }, {
    servidor: "Ricardo Mendes",
    matricula: "99887766",
    beneficiario: "Beatriz Mendes",
    cpf: "567.***.***-44",
    vinculo: "Mãe",
    valor: 950,
    status: "não_elegível",
    motivo: "Vínculo não elegível para o Pró-Saúde"
  }];
  const totalRegistros = dadosSimulados.length;
  const validos = dadosSimulados.filter((d) => d.status === "válido").length;
  const atencao = dadosSimulados.filter((d) => d.status === "atenção").length;
  const naoElegiveis = dadosSimulados.filter((d) => d.status === "não_elegível").length;
  dadosSimulados.reduce((acc, curr) => acc + curr.valor, 0);
  const valorConsiderado = dadosSimulados.filter((d) => d.status !== "não_elegível").reduce((acc, curr) => acc + curr.valor, 0);
  if (step === "sucesso") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-20 w-20 bg-green-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-12 w-12 text-green-600" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-900", children: "Solicitação enviada com sucesso!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-500 uppercase font-semibold", children: "Status:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-3 py-1 rounded-full text-sm font-bold bg-[#fff7ed] text-[#d75c00] border border-[#ffedd5]", children: "Em análise" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-md text-slate-600 leading-relaxed", children: "A planilha foi enviada para conferência da GERDAB. Os registros sinalizados com atenção ou não elegíveis poderão ser revisados pela equipe responsável." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStep("upload"), className: "bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition shadow-md", children: "Voltar ao Início" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 lg:p-8 space-y-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Upload de Planilha Mensal" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-500 mt-1", children: [
        "Envie a planilha mensal de pagamentos conforme o modelo padronizado do Pró-Saúde.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-primary", children: "Nota:" }),
        " A própria planilha enviada representa e substitui os comprovantes mensais individuais."
      ] })
    ] }),
    step === "upload" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 border-b border-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-lg font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-5 w-5 text-primary" }),
            " Selecionar Arquivo"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Competência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, type: "month", value: "2026-05", onChange: (e) => setCompetencia(e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Associação", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Assefaz" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Assetran" })
              ] }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:bg-slate-50 transition cursor-pointer group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "h-6 w-6 text-slate-500" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-700", children: "Arraste a planilha ou clique para selecionar" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Formatos aceitos: .xlsx ou .csv" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-5 w-5 text-amber-600 shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-amber-800 leading-relaxed", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold mb-1", children: "Atenção sobre beneficiários:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Pessoas que não se enquadram nas regras do Pró-Saúde, como pais, mães, irmãos ou outros vínculos não previstos, não devem ser enviadas como beneficiários do programa. Caso constem na planilha da associação, elas deverão ser identificadas para conferência e não consideradas no cálculo do ressarcimento." })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStep("conferencia"), className: "w-full bg-primary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-lg shadow-primary/20", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4" }),
              " Pré-visualizar dados"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-slate-900", children: "Histórico de Envios" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-100", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-3 font-semibold text-slate-500", children: "Competência" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-3 font-semibold text-slate-500", children: "Data" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-3 font-semibold text-slate-500", children: "Registros" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-3 font-semibold text-slate-500", children: "Status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-3 font-semibold text-slate-500", children: "Ação" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { className: "divide-y divide-slate-50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 font-medium", children: "04/2026" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 text-slate-500", children: "10/04/2026" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3", children: "152" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "aprovado" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-primary hover:underline font-medium", children: "Detalhes" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 font-medium", children: "03/2026" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 text-slate-500", children: "08/03/2026" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3", children: "148" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: "aprovado" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-primary hover:underline font-medium", children: "Detalhes" }) })
              ] })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 rounded-2xl p-6 text-white space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold flex items-center gap-2 text-primary-light", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-5 w-5" }),
          " Modelo de Planilha"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 leading-relaxed", children: "Baixe o modelo padronizado para garantir que o envio seja processado corretamente. Esta é uma versão preliminar." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-slate-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
          " Baixar Modelo (.xlsx)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3", children: "Colunas do Modelo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-1.5 text-[10px] text-slate-300", children: [
            ["Competência", "Matrícula do Servidor", "CPF do Beneficiário", "Nome do Beneficiário", "Parentesco/Vínculo", "Valor Mensal Individual", "Data de Pagamento"].map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 w-1 bg-primary rounded-full" }),
              col
            ] }, col)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 italic mt-1", children: "+ outras 12 colunas" })
          ] })
        ] })
      ] }) })
    ] }),
    step === "conferencia" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardResumo, { label: "Total de Registros", value: totalRegistros, icon: FileSpreadsheet, color: "slate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardResumo, { label: "Registros Válidos", value: validos, icon: CircleCheck, color: "green" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardResumo, { label: "Com Atenção", value: atencao, icon: CircleAlert, color: "amber" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardResumo, { label: "Não Elegíveis", value: naoElegiveis, icon: CircleX, color: "red" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-b border-slate-100 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-lg font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "h-5 w-5 text-primary" }),
            " Conferência da Planilha"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 uppercase font-bold tracking-wider", children: "Valor Considerado (Pró-Saúde)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-bold text-primary", children: formatCurrency(valorConsiderado) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-slate-50 text-slate-500 text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-semibold uppercase tracking-wider text-[10px]", children: "Servidor (Titular)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-semibold uppercase tracking-wider text-[10px]", children: "Beneficiário" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-semibold uppercase tracking-wider text-[10px]", children: "Vínculo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-semibold uppercase tracking-wider text-[10px]", children: "Valor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-semibold uppercase tracking-wider text-[10px]", children: "Situação" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-slate-100", children: dadosSimulados.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-slate-50/50 transition", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-slate-900", children: item.servidor }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500", children: [
                "Mat: ",
                item.matricula
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-slate-900", children: item.beneficiario }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: item.cpf || "CPF ausente" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-slate-600", children: item.vinculo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-medium text-slate-900", children: formatCurrency(item.valor) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BadgeStatus, { status: item.status, motivo: item.motivo }) })
          ] }, idx)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStep("upload"), className: "text-slate-600 font-medium flex items-center gap-2 hover:text-slate-900", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "h-4 w-4" }),
            " Voltar e substituir planilha"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStep("sucesso"), className: "bg-primary text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/20 transition", children: [
            "Enviar para análise da GERDAB ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function CardResumo({
  label,
  value,
  icon: Icon,
  color
}) {
  const colors = {
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-4 rounded-2xl border ${colors[color]} space-y-2 bg-white`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-bold tracking-wider opacity-70", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4 opacity-50" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold leading-none", children: value })
  ] });
}
function BadgeStatus({
  status,
  motivo
}) {
  const config = {
    válido: {
      label: "Válido",
      cls: "bg-green-100 text-green-700"
    },
    atenção: {
      label: "Atenção",
      cls: "bg-amber-100 text-amber-700"
    },
    não_elegível: {
      label: "Não Elegível",
      cls: "bg-red-100 text-red-700"
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config[status].cls}`, children: config[status].label }),
    motivo && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500 italic max-w-[150px]", children: motivo })
  ] });
}
export {
  UploadPlanilha as component
};

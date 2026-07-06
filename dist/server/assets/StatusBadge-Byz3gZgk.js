import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { g as statusLabels } from "./mock-data-CAjhD170.js";
const map = {
  pendente: "bg-status-pendente-bg text-status-pendente-fg",
  aprovado: "bg-status-aprovado-bg text-status-aprovado-fg",
  ativo: "bg-status-aprovado-bg text-status-aprovado-fg",
  rejeitado: "bg-status-rejeitado-bg text-status-rejeitado-fg",
  inativo: "bg-status-inativo-bg text-status-inativo-fg",
  analise: "bg-status-analise-bg text-status-analise-fg",
  alerta: "bg-status-pendente-bg text-status-pendente-fg"
};
function StatusBadge({ status, label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-current" }),
        label ?? statusLabels[status]
      ]
    }
  );
}
export {
  StatusBadge as S
};

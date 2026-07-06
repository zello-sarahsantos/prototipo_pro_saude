import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { c as createLucideIcon, L as Link } from "./router-Btr6HUAC.js";
const __iconNode = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
const Check = createLucideIcon("check", __iconNode);
function Stepper({ steps, current }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "flex items-center gap-1.5 mb-4", children: steps.map((s, i) => {
    const done = i < current;
    const active = i === current;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `h-1.5 rounded-full ${done || active ? "bg-primary" : "bg-muted"}`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "p",
        {
          className: `mt-1.5 text-[10px] uppercase tracking-wide ${active ? "text-primary font-semibold" : "text-muted-foreground"}`,
          children: [
            done && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "inline h-3 w-3 mr-0.5" }),
            i + 1,
            ". ",
            s
          ]
        }
      )
    ] }, s);
  }) });
}
function StepNav({
  onPrev,
  onNext,
  nextLabel = "Próximo",
  isLast = false
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-4", children: [
    onPrev ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: onPrev,
        className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted",
        children: "Voltar"
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: "/servidor/requerimento/novo",
        className: "flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted text-center",
        children: "Cancelar"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: onNext,
        className: `flex-1 rounded-md py-2.5 text-sm font-medium text-primary-foreground ${isLast ? "bg-success" : "bg-primary hover:bg-primary-light"}`,
        children: nextLabel
      }
    )
  ] });
}
function Field({
  label,
  children,
  required
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm font-medium mb-1.5", children: [
      label,
      " ",
      required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
    ] }),
    children
  ] });
}
const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
export {
  Field as F,
  Stepper as S,
  StepNav as a,
  inputCls as i
};

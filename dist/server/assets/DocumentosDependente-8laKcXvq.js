import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { D as DOCUMENTOS_POR_TIPO_DEPENDENTE, R as REGRA_POR_TIPO_DEPENDENTE } from "./form-options-CM1uU9Xo.js";
import { F as Field } from "./Stepper-CtlJM4Ft.js";
import { U as UploadBox } from "./router-Btr6HUAC.js";
const validationMessages = {
  cpf: "Informe um CPF válido no formato 000.000.000-00.",
  valorPlano: "Informe o valor do plano.",
  valorZero: "O valor deve ser maior que zero.",
  obrigatorios: "Preencha os campos obrigatórios antes de continuar.",
  matricula: "Informe a matrícula."
};
function parseCurrency(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}
function cpfDigits(cpf) {
  return cpf.replace(/\D/g, "");
}
function isCpfComplete(cpf) {
  return cpfDigits(cpf).length === 11;
}
function isCurrencyPositive(value) {
  return parseCurrency(value) > 0;
}
function getCurrencyError(value) {
  if (!value.replace(/\D/g, "")) return validationMessages.valorPlano;
  if (!isCurrencyPositive(value)) return validationMessages.valorZero;
  return null;
}
function DocumentosDependenteLista({
  tipo,
  className = "text-[10px]"
}) {
  const docs = DOCUMENTOS_POR_TIPO_DEPENDENTE[tipo];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Documentos obrigatórios:" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc ml-4 space-y-0.5", children: docs.map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: doc }, doc)) })
  ] });
}
function OrientacaoTipoDependente({ tipo }) {
  const regra = REGRA_POR_TIPO_DEPENDENTE[tipo];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    regra && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: regra }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentosDependenteLista, { tipo, className: "text-xs" })
  ] });
}
function DocumentosDependenteUploads({ tipo }) {
  const docs = DOCUMENTOS_POR_TIPO_DEPENDENTE[tipo];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: docs.map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: doc, required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }, doc)) });
}
export {
  DocumentosDependenteLista as D,
  OrientacaoTipoDependente as O,
  DocumentosDependenteUploads as a,
  getCurrencyError as g,
  isCpfComplete as i,
  parseCurrency as p,
  validationMessages as v
};

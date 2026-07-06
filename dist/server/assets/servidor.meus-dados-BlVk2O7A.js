import { U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { u as useNavigate } from "./router-Btr6HUAC.js";
import { s as servidorAtual } from "./mock-data-CAjhD170.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const fields = [["Nome completo", servidorAtual.nome], ["Matrícula", servidorAtual.matricula], ["Data de nascimento", servidorAtual.dataNascimento], ["CPF", servidorAtual.cpf], ["E-mail institucional", servidorAtual.email], ["Telefone", servidorAtual.telefone], ["Tipo de plano", servidorAtual.plano], ["Associação vinculada", servidorAtual.associacao], ["Processo SEI", servidorAtual.processoSEI], ["Início do benefício", servidorAtual.inicioBeneficio]];
function MeusDados() {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Meus Dados" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Para alterar qualquer informação, abra um requerimento. A GERDAB validará e atualizará o cadastro." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "bg-card rounded-xl border border-border divide-y divide-border", children: fields.map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: k }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-medium mt-0.5", children: v })
    ] }, k)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate({
      to: "/servidor/requerimento/novo"
    }), className: "w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary-light transition", children: "Solicitar alteração de cadastro" })
  ] });
}
export {
  MeusDados as component
};

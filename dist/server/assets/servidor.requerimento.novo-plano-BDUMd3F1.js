import { U as jsxRuntimeExports, r as reactExports } from "./worker-entry-C224CQw9.js";
import { a as Upload, L as Link } from "./router-Btr6HUAC.js";
import { S as Stepper, a as StepNav, F as Field, i as inputCls } from "./Stepper-CtlJM4Ft.js";
import { O as OPERADORAS } from "./form-options-CM1uU9Xo.js";
import { C as CircleCheck } from "./circle-check-CFPRK9Yk.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const steps = ["Tipo", "Pessoais", "Plano", "Documentos", "Revisão"];
function NovoPlano() {
  const [step, setStep] = reactExports.useState(0);
  const [done, setDone] = reactExports.useState(false);
  const [valorPlano, setValorPlano] = reactExports.useState("3190");
  if (done) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-16 w-16 text-success mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Solicitação enviada com sucesso!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-lg py-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold text-status-analise-fg", children: "Em análise" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground italic px-2", children: "A GERDAB realizará a conferência das informações e documentos enviados." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/servidor/inicio", className: "block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2", children: "Voltar ao início" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-1", children: "Mudança de Plano, Categoria ou Operadora" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mb-4", children: [
      "Etapa ",
      step + 1,
      " de ",
      steps.length
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { steps, current: step }),
    step === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepTipo, {}),
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepPessoais, {}),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepPlano, { valorPlano, setValorPlano }),
    step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepDocs, {}),
    step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepRevisao, { valorPlano }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StepNav, { onPrev: step > 0 ? () => setStep(step - 1) : void 0, onNext: () => {
      if (step < steps.length - 1) setStep(step + 1);
      else setDone(true);
    }, nextLabel: step === steps.length - 1 ? "Enviar Requerimento" : "Próximo", isLast: step === steps.length - 1 })
  ] });
}
function StepTipo() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Este fluxo é destinado à mudança de plano, categoria ou operadora. Você deve informar o plano anterior e anexar a documentação do novo plano." }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo de solicitação", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Mudança de plano" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Mudança de categoria" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Mudança de operadora" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Já recebe o auxílio atualmente?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: inputCls, children: /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sim, estou alterando plano/categoria/operadora" }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Processo SEI do auxílio-saúde", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "00050.000000/0000-00" }) })
  ] });
}
function StepPessoais() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome completo", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, defaultValue: "João da Silva" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Matrícula", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, defaultValue: "12345678" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, defaultValue: "123.456.789-00" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data de nascimento", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, defaultValue: "1980-06-10" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "E-mail", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", className: inputCls, defaultValue: "joao.silva@detran.gov.br" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, defaultValue: "(61) 98765-4321" }) })
  ] });
}
function StepPlano({
  valorPlano,
  setValorPlano
}) {
  const [vinc, setVinc] = reactExports.useState("nao");
  const [operadora, setOperadora] = reactExports.useState("");
  const [outraOperadora, setOutraOperadora] = reactExports.useState("");
  const [vigencia, setVigencia] = reactExports.useState("");
  const TETO_VIGENTE = 4e3;
  const numValor = parseFloat(valorPlano.replace(/[^\d]/g, "")) || 0;
  const ultrapassaTeto = numValor > TETO_VIGENTE;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo de plano", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Coletivo empresarial" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Individual" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Por adesão (associação)" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: operadora, onChange: (e) => setOperadora(e.target.value), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a operadora" }),
      OPERADORAS.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op, children: op }, op)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outra", children: "Outra" })
    ] }) }),
    operadora === "Outra" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Digite o nome da operadora", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: outraOperadora, onChange: (e) => setOutraOperadora(e.target.value) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Vinculado a associação?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: ["sim", "nao"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex-1 border rounded-md py-2 text-center text-sm cursor-pointer ${vinc === v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", className: "hidden", checked: vinc === v, onChange: () => setVinc(v) }),
      v === "sim" ? "Sim" : "Não"
    ] }, v)) }) }),
    vinc === "sim" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Qual associação", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Assefaz" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Assetran" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Número da carteirinha", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "000000000000" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Data da Vigência", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: inputCls, value: vigencia, onChange: (e) => setVigencia(e.target.value) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor mensal do titular", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, placeholder: "R$ 1.200,00" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Valor mensal do grupo familiar", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: valorPlano, onChange: (e) => setValorPlano(e.target.value), placeholder: "R$ 0,00" }),
      ultrapassaTeto && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold mb-1", children: "Aviso de Teto:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "O valor informado ultrapassa o teto vigente de reembolso. O cálculo será realizado com base no teto configurado de R$ 4.000,00." })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Houve alteração em relação ao valor anterior?", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Não se aplica / primeira inclusão" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sim, houve reajuste anual" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sim, mudança de faixa etária" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sim, inclusão/exclusão de dependente" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sim, mudança de plano/categoria/operadora" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Justificativa da alteração de valor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, className: inputCls, placeholder: "Explique a variação. A validação da documentação de reajuste será aprofundada na Fase 2." }) })
  ] });
}
function StepDocs() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Integração com SEI em análise — número informado manualmente nesta versão." }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Documento da entidade contratada / contrato do plano", required: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-xs text-foreground mb-1", children: "O documento deve conter:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc ml-4 space-y-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Condição de beneficiário titular;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Indicação dos dependentes;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Tipos de cobertura abrangidos pelo plano de saúde ou seguro privado;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Prazo de validade do contrato ou vigência;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Valor mensal pago pelo beneficiário titular;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Valor mensal pago para cada dependente, com parcelas individualizadas;" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Cópia do contrato de adesão ao plano de saúde contratado ou declaração equivalente." })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Requerimento de exclusão do plano anterior (quando houver mudança)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Comprovante/documento da operadora justificando reajuste ou nova mensalidade", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UploadBox, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "A leitura automática de documentos, OCR e validação detalhada de reajuste serão evolutivas da Fase 2." }) })
  ] });
}
function StepRevisao({
  valorPlano
}) {
  const TETO_VIGENTE = 4e3;
  const PERCENTUAL = 0.9;
  const numValor = parseFloat(valorPlano.replace(/[^\d]/g, "")) || 0;
  const baseCalculo = Math.min(numValor, TETO_VIGENTE);
  const reembolsoEstimado = baseCalculo * PERCENTUAL;
  const participacaoServidor = numValor - reembolsoEstimado;
  const fmt = (v) => {
    if (v === void 0 || v === null) return "R$ 0,00";
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted rounded-xl p-4 text-sm space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Nome", v: "João da Silva" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Matrícula", v: "12345678" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Solicitação", v: "Inclusão ou mudança de plano" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Operadora", v: "Bradesco Saúde" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Associação", v: "Não" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/50 my-2 pt-2 space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Valor total informado", v: fmt(numValor) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Teto vigente", v: fmt(TETO_VIGENTE) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Base considerada", v: fmt(baseCalculo) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Percentual de reembolso", v: "90%" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2 pt-1 font-bold text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Reembolso estimado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmt(reembolsoEstimado) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2 text-[11px] text-muted-foreground italic", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Participação do servidor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmt(participacaoServidor) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { k: "Comprovante", v: "comprovante.pdf" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que não percebo nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que sou responsável pelo pagamento das despesas do seguro/plano de saúde de todos os dependentes relacionados neste requerimento." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "mt-1", defaultChecked: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras." })
      ] })
    ] })
  ] });
}
function Row({
  k,
  v
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-right", children: v })
  ] });
}
function UploadBox() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/50 transition", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-6 w-6 text-muted-foreground mx-auto mb-1" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Tocar para enviar" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "PDF, JPG ou PNG (até 10 MB)" })
  ] });
}
export {
  UploadBox,
  NovoPlano as component
};

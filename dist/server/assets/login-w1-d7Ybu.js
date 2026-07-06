import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-C224CQw9.js";
import { u as useNavigate, L as Link } from "./router-Btr6HUAC.js";
import { S as ShieldCheck } from "./shield-check-sQZFp6Kk.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function Login() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = reactExports.useState("12345678");
  const [senha, setSenha] = reactExports.useState("••••••");
  const [perfil, setPerfil] = reactExports.useState("servidor");
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-8 text-primary-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-12 w-12 mx-auto mb-3 opacity-90" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Pró-Saúde" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm opacity-80", children: "DETRAN • GERDAB" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-2xl p-6 shadow-elevated", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-1 text-center", children: "Login através do Portal Administrativo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mb-6 text-center", children: "Selecione um perfil para simular o acesso no protótipo." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "space-y-4", onSubmit: (e) => {
        e.preventDefault();
        localStorage.setItem("prosaude_role", perfil);
        if (perfil === "servidor") navigate({
          to: "/servidor/inicio"
        });
        else if (perfil === "associacao") navigate({
          to: "/associacao/upload"
        });
        else navigate({
          to: "/admin/dashboard"
        });
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium mb-1.5", children: "Perfil para simulação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [{
            v: "servidor",
            l: "Servidor"
          }, {
            v: "analista",
            l: "Analista"
          }, {
            v: "gerencia",
            l: "Gerência"
          }, {
            v: "associacao",
            l: "Associação"
          }].map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `rounded-md border py-2 text-center cursor-pointer ${perfil === p.v ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", className: "hidden", checked: perfil === p.v, onChange: () => setPerfil(p.v) }),
            p.l
          ] }, p.v)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground italic", children: "A autenticação real será realizada via integração com o Portal Administrativo." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary-light transition", children: "Acessar Sistema" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 text-center flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/primeiro-acesso", className: "text-sm text-primary font-medium hover:underline", children: "Primeiro acesso / Solicitar inclusão" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/associacao", className: "text-sm text-primary font-medium hover:underline", children: "Sou uma Associação Externa e quero me pré-cadastrar" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-center text-xs text-primary-foreground/70", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "underline", children: "Voltar à apresentação" }) })
  ] }) });
}
export {
  Login as component
};

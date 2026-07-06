import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState("12345678");
  const [senha, setSenha] = useState("••••••");
  const [perfil, setPerfil] = useState<"servidor" | "analista" | "gerencia">("servidor");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-primary-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Pró-Saúde</h1>
          <p className="text-sm opacity-80">DETRAN • GERDAB</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-elevated">
          <h2 className="text-lg font-semibold mb-1 text-center">Login através do Portal Administrativo</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Selecione um perfil para simular o acesso no protótipo.
          </p>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem("prosaude_role", perfil);
              if (perfil === "servidor") navigate({ to: "/servidor/inicio" });
              else if (perfil === "associacao") navigate({ to: "/associacao/upload" });
              else navigate({ to: "/admin/dashboard" });
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">Perfil para simulação</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { v: "servidor", l: "Servidor" },
                  { v: "analista", l: "Analista" },
                  { v: "gerencia", l: "Gerência" },
                  { v: "associacao", l: "Associação" },
                ].map((p) => (
                  <label
                    key={p.v}
                    className={`rounded-md border py-2 text-center cursor-pointer ${perfil === p.v ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border"}`}
                  >
                    <input type="radio" className="hidden" checked={perfil === p.v} onChange={() => setPerfil(p.v as typeof perfil)} />
                    {p.l}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground italic">
              A autenticação real será realizada via integração com o Portal Administrativo.
            </div>

            <button type="submit" className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary-light transition">
              Acessar Sistema
            </button>
          </form>

          <div className="mt-5 text-center flex flex-col gap-2">
            <Link to="/primeiro-acesso" className="text-sm text-primary font-medium hover:underline">Primeiro acesso / Solicitar inclusão</Link>
            <Link to="/associacao" className="text-sm text-primary font-medium hover:underline">Sou uma Associação Externa e quero me pré-cadastrar</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/70">
          <Link to="/" className="underline">Voltar à apresentação</Link>
        </p>
      </div>
    </div>
  );
}

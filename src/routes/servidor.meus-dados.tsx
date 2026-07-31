import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { servidorAtual } from "@/lib/mock-data";
import { PendencyBanner } from "@/components/PendencyBanner";

export const Route = createFileRoute("/servidor/meus-dados")({
  component: MeusDados,
});

const fields: [string, string][] = [
  ["Nome completo", servidorAtual.nome],
  ["Matrícula", servidorAtual.matricula],
  ["Data de nascimento", servidorAtual.dataNascimento],
  ["CPF", servidorAtual.cpf],
  ["E-mail institucional", servidorAtual.email],
  ["Telefone", servidorAtual.telefone],
  ["Tipo de plano", servidorAtual.plano],
  ["Associação vinculada", servidorAtual.associacao || "—"],
  ["Processo SEI", servidorAtual.processoSEI],
  ["Início do benefício", servidorAtual.inicioBeneficio],
];

function MeusDados() {
  // Fix #10 — botão navega para o fluxo de requerimento correto
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Meus Dados</h2>
      <p className="text-sm text-muted-foreground">
        Para alterar qualquer informação, abra um requerimento. A GERDAB validará e atualizará o cadastro.
      </p>

      <dl className="bg-card rounded-xl border border-border divide-y divide-border">
        {fields.map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Fix #10 — navega para /servidor/requerimento/novo em vez de href="#" */}
      <button
        onClick={() => navigate({ to: "/servidor/requerimento/novo" })}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary-light transition"
      >
        Solicitar alteração de cadastro
      </button>

      <button
        onClick={() => navigate({ to: "/login" })}
        className="w-full flex items-center justify-center gap-2 border border-border rounded-md py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { IncluirDependenteForm } from "@/components/IncluirDependenteForm";

export const Route = createFileRoute("/servidor/requerimento/incluir-dependente")({
  component: IncluirDep,
});

function IncluirDep() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
          <p className="text-lg font-bold text-status-analise-fg">Em análise</p>
        </div>
        <p className="text-xs text-muted-foreground italic px-2">
          A GERDAB realizará a conferência das informações e documentos enviados.
        </p>
        <Link to="/servidor/dependentes" className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2">
          Ver meus dependentes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-1">Inclusão de Dependente</h2>
      <IncluirDependenteForm onSubmit={() => setDone(true)} />
    </div>
  );
}

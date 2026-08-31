import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, UserPlus } from "lucide-react";
import { FlowInclusao } from "./primeiro-acesso";

export const Route = createFileRoute("/associacao/nova-inclusao")({
  component: NovaInclusaoAssetran,
});

// Reaproveita o mesmo fluxo de 5 passos (Titular, Plano, Dependentes, Docs, Final) do
// Requerimento de Primeira Inclusão (`FlowInclusao`, em primeiro-acesso.tsx) — antes esta tela
// tinha um formulário próprio, simplificado e com campos diferentes dos do requerimento
// padrão. `associacaoFixa="Assetran"` troca a seleção de Operadora/Administradora por um
// campo fixo "Associação: Assetran" (a associação já É o vínculo do beneficiário, não faz
// sentido perguntar) e dispensa o envio de comprovantes pessoais no passo de documentos (a
// ASSETRAN é quem envia a comprovação, coletivamente, depois). O upload do "Requerimento de
// Inclusão Assinado (Titular)" — o requerimento físico já assinado e digitalizado — continua
// aparecendo, vindo do próprio `isAssociacao` do componente compartilhado.
function NovaInclusaoAssetran() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto mt-10">
        <div className="bg-card rounded-2xl p-8 shadow-elevated text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            O requerimento de inclusão foi encaminhado à GERDAB com a documentação anexada.
          </p>
          <div className="bg-muted rounded-lg py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Associação Responsável</p>
            <p className="text-lg font-bold text-primary">ASSETRAN</p>
          </div>
          <Link
            to="/associacao/gerenciamento"
            className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2"
          >
            Voltar ao Gerenciamento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
      <Link
        to="/associacao/gerenciamento"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Nova Inclusão de Beneficiário</h1>
      </div>
      <FlowInclusao
        isAssociacao
        associacaoFixa="Assetran"
        onCancel={() => navigate({ to: "/associacao/gerenciamento" })}
        onDone={() => setDone(true)}
      />
    </div>
  );
}

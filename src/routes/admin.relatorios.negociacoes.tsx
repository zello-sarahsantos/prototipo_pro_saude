import { createFileRoute } from "@tanstack/react-router";
import { GuardaPerfilAdmin } from "@/components/negociacoes/ui";
import { RessarcimentoNegociacoes } from "@/components/negociacoes/RessarcimentoNegociacoes";

// Mesma implementação e mesma fonte de dados da aba "Relatório de ressarcimento" em Negociações.
export const Route = createFileRoute("/admin/relatorios/negociacoes")({
  component: () => (
    <GuardaPerfilAdmin>
      <RessarcimentoNegociacoes contexto="relatorios" />
    </GuardaPerfilAdmin>
  ),
});

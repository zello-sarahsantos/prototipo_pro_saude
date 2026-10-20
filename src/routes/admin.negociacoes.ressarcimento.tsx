import { createFileRoute } from "@tanstack/react-router";
import { GuardaPerfilAdmin } from "@/components/negociacoes/ui";
import { RessarcimentoNegociacoes } from "@/components/negociacoes/RessarcimentoNegociacoes";

export const Route = createFileRoute("/admin/negociacoes/ressarcimento")({
  component: () => (
    <GuardaPerfilAdmin>
      <RessarcimentoNegociacoes contexto="negociacoes" />
    </GuardaPerfilAdmin>
  ),
});

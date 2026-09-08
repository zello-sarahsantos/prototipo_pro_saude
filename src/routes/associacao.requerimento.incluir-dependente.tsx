import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { servidoresList } from "@/lib/mock-data";
import { IncluirDependenteForm, type IncluirDependenteValue } from "@/components/IncluirDependenteForm";
import { DOCUMENTOS_POR_TIPO_DEPENDENTE } from "@/lib/form-options";
import { criarRequerimentoAssociacao, type DocumentoRequerimentoAssociacao } from "@/lib/requerimentos-associacao";

/**
 * Wrapper da Área da Associação para o Requerimento de Inclusão de Dependente — `IncluirDependenteForm`
 * já é um componente portátil (sem nenhuma dependência do usuário logado), então basta
 * disponibilizá-lo aqui e conectar a submissão à engine de requerimentos da Associação.
 */
export const Route = createFileRoute("/associacao/requerimento/incluir-dependente")({
  component: IncluirDependenteAssociacao,
  validateSearch: (search: Record<string, unknown>): { beneficiario?: string } => ({
    beneficiario: typeof search.beneficiario === "string" ? search.beneficiario : undefined,
  }),
});

function IncluirDependenteAssociacao() {
  const { beneficiario } = Route.useSearch();
  const servidorListItem = servidoresList.find((s) => s.matricula === beneficiario);
  const [done, setDone] = useState(false);

  if (!servidorListItem) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
        <Link to="/associacao/gerenciamento" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Gerenciamento
        </Link>
        <p className="text-sm text-destructive">Beneficiário não encontrado. Volte ao Gerenciamento e abra o requerimento a partir da ficha.</p>
      </div>
    );
  }

  function handleSubmit(value: IncluirDependenteValue) {
    const documentos: DocumentoRequerimentoAssociacao[] = DOCUMENTOS_POR_TIPO_DEPENDENTE[value.parentesco].map((doc) => ({
      nome: doc,
      categoria: "dependente",
      dependenteNome: value.nome,
    }));
    criarRequerimentoAssociacao({
      associacao: "Assetran",
      tipo: "inclusao_dependente",
      beneficiarioNome: servidorListItem!.nome,
      beneficiarioId: servidorListItem!.matricula,
      resumo: `Inclusão de Dependente — ${value.nome} (${value.parentesco}) para ${servidorListItem!.nome}`,
      documentos,
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4 inline-block">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
          <p className="text-lg font-bold text-status-analise-fg">Pendente de Validação</p>
        </div>
        <p className="text-xs text-muted-foreground italic px-2">
          A GERDAB realizará a conferência das informações e documentos enviados.
        </p>
        <Link
          to="/associacao/gerenciamento/$id"
          params={{ id: servidorListItem.matricula }}
          className="block w-full max-w-xs mx-auto bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2"
        >
          Voltar à ficha do beneficiário
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
      <Link
        to="/associacao/gerenciamento/$id"
        params={{ id: servidorListItem.matricula }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à ficha de {servidorListItem.nome}
      </Link>
      <h2 className="text-lg font-semibold mb-1">Inclusão de Dependente — {servidorListItem.nome}</h2>
      <IncluirDependenteForm onSubmit={handleSubmit} cancelTo={`/associacao/gerenciamento/${servidorListItem.matricula}`} />
    </div>
  );
}

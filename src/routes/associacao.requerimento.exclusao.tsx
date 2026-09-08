import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { servidoresList } from "@/lib/mock-data";
import { dependentesDoBeneficiario } from "@/lib/associacao-beneficiario";
import { Exclusao, type ExclusaoSubmitPayload } from "./servidor.requerimento.exclusao";
import { criarRequerimentoAssociacao, type DocumentoRequerimentoAssociacao } from "@/lib/requerimentos-associacao";

/**
 * Wrapper da Área da Associação para o Requerimento de Exclusão — reaproveita integralmente o
 * componente funcional `Exclusao` (mesmas regras de seleção/motivo/data do Portal do Servidor).
 */
export const Route = createFileRoute("/associacao/requerimento/exclusao")({
  component: ExclusaoAssociacao,
  validateSearch: (search: Record<string, unknown>): { beneficiario?: string } => ({
    beneficiario: typeof search.beneficiario === "string" ? search.beneficiario : undefined,
  }),
});

function ExclusaoAssociacao() {
  const { beneficiario } = Route.useSearch();
  const servidorListItem = servidoresList.find((s) => s.matricula === beneficiario);
  const voltarFichaTo = beneficiario ? `/associacao/gerenciamento/${beneficiario}` : "/associacao/gerenciamento";

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

  const dependentesAtivos = dependentesDoBeneficiario(servidorListItem);

  function handleSubmit(payload: ExclusaoSubmitPayload) {
    const documentos: DocumentoRequerimentoAssociacao[] = [
      { nome: "Requerimento de Exclusão", categoria: payload.tipo === "titular" ? "titular" : "dependente", dependenteNome: payload.tipo === "dependente" ? payload.dependenteSelecionado : undefined },
    ];
    criarRequerimentoAssociacao({
      associacao: "Assetran",
      tipo: "exclusao",
      beneficiarioNome: servidorListItem!.nome,
      beneficiarioId: servidorListItem!.matricula,
      resumo:
        payload.tipo === "titular"
          ? `Exclusão do titular — ${servidorListItem!.nome} (encerra grupo familiar)`
          : `Exclusão de dependente — ${payload.dependenteSelecionado} (${servidorListItem!.nome})`,
      documentos,
    });
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
      <Exclusao
        servidor={undefined}
        dependentesIniciais={dependentesAtivos}
        onSubmit={handleSubmit}
        voltarTo={voltarFichaTo}
        voltarLabel="Cancelar"
        voltarFinalTo={voltarFichaTo}
        voltarFinalLabel="Voltar à ficha do beneficiário"
        statusLabel="Pendente de Validação"
      />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { servidoresList } from "@/lib/mock-data";
import { servidorParaFormularioRequerimento, dependentesDoBeneficiario } from "@/lib/associacao-beneficiario";
import { DOCUMENTOS_POR_TIPO_DEPENDENTE } from "@/lib/form-options";
import { NovoPlano, type MudancaPlanoSubmitPayload } from "./servidor.requerimento.novo-plano";
import { criarRequerimentoAssociacao, type DocumentoRequerimentoAssociacao } from "@/lib/requerimentos-associacao";

/**
 * Wrapper da Área da Associação para o Requerimento de Mudança de Plano — reaproveita
 * integralmente o componente funcional `NovoPlano` (mesmos campos, regras, validações e
 * documentação do Portal do Servidor, ver `servidor.requerimento.novo-plano.tsx`). Só a fonte do
 * beneficiário e o destino da submissão mudam; nenhuma regra é duplicada ou reescrita aqui.
 */
export const Route = createFileRoute("/associacao/requerimento/novo-plano")({
  component: NovoPlanoAssociacao,
  validateSearch: (search: Record<string, unknown>): { beneficiario?: string } => ({
    beneficiario: typeof search.beneficiario === "string" ? search.beneficiario : undefined,
  }),
});

function NovoPlanoAssociacao() {
  const { beneficiario } = Route.useSearch();
  const servidorListItem = servidoresList.find((s) => s.matricula === beneficiario);
  const voltarTo = beneficiario ? `/associacao/gerenciamento/${beneficiario}` : "/associacao/gerenciamento";

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

  const servidor = servidorParaFormularioRequerimento(servidorListItem);
  const dependentesAtivos = dependentesDoBeneficiario(servidorListItem);
  const beneficiarioNome = servidorListItem.nome;
  const beneficiarioIdSelecionado = servidorListItem.matricula;

  function handleSubmit(payload: MudancaPlanoSubmitPayload) {
    const documentos: DocumentoRequerimentoAssociacao[] = [
      { nome: "Documento da entidade contratada / contrato do plano", categoria: "titular" },
    ];
    Object.entries(payload.dependentsData).forEach(([depId, data]) => {
      if (data.action === "migrar_outro") {
        const dep = dependentesAtivos.find((d) => d.id === depId);
        documentos.push({
          nome: "Documento da entidade contratada / contrato ou declaração de permanência do plano do dependente",
          categoria: "dependente",
          dependenteNome: dep?.nome,
        });
      }
    });
    payload.novosDependentes.forEach((nd) => {
      DOCUMENTOS_POR_TIPO_DEPENDENTE[nd.parentesco].forEach((docNome) => {
        documentos.push({ nome: docNome, categoria: "dependente", dependenteNome: nd.nome });
      });
    });

    const novaOperadora = payload.newPlanData.operadora === "Outra" ? payload.newPlanData.outraOperadora : payload.newPlanData.operadora;
    criarRequerimentoAssociacao({
      associacao: "Assetran",
      tipo: "mudanca_plano",
      beneficiarioNome,
      beneficiarioId: beneficiarioIdSelecionado,
      resumo: `Mudança de Plano — ${beneficiarioNome}${novaOperadora ? ` → ${novaOperadora}` : ""}`,
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
      <NovoPlano
        servidor={servidor}
        dependentesIniciais={dependentesAtivos}
        onSubmit={handleSubmit}
        voltarTo={voltarTo}
        voltarLabel="Voltar à ficha do beneficiário"
        statusLabel="Pendente de Validação"
        cancelTo={voltarTo}
      />
    </div>
  );
}

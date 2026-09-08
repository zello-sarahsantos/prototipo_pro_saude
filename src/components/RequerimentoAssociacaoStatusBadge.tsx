import { statusComprovanteCore } from "@/lib/mock-data";
import {
  statusRequerimentoAssociacaoLabels,
  corPorStatusRequerimentoAssociacao,
  type StatusRequerimentoAssociacao,
} from "@/lib/requerimentos-associacao";

/**
 * Badge de status para requerimentos originados pela Área da Associação (Nova Inclusão, e no
 * futuro Mudança de Plano/Inclusão de Dependente/Exclusão) — reaproveita EXATAMENTE as cores já
 * definidas para `StatusComprovante` (`statusComprovanteCore`), nunca uma paleta nova, mesmo
 * princípio já usado em `PlanilhaStatusBadge`. O rótulo é próprio deste domínio (nunca forçado a
 * um `StatusKey` existente — "Aguardando Complementação" não tem equivalente em `StatusKey`).
 */
export function RequerimentoAssociacaoStatusBadge({ status }: { status: StatusRequerimentoAssociacao }) {
  const { bg, fg } = statusComprovanteCore[corPorStatusRequerimentoAssociacao[status]];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {statusRequerimentoAssociacaoLabels[status]}
    </span>
  );
}

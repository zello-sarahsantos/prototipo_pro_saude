import { statusComprovanteCore } from "@/lib/mock-data";
import { statusPlanilhaLabels, corPorStatusPlanilha, type StatusPlanilhaAssociacao } from "@/lib/planilhas-associacao";

/**
 * Badge de status para a entidade Planilha da Associação — reaproveita EXATAMENTE as cores já
 * definidas para `StatusComprovante` (`statusComprovanteCore`), nunca uma paleta nova (decisão
 * P1). O rótulo, porém, é contextualizado ao vocabulário de planilha (nunca "Recusado" para uma
 * planilha negada — sempre "Negada"). Mesmo padrão visual de `StatusBadge`/`ComprovanteStatusBadge`
 * (pílula + ponto sólido em `currentColor`).
 */
export function PlanilhaStatusBadge({ status }: { status: StatusPlanilhaAssociacao }) {
  const { bg, fg } = statusComprovanteCore[corPorStatusPlanilha[status]];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {statusPlanilhaLabels[status]}
    </span>
  );
}

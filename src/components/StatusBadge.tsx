import type { StatusKey } from "@/lib/mock-data";
import { statusLabels } from "@/lib/mock-data";

const map: Record<StatusKey, string> = {
  pendente: "bg-status-pendente-bg text-status-pendente-fg",
  aprovado: "bg-status-aprovado-bg text-status-aprovado-fg",
  ativo: "bg-status-aprovado-bg text-status-aprovado-fg",
  rejeitado: "bg-status-rejeitado-bg text-status-rejeitado-fg",
  inativo: "bg-status-inativo-bg text-status-inativo-fg",
  analise: "bg-status-analise-bg text-status-analise-fg",
  alerta: "bg-status-pendente-bg text-status-pendente-fg",
};

export function StatusBadge({ status, label }: { status: StatusKey; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? statusLabels[status]}
    </span>
  );
}

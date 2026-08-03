import { AlertTriangle, Users } from "lucide-react";
import type { BeneficiarioPagamento, Comprovante } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";

export function BeneficiarioSelector({
  beneficiarios,
  competencia,
  comprovantesExistentes,
  selecionados,
  onChange,
}: {
  beneficiarios: BeneficiarioPagamento[];
  competencia: string;
  comprovantesExistentes: Comprovante[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const jaTemDocumento = (id: string) =>
    comprovantesExistentes.some(
      (c) => c.beneficiarioIds.includes(id) && c.competencia === competencia,
    );

  const toggle = (id: string) => {
    onChange(
      selecionados.includes(id)
        ? selecionados.filter((s) => s !== id)
        : [...selecionados, id],
    );
  };

  const todosSelecionados = beneficiarios.every((b) => selecionados.includes(b.id));

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange(todosSelecionados ? [] : beneficiarios.map((b) => b.id))}
        className="flex items-center gap-2 text-sm text-primary font-medium mb-1"
      >
        <Users className="h-4 w-4" />
        {todosSelecionados ? "Limpar seleção" : "Selecionar grupo familiar completo"}
      </button>

      {beneficiarios.map((b) => {
        const checked = selecionados.includes(b.id);
        const alerta = jaTemDocumento(b.id);
        return (
          <label
            key={b.id}
            className={`flex items-start gap-3 p-3 bg-card rounded-xl border transition cursor-pointer ${
              checked ? "border-primary" : "border-border"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(b.id)}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{b.nome}</p>
              <p className="text-xs text-muted-foreground">
                {b.parentesco} • {b.operadora} • {formatCurrency(b.valorCadastrado)}
              </p>
              {alerta && (
                <p className="mt-1 text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Já existe comprovante enviado nesta competência — este será um documento complementar.
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

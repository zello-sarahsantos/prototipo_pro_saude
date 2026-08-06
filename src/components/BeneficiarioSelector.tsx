import { AlertTriangle, Building2, Users } from "lucide-react";
import type { BeneficiarioPagamento, Comprovante } from "@/lib/mock-data";
import { formatCurrency, modalidadePlanoLabels } from "@/lib/mock-data";
import { agruparBeneficiariosElegiveis } from "@/lib/comprovante-status";

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

  const { grupos, vinculadosAssociacao } = agruparBeneficiariosElegiveis(beneficiarios);

  // Só 1 grupo pode estar "ativo" por vez — assim que alguém de um grupo é selecionado, os
  // demais grupos ficam bloqueados, pois beneficiários de operadora/modalidade diferentes
  // não podem compor o mesmo envio.
  const grupoAtivo = grupos.find((g) => g.beneficiarios.some((b) => selecionados.includes(b.id)));

  const toggleGrupoCompleto = (idsGrupo: string[], todosSelecionados: boolean) => {
    onChange(
      todosSelecionados
        ? selecionados.filter((id) => !idsGrupo.includes(id))
        : [...new Set([...selecionados, ...idsGrupo])],
    );
  };

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const idsGrupo = grupo.beneficiarios.map((b) => b.id);
        const desabilitado = !!grupoAtivo && grupoAtivo.chave !== grupo.chave;
        const todosSelecionados = grupo.beneficiarios.every((b) => selecionados.includes(b.id));

        return (
          <div
            key={grupo.chave}
            className={`rounded-xl border border-border p-3 space-y-2 transition ${desabilitado ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {grupo.operadora} • {modalidadePlanoLabels[grupo.modalidadePlano]}
              </p>
              {!desabilitado && grupo.beneficiarios.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleGrupoCompleto(idsGrupo, todosSelecionados)}
                  className="text-xs text-primary font-medium flex items-center gap-1 shrink-0"
                >
                  <Users className="h-3.5 w-3.5" />
                  {todosSelecionados ? "Limpar seleção" : "Selecionar todos deste grupo"}
                </button>
              )}
            </div>

            {desabilitado && (
              <p className="text-xs text-muted-foreground italic">
                Plano diferente — envie em uma solicitação separada.
              </p>
            )}

            <div className="space-y-2">
              {grupo.beneficiarios.map((b) => {
                const checked = selecionados.includes(b.id);
                const alerta = jaTemDocumento(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-start gap-3 p-3 bg-card rounded-xl border transition ${
                      desabilitado ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    } ${checked ? "border-primary" : "border-border"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={desabilitado}
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
          </div>
        );
      })}

      {vinculadosAssociacao.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Comprovação coletiva
          </p>
          {vinculadosAssociacao.map((b) => (
            <p key={b.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{b.nome}</span> — vinculado à {b.associacao}.
              Comprovação coletiva, não é necessário envio individual.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

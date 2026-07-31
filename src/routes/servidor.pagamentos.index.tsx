import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileUp, ShieldAlert } from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import {
  beneficiariosPagamento,
  comprovantes as comprovantesSeed,
  competenciaAtual,
  formatCompetencia,
  servidorAtual,
} from "@/lib/mock-data";
import { loadComprovantesPagamento } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/servidor/pagamentos/")({
  component: PagamentosHome,
});

// Servidores vinculados a associação enviam comprovação coletiva (mesma regra de /servidor/requerimento/novo)
const associacao = servidorAtual.associacao !== "—" ? servidorAtual.associacao : null;

function PagamentosHome() {
  const comprovantes = useMemo(
    () => [...comprovantesSeed, ...loadComprovantesPagamento()],
    [],
  );

  const daCompetenciaAtual = comprovantes.filter((c) => c.competencia === competenciaAtual);

  return (
    <div className="p-4 space-y-5">
      <section>
        <h2 className="text-lg font-semibold">Pagamentos</h2>
        <p className="text-sm text-muted-foreground">
          Envio de comprovantes do auxílio-saúde — competência {formatCompetencia(competenciaAtual)}.
        </p>
      </section>

      {associacao ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Você está vinculado à {associacao}</p>
            <p className="text-muted-foreground mt-1">
              A comprovação mensal é enviada coletivamente pela {associacao} — não é necessário
              enviar comprovante individual.
            </p>
          </div>
        </section>
      ) : (
        <Link
          to="/servidor/pagamentos/enviar"
          className="flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-xl shadow-card hover:bg-primary-light transition"
        >
          <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Enviar comprovante de pagamento</p>
            <p className="text-xs opacity-90">Boleto, recibo ou demonstrativo do plano de saúde</p>
          </div>
        </Link>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Situação da competência {formatCompetencia(competenciaAtual)}
        </h3>
        <div className="space-y-2">
          {beneficiariosPagamento.map((b) => {
            const doBeneficiario = daCompetenciaAtual.filter((c) => c.beneficiarioIds.includes(b.id));
            // Último envio da lista = mais recente (seed em ordem cronológica + envios da sessão ao final)
            const maisRecente = doBeneficiario[doBeneficiario.length - 1];
            return (
              <div key={b.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.nome}</p>
                  <p className="text-xs text-muted-foreground">{b.parentesco}</p>
                </div>
                {!maisRecente ? (
                  <ComprovanteStatusBadge status="ilegivel" label="Sem comprovante" />
                ) : (
                  <ComprovanteStatusBadge status={maisRecente.status} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {comprovantes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Histórico de envios
          </h3>
          <div className="space-y-2">
            {comprovantes
              .slice()
              .reverse()
              .map((c) => (
                <div key={c.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCompetencia(c.competencia)}
                      {c.isRetroativo && " • Retroativo"}
                    </p>
                  </div>
                  <ComprovanteStatusBadge status={c.status} />
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

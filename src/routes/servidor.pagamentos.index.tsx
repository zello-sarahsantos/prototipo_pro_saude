import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, FileUp, ShieldAlert, AlertTriangle } from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { ServidorComprovanteDetail } from "@/components/ServidorComprovanteDetail";
import {
  beneficiariosPagamento,
  competenciaAtual,
  formatCompetencia,
  servidorAtual,
  type Comprovante,
} from "@/lib/mock-data";
import { getComprovantesUnificados } from "@/lib/prosaude-storage";
import { getCompetenciasPendentes } from "@/lib/competencias-pendentes";

export const Route = createFileRoute("/servidor/pagamentos/")({
  component: PagamentosHome,
});

// Servidores vinculados a associação enviam comprovação coletiva (mesma regra de /servidor/requerimento/novo)
const associacao = servidorAtual.associacao !== "—" ? servidorAtual.associacao : null;

function PagamentosHome() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [detalhe, setDetalhe] = useState<{ comprovante: Comprovante; beneficiarioId?: string } | null>(null);
  const [mostrarTodasPendentes, setMostrarTodasPendentes] = useState(false);

  const comprovantes = useMemo(() => getComprovantesUnificados(), [refreshKey]);
  const daCompetenciaAtual = comprovantes.filter((c) => c.competencia === competenciaAtual);
  const competenciasPendentes = useMemo(() => getCompetenciasPendentes(), [refreshKey]);
  const pendentesExibidas = mostrarTodasPendentes ? competenciasPendentes : competenciasPendentes.slice(0, 3);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

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

      {competenciasPendentes.length > 0 && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <h3 className="font-semibold text-destructive text-sm">
              Competências pendentes ({competenciasPendentes.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendentesExibidas.map((c) => (
              <div
                key={c}
                className="bg-card rounded-lg p-3 border border-border flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{formatCompetencia(c)}</p>
                  <p className="text-xs text-muted-foreground">Prazo encerrado.</p>
                </div>
                <Link
                  to="/servidor/pagamentos/enviar"
                  search={{ competencia: c }}
                  className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light shrink-0"
                >
                  Enviar retroativo
                </Link>
              </div>
            ))}
          </div>
          {competenciasPendentes.length > 3 && !mostrarTodasPendentes && (
            <button
              onClick={() => setMostrarTodasPendentes(true)}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Ver todas ({competenciasPendentes.length})
            </button>
          )}
        </section>
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
              <button
                key={b.id}
                onClick={() => maisRecente && setDetalhe({ comprovante: maisRecente, beneficiarioId: b.id })}
                disabled={!maisRecente}
                className="w-full text-left bg-card rounded-xl p-3 border border-border flex items-center gap-3 disabled:cursor-default hover:border-primary/40 disabled:hover:border-border transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.nome}</p>
                  <p className="text-xs text-muted-foreground">{b.parentesco}</p>
                </div>
                {!maisRecente ? (
                  <ComprovanteStatusBadge status="ilegivel" label="Sem comprovante" />
                ) : (
                  <>
                    <ComprovanteStatusBadge status={maisRecente.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                )}
              </button>
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
                <button
                  key={c.id}
                  onClick={() => setDetalhe({ comprovante: c })}
                  className="w-full text-left bg-card rounded-xl p-3 border border-border flex items-center gap-3 hover:border-primary/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCompetencia(c.competencia)}
                      {c.isRetroativo && " • Retroativo"}
                    </p>
                  </div>
                  <ComprovanteStatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
          </div>
        </section>
      )}

      {detalhe && (
        <ServidorComprovanteDetail
          comprovante={comprovantes.find((c) => c.id === detalhe.comprovante.id) ?? detalhe.comprovante}
          focusBeneficiarioId={detalhe.beneficiarioId}
          onClose={() => setDetalhe(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  FileUp,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Paperclip,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { ComprovanteStatusBadge } from "@/components/ComprovanteStatusBadge";
import { ServidorComprovanteDetail } from "@/components/ServidorComprovanteDetail";
import {
  beneficiariosPagamento,
  competenciaAtual,
  formatCompetencia,
  formatCurrency,
  servidorAtual,
  type Comprovante,
} from "@/lib/mock-data";
import { getComprovantesUnificados } from "@/lib/prosaude-storage";
import { getCompetenciasPendentes, getBeneficiariosFaltantes } from "@/lib/competencias-pendentes";
import { getExtratoServidor } from "@/lib/fechamento-pagamento";

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
  const beneficiariosFaltantes = useMemo(() => getBeneficiariosFaltantes(competenciaAtual), [refreshKey]);

  // Grupo familiar sem comprovação coletiva (mesma regra usada em toda a tela acima) — usado
  // para casar cada comprovante com a competência a que ele pertence no Histórico de Comprovações.
  const grupo = beneficiariosPagamento.filter((b) => !b.associacao);
  const titular = beneficiariosPagamento.find((b) => b.parentesco === "Titular");

  // Histórico de Comprovações — evolução do antigo "Histórico de envios": em vez de listar
  // documentos soltos, resume por competência (reaproveita `getExtratoServidor`, a mesma fonte
  // já usada no Extrato administrativo — nenhum motor de cálculo/classificação novo). O nome e o
  // conceito foram corrigidos: é o histórico das comprovações apresentadas por competência, não
  // um "histórico de pagamentos" — o reembolso só acontece depois da comprovação ser aprovada.
  const historicoComprovacoes = useMemo(() => {
    if (!titular) return [];
    return [...getExtratoServidor(titular.id)].reverse().map((linha) => {
      const doCompetencia = comprovantes.filter(
        (c) => c.competencia === linha.competencia && c.beneficiarioIds.some((id) => grupo.some((b) => b.id === id)),
      );
      return {
        ...linha,
        documentos: doCompetencia.flatMap((c) => c.arquivos.map((a) => a.nome)),
        comprovanteMaisRecente: doCompetencia[doCompetencia.length - 1],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprovantes, titular?.id]);

  function abrirDetalheDoBeneficiario(beneficiarioId: string) {
    const doBeneficiario = daCompetenciaAtual.filter((c) => c.beneficiarioIds.includes(beneficiarioId));
    const maisRecente = doBeneficiario[doBeneficiario.length - 1];
    if (maisRecente) setDetalhe({ comprovante: maisRecente, beneficiarioId });
  }

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

      {beneficiariosFaltantes.length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <h3 className="font-semibold text-warning text-sm">
              Competência {formatCompetencia(competenciaAtual)} incompleta
            </h3>
          </div>
          <div className="space-y-2">
            {beneficiariosFaltantes.map(({ beneficiarioId, motivo }) => {
              const beneficiario = beneficiariosPagamento.find((b) => b.id === beneficiarioId);
              if (!beneficiario) return null;
              return (
                <div key={beneficiarioId} className="bg-card rounded-lg p-3 border border-border space-y-2">
                  <p className="text-sm font-medium">
                    {beneficiario.nome} {motivo === "sem_comprovante" ? "ainda não possui comprovante." : "possui documento ilegível."}
                  </p>
                  {motivo === "sem_comprovante" ? (
                    <Link
                      to="/servidor/pagamentos/enviar"
                      search={{ competencia: competenciaAtual, beneficiario: beneficiarioId }}
                      className="inline-flex text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light items-center gap-1.5"
                    >
                      <Paperclip className="h-3.5 w-3.5" /> Anexar comprovante
                    </Link>
                  ) : (
                    <button
                      onClick={() => abrirDetalheDoBeneficiario(beneficiarioId)}
                      className="inline-flex text-xs font-medium border border-border rounded-md px-3 py-2 hover:bg-muted items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Substituir documento
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Situação da competência {formatCompetencia(competenciaAtual)}
        </h3>
        <div className="space-y-2">
          {beneficiariosPagamento.map((b) => {
            // Vinculados a associação têm comprovação coletiva — nunca enviam individualmente
            // nesta competência, então não faz sentido mostrar "Sem comprovante" para eles.
            if (b.associacao) {
              return (
                <div
                  key={b.id}
                  className="w-full bg-card rounded-xl p-3 border border-border flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.nome}</p>
                    <p className="text-xs text-muted-foreground">{b.parentesco} • Vinculado à {b.associacao}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground italic">Comprovação coletiva</span>
                </div>
              );
            }

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

      {historicoComprovacoes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de Comprovações
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Comprovações apresentadas por competência — o reembolso só ocorre após a análise e
            aprovação do comprovante.
          </p>
          <div className="space-y-2">
            {historicoComprovacoes.map((linha) => (
              <button
                key={linha.competencia}
                onClick={() => linha.comprovanteMaisRecente && setDetalhe({ comprovante: linha.comprovanteMaisRecente })}
                disabled={!linha.comprovanteMaisRecente}
                className="w-full text-left bg-card rounded-xl p-3 border border-border flex flex-col gap-1.5 disabled:cursor-default hover:border-primary/40 disabled:hover:border-border transition"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{formatCompetencia(linha.competencia)}</p>
                  <div className="flex items-center gap-2 ml-auto">
                    {linha.houvePagamento && (
                      <span className="text-xs font-medium shrink-0">{formatCurrency(linha.valor)}</span>
                    )}
                    {linha.statusComprovante ? (
                      <ComprovanteStatusBadge status={linha.statusComprovante} />
                    ) : (
                      <ComprovanteStatusBadge status="ilegivel" label="Sem comprovação" />
                    )}
                    {linha.comprovanteMaisRecente && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {linha.documentos.length > 0 ? linha.documentos.join(", ") : "Sem comprovação apresentada"}
                  {/* "Retroativo" já aparece no rótulo do badge de status (statusComprovanteLabels)
                      para todo status da família retroativo_* — não repetir aqui evita
                      redundância visual (ver ocorrenciaRetroativo só como dado, não como chip). */}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <Link
        to="/servidor/comprovante-rendimentos"
        className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border hover:border-primary/40 transition"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Comprovante de Rendimentos</p>
          <p className="text-xs text-muted-foreground">Valores efetivamente recebidos, por ano.</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

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

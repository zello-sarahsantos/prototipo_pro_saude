import { useMemo, useState } from "react";
import { AlertTriangle, FileWarning, Paperclip } from "lucide-react";
import { beneficiariosPagamento, formatCompetencia, formatCurrency } from "@/lib/mock-data";
import {
  getComprovantesUnificados,
  getBeneficiariosDispensadosIds,
  dispensarBeneficiario,
  getConclusaoCompetencia,
} from "@/lib/prosaude-storage";
import {
  getCamposDoBeneficiario,
  statusDoBeneficiarioNoDocumento,
  beneficiarioTemCampoVazio,
} from "@/lib/comprovante-status";

export function ConsolidadoCompetencia({
  competencia,
  onAnexarDependente,
  onConcluir,
  onRefresh,
  refreshKey,
}: {
  competencia: string;
  onAnexarDependente: (beneficiarioId: string) => void;
  /** "Concluir envio da competência" — só registra a conclusão, não salva comprovantes. */
  onConcluir: () => void;
  /** Força o pai a re-renderizar (incrementa `refreshKey`) após uma dispensa. */
  onRefresh: () => void;
  /** Incrementar para forçar releitura dos dados persistidos após uma dispensa. */
  refreshKey: number;
}) {
  const [confirmandoDispensa, setConfirmandoDispensa] = useState<string | null>(null);

  const dados = useMemo(() => {
    const todos = getComprovantesUnificados().filter((c) => c.competencia === competencia);
    const dispensadosIds = new Set(getBeneficiariosDispensadosIds(competencia));

    const linhas = beneficiariosPagamento.map((b) => {
      const docs = todos.filter((c) => c.beneficiarioIds.includes(b.id));
      const dispensado = dispensadosIds.has(b.id);

      if (docs.length === 0) {
        return {
          beneficiario: b,
          total: 0,
          semComprovante: true,
          dispensado,
          pendente: !dispensado,
        };
      }

      const total = docs.reduce((soma, doc) => {
        const campoValor = getCamposDoBeneficiario(doc, b.id).find((c) => c.chave === "valor");
        return soma + (campoValor ? parseFloat(campoValor.valor) || 0 : 0);
      }, 0);

      const temPendenciaNoDocumento = docs.some((doc) => {
        const status = statusDoBeneficiarioNoDocumento(doc, b.id);
        return status === "ilegivel" || status === "correcao_solicitada" || beneficiarioTemCampoVazio(doc, b.id);
      });

      return {
        beneficiario: b,
        total,
        semComprovante: false,
        dispensado: false,
        pendente: temPendenciaNoDocumento,
      };
    });

    const documentos = todos.length;
    const pendencias = linhas.filter((l) => l.pendente).length;
    const totalGrupo = linhas.reduce((soma, l) => soma + l.total, 0);

    return { linhas, documentos, pendencias, totalGrupo };
  }, [competencia, refreshKey]);

  const pendenciaAtiva = dados.linhas.some((l) => l.semComprovante && !l.dispensado);

  function confirmarDispensa(beneficiarioId: string) {
    dispensarBeneficiario(beneficiarioId, competencia);
    setConfirmandoDispensa(null);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Resumo da competência</h2>
        <p className="text-sm text-muted-foreground">
          Consolidado de todos os comprovantes anexados para este grupo familiar em{" "}
          {formatCompetencia(competencia)}. Confira antes de concluir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{dados.documentos}</p>
          <p className="text-xs text-muted-foreground">Documentos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className={`text-2xl font-bold ${dados.pendencias > 0 ? "text-destructive" : ""}`}>
            {dados.pendencias}
          </p>
          <p className="text-xs text-muted-foreground">Pendências</p>
        </div>
      </div>

      {dados.linhas
        .filter((l) => l.semComprovante && !l.dispensado)
        .map((l) => (
          <div key={l.beneficiario.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-destructive">
                {l.beneficiario.nome} ainda não tem comprovante
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {l.beneficiario.parentesco} · envie o comprovante antes de concluir, ou o valor não entra no reembolso
              desta competência.
            </p>
            {confirmandoDispensa === l.beneficiario.id ? (
              <div className="bg-card rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs">
                  <strong>{l.beneficiario.nome}</strong> não será considerada no cálculo desta competência. Deseja
                  continuar?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmandoDispensa(null)}
                    className="text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => confirmarDispensa(l.beneficiario.id)}
                    className="text-xs bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 hover:opacity-90"
                  >
                    Continuar sem {l.beneficiario.nome.split(" ")[0]}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onAnexarDependente(l.beneficiario.id)}
                  className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary-light flex items-center gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Anexar comprovante do dependente
                </button>
                <button
                  onClick={() => setConfirmandoDispensa(l.beneficiario.id)}
                  className="text-xs font-medium border border-border rounded-md px-3 py-2 hover:bg-muted"
                >
                  Continuar sem este beneficiário
                </button>
              </div>
            )}
          </div>
        ))}

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {dados.linhas.map((l) => (
          <div key={l.beneficiario.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{l.beneficiario.nome}</p>
              <p className="text-xs text-muted-foreground">{l.beneficiario.parentesco}</p>
              {l.dispensado && (
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  Sem comprovante — não incluída nesta competência
                </p>
              )}
              {l.pendente && !l.semComprovante && (
                <p className="text-xs text-destructive italic mt-0.5 flex items-center gap-1">
                  <FileWarning className="h-3 w-3" /> Pendência neste documento
                </p>
              )}
            </div>
            {l.dispensado ? (
              <button
                onClick={() => onAnexarDependente(l.beneficiario.id)}
                className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted shrink-0"
              >
                Anexar comprovante
              </button>
            ) : l.semComprovante ? null : (
              <p className="text-sm font-semibold shrink-0">{formatCurrency(l.total)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Total do grupo familiar</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(dados.totalGrupo)}</p>
      </div>
      <p className="text-xs text-muted-foreground px-1">
        Sujeito ao teto de {formatCurrency(4000)} por competência — a validação do teto ocorre na etapa de cálculo
        do ressarcimento.
      </p>

      {(() => {
        const conclusao = getConclusaoCompetencia(competencia);
        return conclusao ? (
          <p className="text-xs text-success text-center">
            Competência concluída em {new Date(conclusao.concluidoEm).toLocaleString("pt-BR")}
          </p>
        ) : null;
      })()}

      <button
        onClick={onConcluir}
        disabled={pendenciaAtiva}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
      >
        Concluir envio da competência
      </button>
      {pendenciaAtiva && (
        <p className="text-xs text-muted-foreground text-center">
          Resolva os beneficiários sem comprovante (anexe ou continue sem eles) para concluir.
        </p>
      )}
    </div>
  );
}

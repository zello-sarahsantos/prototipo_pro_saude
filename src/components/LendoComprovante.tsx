import { ArrowLeft, Check, Loader2, X } from "lucide-react";

export type EtapaLeitura = 0 | 1 | 2;

const etapasLabel = ["Enviando arquivo", "Verificando legibilidade", "Extraindo campos com IA"];

export function LendoComprovante({
  nomesArquivos,
  etapaAtual,
  arquivosConcluidos = 0,
  concluido = false,
  falhouLegibilidade = false,
  onVoltar,
}: {
  nomesArquivos: string[];
  /** Etapa em andamento (recebe o spinner) enquanto `concluido` e `falhouLegibilidade` forem falsos. */
  etapaAtual: EtapaLeitura;
  arquivosConcluidos?: number;
  /** Todas as etapas concluídas com sucesso. */
  concluido?: boolean;
  /** A etapa de legibilidade (índice 1) falhou — interrompe o processamento. */
  falhouLegibilidade?: boolean;
  onVoltar: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onVoltar} className="p-1 hover:bg-muted rounded-md">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {nomesArquivos.length > 1 ? "Lendo comprovantes" : "Lendo comprovante"}
          </h2>
          <p className="text-xs text-muted-foreground">{nomesArquivos.join(", ")}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {etapasLabel.map((label, i) => {
          const falhouAqui = falhouLegibilidade && i === 1;
          const concluidaAqui = concluido || i < etapaAtual;
          const emAndamento = !concluido && !falhouLegibilidade && i === etapaAtual;

          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              {falhouAqui ? (
                <X className="h-4 w-4 text-destructive shrink-0" />
              ) : concluidaAqui ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : emAndamento ? (
                <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
              ) : (
                <span className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground">•</span>
              )}
              <span
                className={
                  falhouAqui
                    ? "text-destructive font-medium"
                    : concluidaAqui
                      ? "text-foreground"
                      : emAndamento
                        ? "font-medium"
                        : "text-muted-foreground"
                }
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        {nomesArquivos.length > 1 ? `${arquivosConcluidos} de ${nomesArquivos.length} documentos finalizados. ` : ''}
        Os arquivos são enviados separadamente e acompanhados em paralelo. Cada leitura pode aguardar na fila da IA.
      </p>
    </div>
  );
}

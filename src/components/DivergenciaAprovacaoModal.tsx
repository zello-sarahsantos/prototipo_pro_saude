import { AlertTriangle, CheckCircle2, RotateCcw, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/mock-data";

/**
 * Ação do Analista/Gerência ao tentar aprovar um comprovante com valor **cadastral**
 * divergente — o valor extraído/informado difere do `valorCadastrado` do beneficiário.
 * Distinta da divergência **documental** (Boleto × Comprovante, badge próprio em
 * `CamposExtraidosForm`), que nunca bloqueia aprovação nem altera o cadastro.
 *
 * A GERDAB decide explicitamente entre 3 caminhos — não há mais um "aprovar com ressalva"
 * genérico aqui: "Aprovar e atualizar valor cadastral" corrige o cadastro do beneficiário
 * (`atualizarValorCadastradoBeneficiario`) e aprova o comprovante; "Solicitar correção" e
 * "Recusar" reabrem os fluxos padrão já existentes (mesma textarea/confirmação usada para
 * qualquer outro comprovante), sem duplicar UI.
 */
export function DivergenciaAprovacaoModal({
  open,
  beneficiarioNome,
  valorExtraido,
  valorCadastrado,
  justificativaServidor,
  onAprovarEAtualizar,
  onSolicitarCorrecao,
  onRecusar,
  onCancel,
}: {
  open: boolean;
  beneficiarioNome: string;
  valorExtraido: number;
  valorCadastrado: number;
  /** Justificativa que o próprio Servidor já escreveu no envio (Etapa 5) — dá contexto para a
   *  decisão da GERDAB, sem confundir com nenhuma justificativa que o Analista/Gerência escreva. */
  justificativaServidor?: string;
  onAprovarEAtualizar: () => void;
  onSolicitarCorrecao: () => void;
  onRecusar: () => void;
  onCancel: () => void;
}) {
  const diferenca = valorExtraido - valorCadastrado;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Valor difere do cadastro
          </DialogTitle>
          <DialogDescription>
            O valor extraído do documento de <strong>{beneficiarioNome}</strong> diverge do valor
            cadastrado — divergência cadastral (não confundir com a divergência documental entre
            Boleto e Comprovante, que não altera o cadastro). Decida como prosseguir:
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Valor cadastrado atual</span>
            <span className="font-medium">{formatCurrency(valorCadastrado)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Valor encontrado/informado</span>
            <span className="font-medium">{formatCurrency(valorExtraido)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Diferença</span>
            <span className="font-medium">
              {diferenca > 0 ? "+" : ""}
              {formatCurrency(diferenca)}
            </span>
          </div>
        </div>

        {justificativaServidor && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-warning">Justificativa do Servidor:</p>
            <p>{justificativaServidor}</p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <button
            onClick={onAprovarEAtualizar}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90"
          >
            <CheckCircle2 className="h-4 w-4" /> Aprovar e atualizar valor cadastral
          </button>
          <div className="flex gap-2 w-full">
            <button
              onClick={onSolicitarCorrecao}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Solicitar correção
            </button>
            <button
              onClick={onRecusar}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/5"
            >
              <Ban className="h-3.5 w-3.5" /> Recusar
            </button>
          </div>
          <button onClick={onCancel} className="w-full text-xs text-muted-foreground hover:underline pt-1">
            Voltar sem decidir
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
 * Ação do Analista/Gerência ao tentar aprovar um comprovante com valor divergente do
 * cadastro do beneficiário. Bloqueia a aprovação direta — só permite seguir como
 * "aprovado com ressalva", mediante justificativa obrigatória. Não altera o cadastro.
 */
export function DivergenciaAprovacaoModal({
  open,
  beneficiarioNome,
  valorExtraido,
  valorCadastrado,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  beneficiarioNome: string;
  valorExtraido: number;
  valorCadastrado: number;
  onConfirm: (justificativa: string) => void;
  onCancel: () => void;
}) {
  const [justificativa, setJustificativa] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Valor divergente
          </DialogTitle>
          <DialogDescription>
            O valor extraído do documento de <strong>{beneficiarioNome}</strong> (
            {formatCurrency(valorExtraido)}) diverge do valor cadastrado (
            {formatCurrency(valorCadastrado)}). A aprovação direta está bloqueada — justifique
            para aprovar com ressalva.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          rows={3}
          placeholder="Descreva o motivo da divergência e por que pode ser aprovado com ressalva..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <DialogFooter>
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            onClick={() => onConfirm(justificativa)}
            disabled={!justificativa.trim()}
            className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            Aprovar com ressalva
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

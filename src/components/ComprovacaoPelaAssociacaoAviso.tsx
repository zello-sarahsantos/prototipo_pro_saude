import { ShieldAlert } from "lucide-react";

/** Aviso informativo exibido no lugar dos fluxos individuais (envio de comprovante e ressarcimento
 *  retroativo) para servidor cuja comprovação é responsabilidade da Associação. */
export function ComprovacaoPelaAssociacaoAviso({ associacao }: { associacao: string }) {
  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-sm" role="status">
      <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-primary">Você está vinculado à {associacao}</p>
        <p className="text-muted-foreground mt-1">
          A comprovação mensal e o ressarcimento retroativo são enviados pela {associacao} — não é necessário
          enviar comprovante nem solicitar ressarcimento retroativo individualmente.
        </p>
      </div>
    </section>
  );
}

import { useState } from "react";
import { FileUp, Clock, ShieldAlert } from "lucide-react";
import { UploadBox } from "@/routes/servidor.requerimento.novo-plano";
import {
  DESCRICAO_CONSEQUENCIA,
  estaVencida,
  marcarPendenciaDocumentalAtendida,
  type PendenciaDocumental,
} from "@/lib/pendencias-documentais";

/**
 * Aviso de pendência documental + upload — reaproveitado no Portal do Servidor
 * (`servidor.inicio.tsx`/`servidor.dependentes.tsx`, destino "servidor") e na Área da
 * Associação (`associacao.gerenciamento.$id.tsx`, destino "associacao"). O campo `destino` de
 * `PendenciaDocumental` já decide para qual dos dois este banner deve aparecer — o componente
 * não precisa saber nada sobre isso, só recebe a lista já filtrada por quem o usa.
 *
 * Mostra prazo (quando a pendência tem uma regra de sistema mapeada) e a consequência do não
 * envio — pendências sem regra conhecida (solicitação manual do analista, tipo "outro") não têm
 * prazo: ficam em aberto até serem atendidas, sem bloqueio automático.
 *
 * "Enviar documento" é mock (não guarda o arquivo) — mas marca a pendência como atendida via
 * `marcarPendenciaDocumentalAtendida`, suficiente para o banner sumir e (no caso de solicitação
 * manual) a aba "Observações" do lado GERDAB mostrar o pedido como resolvido.
 */
export function SolicitacaoDocumentoBanner({
  pendencia,
  onEnviado,
}: {
  pendencia: PendenciaDocumental;
  onEnviado: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const vencida = estaVencida(pendencia);

  return (
    <div
      className={`border rounded-xl p-4 space-y-3 ${
        vencida ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
      }`}
    >
      <div>
        <p className={`text-sm font-semibold ${vencida ? "text-destructive" : "text-warning"}`}>
          GERDAB solicitou documentação complementar
          {pendencia.dependenteNome && ` — ${pendencia.dependenteNome}`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{pendencia.documento}</span>
          {pendencia.detalhe && <> — {pendencia.detalhe}</>}
        </p>

        {pendencia.prazo ? (
          <p className={`flex items-center gap-1.5 text-xs mt-2 ${vencida ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {vencida ? "Prazo vencido" : "Prazo"}: {pendencia.prazo.texto}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs mt-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" /> Sem prazo definido
          </p>
        )}

        <p className={`flex items-start gap-1.5 text-xs mt-1 ${vencida ? "text-destructive" : "text-muted-foreground"}`}>
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {DESCRICAO_CONSEQUENCIA[pendencia.consequencia]}
        </p>
      </div>

      {uploadOpen ? (
        <div className="space-y-2">
          <UploadBox />
          <div className="flex gap-2">
            <button
              onClick={() => setUploadOpen(false)}
              className="text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                marcarPendenciaDocumentalAtendida(pendencia);
                setUploadOpen(false);
                onEnviado();
              }}
              className="text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium"
            >
              Enviar documento
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setUploadOpen(true)}
          className={`text-xs font-medium border rounded-md px-3 py-1.5 flex items-center gap-1.5 ${
            vencida
              ? "border-destructive/40 text-destructive hover:bg-destructive/10"
              : "border-warning/40 text-warning hover:bg-warning/10"
          }`}
        >
          <FileUp className="h-3.5 w-3.5" /> Incluir documento
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { FileUp, Clock, ShieldAlert, FileSearch, FileCheck2 } from "lucide-react";
import { UploadBox } from "@/routes/servidor.requerimento.novo-plano";
import {
  DESCRICAO_CONSEQUENCIA,
  estaVencida,
  marcarPendenciaDocumentalAtendida,
  type PendenciaDocumental,
  type DocumentoPendenteView,
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

/**
 * Status de um documento já enviado pelo servidor/associação — "em análise pela GERDAB" ou "já
 * aprovado". Complementa `SolicitacaoDocumentoBanner` (que só mostra o que ainda está
 * "aguardando envio"): sem isto, quem enviou nunca saberia se o documento foi aceito ou está
 * parado esperando revisão. Quando o analista pede reenvio, este card some sozinho — uma nova
 * solicitação em aberto (com a justificativa) passa a aparecer via `SolicitacaoDocumentoBanner`,
 * mesmo mecanismo de sempre, sem tela/fluxo paralelo.
 */
export function StatusDocumentoEnviadoCard({ status }: { status: DocumentoPendenteView }) {
  const aprovado = status.status === "aprovado";

  return (
    <div
      className={`border rounded-xl p-4 flex items-start gap-3 ${
        aprovado ? "bg-success/5 border-success/30" : "bg-info/5 border-info/30"
      }`}
    >
      {aprovado ? (
        <FileCheck2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
      ) : (
        <FileSearch className="h-4 w-4 text-info shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${aprovado ? "text-success" : "text-info"}`}>
          {status.documento}
          {status.beneficiarioNome && ` — ${status.beneficiarioNome}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {aprovado
            ? `Aprovado em ${new Date(status.analisadoEm!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} pela GERDAB.`
            : `Enviado em ${new Date(status.atendidaEm!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} — aguardando análise da GERDAB.`}
        </p>
      </div>
    </div>
  );
}

import { useId, useState } from "react";
import { FileUp, Clock, ShieldAlert, FileSearch, FileCheck2 } from "lucide-react";
import { BotaoExpansao } from "@/components/ControleExpansao";
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
  layout = "banner",
  responsavelPadrao,
}: {
  pendencia: PendenciaDocumental;
  onEnviado: () => void;
  /** "cartao" = cartão interno do bloco "Prazos e alertas documentais" (Portal do Servidor). A lógica (prazo, upload, atendimento) é a mesma. */
  layout?: "banner" | "cartao";
  /** Nome exibido quando a pendência é do próprio titular (sem dependente). */
  responsavelPadrao?: string;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const vencida = estaVencida(pendencia);

  if (layout === "cartao") {
    return (
      <article className="rounded-xl border border-border bg-background/40 overflow-hidden">
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-base leading-snug break-words min-w-0">{pendencia.dependenteNome ?? responsavelPadrao ?? "Titular"}</p>
            <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${vencida ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
              {pendencia.prazo ? (vencida ? "Prazo vencido" : "No prazo") : "Sem prazo"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">GERDAB solicitou documentação complementar</p>
          <p className="text-lg font-semibold leading-snug">{pendencia.documento}</p>
          {pendencia.detalhe && <p className="text-sm text-foreground/80">{pendencia.detalhe}</p>}
          <p className={`flex items-center gap-1.5 text-sm ${vencida ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {pendencia.prazo ? `${pendencia.prazo.texto}` : "Sem prazo definido"}
          </p>
        </div>
        <div className="border-t border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Como isso afeta o benefício?</p>
            <p className="text-sm text-foreground/80 mt-1">{DESCRICAO_CONSEQUENCIA[pendencia.consequencia]}</p>
          </div>
          {uploadOpen ? (
            <div className="space-y-2">
              <UploadBox />
              <div className="flex gap-2">
                <button onClick={() => setUploadOpen(false)} className="text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted">
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
            <button onClick={() => setUploadOpen(true)} className="w-full text-sm font-medium border border-border rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 bg-card hover:bg-muted">
              <FileUp className="h-4 w-4" /> Incluir documento
            </button>
          )}
        </div>
      </article>
    );
  }

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
export function StatusDocumentoEnviadoCard({ status, layout = "banner" }: { status: DocumentoPendenteView; layout?: "banner" | "cartao" }) {
  const aprovado = status.status === "aprovado";
  const dataHora = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

  if (layout === "cartao") {
    return (
      <article className={`rounded-xl border p-4 space-y-1 ${aprovado ? "border-success/30 bg-success/5" : "border-info/30 bg-info/5"}`}>
        <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${aprovado ? "text-success" : "text-info"}`}>
          {aprovado ? <FileCheck2 className="h-3.5 w-3.5" /> : <FileSearch className="h-3.5 w-3.5" />}
          {aprovado ? "Aprovado" : "Aguardando análise"}
        </p>
        <p className="font-semibold break-words">
          {status.beneficiarioNome ? `${status.beneficiarioNome} · ` : ""}
          {status.documento}
        </p>
        <p className="text-sm text-muted-foreground">
          {aprovado ? `Enviado em ${dataHora(status.atendidaEm)}. Aprovado em ${dataHora(status.analisadoEm)} pela GERDAB.` : `Enviado em ${dataHora(status.atendidaEm)}. Aguardando análise da GERDAB.`}
        </p>
      </article>
    );
  }

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

/**
 * Bloco "Prazos e alertas documentais" da página inicial do Portal do Servidor (somente apresentação).
 * Começa RECOLHIDO (título, indicadores e orientação resumida); "Expandir" mostra, no mesmo cartão, as pendências documentais e os
 * documentos enviados. Os números vêm das pendências e dos status já existentes — nada é fixo — e nenhuma regra de prazo, bloqueio,
 * envio ou análise é alterada (os cartões reutilizam `SolicitacaoDocumentoBanner` e `StatusDocumentoEnviadoCard`).
 */
export function PrazosAlertasDocumentais({
  pendencias,
  enviados,
  onEnviado,
  responsavelPadrao,
}: {
  pendencias: PendenciaDocumental[];
  enviados: DocumentoPendenteView[];
  onEnviado: () => void;
  responsavelPadrao?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  if (pendencias.length === 0 && enviados.length === 0) return null;

  const vencidos = pendencias.filter((p) => estaVencida(p)).length;
  const aVencer = pendencias.filter((p) => p.prazo !== null && !estaVencida(p)).length;
  const semPrazo = pendencias.filter((p) => p.prazo === null).length;
  const aguardando = enviados.filter((e) => e.status === "aguardando_analise").length;
  const bloqueia = pendencias.some((p) => p.consequencia === "bloqueio_temporario_beneficio");
  const inativa = pendencias.some((p) => p.consequencia === "inativacao_definitiva");
  const orientacao = bloqueia
    ? "Sem envio no prazo, o benefício é bloqueado temporariamente."
    : inativa
      ? "Sem envio no prazo, o dependente é inativado automaticamente."
      : pendencias.length > 0
        ? "Há documentos solicitados pela GERDAB sem prazo definido: a pendência segue em aberto até o envio."
        : "Seus documentos enviados estão em acompanhamento pela GERDAB.";
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

  return (
    <section className="bg-card rounded-xl shadow-card border border-border overflow-hidden" aria-label="Prazos e alertas documentais">
      {/* Mesmo padrão do Dashboard ao expandir um indicador: o TOPO do cartão fica em azul claro (fundo + linha de destaque + divisória). */}
      <div
        onClick={() => setAberto((v) => !v)}
        className={`p-4 space-y-3 cursor-pointer ${aberto ? "bg-info/10 border-t-2 border-t-info/60 border-b border-b-info/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">Prazos e alertas documentais</h3>
        <BotaoExpansao aberto={aberto} controla={id} />
      </div>

      {!aberto ? (
        <div className="space-y-2">
          <ul className="flex flex-wrap gap-2 text-sm" aria-label="Resumo">
            {vencidos > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1 font-medium">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {plural(vencidos, "vencido", "vencidos")}
              </li>
            )}
            {aVencer > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning px-3 py-1 font-medium">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {aVencer} a vencer
              </li>
            )}
            {semPrazo > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">{semPrazo} sem prazo definido</li>
            )}
            {aguardando > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-info/15 text-info px-3 py-1 font-medium">
                <FileSearch className="h-3.5 w-3.5" aria-hidden /> {aguardando} aguardando análise
              </li>
            )}
          </ul>
          <p className="text-sm text-muted-foreground">{orientacao}</p>
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          {pendencias.length > 0 && (
            <p className={`flex items-center gap-1.5 ${vencidos > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {vencidos > 0 ? `${plural(vencidos, "prazo vencido", "prazos vencidos")} • Envio necessário` : `${plural(pendencias.length, "documento solicitado", "documentos solicitados")}`}
            </p>
          )}
          {aguardando > 0 && (
            <p className="flex items-center gap-1.5 text-info">
              <FileSearch className="h-3.5 w-3.5 shrink-0" aria-hidden /> {plural(aguardando, "documento aguardando análise", "documentos aguardando análise")}
            </p>
          )}
        </div>
      )}
      </div>

      {aberto && (
        <div id={id} className="p-4 space-y-4">
          {pendencias.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendências documentais</h4>
              {pendencias.map((p) => (
                <SolicitacaoDocumentoBanner key={p.id} pendencia={p} onEnviado={onEnviado} layout="cartao" responsavelPadrao={responsavelPadrao} />
              ))}
            </div>
          )}

          {enviados.length > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos enviados</h4>
              {enviados.map((s) => (
                <StatusDocumentoEnviadoCard key={s.id} status={s} layout="cartao" />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

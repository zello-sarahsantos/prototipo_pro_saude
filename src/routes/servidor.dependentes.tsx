import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { dependentes, formatCurrency, servidorAtual } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { SolicitacaoDocumentoBanner, StatusDocumentoEnviadoCard } from "@/components/SolicitacaoDocumentoBanner";
import { getPendenciasDocumentaisDoServidor, getStatusDocumentosDoServidor } from "@/lib/pendencias-documentais";
import { Plus, User } from "lucide-react";

export const Route = createFileRoute("/servidor/dependentes")({
  component: Dependentes,
});

function Dependentes() {
  const isPensionista = servidorAtual.cargo.startsWith("Pensionista");
  const [pendenciasVersion, setPendenciasVersion] = useState(0);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  // Pendências documentais de dependentes direcionadas ao próprio servidor — mesma fonte
  // unificada usada no banner da tela inicial, aqui filtrada por dependente para o botão
  // "Enviar Comprovante" (antes só um botão decorativo, sem ação nenhuma).
  const pendencias = useMemo(
    () => getPendenciasDocumentaisDoServidor(servidorAtual.matricula, "servidor"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendenciasVersion],
  );

  // Status de documentos já enviados por dependente (em análise ou aprovado) — sem isto, depois
  // de enviar o comprovante o servidor não teria mais nenhum retorno sobre o que aconteceu.
  const statusEnviados = useMemo(
    () =>
      getStatusDocumentosDoServidor(servidorAtual.matricula, "servidor").filter(
        (s) => s.status !== "aguardando_envio",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendenciasVersion],
  );

  if (isPensionista) {
    return (
      <div className="p-4">
        <section className="bg-muted/40 border border-border rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Acesso Restrito</p>
          <p className="text-xs text-muted-foreground">
            A gestão de dependentes não está disponível para o perfil de {servidorAtual.cargo}.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Meus Dependentes</h2>
        <Link
          to="/servidor/requerimento/incluir-dependente"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          <Plus className="h-4 w-4" /> Incluir
        </Link>
      </div>

      <div className="space-y-3">
        {dependentes.map((d) => {
          const inactive = d.status === "inativo";
          const pending = d.status === "pendente";
          const pendencia = pendencias.find((p) => p.dependenteId === d.id);
          const statusEnviado = statusEnviados.find((s) => s.beneficiarioId === d.id);
          return (
            <article
              key={d.id}
              className={`bg-card rounded-xl border border-border p-4 shadow-card ${inactive ? "opacity-60" : ""}`}
            >
              <header className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.parentesco} • {d.idade} anos</p>
                </div>
                <StatusBadge status={d.status} />
              </header>

              <dl className="text-sm space-y-1 mb-3">
                <Row label="Data de nasc." value={d.dataNascimento} />
                <Row label="CPF" value={d.cpf} />
                <Row label="Plano" value={d.plano} />
                <Row label="Valor no plano" value={formatCurrency(d.valor)} />
              </dl>

              <div className="flex gap-2">
                <button
                  disabled={inactive || pending}
                  className="flex-1 text-sm border border-border rounded-md py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ver detalhes
                </button>
                {pendencia ? (
                  <button
                    onClick={() => setAbertoId(abertoId === d.id ? null : d.id)}
                    className="flex-1 text-sm text-center border border-warning/50 bg-warning/10 text-warning font-medium rounded-md py-2 hover:bg-warning/20"
                  >
                    Enviar Comprovante
                  </button>
                ) : (
                  <Link
                    to="/servidor/requerimento/exclusao"
                    className={`flex-1 text-sm text-center border border-destructive/30 text-destructive rounded-md py-2 hover:bg-destructive/5 ${inactive || pending ? "pointer-events-none opacity-50" : ""}`}
                  >
                    Solicitar exclusão
                  </Link>
                )}
              </div>

              {pendencia && abertoId === d.id && (
                <div className="mt-3">
                  <SolicitacaoDocumentoBanner
                    pendencia={pendencia}
                    onEnviado={() => {
                      setAbertoId(null);
                      setPendenciasVersion((v) => v + 1);
                    }}
                  />
                </div>
              )}

              {statusEnviado && (
                <div className="mt-3">
                  <StatusDocumentoEnviadoCard status={statusEnviado} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

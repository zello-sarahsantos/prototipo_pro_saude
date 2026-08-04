import { createFileRoute, Link } from "@tanstack/react-router";
import { dependentes, formatCurrency, servidorAtual } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { PendencyBanner } from "@/components/PendencyBanner";
import { Plus, User, Info } from "lucide-react";

export const Route = createFileRoute("/servidor/dependentes")({
  component: Dependentes,
});

function Dependentes() {
  const isPensionista = servidorAtual.cargo.startsWith("Pensionista");

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
                {d.alerta && d.status === "alerta" ? (
                  <button className="flex-1 text-sm text-center border border-warning/50 bg-warning/10 text-warning font-medium rounded-md py-2 hover:bg-warning/20">
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

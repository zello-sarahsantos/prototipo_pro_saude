import { createFileRoute, Link } from "@tanstack/react-router";
import { requerimentos, regrasProSaude } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertCircle, ArrowRight, ClipboardList, UserCheck, Users } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do módulo de cadastro. Comprovação, OCR, retroativos e relatório mensal são evolutivas.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {regrasProSaude.fases.map((fase) => (
          <div key={fase.nome} className="bg-card rounded-xl border border-border p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{fase.nome}</p>
            <p className="font-semibold">{fase.modulo}</p>
            <p className="text-xs mt-1 text-muted-foreground">{fase.status}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Requerimentos"
          value="12"
          sub="3 urgentes"
          tone="warning"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Servidores ativos"
          value="847"
          sub="23 inativos"
          tone="primary"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Dependentes ativos"
          value="1.234"
          sub="5 pendentes"
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card">
          <header className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold">Últimos requerimentos</h2>
            <Link to="/admin/requerimentos" className="text-sm text-primary inline-flex items-center gap-1">
              Ver fila <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {requerimentos.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {r.numero} • <span className="text-muted-foreground font-normal">{r.tipo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{r.servidor} • {r.detalhe}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold text-sm">Alertas</h2>
              <p className="text-xs text-muted-foreground">Próximos vencimentos</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            <Alert text="Lucas Souza (enteado) — 23 anos. Limite de idade/IRPF pendente de confirmação." />
            <Alert text="Comprovação IRPF de 1 enteado vence em 30 dias." />
            <Alert text="2 servidores com requerimentos > 7 dias na fila." />
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "success" | "warning";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-status-aprovado-bg text-status-aprovado-fg",
    warning: "bg-status-pendente-bg text-status-pendente-fg",
  } as const;
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{label}</p>
      <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <li className="text-xs px-3 py-2 rounded-md bg-status-pendente-bg/40 text-status-pendente-fg border border-status-pendente-bg">
      {text}
    </li>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Users, Smartphone, ClipboardCheck, LockKeyhole, TimerReset } from "lucide-react";
import { regrasProSaude } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pró-Saúde DETRAN — Protótipo de Cadastro" },
      { name: "description", content: "Protótipo do módulo de cadastro do Sistema Pró-Saúde — DETRAN/GERDAB. Validação de fluxos com stakeholders." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="px-4 sm:px-6 py-4 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">DETRAN • GERDAB</p>
            <p className="font-semibold">Pró-Saúde</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">Protótipo v0.2</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary mb-3">{regrasProSaude.faseAtual}</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">Sistema Pró-Saúde</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Protótipo navegável ajustado para validar a primeira entrega: cadastro de servidores, dependentes e requerimentos. Comprovação mensal, OCR, retroativos, relatórios e integrações aparecem como evolutivas.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {regrasProSaude.fases.map((fase) => (
            <article key={fase.nome} className="rounded-2xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{fase.nome} • {fase.modulo}</h2>
                <span className={`text-[11px] px-2 py-1 rounded-full ${fase.status === "Evolutiva" ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>{fase.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{fase.escopo}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link to="/servidor/inicio" className="group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition">
            <Smartphone className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Portal do Servidor</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Mobile-first. Permite requerer inclusão/mudança de plano, incluir/excluir dependentes e acompanhar análise da GERDAB.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              Entrar como servidor <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link to="/login" className="group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition">
            <Users className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Painel GERDAB</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Responsivo para desktop e celular. A fila de análise fica para analistas; parâmetros sensíveis ficam apenas para a gerência.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              Escolher perfil <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3 text-sm">
          <InfoCard icon={<ClipboardCheck className="h-4 w-4" />} title="Regras de cadastro" text="Campos dos requerimentos foram aproximados dos modelos oficiais, sem replicar o layout SEI." />
          <InfoCard icon={<LockKeyhole className="h-4 w-4" />} title="Segurança de parâmetros" text="Teto e percentual não ficam visíveis para analistas comuns." />
          <InfoCard icon={<TimerReset className="h-4 w-4" />} title="Evolutivas marcadas" text="Upload de comprovantes, reajustes, retroativos e OCR ficam sinalizados como Fase 2." />
        </div>
      </main>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  );
}

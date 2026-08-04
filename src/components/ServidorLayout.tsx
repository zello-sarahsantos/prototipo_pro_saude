import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, FileText, Users, CreditCard, ClipboardList } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { getCompetenciasPendentes } from "@/lib/competencias-pendentes";

export function ServidorLayout() {
  const competenciasPendentes = getCompetenciasPendentes().length;
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-elevated">
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">DETRAN • Pró-Saúde</p>
            <h1 className="text-base font-semibold">Portal do Servidor</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:max-w-md sm:mx-auto bg-card border-t border-border">
        <div className="grid grid-cols-5">
          <NavTab to="/servidor/inicio" icon={<Home className="h-5 w-5" />} label="Início" />
          <NavTab
            to="/servidor/pagamentos"
            icon={<CreditCard className="h-5 w-5" />}
            label="Pagamentos"
            badge={competenciasPendentes > 0 ? competenciasPendentes : undefined}
          />
          <NavTab
            to="/servidor/requerimento/novo"
            icon={<ClipboardList className="h-5 w-5" />}
            label="Requerimentos"
          />
          <NavTab to="/servidor/dependentes" icon={<Users className="h-5 w-5" />} label="Dependentes" />
          <NavTab to="/servidor/meus-dados" icon={<FileText className="h-5 w-5" />} label="Meus Dados" />
        </div>
      </nav>
    </div>
  );
}

function NavTab({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`relative flex min-w-0 flex-col items-center gap-1 px-1 py-3 text-center text-[11px] leading-tight break-words ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold flex items-center justify-center">
            {badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

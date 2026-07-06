import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, FileText, Users, LogOut, Plus } from "lucide-react";

export function ServidorLayout() {
  const loc = useLocation();
  const isNovo = loc.pathname.startsWith("/servidor/requerimento");
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-elevated">
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">DETRAN • Pró-Saúde</p>
            <h1 className="text-base font-semibold">Portal do Servidor</h1>
          </div>
          <Link to="/login" className="opacity-90 hover:opacity-100">
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {!isNovo && (
        <Link
          to="/servidor/requerimento/novo"
          className="fixed bottom-20 right-4 sm:right-[calc(50%-13rem)] bg-primary text-primary-foreground rounded-full shadow-elevated px-4 py-3 flex items-center gap-2 text-sm font-medium hover:bg-primary-light transition"
        >
          <Plus className="h-4 w-4" /> Novo Requerimento
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:max-w-md sm:mx-auto bg-card border-t border-border">
        <div className="grid grid-cols-3">
          <NavTab to="/servidor/inicio" icon={<Home className="h-5 w-5" />} label="Início" />
          <NavTab to="/servidor/dependentes" icon={<Users className="h-5 w-5" />} label="Dependentes" />
          <NavTab to="/servidor/meus-dados" icon={<FileText className="h-5 w-5" />} label="Meus Dados" />
        </div>
      </nav>
    </div>
  );
}

function NavTab({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-3 text-xs ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
    >
      {icon}
      {label}
    </Link>
  );
}

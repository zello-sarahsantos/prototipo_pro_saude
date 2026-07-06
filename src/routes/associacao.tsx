import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Upload, History, LogOut, Building2, Menu, X, Shield, UserPlus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/associacao")({
  component: AssociacaoLayout,
});

function AssociacaoLayout() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/associacao/upload", icon: Upload, label: "Upload de Planilha (ASSEFAZ)" },
    { to: "/associacao/gerenciamento", icon: UserPlus, label: "Gerenciamento (ASSETRAN)" },
  ];

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-primary text-primary-foreground border-b border-primary-dark px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <div>
            <p className="text-[10px] opacity-70 tracking-wider font-bold">DETRAN • PRÓ-SAÚDE</p>
            <h1 className="text-sm font-semibold">Área da Associação</h1>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-primary-dark" aria-label="Abrir menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`${open ? "block" : "hidden"} lg:flex lg:w-64 bg-slate-900 text-white flex-col lg:min-h-screen lg:sticky lg:top-0 z-30`}>
        <div className="hidden lg:block px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary-light" />
            <div>
              <p className="text-[10px] opacity-70 tracking-widest font-bold">DETRAN • PRÓ-SAÚDE</p>
              <h1 className="text-base font-semibold">Associação</h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = loc.pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? "bg-primary text-white font-medium shadow-lg"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4">
            <p className="text-sm font-medium">ASSEFAZ / ASSETRAN</p>
            <p className="text-[11px] text-slate-400">Associações Parceiras</p>
          </div>
          <Link to="/login" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition">
            <LogOut className="h-4 w-4" /> Sair
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

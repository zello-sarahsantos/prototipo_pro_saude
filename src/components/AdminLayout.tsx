import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Upload,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const baseItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/servidores", icon: Users, label: "Servidores" },
  { to: "/admin/requerimentos", icon: ClipboardList, label: "Requerimentos" },
  { to: "/admin/carga-inicial", icon: Upload, label: "Carga Inicial" },
];

export function getAdminRole() {
  if (typeof window === "undefined") return "gerencia";
  return localStorage.getItem("prosaude_role") || "gerencia";
}

export function AdminLayout() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const role = getAdminRole();
  const isGerencia = role === "gerencia";
  const items = useMemo(
    () => [
      ...baseItems,
      ...(isGerencia ? [{ to: "/admin/parametros", icon: Settings, label: "Parâmetros" }] : []),
    ],
    [isGerencia],
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <header className="lg:hidden sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <div>
            <p className="text-[11px] opacity-70">DETRAN • GERDAB</p>
            <h1 className="text-sm font-semibold">Pró-Saúde Admin</h1>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-sidebar-accent" aria-label="Abrir menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <aside className={`${open ? "block" : "hidden"} lg:flex lg:w-64 bg-sidebar text-sidebar-foreground flex-col lg:min-h-screen lg:sticky lg:top-0 z-30`}>
        <div className="hidden lg:block px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <div>
              <p className="text-xs opacity-70">DETRAN • GERDAB</p>
              <h1 className="text-base font-semibold">Pró-Saúde Admin</h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium">{isGerencia ? "Erandir / Gerência" : "Rebeca / Luciana"}</p>
            <p className="text-xs opacity-70">{isGerencia ? "Gerência GERDAB" : "Analista GERDAB — sem acesso a parâmetros"}</p>
          </div>
          <Link to="/login" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" /> Sair
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

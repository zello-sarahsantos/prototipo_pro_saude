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
  FileCheck,
  BarChart3,
  RefreshCcw,
  Handshake,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";
import { AlternarTema } from "@/components/AlternarTema";
import { ContadorNotificacoes } from "@/components/ContadorNotificacoes";
import { useNotificacoesAdmin, type ModuloNotificacao } from "@/lib/notificacoes-admin";

// "Comprovantes" fica disponível para Analista e Gerência — a Gerência sempre tem, no
// mínimo, as mesmas permissões do Analista (regra do Módulo de Pagamento).
// "Relatórios" aponta para a Visão Geral do Módulo de Relatórios (`/admin/relatorios`), que
// por sua vez destaca o Fechamento de Pagamento (prioridade do módulo, ver plano — seção 2.9)
// e lista as demais sub-áreas ainda por implementar.
const baseItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/servidores", icon: Users, label: "Servidores" },
  { to: "/admin/requerimentos", icon: ClipboardList, label: "Requerimentos" },
  { to: "/admin/comprovantes", icon: FileCheck, label: "Comprovantes" },
  { to: "/admin/retroativos", icon: RefreshCcw, label: "Ressarcimentos de meses anteriores" },
  { to: "/admin/negociacoes", icon: Handshake, label: "Negociações" },
  { to: "/admin/relatorios", icon: BarChart3, label: "Relatórios" },
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
  const { itens: notificacoes } = useNotificacoesAdmin();
  // Só notificações REAIS não lidas alimentam o menu (as demonstrativas ficam apenas no sino).
  const naoLidasReais = notificacoes.filter((n) => !n.lida && n.origem === "real" && n.modulo);
  const MODULO_DO_ITEM: Record<string, ModuloNotificacao> = { "/admin/requerimentos": "requerimentos", "/admin/comprovantes": "comprovantes", "/admin/retroativos": "retroativos", "/admin/negociacoes": "negociacoes" };
  const notificacoesDoItem = (to: string) => (to === "/admin/dashboard" ? naoLidasReais.filter((n) => (n.indicadores?.length ?? 0) > 0) : MODULO_DO_ITEM[to] ? naoLidasReais.filter((n) => n.modulo === MODULO_DO_ITEM[to]) : []);
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
        <div className="flex items-center gap-1">
          <AdminNotificationBell />
          <AlternarTema />
          <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-sidebar-accent" aria-label="Abrir menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <aside className={`${open ? "block" : "hidden"} lg:flex lg:w-64 bg-sidebar text-sidebar-foreground flex-col lg:min-h-screen lg:sticky lg:top-0 z-30`}>
        <div className="hidden lg:block px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-70">DETRAN • GERDAB</p>
              <h1 className="text-base font-semibold">Pró-Saúde Admin</h1>
            </div>
          </div>
          <div className="mt-3 -ml-2 flex items-center gap-1">
            <AdminNotificationBell />
            <AlternarTema />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            const nots = notificacoesDoItem(it.to);
            return (
              <div key={it.to} className="relative">
                <Link
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${nots.length > 0 ? "pr-11" : ""} ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {it.label}
                </Link>
                {nots.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ContadorNotificacoes itens={nots} rotulo={it.label} />
                  </span>
                )}
              </div>
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

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { getNotificacoesPagamento, type NotificacaoPagamento } from "@/lib/notificacoes-pagamento";

/** Sino de notificações reaproveitável fora do Portal do Servidor: por padrão (sem `notificacoes`
 *  informado) mantém o comportamento original, lendo `getNotificacoesPagamento()`. Passe
 *  `notificacoes` já calculado (ex: `getNotificacoesAssociacao(...)`) para usar em outro
 *  contexto, como a Área da Associação — mesmo componente visual, fonte de dados diferente. */
export function NotificationBell({ notificacoes: notificacoesProp }: { notificacoes?: NotificacaoPagamento[] } = {}) {
  const [open, setOpen] = useState(false);
  const [notificacoesPagamento, setNotificacoesPagamento] = useState<NotificacaoPagamento[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const notificacoes = notificacoesProp ?? notificacoesPagamento;

  useEffect(() => {
    if (!notificacoesProp) setNotificacoesPagamento(getNotificacoesPagamento());
  }, [notificacoesProp]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative opacity-90 hover:opacity-100"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {notificacoes.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold flex items-center justify-center">
            {notificacoes.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-card text-foreground rounded-xl border border-border shadow-elevated z-20 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Notificações</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-4 text-xs text-muted-foreground text-center">
                Nenhuma notificação no momento.
              </p>
            ) : (
              notificacoes.map((n) => (
                <p key={n.id} className="px-4 py-3 text-xs text-foreground">
                  {n.mensagem}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

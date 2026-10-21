import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";
import { garantirMassaDemonstracaoEnvios } from "@/lib/massa-demonstracao-envios";
import { garantirMassaDemonstracaoNegociacoes } from "@/lib/massa-demonstracao-negociacoes";
import { marcarComoLidas, ROTULO_MODULO_NOTIFICACAO, useNotificacoesAdmin, type NotificacaoAdmin } from "@/lib/notificacoes-admin";

/** Sino de notificações do ambiente administrativo (comportamento do protótipo aprovado): contador de
 *  não lidas, lista com marcação de lida, fecha com Esc/clique fora. Reaproveita o padrão visual de
 *  `NotificationBell`; as notificações demonstrativas são identificadas com selo. */
export function AdminNotificationBell() {
  const [aberto, setAberto] = useState(false);
  const { itens, totalSino } = useNotificacoesAdmin();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Massa demonstrativa das Negociações (idempotente); os eventos que ela dispara atualizam a lista compartilhada.
  useEffect(() => {
    void garantirMassaDemonstracaoNegociacoes().finally(() => void garantirMassaDemonstracaoEnvios());
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const naoLidas = totalSino;
  const abrir = (n: NotificacaoAdmin) => {
    marcarComoLidas([n.chaveLeitura ?? n.id]);
    if (n.href) {
      setAberto(false);
      // `rotina=<instante>` muda a cada clique: a seção reabre a fila mesmo se o usuário já estiver na página.
      navigate({ to: n.href.replace("rotina=1", `rotina=${Date.now()}`) as string });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações"
        aria-expanded={aberto}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md opacity-90 hover:opacity-100 hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-4 text-center tabular-nums">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="max-lg:fixed max-lg:left-4 max-lg:right-4 max-lg:top-16 lg:absolute lg:left-0 lg:top-full lg:mt-2 lg:w-[380px] bg-card text-foreground rounded-xl border border-border shadow-elevated z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold">Notificações</span>
              <span className="text-xs text-muted-foreground">{naoLidas === 1 ? "1 não lida" : `${naoLidas} não lidas`}</span>
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    marcarComoLidas(itens.map((n) => n.chaveLeitura ?? n.id));
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar notificações" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {itens.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => abrir(n)}
                className={`w-full text-left flex gap-2.5 px-4 py-3 border-b border-border hover:bg-muted transition ${n.lida ? "" : "bg-primary/10"}`}
              >
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.lida ? "bg-transparent" : "bg-primary"}`} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-2.5">
                    <span className={`text-[13px] leading-snug ${n.lida ? "font-medium" : "font-bold"}`}>{n.titulo}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">{n.quando}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{n.descricao}</span>
                  {n.modulo && <span className="inline-block mt-1 mr-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ROTULO_MODULO_NOTIFICACAO[n.modulo]}</span>}
                  {n.origem === "demonstrativa" && (
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-status-pendente-bg text-status-pendente-fg">Demonstrativa</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="px-4 py-2.5 text-[11px] text-muted-foreground">Notificações marcadas como “Demonstrativa” são exemplos e não entram nos contadores do menu e do Dashboard; as demais vêm de eventos reais do protótipo.</p>
        </div>
      )}
    </div>
  );
}

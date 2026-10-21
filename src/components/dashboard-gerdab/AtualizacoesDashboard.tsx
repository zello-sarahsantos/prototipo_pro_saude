import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { EVENTO_ABRIR_ATUALIZACOES } from "@/components/ContadorNotificacoes";
import { ORDEM_INDICADORES, ROTULO_INDICADOR_DASHBOARD, useNotificacoesAdmin, type IndicadorDashboard, type NotificacaoAdmin } from "@/lib/notificacoes-admin";

/** Resumo dos acontecimentos de um indicador, só com o que existe: "Novo comprovante recebido (4) · Comprovante corrigido e reenviado". */
function resumo(itens: NotificacaoAdmin[]): string {
  const por = new Map<string, number>();
  const curto = (t: string) => (t.startsWith("Complementação recebida") ? "Complementação recebida" : t.startsWith("Ressarcimento de meses anteriores") ? "Nova solicitação aguardando análise" : t);
  itens.forEach((i) => por.set(curto(i.titulo), (por.get(curto(i.titulo)) ?? 0) + 1));
  return [...por.entries()].map(([t, q]) => (q > 1 ? `${t} (${q})` : t)).join(" · ");
}

/**
 * Botão "Atualizações" (cabeçalho de "Requer ação") + modal consolidada "Atualizações do dashboard". Lista só os indicadores com
 * notificações REAIS não lidas (os mesmos eventos do sino e do menu; um acontecimento em dois indicadores conta uma vez no total).
 * Abrir/fechar não marca nada como lido: escolher um indicador abre a modal contextual dele, e só escolher uma atualização lá a lê.
 */
export function BotaoAtualizacoes() {
  const { itens, dashboard } = useNotificacoesAdmin();
  const [aberto, setAberto] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const reais = itens.filter((n) => !n.lida && n.origem === "real");
  const linhas = ORDEM_INDICADORES.map((id) => ({ id, itens: reais.filter((n) => n.indicadores?.includes(id)) })).filter((l) => l.itens.length > 0);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const voltar = botao.current;
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = anterior;
      voltar?.focus?.();
    };
  }, [aberto]);

  useEffect(() => {
    if (dashboard === 0) setAberto(false);
  }, [dashboard]);

  if (dashboard === 0) return null;

  const abrirIndicador = (id: IndicadorDashboard) => {
    setAberto(false);
    // O contador do cartão correspondente escuta este evento e abre a própria modal contextual.
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_ATUALIZACOES, { detail: id })), 0);
  };

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-label={`Atualizações: ${dashboard} ${dashboard === 1 ? "notificação não lida" : "notificações não lidas"} no dashboard`}
        className="inline-flex items-center gap-2 h-10 pl-4 pr-2.5 rounded-full border border-border bg-card text-sm font-semibold text-primary cursor-pointer hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition"
      >
        Atualizações
        <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full notif-dash-estatico text-xs font-bold tabular-nums">{dashboard}</span>
      </button>
      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}>
            <div role="dialog" aria-modal="true" aria-labelledby="modal-atualizacoes-dash" className="w-full max-w-[680px] max-h-[90vh] flex flex-col bg-card text-foreground rounded-2xl border border-border shadow-elevated overflow-hidden">
              <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground">Desde seu último acesso</span>
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full notif-dash-estatico text-xs font-bold tabular-nums">{dashboard}</span>
                  </div>
                  <h2 id="modal-atualizacoes-dash" className="text-xl font-bold mt-1.5">Atualizações do dashboard</h2>
                  <p className="text-sm text-muted-foreground mt-1">Selecione um indicador para ver o que mudou e acessar o local correspondente.</p>
                </div>
                <button ref={fechar} type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <ul className="overflow-y-auto divide-y divide-border">
                {linhas.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => abrirIndicador(l.id)} className="w-full text-left flex items-center gap-4 px-6 py-4 hover:bg-primary/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                      <span className="inline-flex items-center justify-center min-w-9 h-9 px-1 rounded-full notif-dash-estatico text-sm font-bold tabular-nums shrink-0">{l.itens.length}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold">{ROTULO_INDICADOR_DASHBOARD[l.id]}</span>
                        <span className="block text-sm text-muted-foreground mt-0.5 break-words">{resumo(l.itens)}</span>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary whitespace-nowrap">
                        Ver atualizações <ChevronRight className="h-4 w-4" />
                      </span>
                      <ChevronRight className="h-4 w-4 text-primary sm:hidden shrink-0" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="px-6 py-2.5 text-xs text-muted-foreground border-t border-border bg-muted/40">Abrir esta janela não marca nada como lido. Um acontecimento ligado a mais de um indicador conta uma vez só no total.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

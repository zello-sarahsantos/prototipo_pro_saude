import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { marcarComoLidas, ROTULO_MODULO_NOTIFICACAO, type NotificacaoAdmin } from "@/lib/notificacoes-admin";

/**
 * Círculo vermelho com a quantidade de notificações NÃO LIDAS (nunca a quantidade de pendências operacionais). Some quando a
 * contagem chega a zero. Clicar no círculo lista as notificações relacionadas, sem marcar nada como lido; só escolher uma
 * notificação a marca como lida (estado único, refletido no sino, no menu e no Dashboard) e abre a fila/registro de origem.
 * A lista é aberta num portal com posição fixa, para não ser cortada por menus ou cartões com `overflow`.
 */
/** Pedido para abrir a modal contextual de um indicador (usado pela modal consolidada "Atualizações do dashboard"). */
export const EVENTO_ABRIR_ATUALIZACOES = "prosaude-abrir-atualizacoes";

/** Atualização escolhida na modal de um indicador: o Dashboard abre a expansão correspondente (detalhes em `RequerAcao`/`PrazosAlertas`). */
export const EVENTO_FOCO_DASHBOARD = "prosaude-dashboard-foco";
export interface FocoDashboard {
  indicador: string;
  entidade: string;
  acontecimento: string;
  href?: string;
}

export interface ModalContador {
  /** Se informado, selecionar uma atualização executa isto (em vez de navegar), depois de marcá-la como lida. */
  aoSelecionar?: (n: NotificacaoAdmin) => void;
  /** Nome do indicador exibido na modal (ex.: "Alterações mensais"). */
  indicador: string;
  /** Botão inferior: leva à fila (href) ou executa uma ação local (ex.: abrir o detalhamento do cartão). */
  botao?: { rotulo: string; href?: string; onClick?: () => void };
}

const dataHoraModal = (iso?: string) => {
  if (!iso) return { dia: "", hora: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dia: "", hora: "" };
  return { dia: d.toLocaleDateString("pt-BR"), hora: /T\d{2}:\d{2}/.test(iso) ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "" };
};

export function ContadorNotificacoes({ itens, rotulo, className = "", modal, indicadorId }: { itens: NotificacaoAdmin[]; rotulo: string; className?: string; modal?: ModalContador; indicadorId?: string }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const n = itens.length;

  useLayoutEffect(() => {
    if (!aberto || modal) return;
    const calcular = () => {
      const r = botao.current?.getBoundingClientRect();
      if (!r) return;
      const largura = Math.min(360, window.innerWidth - 24);
      const altura = lista.current?.offsetHeight ?? 200;
      const left = Math.max(12, Math.min(r.left, window.innerWidth - largura - 12));
      const abaixo = window.innerHeight - r.bottom;
      setPos(abaixo >= altura + 12 || abaixo >= r.top ? { top: r.bottom + 8, left } : { bottom: window.innerHeight - r.top + 8, left });
    };
    calcular();
    const fechar = () => setAberto(false);
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", fechar, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [aberto, n]);

  useEffect(() => {
    if (!aberto || modal) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      const alvo = e.target as Node;
      if (!botao.current?.contains(alvo) && !lista.current?.contains(alvo)) setAberto(false);
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

  useEffect(() => {
    if (n === 0) setAberto(false);
  }, [n]);

  useEffect(() => {
    if (!indicadorId) return;
    const abrirPorEvento = (e: Event) => {
      if ((e as CustomEvent<string>).detail === indicadorId) setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR_ATUALIZACOES, abrirPorEvento);
    return () => window.removeEventListener(EVENTO_ABRIR_ATUALIZACOES, abrirPorEvento);
  }, [indicadorId]);

  if (n === 0) return null;

  const abrir = (item: NotificacaoAdmin) => {
    marcarComoLidas([item.chaveLeitura ?? item.id]);
    setAberto(false);
    if (modal?.aoSelecionar) {
      modal.aoSelecionar(item);
      return;
    }
    if (item.href) navigate({ to: item.href.replace("rotina=1", `rotina=${Date.now()}`) as string });
    // Sem abertura direta do registro: a fila filtrada é aberta e o aviso diz qual registro localizar.
    if (modal && item.entidade) toast.info(`Localize na fila: ${item.entidade}`, { description: item.acontecimento ?? item.descricao, duration: 8000 });
  };

  const ultima = [...itens].map((i) => i.dataHora).filter(Boolean).sort().pop();
  const textoUltima = (() => {
    if (!ultima) return "";
    const d = new Date(ultima);
    if (Number.isNaN(d.getTime())) return "";
    const hora = /T\d{2}:\d{2}/.test(ultima) ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
    const hoje = d.toDateString() === new Date().toDateString();
    return hora ? (hoje ? `Última às ${hora}` : `Última em ${d.toLocaleDateString("pt-BR")} às ${hora}`) : `Última em ${d.toLocaleDateString("pt-BR")}`;
  })();

  return (
    <>
      <span className={modal ? "notif-wrap" : "inline-flex"}>
        <button
          ref={botao}
          type="button"
          aria-label={`${n} ${n === 1 ? "notificação não lida" : "notificações não lidas"} — ${rotulo}. Ver atualizações${textoUltima ? `. ${textoUltima}` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAberto((v) => !v);
          }}
          className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums shrink-0 cursor-pointer ${modal ? "notif-dash" : "bg-destructive text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"} ${className}`}
        >
          {n}
        </button>
        {modal && (
          <span className="notif-tip" role="tooltip" aria-hidden="true">
            <strong>Ver atualizações</strong>
            {textoUltima && <span>{textoUltima}</span>}
          </span>
        )}
      </span>
      {aberto && modal && typeof document !== "undefined" && <ModalAtualizacoes itens={itens} modal={modal} onFechar={() => setAberto(false)} onAbrir={abrir} retornoFoco={botao} />}
      {aberto &&
        !modal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={lista}
            role="dialog"
            aria-label={`Notificações não lidas — ${rotulo}`}
            style={{ position: "fixed", zIndex: 80, width: Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 360) - 24), visibility: pos ? "visible" : "hidden", ...pos }}
            className="bg-card text-foreground rounded-xl border border-border shadow-elevated overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-border text-xs font-semibold">
              {rotulo} · {n} {n === 1 ? "não lida" : "não lidas"}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {itens.map((item) => (
                <button key={item.id} type="button" onClick={() => abrir(item)} className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted bg-primary/10">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-bold leading-snug">{item.titulo}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">{item.quando}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{item.descricao}</span>
                  {item.modulo && <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ROTULO_MODULO_NOTIFICACAO[item.modulo]}</span>}
                </button>
              ))}
            </div>
            <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">Selecione uma notificação para marcá-la como lida e abrir a origem. Isso não altera o andamento do registro.</p>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Modal "Atualizações não lidas" de um indicador do Dashboard. Abrir/fechar NÃO marca nada como lido: só escolher uma atualização
 *  (marca como lida e abre a origem, igual ao sino). Estado único e compartilhado: a lista é a mesma do sino e do menu. */
function ModalAtualizacoes({ itens, modal, onFechar, onAbrir, retornoFoco }: { itens: NotificacaoAdmin[]; modal: ModalContador; onFechar: () => void; onAbrir: (n: NotificacaoAdmin) => void; retornoFoco: React.RefObject<HTMLButtonElement | null> }) {
  const navigate = useNavigate();
  const fechar = useRef<HTMLButtonElement>(null);
  const n = itens.length;
  const aoFechar = useRef(onFechar);
  aoFechar.current = onFechar;
  useEffect(() => {
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar.current();
    document.addEventListener("keydown", tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const voltar = retornoFoco.current;
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = anterior;
      voltar?.focus?.();
    };
  }, [retornoFoco]);

  const acionarBotao = () => {
    onFechar();
    if (modal.botao?.onClick) modal.botao.onClick();
    else if (modal.botao?.href) navigate({ to: modal.botao.href as string });
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-atualizacoes-titulo" className="w-full max-w-[640px] max-h-[90vh] flex flex-col bg-card text-foreground rounded-2xl border border-border shadow-elevated overflow-hidden">
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground">Atualizações desde seu último acesso</span>
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full notif-dash-estatico text-xs font-bold tabular-nums" aria-label={`${n} ${n === 1 ? "notificação" : "notificações"}`}>{n}</span>
            </div>
            <h2 id="modal-atualizacoes-titulo" className="text-xl font-bold mt-1.5">{modal.indicador}</h2>
            <p className="text-sm text-muted-foreground mt-1">Veja exatamente o que mudou antes de acessar a fila.</p>
          </div>
          <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar" className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <X className="h-4 w-4" />
          </button>
        </header>
        <ul className="overflow-y-auto divide-y divide-border">
          {itens.map((item) => {
            const t = dataHoraModal(item.dataHora);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onAbrir(item)} className="w-full text-left grid grid-cols-[84px_1fr] sm:grid-cols-[110px_1fr] gap-x-3 sm:gap-x-4 px-6 py-4 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums leading-snug pt-1">
                    {t.hora || item.quando}
                    {t.hora && <span className="block font-normal">{t.dia}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold break-words">{item.entidade ?? item.titulo}</span>
                    <span className="block text-sm text-muted-foreground mt-0.5 break-words">{item.acontecimento ?? item.descricao}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="px-6 py-2.5 text-xs text-muted-foreground border-t border-border">Selecione uma atualização para marcá-la como lida e abrir a origem. Isso não altera o andamento do registro.</p>
        <footer className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/40">
          <button type="button" onClick={onFechar} className="h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted">Fechar</button>
          {modal.botao && (
            <button type="button" onClick={acionarBotao} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90">
              {modal.botao.rotulo} <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

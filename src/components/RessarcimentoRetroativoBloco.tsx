import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Plus, RefreshCw, X } from "lucide-react";
import { formatCompetencia } from "@/lib/mock-data";
import {
  ROTULO_STATUS,
  enviarComplementacao,
  getStatusRetroativo,
  lerArquivoComoDataUrl,
  marcarNotificacoesLidas,
} from "@/lib/retroativo-fluxo";
import type { CompetenciaRetroativa, SolicitacaoRetroativa, TipoDocumentoRetroativo } from "@/lib/prosaude-storage";
import {
  MESES_PT,
  MOTIVOS_RESSARCIMENTO,
  getAnosRetroativos,
  getCompetenciasJaSolicitadas,
  TIPOS_DOCUMENTO_RETROATIVO,
  getSolicitacoesRetroativas,
  validarCompetenciaRetroativa,
} from "@/lib/ressarcimento-retroativo";

/**
 * Bloco único "Ressarcimento retroativo" da página de Pagamentos (Portal do Servidor).
 *
 * Contexto 1 (fora deste bloco): competência vigente → "Enviar comprovante de pagamento".
 * Contexto 2 (este bloco): QUALQUER competência anterior → Ressarcimento retroativo. Reúne, em um
 * só lugar, os períodos que o sistema já identificou como pendentes (`competenciasIdentificadas`),
 * a inclusão manual de outros períodos históricos (inclusive anteriores à implantação do sistema)
 * e o acompanhamento das solicitações enviadas. Identificadas e adicionadas seguem JUNTAS para o
 * mesmo formulário (`/servidor/retroativo/novo?competencias=…`) — nenhum motor, rota de negócio
 * ou persistência próprios: é só a entrada do fluxo já existente. Competência que já tem
 * solicitação aparece como "Solicitação enviada", sem seleção.
 *
 * Apresentação: card expansível/recolhível (accordion). Nasce **recolhido** — só título e descrição,
 * como ação secundária compacta, para que "Enviar comprovante de pagamento" siga como ação principal.
 * O cabeçalho inteiro é um botão (clicável e acessível por teclado; `aria-expanded`/`aria-controls`).
 * O estado de seleção vive neste componente (não no conteúdo expandido), então recolher e expandir
 * de novo preserva períodos marcados, períodos adicionados e a inclusão manual em andamento.
 */
export function RessarcimentoRetroativoBloco({
  competenciasIdentificadas,
  cpfTitular,
  onAtualizado,
}: {
  competenciasIdentificadas: string[];
  cpfTitular?: string;
  /** Chamado após o servidor enviar uma complementação (a página atualiza avisos e notificações). */
  onAtualizado?: () => void;
}) {
  const jaSolicitadas = useMemo(
    () => getCompetenciasJaSolicitadas(cpfTitular ?? ""),
    [cpfTitular],
  );
  const [versao, setVersao] = useState(0);
  const solicitacoes = useMemo(
    () =>
      getSolicitacoesRetroativas().filter(
        (s) => s.origem === "individual" && s.cpfTitular === cpfTitular,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cpfTitular, versao],
  );

  const [aberto, setAberto] = useState(false); // nasce recolhido

  // Complementação necessária: o bloco abre sozinho (a pendência é a única exceção ao "nasce recolhido") e
  // as notificações do Portal desta solicitação passam a lidas. "Lida" não altera o estado da competência.
  const temPendencia = solicitacoes.some((sol) => sol.competencias.some((c) => getStatusRetroativo(sol.origem, c) === "aguardando_complementacao"));
  useEffect(() => {
    if (temPendencia) setAberto(true);
  }, [temPendencia]);
  useEffect(() => {
    if (aberto) solicitacoes.forEach((sol) => marcarNotificacoesLidas("servidor", sol.id));
  }, [aberto, solicitacoes]);
  const [marcadas, setMarcadas] = useState<string[]>([]); // identificadas selecionadas
  const [adicionadas, setAdicionadas] = useState<string[]>([]); // manuais (sempre selecionadas)
  const [adicionando, setAdicionando] = useState(false);
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState(String(getAnosRetroativos()[0]));
  const [erro, setErro] = useState("");

  const selecionadas = [...new Set([...marcadas, ...adicionadas])].sort();

  function alternar(comp: string) {
    setMarcadas((atual) =>
      atual.includes(comp) ? atual.filter((c) => c !== comp) : [...atual, comp],
    );
  }

  function adicionarPeriodo() {
    setErro("");
    if (!mes) return setErro("Selecione o mês.");
    const comp = `${ano}-${mes}`;
    const identificadaPeloSistema = competenciasIdentificadas.includes(comp);
    if (identificadaPeloSistema && !jaSolicitadas.has(comp)) {
      return setErro(
        "Esse período já consta nos períodos identificados — basta marcá-lo.",
      );
    }
    const mensagem = validarCompetenciaRetroativa(
      comp,
      selecionadas,
      jaSolicitadas,
    );
    if (mensagem) return setErro(mensagem);
    setAdicionadas([...adicionadas, comp].sort());
    setMes("");
    setAdicionando(false);
  }

  return (
    <section className="bg-card rounded-xl border border-border shadow-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="ressarcimento-retroativo-conteudo"
        id="ressarcimento-retroativo-cabecalho"
        className="w-full flex items-center gap-3 p-4 text-left rounded-xl hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[64px]"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Ressarcimento retroativo</h3>
          <p className="text-xs text-muted-foreground">
            Solicite o ressarcimento de uma ou mais competências anteriores em
            um único pedido.
          </p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
        />
      </button>

      {aberto && (
        <div
          id="ressarcimento-retroativo-conteudo"
          role="region"
          aria-labelledby="ressarcimento-retroativo-cabecalho"
          className="px-4 pb-4 pt-4 space-y-4 border-t border-border"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Períodos
            </p>

            {competenciasIdentificadas.length === 0 &&
              adicionadas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum período anterior identificado pelo sistema.
                </p>
              )}

            {competenciasIdentificadas.map((c) =>
              jaSolicitadas.has(c) ? (
                <div
                  key={c}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm">{formatCompetencia(c)}</span>
                  <span className="text-xs font-medium text-status-analise-fg bg-status-analise-bg rounded-full px-2.5 py-0.5">
                    Solicitação enviada
                  </span>
                </div>
              ) : (
                <label
                  key={c}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${
                    marcadas.includes(c)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcadas.includes(c)}
                    onChange={() => alternar(c)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {formatCompetencia(c)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Identificada pelo sistema
                  </span>
                </label>
              ),
            )}

            {adicionadas.map((c) => (
              <div
                key={c}
                className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3"
              >
                <input
                  type="checkbox"
                  checked
                  readOnly
                  aria-label={`${formatCompetencia(c)} selecionada`}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="flex-1 text-sm font-medium">
                  {formatCompetencia(c)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Adicionada por você
                </span>
                <button
                  onClick={() =>
                    setAdicionadas(adicionadas.filter((x) => x !== c))
                  }
                  aria-label={`Remover ${formatCompetencia(c)}`}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {!adicionando ? (
              <button
                onClick={() => setAdicionando(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Adicionar outro período
              </button>
            ) : (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Informe um mês/ano que não consta acima — inclusive períodos
                  anteriores à implantação do sistema.
                </p>
                <div className="flex gap-2">
                  <select
                    aria-label="Mês do período"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm"
                  >
                    <option value="">Mês…</option>
                    {MESES_PT.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Ano do período"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-24 rounded-md border border-input bg-background px-2 py-2 text-sm"
                  >
                    {getAnosRetroativos().map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                {erro && <p className="text-xs text-destructive">{erro}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={adicionarPeriodo}
                    className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setAdicionando(false);
                      setErro("");
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {selecionadas.length > 0 ? (
            <Link
              to="/servidor/retroativo/novo"
              search={{ competencias: selecionadas.join(",") }}
              className="block w-full text-center bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary-light"
            >
              Continuar solicitação ({selecionadas.length}{" "}
              {selecionadas.length === 1 ? "período" : "períodos"})
            </Link>
          ) : (
            <button
              disabled
              className="w-full bg-gray-400 text-primary-foreground rounded-md py-2.5 text-sm font-medium cursor-not-allowed"
            >
              Continuar solicitação
            </button>
          )}

          {solicitacoes.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Solicitações enviadas
              </p>
              {solicitacoes.map((sol) => (
                <div
                  key={sol.id}
                  className="rounded-lg border border-border p-3 space-y-1.5"
                >
                  <p className="text-sm font-medium">
                    {sol.motivo ? (MOTIVOS_RESSARCIMENTO[sol.motivo] ?? sol.motivo) : "Ressarcimento retroativo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enviada em{" "}
                    {new Date(sol.criadaEm).toLocaleDateString("pt-BR")}
                  </p>
                  <ul className="space-y-1.5">
                    {sol.competencias.map((c) => (
                      <CompetenciaPortal key={c.competenciaReferencia} sol={sol} c={c} onMudou={() => { setVersao((v) => v + 1); onAtualizado?.(); }} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Situação de uma competência no Portal + complementação dentro da solicitação original (proposta a
 *  validar com a GERDAB — ver `retroativo-fluxo.ts`). Documentos anteriores nunca são apagados. */
function CompetenciaPortal({ sol, c, onMudou }: { sol: SolicitacaoRetroativa; c: CompetenciaRetroativa; onMudou: () => void }) {
  const status = getStatusRetroativo(sol.origem, c);
  // Para o servidor: "Complementação recebida" aparece como "Em análise" (já enviou; aguarda a GERDAB).
  const rotulo = status === "aguardando_complementacao" ? "Complementação necessária" : status === "complementacao_recebida" ? "Em análise" : ROTULO_STATUS[status];
  const compl = c.complementacoes ?? [];
  const pedido = status === "aguardando_complementacao" ? [...compl].reverse().find((e) => e.tipo === "solicitada") : undefined;
  const negada = status === "nao_autorizada" ? c.decisoes[c.decisoes.length - 1] : undefined;
  const [arquivos, setArquivos] = useState<{ file: File; tipo: TipoDocumentoRetroativo | ""; descricao: string }[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function enviar() {
    setErro("");
    if (arquivos.length === 0) return setErro("Selecione ao menos um arquivo.");
    if (arquivos.some((a) => !a.tipo)) return setErro("Informe o tipo de cada documento.");
    setEnviando(true);
    try {
      const docs = await Promise.all(
        arquivos.map(async (a) => ({ nome: a.file.name, tipo: a.tipo as TipoDocumentoRetroativo, descricao: a.descricao, conteudo: await lerArquivoComoDataUrl(a.file) })),
      );
      enviarComplementacao(sol.id, c.competenciaReferencia, docs, sol.nomeTitular);
      setArquivos([]);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="text-sm space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="flex-1">{formatCompetencia(c.competenciaReferencia)}</span>
        <span className={`text-xs ${status === "aguardando_complementacao" ? "font-semibold text-warning" : "text-muted-foreground"}`}>{rotulo}</span>
      </div>
      {negada?.justificativa && <p className="text-xs text-muted-foreground">Motivo: {negada.justificativa}</p>}
      {compl.length > 0 && status !== "aguardando_complementacao" && (
        <p className="text-xs text-muted-foreground">
          Complementação solicitada e respondida — documentos originais e complementares preservados na solicitação.
        </p>
      )}
      {pedido && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
          <p className="text-xs font-semibold">Complementação solicitada pela GERDAB</p>
          <p className="text-sm">{pedido.texto}</p>
          <p className="text-xs text-muted-foreground">Solicitada em {new Date(pedido.dataHora).toLocaleString("pt-BR")}.</p>
          <input
            ref={input}
            type="file"
            multiple
            aria-label={`Enviar documento — ${formatCompetencia(c.competenciaReferencia)}`}
            onChange={(e) => setArquivos([...arquivos, ...Array.from(e.target.files ?? []).map((file) => ({ file, tipo: "" as const, descricao: "" }))])}
            className="text-xs"
          />
          {arquivos.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium">{a.file.name}</span>
              <select
                value={a.tipo}
                onChange={(e) => setArquivos(arquivos.map((x, j) => (j === i ? { ...x, tipo: e.target.value as TipoDocumentoRetroativo } : x)))}
                className="border border-input rounded-md px-2 py-1 bg-background"
                aria-label={`Tipo de ${a.file.name}`}
              >
                <option value="">Tipo do documento…</option>
                {Object.entries(TIPOS_DOCUMENTO_RETROATIVO).map(([k, r]) => (<option key={k} value={k}>{r}</option>))}
              </select>
              {a.tipo === "outro" && (
                <input
                  value={a.descricao}
                  maxLength={80}
                  onChange={(e) => setArquivos(arquivos.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
                  placeholder="Descrição (obrigatória)"
                  className="border border-input rounded-md px-2 py-1 bg-background"
                />
              )}
            </div>
          ))}
          {erro && <p className="text-xs text-destructive" role="alert">{erro}</p>}
          <button onClick={enviar} disabled={enviando} className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-1.5 disabled:opacity-60">
            {enviando ? "Enviando…" : "Enviar documento"}
          </button>
        </div>
      )}
    </li>
  );
}

/** Aviso visível no Portal quando há complementação necessária no ressarcimento retroativo. */
export function AvisoComplementacaoRetroativa({ cpfTitular }: { cpfTitular?: string }) {
  const [pendentes, setPendentes] = useState<{ comp: string; texto: string }[]>([]);
  useEffect(() => {
    setPendentes(
      getSolicitacoesRetroativas()
        .filter((s) => s.origem === "individual" && s.cpfTitular === cpfTitular)
        .flatMap((s) =>
          s.competencias
            .filter((c) => getStatusRetroativo(s.origem, c) === "aguardando_complementacao")
            .map((c) => ({ comp: c.competenciaReferencia, texto: [...(c.complementacoes ?? [])].reverse().find((e) => e.tipo === "solicitada")?.texto ?? "" })),
        ),
    );
  }, [cpfTitular]);
  if (pendentes.length === 0) return null;
  return (
    <section className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm space-y-1" role="status">
      <p className="font-semibold">Pendência no seu ressarcimento retroativo</p>
      {pendentes.map((p) => (
        <p key={p.comp}>
          <span className="font-medium">{formatCompetencia(p.comp)}:</span> a GERDAB solicitou complementação — {p.texto}
        </p>
      ))}
      <p className="text-xs text-muted-foreground">Envie o documento dentro da própria solicitação, no bloco “Ressarcimento retroativo” abaixo.</p>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCompetencia } from "@/lib/mock-data";
import { useRetornoDeFoco } from "@/lib/use-retorno-foco";
import { proximoNumeroEmissao } from "@/lib/emissoes-relatorio";
import { ROTULO_VINCULO, useRegistrosAlteracoes } from "@/lib/relatorio-alteracoes";
import {
  chaveSecao,
  emitirRelatorio,
  montarSpecEmissao,
  prepararRelatorio,
  revisarRelatorio,
  SECOES_RELATORIO,
  useEmissoesAlteracoes,
  type EmissaoAlteracoes,
  type LinhaRelatorio,
} from "@/lib/relatorio-alteracoes-geracao";

const BTN_PRIMARIO = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
const BTN_SECUNDARIO = "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";
const BTN_CONTORNO = "inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const dataHoraBR = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const valorBR = (l: LinhaRelatorio) => (l.valorNaoAplicavel ? "N/A" : l.valor === undefined ? "" : l.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

const ROTULO_TIPO_CURTO: Record<string, string> = {
  incluir: "Inclusão",
  reincluir: "Reinclusão",
  alterar_valor: "Alteração de valor",
  dependente_incluido: "Inclusão de dependente",
  dependente_excluido: "Exclusão de dependente",
  dependente_reincluido: "Reinclusão de dependente",
  a_conferir: "Movimentação a classificar",
};

/** Baixa o PDF ou o Excel a partir do SNAPSHOT da emissão (nunca dos dados atuais). */
export async function baixarEmissao(e: EmissaoAlteracoes, formato: "pdf" | "xlsx") {
  const spec = montarSpecEmissao(e);
  if (formato === "pdf") (await import("@/lib/relatorio-export-pdf")).exportarRelatorioPDF(spec);
  else await (await import("@/lib/relatorio-export-xlsx")).exportarRelatorioXLSX(spec);
}

/* ── Documento (papel) ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Pré-visualização do documento: cabeçalho com o NÚMERO do relatório, competências, e uma tabela por seção não vazia. */
export function DocumentoRelatorio({ numero, referencia, pagamento, linhas, emissao, children }: { numero: number; referencia: string; pagamento: string; linhas: LinhaRelatorio[]; emissao?: { geradoEm: string; responsavel: string }; children?: React.ReactNode }) {
  return (
    <article aria-label={`Documento do Relatório de Alterações ${numero}`} className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10 shadow-sm text-foreground">
      {children}
      <header className="text-center space-y-1">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-foreground/70 uppercase">DETRAN-DF · Pró-Saúde</p>
        <h3 className="text-2xl font-bold">Relatório de Alterações</h3>
        <p className="text-sm font-semibold">Relatório {numero}</p>
        <p className="text-sm text-foreground/75">
          {formatCompetencia(referencia)} · Pagamento {formatCompetencia(pagamento)}
        </p>
        {emissao && (
          <p className="text-xs text-foreground/75">
            Emitido em {dataHoraBR(emissao.geradoEm)} · {emissao.responsavel}
          </p>
        )}
      </header>
      <hr className="my-5 border-t-2 border-foreground" />
      {linhas.length === 0 ? (
        <p className="text-sm text-foreground/75 text-center py-6">Nenhum registro selecionado.</p>
      ) : (
        <div className="space-y-5">
          {SECOES_RELATORIO.map((s) => {
            const doGrupo = linhas.filter((l) => l.vinculo === s.vinculo && l.origem === s.origem);
            if (doGrupo.length === 0) return null;
            return (
              <section key={chaveSecao(s.vinculo, s.origem)} aria-label={`${ROTULO_VINCULO[s.vinculo]} · ${s.origem}`}>
                <h4 className="bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wide">
                  {ROTULO_VINCULO[s.vinculo]} · {s.origem}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-foreground/75 border-b border-border">
                        <th className="px-3 py-2 font-semibold">Matrícula</th>
                        <th className="px-3 py-2 font-semibold">Nome</th>
                        <th className="px-3 py-2 font-semibold">Valor</th>
                        <th className="px-3 py-2 font-semibold">Observação NURFI</th>
                        <th className="px-3 py-2 font-semibold text-right">QT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doGrupo.map((l) => (
                        <tr key={l.chave} className="border-b border-border align-top">
                          <td className="px-3 py-2.5 whitespace-nowrap">{l.matricula}</td>
                          <td className="px-3 py-2.5 font-semibold">{l.nome}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{valorBR(l)}</td>
                          <td className="px-3 py-2.5">{l.observacao}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{l.qt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-center text-xs text-foreground/75">Em documentos extensos, a continuação inicia em nova página com o cabeçalho da tabela repetido.</p>
        </div>
      )}
    </article>
  );
}

function CabecalhoModal({ etapa, referencia, pagamento }: { etapa: string; referencia: string; pagamento: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-border">
      <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">{etapa}</p>
      <DialogTitle className="text-2xl font-bold mt-1">Relatório de Alterações — {formatCompetencia(referencia)}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground mt-1">Pagamento: {pagamento ? formatCompetencia(pagamento) : "a escolher"}</DialogDescription>
    </div>
  );
}

/* ── Fluxo de emissão: revisão → pré-visualização → confirmação → emissão concluída ─────────────────────────────── */

type Etapa = "revisao" | "previa" | "confirmacao" | "concluida";

export function FluxoEmissao({ competencia, responsavel, onFechar, onAbrirHistorico }: { competencia: string; responsavel: string; onFechar: () => void; onAbrirHistorico: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const registros = useRegistrosAlteracoes();
  const emissoes = useEmissoesAlteracoes();
  const [etapa, setEtapa] = useState<Etapa>("revisao");
  const [pagEscolhida, setPagEscolhida] = useState<string | undefined>(undefined);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [inicializado, setInicializado] = useState<string | null>(null);
  const [mostrarEmitidos, setMostrarEmitidos] = useState(false);
  const [duplicidadeOk, setDuplicidadeOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emitida, setEmitida] = useState<EmissaoAlteracoes | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const revisao = useMemo(() => revisarRelatorio(competencia, pagEscolhida, registros), [competencia, pagEscolhida, registros, emissoes]);
  const pag = revisao.competenciaPagamento;
  const prontos = revisao.itens.filter((i) => i.pronto);
  const prontosNaoEmitidos = prontos.filter((i) => i.emitidoEm.length === 0);
  const bloqueados = revisao.itens.filter((i) => !i.pronto);

  // Seleção inicial: todos os prontos AINDA NÃO EMITIDOS. Registros já emitidos nunca vêm marcados.
  useEffect(() => {
    const chave = `${competencia}|${pag ?? ""}`;
    if (inicializado === chave || !pag) return;
    setSelecionados(new Set(prontosNaoEmitidos.map((i) => i.registro.id)));
    setInicializado(chave);
  }, [pag, competencia, prontosNaoEmitidos, inicializado]);

  const prep = useMemo(() => (pag ? prepararRelatorio(competencia, pag, registros, selecionados) : null), [competencia, pag, registros, selecionados]);
  const jaEmitidosSelecionados = prontos.filter((i) => selecionados.has(i.registro.id) && i.emitidoEm.length > 0);
  const numeroPrevisto = proximoNumeroEmissao("alteracoes", competencia);
  const visiveis = revisao.itens.filter((i) => !(i.pronto && i.emitidoEm.length > 0) || mostrarEmitidos);
  const ordenados = [...visiveis.filter((i) => i.pronto), ...visiveis.filter((i) => !i.pronto)];
  const naoSelecionadosProntos = prontosNaoEmitidos.filter((i) => !selecionados.has(i.registro.id)).length;
  const todosMarcados = prontosNaoEmitidos.length > 0 && prontosNaoEmitidos.every((i) => selecionados.has(i.registro.id));
  const podeVisualizar = selecionados.size > 0 && !!prep?.podeGerar;

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function emitir() {
    setErro(null);
    try {
      if (!pag) throw new Error("Escolha a competência de pagamento.");
      setEmitida(emitirRelatorio(competencia, pag, responsavel, selecionados, { reemissaoConfirmada: duplicidadeOk }));
      setEtapa("concluida");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível emitir.");
    }
  }

  const rotuloEtapa: Record<Etapa, string> = { revisao: "Revisão", previa: "Pré-visualização", confirmacao: "Confirmação", concluida: "Emissão concluída" };

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco} className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
        <CabecalhoModal etapa={rotuloEtapa[etapa]} referencia={competencia} pagamento={pag ?? ""} />

        <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-5 space-y-5">
          {etapa === "revisao" && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-primary tabular-nums">{selecionados.size}</p>
                  <p className="text-foreground/75">selecionados para este relatório</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-status-pendente-fg tabular-nums">{bloqueados.length}</p>
                  <p className="text-foreground/75">bloqueados por pendências</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold tabular-nums">{naoSelecionadosProntos}</p>
                  <p className="text-foreground/75">prontos não selecionados</p>
                </div>
              </div>

              <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm leading-relaxed">
                <strong>Como funciona:</strong> registros marcados entrarão neste relatório. Ao desmarcar uma pessoa, ela permanece pronta para uma próxima emissão. Registros com pendências ficam bloqueados até a conferência ser concluída. Registros já emitidos ficam ocultos por padrão.
              </p>

              {revisao.pagamentosDisponiveis.length > 1 && (
                <label className="block text-sm max-w-sm">
                  Competência de pagamento deste relatório
                  <select value={pagEscolhida ?? ""} onChange={(e) => { setPagEscolhida(e.target.value || undefined); setInicializado(null); setSelecionados(new Set()); }} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <option value="">Selecione…</option>
                    {revisao.pagamentosDisponiveis.map((p) => (
                      <option key={p} value={p}>
                        {formatCompetencia(p)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-foreground/75 block mt-1">Há registros prontos com competências de pagamento diferentes; elas não são misturadas no mesmo relatório.</span>
                </label>
              )}

              <section className="rounded-xl border border-border bg-card" aria-label="Registros do relatório">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
                  <div>
                    <h3 className="font-bold">Registros do relatório</h3>
                    <p className="text-sm text-foreground/75">Somente registros prontos podem ser selecionados.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setMostrarEmitidos((v) => !v)} aria-pressed={mostrarEmitidos} className={BTN_CONTORNO}>
                      {mostrarEmitidos ? "Ocultar registros já emitidos" : "Consultar registros já emitidos"}
                    </button>
                    <label className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold cursor-pointer">
                      <input type="checkbox" checked={todosMarcados} disabled={prontosNaoEmitidos.length === 0} onChange={(e) => setSelecionados((s) => { const n = new Set(s); prontosNaoEmitidos.forEach((i) => (e.target.checked ? n.add(i.registro.id) : n.delete(i.registro.id))); return n; })} />
                      Selecionar todos os prontos
                    </label>
                  </div>
                </div>
                {ordenados.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-foreground/75">Nenhum registro na competência. Use “Buscar movimentações” ou “Incluir alteração” e conclua a conferência.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {ordenados.map((i) => (
                      <li key={i.registro.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                        <input type="checkbox" id={`sel-${i.registro.id}`} checked={selecionados.has(i.registro.id)} disabled={!i.pronto} onChange={() => alternar(i.registro.id)} className="h-4 w-4" />
                        <label htmlFor={`sel-${i.registro.id}`} className="min-w-0 flex-1">
                          <span className="block font-semibold break-words">{i.registro.titular.nome}</span>
                          <span className="block text-xs text-foreground/75">
                            {i.registro.titular.matricula ?? "Matrícula a informar"} · {i.registro.movimentos.map((m) => ROTULO_TIPO_CURTO[m.tipo]).join(" + ")}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {i.emitidoEm.length > 0 && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Emitido no Relatório {i.emitidoEm.join(", ")}</span>}
                          {i.pronto ? (
                            selecionados.has(i.registro.id) && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{i.emitidoEm.length > 0 ? "Será reemitido" : "Será incluído"}</span>
                          ) : (
                            <span className="rounded-full bg-status-pendente-bg px-3 py-1 text-xs font-semibold text-status-pendente-fg">{i.motivoBloqueio}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {prep && prep.bloqueios.length > 0 && (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
                  <p className="font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> A seleção tem bloqueios:
                  </p>
                  <ul className="list-disc ml-5 mt-1 text-xs space-y-0.5">
                    {prep.bloqueios.map((b, k) => (
                      <li key={k}>
                        <strong>{b.titular}</strong>: {b.motivos.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {(etapa === "previa" || etapa === "confirmacao" || etapa === "concluida") && pag && (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_16rem] gap-5 items-start">
              <DocumentoRelatorio numero={etapa === "concluida" && emitida ? emitida.numero : numeroPrevisto} referencia={competencia} pagamento={pag} linhas={etapa === "concluida" && emitida ? emitida.linhas : prep?.linhas ?? []} emissao={etapa === "concluida" && emitida ? { geradoEm: emitida.geradoEm, responsavel: emitida.responsavel } : undefined}>
                {etapa === "confirmacao" && (
                  <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm">
                    <p className="font-bold text-base">Confirmar emissão do relatório?</p>
                    <p className="mt-1 leading-relaxed">
                      Serão incluídos {selecionados.size} {selecionados.size === 1 ? "registro" : "registros"} da competência {formatCompetencia(competencia)}, com pagamento em {formatCompetencia(pag)}. Será o <strong>Relatório {numeroPrevisto}</strong> desta competência. Após a confirmação, este relatório será preservado no histórico e não poderá ser editado diretamente.
                    </p>
                  </div>
                )}
                {etapa === "concluida" && emitida && (
                  <div role="status" className="mb-6 rounded-xl border border-status-aprovado-fg/30 bg-status-aprovado-bg/40 px-5 py-4 text-sm">
                    <p className="font-bold text-base text-status-aprovado-fg">Relatório gerado com sucesso.</p>
                    <p className="text-status-aprovado-fg">Relatório {emitida.numero} registrado no histórico.</p>
                  </div>
                )}
              </DocumentoRelatorio>
              <aside className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
                {etapa === "concluida" && emitida ? (
                  <>
                    <h3 className="font-bold text-base">Arquivos disponíveis</h3>
                    <p className="text-foreground/75">O relatório foi registrado e pode ser baixado.</p>
                    <button type="button" onClick={() => baixarEmissao(emitida, "pdf")} className={`${BTN_PRIMARIO} w-full`}>
                      Baixar PDF
                    </button>
                    <button type="button" onClick={() => baixarEmissao(emitida, "xlsx")} className={`${BTN_CONTORNO} w-full`}>
                      Baixar Excel
                    </button>
                    <button type="button" onClick={() => { onFechar(); onAbrirHistorico(); }} className={`${BTN_SECUNDARIO} w-full`}>
                      <FileClock className="h-4 w-4" /> Consultar histórico
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-base">Documento</h3>
                    <p className="text-foreground/75">Revise a aparência antes de emitir o relatório.</p>
                    <dl className="text-xs space-y-1 pt-1">
                      <div>
                        <dt className="text-foreground/75">Relatório</dt>
                        <dd className="font-medium">nº {numeroPrevisto} da competência</dd>
                      </div>
                      <div>
                        <dt className="text-foreground/75">Responsável pela emissão</dt>
                        <dd className="font-medium">{responsavel}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </aside>
            </div>
          )}

          {etapa === "confirmacao" && jaEmitidosSelecionados.length > 0 && (
            <div role="group" aria-label="Confirmação de duplicidade" className="rounded-xl border border-status-pendente-fg/40 bg-status-pendente-bg px-5 py-4 text-sm">
              <p className="font-bold text-status-pendente-fg flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Reemissão: {jaEmitidosSelecionados.length} registro(s) já constam em outro relatório
              </p>
              <ul className="list-disc ml-5 mt-1 text-xs">
                {jaEmitidosSelecionados.map((i) => (
                  <li key={i.registro.id}>
                    {i.registro.titular.nome} — Relatório {i.emitidoEm.join(", ")}
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex items-start gap-2 font-medium">
                <input type="checkbox" checked={duplicidadeOk} onChange={(e) => setDuplicidadeOk(e.target.checked)} className="mt-1" />
                <span>Confirmo que a duplicidade é intencional e desejo incluir estes registros novamente neste relatório.</span>
              </label>
            </div>
          )}

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
          {etapa === "revisao" && (
            <>
              <button type="button" onClick={onFechar} className={BTN_SECUNDARIO}>
                Continuar conferência
              </button>
              <button type="button" onClick={() => { setErro(null); setEtapa("previa"); }} disabled={!podeVisualizar} className={BTN_PRIMARIO}>
                Visualizar relatório ({selecionados.size})
              </button>
            </>
          )}
          {etapa === "previa" && (
            <>
              <button type="button" onClick={() => setEtapa("revisao")} className={BTN_SECUNDARIO}>
                Voltar à revisão
              </button>
              <button type="button" onClick={() => { setDuplicidadeOk(false); setEtapa("confirmacao"); }} className={BTN_PRIMARIO}>
                Emitir relatório
              </button>
            </>
          )}
          {etapa === "confirmacao" && (
            <>
              <button type="button" onClick={() => setEtapa("previa")} className={BTN_SECUNDARIO}>
                Voltar à pré-visualização
              </button>
              <button type="button" onClick={emitir} disabled={jaEmitidosSelecionados.length > 0 && !duplicidadeOk} className={BTN_PRIMARIO}>
                Confirmar e emitir relatório
              </button>
            </>
          )}
          {etapa === "concluida" && emitida && (
            <>
              <p className="mr-auto text-xs text-foreground/75">
                Relatório {emitida.numero} · emitido em {dataBR(emitida.geradoEm)} · {emitida.responsavel}
              </p>
              <button type="button" onClick={onFechar} className={BTN_PRIMARIO}>
                Concluir
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Histórico de relatórios (emissões independentes) ───────────────────────────────────────────────────────────── */

export function HistoricoEmissoes({ competencia, onFechar }: { competencia: string; onFechar: () => void }) {
  const retornarFoco = useRetornoDeFoco("main h1");
  const todas = useEmissoesAlteracoes();
  const lista = useMemo(() => todas.filter((e) => e.competenciaReferencia === competencia).sort((a, b) => b.numero - a.numero), [todas, competencia]);
  const [ver, setVer] = useState<EmissaoAlteracoes | null>(null);

  if (ver)
    return (
      <Dialog open onOpenChange={(v) => !v && setVer(null)}>
        <DialogContent onCloseAutoFocus={retornarFoco} className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
          <CabecalhoModal etapa="Relatório emitido" referencia={ver.competenciaReferencia} pagamento={ver.competenciaPagamento} />
          <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-5">
            <DocumentoRelatorio numero={ver.numero} referencia={ver.competenciaReferencia} pagamento={ver.competenciaPagamento} linhas={ver.linhas} emissao={{ geradoEm: ver.geradoEm, responsavel: ver.responsavel }} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
            <button type="button" onClick={() => baixarEmissao(ver, "pdf")} className={BTN_CONTORNO}>
              PDF
            </button>
            <button type="button" onClick={() => baixarEmissao(ver, "xlsx")} className={BTN_CONTORNO}>
              Excel
            </button>
            <button type="button" onClick={() => setVer(null)} className={BTN_PRIMARIO}>
              Voltar ao histórico
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent onCloseAutoFocus={retornarFoco} className="max-w-xl p-0 gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold">Histórico de relatórios</DialogTitle>
          <DialogDescription className="text-sm text-foreground/75 mt-1">Emissões independentes preservadas por competência — {formatCompetencia(competencia)}.</DialogDescription>
        </div>
        {lista.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-foreground/75">Nenhum relatório emitido para esta competência.</p>
        ) : (
          <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {lista.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-bold">
                    Relatório {e.numero} — {formatCompetencia(e.competenciaReferencia)}
                    {e.demonstrativo && <span className="ml-2 rounded-full border border-dashed border-current px-2 py-0.5 text-[11px] font-medium text-foreground/75">Demonstrativo</span>}
                  </p>
                  <p className="text-sm text-foreground/75">
                    Emitido em {dataBR(e.geradoEm)} · {e.responsavel} · {e.totalRegistros} {e.totalRegistros === 1 ? "registro" : "registros"} · Pagamento {formatCompetencia(e.competenciaPagamento)}
                    {e.reemissao ? " · inclui reemissão confirmada" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setVer(e)} className={BTN_SECUNDARIO} aria-label={`Visualizar Relatório ${e.numero}`}>
                    Visualizar
                  </button>
                  <button type="button" onClick={() => baixarEmissao(e, "pdf")} className={BTN_CONTORNO} aria-label={`Baixar PDF do Relatório ${e.numero}`}>
                    PDF
                  </button>
                  <button type="button" onClick={() => baixarEmissao(e, "xlsx")} className={BTN_CONTORNO} aria-label={`Baixar Excel do Relatório ${e.numero}`}>
                    Excel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end border-t border-border px-6 py-3">
          <button type="button" onClick={onFechar} className={BTN_SECUNDARIO}>
            <Check className="h-4 w-4" /> Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

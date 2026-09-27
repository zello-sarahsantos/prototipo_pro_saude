import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import { RetroativosNav } from "@/components/RetroativosNav";
import { getAdminRole } from "@/components/AdminLayout";
import { analistaReferencia, formatCompetencia, formatCurrency, gerenteReferencia } from "@/lib/mock-data";
import { garantirMassaDemonstracaoRetroativos } from "@/lib/massa-demonstracao";
import { montarSpecConsolidacao } from "@/lib/consolidacao-export";
import { chaveLinhaConsolidacao, consolidarCiclo, getCicloOperacional, getSituacaoConsolidacao } from "@/lib/retroativo-fluxo";

export const Route = createFileRoute("/admin/relatorios/retroativos")({
  component: Consolidacao,
});

/**
 * **Consolidação** do Ressarcimento Retroativo (nome da funcionalidade: sempre "Ressarcimento Retroativo" —
 * evita confusão com a consolidação do Fechamento de Pagamento).
 *
 * Contém EXCLUSIVAMENTE os retroativos que já foram analisados, estão autorizados/habilitados e aptos, e
 * ainda não foram incluídos em um relatório gerado para o NURFI. Colunas oficiais: Matrícula | Nome | Mês/Ano
 * Pagamento | Valor Pago | Valor Devido | Valor a ser Ressarcido | Observação — uma linha por competência.
 *
 * Duas ações distintas:
 *  - **Exportar prévia** (PDF/XLSX): só conferência dos dados exibidos; não altera registros, não retira nada da
 *    Consolidação e não gera Histórico.
 *  - "Selecionar todos" atua SÓ sobre os registros exibidos (aba + filtro atuais); a confirmação de geração deixa
 *    explícito que apenas os selecionados saem da Consolidação.
 *  - **Gerar relatório**: ação oficial de criação da remessa ao NURFI — cria um snapshot IMUTÁVEL com as
 *    competências SELECIONADAS; elas deixam a Consolidação e passam ao Histórico. As não selecionadas e as
 *    autorizadas depois permanecem para um próximo relatório (podem existir vários relatórios no mesmo ciclo).
 *
 * Em análise, aguardando complementação, complementação recebida não analisada, apuração incompleta ou não
 * habilitada NÃO entram. Sem matrícula (ou sem classificação Ativo/Inativo confiável) a competência fica retida
 * como pendência cadastral. O ciclo é só classificação temporal. Texto institucional final do documento pendente.
 */
const porGrupo = (ls: { grupo: "ativo" | "inativo" }[]) => {
  const a = ls.filter((l) => l.grupo === "ativo").length;
  const i = ls.length - a;
  return [a ? `${a} Ativos` : "", i ? `${i} Inativos` : ""].filter(Boolean).join(" · ");
};

function Consolidacao() {
  const [aba, setAba] = useState<"ativo" | "inativo">("ativo");
  const [mesAnoPagamento, setMesAnoPagamento] = useState("");
  const [versao, setVersao] = useState(0);
  const [msg, setMsg] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const responsavel = getAdminRole() === "gerencia" ? gerenteReferencia : analistaReferencia;

  // DEMONSTRAÇÃO DO PROTÓTIPO: semeadura única da massa simulada (ver `massa-demonstracao.ts`); não é
  // comportamento esperado para produção.
  useEffect(() => {
    garantirMassaDemonstracaoRetroativos();
    setVersao((v) => v + 1);
  }, []);

  const situacao = useMemo(() => getSituacaoConsolidacao(), [versao]);
  const todas = situacao.aptas;
  const doGrupo = todas.filter((l) => l.grupo === aba);
  const meses = [...new Set(doGrupo.map((l) => l.mesAnoPagamento))].sort();
  const linhas = doGrupo.filter((l) => !mesAnoPagamento || l.mesAnoPagamento === mesAnoPagamento);
  const rotuloAba = aba === "ativo" ? "Ativos" : "Inativos";
  const cicloAtual = getCicloOperacional();

  const escolhidas = todas.filter((l) => selecionadas.has(chaveLinhaConsolidacao(l)));
  const totalEscolhido = escolhidas.reduce((t, l) => t + l.valorRessarcir, 0);
  const todasVisiveisMarcadas = linhas.length > 0 && linhas.every((l) => selecionadas.has(chaveLinhaConsolidacao(l)));

  function alternar(chave: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }
  function alternarVisiveis() {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      linhas.forEach((l) => (todasVisiveisMarcadas ? novo.delete(chaveLinhaConsolidacao(l)) : novo.add(chaveLinhaConsolidacao(l))));
      return novo;
    });
  }

  // Prévia = o que está exibido na aba (respeitando o filtro) — só conferência, não altera nada.
  const specPrevia = montarSpecConsolidacao({
    linhas: linhas,
    grupo: aba,
    filtrosAplicados: [...(mesAnoPagamento ? [`Mês/Ano de Pagamento: ${formatCompetencia(mesAnoPagamento)}`] : []), "PRÉVIA para conferência — não é o relatório oficial"],
    nomeArquivoBase: `pro-saude_ressarcimento_retroativo_previa_${aba === "ativo" ? "ativos" : "inativos"}${mesAnoPagamento ? `_${mesAnoPagamento}` : ""}`,
    tituloExtra: "prévia",
  });

  function gerar() {
    setMsg("");
    try {
      const snap = consolidarCiclo(responsavel, undefined, [...selecionadas]);
      setMsg(`Relatório nº ${snap.sequencia} — ${formatCompetencia(snap.ciclo)} gerado: ${snap.linhas.length} competência(s), ${formatCurrency(snap.linhas.reduce((t, l) => t + l.valorRessarcir, 0))}. Já está no Histórico.`);
      setSelecionadas(new Set());
      setVersao((v) => v + 1);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Ressarcimento Retroativo</h1>
        <p className="text-sm text-muted-foreground">Consolidação — ciclo operacional vigente: {cicloAtual}.</p>
      </header>
      <RetroativosNav ativa="consolidacao" />

      <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm space-y-1">
        <p>
          A Consolidação reúne somente os retroativos <strong>já analisados</strong>, <strong>autorizados/habilitados</strong> e
          aptos, que <strong>ainda não foram incluídos</strong> em um relatório gerado para o NURFI.
        </p>
        <p className="text-muted-foreground">
          <strong>Exportar prévia</strong> serve só para conferência: não altera registros, não retira nada daqui e não gera Histórico.{" "}
          <strong>Gerar relatório</strong> é a ação oficial: cria a remessa para o NURFI (snapshot imutável) com as competências selecionadas, que saem
          da Consolidação e vão para o Histórico.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["ativo", "inativo"] as const).map((g) => (
            <button
              key={g}
              onClick={() => { setAba(g); setMesAnoPagamento(""); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${aba === g ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {g === "ativo" ? "Ativos" : "Inativos"} ({todas.filter((l) => l.grupo === g).length})
            </button>
          ))}
        </div>
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          Mês/Ano de Pagamento
          <select value={mesAnoPagamento} onChange={(e) => setMesAnoPagamento(e.target.value)} className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
            <option value="">Todos</option>
            {meses.map((m) => (<option key={m} value={m}>{formatCompetencia(m)}</option>))}
          </select>
        </label>
      </div>

      {/* Barra de seleção e ações */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-sm" role="status">
          <span className="font-medium">{escolhidas.length} de {todas.length}</span> selecionadas
          {escolhidas.length > 0 && <> ({porGrupo(escolhidas)}) · <span className="font-medium">{formatCurrency(totalEscolhido)}</span></>}
        </span>
        {/* "Selecionar todos" atua SÓ sobre os registros exibidos no contexto atual (aba Ativos/Inativos + filtro de
            Mês/Ano de Pagamento) — nunca sobre registros ocultos por outra aba ou filtro. */}
        <button
          onClick={() => setSelecionadas((atual) => new Set([...atual, ...linhas.map(chaveLinhaConsolidacao)]))}
          disabled={linhas.length === 0}
          title="Seleciona todos os registros exibidos agora (aba e filtro atuais)"
          className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-50"
        >
          Selecionar todos ({linhas.length})
        </button>
        <button onClick={() => setSelecionadas(new Set())} disabled={escolhidas.length === 0} className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-50">Limpar seleção</button>
        <div className="ml-auto flex items-center gap-2">
          <ExportarRelatorio spec={specPrevia} rotulo="Exportar prévia" />
          <button
            onClick={() => setConfirmando(true)}
            disabled={escolhidas.length === 0}
            className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gerar relatório
          </button>
        </div>
      </div>

      {msg && (
        <p className="text-sm rounded-lg bg-muted/60 p-3" role="status">
          {msg} <Link to="/admin/relatorios/consolidacoes" className="text-primary hover:underline">Ver no Histórico</Link>
        </p>
      )}

      {situacao.retidasPorCadastro.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm flex gap-2" role="status">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p>
            Pendência cadastral — retidas fora da Consolidação até a conferência:{" "}
            {situacao.retidasPorCadastro.map((r) => `${r.nome} (${formatCompetencia(r.competenciaReferencia)}) — ${r.motivo}`).join("; ")}.
          </p>
        </div>
      )}

      <section className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 w-10">
                <input type="checkbox" checked={todasVisiveisMarcadas} onChange={alternarVisiveis} disabled={linhas.length === 0} aria-label={`Selecionar todos os ${rotuloAba.toLowerCase()} exibidos`} className="h-4 w-4" />
              </th>
              <th className="text-left px-4 py-2">Matrícula</th>
              <th className="text-left px-4 py-2">Nome</th>
              <th className="text-left px-4 py-2">Mês/Ano Pagamento</th>
              <th className="text-right px-4 py-2">Valor Pago</th>
              <th className="text-right px-4 py-2">Valor Devido</th>
              <th className="text-right px-4 py-2">Valor a ser Ressarcido</th>
              <th className="text-left px-4 py-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const chave = chaveLinhaConsolidacao(l);
              return (
                <tr key={chave} className={`border-t border-border ${selecionadas.has(chave) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selecionadas.has(chave)} onChange={() => alternar(chave)} aria-label={`Selecionar ${l.nome} — ${formatCompetencia(l.competenciaReferencia)}`} className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-2">{l.matricula}</td>
                  <td className="px-4 py-2 font-medium">{l.nome}</td>
                  <td className="px-4 py-2">{formatCompetencia(l.mesAnoPagamento)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(l.valorPago)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(l.valorDevido)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.valorRessarcir)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.observacao}</td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Nenhuma competência autorizada e apta de {rotuloAba.toLowerCase()} na Consolidação.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        Competências em análise, aguardando complementação, com complementação recebida ainda não analisada, com apuração incompleta ou não habilitadas
        não entram e permanecem na fila{situacao.pendentesNaFila > 0 ? ` (${situacao.pendentesNaFila} agora)` : ""}; nenhuma pendência bloqueia o relatório das demais. Sem valor adicional a pagar (Pago = Devido) não constam.
      </p>

      {confirmando && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao">
          <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full p-6 space-y-4">
            <h2 id="titulo-confirmacao" className="text-lg font-semibold">Gerar relatório para o NURFI?</h2>
            <p className="text-sm">
              {escolhidas.length} competência{escolhidas.length === 1 ? " selecionada será incluída" : "s selecionadas serão incluídas"} neste relatório ({porGrupo(escolhidas)}), totalizando{" "}
              <strong>{formatCurrency(totalEscolhido)}</strong>.
            </p>
            <p className="text-sm">
              <strong>Somente os {escolhidas.length} registro{escolhidas.length === 1 ? " selecionado será retirado" : "s selecionados serão retirados"} da Consolidação.</strong>{" "}
              Os {todas.length - escolhidas.length} restante{todas.length - escolhidas.length === 1 ? "" : "s"} permanece{todas.length - escolhidas.length === 1 ? "" : "m"} nela.
            </p>
            <p className="text-sm text-muted-foreground">
              Após a geração, esses registros serão removidos da Consolidação e ficarão disponíveis no Histórico. Registros não selecionados ou
              aprovados posteriormente permanecerão disponíveis para um próximo relatório.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmando(false)} className="text-sm font-medium border border-border rounded-md px-4 py-2 hover:bg-muted">Cancelar</button>
              <button onClick={gerar} className="text-sm font-medium bg-primary text-primary-foreground rounded-md px-4 py-2">Gerar relatório</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

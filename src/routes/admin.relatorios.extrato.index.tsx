import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import {
  formatCompetencia,
  getCompetenciasConhecidas,
  getHistoricoComprovacoes,
  type LinhaHistoricoComprovacoes,
} from "@/lib/fechamento-pagamento";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";

export const Route = createFileRoute("/admin/relatorios/extrato/")({
  component: HistoricoDeComprovacoes,
});

type FiltroVinculo = "todos" | "ativo" | "inativo";
type FiltroSituacao = "todos" | "comprovado" | "nao_comprovado" | "em_analise";

/**
 * Histórico de Comprovações — porta de entrada administrativa consolidada (GERDAB) para a
 * consulta individual. Apresenta TODOS os servidores da base administrativa (hoje só 1, pela
 * mesma limitação de dados já registrada no Fechamento/Extrato — ver docs/MODULO_RELATORIOS.md),
 * com drill-down para `/admin/relatorios/extrato/$matricula` (Extrato Individual, já
 * implementado — preservado sem alterações). Nenhum motor de classificação novo:
 * `getHistoricoComprovacoes` reaproveita `getExtratoServidor`, mesma fonte do Extrato.
 *
 * Correção de nomenclatura (era "Histórico de Pagamentos"): o sistema não confirma que o
 * auxílio foi efetivamente pago em folha — só possui evidência de comprovação e análise. Por
 * isso a tela e os rótulos passam a falar em comprovação/análise, nunca em pagamento efetivo.
 */
function HistoricoDeComprovacoes() {
  const competenciasConhecidas = useMemo(() => getCompetenciasConhecidas(), []);
  const anosConhecidos = useMemo(
    () => [...new Set(competenciasConhecidas.map((c) => c.split("-")[0]))].sort(),
    [competenciasConhecidas],
  );

  const [ano, setAno] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todos");
  const [vinculo, setVinculo] = useState<FiltroVinculo>("todos");
  const [busca, setBusca] = useState("");

  const linhas = useMemo(
    () => getHistoricoComprovacoes({ ano: ano || undefined, competencia: competencia || undefined }),
    [ano, competencia],
  );

  const competenciasDoAno = ano
    ? competenciasConhecidas.filter((c) => c.startsWith(ano))
    : competenciasConhecidas;

  const filtradas = linhas
    .filter((l) => vinculo === "todos" || l.situacaoVinculo === vinculo)
    .filter((l) => {
      if (situacao === "todos") return true;
      if (situacao === "comprovado") return l.comprovadas > 0;
      if (situacao === "nao_comprovado") return l.naoComprovadas > 0;
      return l.emAnalise > 0;
    })
    .filter((l) => {
      if (!busca.trim()) return true;
      const alvo = busca.trim().toLowerCase();
      return l.nome.toLowerCase().includes(alvo) || (l.matricula ?? "").includes(alvo);
    });

  // Exportação (PDF/XLSX) — mesmas linhas já filtradas na tela (`filtradas`), nunca só a
  // página visual; filtros listados refletem exatamente os controles ativos acima.
  const situacaoLabel: Record<FiltroSituacao, string> = {
    todos: "",
    comprovado: "Comprovado",
    nao_comprovado: "Não comprovado",
    em_analise: "Em análise",
  };
  const filtrosAplicados = [
    ano && `Ano: ${ano}`,
    competencia && `Competência: ${formatCompetencia(competencia)}`,
    situacao !== "todos" && `Situação: ${situacaoLabel[situacao]}`,
    vinculo !== "todos" && `Vínculo: ${vinculo === "ativo" ? "Ativos" : "Inativos"}`,
    busca.trim() && `Busca: "${busca.trim()}"`,
  ].filter((f): f is string => Boolean(f));

  const specExport: RelatorioExportSpec<LinhaHistoricoComprovacoes> = {
    titulo: "Histórico de Comprovações",
    origem: "Relatórios",
    filtrosAplicados,
    colunas: [
      { header: "Matrícula", valor: (l) => l.matricula ?? "—", tipo: "texto" },
      { header: "Servidor", valor: (l) => l.nome, tipo: "texto", width: 26 },
      { header: "Competências", valor: (l) => l.competencias, tipo: "numero" },
      { header: "Comprovadas", valor: (l) => l.comprovadas, tipo: "numero" },
      { header: "Não Comprovadas", valor: (l) => l.naoComprovadas, tipo: "numero" },
      { header: "Em Análise", valor: (l) => l.emAnalise, tipo: "numero" },
      { header: "Valor Aprovado", valor: (l) => l.valorAprovado, tipo: "moeda" },
    ],
    linhas: filtradas,
    nomeArquivoBase: `pro-saude_historico_comprovacoes_${ano || "todos"}`,
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <Link to="/admin/relatorios" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para Relatórios
      </Link>

      <header>
        <h1 className="text-2xl font-bold">Histórico de Comprovações</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada das comprovações apresentadas pelos servidores e do estado de
          análise de cada uma, com acesso ao extrato individual. Não representa confirmação de
          pagamento em folha.
        </p>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">Ano</span>
          <select
            value={ano}
            onChange={(e) => {
              setAno(e.target.value);
              setCompetencia("");
            }}
            className="border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            <option value="">Todos</option>
            {anosConhecidos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">Competência</span>
          <select
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            <option value="">Todas</option>
            {competenciasDoAno.map((c) => (
              <option key={c} value={c}>
                {formatCompetencia(c)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">Situação da comprovação</span>
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as FiltroSituacao)}
            className="border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            <option value="todos">Todas</option>
            <option value="comprovado">Comprovado</option>
            <option value="nao_comprovado">Não comprovado</option>
            <option value="em_analise">Em análise</option>
          </select>
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Vínculo:</span>
          {(["todos", "ativo", "inativo"] as FiltroVinculo[]).map((f) => (
            <button
              key={f}
              onClick={() => setVinculo(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                vinculo === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>

        <label className="text-sm ml-auto">
          <span className="block text-xs text-muted-foreground mb-1">Buscar</span>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou matrícula"
              className="border border-border rounded-md pl-8 pr-3 py-2 bg-background text-sm"
            />
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <ExportarRelatorio spec={specExport} />
      </div>

      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Matrícula</th>
              <th className="text-left px-4 py-2">Servidor</th>
              <th className="text-center px-4 py-2">Competências</th>
              <th className="text-center px-4 py-2">Comprovadas</th>
              <th className="text-center px-4 py-2">Não comprovadas</th>
              <th className="text-center px-4 py-2">Em análise</th>
              <th className="text-right px-4 py-2">Valor aprovado</th>
              <th className="px-4 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.beneficiarioId} className="border-t border-border">
                <td className="px-4 py-2">{l.matricula ?? "—"}</td>
                <td className="px-4 py-2 font-medium">{l.nome}</td>
                <td className="px-4 py-2 text-center">{l.competencias}</td>
                <td className="px-4 py-2 text-center text-status-aprovado-fg font-medium">{l.comprovadas}</td>
                <td className="px-4 py-2 text-center text-status-rejeitado-fg font-medium">{l.naoComprovadas}</td>
                <td className="px-4 py-2 text-center text-status-pendente-fg font-medium">{l.emAnalise}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.valorAprovado)}</td>
                <td className="px-4 py-2">
                  <Link
                    to="/admin/relatorios/extrato/$matricula"
                    params={{ matricula: l.matricula ?? "" }}
                    className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                  >
                    Ver extrato <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum servidor encontrado para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

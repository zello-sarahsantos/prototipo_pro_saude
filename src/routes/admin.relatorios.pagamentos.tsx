import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { XCircle, HelpCircle, Lock, Unlock, ExternalLink, X, Building2, ListTree, CalendarClock, FileClock, FileOutput } from "lucide-react";
import { garantirPlanilhaExemplo } from "@/lib/planilhas-associacao";
import { getAdminRole } from "@/components/AdminLayout";
import { formatCurrency } from "@/lib/mock-data";
import {
  competenciasParaFechamento,
  formatCompetencia,
  formatarOperadoraIntegrante,
  gerarRelatorioFechamento,
  getRegistrosDisponiveisParaRelatorio,
  getRegistrosFechamento,
  getResumoFechamento,
  getStatusFechamentoAutomatico,
  statusComprovanteLabels,
  type ClassificacaoFechamento,
  type RegistroFechamento,
  type IntegranteGrupoFechamento,
} from "@/lib/fechamento-pagamento";
import { getDataReferencia, setDataReferencia } from "@/lib/dias-uteis";
import { getObservacaoNurfi, salvarObservacaoNurfi, PROSAUDE_STORAGE_KEYS } from "@/lib/prosaude-storage";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";
import { PlanilhaStatusBadge } from "@/components/PlanilhaStatusBadge";
import type { StatusPlanilhaAssociacao } from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/admin/relatorios/pagamentos")({
  component: FechamentoDePagamento,
});

type FiltroVinculo = "todos" | "ativo" | "inativo";

const situacaoVinculoLabel: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  pendente_documentacao: "Pendente de documentação",
};

function BadgeVinculo({ situacao }: { situacao: string }) {
  const tone =
    situacao === "ativo"
      ? "bg-status-aprovado-bg text-status-aprovado-fg"
      : situacao === "inativo"
        ? "bg-status-inativo-bg text-status-inativo-fg"
        : "bg-status-analise-bg text-status-analise-fg";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {situacaoVinculoLabel[situacao] ?? situacao}
    </span>
  );
}

function tempoAguardando(dataIso?: string): string {
  if (!dataIso) return "—";
  const dias = Math.max(0, Math.floor((Date.now() - new Date(dataIso).getTime()) / (1000 * 60 * 60 * 24)));
  if (dias === 0) return "Hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function FechamentoDePagamento() {
  const role = getAdminRole();
  const isGerencia = role === "gerencia";
  const fechadoPorReferencia = isGerencia ? "Erandir / Gerência" : "Rebeca / Luciana";

  const [competencia, setCompetencia] = useState(
    competenciasParaFechamento[competenciasParaFechamento.length - 1],
  );
  const [tab, setTab] = useState<ClassificacaoFechamento>("adimplente");
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>("todos");
  const [obsRascunho, setObsRascunho] = useState<Record<string, string>>({});
  const [, forceUpdate] = useState(0);
  // DEMONSTRAÇÃO DO PROTÓTIPO: garante as planilhas de exemplo das Associações (ver `garantirPlanilhaExemplo`) para o
  // Fechamento já mostrar o efeito da habilitação explícita; não é comportamento esperado para produção.
  const [versaoMassa, setVersaoMassa] = useState(0);
  useEffect(() => {
    garantirPlanilhaExemplo();
    setVersaoMassa((v) => v + 1);
  }, []);
  // Drill-down da composição do grupo familiar ("Detalhes") — reaproveita `composicaoGrupo`, já
  // calculado por `getRegistrosFechamento`; nenhuma segunda apuração aqui. Também mostra a
  // origem da comprovação (P7) quando aplicável, unificando o que antes eram dois popovers.
  const [detalheGrupo, setDetalheGrupo] = useState<RegistroFechamento | null>(null);

  const registros = useMemo(() => getRegistrosFechamento(competencia), [competencia, versaoMassa]);
  const resumo = useMemo(() => getResumoFechamento(competencia), [competencia, versaoMassa]);

  // Fase 9 — Data simulada (RECURSO EXCLUSIVO DO PROTÓTIPO, ver `dias-uteis.ts`): não existe
  // calendário oficial de feriados nem um jeito de "avançar o tempo" de verdade nesta demonstração,
  // então esse controle deixa a GERDAB simular "hoje" para observar o fechamento automático
  // (2º/3º dia útil) em datas diferentes da data real. Em produção não há nada equivalente — o
  // fechamento reage à data real do servidor, sem nenhum controle manual de data.
  const [dataSimulada, setDataSimuladaState] = useState(() => getDataReferencia());
  function aplicarDataSimulada(valorInput: string) {
    // Meio-dia local (não meia-noite UTC) — evita que `new Date("AAAA-MM-DD")` (parseada como UTC)
    // "vire o dia" para trás nos métodos locais (`getDay`/`getDate`) que `dias-uteis.ts` usa para
    // decidir dia útil, dependendo do fuso horário de quem está testando.
    const [ano, mes, dia] = valorInput.split("-").map(Number);
    const local = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    setDataReferencia(local.toISOString());
    setDataSimuladaState(getDataReferencia());
    forceUpdate((n) => n + 1);
  }
  function limparDataSimulada() {
    setDataReferencia(null);
    setDataSimuladaState(getDataReferencia());
    forceUpdate((n) => n + 1);
  }
  const estaSimulando = (() => {
    try {
      return localStorage.getItem(PROSAUDE_STORAGE_KEYS.dataReferenciaPrototipo) !== null;
    } catch {
      return false;
    }
  })();

  // Fechamento automático (Fase 9) — nunca persistido, sempre recomputado a partir da data de
  // referência (real ou simulada acima). `versaoMassa` só está na lista de dependências porque
  // reordena os dados exibidos; a data simulada é lida direto em cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statusFechamento = useMemo(() => getStatusFechamentoAutomatico(competencia), [competencia, versaoMassa, dataSimulada]);

  // Fase 10 — Histórico do Fechamento (relatório oficial para o NURFI). Só existem registros
  // "disponíveis" quando a competência já encerrou automaticamente; um registro que já entrou em
  // um relatório anterior desta competência nunca aparece de novo aqui (evita duplicidade).
  const registrosDisponiveis = useMemo(
    () => (statusFechamento.fechada ? getRegistrosDisponiveisParaRelatorio(competencia) : []),
    [competencia, statusFechamento.fechada, versaoMassa],
  );
  const [mensagemRelatorio, setMensagemRelatorio] = useState<string | null>(null);

  function handleGerarRelatorio() {
    const adimplentesAptos = registrosDisponiveis.filter((r) => r.classificacao === "adimplente").length;
    const inadimplentesAptos = registrosDisponiveis.filter((r) => r.classificacao === "inadimplente").length;
    const confirmado = window.confirm(
      `Gerar o relatório de ${formatCompetencia(competencia)} com ${registrosDisponiveis.length} registro(s) ` +
        `(${adimplentesAptos} adimplente(s), ${inadimplentesAptos} inadimplente(s))?\n\n` +
        `Registros em "Requer análise" não entram e continuam disponíveis para um relatório posterior. ` +
        `Os registros incluídos agora não poderão compor outro relatório desta competência.`,
    );
    if (!confirmado) return;
    try {
      const snapshot = gerarRelatorioFechamento(competencia, fechadoPorReferencia);
      setMensagemRelatorio(`Relatório nº ${snapshot.sequencia} de ${formatCompetencia(competencia)} gerado com sucesso.`);
      // `versaoMassa`, não `forceUpdate`: `registrosDisponiveis` (e o próprio `snapshot` recém-criado
      // não devem mais aparecer como disponíveis) depende de `versaoMassa` para recomputar.
      setVersaoMassa((v) => v + 1);
    } catch (e) {
      setMensagemRelatorio(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    }
  }

  const registrosFiltrados = useMemo(
    () =>
      registros
        .filter((r) => r.classificacao === tab)
        .filter((r) => filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo),
    [registros, tab, filtroVinculo],
  );

  // Exportação (PDF/XLSX) — uma spec por aba, já que cada classificação tem colunas próprias
  // (não força Adimplentes/Inadimplentes/Requer análise a compartilhar uma tabela genérica).
  // Reaproveita exatamente `registrosFiltrados` (mesmo dado da tela, já com o filtro de
  // Vínculo aplicado) — nenhuma consulta/agregação nova só para exportar.
  const filtrosAplicados = filtroVinculo !== "todos" ? [`Vínculo: ${filtroVinculo === "ativo" ? "Ativos" : "Inativos"}`] : [];
  const competenciaLabel = formatCompetencia(competencia);

  // Exportação de Adimplentes é analítica — uma linha por integrante do grupo familiar (titular
  // e dependentes em linhas separadas e consecutivas), nunca uma segunda aba/estrutura: mesma
  // `RelatorioExportSpec` usada por PDF e XLSX, só alimentada por uma linha "achatada" que junta
  // o registro do titular com cada integrante de `composicaoGrupo` (já calculado, nunca
  // recalculado aqui). Valor Total do Grupo/Valor a Ressarcir se repetem propositalmente em
  // todas as linhas do mesmo titular, para cada linha exportada ser autocontida.
  const adimplentesFiltrados = registros.filter(
    (r) => r.classificacao === "adimplente" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo),
  );
  const linhasAnaliticasAdimplentes = useMemo(
    () =>
      adimplentesFiltrados.flatMap((registro) =>
        registro.composicaoGrupo.map((integrante) => ({ registro, integrante })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros, filtroVinculo],
  );

  const specAdimplentes: RelatorioExportSpec<{ registro: RegistroFechamento; integrante: IntegranteGrupoFechamento }> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Adimplentes",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "Matrícula Titular", valor: (l) => l.registro.matricula ?? "—", tipo: "texto" },
        { header: "Titular", valor: (l) => l.registro.nome, tipo: "texto", width: 24 },
        { header: "CPF Beneficiário", valor: (l) => l.integrante.cpf ?? "—", tipo: "texto" },
        { header: "Beneficiário", valor: (l) => l.integrante.nome, tipo: "texto", width: 24 },
        { header: "Parentesco", valor: (l) => l.integrante.parentesco, tipo: "texto" },
        { header: "Operadora/Associação", valor: (l) => formatarOperadoraIntegrante(l.registro, l.integrante), tipo: "texto", width: 18 },
        { header: "Competência", valor: (l) => formatCompetencia(l.registro.competencia), tipo: "texto" },
        { header: "Valor Individual", valor: (l) => l.integrante.valor, tipo: "moeda" },
        { header: "Valor Total do Grupo Familiar", valor: (l) => l.registro.valor, tipo: "moeda" },
        { header: "Valor a Ressarcir do Grupo Familiar", valor: (l) => l.registro.valorRessarcir, tipo: "moeda" },
      ],
      linhas: linhasAnaliticasAdimplentes,
      nomeArquivoBase: `pro-saude_fechamento_pagamento_adimplentes_${competencia}`,
    }),
    [linhasAnaliticasAdimplentes, competencia, competenciaLabel, filtrosAplicados],
  );

  const specInadimplentes: RelatorioExportSpec<RegistroFechamento> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Inadimplentes",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "Matrícula", valor: (r) => r.matricula ?? "—", tipo: "texto" },
        { header: "Nome", valor: (r) => r.nome, tipo: "texto", width: 26 },
        { header: "Valor do Plano", valor: (r) => r.valor, tipo: "moeda" },
        { header: "Situação", valor: (r) => r.situacao ?? "—", tipo: "texto" },
        { header: "Motivo", valor: (r) => r.motivo ?? "—", tipo: "texto", width: 34 },
        {
          header: "Observação NURFI",
          valor: (r) => getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ?? "",
          tipo: "texto",
          width: 30,
        },
      ],
      linhas: registros.filter((r) => r.classificacao === "inadimplente" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo)),
      nomeArquivoBase: `pro-saude_fechamento_pagamento_inadimplentes_${competencia}`,
    }),
    [registros, filtroVinculo, competencia, competenciaLabel, filtrosAplicados],
  );

  const specRequerAnalise: RelatorioExportSpec<RegistroFechamento> = useMemo(
    () => ({
      titulo: "Fechamento de Pagamento — Requer Análise",
      origem: "Fechamento de Pagamento",
      competencia: competenciaLabel,
      filtrosAplicados,
      colunas: [
        { header: "Matrícula", valor: (r) => r.matricula ?? "—", tipo: "texto" },
        { header: "Servidor", valor: (r) => r.nome, tipo: "texto", width: 26 },
        { header: "Competência", valor: (r) => formatCompetencia(r.competencia), tipo: "texto" },
        {
          header: "Pendência/Motivo",
          valor: (r) => (r.statusComprovante ? statusComprovanteLabels[r.statusComprovante] : "—"),
          tipo: "texto",
          width: 26,
        },
        { header: "Tempo Aguardando", valor: (r) => tempoAguardando(r.ultimaAcaoEm), tipo: "texto" },
      ],
      linhas: registros.filter((r) => r.classificacao === "requer_analise" && (filtroVinculo === "todos" || r.situacaoVinculo === filtroVinculo)),
      nomeArquivoBase: `pro-saude_fechamento_pagamento_requer_analise_${competencia}`,
    }),
    [registros, filtroVinculo, competencia, competenciaLabel, filtrosAplicados],
  );

  function irParaAba(c: ClassificacaoFechamento) {
    setTab(c);
    setFiltroVinculo("todos");
  }

  function salvarObservacao(r: RegistroFechamento) {
    const texto = obsRascunho[r.beneficiarioId] ?? getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ?? "";
    salvarObservacaoNurfi(r.beneficiarioId, competencia, texto, fechadoPorReferencia);
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fechamento de Pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Consolidação operacional da competência, conferência da GERDAB e geração do relatório
            para o NURFI — nasce dos dados do Módulo de Pagamento, não de uma nova apuração.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground mb-1">Competência</span>
            <select
              value={competencia}
              onChange={(e) => {
                setCompetencia(e.target.value);
                setMensagemRelatorio(null);
              }}
              className="border border-border rounded-md px-3 py-2 bg-card text-sm"
            >
              {competenciasParaFechamento.map((c) => (
                <option key={c} value={c}>
                  {formatCompetencia(c)}
                </option>
              ))}
            </select>
          </label>
          {/* RECURSO EXCLUSIVO DO PROTÓTIPO — ver comentário acima de `dataSimulada`. */}
          <label
            className="text-sm border border-dashed border-border rounded-md px-2.5 py-1.5 flex items-end gap-2"
            title="Recurso exclusivo do protótipo — simula 'hoje' para demonstrar o fechamento automático em datas diferentes da data real. Não existe em produção."
          >
            <span className="flex flex-col">
              <span className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CalendarClock className="h-3 w-3" /> Data simulada (protótipo)
              </span>
              <input
                type="date"
                value={dataSimulada.toISOString().slice(0, 10)}
                onChange={(e) => e.target.value && aplicarDataSimulada(e.target.value)}
                className="border border-border rounded-md px-2 py-1 bg-card text-xs"
              />
            </span>
            {estaSimulando && (
              <button
                type="button"
                onClick={limparDataSimulada}
                className="text-xs text-primary hover:underline pb-1.5"
              >
                Usar data real
              </button>
            )}
          </label>
        </div>
      </header>

      {/* Nota de escopo do protótipo — sem esconder a limitação de dados */}
      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
        O cenário de dados do Módulo de Pagamento hoje cobre 1 grupo familiar (1 servidor
        titular) — os números abaixo são pequenos porque são <strong>reais</strong>, nunca
        inflados para parecer um volume maior. Expandir a base de dados para múltiplos
        servidores é um passo já previsto no plano (etapa "Base de dados necessária"), separado
        desta etapa.
      </div>

      {/* Cabeçalho/resumo — cada número é clicável e leva à aba/lista correspondente (rastreabilidade) */}
      <section className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Total processado</p>
            <p className="text-2xl font-bold">{resumo.total}</p>
          </div>
          <button onClick={() => irParaAba("adimplente")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Adimplentes</p>
            <p className="text-2xl font-bold text-status-aprovado-fg">{resumo.adimplentes}</p>
          </button>
          <button onClick={() => irParaAba("inadimplente")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
            <p className="text-2xl font-bold text-status-rejeitado-fg">{resumo.inadimplentes}</p>
          </button>
          <button onClick={() => irParaAba("requer_analise")} className="text-left hover:opacity-80">
            <p className="text-xs text-muted-foreground">Requerem análise</p>
            <p className="text-2xl font-bold text-status-pendente-fg">{resumo.requerAnalise}</p>
          </button>
          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">Valor a pagar (Adimplentes)</p>
            <p className="text-2xl font-bold">{formatCurrency(resumo.valorTotalAdimplentes)}</p>
          </div>
        </div>

        {/* Fase 9 — fechamento automático (`getStatusFechamentoAutomatico`, `dias-uteis.ts`): sem
            botão manual, sem reabertura, sem override. O ciclo permanece vigente até o fim do 2º
            dia útil do mês seguinte; a partir do 3º dia útil, encerra sozinho. */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          {statusFechamento.fechada ? (
            <span className="inline-flex items-center gap-2 text-sm text-status-aprovado-fg font-medium">
              <Lock className="h-4 w-4" /> Competência encerrada automaticamente em{" "}
              {statusFechamento.fechamentoEm.toLocaleDateString("pt-BR")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Unlock className="h-4 w-4" /> Fechamento automático em{" "}
              {statusFechamento.fechamentoEm.toLocaleDateString("pt-BR")} (fim do 2º dia útil)
            </span>
          )}
          {resumo.requerAnalise > 0 && (
            <p className="text-xs text-muted-foreground">
              {resumo.requerAnalise} registro(s) ainda em "Requer análise" — o fechamento automático não os
              classifica; permanecem como estão (tratamento posterior é pendência já registrada, fora desta
              etapa).
            </p>
          )}
        </div>
        {statusFechamento.direcionamentoSeRecebidoAgora.direcionadoAoCicloSeguinte && (
          <p className="text-xs text-muted-foreground mt-2">
            Na data de referência atual, um novo registro desta competência já seria direcionado ao ciclo
            seguinte ({formatCompetencia(statusFechamento.direcionamentoSeRecebidoAgora.competenciaDestino)}) —
            indicador só informativo; o envio do servidor ainda não aplica esse direcionamento de fato
            (pendência sinalizada, não implementada nesta fase).
          </p>
        )}

        {/* Fase 10 — Histórico do Fechamento (relatório oficial para o NURFI). Só "Adimplente"/
            "Inadimplente" entram no snapshot; "Requer análise" nunca compõe o relatório oficial
            (fica disponível para um relatório posterior, quando resolvido) — ver
            `gerarRelatorioFechamento`. Habilitado só depois do encerramento automático; gerar não
            é uma forma de fechar/reabrir a competência, é só empacotar o que já está decidido. */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          {statusFechamento.fechada ? (
            registrosDisponiveis.length > 0 ? (
              <button
                onClick={handleGerarRelatorio}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light"
              >
                <FileOutput className="h-4 w-4" /> Gerar relatório para o NURFI ({registrosDisponiveis.length})
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum registro novo apto (Adimplente/Inadimplente) para um relatório desta competência — os já
                aptos foram todos incluídos em relatórios anteriores.
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              O relatório para o NURFI só pode ser gerado depois do encerramento automático da competência.
            </p>
          )}
          <Link
            to="/admin/relatorios/pagamentos/historico"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <FileClock className="h-4 w-4" /> Ver histórico de relatórios
          </Link>
        </div>
        {mensagemRelatorio && (
          <p className="text-xs text-status-aprovado-fg mt-2">{mensagemRelatorio}</p>
        )}
      </section>

      {/* Abas */}
      <div className="flex items-center justify-between gap-2 border-b border-border">
        <div className="flex gap-1">
          {(
            [
              ["adimplente", "Adimplentes", resumo.adimplentes],
              ["inadimplente", "Inadimplentes", resumo.inadimplentes],
              ["requer_analise", "Requer análise", resumo.requerAnalise],
            ] as [ClassificacaoFechamento, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => irParaAba(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        {tab === "adimplente" && <ExportarRelatorio spec={specAdimplentes} />}
        {tab === "inadimplente" && <ExportarRelatorio spec={specInadimplentes} />}
        {tab === "requer_analise" && <ExportarRelatorio spec={specRequerAnalise} />}
      </div>

      {/* Filtro Todos | Ativos | Inativos */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-muted-foreground">Vínculo:</span>
        {(["todos", "ativo", "inativo"] as FiltroVinculo[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltroVinculo(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filtroVinculo === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
          </button>
        ))}
      </div>

      {/* Tabelas por aba */}
      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        {tab === "adimplente" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Matrícula</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Situação do vínculo</th>
                <th className="text-left px-4 py-2">Operadora/Associação</th>
                <th className="text-left px-4 py-2">Competência</th>
                <th className="text-right px-4 py-2">Valor Total do Plano</th>
                <th className="text-right px-4 py-2">Valor a Ressarcir</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => (
                <tr key={r.beneficiarioId} className="border-t border-border">
                  <td className="px-4 py-2">{r.matricula ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2">
                    <BadgeVinculo situacao={r.situacaoVinculo} />
                  </td>
                  <td className="px-4 py-2">{r.operadoraOuAssociacao}</td>
                  <td className="px-4 py-2">{formatCompetencia(r.competencia)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.valorRessarcir)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setDetalheGrupo(r)}
                      title="Ver composição do grupo familiar"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ListTree className="h-3.5 w-3.5" /> Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum registro adimplente para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "inadimplente" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Matrícula</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-right px-4 py-2">Valor do Plano</th>
                <th className="text-left px-4 py-2">Situação</th>
                <th className="text-left px-4 py-2">Motivo</th>
                <th className="text-left px-4 py-2">Observação NURFI</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => (
                <tr key={r.beneficiarioId} className="border-t border-border align-top">
                  <td className="px-4 py-2">{r.matricula ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-rejeitado-bg text-status-rejeitado-fg">
                      {r.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-[220px]">{r.motivo}</td>
                  <td className="px-4 py-2 min-w-[220px]">
                    <textarea
                      rows={2}
                      placeholder="Complemento excepcional para o NURFI (opcional)"
                      value={
                        obsRascunho[r.beneficiarioId] ??
                        getObservacaoNurfi(r.beneficiarioId, competencia)?.texto ??
                        ""
                      }
                      onChange={(e) =>
                        setObsRascunho((prev) => ({ ...prev, [r.beneficiarioId]: e.target.value }))
                      }
                      onBlur={() => salvarObservacao(r)}
                      className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background"
                    />
                  </td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum registro inadimplente para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "requer_analise" && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Matrícula</th>
                <th className="text-left px-4 py-2">Servidor</th>
                <th className="text-left px-4 py-2">Competência</th>
                <th className="text-left px-4 py-2">Pendência/Motivo</th>
                <th className="text-left px-4 py-2">Tempo aguardando</th>
                <th className="px-4 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => (
                <tr key={r.beneficiarioId} className="border-t border-border">
                  <td className="px-4 py-2">{r.matricula ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2">{formatCompetencia(r.competencia)}</td>
                  <td className="px-4 py-2 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-status-pendente-fg" />
                    {r.statusComprovante ? statusComprovanteLabels[r.statusComprovante] : "—"}
                  </td>
                  <td className="px-4 py-2">{tempoAguardando(r.ultimaAcaoEm)}</td>
                  <td className="px-4 py-2">
                    <a
                      href="/admin/comprovantes"
                      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                    >
                      Resolver <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" /> Nenhum registro requerendo análise nesta competência.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Detalhes — drill-down da composição do grupo familiar (Titular/Cônjuge/Filho, valor
          individual) que forma o "Valor Total do Plano" da linha — reaproveita `composicaoGrupo`,
          já calculado por `getRegistrosFechamento`, nunca uma segunda apuração. Quando a origem é
          "associacao" (planilha aprovada), inclui também a rastreabilidade da origem (P7) —
          nunca coluna nova na tabela nem na exportação NURFI, só disponível aqui. */}
      {detalheGrupo && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
              <div>
                <h2 className="font-semibold">Composição do Grupo Familiar</h2>
                <p className="text-xs text-muted-foreground">
                  {detalheGrupo.nome} • {formatCompetencia(detalheGrupo.competencia)}
                </p>
              </div>
              <button onClick={() => setDetalheGrupo(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-4">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-1.5">Beneficiário</th>
                    <th className="text-left py-1.5">Parentesco</th>
                    <th className="text-right py-1.5">Valor Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detalheGrupo.composicaoGrupo.map((integrante, i) => (
                    <tr key={integrante.beneficiarioId ?? i}>
                      <td className="py-1.5">{integrante.nome}</td>
                      <td className="py-1.5">{integrante.parentesco}</td>
                      <td className="py-1.5 text-right">{formatCurrency(integrante.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total do Plano</span>
                  <span className="font-medium">{formatCurrency(detalheGrupo.valor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor a Ressarcir</span>
                  <span className="font-medium">{formatCurrency(detalheGrupo.valorRessarcir)}</span>
                </div>
              </div>

              {detalheGrupo.origemAssociacao && (
                <div className="border-t border-border pt-3 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Origem da Comprovação
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Associação</dt>
                      <dd className="font-medium">{detalheGrupo.origemAssociacao.associacao}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Planilha / envio de origem</dt>
                      <dd className="font-medium font-mono text-xs">{detalheGrupo.origemAssociacao.planilhaId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Status da análise da planilha</dt>
                      <dd className="mt-1">
                        <PlanilhaStatusBadge status={detalheGrupo.origemAssociacao.statusPlanilha as StatusPlanilhaAssociacao} />
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end sticky bottom-0 bg-card">
              <button
                onClick={() => setDetalheGrupo(null)}
                className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted"
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

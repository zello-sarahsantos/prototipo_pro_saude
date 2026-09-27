import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Building2, UserCog, Users } from "lucide-react";
import { formatCurrency, regrasProSaude } from "@/lib/mock-data";
import {
  getConsolidadoPorOperadora,
  getConsolidadoPorSituacaoTitular,
  getConsolidadoPorFaixaEtaria,
  getSituacaoTeto,
  type LinhaOperadora,
  type LinhaSituacaoTitular,
  type LinhaFaixaEtaria,
  type SituacaoTeto,
} from "@/lib/visoes-gerenciais";
import { ExportarRelatorio } from "@/components/ExportarRelatorio";
import type { RelatorioExportSpec } from "@/lib/relatorio-export";

export const Route = createFileRoute("/admin/relatorios/gerencial")({
  component: VisoesGerenciais,
});

function formatPercentual(v: number): string {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function VisoesGerenciais() {
  const porOperadora = getConsolidadoPorOperadora();
  const porSituacaoTitular = getConsolidadoPorSituacaoTitular();
  const porFaixaEtaria = getConsolidadoPorFaixaEtaria();
  const teto = getSituacaoTeto();
  const totalTitulares = porOperadora.reduce((soma, o) => soma + o.titulares, 0);

  // Fase 8 — único filtro hoje na tela (busca por nome/matrícula), aplicado só sobre a lista de
  // Servidores no Teto Familiar. Filtragem client-side sobre `teto.servidoresNoTeto`, sem tocar
  // `visoes-gerenciais.ts` — a tela decide o recorte, `getSituacaoTeto()` continua devolvendo a
  // fotografia completa, como as demais tabelas desta página.
  const [buscaTeto, setBuscaTeto] = useState("");
  const servidoresNoTetoFiltrados = useMemo(() => {
    const termo = buscaTeto.trim().toLowerCase();
    if (!termo) return teto.servidoresNoTeto;
    return teto.servidoresNoTeto.filter(
      (s) => s.nome.toLowerCase().includes(termo) || s.matricula.toLowerCase().includes(termo),
    );
  }, [teto.servidoresNoTeto, buscaTeto]);

  // Relatório-piloto de exportação (PDF/XLSX) — ver docs/MODULO_RELATORIOS.md, seção de
  // Exportação. Consome exatamente os mesmos dados já calculados acima para a tela
  // (`porOperadora`), sem nenhuma consulta/agregação nova. Sem filtros nesta tela hoje —
  // `filtrosAplicados: []` reflete isso; se filtros forem adicionados no futuro, a spec deve
  // listá-los aqui para a exportação continuar refletindo exatamente o que está na tela.
  const specOperadora: RelatorioExportSpec<LinhaOperadora> = useMemo(() => {
    const hoje = new Date();
    const periodoArquivo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return {
      titulo: "Consolidado por Operadora / Seguradora",
      origem: "Visões Gerenciais",
      filtrosAplicados: [],
      colunas: [
        { header: "Operadora / Seguradora", valor: (l) => l.operadora, tipo: "texto", width: 26 },
        { header: "Nº Titulares", valor: (l) => l.titulares, tipo: "numero", width: 14 },
        { header: "Nº Dependentes", valor: (l) => l.dependentes, tipo: "numero", width: 16 },
        { header: "Total de Beneficiários", valor: (l) => l.totalBeneficiarios, tipo: "numero", width: 18 },
        { header: "% da Base", valor: (l) => l.percentualDaBase, tipo: "percentual", width: 12 },
      ],
      linhas: porOperadora,
      linhaTotal: {
        label: "Total",
        valores: [
          porOperadora.reduce((soma, o) => soma + o.titulares, 0),
          porOperadora.reduce((soma, o) => soma + o.dependentes, 0),
          porOperadora.reduce((soma, o) => soma + o.totalBeneficiarios, 0),
          100,
        ],
      },
      nomeArquivoBase: `pro-saude_visao_operadoras_${periodoArquivo}`,
    };
  }, [porOperadora]);

  const specSituacaoTitular: RelatorioExportSpec<LinhaSituacaoTitular> = useMemo(() => {
    const hoje = new Date();
    const periodoArquivo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return {
      titulo: "Consolidado por Situação do Beneficiário Titular",
      origem: "Visões Gerenciais",
      filtrosAplicados: [],
      colunas: [
        { header: "Situação do Beneficiário Titular", valor: (l) => l.situacao, tipo: "texto", width: 32 },
        { header: "Nº Titulares", valor: (l) => l.titulares, tipo: "numero", width: 14 },
        { header: "% da Base", valor: (l) => l.percentualDaBase, tipo: "percentual", width: 12 },
      ],
      linhas: porSituacaoTitular,
      linhaTotal: {
        label: "Total",
        valores: [porSituacaoTitular.reduce((soma, s) => soma + s.titulares, 0), 100],
      },
      nomeArquivoBase: `pro-saude_visao_situacao_titular_${periodoArquivo}`,
    };
  }, [porSituacaoTitular]);

  const specFaixaEtaria: RelatorioExportSpec<LinhaFaixaEtaria> = useMemo(() => {
    const hoje = new Date();
    const periodoArquivo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return {
      titulo: "Consolidado por Faixa Etária",
      origem: "Visões Gerenciais",
      filtrosAplicados: [],
      colunas: [
        { header: "Faixa Etária", valor: (l) => l.faixa, tipo: "texto", width: 18 },
        { header: "Titulares", valor: (l) => l.titulares, tipo: "numero", width: 12 },
        { header: "% da Base", valor: (l) => l.percentualDaBase, tipo: "percentual", width: 12 },
      ],
      linhas: porFaixaEtaria,
      linhaTotal: {
        label: "Total",
        valores: [porFaixaEtaria.reduce((soma, f) => soma + f.titulares, 0), 100],
      },
      nomeArquivoBase: `pro-saude_visao_faixa_etaria_${periodoArquivo}`,
    };
  }, [porFaixaEtaria]);

  // Fase 8 — mesmos registros e mesma ordem exibidos na lista da tela (`servidoresNoTetoFiltrados`,
  // já com a busca aplicada); nenhum cálculo novo, `getSituacaoTeto()` segue sendo a única fonte.
  const specTeto: RelatorioExportSpec<SituacaoTeto["servidoresNoTeto"][number]> = useMemo(() => {
    const hoje = new Date();
    const periodoArquivo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return {
      titulo: "Servidores no Teto Familiar",
      origem: "Visões Gerenciais",
      filtrosAplicados: [
        `Teto familiar vigente: ${formatCurrency(regrasProSaude.tetoFamiliar)}`,
        ...(buscaTeto.trim() ? [`Busca: "${buscaTeto.trim()}"`] : []),
      ],
      colunas: [
        { header: "Nome", valor: (l) => l.nome, tipo: "texto", width: 30 },
        { header: "Matrícula", valor: (l) => l.matricula, tipo: "texto", width: 14 },
        { header: "Valor do Plano", valor: (l) => l.valorPlano, tipo: "moeda", width: 16 },
      ],
      linhas: servidoresNoTetoFiltrados,
      nomeArquivoBase: `pro-saude_servidores_teto_familiar_${periodoArquivo}`,
    };
  }, [servidoresNoTetoFiltrados, buscaTeto]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Visões Gerenciais</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da população do Pró-Saúde: operadora, situação do beneficiário
          titular, faixa etária e teto familiar.
        </p>
      </header>

      {/* Indicadores rápidos — complementares, não substituem as tabelas abaixo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-muted-foreground">Titulares</p>
          <p className="text-2xl font-bold">{totalTitulares}</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-muted-foreground">No teto ou acima</p>
          <p className="text-2xl font-bold">
            {teto.noTetoOuAcima}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatPercentual(teto.percentualNoTeto)})
            </span>
          </p>
        </div>
      </div>

      {/* Tabela consolidada por operadora — visão principal, não gráfico */}
      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Consolidado por operadora / seguradora
            </h2>
          </div>
          <ExportarRelatorio spec={specOperadora} />
        </div>
        <table className="w-full text-sm mt-3">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Operadora / Seguradora</th>
              <th className="text-right px-4 py-2">Nº titulares</th>
              <th className="text-right px-4 py-2">Nº dependentes</th>
              <th className="text-right px-4 py-2">Total beneficiários</th>
              <th className="text-right px-4 py-2">% da base</th>
            </tr>
          </thead>
          <tbody>
            {porOperadora.map((o) => (
              <tr key={o.operadora} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{o.operadora}</td>
                <td className="px-4 py-2 text-right">{o.titulares}</td>
                <td className="px-4 py-2 text-right">{o.dependentes}</td>
                <td className="px-4 py-2 text-right font-medium">{o.totalBeneficiarios}</td>
                <td className="px-4 py-2 text-right">{formatPercentual(o.percentualDaBase)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20 font-medium">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right">
                {porOperadora.reduce((soma, o) => soma + o.titulares, 0)}
              </td>
              <td className="px-4 py-2 text-right">
                {porOperadora.reduce((soma, o) => soma + o.dependentes, 0)}
              </td>
              <td className="px-4 py-2 text-right">
                {porOperadora.reduce((soma, o) => soma + o.totalBeneficiarios, 0)}
              </td>
              <td className="px-4 py-2 text-right">100,0%</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Tabela consolidada por Situação do Beneficiário Titular — as 5 categorias reais,
          nunca colapsadas num binário Ativos/Inativos */}
      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Consolidado por situação do beneficiário titular
            </h2>
          </div>
          <ExportarRelatorio spec={specSituacaoTitular} />
        </div>
        <table className="w-full text-sm mt-3">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Situação do beneficiário titular</th>
              <th className="text-right px-4 py-2">Nº titulares</th>
              <th className="text-right px-4 py-2">% da base</th>
            </tr>
          </thead>
          <tbody>
            {porSituacaoTitular.map((s) => (
              <tr key={s.situacao} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{s.situacao}</td>
                <td className="px-4 py-2 text-right">{s.titulares}</td>
                <td className="px-4 py-2 text-right">{formatPercentual(s.percentualDaBase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground px-4 py-3">
          Mesmo campo já coletado no requerimento de primeira inclusão ("Situação do beneficiário
          titular"). Distinto do status Pró-Saúde (Ativo/Inativo), exibido em Beneficiários/
          Contratos — pensionista não é tratado como sinônimo de aposentado/inativo.
        </p>
      </section>

      {/* Tabela consolidada por faixa etária — calculada a partir de dataNascimento real */}
      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Consolidado por faixa etária
            </h2>
          </div>
          <ExportarRelatorio spec={specFaixaEtaria} />
        </div>
        <table className="w-full text-sm mt-3">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Faixa etária</th>
              <th className="text-right px-4 py-2">Titulares</th>
              <th className="text-right px-4 py-2">Dependentes</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">% da base</th>
            </tr>
          </thead>
          <tbody>
            {porFaixaEtaria.map((f) => (
              <tr key={f.faixa} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{f.faixa}</td>
                <td className="px-4 py-2 text-right">{f.titulares}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                <td className="px-4 py-2 text-right font-medium">{f.titulares}</td>
                <td className="px-4 py-2 text-right">{formatPercentual(f.percentualDaBase)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20 font-medium">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right">
                {porFaixaEtaria.reduce((soma, f) => soma + f.titulares, 0)}
              </td>
              <td className="px-4 py-2 text-right text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right">
                {porFaixaEtaria.reduce((soma, f) => soma + f.titulares, 0)}
              </td>
              <td className="px-4 py-2 text-right">100,0%</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-xs text-muted-foreground px-4 py-3">
          Idade calculada a partir da data de nascimento cadastrada de cada titular, sem
          persistir idade. A coluna "Dependentes" ainda não é calculável por faixa — nesta base
          eles são só uma contagem por titular, sem data de nascimento individual registrada.
        </p>
      </section>

      {/* Teto familiar — indicador complementar, fotografia atual */}
      <section className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Servidores no teto familiar
            </h2>
          </div>
          <ExportarRelatorio spec={specTeto} />
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Teto familiar vigente: {formatCurrency(regrasProSaude.tetoFamiliar)} — posição atual do
          cadastro ({teto.noTetoOuAcima} de {teto.totalServidores},{" "}
          {formatPercentual(teto.percentualNoTeto)} da base).
        </p>
        {teto.servidoresNoTeto.length > 0 && (
          <>
            <input
              type="text"
              value={buscaTeto}
              onChange={(e) => setBuscaTeto(e.target.value)}
              placeholder="Buscar por nome ou matrícula"
              className="w-full max-w-xs mb-3 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
            {servidoresNoTetoFiltrados.length > 0 ? (
              <div className="space-y-2">
                {servidoresNoTetoFiltrados.map((s) => (
                  <div
                    key={s.matricula}
                    className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm"
                  >
                    <span>
                      {s.nome} <span className="text-muted-foreground">— matrícula {s.matricula}</span>
                    </span>
                    <span className="font-medium">{formatCurrency(s.valorPlano)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum servidor no teto encontrado para essa busca.</p>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Evolução de Servidores no Teto (série ao longo de competências) permanece como
          pendência — depende de um histórico mês a mês ainda não disponível.
        </p>
      </section>
    </div>
  );
}

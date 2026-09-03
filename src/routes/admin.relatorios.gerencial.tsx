import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, UserCog, Users } from "lucide-react";
import { formatCurrency, regrasProSaude } from "@/lib/mock-data";
import {
  getConsolidadoPorOperadora,
  getConsolidadoPorSituacaoTitular,
  getConsolidadoPorFaixaEtaria,
  getSituacaoTeto,
} from "@/lib/visoes-gerenciais";

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

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Visões Gerenciais</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da população do Pró-Saúde — operadora, situação do beneficiário
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
        <div className="flex items-center gap-2 px-4 pt-4">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consolidado por operadora / seguradora
          </h2>
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
        <div className="flex items-center gap-2 px-4 pt-4">
          <UserCog className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consolidado por situação do beneficiário titular
          </h2>
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
        <div className="flex items-center gap-2 px-4 pt-4">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consolidado por faixa etária
          </h2>
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
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Servidores no teto familiar
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Teto familiar vigente: {formatCurrency(regrasProSaude.tetoFamiliar)} — posição atual do
          cadastro ({teto.noTetoOuAcima} de {teto.totalServidores},{" "}
          {formatPercentual(teto.percentualNoTeto)} da base).
        </p>
        {teto.servidoresNoTeto.length > 0 && (
          <div className="space-y-2">
            {teto.servidoresNoTeto.map((s) => (
              <div
                key={s.matricula}
                className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm"
              >
                <span>{s.nome}</span>
                <span className="font-medium">{formatCurrency(s.valorPlano)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Evolução de Servidores no Teto (série ao longo de competências) permanece como
          pendência — depende de um histórico mês a mês ainda não disponível.
        </p>
      </section>
    </div>
  );
}

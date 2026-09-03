import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  FileClock,
  FolderCheck,
  Users2,
  PieChart,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { competenciasParaFechamento, formatCompetencia, getResumoFechamento } from "@/lib/fechamento-pagamento";

export const Route = createFileRoute("/admin/relatorios/")({
  component: VisaoGeralRelatorios,
});

// Sub-áreas do Módulo de Relatórios ainda não implementadas — listadas aqui só como indicação
// de arquitetura (ver plano, seção 2.1), sem telas vazias criadas por antecipação. Cada uma
// entra em rodada própria, na ordem descrita na seção 2.9 do plano.
//
// "Comprovante de Rendimentos" NÃO aparece aqui nem como card acima: é funcionalidade exclusiva
// do Portal do Servidor (`/servidor/comprovante-rendimentos`) nesta rodada — o Admin não possui
// (e não deve possuir) um atalho que redirecione para uma rota `/servidor/...` (ver
// docs/MODULO_RELATORIOS.md, "Separação de perfis").
const proximasAreas = [
  { icon: RefreshCcw, label: "Ressarcimentos / Retroativos", descricao: "Previsto na arquitetura — aprofundamento após levantamento específico." },
];

function VisaoGeralRelatorios() {
  const competenciaMaisRecente = competenciasParaFechamento[competenciasParaFechamento.length - 1];
  const resumo = getResumoFechamento(competenciaMaisRecente);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do Módulo de Relatórios — indicadores operacionais e acesso às sub-áreas.
        </p>
      </header>

      <Link
        to="/admin/relatorios/pagamentos"
        className="block bg-card rounded-xl border border-border shadow-card p-5 hover:border-primary transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Fechamento de Pagamento</p>
              <p className="text-sm text-muted-foreground">
                Competência de referência: {formatCompetencia(competenciaMaisRecente)}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Adimplentes</p>
            <p className="text-xl font-bold text-status-aprovado-fg">{resumo.adimplentes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
            <p className="text-xl font-bold text-status-rejeitado-fg">{resumo.inadimplentes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Requerem análise</p>
            <p className="text-xl font-bold text-status-pendente-fg">{resumo.requerAnalise}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor a pagar</p>
            <p className="text-xl font-bold">{formatCurrency(resumo.valorTotalAdimplentes)}</p>
          </div>
        </div>
      </Link>

      <Link
        to="/admin/relatorios/extrato"
        className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-primary transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileClock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Histórico de Comprovações</p>
            <p className="text-xs text-muted-foreground">
              Visão consolidada das comprovações apresentadas e analisadas por servidor, com
              acesso ao extrato individual.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </Link>

      <Link
        to="/admin/relatorios/documentacao"
        className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-primary transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FolderCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Documentação e Pendências</p>
            <p className="text-xs text-muted-foreground">
              IRPF, escolaridade e documentação periódica dos beneficiários/dependentes.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </Link>

      <Link
        to="/admin/servidores"
        search={{ origem: "relatorios" }}
        className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-primary transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Beneficiários / Contratos</p>
            <p className="text-xs text-muted-foreground">
              Visão cadastral/contratual, com filtro por status (substitui Ativos/Inativos
              separados).
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </Link>

      <Link
        to="/admin/relatorios/gerencial"
        className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-primary transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Visões Gerenciais</p>
            <p className="text-xs text-muted-foreground">
              Operadora, faixa etária e situação atual em relação ao teto familiar.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </Link>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Demais áreas do módulo</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proximasAreas.map(({ icon: Icon, label, descricao }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 opacity-70">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm">{label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{descricao}</p>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">Em construção</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

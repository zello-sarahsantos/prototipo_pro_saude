import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { dependentes, requerimentos, servidorAtual, formatCurrency, calcularReembolso } from "@/lib/mock-data";
import { ChevronRight, User, Info } from "lucide-react";

export const Route = createFileRoute("/servidor/inicio")({
  component: Inicio,
});

function Inicio() {
  // Fix #5 — RN03: competência X paga na folha X+1
  const competenciaAtual = "abril/2026";
  const folhaPagamento = "maio/2026";
  const [showModalImportado, setShowModalImportado] = useState(true);

  const isPensionista = servidorAtual.cargo.startsWith("Pensionista");
  const isPensionistaTemporario = servidorAtual.cargo === "Pensionista Temporário";

  return (
    <div className="p-4 space-y-5">
      {showModalImportado && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <header className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-primary">Atualização Cadastral Obrigatória</h2>
              <p className="text-xs text-muted-foreground mt-1">Identificamos que seu cadastro foi importado da base legada (GERDAB).</p>
            </header>
            <div className="p-6 space-y-4">
              <p className="text-sm">Para acessar o painel do Pró-Saúde, confirme seus dados de contato e declare ciência das regras do auxílio.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Confirme seu E-mail</label>
                  <input type="email" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" defaultValue={servidorAtual.email} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Confirme seu Telefone</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" defaultValue={servidorAtual.telefone} />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2 mt-4">
                <p className="font-bold">Termos de Responsabilidade</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" defaultChecked />
                  <span>Declaro que os dependentes importados permanecem elegíveis conforme as regras do Pró-Saúde.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" defaultChecked />
                  <span>Comprometo-me a enviar os documentos comprobatórios atualizados quando solicitado pelo sistema na Fase 2.</span>
                </label>
              </div>
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end">
              <button onClick={() => setShowModalImportado(false)} className="bg-primary text-primary-foreground font-medium text-sm px-6 py-2 rounded-md hover:bg-primary/90">
                Confirmar e Acessar
              </button>
            </footer>
          </div>
        </div>
      )}
      <section>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h2 className="text-xl font-semibold">{servidorAtual.nome}</h2>
        <p className="text-xs text-muted-foreground">Matrícula {servidorAtual.matricula}</p>
      </section>

      <section className="bg-card rounded-xl p-4 shadow-card border border-border">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Meu cadastro
          </span>
          <StatusBadge status="ativo" label="Ativo" />
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Plano" value={servidorAtual.plano} />
          <Row label="Associação" value={servidorAtual.associacao || "— (plano individual)"} />
          <Row label="Valor total do grupo" value={formatCurrency(servidorAtual.valorPlano)} />
          <Row label="Teto familiar" value={formatCurrency(servidorAtual.tetoFamiliar)} />
          <Row
            label="Reembolso previsto (90%)"
            value={formatCurrency(calcularReembolso(servidorAtual.valorPlano))}
          />
        </dl>

        {/* Fix #5 — RN03: competência de pagamento visível ao servidor */}
        <div className="mt-4 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
          <p>
            <strong className="text-foreground">Competência {competenciaAtual}</strong> — o reembolso
            referente a este mês será lançado na folha de pagamento de{" "}
            <strong className="text-foreground">{folhaPagamento}</strong>. O auxílio-saúde é
            indenizatório: você comprova o gasto no mês atual e recebe no mês seguinte.
          </p>
        </div>
      </section>

      {isPensionistaTemporario && (
        <section className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
          <p className="font-bold flex items-center gap-2"><Info className="h-4 w-4" /> Benefício Temporário</p>
          <p className="mt-1 text-xs">
            O benefício de pensão temporária será desativado automaticamente pelo sistema quando o titular completar 21 anos.
          </p>
        </section>
      )}

      {isPensionista ? (
        <section className="bg-muted/40 border border-border rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Dependentes</p>
          <p className="text-xs text-muted-foreground">
            A gestão de grupo familiar não está disponível para o perfil de {servidorAtual.cargo}.
          </p>
        </section>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Meus Dependentes
            </h3>
            <Link to="/servidor/dependentes" className="text-sm text-primary font-medium">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {dependentes.slice(0, 2).map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.parentesco} • {d.idade} anos</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Requerimentos recentes
          </h3>
        </div>
        <div className="space-y-2">
          {requerimentos.slice(0, 3).map((r) => (
            <div key={r.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.tipo}</p>
                <p className="text-xs text-muted-foreground">{r.abertoEm}</p>
              </div>
              <StatusBadge status={r.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

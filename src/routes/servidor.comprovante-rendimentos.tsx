import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import {
  formatCompetencia,
  getAnosDisponiveis,
  getComprovanteRendimentos,
} from "@/lib/fechamento-pagamento";
import { getBeneficiariosPagamentoAtual } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/servidor/comprovante-rendimentos")({
  component: ComprovanteDeRendimentos,
});

// Mesma convenção das demais telas do Portal do Servidor: sem autenticação real, "o servidor
// logado" é sempre o titular do cenário de referência do Módulo de Pagamento.
function ComprovanteDeRendimentos() {
  const titular = getBeneficiariosPagamentoAtual().find((b) => b.parentesco === "Titular");
  const anos = useMemo(() => (titular ? getAnosDisponiveis(titular.id) : []), [titular?.id]);
  const [ano, setAno] = useState(anos[anos.length - 1] ?? "");
  const comprovante = titular ? getComprovanteRendimentos(titular.id, ano) : undefined;

  if (!titular || !comprovante) return null;

  return (
    <div className="p-4 space-y-6">
      <Link to="/servidor/pagamentos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para Pagamentos
      </Link>

      <header>
        <h1 className="text-xl font-bold">Comprovante de Rendimentos</h1>
        <p className="text-sm text-muted-foreground">
          Consulte os valores de reembolso efetivamente recebidos pelo Pró-Saúde em cada ano.
        </p>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="font-medium">{comprovante.nome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Matrícula / CPF</p>
            <p className="font-medium">
              {comprovante.matricula ?? "—"} / {comprovante.cpf ?? "—"}
            </p>
          </div>
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground mb-1">Ano-calendário</span>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total pago em {comprovante.ano}</p>
            <p className="text-xl font-bold">{formatCurrency(comprovante.totalAnual)}</p>
          </div>
        </div>
      </div>

      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Mês/Competência</th>
              <th className="text-right px-4 py-2">Valor pago</th>
            </tr>
          </thead>
          <tbody>
            {comprovante.linhas.map((l) => (
              <tr key={l.competencia} className="border-t border-border">
                <td className="px-4 py-2">{formatCompetencia(l.competencia)}</td>
                <td className="px-4 py-2 text-right">
                  {l.valorPago > 0 ? formatCurrency(l.valorPago) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

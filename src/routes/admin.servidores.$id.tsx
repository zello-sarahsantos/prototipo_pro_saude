import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { servidorAtual, dependentes, requerimentos, formatCurrency, calcularReembolso } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { PendencyBanner } from "@/components/PendencyBanner";
import { ArrowLeft, X } from "lucide-react";

export const Route = createFileRoute("/admin/servidores/$id")({
  component: DetalheServidor,
});

const tabs = ["Dados", "Dependentes", "Requerimentos", "Cálculo do Reembolso", "Histórico"] as const;

function DetalheServidor() {
  const { id } = Route.useParams();
  const [inativarTitularOpen, setInativarTitularOpen] = useState(false);
  const [tab, setTab] = useState<typeof tabs[number]>("Dados");

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/admin/servidores" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{servidorAtual.nome}</h1>
          <p className="text-sm text-muted-foreground">Matrícula {id} • {servidorAtual.plano}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setInativarTitularOpen(true)} className="text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5 font-medium">
            Alterar para Inativo
          </button>
          <StatusBadge status="ativo" />
        </div>
      </header>

      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dados" && <TabDados />}
      {tab === "Dependentes" && <TabDependentes />}
      {tab === "Requerimentos" && <TabRequerimentos />}
      {tab === "Cálculo do Reembolso" && <TabCalculo />}
      {tab === "Histórico" && <TabHistorico />}

      {inativarTitularOpen && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-destructive">Alterar Status para Inativo</h2>
              <button onClick={() => setInativarTitularOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-4 text-sm">
              <p>
                Você está alterando o status de <strong>{servidorAtual.nome}</strong> para Inativo. 
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Motivo da inativação *</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option>Aposentadoria</option>
                  <option>Exoneração</option>
                  <option>Óbito</option>
                  <option>Decisão Administrativa</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Data de vigência</label>
                <input type="date" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" />
              </div>
              <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                <label className="flex items-start gap-2 cursor-pointer font-medium">
                  <input type="checkbox" className="mt-0.5" defaultChecked />
                  <span>Solicitar Documentação Complementar</span>
                </label>
                <p className="text-xs text-muted-foreground pl-5">
                  Uma notificação será enviada ao beneficiário para anexar documento comprobatório (ex: Diário Oficial de Aposentadoria).
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Observação para Histórico</label>
                <textarea rows={2} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" placeholder="Ex: Publicado no DODF..." />
              </div>
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setInativarTitularOpen(false)} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={() => setInativarTitularOpen(false)}
                className="text-sm bg-destructive text-destructive-foreground rounded-md px-4 py-2"
              >
                Confirmar e Inativar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// Fix #6 — Editar abre modal com campos editáveis
function TabDados() {
  const [editOpen, setEditOpen] = useState(false);
  const fields: [string, string, string][] = [
    ["Nome completo", "nome", servidorAtual.nome],
    ["Matrícula", "matricula", servidorAtual.matricula],
    ["CPF", "cpf", servidorAtual.cpf],
    ["Data de nascimento", "dataNascimento", servidorAtual.dataNascimento],
    ["E-mail institucional", "email", servidorAtual.email],
    ["Telefone", "telefone", servidorAtual.telefone],
    ["RG", "rg", servidorAtual.rg],
    ["Endereço", "endereco", servidorAtual.endereco],
    ["Plano", "plano", servidorAtual.plano],
    ["Tipo de plano", "tipoPlano", servidorAtual.tipoPlano],
    ["Operadora", "operadora", servidorAtual.operadora],
    ["Associação", "associacao", servidorAtual.associacao || "—"],
    ["Processo SEI", "processoSEI", servidorAtual.processoSEI],
    ["Início do benefício", "inicioBeneficio", servidorAtual.inicioBeneficio],
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm border border-border rounded-md px-3 py-1.5 hover:bg-muted"
        >
          Editar
        </button>
      </div>
      <dl className="bg-card rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {fields.map(([k, , v]) => (
          <div key={k} className="px-4 py-3 border-b border-border">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>

      {editOpen && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
              <div>
                <h2 className="font-semibold">Editar dados do servidor</h2>
                <p className="text-xs text-muted-foreground">{servidorAtual.nome} — mat. {servidorAtual.matricula}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-3">
              {fields.filter(([k]) => !["Matrícula", "CPF"].includes(k)).map(([k, , v]) => (
                <div key={k}>
                  <label className="block text-xs text-muted-foreground mb-1">{k}</label>
                  <input
                    defaultValue={v === "—" ? "" : v}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Justificativa da alteração *</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o motivo da alteração dos dados..."
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <button onClick={() => setEditOpen(false)} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={() => setEditOpen(false)}
                className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2"
              >
                Salvar alterações
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// Fix #6 — Inativar manualmente abre modal de confirmação
function TabDependentes() {
  const [inativarId, setInativarId] = useState<string | null>(null);
  const dep = dependentes.find((d) => d.id === inativarId);

  return (
    <div className="space-y-3">
      {dependentes.map((d) => (
        <div key={d.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold">{d.nome}</p>
            <p className="text-xs text-muted-foreground">
              {d.parentesco} • {d.idade} anos • CPF {d.cpf}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Valor: {formatCurrency(d.valor)}</p>
            {d.alerta && (
              <p className="text-xs text-warning mt-1">⚠ {d.alerta}</p>
            )}
          </div>
          <StatusBadge status={d.status} />
          {d.status !== "inativo" && (
            <button
              onClick={() => setInativarId(d.id)}
              className="text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5"
            >
              Inativar manualmente
            </button>
          )}
        </div>
      ))}

      {dep && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-sm w-full">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-destructive">Inativar dependente</h2>
              <button onClick={() => setInativarId(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-4 text-sm">
              <p>
                Você está prestes a inativar <strong>{dep.nome}</strong> ({dep.parentesco}).
                Esta ação encerrará o vínculo com o auxílio-saúde do titular.
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Motivo da inativação *</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option>Atingiu limite de idade</option>
                  <option>Deixou de ser dependente</option>
                  <option>Solicitação do titular</option>
                  <option>Óbito</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Data de vigência</label>
                <input type="date" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Observação</label>
                <textarea rows={2} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" />
              </div>
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setInativarId(null)} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={() => setInativarId(null)}
                className="text-sm bg-destructive text-destructive-foreground rounded-md px-4 py-2"
              >
                Confirmar Inativação
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function TabRequerimentos() {
  return (
    <ul className="divide-y divide-border bg-card rounded-xl border border-border">
      {requerimentos.map((r) => (
        <li key={r.id} className="px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium">{r.numero} • {r.tipo}</p>
            <p className="text-xs text-muted-foreground">{r.detalhe} • {r.abertoEm}</p>
          </div>
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

function TabCalculo() {
  const totalDeps = dependentes.filter(d => d.status === "ativo").reduce((s, d) => s + d.valor, 0);
  const valorTitular = Math.max(0, servidorAtual.valorPlano - totalDeps);
  const total = servidorAtual.valorPlano;
  const teto = servidorAtual.tetoFamiliar;
  const final = calcularReembolso(total, teto);
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Validar com GERDAB se o servidor pode visualizar este detalhamento.
        </p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 font-mono text-sm space-y-2">
        <Line k="Titular" v={valorTitular} />
        {dependentes.filter(d => d.status === "ativo").map(d => (
          <Line key={d.id} k={`${d.parentesco}`} v={d.valor} />
        ))}
        <hr className="my-2 border-border" />
        <Line k="Total do plano" v={total} bold />
        <Line k="Base limitada ao teto" v={Math.min(total, teto)} />
        <Line k="Percentual aplicado" v={0.9} percent />
        <Line k="Teto configurado" v={teto} />
        <hr className="my-2 border-border" />
        <div className="flex justify-between text-base font-bold text-success">
          <span>REEMBOLSO</span>
          <span>{formatCurrency(final)}</span>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          {total <= teto ? "✓ Abaixo do teto familiar." : "⚠ Acima do teto: base limitada antes do cálculo."}
        </p>
      </div>
    </div>
  );
}

function TabHistorico() {
  const logs = [
    { data: "05/06/2026", responsavel: "Analista João (GERDAB)", de: "Aguardando Validação", para: "Ativo", obs: "Documentação deferida." },
    { data: "01/05/2026", responsavel: "Sistema", de: "Em Análise", para: "Aguardando Validação", obs: "Solicitação inicial concluída pelo servidor." },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">De</th>
              <th className="px-4 py-3">Para</th>
              <th className="px-4 py-3">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{l.data}</td>
                <td className="px-4 py-3 font-medium">{l.responsavel}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-muted text-xs">{l.de}</span></td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium text-xs">{l.para}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{l.obs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Line({ k, v, bold, percent }: { k: string; v: number; bold?: boolean; percent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{k}</span>
      <span>{percent ? `${Math.round(v * 100)}%` : formatCurrency(v)}</span>
    </div>
  );
}

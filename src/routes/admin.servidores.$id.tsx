import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { servidorAtual, dependentes, requerimentos, formatCurrency, calcularReembolso } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { PendencyBanner } from "@/components/PendencyBanner";
import { getAdminRole } from "@/components/AdminLayout";
import {
  loadObservacoesGerdab,
  addObservacaoGerdab,
  removeObservacaoGerdab,
  type ObservacaoGerdab,
  type ObservacaoDestino,
  type ObservacaoTipo,
} from "@/lib/prosaude-storage";
import { ArrowLeft, X, FileText, FileWarning, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/servidores/$id")({
  component: DetalheServidor,
});

const tabs = ["Dados", "Dependentes", "Requerimentos", "Cálculo do Reembolso", "Histórico", "Observações"] as const;

/** Pendências derivadas dos dependentes (mesmo dado já usado em TabDependentes) — usadas para
 *  compor a linha do tempo do Histórico e a contagem exibida ao lado da aba. */
function pendenciasDependentes() {
  return dependentes.filter((d) => d.alerta);
}

function TabCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center h-[17px] min-w-[17px] px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
      {n}
    </span>
  );
}

function DetalheServidor() {
  const { id } = Route.useParams();
  const [inativarTitularOpen, setInativarTitularOpen] = useState(false);
  const [tab, setTab] = useState<typeof tabs[number]>("Dados");
  const [observacoesVersion, setObservacoesVersion] = useState(0);

  const observacoesDoServidor = useMemo(
    () => loadObservacoesGerdab().filter((o) => o.servidorMatricula === servidorAtual.matricula),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [observacoesVersion],
  );
  const historicoCount = 2 + requerimentos.filter((r) => r.matricula === servidorAtual.matricula).length + pendenciasDependentes().length;

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
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "Histórico" && <TabCount n={historicoCount} />}
            {t === "Observações" && <TabCount n={observacoesDoServidor.length} />}
          </button>
        ))}
      </div>

      {tab === "Dados" && <TabDados />}
      {tab === "Dependentes" && <TabDependentes />}
      {tab === "Requerimentos" && <TabRequerimentos />}
      {tab === "Cálculo do Reembolso" && <TabCalculo />}
      {tab === "Histórico" && <TabHistorico />}
      {tab === "Observações" && (
        <TabObservacoes
          observacoes={observacoesDoServidor}
          onChange={() => setObservacoesVersion((v) => v + 1)}
        />
      )}

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

/** Evento de histórico, unificado a partir de fontes diferentes — nunca persistido como campo
 *  novo, sempre recalculado a partir do que já existe (mesmo padrão de `getNotificacoesAssociacao`
 *  e dos badges de pendência da Área da Associação): as 2 transições de status abaixo (dado fixo
 *  de exemplo, pois o protótipo não modela um log de auditoria de verdade), mais os
 *  requerimentos e as pendências de dependentes do próprio servidor. A mudança de status vem
 *  embutida na própria frase (ex: "de X para Y"), sem chip separado — visual mais simples,
 *  pedido pelo usuário depois de ver a primeira versão (com chip vermelho/verde) como confusa. */
type EventoHistorico = {
  data: string;
  responsavel: string;
  descricao: string;
};

function useEventosHistorico(): EventoHistorico[] {
  const transicoes: EventoHistorico[] = [
    { data: "05/06/2026", responsavel: "Analista João", descricao: 'Alterou o status do cadastro de "Aguardando Validação" para "Ativo".' },
    { data: "01/05/2026", responsavel: "Sistema", descricao: 'Solicitação inicial concluída pelo servidor — status avançou de "Em Análise" para "Aguardando Validação".' },
  ];

  const deRequerimentos: EventoHistorico[] = requerimentos
    .filter((r) => r.matricula === servidorAtual.matricula)
    .map((r) => ({
      data: r.abertoEm,
      responsavel: servidorAtual.nome,
      descricao: `Abriu o requerimento ${r.numero} — ${r.tipo}.`,
    }));

  const dePendencias: EventoHistorico[] = pendenciasDependentes().map((d) => ({
    data: "—",
    responsavel: "Sistema",
    descricao: `Pendência documental identificada para ${d.nome} (${d.parentesco}): ${d.alerta}`,
  }));

  return [...transicoes, ...deRequerimentos, ...dePendencias];
}

function TabHistorico() {
  const eventos = useEventosHistorico();

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Histórico
          </h3>
          <span className="text-xs text-muted-foreground">
            Total <b className="text-foreground text-sm">{eventos.length}</b> registros — somente leitura
          </span>
        </div>

        <ol className="space-y-0">
          {eventos.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex flex-col items-center pt-1">
                <span className="h-2 w-2 rounded-full border-2 border-primary bg-card shrink-0" />
                {i < eventos.length - 1 && (
                  <span className="w-px flex-1 mt-1 border-l border-dashed border-border" />
                )}
              </span>
              <div className="pb-4 min-w-0">
                <p className="text-xs">
                  <span className="font-semibold">{e.data}</span>
                  <span className="text-muted-foreground"> · Realizado por </span>
                  <span className="font-semibold">{e.responsavel}</span>
                </p>
                <p className="text-sm mt-0.5 text-foreground">{e.descricao}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-2.5 bg-info/10 text-info rounded-md px-3.5 py-3 text-xs leading-relaxed">
        <span className="font-bold shrink-0">Histórico é só leitura:</span>
        <span>
          cada evento é gerado automaticamente pelo próprio sistema (mudança de status, abertura
          de requerimento, pendência identificada) — nenhum item pode ser editado ou apagado,
          diferente da aba Observações ao lado.
        </span>
      </div>
    </div>
  );
}

const DESTINOS: { value: ObservacaoDestino; label: (nome: string, assoc: string) => string }[] = [
  { value: "servidor", label: (nome) => `Para o servidor (${nome})` },
  { value: "associacao", label: (_nome, assoc) => `Para a associação (${assoc})` },
];

const TIPOS: { value: ObservacaoTipo; label: string; hint: string }[] = [
  { value: "observacao", label: "Observação", hint: "Anotação livre, só para registro." },
  { value: "solicitacao_documento", label: "Solicitar documento", hint: "Pede um documento complementar." },
];

function TabObservacoes({
  observacoes,
  onChange,
}: {
  observacoes: ObservacaoGerdab[];
  onChange: () => void;
}) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [tipo, setTipo] = useState<ObservacaoTipo>("observacao");
  const [destino, setDestino] = useState<ObservacaoDestino>("servidor");
  const [documento, setDocumento] = useState("");
  const [texto, setTexto] = useState("");

  const associacao = servidorAtual.associacao !== "—" ? servidorAtual.associacao : "sem associação vinculada";
  const podeDirecionarAssociacao = servidorAtual.associacao !== "—";

  const role = getAdminRole();
  const autor = role === "gerencia" ? "Erandir" : "Rebeca";
  const cargo = role === "gerencia" ? "Gerência GERDAB" : "Analista GERDAB";

  const ordenadas = [...observacoes].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const podeSalvar = tipo === "solicitacao_documento" ? documento.trim().length > 0 : texto.trim().length > 0;

  function salvar() {
    if (!podeSalvar) return;
    addObservacaoGerdab({
      id: `obs-${Date.now()}`,
      servidorMatricula: servidorAtual.matricula,
      destino,
      associacao: servidorAtual.associacao !== "—" ? servidorAtual.associacao : undefined,
      tipo,
      documento: tipo === "solicitacao_documento" ? documento.trim() : undefined,
      autor,
      cargo,
      texto: texto.trim(),
      criadoEm: new Date().toISOString(),
    });
    setTexto("");
    setDocumento("");
    setTipo("observacao");
    setComposeOpen(false);
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Observações</h3>
        <span className="text-xs text-muted-foreground">
          Total <b className="text-foreground text-sm">{ordenadas.length}</b>
        </span>
      </div>

      {ordenadas.length === 0 && !composeOpen && (
        <p className="text-sm text-muted-foreground bg-card rounded-xl border border-border p-5 text-center">
          Nenhuma observação registrada para este servidor ainda.
        </p>
      )}

      <div className="space-y-3">
        {ordenadas.map((o) => (
          <div
            key={o.id}
            className={`border rounded-md p-4 flex items-start justify-between gap-3 ${
              o.tipo === "solicitacao_documento" ? "bg-warning/5 border-warning/30" : "bg-accent/40 border-border"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1.5">
                {new Date(o.criadoEm).toLocaleDateString("pt-BR")} · Registrado por{" "}
                <b className="text-foreground font-semibold">{o.autor}</b>
                <span className="text-[9px]"> ({o.cargo})</span>
                <span
                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    o.destino === "associacao" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                  }`}
                >
                  {o.destino === "associacao" ? "Para a associação" : "Para o servidor"}
                </span>
              </p>
              {o.tipo === "solicitacao_documento" ? (
                <>
                  <p className="text-sm font-semibold flex items-center gap-1.5 text-warning">
                    <FileWarning className="h-3.5 w-3.5" /> Documento solicitado: {o.documento}
                  </p>
                  {o.texto && <p className="text-sm mt-1">{o.texto}</p>}
                </>
              ) : (
                <p className="text-sm">{o.texto}</p>
              )}
            </div>
            <button
              onClick={() => { removeObservacaoGerdab(o.id); onChange(); }}
              className="text-destructive/70 hover:text-destructive shrink-0"
              aria-label="Excluir observação"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {!composeOpen ? (
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-primary-light text-primary bg-primary/5 rounded-md py-3 text-sm font-medium hover:bg-primary/10"
        >
          <FileText className="h-4 w-4" /> Nova observação
        </button>
      ) : (
        <div className="border border-primary-light rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Nova observação</p>

          <div className="flex flex-col sm:flex-row gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`flex-1 text-left px-3 py-2 rounded-md border transition ${
                  tipo === t.value
                    ? "border-warning bg-warning/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className={`text-sm font-medium block ${tipo === t.value ? "text-warning" : "text-foreground"}`}>
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {DESTINOS.filter((d) => d.value !== "associacao" || podeDirecionarAssociacao).map((d) => (
              <button
                key={d.value}
                onClick={() => setDestino(d.value)}
                className={`flex-1 text-left px-3 py-2 rounded-md border text-sm font-medium transition ${
                  destino === d.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {d.label(servidorAtual.nome, associacao)}
              </button>
            ))}
          </div>

          {tipo === "solicitacao_documento" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Documento solicitado *</label>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ex: Declaração de Imposto de Renda do dependente"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder={
              tipo === "solicitacao_documento"
                ? "Detalhe opcional sobre o pedido (ex: motivo, prazo)."
                : "Escreva a observação — ela ficará registrada com seu nome, cargo e data/hora automaticamente."
            }
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setComposeOpen(false); setTexto(""); setDocumento(""); setTipo("observacao"); }}
              className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!podeSalvar}
              className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2 disabled:opacity-50"
            >
              {tipo === "solicitacao_documento" ? "Solicitar documento" : "Salvar observação"}
            </button>
          </div>
        </div>
      )}
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

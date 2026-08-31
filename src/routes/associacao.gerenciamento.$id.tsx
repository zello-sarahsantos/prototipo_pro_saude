import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { servidorAtual, dependentes, formatCurrency, type StatusKey } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { SolicitacaoDocumentoBanner } from "@/components/SolicitacaoDocumentoBanner";
import { getPendenciasDocumentaisDoServidor, type PendenciaDocumental } from "@/lib/pendencias-documentais";
import { ArrowLeft, FilePlus, UserMinus, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/associacao/gerenciamento/$id")({
  component: DetalheBeneficiarioAssetran,
});

const tabs = ["Dados", "Dependentes", "Requerimentos"] as const;

/** Ajuste pontual: os 3 requerimentos recorrentes ficam visíveis lado a lado, sem precisar de
 *  um clique extra para revelar as opções (modal removido — dificultava a visualização). */
const requerimentosRecorrentes = [
  { to: "/servidor/requerimento/novo-plano" as const, icon: FilePlus, label: "Requerimento de Mudança de Plano" },
  { to: "/servidor/requerimento/incluir-dependente" as const, icon: UserPlus, label: "Requerimento de Inclusão de Dependente" },
  { to: "/servidor/requerimento/exclusao" as const, icon: UserMinus, label: "Requerimento de Exclusão de Dependente / Plano" },
];

/** Requerimentos deste beneficiário perante a GERDAB — ilustrativo (mock fixo, não filtrado
 *  pelo `$id` da rota, mesma simplificação já assumida por `servidorAtual`/`dependentes`
 *  nesta tela). Elevado para o escopo do módulo para alimentar tanto a aba "Requerimentos"
 *  quanto o indicativo de pendência nas abas "Dados"/"Requerimentos". */
interface RequerimentoBeneficiario {
  id: string;
  numero: string;
  tipo: string;
  detalhe: string;
  abertoEm: string;
  status: StatusKey;
}

const requerimentosDoBeneficiario: RequerimentoBeneficiario[] = [
  { id: "r1", numero: "REQ-2026-0047", tipo: "Inclusão de Dependente", detalhe: "Enteado(a), 23 anos — exige IRPF", abertoEm: "02/05/2026", status: "pendente" },
  { id: "r3", numero: "REQ-2026-0045", tipo: "Exclusão", detalhe: "Exclusão de dependente", abertoEm: "01/05/2026", status: "aprovado" },
];

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
      {count}
    </span>
  );
}

function DetalheBeneficiarioAssetran() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<typeof tabs[number]>("Dados");
  const [solicitacoesVersion, setSolicitacoesVersion] = useState(0);

  // Indicativos de pendência por aba — mesma regra usada no badge do sino de notificações:
  // requerimentos ainda não decididos pela GERDAB e dependentes com alerta documental.
  const requerimentosPendentes = requerimentosDoBeneficiario.filter(
    (r) => r.status === "pendente" || r.status === "analise",
  ).length;
  const dependentesComAlerta = dependentes.filter((d) => d.alerta).length;

  // Pendências documentais direcionadas "para a associação" sobre este beneficiário —
  // unifica pendências automáticas do sistema (dependentes com prazo/consequência mapeados) e
  // solicitações manuais da GERDAB sem prazo definido.
  const pendenciasDocumento = useMemo(
    () => getPendenciasDocumentaisDoServidor(servidorAtual.matricula, "associacao"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solicitacoesVersion],
  );

  const badgePorAba: Record<(typeof tabs)[number], number> = {
    Dados: (requerimentosPendentes > 0 ? 1 : 0) + pendenciasDocumento.length,
    Dependentes: dependentesComAlerta,
    Requerimentos: requerimentosPendentes,
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/associacao/gerenciamento" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{servidorAtual.nome}</h1>
          <p className="text-sm text-muted-foreground">Matrícula {id} • {servidorAtual.plano} • ASSETRAN</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="ativo" />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {requerimentosRecorrentes.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-card hover:bg-primary-light transition"
          >
            <r.icon className="h-4 w-4 shrink-0" />
            {r.label}
          </Link>
        ))}
      </div>

      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            <TabBadge count={badgePorAba[t]} />
          </button>
        ))}
      </div>

      {tab === "Dados" && (
        <TabDados
          pendenciasDocumento={pendenciasDocumento}
          onDocumentoEnviado={() => setSolicitacoesVersion((v) => v + 1)}
        />
      )}
      {tab === "Dependentes" && <TabDependentes />}
      {tab === "Requerimentos" && <TabRequerimentos />}
    </div>
  );
}

function TabDados({
  pendenciasDocumento,
  onDocumentoEnviado,
}: {
  pendenciasDocumento: PendenciaDocumental[];
  onDocumentoEnviado: () => void;
}) {
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
    ["Associação", "associacao", "ASSETRAN"],
    ["Processo SEI", "processoSEI", servidorAtual.processoSEI],
    ["Início do benefício", "inicioBeneficio", servidorAtual.inicioBeneficio],
  ];

  return (
    <div className="space-y-4">
      {pendenciasDocumento.map((p) => (
        <SolicitacaoDocumentoBanner key={p.id} pendencia={p} onEnviado={onDocumentoEnviado} />
      ))}

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
                <h2 className="font-semibold">Editar dados do beneficiário</h2>
                <p className="text-xs text-muted-foreground">{servidorAtual.nome} — mat. {servidorAtual.matricula}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-3">
              {fields.filter(([k]) => !["Matrícula", "CPF", "Associação"].includes(k)).map(([k, , v]) => (
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

function TabDependentes() {
  const [inativarId, setInativarId] = useState<string | null>(null);
  const dep = dependentes.find((d) => d.id === inativarId);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          to="/servidor/requerimento/incluir-dependente"
          className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium"
        >
          <UserPlus className="h-4 w-4 inline mr-1" /> Incluir Dependente
        </Link>
      </div>
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
            <Link
              to="/servidor/requerimento/exclusao"
              className="text-sm border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5"
            >
              Solicitar Exclusão
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

function TabRequerimentos() {
  return (
    <ul className="divide-y divide-border bg-card rounded-xl border border-border">
      {requerimentosDoBeneficiario.map((r) => (
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

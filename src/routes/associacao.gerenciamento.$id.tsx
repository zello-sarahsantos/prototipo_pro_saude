import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { servidorAtual, servidoresList, dependentes, formatCurrency } from "@/lib/mock-data";
import { servidorParaFormularioRequerimento, dependentesDoBeneficiario } from "@/lib/associacao-beneficiario";
import { StatusBadge } from "@/components/StatusBadge";
import { RequerimentoAssociacaoStatusBadge } from "@/components/RequerimentoAssociacaoStatusBadge";
import { SolicitacaoDocumentoBanner, StatusDocumentoEnviadoCard } from "@/components/SolicitacaoDocumentoBanner";
import {
  getPendenciasDocumentaisDoServidor,
  getStatusDocumentosDoServidor,
  type PendenciaDocumental,
  type DocumentoPendenteView,
} from "@/lib/pendencias-documentais";
import {
  listarRequerimentosAssociacao,
  statusAtualRequerimento,
  tipoRequerimentoAssociacaoLabels,
  versaoVigenteRequerimento,
} from "@/lib/requerimentos-associacao";
import { ArrowLeft, FilePlus, UserMinus, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/associacao/gerenciamento/$id")({
  component: DetalheBeneficiarioAssetran,
});

const tabs = ["Dados", "Dependentes", "Requerimentos"] as const;

/** Ajuste pontual: os 3 requerimentos recorrentes ficam visíveis lado a lado, sem precisar de
 *  um clique extra para revelar as opções (modal removido — dificultava a visualização).
 *
 * Correção desta rodada: os `to` apontavam para `/servidor/requerimento/*` (Portal do Servidor)
 * — o atendente da Associação era visualmente redirecionado para fora do seu próprio contexto.
 * Agora apontam para as rotas equivalentes dentro de `/associacao`, levando o `id` do
 * beneficiário como parâmetro de busca — mesmo componente/formulário funcional reaproveitado
 * (`NovoPlano`, `IncluirDependenteForm`, `Exclusao`), só o wrapper/layout muda. */
const requerimentosRecorrentes = [
  { to: "/associacao/requerimento/novo-plano" as const, icon: FilePlus, label: "Requerimento de Mudança de Plano" },
  { to: "/associacao/requerimento/incluir-dependente" as const, icon: UserPlus, label: "Requerimento de Inclusão de Dependente" },
  { to: "/associacao/requerimento/exclusao" as const, icon: UserMinus, label: "Requerimento de Exclusão de Dependente / Plano" },
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

  // Correção desta rodada: antes, esta ficha sempre mostrava o mesmo beneficiário fixo
  // (`servidorAtual`) independentemente de qual `$id` fosse aberto na lista — mesma limitação
  // pré-existente já em `admin.servidores.$id.tsx`, e explicitamente sinalizada na análise. Só
  // corrigida aqui, e só para o que os 3 requerimentos recorrentes precisam: nome/CPF/matrícula/
  // plano do titular e a lista de dependentes vêm agora do beneficiário real (`servidoresList`).
  const servidorListItem = useMemo(() => servidoresList.find((s) => s.matricula === id), [id]);
  const servidor = useMemo(
    () => (servidorListItem ? servidorParaFormularioRequerimento(servidorListItem) : servidorAtual),
    [servidorListItem],
  );
  const dependentesAtivos = useMemo(
    () => (servidorListItem ? dependentesDoBeneficiario(servidorListItem) : dependentes),
    [servidorListItem],
  );

  // Requerimentos reais deste beneficiário — mesma engine da Nova Inclusão (`requerimentos-
  // associacao.ts`), nunca mais o array ilustrativo fixo que existia antes desta rodada.
  const requerimentosDoBeneficiario = useMemo(
    () =>
      listarRequerimentosAssociacao("Assetran").filter(
        (r) => r.beneficiarioId === id,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, solicitacoesVersion],
  );

  // Indicativos de pendência por aba — mesma regra usada no badge do sino de notificações:
  // requerimentos ainda não decididos pela GERDAB (ou aguardando ação da associação) e
  // dependentes com alerta documental.
  const requerimentosPendentes = requerimentosDoBeneficiario.filter((r) => {
    const status = statusAtualRequerimento(r);
    return status === "pendente_validacao" || status === "aguardando_complementacao";
  }).length;
  const dependentesComAlerta = dependentesAtivos.filter((d) => d.alerta).length;

  // Pendências documentais direcionadas "para a associação" sobre este beneficiário — unifica
  // pendências automáticas do sistema e solicitações manuais da GERDAB. Limitação conhecida, não
  // corrigida nesta rodada (fora do escopo dos 3 requerimentos recorrentes — exigiria refatorar
  // `pendencias-documentais.ts`, que internamente também depende do singleton `servidorAtual`/
  // `dependentes`): continua refletindo o beneficiário-demo do Portal do Servidor, não
  // necessariamente o `$id` real aberto aqui.
  const pendenciasDocumento = useMemo(
    () => getPendenciasDocumentaisDoServidor(servidorAtual.matricula, "associacao"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solicitacoesVersion],
  );

  const statusDocumentosEnviados = useMemo(
    () =>
      getStatusDocumentosDoServidor(servidorAtual.matricula, "associacao").filter(
        (s) => s.status !== "aguardando_envio",
      ),
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
          <h1 className="text-2xl font-bold">{servidor.nome}</h1>
          <p className="text-sm text-muted-foreground">Matrícula {id} • {servidor.plano} • ASSETRAN</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={servidorListItem?.status ?? "ativo"} />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {requerimentosRecorrentes.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            search={{ beneficiario: id }}
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
          servidor={servidor}
          pendenciasDocumento={pendenciasDocumento}
          statusDocumentosEnviados={statusDocumentosEnviados}
          onDocumentoEnviado={() => setSolicitacoesVersion((v) => v + 1)}
        />
      )}
      {tab === "Dependentes" && <TabDependentes dependentesAtivos={dependentesAtivos} beneficiarioId={id} />}
      {tab === "Requerimentos" && <TabRequerimentos requerimentos={requerimentosDoBeneficiario} />}
    </div>
  );
}

function TabDados({
  servidor,
  pendenciasDocumento,
  statusDocumentosEnviados,
  onDocumentoEnviado,
}: {
  servidor: typeof servidorAtual;
  pendenciasDocumento: PendenciaDocumental[];
  statusDocumentosEnviados: DocumentoPendenteView[];
  onDocumentoEnviado: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const fields: [string, string, string][] = [
    ["Nome completo", "nome", servidor.nome],
    ["Matrícula", "matricula", servidor.matricula],
    ["CPF", "cpf", servidor.cpf],
    ["Data de nascimento", "dataNascimento", servidor.dataNascimento],
    ["E-mail institucional", "email", servidor.email],
    ["Telefone", "telefone", servidor.telefone],
    ["RG", "rg", servidor.rg],
    ["Endereço", "endereco", servidor.endereco],
    ["Plano", "plano", servidor.plano],
    ["Tipo de plano", "tipoPlano", servidor.tipoPlano],
    ["Operadora", "operadora", servidor.operadora],
    ["Associação", "associacao", "ASSETRAN"],
    ["Processo SEI", "processoSEI", servidor.processoSEI],
    ["Início do benefício", "inicioBeneficio", servidor.inicioBeneficio],
  ];

  return (
    <div className="space-y-4">
      {pendenciasDocumento.map((p) => (
        <SolicitacaoDocumentoBanner key={p.id} pendencia={p} onEnviado={onDocumentoEnviado} />
      ))}
      {statusDocumentosEnviados.map((s) => (
        <StatusDocumentoEnviadoCard key={s.id} status={s} />
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
                <p className="text-xs text-muted-foreground">{servidor.nome} — mat. {servidor.matricula}</p>
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

function TabDependentes({
  dependentesAtivos,
  beneficiarioId,
}: {
  dependentesAtivos: ReturnType<typeof dependentesDoBeneficiario>;
  beneficiarioId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          to="/associacao/requerimento/incluir-dependente"
          search={{ beneficiario: beneficiarioId }}
          className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium"
        >
          <UserPlus className="h-4 w-4 inline mr-1" /> Incluir Dependente
        </Link>
      </div>
      {dependentesAtivos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum dependente cadastrado.</p>
      )}
      {dependentesAtivos.map((d) => (
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
              to="/associacao/requerimento/exclusao"
              search={{ beneficiario: beneficiarioId }}
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

function TabRequerimentos({
  requerimentos,
}: {
  requerimentos: ReturnType<typeof listarRequerimentosAssociacao>;
}) {
  if (requerimentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">
        Nenhum requerimento enviado para este beneficiário ainda.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border bg-card rounded-xl border border-border">
      {requerimentos.map((r) => {
        const status = statusAtualRequerimento(r);
        const versao = versaoVigenteRequerimento(r);
        const pendenteDeAcao = status === "aguardando_complementacao";
        return (
          <li key={r.id} className="px-5 py-3 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium">{tipoRequerimentoAssociacaoLabels[r.tipo]}</p>
              <p className="text-xs text-muted-foreground">
                {versao.resumo} • {new Date(r.criadoEm).toLocaleDateString("pt-BR")}
                {r.versoes.length > 1 && ` • versão ${versao.versao}`}
              </p>
              {pendenteDeAcao && (
                <p className="text-xs text-warning mt-0.5">⚠ Aguardando ação da Associação</p>
              )}
            </div>
            <RequerimentoAssociacaoStatusBadge status={status} />
          </li>
        );
      })}
    </ul>
  );
}

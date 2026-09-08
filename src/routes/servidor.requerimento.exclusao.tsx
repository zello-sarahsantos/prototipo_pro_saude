import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Field, inputCls } from "@/components/Stepper";
import { dependentes, servidorAtual, type Dependente } from "@/lib/mock-data";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/servidor/requerimento/exclusao")({
  component: Exclusao,
});

export type ExclusaoSubmitPayload = {
  tipo: "dependente" | "titular";
  dependenteSelecionado: string;
  motivo: string;
  dataExclusao: string;
};

export function Exclusao({
  servidor: servidorProp,
  dependentesIniciais,
  onSubmit,
  voltarTo = "/servidor/dependentes",
  voltarLabel = "Voltar",
  voltarFinalTo = "/servidor/inicio",
  voltarFinalLabel = "Voltar ao início",
  statusLabel = "Em análise",
}: {
  /** Beneficiário atendido — quando ausente, usa `servidorAtual` (Portal do Servidor). Não é lido
   *  diretamente hoje (o formulário atual não exibe dados do titular), mas fica disponível para
   *  o contexto Associação e para qualquer evolução futura desta tela, mesmo padrão de
   *  `NovoPlano`/`IncluirDependenteForm`. */
  servidor?: typeof servidorAtual;
  dependentesIniciais?: Dependente[];
  /** Callback de conclusão do contexto Associação — quando fornecido, substitui a persistência
   *  padrão (hoje só cosmética) para que o chamador persista na engine de requerimentos da
   *  Associação. Nenhuma regra do formulário muda. */
  onSubmit?: (payload: ExclusaoSubmitPayload) => void;
  voltarTo?: string;
  voltarLabel?: string;
  voltarFinalTo?: string;
  voltarFinalLabel?: string;
  statusLabel?: string;
} = {}) {
  void servidorProp;
  const dependentesAtivos = (dependentesIniciais ?? dependentes).filter((d) => d.status === "ativo");

  const [tipo, setTipo] = useState("dependente");
  const [dependenteSelecionado, setDependenteSelecionado] = useState(dependentesAtivos[0]?.nome || "");
  const [motivo, setMotivo] = useState("");
  const [dataExclusao, setDataExclusao] = useState("");
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmarExclusao = () => {
    const payload: ExclusaoSubmitPayload = { tipo: tipo as "dependente" | "titular", dependenteSelecionado, motivo, dataExclusao };
    if (onSubmit) onSubmit(payload);
    setDone(true);
  };

  if (done) {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
          <p className="text-lg font-bold text-status-analise-fg">{statusLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground italic px-2">
          O Analista realizará a conferência das informações, podendo solicitar documento comprobatório se necessário.
        </p>
        <Link to={voltarFinalTo} className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2">
          {voltarFinalLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Solicitar Exclusão</h2>

      <Field label="O que deseja excluir?" required>
        <div className="flex gap-2">
          {[
            { v: "dependente", l: "Dependente" },
            { v: "titular", l: "Titular" },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex-1 border rounded-md py-2 text-center text-sm cursor-pointer ${tipo === o.v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`}
            >
              <input type="radio" className="hidden" checked={tipo === o.v} onChange={() => setTipo(o.v)} />
              {o.v === "titular" ? "Titular" : "Dependente"}
            </label>
          ))}
        </div>
        {tipo === "titular" && (
          <p className="mt-1.5 text-[11px] text-muted-foreground italic leading-tight">
            Representa a exclusão do titular do Programa Pró-Saúde.
          </p>
        )}
      </Field>

      {tipo === "dependente" && (
        <Field label="Selecionar dependente" required>
          <select
            className={inputCls}
            value={dependenteSelecionado}
            onChange={(e) => setDependenteSelecionado(e.target.value)}
          >
            {dependentesAtivos.map(d => (
              <option key={d.id} value={d.nome}>{d.nome} — {d.parentesco}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Motivo da exclusão" required>
        <textarea
          rows={4}
          className={inputCls}
          placeholder="Descreva o motivo da exclusão"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Field>

      <Field label="Data da exclusão" required>
        <input
          type="date"
          className={inputCls}
          value={dataExclusao}
          onChange={(e) => setDataExclusao(e.target.value)}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Link
          to={voltarTo}
          className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted text-center"
        >
          {voltarLabel}
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex-1 bg-destructive text-destructive-foreground rounded-md py-2.5 text-sm font-medium"
        >
          Confirmar Exclusão
        </button>
      </div>

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-elevated space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold">Atenção!</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {tipo === "titular"
                ? "Ao solicitar a exclusão do titular, todo o grupo familiar vinculado ao Pró-Saúde também será excluído do benefício. Deseja continuar?"
                : `Tem certeza de que deseja solicitar a exclusão de ${dependenteSelecionado} do Pró-Saúde?`
              }
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={confirmarExclusao}
                className="w-full bg-destructive text-destructive-foreground rounded-md py-2.5 text-sm font-bold"
              >
                {tipo === "titular" ? "Confirmar exclusão do titular" : "Confirmar exclusão do dependente"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

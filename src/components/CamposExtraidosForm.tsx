import { AlertTriangle, CheckCircle2, HelpCircle, PenLine } from "lucide-react";
import { tipoAssistenciaLabels, type CampoExtraido, type TipoAssistencia } from "@/lib/mock-data";

const chaveLabels: Record<CampoExtraido["chave"], string> = {
  nome: "Nome",
  cpf: "CPF",
  operadora: "Operadora",
  competencia: "Competência",
  valor: "Valor",
  dataPagamento: "Data do Pagamento",
  banco: "Banco",
  pagador: "Pagador",
  tipoAssistencia: "Tipo de Assistência",
};

function ConfiancaIcon({ confianca }: { confianca: CampoExtraido["confianca"] }) {
  if (confianca === "alta") return <CheckCircle2 className="h-3.5 w-3.5 text-status-aprovado-fg" />;
  if (confianca === "media") return <HelpCircle className="h-3.5 w-3.5 text-warning" />;
  return <HelpCircle className="h-3.5 w-3.5 text-destructive" />;
}

export function CamposExtraidosForm({
  titulo,
  campos,
  onChange,
  valorCadastrado,
  nomeTitular,
  readOnly = false,
}: {
  titulo?: string;
  campos: CampoExtraido[];
  onChange?: (campos: CampoExtraido[]) => void;
  /** Quando informado, exibe alerta "Divergente" se o campo `valor` não bater com o valor cadastrado. */
  valorCadastrado?: number;
  /** Quando informado, exibe alerta "Divergente" se o campo `pagador` não for o titular — o
   *  pagamento deve ter sido feito obrigatoriamente por ele, mesmo quando o beneficiário é outro. */
  nomeTitular?: string;
  /** Modo de visualização (ex: Analista conferindo) — campos não editáveis. */
  readOnly?: boolean;
}) {
  const editarCampo = (chave: CampoExtraido["chave"], valor: string) => {
    if (!onChange) return;
    onChange(
      campos.map((c) => (c.chave === chave ? { ...c, valor, origem: "manual" as const } : c)),
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      {titulo && <p className="text-sm font-semibold">{titulo}</p>}
      {campos.map((campo) => {
        const naoIdentificado = campo.valor.trim() === "";
        const naoElegivel = campo.chave === "tipoAssistencia" && campo.valor === "odontologico";
        const divergente =
          (campo.chave === "valor" &&
            valorCadastrado !== undefined &&
            parseFloat(campo.valor) !== valorCadastrado) ||
          (campo.chave === "pagador" &&
            nomeTitular !== undefined &&
            !naoIdentificado &&
            campo.valor !== nomeTitular);
        return (
        <div key={campo.chave} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              {chaveLabels[campo.chave]}
            </label>
            <div className="flex items-center gap-1.5">
              {naoIdentificado && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Não identificado
                </span>
              )}
              {naoElegivel && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Não elegível — Odontológico
                </span>
              )}
              {divergente && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Divergente
                </span>
              )}
              {campo.origem === "manual" ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#eff0f6", color: "#4f4f4f" }}
                >
                  <PenLine className="h-3 w-3" /> Preenchido manualmente
                </span>
              ) : (
                !naoIdentificado && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ConfiancaIcon confianca={campo.confianca} />
                    Confiança {campo.confianca}
                  </span>
                )
              )}
            </div>
          </div>
          {campo.chave === "tipoAssistencia" ? (
            <select
              value={campo.valor}
              onChange={(e) => editarCampo(campo.chave, e.target.value)}
              disabled={readOnly}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background ${
                naoElegivel ? "border-destructive/50" : "border-input"
              } ${readOnly ? "opacity-70 cursor-default" : ""}`}
            >
              <option value="">Não identificado</option>
              {(Object.keys(tipoAssistenciaLabels) as TipoAssistencia[]).map((t) => (
                <option key={t} value={t}>
                  {tipoAssistenciaLabels[t]}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={campo.valor}
              onChange={(e) => editarCampo(campo.chave, e.target.value)}
              readOnly={readOnly}
              placeholder={naoIdentificado ? "Não identificado — preencha manualmente" : undefined}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background ${
                naoIdentificado ? "border-destructive/50" : "border-input"
              } ${readOnly ? "opacity-70 cursor-default" : ""}`}
            />
          )}
          {campo.arquivoOrigem && (
            <p className="text-[10px] text-muted-foreground pl-0.5">Origem: {campo.arquivoOrigem}</p>
          )}
        </div>
        );
      })}
    </div>
  );
}

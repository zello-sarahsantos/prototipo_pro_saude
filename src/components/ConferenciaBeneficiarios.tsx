import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { tipoDocumentoArquivoLabels, type BeneficiarioPagamento, type CampoExtraido, type TipoDocumentoArquivo } from "@/lib/mock-data";

function naoIdentificado(campos: CampoExtraido[]): boolean {
  return campos.some((c) => c.valor.trim() === "");
}

function todaAltaConfianca(campos: CampoExtraido[]): boolean {
  return campos.every((c) => c.confianca === "alta");
}

export function ConferenciaBeneficiarios({
  arquivos,
  beneficiarios,
  gruposExtraidos,
  onChangeGrupo,
  onVoltar,
  onContinuar,
  nomeTitular,
}: {
  arquivos: { nome: string; tipos: TipoDocumentoArquivo[] }[];
  beneficiarios: BeneficiarioPagamento[];
  gruposExtraidos: { beneficiarioId: string; campos: CampoExtraido[] }[];
  onChangeGrupo: (beneficiarioId: string, campos: CampoExtraido[]) => void;
  /** Volta ao passo de upload — permite remover/adicionar arquivos e reprocessar. */
  onVoltar: () => void;
  onContinuar: () => void;
  /** O pagamento deve ter sido feito pelo titular — usado para destacar "Pagador" divergente. */
  nomeTitular?: string;
}) {
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());

  // Confirma automaticamente os beneficiários com todos os campos em alta confiança.
  useEffect(() => {
    const altaConfianca = gruposExtraidos
      .filter((g) => !naoIdentificado(g.campos) && todaAltaConfianca(g.campos))
      .map((g) => g.beneficiarioId);
    if (altaConfianca.length > 0) {
      setConfirmados((prev) => new Set([...prev, ...altaConfianca]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todosResolvidos = gruposExtraidos.every((g) => !naoIdentificado(g.campos) && confirmados.has(g.beneficiarioId));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onVoltar} className="p-1 hover:bg-muted rounded-md">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-semibold">Confira antes de enviar</h2>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documentos analisados</p>
        {arquivos.map((a) => (
          <div key={a.nome} className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{a.nome}</p>
              <p className="text-xs text-muted-foreground">
                {a.tipos.map((t) => tipoDocumentoArquivoLabels[t]).join(", ") || "Nenhum tipo marcado"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {gruposExtraidos.length} beneficiário{gruposExtraidos.length > 1 ? "s" : ""} identificado
        {gruposExtraidos.length > 1 ? "s" : ""} nos documentos acima. Confira os dados de cada um — a IA
        pré-preenche a partir do conjunto de arquivos, mas você pode editar qualquer campo.
      </p>

      <div className="space-y-3">
        {gruposExtraidos.map((grupo) => {
          const beneficiario = beneficiarios.find((b) => b.id === grupo.beneficiarioId);
          const incompleto = naoIdentificado(grupo.campos);
          const confirmado = confirmados.has(grupo.beneficiarioId);

          return (
            <div key={grupo.beneficiarioId} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold">{beneficiario?.nome}</p>
                  <p className="text-xs text-muted-foreground">{beneficiario?.parentesco}</p>
                </div>
                {confirmado && !incompleto && (
                  <span className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmado
                  </span>
                )}
              </div>

              <CamposExtraidosForm
                campos={grupo.campos}
                valorCadastrado={beneficiario?.valorCadastrado}
                nomeTitular={nomeTitular}
                onChange={(campos) => onChangeGrupo(grupo.beneficiarioId, campos)}
              />

              <div className="flex flex-wrap gap-2">
                {!confirmado && (
                  <button
                    onClick={() => {
                      if (!naoIdentificado(grupo.campos)) {
                        setConfirmados((prev) => new Set(prev).add(grupo.beneficiarioId));
                      }
                    }}
                    disabled={incompleto}
                    className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
                  >
                    Confirmar
                  </button>
                )}
                {incompleto && (
                  <button
                    onClick={onVoltar}
                    className="text-xs font-medium border border-border rounded-md px-3 py-2 hover:bg-muted flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Anexar mais um arquivo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onVoltar} className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted">
          Voltar
        </button>
        <button
          onClick={onContinuar}
          disabled={!todosResolvidos}
          className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
        >
          Confirmar e continuar
        </button>
      </div>
    </div>
  );
}

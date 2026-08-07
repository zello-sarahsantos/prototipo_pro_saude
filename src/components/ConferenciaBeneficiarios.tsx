import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { CamposExtraidosForm } from "@/components/CamposExtraidosForm";
import { tipoDocumentoArquivoLabels, tiposDoArquivo, type BeneficiarioPagamento, type CampoExtraido, type DocumentoDetectado } from "@/lib/mock-data";
import {
  getDivergenciaBoletoComprovante,
  getElegibilidade,
  operadoraDivergeDoCadastro,
  valorDivergeDoCadastro,
} from "@/lib/comprovante-status";
import { temPeloMenosNPalavras } from "@/lib/validation-pagamento";

function naoIdentificado(campos: CampoExtraido[]): boolean {
  return campos.some((c) => c.valor.trim() === "");
}

function todaAltaConfianca(campos: CampoExtraido[]): boolean {
  return campos.every((c) => c.confianca === "alta");
}

export function ConferenciaBeneficiarios({
  arquivos,
  beneficiarios,
  competencia,
  gruposExtraidos,
  onChangeGrupo,
  onVoltar,
  onContinuar,
  nomeTitular,
  justificativasDivergencia,
  onChangeJustificativaDivergencia,
  operadoraDivergenteConfirmada,
  onConfirmarOperadoraDivergente,
}: {
  arquivos: { nome: string; documentos: DocumentoDetectado[] }[];
  beneficiarios: BeneficiarioPagamento[];
  /** Usada para recalcular situação não reembolsável / divergência boleto x comprovante a
   *  partir dos arquivos, do mesmo jeito que o Analista/Gerência veem depois do envio. */
  competencia: string;
  gruposExtraidos: { beneficiarioId: string; campos: CampoExtraido[] }[];
  onChangeGrupo: (beneficiarioId: string, campos: CampoExtraido[]) => void;
  /** Volta ao passo de upload — permite remover/adicionar arquivos e reprocessar. */
  onVoltar: () => void;
  onContinuar: () => void;
  /** O pagamento deve ter sido feito pelo titular — usado para destacar "Pagador" divergente. */
  nomeTitular?: string;
  /** Justificativa (por beneficiário) da divergência entre o valor extraído e o valor cadastrado —
   *  obrigatória (≥3 palavras) antes de confirmar um beneficiário com valor divergente. */
  justificativasDivergencia: Record<string, string>;
  onChangeJustificativaDivergencia: (beneficiarioId: string, texto: string) => void;
  /** Beneficiários para os quais o Servidor já escolheu "Continuar mesmo assim" apesar da
   *  operadora identificada divergir do cadastro. */
  operadoraDivergenteConfirmada: Record<string, boolean>;
  onConfirmarOperadoraDivergente: (beneficiarioId: string) => void;
}) {
  const pseudoComprovante = {
    arquivos,
    beneficiarioIds: beneficiarios.map((b) => b.id),
    competencia,
  };
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());

  // Confirma automaticamente os beneficiários com todos os campos em alta confiança — exceto
  // quando o valor ou a operadora divergem do cadastro, casos em que uma ação explícita do
  // Servidor (justificativa ou "Continuar mesmo assim") impede o avanço automático.
  useEffect(() => {
    const altaConfianca = gruposExtraidos
      .filter((g) => {
        if (naoIdentificado(g.campos) || !todaAltaConfianca(g.campos)) return false;
        const beneficiario = beneficiarios.find((b) => b.id === g.beneficiarioId);
        if (!beneficiario) return true;
        if (valorDivergeDoCadastro(g.campos, beneficiario.valorCadastrado).divergente) return false;
        if (operadoraDivergeDoCadastro(g.campos, beneficiario.operadora).divergente) return false;
        return true;
      })
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
                {tiposDoArquivo(a).map((t) => tipoDocumentoArquivoLabels[t]).join(", ") || "Nenhum tipo marcado"}
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
          const { situacao } = getElegibilidade(pseudoComprovante, grupo.beneficiarioId);
          const { divergente: boletoComprovanteDivergente } = beneficiario
            ? getDivergenciaBoletoComprovante(pseudoComprovante, beneficiario)
            : { divergente: false };
          const valorDivergente = beneficiario
            ? valorDivergeDoCadastro(grupo.campos, beneficiario.valorCadastrado).divergente
            : false;
          const justificativa = justificativasDivergencia[grupo.beneficiarioId] ?? "";
          const justificativaValida = temPeloMenosNPalavras(justificativa);
          const { divergente: operadoraDivergente, operadoraExtraida } = beneficiario
            ? operadoraDivergeDoCadastro(grupo.campos, beneficiario.operadora)
            : { divergente: false, operadoraExtraida: undefined };
          const operadoraConfirmada = !!operadoraDivergenteConfirmada[grupo.beneficiarioId];

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
                situacaoNaoReembolsavel={situacao}
                divergenciaBoletoComprovante={boletoComprovanteDivergente}
                onChange={(campos) => onChangeGrupo(grupo.beneficiarioId, campos)}
              />

              {operadoraDivergente && !confirmado && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-medium text-warning flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> A operadora identificada ({operadoraExtraida}) é
                    diferente do seu cadastro ({beneficiario?.operadora}).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/servidor/requerimento/novo-plano"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium border border-warning/40 text-warning rounded-md px-3 py-1.5 hover:bg-warning/10"
                    >
                      Abrir requerimento de mudança de plano
                    </Link>
                    <button
                      type="button"
                      onClick={() => onConfirmarOperadoraDivergente(grupo.beneficiarioId)}
                      className={`text-xs font-medium rounded-md px-3 py-1.5 border ${
                        operadoraConfirmada
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {operadoraConfirmada ? "Continuar mesmo assim ✓" : "Continuar mesmo assim"}
                    </button>
                  </div>
                </div>
              )}

              {valorDivergente && !confirmado && (
                <div className="px-1">
                  <label className="block text-xs font-medium mb-1">
                    Justificativa da divergência de valor <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={justificativa}
                    onChange={(e) => onChangeJustificativaDivergencia(grupo.beneficiarioId, e.target.value)}
                    rows={2}
                    placeholder="Explique por que o valor pago é diferente do cadastrado (mínimo 3 palavras)..."
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      justificativa.trim().length > 0 && !justificativaValida ? "border-destructive/50" : "border-input"
                    }`}
                  />
                  {justificativa.trim().length > 0 && !justificativaValida && (
                    <p className="text-xs text-destructive mt-1">Escreva pelo menos 3 palavras.</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!confirmado && (
                  <button
                    onClick={() => {
                      if (!naoIdentificado(grupo.campos)) {
                        setConfirmados((prev) => new Set(prev).add(grupo.beneficiarioId));
                      }
                    }}
                    disabled={
                      incompleto ||
                      (valorDivergente && !justificativaValida) ||
                      (operadoraDivergente && !operadoraConfirmada)
                    }
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

import { useState } from "react";
import { X, CheckCircle2, RotateCcw, Ban, FileText } from "lucide-react";
import { RequerimentoAssociacaoStatusBadge } from "./RequerimentoAssociacaoStatusBadge";
import {
  decidirRequerimentoAssociacao,
  statusAtualRequerimento,
  statusRequerimentoAssociacaoLabels,
  tipoRequerimentoAssociacaoLabels,
  versaoVigenteRequerimento,
  type RequerimentoAssociacao,
  type DocumentoRequerimentoAssociacao,
} from "@/lib/requerimentos-associacao";

type AcaoRequerimento = "complemento" | "negar" | null;

const rotuloCategoria: Record<DocumentoRequerimentoAssociacao["categoria"], string> = {
  associacao: "Documentos da Associação",
  titular: "Documentos do Titular",
  dependente: "Documentos dos Dependentes",
  complemento: "Documentação Complementar",
};

/** Agrupa documentos por categoria, na mesma ordem já usada na etapa "Docs" (Associação →
 *  Titular → Dependentes por nome) — nunca reordena nem inventa categoria nova. */
function agruparDocumentos(documentos: DocumentoRequerimentoAssociacao[]) {
  const ordem: DocumentoRequerimentoAssociacao["categoria"][] = ["associacao", "titular", "dependente", "complemento"];
  return ordem
    .map((categoria) => ({ categoria, itens: documentos.filter((d) => d.categoria === categoria) }))
    .filter((g) => g.itens.length > 0);
}

/**
 * Análise de um requerimento originado pela Área da Associação (Nova Inclusão nesta rodada) —
 * Aprovar | Solicitar Documento Complementar | Negar. Mesmo padrão visual e de fluxo já usado em
 * `AnalisePlanilhaModal.tsx` (reaproveitado deliberadamente, não reinventado): histórico de
 * versões, justificativa obrigatória para Solicitar Documento/Negar, `onDecidido` fecha e
 * atualiza a lista de quem chamou.
 *
 * Um requerimento nunca é aprovado/concluído automaticamente pelo envio — só chega a "Aprovado"
 * ou "Negado" por uma decisão explícita aqui.
 */
export function AnaliseRequerimentoAssociacaoModal({
  requerimento,
  decididoPorNome,
  onFechar,
  onDecidido,
}: {
  requerimento: RequerimentoAssociacao;
  decididoPorNome: string;
  onFechar: () => void;
  onDecidido: () => void;
}) {
  const [acao, setAcao] = useState<AcaoRequerimento>(null);
  const [justificativa, setJustificativa] = useState("");

  const status = statusAtualRequerimento(requerimento);
  const versao = versaoVigenteRequerimento(requerimento);
  const acoesDisponiveis = status === "pendente_validacao";
  const grupos = agruparDocumentos(versao.documentos);

  function aprovar() {
    decidirRequerimentoAssociacao(requerimento.id, {
      status: "aprovado",
      decididoPor: decididoPorNome,
    });
    onDecidido();
  }

  function confirmarAcao() {
    if (!acao || !justificativa.trim()) return;
    decidirRequerimentoAssociacao(requerimento.id, {
      status: acao === "complemento" ? "aguardando_complementacao" : "negado",
      justificativa: justificativa.trim(),
      decididoPor: decididoPorNome,
    });
    onDecidido();
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
          <div>
            <h2 className="font-semibold">
              {requerimento.associacao} — {tipoRequerimentoAssociacaoLabels[requerimento.tipo]}
            </h2>
            <p className="text-xs text-muted-foreground">{requerimento.beneficiarioNome}</p>
          </div>
          <button onClick={onFechar} className="p-1 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <RequerimentoAssociacaoStatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              Versão {versao.versao} de {requerimento.versoes.length}
            </span>
          </div>

          {requerimento.versoes.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Histórico do requerimento
              </p>
              <ul className="space-y-2">
                {requerimento.versoes.map((v) => (
                  <li key={v.versao} className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-1">
                    <p className="font-medium">
                      Versão {v.versao} — enviada em {new Date(v.enviadoEm).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-muted-foreground">{v.resumo}</p>
                    {v.decisao ? (
                      <p>
                        {statusRequerimentoAssociacaoLabels[v.decisao.status]} em{" "}
                        {new Date(v.decisao.decididoEm).toLocaleString("pt-BR")} por {v.decisao.decididoPor}
                        {v.decisao.justificativa && ` — "${v.decisao.justificativa}"`}
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic">Aguardando decisão da GERDAB.</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dados enviados (versão {versao.versao})
            </p>
            <p className="text-sm bg-muted rounded-lg p-3">{versao.resumo}</p>

            {grupos.map((g) => (
              <div key={g.categoria} className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">{rotuloCategoria[g.categoria]}</p>
                <ul className="space-y-1">
                  {g.itens.map((doc, i) => (
                    <li
                      key={`${doc.nome}-${doc.dependenteNome ?? ""}-${i}`}
                      className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {doc.nome}
                        {doc.dependenteNome && (
                          <span className="text-muted-foreground"> — {doc.dependenteNome}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {acoesDisponiveis && acao && (
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {acao === "complemento" ? "Documento/necessidade e orientação para a Associação" : "Justificativa da negação"}
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder={
                  acao === "complemento"
                    ? "Descreva o documento que falta e a orientação para a Associação (obrigatório)…"
                    : "Descreva o motivo da negação (obrigatório)…"
                }
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background"
              />
            </div>
          )}
        </div>

        {acoesDisponiveis && (
          <footer className="px-6 py-4 border-t border-border flex flex-wrap justify-end gap-2 sticky bottom-0 bg-card">
            {acao ? (
              <>
                <button
                  onClick={() => { setAcao(null); setJustificativa(""); }}
                  className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAcao}
                  disabled={!justificativa.trim()}
                  className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAcao("negar")}
                  className="text-sm border border-destructive/30 text-destructive rounded-md px-4 py-2 hover:bg-destructive/5 flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" /> Negar
                </button>
                <button
                  onClick={() => setAcao("complemento")}
                  className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Solicitar Documento
                </button>
                <button
                  onClick={aprovar}
                  className="text-sm bg-success text-success-foreground rounded-md px-4 py-2 hover:opacity-90 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

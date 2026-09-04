import { useState } from "react";
import { X, CheckCircle2, RotateCcw, Ban, Download, Loader2 } from "lucide-react";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { PlanilhaStatusBadge } from "./PlanilhaStatusBadge";
import {
  decidirPlanilhaAssociacao,
  statusAtualPlanilha,
  statusPlanilhaLabels,
  versaoVigente,
  type PlanilhaAssociacao,
  type VersaoPlanilhaAssociacao,
  type RegistroPlanilhaAssociacao,
} from "@/lib/planilhas-associacao";

type AcaoPlanilha = "correcao" | "negar" | null;

/** Formata uma data ISO (`AAAA-MM-DD`) como dd/mm/aaaa sem passar por `Date`/fuso horário —
 *  `new Date("2026-08-08").toLocaleDateString()` interpreta a string como UTC meia-noite e pode
 *  exibir o dia anterior dependendo do fuso do navegador. `dataPagamento` é só uma data (sem
 *  hora), então a formatação lê os componentes diretamente da string. Aceita `undefined` porque
 *  planilhas semeadas/persistidas antes deste campo existir no modelo de dados (localStorage de
 *  rodadas de teste anteriores) não têm `dataPagamento` — mostra "—" em vez de quebrar a tela. */
function formatDataISO(iso: string | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Status de validação por registro (Válido/Atenção/Não Elegível, ver HU01) — só na interface,
 *  nunca no arquivo baixado (ver nota abaixo da tabela). Mesmos tokens semânticos já usados em
 *  `StatusBadge`/`ComprovanteStatusBadge` (nunca uma paleta nova): aprovado=válido,
 *  pendente=atenção, rejeitado=não_elegível. */
function StatusValidacaoBadge({ status }: { status: RegistroPlanilhaAssociacao["status"] }) {
  const cls =
    status === "válido"
      ? "bg-status-aprovado-bg text-status-aprovado-fg"
      : status === "atenção"
        ? "bg-status-pendente-bg text-status-pendente-fg"
        : "bg-status-rejeitado-bg text-status-rejeitado-fg";
  const label = status === "válido" ? "Válido" : status === "atenção" ? "Atenção" : "Não Elegível";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/**
 * Análise/conciliação de uma planilha de associação (aba "Planilhas - Associações",
 * `admin.comprovantes.tsx`) — Aprovar | Solicitar Correção | Negar (seção 2 do plano de impacto).
 *
 * P2 — "Solicitar Correção" e "Negar" exigem justificativa textual obrigatória (sem o dropdown
 * fixo de motivos de comprovante individual — domínio diferente, catálogo fechado não definido
 * ainda). "Aprovar" não exige justificativa, mesmo padrão já usado em Comprovantes.
 *
 * P6 — o histórico de versões (envio inicial → correção solicitada → reenvio → decisão final)
 * é mostrado integralmente, nunca só a versão vigente — nenhuma tentativa anterior é escondida.
 *
 * Ajuste — download do arquivo por versão: cada versão do histórico tem seu próprio botão de
 * download (ícone), e a versão vigente tem também a ação completa "Baixar planilha enviada
 * (.xlsx)" ao lado de "Registros enviados". **O arquivo baixado é uma reconstrução em `.xlsx`
 * real dos registros normalizados daquela versão específica** (`planilha-arquivo-versao.ts`) —
 * o protótipo ainda não captura/armazena o arquivo literal enviado pela associação, então o
 * download nunca é o byte a byte do upload original. Isso está sinalizado na tela (nota abaixo
 * do botão principal), nunca escondido.
 *
 * Princípio (correção conceitual desta rodada): **planilha enviada = planilha baixada pela
 * GERDAB; resultado da análise = informação do sistema.** O arquivo baixado reproduz só as
 * colunas que a própria associação preenche (mesma estrutura do modelo padronizado,
 * `docs/modelo_envio_mensal_associacoes.xlsx`) — Status e Motivo (resultado da validação/análise)
 * nunca entram no arquivo, mesmo continuando visíveis aqui na tela, associados à mesma versão.
 */
export function AnalisePlanilhaModal({
  planilha,
  decididoPorNome,
  onFechar,
  onDecidido,
}: {
  planilha: PlanilhaAssociacao;
  decididoPorNome: string;
  onFechar: () => void;
  onDecidido: () => void;
}) {
  const [acao, setAcao] = useState<AcaoPlanilha>(null);
  const [justificativa, setJustificativa] = useState("");
  const [baixandoVersao, setBaixandoVersao] = useState<number | null>(null);

  const status = statusAtualPlanilha(planilha);
  const versao = versaoVigente(planilha);
  const acoesDisponiveis = status === "em_analise";

  function aprovar() {
    decidirPlanilhaAssociacao(planilha.associacao, planilha.competencia, {
      status: "aprovada",
      decididoPor: decididoPorNome,
    });
    onDecidido();
  }

  function confirmarAcao() {
    if (!acao || !justificativa.trim()) return;
    decidirPlanilhaAssociacao(planilha.associacao, planilha.competencia, {
      status: acao === "correcao" ? "correcao_solicitada" : "negada",
      justificativa: justificativa.trim(),
      decididoPor: decididoPorNome,
    });
    onDecidido();
  }

  async function baixarVersao(v: VersaoPlanilhaAssociacao) {
    setBaixandoVersao(v.versao);
    try {
      const [{ buildArquivoVersaoBlob }, { baixarBlob }] = await Promise.all([
        import("@/lib/planilha-arquivo-versao"),
        import("@/lib/relatorio-export"),
      ]);
      const blob = await buildArquivoVersaoBlob(planilha, v);
      baixarBlob(blob, `pro-saude_planilha_${planilha.associacao}_${planilha.competencia}_v${v.versao}.xlsx`);
    } finally {
      setBaixandoVersao(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
          <div>
            <h2 className="font-semibold">
              {planilha.associacao} — {formatCompetencia(planilha.competencia)}
            </h2>
            <p className="text-xs text-muted-foreground">Planilha mensal de pagamento</p>
          </div>
          <button onClick={onFechar} className="p-1 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <PlanilhaStatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              Versão {versao.versao} de {planilha.versoes.length}
            </span>
          </div>

          {planilha.versoes.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Histórico da análise
              </p>
              <ul className="space-y-2">
                {planilha.versoes.map((v) => (
                  <li key={v.versao} className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        Versão {v.versao} — enviada em {new Date(v.enviadoEm).toLocaleString("pt-BR")}
                      </p>
                      <button
                        onClick={() => baixarVersao(v)}
                        disabled={baixandoVersao !== null}
                        title={`Baixar planilha enviada (versão ${v.versao})`}
                        className="shrink-0 text-muted-foreground hover:text-primary disabled:opacity-50"
                      >
                        {baixandoVersao === v.versao ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {v.decisao ? (
                      <p>
                        {statusPlanilhaLabels[v.decisao.status]} em{" "}
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

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Registros enviados (versão {versao.versao})
              </p>
              <button
                onClick={() => baixarVersao(versao)}
                disabled={baixandoVersao !== null}
                className="text-xs border border-border rounded-md px-2.5 py-1.5 hover:bg-muted flex items-center gap-1.5 disabled:opacity-50"
              >
                {baixandoVersao === versao.versao ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Baixar planilha enviada (.xlsx)
              </button>
            </div>
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Servidor (Titular)</th>
                    <th className="text-left px-3 py-2">Beneficiário</th>
                    <th className="text-left px-3 py-2">Vínculo</th>
                    <th className="text-right px-3 py-2">Valor Mensal Individual (R$)</th>
                    <th className="text-left px-3 py-2">Operadora do Plano</th>
                    <th className="text-left px-3 py-2">Data do Pagamento</th>
                    <th className="text-left px-3 py-2">Status da validação</th>
                  </tr>
                </thead>
                <tbody>
                  {versao.registros.map((r, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-3 py-2">
                        <p className="font-medium">{r.servidor}</p>
                        <p className="text-xs text-muted-foreground">CPF: {r.cpfTitular}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>{r.beneficiario || "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.cpf || "CPF ausente"}</p>
                      </td>
                      <td className="px-3 py-2">{r.vinculo}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(r.valor)}</td>
                      <td className="px-3 py-2">{r.operadora}</td>
                      <td className="px-3 py-2">{formatDataISO(r.dataPagamento)}</td>
                      <td className="px-3 py-2">
                        <StatusValidacaoBadge status={r.status} />
                        {r.motivo && <p className="text-xs text-muted-foreground italic mt-1 max-w-[160px]">{r.motivo}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              A coluna "Status da validação" (e o motivo, quando houver) é resultado da conferência do
              sistema/análise da GERDAB — aparece só aqui na tela, nunca no arquivo baixado, que reproduz
              apenas as colunas que a própria associação preenche (mesma estrutura do modelo padronizado).
              É uma reconstrução dos registros já normalizados desta versão — o protótipo ainda não
              armazena o arquivo literal enviado pela associação.
            </p>
          </div>

          {acoesDisponiveis && !acao && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button
                onClick={aprovar}
                className="text-sm bg-success text-success-foreground rounded-md px-3 py-2 hover:opacity-90 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
              </button>
              <button
                onClick={() => setAcao("correcao")}
                className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Solicitar Correção
              </button>
              <button
                onClick={() => setAcao("negar")}
                className="text-sm border border-destructive/30 text-destructive rounded-md px-3 py-2 hover:bg-destructive/5 flex items-center gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" /> Negar
              </button>
            </div>
          )}

          {acoesDisponiveis && acao && (
            <div className="space-y-2 pt-2 border-t border-border">
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder={
                  acao === "correcao"
                    ? "Descreva o que precisa ser corrigido na planilha..."
                    : "Descreva o motivo da negativa..."
                }
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setAcao(null);
                    setJustificativa("");
                  }}
                  className="text-sm border border-border rounded-md px-3 py-2 hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAcao}
                  disabled={!justificativa.trim()}
                  className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {!acoesDisponiveis && (
            <p className="text-xs text-muted-foreground italic">
              Sem ações disponíveis — planilha já {statusPlanilhaLabels[status].toLowerCase()}.
            </p>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-border flex justify-end sticky bottom-0 bg-card">
          <button onClick={onFechar} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

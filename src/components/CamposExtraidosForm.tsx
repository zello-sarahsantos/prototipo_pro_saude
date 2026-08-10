import { AlertTriangle, CheckCircle2, HelpCircle, PenLine } from "lucide-react";
import { formatCurrency, situacaoNaoReembolsavelLabels, type CampoExtraido } from "@/lib/mock-data";
import type { DecomposicaoValor } from "@/lib/comprovante-status";

const chaveLabels: Record<CampoExtraido["chave"], string> = {
  nome: "Nome",
  cpf: "CPF",
  operadora: "Operadora",
  competencia: "Competência",
  vencimento: "Vencimento",
  valor: "Valor",
  dataPagamento: "Data do Pagamento",
  pagador: "Pagador",
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
  decomposicaoValor,
  divergenciaBoletoComprovante,
  readOnly = false,
}: {
  titulo?: string;
  campos: CampoExtraido[];
  onChange?: (campos: CampoExtraido[]) => void;
  /** Quando informado, exibe alerta "Valor difere do cadastro" se o **valor elegível** (não o
   *  campo `valor` bruto/total) não bater com o valor cadastrado do beneficiário — divergência
   *  **cadastral**, distinta da divergência **documental** Boleto × Comprovante
   *  (`divergenciaBoletoComprovante`, abaixo). */
  valorCadastrado?: number;
  /** Quando informado, exibe alerta "Divergente" se o campo `pagador` não for o titular — o
   *  pagamento deve ter sido feito obrigatoriamente por ele, mesmo quando o beneficiário é outro. */
  nomeTitular?: string;
  /** Decomposição do valor do documento em itens reembolsáveis/não reembolsáveis (ver
   *  `getElegibilidade`/`getDecomposicaoValor`, `comprovante-status.ts`) — a elegibilidade é
   *  avaliada por item, não pelo documento inteiro: um mesmo documento pode ter um item
   *  reembolsável (mensalidade) e um não reembolsável (ex: odontológico) ao mesmo tempo. O campo
   *  `valor` (`CampoExtraido`, acima) continua sendo o valor bruto/total do documento, consultável
   *  separadamente — só o badge de divergência cadastral usa `valorElegivel` daqui, não o bruto.
   *  Exibido para Servidor, Analista e Gerência igualmente. */
  decomposicaoValor?: DecomposicaoValor;
  /** Quando `true`, o valor bruto do Boleto diverge do valor bruto do Comprovante de Pagamento
   *  anexados no mesmo envio (antes da consolidação) — ver `getDivergenciaBoletoComprovante`. */
  divergenciaBoletoComprovante?: boolean;
  /** Modo de visualização (ex: Analista conferindo) — campos não editáveis. */
  readOnly?: boolean;
}) {
  const editarCampo = (chave: CampoExtraido["chave"], valor: string) => {
    if (!onChange) return;
    onChange(
      campos.map((c) => (c.chave === chave ? { ...c, valor, origem: "manual" as const } : c)),
    );
  };

  const itensNaoReembolsaveis = decomposicaoValor?.itens.filter((item) => !item.reembolsavel) ?? [];
  const temItemNaoReembolsavel = itensNaoReembolsaveis.length > 0;
  const totalmenteNaoElegivel = temItemNaoReembolsavel && (decomposicaoValor?.valorElegivel ?? 0) <= 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      {titulo && <p className="text-sm font-semibold">{titulo}</p>}
      {temItemNaoReembolsavel && decomposicaoValor && (
        <div
          className={`rounded-lg p-3 text-xs space-y-1.5 border ${
            totalmenteNaoElegivel ? "bg-destructive/5 border-destructive/20" : "bg-warning/10 border-warning/30"
          }`}
        >
          <div className={`flex items-start gap-2 ${totalmenteNaoElegivel ? "text-destructive" : "text-warning"}`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {totalmenteNaoElegivel ? (
              <p>
                <strong>
                  Não elegível —{" "}
                  {itensNaoReembolsaveis
                    .map((item) => situacaoNaoReembolsavelLabels[item.situacaoNaoReembolsavel!])
                    .join(", ")}
                  .
                </strong>{" "}
                Situação não reembolsável pelo Pró-Saúde; aprovação automática ou com ressalva fica bloqueada até
                revisão da GERDAB.
              </p>
            ) : (
              <p className="font-medium">
                Itens não reembolsáveis identificados neste documento — desconsiderados do valor elegível.
              </p>
            )}
          </div>
          <ul className="pl-5 list-disc space-y-0.5">
            {itensNaoReembolsaveis.map((item, i) => (
              <li key={i}>
                {item.descricao} — {formatCurrency(item.valor)} ({situacaoNaoReembolsavelLabels[item.situacaoNaoReembolsavel!]})
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Valor total: {formatCurrency(decomposicaoValor.valorTotal)} · Valor elegível:{" "}
            {formatCurrency(decomposicaoValor.valorElegivel)} · Valor não reembolsável:{" "}
            {formatCurrency(decomposicaoValor.valorNaoReembolsavel)}
          </p>
        </div>
      )}
      {campos.map((campo) => {
        const naoIdentificado = campo.valor.trim() === "";
        // Divergência cadastral (valor ELEGÍVEL × valor cadastrado do beneficiário) — usa a
        // decomposição por item, não o campo `valor` bruto/total. Rótulo próprio para não ser
        // confundida com a divergência documental Boleto × Comprovante.
        const valorDivergeDoCadastro =
          campo.chave === "valor" &&
          valorCadastrado !== undefined &&
          !naoIdentificado &&
          decomposicaoValor !== undefined &&
          decomposicaoValor.valorElegivel !== valorCadastrado;
        const pagadorDivergente =
          campo.chave === "pagador" &&
          nomeTitular !== undefined &&
          !naoIdentificado &&
          campo.valor !== nomeTitular;
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
              {valorDivergeDoCadastro && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Valor difere do cadastro
                </span>
              )}
              {pagadorDivergente && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Divergente
                </span>
              )}
              {campo.chave === "valor" && divergenciaBoletoComprovante && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                >
                  <AlertTriangle className="h-3 w-3" /> Valor diverge do boleto anexado
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
          <input
            value={campo.valor}
            onChange={(e) => editarCampo(campo.chave, e.target.value)}
            readOnly={readOnly}
            placeholder={naoIdentificado ? "Não identificado — preencha manualmente" : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background ${
              naoIdentificado ? "border-destructive/50" : "border-input"
            } ${readOnly ? "opacity-70 cursor-default" : ""}`}
          />
          {campo.arquivoOrigem && (
            <p className="text-[10px] text-muted-foreground pl-0.5">Origem: {campo.arquivoOrigem}</p>
          )}
        </div>
        );
      })}
    </div>
  );
}

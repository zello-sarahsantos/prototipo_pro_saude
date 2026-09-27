import { useMemo } from "react";
import { formatCurrency } from "@/lib/mock-data";
import { getAssociacaoModelo, ROTULO_PLANO_POR_ASSOCIACAO } from "@/lib/planilhas-associacao";
import { getLinhasPlanilhaCompleta, type LinhaPlanilhaRetroativa } from "@/lib/planilha-retroativa";

/**
 * Visualização tabular da planilha retroativa enviada por uma Associação (colunas funcionais do modelo
 * retroativo). PROTÓTIPO: as linhas vêm dos registros normalizados (`getLinhasPlanilhaCompleta`); em
 * produção, esta visão e o download devem usar o XLSX efetivamente enviado e armazenado.
 * `destaque` realça as linhas do titular + competência em análise na planilha completa.
 */
export function TabelaPlanilhaRetroativa({
  linhas,
  associacao,
  destaque,
  altura = "max-h-96",
}: {
  linhas: LinhaPlanilhaRetroativa[];
  associacao: string;
  destaque?: { cpfTitular: string; competenciaReferencia: string };
  altura?: string;
}) {
  const rotuloPlano = ROTULO_PLANO_POR_ASSOCIACAO[getAssociacaoModelo(associacao) ?? "Assetran"];
  const ehDestaque = (l: LinhaPlanilhaRetroativa) => !!destaque && l.cpfTitular === destaque.cpfTitular && l.competenciaReferencia === destaque.competenciaReferencia;
  return (
    <div className={`overflow-auto border border-border rounded-lg ${altura}`}>
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground sticky top-0">
          <tr>
            {["Servidor/Titular", "CPF do Titular", "Beneficiário", "CPF do Beneficiário", "Grau de Parentesco/Vínculo", "Mês/Ano de Referência", "Data de Emissão do Boleto", "Vencimento", "Data da Baixa/Pagamento"].map((h) => (
              <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>
            ))}
            <th className="text-right px-3 py-2">Valor</th>
            <th className="text-left px-3 py-2 whitespace-nowrap">{rotuloPlano}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className={`border-t border-border ${ehDestaque(l) ? "bg-primary/5 font-medium" : ""}`}>
              <td className="px-3 py-2 whitespace-nowrap">{l.titular}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.cpfTitular}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.beneficiario}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.cpfBeneficiario}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.vinculo}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.referencia}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.emissao || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.vencimento || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.baixa || "—"}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(l.valor)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{l.plano || "—"}</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr><td colSpan={11} className="px-3 py-4 text-center text-muted-foreground">Sem linhas para exibir.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Planilha completa de um envio (por `arquivoId`). */
export function PlanilhaCompleta({ arquivoId, associacao, destaque }: { arquivoId: string; associacao: string; destaque?: { cpfTitular: string; competenciaReferencia: string } }) {
  const linhas = useMemo(() => getLinhasPlanilhaCompleta(arquivoId), [arquivoId]);
  return (
    <div className="space-y-1">
      <TabelaPlanilhaRetroativa linhas={linhas} associacao={associacao} destaque={destaque} />
      <p className="text-xs text-muted-foreground">
        {linhas.length} linha(s) da planilha enviada. Valor = cobrança/plano informado pela associação, sem juros — não é o Valor Pago.
      </p>
    </div>
  );
}

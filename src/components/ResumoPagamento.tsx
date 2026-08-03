import { FileText } from "lucide-react";
import type { BeneficiarioPagamento, CampoExtraido } from "@/lib/mock-data";

const chaveLabels: Record<CampoExtraido["chave"], string> = {
  nome: "Nome",
  cpf: "CPF",
  operadora: "Operadora",
  competencia: "Competência",
  valor: "Valor (R$)",
  dataPagamento: "Data do Pagamento",
  banco: "Banco",
  pagador: "Pagador",
};

export function ResumoPagamento({
  arquivo,
  beneficiarios,
  competencia,
  isRetroativo,
  justificativaAtraso,
  gruposExtraidos,
}: {
  arquivo: string;
  beneficiarios: BeneficiarioPagamento[];
  competencia: string;
  isRetroativo: boolean;
  justificativaAtraso?: string;
  gruposExtraidos: { beneficiarioId: string; campos: CampoExtraido[] }[];
}) {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" /> {arquivo}
        </div>
        <p className="text-xs text-muted-foreground">
          Competência: <strong className="text-foreground">{competencia}</strong>
          {isRetroativo && <span className="text-[#6d28d9] font-medium"> • Retroativo</span>}
        </p>
        {isRetroativo && justificativaAtraso && (
          <div className="text-xs bg-muted/40 rounded-lg p-2 mt-1">
            <p className="font-medium text-muted-foreground">Justificativa do atraso:</p>
            <p>{justificativaAtraso}</p>
          </div>
        )}
      </div>

      {gruposExtraidos.map((grupo) => {
        const beneficiario = beneficiarios.find((b) => b.id === grupo.beneficiarioId);
        return (
          <div key={grupo.beneficiarioId} className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-2">{beneficiario?.nome}</p>
            <dl className="space-y-1.5 text-sm">
              {grupo.campos.map((c) => (
                <div key={c.chave} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{chaveLabels[c.chave]}</dt>
                  <dd className="font-medium text-right">{c.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

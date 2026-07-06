import {
  DOCUMENTOS_POR_TIPO_DEPENDENTE,
  REGRA_POR_TIPO_DEPENDENTE,
  type TipoDependente,
} from "@/lib/form-options";
import { Field } from "@/components/Stepper";
import { UploadBox } from "@/routes/servidor.requerimento.novo-plano";

/** Lista informativa de documentos obrigatórios (etapa de cadastro). */
export function DocumentosDependenteLista({
  tipo,
  className = "text-[10px]",
}: {
  tipo: TipoDependente;
  className?: string;
}) {
  const docs = DOCUMENTOS_POR_TIPO_DEPENDENTE[tipo];
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 ${className}`}>
      <p className="font-semibold mb-1">Documentos obrigatórios:</p>
      <ul className="list-disc ml-4 space-y-0.5">
        {docs.map((doc) => (
          <li key={doc}>{doc}</li>
        ))}
      </ul>
    </div>
  );
}

/** Regra complementar + lista de documentos conforme o tipo selecionado. */
export function OrientacaoTipoDependente({ tipo }: { tipo: TipoDependente }) {
  const regra = REGRA_POR_TIPO_DEPENDENTE[tipo];
  return (
    <div className="space-y-2">
      {regra && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p>{regra}</p>
        </div>
      )}
      <DocumentosDependenteLista tipo={tipo} className="text-xs" />
    </div>
  );
}

/** Campos de upload conforme o tipo de dependente (etapa de documentos). */
export function DocumentosDependenteUploads({ tipo }: { tipo: TipoDependente }) {
  const docs = DOCUMENTOS_POR_TIPO_DEPENDENTE[tipo];
  return (
    <>
      {docs.map((doc) => (
        <Field key={doc} label={doc} required>
          <UploadBox />
        </Field>
      ))}
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Eye
} from "lucide-react";
import { Field, inputCls } from "@/components/Stepper";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";

export const Route = createFileRoute("/associacao/upload")({
  component: UploadPlanilha,
});

// "não_cadastrado" foi condensado em "não_elegível": se o CPF do titular e/ou do
// beneficiário não bate com a base cadastral, ou se o vínculo não é previsto pelo
// Pró-Saúde, o resultado prático é o mesmo — a pessoa não é elegível ao ressarcimento. Um
// dependente com vínculo fora das regras nem estaria cadastrado, então tratar os dois casos
// como categorias separadas não agregava. Ver docs/MODULO_RELATORIOS.md.
type ValidationStatus = "válido" | "atenção" | "não_elegível";

interface RegistroPlanilha {
  servidor: string;
  /** CPF do servidor titular — chave de conferência com o cadastro. Associações não têm
   *  acesso à matrícula do DETRAN, então a matrícula deixou de ser usada aqui (pedido da
   *  stakeholder). */
  cpfTitular: string;
  beneficiario: string;
  cpf: string;
  vinculo: string;
  valor: number;
  status: ValidationStatus;
  motivo?: string;
}

function UploadPlanilha() {
  const [step, setStep] = useState<"upload" | "conferencia" | "sucesso">("upload");
  const [competencia, setCompetencia] = useState("05/2026");

  const dadosSimulados: RegistroPlanilha[] = [
    { servidor: "João da Silva", cpfTitular: "123.456.789-00", beneficiario: "João da Silva", cpf: "123.***.***-00", vinculo: "Titular", valor: 1200, status: "válido" },
    { servidor: "João da Silva", cpfTitular: "123.456.789-00", beneficiario: "Ana da Silva", cpf: "234.***.***-11", vinculo: "Cônjuge", valor: 890, status: "válido" },
    { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "Maria Oliveira", cpf: "345.***.***-22", vinculo: "Titular", valor: 1800, status: "válido" },
    { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "José Oliveira", cpf: "", vinculo: "Pai", valor: 1100, status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
    { servidor: "Ricardo Mendes", cpfTitular: "456.789.012-33", beneficiario: "", cpf: "456.789.012-33", vinculo: "Titular", valor: 950, status: "atenção", motivo: "Nome do beneficiário não informado" },
    { servidor: "Ricardo Mendes", cpfTitular: "456.789.012-33", beneficiario: "Beatriz Mendes", cpf: "567.***.***-44", vinculo: "Mãe", valor: 950, status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
    { servidor: "Fernando Diniz", cpfTitular: "111.222.333-44", beneficiario: "Fernando Diniz", cpf: "111.***.***-44", vinculo: "Titular", valor: 900, status: "não_elegível", motivo: "CPF do titular e do beneficiário não encontrados no cadastro do Pró-Saúde" },
  ];

  const totalRegistros = dadosSimulados.length;
  const validos = dadosSimulados.filter(d => d.status === "válido").length;
  const atencao = dadosSimulados.filter(d => d.status === "atenção").length;
  const naoElegiveis = dadosSimulados.filter(d => d.status === "não_elegível").length;
  const registrosComPendencia = totalRegistros - validos;
  const podeEnviar = registrosComPendencia === 0;
  const valorTotal = dadosSimulados.reduce((acc, curr) => acc + curr.valor, 0);
  const valorConsiderado = dadosSimulados.filter(d => d.status === "válido").reduce((acc, curr) => acc + curr.valor, 0);

  if (step === "sucesso") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Solicitação enviada com sucesso!</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500 uppercase font-semibold">Status:</span>
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-[#fff7ed] text-[#d75c00] border border-[#ffedd5]">
              Em análise
            </span>
          </div>
        </div>
        <p className="max-w-md text-slate-600 leading-relaxed">
          A planilha foi enviada para conferência da GERDAB. Os registros sinalizados com atenção ou não elegíveis poderão ser revisados pela equipe responsável.
        </p>
        <button 
          onClick={() => setStep("upload")}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition shadow-md"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Upload de Planilha Mensal</h1>
        <p className="text-slate-500 mt-1">
          Envie a planilha mensal de pagamentos conforme o modelo padronizado do Pró-Saúde.
          <br />
          <strong className="text-primary">Nota:</strong> A própria planilha enviada representa e substitui os comprovantes mensais individuais.
        </p>
      </header>

      {step === "upload" && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> Selecionar Arquivo
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Competência" required>
                    <input className={inputCls} type="month" value="2026-05" onChange={e => setCompetencia(e.target.value)} />
                  </Field>
                  <Field label="Associação" required>
                    <select className={inputCls}>
                      <option>Assefaz</option>
                      <option>Assetran</option>
                    </select>
                  </Field>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:bg-slate-50 transition cursor-pointer group">
                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                    <FileSpreadsheet className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Arraste a planilha ou clique para selecionar</p>
                  <p className="text-xs text-slate-400 mt-1">Formatos aceitos: .xlsx ou .csv</p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1">Só envie quem já está cadastrado:</p>
                    <p>
                      A planilha é conferida linha a linha contra o cadastro do sistema, usando o CPF do
                      servidor titular e o CPF do beneficiário (a associação não tem acesso à matrícula do
                      DETRAN, então a matrícula não é mais usada como chave). Pessoas que não se enquadram
                      nas regras do Pró-Saúde (pais, mães, irmãos ou outros vínculos não previstos) ou que não
                      forem encontradas no cadastro aparecerão como pendência na conferência e o envio para a
                      GERDAB só é liberado quando todos os registros estiverem válidos.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setStep("conferencia")}
                  className="w-full bg-primary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-lg shadow-primary/20"
                >
                  <Eye className="h-4 w-4" /> Pré-visualizar dados
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Histórico de Envios</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 font-semibold text-slate-500">Competência</th>
                      <th className="text-left py-3 font-semibold text-slate-500">Data</th>
                      <th className="text-left py-3 font-semibold text-slate-500">Registros</th>
                      <th className="text-left py-3 font-semibold text-slate-500">Status</th>
                      <th className="text-right py-3 font-semibold text-slate-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr>
                      <td className="py-3 font-medium">04/2026</td>
                      <td className="py-3 text-slate-500">10/04/2026</td>
                      <td className="py-3">152</td>
                      <td className="py-3"><StatusBadge status="aprovado" /></td>
                      <td className="py-3 text-right"><button className="text-primary hover:underline font-medium">Detalhes</button></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium">03/2026</td>
                      <td className="py-3 text-slate-500">08/03/2026</td>
                      <td className="py-3">148</td>
                      <td className="py-3"><StatusBadge status="aprovado" /></td>
                      <td className="py-3 text-right"><button className="text-primary hover:underline font-medium">Detalhes</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-primary-light">
                <Download className="h-5 w-5" /> Modelo de Planilha
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Envie uma planilha só com os campos essenciais para a conferência, sem colunas
                desnecessárias.
              </p>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-slate-700">
                <Download className="h-4 w-4" /> Baixar Modelo (.xlsx)
              </button>

              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Campos esperados na planilha</p>
                <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-300">
                  {[
                    "Nome do Beneficiário",
                    "Titular",
                    "CPFs (Titular e Beneficiário)",
                    "Valor",
                    "Vínculo",
                  ].map(col => (
                    <div key={col} className="flex items-center gap-2">
                      <div className="h-1 w-1 bg-primary rounded-full" />
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex gap-2 text-[11px] text-slate-400 leading-relaxed">
                <Info className="h-3.5 w-3.5 text-primary-light shrink-0 mt-0.5" />
                <p>
                  Em breve, um modelo <strong className="text-slate-300">.xlsx</strong> oficial vai documentar esse
                  padrão em detalhe, e a conferência passará a validar os campos automaticamente por{" "}
                  <strong className="text-slate-300">OCR</strong>. Por enquanto, a estrutura acima é o que já
                  esperamos de cada envio.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "conferencia" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Visão macro — é a visão primária da conferência. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CardResumo label="Total de Registros" value={totalRegistros} icon={FileSpreadsheet} color="slate" />
            <CardResumo label="Válidos" value={validos} icon={CheckCircle2} color="green" />
            <CardResumo label="Com Atenção" value={atencao} icon={AlertCircle} color="amber" />
            <CardResumo label="Não Elegíveis" value={naoElegiveis} icon={XCircle} color="red" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" /> Conferência da Planilha
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {podeEnviar ? (
                    <span className="text-green-700 font-medium">Todos os {totalRegistros} registros estão válidos.</span>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-900">{validos} de {totalRegistros}</span> registros válidos.{" "}
                      Corrija <span className="font-semibold text-red-600">{registrosComPendencia} linha{registrosComPendencia > 1 ? "s" : ""}</span> antes de enviar.
                    </>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Valor Considerado (Pró-Saúde)</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(valorConsiderado)}</p>
              </div>
            </div>

            {/* Detalhamento linha a linha — só os registros com pendência, para facilitar a correção
                sem precisar rolar os que já estão válidos. */}
            {registrosComPendencia > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-left">
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Servidor (Titular)</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Beneficiário</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Vínculo</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Valor</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dadosSimulados.filter((item) => item.status !== "válido").map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{item.servidor}</p>
                          <p className="text-xs text-slate-500">CPF: {item.cpfTitular}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{item.beneficiario}</p>
                          <p className="text-xs text-slate-500">{item.cpf || "CPF ausente"}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item.vinculo}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(item.valor)}</td>
                        <td className="px-6 py-4">
                          <BadgeStatus status={item.status} motivo={item.motivo} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                Nenhuma pendência. Todos os registros já estão válidos.
              </div>
            )}

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <button
                onClick={() => setStep("upload")}
                className="text-slate-600 font-medium flex items-center gap-2 hover:text-slate-900"
              >
                <RotateCcw className="h-4 w-4" /> Voltar e substituir planilha
              </button>
              <div className="text-right">
                <button
                  onClick={() => setStep("sucesso")}
                  disabled={!podeEnviar}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-primary ml-auto"
                >
                  Enviar para análise da GERDAB <ArrowRight className="h-4 w-4" />
                </button>
                {!podeEnviar && (
                  <p className="text-xs text-slate-500 mt-2 max-w-xs">
                    O envio só é liberado quando todos os registros estiverem válidos. Corrija ou remova as {registrosComPendencia} linhas sinalizadas acima e reenvie a planilha.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardResumo({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: "slate" | "green" | "amber" | "red" }) {
  const colors = {
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} space-y-2 bg-white`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</span>
        <Icon className="h-4 w-4 opacity-50" />
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

function BadgeStatus({ status, motivo }: { status: ValidationStatus, motivo?: string }) {
  const config = {
    válido: { label: "Válido", cls: "bg-green-100 text-green-700" },
    atenção: { label: "Atenção", cls: "bg-amber-100 text-amber-700" },
    não_elegível: { label: "Não Elegível", cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-1">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config[status].cls}`}>
        {config[status].label}
      </span>
      {motivo && <p className="text-[10px] text-slate-500 italic max-w-[150px]">{motivo}</p>}
    </div>
  );
}

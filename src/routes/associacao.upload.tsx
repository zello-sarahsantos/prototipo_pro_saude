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
import { formatCurrency } from "@/lib/mock-data";
import { PlanilhaStatusBadge } from "@/components/PlanilhaStatusBadge";
import {
  registrosPlanilhaExemplo,
  registrosValidosExemplo,
  getPlanilhaAssociacao,
  listarPlanilhasPorAssociacao,
  enviarPlanilhaAssociacao,
  statusAtualPlanilha,
  versaoVigente,
  COLUNAS_MODELO_PLANILHA,
  type RegistroPlanilhaAssociacao,
} from "@/lib/planilhas-associacao";

export const Route = createFileRoute("/associacao/upload")({
  component: UploadPlanilha,
});

// "não_cadastrado" foi condensado em "não_elegível": se o CPF do titular e/ou do
// beneficiário não bate com a base cadastral, ou se o vínculo não é previsto pelo
// Pró-Saúde, o resultado prático é o mesmo — a pessoa não é elegível ao ressarcimento. Um
// dependente com vínculo fora das regras nem estaria cadastrado, então tratar os dois casos
// como categorias separadas não agregava. Ver docs/MODULO_RELATORIOS.md.
type ValidationStatus = RegistroPlanilhaAssociacao["status"];

function UploadPlanilha() {
  const [step, setStep] = useState<"upload" | "conferencia" | "sucesso">("upload");
  const [competencia, setCompetencia] = useState("2026-05");
  const [associacao, setAssociacao] = useState("Assefaz");
  const [baixandoModelo, setBaixandoModelo] = useState(false);

  // Estado real da competência selecionada para esta associação — nunca mockado: reflete o que
  // já foi persistido em `prosaude-storage.ts` (P6). Determina se um novo envio é permitido:
  // liberado quando não existe planilha ainda, ou quando a vigente está "Correção Solicitada"
  // (reenvio); bloqueado quando já está "Em Análise", "Aprovada" ou "Negada" — "Negar" é sempre
  // terminal, mesmo precedente já usado no fluxo de comprovante individual ("Recusar é sempre
  // terminal; apenas Solicitar Correção permite reenvio", docs/MODULO_PAGAMENTO.md §3.15).
  const planilhaExistente = getPlanilhaAssociacao(associacao, competencia);
  const statusExistente = planilhaExistente ? statusAtualPlanilha(planilhaExistente) : undefined;
  const ehReenvio = statusExistente === "correcao_solicitada";
  const podeEnviarNestaCompetencia = !planilhaExistente || ehReenvio;
  const justificativaCorrecao = ehReenvio ? versaoVigente(planilhaExistente!).decisao?.justificativa : undefined;

  // Mesmo conteúdo de exemplo já validado no protótipo (3 válidos, 1 atenção, 3 não elegíveis),
  // agora centralizado em `planilhas-associacao.ts` — a leitura real do arquivo `.xlsx`/`.csv`
  // continua não implementada nesta rodada (persistência do fluxo é real; parsing, não). Como
  // este conjunto fixo nunca chega sozinho a 100% válido (é usado justamente para demonstrar o
  // bloqueio da HU01), um reenvio pós-correção usa só o subconjunto já válido — representando a
  // planilha já corrigida pela associação — para que o fluxo de reenvio (P6) seja demonstrável de
  // ponta a ponta, sem inventar conteúdo novo (é o mesmo subconjunto já existente no protótipo).
  const dadosSimulados = ehReenvio ? registrosValidosExemplo : registrosPlanilhaExemplo;

  const totalRegistros = dadosSimulados.length;
  const validos = dadosSimulados.filter(d => d.status === "válido").length;
  const atencao = dadosSimulados.filter(d => d.status === "atenção").length;
  const naoElegiveis = dadosSimulados.filter(d => d.status === "não_elegível").length;
  const registrosComPendencia = totalRegistros - validos;
  const podeEnviar = registrosComPendencia === 0;
  const valorConsiderado = dadosSimulados.filter(d => d.status === "válido").reduce((acc, curr) => acc + curr.valor, 0);

  const historicoAssociacao = listarPlanilhasPorAssociacao(associacao);

  function handleEnviar() {
    const registrosValidos = dadosSimulados.filter((d) => d.status === "válido");
    enviarPlanilhaAssociacao(associacao, competencia, registrosValidos);
    setStep("sucesso");
  }

  // Modelo em branco (docs/modelo_envio_mensal_associacoes.xlsx) — gerado em código a partir da
  // mesma fonte única de colunas usada pela reconstrução da GERDAB (`planilha-arquivo-versao.ts`),
  // eliminando a divergência entre "o que o modelo anuncia" e "o que a GERDAB baixa depois".
  async function handleBaixarModelo() {
    setBaixandoModelo(true);
    try {
      const [{ buildModeloEnvioBlob }, { baixarBlob }] = await Promise.all([
        import("@/lib/planilha-modelo"),
        import("@/lib/relatorio-export"),
      ]);
      const blob = await buildModeloEnvioBlob();
      baixarBlob(blob, "modelo_envio_mensal_associacoes.xlsx");
    } finally {
      setBaixandoModelo(false);
    }
  }

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
            {/* Estado real da competência selecionada — nunca mockado (P6). */}
            {statusExistente && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4 flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {competencia.split("-").reverse().join("/")} • {associacao}
                    </span>
                    <PlanilhaStatusBadge status={statusExistente} />
                  </div>
                  {statusExistente === "em_analise" && (
                    <p className="text-xs text-muted-foreground">
                      Esta competência já foi enviada e está em análise pela GERDAB. Aguarde a decisão antes de um novo envio.
                    </p>
                  )}
                  {statusExistente === "aprovada" && (
                    <p className="text-xs text-muted-foreground">
                      Esta competência já foi aprovada pela GERDAB.
                    </p>
                  )}
                  {statusExistente === "negada" && (
                    <p className="text-xs text-muted-foreground">
                      Esta competência foi negada pela GERDAB
                      {versaoVigente(planilhaExistente!).decisao?.justificativa &&
                        ` — "${versaoVigente(planilhaExistente!).decisao?.justificativa}"`}.
                    </p>
                  )}
                  {ehReenvio && (
                    <div className="pendency-banner mt-1">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>GERDAB solicitou correção:</strong> {justificativaCorrecao}
                        <br />
                        Corrija o arquivo e reenvie abaixo — o novo envio volta para "Em Análise".
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> Selecionar Arquivo
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Competência" required>
                    <input className={inputCls} type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} />
                  </Field>
                  {/* Regra de acesso a formalizar em produção (não implementada nesta rodada, registrada
                      aqui explicitamente): a associação deve ser determinada pelo usuário autenticado,
                      nunca escolhida livremente — ASSETRAN só acessa envio/histórico/decisões da
                      ASSETRAN, ASSEFAZ só os da ASSEFAZ, sem nenhuma associação enxergar a outra. Este
                      <select> é só um recurso de navegação/demonstração entre cenários do protótipo, não
                      representa o comportamento definitivo de produção — não remover nesta rodada, mas
                      nunca tratar como especificação de acesso real. */}
                  <Field label="Associação" required>
                    <select className={inputCls} value={associacao} onChange={e => setAssociacao(e.target.value)}>
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
                  disabled={!podeEnviarNestaCompetencia}
                  className="w-full bg-primary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Eye className="h-4 w-4" /> {ehReenvio ? "Pré-visualizar dados (reenvio)" : "Pré-visualizar dados"}
                </button>
                {!podeEnviarNestaCompetencia && (
                  <p className="text-xs text-slate-500 text-center -mt-3">
                    Selecione outra competência para enviar uma nova planilha.
                  </p>
                )}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historicoAssociacao.map((p) => {
                      const v = versaoVigente(p);
                      return (
                        <tr key={p.id}>
                          <td className="py-3 font-medium">{p.competencia.split("-").reverse().join("/")}</td>
                          <td className="py-3 text-slate-500">{new Date(v.enviadoEm).toLocaleDateString("pt-BR")}</td>
                          <td className="py-3">{v.registros.length}</td>
                          <td className="py-3"><PlanilhaStatusBadge status={statusAtualPlanilha(p)} /></td>
                        </tr>
                      );
                    })}
                    {historicoAssociacao.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Nenhum envio registrado ainda para {associacao}.
                        </td>
                      </tr>
                    )}
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
                Modelo oficial aprovado — mesma estrutura que a GERDAB usa para conferir e baixar
                cada versão do seu envio.
              </p>
              <button
                onClick={handleBaixarModelo}
                disabled={baixandoModelo}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {baixandoModelo ? "Gerando modelo…" : "Baixar Modelo (.xlsx)"}
              </button>

              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Campos esperados na planilha</p>
                <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-300">
                  {COLUNAS_MODELO_PLANILHA.map(col => (
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
                  A Competência não é uma coluna do arquivo — ela é selecionada obrigatoriamente ao lado, e
                  identifica o envio junto com a Associação. A conferência automática dos campos por{" "}
                  <strong className="text-slate-300">OCR</strong> continua não implementada nesta rodada —
                  a estrutura acima é o que já esperamos de cada envio.
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
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Valor Mensal Individual (R$)</th>
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
                  onClick={handleEnviar}
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

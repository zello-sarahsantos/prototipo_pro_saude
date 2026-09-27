import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Info, Upload } from "lucide-react";
import { Field, FormError, inputCls } from "@/components/Stepper";
import { formatCompetencia, formatCurrency } from "@/lib/mock-data";
import { temPeloMenosNPalavras } from "@/lib/validation-pagamento";
import {
  getAssociacaoModelo,
  getColunasModelo,
  getNomeArquivoModelo,
  ASSOCIACOES_MODELO,
  ROTULO_PLANO_POR_ASSOCIACAO,
  type AssociacaoModelo,
} from "@/lib/planilhas-associacao";
import { enviarRetroativoAssociacao, lerPlanilhaRetroativa, listarEnviosPlanilhaAssociacao, obterArquivoPlanilhaOriginal, type ResultadoLeituraRetroativa } from "@/lib/planilha-retroativa";
import { lerArquivoComoDataUrl } from "@/lib/retroativo-fluxo";
import { PlanilhaCompleta } from "@/components/PlanilhaRetroativaVisao";
import { estaAutorizada, getEstadoCompetencia, getSolicitacoesRetroativas, MOTIVOS_RESSARCIMENTO, type CompetenciaRetroativa, type SolicitacaoRetroativa } from "@/lib/ressarcimento-retroativo";

export const Route = createFileRoute("/associacao/retroativo")({
  component: AssociacaoRetroativo,
});

/**
 * Envio retroativo das associações (Fase 6, ata 22/09/2026, seção 3.9): área própria, modelo
 * retroativo por associação, validação em duas camadas antes do envio (estrutura do cabeçalho e
 * conteúdo linha a linha) e consolidação por Titular + Competência. A associação nunca informa
 * Valor Pago, Valor Devido, matrícula nem Mês/Ano de Pagamento; a autorização financeira é a
 * habilitação do titular + competência pela GERDAB, depois de apurada.
 *
 * O seletor de associação simula a associação autenticada (em produção ela é fixada pelo login);
 * motivo/justificativa por envio seguem o motor da Fase 1 (motivo único por envio é suposição
 * sinalizada, pendência com a stakeholder).
 */
function AssociacaoRetroativo() {
  const [associacao, setAssociacao] = useState<AssociacaoModelo>("Assefaz");
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [instancia, setInstancia] = useState("");
  const [referenciaAto, setReferenciaAto] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [arquivoAtual, setArquivoAtual] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoLeituraRetroativa | null>(null);
  const [enviado, setEnviado] = useState<number | null>(null);
  const [versao, setVersao] = useState(0);
  const [baixando, setBaixando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const rotuloPlano = ROTULO_PLANO_POR_ASSOCIACAO[associacao];
  const excepcional = motivo === "autorizacao_excepcional";
  const justificativaOk = temPeloMenosNPalavras(justificativa);
  const motivoOk = !!motivo && justificativaOk && (!excepcional || (instancia.trim() !== "" && referenciaAto.trim() !== ""));
  const arquivoOk = !!resultado && resultado.estruturaValida && resultado.erros.length === 0 && resultado.registros.length > 0;

  function limparArquivo() {
    setResultado(null);
    setNomeArquivo("");
    setArquivoAtual(null);
    if (inputArquivo.current) inputArquivo.current.value = "";
  }

  function trocarAssociacao(a: AssociacaoModelo) {
    setAssociacao(a);
    limparArquivo();
    setEnviado(null);
  }

  async function baixarModelo() {
    setBaixando(true);
    try {
      const [{ buildModeloBlob }, { baixarBlob }] = await Promise.all([import("@/lib/planilha-modelo"), import("@/lib/relatorio-export")]);
      baixarBlob(await buildModeloBlob(associacao, "retroativo"), getNomeArquivoModelo(associacao, "retroativo"));
    } finally {
      setBaixando(false);
    }
  }

  async function aoEscolherArquivo(arquivo: File | undefined) {
    setEnviado(null);
    if (!arquivo) return limparArquivo();
    setNomeArquivo(arquivo.name);
    setArquivoAtual(arquivo);
    setLendo(true);
    try {
      setResultado(await lerPlanilhaRetroativa(await arquivo.arrayBuffer(), associacao));
    } finally {
      setLendo(false);
    }
  }

  async function enviar() {
    if (!arquivoOk || !motivoOk || !resultado) return;
    // Protótipo: guarda o conteúdo do arquivo (até um limite) para poder baixar o original depois.
    const arquivo = arquivoAtual ? { nome: arquivoAtual.name, conteudo: await lerArquivoComoDataUrl(arquivoAtual) } : undefined;
    const criadas = enviarRetroativoAssociacao({
      arquivo,
      associacao,
      registros: resultado.registros,
      motivo,
      justificativa,
      autorizacaoExcepcional: excepcional ? { instancia: instancia.trim(), referenciaDocumento: referenciaAto.trim() } : undefined,
    });
    setEnviado(criadas.reduce((n, s) => n + s.competencias.length, 0));
    limparArquivo();
    setVersao((v) => v + 1);
  }

  // Acompanhamento — só os envios da associação autenticada (nunca a outra). Lido em efeito: o
  // estado vive no `localStorage`, ausente na renderização de servidor (evita divergência de hidratação).
  const [envios, setEnvios] = useState<{ s: SolicitacaoRetroativa; c: CompetenciaRetroativa }[]>([]);
  const [planilhaAberta, setPlanilhaAberta] = useState<string | null>(null);
  const [planilhas, setPlanilhas] = useState<ReturnType<typeof listarEnviosPlanilhaAssociacao>>([]);
  useEffect(() => {
    setPlanilhas(listarEnviosPlanilhaAssociacao(associacao));
    setEnvios(
      getSolicitacoesRetroativas()
        .filter((s) => s.origem === "associacao" && s.associacao === associacao)
        .flatMap((s) => s.competencias.map((c) => ({ s, c }))),
    );
  }, [associacao, versao]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Envio retroativo</h1>
        <p className="text-sm text-slate-600">
          Envie a planilha retroativa da associação, com uma linha por beneficiário e por mês de referência.
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Simula a associação autenticada — em produção é determinada pelo login, nunca escolhida. */}
        <Field label="Associação" required>
          <select className={inputCls} value={associacao} onChange={(e) => trocarAssociacao(e.target.value as AssociacaoModelo)}>
            {ASSOCIACOES_MODELO.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold">1. Baixe o modelo retroativo da {associacao.toUpperCase()}</p>
          <p className="text-xs text-slate-600">
            Colunas: {getColunasModelo(associacao, "retroativo").join(" | ")}. A coluna <strong>Valor</strong> é o valor da
            cobrança/plano da linha, sem juros. O <strong>Mês/Ano de Referência</strong> vai como texto <strong>MM/AAAA</strong>.
            Identificação do plano: <strong>{rotuloPlano}</strong>.
          </p>
          <button
            onClick={baixarModelo}
            disabled={baixando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {baixando ? "Gerando modelo…" : "Baixar Modelo Retroativo (.xlsx)"}
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold">2. Informe o motivo</p>
          <Field label="Motivo do ressarcimento" required>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
              <option value="">Selecione…</option>
              {Object.entries(MOTIVOS_RESSARCIMENTO).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>{rotulo}</option>
              ))}
            </select>
          </Field>
          <Field label={motivo === "outros" ? "Descreva o motivo" : "Justificativa"} required>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Explique o motivo do envio (mínimo 3 palavras)…"
              className={inputCls}
            />
            {justificativa.trim() !== "" && !justificativaOk && <FormError message="Informe ao menos 3 palavras." />}
          </Field>
          {excepcional && (
            <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3">
              <Field label="Instância autorizadora" required>
                <input value={instancia} onChange={(e) => setInstancia(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Referência ao ato/documento autorizativo" required>
                <input value={referenciaAto} onChange={(e) => setReferenciaAto(e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">3. Envie a planilha preenchida</p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-600">{nomeArquivo || "Selecione o arquivo .xlsx (modelo retroativo)"}</span>
            <input
              ref={inputArquivo}
              type="file"
              accept=".xlsx"
              className="sr-only"
              aria-label="Arquivo da planilha retroativa"
              onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
            />
          </label>
          {lendo && <p className="text-sm text-slate-500">Validando o arquivo…</p>}
        </div>
      </section>

      {resultado && !lendo && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" aria-live="polite">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Conferência da planilha
          </h2>

          {!resultado.estruturaValida && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm space-y-1" role="alert">
              <p className="font-semibold text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Estrutura do arquivo não confere com o modelo da {associacao.toUpperCase()}</p>
              <ul className="list-disc pl-5 text-red-700">
                {resultado.problemasEstrutura.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}

          {resultado.estruturaValida && resultado.erros.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-semibold">{resultado.linhasValidas} de {resultado.totalLinhas}</span> linhas válidas. Corrija as
                pendências abaixo e envie o arquivo novamente — o envio só é aceito com 100% das linhas válidas.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr><th className="text-left px-3 py-2 w-24">Linha</th><th className="text-left px-3 py-2">Pendência</th></tr>
                  </thead>
                  <tbody>
                    {resultado.erros.map((e, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2">{e.linha === 0 ? "—" : e.linha}</td>
                        <td className="px-3 py-2 text-red-700">{e.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {arquivoOk && (
            <div className="space-y-3">
              <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Todas as {resultado.totalLinhas} linhas estão válidas — {resultado.registros.length} registro(s) por titular e mês.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2">Servidor/Titular</th>
                      <th className="text-left px-3 py-2">Mês/Ano de Referência</th>
                      <th className="text-right px-3 py-2">Beneficiários</th>
                      <th className="text-right px-3 py-2">Valor (cobrança, sem juros)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.registros.map((r) => (
                      <tr key={`${r.cpfTitular}-${r.competencia}`} className="border-t border-slate-100">
                        <td className="px-3 py-2"><p className="font-medium">{r.nomeTitular}</p><p className="text-xs text-slate-500">CPF: {r.cpfTitular}</p></td>
                        <td className="px-3 py-2">{formatCompetencia(r.competencia)}</td>
                        <td className="px-3 py-2 text-right">{r.composicao.length}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(r.valorCobranca)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 flex gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Cada mês permanece em registro próprio (nunca somado). Dependentes compõem o registro do titular, sem lançamento
                independente.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={enviar}
              disabled={!arquivoOk || !motivoOk}
              className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar retroativo
            </button>
          </div>
          {arquivoOk && !motivoOk && <p className="text-xs text-amber-700 text-right">Preencha o motivo e a justificativa (passo 2) para enviar.</p>}
        </section>
      )}

      {enviado !== null && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          Envio retroativo registrado: {enviado} registro(s) por titular e mês em análise pela GERDAB.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Planilhas enviadas — {associacao}</h2>
        </div>
        {planilhas.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500 text-center">Nenhuma planilha retroativa enviada por {associacao}.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {planilhas.map(({ planilha, titulares, competencias }) => (
              <li key={planilha.id} className="px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{planilha.nome}</span>
                <span className="text-slate-500">Enviada em {new Date(planilha.enviadoEm).toLocaleDateString("pt-BR")} · {titulares} titular(es) · {competencias} competência(s)</span>
                <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => setPlanilhaAberta(planilhaAberta === planilha.id ? null : planilha.id)}
                  aria-expanded={planilhaAberta === planilha.id}
                  className="inline-flex items-center gap-1.5 text-xs border border-slate-200 rounded-md px-2.5 py-1.5 hover:bg-slate-50"
                >
                  {planilhaAberta === planilha.id ? "Ocultar planilha" : "Visualizar planilha"}
                </button>
                <button
                  onClick={async () => {
                    const arq = await obterArquivoPlanilhaOriginal(planilha.id);
                    if (!arq) return;
                    const { baixarBlob } = await import("@/lib/relatorio-export");
                    baixarBlob(arq.blob, arq.nome);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs border border-slate-200 rounded-md px-2.5 py-1.5 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar planilha original
                </button>
                </div>
                {planilhaAberta === planilha.id && (
                  <div className="basis-full pt-2">
                    <PlanilhaCompleta arquivoId={planilha.id} associacao={associacao} />
                    <p className="text-[11px] text-slate-500 mt-1">Protótipo: visualização simulada a partir dos registros normalizados; em produção usa o XLSX enviado e armazenado.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Envios retroativos — {associacao}</h2>
        </div>
        {envios.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500 text-center">Nenhum envio retroativo registrado para {associacao}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Servidor/Titular</th>
                  <th className="text-left px-4 py-2">Mês/Ano de Referência</th>
                  <th className="text-right px-4 py-2">Valor (cobrança)</th>
                  <th className="text-left px-4 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {envios.map(({ s, c }) => {
                  const estado = getEstadoCompetencia(s.origem, c);
                  const ultima = c.decisoes[c.decisoes.length - 1];
                  return (
                    <tr key={`${s.id}-${c.competenciaReferencia}`} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-2"><p className="font-medium">{s.nomeTitular}</p><p className="text-xs text-slate-500">CPF: {s.cpfTitular}</p></td>
                      <td className="px-4 py-2">{formatCompetencia(c.competenciaReferencia)}</td>
                      <td className="px-4 py-2 text-right">{c.valorCobrancaInformado !== undefined ? formatCurrency(c.valorCobrancaInformado) : "—"}</td>
                      <td className="px-4 py-2">
                        {estado === "desabilitado" ? (
                          <>
                            <span className="font-medium text-red-700">Não habilitado pela GERDAB</span>
                            {ultima?.justificativa && <p className="text-xs text-slate-600 mt-1">Justificativa: {ultima.justificativa}</p>}
                          </>
                        ) : estaAutorizada(s.origem, c) ? (
                          <span className="font-medium text-green-700">Habilitado para ressarcimento</span>
                        ) : (
                          <span className="font-medium text-amber-700">Em análise pela GERDAB</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

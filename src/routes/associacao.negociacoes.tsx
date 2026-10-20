import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Info, Loader2, Send } from "lucide-react";
import { AjudaArquivo, SeletorArquivo } from "@/components/negociacoes/ui";
import { getDataReferencia } from "@/lib/dias-uteis";
import { formatCompetencia } from "@/lib/mock-data";
import { ASSOCIACOES_ENVIO, ROTULO_SITUACAO_ENVIO, abrirArquivoEnvio, enviarRelatorioNegociacoes, listarEnvios, loadEnvios, type EnvioRelatorioNegociacao } from "@/lib/negociacoes-envios";
import { garantirMassaDemonstracaoEnvios } from "@/lib/massa-demonstracao-envios";

export const Route = createFileRoute("/associacao/negociacoes")({
  component: AssociacaoRelatorioNegociacoes,
});

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Relatório de Negociações (Área das Associações). A associação seleciona a competência, anexa o arquivo e confirma o
 * envio; a GERDAB consulta o mesmo arquivo e faz a conferência MANUAL. O envio não interpreta o arquivo, não confirma
 * pagamentos e não altera cálculos nem negociações. Cada envio é um registro independente.
 * O seletor de associação simula a associação autenticada (em produção vem do login).
 */
function AssociacaoRelatorioNegociacoes() {
  const ref = getDataReferencia();
  const competenciaInicial = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  const [associacao, setAssociacao] = useState<string>("Assefaz");
  const [competencia, setCompetencia] = useState(competenciaInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<EnvioRelatorioNegociacao | null>(null);
  const [envios, setEnvios] = useState<EnvioRelatorioNegociacao[]>([]);

  const recarregar = () => setEnvios(listarEnvios());
  useEffect(() => {
    recarregar();
    garantirMassaDemonstracaoEnvios().finally(recarregar);
    window.addEventListener("prosaude-negociacoes", recarregar);
    return () => window.removeEventListener("prosaude-negociacoes", recarregar);
  }, []);

  const meus = envios.filter((e) => e.associacao === associacao);

  async function enviar() {
    setErro("");
    setSucesso(null);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) return setErro("Informe a competência de referência.");
    if (!arquivo) return setErro("Selecione o arquivo do relatório.");
    setEnviando(true);
    try {
      const novo = await enviarRelatorioNegociacoes({ associacao, competencia, arquivo, enviadoPor: `${associacao.toUpperCase()} (associação)` });
      setSucesso(novo);
      setArquivo(null);
      recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o relatório.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Relatório de Negociações</h1>
        <p className="text-sm text-slate-500 mt-1">Envie à GERDAB o relatório mensal das negociações firmadas com os servidores. Esse envio é separado dos demais relatórios (mensal, inadimplentes e meses anteriores).</p>
      </header>

      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>O arquivo pode trazer dados de vários servidores. <strong>O envio não confirma pagamentos nem altera cálculos ou negociações</strong>: a GERDAB consulta o documento e faz a conferência manualmente. Cada envio é registrado de forma independente e começa como pendente de conferência.</p>
      </div>

      <section className="gd bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4" aria-labelledby="envio-titulo" style={{ scrollMarginTop: 16 }}>
        <h2 id="envio-titulo" className="text-lg font-semibold">Enviar relatório</h2>
        <div className="grid gap-4 sm:grid-cols-2 items-start">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
            <span>Associação <span className="font-normal">(simulação da associação autenticada)</span></span>
            <select value={associacao} onChange={(e) => { setAssociacao(e.target.value); setSucesso(null); setErro(""); }} className={campo}>
              {ASSOCIACOES_ENVIO.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
            <span>Competência de referência <span aria-hidden className="text-red-600">*</span></span>
            <input type="month" value={competencia} onChange={(e) => { setCompetencia(e.target.value); setSucesso(null); }} className={campo} />
          </label>
        </div>
        <div className="space-y-2">
          <SeletorArquivo id="neg-arquivo-associacao" rotulo="Arquivo do relatório" arquivo={arquivo} onChange={setArquivo} />
          <AjudaArquivo id="neg-arquivo-associacao" arquivo={arquivo} />
        </div>
        {erro && <p role="alert" className="text-sm font-medium text-red-700">{erro}</p>}
        {sucesso && (
          <p role="status" className="flex items-start gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> Relatório enviado em {dataHora(sucesso.enviadoEm)} — {formatCompetencia(sucesso.competencia)}. Situação: pendente de conferência pela GERDAB.
          </p>
        )}
        <div>
          <button type="button" onClick={enviar} disabled={enviando} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {enviando ? "Enviando…" : "Confirmar envio"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" aria-labelledby="hist-titulo">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 id="hist-titulo" className="text-lg font-semibold">Histórico de envios — {associacao.toUpperCase()}</h2>
        </div>
        {meus.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">Nenhum relatório de negociações enviado por {associacao.toUpperCase()}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="text-left px-4 py-2">Competência</th><th className="text-left px-4 py-2">Arquivo</th><th className="text-left px-4 py-2">Enviado em</th><th className="text-left px-4 py-2">Situação</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody>
                {meus.map((e) => {
                  const conferido = e.situacao === "conferido";
                  return (
                    <tr key={e.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-2.5 font-medium">{formatCompetencia(e.competencia)}</td>
                      <td className="px-4 py-2.5 break-all">{e.nomeArquivo}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{dataHora(e.enviadoEm)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${conferido ? "bg-green-100 text-green-800" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>{ROTULO_SITUACAO_ENVIO[e.situacao]}</span>
                        {e.situacao === "conferido" && e.conferidoPor && e.conferidoEm && <span className="block text-[11px] text-slate-500 mt-0.5">por {e.conferidoPor} em {dataHora(e.conferidoEm)}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button type="button" onClick={() => abrirArquivoEnvio(e, true)} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"><Download className="h-3.5 w-3.5" /> Baixar</button>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { personasDocumentos } from '@/lib/personas-documentos';
import { useMemo, useRef, useState } from "react";
import { RefreshCw, XCircle } from "lucide-react";
import { Stepper, StepNav } from "@/components/Stepper";
import { BeneficiarioSelector } from "@/components/BeneficiarioSelector";
import { ArquivosAnexadosUpload, type ArquivoComDocumentos } from "@/components/ArquivosAnexadosUpload";
import { ResumoPagamento } from "@/components/ResumoPagamento";
import { LendoComprovante, type EtapaLeitura } from "@/components/LendoComprovante";
import { ConferenciaBeneficiarios } from "@/components/ConferenciaBeneficiarios";
import { ConsolidadoCompetencia } from "@/components/ConsolidadoCompetencia";
import {
  beneficiariosPagamento,
  competenciaAtual,
  competenciasFechadas,
  formatCompetencia,
  formatCurrency,
  tiposDocumentoPorPlano,
  tipoPlanoPagamentoPadrao,
  type ArquivoAnexado,
  type Comprovante,
  type CampoExtraido,
} from "@/lib/mock-data";
import { mesclarCamposDeArquivos } from "@/lib/ocr-mock";
import { interpretarExtracaoIA, resultadosIA, camposPermitidos, camposParaPessoa } from "@/lib/ia-pagamento";
import { iniciarExtracao, aguardarExtracao, registrarEnvioTeste } from "@/lib/ia-cliente";
import {
  beneficiariosCobertosPeloDocumento,
  getCoberturaDocumental,
  todosContemplados,
  todosDocumentosComCoberturaDefinida,
} from "@/lib/comprovante-status";
import { temPeloMenosNPalavras } from "@/lib/validation-pagamento";
import { nomesIguais, nomeAbreviadoCompativel, nomeOCRCompativel } from "@/lib/validacao-leitura";
import {
  addComprovantePagamento,
  getComprovantesUnificados,
  saveConclusaoCompetencia,
  getBeneficiariosPagamentoAtual,
} from "@/lib/prosaude-storage";

const titularPagamento = beneficiariosPagamento.find((b) => b.parentesco === "Titular");

export const Route = createFileRoute("/servidor/pagamentos/enviar")({
  validateSearch: (search: Record<string, unknown>): { competencia?: string; beneficiario?: string } => ({
    competencia: typeof search.competencia === "string" ? search.competencia : undefined,
    beneficiario: typeof search.beneficiario === "string" ? search.beneficiario : undefined,
  }),
  component: EnviarComprovante,
});

type Step =
  | "selecao"
  | "upload"
  | "lendo"
  | "ilegivel"
  | "conferencia_beneficiarios"
  | "confirmar_documento"
  | "resumo_competencia";

const stepLabels = ["Beneficiários", "Documento", "Revisão", "Resumo"];

function stepIndex(step: Step): number {
  if (step === "selecao") return 0;
  if (step === "upload" || step === "lendo" || step === "ilegivel") return 1;
  if (step === "conferencia_beneficiarios") return 2;
  return 3;
}

function EnviarComprovante() {
  const [personaId, setPersonaId] = useState('');
  const persona = personasDocumentos.find(p => p.id === personaId);
  const search = Route.useSearch();
  const navigate = useNavigate();
  // Quando aberta a partir do alerta de "competência pendente", a competência vem preenchida e travada.
  const competenciaViaAlerta =
    search.competencia && competenciasFechadas.includes(search.competencia) ? search.competencia : undefined;
  const beneficiarioViaAlerta =
    search.beneficiario && beneficiariosPagamento.some((b) => b.id === search.beneficiario)
      ? search.beneficiario
      : undefined;

  const [step, setStep] = useState<Step>("selecao");
  const [travarCompetencia, setTravarCompetencia] = useState(!!competenciaViaAlerta);
  const [competencia, setCompetencia] = useState(competenciaViaAlerta ?? competenciaAtual);
  const [justificativaAtraso, setJustificativaAtraso] = useState("");
  const [justificativasDivergencia, setJustificativasDivergencia] = useState<Record<string, string>>({});
  const [operadoraDivergenteConfirmada, setOperadoraDivergenteConfirmada] = useState<Record<string, boolean>>({});
  const [beneficiariosSelecionados, setBeneficiariosSelecionados] = useState<string[]>(
    beneficiarioViaAlerta ? [beneficiarioViaAlerta] : [],
  );
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoComDocumentos[]>([]);
  const [arquivosIlegiveis, setArquivosIlegiveis] = useState<string[]>([]);
  const [tituloErro, setTituloErro] = useState('Não foi possível processar os documentos');
  const [gruposExtraidos, setGruposExtraidos] = useState<
    { beneficiarioId: string; campos: CampoExtraido[] }[]
  >([]);
  const [etapaLeitura, setEtapaLeitura] = useState<EtapaLeitura>(0);
  const [leituraConcluida, setLeituraConcluida] = useState(false);
  const [arquivosConcluidos, setArquivosConcluidos] = useState(0);
  const [refreshResumoKey, setRefreshResumoKey] = useState(0);
  const [salvandoEnvio, setSalvandoEnvio] = useState(false);
  const [erroSalvarEnvio, setErroSalvarEnvio] = useState('');
  const idEnvioPendente = useRef<string | null>(null);

  const comprovantesExistentes = useMemo(() => getComprovantesUnificados(), [step]);
  // Cadastro "atual" (seed + correções já aplicadas pela GERDAB) — garante que uma divergência
  // cadastral já resolvida não volte a ser sinalizada num novo envio deste beneficiário.
  const beneficiariosAtuais = useMemo(() => getBeneficiariosPagamentoAtual(), [step]);

  const isRetroativo = competencia !== competenciaAtual;
  const beneficiariosEscolhidos = beneficiariosAtuais.filter((b) =>
    beneficiariosSelecionados.includes(b.id),
  );
  // Modalidade do grupo selecionado determina os tipos de documento permitidos — não é mais
  // um valor único e global do sistema (ver mock-data.ts, BeneficiarioPagamento.modalidadePlano).
  const modalidadeDoGrupo = beneficiariosEscolhidos[0]?.modalidadePlano ?? tipoPlanoPagamentoPadrao;
  const tiposPermitidos = tiposDocumentoPorPlano[modalidadeDoGrupo];

  const podeAvancarSelecao =
    beneficiariosSelecionados.length > 0 && (!isRetroativo || temPeloMenosNPalavras(justificativaAtraso));
  const coberturaDocumental = getCoberturaDocumental(beneficiariosEscolhidos, arquivosSelecionados, modalidadeDoGrupo);
  const podeAvancarUpload =
    arquivosSelecionados.length > 0 &&
    todosContemplados(coberturaDocumental) &&
    todosDocumentosComCoberturaDefinida(arquivosSelecionados, beneficiariosEscolhidos.length);

  function iniciarProcessamento() {
    setTituloErro('Não foi possível processar os documentos');
    setStep("lendo");
    setEtapaLeitura(0);
    setLeituraConcluida(false);
    setArquivosConcluidos(0);
    setArquivosIlegiveis([]);

    setTimeout(() => {
      setEtapaLeitura(1);
      setTimeout(() => {
        setEtapaLeitura(2);
        setTimeout(async () => {
          const todosIds = beneficiariosEscolhidos.map((b) => b.id);
          try {
          const leituras = new Map<File, Promise<CampoExtraido[]>>();
          // Primeiro envia todos os documentos separadamente e recebe seus IDs.
          // Depois acompanha cada execução em paralelo; a fila controla a carga do modelo.
          const iniciadas = await Promise.allSettled(arquivosSelecionados.map(async (a) => {
            resultadosIA.delete(a.file);
            const tiposDoArquivo = a.documentos.map(d => d.tipo);
            if (tiposDoArquivo.length !== 1) {
              throw new Error('Cada arquivo deve ter exatamente um tipo documental. Separe boleto, comprovante e demais documentos em arquivos distintos.');
            }
            return iniciarExtracao(a.file, tiposDoArquivo[0], beneficiariosEscolhidos, competencia);
          }));
          const respostas: PromiseSettledResult<CampoExtraido[]>[] = await Promise.all(arquivosSelecionados.map(async (a, indice) => {
            try {
              const iniciada = iniciadas[indice];
              if (iniciada.status === 'rejected') return { status: 'rejected', reason: iniciada.reason };
              const { id, resultado } = await aguardarExtracao(iniciada.value);
              const campos = interpretarExtracaoIA(a.file, a.documentos.map(d => d.tipo), beneficiariosEscolhidos, id, resultado);
              leituras.set(a.file, Promise.resolve(campos));
              return { status: 'fulfilled', value: campos };
            } catch (reason) {
              return { status: 'rejected', reason };
            } finally {
              setArquivosConcluidos(anterior => anterior + 1);
            }
          }));
          const falhas = respostas.flatMap((resposta, indice) => {
            if (resposta.status !== 'rejected') return [];
            const motivo = resposta.reason?.name === 'TimeoutError'
              ? 'O serviço de leitura não respondeu no prazo. Tente novamente.'
              : resposta.reason instanceof Error ? resposta.reason.message : 'Falha de comunicação com a IA.';
            return [`${arquivosSelecionados[indice].file.name}: ${motivo}`];
          });
          if (falhas.length) {
            setGruposExtraidos([]);
            setArquivosIlegiveis(falhas);
            setStep('ilegivel');
            return;
          }
          const tiposIncompativeis = arquivosSelecionados
            .filter((a) => resultadosIA.get(a.file)?.avisoTipo)
            .map((a) => `${a.file.name}: ${resultadosIA.get(a.file)?.avisoTipo}`);
          if (tiposIncompativeis.length > 0) {
            throw new Error(`TIPO_DOCUMENTO_INCOMPATIVEL:${tiposIncompativeis.join(" | ")}`);
          }
          const nomesEncontrados = arquivosSelecionados.flatMap((a) =>
            resultadosIA.get(a.file)?.beneficiarios ?? []
          );
          const relacaoEncontrada = beneficiariosEscolhidos.some((b) =>
            nomesEncontrados.some((l) => nomesIguais(l.nome, b.nome) || nomeAbreviadoCompativel(l.nome, b.nome) || nomeOCRCompativel(l.nome, b.nome))
          );
          const exigeIdentificacaoDeBeneficiario = arquivosSelecionados.some((a) =>
            a.documentos.some((d) => ["boleto", "recibo", "demonstrativo", "fatura_tecnica"].includes(d.tipo))
          );
          if (exigeIdentificacaoDeBeneficiario && !relacaoEncontrada) {
            throw new Error(nomesEncontrados.length > 0
              ? `DOCUMENTOS_SEM_RELACAO:${nomesEncontrados.map((n) => n.nome).join(", ")}`
              : "BENEFICIARIO_NAO_IDENTIFICADO");
          }
          const grupos = await Promise.all(beneficiariosEscolhidos.map(async (b) => {
            // Só entram campos de arquivos com pelo menos 1 documento (tipo) que cobre este
            // beneficiário — e só com os tipos que de fato o cobrem, não todos os do arquivo.
            // Mesma regra de cobertura usada no checklist (`getCoberturaDocumental`).
            const porArquivo = arquivosSelecionados.flatMap((a) => {
              const tiposQueCobrem = a.documentos
                .filter((d) => beneficiariosCobertosPeloDocumento(d, todosIds).includes(b.id))
                .map((d) => d.tipo);
              if (tiposQueCobrem.length === 0) return [];
              const permitidos = new Set(tiposQueCobrem.flatMap(t => camposPermitidos[t]));
              // O nome vem da lista de beneficiários do documento, não de campos.nome.
              permitidos.add('nome');
              const associadoEmAlgumArquivo = arquivosSelecionados.some((outro) =>
                (resultadosIA.get(outro.file)?.beneficiarios ?? []).some((linha) =>
                  nomesIguais(linha.nome, b.nome) || nomeAbreviadoCompativel(linha.nome, b.nome) || nomeOCRCompativel(linha.nome, b.nome)
                )
              );
              return [{ nome: a.file.name, campos: leituras.get(a.file)!.then(() => camposParaPessoa(a.file, b.nome, todosIds.length > 1, associadoEmAlgumArquivo).filter(c => permitidos.has(c.chave))) }];
            });
            const processados = await Promise.all(porArquivo.map(async (arquivo) => ({
              nome: arquivo.nome,
              campos: await arquivo.campos,
            })));
            return { beneficiarioId: b.id, campos: mesclarCamposDeArquivos(processados) };
          }));
          setGruposExtraidos(grupos);
          setLeituraConcluida(true);
          setTimeout(() => {
            setStep("conferencia_beneficiarios");
          }, 500);
          } catch (error) {
            const codigo = error instanceof Error ? error.message : '';
            setTituloErro(codigo === 'BENEFICIARIO_NAO_IDENTIFICADO' ? 'Beneficiário não identificado'
              : codigo.startsWith('DOCUMENTOS_SEM_RELACAO:') ? 'Documentos sem relação com o beneficiário'
              : codigo.startsWith('TIPO_DOCUMENTO_INCOMPATIVEL:') ? 'Tipo de documento incompatível'
              : codigo === 'DOCUMENTO_ILEGIVEL' ? 'Documento ilegível' : 'Não foi possível processar os documentos');
            console.error("Falha no processamento do comprovante pela IA", error);
            const ilegiveis = error instanceof Error && error.message === "BENEFICIARIO_NAO_IDENTIFICADO"
              ? ["A IA não conseguiu identificar nenhum beneficiário no boleto/documento principal."]
              : error instanceof Error && error.message.startsWith("DOCUMENTOS_SEM_RELACAO:")
              ? [error.message.replace("DOCUMENTOS_SEM_RELACAO:", "")]
              : error instanceof Error && error.message.startsWith("TIPO_DOCUMENTO_INCOMPATIVEL:")
              ? error.message.replace("TIPO_DOCUMENTO_INCOMPATIVEL:", "").split(" | ")
              : error instanceof Error && error.message === "DOCUMENTO_ILEGIVEL"
              ? arquivosSelecionados.map((a) => a.file.name)
              : [error instanceof Error ? `Falha na IA: ${error.message}` : "Falha no processamento pela IA"];
            setArquivosIlegiveis(ilegiveis);
            setTimeout(() => setStep("ilegivel"), 700);
          }
        }, 600);
      }, 500);
    }, 350);
  }

  function corrigirIlegivel() {
    setArquivosIlegiveis([]);
    setStep("upload");
  }

  function handleChangeGrupo(beneficiarioId: string, campos: CampoExtraido[]) {
    setGruposExtraidos((prev) => prev.map((g) => (g.beneficiarioId === beneficiarioId ? { ...g, campos } : g)));
  }

  /** Persiste o documento em revisão — reflete no Resumo da competência, que só lê dados salvos. */
  async function confirmarDocumento() {
    if (salvandoEnvio) return;
    setSalvandoEnvio(true);
    setErroSalvarEnvio('');
    try {
    const execucoes = arquivosSelecionados.map(a => resultadosIA.get(a.file)?.execucaoId);
    if (execucoes.some(id => !id)) throw new Error('Há arquivo sem execução de IA concluída. Reprocesse os anexos.');
    const arquivosDoEnvio: ArquivoAnexado[] = arquivosSelecionados.map((a) => ({
      nome: a.file.name,
      documentos: a.documentos,
      ...resultadosIA.get(a.file),
    }));
    const primeiro = gruposExtraidos[0];
    const justificativasDivergenciaArray = Object.entries(justificativasDivergencia)
      .filter(([, texto]) => texto.trim() !== "")
      .map(([beneficiarioId, texto]) => ({ beneficiarioId, texto }));
    const novoComprovante: Comprovante = {
      id: idEnvioPendente.current ??= `comp-${crypto.randomUUID()}`,
      arquivos: arquivosDoEnvio,
      beneficiarioIds: beneficiariosSelecionados,
      competencia,
      isRetroativo,
      justificativaAtraso: isRetroativo ? justificativaAtraso : undefined,
      camposExtraidos: primeiro?.campos ?? [],
      gruposExtraidos: gruposExtraidos.length > 1 ? gruposExtraidos : undefined,
      status: isRetroativo ? "retroativo_aguardando_aprovacao" : "em_analise",
      justificativasDivergencia:
        justificativasDivergenciaArray.length > 0 ? justificativasDivergenciaArray : undefined,
      operadoraDivergenteCadastro: Object.values(operadoraDivergenteConfirmada).some(Boolean) || undefined,
      aprovacoes: [],
      dataEnvio: new Date().toISOString(),
    };
    await registrarEnvioTeste(novoComprovante, execucoes as string[]);
    addComprovantePagamento(novoComprovante);
    idEnvioPendente.current = null;
    setRefreshResumoKey((k) => k + 1);
    setStep("resumo_competencia");
    } catch (error) {
      setErroSalvarEnvio(error instanceof Error ? error.message : 'Falha ao salvar no banco de teste.');
    } finally {
      setSalvandoEnvio(false);
    }
  }

  /** "Anexar comprovante do dependente" a partir do Resumo — mantém a competência travada,
   *  preserva tudo já salvo e reabre o wizard só com o beneficiário faltante pré-selecionado. */
  function handleAnexarDependente(beneficiarioId: string) {
    idEnvioPendente.current = null;
    setJustificativaAtraso("");
    setJustificativasDivergencia({});
    setOperadoraDivergenteConfirmada({});
    setArquivosSelecionados([]);
    setGruposExtraidos([]);
    setBeneficiariosSelecionados([beneficiarioId]);
    setTravarCompetencia(true);
    setStep("selecao");
  }

  function handleConcluir() {
    saveConclusaoCompetencia(competencia);
    navigate({ to: "/servidor/pagamentos" });
  }

  return (
    <div className="p-4">
      {step !== "resumo_competencia" && (
        <>
          <h2 className="text-lg font-semibold mb-1">Enviar Comprovante</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Etapa {stepIndex(step) + 1} de {stepLabels.length}
          </p>
          <Stepper steps={stepLabels} current={stepIndex(step)} />
        </>
      )}

      {step === "selecao" && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">Persona para teste
            <select className="mt-2 w-full rounded border p-2" value={personaId} onChange={e => {
              setPersonaId(e.target.value);
              setBeneficiariosSelecionados([]);
              setArquivosSelecionados([]);
              setGruposExtraidos([]);
              setJustificativasDivergencia({});
              setOperadoraDivergenteConfirmada({});
            }}>
              <option value="">Cenário original — Carlos e Marina</option>
              {personasDocumentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          {persona && <p className="text-sm text-muted-foreground">{persona.detalhe} Selecione abaixo quem será coberto pelo envio. Os campos da revisão serão obtidos dos arquivos pela IA.</p>}
          <div>
            <label className="block text-sm font-medium mb-1.5">Competência</label>
            <select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={travarCompetencia}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-70"
            >
              <option value={competenciaAtual}>{formatCompetencia(competenciaAtual)} (aberta)</option>
              {competenciasFechadas.map((c) => (
                <option key={c} value={c}>
                  {formatCompetencia(c)} (fechada — retroativo)
                </option>
              ))}
            </select>
            {travarCompetencia && (
              <p className="text-xs text-muted-foreground mt-1">
                Competência preenchida automaticamente — os comprovantes já enviados foram preservados.
              </p>
            )}
          </div>

          {isRetroativo && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Justificativa do atraso <span className="text-destructive">*</span>
              </label>
              <textarea
                value={justificativaAtraso}
                onChange={(e) => setJustificativaAtraso(e.target.value)}
                rows={3}
                placeholder="Explique o motivo do envio retroativo (mínimo 3 palavras)..."
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                  justificativaAtraso.trim().length > 0 && !temPeloMenosNPalavras(justificativaAtraso)
                    ? "border-destructive/50"
                    : "border-input"
                }`}
              />
              {justificativaAtraso.trim().length > 0 && !temPeloMenosNPalavras(justificativaAtraso) ? (
                <p className="text-xs text-destructive mt-1">Escreva pelo menos 3 palavras.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Envios retroativos são aprovados pela GERDAB (Analista ou Gerência) antes de valer para fins de reembolso.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Beneficiários</label>
            <BeneficiarioSelector
              beneficiarios={beneficiariosAtuais.filter(b => persona ? persona.beneficiarios.some(p => p.id === b.id) : !b.id.startsWith('doc'))}
              competencia={competencia}
              comprovantesExistentes={comprovantesExistentes}
              selecionados={beneficiariosSelecionados}
              onChange={setBeneficiariosSelecionados}
            />
          </div>

          <StepNav
            onNext={() => setStep("upload")}
            nextLabel="Próximo"
            disabled={!podeAvancarSelecao}
            cancelTo="/servidor/pagamentos"
          />
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie o(s) comprovante(s) para {beneficiariosEscolhidos.map((b) => b.nome).join(", ")}. Você pode
            anexar mais de um arquivo quando as informações estiverem em documentos complementares (ex: fatura
            técnica + comprovante de pagamento).
          </p>
          <ArquivosAnexadosUpload
            arquivos={arquivosSelecionados}
            tiposPermitidos={tiposPermitidos}
            beneficiarios={beneficiariosEscolhidos}
            modalidadePlano={modalidadeDoGrupo}
            onChange={setArquivosSelecionados}
          />
          <StepNav
            onPrev={() => setStep("selecao")}
            onNext={iniciarProcessamento}
            nextLabel="Enviar para processamento"
            disabled={!podeAvancarUpload}
          />
        </div>
      )}

      {step === "lendo" && (
        <LendoComprovante
          nomesArquivos={arquivosSelecionados.map((a) => a.file.name)}
          etapaAtual={etapaLeitura}
          arquivosConcluidos={arquivosConcluidos}
          concluido={leituraConcluida}
          falhouLegibilidade={arquivosIlegiveis.length > 0}
          onVoltar={() => setStep("upload")}
        />
      )}

      {step === "ilegivel" && (
        <div className="p-6 text-center space-y-4">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h3 className="text-base font-semibold">
            {tituloErro}
          </h3>
          <p className="text-sm text-muted-foreground px-2">
            {arquivosIlegiveis.length === 1 && arquivosIlegiveis[0].startsWith("A IA identificou")
              ? `A IA identificou ${arquivosIlegiveis[0]}, mas nenhum deles corresponde ao beneficiário selecionado.`
              : arquivosIlegiveis.length === 1 && arquivosIlegiveis[0].startsWith("A IA não conseguiu")
                ? arquivosIlegiveis[0]
              : `${arquivosIlegiveis.join("; ")}. Confira os anexos e tente novamente.`}
          </p>
          <button
            onClick={corrigirIlegivel}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-primary-light"
          >
            <RefreshCw className="h-4 w-4" /> Corrigir arquivos
          </button>
        </div>
      )}

      {step === 'conferencia_beneficiarios' && arquivosSelecionados.map(a => {
        const itens = resultadosIA.get(a.file)?.itensFinanceiros.filter(i => !i.reembolsavel) ?? [];
        return itens.length ? <div key={`encargos-${a.file.name}`} role="status" className="my-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm">
          <p className="font-medium">Itens não reembolsáveis do documento — {a.file.name}</p>
          {itens.map((item, index) => <p key={index}>{item.descricao}: {formatCurrency(item.valor)}</p>)}
          <p>Sem atribuição individual identificada. Esses valores não foram distribuídos entre os beneficiários.</p>
        </div> : null;
      })}
      {step === 'conferencia_beneficiarios' && arquivosSelecionados.map(a => {
        const leitura = resultadosIA.get(a.file);
        const aviso = leitura?.avisoTipo ?? leitura?.avisoFinanceiro;
        const detalhes = [leitura?.favorecidoPagamento && `Favorecido: ${leitura.favorecidoPagamento}`, leitura?.cnpjFavorecido && `CNPJ favorecido: ${leitura.cnpjFavorecido}`, leitura?.valorNominal && `Valor nominal: ${leitura.valorNominal}`].filter(Boolean);
        return (aviso || detalhes.length) ? <div key={a.file.name} role="status" className="my-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm">
          {aviso && <p role="alert">{a.file.name}: {aviso}</p>}
          {detalhes.map((texto) => <p key={texto}>{texto}</p>)}
        </div> : null;
      })}
      {step === "conferencia_beneficiarios" && (
        <ConferenciaBeneficiarios
          arquivos={arquivosSelecionados.map((a) => ({ nome: a.file.name, documentos: a.documentos, ...resultadosIA.get(a.file) }))}
          beneficiarios={beneficiariosEscolhidos}
          competencia={competencia}
          gruposExtraidos={gruposExtraidos}
          onChangeGrupo={handleChangeGrupo}
          onVoltar={() => setStep("upload")}
          onContinuar={() => setStep("confirmar_documento")}
          nomeTitular={persona ? (persona.id === '3' ? 'Gabriella Emilly de Oliveira Santos' : persona.beneficiarios.find(b => b.parentesco === 'Titular')?.nome) : titularPagamento?.nome}
          justificativasDivergencia={justificativasDivergencia}
          onChangeJustificativaDivergencia={(beneficiarioId, texto) =>
            setJustificativasDivergencia((prev) => ({ ...prev, [beneficiarioId]: texto }))
          }
          operadoraDivergenteConfirmada={operadoraDivergenteConfirmada}
          onConfirmarOperadoraDivergente={(beneficiarioId) =>
            setOperadoraDivergenteConfirmada((prev) => ({ ...prev, [beneficiarioId]: true }))
          }
        />
      )}

      {step === "confirmar_documento" && (
        <div className="space-y-4">
          {erroSalvarEnvio && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erroSalvarEnvio}</p>}
          <ResumoPagamento
            arquivos={arquivosSelecionados.map((a) => ({ nome: a.file.name, documentos: a.documentos, ...resultadosIA.get(a.file) }))}
            beneficiarios={beneficiariosEscolhidos}
            competencia={competencia}
            isRetroativo={isRetroativo}
            justificativaAtraso={justificativaAtraso}
            gruposExtraidos={gruposExtraidos}
          />
          <StepNav
            onPrev={() => setStep("conferencia_beneficiarios")}
            onNext={confirmarDocumento}
            nextLabel={salvandoEnvio ? 'Salvando...' : 'Confirmar documento'}
            isLast
            disabled={salvandoEnvio}
          />
        </div>
      )}

      {step === "resumo_competencia" && (
        <ConsolidadoCompetencia
          competencia={competencia}
          onAnexarDependente={handleAnexarDependente}
          onConcluir={handleConcluir}
          onRefresh={() => setRefreshResumoKey((k) => k + 1)}
          refreshKey={refreshResumoKey}
        />
      )}
    </div>
  );
}

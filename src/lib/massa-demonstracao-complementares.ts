/**
 * MASSA DE DEMONSTRAÇÃO das solicitações documentais complementares (Dashboard → Prazos e alertas documentais) — SOMENTE
 * PROTÓTIPO. Complementa os 2 cenários de Ressarcimentos de meses anteriores (semeados por `massa-demonstracao.ts`) com:
 *  - 2 Requerimentos da Associação (persistidos pelo fluxo real: pedido de documento e complementação enviada);
 *  - 3 Comprovantes (correção solicitada, comprovante corrigido e reenviado, documento complementar solicitado).
 * Tudo usa os modelos, estados e registros já existentes; nada é inventado no Dashboard — a fila lê estes registros pelos
 * adaptadores de `acompanhamento-documental.ts`. Nomes fictícios; ids com prefixo `demo-compl-`; arquivos com sufixo `_demo`.
 *
 * Idempotente: marcador no `localStorage` (não repete a cada atualização) e nunca sobrescreve um id já existente.
 * Comprovantes usam a competência 2026-09, fora das competências do Fechamento de Pagamento (04 a 07): não alteram esses
 * relatórios. Gravação direta (sem `addComprovantePagamento`) para não disparar as rotinas do envio do servidor.
 */
import { analistaReferencia, gerenteReferencia, type AcaoComprovante, type CampoExtraido, type Comprovante } from "./mock-data";
import { PROSAUDE_STORAGE_KEYS, loadComprovantesPagamento, loadRequerimentosAssociacao, saveRequerimentosAssociacao } from "./prosaude-storage";
import { complementarRequerimentoAssociacao, criarRequerimentoAssociacao, decidirRequerimentoAssociacao } from "./requerimentos-associacao";

const VERSAO = "2";
const ID_REQ_PEDIDO = "demo-compl-req-pedido";
const ID_REQ_RECEBIDO = "demo-compl-req-recebido";
const COMP = "2026-09";

const iso = (d: string) => `${d}:00-03:00`;

/** Ajusta só as datas dos eventos criados pelo serviço, para a demonstração ter datas coerentes. */
function datar(id: string, datas: { criadoEm: string; versoes: { enviadoEm: string; decididoEm?: string }[] }) {
  const todos = loadRequerimentosAssociacao();
  saveRequerimentosAssociacao(
    todos.map((r) =>
      r.id !== id
        ? r
        : {
            ...r,
            criadoEm: datas.criadoEm,
            versoes: r.versoes.map((v, i) => ({ ...v, enviadoEm: datas.versoes[i]?.enviadoEm ?? v.enviadoEm, decisao: v.decisao && datas.versoes[i]?.decididoEm ? { ...v.decisao, decididoEm: datas.versoes[i].decididoEm! } : v.decisao })),
          },
    ),
  );
}

function semearRequerimentos() {
  const ja = new Set(loadRequerimentosAssociacao().map((r) => r.id));
  if (!ja.has(ID_REQ_PEDIDO)) {
    // Cenário 3 — documento solicitado à Associação (aguardando envio).
    criarRequerimentoAssociacao({
      id: ID_REQ_PEDIDO,
      associacao: "Assetran",
      tipo: "inclusao_dependente",
      beneficiarioNome: "Helena Duarte",
      resumo: "Inclusão de Dependente — Helena Duarte (cônjuge) — demonstração",
      documentos: [
        { nome: "Documento de identificação pessoal com foto", categoria: "dependente", dependenteNome: "Helena Duarte" },
        { nome: "Declaração de união estável", categoria: "dependente", dependenteNome: "Helena Duarte" },
      ],
    });
    decidirRequerimentoAssociacao(ID_REQ_PEDIDO, { status: "aguardando_complementacao", justificativa: "Anexar a certidão de casamento atualizada da dependente.", decididoPor: analistaReferencia });
    datar(ID_REQ_PEDIDO, { criadoEm: iso("2026-10-02T10:20"), versoes: [{ enviadoEm: iso("2026-10-02T10:20"), decididoEm: iso("2026-10-06T14:10") }] });
  }
  if (!ja.has(ID_REQ_RECEBIDO)) {
    // Cenário 4 — complementação enviada pela Associação (nova versão, recebida para análise).
    criarRequerimentoAssociacao({
      id: ID_REQ_RECEBIDO,
      associacao: "Assetran",
      tipo: "mudanca_plano",
      beneficiarioNome: "Rafael Monteiro",
      resumo: "Mudança de Plano — Rafael Monteiro — demonstração",
      documentos: [{ nome: "Requerimento de mudança de plano assinado", categoria: "associacao" }],
    });
    decidirRequerimentoAssociacao(ID_REQ_RECEBIDO, { status: "aguardando_complementacao", justificativa: "Anexar o contrato do novo plano assinado pela operadora.", decididoPor: gerenteReferencia });
    complementarRequerimentoAssociacao(ID_REQ_RECEBIDO, { resumo: "Contrato do novo plano enviado — demonstração", documentos: [{ nome: "contrato_novo_plano_assinado_demo.pdf", categoria: "complemento" }] });
    datar(ID_REQ_RECEBIDO, { criadoEm: iso("2026-09-28T09:00"), versoes: [{ enviadoEm: iso("2026-09-28T09:00"), decididoEm: iso("2026-10-01T16:30") }, { enviadoEm: iso("2026-10-08T11:45") }] });
  }
}

const campos = (nome: string, valor: string, venc: string): CampoExtraido[] => [
  { chave: "nome", valor: nome, origem: "ocr", confianca: "alta" },
  { chave: "competencia", valor: COMP, origem: "ocr", confianca: "alta" },
  { chave: "valor", valor, origem: "ocr", confianca: "alta" },
  { chave: "vencimento", valor: venc, origem: "ocr", confianca: "media" },
];
const acao = (a: AcaoComprovante["acao"], por: string, data: string, comentario?: string, etapa: AcaoComprovante["etapa"] = "analista"): AcaoComprovante => ({ etapa, acao: a, aprovadoPor: por, data: iso(data), comentario });

function comprovantesDemo(): Comprovante[] {
  return [
    // Cenário 5 — correção solicitada (aguardando envio do Servidor).
    {
      id: "demo-compl-comp-correcao",
      arquivos: [{ nome: "boleto_setembro_marina_demo.pdf", documentos: [{ tipo: "boleto" }] }],
      beneficiarioIds: ["ben-conjuge"],
      competencia: COMP,
      isRetroativo: false,
      camposExtraidos: campos("Marina Ramos", "310.00", "10/09/2026"),
      status: "correcao_solicitada",
      aprovacoes: [acao("correcao_solicitada", analistaReferencia, "2026-10-09T15:05", "Boleto com a data de vencimento ilegível; reenviar o documento completo.")],
      dataEnvio: iso("2026-10-07T08:50"),
    },
    // Cenário 6 — comprovante corrigido e reenviado (recebido para análise da GERDAB).
    {
      id: "demo-compl-comp-reenviado",
      arquivos: [{ nome: "recibo_setembro_pedro_corrigido_demo.pdf", documentos: [{ tipo: "recibo" }] }],
      beneficiarioIds: ["ben-filho"],
      competencia: COMP,
      isRetroativo: false,
      camposExtraidos: campos("Pedro Ramos", "310.00", "10/09/2026"),
      status: "em_analise",
      aprovacoes: [
        acao("correcao_solicitada", analistaReferencia, "2026-10-05T10:15", "Recibo sem o nome do beneficiário."),
        acao("reenviado", "Servidor", "2026-10-12T17:40", undefined, "servidor"),
      ],
      versoesAnteriores: [{ arquivo: "recibo_setembro_pedro_demo.pdf", dataEnvio: iso("2026-10-03T09:30"), status: "correcao_solicitada" }],
      dataEnvio: iso("2026-10-12T17:40"),
    },
    // Cenário 7 — documento complementar solicitado e ainda não enviado (aguardando envio do Servidor).
    {
      id: "demo-compl-comp-complementar",
      arquivos: [{ nome: "boleto_setembro_carlos_demo.pdf", documentos: [{ tipo: "boleto" }] }],
      beneficiarioIds: ["ben-titular"],
      competencia: COMP,
      isRetroativo: false,
      camposExtraidos: campos("Carlos Eduardo Ramos", "420.00", "10/09/2026"),
      status: "em_analise",
      aprovacoes: [acao("documento_complementar_solicitado", gerenteReferencia, "2026-10-14T09:20", "Enviar o comprovante de pagamento correspondente ao boleto.", "gerencia")],
      solicitacaoComplementar: { motivo: "Enviar o comprovante de pagamento correspondente ao boleto.", solicitadoPor: gerenteReferencia, data: iso("2026-10-14T09:20") },
      dataEnvio: iso("2026-10-07T13:10"),
    },
  ];
}

function semearComprovantes() {
  const existentes = loadComprovantesPagamento();
  const ids = new Set(existentes.map((c) => c.id));
  const novos = comprovantesDemo().filter((c) => !ids.has(c.id));
  if (novos.length === 0) return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.comprovantesPagamento, JSON.stringify([...existentes, ...novos]));
}

/**
 * Versão 2: a ASSETRAN é a única associação que gerencia solicitações no Portal da Associação — o cenário 3 passou de
 * ASSEFAZ para ASSETRAN. Sessões já semeadas na versão 1 recebem só esta correção, e SOMENTE se o registro ainda for o
 * original (uma versão, decisão "aguardando complementação" intacta); registro alterado manualmente nunca é tocado.
 */
function migrarPedidoParaAssetran() {
  const todos = loadRequerimentosAssociacao();
  const r = todos.find((x) => x.id === ID_REQ_PEDIDO);
  if (!r || r.associacao !== "Assefaz") return;
  const intacto = r.versoes.length === 1 && r.versoes[0].decisao?.status === "aguardando_complementacao" && r.versoes[0].decisao.justificativa === "Anexar a certidão de casamento atualizada da dependente.";
  if (!intacto) return;
  saveRequerimentosAssociacao(todos.map((x) => (x.id === ID_REQ_PEDIDO ? { ...x, associacao: "Assetran" } : x)));
}

export function garantirMassaDemonstracaoComplementares(): void {
  if (typeof window === "undefined") return;
  const atual = localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoComplementares);
  if (atual === VERSAO) return;
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoComplementares, VERSAO);
  try {
    if (atual === "1") {
      migrarPedidoParaAssetran();
      return;
    }
    semearRequerimentos();
    semearComprovantes();
  } catch {
    /* demonstração segue sem os registros extras */
  }
}

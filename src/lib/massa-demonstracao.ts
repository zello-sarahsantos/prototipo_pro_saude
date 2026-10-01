/**
 * **MASSA DE DEMONSTRAÇÃO do Ressarcimento Retroativo — SOMENTE PROTÓTIPO.**
 *
 * Semeia, uma única vez (idempotente, marcador em `localStorage`), uma massa pequena e coerente
 * para visualizar as telas da GERDAB (`/admin/retroativos`) e o Relatório Financeiro Retroativo. Os
 * dados são inventados para demonstração; NÃO são regra de negócio, NÃO representam persistência de
 * produção e a existência destes mocks NÃO é requisito funcional. Tudo é criado pelo próprio motor
 * (`ressarcimento-retroativo.ts`), então respeita as mesmas regras (guards de origem, apuração,
 * autorização) — nenhum estado é escrito "na mão".
 *
 * Titulares (vínculos simulados por `servidoresList`; regra de produção: fonte institucional):
 *  - sem associação → origem individual: Carlos Eduardo Ramos (titular do Portal da demonstração,
 *    7 competências em estados distintos, incluindo complementação documental — PROPOSTA a validar com a
 *    GERDAB), Fernanda Lima;
 *  - ASSEFAZ → origem associação: Maria Oliveira (inativa), Patrícia Costa (inativa);
 *  - ASSETRAN → origem associação: Carlos Pereira (ativo), Roberto Santos (inativo).
 *
 * Cenários cobertos: competência aprovada / negada (com justificativa) / aguardando; associação
 * habilitada / desabilitada (com justificativa) / aguardando conferência; contracheque conferido ×
 * pendente; divergência (Pago > Devido); documentos de vários tipos; dependente na composição;
 * mais de uma competência por titular; correção de Mês/Ano e complemento de Observação na trilha.
 */
import { analistaReferencia, gerenteReferencia } from "./mock-data";
import { PROSAUDE_STORAGE_KEYS, saveConsolidacoesRetroativo } from "./prosaude-storage";
import { registrarPlanilhaOriginal } from "./planilha-retroativa";
import { enviarComplementacao, getSituacaoConsolidacao, marcarNotificacoesLidas, solicitarComplementacao } from "./retroativo-fluxo";
import {
  aprovarCompetencia,
  complementarObservacao,
  corrigirMesAnoPagamento,
  criarSolicitacaoRetroativa,
  desabilitarRegistroRetroativo,
  habilitarRegistroRetroativo,
  marcarContrachequeConferido,
  negarCompetencia,
  registrarValorPago,
  validarValorDevido,
  type SolicitacaoRetroativa,
} from "./ressarcimento-retroativo";

const A = analistaReferencia;
const G = gerenteReferencia;

function apurar(s: SolicitacaoRetroativa, comp: string, pago: number, devido: number | null, conferido: boolean, por = A) {
  registrarValorPago(s.id, comp, pago, por);
  if (devido !== null) validarValorDevido(s.id, comp, devido, por);
  if (conferido) marcarContrachequeConferido(s.id, comp, por);
}

/** Versão da massa: mudar força a reinicialização da demonstração do Retroativo (protótipo). */
const VERSAO_MASSA = "5";

export function garantirMassaDemonstracaoRetroativos() {
  if (typeof window === "undefined") return;
  const atual = localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoRetroativos);
  if (atual === VERSAO_MASSA) return;
  // Massa de uma versão anterior da demonstração (ex.: sem planilhas ou sem histórico): reinicia SÓ os dados do
  // Retroativo para que a demonstração fique completa e coerente. Só protótipo — nunca comportamento de produção.
  if (atual) {
    const k = PROSAUDE_STORAGE_KEYS;
    [k.solicitacoesRetroativas, k.notificacoesRetroativo, k.consolidacoesRetroativo, k.planilhasRetroativasOriginais].forEach((chave) => localStorage.removeItem(chave));
  }
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoRetroativos, VERSAO_MASSA);

  // Planilhas retroativas enviadas pelas associações (fonte de comprovação dos registros; download reconstruído na demonstração).
  const arqAssefaz = registrarPlanilhaOriginal({ associacao: "Assefaz", nome: "retroativo_assefaz_setembro_2026.xlsx", enviadoEm: "2026-09-24T10:15:00" });
  const arqAssetran = registrarPlanilhaOriginal({ associacao: "Assetran", nome: "retroativo_assetran_setembro_2026.xlsx", enviadoEm: "2026-09-24T14:40:00" });

  /* ── Origem individual (Portal do Servidor) ───────────────────────────────────────────── */
  // Titular do Portal do Servidor da demonstração (Carlos Eduardo Ramos, `beneficiariosPagamento`): uma única
  // solicitação com 7 competências em estados diferentes — o Portal mostra a pendência de complementação.
  // Nenhuma competência daqui usa "2026-05": esse mês já aparece, para este mesmo titular, no exemplo
  // legado (`comp004`, mock-data.ts) mantido só como histórico simulado. Escolha da massa de demonstração,
  // não uma regra de deduplicação em código — protótipo com dados mockados, sem migração real a preservar.
  const carlosE = criarSolicitacaoRetroativa({
    origem: "individual",
    cpfTitular: "111.222.333-44",
    nomeTitular: "Carlos Eduardo Ramos",
    motivo: "mudanca_faixa_etaria",
    justificativa: "Reajuste por mudança de faixa etária não refletido no auxílio dos primeiros meses do ano.",
    competencias: [
      // 2025-07 e 2025-08 (não "2026-05" — ver nota acima sobre o exemplo legado deste titular):
      { competenciaReferencia: "2025-07", documentos: [{ nome: "boleto_julho25.pdf", tipo: "boleto" }] },
      { competenciaReferencia: "2025-08", documentos: [{ nome: "boleto_agosto25.pdf", tipo: "boleto" }, { nome: "recibo_agosto25.pdf", tipo: "recibo" }] },
      { competenciaReferencia: "2026-01", documentos: [{ nome: "boleto_janeiro.pdf", tipo: "boleto" }, { nome: "comprovante_janeiro.pdf", tipo: "comprovante_pagamento" }] },
      { competenciaReferencia: "2026-02", documentos: [{ nome: "recibo_fevereiro.pdf", tipo: "recibo" }] },
      { competenciaReferencia: "2026-03", documentos: [{ nome: "demonstrativo_marco.pdf", tipo: "demonstrativo" }, { nome: "carta_operadora.pdf", tipo: "outro", descricao: "Carta da operadora sobre o reajuste" }] },
      { competenciaReferencia: "2026-04", documentos: [{ nome: "boleto_abril.pdf", tipo: "boleto" }] },
      { competenciaReferencia: "2026-06", documentos: [{ nome: "fatura_junho.pdf", tipo: "fatura_tecnica" }] },
    ],
  });
  apurar(carlosE, "2025-07", 800, 800, true); // PAGO = DEVIDO: resolvido/adimplente no Histórico, Ressarcir R$ 0,00 — fora da Consolidação NURFI
  aprovarCompetencia(carlosE.id, "2025-07", A);
  apurar(carlosE, "2025-08", 1000, null, false); // sem decisão ainda (era a "complementação recebida" — só mudou de competência, mesmo cenário)
  solicitarComplementacao(carlosE.id, "2025-08", "Anexar comprovante de pagamento referente à competência Agosto/2025.", A);
  marcarNotificacoesLidas("servidor", carlosE.id, "2025-08"); // o servidor já viu este pedido…
  enviarComplementacao(carlosE.id, "2025-08", [{ nome: "comprovante_agosto25.pdf", tipo: "comprovante_pagamento" }], "Carlos Eduardo Ramos"); // …e respondeu: COMPLEMENTAÇÃO RECEBIDA (indicador "Atualizada" na GERDAB)
  apurar(carlosE, "2026-01", 1200, 1500, true); // Devido − Pago = 300
  corrigirMesAnoPagamento(carlosE.id, "2026-01", "2026-03", "Contracheque de fevereiro sem rubrica do auxílio; pagamento ocorreu em março.", A);
  complementarObservacao(carlosE.id, "2026-01", "Conforme carta da operadora anexada.", A);
  aprovarCompetencia(carlosE.id, "2026-01", A);
  apurar(carlosE, "2026-02", 1100, 1400, true);
  aprovarCompetencia(carlosE.id, "2026-02", A);
  apurar(carlosE, "2026-03", 1200, null, false); // EM ANÁLISE: Valor Pago registrado; Devido não validado; contracheque pendente
  registrarValorPago(carlosE.id, "2026-04", 900, A);
  solicitarComplementacao(carlosE.id, "2026-04", "Anexar comprovante de pagamento referente à competência Abril/2026.", A); // AGUARDANDO COMPLEMENTAÇÃO (notificação no Portal)
  negarCompetencia(carlosE.id, "2026-06", "Fatura técnica não comprova o pagamento da competência.", A); // NÃO AUTORIZADA

  /* ── Origem associação — ASSETRAN (Carlos Pereira) e primeira Consolidação NURFI ────────────── */
  const carlos = criarSolicitacaoRetroativa({
    origem: "associacao",
    associacao: "Assetran",
    arquivoId: arqAssetran,
    cpfTitular: "567.890.123-44",
    nomeTitular: "Carlos Pereira",
    competencias: ["2026-02", "2026-03", "2026-04", "2026-05"].map((c) => ({
      competenciaReferencia: c,
      dataEmissaoBoleto: `${c}-01`, vencimento: `${c}-10`, dataBaixa: `${c}-09`,
      composicao: [{ beneficiario: "Carlos Pereira", cpf: "567.890.123-44", vinculo: "Titular", valorCobranca: 900, plano: "Amil" }],
    })),
  });
  apurar(carlos, "2026-02", 700, 900, true);
  habilitarRegistroRetroativo(carlos.id, "2026-02", A);
  apurar(carlos, "2026-03", 700, 900, true); // apuração concluída, MAS sem habilitação: em análise, não entra na Consolidação
  apurar(carlos, "2026-04", 700, 950, true);
  habilitarRegistroRetroativo(carlos.id, "2026-04", A); // habilitações "posteriores": aptas para o próximo relatório
  apurar(carlos, "2026-05", 700, 950, true);
  habilitarRegistroRetroativo(carlos.id, "2026-05", A);


  // Mais titulares sem associação, com competências já autorizadas (aptas para a Consolidação).
  const eduardo = criarSolicitacaoRetroativa({
    origem: "individual",
    cpfTitular: "234.567.890-99",
    nomeTitular: "Eduardo Nascimento",
    motivo: "declaracao_escolaridade",
    justificativa: "Declaração de escolaridade apresentada após o início do semestre.",
    competencias: [
      { competenciaReferencia: "2026-01", documentos: [{ nome: "declaracao_escolaridade.pdf", tipo: "documento_motivo" }, { nome: "boleto_janeiro.pdf", tipo: "boleto" }] },
      { competenciaReferencia: "2026-02", documentos: [{ nome: "boleto_fevereiro.pdf", tipo: "boleto" }] },
    ],
  });
  apurar(eduardo, "2026-01", 400, 950, true);
  aprovarCompetencia(eduardo.id, "2026-01", G);
  apurar(eduardo, "2026-02", 400, 950, true);
  aprovarCompetencia(eduardo.id, "2026-02", G);

  const joao = criarSolicitacaoRetroativa({
    origem: "individual",
    cpfTitular: "123.456.789-00",
    nomeTitular: "João da Silva",
    motivo: "reinclusao_dependente",
    justificativa: "Reinclusão de dependente com efeito retroativo.",
    competencias: [{ competenciaReferencia: "2026-03", documentos: [{ nome: "demonstrativo_marco.pdf", tipo: "demonstrativo" }] }],
  });
  apurar(joao, "2026-03", 1000, 1500, true);
  aprovarCompetencia(joao.id, "2026-03", A);

  const fernanda = criarSolicitacaoRetroativa({
    origem: "individual",
    cpfTitular: "456.123.789-55",
    nomeTitular: "Fernanda Lima",
    motivo: "inclusao_dependente",
    justificativa: "Dependente incluído no plano em novembro e auxílio não recebido nos meses seguintes.",
    competencias: [
      { competenciaReferencia: "2025-11", documentos: [{ nome: "fatura_novembro.pdf", tipo: "fatura_tecnica" }] },
      { competenciaReferencia: "2025-12", documentos: [{ nome: "boleto_dezembro.pdf", tipo: "boleto" }] },
    ],
  });
  apurar(fernanda, "2025-11", 0, 800, true, G); // nada recebido → ressarcir = Devido
  aprovarCompetencia(fernanda.id, "2025-11", G);
  apurar(fernanda, "2025-12", 900, 800, true); // divergência: Pago > Devido — bloqueia a autorização

  /* ── Origem associação — ASSEFAZ ─────────────────────────────────────────────────────── */
  const maria = criarSolicitacaoRetroativa({
    origem: "associacao",
    associacao: "Assefaz",
    arquivoId: arqAssefaz,
    cpfTitular: "345.678.901-22",
    nomeTitular: "Maria Oliveira",
    competencias: [
      {
        competenciaReferencia: "2025-10",
        dataEmissaoBoleto: "2025-10-01", vencimento: "2025-10-10", dataBaixa: "2025-10-09",
        composicao: [
          { beneficiario: "Maria Oliveira", cpf: "345.678.901-22", vinculo: "Titular", valorCobranca: 1019.23, plano: "ASSEFAZ SAFIRA APARTAMENTO EMPRESARIAL" },
          { beneficiario: "Beatriz Oliveira", cpf: "456.789.012-88", vinculo: "Filho(a)", valorCobranca: 530.73, plano: "ASSEFAZ SAFIRA APARTAMENTO EMPRESARIAL" },
        ],
      },
      {
        competenciaReferencia: "2025-11",
        dataEmissaoBoleto: "2025-11-01", vencimento: "2025-11-10", dataBaixa: "2025-11-12",
        composicao: [{ beneficiario: "Maria Oliveira", cpf: "345.678.901-22", vinculo: "Titular", valorCobranca: 1019.23, plano: "ASSEFAZ SAFIRA APARTAMENTO EMPRESARIAL" }],
      },
    ],
  });
  apurar(maria, "2025-10", 1400, 1800, true);
  habilitarRegistroRetroativo(maria.id, "2025-10", A); // HABILITADA explicitamente pela GERDAB (autorizada)
  apurar(maria, "2025-11", 1400, 1850, true);
  desabilitarRegistroRetroativo(maria.id, "2025-11", "Baixa fora do prazo do boleto; registro não habilitado até nova conferência.", A);

  const patricia = criarSolicitacaoRetroativa({
    origem: "associacao",
    associacao: "Assefaz",
    arquivoId: arqAssefaz,
    cpfTitular: "890.123.456-77",
    nomeTitular: "Patrícia Costa",
    competencias: [
      {
        competenciaReferencia: "2026-04",
        dataEmissaoBoleto: "2026-04-01", vencimento: "2026-04-10", dataBaixa: "2026-04-10",
        composicao: [
          { beneficiario: "Patrícia Costa", cpf: "890.123.456-77", vinculo: "Titular", valorCobranca: 1558.62, plano: "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL" },
          { beneficiario: "Lucas Costa", cpf: "901.234.567-00", vinculo: "Filho(a)", valorCobranca: 578.36, plano: "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL" },
        ],
      },
      ...["2026-05", "2026-06"].map((c) => ({
        competenciaReferencia: c,
        dataEmissaoBoleto: `${c}-01`, vencimento: `${c}-10`, dataBaixa: `${c}-10`,
        composicao: [
          { beneficiario: "Patrícia Costa", cpf: "890.123.456-77", vinculo: "Titular", valorCobranca: 1558.62, plano: "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL" },
          { beneficiario: "Lucas Costa", cpf: "901.234.567-00", vinculo: "Filho(a)", valorCobranca: 578.36, plano: "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL" },
        ],
      })),
    ],
  });
  apurar(patricia, "2026-04", 0, 2500, true);
  habilitarRegistroRetroativo(patricia.id, "2026-04", A);
  apurar(patricia, "2026-05", 0, 2600, true);
  habilitarRegistroRetroativo(patricia.id, "2026-05", A);
  apurar(patricia, "2026-06", 100, 2600, true);
  habilitarRegistroRetroativo(patricia.id, "2026-06", A);

  /* ── Origem associação — ASSETRAN ────────────────────────────────────────────────────── */

  criarSolicitacaoRetroativa({
    origem: "associacao",
    associacao: "Assetran",
    arquivoId: arqAssetran,
    cpfTitular: "678.901.234-55",
    nomeTitular: "Roberto Santos",
    competencias: [
      {
        competenciaReferencia: "2026-03",
        dataEmissaoBoleto: "2026-03-01", vencimento: "2026-03-10", dataBaixa: "2026-03-10",
        composicao: [
          { beneficiario: "Roberto Santos", cpf: "678.901.234-55", vinculo: "Titular", valorCobranca: 1100, plano: "CASSI" },
          { beneficiario: "Sandra Santos", cpf: "789.012.345-66", vinculo: "Cônjuge", valorCobranca: 800, plano: "CASSI" },
        ],
      },
    ],
  }); // sem apuração: aguardando conferência da GERDAB

  /* ── Histórico: duas consolidações NURFI já geradas (snapshots imutáveis) ───────────────────────
   * Montadas a partir do que está autorizado e apto; o restante (Fernanda Nov/2025 e Patrícia Abr/2026)
   * permanece apto para a próxima consolidação — a aba Consolidação não fica vazia. Datas/ciclos simulados. */
  const aptas = getSituacaoConsolidacao().aptas;
  const linhas = (itens: [string, string][], ciclo: string) =>
    itens.map(([nome, comp]) => {
      const l = aptas.find((x) => x.nome === nome && x.competenciaReferencia === comp);
      if (!l) throw new Error(`Massa de demonstração incoerente: ${nome} ${comp}`);
      return { ...l, cicloAptidao: ciclo };
    });
  saveConsolidacoesRetroativo([
    {
      id: "cons-demo-2026-08-1",
      ciclo: "2026-08",
      sequencia: 1,
      geradoEm: "2026-08-05T09:40:00",
      responsavel: G,
      linhas: linhas([["Carlos Eduardo Ramos", "2026-01"], ["Carlos Eduardo Ramos", "2026-02"]], "2026-08"),
    },
    {
      id: "cons-demo-2026-09-1",
      ciclo: "2026-09",
      sequencia: 1,
      geradoEm: "2026-09-04T16:20:00",
      responsavel: A,
      linhas: linhas([["Carlos Pereira", "2026-02"], ["Maria Oliveira", "2025-10"]], "2026-09"),
    },
  ]);
}

/**
 * **RECURSO EXCLUSIVO DO PROTÓTIPO — NÃO é requisito funcional de produção:** apaga os dados do Ressarcimento Retroativo (solicitações, notificações,
 * consolidações e planilhas) e recria a massa de demonstração. Não existe em produção.
 */
export function restaurarMassaDemonstracaoRetroativos() {
  if (typeof window === "undefined") return;
  const k = PROSAUDE_STORAGE_KEYS;
  [k.solicitacoesRetroativas, k.notificacoesRetroativo, k.consolidacoesRetroativo, k.planilhasRetroativasOriginais, k.massaDemoRetroativos].forEach((chave) => localStorage.removeItem(chave));
  garantirMassaDemonstracaoRetroativos();
}

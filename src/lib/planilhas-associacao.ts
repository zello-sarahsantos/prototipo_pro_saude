/**
 * Planilhas mensais das associações — análise/conciliação pela GERDAB e consolidação no
 * Fechamento de Pagamento.
 *
 * Fecha a lacuna identificada no plano de impacto desta rodada: o Upload de Planilha
 * (`associacao.upload.tsx`, HU01) nunca persistia nada de verdade — a conferência sempre operava
 * sobre um array fixo (`registrosPlanilhaExemplo`, abaixo, movido para cá a partir daquele
 * arquivo) e o envio só trocava de tela, sem gerar nenhum registro consultável depois. Esta
 * camada corrige isso com uma persistência real (via `prosaude-storage.ts`), mantendo a
 * simulação apenas onde já era explicitamente simulada: a leitura do conteúdo do arquivo em si
 * (parsing de `.xlsx`/`.csv`) continua não implementada — o conteúdo de cada envio real feito
 * pela tela usa o mesmo conjunto de registros de exemplo já validado no protótipo, não um
 * parser de verdade.
 *
 * P1 — Status: reaproveita as MESMAS cores/tokens já usados para `StatusComprovante`
 * (`statusComprovanteCore`, `mock-data.ts`) — nunca uma paleta nova — mas com rótulo
 * contextualizado à entidade "planilha" (nunca "Recusado" para uma planilha negada). Ver
 * `PlanilhaStatusBadge.tsx`.
 *
 * P5 — Fonte de comprovação explícita: `getRegistrosAssociacaoAprovadosNaCompetencia` normaliza
 * as planilhas aprovadas de uma competência num formato pronto para `getRegistrosFechamento`
 * (`fechamento-pagamento.ts`) simplesmente concatenar — nenhum `Comprovante` sintético é criado,
 * nenhuma duplicação da função de consolidação.
 *
 * Princípio (correção conceitual desta rodada): **planilha enviada = planilha baixada pela
 * GERDAB; resultado da análise = informação do sistema.** O arquivo reconstruído para download
 * (`planilha-arquivo-versao.ts`) nunca inclui `status`/`motivo` — só as colunas que a própria
 * associação preenche. `status`/`motivo` continuam existindo neste módulo e na interface,
 * associados à mesma versão, só não entram no arquivo baixado.
 *
 * **Regra de acesso a formalizar em produção (não implementada nesta rodada):** a associação deve
 * ser determinada pelo usuário autenticado — ASSETRAN só acessa envio/histórico/decisões da
 * ASSETRAN, ASSEFAZ só os da ASSEFAZ, sem nenhuma associação enxergar a outra. O seletor de
 * Associação em `associacao.upload.tsx` é só um recurso de navegação/demonstração entre cenários
 * do protótipo — não representa o comportamento definitivo de produção. Todas as funções deste
 * módulo já recebem `associacao` como parâmetro explícito (nunca leem de um estado de sessão), o
 * que facilita essa migração futura: bastaria a camada de autenticação passar a fixar esse
 * parâmetro a partir do usuário logado, em vez de vir de um `<select>` livre.
 */
import {
  loadPlanilhasAssociacao,
  savePlanilhasAssociacao,
  type PlanilhaAssociacao,
  type VersaoPlanilhaAssociacao,
  type DecisaoPlanilhaAssociacao,
  type RegistroPlanilhaAssociacao,
  type StatusPlanilhaAssociacao,
} from "./prosaude-storage";
import { competenciaAtual } from "./mock-data";

export type {
  PlanilhaAssociacao,
  VersaoPlanilhaAssociacao,
  DecisaoPlanilhaAssociacao,
  RegistroPlanilhaAssociacao,
  StatusPlanilhaAssociacao,
};

export const statusPlanilhaLabels: Record<StatusPlanilhaAssociacao, string> = {
  em_analise: "Em Análise",
  aprovada: "Aprovada",
  correcao_solicitada: "Correção Solicitada",
  negada: "Negada",
};

/** Mapeamento só para reaproveitar a cor já definida em `statusComprovanteCore` — nunca para
 *  reaproveitar o rótulo daquele domínio (comprovante individual), que tem vocabulário próprio
 *  ("Recusado", "Em Análise" de documento) diferente do vocabulário de planilha. */
export const corPorStatusPlanilha: Record<StatusPlanilhaAssociacao, "em_analise" | "aprovado" | "correcao_solicitada" | "recusado"> = {
  em_analise: "em_analise",
  aprovada: "aprovado",
  correcao_solicitada: "correcao_solicitada",
  negada: "recusado",
};

/**
 * Colunas do modelo oficial aprovado (`docs/modelo_envio_mensal_associacoes.xlsx`) — fonte única
 * de verdade para rótulo e ordem, reaproveitada por toda superfície que precisa reproduzir
 * exatamente essa estrutura: o modelo em branco para download (`planilha-modelo.ts`), a
 * reconstrução por versão para a GERDAB (`planilha-arquivo-versao.ts`) e o painel "Campos
 * esperados na planilha" (`associacao.upload.tsx`). Nunca duplicar esta lista em outro lugar —
 * é exatamente a divergência que esta correção elimina.
 *
 * **Competência não é uma coluna** — ela já é selecionada obrigatoriamente na interface no
 * momento do envio; Associação + Competência identificam o envio como um todo, a planilha só
 * contém os registros daquela competência.
 */
export const COLUNAS_MODELO_PLANILHA = [
  "Servidor (Titular)",
  "CPF do Titular",
  "Beneficiário",
  "CPF do Beneficiário",
  "Vínculo",
  "Valor Mensal Individual (R$)",
  "Operadora do Plano",
  "Data do Pagamento",
  "Observações",
] as const;

/** Larguras de coluna do modelo oficial aprovado — mesma fonte única, mesma razão de existir. */
export const LARGURAS_MODELO_PLANILHA = [20, 16, 22, 21, 16, 23, 17, 18.5, 28] as const;

/**
 * Conteúdo de exemplo de uma planilha enviada — mesmos 7 registros já validados na conferência
 * do Upload de Planilha (3 válidos, 1 atenção, 3 não elegíveis), agora movidos para cá para
 * serem a fonte única tanto do passo de conferência (`associacao.upload.tsx`) quanto de
 * qualquer envio real simulado por esta camada. Nenhuma pessoa nova foi inventada — são as
 * mesmas já existentes no protótipo, agora com `operadora`/`dataPagamento` (modelo oficial
 * aprovado) preenchidos.
 */
export const registrosPlanilhaExemplo: RegistroPlanilhaAssociacao[] = [
  { servidor: "João da Silva", cpfTitular: "123.456.789-00", beneficiario: "João da Silva", cpf: "123.***.***-00", vinculo: "Titular", valor: 1200, operadora: "Amil", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "João da Silva", cpfTitular: "123.456.789-00", beneficiario: "Ana da Silva", cpf: "234.***.***-11", vinculo: "Cônjuge", valor: 890, operadora: "Amil", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "Maria Oliveira", cpf: "345.***.***-22", vinculo: "Titular", valor: 1800, operadora: "SulAmérica", dataPagamento: "2026-08-10", status: "válido" },
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "José Oliveira", cpf: "", vinculo: "Pai", valor: 1100, operadora: "SulAmérica", dataPagamento: "2026-08-10", status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
  { servidor: "Ricardo Mendes", cpfTitular: "456.789.012-33", beneficiario: "", cpf: "456.789.012-33", vinculo: "Titular", valor: 950, operadora: "Bradesco", dataPagamento: "2026-08-08", status: "atenção", motivo: "Nome do beneficiário não informado" },
  { servidor: "Ricardo Mendes", cpfTitular: "456.789.012-33", beneficiario: "Beatriz Mendes", cpf: "567.***.***-44", vinculo: "Mãe", valor: 950, operadora: "Bradesco", dataPagamento: "2026-08-08", status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
  { servidor: "Fernando Diniz", cpfTitular: "111.222.333-44", beneficiario: "Fernando Diniz", cpf: "111.***.***-44", vinculo: "Titular", valor: 900, operadora: "CASSI", dataPagamento: "2026-08-08", status: "não_elegível", motivo: "CPF do titular e do beneficiário não encontrados no cadastro do Pró-Saúde" },
];

/** Só os registros que já passaram na validação prévia (HU01) — são os únicos que um envio real
 *  chegaria a levar à GERDAB (o botão de envio só libera com 100% válido). */
export const registrosValidosExemplo = registrosPlanilhaExemplo.filter((r) => r.status === "válido");

function idPlanilha(associacao: string, competencia: string): string {
  return `planilha-${associacao}-${competencia}`;
}

export function getPlanilhaAssociacao(associacao: string, competencia: string): PlanilhaAssociacao | undefined {
  return loadPlanilhasAssociacao().find((p) => p.associacao === associacao && p.competencia === competencia);
}

export function listarPlanilhasAssociacao(): PlanilhaAssociacao[] {
  return loadPlanilhasAssociacao();
}

export function listarPlanilhasPorAssociacao(associacao: string): PlanilhaAssociacao[] {
  return loadPlanilhasAssociacao()
    .filter((p) => p.associacao === associacao)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

/** Versão vigente (a mais recente) de uma planilha — nunca undefined se `versoes` não está vazio. */
export function versaoVigente(planilha: PlanilhaAssociacao): VersaoPlanilhaAssociacao {
  return planilha.versoes[planilha.versoes.length - 1];
}

/** Status atual de uma planilha — sempre derivado da versão vigente, nunca um campo próprio
 *  guardado à parte (mesmo padrão "recompute on demand" já usado no resto do protótipo). */
export function statusAtualPlanilha(planilha: PlanilhaAssociacao): StatusPlanilhaAssociacao {
  return versaoVigente(planilha).decisao?.status ?? "em_analise";
}

/**
 * Registra um envio (inicial ou reenvio) de planilha para uma competência.
 *
 * P6 — nunca sobrescreve silenciosamente: se já existir uma planilha para este par
 * (associação, competência), este envio vira uma NOVA versão (reenvio), preservando a versão
 * anterior e sua decisão intactas. Se não existir, cria a entidade com a versão 1.
 *
 * Chamado só quando a tela de upload já confirmou que o envio é permitido para o estado atual
 * (nenhuma planilha ainda, ou a vigente está "Correção Solicitada") — esta função em si não
 * bloqueia reenvio sobre uma planilha "Em Análise"/"Aprovada"/"Negada"; a regra de quando
 * permitir chamar fica na tela (ver `associacao.upload.tsx`), mesma separação já usada em outras
 * partes do protótipo entre "motor" e "UI que decide quando acionar o motor".
 */
export function enviarPlanilhaAssociacao(
  associacao: string,
  competencia: string,
  registros: RegistroPlanilhaAssociacao[],
): PlanilhaAssociacao {
  const todas = loadPlanilhasAssociacao();
  const existente = todas.find((p) => p.associacao === associacao && p.competencia === competencia);

  const novaVersao: VersaoPlanilhaAssociacao = {
    versao: existente ? existente.versoes.length + 1 : 1,
    enviadoEm: new Date().toISOString(),
    registros,
  };

  let atualizada: PlanilhaAssociacao;
  if (existente) {
    atualizada = { ...existente, versoes: [...existente.versoes, novaVersao] };
    savePlanilhasAssociacao(todas.map((p) => (p.id === existente.id ? atualizada : p)));
  } else {
    atualizada = { id: idPlanilha(associacao, competencia), associacao, competencia, versoes: [novaVersao] };
    savePlanilhasAssociacao([...todas, atualizada]);
  }
  return atualizada;
}

/**
 * Decide a versão vigente (a que está "Em Análise") de uma planilha — Aprovar, Solicitar
 * Correção ou Negar. Nunca reabre/edita uma versão já decidida.
 *
 * P2 — justificativa obrigatória para "correcao_solicitada" e "negada" (validado pelo chamador,
 * mas também aqui como proteção de dado — nunca persiste essas duas decisões sem justificativa).
 */
export function decidirPlanilhaAssociacao(
  associacao: string,
  competencia: string,
  decisao: { status: Exclude<StatusPlanilhaAssociacao, "em_analise">; justificativa?: string; decididoPor: string },
): void {
  if ((decisao.status === "correcao_solicitada" || decisao.status === "negada") && !decisao.justificativa?.trim()) {
    throw new Error("Justificativa obrigatória para Solicitar Correção ou Negar.");
  }
  const todas = loadPlanilhasAssociacao();
  const planilha = todas.find((p) => p.associacao === associacao && p.competencia === competencia);
  if (!planilha) return;

  const versoes = [...planilha.versoes];
  const ultima = versoes[versoes.length - 1];
  versoes[versoes.length - 1] = {
    ...ultima,
    decisao: {
      status: decisao.status,
      decididoEm: new Date().toISOString(),
      decididoPor: decisao.decididoPor,
      justificativa: decisao.justificativa?.trim() || undefined,
    },
  };
  savePlanilhasAssociacao(todas.map((p) => (p.id === planilha.id ? { ...planilha, versoes } : p)));
}

/**
 * Semeia, uma única vez (idempotente), uma planilha de exemplo já "Em Análise" — mesmo espírito
 * de "exemplo mockado permanente" já usado em `pendencias-documentais.ts`
 * (`garantirExemploDocumentoEmAnalise`): permite demonstrar Aprovar/Solicitar Correção/Negar
 * imediatamente, sem precisar passar primeiro pela Área da Associação. Usa a competência atual
 * do Módulo de Pagamento (`competenciaAtual`) — a mesma já pré-selecionada por padrão no
 * Fechamento de Pagamento — para que uma aprovação feita aqui já apareça lá sem trocar de filtro.
 */
export function garantirPlanilhaExemplo() {
  if (typeof window === "undefined") return;
  const ASSOCIACAO_EXEMPLO = "Assetran";
  if (getPlanilhaAssociacao(ASSOCIACAO_EXEMPLO, competenciaAtual)) return;
  enviarPlanilhaAssociacao(ASSOCIACAO_EXEMPLO, competenciaAtual, registrosValidosExemplo);
}

/**
 * Um titular (grupo familiar) consolidado a partir de uma planilha de associação aprovada,
 * pronto para virar mais um `RegistroFechamento` — nunca um `Comprovante` sintético (P5). Valor
 * soma todas as linhas do grupo (titular + dependentes) daquele CPF na versão aprovada.
 */
export interface RegistroAssociacaoConsolidado {
  cpfTitular: string;
  nomeTitular: string;
  valor: number;
  associacao: string;
  competencia: string;
  planilhaId: string;
  statusPlanilha: StatusPlanilhaAssociacao;
}

/**
 * Normaliza, para uma competência, todos os registros de planilhas **aprovadas** — a única
 * origem de dado que o Fechamento de Pagamento (`getRegistrosFechamento`) deve concatenar ao
 * que já calcula a partir do fluxo individual. Nenhuma planilha "Em Análise", "Correção
 * Solicitada" ou "Negada" contribui registro nenhum aqui (regra 2.1.3/2.3 do pedido: só
 * aprovados ficam disponíveis; negados nunca chegam ao relatório).
 */
export function getRegistrosAssociacaoAprovadosNaCompetencia(competencia: string): RegistroAssociacaoConsolidado[] {
  const planilhas = loadPlanilhasAssociacao().filter((p) => p.competencia === competencia);
  const resultado: RegistroAssociacaoConsolidado[] = [];

  for (const planilha of planilhas) {
    if (statusAtualPlanilha(planilha) !== "aprovada") continue;
    const versao = versaoVigente(planilha);
    const porTitular = new Map<string, { nome: string; valor: number }>();
    for (const registro of versao.registros) {
      if (registro.status !== "válido") continue; // defensivo — só deveriam existir válidos aqui
      const atual = porTitular.get(registro.cpfTitular) ?? { nome: registro.servidor, valor: 0 };
      porTitular.set(registro.cpfTitular, { nome: atual.nome, valor: atual.valor + registro.valor });
    }
    for (const [cpfTitular, { nome, valor }] of porTitular) {
      resultado.push({
        cpfTitular,
        nomeTitular: nome,
        valor,
        associacao: planilha.associacao,
        competencia,
        planilhaId: planilha.id,
        statusPlanilha: "aprovada",
      });
    }
  }
  return resultado;
}

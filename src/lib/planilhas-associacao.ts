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
  type AnaliseFinanceiraPlanilha as AnaliseFinanceiraPlanilhaStorage,
} from "./prosaude-storage";
import { competenciaAtual } from "./mock-data";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";
import { anexarEvento } from "./auditoria";
import { validarVinculoTitularAssociacao } from "./base-institucional";

export type {
  PlanilhaAssociacao,
  VersaoPlanilhaAssociacao,
  DecisaoPlanilhaAssociacao,
  RegistroPlanilhaAssociacao,
  StatusPlanilhaAssociacao,
};

export const statusPlanilhaLabels: Record<StatusPlanilhaAssociacao, string> = {
  em_analise: "Em análise",
  // Rótulo revisado (Fase 7): a decisão sobre o ARQUIVO e a conferência financeira por linha acontecem juntas,
  // numa única ação ("Confirmar análise") — o status técnico continua "aprovada" para não regredir o resto do
  // fluxo (reenvio, exportações), só o rótulo mudou.
  aprovada: "Análise concluída",
  correcao_solicitada: "Correção Solicitada",
  negada: "Recusada",
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
 * Modelos por associação (Fase 5, ata 22/09/2026, seção 3.9). A associação é determinada pela
 * associação autenticada (no protótipo, o seletor de `associacao.upload.tsx` a simula) — nunca
 * escolhida como se fosse um formato à parte. Existem quatro modelos, identificáveis
 * separadamente: {ASSEFAZ, ASSETRAN} × {ordinário, retroativo}. **A única coluna que muda entre
 * as associações é a de identificação do plano**: ASSEFAZ → `Nome do Plano`; ASSETRAN →
 * `Operadora do Plano`. O modelo ordinário da ASSETRAN é exatamente `COLUNAS_MODELO_PLANILHA`
 * (o modelo oficial já aprovado, sem nenhuma alteração).
 */
export type AssociacaoModelo = "Assefaz" | "Assetran";
export type TipoModeloPlanilha = "ordinario" | "retroativo";

export const ASSOCIACOES_MODELO: readonly AssociacaoModelo[] = ["Assefaz", "Assetran"];

export const ROTULO_PLANO_POR_ASSOCIACAO: Record<AssociacaoModelo, "Nome do Plano" | "Operadora do Plano"> = {
  Assefaz: "Nome do Plano",
  Assetran: "Operadora do Plano",
};

/** Linha (1-based) do cabeçalho em ambos os tipos de modelo — linhas 1–2 são título/instrução. */
export const LINHA_CABECALHO_MODELO = 4;

/** `undefined` para qualquer valor fora das duas associações — nunca assume uma delas em silêncio. */
export function getAssociacaoModelo(associacao: string): AssociacaoModelo | undefined {
  const normalizada = associacao.trim().toLowerCase();
  return ASSOCIACOES_MODELO.find((a) => a.toLowerCase() === normalizada);
}

function exigirAssociacaoModelo(associacao: string): AssociacaoModelo {
  const a = getAssociacaoModelo(associacao);
  if (!a) throw new Error(`Associação sem modelo de planilha definido: ${associacao}`);
  return a;
}

/**
 * Colunas do retroativo — estrutura validada (plano v3, seção 3): a coluna `Valor` é o valor da
 * cobrança/plano informado pela associação, **sem juros** — NÃO é o `Valor Pago` do Relatório
 * Financeiro Retroativo (auxílio efetivamente recebido no contracheque, apurado pela GERDAB).
 * Sem Sexo, Estado Civil, órgão genérico ou Saldo (ata 3.9).
 */
const COLUNAS_RETROATIVO_BASE = [
  "Servidor/Titular",
  "CPF do Titular",
  "Beneficiário",
  "CPF do Beneficiário",
  "Grau de Parentesco/Vínculo",
  "Mês/Ano de Referência",
  "Data de Emissão do Boleto",
  "Vencimento",
  "Data da Baixa/Pagamento",
  "Valor",
] as const;

/** Colunas do modelo da associação e do tipo — fonte única (download, reconstrução da GERDAB,
 *  painel "Campos esperados" e validação estrutural). */
export function getColunasModelo(associacao: string, tipo: TipoModeloPlanilha): string[] {
  const rotuloPlano = ROTULO_PLANO_POR_ASSOCIACAO[exigirAssociacaoModelo(associacao)];
  if (tipo === "retroativo") return [...COLUNAS_RETROATIVO_BASE, rotuloPlano];
  return COLUNAS_MODELO_PLANILHA.map((c) => (c === "Operadora do Plano" ? rotuloPlano : c));
}

export function getLargurasModelo(tipo: TipoModeloPlanilha): number[] {
  return tipo === "retroativo" ? [22, 16, 22, 21, 22, 18, 22, 14, 22, 14, 38] : [...LARGURAS_MODELO_PLANILHA];
}

/** Nome de arquivo identificável por associação e tipo — nunca um único arquivo para todas. */
export function getNomeArquivoModelo(associacao: string, tipo: TipoModeloPlanilha): string {
  const a = exigirAssociacaoModelo(associacao).toLowerCase();
  return tipo === "retroativo" ? `modelo_envio_retroativo_${a}.xlsx` : `modelo_envio_mensal_${a}.xlsx`;
}

export interface ResultadoEstruturaModelo {
  valida: boolean;
  problemas: string[];
}

/**
 * Validação estrutural do cabeçalho de um arquivo contra o modelo da associação/tipo: nomes e
 * ordem exatos, sem colunas faltando ou sobrando. Aponta explicitamente o uso do rótulo de plano
 * da outra associação (ex.: `Operadora do Plano` num arquivo da ASSEFAZ). Não lê o conteúdo das
 * linhas — o protótipo ainda não faz parsing real de `.xlsx`/`.csv` (limitação já registrada).
 */
export function validarEstruturaModelo(cabecalho: string[], associacao: string, tipo: TipoModeloPlanilha): ResultadoEstruturaModelo {
  const a = exigirAssociacaoModelo(associacao);
  const esperado = getColunasModelo(a, tipo);
  const recebido = cabecalho.map((c) => (c ?? "").toString().trim()).filter((c) => c !== "");
  const problemas: string[] = [];

  const outroRotulo = ROTULO_PLANO_POR_ASSOCIACAO[a === "Assefaz" ? "Assetran" : "Assefaz"];
  if (recebido.includes(outroRotulo) && !esperado.includes(outroRotulo)) {
    problemas.push(`Coluna "${outroRotulo}" não pertence ao modelo da ${a.toUpperCase()} — use "${ROTULO_PLANO_POR_ASSOCIACAO[a]}".`);
  }
  for (const col of esperado) if (!recebido.includes(col)) problemas.push(`Coluna obrigatória ausente: "${col}".`);
  for (const col of recebido) if (!esperado.includes(col) && col !== outroRotulo) problemas.push(`Coluna não prevista no modelo: "${col}".`);
  if (problemas.length === 0 && recebido.some((c, i) => c !== esperado[i])) {
    problemas.push("As colunas estão fora da ordem do modelo.");
  }
  return { valida: problemas.length === 0, problemas };
}

/**
 * **MASSA DE DEMONSTRAÇÃO (protótipo — não é regra de negócio nem persistência de produção).**
 * Conteúdo simulado de uma planilha ordinária enviada, usado como fonte única tanto do passo de
 * conferência (`associacao.upload.tsx`) quanto de qualquer envio simulado por esta camada (a leitura
 * real do arquivo continua não implementada no fluxo ordinário). Cada associação recebe titulares
 * coerentes com o cadastro simulado (`servidoresList`: ASSETRAN — Carlos Pereira, Roberto Santos;
 * ASSEFAZ — Maria Oliveira, Patrícia Costa) e, para demonstrar a validação de vínculo, um titular de
 * OUTRA associação e um titular SEM associação. O status "não elegível" desses dois vem da regra
 * `validarVinculoTitularAssociacao` (nunca fixado à mão). Regra funcional de produção: o vínculo é
 * consultado na fonte institucional confiável; aqui essa fonte é simulada por mocks locais.
 */
type LinhaExemplo = Omit<RegistroPlanilhaAssociacao, "operadora" | "nomePlano"> & { operadora: string };

const LINHAS_EXEMPLO_ASSETRAN: LinhaExemplo[] = [
  { servidor: "Carlos Pereira", cpfTitular: "567.890.123-44", beneficiario: "Carlos Pereira", cpf: "567.***.***-44", vinculo: "Titular", valor: 900, operadora: "Amil", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Roberto Santos", cpfTitular: "678.901.234-55", beneficiario: "Roberto Santos", cpf: "678.***.***-55", vinculo: "Titular", valor: 1100, operadora: "CASSI", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Roberto Santos", cpfTitular: "678.901.234-55", beneficiario: "Sandra Santos", cpf: "789.***.***-66", vinculo: "Cônjuge", valor: 800, operadora: "CASSI", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Roberto Santos", cpfTitular: "678.901.234-55", beneficiario: "Bruno Santos", cpf: "890.***.***-12", vinculo: "Filho(a)", valor: 500, operadora: "CASSI", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Roberto Santos", cpfTitular: "678.901.234-55", beneficiario: "", cpf: "890.***.***-77", vinculo: "Filho(a)", valor: 450, operadora: "CASSI", dataPagamento: "2026-08-08", status: "atenção", motivo: "Nome do beneficiário não informado" },
  { servidor: "Roberto Santos", cpfTitular: "678.901.234-55", beneficiario: "José Santos", cpf: "", vinculo: "Pai", valor: 700, operadora: "CASSI", dataPagamento: "2026-08-08", status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
  // Titular de OUTRA associação (ASSEFAZ) e titular SEM associação — inválidos por vínculo (regra aplicada abaixo).
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "Maria Oliveira", cpf: "345.***.***-22", vinculo: "Titular", valor: 1800, operadora: "SulAmérica", dataPagamento: "2026-08-10", status: "válido" },
  { servidor: "João da Silva", cpfTitular: "123.456.789-00", beneficiario: "João da Silva", cpf: "123.***.***-00", vinculo: "Titular", valor: 1200, operadora: "Bradesco", dataPagamento: "2026-08-10", status: "válido" },
];

const LINHAS_EXEMPLO_ASSEFAZ: LinhaExemplo[] = [
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "Maria Oliveira", cpf: "345.***.***-22", vinculo: "Titular", valor: 1800, operadora: "", dataPagamento: "2026-08-10", status: "válido" },
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "Beatriz Oliveira", cpf: "456.***.***-88", vinculo: "Filho(a)", valor: 578.36, operadora: "", dataPagamento: "2026-08-10", status: "válido" },
  { servidor: "Patrícia Costa", cpfTitular: "890.123.456-77", beneficiario: "Patrícia Costa", cpf: "890.***.***-77", vinculo: "Titular", valor: 2500, operadora: "", dataPagamento: "2026-08-12", status: "válido" },
  { servidor: "Patrícia Costa", cpfTitular: "890.123.456-77", beneficiario: "", cpf: "901.***.***-00", vinculo: "Cônjuge", valor: 1200, operadora: "", dataPagamento: "2026-08-12", status: "atenção", motivo: "Nome do beneficiário não informado" },
  { servidor: "Maria Oliveira", cpfTitular: "345.678.901-22", beneficiario: "José Oliveira", cpf: "", vinculo: "Pai", valor: 1100, operadora: "", dataPagamento: "2026-08-10", status: "não_elegível", motivo: "Vínculo não previsto pelo Pró-Saúde" },
  { servidor: "Carlos Pereira", cpfTitular: "567.890.123-44", beneficiario: "Carlos Pereira", cpf: "567.***.***-44", vinculo: "Titular", valor: 900, operadora: "", dataPagamento: "2026-08-08", status: "válido" },
  { servidor: "Eduardo Nascimento", cpfTitular: "234.567.890-99", beneficiario: "Eduardo Nascimento", cpf: "234.***.***-99", vinculo: "Titular", valor: 950, operadora: "", dataPagamento: "2026-08-08", status: "válido" },
];

const PLANOS_EXEMPLO_ASSEFAZ: Record<string, string> = {
  "345.678.901-22": "ASSEFAZ SAFIRA APARTAMENTO EMPRESARIAL",
  "890.123.456-77": "ASSEFAZ DIAMANTE APARTAMENTO EMPRESARIAL",
  "567.890.123-44": "ASSEFAZ RUBI APARTAMENTO EMPRESARIAL",
  "234.567.890-99": "ASSEFAZ RUBI APARTAMENTO EMPRESARIAL",
};

/** Conteúdo simulado da planilha ordinária da associação, já com a validação de vínculo
 *  Associação × Titular aplicada (título e motivo vêm da regra, não de texto fixo). */
export function getRegistrosPlanilhaExemplo(associacao: string): RegistroPlanilhaAssociacao[] {
  const ehAssefaz = getAssociacaoModelo(associacao) === "Assefaz";
  return (ehAssefaz ? LINHAS_EXEMPLO_ASSEFAZ : LINHAS_EXEMPLO_ASSETRAN).map((l): RegistroPlanilhaAssociacao => {
    const divergenciaVinculo = validarVinculoTitularAssociacao(l.cpfTitular, l.servidor, associacao);
    const base: RegistroPlanilhaAssociacao = ehAssefaz ? { ...l, operadora: "", nomePlano: PLANOS_EXEMPLO_ASSEFAZ[l.cpfTitular] } : l;
    return divergenciaVinculo ? { ...base, status: "não_elegível", motivo: divergenciaVinculo } : base;
  });
}

/** Só os registros que já passaram na validação prévia (HU01) — são os únicos que um envio real
 *  chegaria a levar à GERDAB (o botão de envio só libera com 100% válido). */
export function getRegistrosValidosExemplo(associacao: string): RegistroPlanilhaAssociacao[] {
  return getRegistrosPlanilhaExemplo(associacao).filter((r) => r.status === "válido");
}

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

/* ── Conferência financeira por LINHA (Fase 7, revisão) ────────────────────────────────────────
 *
 * A stakeholder pediu para eliminar o gate duplo "Aprovar planilha → habilitar titular": a própria
 * planilha completa É a área de conferência. Enquanto a análise não é concluída, o status é só
 * **Em análise** (laranja). A conferência é feita **por linha original** (titular e cada
 * beneficiário/dependente têm seu próprio checkbox — nunca consolidada antecipadamente no
 * titular); a seleção não presume nada (nasce vazia) e "Selecionar todos"/"Limpar seleção" são
 * ações explícitas do analista. Uma única ação, **Confirmar análise**, registra de uma vez as
 * linhas consideradas — status passa a **Análise concluída** (valor técnico interno continua
 * `"aprovada"`, só o rótulo mudou, para não regredir o restante do fluxo: reenvio, exportações
 * etc.). Não há mais "Habilitar"/"Não habilitar" nem justificativa por titular — a decisão é a
 * própria seleção de linhas, confirmada de uma vez. A seleção pode ser reaberta depois
 * ("Editar seleção"): cada confirmação é um novo evento append-only (histórico preservado).
 *
 * O arquivo original (`registros` da versão) nunca é alterado por essa decisão — só metadados
 * (`analises`) são anexados à versão.
 */

/** Índices (na `registros` da versão vigente) das linhas consideradas numa confirmação — tipo
 *  definido em `prosaude-storage.ts`, só reexportado aqui (fonte única). */
export type AnaliseFinanceiraPlanilha = AnaliseFinanceiraPlanilhaStorage;

/** Última análise financeira confirmada da versão vigente — `undefined` enquanto "Em análise". */
export function getAnaliseFinanceiraVigente(planilha: PlanilhaAssociacao): AnaliseFinanceiraPlanilha | undefined {
  const lista = versaoVigente(planilha).analises ?? [];
  return lista[lista.length - 1];
}

export function getHistoricoAnaliseFinanceira(planilha: PlanilhaAssociacao): AnaliseFinanceiraPlanilha[] {
  return versaoVigente(planilha).analises ?? [];
}

/**
 * **Confirmar análise** — ação única e explícita: registra as linhas (índices na versão vigente,
 * só entre as de status "válido") consideradas para o Fechamento/NURFI, e marca a decisão da
 * planilha como concluída (mesmo status técnico `"aprovada"`; rótulo "Análise concluída"). Pode
 * ser chamada de novo depois (reabrir a seleção) — cada chamada é um novo evento na trilha,
 * nenhuma é apagada.
 */
export function confirmarAnaliseFinanceira(
  associacao: string,
  competencia: string,
  indicesConsiderados: number[],
  responsavel: string,
): PlanilhaAssociacao {
  const todas = loadPlanilhasAssociacao();
  const planilha = todas.find((p) => p.associacao === associacao && p.competencia === competencia);
  if (!planilha) throw new Error("Planilha não encontrada.");
  if (statusAtualPlanilha(planilha) === "correcao_solicitada" || statusAtualPlanilha(planilha) === "negada") {
    throw new Error("Esta versão já foi encerrada (correção solicitada ou recusada); a conferência não está disponível.");
  }
  const versoes = [...planilha.versoes];
  const idx = versoes.length - 1;
  const atual = versoes[idx];
  const validos = new Set(atual.registros.map((r, i) => (r.status === "válido" ? i : -1)).filter((i) => i >= 0));
  for (const i of indicesConsiderados) {
    if (!validos.has(i)) throw new Error("Seleção inválida: só linhas válidas podem ser consideradas.");
  }
  const entrada: AnaliseFinanceiraPlanilha = {
    concluidaEm: new Date().toISOString(),
    responsavel,
    indicesConsiderados: [...new Set(indicesConsiderados)].sort((a, b) => a - b),
  };
  versoes[idx] = {
    ...atual,
    analises: anexarEvento(atual.analises ?? [], entrada),
    // Reaproveita o mesmo campo/pipeline de status já usado por Solicitar Correção/Recusar — só o
    // rótulo ("Análise concluída") muda; nenhum tipo novo de status foi criado.
    decisao: { status: "aprovada", decididoEm: entrada.concluidaEm, decididoPor: responsavel },
  };
  const atualizada = { ...planilha, versoes };
  savePlanilhasAssociacao(todas.map((p) => (p.id === planilha.id ? atualizada : p)));
  return atualizada;
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
  if (localStorage.getItem(PROSAUDE_STORAGE_KEYS.massaDemoPlanilhas) === VERSAO_MASSA_PLANILHAS) return;
  // Massa de uma versão anterior da demonstração (ou primeira vez): reinicia SÓ as planilhas de associação.
  localStorage.removeItem(PROSAUDE_STORAGE_KEYS.planilhasAssociacao);
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.massaDemoPlanilhas, VERSAO_MASSA_PLANILHAS);

  const R = "Sarah Santos";
  // 1) ASSETRAN — planilha ainda EM ANÁLISE (sem "Confirmar análise" nenhuma): Carlos Pereira é um
  //    titular sozinho (sem dependente válido) e Roberto Santos é um grupo com titular + 2 dependentes
  //    válidos (Sandra, Bruno) — massa pronta para testar ao vivo "titular sozinho", "titular + todos os
  //    dependentes aprovados" e "grupo com seleção parcial" (ex.: manter Roberto e Sandra, desmarcar Bruno).
  enviarPlanilhaAssociacao("Assetran", competenciaAtual, getRegistrosValidosExemplo("Assetran"));

  // 2) ASSEFAZ — análise já CONCLUÍDA: Maria Oliveira com o titular aprovado e a dependente Beatriz
  //    DESMARCADA (índice 1 fora da seleção) e Patrícia Costa (titular sozinha, sem dependente válido)
  //    aprovada — demonstra o efeito no Fechamento (Maria some com o valor só dela) e o histórico de uma
  //    análise já concluída, sem precisar de nenhuma ação na tela.
  enviarPlanilhaAssociacao("Assefaz", competenciaAtual, getRegistrosValidosExemplo("Assefaz"));
  confirmarAnaliseFinanceira("Assefaz", competenciaAtual, [0, 2], R);

  // 3) ASSEFAZ, competência anterior — planilha RECUSADA (com justificativa): estado definitivo negativo,
  //    sem conferência financeira (continua fora do escopo deste refinamento).
  const anterior2 = proximaCompetenciaAnterior(proximaCompetenciaAnterior(competenciaAtual));
  enviarPlanilhaAssociacao("Assefaz", anterior2, getRegistrosValidosExemplo("Assefaz"));
  decidirPlanilhaAssociacao("Assefaz", anterior2, { status: "negada", justificativa: "Planilha com valores divergentes dos boletos; reenviar após conferência com a operadora.", decididoPor: R });

  // 4) ASSETRAN, competência anterior — planilha ainda EM ANÁLISE (sem decisão definitiva), para demonstrar
  //    a tela antes de qualquer conferência.
  enviarPlanilhaAssociacao("Assetran", proximaCompetenciaAnterior(competenciaAtual), getRegistrosValidosExemplo("Assetran"));
}

/** Versão da massa de planilhas: mudar força a reinicialização da demonstração (protótipo). */
const VERSAO_MASSA_PLANILHAS = "4";

function proximaCompetenciaAnterior(comp: string): string {
  const [a, m] = comp.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Uma linha da composição do grupo familiar consolidado — mesma linha da planilha da
 *  associação, só reexposta (nunca recalculada) para alimentar o drill-down do Fechamento de
 *  Pagamento (`fechamento-pagamento.ts`). */
export interface ComposicaoAssociacaoIntegrante {
  beneficiario: string;
  cpf: string;
  vinculo: string;
  valor: number;
  /** Operadora do próprio beneficiário nesta linha da planilha (`RegistroPlanilhaAssociacao.operadora`)
   *  — nunca a mesma operadora do titular assumida para o grupo inteiro; cada integrante mantém a
   *  sua (correção da coluna "Operadora/Associação"). */
  operadora: string;
}

/**
 * Um titular (grupo familiar) consolidado a partir de uma planilha de associação aprovada,
 * pronto para virar mais um `RegistroFechamento` — nunca um `Comprovante` sintético (P5). Valor
 * soma todas as linhas do grupo (titular + dependentes) daquele CPF na versão aprovada.
 * `composicao` preserva as linhas individuais que formam essa soma, para o drill-down do
 * Fechamento — nunca uma segunda apuração, é a mesma leitura de `versao.registros` já feita
 * abaixo, só sem descartar o detalhe por integrante.
 */
export interface RegistroAssociacaoConsolidado {
  cpfTitular: string;
  nomeTitular: string;
  valor: number;
  associacao: string;
  competencia: string;
  planilhaId: string;
  statusPlanilha: StatusPlanilhaAssociacao;
  composicao: ComposicaoAssociacaoIntegrante[];
}

/**
 * Normaliza, para uma competência, os registros de planilhas cuja análise financeira foi
 * **confirmada** (Fase 7, revisão) — a única origem de dado que o Fechamento de Pagamento
 * (`getRegistrosFechamento`) deve concatenar ao que já calcula a partir do fluxo individual.
 * Só entram as **linhas** (titular ou beneficiário) que a GERDAB manteve selecionadas na
 * confirmação; o valor do grupo é a soma só dessas linhas — nunca da planilha inteira. O titular
 * sempre aparece (é quem `registro.servidor`/`registro.cpfTitular` identifica em cada linha,
 * mesmo quando só uma linha de dependente permanece selecionada); dependentes nunca viram linha
 * financeira própria. Nenhuma planilha "Em Análise" (sem confirmação), "Correção Solicitada" ou
 * "Negada" contribui registro nenhum aqui.
 */
export function getRegistrosAssociacaoAprovadosNaCompetencia(competencia: string): RegistroAssociacaoConsolidado[] {
  const planilhas = loadPlanilhasAssociacao().filter((p) => p.competencia === competencia);
  const resultado: RegistroAssociacaoConsolidado[] = [];

  for (const planilha of planilhas) {
    if (statusAtualPlanilha(planilha) !== "aprovada") continue;
    const analise = getAnaliseFinanceiraVigente(planilha);
    if (!analise) continue; // defensivo — sem confirmação, nada entra
    const versao = versaoVigente(planilha);
    const consideradas = new Set(analise.indicesConsiderados);
    const porTitular = new Map<string, { nome: string; valor: number; composicao: ComposicaoAssociacaoIntegrante[] }>();
    versao.registros.forEach((registro, i) => {
      if (registro.status !== "válido") return; // defensivo — só deveriam existir válidos aqui
      if (!consideradas.has(i)) return;
      const atual = porTitular.get(registro.cpfTitular) ?? { nome: registro.servidor, valor: 0, composicao: [] };
      atual.valor += registro.valor;
      atual.composicao.push({
        beneficiario: registro.beneficiario,
        cpf: registro.cpf,
        vinculo: registro.vinculo,
        valor: registro.valor,
        operadora: registro.operadora,
      });
      porTitular.set(registro.cpfTitular, atual);
    });
    for (const [cpfTitular, { nome, valor, composicao }] of porTitular) {
      resultado.push({
        cpfTitular,
        nomeTitular: nome,
        valor,
        associacao: planilha.associacao,
        competencia,
        planilhaId: planilha.id,
        statusPlanilha: "aprovada",
        composicao,
      });
    }
  }
  return resultado;
}

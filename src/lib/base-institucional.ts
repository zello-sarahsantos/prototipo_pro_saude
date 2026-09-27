/**
 * Ponto único de consulta à "base institucional segura" (Fase 0 do plano de Ressarcimento
 * Retroativo, ata de 22/09/2026).
 *
 * **Regra funcional (decisão fechada):** as associações informam só CPF; a matrícula usada no
 * relatório destinado ao NURFI é recuperada da base institucional a partir do CPF do titular.
 * Associações não informam matrícula nas planilhas.
 *
 * **Limitação técnica do protótipo (NÃO é regra de negócio):** não existe base institucional real
 * aqui. Esta camada *simula* essa recuperação consultando os dois mocks já existentes —
 * `servidoresList` (Módulo de Cadastro) e `beneficiariosPagamento` (Módulo de Pagamento) —, sem
 * criar nenhuma fonte nova de pessoas. Esses mocks são datasets intencionalmente isolados (ver
 * `mock-data.ts`); esta é a ÚNICA exceção autorizada a esse isolamento (decisão explícita do
 * usuário, plano v3), e nenhum outro ponto do código deve cruzá-los por CPF/matrícula. Um CPF que
 * não exista em nenhum dos dois mocks simplesmente não tem correspondência na demonstração.
 *
 * Prioridade: `beneficiariosPagamento` (dado do próprio Módulo de Pagamento, onde o titular já
 * carrega `matricula`) e, na ausência, `servidoresList`.
 */
import { servidoresList, type ServidorListItem } from "./mock-data";
import { getBeneficiariosPagamentoAtual } from "./prosaude-storage";

export type FonteInstitucional = "beneficiariosPagamento" | "servidoresList";

export interface TitularInstitucional {
  cpf: string;
  nome: string;
  matricula: string;
  fonte: FonteInstitucional;
}

/** Compara CPFs ignorando pontuação (planilhas podem trazer formatos diferentes). */
export function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Titular da base institucional (simulada) correspondente ao CPF, se houver e se tiver matrícula. */
export function getTitularInstitucionalPorCpf(cpf: string): TitularInstitucional | undefined {
  const alvo = normalizarCpf(cpf);
  if (!alvo) return undefined;

  const doPagamento = getBeneficiariosPagamentoAtual().find(
    (b) => b.parentesco === "Titular" && b.cpf && b.matricula && normalizarCpf(b.cpf) === alvo,
  );
  if (doPagamento) {
    return { cpf: doPagamento.cpf!, nome: doPagamento.nome, matricula: doPagamento.matricula!, fonte: "beneficiariosPagamento" };
  }

  const doCadastro = servidoresList.find((s) => normalizarCpf(s.cpf) === alvo);
  if (doCadastro) {
    return { cpf: doCadastro.cpf, nome: doCadastro.nome, matricula: doCadastro.matricula, fonte: "servidoresList" };
  }
  return undefined;
}

/** Matrícula do titular pelo CPF — `undefined` quando a base (simulada) não tem correspondência. */
export function getMatriculaPorCpf(cpf: string): string | undefined {
  return getTitularInstitucionalPorCpf(cpf)?.matricula;
}

export type GrupoAtivoInativo = "ativo" | "inativo";

export interface ClassificacaoAtivoInativo {
  grupo?: GrupoAtivoInativo;
  /** Sem situação funcional confiável, ou conflito real entre fontes: NÃO inferir — sinalizar à GERDAB. */
  requerConferencia: boolean;
  motivo?: string;
}

/** Regra fechada (relatórios reais): Servidor efetivo ativo e Servidor comissionado → Ativo;
 *  Servidor efetivo inativo e Pensionista (pensão vitalícia ou temporária) → Inativo. */
function grupoPorSituacaoFuncional(situacao: ServidorListItem["situacaoBeneficiarioTitular"]): GrupoAtivoInativo {
  return situacao === "Servidor efetivo ativo" || situacao === "Servidor comissionado" ? "ativo" : "inativo";
}

/**
 * Classificação Ativo/Inativo para separar o Relatório Financeiro Retroativo (ata, seção 3.6).
 * **Vem da situação funcional/cadastral institucional** — `situacaoBeneficiarioTitular`
 * (`servidoresList`). `pendente_documentacao` (ou qualquer pendência operacional) **nunca**
 * determina Ativo/Inativo. Sem situação funcional confiável (CPF só no Módulo de Pagamento, cujo
 * `situacao` é operacional/cadastral do pagamento) ou em conflito real entre fontes, retorna
 * `requerConferencia` em vez de escolher em silêncio.
 *
 * O único sinal do Módulo de Pagamento aceito como funcional é `situacao === "inativo"` (ativo
 * explícito também); `pendente_documentacao` é ignorado. Limitação do protótipo: o Módulo de
 * Pagamento não carrega `situacaoBeneficiarioTitular`.
 */
export function getClassificacaoAtivoInativoPorCpf(cpf: string): ClassificacaoAtivoInativo {
  const alvo = normalizarCpf(cpf);
  if (!alvo) return { requerConferencia: true, motivo: "CPF não informado." };

  const doCadastro = servidoresList.find((s) => normalizarCpf(s.cpf) === alvo);
  const doPagamento = getBeneficiariosPagamentoAtual().find(
    (b) => b.parentesco === "Titular" && b.cpf && normalizarCpf(b.cpf) === alvo,
  );
  const sinalPagamento: GrupoAtivoInativo | undefined =
    doPagamento?.situacao === "inativo" ? "inativo" : doPagamento?.situacao === "ativo" ? "ativo" : undefined; // pendente_documentacao ignorado

  const funcional = doCadastro ? grupoPorSituacaoFuncional(doCadastro.situacaoBeneficiarioTitular) : undefined;

  if (funcional && sinalPagamento && funcional !== sinalPagamento) {
    return { requerConferencia: true, motivo: "Conflito entre a situação funcional do cadastro e a situação registrada no Módulo de Pagamento." };
  }
  if (funcional) return { grupo: funcional, requerConferencia: false };
  if (sinalPagamento) return { grupo: sinalPagamento, requerConferencia: false };
  return { requerConferencia: true, motivo: "Sem situação funcional confiável na base institucional." };
}

/** Atalho: o grupo quando classificável sem conferência; `undefined` quando requer conferência. */
export function getGrupoAtivoInativoPorCpf(cpf: string): GrupoAtivoInativo | undefined {
  return getClassificacaoAtivoInativoPorCpf(cpf).grupo;
}

/**
 * Associação responsável pela comprovação do titular (regra funcional): servidor vinculado a
 * Associação tem comprovação ordinária **e** retroativa feita exclusivamente pela Associação —
 * não usa o envio individual do Portal do Servidor. Vínculo vem do cadastro institucional
 * (simulado por `servidoresList`; `"—"` = sem associação). `undefined` = sem associação responsável
 * (ou sem correspondência na base simulada) → origem individual pelo Portal.
 */
export function getAssociacaoResponsavelPorCpf(cpf: string): string | undefined {
  const alvo = normalizarCpf(cpf);
  if (!alvo) return undefined;
  const associacao = servidoresList.find((s) => normalizarCpf(s.cpf) === alvo)?.associacao;
  return associacao && associacao !== "—" ? associacao : undefined;
}

/**
 * Validação de vínculo **Associação × Titular** no envio de planilhas (ordinária e retroativa).
 *
 * **Regra funcional de produção:** o vínculo do titular com a Associação responsável deve ser
 * consultado, pelo CPF do titular, na fonte institucional confiável; uma Associação só pode enviar
 * titulares vinculados a ela mesma. Titular sem associação responsável, ou vinculado a outra
 * associação, é inválido para aquele envio — sem trocar de associação automaticamente e sem inferir
 * ou "corrigir" o vínculo.
 *
 * **Protótipo:** essa fonte é simulada por mocks locais (`servidoresList`, campo `associacao`); a
 * existência desses mocks NÃO é requisito funcional. CPF fora da base simulada é tratado como
 * "sem associação responsável cadastrada" (nunca adivinhado).
 *
 * Retorna a mensagem de erro, ou `undefined` quando o titular pertence à associação do envio.
 */
export function validarVinculoTitularAssociacao(cpfTitular: string, nomeInformado: string, associacaoEnvio: string): string | undefined {
  const alvo = normalizarCpf(cpfTitular);
  const doCadastro = servidoresList.find((s) => normalizarCpf(s.cpf) === alvo);
  const nome = doCadastro?.nome ?? nomeInformado;
  const vinculada = doCadastro?.associacao && doCadastro.associacao !== "—" ? doCadastro.associacao : undefined;
  if (!vinculada) return `Titular ${nome} não possui associação responsável cadastrada e não pode ser enviado neste arquivo.`;
  if (vinculada.trim().toLowerCase() !== associacaoEnvio.trim().toLowerCase()) {
    return `Titular ${nome} vinculado à ${vinculada.toUpperCase()} não pode ser enviado pela ${associacaoEnvio.toUpperCase()}.`;
  }
  return undefined;
}

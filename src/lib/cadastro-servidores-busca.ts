/**
 * Pesquisa de servidores para o Relatório de Suspensões (inclusão manual e conferência).
 *
 * SOMENTE LEITURA: consulta os cadastros que já existem no protótipo — `servidoresList` (Módulo de Cadastro),
 * `servidorAtual`/`dependentes` (dependentes nominais do cadastro), o titular e o grupo familiar do Módulo de Pagamento e,
 * quando o ambiente demonstrativo está ativo, as pessoas FICTÍCIAS isoladas de `fontes-suspensoes.ts`. Nada é criado nem
 * alterado e não existe cadastro paralelo: o resultado é montado a cada consulta.
 *
 * Informação não confiável ou ausente NÃO é inferida: vem em `conferir` para o analista conferir.
 */
import { dependentes as dependentesCadastro, servidorAtual, servidoresList } from "./mock-data";
import { getAssociacaoResponsavelPorCpf, getClassificacaoAtivoInativoPorCpf, normalizarCpf } from "./base-institucional";
import { getBeneficiariosPagamentoAtual } from "./prosaude-storage";
import { pessoasDemonstrativas } from "./fontes-suspensoes";
import type { OrigemPagamento, VinculoFuncional } from "./relatorio-alteracoes";

export interface DependenteCadastral {
  nome: string;
  parentesco?: string;
}

export interface ServidorCadastral {
  nome: string;
  matricula: string;
  cpf?: string;
  vinculo?: VinculoFuncional;
  origemPagamento?: OrigemPagamento;
  /** Nomes dos dependentes quando o cadastro os traz; vazio com `totalDependentes > 0` = o cadastro só informa a quantidade. */
  dependentes: DependenteCadastral[];
  totalDependentes?: number;
  fonte: "cadastro" | "pagamento" | "demonstrativa";
  /** Informações que o cadastro não traz com segurança (precisam de conferência do analista). */
  conferir: string[];
}

export const ROTULO_FONTE_CADASTRAL: Record<ServidorCadastral["fonte"], string> = {
  cadastro: "Cadastro de servidores",
  pagamento: "Módulo de Pagamento",
  demonstrativa: "Base demonstrativa (fictícia)",
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const origemDaAssociacao = (a?: string): OrigemPagamento | undefined => (a === "Assefaz" ? "ASSEFAZ" : a === "Assetran" ? "ASSETRAN" : undefined);

function doVinculo(cpf: string | undefined, conferir: string[]): VinculoFuncional | undefined {
  if (!cpf) {
    conferir.push("Vínculo funcional (CPF não disponível)");
    return undefined;
  }
  const c = getClassificacaoAtivoInativoPorCpf(cpf);
  if (c.grupo && !c.requerConferencia) return c.grupo;
  conferir.push(`Vínculo funcional (${c.motivo ?? "sem situação funcional confiável"})`);
  return undefined;
}

function doCadastro(): ServidorCadastral[] {
  return servidoresList.map((s) => {
    const conferir: string[] = [];
    // `associacao` "—" = sem associação: a origem é Boletos. Servidor do cadastro tem este dado confiável.
    const origem: OrigemPagamento = origemDaAssociacao(getAssociacaoResponsavelPorCpf(s.cpf)) ?? "Boletos";
    const nominais = normalizarCpf(s.cpf) === normalizarCpf(servidorAtual.cpf) ? dependentesCadastro.map((d) => ({ nome: d.nome, parentesco: d.parentesco })) : [];
    if (nominais.length === 0 && s.dependentes > 0) conferir.push(`Dependentes (o cadastro informa ${s.dependentes}, sem os nomes)`);
    return { nome: s.nome, matricula: s.matricula, cpf: s.cpf, vinculo: doVinculo(s.cpf, conferir), origemPagamento: origem, dependentes: nominais, totalDependentes: s.dependentes, fonte: "cadastro" as const, conferir };
  });
}

function doPagamento(): ServidorCadastral[] {
  const todos = getBeneficiariosPagamentoAtual();
  return todos
    .filter((b) => b.parentesco === "Titular" && b.matricula)
    .map((t) => {
      const conferir = ["Origem de pagamento (o Módulo de Pagamento informa a operadora, não a origem)"];
      const deps = todos.filter((b) => b.parentesco !== "Titular").map((b) => ({ nome: b.nome, parentesco: b.parentesco }));
      return { nome: t.nome, matricula: t.matricula!, cpf: t.cpf, vinculo: doVinculo(t.cpf, conferir), dependentes: deps, totalDependentes: deps.length, fonte: "pagamento" as const, conferir };
    });
}

function daDemonstracao(): ServidorCadastral[] {
  return pessoasDemonstrativas().map((p) => ({
    nome: p.nome,
    matricula: p.matricula,
    cpf: p.cpf,
    vinculo: p.vinculo,
    origemPagamento: origemDaAssociacao(p.associacao) ?? "Boletos",
    dependentes: p.dependentes,
    totalDependentes: p.dependentes.length,
    fonte: "demonstrativa" as const,
    conferir: [],
  }));
}

/** Todos os servidores consultáveis (sem duplicar matrícula: prevalece o Cadastro de servidores). */
export function listarServidoresCadastrais(opcoes: { demonstracao?: boolean } = {}): ServidorCadastral[] {
  const porMatricula = new Map<string, ServidorCadastral>();
  for (const s of [...doCadastro(), ...doPagamento(), ...(opcoes.demonstracao ? daDemonstracao() : [])]) if (!porMatricula.has(s.matricula)) porMatricula.set(s.matricula, s);
  return [...porMatricula.values()];
}

/** Pesquisa por nome (sem acento, qualquer trecho) ou matrícula. Sem limite de cadastro: `limite` só controla quantos aparecem. */
export function buscarServidoresCadastrais(termo: string, opcoes: { demonstracao?: boolean; limite?: number } = {}): { itens: ServidorCadastral[]; total: number } {
  const t = norm(termo);
  if (!t) return { itens: [], total: 0 };
  const achados = listarServidoresCadastrais(opcoes)
    .filter((s) => norm(s.nome).includes(t) || s.matricula.toLowerCase().includes(t))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  return { itens: achados.slice(0, opcoes.limite ?? 8), total: achados.length };
}

/** Consulta de um titular já gravado no registro (por matrícula; sem matrícula, por CPF). `undefined` = fora do cadastro. */
export function consultarServidorCadastral(ref: { matricula?: string; cpf?: string }, opcoes: { demonstracao?: boolean } = {}): ServidorCadastral | undefined {
  const todos = listarServidoresCadastrais(opcoes);
  if (ref.matricula) {
    const m = todos.find((s) => s.matricula === ref.matricula);
    if (m) return m;
  }
  const alvo = ref.cpf ? normalizarCpf(ref.cpf) : "";
  return alvo ? todos.find((s) => s.cpf && normalizarCpf(s.cpf) === alvo) : undefined;
}

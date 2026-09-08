/**
 * Adapta um beneficiário da Área da Associação (`ServidorListItem`, `servidoresList`) para o
 * mesmo formato que os formulários de requerimento (`NovoPlano`, `Exclusao`) já esperam quando
 * leem o titular logado (`servidorAtual`, `mock-data.ts`) — nunca uma segunda fonte de regra,
 * só uma tradução de forma. Corrige a lacuna identificada na análise: os três requerimentos
 * recorrentes liam `servidorAtual`/`dependentes` como singletons globais, sem meio de receber
 * explicitamente qual beneficiário a Associação está atendendo.
 *
 * **Limitação honesta, não escondida:** `ServidorListItem` (a base mais enxuta usada por
 * `/admin/servidores` e pela Área da Associação) não guarda todos os campos que `servidorAtual`
 * tem (administradora, tipo de plano, início do benefício) nem uma lista de dependentes (só a
 * contagem, em `dependentes: number`) — mesma limitação que `admin.servidores.$id.tsx` já tem
 * hoje (usa a mesma lista fixa de dependentes do Portal do Servidor, independente do `$id`).
 * Em vez de inventar dado por beneficiário, os campos ausentes ficam "—" (nunca um valor
 * fantasioso) exceto para os dois beneficiários já usados nas telas de demonstração da ASSETRAN
 * (Carlos Pereira, Roberto Santos), onde um pequeno complemento coerente foi acrescentado só
 * para tornar o cenário de teste/print demonstrável — não é um sistema novo de dados.
 */
import {
  servidorAtual,
  type ServidorListItem,
  type Dependente,
} from "./mock-data";

const CAMPOS_EXTRAS_POR_MATRICULA: Record<
  string,
  { administradora: string; tipoPlano: string; inicioBeneficio: string }
> = {
  "34567": { administradora: "Qualicorp", tipoPlano: "Coletivo por adesão", inicioBeneficio: "10/03/2019" }, // Carlos Pereira
  "56789": { administradora: "—", tipoPlano: "Coletivo empresarial", inicioBeneficio: "01/07/2020" }, // Roberto Santos
};

const DEPENDENTES_POR_MATRICULA: Record<string, Dependente[]> = {
  "56789": [
    {
      id: "dep-roberto-santos-1",
      nome: "Sandra Santos",
      parentesco: "Cônjuge",
      dataNascimento: "22/09/1960",
      idade: 65,
      cpf: "789.012.345-66",
      plano: "CASSI",
      valor: 1100,
      status: "ativo",
    },
  ],
};

/** Formato usado por `NovoPlano`/`Exclusao` para o titular — mesmo shape de `servidorAtual`. */
export function servidorParaFormularioRequerimento(s: ServidorListItem): typeof servidorAtual {
  const extras = CAMPOS_EXTRAS_POR_MATRICULA[s.matricula];
  return {
    id: s.matricula,
    nome: s.nome,
    cargo: s.cargo,
    matricula: s.matricula,
    cpf: s.cpf,
    rg: "—",
    dataNascimento: s.dataNascimento,
    email: s.email,
    telefone: s.telefone,
    telefoneCelular: s.telefone,
    telefoneSetor: "",
    telefoneResidencial: "",
    dataAdmissao: "—",
    endereco: "—",
    plano: s.operadora ?? "—",
    tipoPlano: extras?.tipoPlano ?? "—",
    operadora: s.operadora ?? "—",
    administradora: extras?.administradora ?? "—",
    ans: "—",
    associacao: s.associacao,
    processoSEI: s.processoSEI,
    inicioBeneficio: extras?.inicioBeneficio ?? "—",
    tetoFamiliar: servidorAtual.tetoFamiliar,
    valorPlano: s.valorPlano,
    status: s.status,
  };
}

/** Dependentes ativos do beneficiário — `[]` quando o mock não tem nenhum cadastrado para essa
 *  matrícula (correto para quem realmente não tem dependente, ex: Carlos Pereira). */
export function dependentesDoBeneficiario(s: ServidorListItem): Dependente[] {
  return DEPENDENTES_POR_MATRICULA[s.matricula] ?? [];
}

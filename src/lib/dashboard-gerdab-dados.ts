/**
 * Ponto único de montagem dos dados do Dashboard GERDAB. Cada bloco chega aos componentes já
 * pronto e com a sua **origem** (`"real"` ou `"demonstrativo"`), de modo que a interface sempre
 * identifica o que é dado do sistema e o que é exemplo — nunca os mistura em silêncio.
 *
 * - Fonte "real": usa as consultas reais de `dashboard-gerdab.ts`. Só Alterações mensais e
 *   Movimentações (sem fonte real no projeto) continuam demonstrativas.
 * - Fonte "demonstrativo": usa a base fictícia ampliada de `dashboard-gerdab-demo.ts`.
 *
 * Para integrar uma consulta real no futuro, troque apenas o ramo "demonstrativo" do bloco
 * correspondente (o formato retornado é o mesmo).
 */
import { formatCompetencia } from "./mock-data";
import {
  buscarServidores,
  getAlertasDocumentais,
  getFichaResumo,
  getInadimplenciaRecorrente,
  getLinhasRessarcimentos,
  getPanoramaBase,
  getResumoComprovantes,
  getResumoFechamentoDashboard,
  getResumoFilaRessarcimentos,
  getUltimosRelatoriosGerados,
  type AlertaDocumental,
  type FichaResumoServidor,
  type LinhaComprovanteDashboard,
  type LinhaRecorrencia,
  type LinhaRessarcimentoDashboard,
  type RegistroInadimplente,
  type RelatorioGerado,
  type ResumoFilaRessarcimentos,
  type SituacaoComprovantes,
} from "./dashboard-gerdab";
import {
  RESPONSAVEIS_DEMO,
  buscarServidoresDemo,
  getAlertasDemo,
  getAlteracoesMensaisDemo,
  getContagemComprovantesDemo,
  getFechamentoDemo,
  getLinhasComprovantesDemo,
  getLinhasRessarcimentosDemo,
  getPanoramaDemo,
  getRecorrenciaDemo,
  getRelatoriosDemo,
  getSolicitacoesAlteracaoDemo,
  type AlteracaoMensal,
  type FonteDados,
  type OrigemDadoTipo,
  type SolicitacaoAlteracao,
} from "./dashboard-gerdab-demo";
import { getMovimentacoesDaCompetencia, type LinhaMovimentacao } from "./movimentacoes-pro-saude";

export interface LinhaApto {
  id: string;
  nome: string;
  matricula: string;
  plano: string;
  vidas: number;
  valor: number;
}

export interface DadosDashboard {
  fonte: FonteDados;
  alteracoes: { origem: OrigemDadoTipo; itens: AlteracaoMensal[]; solicitacoes: (chave: string) => SolicitacaoAlteracao[] };
  comprovantes: {
    origem: OrigemDadoTipo;
    total: number;
    aguardando: number;
    validados: number;
    devolvidos: number;
    linhas: (s: SituacaoComprovantes) => LinhaComprovanteDashboard[];
  };
  ressServidor: { origem: OrigemDadoTipo; resumo: ResumoFilaRessarcimentos; linhas: LinhaRessarcimentoDashboard[] };
  ressAssociacoes: { origem: OrigemDadoTipo; resumo: ResumoFilaRessarcimentos; linhas: LinhaRessarcimentoDashboard[] };
  aptos: { origem: OrigemDadoTipo; registros: number; vidas: number; vidasTotal: number; valorRessarcir: number; linhas: LinhaApto[] };
  fechamento: { origem: OrigemDadoTipo; adimplentes: number; requerAnalise: number; inadimplentes: RegistroInadimplente[] };
  recorrencia: (de: string, ate: string) => LinhaRecorrencia[];
  alertas: { origem: OrigemDadoTipo; itens: AlertaDocumental[] };
  buscar: (termo: string) => FichaResumoServidor[];
  panorama: { origem: OrigemDadoTipo; titulares: number; dependentes: number; noTeto: number; percentualNoTeto: number; situacoes: { rotulo: string; titulares: number; percentual: number }[] };
  relatorios: { origem: OrigemDadoTipo; itens: RelatorioGerado[] };
  movimentacoes: { origem: OrigemDadoTipo; linhas: LinhaMovimentacao[] | null };
}

function resumoDemoFila(linhas: { aguardando: boolean; statusRotulo: string; origemRotulo: string }[], origem: "individual" | "associacao"): ResumoFilaRessarcimentos {
  const fila = linhas.filter((l) => l.aguardando);
  return {
    total: linhas.length,
    aguardando: fila.length,
    emAnalise: fila.filter((l) => l.statusRotulo === "Em análise").length,
    aguardandoComplementacao: fila.filter((l) => l.statusRotulo === "Aguardando complementação").length,
    complementacaoRecebida: fila.filter((l) => l.statusRotulo === "Complementação recebida").length,
    porAssociacao: origem === "associacao" ? ["Assefaz", "Assetran"].map((associacao) => ({ associacao, aguardando: fila.filter((l) => l.origemRotulo === associacao).length })) : [],
  };
}

export function getDadosDashboard(competencia: string, competencias: string[], fonte: FonteDados): DadosDashboard {
  const demo = fonte === "demonstrativo";
  const O: OrigemDadoTipo = demo ? "demonstrativo" : "real";

  // Comprovantes
  let comprovantes: DadosDashboard["comprovantes"];
  if (demo) {
    const c = getContagemComprovantesDemo(competencia);
    comprovantes = { origem: O, ...c, linhas: (s) => getLinhasComprovantesDemo(competencia, s).map((l) => ({ id: l.id, nome: `${l.nome} · mat. ${l.matricula}`, arquivo: l.arquivo, situacaoRotulo: l.situacaoRotulo, responsavel: l.responsavel })) };
  } else {
    const c = getResumoComprovantes(competencia);
    comprovantes = { origem: O, total: c.total, aguardando: c.aguardando, validados: c.validados, devolvidos: c.devolvidos, linhas: c.linhas };
  }

  // Ressarcimentos
  const rsS = demo ? getLinhasRessarcimentosDemo("individual") : getLinhasRessarcimentos("individual");
  const rsA = demo ? getLinhasRessarcimentosDemo("associacao") : getLinhasRessarcimentos("associacao");
  const linhasDemoRess = (l: ReturnType<typeof getLinhasRessarcimentosDemo>): LinhaRessarcimentoDashboard[] => l.map((x) => ({ id: x.id, nome: `${x.nome} · mat. ${x.matricula}`, referencia: x.referencia, statusRotulo: x.statusRotulo, aguardando: x.aguardando, origemRotulo: x.origemRotulo, responsavel: x.responsavel }));
  const ressServidor = { origem: O, linhas: demo ? linhasDemoRess(rsS as ReturnType<typeof getLinhasRessarcimentosDemo>) : (rsS as LinhaRessarcimentoDashboard[]), resumo: demo ? resumoDemoFila(rsS as ReturnType<typeof getLinhasRessarcimentosDemo>, "individual") : getResumoFilaRessarcimentos("individual") };
  const ressAssociacoes = { origem: O, linhas: demo ? linhasDemoRess(rsA as ReturnType<typeof getLinhasRessarcimentosDemo>) : (rsA as LinhaRessarcimentoDashboard[]), resumo: demo ? resumoDemoFila(rsA as ReturnType<typeof getLinhasRessarcimentosDemo>, "associacao") : getResumoFilaRessarcimentos("associacao") };

  // Fechamento + aptos
  let fechamento: DadosDashboard["fechamento"];
  let aptos: DadosDashboard["aptos"];
  if (demo) {
    const f = getFechamentoDemo(competencia);
    fechamento = { origem: O, adimplentes: f.adimplentes, requerAnalise: f.requerAnalise, inadimplentes: f.inadimplentes.map((i) => ({ nome: i.nome, chave: i.chave, matricula: i.matricula })) };
    aptos = { origem: O, ...f.aptos };
  } else {
    const f = getResumoFechamentoDashboard(competencia);
    fechamento = { origem: O, adimplentes: f.adimplentes, requerAnalise: f.requerAnalise, inadimplentes: f.inadimplentes };
    aptos = { origem: O, ...f.aptos };
  }

  // Alertas e busca
  const alertas: DadosDashboard["alertas"] = { origem: O, itens: demo ? getAlertasDemo() : getAlertasDocumentais() };
  const recorrenciaDemo = demo ? getRecorrenciaDemo(competencias) : [];
  const buscar = (termo: string): FichaResumoServidor[] => {
    if (!demo) return buscarServidores(termo).map((s) => getFichaResumo(s, competencias));
    return buscarServidoresDemo(termo).map((s) => {
      const situacoes: FichaResumoServidor["situacoes"] = [];
      if (s.statusProSaude !== "Ativo") situacoes.push({ tipo: "Situação cadastral relevante", descricao: `Status Pró-Saúde: ${s.statusProSaude}.`, tom: "amber" });
      for (const a of alertas.itens.filter((x) => x.matricula === s.matricula)) situacoes.push({ tipo: a.etapa === "aprovado" ? "Solicitação atendida" : "Pendência documental", descricao: `${a.documento} de ${a.beneficiario} — ${a.prazoTexto.toLowerCase()}.`, tom: a.etapa === "aprovado" ? "green" : a.vencido ? "red" : "amber" });
      const ocorr = recorrenciaDemo.find((x) => x.matricula === s.matricula);
      if (ocorr) situacoes.push({ tipo: "Inadimplência registrada", descricao: `Consta como inadimplente em ${ocorr.competencias.map(formatCompetencia).join(", ")}.`, tom: ocorr.competencias.includes(competencia) ? "red" : "amber" });
      return {
        matricula: s.matricula,
        nome: s.nome,
        situacaoFuncional: s.situacao,
        statusProSaude: s.statusProSaude,
        plano: s.plano,
        vidas: 1 + s.dependentes.length,
        dependentes: s.dependentes.length ? `Dependentes: ${s.dependentes.join(", ")}` : "Sem dependentes cadastrados",
        situacoes,
      };
    });
  };

  const rel = demo ? getRelatoriosDemo() : getUltimosRelatoriosGerados(4);
  const relatorios: DadosDashboard["relatorios"] = {
    origem: O,
    itens: demo
      ? (rel as ReturnType<typeof getRelatoriosDemo>).map((r) => ({ ...r, destino: r.tipo === "Fechamento de Pagamento" ? ("/admin/relatorios/pagamentos/historico" as const) : ("/admin/relatorios/consolidacoes" as const) }))
      : (rel as RelatorioGerado[]),
  };

  const pano = demo ? getPanoramaDemo() : getPanoramaBase();
  return {
    fonte,
    // Sem fonte real no projeto: sempre demonstrativos, em qualquer modo.
    alteracoes: { origem: "demonstrativo", itens: getAlteracoesMensaisDemo(competencia), solicitacoes: (chave) => getSolicitacoesAlteracaoDemo(competencia, chave) },
    comprovantes,
    ressServidor,
    ressAssociacoes,
    aptos,
    fechamento,
    recorrencia: (de, ate) => (demo ? recorrenciaDemo.filter((x) => x.competencias.some((c) => c >= de && c <= ate)).map((x) => ({ ...x, competencias: x.competencias.filter((c) => c >= de && c <= ate) })).sort((a, b) => b.competencias.length - a.competencias.length || a.nome.localeCompare(b.nome)).map((x, k) => ({ ...x, posicao: k + 1 })) : getInadimplenciaRecorrente(de, ate)),
    alertas,
    buscar,
    panorama: { origem: O, ...pano },
    relatorios,
    movimentacoes: { origem: "demonstrativo", linhas: getMovimentacoesDaCompetencia(competencia) },
  };
}

export { RESPONSAVEIS_DEMO };

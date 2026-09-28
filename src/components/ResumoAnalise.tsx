import type { BeneficiarioPagamento, CampoExtraido, Comprovante } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/mock-data';
import { getCamposDoBeneficiario, getCoberturaDocumental, getDivergencia, getDivergenciaBoletoComprovante, getElegibilidade, operadoraDivergeDoCadastro } from '@/lib/comprovante-status';

const labels: Record<CampoExtraido['chave'], string> = {
  nome: 'Nome', cpf: 'CPF', operadora: 'Operadora', competencia: 'Competência',
  vencimento: 'Vencimento', valor: 'Valor', dataPagamento: 'Data do pagamento', pagador: 'Pagador',
};

export function ResumoAnalise({ comprovante, beneficiarios }: { comprovante: Comprovante; beneficiarios: BeneficiarioPagamento[] }) {
  const grupos = comprovante.beneficiarioIds.map(id => {
    const pessoa = beneficiarios.find(b => b.id === id);
    const campos = getCamposDoBeneficiario(comprovante, id);
    const pontos: string[] = [];
    for (const campo of campos) {
      if (campo.origem === 'manual') {
        pontos.push(`${labels[campo.chave]} preenchido manualmente: IA “${campo.leituraIA ? (campo.leituraIA.valor || 'não identificado') : 'leitura indisponível'}” → servidor “${campo.valor || 'não preenchido'}”.${!campo.leituraIA ? ' Leitura original indisponível.' : ''}`);
      }
      if (!campo.valor.trim()) pontos.push(`${labels[campo.chave]} está sem preenchimento.`);
      else if (campo.origem !== 'manual' && campo.confianca !== 'alta') {
        pontos.push(`${labels[campo.chave]}: confiança ${campo.confianca === 'media' ? 'média' : 'não informada/nenhuma'}. Confira no documento${campo.arquivoOrigem ? ` ${campo.arquivoOrigem}` : ''}.`);
      }
    }
    if (!campos.length) pontos.push('Não há campos extraídos disponíveis para este beneficiário.');
    if (!pessoa) pontos.push('Beneficiário não localizado no cadastro atual.');
    if (pessoa) {
      const cobertura = getCoberturaDocumental([pessoa], comprovante.arquivos, pessoa.modalidadePlano)[0];
      if (!cobertura.contemplado) pontos.push(`${cobertura.faltando}. Confira a documentação obrigatória.`);
      const operadora = operadoraDivergeDoCadastro(campos, pessoa.operadora);
      if (operadora.divergente) pontos.push(`Operadora informada “${operadora.operadoraExtraida}” difere do cadastro “${pessoa.operadora}”.`);
      const valor = getDivergencia(comprovante, pessoa);
      if (valor.divergente) pontos.push(`Valor elegível ${formatCurrency(valor.valorElegivel)} difere do cadastro ${formatCurrency(pessoa.valorCadastrado)}.`);
      const confronto = getDivergenciaBoletoComprovante(comprovante, pessoa);
      if (confronto.divergente) pontos.push(`Valores do boleto (${formatCurrency(confronto.valorBoleto!)}) e comprovante (${formatCurrency(confronto.valorComprovante!)}) não conciliados pela regra atual. Confira os encargos.`);
      const { decomposicao } = getElegibilidade(comprovante, pessoa);
      if (!decomposicao.itens.length) pontos.push('Composição financeira individual não disponível: conferir o valor reembolsável no documento.');
      else if (decomposicao.valorNaoReembolsavel > 0) pontos.push(`Itens não reembolsáveis: ${formatCurrency(decomposicao.valorNaoReembolsavel)}. Valor elegível: ${formatCurrency(decomposicao.valorElegivel)}.`);
    }
    return { id, nome: pessoa?.nome ?? id, pontos };
  });
  const alertasDocumentais = comprovante.arquivos.flatMap(arquivo => {
    const alertas: string[] = [];
    const aviso = (arquivo as typeof arquivo & { avisoFinanceiro?: string }).avisoFinanceiro;
    if (aviso) alertas.push(`${arquivo.nome}: ${aviso}`);
    if (arquivo.itensFinanceiros?.some(i => i.reembolsavel && /odonto|dental/i.test(i.descricao))) {
      alertas.push(`${arquivo.nome}: classificação contraditória — odontologia marcada como reembolsável. Não use essa composição para decidir; solicite nova leitura ou confira os itens no original.`);
    }
    return alertas;
  });
  const quantidade = grupos.reduce((n, g) => n + g.pontos.length, 0) + (comprovante.isRetroativo ? 1 : 0) + alertasDocumentais.length;
  return <section aria-label="Pontos de atenção da análise" className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3 text-slate-900">
    <h3 className="font-semibold">Pontos de atenção ({quantidade})</h3>
    <p className="text-xs">Resumo dos dados da IA e das conferências do sistema. A decisão continua com o analista; os alertas não alteram a confiança original.</p>
    {alertasDocumentais.map((texto, i) => <p key={i} className="text-sm font-medium">{texto}</p>)}
    {comprovante.isRetroativo && <p className="text-sm">Envio retroativo: confira a competência e a justificativa do atraso.</p>}
    {grupos.filter(g => g.pontos.length).map(g => <div key={g.id} className="space-y-1">
      <p className="text-sm font-semibold">{g.nome}</p>
      <ul className="list-disc pl-5 text-sm space-y-1">{g.pontos.map((p, i) => <li key={i}>{p}</li>)}</ul>
    </div>)}
    {quantidade === 0 && <p className="text-sm">Nenhum ponto de atenção identificado nestas verificações. Confira os documentos antes de decidir.</p>}
  </section>;
}

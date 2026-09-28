import { solicitarExtracaoComId } from './ia-cliente';
import { numeroMonetario, validarValores } from './ia-valores';
import { nomesIguais, nomeAbreviadoCompativel, nomeOCRCompativel } from './validacao-leitura';
import type { BeneficiarioPagamento, CampoExtraido, TipoDocumentoArquivo, ItemFinanceiro } from "./mock-data";
export const resultadosIA = new WeakMap<File, { execucaoId: string; camposExtraidos: CampoExtraido[]; itensFinanceiros: ItemFinanceiro[]; itensPorBeneficiario?: Record<string, ItemFinanceiro[]>; avisoFinanceiro?: string; avisoTipo?: string; beneficiarios?: { nome: string; valor: string; confianca: CampoExtraido['confianca'] }[]; favorecidoPagamento?: string; cnpjFavorecido?: string; valorNominal?: string }>();

function normalizarConfianca(valor: unknown): "alta" | "media" | "nenhuma" {
  if (typeof valor === "number") return valor >= 0.8 ? "alta" : valor >= 0.5 ? "media" : "nenhuma";
  const texto = String(valor ?? "").toLowerCase();
  if (texto === "alta" || texto === "high") return "alta";
  if (texto === "media" || texto === "média" || texto === "medium") return "media";
  return "nenhuma";
}

function normalizarTextoComparacao(valor: unknown): string {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
}

const chaveCampo: Record<string, CampoExtraido["chave"]> = { nome: "nome", operadora: "operadora", competencia: "competencia", vencimento: "vencimento", valor: "valor", dataPagamento: "dataPagamento", pagador: "pagador" };

export const camposPermitidos: Record<TipoDocumentoArquivo, string[]> = {
  boleto: ["operadora", "competencia", "vencimento", "valor"],
  comprovante_pagamento: ["pagador", "operadora", "vencimento", "valor", "dataPagamento"],
  recibo: ["competencia", "vencimento", "valor"],
  demonstrativo: ["competencia", "vencimento", "valor"],
  fatura_tecnica: ["operadora", "competencia", "vencimento"],
};

export async function extrairCamposComIA(file: File, tipos: TipoDocumentoArquivo[], candidatos: BeneficiarioPagamento[], competencia: string): Promise<CampoExtraido[]> {
  const { id: execucaoId, resultado } = await solicitarExtracaoComId(file, tipos[0] ?? "boleto", candidatos, competencia);
  return interpretarExtracaoIA(file, tipos, candidatos, execucaoId, resultado);
}

export function interpretarExtracaoIA(file: File, tipos: TipoDocumentoArquivo[], candidatos: BeneficiarioPagamento[], execucaoId: string, resultado: any): CampoExtraido[] {
  if (resultado.legivel === false) throw new Error("DOCUMENTO_ILEGIVEL");
  const errosValores = [...validarValores(resultado), ...(resultado.avisos ?? []).filter((aviso: string) =>
    /composi[cç][aã]o|valor individual diverge|valores individuais com soma divergente/i.test(aviso))];
  const tipoIdentificado = String(resultado.tipoIdentificado ?? "indeterminado") as TipoDocumentoArquivo | "indeterminado";
  const tipoCompativel = tipoIdentificado !== "indeterminado" && tipos.includes(tipoIdentificado as TipoDocumentoArquivo);
  // Somente dados presentes na resposta da IA entram no formulário. Não há fallback
  // para cadastro, nome do arquivo, competência selecionada ou dados mockados.
  const fonte = resultado.campos ?? resultado[tipos[0]] ?? resultado.boleto ?? resultado.documento ?? resultado;
  const permitidos = new Set(tipos.flatMap(t => camposPermitidos[t]));
  if (!fonte || ![...permitidos].some(chave => Object.hasOwn(fonte, chave))) {
    throw new Error('A IA retornou um formato sem campos reconhecíveis. Tente novamente.');
  }
  const campos = Object.entries(fonte).filter(([chave]) => permitidos.has(chave)).map(([chave, dado]: any) => {
    let valor = String(dado && typeof dado === "object" ? dado.valor ?? "" : dado ?? "").trim();
    if (chave === "operadora" && /^(ita[uú]( unibanco)?( s\.?a\.?)?|caixa( econ[oô]mica federal)?|brb)$/i.test(valor)) valor = "";
    if (chave === "valor" && valor) {
      const numero = numeroMonetario(valor);
      valor = Number.isFinite(numero) && numero >= 0 ? numero.toFixed(2) : "";
    }
    return { chave: chaveCampo[chave], valor, origem: "ocr" as const,
      ...(chave === 'operadora' ? { comparacoesOperadora: (Array.isArray(resultado.comparacoesOperadora) ? resultado.comparacoesOperadora : []).filter((c: any) =>
        candidatos.some(b => normalizarTextoComparacao(b.operadora) === normalizarTextoComparacao(c.cadastro)) && normalizarTextoComparacao(c.identificada) === normalizarTextoComparacao(valor) && ['compativel', 'divergente', 'inconclusivo'].includes(c.resultado) && typeof c.justificativa === 'string') } : {}),
      confianca: valor ? normalizarConfianca(dado?.confianca) : "nenhuma" as const, arquivoOrigem: file.name };
  });
  const total = Number(campos.find(c => c.chave === 'valor')?.valor);
  const componenteIndeterminado = (resultado.itensFinanceiros ?? []).some((item: any) =>
    item.classificacao === 'indeterminado' && Number.isFinite(numeroMonetario(item.valor)) && numeroMonetario(item.valor) > 0);
  const itens: ItemFinanceiro[] = [];
  for (const item of resultado.itensFinanceiros ?? []) {
    if (!['reembolsavel', 'odontologico', 'multa', 'juros', 'taxa_administrativa', 'iof'].includes(item.classificacao)) continue;
    const valor = numeroMonetario(item.valor);
    if (!Number.isFinite(valor) || valor <= 0 || typeof item.descricao !== 'string') continue;
    if (Number.isFinite(total) && Math.abs(valor - total) <= 0.01 && /^(valor( do)? documento|valor cobrado|total|total a pagar|valor pago)$/i.test(item.descricao.trim())) continue;
    itens.push({ descricao: item.descricao, valor, reembolsavel: item.classificacao === 'reembolsavel',
      situacaoNaoReembolsavel: item.classificacao === 'reembolsavel' ? undefined : item.classificacao as any });
  }
  // A lista geral contém apenas encargos não atribuídos, não o total do documento.
  const confere = itens.every(i => Number.isFinite(total) && i.valor <= total);
  const itensPorBeneficiario: Record<string, ItemFinanceiro[]> = {};
  if (tipoCompativel && tipoIdentificado !== 'fatura_tecnica') {
    for (const linha of Array.isArray(resultado.beneficiarios) ? resultado.beneficiarios : []) {
      if (typeof linha.nome !== 'string' || normalizarConfianca(linha.confianca) === 'nenhuma') continue;
      const associados = candidatos.filter(c => nomesIguais(linha.nome, c.nome));
      if (associados.length !== 1) continue;
      for (const item of Array.isArray(linha.itens) ? linha.itens : []) {
        const valor = numeroMonetario(item.valor);
        if (!Number.isFinite(valor) || valor <= 0 || typeof item.descricao !== 'string') continue;
        if (!['plano_saude', 'odontologico', 'multa', 'juros', 'taxa_administrativa', 'iof'].includes(item.classificacao)) continue;
        const lista = itensPorBeneficiario[associados[0].id] ??= [];
        lista.push({ descricao: item.descricao, valor, reembolsavel: item.classificacao === 'plano_saude',
          situacaoNaoReembolsavel: item.classificacao === 'plano_saude' ? undefined : item.classificacao });
      }
    }
  }
  resultadosIA.set(file, { execucaoId, camposExtraidos: tipoCompativel ? campos : campos.map(c => ({ ...c, valor: "", confianca: "nenhuma" as const })), itensFinanceiros: tipoCompativel && confere && !errosValores.length ? itens : [],
    itensPorBeneficiario: confere && !errosValores.length ? itensPorBeneficiario : {},
    beneficiarios: Array.isArray(resultado.beneficiarios) ? resultado.beneficiarios : [],
    favorecidoPagamento: resultado.favorecidoPagamento?.valor ?? '',
    cnpjFavorecido: resultado.cnpjFavorecido?.valor ?? '',
    // Alguns boletos informam somente "valor do documento". O backend já
    // normaliza esse caso; o fallback aqui mantém a tela compatível com
    // respostas antigas ou de provedores que não preenchem valorNominal.
    valorNominal: resultado.valorNominal?.valor ?? resultado.documento?.valorDocumento?.valor ?? '',
    avisoTipo: tipoCompativel ? undefined : `Tipo de documento incompatível: marcado como ${tipos.join("/ ")}, mas a IA identificou ${tipoIdentificado}.`,
    avisoFinanceiro: tipoIdentificado === 'comprovante_pagamento' && !itens.length ? undefined
      : componenteIndeterminado ? 'Há componente financeiro sem classificação segura; confira a linha e o valor no documento antes de definir a elegibilidade.'
      : confere && !errosValores.length ? undefined : 'Composição financeira não validada: os itens não conferem com o valor lido ou não foram identificados. Confira o documento; a elegibilidade ainda não foi determinada.' });
  return campos;
}

export function camposParaPessoa(file: File, pessoa: string, multiplos: boolean, permitirCamposComuns = false): CampoExtraido[] {
  const resultado = resultadosIA.get(file);
  if (!resultado) return [];
  const linhas = (resultado.beneficiarios ?? []).filter(b => {
    const corresponde = nomesIguais(b.nome, pessoa) || nomeAbreviadoCompativel(b.nome, pessoa) || nomeOCRCompativel(b.nome, pessoa);
    const confianca = normalizarConfianca(b.confianca);
    return corresponde && confianca !== "nenhuma";
  });
  const linha = linhas.length > 0 ? {
    nome: linhas[0].nome,
    valor: (() => {
      const valores = linhas.map((l: any) => {
      if (!Array.isArray(l.itens) || !l.itens.length) return numeroMonetario(l.valor);
      const medicos = (l.itens ?? []).filter((item: any) => item.classificacao === 'plano_saude');
      if (!medicos.length) return NaN;
      return medicos
        .map((item: any) => numeroMonetario(item.valor)).filter((v: number) => Number.isFinite(v) && v > 0)
        .reduce((a: number, b: number) => a + b, 0);
      }).filter(v => Number.isFinite(v) && v > 0);
      return valores.length ? valores.reduce((a, b) => a + b, 0).toFixed(2) : '';
    })(),
    confianca: linhas.every(l => normalizarConfianca(l.confianca) === 'alta') ? 'alta' as const : 'media' as const,
  } : undefined;
  const campos: CampoExtraido[] = linha && !resultado.camposExtraidos.some(c => c.chave === 'nome')
    ? [{ chave: 'nome', valor: linha.nome, origem: 'ocr', confianca: linha.confianca, arquivoOrigem: file.name }, ...resultado.camposExtraidos]
    : resultado.camposExtraidos;
  return campos.map(c => {
    // Campos comuns (operadora, vencimento, competência etc.) também não devem ser
    // reaproveitados quando a IA não conseguiu associar com segurança a pessoa selecionada
    // ao documento. Isso vale inclusive para um único beneficiário: um comprovante de outra
    // pessoa não pode preencher silenciosamente o formulário do beneficiário atual.
    if (!linha && !permitirCamposComuns) return { ...c, valor: '', confianca: 'nenhuma' as const };
    if (!linha && (c.chave === 'nome' || c.chave === 'valor')) return { ...c, valor: '', confianca: 'nenhuma' as const };
    if (c.chave !== 'nome' && c.chave !== 'valor') return c;
    if (linha) {
      let valor = c.chave === 'nome' ? linha.nome : linha.valor;
      if (c.chave === 'valor' && valor) {
        const n = numeroMonetario(valor);
        valor = Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
      }
      return { ...c, valor, confianca: valor ? normalizarConfianca(linha.confianca) : 'nenhuma' as const };
    }
    return multiplos ? { ...c, valor: '', confianca: 'nenhuma' as const } : c;
  });
}

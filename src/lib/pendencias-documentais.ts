import { dependentes, servidorAtual, type Dependente } from "./mock-data";
import {
  loadObservacoesGerdab,
  addObservacaoGerdab,
  marcarObservacaoAtendida,
  registrarAnaliseObservacao,
  type ObservacaoDestino,
  type ObservacaoGerdab,
} from "./prosaude-storage";

/**
 * Modelo único de pendência documental — unifica duas fontes que antes viviam separadas:
 *  (1) pendência automática do SISTEMA, hoje só um texto livre em `Dependente.alerta`, sem
 *      prazo nem consequência estruturados (ex: comprovante de matrícula, IRPF de enteado);
 *  (2) "Solicitação de documento" MANUAL do analista/gerência (`ObservacaoGerdab`), sem regra
 *      de prazo mapeada — ela permanece em aberto até ser atendida, sem bloqueio automático.
 *
 * A regra pedida: se o tipo de documento já tem prazo/consequência mapeados pelo sistema
 * (comprovante de matrícula, IRPF, laudo de invalidez, limite de idade), esse prazo NÃO pode
 * ser alterado manualmente. Se for um pedido do analista sem regra conhecida ("outro"), não há
 * prazo — a pendência só fica em aberto até ser resolvida, sem bloqueio automático.
 */

export type OrigemPendencia = "sistema" | "analista";

export type ConsequenciaPendencia =
  | "bloqueio_temporario_beneficio"
  | "inativacao_definitiva"
  | "fica_pendente";

export type TipoPendenciaDocumento =
  | "comprovante_matricula"
  | "declaracao_irpf_enteado"
  | "laudo_invalidez"
  | "limite_idade"
  | "outro";

export interface Prazo {
  data: Date;
  texto: string;
}

export interface PendenciaDocumental {
  id: string;
  servidorMatricula: string;
  dependenteId?: string;
  dependenteNome?: string;
  tipo: TipoPendenciaDocumento;
  origem: OrigemPendencia;
  documento: string;
  detalhe?: string;
  destino: ObservacaoDestino;
  prazo: Prazo | null;
  consequencia: ConsequenciaPendencia;
  criadoEm: string;
  autor?: string;
  cargo?: string;
}

export const DESCRICAO_CONSEQUENCIA: Record<ConsequenciaPendencia, string> = {
  bloqueio_temporario_beneficio:
    "Se não enviado até o prazo, o benefício deste dependente é bloqueado temporariamente na folha de pagamento — volta automaticamente após o novo documento ser aceito pela GERDAB.",
  inativacao_definitiva:
    "Gera inativação definitiva automática do dependente no sistema, com alerta enviado à GERDAB.",
  fica_pendente:
    "Não há prazo definido para este pedido — a pendência permanece em aberto até que o documento seja enviado e a regularização seja confirmada.",
};

/** Regras de prazo/consequência mapeadas pelo sistema — só estas 4 têm cálculo automático de
 *  data-limite; qualquer outro pedido de documento (analista, sem regra conhecida) cai em
 *  "outro" e nunca tem prazo fechado. `calcularPrazo` retorna `null` quando o tipo não depende
 *  de data (não deveria acontecer para os 4 mapeados, mas mantém o tipo seguro). */
const REGRAS: Record<
  Exclude<TipoPendenciaDocumento, "outro">,
  {
    label: string;
    origem: OrigemPendencia;
    consequencia: ConsequenciaPendencia;
    calcularPrazo: (hoje: Date, dependente?: Dependente) => Prazo | null;
  }
> = {
  comprovante_matricula: {
    label: "Comprovante de Matrícula",
    origem: "sistema",
    consequencia: "bloqueio_temporario_beneficio",
    calcularPrazo: (hoje) => {
      const ano = hoje.getFullYear();
      const finalS1 = segundoDiaUtil(ano, 2); // março
      const finalS2 = segundoDiaUtil(ano, 7); // agosto
      if (hoje <= finalS1) {
        return { data: finalS1, texto: `1º semestre — até ${formatarData(finalS1)}` };
      }
      if (hoje <= finalS2) {
        return { data: finalS2, texto: `2º semestre — até ${formatarData(finalS2)}` };
      }
      // Fora das duas janelas do ano — referência é a última janela encerrada (2º semestre),
      // que fica "vencida" até ser resolvida (não avança sozinha para o ano seguinte).
      return { data: finalS2, texto: `2º semestre — venceu em ${formatarData(finalS2)}` };
    },
  },
  declaracao_irpf_enteado: {
    label: "Declaração de Imposto de Renda",
    origem: "sistema",
    consequencia: "bloqueio_temporario_beneficio",
    calcularPrazo: (hoje) => {
      const ano = hoje.getFullYear();
      const limite = new Date(ano, 4, 31); // 31 de maio
      return { data: limite, texto: `Anual — até ${formatarData(limite)}` };
    },
  },
  laudo_invalidez: {
    label: "Laudo Médico de Invalidez",
    origem: "sistema",
    consequencia: "bloqueio_temporario_beneficio",
    calcularPrazo: (hoje, dependente) => {
      // A cada 24 meses, contados do último laudo aceito. Sem essa data cadastrada, não há
      // como calcular — mapeado aqui para uso futuro quando essa informação existir no mock.
      const ultimoLaudoEm = (dependente as (Dependente & { ultimoLaudoEm?: string }) | undefined)
        ?.ultimoLaudoEm;
      if (!ultimoLaudoEm) return null;
      const [dia, mes, anoStr] = ultimoLaudoEm.split("/").map(Number);
      const base = new Date(anoStr, mes - 1, dia);
      const limite = new Date(base.getFullYear() + 2, base.getMonth(), base.getDate());
      return { data: limite, texto: `A cada 24 meses — até ${formatarData(limite)}` };
    },
  },
  limite_idade: {
    label: "Limite de Idade do Dependente",
    origem: "sistema",
    consequencia: "inativacao_definitiva",
    calcularPrazo: () => null, // gatilho é a idade, não uma data-limite de envio
  },
};

function segundoDiaUtil(ano: number, mesIndex: number): Date {
  const d = new Date(ano, mesIndex, 1);
  let diasUteis = 0;
  while (diasUteis < 2) {
    if (d.getDay() !== 0 && d.getDay() !== 6) diasUteis++;
    if (diasUteis === 2) break;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

export function estaVencida(pendencia: PendenciaDocumental, hoje: Date = new Date()): boolean {
  return pendencia.prazo !== null && hoje > pendencia.prazo.data;
}

/** Storage local só para "atender" pendências geradas a partir de dado mock estático
 *  (`dependentes[].pendenciaTipo`) — segue o mesmo padrão já usado em
 *  `valoresCadastradosBeneficiarios` (override em cima de mock fixo), já que essas pendências
 *  não têm um registro próprio no localStorage como as `ObservacaoGerdab` (manuais) têm. */
const CHAVE_PENDENCIAS_SISTEMA_ATENDIDAS = "prosaude_pendencias_sistema_atendidas";

function idPendenciaSistema(dependenteId: string, tipo: TipoPendenciaDocumento): string {
  return `sistema-${dependenteId}-${tipo}`;
}

function carregarPendenciasSistemaAtendidas(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CHAVE_PENDENCIAS_SISTEMA_ATENDIDAS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function marcarPendenciaSistemaAtendida(id: string) {
  if (typeof window === "undefined") return;
  const atuais = carregarPendenciasSistemaAtendidas();
  if (atuais.includes(id)) return;
  localStorage.setItem(CHAVE_PENDENCIAS_SISTEMA_ATENDIDAS, JSON.stringify([...atuais, id]));
}

/** Marca a pendência como atendida — funciona tanto para pendências de origem "sistema"
 *  (override local sobre o mock) quanto "analista" (usa `marcarObservacaoAtendida`, já
 *  persistido de verdade em `ObservacaoGerdab`). Para pendências de sistema, também fecha a
 *  solicitação (real ou automática) mais recente daquele documento+beneficiário — mantém a aba
 *  Documentação e a trilha de solicitações em Observações/Histórico sincronizadas, já que são
 *  dois registros diferentes (mock estático vs. `ObservacaoGerdab`) para a mesma pendência. */
export function marcarPendenciaDocumentalAtendida(pendencia: PendenciaDocumental) {
  if (pendencia.origem === "sistema") {
    marcarPendenciaSistemaAtendida(pendencia.id);
    const solicitacaoAberta = loadObservacoesGerdab()
      .filter(
        (o) =>
          o.tipo === "solicitacao_documento" &&
          o.beneficiarioId === pendencia.dependenteId &&
          o.documento === pendencia.documento &&
          !o.atendidaEm,
      )
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    if (solicitacaoAberta) marcarObservacaoAtendida(solicitacaoAberta.id);
  } else {
    marcarObservacaoAtendida(pendencia.id);
  }
}

/**
 * Todas as pendências documentais em aberto de um servidor, filtradas por destino — mesma
 * função usada pelo Portal do Servidor (destino "servidor") e pela Área da Associação (destino
 * "associacao"). Unifica as duas fontes (regras de sistema sobre `dependentes` + solicitações
 * manuais em `ObservacaoGerdab`), sempre recalculado na hora, nunca persistido como campo novo.
 */
export function getPendenciasDocumentaisDoServidor(
  servidorMatricula: string,
  destino: ObservacaoDestino,
  hoje: Date = new Date(),
): PendenciaDocumental[] {
  const atendidasSistema = carregarPendenciasSistemaAtendidas();

  // Pendências de sistema: quem deve resolver é a associação, se o servidor tiver uma; senão,
  // o próprio servidor — mesma regra já usada para a solicitação manual do analista.
  const destinoSistema: ObservacaoDestino = servidorAtual.associacao !== "—" ? "associacao" : "servidor";

  const deSistema: PendenciaDocumental[] =
    destino === destinoSistema
      ? dependentes
          .filter((d) => d.pendenciaTipo)
          .map((d): PendenciaDocumental | null => {
            const tipo = d.pendenciaTipo as Exclude<TipoPendenciaDocumento, "outro">;
            const regra = REGRAS[tipo];
            const id = idPendenciaSistema(d.id, tipo);
            if (atendidasSistema.includes(id)) return null;
            return {
              id,
              servidorMatricula,
              dependenteId: d.id,
              dependenteNome: d.nome,
              tipo,
              origem: regra.origem,
              documento: regra.label,
              detalhe: d.alerta,
              destino: destinoSistema,
              prazo: regra.calcularPrazo(hoje, d),
              consequencia: regra.consequencia,
              criadoEm: hoje.toISOString(),
            };
          })
          .filter((p): p is PendenciaDocumental => p !== null)
      : [];

  const deAnalista: PendenciaDocumental[] = loadObservacoesGerdab()
    .filter(
      (o) =>
        o.tipo === "solicitacao_documento" &&
        o.servidorMatricula === servidorMatricula &&
        o.destino === destino &&
        !o.atendidaEm,
    )
    .map((o) => ({
      id: o.id,
      servidorMatricula,
      dependenteId: o.beneficiarioId && o.beneficiarioId !== "titular" ? o.beneficiarioId : undefined,
      dependenteNome: o.beneficiarioId && o.beneficiarioId !== "titular" ? o.beneficiarioNome : undefined,
      tipo: "outro" as const,
      origem: "analista" as const,
      documento: o.documento ?? "Documento solicitado",
      detalhe: o.texto || undefined,
      destino: o.destino,
      prazo: null,
      consequencia: "fica_pendente" as const,
      criadoEm: o.criadoEm,
      autor: o.autor,
      cargo: o.cargo,
    }));

  return [...deSistema, ...deAnalista];
}

/**
 * Garante que toda pendência de sistema hoje em aberto tenha ao menos uma solicitação
 * registrada em `ObservacaoGerdab`, atribuída a "Sistema" — representa a notificação automática
 * enviada ao responsável na primeira vez que a pendência foi identificada. Idempotente: não
 * duplica se já existir alguma solicitação (automática ou de um analista) para aquele
 * documento+beneficiário, nem recria se a pendência já foi atendida. Chamar ao abrir a aba
 * Documentação — é o que alimenta, ali, o "Realizado por Sistema" e a contagem de solicitações
 * mesmo antes de qualquer analista ter agido.
 */
export function garantirSolicitacoesAutomaticas(servidorMatricula: string) {
  if (typeof window === "undefined") return;
  const destinoSistema: ObservacaoDestino = servidorAtual.associacao !== "—" ? "associacao" : "servidor";
  const atendidasSistema = carregarPendenciasSistemaAtendidas();
  const existentes = loadObservacoesGerdab();

  dependentes
    .filter((d) => d.pendenciaTipo)
    .forEach((d) => {
      const tipo = d.pendenciaTipo as Exclude<TipoPendenciaDocumento, "outro">;
      const regra = REGRAS[tipo];
      if (atendidasSistema.includes(idPendenciaSistema(d.id, tipo))) return;
      const jaTemSolicitacao = existentes.some(
        (o) => o.tipo === "solicitacao_documento" && o.beneficiarioId === d.id && o.documento === regra.label,
      );
      if (jaTemSolicitacao) return;
      addObservacaoGerdab({
        id: `obs-auto-${d.id}-${tipo}`,
        servidorMatricula,
        beneficiarioId: d.id,
        beneficiarioNome: d.nome,
        destino: destinoSistema,
        associacao: servidorAtual.associacao !== "—" ? servidorAtual.associacao : undefined,
        tipo: "solicitacao_documento",
        documento: regra.label,
        autor: "Sistema",
        cargo: "Automático",
        texto: "Notificação automática enviada ao responsável pela pendência identificada pelo sistema.",
        criadoEm: new Date().toISOString(),
      });
    });
}

export type StatusDocumentoPendente = "aguardando_envio" | "aguardando_analise" | "aprovado";

export interface DocumentoPendenteView {
  id: string;
  servidorMatricula: string;
  documento: string;
  beneficiarioId: string;
  beneficiarioNome: string;
  destino: ObservacaoDestino;
  status: StatusDocumentoPendente;
  ultimaSolicitacao: { criadoEm: string; autor: string; cargo: string };
  totalSolicitacoes: number;
  /** Preenchido quando o documento já foi enviado (status "aguardando_analise" ou "aprovado"). */
  atendidaEm?: string;
  /** Texto livre da solicitação mais recente — quando esta solicitação nasceu de um pedido de
   *  reenvio, é aqui que a justificativa do analista aparece para quem vai reenviar. */
  detalhe?: string;
  analisadoPor?: string;
  analisadoEm?: string;
}

/**
 * Visão consolidada, por documento+beneficiário, de todas as solicitações já feitas (sistema ou
 * analista) — usada pela aba Documentação (GERDAB) e pelos banners de status no Portal do
 * Servidor / Área da Associação, para mostrar: a solicitação mais recente (quem pediu, quando),
 * o total de vezes que foi pedido, e o estado atual (aguardando envio, aguardando análise ou
 * aprovado) — sem nunca sobrescrever ocorrências anteriores (elas continuam intactas em
 * `ObservacaoGerdab`, só agrupadas aqui para exibição). Quando um reenvio é solicitado, uma
 * nova solicitação (com a justificativa em `detalhe`) passa a ser a mais recente — o registro
 * anterior, já analisado, permanece intacto no Histórico/Observações, só não é mais "o estado
 * atual" deste agrupamento.
 */
export function getStatusDocumentosDoServidor(
  servidorMatricula: string,
  destino?: ObservacaoDestino,
): DocumentoPendenteView[] {
  const todas = loadObservacoesGerdab().filter(
    (o): o is ObservacaoGerdab & { beneficiarioId: string; documento: string } =>
      o.tipo === "solicitacao_documento" &&
      o.servidorMatricula === servidorMatricula &&
      (!destino || o.destino === destino) &&
      !!o.beneficiarioId &&
      !!o.documento,
  );

  const porChave = new Map<string, typeof todas>();
  todas.forEach((o) => {
    const chave = `${o.beneficiarioId}::${o.documento}`;
    porChave.set(chave, [...(porChave.get(chave) ?? []), o]);
  });

  return [...porChave.values()].map((lista) => {
    const ordenada = [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const maisRecente = ordenada[0];
    let status: StatusDocumentoPendente = "aguardando_envio";
    if (maisRecente.atendidaEm) {
      status = maisRecente.analiseStatus === "aprovado" ? "aprovado" : "aguardando_analise";
    }
    return {
      id: maisRecente.id,
      servidorMatricula: maisRecente.servidorMatricula,
      documento: maisRecente.documento,
      beneficiarioId: maisRecente.beneficiarioId,
      beneficiarioNome: maisRecente.beneficiarioNome ?? "",
      destino: maisRecente.destino,
      status,
      atendidaEm: maisRecente.atendidaEm,
      detalhe: maisRecente.texto || undefined,
      analisadoPor: maisRecente.analisadoPor,
      analisadoEm: maisRecente.analisadoEm,
      ultimaSolicitacao: {
        criadoEm: maisRecente.criadoEm,
        autor: maisRecente.autor,
        cargo: maisRecente.cargo,
      },
      totalSolicitacoes: ordenada.length,
    };
  });
}

/** Aprova o documento enviado — encerra o ciclo de validação deste envio. */
export function aprovarDocumento(pendencia: DocumentoPendenteView, analisadoPor: string, analisadoCargo: string) {
  registrarAnaliseObservacao(pendencia.id, { analiseStatus: "aprovado", analisadoPor, analisadoCargo });
}

/**
 * Solicita o reenvio de um documento já enviado (ex.: falha na leitura) — sempre com
 * justificativa, mostrada a quem enviou. O registro atual é marcado como
 * "reenvio_solicitado" (permanece intacto, com a justificativa, no Histórico/Observações) e uma
 * nova solicitação em aberto é criada com a mesma justificativa em `texto`/`detalhe` — reaproveita
 * o mesmo mecanismo de "Solicitar novamente" já existente, então o servidor/associação vê o pedido
 * de novo, com o motivo, sem que nenhuma ocorrência anterior seja apagada ou sobrescrita.
 */
export function solicitarReenvioDocumento(
  pendencia: DocumentoPendenteView,
  justificativa: string,
  analisadoPor: string,
  analisadoCargo: string,
) {
  registrarAnaliseObservacao(pendencia.id, {
    analiseStatus: "reenvio_solicitado",
    analisadoPor,
    analisadoCargo,
    justificativaReenvio: justificativa,
  });
  addObservacaoGerdab({
    id: `obs-${Date.now()}`,
    servidorMatricula: pendencia.servidorMatricula,
    beneficiarioId: pendencia.beneficiarioId,
    beneficiarioNome: pendencia.beneficiarioNome,
    destino: pendencia.destino,
    associacao: servidorAtual.associacao !== "—" ? servidorAtual.associacao : undefined,
    tipo: "solicitacao_documento",
    documento: pendencia.documento,
    autor: analisadoPor,
    cargo: analisadoCargo,
    texto: `Reenvio solicitado: ${justificativa}`,
    criadoEm: new Date().toISOString(),
  });
}

/**
 * Semeia, uma única vez (idempotente — checa o id fixo antes de criar), um exemplo já em
 * "aguardando análise" — um documento que o servidor já enviou em resposta a um pedido manual do
 * analista, pronto para o ciclo de Aprovar/Solicitar reenvio ser demonstrado sem precisar passar
 * primeiro pelo Portal do Servidor. Usa Pedro da Silva (dependente sem nenhuma outra pendência
 * hoje) para não se misturar com os exemplos de pendência automática (Lucas Souza, Marcos Lima).
 * Chamar junto de `garantirSolicitacoesAutomaticas` ao abrir a aba Documentação.
 */
export function garantirExemploDocumentoEmAnalise(servidorMatricula: string) {
  if (typeof window === "undefined") return;
  const ID_EXEMPLO = "obs-exemplo-analise-d2";
  if (loadObservacoesGerdab().some((o) => o.id === ID_EXEMPLO)) return;

  const dependente = dependentes.find((d) => d.id === "d2");
  if (!dependente) return;

  const destinoSistema: ObservacaoDestino = servidorAtual.associacao !== "—" ? "associacao" : "servidor";
  const agora = Date.now();
  addObservacaoGerdab({
    id: ID_EXEMPLO,
    servidorMatricula,
    beneficiarioId: dependente.id,
    beneficiarioNome: dependente.nome,
    destino: destinoSistema,
    associacao: servidorAtual.associacao !== "—" ? servidorAtual.associacao : undefined,
    tipo: "solicitacao_documento",
    documento: "Atestado de Frequência Escolar",
    autor: "Rebeca",
    cargo: "Analista GERDAB",
    texto: "Necessário para renovação do plano escolar do dependente.",
    criadoEm: new Date(agora - 2 * 24 * 60 * 60 * 1000).toISOString(),
    atendidaEm: new Date(agora - 3 * 60 * 60 * 1000).toISOString(),
    analiseStatus: "aguardando_analise",
  });
}

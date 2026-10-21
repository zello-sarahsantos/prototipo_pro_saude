import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/mock-data";
import { ROTULO_SITUACAO_COMPROVANTES, type LinhaRessarcimentoDashboard, type SituacaoComprovantes } from "@/lib/dashboard-gerdab";
import type { DadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { AvisoAtualizacao, BarraOperacional, CabecalhoExpansao, CLASSE_CTA_PRINCIPAL, FiltroSituacao, IconeCta, RodapeLista, SeloResumo, TabelaOperacional, separarNomeMatricula, type AtualizacaoSelecionada } from "./PainelExpansao";
import { V, num } from "./gd-ui";

const PASSO = 8;
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n: number, um: string, varios: string) => `${num(n)} ${n === 1 ? um : varios}`;

/** Destaca (e coloca primeiro) os registros cujo nome coincide com a atualização escolhida numa notificação. */
function ordenarComDestaque<T extends { nome: string }>(itens: T[], aviso?: AtualizacaoSelecionada | null) {
  if (!aviso) return { lista: itens, encontrada: false };
  const alvo = norm(separarNomeMatricula(aviso.entidade).nome);
  const bate = (i: T) => norm(separarNomeMatricula(i.nome).nome) === alvo;
  const achados = itens.filter(bate);
  return { lista: [...achados, ...itens.filter((i) => !bate(i))], encontrada: achados.length > 0, bate };
}

/* ── Comprovantes ─────────────────────────────────────────────────────────────────────────────────────────── */

const DESCRICAO_COMP: Record<SituacaoComprovantes, string> = {
  aguardando: "Confira o documento e registre a ação diretamente na ficha.",
  validados: "Consulte documentos validados e o responsável pela conferência.",
  devolvidos: "Acompanhe documentos devolvidos e os motivos de correção.",
};
const TITULO_COMP: Record<SituacaoComprovantes, [string, string]> = { aguardando: ["comprovante aguardando análise", "comprovantes aguardando análise"], validados: ["comprovante validado", "comprovantes validados"], devolvidos: ["comprovante devolvido", "comprovantes devolvidos"] };

export function PainelComprovantes({ dados, situacao, onSituacao, competencia, competenciaRotulo, onFechar, aviso, onDispensarAviso, fonte }: { dados: DadosDashboard["comprovantes"]; situacao: SituacaoComprovantes; onSituacao: (s: SituacaoComprovantes) => void; competencia: string; competenciaRotulo: string; onFechar: () => void; aviso?: AtualizacaoSelecionada | null; onDispensarAviso: () => void; fonte: string }) {
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO);
  useEffect(() => setVisiveis(PASSO), [situacao, busca, competencia, fonte]);
  const todas = useMemo(() => dados.linhas(situacao), [dados, situacao, competencia, fonte]);
  const q = norm(busca.trim());
  const filtradas = todas.filter((l) => !q || norm(`${l.nome} ${l.arquivo} ${l.situacaoRotulo}`).includes(q));
  const { lista, encontrada, bate } = ordenarComDestaque(filtradas, aviso);
  const n = dados[situacao];
  const outros = (["validados", "aguardando", "devolvidos"] as SituacaoComprovantes[]).filter((s) => s !== situacao);
  const tom = { aguardando: "ambar", validados: "verde", devolvidos: "rosa" } as const;
  const badgeSituacao = (s: SituacaoComprovantes, responsavel?: string) => {
    const cor = s === "validados" ? { fg: V.green, bg: V.greenSoft, t: "Validação registrada" } : s === "devolvidos" ? { fg: V.red, bg: V.redSoft, t: "Devolvido" } : { fg: V.muted, bg: V.track, t: responsavel ? "Ação registrada" : "Sem ação registrada" };
    return <span style={{ fontSize: 12, fontWeight: 700, color: cor.fg, background: cor.bg, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>{cor.t}</span>;
  };
  return (
    <>
      <CabecalhoExpansao
        categoria={`Comprovantes · ${competenciaRotulo}`}
        titulo={`${plural(n, ...TITULO_COMP[situacao])}`}
        descricao={DESCRICAO_COMP[situacao]}
        badges={outros.map((s) => <SeloResumo key={s} texto={`${num(dados[s])} ${s === "aguardando" ? "aguardando análise" : s === "validados" ? "validados" : "devolvidos"}`} tom={s === "aguardando" ? tom.aguardando : "neutro"} />)}
        acao={<Link to="/admin/comprovantes" search={{ competencia, situacao }} className={CLASSE_CTA_PRINCIPAL}>Abrir relação completa <IconeCta /></Link>}
        onFechar={onFechar}
        rotuloFechar="Fechar comprovantes"
      />
      {aviso && <AvisoAtualizacao aviso={aviso} encontrada={encontrada} onDispensar={onDispensarAviso} />}
      <BarraOperacional
        valor={busca}
        onValor={setBusca}
        placeholder="Pesquisar servidor, matrícula ou arquivo..."
        ariaLabel="Pesquisar comprovantes por servidor, matrícula ou arquivo"
        filtros={(["validados", "aguardando", "devolvidos"] as SituacaoComprovantes[]).map((s) => (
          <FiltroSituacao key={s} rotulo={ROTULO_SITUACAO_COMPROVANTES[s]} n={dados[s]} ativo={s === situacao} onClick={() => onSituacao(s)} />
        ))}
      />
      <TabelaOperacional colunas="minmax(180px, 1.5fr) minmax(180px, 1.3fr) minmax(220px, 1.3fr)" cabecalhos={["Servidor", "Documento", "Situação e acesso"]} vazio={lista.length === 0 ? (q ? `Nenhum comprovante encontrado para “${busca.trim()}”.` : "Nenhum comprovante nesta situação.") : undefined}>
        {lista.slice(0, visiveis).map((l) => {
          const { nome, matricula } = separarNomeMatricula(l.nome);
          return (
            <div key={l.id} className="gd-tab-row gd-row" data-destaque={bate?.(l) ? "true" : undefined}>
              <span className="gd-t1" style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 16, fontWeight: 700, overflowWrap: "anywhere" }}>{nome}</strong>
                {matricula && <span style={{ fontSize: 13, color: V.muted }}>Matrícula {matricula}</span>}
              </span>
              <span className="gd-t2" style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, overflowWrap: "anywhere" }}>{l.arquivo}</span>
                <span style={{ display: "block", fontSize: 13, color: V.muted }}>{l.situacaoRotulo}</span>
              </span>
              <span className="gd-t3" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  {badgeSituacao(situacao, l.responsavel)}
                  {l.responsavel && <span style={{ fontSize: 12, color: V.muted }}>Responsável: {l.responsavel}</span>}
                </span>
                <Link to="/admin/comprovantes" search={{ competencia, situacao }} className="gd-btn-abrir" aria-label={`Abrir comprovantes de ${nome} na fila`}>Abrir <IconeCta /></Link>
              </span>
            </div>
          );
        })}
      </TabelaOperacional>
      <RodapeLista mostrando={Math.min(visiveis, lista.length)} total={lista.length} rotulo={q ? "comprovantes encontrados" : "comprovantes"} onMais={() => setVisiveis((v) => v + PASSO)} passo={PASSO} nota={!q && lista.length !== n ? `total demonstrativo: ${num(n)}` : undefined} />
    </>
  );
}

/* ── Ressarcimentos de meses anteriores ───────────────────────────────────────────────────────────────────── */

function tomStatus(l: LinhaRessarcimentoDashboard) {
  const s = l.statusRotulo;
  if (s === "Em análise") return { fg: V.amber, bg: V.amberSoft };
  if (s === "Complementação recebida") return { fg: V.primary, bg: V.primarySoft };
  if (s === "Aguardando complementação" || s === "Não autorizada" || s === "Desabilitada") return { fg: V.red, bg: V.redSoft };
  if (s === "Autorizada" || s === "Habilitada") return { fg: V.green, bg: V.greenSoft };
  return { fg: V.muted, bg: V.track };
}
const proximaAcao = (l: LinhaRessarcimentoDashboard) =>
  l.aguardando ? (l.statusRotulo === "Aguardando complementação" ? { rotulo: "Envio da complementação", valor: "Servidor" } : { rotulo: "Responsável", valor: "GERDAB" }) : { rotulo: "Responsável", valor: l.responsavel ?? "—" };

export function PainelRessarcimentos({ origem, dados, competenciaRotulo, onFechar, aviso, onDispensarAviso }: { origem: "individual" | "associacao"; dados: DadosDashboard["ressServidor"]; competenciaRotulo: string; onFechar: () => void; aviso?: AtualizacaoSelecionada | null; onDispensarAviso: () => void }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"acao" | "decididas">("acao");
  const [visiveis, setVisiveis] = useState(PASSO);
  useEffect(() => setVisiveis(PASSO), [busca, filtro]);
  const r = dados.resumo;
  const servidor = origem === "individual";
  const q = norm(busca.trim());
  const base = dados.linhas.filter((l) => (filtro === "acao" ? l.aguardando : !l.aguardando));
  const filtradas = base.filter((l) => !q || norm(`${l.nome} ${l.referencia} ${l.origemRotulo} ${l.statusRotulo}`).includes(q));
  const { lista, encontrada, bate } = ordenarComDestaque(filtradas, aviso);
  const nAcao = dados.linhas.filter((l) => l.aguardando).length;
  const nDecididas = dados.linhas.length - nAcao;
  const associacoes = r.porAssociacao.map((p) => p.associacao).join(" e ");
  return (
    <>
      <CabecalhoExpansao
        categoria="Ressarcimentos · Meses anteriores"
        titulo={servidor ? `${plural(r.aguardando, "competência aguardando análise", "competências aguardando análise")}` : `${plural(r.aguardando, "competência aguardando análise", "competências aguardando análise")} — Associações`}
        descricao={servidor ? "Servidores · acompanhe decisões e complementações antes de autorizar o ressarcimento." : `Acompanhe as competências encaminhadas por ${associacoes}.`}
        badges={
          servidor ? (
            <>
              <SeloResumo texto={`${num(r.emAnalise)} em análise`} tom="ambar" />
              <SeloResumo texto={`${num(r.complementacaoRecebida)} ${r.complementacaoRecebida === 1 ? "complementação recebida" : "complementações recebidas"}`} tom="azul" />
              <SeloResumo texto={`${num(r.aguardandoComplementacao)} aguardando complemento`} />
            </>
          ) : (
            r.porAssociacao.map((p) => <SeloResumo key={p.associacao} texto={`${p.associacao} ${num(p.aguardando)}`} />)
          )
        }
        acao={<Link to="/admin/retroativos" search={{ origem }} className={CLASSE_CTA_PRINCIPAL}>Abrir fila completa <IconeCta /></Link>}
        onFechar={onFechar}
        rotuloFechar="Fechar ressarcimentos"
      />
      {aviso && <AvisoAtualizacao aviso={aviso} encontrada={encontrada} onDispensar={onDispensarAviso} />}
      <BarraOperacional
        valor={busca}
        onValor={setBusca}
        placeholder={servidor ? "Pesquisar servidor, matrícula ou competência..." : "Pesquisar servidor, matrícula, associação ou competência..."}
        ariaLabel="Pesquisar competências"
        filtros={
          <>
            <FiltroSituacao rotulo="Requer ação" n={nAcao} ativo={filtro === "acao"} onClick={() => setFiltro("acao")} />
            <FiltroSituacao rotulo="Decididas" n={nDecididas} ativo={filtro === "decididas"} onClick={() => setFiltro("decididas")} />
          </>
        }
        total={`${num(r.total)} ${r.total === 1 ? "competência" : "competências"}`}
      />
      <TabelaOperacional
        colunas={servidor ? "minmax(200px, 1.5fr) minmax(170px, 1fr) minmax(180px, 1fr) 130px" : "minmax(200px, 1.4fr) minmax(220px, 1.3fr) minmax(140px, 0.8fr) 130px"}
        cabecalhos={servidor ? ["Servidor e competência", "Situação", "Próxima ação", "Acesso"] : ["Servidor e associação", "Competência e situação", "Responsável", "Acesso"]}
        vazio={lista.length === 0 ? (q ? `Nenhuma competência encontrada para “${busca.trim()}”.` : "Nenhuma competência neste filtro.") : undefined}
      >
        {lista.slice(0, visiveis).map((l) => {
          const { nome, matricula } = separarNomeMatricula(l.nome);
          const t = tomStatus(l);
          const pa = proximaAcao(l);
          const situacao = <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: t.fg, background: t.bg, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>{l.statusRotulo}</span>;
          return (
            <div key={l.id} className="gd-tab-row gd-row" data-destaque={bate?.(l) ? "true" : undefined}>
              <span className="gd-t1" style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 16, fontWeight: 700, overflowWrap: "anywhere" }}>{nome}</strong>
                <span style={{ fontSize: 13, color: V.muted }}>{matricula ? `Matrícula ${matricula}` : ""}{servidor ? ` · ref. ${l.referencia}` : ""}</span>
              </span>
              {servidor ? (
                <>
                  <span className="gd-t2">{situacao}</span>
                  <span className="gd-t3" style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, color: V.muted }}>{pa.rotulo}</span>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: pa.valor === "GERDAB" ? V.primary : V.text }}>{pa.valor}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="gd-t2">
                    <span style={{ display: "block", fontSize: 14, marginBottom: 4 }}>{l.origemRotulo} · ref. {l.referencia}</span>
                    {situacao}
                  </span>
                  <span className="gd-t3" style={{ fontSize: 15, fontWeight: 700, color: pa.valor === "GERDAB" ? V.primary : V.text }}>{pa.valor}</span>
                </>
              )}
              <span className="gd-t4"><Link to="/admin/retroativos" search={{ origem }} className="gd-btn-abrir" aria-label={`Abrir ${nome} na fila de ressarcimentos`}>Abrir <IconeCta /></Link></span>
            </div>
          );
        })}
      </TabelaOperacional>
      <RodapeLista mostrando={Math.min(visiveis, lista.length)} total={lista.length} rotulo={q ? "competências encontradas" : "competências"} onMais={() => setVisiveis((v) => v + PASSO)} passo={PASSO} />
    </>
  );
}

/* ── Aptos na consolidação ────────────────────────────────────────────────────────────────────────────────── */

export function PainelAptos({ aptos, competencia, competenciaRotulo, vigente, onFechar }: { aptos: DadosDashboard["aptos"]; competencia: string; competenciaRotulo: string; vigente: boolean; onFechar: () => void }) {
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO);
  useEffect(() => setVisiveis(PASSO), [busca, competencia]);
  const q = norm(busca.trim());
  const lista = aptos.linhas.filter((l) => !q || norm(`${l.nome} ${l.matricula ?? ""} ${l.plano}`).includes(q));
  return (
    <>
      <CabecalhoExpansao
        categoria={`${vigente ? "Consolidação vigente" : "Consolidação"} · ${competenciaRotulo}`}
        titulo={`${plural(aptos.registros, "titular apto na consolidação", "titulares aptos na consolidação")}`}
        descricao={`${num(aptos.vidas)} vidas beneficiadas · ${formatCurrency(aptos.valorRessarcir)} a ressarcir.`}
        badges={
          <>
            <SeloResumo texto={`${num(aptos.vidas)} vidas`} tom="azul" />
            <SeloResumo texto="Disponível" tom="verde" />
          </>
        }
        acao={<Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} className={CLASSE_CTA_PRINCIPAL}>Abrir consolidação <IconeCta /></Link>}
        onFechar={onFechar}
        rotuloFechar="Fechar aptos na consolidação"
      />
      <BarraOperacional valor={busca} onValor={setBusca} placeholder="Pesquisar titular, matrícula ou operadora..." ariaLabel="Pesquisar titulares aptos" total={`${num(lista.length)} ${lista.length === 1 ? "titular apto" : "titulares aptos"}`} />
      <TabelaOperacional colunas="minmax(200px, 1.4fr) minmax(200px, 1.2fr) minmax(120px, 0.7fr) 130px" cabecalhos={["Titular", "Plano e vidas", "Valor", "Acesso"]} vazio={lista.length === 0 ? (q ? `Nenhum titular encontrado para “${busca.trim()}”.` : "Nenhum titular apto nesta competência.") : undefined}>
        {lista.slice(0, visiveis).map((l) => (
          <div key={l.id} className="gd-tab-row gd-row">
            <span className="gd-t1" style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 16, fontWeight: 700, overflowWrap: "anywhere" }}>{l.nome}</strong>
              {l.matricula && <span style={{ fontSize: 13, color: V.muted }}>Matrícula {l.matricula}</span>}
            </span>
            <span className="gd-t2" style={{ color: V.muted }}>{l.plano} · {l.vidas} {l.vidas === 1 ? "vida" : "vidas"}</span>
            <span className="gd-t3" style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(l.valor)}</span>
            <span className="gd-t4"><Link to="/admin/relatorios/pagamentos" search={{ competencia, aba: "adimplente" }} className="gd-btn-abrir" aria-label={`Abrir consolidação — ${l.nome}`}>Abrir <IconeCta /></Link></span>
          </div>
        ))}
      </TabelaOperacional>
      <RodapeLista mostrando={Math.min(visiveis, lista.length)} total={lista.length} rotulo={q ? "titulares encontrados" : "titulares"} onMais={() => setVisiveis((v) => v + PASSO)} passo={PASSO} nota={!q && lista.length !== aptos.registros ? `total demonstrativo: ${num(aptos.registros)}` : undefined} />
    </>
  );
}

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Pencil, Calculator, Paperclip } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { V } from "@/components/dashboard-gerdab/gd-ui";
import { obterArquivo } from "@/lib/armazenamento-arquivos";
import { FINALIDADES_DOCUMENTO, TIPOS_DOCUMENTO_NEGOCIACAO, ROTULO_SITUACAO, formatarCentavos, type CriterioParcelamento, type DocumentoNegociacao, type MemoriaCalculo, type SituacaoNegociacao } from "@/lib/negociacoes";

/** Perfis com acesso ao módulo (plano aprovado): Analista e Gerência. Servidor e Associação veem "Acesso restrito".
 *  Guarda só das rotas novas — o protótipo não tem sessão real (perfil vem de `localStorage.prosaude_role`). */
export function GuardaPerfilAdmin({ children, modulo = "Módulo de Negociações" }: { children: ReactNode; /** Nome do módulo/relatório citado na mensagem de acesso restrito (padrão: Negociações). */ modulo?: string }) {
  const [perfil, setPerfil] = useState<string | null>(null);
  useEffect(() => setPerfil(getAdminRole()), []);
  if (perfil === null) return null;
  if (perfil !== "analista" && perfil !== "gerencia") {
    return (
      <div className="gd" style={{ padding: 32, background: V.bg, minHeight: "100%" }}>
        <div role="alert" style={{ maxWidth: 520, margin: "40px auto", background: V.card, border: `1px solid ${V.border}`, borderRadius: 12, padding: 24, display: "flex", gap: 14 }}>
          <Lock size={22} color={V.muted} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Acesso restrito</h1>
            <p style={{ fontSize: 14, color: V.muted, margin: "6px 0 14px" }}>{`O ${modulo} é de uso interno da GERDAB (perfis Analista e Gerência).`}</p>
            <Link to="/login" style={{ fontSize: 13, fontWeight: 600 }}>Ir para o login →</Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export const inputEstilo: CSSProperties = {
  height: 40,
  width: "100%",
  boxSizing: "border-box",
  padding: "0 10px",
  border: `1px solid ${V.border}`,
  borderRadius: 8,
  background: V.card,
  color: V.text,
  fontFamily: "inherit",
  fontSize: 14,
};

export function Campo({ rotulo, erro, ajuda, children, obrigatorio }: { rotulo: string; erro?: string; ajuda?: string; children: ReactNode; obrigatorio?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: V.muted, minWidth: 0 }}>
      <span>
        {rotulo}
        {obrigatorio && <span aria-hidden style={{ color: V.red }}> *</span>}
      </span>
      {children}
      {ajuda && !erro && <span style={{ fontWeight: 400 }}>{ajuda}</span>}
      {erro && (
        <span role="alert" style={{ fontWeight: 500, color: V.red }}>
          {erro}
        </span>
      )}
    </label>
  );
}

export const botaoPrimario: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, padding: "0 16px", border: "none", borderRadius: 8, background: V.primary, color: V.onPrimary, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" };
export const botaoSecundario: CSSProperties = { ...botaoPrimario, background: V.card, color: V.text, border: `1px solid ${V.border}` };

/** Origem do valor: "Calculado automaticamente" (neutro) × "Preenchido manualmente" (âmbar, ícone de lápis). */
export function SeloOrigemValor({ origem }: { origem: "automatico" | "manual" }) {
  const manual = origem === "manual";
  const Icone = manual ? Pencil : Calculator;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", color: manual ? V.amber : V.muted, background: manual ? V.amberSoft : V.track }}>
      <Icone size={11} aria-hidden />
      {manual ? "Preenchido manualmente" : "Calculado automaticamente"}
    </span>
  );
}

export function SeloSituacao({ situacao }: { situacao: SituacaoNegociacao }) {
  const ok = situacao === "concluida";
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", color: ok ? V.green : V.primary, background: ok ? V.greenSoft : V.primarySoft }}>{ROTULO_SITUACAO[situacao]}</span>;
}

export const formatarData = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
export const formatarDataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const rotuloDocumento = (d: Pick<DocumentoNegociacao, "tipo" | "finalidade">) => `${TIPOS_DOCUMENTO_NEGOCIACAO[d.tipo]} · ${FINALIDADES_DOCUMENTO[d.finalidade]}`;

/** Abre o documento em nova aba. Sem arquivo (anexo de demonstração), mostra uma página identificando o documento. */
export async function abrirDocumentoNegociacao(d: DocumentoNegociacao, baixar = false) {
  let url: string;
  const blob = d.comArquivo ? await obterArquivo(d.id) : undefined;
  if (blob) {
    url = URL.createObjectURL(blob);
  } else {
    const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(d.nome)}</title><body style="font-family:sans-serif;padding:2rem"><h2>${esc(d.nome)}</h2><p>${esc(rotuloDocumento(d))}</p><p style="color:#666">Documento de demonstração do protótipo (sem arquivo). Em produção, aqui abre o arquivo anexado.</p></body>`;
    url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  }
  if (baixar) {
    const a = document.createElement("a");
    a.href = url;
    a.download = blob ? d.nome : `${d.nome}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

export const AVISO_CRITERIO_TRUNCAMENTO = "Critério do protótipo, sujeito à validação da GERDAB — não é norma administrativa homologada.";
export const AVISO_PARAMETROS_AUXILIO = "Calculado com o percentual e o teto atualmente vigentes no sistema; para meses antigos é uma referência, não necessariamente a regra da época. Confira e ajuste, com justificativa, quando necessário.";

/** Marcador discreto na tabela principal: aparece só quando o valor não é o calculado automaticamente. */
export function MarcadorAjuste({ manual, titulo }: { manual: boolean; titulo?: string }) {
  if (!manual) return null;
  return (
    <span title={titulo ?? "Preenchido manualmente — o valor calculado original está na memória de cálculo"} aria-label="Preenchido manualmente" style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, fontSize: 10, fontWeight: 600, color: V.amber, background: V.amberSoft, borderRadius: 999, padding: "1px 6px", verticalAlign: "middle" }}>
      <Pencil size={9} aria-hidden /> manual
    </span>
  );
}

const celula = (dir: "left" | "right" = "left"): CSSProperties => ({ padding: "6px 8px", borderBottom: `1px solid ${V.border}`, textAlign: dir, fontSize: 13 });

export interface LinhaMemoriaAuxilio {
  competencia: string;
  valorParcelaCents: number;
  /** Base considerada (valor da parcela limitado ao teto) — `undefined` em negociações anteriores ao cálculo. */
  baseCents?: number;
  calculadoCents?: number;
  finalCents: number;
}

/** A) Cálculo do auxílio elegível — um mês por linha: valor da parcela, base, percentual, teto, calculado e final. */
export function MemoriaAuxilioView({ meses, percentual, tetoCents, formatarMes }: { meses: LinhaMemoriaAuxilio[]; percentual?: number; tetoCents?: number; formatarMes: (c: string) => string }) {
  const anterior = meses.some((m) => m.calculadoCents === undefined);
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr style={{ color: V.muted, fontSize: 12 }}>
              {["Mês negociado", "Valor da parcela", "Base considerada", "Auxílio calculado", "Auxílio elegível"].map((h, i) => <th key={h} style={{ ...celula(i === 0 ? "left" : "right"), fontWeight: 600, fontSize: 12 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const ajustado = m.calculadoCents !== undefined && m.calculadoCents !== m.finalCents;
              return (
                <tr key={m.competencia}>
                  <td style={celula()}>{formatarMes(m.competencia)}</td>
                  <td style={celula("right")}>{formatarCentavos(m.valorParcelaCents)}</td>
                  <td style={{ ...celula("right"), color: V.muted }}>{m.baseCents !== undefined ? formatarCentavos(m.baseCents) : "—"}</td>
                  <td style={{ ...celula("right"), color: V.muted }}>{m.calculadoCents !== undefined ? formatarCentavos(m.calculadoCents) : "—"}</td>
                  <td style={{ ...celula("right"), fontWeight: 700 }}>{formatarCentavos(m.finalCents)}<MarcadorAjuste manual={ajustado} titulo="Auxílio ajustado manualmente (ver histórico)" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: V.muted, margin: "6px 0 0", lineHeight: 1.4 }}>
        {percentual !== undefined && tetoCents !== undefined ? `Percentual aplicado: ${Math.round(percentual * 100)}% · Teto considerado: ${formatarCentavos(tetoCents)} (base = valor da parcela limitado ao teto). ` : ""}
        {anterior ? "Meses sem cálculo registrado foram informados pelo analista (cadastro anterior). " : ""}
        {meses.some((m) => m.calculadoCents !== undefined) ? AVISO_PARAMETROS_AUXILIO : ""}
      </p>
    </div>
  );
}

/** B) Cálculo do ressarcimento da negociação: total elegível, quantidade, critério, valor por parcela, soma e diferença
 *  residual (exibida para conferência — o sistema nunca a distribui), mais a soma dos valores finais e os ajustes. */
export function MemoriaRessarcimentoView({
  totalCents,
  qtd,
  criterio,
  memoria,
  semCalculo,
  somaFinaisCents,
  ajustes = [],
}: {
  totalCents: number;
  qtd: number | null;
  criterio: CriterioParcelamento | "";
  memoria: MemoriaCalculo | null;
  semCalculo?: string;
  somaFinaisCents: number | null;
  ajustes?: { parcela: number; calculadoCents: number | null; valorInformadoCents: number }[];
}) {
  const linha = (r: string, v: ReactNode, destaque?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "4px 0", borderTop: `1px solid ${V.border}` }}>
      <span style={{ color: V.muted }}>{r}</span>
      <span style={{ fontWeight: destaque ? 700 : 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {linha("Total elegível", formatarCentavos(totalCents))}
      {linha("Quantidade de parcelas", qtd ?? "—")}
      {linha("Tipo de parcelamento", criterio === "uniforme" ? "Parcelas de mesmo valor" : criterio === "diferenciado" ? "Entrada diferenciada ou parcelas distintas (identificado pelos valores finais)" : "—")}
      {linha("Critério de cálculo", memoria ? "Truncamento (corte em duas casas)" : "Preenchimento manual")}
      {memoria ? (
        <>
          {linha("Valor calculado por parcela", formatarCentavos(memoria.valorPorParcelaCents), true)}
          {linha("Soma calculada", formatarCentavos(memoria.somaCalculadaCents))}
          {linha("Diferença residual", <span style={{ color: memoria.residualCents ? V.amber : V.green }}>{formatarCentavos(memoria.residualCents)}</span>)}
        </>
      ) : (
        semCalculo && <div style={{ fontSize: 12, color: V.amber, padding: "6px 0", borderTop: `1px solid ${V.border}` }}>{semCalculo}</div>
      )}
      {somaFinaisCents !== null && linha("Soma dos valores do ressarcimento", formatarCentavos(somaFinaisCents))}
      {somaFinaisCents !== null && linha("Diferença em relação ao total elegível", formatarCentavos(totalCents - somaFinaisCents))}
      {ajustes.length > 0 && linha("Ajustes manuais", ajustes.map((a) => `Parcela ${a.parcela}: ${a.calculadoCents !== null ? `${formatarCentavos(a.calculadoCents)} → ` : ""}${formatarCentavos(a.valorInformadoCents)}`).join(" · "))}
      <p style={{ fontSize: 11, color: V.muted, margin: "6px 0 0", lineHeight: 1.4 }}>
        {memoria ? `Corte seco em duas casas, sem arredondamento. A diferença residual não é distribuída nem somada a nenhuma parcela. ${AVISO_CRITERIO_TRUNCAMENTO}` : "A diferença entre a soma dos valores e o total elegível é apenas exibida para conferência."}{criterio === "diferenciado" ? " Valores finais distintos: o sistema não distribui automaticamente a entrada diferenciada (regra ainda não validada pela GERDAB); vale o que o analista ajustou." : ""}
      </p>
    </div>
  );
}

export const TEXTO_FORMATOS_ARQUIVO = "Formatos comuns de documento (PDF, imagens, planilhas, textos). O tamanho aceito depende do espaço disponível no navegador.";

/** Seletor de arquivo padronizado: usa o <input type="file"> nativo (acessível, com teclado e leitor de tela), mas
 *  sem exibir o texto padrão do navegador. Antes de selecionar mostra "Selecionar documento"; depois, "Substituir
 *  arquivo". O rótulo e o botão têm a mesma altura dos demais campos do formulário; o texto de apoio e o nome do
 *  arquivo ficam em `AjudaArquivo`, fora da linha de campos, para nunca deslocá-los. */
export function SeletorArquivo({ id, arquivo, onChange, rotulo = "Arquivo", obrigatorio = true }: { id: string; arquivo: File | null; onChange: (f: File | null) => void; rotulo?: string; obrigatorio?: boolean }) {
  const botao: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 40, boxSizing: "border-box", padding: "0 14px", border: `1px solid ${V.border}`, borderRadius: 8, background: V.card, color: V.text, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", maxWidth: "100%" };
  return (
    <div className="neg-file" style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: V.muted }}>{rotulo}{obrigatorio && <> <span aria-hidden style={{ color: V.red }}>*</span></>}</span>
      <input id={id} type="file" className="sr-only" onChange={(e) => { onChange(e.target.files?.[0] ?? null); e.target.value = ""; }} aria-describedby={`${id}-info`} />
      <div>
        <label htmlFor={id} className="neg-file-botao" style={botao}>
          <Paperclip size={15} aria-hidden /> {arquivo ? "Substituir arquivo" : "Selecionar documento"}
        </label>
      </div>
    </div>
  );
}

/** Texto de apoio do seletor (formatos, ou nome do arquivo escolhido) — fica abaixo da linha de campos. */
export function AjudaArquivo({ id, arquivo }: { id: string; arquivo: File | null }) {
  return (
    <p id={`${id}-info`} style={{ fontSize: 12, color: V.muted, margin: 0, lineHeight: 1.4, overflowWrap: "anywhere" }}>
      {arquivo ? (
        <>Arquivo selecionado: <strong style={{ color: V.text }}>{arquivo.name}</strong>. Revise antes de anexar; você pode substituí-lo.</>
      ) : (
        TEXTO_FORMATOS_ARQUIVO
      )}
    </p>
  );
}

/** Navegação do módulo: Negociações × Relatórios recebidos das associações (padrão de abas dos módulos de Relatórios). */
export function NegociacoesNav({ ativa, aguardando = 0 }: { ativa: "negociacoes" | "recebidos" | "ressarcimento"; aguardando?: number }) {
  const itens = [
    { chave: "negociacoes", to: "/admin/negociacoes", rotulo: "Negociações" },
    { chave: "recebidos", to: "/admin/negociacoes/recebidos", rotulo: "Relatórios das associações" },
    { chave: "ressarcimento", to: "/admin/negociacoes/ressarcimento", rotulo: "Relatório de ressarcimento" },
  ] as const;
  return (
    <nav aria-label="Seções de Negociações" style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: `1px solid ${V.border}` }}>
      {itens.map((i) => (
        <Link key={i.chave} to={i.to} aria-current={ativa === i.chave ? "page" : undefined} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, marginBottom: -1, borderBottom: `2px solid ${ativa === i.chave ? V.primary : "transparent"}`, color: ativa === i.chave ? V.primary : V.muted, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {i.rotulo}
          {i.chave === "recebidos" && aguardando > 0 && <span title="Aguardando conferência da GERDAB" style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px", color: V.amber, background: V.amberSoft }}>{aguardando}</span>}
        </Link>
      ))}
    </nav>
  );
}

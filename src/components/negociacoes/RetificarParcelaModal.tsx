import { useState } from "react";
import { X } from "lucide-react";
import { V, cardBase } from "@/components/dashboard-gerdab/gd-ui";
import { Campo, botaoPrimario, botaoSecundario, formatarData, inputEstilo } from "@/components/negociacoes/ui";
import { centavosParaTexto, desfazerConfirmacao, excluirParcela, formatarCentavos, parseMoedaCentavos, relatoriosDaParcela, retificarConfirmacao, retificarParcela, type Negociacao, type ParcelaNegociada } from "@/lib/negociacoes";

export type ModoAlteracaoParcela = "parcela" | "confirmacao" | "desfazer" | "excluir";

const TITULO: Record<ModoAlteracaoParcela, string> = {
  parcela: "Retificar parcela",
  confirmacao: "Retificar confirmação de pagamento",
  desfazer: "Desfazer confirmação de pagamento",
  excluir: "Excluir parcela",
};

/** Retificação, desfazimento e exclusão de parcela (Q12, Q16, PV-03, PV-04). Toda ação fica registrada no histórico da negociação. */
export function RetificarParcelaModal({ negociacao, parcela, modo, responsavel, onFechar, onConcluido }: {
  negociacao: Negociacao;
  parcela: ParcelaNegociada;
  modo: ModoAlteracaoParcela;
  responsavel: string;
  onFechar: () => void;
  onConcluido: (nova: Negociacao, aviso: string) => void;
}) {
  const [valor, setValor] = useState(centavosParaTexto(parcela.ressarcimento.finalCents));
  const [vencimento, setVencimento] = useState(parcela.vencimento);
  const [data, setData] = useState(parcela.quitacao?.data ?? "");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const relatorios = relatoriosDaParcela(negociacao.id, parcela.numero);
  const rotulo = `parcela ${parcela.numero}/${negociacao.qtdParcelas}`;

  function concluir() {
    setErro("");
    try {
      if (modo === "parcela") {
        const v = parseMoedaCentavos(valor);
        if ("erro" in v) return setErro(v.erro);
        onConcluido(retificarParcela(negociacao.id, parcela.numero, { valorCents: v.centavos, vencimento }, texto, responsavel), `Retificação da ${rotulo} registrada no histórico.`);
      } else if (modo === "confirmacao") {
        onConcluido(retificarConfirmacao(negociacao.id, parcela.numero, data, texto, responsavel), `Confirmação da ${rotulo} retificada e registrada no histórico.`);
      } else if (modo === "desfazer") {
        onConcluido(desfazerConfirmacao(negociacao.id, parcela.numero, texto, responsavel), `Confirmação da ${rotulo} desfeita e registrada no histórico.`);
      } else {
        onConcluido(excluirParcela(negociacao.id, parcela.numero, texto, responsavel), `Exclusão da ${rotulo} registrada no histórico.`);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar a alteração.");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,22,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="ret-titulo" style={{ ...cardBase, width: "min(520px, 100%)", maxHeight: "100%", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="ret-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{TITULO[modo]} — {rotulo}</h2>
            <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>{negociacao.nomeServidor} · vencimento {formatarData(parcela.vencimento)} · ressarcimento {formatarCentavos(parcela.ressarcimento.finalCents)}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" style={{ background: "none", border: "none", color: V.muted, cursor: "pointer", height: 32, width: 32 }}><X size={18} /></button>
        </div>
        {relatorios.length > 0 && <p role="status" style={{ fontSize: 12, color: V.amber, margin: 0 }}>Esta parcela consta do relatório nº {relatorios.join(", ")}, que é preservado.{modo === "excluir" ? "" : " Alterações de valor ou de confirmação permitem incluí-la atualizada em nova emissão."}</p>}
        {modo === "parcela" && (
          <>
            <Campo rotulo="Valor do ressarcimento" obrigatorio><input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" style={inputEstilo} /></Campo>
            <Campo rotulo="Vencimento" obrigatorio><input type="date" min="2000-01-01" value={vencimento} onChange={(e) => setVencimento(e.target.value)} style={inputEstilo} /></Campo>
          </>
        )}
        {modo === "confirmacao" && <Campo rotulo="Data da quitação" obrigatorio><input type="date" min="2000-01-01" value={data} onChange={(e) => setData(e.target.value)} style={inputEstilo} /></Campo>}
        {modo === "excluir" && <p style={{ fontSize: 13, margin: 0 }}>A parcela sai das filas e dos cálculos e permanece registrada no histórico, com servidor e data. As demais parcelas e o total elegível não são recalculados.</p>}
        <Campo rotulo={modo === "excluir" ? "Observação (opcional)" : "Justificativa"} obrigatorio={modo !== "excluir"}>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} style={{ ...inputEstilo, height: "auto", padding: "8px 10px", resize: "vertical" }} />
        </Campo>
        {erro && <p role="alert" style={{ color: V.red, fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={onFechar} style={botaoSecundario}>Cancelar</button>
          <button type="button" onClick={concluir} style={botaoPrimario}>{modo === "excluir" ? "Excluir parcela" : modo === "desfazer" ? "Desfazer confirmação" : "Registrar retificação"}</button>
        </div>
      </div>
    </div>
  );
}

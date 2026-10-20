import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { V, cardBase } from "@/components/dashboard-gerdab/gd-ui";
import { AjudaArquivo, Campo, SeletorArquivo, botaoPrimario, botaoSecundario, formatarData, inputEstilo, rotuloDocumento } from "@/components/negociacoes/ui";
import { getDataReferencia } from "@/lib/dias-uteis";
import { listarEnvios, rotuloEnvio } from "@/lib/negociacoes-envios";
import { confirmarQuitacao, formatarCentavos, responsavelAtual, type Negociacao, type ParcelaNegociada } from "@/lib/negociacoes";

const hojeISO = () => {
  const d = getDataReferencia();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Confirmação MANUAL de quitação de uma parcela (Fase 2). Nada é inferido de vencimento ou de anexos: o analista informa a
 *  data, declara a conferência e, opcionalmente, vincula um documento ou anexa o comprovante. Pode ser feita fora de ordem. */
export function ConfirmarQuitacaoModal({ negociacao, parcela, onFechar, onConfirmada }: { negociacao: Negociacao; parcela: ParcelaNegociada; onFechar: () => void; onConfirmada: (n: Negociacao) => void }) {
  const [data, setData] = useState(hojeISO());
  const [conferi, setConferi] = useState(false);
  const [documentoId, setDocumentoId] = useState("");
  const [envioId, setEnvioId] = useState("");
  // Relatórios que a própria associação da negociação enviou (referência; a vinculação é manual).
  const enviosAssociacao = listarEnvios(negociacao.associacao !== "—" ? negociacao.associacao : "__nenhuma__");
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const primeiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primeiro.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !salvando && onFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onFechar, salvando]);

  const pendentesAnteriores = negociacao.parcelas.filter((p) => p.numero < parcela.numero && !p.quitacao).length;
  const antesDaFormalizacao = !!data && data < negociacao.dataFormalizacao;

  async function confirmar() {
    setErro("");
    if (!data) return setErro("Informe a data da quitação.");
    if (!conferi) return setErro("Confirme que a documentação e as informações recebidas foram conferidas.");
    setSalvando(true);
    try {
      const nova = await confirmarQuitacao(negociacao.id, { numeroParcela: parcela.numero, data, responsavel: responsavelAtual(getAdminRole()), documentoId: comprovante ? undefined : documentoId || undefined, envioId: envioId || undefined, comprovante: comprovante ?? undefined, observacao });
      onConfirmada(nova);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar a quitação.");
      setSalvando(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,22,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }} onMouseDown={(e) => e.target === e.currentTarget && !salvando && onFechar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="quit-titulo" style={{ ...cardBase, width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="quit-titulo" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Confirmar quitação — parcela {parcela.numero}/{negociacao.parcelas.length}</h2>
            <p style={{ fontSize: 13, color: V.muted, margin: "4px 0 0" }}>{negociacao.nomeServidor} · vencimento {formatarData(parcela.vencimento)} · ressarcimento {formatarCentavos(parcela.ressarcimento.finalCents)}</p>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} aria-label="Fechar" style={{ background: "none", border: "none", color: V.muted, cursor: "pointer", height: 32, width: 32 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: V.muted, margin: 0 }}>A quitação é sempre confirmada manualmente pela GERDAB, a partir dos documentos e informações recebidos, e pode ser registrada fora da ordem das parcelas. Vencimento passado ou documento anexado não quitam a parcela por si só.</p>
        <Campo rotulo="Data da quitação" obrigatorio>
          <input ref={primeiro} type="date" min="2000-01-01" value={data} onChange={(e) => setData(e.target.value)} style={inputEstilo} />
        </Campo>
        {antesDaFormalizacao && <p role="status" style={{ fontSize: 12, color: V.amber, margin: 0 }}>A data é anterior à data de formalização da negociação ({formatarData(negociacao.dataFormalizacao)}). Confira.</p>}
        {pendentesAnteriores > 0 && <p role="status" style={{ fontSize: 12, color: V.muted, margin: 0 }}>Há {pendentesAnteriores} parcela(s) anterior(es) ainda pendente(s). Não é exigida ordem sequencial.</p>}
        {enviosAssociacao.length > 0 && (
          <Campo rotulo="Relatório recebido da associação (opcional)" ajuda="Apenas referência para a conferência: o arquivo não confirma a quitação — ela continua sendo manual.">
            <select value={envioId} onChange={(e) => setEnvioId(e.target.value)} style={inputEstilo}>
              <option value="">Não vincular a um relatório</option>
              {enviosAssociacao.map((e) => <option key={e.id} value={e.id}>{rotuloEnvio(e)} — {e.nomeArquivo}</option>)}
            </select>
          </Campo>
        )}
        <Campo rotulo="Origem da informação (opcional)" ajuda="Documento já anexado à negociação que fundamenta a quitação.">
          <select value={documentoId} onChange={(e) => setDocumentoId(e.target.value)} disabled={!!comprovante} style={{ ...inputEstilo, opacity: comprovante ? 0.6 : 1 }}>
            <option value="">Não vincular a um documento</option>
            {negociacao.documentos.map((d) => <option key={d.id} value={d.id}>{d.nome} — {rotuloDocumento(d)}</option>)}
          </select>
        </Campo>
        <div>
          <SeletorArquivo id="neg-quitacao-comprovante" rotulo="Anexar comprovante (opcional)" obrigatorio={false} arquivo={comprovante} onChange={setComprovante} />
          <div style={{ marginTop: 6 }}><AjudaArquivo id="neg-quitacao-comprovante" arquivo={comprovante} /></div>
        </div>
        <Campo rotulo="Observação (opcional)"><input value={observacao} onChange={(e) => setObservacao(e.target.value)} style={inputEstilo} /></Campo>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={conferi} onChange={(e) => setConferi(e.target.checked)} style={{ marginTop: 4 }} />
          <span>Conferi a documentação e as informações recebidas e confirmo a quitação desta parcela.</span>
        </label>
        {erro && <p role="alert" style={{ color: V.red, fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={confirmar} disabled={salvando} style={{ ...botaoPrimario, opacity: salvando ? 0.7 : 1 }}>{salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {salvando ? "Confirmando…" : "Confirmar quitação"}</button>
          <button type="button" onClick={onFechar} disabled={salvando} style={botaoSecundario}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

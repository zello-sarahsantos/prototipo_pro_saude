import { createFileRoute } from "@tanstack/react-router";
import { PendencyBanner } from "@/components/PendencyBanner";
import { History, ShieldAlert, X } from "lucide-react";
import { getAdminRole } from "@/components/AdminLayout";
import { useState } from "react";

export const Route = createFileRoute("/admin/parametros")({
  component: Parametros,
});

type Param = {
  id: string;
  nome: string;
  valor: string;
  definido: boolean;
  descricao: string;
};

const initialParams: Param[] = [
  { id: "teto", nome: "Teto máximo de reembolso por família", valor: "R$ 4.000,00", definido: true, descricao: "Valor máximo considerado como base de cálculo antes de aplicar o percentual." },
  { id: "perc", nome: "Percentual de reembolso", valor: "90%", definido: true, descricao: "Percentual aplicado sobre a base (min(plano, teto))." },
  { id: "idadeFilho", nome: "Limite de idade — filhos", valor: "21 / 24 anos", definido: true, descricao: "Idade máxima para filho(a) permanecer como dependente (24 anos se cursando graduação)." },
  { id: "idadeEnteado", nome: "Limite de idade — enteados", valor: "21 / 24 anos", definido: true, descricao: "Idade máxima para enteado(a) permanecer como dependente (24 anos se cursando graduação; exige IRPF)." },
];

const initialHistorico = [
  { quem: "Erandir L.", quando: "15/03/2026 14:22", o: "Teto familiar", de: "R$ 3.500,00", para: "R$ 4.000,00", justificativa: "Reajuste aprovado em reunião de 14/03/2026." },
  { quem: "Rebeca M.", quando: "02/01/2026 09:10", o: "Percentual", de: "85%", para: "90%", justificativa: "Adequação ao normativo interno DG-002/2026." },
];

function Parametros() {
  const isGerencia = getAdminRole() === "gerencia";
  const [params, setParams] = useState(initialParams);
  const [historico, setHistorico] = useState(initialHistorico);
  const [editando, setEditando] = useState<Param | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");

  if (!isGerencia) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
          <h1 className="text-xl font-bold">Acesso restrito à Gerência GERDAB</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Parâmetros como teto máximo, percentual de reembolso e regras de inativação podem afetar toda a base de beneficiários.
          </p>
        </div>
      </div>
    );
  }

  function abrirEdicao(p: Param) {
    setEditando(p);
    setNovoValor(p.definido ? p.valor : "");
    setJustificativa("");
    setErro("");
  }

  function confirmarEdicao() {
    if (!novoValor.trim()) { setErro("Informe o novo valor."); return; }
    if (!justificativa.trim()) { setErro("Justificativa é obrigatória."); return; }

    const agora = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).replace(",", "");

    setHistorico([
      { quem: "Erandir L.", quando: agora, o: editando!.nome, de: editando!.valor, para: novoValor, justificativa },
      ...historico,
    ]);
    setParams(params.map((p) =>
      p.id === editando!.id ? { ...p, valor: novoValor, definido: true } : p
    ));
    setEditando(null);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Parâmetros do Sistema</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais — visíveis apenas para a Gerência GERDAB.</p>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Parâmetro</th>
              <th className="text-left px-5 py-3">Valor atual</th>
              <th className="text-right px-5 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {params.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4">
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.descricao}</p>
                </td>
                <td className={`px-5 py-4 font-mono ${p.definido ? "" : "text-warning italic"}`}>{p.valor}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => abrirEdicao(p)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-card rounded-xl border border-border shadow-card">
        <header className="px-5 py-4 border-b border-border flex items-center gap-2">
          <History className="h-4 w-4" />
          <h2 className="font-semibold text-sm">Histórico de alterações</h2>
        </header>
        <ul className="divide-y divide-border text-sm">
          {historico.map((h, i) => (
            <li key={i} className="px-5 py-3">
              <p>
                <strong>{h.quem}</strong> alterou <strong>{h.o}</strong>:{" "}
                <span className="text-muted-foreground line-through">{h.de}</span>{" "}
                → <span className="text-success font-medium">{h.para}</span>
              </p>
              {h.justificativa && (
                <p className="text-xs text-muted-foreground italic mt-0.5">"{h.justificativa}"</p>
              )}
              <p className="text-xs text-muted-foreground">{h.quando}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Fix #8 — Modal de edição com novo valor + justificativa obrigatória */}
      {editando && (
        <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl shadow-elevated max-w-sm w-full">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="font-semibold">Editar parâmetro</h2>
                <p className="text-xs text-muted-foreground">{editando.nome}</p>
              </div>
              <button onClick={() => setEditando(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-6 space-y-4 text-sm">
              <div className="bg-muted/50 rounded-lg px-4 py-2 flex justify-between text-xs">
                <span className="text-muted-foreground">Valor atual</span>
                <span className="font-mono font-medium">{editando.valor}</span>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Novo valor *</label>
                <input
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  placeholder={editando.id === "perc" ? "Ex: 92%" : "Ex: R$ 4.500,00"}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Justificativa *</label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Ex: Reajuste aprovado em reunião do dia..."
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {erro && <p className="text-xs text-destructive">{erro}</p>}
            </div>
            <footer className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditando(null)} className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={confirmarEdicao}
                className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2"
              >
                Confirmar alteração
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

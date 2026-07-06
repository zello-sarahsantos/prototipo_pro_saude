import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requerimentos } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, X, Eye, ZoomIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requerimentos")({
  component: Fila,
});

type ModalMode = "visualizar" | "aprovar" | "rejeitar" | "solicitar_doc" | null;

/** Simula um preview de PDF inline */
function DocPreview({ filename }: { filename: string }) {
  const isPdf = filename.endsWith(".pdf");
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border">
        <FileText className="h-3.5 w-3.5" />
        <span className="truncate font-medium">{filename}</span>
        <span className="ml-auto opacity-60">{isPdf ? "PDF" : "IMG"}</span>
      </div>
      {/* Viewer mockado — representa o PDF renderizado na tela (RF07) */}
      <div className="bg-white h-48 flex flex-col items-center justify-center gap-2 relative">
        <div className="w-16 h-20 border-2 border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center gap-1">
          <FileText className="h-6 w-6 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40 font-mono">PDF</span>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center px-4">
          {filename}
        </p>
        <button className="absolute bottom-2 right-2 text-[10px] text-primary flex items-center gap-1 hover:underline">
          <ZoomIn className="h-3 w-3" /> Ampliar
        </button>
      </div>
    </div>
  );
}

function Fila() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModalMode>(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const cur = requerimentos.find((r) => r.id === openId);

  const filtrados = requerimentos.filter((r) => {
    const matchTipo = !filtroTipo || r.tipo === filtroTipo;
    const matchStatus = !filtroStatus || r.status === filtroStatus;
    return matchTipo && matchStatus;
  });

  const pendentes = requerimentos.filter(
    (r) => r.status === "pendente" || r.status === "analise"
  ).length;

  function openModal(id: string, m: ModalMode) {
    setOpenId(id);
    setMode(m);
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Fila de Aprovação</h1>
        <p className="text-sm text-muted-foreground">
          {pendentes} aguardando análise • aprovação efetiva alterações somente após validação da GERDAB
        </p>
      </header>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-col sm:flex-row gap-3">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todos os tipos</option>
          <option value="Ativação de Acesso">Ativação de Acesso (Importados)</option>
          <option value="Inclusão no Plano">Inclusão Inicial</option>
          <option value="Inclusão de Dependente">Inclusão de Dependente</option>
          <option value="Exclusão">Exclusão</option>
          <option value="Mudança de Plano">Mudança de Plano</option>
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="analise">Em análise</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtrados.map((r) => (
          <article key={r.id} className="bg-card rounded-xl border border-border shadow-card p-5">
            <header className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">
                  <span className="font-mono">{r.numero}</span>
                  <span className="text-muted-foreground font-normal"> • {r.tipo}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Servidor: {r.servidor} (mat. {r.matricula})
                </p>
                <p className="text-sm">{r.detalhe}</p>
                <p className="text-xs text-muted-foreground mt-1">Aberto em {r.abertoEm}</p>
              </div>
              <StatusBadge status={r.status} />
            </header>

            {(r.status === "pendente" || r.status === "analise") && (
              <div className="flex gap-2 pt-3 border-t border-border">
                {/* Fix #4: Visualizar é somente leitura; Aprovar abre checklist */}
                <button
                  onClick={() => openModal(r.id, "visualizar")}
                  className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Visualizar Documentos
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => openModal(r.id, "solicitar_doc")}
                  className="text-sm border border-border text-foreground rounded-md px-4 py-2 hover:bg-muted"
                >
                  Solicitar Documento
                </button>
                <button
                  onClick={() => openModal(r.id, "rejeitar")}
                  className="text-sm border border-destructive/30 text-destructive rounded-md px-4 py-2 hover:bg-destructive/5"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => openModal(r.id, "aprovar")}
                  className="text-sm bg-success text-success-foreground rounded-md px-4 py-2 hover:opacity-90"
                >
                  Aprovar
                </button>
              </div>
            )}
          </article>
        ))}
        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum requerimento encontrado com os filtros aplicados.
          </p>
        )}
      </div>

      {/* Modal */}
      {cur && mode && (
        <div className="fixed inset-0 bg-foreground/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-elevated max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
              <div>
                <h2 className="font-semibold">
                  {mode === "visualizar" && "Documentos anexados"}
                  {mode === "aprovar" && "Aprovar requerimento"}
                  {mode === "rejeitar" && "Rejeitar requerimento"}
                  {mode === "solicitar_doc" && "Solicitar Documento Comprobatório"}
                </h2>
                <p className="text-xs text-muted-foreground">{cur.numero} • {cur.servidor}</p>
              </div>
              <button onClick={() => { setOpenId(null); setMode(null); }} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-6 space-y-4">

              {/* MODO: Visualizar (somente leitura + preview inline — Fix #3) */}
              {mode === "visualizar" && (
                <>
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    <p><strong>Tipo:</strong> {cur.tipo}</p>
                    <p><strong>Detalhe:</strong> {cur.detalhe}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Documentos ({cur.documentos.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cur.documentos.map((d) => (
                        <DocPreview key={d} filename={d} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Esta é uma visualização somente leitura. Para aprovar ou rejeitar, feche e use os botões correspondentes.
                  </div>
                </>
              )}

              {/* MODO: Aprovar */}
              {mode === "aprovar" && (
                <>
                  <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                    <p><strong>Beneficiário:</strong> {cur.servidor}</p>
                    <p><strong>Tipo:</strong> {cur.tipo}</p>
                    <p><strong>Detalhe:</strong> {cur.detalhe}</p>
                    <p><strong>Regra:</strong> Requerimentos de cadastro ficam pendentes até aprovação GERDAB.</p>
                  </div>

                  {cur.tipo.includes("Inclusão") && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                      <strong>Atenção (Pensionistas):</strong> Se esta for a solicitação inicial de um Pensionista, um <strong>Processo SEI individual</strong> será criado e vinculado a ele automaticamente após esta aprovação, onde ocorrerão suas futuras movimentações.
                    </div>
                  )}

                  {/* Prévia dos documentos no modal de aprovação */}
                  <details className="group">
                    <summary className="text-sm font-medium cursor-pointer list-none flex items-center gap-2 py-1">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      Ver documentos ({cur.documentos.length})
                      <span className="text-xs text-muted-foreground ml-auto group-open:hidden">▼ expandir</span>
                      <span className="text-xs text-muted-foreground ml-auto hidden group-open:block">▲ recolher</span>
                    </summary>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cur.documentos.map((d) => (
                        <DocPreview key={d} filename={d} />
                      ))}
                    </div>
                  </details>

                  <div>
                    <p className="text-sm font-medium mb-2">Checklist de verificação</p>
                    <div className="space-y-2 text-sm">
                      {cur.checklist.map((c) => (
                        <label key={c} className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Observação interna</label>
                    <textarea rows={3} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" />
                  </div>
                </>
              )}

              {/* MODO: Rejeitar */}
              {mode === "rejeitar" && (
                <>
                  <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                    <p><strong>Servidor:</strong> {cur.servidor}</p>
                    <p><strong>Tipo:</strong> {cur.tipo}</p>
                    <p><strong>Detalhe:</strong> {cur.detalhe}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Motivo da rejeição *</label>
                    <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mb-2">
                      <option>Documento ilegível</option>
                      <option>Documento incompleto</option>
                      <option>Dados inconsistentes</option>
                      <option>Outro</option>
                    </select>
                    <textarea
                      rows={3}
                      placeholder="Detalhe o motivo (será notificado ao servidor)"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    />
                  </div>
                </>
              )}

              {/* MODO: Solicitar Documento */}
              {mode === "solicitar_doc" && (
                <>
                  <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                    <p><strong>Servidor:</strong> {cur.servidor}</p>
                    <p><strong>Tipo:</strong> {cur.tipo}</p>
                    <p><strong>Detalhe:</strong> {cur.detalhe}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Qual documento está faltando?</label>
                    <textarea
                      rows={3}
                      placeholder="Descreva o documento comprobatório necessário (ex: Certidão de óbito, Divórcio, etc.)"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div className="rounded-lg bg-orange-500/10 text-orange-600 p-3 text-xs mt-4">
                    Ao confirmar, o status será alterado para <strong>"Pendente de complementação"</strong> e o servidor receberá uma notificação.
                  </div>
                </>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <button
                onClick={() => { setOpenId(null); setMode(null); }}
                className="text-sm border border-border rounded-md px-4 py-2 hover:bg-muted"
              >
                {mode === "visualizar" ? "Fechar" : "Cancelar"}
              </button>
              {mode !== "visualizar" && (
                <button
                  onClick={() => { 
                    if (mode === "solicitar_doc") toast.success("Notificação enviada ao beneficiário.");
                    else if (mode === "aprovar") {
                      toast.success("Requerimento aprovado com sucesso.");
                      if (cur.tipo.includes("Inclusão")) {
                        toast.info("Processo SEI individual gerado (se pensionista).");
                      }
                    }
                    else if (mode === "rejeitar") toast.success("Requerimento rejeitado com sucesso.");
                    setOpenId(null); 
                    setMode(null); 
                  }}
                  className={`text-sm rounded-md px-4 py-2 text-primary-foreground ${
                    mode === "rejeitar" ? "bg-destructive" : mode === "solicitar_doc" ? "bg-primary" : "bg-success"
                  }`}
                >
                  {mode === "rejeitar" ? "Confirmar Rejeição" : mode === "solicitar_doc" ? "Enviar Solicitação" : "Confirmar Aprovação"}
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

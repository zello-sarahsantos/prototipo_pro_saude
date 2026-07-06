import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PendencyBanner } from "@/components/PendencyBanner";
import { Upload, CheckCircle2, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/admin/carga-inicial")({
  component: Carga,
});

const cols = [
  "Processo SEI",
  "Matrícula",
  "Nome",
  "Data de nascimento",
  "Tipo de plano",
  "Valor do plano",
  "Valor do auxílio",
  "Valor de pagamento",
];

function Carga() {
  const [stage, setStage] = useState<"upload" | "map" | "preview" | "done">("upload");

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Carga Inicial de Dados</h1>
        <p className="text-sm text-muted-foreground">
          Importação em lote a partir de planilha Excel.
        </p>
      </header>

      <div className="flex items-center gap-2 text-sm">
        {(["upload", "map", "preview", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                stage === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={stage === s ? "font-medium" : "text-muted-foreground"}>
              {["Upload", "Mapeamento", "Preview", "Concluído"][i]}
            </span>
            {i < 3 && <span className="text-muted-foreground mx-2">→</span>}
          </div>
        ))}
      </div>

      {stage === "upload" && (
        <div className="bg-card rounded-xl border border-border shadow-card p-8">
          <button
            onClick={() => setStage("map")}
            className="w-full border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-muted/30 transition"
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-medium">Selecionar planilha</p>
            <p className="text-sm text-muted-foreground">Arquivos .xlsx até 20 MB</p>
          </button>
        </div>
      )}

      {stage === "map" && (
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-5 w-5 text-success" />
            <span className="font-medium">servidores_2026.xlsx</span>
            <span className="text-muted-foreground">• 847 linhas</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Mapeamento de colunas</p>
            {cols.map((c) => (
              <div key={c} className="grid grid-cols-2 gap-3 items-center">
                <select className="border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option>{c.toLowerCase().replace(/ /g, "_")}</option>
                  <option>—</option>
                </select>
                <span className="text-sm text-muted-foreground">→ {c}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setStage("upload")} className="text-sm border border-border rounded-md px-4 py-2">
              Voltar
            </button>
            <button onClick={() => setStage("preview")} className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2">
              Pré-visualizar
            </button>
          </div>
        </div>
      )}

      {stage === "preview" && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-medium text-sm">Primeiros 5 registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase">
                <tr>{cols.map(c => <th key={c} className="text-left px-3 py-2 whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono">00050.00{1234 + i}/2024-10</td>
                    <td className="px-3 py-2">{12345 + i}</td>
                    <td className="px-3 py-2">Servidor {i + 1}</td>
                    <td className="px-3 py-2">10/06/198{i}</td>
                    <td className="px-3 py-2">Bradesco</td>
                    <td className="px-3 py-2">R$ 1.200,00</td>
                    <td className="px-3 py-2">R$ 1.080,00</td>
                    <td className="px-3 py-2">R$ 1.080,00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
            <button onClick={() => setStage("map")} className="text-sm border border-border rounded-md px-4 py-2">
              Voltar
            </button>
            <button onClick={() => setStage("done")} className="text-sm bg-primary text-primary-foreground rounded-md px-4 py-2">
              Importar 847 registros
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Importação concluída</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>843</strong> inseridos • <strong>4</strong> atualizados • <strong>0</strong> com erro
          </p>
          <button onClick={() => setStage("upload")} className="mt-5 text-sm bg-primary text-primary-foreground rounded-md px-4 py-2">
            Nova importação
          </button>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { solicitarExtracao } from "@/lib/ia-cliente";
import type { TipoDocumentoArquivo } from "@/lib/mock-data";
import { camposPermitidos } from "@/lib/ia-pagamento";

export const Route = createFileRoute("/admin/ia-teste")({ component: TesteIA });

function TesteIA() {
  const [files, setFiles] = useState<File[]>([]);
  const [tipo, setTipo] = useState<TipoDocumentoArquivo>("boleto");
  const [resultado, setResultado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function testar() {
    if (files.length === 0) return;
    setCarregando(true);
    setErro("");
    setResultado("");
    try {
      const resultados = [];
      for (const arquivo of files) {
        const bruto = await solicitarExtracao(arquivo, tipo);
        const permitidos = new Set(camposPermitidos[tipo]);
        const campos = Object.fromEntries(Object.entries(bruto.campos ?? {}).filter(([chave]) => permitidos.has(chave)));
        resultados.push({ arquivo: arquivo.name, documento: {
          tipo: bruto.tipoIdentificado,
          campos,
          beneficiarios: Array.isArray(bruto.beneficiarios) ? bruto.beneficiarios : [],
          itensFinanceiros: Array.isArray(bruto.itensFinanceiros) ? bruto.itensFinanceiros : [],
          metadados: { valorNominal: bruto.valorNominal, favorecidoPagamento: bruto.favorecidoPagamento, cnpjFavorecido: bruto.cnpjFavorecido },
          avisos: bruto.avisos ?? [],
          requerRevisao: bruto.requerRevisao !== false,
        }});
      }
      setResultado(JSON.stringify(resultados, null, 2));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao chamar a IA.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div><h1 className="text-2xl font-bold">Teste de IA para comprovantes</h1><p className="text-sm text-muted-foreground">Teste os mesmos retornos usados no fluxo de pagamento.</p></div>
        <section className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">Tipo documental<select className="mt-1 w-full rounded border p-2" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumentoArquivo)}><option value="comprovante_pagamento">Comprovante de Pagamento</option><option value="boleto">Boleto</option><option value="recibo">Recibo</option><option value="demonstrativo">Demonstrativo</option><option value="fatura_tecnica">Fatura Técnica</option></select></label>
          </div>
          <input type="file" multiple accept="image/png,image/jpeg,image/jpg,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} arquivo(s) selecionado(s): {files.map((arquivo) => arquivo.name).join(", ")}</p>}
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={files.length === 0 || carregando} onClick={testar}>{carregando ? "Processando..." : "Enviar para a IA"}</button>
          {erro && <p className="rounded bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
        </section>
        {resultado && <section className="rounded-lg border bg-card p-6"><h2 className="mb-3 font-semibold">Retorno da IA</h2><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded bg-muted p-4 text-xs">{resultado}</pre></section>}
      </div>
    </main>
  );
}

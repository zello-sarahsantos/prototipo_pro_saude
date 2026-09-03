import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileWarning, Clock } from "lucide-react";
import { servidorAtual } from "@/lib/mock-data";
import {
  garantirSolicitacoesAutomaticas,
  garantirExemploDocumentoEmAnalise,
  getStatusDocumentosDoServidor,
  getPendenciasDocumentaisDoServidor,
  estaVencida,
  type StatusDocumentoPendente,
} from "@/lib/pendencias-documentais";

export const Route = createFileRoute("/admin/relatorios/documentacao")({
  component: DocumentacaoEPendencias,
});

const statusLabel: Record<StatusDocumentoPendente, string> = {
  aguardando_envio: "Aguardando envio",
  aguardando_analise: "Aguardando análise",
  aprovado: "Aprovado",
};

const statusTone: Record<StatusDocumentoPendente, string> = {
  aguardando_envio: "bg-status-pendente-bg text-status-pendente-fg",
  aguardando_analise: "bg-status-analise-bg text-status-analise-fg",
  aprovado: "bg-status-aprovado-bg text-status-aprovado-fg",
};

type FiltroStatus = "todos" | StatusDocumentoPendente;

/**
 * Consolida IRPF, escolaridade, laudo de invalidez, limite de idade e demais documentações
 * periódicas dos beneficiários/dependentes numa única visão — absorve o que o SISPRO chamava de
 * "Relatório IRPF" (ver matriz de tratamento, docs/MODULO_RELATORIOS.md §2/§5: consolidação
 * ainda é interpretação atual, não substituição definitivamente validada). **Nunca** a mesma
 * tela do Comprovante de Rendimentos (valores pagos), que é um domínio de dados completamente
 * diferente (docs/MODULO_RELATORIOS.md §2, item 9 do plano).
 *
 * Reaproveita `pendencias-documentais.ts` quase integralmente — nenhum modelo de dados novo.
 * Mesma limitação de cenário isolado já registrada no Fechamento de Pagamento e no Extrato do
 * Servidor: este protótipo mantém um único servidor de referência (`servidorAtual`), então a
 * tela mostra as pendências desse cenário, não uma folha completa da GERDAB.
 */
function DocumentacaoEPendencias() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");

  useEffect(() => {
    garantirSolicitacoesAutomaticas(servidorAtual.matricula);
    garantirExemploDocumentoEmAnalise(servidorAtual.matricula);
    setRefreshKey((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const destinoPadrao = servidorAtual.associacao !== "—" ? "associacao" : "servidor";

  const pendenciasAbertas = useMemo(
    () => getPendenciasDocumentaisDoServidor(servidorAtual.matricula, destinoPadrao),
    [refreshKey, destinoPadrao],
  );

  const documentos = useMemo(
    () => getStatusDocumentosDoServidor(servidorAtual.matricula),
    [refreshKey],
  );

  const linhas = useMemo(
    () =>
      documentos.map((doc) => {
        const pendenciaAberta = pendenciasAbertas.find(
          (p) => p.dependenteId === doc.beneficiarioId && p.documento === doc.documento,
        );
        return {
          ...doc,
          prazo: pendenciaAberta?.prazo ?? null,
          vencida: pendenciaAberta ? estaVencida(pendenciaAberta) : false,
          origem: doc.ultimaSolicitacao.cargo === "Automático" ? "Sistema" : "Analista/GERDAB",
        };
      }),
    [documentos, pendenciasAbertas],
  );

  const filtradas = filtro === "todos" ? linhas : linhas.filter((l) => l.status === filtro);

  const totais = {
    todos: linhas.length,
    aguardando_envio: linhas.filter((l) => l.status === "aguardando_envio").length,
    aguardando_analise: linhas.filter((l) => l.status === "aguardando_analise").length,
    aprovado: linhas.filter((l) => l.status === "aprovado").length,
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Documentação e Pendências</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da documentação obrigatória dos beneficiários/dependentes — IRPF, IR
          de enteado, comprovante de matrícula/escolaridade, laudo de invalidez e limite de
          idade. Distinta do Comprovante de Rendimentos (valores pagos), ver
          docs/MODULO_RELATORIOS.md.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            ["todos", "Todos"],
            ["aguardando_envio", statusLabel.aguardando_envio],
            ["aguardando_analise", statusLabel.aguardando_analise],
            ["aprovado", statusLabel.aprovado],
          ] as [FiltroStatus, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              filtro === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {label} ({totais[key === "todos" ? "todos" : key]})
          </button>
        ))}
      </div>

      <section className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Beneficiário/Dependente</th>
              <th className="text-left px-4 py-2">Documento</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Prazo/Vencimento</th>
              <th className="text-left px-4 py-2">Origem</th>
              <th className="text-left px-4 py-2">Última solicitação</th>
              <th className="text-left px-4 py-2">Solicitado por</th>
              <th className="text-center px-4 py-2">Qtd. solicitações</th>
              <th className="px-4 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="px-4 py-2 font-medium">{l.beneficiarioNome}</td>
                <td className="px-4 py-2">{l.documento}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[l.status]}`}>
                    {statusLabel[l.status]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {l.prazo ? (
                    <span className={`inline-flex items-center gap-1 ${l.vencida ? "text-status-rejeitado-fg font-medium" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" /> {l.prazo.texto}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{l.origem}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(l.ultimaSolicitacao.criadoEm).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{l.ultimaSolicitacao.autor}</td>
                <td className="px-4 py-2 text-center">{l.totalSolicitacoes}</td>
                <td className="px-4 py-2">
                  <Link
                    to="/admin/servidores/$id"
                    params={{ id: servidorAtual.matricula }}
                    className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                  >
                    Ver na ficha <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FileWarning className="h-4 w-4" /> Nenhum registro para este filtro.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

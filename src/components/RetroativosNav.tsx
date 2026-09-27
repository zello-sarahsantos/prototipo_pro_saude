import { Link } from "@tanstack/react-router";
import { restaurarMassaDemonstracaoRetroativos } from "@/lib/massa-demonstracao";

/** Navegação da área de Ressarcimento Retroativo da GERDAB:
 *  Fila de análise → (detalhe da solicitação → detalhe da competência) → Consolidação → Histórico.
 *  Análise operacional e consolidação financeira são telas/conceitos separados. */
export function RetroativosNav({ ativa }: { ativa: "fila" | "consolidacao" | "historico" }) {
  const itens = [
    { chave: "fila", to: "/admin/retroativos", rotulo: "Fila de análise" },
    { chave: "consolidacao", to: "/admin/relatorios/retroativos", rotulo: "Consolidação" },
    { chave: "historico", to: "/admin/relatorios/consolidacoes", rotulo: "Histórico" },
  ] as const;
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border" aria-label="Ressarcimento retroativo">
      {itens.map((i) => (
        <Link
          key={i.chave}
          to={i.to}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            ativa === i.chave ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {i.rotulo}
        </Link>
      ))}
      {/* RECURSO EXCLUSIVO DO PROTÓTIPO: NÃO é requisito funcional de produção (nenhuma carga/restauração de dados de
          demonstração existe no produto real). Serve só para repetir a demonstração. */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Restaurar os dados de demonstração do Ressarcimento Retroativo? (recurso só do protótipo; apaga o que foi gerado nesta área)")) {
            restaurarMassaDemonstracaoRetroativos();
            window.location.reload();
          }
        }}
        className="ml-auto mb-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md px-2.5 py-1"
        title="Recurso exclusivo do protótipo — não é requisito funcional de produção"
      >
        Restaurar dados de demonstração
      </button>
    </nav>
  );
}

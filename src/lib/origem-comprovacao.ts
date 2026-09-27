/**
 * Elegibilidade de acesso aos fluxos de comprovação (regra de origem, decisão fechada):
 * - titular **vinculado a uma Associação responsável pelo envio** → origem exclusivamente
 *   **Associação** (planilhas ordinária e retroativa); o Portal do Servidor NÃO oferece o envio
 *   individual de comprovante nem o ressarcimento retroativo individual;
 * - titular **sem** Associação responsável → origem **individual** pelo Portal do Servidor.
 *
 * A proteção ocorre aqui, na elegibilidade de acesso ao fluxo — não existe "Portal + Associação
 * para o mesmo Titular + Competência" como cenário de negócio a ser conciliado na GERDAB. Dados
 * históricos já existentes não são alterados; só novos envios pela origem incorreta são impedidos.
 *
 * Portal do Servidor: mesma regra já usada em `servidor.requerimento.novo.tsx` e
 * `servidor.pagamentos.index.tsx` (`servidorAtual.associacao`; `"—"` = sem associação).
 */
import { servidorAtual } from "./mock-data";

export interface OrigemComprovacaoServidor {
  origem: "individual" | "associacao";
  /** Presente quando `origem === "associacao"`. */
  associacao?: string;
}

export function getOrigemComprovacaoServidorLogado(): OrigemComprovacaoServidor {
  return servidorAtual.associacao !== "—" ? { origem: "associacao", associacao: servidorAtual.associacao } : { origem: "individual" };
}

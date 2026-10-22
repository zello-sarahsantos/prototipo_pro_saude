import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { buscarServidoresCadastrais, ROTULO_FONTE_CADASTRAL, type ServidorCadastral } from "@/lib/cadastro-servidores-busca";

/** Campo de pesquisa com sugestões (nome ou matrícula) sobre o cadastro existente. Somente leitura: não cria nem altera cadastro. */
export function SeletorServidorCadastral({ onSelecionar, demonstracao, rotulo = "Pesquisar servidor (nome ou matrícula)", autoFocus }: { onSelecionar: (s: ServidorCadastral) => void; demonstracao?: boolean; rotulo?: string; autoFocus?: boolean }) {
  const id = useId();
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [aberto, setAberto] = useState(false);
  const { itens, total } = useMemo(() => buscarServidoresCadastrais(termo, { demonstracao, limite: 8 }), [termo, demonstracao]);
  const mostrar = aberto && termo.trim().length > 0;

  function escolher(s: ServidorCadastral) {
    setTermo("");
    setAberto(false);
    onSelecionar(s);
  }

  return (
    <div className="relative text-sm">
      <label htmlFor={`${id}-in`} className="font-semibold">
        {rotulo}
      </label>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" aria-hidden />
        <input
          id={`${id}-in`}
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={mostrar && itens[ativo] ? `${id}-o${ativo}` : undefined}
          autoFocus={autoFocus}
          autoComplete="off"
          value={termo}
          placeholder="Digite parte do nome ou a matrícula"
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onBlur={() => setTimeout(() => setAberto(false), 120)}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAtivo((a) => Math.min(a + 1, itens.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && mostrar && itens[ativo]) {
              e.preventDefault();
              escolher(itens[ativo]);
            } else if (e.key === "Escape") setAberto(false);
          }}
          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {mostrar && (
        <ul id={`${id}-lista`} role="listbox" aria-label="Servidores encontrados" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {itens.length === 0 ? (
            <li role="option" aria-selected={false} className="px-3 py-2 text-foreground/75">
              Nenhum servidor encontrado no cadastro.
            </li>
          ) : (
            itens.map((s, i) => (
              <li
                key={s.matricula}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(s);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`cursor-pointer px-3 py-2 ${i === ativo ? "bg-primary/10" : ""}`}
              >
                <span className="font-semibold">{s.nome}</span> <span className="text-foreground/75">· matrícula {s.matricula}</span>
                <span className="block text-xs text-foreground/70">
                  {ROTULO_FONTE_CADASTRAL[s.fonte]}
                  {s.vinculo ? ` · ${s.vinculo === "ativo" ? "Ativo" : "Inativo"}` : ""}
                </span>
              </li>
            ))
          )}
          {total > itens.length && <li className="border-t border-border px-3 py-1.5 text-xs text-foreground/70">Mostrando {itens.length} de {total}: refine a pesquisa.</li>}
        </ul>
      )}
    </div>
  );
}

import { Moon, Sun } from "lucide-react";
import { useTema } from "@/lib/tema";

/** Botão de alternância claro/escuro — mesmo componente em todos os ambientes (Admin, Servidor, Associação). */
export function AlternarTema({ className = "" }: { className?: string }) {
  const { tema, alternar } = useTema();
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md opacity-90 hover:opacity-100 hover:bg-white/10 ${className}`}
    >
      {escuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

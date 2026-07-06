import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5 mb-4">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${done || active ? "bg-primary" : "bg-muted"}`}
            />
            <p
              className={`mt-1.5 text-[10px] uppercase tracking-wide ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {done && <Check className="inline h-3 w-3 mr-0.5" />}
              {i + 1}. {s}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function StepNav({
  onPrev,
  onNext,
  nextLabel = "Próximo",
  isLast = false,
  disabled = false,
}: {
  onPrev?: () => void;
  onNext: () => void;
  nextLabel?: string;
  isLast?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-4">
      {onPrev ? (
        <button
          onClick={onPrev}
          className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted"
        >
          Voltar
        </button>
      ) : (
        <Link
          to="/servidor/requerimento/novo"
          className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted text-center"
        >
          Cancelar
        </Link>
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className={`flex-1 rounded-md py-2.5 text-sm font-medium text-primary-foreground transition ${
          disabled 
            ? "bg-gray-400 cursor-not-allowed" 
            : isLast 
              ? "bg-success hover:bg-success/90" 
              : "bg-primary hover:bg-primary-light"
        }`}
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg" role="alert">
      {message}
    </div>
  );
}

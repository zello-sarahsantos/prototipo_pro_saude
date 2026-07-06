import { AlertTriangle } from "lucide-react";

export function PendencyBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="pendency-banner">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <strong className="font-semibold">PENDÊNCIA: </strong>
        {children}
      </div>
    </div>
  );
}

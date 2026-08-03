import type { StatusComprovante } from "@/lib/mock-data";
import { statusComprovanteCore, statusComprovanteLabels } from "@/lib/mock-data";

export function ComprovanteStatusBadge({ status, label }: { status: StatusComprovante; label?: string }) {
  const { bg, fg } = statusComprovanteCore[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {label ?? statusComprovanteLabels[status]}
    </span>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FilePlus, UserPlus, UserMinus, ShieldAlert } from "lucide-react";
import { servidorAtual } from "@/lib/mock-data";

export const Route = createFileRoute("/servidor/requerimento/novo")({
  component: NovoReq,
});

const opts = [
  {
    to: "/servidor/requerimento/novo-plano",
    icon: FilePlus,
    title: "Requerimento de Mudança de Plano",
    desc: "Solicitar mudança de plano de saúde, com informação do plano anterior, novo plano, tratamento de dependentes e documentação.",
  },
  {
    to: "/servidor/requerimento/incluir-dependente",
    icon: UserPlus,
    title: "Inclusão de Dependente",
    desc: "Adicionar cônjuge, companheiro(a), filho(a), enteado(a) ou menor sob guarda.",
  },
  {
    to: "/servidor/requerimento/exclusao",
    icon: UserMinus,
    title: "Exclusão de Dependente / Plano",
    desc: "Encerrar dependente ativo ou sair do benefício.",
  },
] as const;

// Fix #9 — detecta vínculo com associação para bloquear comprovação individual
const associacao = servidorAtual.associacao !== "—" ? servidorAtual.associacao : null;

function NovoReq() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Novo Requerimento</h2>
      <p className="text-sm text-muted-foreground">
        Selecione o tipo de solicitação. Alterações de valor com comprovante/reajuste entram na Fase 2,
        mas a intenção já fica mapeada no fluxo de mudança de plano.
      </p>

      {/* Fix #9 — banner de bloqueio de comprovação para servidores de associação */}
      {associacao && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Você está vinculado à {associacao}</p>
            <p className="text-muted-foreground mt-1">
              A comprovação mensal do auxílio-saúde é enviada coletivamente pela {associacao} — você
              não precisa enviar boleto individual. Requerimentos de cadastro (inclusão/exclusão de
              dependentes, mudança de plano) continuam disponíveis abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {opts.map((o) => {
          const Icon = o.icon;
          return (
            <Link
              key={o.to}
              to={o.to}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card hover:border-primary/40 transition"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{o.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

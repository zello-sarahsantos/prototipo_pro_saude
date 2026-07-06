import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, UserPlus, ArrowLeft } from "lucide-react";
import { Field, inputCls } from "@/components/Stepper";
import { formatCurrency } from "@/lib/mock-data";
import { maskCPF, maskCurrency, maskMatricula } from "@/lib/utils";
import { OPERADORAS } from "@/lib/form-options";
import { UploadBox } from "./servidor.requerimento.novo-plano";

export const Route = createFileRoute("/associacao/nova-inclusao")({
  component: NovaInclusaoAssetran,
});

function NovaInclusaoAssetran() {
  const [done, setDone] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [operadora, setOperadora] = useState("");
  const [outraOperadora, setOutraOperadora] = useState("");
  const [administradora, setAdministradora] = useState("");
  const [valor, setValor] = useState("");

  if (done) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto mt-10">
        <div className="bg-card rounded-2xl p-8 shadow-elevated text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            O requerimento de inclusão para <strong>{nome}</strong> foi encaminhado à GERDAB com a documentação anexada.
          </p>
          <div className="bg-muted rounded-lg py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Associação Responsável</p>
            <p className="text-lg font-bold text-primary">ASSETRAN</p>
          </div>
          <Link
            to="/associacao/gerenciamento"
            className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2"
          >
            Voltar ao Gerenciamento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/associacao/gerenciamento" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Nova Inclusão de Beneficiário
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados reais do plano contratado e anexe a documentação.
          </p>
        </div>
      </header>

      <div className="bg-card rounded-2xl shadow-elevated p-6 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2">1. Dados Cadastrais do Servidor/Titular</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome Completo" required>
              <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} />
            </Field>
            <Field label="CPF" required>
              <input className={inputCls} value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} />
            </Field>
            <Field label="Matrícula" required>
              <input className={inputCls} value={matricula} onChange={e => setMatricula(maskMatricula(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2">2. Dados do Plano Contratado</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Operadora Real" required>
              <select className={inputCls} value={operadora} onChange={e => setOperadora(e.target.value)}>
                <option value="">Selecione a operadora</option>
                {OPERADORAS.filter(op => op !== "ASSEFAZ / OUTRO CONVÊNIO").map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
                <option value="Outra">Outra</option>
              </select>
            </Field>
            {operadora === "Outra" && (
              <Field label="Digite o nome da operadora" required>
                <input className={inputCls} value={outraOperadora} onChange={e => setOutraOperadora(e.target.value)} />
              </Field>
            )}
            <Field label="Administradora" required>
              <input className={inputCls} value={administradora} onChange={e => setAdministradora(e.target.value)} />
            </Field>
            <Field label="Valor Mensal do Titular" required>
              <input className={inputCls} value={valor} onChange={e => setValor(maskCurrency(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase border-b border-border pb-2">3. Anexos</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
            <strong>Atenção:</strong> Como a solicitação está sendo feita pela ASSETRAN, inclua todos os documentos necessários, inclusive o requerimento devidamente assinado.
          </div>
          <div className="space-y-3">
            <Field label="Requerimento de Inclusão Assinado (Titular)" required><UploadBox /></Field>
            <Field label="Documentos do Titular (RG, CPF, Contracheque, etc.)" required><UploadBox /></Field>
            <Field label="Documentos dos Dependentes (se houver)"><UploadBox /></Field>
          </div>
        </section>

        <div className="pt-4 border-t border-border flex justify-end">
          <button 
            onClick={() => setDone(true)}
            disabled={!nome || !cpf || !matricula || !operadora || !administradora || !valor}
            className="bg-primary text-primary-foreground rounded-md px-6 py-2.5 text-sm font-medium hover:bg-primary-light disabled:opacity-50"
          >
            Enviar Solicitação à GERDAB
          </button>
        </div>
      </div>
    </div>
  );
}

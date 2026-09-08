import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { Stepper, StepNav, Field, inputCls } from "@/components/Stepper";
import { Switch } from "@/components/ui/switch";
import { Upload, CheckCircle2, User, Info, FileText, UserPlus, X } from "lucide-react";
import { OPERADORAS } from "@/lib/form-options";
import {
  servidorAtual,
  dependentes,
  formatCurrency,
  calcularReembolso,
  statusLabels,
  type Dependente,
} from "@/lib/mock-data";
import { DOCUMENTOS_POR_TIPO_DEPENDENTE } from "@/lib/form-options";
import { IncluirDependenteForm, type IncluirDependenteValue } from "@/components/IncluirDependenteForm";
import { saveRequerimentoMudancaPlano } from "@/lib/prosaude-storage";

export const Route = createFileRoute("/servidor/requerimento/novo-plano")({
  component: NovoPlano,
});

const steps = ["Dados do Beneficiário", "Plano Anterior", "Novo Plano", "Dependentes", "Documentos", "Revisão"];

/**
 * Desacopla os Steps do singleton `servidorAtual`/`dependentes` sem precisar prop-drilling em
 * cada um deles — `NovoPlano` é quem resolve `servidor`/`dependentesAtivos` (props recebidas ??
 * dados do Portal do Servidor) uma única vez e disponibiliza aqui; nenhum Step lê o singleton
 * diretamente a partir de agora. Mesmo componente funcional para os dois contextos — só a fonte
 * do dado muda.
 */
const RequerimentoBeneficiarioContext = createContext<{
  servidor: typeof servidorAtual;
  dependentesAtivos: Dependente[];
} | null>(null);

function useRequerimentoBeneficiario() {
  const ctx = useContext(RequerimentoBeneficiarioContext);
  if (!ctx) throw new Error("useRequerimentoBeneficiario precisa estar dentro de <NovoPlano />.");
  return ctx;
}

type DependentAction = "manter" | "migrar_titular" | "migrar_outro" | "remover";

interface DependentData {
  action: DependentAction;
  valorIndividual?: string;
  operadora?: string;
  outraOperadora?: string;
  /** Modalidade do plano do dependente quando migra para um plano diferente do titular
   *  ("migrar_outro") — nunca herdada do titular, já que os dois podem ter operadoras,
   *  modalidades e vínculos de associação diferentes. Campo aberto para texto, mesmo padrão do
   *  Titular no Primeiro Acesso (ver `primeiro-acesso.tsx`). */
  modalidade?: string;
  /** Alerta o Servidor de que o plano do dependente é empresarial — mesmo padrão do Titular no
   *  Primeiro Acesso: exibe aviso sobre a exigência de fatura técnica no envio de comprovantes. */
  empresarial?: boolean;
  administradora?: string;
  vigencia?: string;
  motivoRemocao?: string;
  dataRemocao?: string;
}

type NewDependentBlock = {
  id: string;
  saved: boolean;
  value?: IncluirDependenteValue;
};

export type MudancaPlanoSubmitPayload = {
  newPlanData: Record<string, unknown>;
  dependentsData: Record<string, DependentData>;
  novosDependentes: IncluirDependenteValue[];
  updatedAt: string;
};

export function NovoPlano({
  servidor: servidorProp,
  dependentesIniciais,
  onSubmit,
  voltarTo = "/servidor/inicio",
  voltarLabel = "Voltar ao início",
  statusLabel = "Em Análise",
  cancelTo = "/servidor/requerimento/novo",
}: {
  /** Beneficiário atendido — quando ausente, usa `servidorAtual` (Portal do Servidor, dado do
   *  usuário logado), exatamente como antes desta refatoração. */
  servidor?: typeof servidorAtual;
  dependentesIniciais?: Dependente[];
  /** Callback de conclusão do contexto Associação — quando fornecido, substitui a persistência
   *  padrão (`saveRequerimentoMudancaPlano`, um rascunho único do Portal do Servidor) para que o
   *  chamador persista na engine de requerimentos da Associação. Nenhuma regra do formulário
   *  muda; só o destino do dado enviado. */
  onSubmit?: (payload: MudancaPlanoSubmitPayload) => void;
  voltarTo?: string;
  voltarLabel?: string;
  /** Rótulo do status mostrado na tela de sucesso — "Em Análise" é o vocabulário do rascunho do
   *  Portal do Servidor; a Associação passa "Pendente de Validação" (vocabulário da engine de
   *  requerimentos). Cosmético — não altera nenhuma regra. */
  statusLabel?: string;
  /** Destino do botão "Cancelar" na primeira etapa (`StepNav`) — "/servidor/requerimento/novo"
   *  é o comportamento original do Portal do Servidor; a Associação passa a mesma ficha do
   *  beneficiário (`voltarTo`), para nunca deixar o atendente cair no Portal do Servidor. */
  cancelTo?: string;
} = {}) {
  const servidor = servidorProp ?? servidorAtual;
  const dependentesAtivos = (dependentesIniciais ?? dependentes).filter((d) => d.status === "ativo");

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [declarationsChecked, setDeclarationsChecked] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });

  // Novo plano data
  const [newPlanData, setNewPlanData] = useState({
    operadora: "",
    outraOperadora: "",
    administradora: "",
    modalidade: "",
    valorIndividual: "",
    vigencia: "",
    numeroProposta: "",
    observacoes: "",
    empresarial: false,
  });

  // Dependentes data
  const [dependentsData, setDependentsData] = useState<Record<string, DependentData>>(
    Object.fromEntries(
      dependentesAtivos.map(d => [
        d.id,
        { action: "manter" as DependentAction }
      ])
    )
  );

  const [newDependentBlocks, setNewDependentBlocks] = useState<NewDependentBlock[]>([]);

  const isPensionista = servidor.cargo.startsWith("Pensionista");

  const handleDeclarationChange = (index: number, checked: boolean) => {
    setDeclarationsChecked(prev => ({ ...prev, [index]: checked }));
  };

  const allDeclarationsChecked = Object.values(declarationsChecked).every(Boolean);
  const hasPendingNewDependents = newDependentBlocks.some((b) => !b.saved);

  const handleSubmit = () => {
    const payload: MudancaPlanoSubmitPayload = {
      newPlanData,
      dependentsData,
      novosDependentes: newDependentBlocks.filter((b) => b.saved && b.value).map((b) => b.value!),
      updatedAt: new Date().toISOString(),
    };
    if (onSubmit) {
      onSubmit(payload);
    } else {
      saveRequerimentoMudancaPlano(payload);
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
        <div className="bg-muted rounded-lg py-3 px-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
          <p className="text-lg font-bold text-status-analise-fg">{statusLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground italic px-2">
          A GERDAB realizará a conferência das informações e documentos enviados.
        </p>
        <Link
          to={voltarTo}
          className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2"
        >
          {voltarLabel}
        </Link>
      </div>
    );
  }

  return (
    <RequerimentoBeneficiarioContext.Provider value={{ servidor, dependentesAtivos }}>
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-1">Requerimento de Mudança de Plano</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Etapa {step + 1} de {steps.length}
        </p>
        <Stepper steps={steps} current={step} />

        {step === 0 && <StepDadosBeneficiario />}
        {step === 1 && <StepPlanoAnterior />}
        {step === 2 && <StepNovoPlano data={newPlanData} setData={setNewPlanData} />}
        {step === 3 && !isPensionista && <StepDependentes
          dependentsData={dependentsData}
          setDependentsData={setDependentsData}
          newDependentBlocks={newDependentBlocks}
          setNewDependentBlocks={setNewDependentBlocks}
        />}
        {step === 3 && isPensionista && <StepPensionistaDependentes />}
        {step === 4 && <StepDocs dependentsData={dependentsData} />}
        {step === 5 && <StepRevisao
          dependentsData={dependentsData}
          newPlanData={newPlanData}
          newDependentBlocks={newDependentBlocks}
          declarationsChecked={declarationsChecked}
          onDeclarationChange={handleDeclarationChange}
          allDeclarationsChecked={allDeclarationsChecked}
        />}

        <StepNav
          onPrev={step > 0 ? () => setStep(step - 1) : undefined}
          onNext={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else handleSubmit();
          }}
          nextLabel={step === steps.length - 1 ? "Enviar para análise da GERDAB" : "Próximo"}
          isLast={step === steps.length - 1}
          disabled={step === steps.length - 1 && (!allDeclarationsChecked || hasPendingNewDependents)}
          cancelTo={cancelTo}
        />
      </div>
    </RequerimentoBeneficiarioContext.Provider>
  );
}

function StepDadosBeneficiario() {
  const { servidor } = useRequerimentoBeneficiario();
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Dados do titular pré-preenchidos. Confira as informações.
        </p>
      </div>
      <Field label="Nome completo">
        <input className={`${inputCls} bg-muted`} value={servidor.nome} disabled />
      </Field>
      <Field label="CPF">
        <input className={`${inputCls} bg-muted`} value={servidor.cpf} disabled />
      </Field>
      <Field label="Matrícula">
        <input className={`${inputCls} bg-muted`} value={servidor.matricula} disabled />
      </Field>
      <Field label="Tipo de beneficiário">
        <input className={`${inputCls} bg-muted`} value={
          servidor.cargo === "Pensionista vitalício"
            ? "Pensionista vitalício"
            : servidor.cargo === "Pensionista temporário"
            ? "Pensionista temporário"
            : servidor.cargo === "Agente de Trânsito" || servidor.cargo === "Analista de Trânsito" || servidor.cargo === "Técnico de Trânsito"
            ? "Servidor ativo"
            : "Servidor ativo"
        } disabled />
      </Field>
      <Field label="Processo SEI vinculado">
        <input className={`${inputCls} bg-muted`} value={servidor.processoSEI} disabled />
      </Field>
      <Field label="Situação do benefício no Pró-Saúde">
        <input className={`${inputCls} bg-muted`} value={statusLabels[servidor.status]} disabled />
      </Field>
    </div>
  );
}

function StepPlanoAnterior() {
  const { servidor } = useRequerimentoBeneficiario();
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Dados do plano atual cadastrado no sistema.
        </p>
      </div>
      <Field label="Operadora atual">
        <input className={`${inputCls} bg-muted`} value={servidor.operadora} disabled />
      </Field>
      <Field label="Administradora atual">
        <input className={`${inputCls} bg-muted`} value={servidor.administradora} disabled />
      </Field>
      <Field label="Modalidade do plano atual">
        <input className={`${inputCls} bg-muted`} value={servidor.tipoPlano} disabled />
      </Field>
      <Field label="Valor individual atual do beneficiário">
        <input className={`${inputCls} bg-muted`} value={formatCurrency(servidor.valorPlano)} disabled />
      </Field>
      <Field label="Data de vigência do plano atual">
        <input className={`${inputCls} bg-muted`} value={servidor.inicioBeneficio} disabled />
      </Field>
    </div>
  );
}

function StepNovoPlano({ data, setData }: { 
  data: any; 
  setData: (data: any) => void; 
}) {
  return (
    <div className="space-y-3">
      <Field label="Nova operadora" required>
        <select 
          className={inputCls} 
          value={data.operadora} 
          onChange={(e) => setData({ ...data, operadora: e.target.value })}
        >
          <option value="">Selecione a operadora</option>
          {OPERADORAS.map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
          <option value="Outra">Outra</option>
        </select>
      </Field>
      {data.operadora === "Outra" && (
        <Field label="Digite o nome da operadora" required>
          <input 
            className={inputCls} 
            value={data.outraOperadora} 
            onChange={e => setData({ ...data, outraOperadora: e.target.value })} 
          />
        </Field>
      )}
      <Field label="Nova administradora (se aplicável)">
        <input 
          className={inputCls} 
          placeholder="Ex: Qualicorp"
          value={data.administradora}
          onChange={(e) => setData({ ...data, administradora: e.target.value })}
        />
      </Field>
      <Field label="Modalidade do novo plano" required>
        <input
          className={inputCls}
          placeholder="Ex: Coletivo Empresarial"
          value={data.modalidade}
          onChange={(e) => setData({ ...data, modalidade: e.target.value })}
        />
      </Field>
      <Field label="Empresarial">
        <div className={`${inputCls} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.empresarial}
              onCheckedChange={(checked) => setData({ ...data, empresarial: checked })}
            />
            <span className="text-sm">{data.empresarial ? "Sim" : "Não"}</span>
          </div>
          <span className="text-xs text-muted-foreground">O novo plano é empresarial?</span>
        </div>
      </Field>
      {data.empresarial && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            Planos empresariais exigem o envio da fatura técnica no momento do envio de comprovantes de pagamento, pois o boleto empresarial isolado não permite identificar os valores individuais dos beneficiários.
          </p>
        </div>
      )}
      <Field label="Valor individual do novo plano" required>
        <input 
          className={inputCls} 
          placeholder="R$ 0,00"
          value={data.valorIndividual}
          onChange={(e) => setData({ ...data, valorIndividual: e.target.value })}
        />
      </Field>
      <Field label="Data de vigência do novo plano" required>
        <input 
          type="date" 
          className={inputCls} 
          value={data.vigencia} 
          onChange={e => setData({ ...data, vigencia: e.target.value })} 
        />
      </Field>
      <Field label="Número da proposta/contrato (se aplicável)">
        <input 
          className={inputCls} 
          placeholder="Número da proposta ou contrato"
          value={data.numeroProposta}
          onChange={(e) => setData({ ...data, numeroProposta: e.target.value })}
        />
      </Field>
      <Field label="Observações adicionais">
        <textarea 
          rows={3} 
          className={inputCls} 
          placeholder="Observações adicionais"
          value={data.observacoes}
          onChange={(e) => setData({ ...data, observacoes: e.target.value })}
        />
      </Field>
    </div>
  );
}

function StepDependentes({
  dependentsData,
  setDependentsData,
  newDependentBlocks,
  setNewDependentBlocks,
}: {
  dependentsData: Record<string, DependentData>;
  setDependentsData: Dispatch<SetStateAction<Record<string, DependentData>>>;
  newDependentBlocks: NewDependentBlock[];
  setNewDependentBlocks: Dispatch<SetStateAction<NewDependentBlock[]>>;
}) {
  const { servidor, dependentesAtivos: ativos } = useRequerimentoBeneficiario();

  const updateDependent = (id: string, updates: Partial<DependentData>) => {
    setDependentsData(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Para cada dependente ativo, visualize a situação atual e selecione a ação a ser tomada.
        </p>
      </div>
      
      {ativos.map((dep) => {
        const isSamePlanAsTitular = dep.plano === servidor.plano;
        const currentData = dependentsData[dep.id] || { action: "manter" };
        
        return (
          <div key={dep.id} className="bg-card rounded-xl p-4 border border-border space-y-4">
            {/* Current plan situation */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Situação Atual</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{dep.nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{dep.parentesco}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Idade:</span>
                  <p className="font-medium">{dep.idade} anos</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Operadora:</span>
                  <p className="font-medium">{servidor.operadora}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidade:</span>
                  <p className="font-medium">{servidor.tipoPlano}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <p className="font-medium">{formatCurrency(dep.valor)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Vigência:</span>
                  <p className="font-medium">{servidor.inicioBeneficio}</p>
                </div>
              </div>
              <div className={`mt-2 text-xs font-medium ${isSamePlanAsTitular ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50'} p-2 rounded`}>
                {isSamePlanAsTitular 
                  ? "✓ Está atualmente no mesmo plano do titular" 
                  : "✓ Está atualmente em plano diferente do titular"}
              </div>
            </div>

            {/* Action selection */}
            <Field label="O que deseja fazer com este dependente nesta mudança de plano?" required>
              <div className="flex flex-col gap-2">
                {[
                  { v: "manter", l: "Manter no plano atual" },
                  { v: "migrar_titular", l: "Migrar para o novo plano do titular" },
                  { v: "migrar_outro", l: "Migrar para outro plano diferente do titular" },
                  { v: "remover", l: "Remover do benefício/plano" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className={`flex items-center gap-3 border rounded-md p-3 text-sm cursor-pointer ${currentData.action === o.v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`}
                  >
                    <input 
                      type="radio" 
                      name={`dep-${dep.id}`}
                      checked={currentData.action === o.v} 
                      onChange={() => updateDependent(dep.id, { action: o.v as DependentAction })} 
                    />
                    {o.l}
                  </label>
                ))}
              </div>
            </Field>

            {/* Migrar para novo plano do titular */}
            {currentData.action === "migrar_titular" && (
              <Field label={`Valor individual do plano do dependente *`} required>
                <input 
                  className={inputCls} 
                  placeholder="R$ 0,00"
                  value={currentData.valorIndividual || ""}
                  onChange={(e) => updateDependent(dep.id, { valorIndividual: e.target.value })}
                />
              </Field>
            )}

            {/* Migrar para outro plano diferente */}
            {currentData.action === "migrar_outro" && (
              <div className="space-y-3 border-t border-border pt-3">
                <Field label={`Operadora do plano do dependente *`} required>
                  <select 
                    className={inputCls}
                    value={currentData.operadora || ""}
                    onChange={(e) => updateDependent(dep.id, { operadora: e.target.value })}
                  >
                    <option value="">Selecione a operadora</option>
                    {OPERADORAS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                    <option value="Outra">Outra</option>
                  </select>
                </Field>
                {currentData.operadora === "Outra" && (
                  <Field label={`Digite o nome da operadora *`} required>
                    <input 
                      className={inputCls}
                      value={currentData.outraOperadora || ""}
                      onChange={(e) => updateDependent(dep.id, { outraOperadora: e.target.value })}
                    />
                  </Field>
                )}
                <Field label={`Administradora do plano do dependente (se aplicável)`}>
                  <input 
                    className={inputCls} 
                    placeholder="Ex: Qualicorp"
                    value={currentData.administradora || ""}
                    onChange={(e) => updateDependent(dep.id, { administradora: e.target.value })}
                  />
                </Field>
                <Field label={`Modalidade do plano do dependente *`} required>
                  <input
                    className={inputCls}
                    placeholder="Ex: Coletivo Empresarial"
                    value={currentData.modalidade || ""}
                    onChange={(e) => updateDependent(dep.id, { modalidade: e.target.value })}
                  />
                </Field>
                <Field label="Empresarial">
                  <div className={`${inputCls} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!currentData.empresarial}
                        onCheckedChange={(checked) => updateDependent(dep.id, { empresarial: checked })}
                      />
                      <span className="text-sm">{currentData.empresarial ? "Sim" : "Não"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">O plano do dependente é empresarial?</span>
                  </div>
                </Field>
                {currentData.empresarial && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <p>
                      Planos empresariais exigem o envio da fatura técnica no momento do envio de comprovantes de pagamento, pois o boleto empresarial isolado não permite identificar os valores individuais dos beneficiários.
                    </p>
                  </div>
                )}
                <Field label={`Valor individual do plano do dependente *`} required>
                  <input 
                    className={inputCls} 
                    placeholder="R$ 0,00"
                    value={currentData.valorIndividual || ""}
                    onChange={(e) => updateDependent(dep.id, { valorIndividual: e.target.value })}
                  />
                </Field>
                <Field label={`Data da Vigência *`} required>
                  <input 
                    type="date" 
                    className={inputCls}
                    value={currentData.vigencia || ""}
                    onChange={(e) => updateDependent(dep.id, { vigencia: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {/* Remover */}
            {currentData.action === "remover" && (
              <div className="space-y-3 border-t border-border pt-3">
                <Field label={`Motivo da remoção *`} required>
                  <textarea 
                    rows={3} 
                    className={inputCls} 
                    placeholder="Descreva o motivo da remoção"
                    value={currentData.motivoRemocao || ""}
                    onChange={(e) => updateDependent(dep.id, { motivoRemocao: e.target.value })}
                  />
                </Field>
                <Field label={`Data da remoção *`} required>
                  <input 
                    type="date" 
                    className={inputCls}
                    value={currentData.dataRemocao || ""}
                    onChange={(e) => updateDependent(dep.id, { dataRemocao: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-border pt-4 space-y-3">
        <button
          type="button"
          onClick={() => {
            const id = `nd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            setNewDependentBlocks([...newDependentBlocks, { id, saved: false }]);
          }}
          className="w-full border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          + Incluir dependente
        </button>

        {newDependentBlocks.length > 0 && (
          <div className="space-y-3">
            {newDependentBlocks.map((b, idx) => (
              <div key={b.id} className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-primary">
                    Novo dependente {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewDependentBlocks(newDependentBlocks.filter((x) => x.id !== b.id))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remover dependente"
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {b.saved && b.value ? (
                  <div className="bg-card rounded-xl p-4 border border-border space-y-2 text-sm">
                    <Row k="Nome" v={b.value.nome || "—"} />
                    <Row k="Tipo" v={b.value.parentesco} />
                    <Row k="Plano" v={b.value.mesmoPlano === "sim" ? "Mesmo do titular" : "Plano diferente do titular"} />
                    <Row k="Documentos" v={`${DOCUMENTOS_POR_TIPO_DEPENDENTE[b.value.parentesco].length} anexos`} />
                  </div>
                ) : (
                  <IncluirDependenteForm
                    submitLabel="Adicionar dependente"
                    onSubmit={(value) =>
                      setNewDependentBlocks(
                        newDependentBlocks.map((x) => (x.id === b.id ? { ...x, saved: true, value } : x)),
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepPensionistaDependentes() {
  return (
    <div className="space-y-3">
      <div className="bg-muted/40 border border-border rounded-xl p-6 text-center">
        <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Dependentes</p>
        <p className="text-xs text-muted-foreground">
          Como pensionista, a gestão de grupo familiar não está disponível. A mudança de plano afetará apenas seu benefício individual.
        </p>
      </div>
    </div>
  );
}

function StepDocs({ dependentsData }: { dependentsData: Record<string, DependentData> }) {
  const { dependentesAtivos: ativos } = useRequerimentoBeneficiario();
  const dependentsWithDifferentPlan = ativos.filter(d => dependentsData[d.id]?.action === "migrar_outro");

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Anexe os documentos obrigatórios conforme as ações selecionadas.
        </p>
      </div>

      {/* Titular documents */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentos do Titular
        </h3>
        <Field label="Documento da entidade contratada / contrato do plano *" required>
          <UploadBox />
          <div className="mt-3 bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-xs text-foreground mb-1">O documento deve conter:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>Condição de beneficiário titular;</li>
              <li>Indicação dos dependentes;</li>
              <li>Tipos de cobertura;</li>
              <li>Prazo de validade/vigência;</li>
              <li>Valores mensais individualizados;</li>
              <li>Cópia do contrato ou declaração equivalente.</li>
            </ul>
          </div>
        </Field>
      </div>

      {/* Dependents with different plan documents */}
      {dependentsWithDifferentPlan.map((dep) => (
        <div key={dep.id} className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Documentos do Dependente: {dep.nome}
          </h3>
          <Field label="Documento da entidade contratada / contrato ou declaração de permanência do plano do dependente *" required>
            <UploadBox />
            <div className="mt-3 bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-xs text-foreground mb-1">O documento deve conter:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Condição de beneficiário/dependente no plano;</li>
                <li>Tipos de cobertura;</li>
                <li>Prazo de validade/vigência;</li>
                <li>Valor mensal individualizado;</li>
                <li>Cópia do contrato ou declaração equivalente.</li>
              </ul>
            </div>
          </Field>
        </div>
      ))}
    </div>
  );
}

function StepRevisao({ 
  dependentsData, 
  newPlanData,
  newDependentBlocks,
  declarationsChecked,
  onDeclarationChange,
  allDeclarationsChecked,
}: {
  dependentsData: Record<string, DependentData>;
  newPlanData: any;
  newDependentBlocks: NewDependentBlock[];
  declarationsChecked: Record<number, boolean>;
  onDeclarationChange: (index: number, checked: boolean) => void;
  allDeclarationsChecked: boolean;
}) {
  const { servidor, dependentesAtivos: ativos } = useRequerimentoBeneficiario();
  const TETO_VIGENTE = 4000;
  const PERCENTUAL = 0.9;
  const numValor = servidor.valorPlano;
  const baseCalculo = Math.min(numValor, TETO_VIGENTE);
  const reembolsoEstimado = baseCalculo * PERCENTUAL;
  const participacaoServidor = numValor - reembolsoEstimado;
  const isPensionista = servidor.cargo.startsWith("Pensionista");

  const getActionText = (action: DependentAction) => {
    switch (action) {
      case "manter": return "Manter no plano atual";
      case "migrar_titular": return "Migrar para o novo plano do titular";
      case "migrar_outro": return "Migrar para outro plano diferente do titular";
      case "remover": return "Remover do benefício/plano";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p>
          Revise as informações abaixo antes de enviar sua solicitação para análise da GERDAB.
        </p>
      </div>

      {/* Resumo do titular */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-semibold">Resumo do Titular</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Nome:</span>
            <p className="font-medium">{servidor.nome}</p>
          </div>
          <div>
            <span className="text-muted-foreground">CPF:</span>
            <p className="font-medium">{servidor.cpf}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tipo de beneficiário:</span>
            <p className="font-medium">
              {servidor.cargo === "Pensionista vitalício" 
                ? "Pensionista vitalício" 
                : servidor.cargo === "Pensionista temporário"
                ? "Pensionista temporário"
                : "Servidor ativo"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Plano anterior:</span>
            <p className="font-medium">{servidor.plano}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Nova operadora:</span>
            <p className="font-medium">{newPlanData.operadora === "Outra" ? newPlanData.outraOperadora : newPlanData.operadora || "Não informado"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Nova administradora:</span>
            <p className="font-medium">{newPlanData.administradora || "Não informado"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Modalidade:</span>
            <p className="font-medium">{newPlanData.modalidade || "Não informado"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Empresarial:</span>
            <p className="font-medium">{newPlanData.empresarial ? "Sim" : "Não"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Valor individual:</span>
            <p className="font-medium">{newPlanData.valorIndividual || "Não informado"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data de vigência:</span>
            <p className="font-medium">{newPlanData.vigencia || "Não informado"}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Documento anexado:</span>
            <p className="font-medium">1 arquivo</p>
          </div>
        </div>
      </div>

      {newDependentBlocks.filter((b) => b.saved && b.value).length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <h3 className="text-sm font-semibold">Novos Dependentes Incluídos</h3>
          <div className="space-y-2 text-xs">
            {newDependentBlocks.filter((b) => b.saved && b.value).map((b) => (
              <div key={b.id} className="bg-muted/50 rounded-lg p-3">
                <Row k="Nome" v={b.value!.nome} />
                <Row k="Tipo" v={b.value!.parentesco} />
                <Row k="Plano" v={b.value!.mesmoPlano === "sim" ? "Mesmo do titular" : "Plano diferente do titular"} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo dos dependentes */}
      {!isPensionista && ativos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Resumo dos Dependentes</h3>
          {ativos.map((dep) => {
            const data = dependentsData[dep.id] || { action: "manter" };
            const isSamePlanAsTitular = dep.plano === servidor.plano;
            
            return (
              <div key={dep.id} className="bg-card rounded-xl p-4 border border-border space-y-2">
                <h4 className="text-sm font-medium">{dep.nome}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{dep.parentesco}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Idade:</span>
                    <p className="font-medium">{dep.idade} anos</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Situação atual:</span>
                    <p className="font-medium">{isSamePlanAsTitular ? "Mesmo plano do titular" : "Plano diferente do titular"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ação selecionada:</span>
                    <p className="font-medium text-primary">{getActionText(data.action)}</p>
                  </div>
                  {(data.action === "migrar_titular" || data.action === "migrar_outro") && data.valorIndividual && (
                    <div>
                      <span className="text-muted-foreground">Valor individual:</span>
                      <p className="font-medium">{data.valorIndividual}</p>
                    </div>
                  )}
                  {data.action === "migrar_outro" && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Operadora:</span>
                        <p className="font-medium">{data.operadora === "Outra" ? data.outraOperadora : data.operadora}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Administradora:</span>
                        <p className="font-medium">{data.administradora || "Não informado"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modalidade:</span>
                        <p className="font-medium">{data.modalidade || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Empresarial:</span>
                        <p className="font-medium">{data.empresarial ? "Sim" : "Não"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vigência:</span>
                        <p className="font-medium">{data.vigencia}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Documentos:</span>
                        <p className="font-medium">1 arquivo</p>
                      </div>
                    </>
                  )}
                  {data.action === "migrar_titular" && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Documentos:</span>
                      <p className="font-medium">Incluso no documento do titular</p>
                    </div>
                  )}
                  {data.action === "manter" && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Documentos:</span>
                      <p className="font-medium">0 anexos específicos</p>
                    </div>
                  )}
                  {data.action === "remover" && (
                    <>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Motivo:</span>
                        <p className="font-medium">{data.motivoRemocao}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data de remoção:</span>
                        <p className="font-medium">{data.dataRemocao}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Declarações */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold">Declarações Obrigatórias</h3>
        
        <label className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border text-sm cursor-pointer hover:bg-muted/50">
          <input 
            type="checkbox" 
            className="mt-1"
            checked={declarationsChecked[1]}
            onChange={(e) => onDeclarationChange(1, e.target.checked)}
          />
          <span>Declaro que o(s) dependente(s) informado(s) não recebe(m) nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas.</span>
        </label>

        <label className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border text-sm cursor-pointer hover:bg-muted/50">
          <input 
            type="checkbox" 
            className="mt-1"
            checked={declarationsChecked[2]}
            onChange={(e) => onDeclarationChange(2, e.target.checked)}
          />
          <span>Declaro que sou responsável pelo pagamento das despesas do plano de saúde do(s) beneficiário(s) dependente(s), ainda que o dependente seja o titular do contrato no plano apresentado.</span>
        </label>

        <label className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border text-sm cursor-pointer hover:bg-muted/50">
          <input 
            type="checkbox" 
            className="mt-1"
            checked={declarationsChecked[3]}
            onChange={(e) => onDeclarationChange(3, e.target.checked)}
          />
          <span>Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras.</span>
        </label>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

export function UploadBox() {
  return (
    <button
      type="button"
      className="w-full border-2 border-dashed border-border rounded-lg p-5 text-center hover:bg-muted/50 transition"
    >
      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
      <p className="text-sm font-medium">Tocar para enviar</p>
      <p className="text-xs text-muted-foreground">PDF, JPG ou PNG (até 10 MB)</p>
    </button>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, Search, Info, AlertTriangle, UserPlus, FileText, Upload, Check, X, Pencil } from "lucide-react";
import { Field, inputCls } from "@/components/Stepper";
import { Switch } from "@/components/ui/switch";
import { baseImportadaGerdab, formatCurrency } from "@/lib/mock-data";
import { UploadBox } from "./servidor.requerimento.novo-plano";
import { maskCPF, maskCurrency, maskRG, maskMatricula } from "@/lib/utils";
import { saveTitularCadastro } from "@/lib/prosaude-storage";
import {
  parseCurrency,
  isCpfComplete,
  getCurrencyError,
  validationMessages,
} from "@/lib/validation";
import {
  OPERADORAS,
  CARGOS_SERVIDOR,
  SITUACOES_TITULAR,
  TIPOS_DEPENDENTE,
  type TipoDependente,
  calcularIdade,
  mostrarAlertaEscolaridadeDependente,
  mostrarBloqueioIdade24Dependente,
} from "@/lib/form-options";
import {
  DocumentosDependenteLista,
  DocumentosDependenteUploads,
} from "@/components/DocumentosDependente";

export const Route = createFileRoute("/primeiro-acesso")({
  component: PrimeiroAcesso,
});

type Dependente = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  parentesco: TipoDependente;
  valor: string;
  mesmoPlano?: "Sim" | "Não";
  operadora?: string;
  outraOperadora?: string;
  modalidade?: string;
  vigencia?: string;
  tipoLaudo?: string;
};

type FlowType = "ativacao" | "inclusao" | null;

function PrimeiroAcesso() {
  const [flow, setFlow] = useState<FlowType>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-card rounded-2xl p-8 shadow-elevated text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <h2 className="text-xl font-bold">Solicitação enviada com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            {flow === "ativacao"
              ? "Sua solicitação de ativação de acesso foi encaminhada à GERDAB."
              : "Seu requerimento de inclusão inicial foi encaminhado à GERDAB."}
          </p>
          <div className="bg-muted rounded-lg py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
            <p className="text-lg font-bold text-status-analise-fg">Em análise</p>
          </div>
          <p className="text-xs text-muted-foreground italic px-2">
            A GERDAB realizará a conferência das informações e documentos enviados.
          </p>
          <Link
            to="/login"
            className="block w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium mt-2"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-dark to-primary flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 text-primary-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-xl font-bold">Pró-Saúde — Primeiro Acesso</h1>
          <p className="text-sm opacity-75">Ativação de acesso ou solicitação de inclusão</p>
        </div>

        {!flow ? (
          <div className="bg-card rounded-2xl p-6 shadow-elevated space-y-4">
            <h2 className="text-lg font-semibold text-center mb-2">Você já recebe o auxílio Pró-Saúde?</h2>
            <div className="grid gap-3">
              <button
                onClick={() => setFlow("inclusao")}
                className="flex flex-col items-start p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition text-left group"
              >
                <span className="font-bold text-sm group-hover:text-primary">Não, ainda não recebo</span>
                <span className="text-xs text-muted-foreground mt-1">Quero solicitar minha inclusão no programa Pró-Saúde pela primeira vez.</span>
              </button>
            </div>
            <div className="pt-2">
              <Link to="/login" className="block text-center text-xs text-muted-foreground hover:underline">Voltar ao login</Link>
            </div>
          </div>
        ) : flow === "ativacao" ? (
          <FlowAtivacao onCancel={() => setFlow(null)} onDone={() => setDone(true)} />
        ) : (
          <FlowInclusao onCancel={() => setFlow(null)} onDone={() => setDone(true)} />
        )}
      </div>
    </div>
  );
}

// --- FLUXO DE ATIVAÇÃO ---
function FlowAtivacao({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [dadosEncontrados, setDadosEncontrados] = useState<any>(null);
  const [error, setError] = useState("");

  const handleBuscar = () => {
    if (!isCpfComplete(cpf)) {
      setError(validationMessages.cpf);
      return;
    }
    if (!matricula) {
      setError(validationMessages.matricula);
      return;
    }
    setError("");
    setLoading(true);
    // Simula busca
    setTimeout(() => {
      const found = baseImportadaGerdab.find(s => s.cpf === cpf) || baseImportadaGerdab[0];
      setDadosEncontrados(found);
      setLoading(false);
      setStep(1);
    }, 1200);
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-elevated space-y-5">
      <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
        Ativação de acesso ao sistema
      </h2>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Informe seus dados para localizarmos seu cadastro na base importada da GERDAB.</p>
          
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Field label="CPF" required>
            <input 
              className={inputCls} 
              placeholder="000.000.000-00" 
              value={cpf} 
              onChange={e => setCpf(maskCPF(e.target.value))} 
            />
          </Field>
          <Field label="Matrícula" required>
            <input 
              className={inputCls} 
              placeholder="12345678" 
              value={matricula}
              onChange={e => setMatricula(maskMatricula(e.target.value))}
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={onCancel} className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={handleBuscar} disabled={loading} className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              {loading ? "Buscando..." : <><Search className="h-4 w-4" /> Buscar Cadastro</>}
            </button>
          </div>
        </div>
      )}

      {step === 1 && dadosEncontrados && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800 flex gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <p>
              Como você já consta como beneficiário do Pró-Saúde, os documentos de inclusão já entregues anteriormente não serão solicitados novamente neste primeiro acesso.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Dados Encontrados</p>
            <Row k="Nome" v={dadosEncontrados.nome} />
            <Row k="Matrícula" v={dadosEncontrados.matricula} />
            <Row k="Situação" v="Já beneficiário" />
            <Row k="Operadora" v={dadosEncontrados.operadora} />
            <Row k="Plano" v={dadosEncontrados.tipoPlano} />
            <Row k="Valor Titular" v={formatCurrency(dadosEncontrados.valorTitular)} />
            {dadosEncontrados.dependentes.length > 0 && (
              <div className="pt-2 mt-2 border-t border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Dependentes</p>
                {dadosEncontrados.dependentes.map((d: any, i: number) => (
                  <Row key={i} k={d.nome} v={`${d.parentesco} (${formatCurrency(d.valor)})`} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Field label="Confirmar e-mail de contato">
              <input className={inputCls} placeholder="seu-email@detran.df.gov.br" />
            </Field>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="mt-1" defaultChecked />
              <span>Declaro que conferi os dados importados do meu cadastro no Pró-Saúde e que as informações apresentadas estão corretas, ou sinalizei as divergências necessárias para análise da GERDAB.</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(0)} className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted">Voltar</button>
            <button onClick={onDone} className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium">Confirmar Ativação</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- FLUXO DE INCLUSÃO ---
export function FlowInclusao({
  onCancel,
  onDone,
  isAssociacao,
  associacaoFixa,
}: {
  onCancel: () => void;
  onDone: () => void;
  isAssociacao?: boolean;
  /** Quando informado (ex: "Assetran"), o passo "Plano" deixa de pedir Operadora/Administradora
   *  em dropdown — a associação já É a operadora/vínculo do beneficiário, então o campo vira
   *  um valor fixo, só exibido. Também dispensa o envio de comprovantes pessoais no passo
   *  "Docs" (a associação é quem envia a comprovação, coletivamente, depois). */
  associacaoFixa?: string;
}) {
  const [step, setStep] = useState(0);
  const [deps, setDeps] = useState<Dependente[]>([]);
  const [showDepForm, setShowDepForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [valorTitular, setValorTitular] = useState("");
  const [error, setError] = useState("");

  // Dados do Titular (Step 0)
  const [titular, setTitular] = useState({
    nome: "",
    matricula: "",
    nascimento: "",
    cargo: "",
    lotacao: "",
    situacao: "",
    rg: "",
    orgao: "",
    cpf: "",
    email: "",
    telefoneCelular: "",
    telefoneSetor: "",
    telefoneResidencial: "",
    dataAdmissao: "",
    endereco: "",
  });

  // Dados do Plano (Step 1) — correção de regra: mesmo quando associacaoFixa é informada
  // (ex: ASSETRAN), a associação por si só não substitui a operadora — a ASSETRAN sempre tem
  // uma operadora vinculada, que deve ser informada como em qualquer outro caso.
  const [plano, setPlano] = useState({
    operadora: "",
    outraOperadora: "",
    administradora: "",
    proposta: "",
    modalidade: "",
    vigencia: "",
    empresarial: false,
    // Questionamento novo, no mesmo espírito de "Empresarial": o próprio servidor declara se
    // faz parte de alguma associação parceira — hoje só ASSEFAZ está disponível como opção.
    // Não substitui Operadora/Administradora (que continuam preenchidas normalmente); é só um
    // dado a mais no requerimento padrão de primeira inclusão.
    associacaoVinculada: false,
    associacao: "",
  });

  const isPensionista = titular.situacao.startsWith("Titular de pensão");
  const isInativo = titular.situacao === "Servidor inativo";
  const isAtivo = titular.situacao === "Servidor efetivo ativo" || titular.situacao === "Servidor comissionado";

  const steps = isPensionista 
    ? ["Titular", "Plano", "Docs", "Final"] 
    : ["Titular", "Plano", "Dependentes", "Docs", "Final"];
  
  const currentStepName = steps[step];

  const handleNext = () => {
    if (currentStepName === "Titular") {
      if (
        !titular.nome ||
        !titular.matricula ||
        !titular.nascimento ||
        !titular.cpf ||
        !titular.email ||
        !titular.rg ||
        !titular.orgao ||
        !titular.situacao ||
        !titular.endereco ||
        !titular.telefoneCelular
      ) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (isAtivo && !titular.dataAdmissao) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !isInativo && !titular.cargo) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !titular.lotacao) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isPensionista && !isInativo && !titular.telefoneSetor) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (!isCpfComplete(titular.cpf)) {
        setError(validationMessages.cpf);
        return;
      }
    }
    if (currentStepName === "Plano") {
      if (!plano.modalidade || !plano.vigencia || !valorTitular) {
        setError(validationMessages.obrigatorios);
        return;
      }
      // Operadora e Administradora são exigidas sempre — inclusive quando associacaoFixa está
      // definida (ASSETRAN): a associação não substitui a operadora, e o stakeholder confirmou
      // que a administradora também continua fazendo parte do requerimento nesse caso.
      if (!plano.operadora) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (plano.operadora === "Outra" && !plano.outraOperadora) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (plano.operadora !== "ASSEFAZ / OUTRO CONVÊNIO" && !plano.administradora) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (plano.associacaoVinculada && !plano.associacao) {
        setError(validationMessages.obrigatorios);
        return;
      }
      const errValor = getCurrencyError(valorTitular);
      if (errValor) {
        setError(errValor);
        return;
      }
    }
    if (currentStepName === "Dependentes" && showDepForm) {
      setError("Salve ou cancele o formulário do dependente antes de continuar.");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const [newDep, setNewDep] = useState<Dependente>({
    nome: "",
    cpf: "",
    dataNascimento: "",
    parentesco: "Cônjuge",
    valor: "",
    mesmoPlano: "Sim",
  });

  const addDep = () => {
    if (!newDep.nome || !newDep.cpf || !newDep.dataNascimento || !newDep.parentesco) {
      setError(validationMessages.obrigatorios);
      return;
    }
    if (mostrarBloqueioIdade24Dependente(newDep.parentesco, calcularIdade(newDep.dataNascimento))) {
      setError("Dependente com 24 anos ou mais não é elegível para inclusão neste vínculo.");
      return;
    }
    if (!isCpfComplete(newDep.cpf)) {
      setError(validationMessages.cpf);
      return;
    }
    const errDepValor = getCurrencyError(newDep.valor);
    if (errDepValor) {
      setError(errDepValor);
      return;
    }
    if (newDep.mesmoPlano === "Não") {
      if (!newDep.operadora || !newDep.modalidade || !newDep.vigencia) {
        setError(validationMessages.obrigatorios);
        return;
      }
      if (newDep.operadora === "Outra" && !newDep.outraOperadora) {
        setError(validationMessages.obrigatorios);
        return;
      }
    }
    if ((newDep.parentesco === "Filho(a) com invalidez" || newDep.parentesco === "Enteado(a) com invalidez") && !newDep.tipoLaudo) {
      setError("Selecione o tipo do laudo (temporário ou definitivo).");
      return;
    }
    setError("");
    if (newDep.nome && newDep.cpf) {
      if (editingIndex !== null) {
        const updatedDeps = [...deps];
        updatedDeps[editingIndex] = newDep;
        setDeps(updatedDeps);
      } else {
        setDeps([...deps, newDep]);
      }
      setNewDep({
        nome: "",
        cpf: "",
        dataNascimento: "",
        parentesco: "Cônjuge",
        valor: "",
        mesmoPlano: "Sim",
      });
      setShowDepForm(false);
      setEditingIndex(null);
    }
  };

  const handleEditDep = (index: number) => {
    setNewDep(deps[index]);
    setEditingIndex(index);
    setShowDepForm(true);
  };

  const totalDepsValue = deps.reduce((acc, curr) => acc + parseCurrency(curr.valor), 0);
  const valorTitularNum = parseCurrency(valorTitular);
  const valorTotalGrupo = valorTitularNum + totalDepsValue;

  const handleSubmit = () => {
    // Quando é a própria pessoa se cadastrando (fluxo de Primeiro Acesso), persiste como o
    // cadastro do titular logado. Quando é a associação preenchendo em nome de outra pessoa
    // (isAssociacao), não deve gravar em "prosaude_titular_cadastro" — esse cadastro é do
    // usuário atualmente logado na área da Associação, não do beneficiário do requerimento.
    if (!isAssociacao) {
      saveTitularCadastro({
        titular,
        plano: {
          operadora: plano.operadora,
          outraOperadora: plano.outraOperadora,
          administradora: plano.administradora,
          proposta: plano.proposta,
          modalidade: plano.modalidade,
          vigencia: plano.vigencia,
          valorTitular: valorTitularNum,
          empresarial: plano.empresarial,
          associacaoVinculada: plano.associacaoVinculada,
          associacao: plano.associacao,
        },
        dependentes: deps,
        updatedAt: new Date().toISOString(),
      });
    }
    onDone();
  };

  const renderResumoValores = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 mt-4">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Valor do titular:</span>
        <span className="font-semibold">{formatCurrency(valorTitularNum)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Total dos dependentes:</span>
        <span className="font-semibold">{formatCurrency(totalDepsValue)}</span>
      </div>
      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
        <span className="font-bold">Total do grupo familiar:</span>
        <span className="font-bold text-primary">{formatCurrency(valorTotalGrupo)}</span>
      </div>
    </div>
  );

  const idadeNovoDep = calcularIdade(newDep.dataNascimento);
  const alertaEscolaridadeDep =
    showDepForm &&
    mostrarAlertaEscolaridadeDependente(newDep.parentesco, idadeNovoDep);
  const bloqueioIdadeDep =
    showDepForm &&
    mostrarBloqueioIdade24Dependente(newDep.parentesco, idadeNovoDep);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-elevated space-y-5">
      <h2 className="text-base font-bold border-b border-border pb-3">Solicitação inicial de inclusão no Pró-Saúde</h2>
      
      {/* Stepper visual */}
      <div className="flex items-center justify-between text-[10px] mb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-1 flex-1 relative">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className={i <= step ? "text-primary font-bold" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-1 space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {currentStepName === "Titular" && (
          <div className="space-y-3">
            <Field label="Nome completo" required>
              <input 
                className={inputCls} 
                value={titular.nome} 
                onChange={e => setTitular({...titular, nome: e.target.value})} 
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Matrícula" required>
                <input 
                  className={inputCls} 
                  value={titular.matricula} 
                  onChange={e => setTitular({...titular, matricula: maskMatricula(e.target.value)})} 
                />
              </Field>
              <Field label="Data de nascimento" required>
                <input 
                  type="date" 
                  className={inputCls} 
                  value={titular.nascimento} 
                  onChange={e => setTitular({...titular, nascimento: e.target.value})} 
                />
              </Field>
            </div>
            {(!isPensionista || !isInativo) && (
              <div className="grid grid-cols-2 gap-3">
                {(!isPensionista && !isInativo) && (
                  <Field label="Cargo" required>
                    <select
                      className={inputCls}
                      value={titular.cargo}
                      onChange={e => setTitular({ ...titular, cargo: e.target.value })}
                    >
                      <option value="">Selecione o cargo</option>
                      {CARGOS_SERVIDOR.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {!isPensionista && (
                  <Field label="Lotação" required>
                    <input 
                      className={inputCls} 
                      value={titular.lotacao} 
                      onChange={e => setTitular({...titular, lotacao: e.target.value})} 
                    />
                  </Field>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de Admissão" required={isAtivo}>
                <input 
                  type="date" 
                  className={inputCls} 
                  value={titular.dataAdmissao} 
                  onChange={e => setTitular({...titular, dataAdmissao: e.target.value})} 
                />
              </Field>
              <Field label="Telefone Celular" required>
                <input 
                  className={inputCls} 
                  placeholder="(00) 00000-0000"
                  value={titular.telefoneCelular} 
                  onChange={e => setTitular({...titular, telefoneCelular: e.target.value})} 
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone Residencial">
                <input 
                  className={inputCls} 
                  placeholder="(00) 0000-0000"
                  value={titular.telefoneResidencial} 
                  onChange={e => setTitular({...titular, telefoneResidencial: e.target.value})} 
                />
              </Field>
              {(!isPensionista && !isInativo) && (
                <Field label="Telefone do Setor" required>
                  <input 
                    className={inputCls} 
                    placeholder="(00) 0000-0000"
                    value={titular.telefoneSetor} 
                    onChange={e => setTitular({...titular, telefoneSetor: e.target.value})} 
                  />
                </Field>
              )}
            </div>
            <Field label="Situação do beneficiário titular" required>
              <select
                className={inputCls}
                value={titular.situacao}
                onChange={e => setTitular({ ...titular, situacao: e.target.value })}
              >
                <option value="">Selecione a situação</option>
                {SITUACOES_TITULAR.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="RG" required>
                <input 
                  className={inputCls} 
                  value={titular.rg} 
                  onChange={e => setTitular({...titular, rg: maskRG(e.target.value)})} 
                />
              </Field>
              <Field label="Órgão Exped." required>
                <input 
                  className={inputCls} 
                  value={titular.orgao} 
                  onChange={e => setTitular({...titular, orgao: e.target.value.toUpperCase()})} 
                />
              </Field>
              <Field label="CPF" required>
                <input 
                  className={inputCls} 
                  value={titular.cpf} 
                  onChange={e => setTitular({...titular, cpf: maskCPF(e.target.value)})} 
                />
              </Field>
            </div>
            <Field label="E-mail" required>
              <input 
                type="email" 
                className={inputCls} 
                value={titular.email} 
                onChange={e => setTitular({...titular, email: e.target.value})} 
              />
            </Field>
            <Field label="Endereço completo" required>
              <input 
                className={inputCls} 
                value={titular.endereco} 
                onChange={e => setTitular({...titular, endereco: e.target.value})} 
              />
            </Field>
          </div>
        )}

        {currentStepName === "Plano" && (
          <div className="space-y-3">
            {associacaoFixa && (
              <Field label="Associação">
                <div className={`${inputCls} bg-muted/50 text-foreground font-medium`}>
                  {associacaoFixa}
                </div>
              </Field>
            )}
            {/* Correção de regra: a associação (ex: ASSETRAN) não substitui a operadora — ela
                sempre tem uma vinculada, então Operadora/Administradora continuam obrigatórias
                mesmo com associacaoFixa definida. */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Operadora" required>
                <select
                  className={inputCls}
                  value={plano.operadora}
                  onChange={e => setPlano({ ...plano, operadora: e.target.value })}
                >
                  <option value="">Selecione a operadora</option>
                  {OPERADORAS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                  <option value="Outra">Outra</option>
                </select>
              </Field>
              {plano.operadora === "Outra" && (
                <Field label="Digite o nome da operadora" required>
                  <input
                    className={inputCls}
                    value={plano.outraOperadora}
                    onChange={e => setPlano({...plano, outraOperadora: e.target.value})}
                  />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modalidade do Plano" required>
                <input
                  className={inputCls}
                  placeholder="Ex: Coletivo Empresarial"
                  value={plano.modalidade}
                  onChange={e => setPlano({...plano, modalidade: e.target.value})}
                />
              </Field>
              {/* Administradora sempre exigida, inclusive para ASSETRAN (associacaoFixa) — o
                  stakeholder confirmou que o campo deve continuar no requerimento nesse caso. */}
              <Field label="Administradora" required={plano.operadora !== "ASSEFAZ / OUTRO CONVÊNIO"}>
                <input
                  className={inputCls}
                  placeholder="Nome da administradora"
                  value={plano.administradora}
                  onChange={e => setPlano({...plano, administradora: e.target.value})}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Empresarial">
                <div className={`${inputCls} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plano.empresarial}
                      onCheckedChange={(checked) => setPlano({ ...plano, empresarial: checked })}
                    />
                    <span className="text-sm">{plano.empresarial ? "Sim" : "Não"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Este é um plano empresarial?</span>
                </div>
              </Field>
              {plano.empresarial && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>
                    Planos empresariais exigem o envio da fatura técnica no momento do envio de comprovantes de pagamento, pois o boleto empresarial isolado não permite identificar os valores individuais dos beneficiários.
                  </p>
                </div>
              )}
              {/* Novo questionamento, mesmo padrão do "Empresarial" acima — só no requerimento
                  padrão de primeira inclusão (não aparece quando associacaoFixa já define a
                  associação, ex: ASSETRAN, onde a resposta já é conhecida). */}
              {!associacaoFixa && (
                <>
                  <Field label="Associação">
                    <div className={`${inputCls} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plano.associacaoVinculada}
                          onCheckedChange={(checked) =>
                            setPlano({ ...plano, associacaoVinculada: checked, associacao: checked ? plano.associacao : "" })
                          }
                        />
                        <span className="text-sm">{plano.associacaoVinculada ? "Sim" : "Não"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Faz parte de alguma associação?</span>
                    </div>
                  </Field>
                  {plano.associacaoVinculada && (
                    <Field label="Qual associação?" required>
                      <select
                        className={inputCls}
                        value={plano.associacao}
                        onChange={e => setPlano({ ...plano, associacao: e.target.value })}
                      >
                        <option value="">Selecione a associação</option>
                        <option value="Assefaz">ASSEFAZ</option>
                      </select>
                    </Field>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor Titular (R$)" required>
                <input 
                  className={inputCls} 
                  placeholder="R$ 0,00" 
                  value={valorTitular}
                  onChange={e => setValorTitular(maskCurrency(e.target.value))}
                />
              </Field>
              <Field label="Data da Vigência" required>
                <input 
                  type="date"
                  className={inputCls} 
                  value={plano.vigencia} 
                  onChange={e => setPlano({...plano, vigencia: e.target.value})} 
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Número da Proposta / Contrato">
                <input 
                  className={inputCls} 
                  value={plano.proposta} 
                  onChange={e => setPlano({...plano, proposta: e.target.value})} 
                />
              </Field>
            </div>
          </div>
        )}

        {currentStepName === "Dependentes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">Dependentes ({deps.length})</p>
              {!showDepForm && (
                <button 
                  onClick={() => {
                    setEditingIndex(null);
                    setNewDep({
                      nome: "",
                      cpf: "",
                      dataNascimento: "",
                      parentesco: "Cônjuge",
                      valor: "",
                    });
                    setShowDepForm(true);
                  }}
                  className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="h-3 w-3" /> Adicionar
                </button>
              )}
            </div>

            {showDepForm ? (
              <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3 relative">
                <button 
                  onClick={() => {
                    setShowDepForm(false);
                    setEditingIndex(null);
                  }}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
                <h3 className="text-xs font-bold uppercase text-primary mb-2">
                  {editingIndex !== null ? "Editar Dependente" : "Novo Dependente"}
                </h3>
                <Field label="Nome completo" required>
                  <input className={inputCls} value={newDep.nome} onChange={e => setNewDep({...newDep, nome: e.target.value})} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="CPF" required>
                    <input 
                      className={inputCls} 
                      placeholder="000.000.000-00" 
                      value={newDep.cpf} 
                      onChange={e => setNewDep({...newDep, cpf: maskCPF(e.target.value)})} 
                    />
                  </Field>
                  <Field label="Nascimento" required>
                    <input type="date" className={inputCls} value={newDep.dataNascimento} onChange={e => setNewDep({...newDep, dataNascimento: e.target.value})} />
                  </Field>
                </div>
                <Field label="Tipo de dependente" required>
                  <select
                    className={inputCls}
                    value={newDep.parentesco}
                    onChange={e =>
                      setNewDep({ ...newDep, parentesco: e.target.value as TipoDependente })
                    }
                  >
                    <option value="">Selecione o tipo de dependente</option>
                    {TIPOS_DEPENDENTE.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                {(newDep.parentesco === "Filho(a) com invalidez" || newDep.parentesco === "Enteado(a) com invalidez") && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3">
                    <Field label="O laudo médico é temporário ou definitivo?" required>
                      <select className={inputCls} value={newDep.tipoLaudo || ""} onChange={e => setNewDep({...newDep, tipoLaudo: e.target.value})}>
                        <option value="">Selecione</option>
                        <option value="Temporário">Temporário</option>
                        <option value="Definitivo">Definitivo</option>
                      </select>
                    </Field>
                    {newDep.tipoLaudo === "Temporário" && (
                      <div className="bg-amber-50 text-amber-800 text-[10px] p-2 rounded border border-amber-200">
                        <strong>Atenção:</strong> Como o laudo é temporário, o sistema solicitará o envio de um novo laudo atualizado a cada 24 meses. Será gerado um alerta antes do vencimento.
                      </div>
                    )}
                  </div>
                )}

                <Field label="Está no mesmo plano do titular?" required>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" name="mesmoPlano" value="Sim" checked={newDep.mesmoPlano === "Sim"} onChange={() => setNewDep({...newDep, mesmoPlano: "Sim"})} /> Sim
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" name="mesmoPlano" value="Não" checked={newDep.mesmoPlano === "Não"} onChange={() => setNewDep({...newDep, mesmoPlano: "Não"})} /> Não
                    </label>
                  </div>
                </Field>

                {newDep.mesmoPlano === "Não" && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3">
                    <Field label="Operadora" required>
                      <select
                        className={inputCls}
                        value={newDep.operadora || ""}
                        onChange={e => setNewDep({ ...newDep, operadora: e.target.value })}
                      >
                        <option value="">Selecione a operadora</option>
                        {OPERADORAS.map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                        <option value="Outra">Outra</option>
                      </select>
                    </Field>
                    {newDep.operadora === "Outra" && (
                      <Field label="Digite o nome da operadora" required>
                        <input className={inputCls} value={newDep.outraOperadora || ""} onChange={e => setNewDep({...newDep, outraOperadora: e.target.value})} />
                      </Field>
                    )}
                    <Field label="Modalidade do Plano" required>
                      <input className={inputCls} placeholder="Ex: Coletivo Empresarial" value={newDep.modalidade || ""} onChange={e => setNewDep({...newDep, modalidade: e.target.value})} />
                    </Field>
                  </div>
                )}

                {newDep.parentesco && <DocumentosDependenteLista tipo={newDep.parentesco} />}

                {alertaEscolaridadeDep && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-800">
                    <p className="font-semibold mb-1">Atenção — Regra de escolaridade:</p>
                    <p>
                      Ao completar 21 anos, o dependente deverá apresentar comprovante de matrícula no início de cada semestre (março e agosto), até completar 24 anos.
                    </p>
                  </div>
                )}

                {bloqueioIdadeDep && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-[10px] text-destructive">
                    <p className="font-semibold mb-1">Inabilidade por idade:</p>
                    <p>
                      Dependentes com 24 anos ou mais não são elegíveis para este vínculo.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Valor no plano (R$)" required>
                    <input 
                      className={inputCls} 
                      placeholder="R$ 0,00" 
                      value={newDep.valor} 
                      onChange={e => setNewDep({...newDep, valor: maskCurrency(e.target.value)})} 
                    />
                  </Field>
                  <Field label="Data da Vigência" required>
                    <input 
                      type="date"
                      className={inputCls} 
                      value={newDep.vigencia || ""} 
                      onChange={e => setNewDep({...newDep, vigencia: e.target.value})} 
                    />
                  </Field>
                </div>

                <button 
                  onClick={addDep}
                  className="w-full bg-primary text-primary-foreground rounded-md py-2 text-xs font-bold mt-2"
                >
                  {editingIndex !== null ? "Salvar Alterações" : "Salvar Dependente"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {deps.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                    <p className="text-xs text-muted-foreground">Nenhum dependente adicionado.</p>
                  </div>
                ) : (
                  deps.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{d.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{d.parentesco} • {formatCurrency(parseCurrency(d.valor))}</p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditDep(i)} 
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Editar dependente"
                          title="Editar dependente"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeps(deps.filter((_, idx) => idx !== i))} 
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remover dependente"
                          title="Remover dependente"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {renderResumoValores()}
          </div>
        )}

        {currentStepName === "Docs" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
              <p className="font-semibold mb-1">Anexe a documentação necessária:</p>
              <p>Os documentos dos dependentes adicionados também devem ser incluídos aqui.</p>
            </div>
            
            <div className="space-y-4">
              {isAssociacao && (
                <>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Documentos da Associação</p>
                  <Field label="Requerimento de Inclusão Assinado (Titular)" required>
                    <UploadBox />
                  </Field>
                </>
              )}

              {associacaoFixa || plano.operadora === "ASSEFAZ / OUTRO CONVÊNIO" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
                  <p className="font-semibold mb-1">Inclusão pela associação{associacaoFixa ? ` (${associacaoFixa.toUpperCase()})` : " (ASSEFAZ / OUTROS)"}:</p>
                  <p>Não é necessário o envio de comprovantes neste momento. A associação será a responsável pelo envio das documentações junto à GERDAB.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Documentos do Titular</p>
                  {isPensionista && (
                    <Field label="Publicação de Pensão Vitalícia (ou documento equivalente)" required>
                      <UploadBox />
                    </Field>
                  )}
                  <Field label="Documento da entidade contratada / contrato do plano" required>
                    <UploadBox />
                    <div className="mt-2 bg-muted/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground mb-1 italic">O documento deve conter:</p>
                      <ul className="list-disc ml-4 grid grid-cols-1 gap-0.5">
                        <li>Condição de beneficiário titular; Indicação dos dependentes;</li>
                        <li>Tipos de cobertura; Prazo de validade/vigência;</li>
                        <li>Valores mensais individualizados;</li>
                        <li>Cópia do contrato ou declaração equivalente.</li>
                      </ul>
                    </div>
                  </Field>
                  <Field label="Documento de identificação do titular" required><UploadBox /></Field>
                  <Field label="Último contracheque" required><UploadBox /></Field>
                </>
              )}
            </div>

            {/* Documentos específicos para dependentes (réplica com destaque visual) */}
            {deps.map((d, i) => (
              <div key={i} className="space-y-3 bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-primary flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Documentos de {d.nome} ({d.parentesco})
                </p>
                <DocumentosDependenteUploads tipo={d.parentesco} />
              </div>
            ))}
          </div>
        )}

        {currentStepName === "Final" && (
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>Confirme as declarações obrigatórias para prosseguir.</p>
            </div>
            
            {renderResumoValores()}

            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Declarações do Titular</p>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span>Declaro que não percebo nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas.</span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span>Declaro que sou responsável pelo pagamento das despesas do seguro/plano de saúde de todos os dependentes relacionados neste requerimento.</span>
              </label>
              
              {deps.length > 0 && (
                <>
                  <p className="text-xs font-bold text-muted-foreground uppercase pt-2">Declarações sobre Dependentes</p>
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <span>Declaro que o(s) dependente(s) informado(s) não percebe(m) nenhum tipo de reembolso relativo à assistência à saúde subsidiado por Órgãos ou Entidades públicas.</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <span>Declaro que sou responsável pelo pagamento das despesas do plano de saúde do(s) beneficiário(s) dependente(s), ainda que o dependente seja o titular do contrato no plano apresentado.</span>
                  </label>
                </>
              )}

              <label className="flex items-start gap-2 text-xs pt-2">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span>Declaro que conheço as disposições previstas no Regulamento do Pró-Saúde-DETRAN/DF e que as informações prestadas são verdadeiras.</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border mt-auto">
        <button onClick={step === 0 ? onCancel : () => setStep(step - 1)} className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted">
          {step === 0 ? "Cancelar" : "Voltar"}
        </button>
        <button 
          onClick={() => (step < steps.length - 1 ? handleNext() : handleSubmit())} 
          disabled={showDepForm}
          className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {step === steps.length - 1 ? "Enviar Solicitação" : "Próximo"}
        </button>
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

/**
 * Edição cadastral pela GERDAB (ficha do servidor → Dados → Editar). Escopo deliberadamente restrito: só campos de
 * contato mutáveis que NÃO dependem de procedimento administrativo (hoje: Telefone). Nome, data de nascimento, CPF, RG,
 * e-mail institucional, plano, operadora, associação, processo SEI e início do benefício continuam somente leitura —
 * mudanças de plano/operadora/associação seguem pelos Requerimentos.
 *
 * Armazenamento: os valores alterados ficam em uma chave própria e SOBREPÕEM o cadastro-base (`servidorAtual`, que não é
 * modificado); o histórico é append-only (reutiliza `auditoria.ts`). Nada aqui toca em requerimentos, comprovantes,
 * negociações ou ressarcimentos. Limitação demonstrativa autorizada: o protótipo usa um servidor de referência.
 */
import { useEffect, useState } from "react";
import { analistaReferencia, gerenteReferencia, servidorAtual } from "./mock-data";
import { anexarEvento, novaAuditoria, type AuditoriaBase } from "./auditoria";
import { PROSAUDE_STORAGE_KEYS } from "./prosaude-storage";

export const EVENTO_CADASTRO_SERVIDOR = "prosaude-cadastro-servidor";

export type CampoEditavel = "telefone";
export const CAMPOS_EDITAVEIS: Record<CampoEditavel, { rotulo: string }> = { telefone: { rotulo: "Telefone" } };

export interface AlteracaoCampo {
  campo: CampoEditavel;
  rotulo: string;
  anterior: string;
  novo: string;
}

export interface EventoAlteracaoCadastral extends AuditoriaBase {
  id: string;
  tipo: "alteracao_cadastral";
  matricula: string;
  /** Um único evento por operação, com todos os campos alterados. */
  alteracoes: AlteracaoCampo[];
  justificativa: string;
}

type Valores = Partial<Record<CampoEditavel, string>>;

function ler<T>(chave: string, vazio: T): T {
  if (typeof window === "undefined") return vazio;
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : vazio;
  } catch {
    return vazio;
  }
}

const valoresSalvos = (): Record<string, Valores> => ler(PROSAUDE_STORAGE_KEYS.servidorCadastroValores, {});
export const listarAlteracoesCadastrais = (matricula: string = servidorAtual.matricula): EventoAlteracaoCadastral[] =>
  ler<EventoAlteracaoCadastral[]>(PROSAUDE_STORAGE_KEYS.servidorCadastroHistorico, []).filter((e) => e.matricula === matricula).sort((a, b) => b.dataHora.localeCompare(a.dataHora));

/** Valor vigente do campo: alteração da GERDAB, se houver, senão o cadastro-base. */
export function getValorCadastro(campo: CampoEditavel, matricula: string = servidorAtual.matricula): string {
  return valoresSalvos()[matricula]?.[campo] ?? servidorAtual[campo];
}

/** Hook: valor vigente do telefone (atualiza ao salvar, em outra aba ou ao recarregar). Começa com o valor-base para não divergir do HTML do servidor. */
export function useTelefoneServidor(): string {
  const [telefone, setTelefone] = useState<string>(servidorAtual.telefone);
  useEffect(() => {
    const atualizar = () => setTelefone(getValorCadastro("telefone"));
    atualizar();
    window.addEventListener(EVENTO_CADASTRO_SERVIDOR, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_CADASTRO_SERVIDOR, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return telefone;
}

/** Hook: histórico de alterações cadastrais do servidor de referência. */
export function useAlteracoesCadastrais(): EventoAlteracaoCadastral[] {
  const [eventos, setEventos] = useState<EventoAlteracaoCadastral[]>([]);
  useEffect(() => {
    const atualizar = () => setEventos(listarAlteracoesCadastrais());
    atualizar();
    window.addEventListener(EVENTO_CADASTRO_SERVIDOR, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_CADASTRO_SERVIDOR, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return eventos;
}

const soDigitos = (t: string) => t.replace(/\D/g, "");

/** Máscara de digitação: (DD) NNNN-NNNN ou (DD) 9NNNN-NNNN. */
export function mascararTelefone(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Mensagem de erro ou `null`. Aceita fixo (10 dígitos) e celular (11 dígitos começando em 9), com DDD válido. */
export function validarTelefone(valor: string): string | null {
  const d = soDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return "Informe o telefone com DDD, por exemplo (61) 98765-4321.";
  if (Number(d.slice(0, 2)) < 11) return "DDD inválido.";
  if (d.length === 11 && d[2] !== "9") return "Celular com 11 dígitos deve começar com 9 após o DDD.";
  if (d.length === 10 && !/[2-5]/.test(d[2])) return "Telefone fixo inválido.";
  return null;
}

export const responsavelCadastro = (role: string) => (role === "gerencia" ? `${gerenteReferencia} (Gerência GERDAB)` : `${analistaReferencia} (Analista GERDAB)`);

/**
 * Salva a alteração. Falha (sem gravar nada) se não houver mudança efetiva, se a justificativa estiver vazia ou se algum
 * valor for inválido. Grava os valores e UM evento de histórico com todas as mudanças da operação.
 */
export function salvarAlteracaoCadastral(input: { novos: Valores; justificativa: string; responsavel: string; matricula?: string }): EventoAlteracaoCadastral {
  const matricula = input.matricula ?? servidorAtual.matricula;
  const justificativa = input.justificativa.trim();
  const alteracoes: AlteracaoCampo[] = [];
  for (const campo of Object.keys(CAMPOS_EDITAVEIS) as CampoEditavel[]) {
    const bruto = input.novos[campo];
    if (bruto === undefined) continue;
    const erro = campo === "telefone" ? validarTelefone(bruto) : null;
    if (erro) throw new Error(erro);
    const novo = campo === "telefone" ? mascararTelefone(bruto) : bruto.trim();
    const anterior = getValorCadastro(campo, matricula);
    if (novo !== anterior) alteracoes.push({ campo, rotulo: CAMPOS_EDITAVEIS[campo].rotulo, anterior, novo });
  }
  if (alteracoes.length === 0) throw new Error("Nenhum valor foi alterado.");
  if (!justificativa) throw new Error("Informe a justificativa da alteração.");

  const evento: EventoAlteracaoCadastral = {
    ...novaAuditoria(input.responsavel, justificativa),
    id: `cad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo: "alteracao_cadastral",
    matricula,
    alteracoes,
    justificativa,
  };
  const valores = valoresSalvos();
  valores[matricula] = { ...(valores[matricula] ?? {}), ...Object.fromEntries(alteracoes.map((a) => [a.campo, a.novo])) };
  const historico = ler<EventoAlteracaoCadastral[]>(PROSAUDE_STORAGE_KEYS.servidorCadastroHistorico, []);
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.servidorCadastroHistorico, JSON.stringify(anexarEvento(historico, evento)));
  localStorage.setItem(PROSAUDE_STORAGE_KEYS.servidorCadastroValores, JSON.stringify(valores));
  window.dispatchEvent(new Event(EVENTO_CADASTRO_SERVIDOR));
  return evento;
}

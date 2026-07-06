/** Mensagens de erro padronizadas para formulários do protótipo. */
export const validationMessages = {
  cpf: "Informe um CPF válido no formato 000.000.000-00.",
  apenasNumeros: "Informe apenas números neste campo.",
  valorPlano: "Informe o valor do plano.",
  valorZero: "O valor deve ser maior que zero.",
  obrigatorios: "Preencha os campos obrigatórios antes de continuar.",
  matricula: "Informe a matrícula.",
  data: "Informe uma data válida.",
  parentesco: "Selecione o parentesco.",
  dependente: "Selecione o dependente.",
  motivo: "Descreva o motivo da exclusão.",
} as const;

/** Converte valor mascarado (R$ 1.000,00) em número para cálculos. */
export function parseCurrency(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function cpfDigits(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function isCpfComplete(cpf: string): boolean {
  return cpfDigits(cpf).length === 11;
}

export function isCurrencyPositive(value: string): boolean {
  return parseCurrency(value) > 0;
}

/** Retorna mensagem de erro para valor monetário vazio ou zero. */
export function getCurrencyError(value: string): string | null {
  if (!value.replace(/\D/g, "")) return validationMessages.valorPlano;
  if (!isCurrencyPositive(value)) return validationMessages.valorZero;
  return null;
}

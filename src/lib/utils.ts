import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const maskCPF = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const number = parseFloat(digits) / 100;
  if (isNaN(number)) return "";
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

export const maskCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskANS = (value: string) => {
  return value.replace(/\D/g, "").slice(0, 6);
};

export const maskRG = (value: string) => {
  return value.replace(/([^a-zA-Z0-9])/g, "").toUpperCase();
};

export const maskMatricula = (value: string) => {
  return value.replace(/\D/g, "");
};

export const maskSEI = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits
    .replace(/(\d{5})(\d)/, "$1.$2")
    .replace(/(\d{6})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

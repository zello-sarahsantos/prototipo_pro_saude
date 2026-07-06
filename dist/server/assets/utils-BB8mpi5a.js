const maskCPF = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
};
const maskCurrency = (value) => {
  const digits = value.replace(/\D/g, "");
  const number = parseFloat(digits) / 100;
  if (isNaN(number)) return "";
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};
const maskRG = (value) => {
  return value.replace(/([^a-zA-Z0-9])/g, "").toUpperCase();
};
const maskMatricula = (value) => {
  return value.replace(/\D/g, "");
};
export {
  maskRG as a,
  maskCPF as b,
  maskCurrency as c,
  maskMatricula as m
};

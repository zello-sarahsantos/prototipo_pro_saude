/**
 * Hierarquia de cor dos botões das telas de análise da GERDAB: azul = ação principal/prosseguir; verde =
 * decisão positiva; vermelho = decisão negativa; neutro = consulta/apoio. Laranja NUNCA é botão — só estado/atenção.
 * Mesmo tamanho, raio e tipografia.
 */
export const BTN = "text-xs font-medium rounded-md px-3 py-1.5 transition";
export const BTN_PRIMARIO = `${BTN} bg-primary text-primary-foreground hover:bg-primary-light`;
export const BTN_NEUTRO = `${BTN} border border-border hover:bg-muted`;
export const BTN_POSITIVO = "text-sm font-medium rounded-md px-4 py-2 transition bg-success text-primary-foreground hover:opacity-90";
export const BTN_NEGATIVO = "text-sm font-medium rounded-md px-4 py-2 transition bg-destructive text-destructive-foreground hover:opacity-90";

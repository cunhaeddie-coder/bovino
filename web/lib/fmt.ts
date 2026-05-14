// Formatação de moeda — completa para desktop, compacta para mobile
export function fmt(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Versão compacta: R$5,4k | R$1,2M — use em KpiCards no mobile
export function fmtC(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000)     return `R$${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Número simples sem símbolo de moeda
export function fmtNum(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString("pt-BR");
}

// Peso em kg / arrobas
export function fmtPeso(kg: number | string | null | undefined): string {
  return `${Number(kg ?? 0).toFixed(1)} kg`;
}

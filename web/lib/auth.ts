import { api } from "./api";

export interface AssinaturaAtiva {
  id: number;
  status: string;
  plano_id: number;
  plano_slug: string;
  plano_nome: string;
  plano_tipo: string;
  expira_em: string | null;
}

export interface User {
  id: number;
  nome: string;
  celular: string;
  email: string | null;
  tipo: "vendedor" | "comprador" | "ambos";
  plano: "free" | "premium";
  verificado_celular: boolean;
  verificado_cpf: boolean;
  assinatura_ativa: AssinaturaAtiva | null;
}

/** Returns true when user has any active paid subscription */
export function temPlano(user: User | null): boolean {
  return !!(user?.assinatura_ativa || user?.plano === "premium");
}

export async function login(celular: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await api.post("/auth/login", { celular, password });
  localStorage.setItem("bovino_token", data.token);
  return data;
}

export async function logout() {
  await api.post("/auth/logout").catch(() => null);
  localStorage.removeItem("bovino_token");
}

export async function getMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return data;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bovino_token");
}

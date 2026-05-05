"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type AdminPapel = "super" | "operador" | "ti" | "vendas" | "treinamento";

export type AdminUser = {
  id: number;
  nome: string;
  email: string;
  papel: AdminPapel;
  ativo: boolean;
  ultimo_acesso: string | null;
};

const ROLE_LABELS: Record<AdminPapel, string> = {
  super:       "Super Admin",
  operador:    "Operador",
  ti:          "Equipe TI",
  vendas:      "Equipe Vendas",
  treinamento: "Treinamento",
};

const ROLE_COLORS: Record<AdminPapel, string> = {
  super:       "bg-purple-100 text-purple-700",
  operador:    "bg-blue-100 text-blue-700",
  ti:          "bg-cyan-100 text-cyan-700",
  vendas:      "bg-green-100 text-green-700",
  treinamento: "bg-amber-100 text-amber-700",
};

// Which routes each role can access (* = all)
const ROLE_ROUTES: Record<AdminPapel, string[]> = {
  super:       ["*"],
  operador:    ["/dashboard", "/usuarios", "/anuncios", "/visitas", "/avaliacoes", "/fazendas", "/assinaturas", "/pagamentos", "/anunciantes", "/inteligencia"],
  ti:          ["/dashboard", "/usuarios", "/anuncios", "/visitas", "/avaliacoes", "/fazendas", "/inteligencia"],
  vendas:      ["/dashboard", "/assinaturas", "/pagamentos", "/anunciantes"],
  treinamento: ["/dashboard", "/usuarios", "/anuncios", "/avaliacoes"],
};

export function roleLabel(papel: AdminPapel): string {
  return ROLE_LABELS[papel] ?? papel;
}

export function roleColor(papel: AdminPapel): string {
  return ROLE_COLORS[papel] ?? "bg-slate-100 text-slate-600";
}

export function canAccess(papel: AdminPapel, href: string): boolean {
  const allowed = ROLE_ROUTES[papel];
  if (!allowed) return false;
  if (allowed[0] === "*") return true;
  return allowed.some((r) => href === r || href.startsWith(r + "/"));
}

type AdminContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  refresh: () => void;
};

const AdminContext = createContext<AdminContextValue>({ admin: null, loading: true, refresh: () => {} });

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get("/me").then((r) => setAdmin(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <AdminContext.Provider value={{ admin, loading, refresh: load }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}

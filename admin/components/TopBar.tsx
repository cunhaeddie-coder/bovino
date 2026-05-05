"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAdmin, roleLabel, roleColor } from "@/lib/admin-context";
import { api } from "@/lib/api";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/usuarios":     "Usuários",
  "/anuncios":     "Anúncios",
  "/visitas":      "Visitas",
  "/avaliacoes":   "Avaliações",
  "/fazendas":     "Fazendas",
  "/assinaturas":  "Assinaturas",
  "/pagamentos":   "Pagamentos",
  "/anunciantes":  "Anunciantes B2B",
  "/inteligencia": "Inteligência de Mercado",
  "/equipe":       "Equipe Admin",
};

function getTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  const match = Object.keys(PAGE_TITLES).find((k) => k !== "/" && pathname.startsWith(k + "/"));
  return match ? PAGE_TITLES[match] : "Painel";
}

export default function TopBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { admin } = useAdmin();

  async function handleLogout() {
    await api.post("/logout").catch(() => {});
    localStorage.removeItem("bovino_admin_token");
    document.cookie = "bovino_admin_token=; path=/; max-age=0";
    router.push("/login");
  }

  const title = getTitle(pathname);

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
      {/* Left: title */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold text-slate-800">{title}</h1>
        <span className="text-slate-300">/</span>
        <span className="text-xs text-slate-400 capitalize">{pathname.replace("/", "") || "dashboard"}</span>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <span className="text-xs text-slate-400 hidden sm:block">
          {new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
        </span>

        <div className="w-px h-5 bg-slate-200" />

        {admin && (
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline ${roleColor(admin.papel)}`}>
              {roleLabel(admin.papel)}
            </span>
            <span className="text-xs font-semibold text-slate-700 hidden md:block">{admin.nome}</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Sair do sistema"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition border border-red-100 hover:border-red-200"
        >
          <span>→</span>
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}

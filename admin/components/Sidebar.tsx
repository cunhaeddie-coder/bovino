"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAdmin, canAccess, roleLabel, roleColor, AdminPapel } from "@/lib/admin-context";

type NavGroup = { group: string };
type NavItem  = { href: string; label: string; icon: string; roles?: AdminPapel[] };
type NavEntry = NavGroup | NavItem;

const NAV: NavEntry[] = [
  { group: "Geral" },
  { href: "/dashboard",    label: "Dashboard",        icon: "▣" },
  { href: "/usuarios",     label: "Usuários",          icon: "◎" },

  { group: "Marketplace" },
  { href: "/anuncios",     label: "Anúncios",          icon: "◈" },
  { href: "/visitas",      label: "Visitas",            icon: "◷" },
  { href: "/avaliacoes",   label: "Avaliações",         icon: "◆" },

  { group: "Gestão Pecuária" },
  { href: "/fazendas",     label: "Fazendas",           icon: "⬡" },

  { group: "Financeiro" },
  { href: "/assinaturas",  label: "Assinaturas",        icon: "◈" },
  { href: "/pagamentos",   label: "Pagamentos",         icon: "◉" },
  { href: "/anunciantes",  label: "Anunciantes B2B",    icon: "⬟" },
  { href: "/custos",       label: "Custos do SaaS",      icon: "◌" },

  { group: "Inteligência" },
  { href: "/inteligencia", label: "Mercado",            icon: "◬" },

  { group: "Clientes" },
  { href: "/sugestoes",    label: "Sugestões",           icon: "◈" },

  { group: "Administração" },
  { href: "/equipe",       label: "Equipe Admin",       icon: "◩" },
];

function isGroup(e: NavEntry): e is NavGroup { return "group" in e; }

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { admin } = useAdmin();

  async function handleLogout() {
    await api.post("/logout").catch(() => {});
    localStorage.removeItem("bovino_admin_token");
    document.cookie = "bovino_admin_token=; path=/; max-age=0";
    router.push("/login");
  }

  function canSee(href: string): boolean {
    if (!admin) return false;
    // Equipe page only for super
    if (href === "/equipe") return admin.papel === "super";
    return canAccess(admin.papel, href);
  }

  const initials = admin?.nome
    ? admin.nome.split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : "?";

  return (
    <aside className="w-60 shrink-0 bg-[#0f172a] min-h-screen flex flex-col border-r border-slate-800/60">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm">B</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Bovino</p>
            <p className="text-slate-500 text-[11px] font-medium">Painel Administrativo</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item, i) => {
          if (isGroup(item)) {
            return (
              <p key={i} className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.12em] px-3 pt-5 pb-1.5 first:pt-2">
                {item.group}
              </p>
            );
          }

          const { href, label, icon } = item;
          if (!canSee(href)) return null;

          const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-green-500/15 text-green-400 border border-green-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
              }`}
            >
              <span className={`text-[15px] w-5 text-center leading-none ${active ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 pb-4 border-t border-slate-800/60 pt-3 space-y-2">
        {admin && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 text-xs font-semibold truncate">{admin.nome}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleColor(admin.papel)}`}>
                {roleLabel(admin.papel)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <span className="text-base w-5 text-center">→</span>
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}

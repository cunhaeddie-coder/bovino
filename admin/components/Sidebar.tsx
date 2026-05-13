"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Tag, CalendarClock, Star, MapPin,
  CreditCard, Banknote, Building2, Image as ImageIcon, PiggyBank,
  TrendingUp, MessageSquare, ShieldCheck, LogOut, PackageOpen,
  UserCheck, Headset, ClipboardList, Calendar, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAdmin, canAccess, roleLabel, roleColor, AdminPapel } from "@/lib/admin-context";

type NavGroup = { group: string };
type NavItem  = { href: string; label: string; Icon: LucideIcon; superOnly?: boolean };
type NavEntry = NavGroup | NavItem;

const NAV: NavEntry[] = [
  { group: "Geral" },
  { href: "/dashboard",    label: "Dashboard",        Icon: LayoutDashboard },

  { group: "Clientes" },
  { href: "/clientes",     label: "Clientes",          Icon: UserCheck },
  { href: "/assinaturas",  label: "Assinaturas",        Icon: CreditCard },
  { href: "/planos",       label: "Planos",              Icon: PackageOpen },

  { group: "Marketplace" },
  { href: "/anuncios",     label: "Anúncios",           Icon: Tag },
  { href: "/fazendas",     label: "Fazendas",           Icon: MapPin },
  { href: "/visitas",      label: "Visitas",             Icon: CalendarClock },
  { href: "/avaliacoes",   label: "Avaliações",          Icon: Star },

  { group: "Marketing B2B" },
  { href: "/anunciantes",  label: "Anunciantes",         Icon: Building2 },
  { href: "/banners",      label: "Banners",             Icon: ImageIcon },

  { group: "Financeiro" },
  { href: "/pagamentos",   label: "Pagamentos",          Icon: Banknote },
  { href: "/custos",       label: "Custos do SaaS",      Icon: PiggyBank },

  { group: "Inteligência" },
  { href: "/inteligencia", label: "Mercado",             Icon: TrendingUp },

  { group: "Atendimento" },
  { href: "/atendimento/agenda",   label: "Agenda",        Icon: Calendar },
  { href: "/atendimento/ordens",   label: "Ordens",        Icon: ClipboardList },
  { href: "/atendimento/catalogo", label: "Catálogo",      Icon: Headset },

  { group: "Suporte" },
  { href: "/suporte",      label: "Chat IA",             Icon: MessageSquare },
  { href: "/sugestoes",    label: "Sugestões",           Icon: MessageSquare },

  { group: "Configurações" },
  { href: "/equipe",       label: "Equipe",              Icon: ShieldCheck, superOnly: true },
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

  function canSee(item: NavItem): boolean {
    if (!admin) return false;
    if (item.superOnly) return admin.papel === "super";
    return canAccess(admin.papel, item.href);
  }

  const initials = admin?.nome
    ? admin.nome.split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : "?";

  return (
    <aside className="w-60 shrink-0 bg-[#0f172a] min-h-screen flex flex-col border-r border-slate-800/60">
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

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item, i) => {
          if (isGroup(item)) {
            return (
              <p key={i} className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.12em] px-3 pt-5 pb-1.5 first:pt-2">
                {item.group}
              </p>
            );
          }

          if (!canSee(item)) return null;

          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link key={item.href} href={item.href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-green-500/15 text-green-400 border border-green-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
              }`}>
              <item.Icon size={15} className={`shrink-0 ${active ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

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
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20">
          <LogOut size={15} className="shrink-0" />
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}

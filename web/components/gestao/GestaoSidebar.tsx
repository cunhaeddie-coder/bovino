"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Beef, Layers, Syringe, Scale, Wallet,
  Package, Users, ClipboardList, AlertTriangle, Sprout,
  Warehouse, Bot, Lightbulb, ChevronLeft, ChevronRight,
  X, LogOut, Dna, Store, TrendingUp, Receipt, FileBarChart2, Milk, MessageCircle, type LucideIcon,
} from "lucide-react";
import { CowIcon } from "@/components/ui/CowIcon";
import { useAuthStore } from "@/lib/store";
import { logout } from "@/lib/auth";

type NavItem = { href: string; label: string; Icon: LucideIcon | typeof CowIcon; color: string };

export const NAV_GESTOR: NavItem[] = [
  { href: "/gestao",              label: "Tela Inicial", Icon: LayoutDashboard, color: "text-green-600"   },
  { href: "/gestao/inteligencia", label: "Inteligência", Icon: TrendingUp,      color: "text-cyan-600"    },
  { href: "/gestao/animais",      label: "Rebanho",     Icon: Beef,            color: "text-green-700"   },
  { href: "/gestao/lotes",        label: "Lotes",       Icon: Layers,          color: "text-blue-600"    },
  { href: "/gestao/saude",        label: "Saúde",       Icon: Syringe,         color: "text-red-600"     },
  { href: "/gestao/pesagens",     label: "Pesagens",    Icon: Scale,           color: "text-amber-600"   },
  { href: "/gestao/financeiro",   label: "Financeiro",  Icon: Wallet,          color: "text-emerald-600" },
  { href: "/gestao/fiscal",       label: "Fiscal",       Icon: Receipt,         color: "text-indigo-600"  },
  { href: "/gestao/relatorios",   label: "Relatórios",  Icon: FileBarChart2,   color: "text-violet-600"  },
  { href: "/gestao/leiteiro",     label: "Leiteiro",    Icon: Milk,            color: "text-sky-600"     },
  { href: "/gestao/insumos",      label: "Estoque",     Icon: Package,         color: "text-orange-600"  },
  { href: "/gestao/funcionarios", label: "Equipe",      Icon: Users,           color: "text-violet-600"  },
  { href: "/gestao/ordens",       label: "OS",          Icon: ClipboardList,   color: "text-slate-600"   },
  { href: "/gestao/eventos",      label: "Ocorrências", Icon: AlertTriangle,   color: "text-yellow-600"  },
  { href: "/gestao/reproducao",   label: "Reprodução",  Icon: Dna,             color: "text-pink-600"    },
  { href: "/gestao/pasto",        label: "App Pasto",   Icon: Sprout,          color: "text-lime-600"    },
  { href: "/gestao/curral",       label: "App Curral",  Icon: Warehouse,       color: "text-amber-800"   },
  { href: "/gestao/gestor",       label: "IA Gestor",   Icon: Bot,             color: "text-violet-700"  },
  { href: "/gestao/fazenda",      label: "Minha Fazenda", Icon: Store,           color: "text-teal-600"    },
  { href: "/gestao/sugestoes",    label: "Sugestões",   Icon: Lightbulb,       color: "text-yellow-500"  },
  { href: "/gestao/suporte",      label: "Suporte",     Icon: MessageCircle,   color: "text-green-600"   },
];

const NAV_VAQUEIRO: NavItem[] = [
  { href: "/gestao/curral", label: "App Curral", Icon: Warehouse, color: "text-amber-800" },
  { href: "/gestao/pasto",  label: "App Pasto",  Icon: Sprout,    color: "text-lime-600"  },
];

interface Props {
  mode: "sidebar" | "drawer";
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function GestaoSidebar({ mode, collapsed = false, onToggle, onClose }: Props) {
  const pathname     = usePathname();
  const router       = useRouter();
  const { user, clearAuth } = useAuthStore();
  const isVaqueiro   = user?.papel === "vaqueiro";
  const nav          = isVaqueiro ? NAV_VAQUEIRO : NAV_GESTOR;
  const isCollapsed  = mode === "sidebar" && collapsed;

  const initials = user?.nome
    ? user.nome.split(" ").slice(0, 2).map((w: string) => w[0].toUpperCase()).join("")
    : "?";

  async function handleLogout() {
    await logout();
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden">

      {/* Topo: título + botão toggle/fechar */}
      <div className={`flex items-center h-14 shrink-0 border-b border-gray-100 ${isCollapsed ? "justify-center" : "px-4 justify-between"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {isVaqueiro
              ? <><CowIcon size={17} className="text-amber-700" /><span className="text-amber-800 font-bold text-sm">Vaqueiro</span></>
              : <span className="text-green-800 font-bold text-sm">Gestão</span>
            }
          </div>
        )}

        {mode === "sidebar" && onToggle && (
          <button onClick={onToggle} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        )}
        {mode === "drawer" && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-auto">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-2 space-y-0.5 ${isCollapsed ? "px-1" : "px-2"}`}>
        {nav.map(({ href, label, Icon, color }) => {
          const active = pathname === href || (href !== "/gestao" && pathname.startsWith(href));
          return (
            <div key={href} className="relative group/item">
              <Link
                href={href}
                onClick={onClose}
                className={`flex items-center rounded-lg text-sm font-medium transition-colors
                  ${isCollapsed ? "justify-center py-2.5 px-2" : "gap-3 px-3 py-2"}
                  ${active
                    ? "bg-green-50 text-green-700 border-l-2 border-green-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent"
                  }`}
              >
                <Icon size={18} className={`shrink-0 ${active ? "text-green-600" : color}`} />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </Link>

              {/* Tooltip no modo colapsado (só desktop) */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Perfil + logout */}
      <div className={`border-t border-gray-100 shrink-0 ${isCollapsed ? "p-2" : "p-3"}`}>
        {!isCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.nome.split(" ")[0]}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user.plano}</p>
            </div>
          </div>
        )}

        {isCollapsed && user && (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`flex items-center rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full
            ${isCollapsed ? "justify-center py-1.5 px-2" : "gap-2 px-2 py-1.5"}`}
        >
          <LogOut size={15} className="shrink-0" />
          {!isCollapsed && "Sair"}
        </button>
      </div>
    </div>
  );
}

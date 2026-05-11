"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Beef, Layers, Syringe, Scale, Wallet,
  Package, Users, ClipboardList, AlertTriangle, Sprout,
  Warehouse, Bot, Lightbulb, type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { CowIcon } from "@/components/ui/CowIcon";

type NavItem = { href: string; label: string; Icon: LucideIcon | typeof CowIcon; color: string };

const NAV_GESTOR: NavItem[] = [
  { href: "/gestao",              label: "Dashboard",   Icon: LayoutDashboard, color: "text-green-700"  },
  { href: "/gestao/animais",      label: "Rebanho",     Icon: Beef,            color: "text-green-700"  },
  { href: "/gestao/lotes",        label: "Lotes",       Icon: Layers,          color: "text-blue-600"   },
  { href: "/gestao/saude",        label: "Saúde",       Icon: Syringe,         color: "text-red-600"    },
  { href: "/gestao/pesagens",     label: "Pesagens",    Icon: Scale,           color: "text-amber-600"  },
  { href: "/gestao/financeiro",   label: "Financeiro",  Icon: Wallet,          color: "text-emerald-600"},
  { href: "/gestao/insumos",      label: "Estoque",     Icon: Package,         color: "text-orange-600" },
  { href: "/gestao/funcionarios", label: "Equipe",      Icon: Users,           color: "text-violet-600" },
  { href: "/gestao/ordens",       label: "OS",          Icon: ClipboardList,   color: "text-slate-600"  },
  { href: "/gestao/eventos",      label: "Ocorrências", Icon: AlertTriangle,   color: "text-yellow-600" },
  { href: "/gestao/pasto",        label: "App Pasto",   Icon: Sprout,          color: "text-lime-600"   },
  { href: "/gestao/curral",       label: "App Curral",  Icon: Warehouse,       color: "text-amber-800"  },
  { href: "/gestao/gestor",       label: "IA Gestor",   Icon: Bot,             color: "text-violet-700" },
  { href: "/gestao/sugestoes",    label: "Sugestões",   Icon: Lightbulb,       color: "text-yellow-500" },
];

const NAV_VAQUEIRO: NavItem[] = [
  { href: "/gestao/curral", label: "App Curral", Icon: Warehouse, color: "text-amber-800" },
  { href: "/gestao/pasto",  label: "App Pasto",  Icon: Sprout,    color: "text-lime-600"  },
];

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  const path       = usePathname();
  const user       = useAuthStore((s) => s.user);
  const isVaqueiro = user?.papel === "vaqueiro";
  const nav        = isVaqueiro ? NAV_VAQUEIRO : NAV_GESTOR;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          {isVaqueiro && (
            <div className="py-1.5 flex items-center gap-2 border-b border-amber-100">
              <CowIcon size={14} className="text-amber-700" />
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">App Vaqueiro</span>
              <span className="text-xs text-gray-400">{user?.nome}</span>
            </div>
          )}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
            {nav.map((item) => {
              const active = path === item.href || (item.href !== "/gestao" && path.startsWith(item.href));
              const { Icon } = item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-green-50 text-green-700"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={14} className={active ? "text-green-700" : item.color} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

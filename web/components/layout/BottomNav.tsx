"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { temPlano } from "@/lib/auth";

type NavItem = { href: string; icon: string; label: string; highlight?: boolean; auth?: boolean };

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isPremium = temPlano(user);

  const baseItems: NavItem[] = [
    { href: "/", icon: "🏠", label: "Início" },
    { href: "/busca", icon: "🔍", label: "Buscar" },
    { href: "/anuncios/novo", icon: "➕", label: "Anunciar", highlight: true },
  ];

  const premiumItems: NavItem[] = isPremium
    ? [
        { href: "/gestao", icon: "🌾", label: "Gestão" },
        { href: "/perfil", icon: "👤", label: "Perfil", auth: true },
      ]
    : [
        { href: "/planos", icon: "⭐", label: "Planos" },
        { href: "/perfil", icon: "👤", label: "Perfil", auth: true },
      ];

  const navItems = [...baseItems, ...premiumItems].filter((i) => !i.auth || user);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
                ${item.highlight
                  ? "text-green-700 font-bold"
                  : active
                  ? "text-green-700 font-semibold"
                  : "text-gray-400"
                }`}
            >
              <span className={`text-xl leading-none ${item.highlight ? "bg-green-700 text-white w-10 h-10 flex items-center justify-center rounded-full -mt-5 shadow-lg border-2 border-white text-base" : ""}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        {!user && (
          <Link href="/login" className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs text-gray-400">
            <span className="text-xl leading-none">👤</span>
            <span>Entrar</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

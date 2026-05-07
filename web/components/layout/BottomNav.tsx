"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { temPlano } from "@/lib/auth";

type NavItem = { href: string; icon: string; label: string; highlight?: boolean; auth?: boolean };

const NAV_VAQUEIRO: NavItem[] = [
  { href: "/gestao/curral", icon: "🔒", label: "Curral" },
  { href: "/gestao/pasto",  icon: "🌿", label: "Pasto"  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isPremium = temPlano(user);
  const isVaqueiro = user?.papel === "vaqueiro";

  // Vaqueiro: nav dedicado só com Curral e Pasto
  if (isVaqueiro) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-amber-800 border-t border-amber-700 safe-area-pb">
        <div className="flex">
          {NAV_VAQUEIRO.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-semibold transition-colors
                  ${active ? "text-white" : "text-amber-300 hover:text-white"}`}
              >
                <span className={`text-2xl leading-none ${active ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" : ""}`}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

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

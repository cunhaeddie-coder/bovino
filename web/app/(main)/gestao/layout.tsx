"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/gestao",             label: "Dashboard",   icon: "📊" },
  { href: "/gestao/animais",     label: "Rebanho",     icon: "🐄" },
  { href: "/gestao/lotes",       label: "Lotes",       icon: "🗂️" },
  { href: "/gestao/saude",       label: "Saúde",       icon: "💉" },
  { href: "/gestao/pesagens",    label: "Pesagens",    icon: "⚖️" },
  { href: "/gestao/financeiro",  label: "Financeiro",  icon: "💰" },
  { href: "/gestao/insumos",     label: "Estoque",     icon: "📦" },
  { href: "/gestao/funcionarios",label: "Equipe",      icon: "👷" },
  { href: "/gestao/ordens",      label: "OS",          icon: "📋" },
  { href: "/gestao/eventos",     label: "Ocorrências", icon: "📣" },
  { href: "/gestao/pasto",       label: "App Pasto",   icon: "🌿" },
  { href: "/gestao/curral",      label: "App Curral",  icon: "🔒" },
  { href: "/gestao/gestor",      label: "IA Gestor",   icon: "🤖" },
  { href: "/gestao/sugestoes",   label: "Sugestões",   icon: "💡" },
];

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
            {NAV.map((item) => {
              const active = path === item.href || (item.href !== "/gestao" && path.startsWith(item.href));
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
                  <span>{item.icon}</span>
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

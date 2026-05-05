"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { logout, temPlano } from "@/lib/auth";
import { useState } from "react";

export function Header() {
  const { user, clearAuth } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isPremium = temPlano(user);

  async function handleLogout() {
    await logout();
    clearAuth();
    router.push("/");
    setMenuOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")
      ? "text-white font-semibold"
      : "text-green-100 hover:text-white";

  return (
    <header className="bg-green-700 shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🐄</span>
          <span className="text-white font-bold text-lg tracking-tight">Bovino</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-5 ml-4 text-sm">
          <Link href="/busca" className={isActive("/busca")}>Buscar gado</Link>
          <Link href="/cotacoes" className={isActive("/cotacoes")}>Cotações</Link>
          {isPremium && (
            <>
              <Link href="/gestao" className={isActive("/gestao")}>Gestão</Link>
              <Link href="/inteligencia" className={isActive("/inteligencia")}>Inteligência</Link>
              <Link href="/visitas" className={isActive("/visitas")}>Visitas</Link>
            </>
          )}
          {!isPremium && (
            <Link href="/planos" className={isActive("/planos")}>Planos</Link>
          )}
        </nav>

        <div className="flex-1" />

        {/* Ações */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/anuncios/novo"
                className="hidden sm:flex items-center gap-1.5 bg-yellow-400 text-yellow-900 font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-yellow-300 transition-colors"
              >
                + Anunciar
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-white hover:bg-green-600 rounded-full px-2 py-1 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold border-2 border-green-300">
                    {user.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm text-green-100 max-w-25 truncate">{user.nome.split(" ")[0]}</span>
                  <svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-52 py-1 text-sm">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="font-semibold text-gray-900 truncate">{user.nome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isPremium ? (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              ⭐ {user.assinatura_ativa?.plano_nome ?? "Premium"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 capitalize">{user.plano}</span>
                          )}
                        </div>
                      </div>

                      <Link href="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <span>👤</span> Meu perfil
                      </Link>
                      <Link href="/anuncios/meus" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <span>📋</span> Meus anúncios
                      </Link>
                      <Link href="/chat" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <span>💬</span> Negociações
                      </Link>

                      {isPremium && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ferramentas Premium</p>
                          <Link href="/gestao" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                            <span>🌾</span> Gestão da fazenda
                          </Link>
                          <Link href="/inteligencia" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                            <span>📊</span> Inteligência de mercado
                          </Link>
                          <Link href="/visitas" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                            <span>📅</span> Visitas agendadas
                          </Link>
                          <Link href="/inteligencia/alertas" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                            <span>🔔</span> Alertas de demanda
                          </Link>
                        </>
                      )}

                      {!isPremium && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <Link href="/planos" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-green-700 hover:bg-green-50 font-semibold">
                            <span>⭐</span> Assinar plano
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-100 mt-1">
                        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50">
                          <span>🚪</span> Sair
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-green-100 hover:text-white text-sm">Entrar</Link>
              <Link
                href="/cadastro"
                className="bg-white text-green-700 font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-green-50 transition-colors"
              >
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";
import { Assinatura } from "@/lib/types";

export default function PerfilPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [stats, setStats] = useState({ anuncios: 0 });
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    api.get("/perfil").then(({ data }) => {
      setStats({ anuncios: data.anuncios?.length ?? 0 });
    }).catch(() => {});
    api.get("/assinatura").then(({ data }) => {
      setAssinatura(data);
    }).catch(() => {});
  }, [user]);

  async function handleCancelarAssinatura() {
    if (!confirm("Cancelar assinatura? Ela permanece ativa até o fim do período pago.")) return;
    setCancelando(true);
    try {
      await api.delete("/assinatura");
      setAssinatura((prev) => prev ? { ...prev, status: "cancelada" } : prev);
    } finally {
      setCancelando(false);
    }
  }

  async function handleLogout() {
    await logout();
    clearAuth();
    router.push("/");
  }

  if (!user) return null;

  const inicial = user.nome.charAt(0).toUpperCase();
  const TIPO = { vendedor: "Vendedor", comprador: "Comprador", ambos: "Comprador e Vendedor" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {inicial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{user.nome}</h1>
          <p className="text-sm text-gray-500">{TIPO[user.tipo]} · Plano {user.plano}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {user.verificado_celular && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">✓ Celular verificado</span>
            )}
            {user.verificado_cpf && (
              <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">✓ CPF verificado</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Anúncios", value: stats.anuncios },
          { label: "Negociações", value: "—" },
          { label: "Plano", value: user.plano === "premium" ? "⭐ Premium" : "Free" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-green-700">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Assinatura */}
      {assinatura?.status ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Minha assinatura</h2>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              assinatura.status === "ativa"
                ? "bg-green-100 text-green-700"
                : assinatura.status === "pendente"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {assinatura.status.charAt(0).toUpperCase() + assinatura.status.slice(1)}
            </span>
          </div>
          <p className="font-bold text-gray-900">{assinatura.plano?.nome ?? "Plano"}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {(assinatura.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
          </p>
          {assinatura.expira_em && (
            <p className="text-xs text-gray-400 mt-1">
              Válido até {new Date(assinatura.expira_em).toLocaleDateString("pt-BR")}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <Link href="/planos" className="text-xs font-semibold text-green-600 hover:underline">
              Ver todos os planos
            </Link>
            {assinatura.status === "ativa" && (
              <button
                onClick={handleCancelarAssinatura}
                disabled={cancelando}
                className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
              >
                {cancelando ? "Cancelando..." : "Cancelar assinatura"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <Link href="/planos" className="block bg-linear-to-r from-green-600 to-green-700 text-white rounded-2xl p-5 shadow-sm hover:from-green-700 transition">
          <p className="font-bold">Assine um plano ⭐</p>
          <p className="text-green-100 text-sm mt-0.5">Desbloqueie recursos exclusivos a partir de R$ 30/mês</p>
        </Link>
      )}

      {/* Menu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {[
          { icon: "📋", label: "Meus anúncios", href: "/anuncios/meus" },
          { icon: "💬", label: "Negociações", href: "/chat" },
          { icon: "➕", label: "Criar anúncio", href: "/anuncios/novo" },
        ].map(({ icon, label, href }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
            <span className="text-xl w-7">{icon}</span>
            <span className="text-sm font-medium text-gray-800">{label}</span>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Dados da conta */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">Dados da conta</h2>
        {[
          { label: "Celular", value: user.celular },
          { label: "E-mail", value: user.email ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-800 font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Sair */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-2xl py-3 text-sm font-semibold hover:bg-red-50 transition-colors">
        🚪 Sair da conta
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";

export default function PlanoSucessoPage() {
  const router = useRouter();
  const { token, setAuth } = useAuthStore();

  useEffect(() => {
    // Recarrega o usuário para refletir o novo plano
    if (token) {
      getMe().then((u) => setAuth(u, token)).catch(() => {});
    }

    const t = setTimeout(() => router.push("/perfil"), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Pagamento aprovado!</h1>
        <p className="text-gray-500 mb-8">
          Seu plano foi ativado com sucesso. Você já tem acesso a todos os recursos incluídos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/perfil"
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full transition"
          >
            Ver meu perfil
          </Link>
          <Link
            href="/busca"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-3 rounded-full transition"
          >
            Explorar anúncios
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">Você será redirecionado automaticamente em alguns segundos...</p>
      </div>
    </main>
  );
}

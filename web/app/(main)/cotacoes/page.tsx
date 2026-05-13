"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { temPlano } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Cotacao } from "@/lib/types";
import Link from "next/link";

const TIPO_LABEL = { boi_gordo: "Boi Gordo", bezerro: "Bezerro", vaca: "Vaca" } as const;

export default function CotacoesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace("/login?next=/cotacoes"); return; }
    if (!temPlano(user)) { router.replace("/planos"); return; }

    api.get("/cotacoes/ultima")
      .then(({ data }) => setCotacoes(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || !temPlano(user)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cotações do Boi</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["boi_gordo", "bezerro", "vaca"] as const).map((tipo) => {
              const c = cotacoes[tipo];
              return (
                <div key={tipo} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">{TIPO_LABEL[tipo]}</p>
                  {c ? (
                    <>
                      <p className="text-3xl font-bold text-green-700 mt-1">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.preco_arroba)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">por arroba · {c.fonte}</p>
                      <p className="text-xs text-gray-400">{new Date(c.referencia_em).toLocaleDateString("pt-BR")}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 mt-2 text-sm">Sem dados</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Dados exclusivos para assinantes ·{" "}
          <Link href="/inteligencia" className="text-green-700 hover:underline">Ver inteligência de mercado</Link>
        </p>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Negociacao, PaginatedResponse } from "@/lib/types";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aberta:    { label: "Aberta",    color: "bg-blue-100 text-blue-700" },
  aceita:    { label: "Aceita",    color: "bg-green-100 text-green-700" },
  recusada:  { label: "Recusada",  color: "bg-red-100 text-red-600" },
  concluida: { label: "Concluída", color: "bg-gray-100 text-gray-600" },
};

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    api.get<PaginatedResponse<Negociacao>>("/negociacoes")
      .then(({ data }) => setNegociacoes(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Negociações</h1>
      <p className="text-sm text-gray-500 mb-6">{negociacoes.length} conversa{negociacoes.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />)}
        </div>
      ) : negociacoes.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
          <p className="text-5xl mb-3">💬</p>
          <h3 className="font-semibold text-gray-700">Nenhuma negociação ainda</h3>
          <p className="text-sm text-gray-400 mt-1 mb-5">Encontre um anúncio e inicie uma conversa</p>
          <Link href="/busca"
            className="inline-block bg-green-700 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-green-800 text-sm">
            Buscar gado
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {negociacoes.map((n) => {
            const { label, color } = STATUS_CONFIG[n.status] ?? STATUS_CONFIG.aberta;
            const isVendedor = n.vendedor?.id === user.id;
            const contato = isVendedor ? n.comprador : n.vendedor;

            return (
              <Link key={n.id} href={`/chat/${n.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg shrink-0">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {contato?.nome ?? "Usuário"}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {n.anuncio?.titulo ?? `Anúncio #${n.anuncio_id}`}
                    </p>
                    {n.preco_proposto && (
                      <p className="text-xs text-green-700 font-medium mt-1">
                        Proposta: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n.preco_proposto)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

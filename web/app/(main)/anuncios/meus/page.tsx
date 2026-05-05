"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Anuncio, PaginatedResponse } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  vendido: "Vendido",
  reservado: "Reservado",
};
const STATUS_COLOR: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  vendido: "bg-red-100 text-red-600",
  reservado: "bg-yellow-100 text-yellow-700",
};

export default function MeusAnunciosPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    api.get<PaginatedResponse<Anuncio>>("/anuncios/meus")
      .then(({ data }) => setAnuncios(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function encerrar(id: number) {
    if (!confirm("Encerrar este anúncio?")) return;
    await api.delete(`/anuncios/${id}`);
    setAnuncios((prev) => prev.filter((a) => a.id !== id));
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus anúncios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{anuncios.length} anúncio{anuncios.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/anuncios/novo"
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition-colors">
          + Novo anúncio
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : anuncios.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
          <p className="text-5xl mb-3">📋</p>
          <h3 className="font-semibold text-gray-700">Nenhum anúncio ainda</h3>
          <p className="text-sm text-gray-400 mt-1 mb-5">Publique seu primeiro anúncio gratuitamente</p>
          <Link href="/anuncios/novo"
            className="inline-block bg-green-700 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-green-800 text-sm">
            Criar anúncio
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {anuncios.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
              {/* Thumb */}
              <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center shrink-0 text-2xl overflow-hidden">
                {a.fotos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.fotos[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : "🐄"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{a.titulo}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[a.animal.status]}`}>
                    {STATUS_LABEL[a.animal.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{a.animal.raca} · {a.animal.quantidade} cab. · {a.animal.municipio}/{a.animal.estado}</p>
                <p className="text-green-700 font-bold text-sm mt-1">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(a.preco_unitario)}
                  <span className="text-gray-400 font-normal text-xs"> /cab</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">👁 {a.views} visualizações</p>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <Link href={`/anuncios/${a.id}`}
                  className="text-xs text-green-700 border border-green-200 px-3 py-1 rounded-full hover:bg-green-50 text-center">
                  Ver
                </Link>
                <button onClick={() => encerrar(a.id)}
                  className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50">
                  Encerrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

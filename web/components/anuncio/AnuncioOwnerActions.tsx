"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export function AnuncioOwnerActions({
  anuncioId,
  ownerId,
}: {
  anuncioId: number;
  ownerId: number;
}) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user || user.id !== ownerId) return null;

  async function encerrar() {
    setLoading(true);
    try {
      await api.delete(`/anuncios/${anuncioId}`);
      router.push("/anuncios/meus");
    } finally {
      setLoading(false);
      setConfirmando(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Seu anúncio</p>
      <div className="flex gap-2">
        <Link
          href={`/anuncios/${anuncioId}/editar`}
          className="flex-1 text-center bg-white border border-green-600 text-green-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-green-50 transition-colors"
        >
          Editar anúncio
        </Link>

        {confirmando ? (
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setConfirmando(false)}
              className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={encerrar}
              disabled={loading}
              className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "..." : "Confirmar"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            className="flex-1 bg-white border border-red-200 text-red-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Encerrar
          </button>
        )}
      </div>
    </div>
  );
}

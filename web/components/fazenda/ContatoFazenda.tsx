"use client";

import { useState } from "react";
import { MessageCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function ContatoFazenda({ slug }: { slug: string }) {
  const { user } = useAuthStore();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [precisaUpgrade, setPrecisaUpgrade] = useState(false);

  async function revelar() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ whatsapp: string }>(`/fazendas/${slug}/contato`);
      setWhatsapp(data.whatsapp);
    } catch (e: unknown) {
      const upgrade = (e as { response?: { data?: { upgrade?: boolean } } })?.response?.data?.upgrade;
      if (upgrade) setPrecisaUpgrade(true);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition"
      >
        <MessageCircle size={16} /> Entrar para ver contato
      </Link>
    );
  }

  if (whatsapp) {
    return (
      <a
        href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition"
      >
        <MessageCircle size={16} /> Falar no WhatsApp
      </a>
    );
  }

  if (precisaUpgrade) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Lock size={16} className="text-amber-600 shrink-0" />
        <div className="text-sm">
          <span className="text-amber-800 font-medium">Contato direto exclusivo do </span>
          <Link href="/planos" className="text-amber-700 font-bold underline">Comprador Premium</Link>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={revelar}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition"
    >
      <MessageCircle size={16} />
      {loading ? "Carregando..." : "Ver WhatsApp"}
    </button>
  );
}

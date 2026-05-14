"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Evento = {
  tipo: string;
  icon: string;
  titulo: string;
  descricao: string | null;
  user?: string;
  at: string;
};

const TIPO_COR: Record<string, string> = {
  cadastro:   "bg-green-100 text-green-700",
  anuncio:    "bg-blue-100 text-blue-700",
  negociacao: "bg-amber-100 text-amber-700",
  assinatura: "bg-purple-100 text-purple-700",
  avaliacao:  "bg-yellow-100 text-yellow-700",
};

function hora(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function AtividadesPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  async function carregar() {
    try {
      const { data } = await api.get<Evento[]>("/atividade");
      setEventos(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = filtro
    ? eventos.filter(e => e.tipo === filtro)
    : eventos;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Feed de Atividades</h1>
          <p className="text-xs text-slate-400 mt-0.5">Últimas 100 ações na plataforma em tempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "cadastro", "anuncio", "negociacao", "assinatura"].map(t => (
            <button key={t} onClick={() => setFiltro(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition ${filtro === t ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
              {t === "" ? "Todos" : t === "cadastro" ? "🎉 Cadastros" : t === "anuncio" ? "🐄 Anúncios" : t === "negociacao" ? "💬 Negociações" : "⭐ Assinaturas"}
            </button>
          ))}
          <button onClick={carregar} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            ↻ Atualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400">Nenhuma atividade encontrada.</div>
        ) : filtrados.map((e, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition">
            <span className="text-xl shrink-0 mt-0.5">{e.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800 truncate">{e.titulo}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TIPO_COR[e.tipo] ?? "bg-slate-100 text-slate-600"}`}>
                  {e.tipo}
                </span>
              </div>
              {e.user && <p className="text-xs text-slate-500 mt-0.5">👤 {e.user}</p>}
              {e.descricao && <p className="text-xs text-slate-400 mt-0.5 truncate">{e.descricao}</p>}
            </div>
            <span className="text-xs text-slate-400 shrink-0 mt-1">{hora(e.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

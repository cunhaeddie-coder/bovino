"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Avaliacao = {
  id: number;
  nota: number;
  comentario: string | null;
  negociacao_confirmada: boolean;
  created_at: string;
  vendedor: { id: number; nome: string };
  comprador: { id: number; nome: string };
  anuncio: { id: number; titulo: string; raca: string } | null;
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

function Estrelas({ nota }: { nota: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= nota ? "text-yellow-400" : "text-slate-200"}>★</span>
      ))}
    </span>
  );
}

export default function AvaliacoesPage() {
  const [data, setData] = useState<Paginated<Avaliacao> | null>(null);
  const [nota, setNota] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (nota) params.set("nota", nota);
    const { data: res } = await api.get(`/avaliacoes?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [nota]);

  async function remover(id: number) {
    if (!confirm("Remover esta avaliação?")) return;
    await api.delete(`/avaliacoes/${id}`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">⭐ Avaliações</h1>

      <div className="flex gap-2 flex-wrap">
        {["", "1", "2", "3", "4", "5"].map(n => (
          <button key={n} onClick={() => setNota(n)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${nota === n ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-green-400"}`}>
            {n === "" ? "Todas" : `${n} ★`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-10 text-slate-400">Carregando...</p>
        ) : data?.data.length === 0 ? (
          <p className="text-center py-10 text-slate-400">Nenhuma avaliação encontrada.</p>
        ) : data?.data.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Estrelas nota={a.nota} />
                  {a.negociacao_confirmada && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">✓ Compra verificada</span>
                  )}
                </div>
                {a.comentario && (
                  <p className="text-sm text-slate-700 mb-2">"{a.comentario}"</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                  <span>Comprador: <span className="text-slate-600 font-medium">{a.comprador.nome}</span></span>
                  <span>Vendedor: <span className="text-slate-600 font-medium">{a.vendedor.nome}</span></span>
                  {a.anuncio && <span>Anúncio: <span className="text-slate-600">{a.anuncio.titulo} ({a.anuncio.raca})</span></span>}
                  <span>{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <button onClick={() => remover(a.id)}
                className="text-xs text-red-400 hover:text-red-600 hover:underline shrink-0">
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between text-sm bg-white rounded-xl border border-slate-100 p-3">
          <span className="text-slate-400 text-xs">{data.total} avaliações · pág. {data.current_page}/{data.last_page}</span>
          <div className="flex gap-2">
            <button onClick={() => carregar(page - 1)} disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
            <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
          </div>
        </div>
      )}
    </div>
  );
}

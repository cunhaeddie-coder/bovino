"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Anuncio, Paginated } from "@/lib/types";

export default function AnunciosPage() {
  const [data, setData]     = useState<Paginated<Anuncio> | null>(null);
  const [busca, setBusca]   = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (busca)  params.set("busca", busca);
    if (status) params.set("status", status);
    const { data: res } = await api.get(`/anuncios?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [busca, status]);

  async function destacar(id: number) {
    await api.post(`/anuncios/${id}/destacar`);
    carregar(page);
  }

  async function remover(id: number) {
    if (!confirm("Remover este anúncio?")) return;
    await api.delete(`/anuncios/${id}`);
    carregar(page);
  }

  async function restaurar(id: number) {
    await api.post(`/anuncios/${id}/restaurar`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">Anúncios</h1>

      <div className="flex flex-wrap gap-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou vendedor..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-72" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="expirado">Expirados</option>
          <option value="removido">Removidos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Título</th>
                <th className="text-left px-3 py-3">Vendedor</th>
                <th className="text-left px-3 py-3">Animal</th>
                <th className="text-right px-3 py-3">Preço/cab.</th>
                <th className="text-right px-3 py-3">Views</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Data</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum anúncio.</td></tr>
              ) : data?.data.map((a) => {
                const removido = !!a.deleted_at;
                const expirado = a.expira_em && new Date(a.expira_em) < new Date();
                return (
                  <tr key={a.id} className={`border-t border-slate-50 hover:bg-slate-50 ${removido ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {a.destaque && <span className="text-yellow-500 text-xs">⭐</span>}
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">{a.titulo}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{a.user?.nome ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {a.animal ? `${a.animal.raca} · ${a.animal.quantidade} cab.` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {a.preco_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">{a.views}</td>
                    <td className="px-3 py-3">
                      {removido ? (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Removido</span>
                      ) : expirado ? (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Expirado</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-xs">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {removido ? (
                          <button onClick={() => restaurar(a.id)} className="text-xs text-green-600 hover:underline">Restaurar</button>
                        ) : (
                          <>
                            <button onClick={() => destacar(a.id)}
                              className={`text-xs hover:underline ${a.destaque ? "text-slate-400" : "text-yellow-500"}`}>
                              {a.destaque ? "Tirar destaque" : "Destacar"}
                            </button>
                            <button onClick={() => remover(a.id)} className="text-xs text-red-500 hover:underline">Remover</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">{data.total} anúncios · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

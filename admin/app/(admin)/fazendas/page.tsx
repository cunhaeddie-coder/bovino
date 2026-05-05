"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Fazenda = {
  id: number;
  nome: string;
  slug: string;
  estado: string;
  municipio: string;
  area_ha: number | null;
  ativo: boolean;
  rebanho_count: number;
  lotes_count: number;
  created_at: string;
  user: { id: number; nome: string; email: string; celular: string };
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

export default function FazendasPage() {
  const [data, setData] = useState<Paginated<Fazenda> | null>(null);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (busca) params.set("busca", busca);
    if (estado) params.set("estado", estado);
    const { data: res } = await api.get(`/fazendas?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [busca, estado]);

  async function toggleAtivo(id: number) {
    await api.post(`/fazendas/${id}/toggle-ativo`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">🌾 Fazendas</h1>

      <div className="flex flex-wrap gap-3">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou município..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-green-500" />
        <input value={estado} onChange={e => setEstado(e.target.value.toUpperCase().slice(0,2))}
          placeholder="UF (ex: GO)"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Fazenda</th>
                <th className="text-left px-3 py-3">Proprietário</th>
                <th className="text-left px-3 py-3">Localização</th>
                <th className="text-right px-3 py-3">Rebanho</th>
                <th className="text-right px-3 py-3">Lotes</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Cadastro</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhuma fazenda encontrada.</td></tr>
              ) : data?.data.map(f => (
                <tr key={f.id} className={`border-t border-slate-50 hover:bg-slate-50 ${!f.ativo ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{f.nome}</p>
                    <p className="text-xs text-slate-400">/{f.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-slate-700">{f.user.nome}</p>
                    <p className="text-xs text-slate-400">{f.user.email}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-xs">
                    {f.municipio} — {f.estado}
                    {f.area_ha && <p>{f.area_ha.toLocaleString("pt-BR")} ha</p>}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{f.rebanho_count}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{f.lotes_count}</td>
                  <td className="px-3 py-3">
                    {f.ativo
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativa</span>
                      : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => toggleAtivo(f.id)}
                      className={`text-xs hover:underline ${f.ativo ? "text-orange-500" : "text-green-600"}`}>
                      {f.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">{data.total} fazendas · pág. {data.current_page}/{data.last_page}</span>
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

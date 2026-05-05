"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Visita = {
  id: number;
  data_solicitada: string;
  hora_solicitada: string | null;
  data_confirmada: string | null;
  status: string;
  mensagem: string | null;
  created_at: string;
  anuncio: { id: number; titulo: string; raca: string } | null;
  comprador: { id: number; nome: string; celular: string };
  vendedor: { id: number; nome: string; celular: string };
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

const STATUS_COR: Record<string, string> = {
  pendente:   "bg-yellow-100 text-yellow-700",
  confirmada: "bg-green-100 text-green-700",
  recusada:   "bg-red-100 text-red-500",
  cancelada:  "bg-slate-100 text-slate-500",
  realizada:  "bg-blue-100 text-blue-700",
};

export default function VisitasPage() {
  const [data, setData] = useState<Paginated<Visita> | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status) params.set("status", status);
    const { data: res } = await api.get(`/visitas?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [status]);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">📅 Visitas</h1>

      <div className="flex gap-2 flex-wrap">
        {["", "pendente", "confirmada", "recusada", "cancelada", "realizada"].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${status === s ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-green-400"}`}>
            {s === "" ? "Todas" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Anúncio</th>
                <th className="text-left px-3 py-3">Comprador</th>
                <th className="text-left px-3 py-3">Vendedor</th>
                <th className="text-left px-3 py-3">Data solicitada</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Solicitado em</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhuma visita encontrada.</td></tr>
              ) : data?.data.map(v => (
                <tr key={v.id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{v.anuncio?.titulo ?? "—"}</p>
                    <p className="text-xs text-slate-400">{v.anuncio?.raca}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-slate-700">{v.comprador.nome}</p>
                    <p className="text-xs text-slate-400">{v.comprador.celular}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-slate-700">{v.vendedor.nome}</p>
                    <p className="text-xs text-slate-400">{v.vendedor.celular}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-xs">
                    {new Date(v.data_solicitada).toLocaleDateString("pt-BR")}
                    {v.hora_solicitada && ` ${v.hora_solicitada.slice(0,5)}`}
                    {v.data_confirmada && (
                      <p className="text-green-600">✓ {new Date(v.data_confirmada).toLocaleDateString("pt-BR")}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COR[v.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{data.total} visitas · pág. {data.current_page}/{data.last_page}</span>
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

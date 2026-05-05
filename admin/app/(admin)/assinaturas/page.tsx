"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Assinatura, Paginated } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  ativa:      "bg-green-100 text-green-700",
  pendente:   "bg-yellow-100 text-yellow-700",
  cancelada:  "bg-slate-100 text-slate-500",
  expirada:   "bg-red-100 text-red-500",
};

export default function AssinaturasPage() {
  const [data, setData]     = useState<Paginated<Assinatura> | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status) params.set("status", status);
    const { data: res } = await api.get(`/assinaturas?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [status]);

  async function cancelar(id: number) {
    if (!confirm("Cancelar esta assinatura?")) return;
    await api.post(`/assinaturas/${id}/cancelar`);
    carregar(page);
  }

  async function ativar(id: number) {
    await api.post(`/assinaturas/${id}/ativar`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">Assinaturas</h1>

      <div className="flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os status</option>
          <option value="ativa">Ativas</option>
          <option value="pendente">Pendentes</option>
          <option value="cancelada">Canceladas</option>
          <option value="expirada">Expiradas</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Plano</th>
                <th className="text-right px-3 py-3">Valor</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Início</th>
                <th className="text-left px-3 py-3">Expira</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma assinatura.</td></tr>
              ) : data?.data.map((a) => (
                <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">
                      {a.assinante?.nome ?? a.assinante?.empresa ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">{a.assinante?.email}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700 font-medium text-xs">{a.plano?.nome ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">
                    {a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {a.inicia_em ? new Date(a.inicia_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {a.expira_em ? new Date(a.expira_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {a.status !== "ativa" && (
                        <button onClick={() => ativar(a.id)} className="text-xs text-green-600 hover:underline">Ativar</button>
                      )}
                      {a.status === "ativa" && (
                        <button onClick={() => cancelar(a.id)} className="text-xs text-red-500 hover:underline">Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{data.total} registros · pág. {data.current_page}/{data.last_page}</span>
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

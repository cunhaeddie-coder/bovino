"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Pagamento, Paginated } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  aprovado:    "bg-green-100 text-green-700",
  pendente:    "bg-yellow-100 text-yellow-700",
  recusado:    "bg-red-100 text-red-600",
  reembolsado: "bg-purple-100 text-purple-600",
};

export default function PagamentosPage() {
  const [data, setData]     = useState<Paginated<Pagamento> | null>(null);
  const [status, setStatus] = useState("");
  const [de, setDe]         = useState("");
  const [ate, setAte]       = useState("");
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status) params.set("status", status);
    if (de)     params.set("de", de);
    if (ate)    params.set("ate", ate);
    const { data: res } = await api.get(`/pagamentos?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [status, de, ate]);

  const totalAprovado = data?.data
    .filter((p) => p.status === "aprovado")
    .reduce((acc, p) => acc + p.valor, 0) ?? 0;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">Pagamentos</h1>

      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os status</option>
          <option value="aprovado">Aprovados</option>
          <option value="pendente">Pendentes</option>
          <option value="recusado">Recusados</option>
          <option value="reembolsado">Reembolsados</option>
        </select>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        {(de || ate) && (
          <button onClick={() => { setDe(""); setAte(""); }} className="text-xs text-slate-400 hover:text-slate-600">Limpar datas</button>
        )}
      </div>

      {data && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm text-green-700 font-medium">Total aprovado nesta página:</span>
          <span className="text-lg font-extrabold text-green-800">
            {totalAprovado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Plano</th>
                <th className="text-right px-3 py-3">Valor</th>
                <th className="text-left px-3 py-3">Método</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Pago em</th>
                <th className="text-left px-5 py-3">Gateway ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum pagamento.</td></tr>
              ) : data?.data.map((p) => (
                <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">
                      {p.assinatura?.assinante?.nome ?? p.assinatura?.assinante?.empresa ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{p.assinatura?.plano?.nome ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">
                    {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs capitalize">{p.metodo ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {p.pago_em ? new Date(p.pago_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-xs font-mono truncate max-w-[120px]">{p.gateway_id}</td>
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

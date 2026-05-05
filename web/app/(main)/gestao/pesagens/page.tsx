"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Pesagem = {
  id: number;
  peso: number;
  data_pesagem: string;
  gmd: number | null;
  observacao: string | null;
  animal?: { id: number; brinco: string | null; nome: string | null; raca: string } | null;
  lote?: { id: number; nome: string } | null;
};

export default function PesagensPage() {
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ peso: "", data_pesagem: new Date().toISOString().slice(0, 10), observacao: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    api.get("/gestao/pesagens").then(r => setPesagens(r.data.data ?? r.data)).finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/gestao/pesagens", { ...form, peso: Number(form.peso) });
      setShowForm(false);
      setForm({ peso: "", data_pesagem: new Date().toISOString().slice(0, 10), observacao: "" });
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir pesagem?")) return;
    await api.delete(`/gestao/pesagens/${id}`);
    carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">⚖️ Pesagens</h1>
        <button onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Registrar pesagem
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nova pesagem</h2>
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Peso (kg) *</label>
                <input required type="number" step="0.1" value={form.peso} onChange={e => setForm(f => ({...f, peso: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="450" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Data *</label>
                <input required type="date" value={form.data_pesagem} onChange={e => setForm(f => ({...f, data_pesagem: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observação</label>
                <input value={form.observacao} onChange={e => setForm(f => ({...f, observacao: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Pesagem do lote boi gordo" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm disabled:opacity-60">
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : pesagens.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-gray-500 font-medium">Nenhuma pesagem registrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Animal / Lote</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Peso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">GMD</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pesagens.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(p.data_pesagem).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    {p.animal ? (
                      <span className="font-medium">{p.animal.brinco || p.animal.nome || "—"} <span className="text-gray-400 text-xs">({p.animal.raca})</span></span>
                    ) : p.lote ? (
                      <span className="text-gray-600">{p.lote.nome}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-700">{p.peso} kg</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {p.gmd != null ? (
                      <span className={`text-xs font-semibold ${p.gmd >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {p.gmd >= 0 ? "+" : ""}{p.gmd.toFixed(3)} kg/dia
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => excluir(p.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

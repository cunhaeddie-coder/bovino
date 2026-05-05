"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Animal = {
  id: number;
  brinco: string | null;
  nome: string | null;
  raca: string;
  sexo: "macho" | "femea";
  categoria: string;
  data_nascimento: string | null;
  peso_atual: number | null;
  status: string;
  pastagem?: { nome: string } | null;
};

const CATEGORIAS = ["bezerro","bezerra","novilho","novilha","touro","vaca","boi"];

export default function AnimaisPage() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ categoria: "", sexo: "", status: "ativo" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ brinco: "", nome: "", raca: "", sexo: "macho", categoria: "bezerro", data_nascimento: "", peso_atual: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtro).filter(([,v]) => v)));
    api.get(`/gestao/rebanho?${params}`).then(r => setAnimais(r.data.data ?? r.data)).finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [filtro]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/gestao/rebanho", form);
      setShowForm(false);
      setForm({ brinco: "", nome: "", raca: "", sexo: "macho", categoria: "bezerro", data_nascimento: "", peso_atual: "", observacao: "" });
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🐄 Rebanho</h1>
        <button onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Adicionar animal
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtro.categoria} onChange={e => setFiltro(f => ({ ...f, categoria: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtro.sexo} onChange={e => setFiltro(f => ({ ...f, sexo: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">Ambos sexos</option>
          <option value="macho">Machos</option>
          <option value="femea">Fêmeas</option>
        </select>
        <select value={filtro.status} onChange={e => setFiltro(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="ativo">Ativos</option>
          <option value="vendido">Vendidos</option>
          <option value="morto">Mortos</option>
        </select>
      </div>

      {/* Modal de cadastro */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Novo animal</h2>
              <form onSubmit={salvar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Brinco</label>
                    <input value={form.brinco} onChange={e => setForm(f => ({...f, brinco: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: A001" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Nome (opcional)</label>
                    <input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Estrela" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Raça *</label>
                    <input required value={form.raca} onChange={e => setForm(f => ({...f, raca: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nelore" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Sexo *</label>
                    <select required value={form.sexo} onChange={e => setForm(f => ({...f, sexo: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="macho">Macho</option>
                      <option value="femea">Fêmea</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                    <select required value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Peso atual (kg)</label>
                    <input type="number" value={form.peso_atual} onChange={e => setForm(f => ({...f, peso_atual: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="280" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Data de nascimento</label>
                    <input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({...f, data_nascimento: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando}
                    className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800 disabled:opacity-60">
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : animais.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-gray-500 font-medium">Nenhum animal cadastrado</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-green-700 text-sm font-semibold hover:underline">
            Adicionar o primeiro animal →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Brinco / Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Raça</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Peso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Pastagem</th>
              </tr>
            </thead>
            <tbody>
              {animais.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{a.brinco || "—"}</p>
                    {a.nome && <p className="text-xs text-gray-400">{a.nome}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.raca}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell capitalize">{a.categoria}</td>
                  <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                    {a.peso_atual ? `${a.peso_atual} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {a.pastagem?.nome ?? "—"}
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

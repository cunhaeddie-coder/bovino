"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  { element: "#nutricional-header", popover: { title: "🌿 Plano Nutricional", description: "Crie e gerencie protocolos alimentares por categoria de animal. Registre os ingredientes, quantidades e custo estimado por animal por dia.", side: "bottom" } },
  { element: "#nutricional-lista", popover: { title: "📋 Planos ativos", description: "Cada plano pode ser expandido para ver os ingredientes. Clique no plano para editar ou desativar. O custo diário por animal ajuda a calcular o custo total do lote.", side: "top" } },
  { element: "#btn-novo-plano", popover: { title: "➕ Criar plano", description: "Defina nome, categoria (novilho, boi gordo, etc.), custo por animal/dia e a lista detalhada de ingredientes com quantidades e unidades.", side: "bottom" } },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Item = { id?: number; ingrediente: string; quantidade_por_animal: string; unidade: string; custo_estimado: string };
type Plano = {
  id: number; nome: string; categoria: string;
  custo_diario_animal: number | null; descricao: string | null; ativo: boolean;
  itens: { id: number; ingrediente: string; quantidade_por_animal: number; unidade: string; custo_estimado: number | null }[];
};

const CATS = ["bezerro","novilho","novilha","boi_gordo","vaca","touro","misto"];
const CAT_LABEL: Record<string, string> = {
  bezerro:"Bezerro", novilho:"Novilho", novilha:"Novilha",
  boi_gordo:"Boi Gordo", vaca:"Vaca", touro:"Touro", misto:"Misto",
};
const CAT_COR: Record<string, string> = {
  bezerro:"bg-yellow-100 text-yellow-700", novilho:"bg-orange-100 text-orange-700",
  novilha:"bg-pink-100 text-pink-700", boi_gordo:"bg-green-100 text-green-700",
  vaca:"bg-purple-100 text-purple-700", touro:"bg-blue-100 text-blue-700",
  misto:"bg-gray-100 text-gray-600",
};

const ITEM_VAZIO: Item = { ingrediente: "", quantidade_por_animal: "", unidade: "kg", custo_estimado: "" };

export default function PlanoNutricionalPage() {
  const [planos, setPlanos]     = useState<Plano[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  const [form, setForm] = useState({
    nome: "", categoria: "boi_gordo",
    custo_diario_animal: "", descricao: "",
  });
  const [itens, setItens] = useState<Item[]>([{ ...ITEM_VAZIO }]);

  async function carregar() {
    setLoading(true);
    api.get<Plano[]>("/gestao/nutricional")
      .then(r => setPlanos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", categoria: "boi_gordo", custo_diario_animal: "", descricao: "" });
    setItens([{ ...ITEM_VAZIO }]);
    setShowForm(true);
  }

  function abrirEditar(p: Plano) {
    setEditando(p);
    setForm({
      nome: p.nome, categoria: p.categoria,
      custo_diario_animal: p.custo_diario_animal ? String(p.custo_diario_animal) : "",
      descricao: p.descricao ?? "",
    });
    setItens(p.itens.length > 0
      ? p.itens.map(i => ({ ingrediente: i.ingrediente, quantidade_por_animal: String(i.quantidade_por_animal), unidade: i.unidade, custo_estimado: i.custo_estimado ? String(i.custo_estimado) : "" }))
      : [{ ...ITEM_VAZIO }]);
    setShowForm(true);
  }

  function setItem(idx: number, key: keyof Item, val: string) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    const payload = {
      ...form,
      custo_diario_animal: form.custo_diario_animal ? Number(form.custo_diario_animal) : null,
      itens: itens.filter(i => i.ingrediente).map(i => ({
        ingrediente: i.ingrediente,
        quantidade_por_animal: Number(i.quantidade_por_animal),
        unidade: i.unidade,
        custo_estimado: i.custo_estimado ? Number(i.custo_estimado) : null,
      })),
    };
    try {
      if (editando) await api.put(`/gestao/nutricional/${editando.id}`, payload);
      else          await api.post("/gestao/nutricional", payload);
      setShowForm(false); carregar();
    } finally { setSalvando(false); }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este plano nutricional?")) return;
    await api.delete(`/gestao/nutricional/${id}`);
    carregar();
  }

  return (
    <div className="space-y-5">
      <div id="nutricional-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🌿 Plano Nutricional</h1>
          <p className="text-sm text-gray-500">Gerencie dietas e protocolos alimentares por categoria</p>
        </div>
        <button id="btn-novo-plano" onClick={abrirNovo}
          className="bg-lime-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-lime-700 transition">
          + Novo plano
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : planos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🌿</p>
          <p className="text-gray-500 font-medium">Nenhum plano nutricional cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Crie planos alimentares com ingredientes e custo estimado por animal/dia</p>
          <button onClick={abrirNovo} className="mt-4 text-lime-600 text-sm font-semibold hover:underline">Criar primeiro plano →</button>
        </div>
      ) : (
        <div id="nutricional-lista" className="space-y-3">
          {planos.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandido(expandido === p.id ? null : p.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{p.nome}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COR[p.categoria]}`}>
                        {CAT_LABEL[p.categoria]}
                      </span>
                      {!p.ativo && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inativo</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.itens.length} ingrediente{p.itens.length !== 1 ? "s" : ""}
                      {p.custo_diario_animal && ` · ${fmt(p.custo_diario_animal)}/animal/dia`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); abrirEditar(p); }}
                    className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">✏️</button>
                  <button onClick={e => { e.stopPropagation(); excluir(p.id); }}
                    className="text-xs px-2.5 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">🗑</button>
                  <span className="text-gray-400 text-sm">{expandido === p.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expandido */}
              {expandido === p.id && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {p.descricao && <p className="text-sm text-gray-600 italic">{p.descricao}</p>}
                  {p.itens.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                          <th className="text-left py-1.5">Ingrediente</th>
                          <th className="text-right py-1.5">Qtd/animal</th>
                          <th className="text-right py-1.5">Un.</th>
                          <th className="text-right py-1.5">Custo est.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {p.itens.map(it => (
                          <tr key={it.id}>
                            <td className="py-1.5 font-medium text-gray-800">{it.ingrediente}</td>
                            <td className="py-1.5 text-right text-gray-600">{it.quantidade_por_animal}</td>
                            <td className="py-1.5 text-right text-gray-400">{it.unidade}</td>
                            <td className="py-1.5 text-right text-green-700">{it.custo_estimado ? fmt(it.custo_estimado) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Nenhum ingrediente cadastrado</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{editando ? "Editar plano" : "Novo plano nutricional"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do plano *</label>
                  <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Ex: Engorda intensiva nelore" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                    {CATS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Custo estimado (R$/animal/dia)</label>
                  <input type="number" step="0.01" min="0" value={form.custo_diario_animal}
                    onChange={e => setForm(f => ({ ...f, custo_diario_animal: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Ex: 8.50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                    placeholder="Observações sobre o protocolo alimentar..." />
                </div>
              </div>

              {/* Ingredientes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Ingredientes</label>
                  <button type="button" onClick={() => setItens(prev => [...prev, { ...ITEM_VAZIO }])}
                    className="text-xs text-lime-600 font-semibold hover:underline">+ Adicionar</button>
                </div>
                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                      <input value={it.ingrediente} onChange={e => setItem(idx, "ingrediente", e.target.value)}
                        placeholder="Ingrediente (ex: milho moído)"
                        className="col-span-5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                      <input type="number" step="0.01" min="0" value={it.quantidade_por_animal}
                        onChange={e => setItem(idx, "quantidade_por_animal", e.target.value)}
                        placeholder="Qtd"
                        className="col-span-2 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                      <select value={it.unidade} onChange={e => setItem(idx, "unidade", e.target.value)}
                        className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                        {["kg","g","l","ml","un"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" value={it.custo_estimado}
                        onChange={e => setItem(idx, "custo_estimado", e.target.value)}
                        placeholder="R$"
                        className="col-span-2 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                      <button type="button" onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                        className="col-span-1 text-red-400 hover:text-red-600 text-center">✕</button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Qtd | Un. | Custo estimado por animal/dia</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-lime-600 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-lime-700 disabled:opacity-60">
                  {salvando ? "Salvando..." : editando ? "Salvar" : "Criar plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <TourButton tourKey="nutricional" steps={TOUR_STEPS} />
    </div>
  );
}

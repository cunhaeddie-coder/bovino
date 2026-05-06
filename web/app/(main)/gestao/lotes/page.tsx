"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#btn-novo-lote",
    popover: {
      title: "🗂️ Criar lote",
      description: "Agrupe animais em lotes para facilitar o manejo e a venda. Defina nome, raça, categoria, quantidade, peso médio e preço por arroba.",
      side: "bottom",
    },
  },
  {
    element: "#filtros-lotes",
    popover: {
      title: "🔍 Filtrar por status",
      description: "Filtre os lotes por status: Disponível (à venda), Reservado (negociação em andamento), Vendido ou Interno (uso próprio).",
      side: "bottom",
    },
  },
  {
    element: "#grid-lotes",
    popover: {
      title: "📦 Seus lotes",
      description: "Cada card mostra o resumo do lote. Clique em '📢 Publicar como anúncio' para colocar o lote à venda no marketplace automaticamente.",
      side: "top",
    },
  },
];

type Lote = {
  id: number;
  nome: string;
  raca: string | null;
  categoria: string;
  qtd_cabecas: number;
  peso_medio: number | null;
  preco_arroba: number | null;
  status: "disponivel" | "reservado" | "vendido" | "interno";
  animais_count?: number;
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  disponivel: { label: "Disponível", cor: "bg-green-100 text-green-700" },
  reservado:  { label: "Reservado",  cor: "bg-yellow-100 text-yellow-700" },
  vendido:    { label: "Vendido",    cor: "bg-gray-100 text-gray-500" },
  interno:    { label: "Interno",    cor: "bg-blue-100 text-blue-700" },
};

const CATEGORIAS = ["bezerro","novilho","novilha","boi_gordo","vaca","touro","misto"];

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", raca: "", categoria: "boi_gordo", qtd_cabecas: "", peso_medio: "", preco_arroba: "", status: "disponivel", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const params = filtroStatus ? `?status=${filtroStatus}` : "";
    api.get(`/gestao/lotes${params}`).then(r => setLotes(r.data)).finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/gestao/lotes", {
        ...form,
        qtd_cabecas: Number(form.qtd_cabecas),
        peso_medio: form.peso_medio ? Number(form.peso_medio) : null,
        preco_arroba: form.preco_arroba ? Number(form.preco_arroba) : null,
      });
      setShowForm(false);
      setForm({ nome: "", raca: "", categoria: "boi_gordo", qtd_cabecas: "", peso_medio: "", preco_arroba: "", status: "disponivel", observacao: "" });
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function publicar(id: number) {
    const { data } = await api.get(`/gestao/lotes/${id}/publicar`);
    const params = new URLSearchParams({
      raca: data.raca ?? "",
      quantidade: String(data.quantidade ?? ""),
      estado: data.estado ?? "",
      municipio: data.municipio ?? "",
      propriedade: data.propriedade ?? "",
      lote_id: String(data.lote_id),
    });
    window.location.href = `/anuncios/novo?${params}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🗂️ Lotes</h1>
        <button id="btn-novo-lote" onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Novo lote
        </button>
      </div>

      {/* Filtros */}
      <div id="filtros-lotes" className="flex gap-2">
        {["", "disponivel", "reservado", "vendido", "interno"].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filtroStatus === s ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
            {s === "" ? "Todos" : STATUS_LABEL[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Novo lote</h2>
              <form onSubmit={salvar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do lote *</label>
                    <input required value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Lote Boi Gordo Março" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Raça</label>
                    <input value={form.raca} onChange={e => setForm(f => ({...f, raca: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nelore" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                    <select required value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Qtd. cabeças *</label>
                    <input required type="number" value={form.qtd_cabecas} onChange={e => setForm(f => ({...f, qtd_cabecas: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="50" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Peso médio (kg)</label>
                    <input type="number" value={form.peso_medio} onChange={e => setForm(f => ({...f, peso_medio: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="450" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Preço/@</label>
                    <input type="number" value={form.preco_arroba} onChange={e => setForm(f => ({...f, preco_arroba: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="320" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="disponivel">Disponível</option>
                      <option value="reservado">Reservado</option>
                      <option value="interno">Interno</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
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
      ) : lotes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-gray-500 font-medium">Nenhum lote cadastrado</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-green-700 text-sm font-semibold hover:underline">Criar o primeiro lote →</button>
        </div>
      ) : (
        <div id="grid-lotes" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map(lote => {
            const st = STATUS_LABEL[lote.status];
            return (
              <div key={lote.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 leading-tight">{lote.nome}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.cor}`}>{st.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-gray-400">Raça:</span> <span className="font-medium">{lote.raca || "—"}</span></div>
                  <div><span className="text-gray-400">Categoria:</span> <span className="font-medium capitalize">{lote.categoria.replace("_"," ")}</span></div>
                  <div><span className="text-gray-400">Cabeças:</span> <span className="font-bold text-green-700">{lote.qtd_cabecas}</span></div>
                  <div><span className="text-gray-400">Peso médio:</span> <span className="font-medium">{lote.peso_medio ? `${lote.peso_medio} kg` : "—"}</span></div>
                  {lote.preco_arroba && (
                    <div className="col-span-2"><span className="text-gray-400">Preço/@:</span> <span className="font-bold text-green-700">R$ {lote.preco_arroba.toFixed(2)}</span></div>
                  )}
                </div>
                {lote.status === "disponivel" && (
                  <button onClick={() => publicar(lote.id)}
                    className="w-full border border-green-700 text-green-700 text-xs font-semibold py-2 rounded-full hover:bg-green-50 transition">
                    📢 Publicar como anúncio
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TourButton tourKey="gestao-lotes" steps={TOUR_STEPS} />
    </div>
  );
}

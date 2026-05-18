"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  { element: "#genetica-header", popover: { title: "🧬 Banco Genético", description: "Controle o estoque de sêmen dos seus touros. Registre doses compradas, acompanhe o saldo e registre cada inseminação realizada.", side: "bottom" } },
  { element: "#genetica-grid", popover: { title: "🐂 Cards de touros", description: "Cada card mostra o touro, raça, RGD, fabricante e a barra de estoque (verde >50%, amarelo >20%, vermelho ≤20%). Clique em 'Usar dose' ao realizar uma inseminação.", side: "top" } },
  { element: "#btn-add-semen", popover: { title: "➕ Cadastrar sêmen", description: "Registre um novo touro informando nome, raça, RGD, fabricante, número da partida e quantidade de doses adquiridas.", side: "bottom" } },
];

type Semen = {
  id: number;
  touro_nome: string;
  raca: string | null;
  rgd: string | null;
  fabricante: string | null;
  qtd_doses_total: number;
  qtd_doses_atual: number;
  partida: string | null;
  observacao: string | null;
};

const FORM_VAZIO = {
  touro_nome: "", raca: "", rgd: "", fabricante: "",
  qtd_doses_total: "", qtd_doses_atual: "", partida: "", observacao: "",
};

export default function BancoGeneticoPage() {
  const [itens, setItens]         = useState<Semen[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editando, setEditando]   = useState<Semen | null>(null);
  const [form, setForm]           = useState(FORM_VAZIO);
  const [salvando, setSalvando]   = useState(false);
  const [usandoId, setUsandoId]   = useState<number | null>(null);
  const [qtdUsar, setQtdUsar]     = useState("1");

  async function carregar() {
    setLoading(true);
    api.get<Semen[]>("/gestao/genetica")
      .then(r => setItens(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditando(null); setForm(FORM_VAZIO); setShowForm(true);
  }

  function abrirEditar(s: Semen) {
    setEditando(s);
    setForm({
      touro_nome: s.touro_nome, raca: s.raca ?? "", rgd: s.rgd ?? "",
      fabricante: s.fabricante ?? "", qtd_doses_total: String(s.qtd_doses_total),
      qtd_doses_atual: String(s.qtd_doses_atual), partida: s.partida ?? "",
      observacao: s.observacao ?? "",
    });
    setShowForm(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    const payload = {
      ...form,
      qtd_doses_total: Number(form.qtd_doses_total),
      qtd_doses_atual: Number(form.qtd_doses_atual),
    };
    try {
      if (editando) { await api.put(`/gestao/genetica/${editando.id}`, payload); }
      else          { await api.post("/gestao/genetica", payload); }
      setShowForm(false); carregar();
    } finally { setSalvando(false); }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este registro do banco genético?")) return;
    await api.delete(`/gestao/genetica/${id}`);
    carregar();
  }

  async function usarDose(id: number) {
    await api.post(`/gestao/genetica/${id}/usar`, { qtd: Number(qtdUsar) });
    setUsandoId(null); setQtdUsar("1"); carregar();
  }

  function set(k: keyof typeof FORM_VAZIO, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const totalDoses = itens.reduce((s, i) => s + i.qtd_doses_atual, 0);

  return (
    <div className="space-y-5">
      <div id="genetica-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🧬 Banco Genético</h1>
          <p className="text-sm text-gray-500">Estoque de sêmen · {totalDoses} doses disponíveis</p>
        </div>
        <button onClick={abrirNovo}
          id="btn-add-semen"
          className="bg-pink-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-pink-700 transition">
          + Novo touro
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🧬</p>
          <p className="text-gray-500 font-medium">Nenhum sêmen cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre touros e o estoque de doses para controlar o banco genético</p>
          <button onClick={abrirNovo} className="mt-4 text-pink-600 text-sm font-semibold hover:underline">
            Cadastrar primeiro touro →
          </button>
        </div>
      ) : (
        <div id="genetica-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itens.map(s => {
            const pctEstoque = s.qtd_doses_total > 0 ? (s.qtd_doses_atual / s.qtd_doses_total) * 100 : 0;
            const corEstoque = pctEstoque > 50 ? "bg-green-500" : pctEstoque > 20 ? "bg-yellow-500" : "bg-red-500";

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{s.touro_nome}</p>
                    <div className="flex gap-1.5 flex-wrap mt-0.5">
                      {s.raca && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">{s.raca}</span>}
                      {s.rgd  && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">RGD: {s.rgd}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-extrabold ${s.qtd_doses_atual === 0 ? "text-red-500" : "text-gray-900"}`}>
                      {s.qtd_doses_atual}
                    </p>
                    <p className="text-[10px] text-gray-400">doses</p>
                  </div>
                </div>

                {/* Barra de estoque */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Estoque</span>
                    <span>{s.qtd_doses_atual} / {s.qtd_doses_total} doses</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${corEstoque}`} style={{ width: `${pctEstoque}%` }} />
                  </div>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 space-y-0.5">
                  {s.fabricante && <p>Fabricante: <span className="text-gray-700">{s.fabricante}</span></p>}
                  {s.partida    && <p>Partida: <span className="text-gray-700">{s.partida}</span></p>}
                  {s.observacao && <p className="text-gray-400 italic truncate">{s.observacao}</p>}
                </div>

                {/* Ações */}
                {usandoId === s.id ? (
                  <div className="flex gap-2 items-center">
                    <input type="number" min="1" max={s.qtd_doses_atual} value={qtdUsar}
                      onChange={e => setQtdUsar(e.target.value)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                    <span className="text-xs text-gray-500">doses</span>
                    <button onClick={() => usarDose(s.id)}
                      className="flex-1 bg-pink-600 text-white text-xs font-bold py-1.5 rounded-full">
                      Confirmar
                    </button>
                    <button onClick={() => setUsandoId(null)} className="text-gray-400 text-sm">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setUsandoId(s.id); setQtdUsar("1"); }}
                      disabled={s.qtd_doses_atual === 0}
                      className="flex-1 bg-pink-50 border border-pink-200 text-pink-700 text-xs font-semibold py-1.5 rounded-full hover:bg-pink-100 disabled:opacity-40">
                      💉 Usar dose
                    </button>
                    <button onClick={() => abrirEditar(s)}
                      className="px-3 border border-gray-200 text-gray-600 text-xs font-semibold py-1.5 rounded-full hover:bg-gray-50">
                      ✏️
                    </button>
                    <button onClick={() => excluir(s.id)}
                      className="px-3 border border-red-100 text-red-400 text-xs font-semibold py-1.5 rounded-full hover:bg-red-50">
                      🗑
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editando ? "Editar sêmen" : "Novo sêmen"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do touro *</label>
                  <input required value={form.touro_nome} onChange={e => set("touro_nome", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Ex: Nelore Prime FIV" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Raça</label>
                  <input value={form.raca} onChange={e => set("raca", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Nelore" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">RGD</label>
                  <input value={form.rgd} onChange={e => set("rgd", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Registro genealógico" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Fabricante</label>
                  <input value={form.fabricante} onChange={e => set("fabricante", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Central de IA" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Partida / Lote</label>
                  <input value={form.partida} onChange={e => set("partida", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Ex: 2025-A" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Doses compradas</label>
                  <input type="number" min="0" required value={form.qtd_doses_total} onChange={e => set("qtd_doses_total", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Doses em estoque</label>
                  <input type="number" min="0" required value={form.qtd_doses_atual} onChange={e => set("qtd_doses_atual", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="100" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Observação</label>
                  <input value={form.observacao} onChange={e => set("observacao", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Notas adicionais" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-pink-600 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-pink-700 disabled:opacity-60">
                  {salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <TourButton tourKey="genetica" steps={TOUR_STEPS} />
    </div>
  );
}

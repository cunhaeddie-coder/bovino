"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Plano = {
  id: number;
  slug: string;
  nome: string;
  tipo: string;
  preco: number;
  preco_anual: number | null;
  max_cabecas: number | null;
  max_anuncios: number;
  max_destaques: number;
  suporte_prioritario: boolean;
  ativo: boolean;
  ordem: number;
  assinaturas_count: number;
  recursos: string[];
};

const TIPO_LABEL: Record<string, string> = {
  produtor:    "Produtor",
  comprador:   "Comprador",
  anunciante:  "Anunciante",
};

const TIPO_COLOR: Record<string, string> = {
  produtor:   "bg-green-100 text-green-700",
  comprador:  "bg-blue-100 text-blue-700",
  anunciante: "bg-purple-100 text-purple-700",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function EditModal({ plano, onClose, onSaved }: { plano: Plano; onClose: () => void; onSaved: (p: Plano) => void }) {
  const [form, setForm] = useState({
    nome:        plano.nome,
    preco:       String(plano.preco),
    preco_anual: plano.preco_anual != null ? String(plano.preco_anual) : "",
    max_cabecas: plano.max_cabecas != null ? String(plano.max_cabecas) : "",
    recursos:    plano.recursos.join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const { data } = await api.put(`/planos/${plano.id}`, {
        nome:        form.nome,
        preco:       Number(form.preco),
        preco_anual: form.preco_anual ? Number(form.preco_anual) : null,
        max_cabecas: form.max_cabecas ? Number(form.max_cabecas) : null,
        recursos:    form.recursos.split("\n").map(r => r.trim()).filter(Boolean),
      });
      onSaved(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Editar plano</h2>
            <p className="text-xs text-slate-400">{plano.slug}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome</label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço mensal (R$)</label>
              <input type="number" step="0.01" value={form.preco}
                onChange={e => setForm(p => ({ ...p, preco: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço anual (R$)</label>
              <input type="number" step="0.01" value={form.preco_anual}
                onChange={e => setForm(p => ({ ...p, preco_anual: e.target.value }))}
                placeholder="Deixe vazio para não oferecer"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Limite de cabeças</label>
            <input type="number" value={form.max_cabecas}
              onChange={e => setForm(p => ({ ...p, max_cabecas: e.target.value }))}
              placeholder="Deixe vazio para ilimitado"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Recursos <span className="font-normal text-slate-400">(um por linha)</span>
            </label>
            <textarea value={form.recursos} onChange={e => setForm(p => ({ ...p, recursos: e.target.value }))}
              rows={8} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 font-mono" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Plano | null>(null);

  async function carregar() {
    setLoading(true);
    const { data } = await api.get("/planos");
    setPlanos(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function toggleAtivo(plano: Plano) {
    const { data } = await api.post(`/planos/${plano.id}/toggle-ativo`);
    setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, ativo: data.ativo } : p));
  }

  function onSaved(atualizado: Plano) {
    setPlanos(prev => prev.map(p => p.id === atualizado.id ? { ...p, ...atualizado } : p));
  }

  const grupos = planos.reduce<Record<string, Plano[]>>((acc, p) => {
    acc[p.tipo] = [...(acc[p.tipo] ?? []), p];
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Planos</h1>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {planos.filter(p => p.ativo).length} ativos · {planos.length} total
        </span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : (
        Object.entries(grupos).map(([tipo, lista]) => (
          <section key={tipo}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TIPO_COLOR[tipo] ?? "bg-slate-100 text-slate-600"}`}>
                {TIPO_LABEL[tipo] ?? tipo}
              </span>
              <span className="text-xs text-slate-400">{lista.length} plano(s)</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Plano</th>
                    <th className="text-right px-3 py-3">Mensal</th>
                    <th className="text-right px-3 py-3">Anual</th>
                    <th className="text-right px-3 py-3">Limite cab.</th>
                    <th className="text-right px-3 py-3">Assinantes</th>
                    <th className="text-center px-3 py-3">Status</th>
                    <th className="text-right px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(p => (
                    <tr key={p.id} className={`border-t border-slate-50 hover:bg-slate-50 transition ${!p.ativo ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{p.nome}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">{fmt(p.preco)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {p.preco_anual ? fmt(p.preco_anual) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {p.max_cabecas ? p.max_cabecas.toLocaleString("pt-BR") : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.assinaturas_count > 0 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.assinaturas_count}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditando(p)}
                            className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold border border-slate-200 transition">
                            Editar
                          </button>
                          <button onClick={() => toggleAtivo(p)}
                            className={`text-[11px] px-2 py-1 rounded-lg font-semibold border transition ${p.ativo
                              ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"}`}>
                            {p.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {editando && (
        <EditModal plano={editando} onClose={() => setEditando(null)} onSaved={onSaved} />
      )}
    </div>
  );
}

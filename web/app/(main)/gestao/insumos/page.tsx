"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Fornecedor = { id: number; nome: string; categoria: string };
type Estoque = { quantidade_atual: number; quantidade_minima: number; localizacao: string | null };
type Insumo = {
  id: number; nome: string; codigo: string | null; categoria: string;
  unidade: string; preco_unitario: number | null; estoque: Estoque | null;
  fornecedor: Fornecedor | null;
};
type ResumoEstoque = { abaixo_minimo: number; valor_estoque: number; compras_mes: number };
type Compra = {
  id: number; data_compra: string; valor_total: number; status: string;
  fornecedor: Fornecedor | null; itens: { insumo: Insumo; quantidade: number; valor_unitario: number }[];
};

const CATEGORIAS = ["medicamento","vacina","nutricional","mineral","combustivel","ferramenta","semente","agrotóxico","outros"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function InsumosPage() {
  const [insumos, setInsumos]       = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras]       = useState<Compra[]>([]);
  const [resumo, setResumo]         = useState<ResumoEstoque | null>(null);
  const [aba, setAba]               = useState<"estoque"|"compras"|"fornecedores">("estoque");
  const [loading, setLoading]       = useState(true);
  const [showInsumo, setShowInsumo] = useState(false);
  const [showCompra, setShowCompra] = useState(false);
  const [showForn, setShowForn]     = useState(false);
  const [movModal, setMovModal]     = useState<Insumo | null>(null);

  async function carregar() {
    setLoading(true);
    const [ins, forn, res] = await Promise.all([
      api.get("/gestao/insumos").then(r => r.data),
      api.get("/gestao/fornecedores").then(r => r.data),
      api.get("/gestao/insumos/estoque/resumo").then(r => r.data).catch(() => null),
    ]);
    setInsumos(ins); setFornecedores(forn); setResumo(res);
    if (aba === "compras") {
      const c = await api.get("/gestao/compras").then(r => r.data.data || []).catch(() => []);
      setCompras(c);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => {
    if (aba === "compras" && compras.length === 0) {
      api.get("/gestao/compras").then(r => setCompras(r.data.data || [])).catch(() => {});
    }
  }, [aba]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque & Insumos</h1>
          <p className="text-gray-500 text-sm">Controle de compras, estoque e fornecedores</p>
        </div>
        <div className="flex gap-2">
          {aba === "estoque"      && <button onClick={() => setShowInsumo(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Insumo</button>}
          {aba === "compras"      && <button onClick={() => setShowCompra(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Compra</button>}
          {aba === "fornecedores" && <button onClick={() => setShowForn(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Fornecedor</button>}
        </div>
      </div>

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Valor em estoque", value: fmt(resumo.valor_estoque), icon: "📦", color: "text-blue-700" },
            { label: "Compras no mês",   value: fmt(resumo.compras_mes),   icon: "🛒", color: "text-green-700" },
            { label: "Abaixo do mínimo", value: resumo.abaixo_minimo,      icon: "⚠️", color: resumo.abaixo_minimo > 0 ? "text-red-600" : "text-gray-700" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xl mb-1">{k.icon}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["estoque","compras","fornecedores"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${aba === a ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {a === "estoque" ? "📦 Estoque" : a === "compras" ? "🛒 Compras" : "🏭 Fornecedores"}
          </button>
        ))}
      </div>

      {/* Tabela estoque */}
      {aba === "estoque" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-5 py-3">Insumo</th>
              <th className="text-left px-3 py-3">Categoria</th>
              <th className="text-left px-3 py-3">Unidade</th>
              <th className="text-right px-3 py-3">Qtd atual</th>
              <th className="text-right px-3 py-3">Mínimo</th>
              <th className="text-right px-3 py-3">Preço unit.</th>
              <th className="text-right px-5 py-3">Ações</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : insumos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum insumo cadastrado</td></tr>
              ) : insumos.map(i => {
                const abaixo = i.estoque && i.estoque.quantidade_minima > 0 && i.estoque.quantidade_atual <= i.estoque.quantidade_minima;
                return (
                  <tr key={i.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{i.nome}</p>
                      {i.codigo && <p className="text-xs text-gray-400">#{i.codigo}</p>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 capitalize">{i.categoria}</td>
                    <td className="px-3 py-3 text-gray-500">{i.unidade}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${abaixo ? "text-red-600" : "text-gray-800"}`}>
                      {i.estoque?.quantidade_atual?.toFixed(2) ?? "—"}
                      {abaixo && <span className="ml-1 text-xs text-red-500">⚠️</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500">{i.estoque?.quantidade_minima?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{i.preco_unitario ? fmt(i.preco_unitario) : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setMovModal(i)}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold">
                        Movimentar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela compras */}
      {aba === "compras" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-5 py-3">Data</th>
              <th className="text-left px-3 py-3">Fornecedor</th>
              <th className="text-left px-3 py-3">Itens</th>
              <th className="text-right px-3 py-3">Total</th>
              <th className="text-left px-3 py-3">Status</th>
            </tr></thead>
            <tbody>
              {compras.length === 0
                ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhuma compra registrada</td></tr>
                : compras.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{new Date(c.data_compra).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-3 text-gray-600">{c.fornecedor?.nome ?? "—"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{c.itens?.length ?? 0} item(ns)</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmt(c.valor_total)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        c.status === "entregue" ? "bg-green-100 text-green-700" :
                        c.status === "confirmada" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela fornecedores */}
      {aba === "fornecedores" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-5 py-3">Fornecedor</th>
              <th className="text-left px-3 py-3">Categoria</th>
              <th className="text-left px-3 py-3">Telefone</th>
              <th className="text-left px-3 py-3">Estado</th>
            </tr></thead>
            <tbody>
              {fornecedores.length === 0
                ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhum fornecedor cadastrado</td></tr>
                : fornecedores.map(f => (
                  <tr key={f.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-800">{f.nome}</td>
                    <td className="px-3 py-3 text-gray-500 capitalize">{f.categoria}</td>
                    <td className="px-3 py-3 text-gray-500">{(f as any).telefone ?? "—"}</td>
                    <td className="px-3 py-3 text-gray-500">{(f as any).estado ?? "—"}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo insumo */}
      {showInsumo && <NovoInsumoModal fornecedores={fornecedores} onClose={() => setShowInsumo(false)} onDone={carregar} />}
      {showCompra && <NovaCompraModal insumos={insumos} fornecedores={fornecedores} onClose={() => setShowCompra(false)} onDone={carregar} />}
      {showForn && <NovoFornecedorModal onClose={() => setShowForn(false)} onDone={carregar} />}
      {movModal && <MovimentacaoModal insumo={movModal} onClose={() => setMovModal(null)} onDone={carregar} />}
    </div>
  );
}

function NovoInsumoModal({ fornecedores, onClose, onDone }: { fornecedores: Fornecedor[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", categoria: "outros", unidade: "un", preco_unitario: "", quantidade_minima: "0", fornecedor_padrao_id: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/gestao/insumos", { ...form, preco_unitario: form.preco_unitario || null });
      onDone(); onClose();
    } catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Novo Insumo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do insumo"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["medicamento","vacina","nutricional","mineral","combustivel","ferramenta","semente","agrotóxico","outros"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["kg","g","L","mL","un","sc","cx","dose","frasco"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.preco_unitario} onChange={e => setForm({...form, preco_unitario: e.target.value})}
              placeholder="Preço unitário (R$)" step="0.01" min="0"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input type="number" value={form.quantidade_minima} onChange={e => setForm({...form, quantidade_minima: e.target.value})}
              placeholder="Qtd mínima estoque" step="0.001" min="0"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NovaCompraModal({ insumos, fornecedores, onClose, onDone }: { insumos: Insumo[]; fornecedores: Fornecedor[]; onClose: () => void; onDone: () => void }) {
  const [fornecedor, setFornecedor] = useState("");
  const [data, setData]             = useState(new Date().toISOString().split("T")[0]);
  const [forma, setForma]           = useState("");
  const [itens, setItens]           = useState([{ insumo_id: "", quantidade: "", valor_unitario: "" }]);
  const [saving, setSaving]         = useState(false);

  function addItem() { setItens([...itens, { insumo_id: "", quantidade: "", valor_unitario: "" }]); }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)); }

  const total = itens.reduce((s, i) => s + (parseFloat(i.quantidade) || 0) * (parseFloat(i.valor_unitario) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/gestao/compras", {
        fornecedor_id: fornecedor || null, data_compra: data, forma_pagamento: forma || null,
        itens: itens.map(i => ({ insumo_id: parseInt(i.insumo_id), quantidade: parseFloat(i.quantidade), valor_unitario: parseFloat(i.valor_unitario) })),
      });
      onDone(); onClose();
    } catch { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">Nova Compra</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data da compra</label>
              <input type="date" required value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Forma de pagamento</label>
              <select value={forma} onChange={e => setForma(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">Selecione</option>
                {["dinheiro","pix","boleto","cartao","cheque","prazo"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Fornecedor</label>
            <select value={fornecedor} onChange={e => setFornecedor(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Sem fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Itens da compra</label>
              <button type="button" onClick={addItem} className="text-xs text-green-700 hover:underline">+ Adicionar item</button>
            </div>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-2">
                    <select value={item.insumo_id} onChange={e => { const n = [...itens]; n[idx].insumo_id = e.target.value; setItens(n); }} required
                      className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400">
                      <option value="">Insumo</option>
                      {insumos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                  </div>
                  <input type="number" placeholder="Qtd" required step="0.001" min="0.001" value={item.quantidade}
                    onChange={e => { const n = [...itens]; n[idx].quantidade = e.target.value; setItens(n); }}
                    className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" />
                  <input type="number" placeholder="R$/un" required step="0.01" min="0" value={item.valor_unitario}
                    onChange={e => { const n = [...itens]; n[idx].valor_unitario = e.target.value; setItens(n); }}
                    className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" />
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg font-light text-center">×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl px-4 py-3 text-right">
            <p className="text-xs text-gray-500">Total da compra</p>
            <p className="text-xl font-bold text-green-700">{total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Registrar compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NovoFornecedorModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", categoria: "insumos", estado: "", municipio: "", contato_nome: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/fornecedores", form); onDone(); onClose(); }
    catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Novo Fornecedor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome da empresa"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="Telefone"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["insumos","medicamentos","servicos","equipamentos","outros"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="E-mail" type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovimentacaoModal({ insumo, onClose, onDone }: { insumo: Insumo; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ tipo: "saida", quantidade: "", motivo: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/gestao/insumos/${insumo.id}/movimentar`, form); onDone(); onClose(); }
    catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">Movimentar Estoque</h2>
            <p className="text-xs text-gray-400">{insumo.nome} · atual: {insumo.estoque?.quantidade_atual?.toFixed(2) ?? 0} {insumo.unidade}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            <option value="saida">Saída (uso)</option>
            <option value="perda">Perda / descarte</option>
            <option value="ajuste">Ajuste de inventário</option>
          </select>
          <input required type="number" step="0.001" min="0.001" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})}
            placeholder={`Quantidade (${insumo.unidade})`}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Motivo (opcional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

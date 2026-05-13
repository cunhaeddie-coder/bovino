"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Lancamento = {
  id: number; tipo: "receita" | "despesa"; categoria: string;
  valor: number; data: string; descricao: string | null;
};

type Resumo = {
  receitas_mes: number; despesas_mes: number; saldo_mes: number;
  ultimos_6_meses: { mes: string; receitas: number; despesas: number }[];
  categorias_despesa: { categoria: string; total: number }[];
};

type Paginado<T> = { data: T[]; total: number; current_page: number; last_page: number };

// ── Categorias ────────────────────────────────────────────────────────────────

const CATEGORIAS_RECEITA: [string, string][] = [
  ["venda_gado",    "Venda de gado"],
  ["venda_leite",   "Venda de leite"],
  ["arrendamento",  "Arrendamento"],
  ["outros_receita","Outras receitas"],
];

const CATEGORIAS_DESPESA: [string, string][] = [
  ["alimentacao",  "Ração / Alimentação"],
  ["sanidade",     "Vacinas / Sanidade"],
  ["funcionarios", "Funcionários"],
  ["combustivel",  "Combustível"],
  ["manutencao",   "Manutenção"],
  ["pastagem",     "Pastagem / Terra"],
  ["impostos",     "Impostos / Taxas"],
  ["outros_despesa","Outras despesas"],
];

const ALL_CATS = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA];
const catLabel = (c: string) => ALL_CATS.find(([k]) => k === c)?.[1] ?? c;

const fmt   = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Utilitários ───────────────────────────────────────────────────────────────

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesPtBR(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[Number(m) - 1]}/${y.slice(2)}`;
}

// ── Modal de lançamento ───────────────────────────────────────────────────────

function ModalLancamento({
  tipoInicial, onClose, onSalvo,
}: { tipoInicial: "receita" | "despesa"; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({
    tipo:      tipoInicial as "receita" | "despesa",
    categoria: tipoInicial === "receita" ? "venda_gado" : "alimentacao",
    valor:     "",
    data:      new Date().toISOString().slice(0, 10),
    descricao: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const cats = form.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  function handleTipo(t: "receita" | "despesa") {
    setForm(p => ({
      ...p, tipo: t,
      categoria: t === "receita" ? "venda_gado" : "alimentacao",
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/gestao/fiscal", { ...form, valor: Number(form.valor) });
      onSalvo(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Novo lançamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(["receita", "despesa"] as const).map(t => (
              <button key={t} type="button" onClick={() => handleTipo(t)}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                  form.tipo === t
                    ? t === "receita"
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-red-500 border-red-500 text-white"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                {t === "receita" ? "↑ Receita" : "↓ Despesa"}
              </button>
            ))}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {cats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$) *</label>
              <input required type="number" min="0.01" step="0.01"
                value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0,00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data *</label>
              <input required type="date" value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input type="text" maxLength={500}
              value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Venda de 30 bois para frigorífico..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition ${
                form.tipo === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
              }`}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function FiscalPage() {
  const [mes, setMes]         = useState(mesAtual());
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [lista, setLista]     = useState<Paginado<Lancamento> | null>(null);
  const [aba, setAba]         = useState<"visao" | "lista">("visao");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal]     = useState<"receita" | "despesa" | null>(null);
  const [exportando, setExportando] = useState(false);

  async function carregarResumo() {
    const { data } = await api.get(`/gestao/fiscal/resumo?mes=${mes}`);
    setResumo(data);
  }

  async function carregarLista() {
    const params = new URLSearchParams({ mes });
    if (filtroTipo) params.set("tipo", filtroTipo);
    const { data } = await api.get(`/gestao/fiscal?${params}`);
    setLista(data);
  }

  useEffect(() => { carregarResumo(); }, [mes]);
  useEffect(() => { if (aba === "lista") carregarLista(); }, [aba, mes, filtroTipo]);

  async function excluir(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await api.delete(`/gestao/fiscal/${id}`);
    carregarResumo();
    if (aba === "lista") carregarLista();
  }

  async function exportar() {
    setExportando(true);
    try {
      const params = new URLSearchParams({ mes });
      if (filtroTipo) params.set("tipo", filtroTipo);
      const resp = await api.get(`/gestao/fiscal/exportar?${params}`, { responseType: "blob" });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `lancamentos-fiscais-${mes}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  // Gráfico de barras — últimos 6 meses
  const maxBar = Math.max(...(resumo?.ultimos_6_meses.flatMap(m => [m.receitas, m.despesas]) ?? [1]), 1);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Movimentação Fiscal</h1>
          <p className="text-xs text-gray-400 mt-0.5">Controle de receitas e despesas para o seu contador</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={() => setModal("receita")}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition">
            + Receita
          </button>
          <button onClick={() => setModal("despesa")}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition">
            + Despesa
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-semibold">Receitas</p>
          <p className="text-xl font-extrabold text-green-700 mt-1">{fmt(resumo?.receitas_mes ?? 0)}</p>
          <p className="text-[10px] text-green-500 mt-0.5">{mesPtBR(mes)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-semibold">Despesas</p>
          <p className="text-xl font-extrabold text-red-600 mt-1">{fmt(resumo?.despesas_mes ?? 0)}</p>
          <p className="text-[10px] text-red-400 mt-0.5">{mesPtBR(mes)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${(resumo?.saldo_mes ?? 0) >= 0 ? "bg-slate-50 border-slate-100" : "bg-orange-50 border-orange-100"}`}>
          <p className="text-xs text-slate-500 font-semibold">Saldo</p>
          <p className={`text-xl font-extrabold mt-1 ${(resumo?.saldo_mes ?? 0) >= 0 ? "text-slate-800" : "text-orange-600"}`}>
            {fmt(resumo?.saldo_mes ?? 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{mesPtBR(mes)}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["visao", "Visão Geral"], ["lista", "Lançamentos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${aba === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {aba === "visao" && resumo && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Gráfico 6 meses */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Últimos 6 meses</h3>
            <div className="space-y-3">
              {resumo.ultimos_6_meses.map(m => (
                <div key={m.mes}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-semibold">{mesPtBR(m.mes)}</span>
                    <span className={m.receitas - m.despesas >= 0 ? "text-green-600" : "text-red-500"}>
                      {fmt(m.receitas - m.despesas)}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-green-500 rounded-full transition-all"
                      style={{ width: `${(m.receitas / maxBar) * 100}%` }} />
                    <div className="bg-red-400 rounded-full transition-all"
                      style={{ width: `${(m.despesas / maxBar) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] mt-1">
                    <span className="text-green-600">↑ {fmt(m.receitas)}</span>
                    <span className="text-red-500">↓ {fmt(m.despesas)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1 text-[10px] text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Receitas</span>
              <span className="flex items-center gap-1 text-[10px] text-red-500"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Despesas</span>
            </div>
          </div>

          {/* Despesas por categoria */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Despesas por categoria — {mesPtBR(mes)}</h3>
            {resumo.categorias_despesa.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste mês</p>
            ) : (
              <div className="space-y-3">
                {resumo.categorias_despesa.map(c => {
                  const pct = resumo.despesas_mes > 0 ? (c.total / resumo.despesas_mes) * 100 : 0;
                  return (
                    <div key={c.categoria}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">{catLabel(c.categoria)}</span>
                        <span className="text-slate-500">{fmt(c.total)} <span className="text-[10px] text-slate-400">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Exportar para contador */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-2">Exportar para seu contador (CSV)</p>
              <button onClick={exportar} disabled={exportando}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold transition disabled:opacity-50">
                {exportando ? "Gerando..." : "⬇ Exportar lançamentos CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Lançamentos ── */}
      {aba === "lista" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {([["", "Todos"], ["receita", "Receitas"], ["despesa", "Despesas"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFiltroTipo(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroTipo === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={exportar} disabled={exportando}
              className="ml-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold">
              {exportando ? "Gerando..." : "⬇ Exportar CSV"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-3 py-3">Categoria</th>
                  <th className="text-left px-3 py-3">Descrição</th>
                  <th className="text-right px-3 py-3">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!lista ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
                ) : lista.data.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum lançamento neste período.</td></tr>
                ) : lista.data.map(l => (
                  <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.tipo === "receita" ? "bg-green-500" : "bg-red-400"}`} />
                        <span className="text-xs text-slate-700">{catLabel(l.categoria)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{l.descricao ?? <span className="text-slate-300">—</span>}</td>
                    <td className={`px-3 py-3 text-xs font-bold text-right whitespace-nowrap ${l.tipo === "receita" ? "text-green-600" : "text-red-500"}`}>
                      {l.tipo === "receita" ? "+" : "−"} {fmtFull(l.valor)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => excluir(l.id)} className="text-slate-300 hover:text-red-400 text-sm transition">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista && lista.last_page > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-center">
                Página {lista.current_page} de {lista.last_page} · {lista.total} lançamentos
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <ModalLancamento
          tipoInicial={modal}
          onClose={() => setModal(null)}
          onSalvo={() => { carregarResumo(); if (aba === "lista") carregarLista(); }}
        />
      )}
    </div>
  );
}

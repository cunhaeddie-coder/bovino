"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type CategoriaInventario = {
  categoria: string;
  total: number;
  machos: number;
  femeas: number;
  peso_medio: number | null;
  peso_total: number;
};

type Inventario = {
  fazenda_nome: string;
  data_ref: string;
  gerado_em: string;
  total_cabecas: number;
  total_machos: number;
  total_femeas: number;
  peso_medio: number;
  peso_total: number;
  categorias: CategoriaInventario[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  vaca:    "Vaca",
  novilha: "Novilha",
  bezerra: "Bezerra",
  touro:   "Touro",
  boi:     "Boi",
  novilho: "Novilho",
  bezerro: "Bezerro",
};

const CAT_COLOR: Record<string, string> = {
  vaca:    "bg-pink-100 text-pink-700",
  novilha: "bg-rose-100 text-rose-700",
  bezerra: "bg-fuchsia-100 text-fuchsia-700",
  touro:   "bg-blue-100 text-blue-800",
  boi:     "bg-green-100 text-green-800",
  novilho: "bg-teal-100 text-teal-700",
  bezerro: "bg-amber-100 text-amber-700",
};

function fmtPeso(kg: number | null) {
  if (!kg) return "—";
  return kg >= 1000
    ? `${(kg / 1000).toFixed(1)} t`
    : `${kg.toFixed(0)} kg`;
}

function fmtData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [dataRef, setDataRef]     = useState(hoje());
  const [inventario, setInventario] = useState<Inventario | null>(null);
  const [loading, setLoading]     = useState(false);
  const [exportando, setExportando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.get(`/gestao/rebanho/inventario?data=${dataRef}`);
      setInventario(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function exportarCSV() {
    if (!inventario) return;
    setExportando(true);

    let csv = "\xEF\xBB\xBF";
    csv += `Inventário do Rebanho — ${inventario.fazenda_nome}\n`;
    csv += `Data de referência: ${fmtData(inventario.data_ref)}\n\n`;
    csv += "Categoria;Total;Machos;Fêmeas;Peso Médio (kg);Peso Total (kg)\n";

    for (const c of inventario.categorias) {
      csv += `${CAT_LABEL[c.categoria] ?? c.categoria};${c.total};${c.machos};${c.femeas};${c.peso_medio ?? ""};${c.peso_total}\n`;
    }

    csv += `\nTOTAL;${inventario.total_cabecas};${inventario.total_machos};${inventario.total_femeas};${inventario.peso_medio};${inventario.peso_total}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `inventario-rebanho-${inventario.data_ref}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  function imprimir() {
    window.print();
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Relatórios</h1>
          <p className="text-xs text-gray-400 mt-0.5">Inventário do rebanho para declarações fiscais</p>
        </div>
      </div>

      {/* ── Card do relatório ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Cabeçalho do relatório */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap print:hidden">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Inventário do Rebanho</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Contagem por categoria — útil para declaração ITR (31/dez) e controle zootécnico
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-semibold">Data de referência:</label>
              <input
                type="date"
                value={dataRef}
                onChange={e => setDataRef(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={carregar}
              disabled={loading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Gerar"}
            </button>
          </div>
        </div>

        {/* Conteúdo imprimível */}
        <div ref={printRef} className="p-6 space-y-5">

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !inventario ? null : (
            <>
              {/* Cabeçalho imprimível */}
              <div className="hidden print:block mb-6">
                <h1 className="text-xl font-extrabold text-slate-900">Inventário do Rebanho</h1>
                <p className="text-sm text-slate-600 mt-1">{inventario.fazenda_nome}</p>
                <p className="text-xs text-slate-400">
                  Data de referência: {fmtData(inventario.data_ref)} · Gerado em: {new Date(inventario.gerado_em).toLocaleString("pt-BR")}
                </p>
              </div>

              {/* KPIs resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">{inventario.total_cabecas}</p>
                  <p className="text-[10px] text-slate-400">cabeças</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Machos</p>
                  <p className="text-2xl font-extrabold text-blue-700 mt-1">{inventario.total_machos}</p>
                  <p className="text-[10px] text-blue-400">
                    {inventario.total_cabecas > 0
                      ? `${((inventario.total_machos / inventario.total_cabecas) * 100).toFixed(0)}%`
                      : "0%"}
                  </p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-pink-500 font-semibold uppercase tracking-wide">Fêmeas</p>
                  <p className="text-2xl font-extrabold text-pink-700 mt-1">{inventario.total_femeas}</p>
                  <p className="text-[10px] text-pink-400">
                    {inventario.total_cabecas > 0
                      ? `${((inventario.total_femeas / inventario.total_cabecas) * 100).toFixed(0)}%`
                      : "0%"}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Peso médio</p>
                  <p className="text-2xl font-extrabold text-amber-700 mt-1">{inventario.peso_medio > 0 ? inventario.peso_medio : "—"}</p>
                  <p className="text-[10px] text-amber-500">{inventario.peso_medio > 0 ? "kg/cabeça" : "sem dados"}</p>
                </div>
              </div>

              {/* Tabela por categoria */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-100">
                      <th className="text-left px-4 py-3">Categoria</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3">Machos</th>
                      <th className="text-right px-4 py-3">Fêmeas</th>
                      <th className="text-right px-4 py-3">Peso Médio</th>
                      <th className="text-right px-4 py-3">Peso Total Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.categorias.map(c => (
                      <tr key={c.categoria} className="border-t border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CAT_COLOR[c.categoria] ?? "bg-slate-100 text-slate-700"}`}>
                            {CAT_LABEL[c.categoria] ?? c.categoria}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{c.total}</td>
                        <td className="px-4 py-3 text-right text-blue-600 text-xs">{c.machos}</td>
                        <td className="px-4 py-3 text-right text-pink-600 text-xs">{c.femeas}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtPeso(c.peso_medio)}</td>
                        <td className="px-4 py-3 text-right text-xs text-amber-700 font-semibold">{fmtPeso(c.peso_total)}</td>
                      </tr>
                    ))}

                    {/* Linha de total */}
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="px-4 py-3 text-sm text-slate-700">TOTAL GERAL</td>
                      <td className="px-4 py-3 text-right text-slate-900">{inventario.total_cabecas}</td>
                      <td className="px-4 py-3 text-right text-blue-700">{inventario.total_machos}</td>
                      <td className="px-4 py-3 text-right text-pink-700">{inventario.total_femeas}</td>
                      <td className="px-4 py-3 text-right text-slate-600 text-xs font-semibold">{inventario.peso_medio > 0 ? `${inventario.peso_medio} kg` : "—"}</td>
                      <td className="px-4 py-3 text-right text-amber-800">{fmtPeso(inventario.peso_total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nota fiscal */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <p className="text-[11px] text-indigo-700">
                  <span className="font-bold">📋 Nota fiscal:</span> Para a declaração do ITR, utilize a data de referência <strong>31/12</strong> do ano-exercício.
                  O governo cruza a área de pastagem declarada com a quantidade de cabeças — mantenha o inventário atualizado.
                </p>
              </div>

              {/* Rodapé imprimível */}
              <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400">
                <p>{inventario.fazenda_nome} · Inventário gerado via Bovino · {new Date(inventario.gerado_em).toLocaleString("pt-BR")}</p>
              </div>
            </>
          )}
        </div>

        {/* Ações */}
        {inventario && !loading && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end print:hidden">
            <button
              onClick={exportarCSV}
              disabled={exportando}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-semibold transition"
            >
              ⬇ Exportar CSV
            </button>
            <button
              onClick={imprimir}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
            >
              🖨 Imprimir / Salvar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

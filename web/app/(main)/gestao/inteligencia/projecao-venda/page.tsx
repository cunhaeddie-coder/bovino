"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtN = (v: number, dec = 1) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

type Lote = { id: number; nome: string; qtd_cabecas: number; peso_medio: number | null; preco_arroba: number | null };

type Resultado = {
  lote: {
    id: number; nome: string; qtd_cabecas: number;
    peso_medio_kg: number; custo_total: number; fonte_peso: string;
  };
  projecao: {
    preco_arroba: number; tipo: string; rendimento: number;
    peso_total_kg: number; arrobas_totais: number;
    receita: number; custo_total: number; resultado: number;
    margem_pct: number; custo_por_arroba: number;
    preco_equilibrio: number; preco_para_meta: number | null;
    meta_lucro_pct: number; positivo: boolean;
  };
};

function ProjecaoVendaInner() {
  const searchParams = useSearchParams();
  const loteIdParam = searchParams.get("lote");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteId, setLoteId] = useState(loteIdParam ?? "");
  const [precoValor, setPrecoValor] = useState("");
  const [unidadePreco, setUnidadePreco] = useState<"arroba" | "kg">("arroba");
  const [tipo, setTipo] = useState<"vivo" | "carcaca">("vivo");
  const [rendimento, setRendimento] = useState("52");
  const [metaLucro, setMetaLucro] = useState("30");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get<Lote[]>("/gestao/lotes").then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setLotes(list);
      if (!loteId && list.length > 0) setLoteId(String(list[0].id));
    });
  }, []);

  const precoArroba = precoValor
    ? unidadePreco === "kg"
      ? Number(precoValor) * 15
      : Number(precoValor)
    : 0;

  async function calcular(e: React.FormEvent) {
    e.preventDefault();
    if (!loteId || !precoValor) return;
    setCalculando(true);
    setErro("");
    try {
      const params = new URLSearchParams({
        preco_arroba: String(precoArroba),
        meta_lucro: metaLucro,
        tipo,
        rendimento,
      });
      const { data } = await api.get<Resultado>(`/gestao/lotes/${loteId}/projecao?${params}`);
      setResultado(data);
    } catch {
      setErro("Erro ao calcular. Verifique os dados e tente novamente.");
    } finally {
      setCalculando(false);
    }
  }

  const p = resultado?.projecao;
  const l = resultado?.lote;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/gestao/lotes" className="text-gray-400 hover:text-gray-600 text-sm">← Lotes</Link>
        <h1 className="text-xl font-bold text-gray-900">📊 Projeção de Venda</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={calcular} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

        {/* Lote */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Lote</label>
          <select
            value={loteId}
            onChange={e => { setLoteId(e.target.value); setResultado(null); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">Selecione um lote</option>
            {lotes.map(l => (
              <option key={l.id} value={l.id}>
                {l.nome} — {l.qtd_cabecas} cab.{l.peso_medio ? ` · ${l.peso_medio} kg/cab` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Preço de venda */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Preço de venda {unidadePreco === "arroba" ? "(R$/@)" : "(R$/kg)"}
            </label>
            <div className="flex gap-2">
              <input
                type="number" step="0.01" min="0" required
                value={precoValor}
                onChange={e => setPrecoValor(e.target.value)}
                placeholder={unidadePreco === "arroba" ? "320" : "21.33"}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold shrink-0">
                {(["arroba", "kg"] as const).map(u => (
                  <button key={u} type="button" onClick={() => setUnidadePreco(u)}
                    className={`px-3 py-2 transition ${unidadePreco === u ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                    {u === "arroba" ? "@" : "kg"}
                  </button>
                ))}
              </div>
            </div>
            {precoValor && (
              <p className="text-xs text-gray-400 mt-1">
                ≈ {unidadePreco === "arroba"
                  ? `R$ ${(Number(precoValor) / 15).toFixed(2)}/kg`
                  : `R$ ${(Number(precoValor) * 15).toFixed(2)}/@`}
              </p>
            )}
          </div>

          {/* Meta de lucro */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">Meta de lucro (%)</label>
            <input
              type="number" min="0" max="99" step="1"
              value={metaLucro}
              onChange={e => setMetaLucro(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          {/* Tipo de venda */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo de venda</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold">
              {(["vivo", "carcaca"] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`flex-1 py-2 transition ${tipo === t ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {t === "vivo" ? "🐂 Vivo" : "🥩 Carcaça"}
                </button>
              ))}
            </div>
          </div>

          {/* Rendimento (apenas carcaça) */}
          {tipo === "carcaca" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Rendimento de carcaça (%)</label>
              <input
                type="number" min="40" max="70" step="0.5"
                value={rendimento}
                onChange={e => setRendimento(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {erro && <p className="text-red-500 text-xs">{erro}</p>}

        <button type="submit" disabled={calculando || !loteId || !precoValor}
          className="w-full bg-green-700 text-white font-bold py-3 rounded-full text-sm hover:bg-green-800 disabled:opacity-50 transition">
          {calculando ? "Calculando..." : "Calcular Projeção"}
        </button>
      </form>

      {/* Resultado */}
      {p && l && (
        <div className="space-y-4">
          {/* Card principal */}
          <div className={`rounded-2xl p-5 border-2 ${p.positivo ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">{l.nome} · {l.qtd_cabecas} cab.</p>
                <p className={`text-4xl font-extrabold ${p.positivo ? "text-green-700" : "text-red-600"}`}>
                  {p.positivo ? "+" : ""}{fmt(p.resultado)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  resultado projetado · margem de <strong className={p.positivo ? "text-green-700" : "text-red-600"}>{p.margem_pct}%</strong>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Receita projetada</p>
                <p className="text-xl font-bold text-gray-800">{fmt(p.receita)}</p>
                <p className="text-xs text-gray-400 mt-1">Custo total</p>
                <p className="text-lg font-bold text-gray-600">{fmt(p.custo_total)}</p>
              </div>
            </div>
          </div>

          {/* Métricas detalhadas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Arrobas totais", value: `${fmtN(p.arrobas_totais)} @` },
              { label: "Peso total", value: `${fmtN(p.peso_total_kg)} kg` },
              { label: "Custo por @", value: fmt(p.custo_por_arroba), destaque: true },
              { label: "Preço de equilíbrio", value: fmt(p.preco_equilibrio), sub: "mínimo para não ter prejuízo" },
              { label: "Preço para meta", value: p.preco_para_meta ? fmt(p.preco_para_meta) : "—", sub: `meta de ${metaLucro}% lucro` },
              { label: "Preço informado", value: `${fmt(precoArroba)}/@` },
            ].map(({ label, value, sub, destaque }) => (
              <div key={label} className={`bg-white rounded-xl border p-3 ${destaque ? "border-blue-200" : "border-gray-100"}`}>
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className={`text-base font-bold mt-0.5 ${destaque ? "text-blue-700" : "text-gray-800"}`}>{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Info do lote */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-xs text-gray-500 flex gap-4 flex-wrap">
            <span>Peso médio: <strong>{l.peso_medio_kg} kg</strong></span>
            <span>Fonte do peso: <strong>{l.fonte_peso === "pesagem" ? "última pesagem" : "cadastro do lote"}</strong></span>
            {tipo === "carcaca" && <span>Rendimento: <strong>{rendimento}%</strong></span>}
          </div>

          {p.custo_total === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Nenhum custo registrado para este lote. Cadastre os custos em <strong>Gestão → Financeiro</strong> para uma projeção mais precisa.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjecaoVendaPage() {
  return (
    <Suspense>
      <ProjecaoVendaInner />
    </Suspense>
  );
}

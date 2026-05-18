"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Raca = {
  raca: string;
  total_animais: number;
  peso_medio_kg: number | null;
  gmd_medio: number | null;
  preco_arroba: number | null;
  lotes: number;
};

function BarProp({ val, max, cor }: { val: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min((val / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function RacasPage() {
  const [racas, setRacas]   = useState<Raca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Raca[]>("/gestao/analises/racas")
      .then(r => setRacas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxAnimais = Math.max(...racas.map(r => r.total_animais), 1);
  const maxPeso    = Math.max(...racas.map(r => r.peso_medio_kg ?? 0), 1);
  const maxGmd     = Math.max(...racas.map(r => r.gmd_medio ?? 0), 1);
  const maxPreco   = Math.max(...racas.map(r => r.preco_arroba ?? 0), 1);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/gestao/inteligencia" className="text-gray-400 hover:text-gray-600 text-sm">← Inteligência</Link>
        <h1 className="text-xl font-bold text-gray-900">🐄 Raças em Números</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : racas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-gray-500 font-medium">Nenhuma raça cadastrada no rebanho</p>
          <p className="text-gray-400 text-sm mt-1">Preencha o campo "Raça" nos animais para ver o desempenho por raça</p>
          <Link href="/gestao/animais" className="mt-4 inline-block text-green-700 text-sm font-semibold hover:underline">
            Ir para Rebanho →
          </Link>
        </div>
      ) : (
        <>
          {/* Tabela desktop / cards mobile */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <th className="text-left px-5 py-3">Raça</th>
                  <th className="text-right px-4 py-3">Animais</th>
                  <th className="text-right px-4 py-3">Peso médio</th>
                  <th className="text-right px-4 py-3">GMD médio</th>
                  <th className="text-right px-5 py-3">Preço /@</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {racas.map(r => (
                  <tr key={r.raca} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{r.raca}</p>
                      {r.lotes > 0 && <p className="text-[10px] text-gray-400">{r.lotes} lote{r.lotes > 1 ? "s" : ""}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-800">{r.total_animais}</p>
                      <BarProp val={r.total_animais} max={maxAnimais} cor="bg-blue-400" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.peso_medio_kg ? (
                        <>
                          <p className="font-bold text-gray-800">{r.peso_medio_kg} kg</p>
                          <BarProp val={r.peso_medio_kg} max={maxPeso} cor="bg-amber-400" />
                        </>
                      ) : <p className="text-gray-400 text-xs">—</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.gmd_medio ? (
                        <>
                          <p className={`font-bold ${r.gmd_medio >= 0.8 ? "text-green-600" : r.gmd_medio >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                            {r.gmd_medio} kg/dia
                          </p>
                          <BarProp val={r.gmd_medio} max={maxGmd} cor={r.gmd_medio >= 0.8 ? "bg-green-400" : r.gmd_medio >= 0.4 ? "bg-yellow-400" : "bg-red-400"} />
                        </>
                      ) : <p className="text-gray-400 text-xs">Sem pesagens</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.preco_arroba ? (
                        <>
                          <p className="font-bold text-green-700">{fmt(r.preco_arroba)}</p>
                          <BarProp val={r.preco_arroba} max={maxPreco} cor="bg-green-400" />
                        </>
                      ) : <p className="text-gray-400 text-xs">—</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="sm:hidden space-y-3">
            {racas.map(r => (
              <div key={r.raca} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-lg">{r.raca}</p>
                  <span className="text-sm font-bold text-blue-700">{r.total_animais} animais</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Peso médio", val: r.peso_medio_kg ? `${r.peso_medio_kg} kg` : "—", cor: "text-amber-600" },
                    { label: "GMD médio",  val: r.gmd_medio ? `${r.gmd_medio} kg/d` : "—",    cor: r.gmd_medio && r.gmd_medio >= 0.8 ? "text-green-600" : "text-yellow-600" },
                    { label: "Preço/@",    val: r.preco_arroba ? fmt(r.preco_arroba) : "—",      cor: "text-green-700" },
                  ].map(({ label, val, cor }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">{label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${cor}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Baseado nos animais ativos com raça cadastrada · GMD calculado das pesagens registradas
          </p>
        </>
      )}
    </div>
  );
}
